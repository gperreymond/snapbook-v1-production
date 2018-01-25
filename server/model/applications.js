// Load modules

var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var dir = require('node-dir');
var md5 = require('md5-file');
var fs = require("fs");
var fse = require('fs-extra');
var path = require("path");
var async = require("async");
var uuid = require('uuid');
var _ = require('lodash');

var ErrorEvent = require("./../event/error.event"); // CUSTOM ERROR EVENT

// Declare internals

var internals = {};

////////////////////////
// @constructor
////////////////////////

exports = module.exports = internals.Applications = function(server) {
	var self = this;
	
	// add schema to server' methods
	server.method('ApplicationSchema', function() {
		
		var ApplicationSchema = new Schema({
			// fields
			name: { type: String, required: true, trim: true, default: '' }, 
			cover: { type: String, trim: true, default: '' },
			description: { type: String, trim: true, default: '' },
			createdAt: { type: Date, default: Date.now },
			modifiedAt: { type: Date, default: Date.now },
			// relationships
			auth: { type: Schema.Types.ObjectId, ref: 'Users' },
			patterns: [{ type: Schema.Types.ObjectId, ref: 'Patterns' }],
			ressources: [{ type: Schema.Types.ObjectId, ref: 'Ressources' }],
			activities: [{ type: Schema.Types.ObjectId, ref: 'Activities' }]
		});
		
		ApplicationSchema.set('versionKey', false);
		
		return ApplicationSchema;
		
	});
	
	self.cv = require('nova-opencv');
	
	// --- crud (list all)
	server.route({
	    method: 'GET',
	    path: '/applications',
	    handler: function(request,reply) {
	        self.list_Handler(request,reply);
	    },
	    config: {
            auth: {
                strategy: 'token',
                scope: ['superu']
            }
        }
	});
	
	// --- crud (create)
	server.route({
	    method: 'POST',
	    path: '/applications',
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
	
	// --- crud (read)
	server.route({
	    method: 'GET',
	    path: '/applications/{id}',
	    handler: function(request,reply) {
	        self.read_Handler(request,reply);
	    },
	    config: {
            auth: {
                strategy: 'token',
                scope: ['application','user','superu']
            }
        }
	});

	// --- crud (compare)
	server.route({
	    method: 'POST',
	    path: '/applications/{id}/compare',
	    handler: function (request, reply) {
        	self.compare_Handler(request, reply);
		},
	    config: {
	        payload: {
	        	maxBytes: 5242880,
	            output: 'stream',
	            parse: true,
	            allow: 'multipart/form-data'
	        },
	        auth: {
                strategy: 'token',
                scope: ['application','superu']
            }
	        
	    }
	});
	
};

////////////////////////
// @crud
////////////////////////

internals.Applications.prototype.compare_Handler = function(request, reply) {
	var self = this;
	var server = request.connection.server;
	
	var errorEvent;
	var Activities = mongoose.model('Activities');
	var Patterns = mongoose.model('Patterns');
	
	var logger;
	
	try {
		
		async.waterfall([
			
			/////////////////////////////////////////
		    // 1. upload file control defined
		    /////////////////////////////////////////
		    
			function(callback) {
				var results = {};
		        var data = request.payload;
	            if (!data.file) {
					errorEvent = new ErrorEvent(418,'ERROR_TYPE_APPLICATIONS_COMPARE','FILE_REQUIERED');
					callback(errorEvent,results);
					return;
	            }
	           	var name = uuid.v4()+'.jpg';
	           	var date = new Date();
	           	var year = date.getUTCFullYear();
	           	var month = ("0" + (date.getUTCMonth()+1)).slice(-2);
				var day = ("0" + (date.getUTCDate())).slice(-2);
				var dir_path = path.normalize(process.env.SNAPBOOK_DIR_APPLICATIONS+'/uploads/'+year+'/'+month+'/'+day);
				fse.ensureDirSync(dir_path);
	            results.snap_filepath = path.normalize(dir_path+'/'+name);
	            var file = fs.createWriteStream(results.snap_filepath);
	            file.on('error', function (err) { 
	                errorEvent = new ErrorEvent(418,'ERROR_TYPE_APPLICATIONS_COMPARE',err);
					callback(errorEvent,results);
					return;
	            });
	            data.file.pipe(file);
	            data.file.on('end', function (err) {
	            	if ( err ) {
                		errorEvent = new ErrorEvent(418,'ERROR_TYPE_APPLICATIONS_COMPARE',err);
						callback(errorEvent,results);
						return;
	            	}
					file.close();
	                results.filehapi = data.file.hapi;
	                callback(null,results);
	            });
		    },
		    
		    /////////////////////////////////////////
		    // 2. compute & compare
		    /////////////////////////////////////////
		    
		    function(results,callback) {
		    	var source = path.normalize(results.snap_filepath);
		    	var application = path.normalize(process.env.SNAPBOOK_DIR_APPLICATIONS+'/'+request.params.id+'/patterns');
				server.methods.ExecCompare(source, application, function(err, results_compare) {
					if ( err ) {
                		errorEvent = new ErrorEvent(418,'ERROR_COMPARE',err);
						callback(errorEvent,null);
						return;
	            	} else {
	            		results_compare.snapfile = results.snap_filepath;
	            		callback(null,results_compare);
	            	}
				});
		    },
		    
		    /////////////////////////////////////////
		    // 3. analyse
		    /////////////////////////////////////////
		    
		    function(results,callback) {
    			var list_patterns = _.pluck(results.compare_results, 'pattern');
    			var final_results;
    			var id_pattern;
    			
    			var resmode;
    			if ( _.isNull(request.payload.mode) || _.isUndefined(request.payload.mode) ) {
    				resmode = 'debug';
    			} else {
    				resmode = request.payload.mode;
    				delete request.payload.mode;
    			}
				
				// logs
				delete request.payload.file;
		    	logger = {
	    	        message: resmode,
	    	        metadata: {
	    	        	request: {
	    	        		headers: request.headers,
	    	        		payload: request.payload
	    	        	},
	    	        	mode: resmode,
	    	        	snapfile: results.snapfile,
	    	        	application: request.params.id,
	    	        	compare_time: results.logs.compare,
	    	        	compare_patterns: _.pluck(_.sortByOrder(results.compare_results, 'good_matches', 'desc'), 'pattern')
	    	        }
	    	    };
	    	    logger.metadata.coincide = logger.metadata.compare_patterns.length>0;
	    	    
		    	switch (resmode) {
					case 'activity':
						final_results = _.pluck(_.sortByOrder(results.compare_results, 'good_matches', 'desc'), 'pattern');
						if ( _.isArray(final_results)) {
							id_pattern = final_results[0];
							Activities
							.findOne({ patterns: { "$in" : [id_pattern]} })
							.populate('ressources patterns')
							.exec( function(err,activity) {
								if ( err ) {
			                		errorEvent = new ErrorEvent(418,'ERROR_TYPE_APPLICATIONS_COMPARE',err);
									callback(errorEvent,results);
				            	} else {
				            		final_results = activity;
				            		logger.metadata.activity = (_.isNull(activity)) ? false : activity._id.toString();
									callback(null,final_results);
				            	}
							});
						} else {
							final_results = {};
							callback(null,final_results);
						}
						break;
					case 'pattern':
						final_results = _.pluck(_.sortByOrder(results.compare_results, 'good_matches', 'desc'), 'pattern');
						if ( _.isArray(final_results)) {
							id_pattern = final_results[0];
							Patterns.findOne({_id: id_pattern},function(err,pattern){
								if ( err ) {
			                		errorEvent = new ErrorEvent(418,'ERROR_TYPE_APPLICATIONS_COMPARE',err);
									callback(errorEvent,results);
				            	} else {
				            		final_results = pattern;
				            		logger.metadata.pattern = (_.isNull(pattern)) ? false : pattern._id.toString();
									callback(null,final_results);
				            	}
							});
						} else {
							final_results = {};
							callback(null,final_results);
						}
						break;
					case 'debug':
						Patterns.find({ '_id' : { $in : list_patterns } },function(err, patterns) {
							if (err) {
								errorEvent = new ErrorEvent(418,'ERROR_ANALYSE',err);
								callback(errorEvent,results);
							} else {
								results.patterns = patterns;
								callback(null,results);
							}
						});
						break;
		    	}
		    }
		    
		], function(err, results) {
			if (err) {
				err.dispatch(reply);
		    } else {
		    	if ( _.isNull(results) ) results = {};
				server.methods.ExecLogger('snaps',logger);
		    	reply(results);
		    }
		});
	} catch (e) {
    	var error_catcher = {};
    	error_catcher.name = e.name;
    	error_catcher.message = e.message;
    	error_catcher.stack = e.stack;
		errorEvent = new ErrorEvent(500,'ERROR_TYPE_SNAP_CATCH',error_catcher);
		errorEvent.dispatch(reply);
	}
};

internals.Applications.prototype.create_Handler = function(request, reply) {
	var errorEvent;
	var Users = mongoose.model('Users');
	var Applications = mongoose.model('Applications');
	
	async.waterfall([
		
		/////////////////////////////////////////
		// create application
		/////////////////////////////////////////
		
		function(callback) {
			var results = {};
			new Applications(request.payload).save(function(err,application) {
				if (err) {
					errorEvent = new ErrorEvent(418,'ERROR_TYPE_APPLICATIONS_CREATE',err);
					callback(errorEvent,results);
					return;
				}
				results.application = application;
				callback(null,results);
			});
		},
		
		/////////////////////////////////////////
		// create user
		/////////////////////////////////////////
		
		function(results,callback) {
			var auth = {};
			auth.name = uuid.v4();
			auth.email = auth.name+"@snapbook.io";
			auth.password = auth.name;
			auth.scope = "application";
			new Users(auth).save(function(err,user) {
				if (err) {
					errorEvent = new ErrorEvent(418,'ERROR_TYPE_APPLICATIONS_CREATE',err);
					callback(errorEvent,results);
					return;
				}
				results.user = user;
				callback(null,results);
			});
		},
		
		/////////////////////////////////////////
		// affect user to application
		/////////////////////////////////////////
		
		function(results,callback) {
			results.application.auth = results.user._id;
			results.application.save(function(err,application) {
				if (err) {
					errorEvent = new ErrorEvent(418,'ERROR_TYPE_APPLICATIONS_CREATE',err);
					callback(errorEvent,results);
					return;
				}
				callback(null,application);
			});
		},
		
	], function(err, results) {
		if (err) {
			err.dispatch(reply);
	    } else {
	    	reply(results);
	    }
	});
};

internals.Applications.prototype.list_Handler = function(request, reply) {
	var Applications = mongoose.model('Applications');
	
	Applications
	.find()
	.sort('-modifiedAt')
	.exec(function(err, applications) {
		if (err) {
			var errorEvent = new ErrorEvent(418,'ERROR_TYPE_APPLICATIONS_LIST',err);
			errorEvent.dispatch(reply);
		} else {
			reply(applications);
		}
	});
};

internals.Applications.prototype.read_Handler = function(request, reply) {
	var Applications = mongoose.model('Applications');
	
	Applications
	.findOne({_id: request.params.id})
	.populate('auth patterns ressources activities')
	.exec(function(err, application) {
		if (err) {
			var errorEvent = new ErrorEvent(418,'ERROR_TYPE_APPLICATIONS_READ',err);
			errorEvent.dispatch(reply);
		} else {
			reply(application);
		}
	});
};