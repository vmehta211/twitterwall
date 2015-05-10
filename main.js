"use strict";

process.env.TZ = 'America/Los_Angeles'
var time = require('time')(Date);


console.log("app started");
process.chdir('/');
var ip = false; //listen on the ip address - not only localhost
var port = 3001;

//var server = require('/home/pi/public_html/beerondemand/webServer').start(ip, port);
var server = require('./webServer').start(ip, port);
var io = require('socket.io').listen(server);
var crypto = require('crypto');
var request = require('request');
var uploadKey = 'Ph0t0Station!123';

var fs = require('fs');

require('console-stamp')(console, '[HH:mm:ss.l]');
var sys = require('sys')
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var getMac = require('getmac');
var OAuth = require('oauth').OAuth;
var util = require('util');
var config = require('./oauth.js');
var macAddress = '';
var mysql = require('mysql');
var Tail = require('tail').Tail;
var listenToRfid = true;
var currentRfid = '';
var https = require('https');
var http = require('http');


function getTime() {
    return (new Date).getTime();
}

getMacAddress();

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Hamburger123!'
});
connection.connect(function(err) {
// connected! (unless `err` is set)
    if (err) {
        console.log('mysql error: ', err);
        return false;
    }
});

io.sockets.on('connection', function(socket) {
    console.log("Establishing new connection");
    console.log('adding connection events');
    socket.on('message', function(msg) {
        console.log('Message Received: ', msg);
        socket.broadcast.emit('message', msg);
    });
    socket.on('write', function(msg) {
        console.log('write function: ', msg);
        switch (msg) {
            case 'reset':
                socket.broadcast.emit('refreshrequest');
                break;
            default:
                io.sockets.emit('message', msg);
                break;
        }
    });
    socket.on('update', function(data) {
        socket.broadcast.emit('message', data);
    });



    socket.on('startPhotobooth', function(picNum) {


        console.log('startProtobothcalled')
    });
});



function takePicture(picNum) {


    console.log('takePicture()');
//    process.chdir('/var/www/content/pix/dslr/');
    var cmd = 'gphoto2 --auto-detect  --capture-image-and-download --force-overwrite --filename=/var/www/content/pix/dslr/pic_' + picNum + '.jpg';
    console.log(cmd);
    exec(cmd, {cwd: dslr_dir}, function(error, stdout, stderr) {
        if (error == '' || error == null) {

        }
        console.log(stdout, stderr)
        io.sockets.emit('message', 'completed taking picture');
        io.sockets.emit('showimage', 'http://localhost:81/content/pix/dslr/pic_' + picNum + '.jpg');

    });
}


function getMacAddress() {
    getMac.getMac(function(err, ma) {
        macAddress = ma;
        console.log('MAC Address: ', macAddress);
    });

}

console.log('starting browser');
exec('/home/pi/scripts/startbrowser 2>&1 >> /var/log/midori/browser.log');


console.log('starting rfid reader');
exec('/home/pi/scripts/startRC522 2>&1 >> /tmp/rfid_RC522.log', function(e) {
    console.log(e);
});


var nfc_eventdInt = setInterval(function() {
    try {
        var tail = new Tail("/tmp/rfid_RC522.log");
        var rfid = '';
        clearInterval(nfc_eventdInt);
        tail.on("line", function(data) {
            console.log(data);
            //not listening all the time
            if (!listenToRfid) {
                return;
            }


            if (data.search('SNlen=4 SN=') !== -1) {
                rfid = data.substring(data.lastIndexOf("=") + 2, data.lastIndexOf("]"));
                console.log("the data is here: ", rfid);
                rfid = parseInt('0x' + rfid)
                console.log(rfid);
                //io.sockets.emit('nfcevent', rfid);
                currentRfid = rfid;
                io.sockets.emit('rfid_read', rfid);

                var fileLocation = '/home/pi/public_html/twitterwall/www/images/keep-calm-and-girl-power-1.png';
                var msg = 'HM Technology says Go Girl Power!';

                var rfidin = '1672552582';
                postToTwitter(rfidin, msg, fileLocation);





//                var data = getDataWithRfid(rfid, function(data) {
//
//                    var packet = {
//                        msg: 'Thank you. You may now link your wristband with your favorite social networking sites.',
//                        showSocial: true,
//                        rfid: rfid,
//                        alreadyLinked: false
//                    }
//
//                    //console.log(data);
//
//                    if (data !== false && (data.facebook_data != null || data.twitter_data != null)) {
//                        packet.msg = 'This wristband is already linked.';
//                        packet.links = data;
//                        packet.alreadyLinked = true;
//                    } else if (data === false) {
//                        addRfid(rfid);
//                    }
//
//                    io.sockets.emit('nfcevent', packet);
//                });

            }
            //console.log(data);
        });
    } catch (e) {
        console.log('error checking for rfid_RC522.log');

    }
}, 2000);

