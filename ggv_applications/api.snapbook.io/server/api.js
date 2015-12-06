// ---------------------------
//  package.dependencies
// ---------------------------

require('pmx').init({
	http: true,
	network: true,
	ports: false
});

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
var dir = require('node-dir');
var async = require('async');

var configuration = require('./configuration');
server.method('Configuration', function() {
	return require('./configuration');
});
 
// configure database

var mongoose = require("mongoose");
mongoose.connect(configuration.mongo.uri, configuration.mongo.options);

// configure server

server.connection({ 
	host: configuration.server.host,
	port: configuration.server.port
});

/**
// configure socketIO
var socket = require('socket.io-client')('http://localhost:8090');
socket.on('connect', function() {
    console.log('Sockets.Client.IO', 'Le serveur est connecté');
});
socket.on('disconnect', function() {
    console.log('Sockets.Client.IO', 'Le serveur est déconnecté');
});
socket.on('return_compare', function (data) {
    console.log('Sockets.Client.IO', 'on', 'return_compare');
    socket.compare_result.push(data);
    if ( socket.compare_result.length==socket.compare_patterns.length ) {
        socket.reply(socket.compare_result);
        delete socket.reply;  
        delete socket.compare_result;
        delete socket.compare_patterns;
    } else {
        
    }
});
server.route({
    method: 'POST',
    path: '/io/compare',
    handler: function(request, reply) {
        dir.readFiles(request.payload.patterns_dirpath, {
            match: /.jpg$/,
            exclude: /^\./
        }, function(err, content, next) {
            if (err) {
                console.log(err);
                throw err;
            }
            next();
        },
        function(err, files) {
            socket.reply = reply;
            socket.compare_patterns = files;
            socket.compare_result = [];
            async.map(files, function(item, cb) {
                var data = {
                    snap_filepath: request.payload.snap_filepath,
                    pattern_filepath: item
                };
                console.log('Sockets.Client.IO', 'emit', 'start_compare', data);
                cb(null, true);
                socket.emit('start_compare', data);
            }, function(err, results) {
                console.log('>>>', results);
            });
        });
    }
});
**/

// configure plugin Blipp

var Blipp = require('blipp');
server.register(Blipp, function(err){
	
});

// configure plugin jwt

server.register(require('hapi-auth-jwt'), function (err) {
	if (err) console.log(err);
    server.auth.strategy('token', 'jwt', {
        key: configuration.secrets.session,
        validateFunc: validateToken
    });
});
var validateToken = function (decodedToken, callback) {
	var Users = mongoose.model('Users');
    Users
    .findOne({_id: decodedToken._id}, '-salt -hashedPassword', function(err, user) {
    	if (err) return callback(null, false);
    	return callback(null, true, user);
	});
};

// configure mongoose schemas

var Applications = require('./model/applications');
new Applications(server);
mongoose.model('Applications', server.methods.ApplicationSchema());

var Users = require('./model/users');
new Users(server);
mongoose.model('Users', server.methods.UserSchema());

var Patterns = require('./model/patterns');
new Patterns(server);
mongoose.model('Patterns', server.methods.PatternSchema());

var Ressources = require('./model/ressources');
new Ressources(server);
mongoose.model('Ressources', server.methods.RessourceSchema());

var Activities = require('./model/activities');
new Activities(server);
mongoose.model('Activities', server.methods.ActivitySchema());

var Acras = require('./model/acras');
new Acras(server);
mongoose.model('Acras', server.methods.AcraSchema());

var StatsSnaps = require('./model/stats.snaps');
new StatsSnaps(server);
mongoose.model('StatsSnaps', server.methods.StatSnapSchema(), 'stats-snaps');

// server methods

var CVController = require("./controller/opencv.controller"); // OPENCV controller internal
var WSLogsController = require("./controller/winston.controller"); // WINSTON controller internal

var logger = new WSLogsController(configuration);
server.method('ExecLogger', function(name, infos) {
	logger[name](infos);
});

server.method('ExecCompare', function(source, application, next) {
	var cv = new CVController(configuration.rootDirs.modules);
	cv.compare(source, application, function(err,result) {
		next(err,result);
	});
});

server.method('ExecCompare02', function(source, application, next) {
	var cv = new CVController(configuration.rootDirs.modules);
	cv.compare02(source, application, function(err,result) {
		next(err,result);
	});
});

// statics routes

server.route({
    method: 'GET',
    path: '/dashboard/{param*}',
    handler: {
        directory: {
            path: 'dashboard',
            listing: false
        }
    }
});

server.route({
    method: 'GET',
    path: '/libs/{param*}',
    handler: {
        directory: {
            path: 'bower_components',
            listing: false
        }
    }
});

server.route({
    method: 'GET',
    path: '/media/snaps/{param*}',
    handler: {
        directory: {
            path: path.normalize(configuration.rootDirs.applications+'/uploads'),
            listing: true
        }
    }
});

// start server

server.start(function () { 
	console.log('Server running at:', server.info.uri);
});