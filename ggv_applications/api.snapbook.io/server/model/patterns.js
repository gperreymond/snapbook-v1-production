// Load modules

var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var uuid = require('uuid');
var _ = require('lodash');
var md5 = require('md5-file');
var path = require('path');
var async = require('async');
var fs = require('fs');
var fse = require('fs-extra');

var IMController = require("./../controller/im.controller"); // IMAGEMAGICK && OPENCV controller internal
var ErrorEvent = require("./../event/error.event"); // CUSTOM ERROR EVENT

// Declare internals

var internals = {};

////////////////////////
// @constructor
////////////////////////

exports = module.exports = internals.Patterns = function(server) {
    var self = this;

    // add schema to server' methods
	server.method('PatternSchema', function() {
		
		var PatternSchema = new Schema({
			// fields
		   	name: { type: String, required: true, trim: true, default: '' }, 
		   	description: { type: String, trim: true, default: '' },
			// fields auto
			filepath: { type: String, trim: true, default: '' },
			filename: { type: String, trim: true, default: '' },
			md5: { type: String, trim: true, default: '' },
			mime: { type: String, trim: true, default: '' },
			date: { type: Date },
			size: { type: Number, default: 0 },
			width: { type: Number, default: 0 },
			height: { type: Number, default: 0 },
		   	// relationships
		   	application: { type: Schema.Types.ObjectId, ref: 'Applications' }
		});

		PatternSchema.set('versionKey', false);
		
		return PatternSchema;
		
	});
	
	self.configuration = server.methods.Configuration();
	
	// --- crud (create)
	server.route({
	    method: 'POST',
	    path: '/patterns',
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
	
	// --- crud (upload)
	/** server.route({
	    method: 'PATCH',
	    path: '/patterns/{id}/upload',
	    handler: function (request, reply) {
        	self.upload_Handler(request, reply);
		},
	    config: {
	        payload: {
	        	maxBytes: self.configuration.upload.maxBytes,
	            output: 'stream',
	            parse: true,
	            allow: 'multipart/form-data'
	        },
            auth: {
                strategy: 'token',
                scope: ['superu']
            }
	    }
	}); **/
	
};

////////////////////////
// @crud
////////////////////////

/**
internals.Patterns.prototype.upload_Handler = function(request, reply) {
	var self = this;
	
	var errorEvent;
	var Patterns = mongoose.model('Patterns');
	
	var imMaxWidth = 640;
	var imMaxHeight = 640;
	
	try {
		
		var im = new IMController();
		
		async.waterfall([
			
			...
		    
		], function(err, results) {
			if (err) {
				err.dispatch(reply);
		    } else {
		    	reply(results);
		    }
		});
	
	} catch (e) {
    	var error_catch = {};
    	error_catch.name = e.name;
    	error_catch.message = e.message;
    	error_catch.stack = e.stack;
		errorEvent = new ErrorEvent(500,'ERROR_TYPE_PATTERNS_UPLOAD',error_catch);
		errorEvent.dispatch(reply);
	}
};
**/

internals.Patterns.prototype.create_Handler = function(request, reply) {
	var errorEvent;
	var Applications = mongoose.model('Applications');
	var Patterns = mongoose.model('Patterns');
	
	var results = {};
	async.waterfall([
		
		// check if application exists
	    function(callback) {
	    	if (_.isUndefined(request.payload.application_id) || _.isNull(request.payload.application_id)) {
	    		errorEvent = new ErrorEvent(418,'ERROR_PATTERNS_CREATE','APPLICATION_ID_IS_NULL');
	        	callback(errorEvent,null);
	        	return;
	    	}
	        Applications.findOne({_id: request.payload.application_id},function(err,application) {
	        	if (_.isUndefined(application) || _.isNull(application)) {
	        		errorEvent = new ErrorEvent(418,'ERROR_PATTERNS_CREATE','APPLICATION_NOT_EXISTS');
	        		callback(errorEvent,null);
	        		return;
	        	}
	        	if (err) {
	        		errorEvent = new ErrorEvent(418,'ERROR_PATTERNS_CREATE',err);
	        		callback(errorEvent,null);
	        		return;
	        	}
	        	request.payload.application = application._id;
	        	results.application = application;
	        	callback(null,results);
	        });
	    },
	    
	    // create pattern
	    function(results,callback) {
	        // do some more stuff ...
	        new Patterns(request.payload).save(function(err,pattern) {
	        	if (err) {
	        		errorEvent = new ErrorEvent(418,'ERROR_PATTERNS_CREATE',err);
	        		callback(errorEvent,null);
	        		return;
	        	}
	        	results.pattern = pattern;
	        	callback(null,results);
	        });
	    },
	    
	    // affect pattern to application
	    function(results,callback) {
	        if ( _.isNull(results.application.patterns) || _.isUndefined(results.application.patterns) ) results.application.patterns = [];
	        results.application.patterns.push(results.pattern._id);
	        results.application.save(function(err, application) {
	        	if (err) {
	        		errorEvent = new ErrorEvent(418,'ERROR_PATTERNS_CREATE',err);
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
	    	reply(results.pattern);
	    }
	});
	
};