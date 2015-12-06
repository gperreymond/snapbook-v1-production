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

/** 

type='file'
data: {
	filepath: { type: String, trim: true, default: '' },
	filename: { type: String, trim: true, default: '' },
	md5: { type: String, trim: true, default: '' },
	mime: { type: String, trim: true, default: '' },
	date: { type: Date },
	size: { type: Number, default: 0 },
}

type='url'
data: { type: String, trim: true, default: '' },

type='youtube'
data: { type: String, trim: true, default: '' },

type='non'
'data': null

**/

exports = module.exports = internals.Ressources = function(server) {
	var self = this;
	
	// add schema to server' methods
	server.method('RessourceSchema', function() {

		var RessourceSchema = new Schema({
			data: { type: Schema.Types.Mixed },
			// global manuel
			type: { type: String, required: true, trim: true, default: '' }, // LIBRE EN FONCTION DE APPLICATION
		   	name: { type: String, required: true, trim: true, default: '' }, 
		   	description: { type: String, trim: true, default: '' },
		   	// relationships
		   	application: { type: Schema.Types.ObjectId, ref: 'Applications', required: true },
		});

		RessourceSchema.set('versionKey', false);
		
		self.configuration = server.methods.Configuration();
	
		// --- crud (create)
		server.route({
		    method: 'POST',
		    path: '/ressources',
		    handler: function(request,reply) {
		        self.create_Handler(request,reply);
		    },
		    config: {
	            auth: {
	                strategy: 'token',
	                scope: ['superu']
	            }
	        }
		});
		
		return RessourceSchema;
		
	});

};

internals.Ressources.prototype.create_Handler = function(request, reply) {
	var errorEvent;
	var Applications = mongoose.model('Applications');
	var Ressources = mongoose.model('Ressources');
	
	var results = {};
	
	async.waterfall([
		
		// check if application exists
	    function(callback) {
	    	if (_.isUndefined(request.payload.application_id) || _.isNull(request.payload.application_id)) {
	    		errorEvent = new ErrorEvent(418,'ERROR_RESSOURCES_CREATE','APPLICATION_ID_IS_NULL');
	        	callback(errorEvent,null);
	        	return;
	    	}
	        Applications.findOne({_id: request.payload.application_id},function(err,application) {
	        	if (_.isUndefined(application) || _.isNull(application)) {
	        		errorEvent = new ErrorEvent(418,'ERROR_RESSOURCES_CREATE','APPLICATION_NOT_EXISTS');
	        		callback(errorEvent,null);
	        		return;
	        	}
	        	if (err) {
	        		errorEvent = new ErrorEvent(418,'ERROR_RESSOURCES_CREATE',err);
	        		callback(errorEvent,null);
	        		return;
	        	}
	        	request.payload.application = application._id;
	        	results.application = application;
	        	callback(null,results);
	        });
	    },
	    
	    // create ressource
	    function(results,callback) {
	        // do some more stuff ...
	        new Ressources(request.payload).save(function(err,ressource) {
	        	if (err) {
	        		errorEvent = new ErrorEvent(418,'ERROR_RESSOURCES_CREATE',err);
	        		callback(errorEvent,null);
	        		return;
	        	}
	        	results.ressource = ressource;
	        	callback(null,results);
	        });
	    },
	    
	    // affect ressource to application
	    function(results,callback) {
	        if ( _.isNull(results.application.ressources) || _.isUndefined(results.application.ressources) ) results.application.ressources = [];
	        results.application.ressources.push(results.ressource._id);
	        results.application.save(function(err, application) {
	        	if (err) {
	        		errorEvent = new ErrorEvent(418,'ERROR_RESSOURCES_CREATE',err);
	        		callback(errorEvent,null);
	        		return;
	        	}
	        	results.application = application;
	        	callback(null,results);
	        });
	    }
	    
	],
	
	// optional callback
	function(err, results){
	    if (err) {
	    	err.dispatch(reply);
	    } else {
	    	reply(results.ressource);
	    }
	});
};