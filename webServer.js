"use strict";

var http     = require('http');
var fs       = require('fs');
var path     = require('path');
var url = require('url');
/**
 * webServer.js
 *
 * Static Node Web Server.
 *
 * NODE.JS - Resources
 *     node.js - http://nodejs.org/
 *     MIME types - "http://www.freeformatter.com/mime-types-list.html"
 *     HTTP status codes - "http://en.wikipedia.org/wiki/List_of_HTTP_status_codes"
 */


// Server settings 
// (defaults to heroku compatible settings [curruen IP & evironment PORT])
var IP;
var PORT = process.env.PORT || 5000;


var basepath = '/home/pi/public_html/twitterwall/';

var SITE_ROOT = basepath + 'www';
var _INDEX    = '/index.html';
var _404      = '/404.html';


// escape codes
var magenta = '\u001b[35m';
var green    = '\u001b[32m';
var red      = '\u001b[31m';
var reset    = '\u001b[0m';


// normalize the name of the sites root folder
SITE_ROOT = './'+ SITE_ROOT;
var redirectLoop = 0;


// create a new server instance
var server = http.createServer(function (request, response) {
    
    var pathname = url.parse(request.url).pathname;

    // Set the filepath
    var filePath = SITE_ROOT + (path.normalize(pathname)).toLowerCase();
    
    // Load index.html if no file path is set
    if (filePath == SITE_ROOT+'/') filePath = SITE_ROOT + _INDEX;
    
    // Resolve MIME types
    var extname = path.extname(filePath);
    var contentType;
    
//    var url_parts = url.parse(request.url,true);
//    console.log(url_parts.query);
    
    
    switch (extname) {
        case '.html':
            contentType = 'text/html';
            break;
        case '.htm':
            contentType = 'text/html';
            break;
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.jpg':
            contentType = 'image/jpeg';
            break;
        case '.jpeg':
            contentType = 'image/jpeg';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.gif':
            contentType = 'image/gif';
            break;
        case '.svg':
            contentType = 'image/svg+xml';
            break;
        case '.ico':
            contentType = 'image/x-icon';
            break;            
        case '.ttf':
            contentType = 'application/x-font-ttf';
            break;
        case '.eot':
            contentType = 'application/vnd.ms-fontobject';
            break;
        case '.woff':
            contentType = 'application/x-font-woff';
            break;
        case '.otf':
            contentType = 'application/x-font-otf';
            break;            
        case '.mp4':
            contentType = 'video/mp4';
            break;
        case '.ogv':
            contentType = 'video/ogg';
            break;
       case '.json':
           contentType = 'application/json';
           break; 
        case '.swf':
            contentType = 'application/x-shockwave-flash';
            break;
        case '.zip':
            contentType = 'application/zip';
            break;
        case '.rar':
            contentType = 'application/x-rar-compressed';
            break;
        case '.pdf':
            contentType = 'application/pdf';
            break;
        case '.docx':
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            break;
        case '.bin':
            contentType = 'application/octet-stream';
            break;
        default:
            contentType = 'text/plain';
    }
    
    // Load the requested file
    fs.exists(filePath, function (exists) {
        
        if (exists) {
        
            fs.readFile(filePath, function (error, content) {

                if (error) {
                    // 500 - Internal server error
                    response.writeHead(500);
                    response.end();

                } else {
                    // 200 - OK
                    response.writeHead(200, { 'Content-Type': contentType});
                    response.end(content, 'utf-8');
                }
                redirectLoop = 0;
            });

        } else {
            
            // Check if the request accepts a 'text/html' response. If not, return a 404 header.
            
	var regex = null;
	var rhc = null;
	var acceptHTML = null;
	try{
	
	    var regex = new RegExp("text/html");
            var rhc = request.headers.accept;
            var acceptHTML = rhc.match(regex);
            }catch(e){
			console.log(e);
			acceptHTML = false;
		}
            if(!acceptHTML) {
                response.writeHead(404);
                response.end();
                return;
            }
            
            // 404 - Page not found, redirect loop
            switch (redirectLoop) {
                
                case 0: 
                        response.writeHead(302, {'Location': _404});
                        break;
                        
                case 1: 
                        response.writeHead(302, {'Location': _INDEX});
                        break;
                
                default:
                        // 404 - Not Found
                        response.writeHead(404);
                        break;
            }
            response.end();
            redirectLoop++;
        }
    });
});


exports.start = function (ip, port) {
    
    if(ip) IP = ip;
    if(port) PORT = port;
    
    server.listen(PORT, IP);
    
    if(ip) {
        console.log(magenta + 'Server running at: ' + reset + 'http://' + IP + ':' + PORT + '/');
    }else{
        console.log(magenta + 'Server running at: ' + reset + 'http://localhost:' + PORT + '/');
    }
    
    return server;
}