function twitterLoadComplete(){
    console.log('twitterLoadComplete()');
}

function postToTwitter(rfidin, msg, fileLocation) {
    console.log('gonna post to fb', msg, fileLocation);

        var sql = "SELECT * FROM picture_taker.users WHERE ? LIMIT 1";
        var twitter_access_token = '';
        var twitter_authtoken_secret = '';
        connection.query(sql, {rfid: rfidin}, function(err, rows) {

            if (rows.length > 0 && rows[0].twitter_data != null) {
                var mydata = JSON.parse(rows[0].twitter_data);
                twitter_access_token = mydata.accessToken;
                twitter_authtoken_secret = mydata.accessTokenSecret;
            } else {
                console.log('could not locate auth token');
                return false;
            }

            var fileName = fileLocation;
            var tweet = msg;
            var photoName = fileName.split('/');
            photoName = photoName[photoName.length - 1];
            var data = fs.readFileSync(fileName);
            var oauth = new OAuth(
                'https://api.twitter.com/oauth/request_token',
                'https://api.twitter.com/oauth/access_token',
                config.twitter.consumerKey, config.twitter.consumerSecret,
                '1.0', null, 'HMAC-SHA1');
            var crlf = "\r\n";
            var boundary = '---------------------------10102754414578508781458777923';
            var separator = '--' + boundary;
            var footer = crlf + separator + '--' + crlf;
            var fileHeader = 'Content-Disposition: file; name="media[]"; filename="' + photoName + '"';
            var contents = separator + crlf
                + 'Content-Disposition: form-data; name="status"' + crlf
                + crlf
                + tweet + crlf
                + separator + crlf
                + fileHeader + crlf
                + 'Content-Type: image/jpeg' + crlf
                + crlf;
            var multipartBody = Buffer.concat([
                new Buffer(contents),
                data,
                new Buffer(footer)]);
            var hostname = 'api.twitter.com';
            var authorization = oauth.authHeader(
                'https://api.twitter.com/1.1/statuses/update_with_media.json',
                config.twitter.accessToken, config.twitter.accessTokenSecret, 'POST');
            var authorization = oauth.authHeader(
                'https://api.twitter.com/1.1/statuses/update_with_media.json',
                twitter_access_token, twitter_authtoken_secret, 'POST');
            var headers = {
                'Authorization': authorization,
                'Content-Type': 'multipart/form-data; boundary=' + boundary,
                'Host': hostname,
                'Content-Length': multipartBody.length,
                'Connection': 'Keep-Alive'
            };
            var options = {
                host: hostname,
                port: 443,
                path: '/1.1/statuses/update_with_media.json',
                method: 'POST',
                headers: headers
            };
            var request = https.request(options);
            request.write(multipartBody);
            request.end();
            request.on('error', function(err) {
                console.log('Error: Something is wrong.\n' + JSON.stringify(err) + '\n');
            });
            request.on('response', function(response) {
                response.setEncoding('utf8');
                response.on('data', function(chunk) {
                    console.log(chunk.toString());
                });
                response.on('end', function() {
                    twitterLoadComplete();
                    console.log(response.statusCode + '\n');
                });
            });
        });
}