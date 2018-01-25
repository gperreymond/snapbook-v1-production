// Load modules

var mongoose = require("mongoose");
var Schema = mongoose.Schema;
    
var crypto = require('crypto');
var _ = require('lodash');
var jwt = require('jsonwebtoken');

var ErrorEvent = require("./../event/error.event"); // CUSTOM ERROR EVENT

// Declare internals

var internals = {};

////////////////////////
// @constructor
////////////////////////

exports = module.exports = internals.Users = function(server) {
    var self = this;

    // add schema to server' methods
	server.method('UserSchema', function() {
	    
	    var UserSchema = new Schema({
	        // fields
            name: { type: String, required: true, trim: true },
            email: { type: String, required: true, trim: true, lowercase: true },
            info: { type: String, trim: true }, 
            scope: { type: String, required: true },
            hashedPassword: String,
            provider: String,
            salt: String,
        });
	    
	    UserSchema
        .virtual('password')
        .set(function(password) {
            this._password = password;
            this.salt = this.makeSalt();
            this.hashedPassword = this.encryptPassword(password);
        })
        .get(function() {
            return this._password;
        });
        
        UserSchema
        .virtual('profile')
        .get(function() {
            return {
                'name': this.name,
                'scope': this.scope
            };
        });
        
        UserSchema
        .virtual('token')
        .get(function() {
            return {
                '_id': this._id,
                'scope': this.scope
            };
        });
        
        UserSchema.methods = {
            authenticate: function(plainText) {
                return this.encryptPassword(plainText) === this.hashedPassword;
            },
            makeSalt: function() {
                return crypto.randomBytes(16).toString('base64');
            },
            encryptPassword: function(password) {
                if (!password || !this.salt) return '';
                var salt = new Buffer(this.salt, 'base64');
                return crypto.pbkdf2Sync(password, salt, 10000, 64).toString('base64');
            }
        };
        
        UserSchema.set('versionKey', false);

        return UserSchema;
        
	});
    
    // --- auth/local
	server.route({
	    method: 'POST',
	    path: '/auth/local',
	    handler: function(request,reply) {
	        self.auth_local_Handler(request,reply);
	    }
	});
	
	// --- auth/local
	server.route({
	    method: 'GET',
	    path: '/auth/me',
	    handler: function(request,reply) {
	        self.auth_me_Handler(request,reply);
	    },
	    config: {
            auth: {
                strategy: 'token',
                scope: ['user','superu']
            }
        }
	});
		
};

internals.Users.prototype.auth_me_Handler = function(request, reply) {
    var self = this;
	var errorEvent;
	
	var Users = mongoose.model('Users');
    Users.findOne({ _id : request.auth.credentials._id },function(err,user) {
        if (err) {
            errorEvent = new ErrorEvent(418,'ERROR_TYPE_USERS_AUTH',err);
			errorEvent.dispatch(reply);
        } else if ( _.isNull(user) ) {
            errorEvent = new ErrorEvent(418,'ERROR_TYPE_USERS_AUTH','USER_EMAIL_NOT_MATCHING');
			errorEvent.dispatch(reply);
        } else {
            reply(user);
        }
    });
	
};

internals.Users.prototype.auth_local_Handler = function(request, reply) {
    var self = this;
    var server = request.connection.server;
    
	var errorEvent;
    
	var Users = mongoose.model('Users');
	
    Users.findOne({ email : request.payload.email },function(err,user) {
        if (err) {
            errorEvent = new ErrorEvent(418,'ERROR_TYPE_USERS_AUTH',err);
			errorEvent.dispatch(reply);
        } else if ( _.isNull(user) ) {
            errorEvent = new ErrorEvent(418,'ERROR_TYPE_USERS_AUTH','USER_EMAIL_NOT_MATCHING');
			errorEvent.dispatch(reply);
        } else {
	        if (user.authenticate(request.payload.password)) {
	            var signToken = jwt.sign({ _id: user._id, scope: user.scope }, process.env.SNAPBOOK_KEY_SESSION, { expiresInMinutes: 60*24 });
		    	if (err) {
		    	    errorEvent = new ErrorEvent(418,'ERROR_TYPE_USERS_AUTH',err);
			        errorEvent.dispatch(reply);
		    	} else {
		    	    reply({token: signToken});
		    	}
	        } else {
	            errorEvent = new ErrorEvent(418,'ERROR_TYPE_USERS_AUTH','USER_PASSWORD_NOT_MATCHING');
			    errorEvent.dispatch(reply);
	        }
        }
	});
	
};
