// Load modules

var fse = require('fs-extra');
var path = require('path');
var _ = require('lodash');
var async = require('async');
var dir = require('node-dir');
var querystring = require('querystring');
var http = require('http');

// Declare internals

var internals = {};

///////////////////////
// @constructor
////////////////////////

exports = module.exports = internals.CVController = function() {
    var self = this;
    self.cv = require('nova-opencv');
    
    self.processes = 4;
    self.q = async.queue(function (task, callback) {
        self.compare_execute(path.normalize(task.snap_filepath), task.imview_pointer, function(err, result) {
            if (err) {
                callback(err, false);
            } else {
                callback(false, result);
            }
        });
    }, self.processes);
    self.q.drain = function() {
        var results = _.filter(self.compare_callback_results, function(item) {
            return item!==false;
        });
        self.compare_callback(null, results);
    };
    
};

////////////////////////
// @methods
////////////////////////

internals.CVController.prototype.compare = function(source, application, callback) {
    var self = this;
    var method = 'AKAZE';
    
    var t1;
    var t2;
    var maxWidth = 512;
    var maxHeight = 512;
    
    async.waterfall([
        // 0. filename
        function(callback) {
            var results = {};
            results.method = method;
            results.logs = {};
            results.logs.source = source;
            results.logs.application = application;
            callback(null, results);
        },
        // 1. load snap
        function(results, callback) {
            t1 = new Date();
            self.cv.loadImage(source, function(err, imview) {
                if (err) {
                    return callback(err,null);
                } else {
                    t2 = new Date();
                    results.logs.load = t2 - t1;
                    results.imview = imview;
                    callback(null, results);
                }
            });
        },
        // 2. resize snap
        function(results, callback) {
            t1 = new Date();
            getOptimalSizeImage(results.imview, maxWidth, maxHeight, function(w, h) {
                results.imview.thumbnail(w, h, function(err, imview_thumb) {
                    if (err) {
                        callback(err,null);
                    } else {
                        t2 = new Date();
                        results.logs.resize = t2 - t1;
                        results.imview = imview_thumb;
                        callback(null, results);
                    }
                });
            });
        },
        // 3. compute snap
        function(results, callback) {
            t1 = new Date();
            results.imview.compute(results.method, function(err, imview_compute) {
                if (err) {
                    callback(err,null);
                } else {
                    t2 = new Date();
                    results.imview_compute = imview_compute;
                    results.logs.compute = t2 - t1;
                    callback(null, results);
                }
            });
        },
        // 4. save resize snap
        function(results, callback) {
            t1 = new Date();
            results.imview.asPngStream(function(err, data) {
                if (err) {
                    callback(err,null);
                } else {
                    var file_cpte = path.normalize(path.normalize(results.logs.source));
                    fse.removeSync(results.logs.source);
                    results.logs.source = results.logs.source;
                    fse.ensureFileSync(file_cpte);
                    fse.writeFileSync(file_cpte, new Buffer(data));
                    t2 = new Date();
                    results.logs.archive = t2 - t1;
                    callback(null, results);
                }
            });
        },
        // 5. exec compare
        function(results, callback) {
            t1 = new Date();
            self.compare_start(results.imview, application, function(err,compare_results) {
                t2 = new Date();
                results.logs.compare = t2 - t1;
                results.compare_results = compare_results;
                callback(err,results);
            });
        }
    ],
    function(err, results) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, results);
        }
    });

};

internals.CVController.prototype.compare_start = function(imview, application, callback) {
    var self = this;
    
    self.compare_callback = callback;
    self.compare_callback_results = [];
    
    dir.readFiles(application, {
        match: /.jpg$/,
        exclude: /^\./
    }, function(err, content, next) {
        if (err) throw err;
        next();
    },
    function(err, files){
        if (err) return callback(err, null);
        
        _.forEach(files, function(item) {
            self.q.push({snap_filepath : path.normalize(item), imview_pointer : imview}, function (err, result) {
                if (err) {
                    self.compare_callback_results.push(false);
                } else {
                    if (result.coincide===true) {
                        result.pattern = path.basename(item, '.jpg');
                        self.compare_callback_results.push(result);
                    } else {
                        self.compare_callback_results.push(false);
                    }
                }
            });
        });
        
    });
};

internals.CVController.prototype.compare_execute = function(filepath, imview, callback_batch) {
    var dirpath = path.dirname(filepath);
    var basename = path.basename(filepath,'.jpg');
    
    var results = {};
    
    var keypointsFile = path.normalize(dirpath+'/keypoints/'+basename+'-kpts.yml');
    var descriptorsFile = path.normalize(dirpath+'/descriptors/'+basename+'-dcts.yml');
    
    imview.compare(keypointsFile, descriptorsFile, function(err, result) {
        if ( result===0 ) {
            results.coincide = false;
        } else {
            results.coincide = true;
            results.good_matches = result;
        }
        callback_batch(err, results);
    });
};

function getOptimalSizeImage(imgview, maxWidth, maxHeight, callback) {
    var imgWidth;
    var imgHeight;
    var width;
    var height;
    
    if ( imgview.width() > maxWidth || imgview.height() > maxHeight ) {
        imgWidth = imgview.width();
        imgHeight = imgview.height();
        width = imgview.width();
        height = imgview.height();
        if (maxWidth && width > maxWidth) {
            width = maxWidth;
            height = (imgHeight * width / imgWidth);
        }
        if (maxHeight && height > maxHeight) {
            height = maxHeight;
            width = (imgWidth * height / imgHeight);
        }
        width = width;
        height = height;
    } else {
        width = imgview.width();
        height = imgview.height();
    }
    callback(width, height);
    
}