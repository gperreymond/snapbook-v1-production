var cv = require('../build/Release/cloudcv');
var fse = require('fs-extra');
var path = require('path');
var _ = require('lodash');
var async = require('async');
var dir = require('node-dir');

var params = {};
process.argv.forEach(function (val, index, array) {
    if ( index>=2 ) {
        params[val.split('=')[0]] = val.split('=')[1];
    }
});

var processes = 10;
var debug = true; 
var method = 'AKAZE';

dir.readFiles(params.source, {
    match: /.jpg$/,
    exclude: /^\./
}, function(err, content, next) {
    if (err) throw err;
    next();
},
function(err, files){
    if (err) throw err;
    start(files, method);
});

function start(files, method) {
    console.log('*****', 'GLOBAL START');
    var TS = new Date();
    async.mapLimit(files, processes, 
        function(item, cb) {
            batch(path.normalize(item), method, function(err, result) {
                if (err) {
                    console.log(err);
                    cb(err, null);
                } else {
                    if (debug) console.log(result);
                    cb(null, true);
                }
            });
        }, function(err, results) {
            var TE = new Date();
            console.log('*****', 'GLOBAL END','execute in', TE-TS, 'ms');
    });
}

function batch(filepath, method, callback_batch) {
    var filename = path.basename(filepath);
    var dirpath = path.dirname(filepath);
    var basename = path.basename(filepath,'.jpg');
    
    var maxWidth = 512;
    var maxHeight = 512;
    
    var t1;
    var t2;
    
    async.waterfall([
        // 0. filename
        function(callback) {
            var results = {};
            results.method = method;
            results.logs = {};
            results.logs.filename = filename;
            callback(null, results);
        },
        // 1. load image
        function(results, callback) {
            t1 = new Date();
            cv.loadImage(path.normalize(dirpath+'/'+filename), function(err, imview) {
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
        // 2. optimize size
        function(results, callback) {
            t1 = new Date();
            getOptimalSizeImage(results.imview, maxWidth, maxHeight, function(w, h) {
                results.imview.thumbnail(w, h, function(err, imview_thumb) {
                    if (err) {
                        return callback(err,null);
                    } else {
                        t2 = new Date();
                        results.logs.optimize = t2 - t1;
                        results.imview = imview_thumb;
                        results.imview.asPngStream(function(err, data) {
                            if (err) {
                                return callback(err,null);
                            } else {
                                var file_thb = path.normalize(dirpath+'/thumbs/'+basename+'-thb.png');
                                fse.ensureFileSync(file_thb);
                                fse.writeFileSync(file_thb, new Buffer(data));
                            }
                        });
                        callback(null, results);
                    }
                });
            });
        },
        // 3. compute AKAZE
        function(results, callback) {
            t1 = new Date();
            results.imview.compute(results.method, function(err, imview_compute) {
                if (err) {
                    return callback(err,null);
                } else {
                    t2 = new Date();
                    results.logs.computeAKAZE = t2 - t1;
                    var file_kpts = path.normalize(dirpath+'/keypoints/'+basename+'-kpts.yml');
                    fse.ensureFileSync(file_kpts);
                    fse.writeFileSync(file_kpts, results.imview.keypoints());
                    var file_dcts = path.normalize(dirpath+'/descriptors/'+basename+'-dcts.yml');
                    fse.ensureFileSync(file_dcts);
                    fse.writeFileSync(file_dcts, results.imview.descriptors());
                    imview_compute.asPngStream(function(err, data) {
                        if (err) {
                            return callback(err,null);
                        } else {
                            var file_cpte = path.normalize(dirpath+'/compute/'+basename+'-cpte.png');
                            fse.ensureFileSync(file_cpte);
                            fse.writeFileSync(file_cpte, new Buffer(data));
                            callback(null, results);
                        }
                    });
                }
            });
        }
    ],
    function(err, results) {
        if (err) {
            callback_batch(err, null);
        } else {
            callback_batch(null, results.logs);
        }
    });
}

function getOptimalSizeImage(imgview, maxWidth, maxHeight, callback) {
    if ( imgview.width() > maxWidth || imgview.height() > maxHeight ) {
        var imgWidth = imgview.width();
        var imgHeight = imgview.height();
        var width = imgview.width();
        var height = imgview.height();
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

