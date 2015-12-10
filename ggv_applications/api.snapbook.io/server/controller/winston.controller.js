// Load modules

var _ = require('lodash');

var winston = require('winston');
require('winston-mongodb').MongoDB;

// Declare internals

var internals = {};

///////////////////////
// @constructor
////////////////////////

exports = module.exports = internals.WSLogsController = function() {
    winston.remove(winston.transports.Console);
    winston.add(winston.transports.MongoDB, {
		db: process.env.SNAPBOOK_MONGO_URI,
		username: process.env.SNAPBOOK_MONGO_USERNAME,
		password: process.env.SNAPBOOK_MONGO_PASSWORD,
		collection: 'stats-snaps'
	});
};

////////////////////////
// @methods
////////////////////////

internals.WSLogsController.prototype.snaps = function(infos) {
    winston.log('info', infos.message, infos.metadata);
};