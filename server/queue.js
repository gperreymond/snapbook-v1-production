// ---------------------------
//  package.dependencies
// ---------------------------

var fse = require('fs-extra');
var path = require('path');
var _ = require('lodash');
var async = require('async');
var dir = require('node-dir');
var querystring = require('querystring');
var http = require('http');

var Hapi = require('hapi');
var server = new Hapi.Server({
  	connections: {
    	routes: {
      		cors: true
    	}
  	}
});

var _ = require("lodash");
var path = require("path");

var CVController = require("./controller/opencv.controller"); // OPENCV controller internal

var configuration = require('./configuration');
server.method('Configuration', function() {
	return require('./configuration');
});

var cv = require(configuration.rootDirs.modules+'/ggv-opencv');

// configure server

server.connection({ 
	host: configuration.server_compare.host,
	port: configuration.server_compare.port
});

// configure plugin Blipp

var Blipp = require('blipp');
server.register(Blipp, function(err){
	
});

server.route({
    method: 'POST',
    path: '/compare',
    handler: function(request,reply) {
        console.log(process.pid, 'POST', '/compare');
        var configuration = require('./configuration');
        try {
            var snap_filepath = path.normalize(request.payload.snap_filepath);
            var patterns_dirpath = path.normalize(request.payload.patterns_dirpath);
            
            dir.readFiles(patterns_dirpath, {
                match: /.jpg$/,
                exclude: /^\./
            }, function(err, content, next) {
                if (err) throw err;
                next();
            },
            function(err, files) {
                async.mapLimit(files, 50,
                    function(item, cb) {
                        var postData = querystring.stringify({
                            'snap_filepath' : snap_filepath,
                            'pattern_filepath': item
                        });
                        var options = {
                            hostname: configuration.queue.hostname,
                            port: configuration.queue.port,
                            path: '/compare/pattern',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'Content-Length': postData.length
                            }
                        };
                        var req = http.request(options, function(res) {
                            if ( res.statusCode!=200 ) {
                                cb(res.statusCode, null);
                            } else {
                                res.setEncoding('utf8');
                                res.on('data', function (data) {
                                    data = JSON.parse(data);
                                    if (data.coincide===true) {
                                        data.pattern = path.basename(item, '.jpg');
                                        cb(null, data);
                                    } else {
                                        cb(null, false);
                                    }
                                });
                            }
                        });
                        req.write(postData);
                        req.end();
                    }, function(err, results_async) {
                        if (err) {
                            reply('ERROR_COMPARE_QUEUE').code(err);
                        } else {
                            reply(results_async);
                        }
                    });
            });
            
        } catch (e) {
            var error_catcher = {};
    	    error_catcher.name = e.name;
    	    error_catcher.message = e.message;
    	    error_catcher.stack = e.stack;
    	    reply(error_catcher).code(418);
        }
    }
});

server.route({
    method: 'POST',
    path: '/compare/pattern',
    handler: function(request,reply) {
        console.log(process.pid, 'POST', '/compare/pattern');
        try {
            var snap_filepath = path.normalize(request.payload.snap_filepath);
            var pattern_filepath = path.normalize(request.payload.pattern_filepath);
            q.push({snap : snap_filepath, pattern : pattern_filepath}, function (err, result) {
                if (err) {
                    reply('ERROR_COMPARE_QUEUE').code(418);
                } else {
                    reply(result);
                }  
            });
        } catch (e) {
            var error_catcher = {};
    	    error_catcher.name = e.name;
    	    error_catcher.message = e.message;
    	    error_catcher.stack = e.stack;
    	    console.log(error_catcher);
    	    reply(error_catcher).code(418);
        }
    }
});

server.start(function () { 
	console.log('Server running at:', server.info.uri);
});

var processes = 4;
var q = async.queue(function (task, callback) {
    compare(path.normalize(task.snap), path.normalize(task.pattern), function(err, result) {
        if (err) {
            callback(err, false);
        } else {
            callback(false, result);
        }
    });
}, processes);
q.drain = function() {
    
};

var compare = function(snapfile, patternfile, callback_batch) {
    var dirpath = path.dirname(patternfile);
    var basename = path.basename(patternfile,'.jpg');
    
    var results = {};
    
    var keypointsFile = path.normalize(dirpath+'/keypoints/'+basename+'-kpts.yml');
    var descriptorsFile = path.normalize(dirpath+'/descriptors/'+basename+'-dcts.yml');
    cv.loadImage(snapfile, function(err, imview) {
        imview.compute('AKAZE', function(err, imview_compute) {
            imview.compare(keypointsFile, descriptorsFile, function(err, cpp_compare_result) {
                if ( cpp_compare_result===0 ) {
                    results.coincide = false;
                } else {
                    results.coincide = true;
                    results.good_matches = cpp_compare_result;
                }
                
                callback_batch(err, results);
            });
        });
    });
    
}