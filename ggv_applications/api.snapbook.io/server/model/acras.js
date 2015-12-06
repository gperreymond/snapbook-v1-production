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

exports = module.exports = internals.Acras = function(server) {
    var self = this;

    // add schema to server' methods
	server.method('AcraSchema', function() {

        var AcraSchema = new Schema({
            data: { type: Schema.Types.Mixed },
            report: { type: String, trim: true, default: '' }
        });
        
        AcraSchema.set('versionKey', false);
        
        self.configuration = server.methods.Configuration();
	
		// --- crud (create)
		server.route({
		    method: 'PUT',
		    path: '/acras/{id}',
		    handler: function(request,reply) {
		    	console.log('PUT','/acras/{id}');
		        self.create_Handler(request,reply);
		    }
		});
        
        return AcraSchema;
		
	});
	
	self.configuration = server.methods.Configuration();
	
};

internals.Acras.prototype.create_Handler = function(request, reply) {
	var Acras = mongoose.model('Acras');
	
	var values = JSON.stringify(request.payload);
	
	var acras = {
		data: JSON.parse(values),
		report: request.params.id
	};
	
	Acras.create(acras,function(err) {
		if (err) {
			var errorEvent = new ErrorEvent(418,'ERROR_TYPE_ACRAS_LIST',err);
			errorEvent.dispatch(reply);
		} else {
			reply({acras: acras.report});
		}
	});
	
};