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

exports = module.exports = internals.Activities = function(server) {
    var self = this;

    // add schema to server' methods
	server.method('ActivitySchema', function() {

        var ActivitySchema = new Schema({
            data: { type: Schema.Types.Mixed },
			// global manuel
			type: { type: String, required: true, trim: true, default: '' }, // LIBRE EN FONCTION DE APPLICATION
		   	name: { type: String, required: true, trim: true, default: '' }, 
		   	description: { type: String, trim: true, default: '' },
		   	// relationships
		   	application: { type: Schema.Types.ObjectId, ref: 'Applications', required: true },
            // collections
            activities: [{ type: Schema.Types.ObjectId, ref: 'Activities' }],
            patterns: [{ type: Schema.Types.ObjectId, ref: 'Patterns' }],
            ressources: [{ type: Schema.Types.ObjectId, ref: 'Ressources' }]
        });
        
        ActivitySchema.set('versionKey', false);
        
        self.configuration = server.methods.Configuration();
	
		// --- crud (create)
		server.route({
		    method: 'POST',
		    path: '/activities',
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
        
        return ActivitySchema;
		
	});
	
	self.configuration = server.methods.Configuration();
	
};

internals.Activities.prototype.create_Handler = function(request, reply) {
	var errorEvent;
	var Applications = mongoose.model('Applications');
	var Activities = mongoose.model('Activities');
	
	var results = {};
	
	async.waterfall([
		
		// check if application exists
	    function(callback) {
	    	if (_.isUndefined(request.payload.application_id) || _.isNull(request.payload.application_id)) {
	    		errorEvent = new ErrorEvent(418,'ERROR_ACTIVITIES_CREATE','APPLICATION_ID_IS_NULL');
	        	callback(errorEvent,null);
	        	return;
	    	}
	        Applications.findOne({_id: request.payload.application_id},function(err,application) {
	        	if (_.isUndefined(application) || _.isNull(application)) {
	        		errorEvent = new ErrorEvent(418,'ERROR_ACTIVITIES_CREATE','APPLICATION_NOT_EXISTS');
	        		callback(errorEvent,null);
	        		return;
	        	}
	        	if (err) {
	        		errorEvent = new ErrorEvent(418,'ERROR_ACTIVITIES_CREATE',err);
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
	        new Activities(request.payload).save(function(err,activity) {
	        	if (err) {
	        		errorEvent = new ErrorEvent(418,'ERROR_ACTIVITIES_CREATE',err);
	        		callback(errorEvent,null);
	        		return;
	        	}
	        	results.activity = activity;
	        	callback(null,results);
	        });
	    },
	    
	    // affect activity to application
	    function(results,callback) {
	        if ( _.isNull(results.application.activities) || _.isUndefined(results.application.activities) ) results.application.activities = [];
	        results.application.activities.push(results.activity._id);
	        results.application.save(function(err, application) {
	        	if (err) {
	        		errorEvent = new ErrorEvent(418,'ERROR_ACTIVITIES_CREATE',err);
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
	    	reply(results.activity);
	    }
	});
};