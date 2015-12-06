// Load modules

var imagemagick = require('imagemagick-native');
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
    var self = this;
    
    imagemagick.identify({
        srcData: fs.readFileSync(filepath),
    }, function (err, result) {
        if (err) {
            callback(err,null);
        } else {
            result.mime = mime.lookup(filepath);
            callback(null,result);
        }
    });
};