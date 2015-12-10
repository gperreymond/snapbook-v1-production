// Load modules

var gm = require('gm');
var mime = require('mime');

var fs = require("fs");
var fse = require('fs-extra');

// Declare internals

var internals = {};

///////////////////////
// @constructor
////////////////////////

exports = module.exports = internals.IMController = function() {
    var self = this;
};

////////////////////////
// @methods
////////////////////////

internals.IMController.prototype.analyse = function(filepath, callback) {
    gm(filepath)
    .identify(function (err, result) {
      if (!err) return callback(err, null);
      result.mime = mime.lookup(filepath);
      callback(null, result);
    });
};