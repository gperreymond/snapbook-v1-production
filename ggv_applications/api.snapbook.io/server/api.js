// ---------------------------
//  package.dependencies
// ---------------------------

/** env
SNAPBOOK_MONGO_URI
SNAPBOOK_MONGO_USERNAME
SNAPBOOK_MONGO_PASSWORD
SNAPBOOK_HOST
SNAPBOOK_PORT
SNAPBOOK_KEY_SESSION
SNAPBOOK_DIR_APPLICATIONS
**/

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

var path = require("path");
 
// configure database

var mongoose = require("mongoose");
mongoose.connect(process.env.SNAPBOOK_MONGO_URI);

// configure server

server.connection({ 
	host: process.env.SNAPBOOK_HOST,
	port: process.env.SNAPBOOK_PORT
});

// configure plugin Blipp

var Blipp = require('blipp');
server.register(Blipp, function(err){
	
});

// configure plugin jwt

server.register(require('hapi-auth-jwt'), function (err) {
	if (err) console.log(err);
    server.auth.strategy('token', 'jwt', {
        key: process.env.SNAPBOOK_KEY_SESSION,
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

var logger = new WSLogsController();
server.method('ExecLogger', function(name, infos) {
	logger[name](infos);
});

server.method('ExecCompare', function(source, application, next) {
	var cv = new CVController();
	cv.compare(source, application, function(err,result) {
		next(err,result);
	});
});

server.method('ExecCompare02', function(source, application, next) {
	var cv = new CVController();
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
            path: path.normalize(process.env.SNAPBOOK_DIR_APPLICATIONS+'/uploads'),
            listing: true
        }
    }
});

// start server

server.start(function () { 
	console.log('Server running at:', server.info.uri);
});