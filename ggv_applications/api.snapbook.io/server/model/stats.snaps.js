// Load modules

var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var async = require('async');
var _ = require('lodash');

var ErrorEvent = require("./../event/error.event"); // CUSTOM ERROR EVENT

// Declare internals

var internals = {};

////////////////////////
// @constructor
////////////////////////

exports = module.exports = internals.StatsSnaps = function(server) {
    var self = this;

    // add schema to server' methods
	server.method('StatSnapSchema', function() {

        var StatSnapSchema = new Schema({
        	message: { type: String, trim: true },
        	timestamp: { type: Date },
        	level: { type: String, trim: true },
            meta: { type: Schema.Types.Mixed }
        });
        
        StatSnapSchema.set('versionKey', false);
        
        self.configuration = server.methods.Configuration();
	
		// --- crud (read all)
		server.route({
		    method: 'GET',
		    path: '/stats/snaps',
		    handler: function(request,reply) {
		    	self.read_Handler(request,reply);
		    }
		});
        
        return StatSnapSchema;
		
	});
	
	self.configuration = server.methods.Configuration();
	
};

internals.StatsSnaps.prototype.read_Handler = function(request, reply) {
	var StatsSnaps = mongoose.model('StatsSnaps');
	
	var limit = request.query.limit ? encodeURIComponent(request.query.limit) : 50;
	
	StatsSnaps
	.find({'meta.mode':'activity','meta.application':'5554fe71e55c84d43f6c5d5f','meta.coincide':true})
	.sort({timestamp:-1})
	.limit(limit)
	.exec(function(err,data) {
		if (err) {
			var errorEvent = new ErrorEvent(418,'ERROR_TYPE_STATS_SNAPS_LIST',err);
			errorEvent.dispatch(reply);
		} else {
			reply(data);
		}
	});
	
	
};