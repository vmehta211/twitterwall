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
var md5 = require('MD5');
var fs = require('fs');

require('console-stamp')(console, '[HH:mm:ss.l]');
var sys = require('sys')
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var getMac = require('getmac');
var OAuth = require('oauth').OAuth;
var util = require('util');
var macAddress = '';
var Tail = require('tail').Tail;
var listenToRfid = true;
var currentRfid = '';
var https = require('https');
var http = require('http');
var config;
if(fs.existsSync('/var/secure/twitterwall/config.js')){
    console.log('found config file in /var/secure');
    config = require('/var/secure/twitterwall/config.js');
}
else{
    config = require('./config.js')
}

var quoteData = null;



function getTime() {
    return (new Date).getTime();
}

getMacAddress();

var getQuoteInterval = setInterval(function(){
    if(macAddress != ''){
        clearInterval(getQuoteInterval);
        getQuote();
    }
}, 1000);





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

    socket.on('getQuote', function() {
        if(quoteData == null){
            getQuote();
        }else{
            io.sockets.emit('setQuoteData',quoteData.quote_url);
        }
    });


});


function getQuote(){
    var mac = macAddress;
    var apiPath = '/getquote/' + mac + '/' + Date.now() + '/';
    var sig = md5(apiPath + config.app.apikey);
    var options = {
        host: config.app.socialposter,
        port: 80,
        path: apiPath+sig,
        method: 'GET'
    };

    console.log('going to make request with ', options);
    var req = http.request(options, function (res) {
        res.setEncoding('utf-8');
        var responseString = '';

        //another chunk of data has been recieved, so append it to `str`
        res.on('data', function (chunk) {
            responseString += chunk;
        });

        res.on('end', function () {
            try {
                var resultObject = JSON.parse(responseString);
                console.log('the response was', resultObject);
                if(resultObject.result == 'fail'){
                    setTimeout('getQuote', 5000);
                }else{
                    quoteData = resultObject;
                    io.sockets.emit('setQuoteData',resultObject.quote_url);
                }

            } catch (e) {
                console.log('the response was not JSON', e, responseString);
                setTimeout('getQuote', 5000);
            }
        });
    });

    req.on('socket', function (socket) {
        socket.setTimeout(10000);
        socket.on('timeout', function() {
            req.abort();
        });
    });

    req.on('error', function (e) {
        // TODO: handle error.
        console.log('there was an error', e);
    });
    req.end();
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
                postToSocialPoster(rfid, quoteData.quote_id);
            }

        });
    } catch (e) {
        console.log('error checking for rfid_RC522.log');

    }
}, 2000);


function postToSocialPoster(rfid, quote_id){
    var options = {
        host: config.app.socialposter,
        port: 80,
        path: '/post/' + rfid + '/' + quote_id + '/'+ Date.now() + '/signature',
        method: 'POST'
    };

    console.log('going to make request with ', options);
    var req = http.request(options, function (res) {
        res.setEncoding('utf-8');
        var responseString = '';
        res.on('data', function (chunk) {
            responseString += chunk;
        });
        res.on('end', function () {
            try {
                var resultObject = JSON.parse(responseString);
                console.log('the response was', resultObject);

                if(resultObject.result == 'success'){
                    successfullySocialized();
                }else{
                    failedToSocialize();
                }

            } catch (e) {
                console.log('the response was not JSON', e, responseString);
                failedToSocialize();
            }
        });
    });
    req.on('socket', function (socket) {
        socket.setTimeout(10000);
        socket.on('timeout', function() {
            req.abort();
        });
    });
    req.on('error', function (e) {
        // TODO: handle error.
        console.log('there was an error', e);
        failedToSocialize();
    });
    req.end();
}

function successfullySocialized(){
    io.sockets.emit('socialize', 'success');
}

function failedToSocialize(){
    io.sockets.emit('socialize', 'fail');
}
