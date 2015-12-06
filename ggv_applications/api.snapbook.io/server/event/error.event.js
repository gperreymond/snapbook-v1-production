// Load modules

// Declare internals

var internals = {};

///////////////////////
// @constructor
////////////////////////

exports = module.exports = internals.ErrorEvent = function(number, type, message) {
	var self = this;

	self.number = number;
	self.type = type;
	self.message = message;
};

////////////////////////
// @methods
////////////////////////

internals.ErrorEvent.prototype.dispatch = function(reply) {
	var self = this;
	
	var e = {
		statusCode: self.number,
		error: self.type,
		message: self.message
	};
	reply(e).code(self.number);
};

