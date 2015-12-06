// Load modules

var _ = require('lodash');

var winston = require('winston');
require('winston-mongodb').MongoDB;

// Declare internals

var internals = {};

///////////////////////
// @constructor
////////////////////////

exports = module.exports = internals.WSLogsController = function(configuration) {
    winston.remove(winston.transports.Console);
    winston.add(winston.transports.MongoDB, configuration.winston.snaps);
};

////////////////////////
// @methods
////////////////////////

internals.WSLogsController.prototype.snaps = function(infos) {
    winston.log('info', infos.message, infos.metadata);
};