// var configuration = require('../../server/configuration');
var CVController = require('../../server/controller/opencv.controller');
var IMController = require('../../server/controller/im.controller');

var configuration = {
  mongo: {
    uri: process.env.SNAPBOOK_MONGO_URI,
    options: {}
  },
  rootDirs: {
    applications: process.env.SNAPBOOK_DIR_APPLICATIONS
  }
}

var chokidar = require('chokidar');
var fse = require('fs-extra');
var md5 = require('md5-file');
var path = require('path');
var _ = require('lodash');
var async = require('async');
var mongoose = require("mongoose");
mongoose.connect(configuration.mongo.uri, configuration.mongo.options);

var Application = require('../../watchers/model/applications');
var Pattern = require('../../watchers/model/patterns');

var Applications = mongoose.models.Applications;
var Patterns = mongoose.models.Patterns;

// Declare internals

var internals = {};

////////////////////////
// @constructor
////////////////////////

exports = module.exports = internals.BatchController = function() {
    var self = this;

    self.configuration = configuration;
};

internals.BatchController.prototype.start = function(callback) {
    var self = this;

    var watcher_path_root = path.normalize(self.configuration.rootDirs.applications);
    var watcher = chokidar.watch(watcher_path_root, {
        persistent: true,
        ignored: '*.txt',
        ignoreInitial: true,
        followSymlinks: true,
        cwd: '.',
        usePolling: true,
        alwaysStat: false,
        depth: undefined,
        interval: 2000,
        ignorePermissionErrors: false,
        atomic: true
    });

    watcher
    .on('add', function(path) { self.watcher_Handler(path) })
    .on('change', function(path) { console.log('File', path, 'has been changed'); })
    .on('unlink', function(path) { console.log('File', path, 'has been removed'); })
    // More events.
    .on('addDir', function(path) { console.log('Directory', path, 'has been added'); })
    .on('unlinkDir', function(path) { console.log('Directory', path, 'has been removed'); })
    .on('error', function(error) { console.log('Error happened', error); })
    .on('ready', function() { console.log('Initial scan complete. Ready for changes.'); });
    // .on('raw', function(event, path, details) { log('Raw event info:', event, path, details); })

    self.cv = new CVController().cv;
    self.im = new IMController();

};

internals.BatchController.prototype.watcher_Handler = function(file) {
    var self = this;

    var directories = path.dirname(file).split(path.sep);
    var max = directories.length-1;

    if ( directories[max]=='uploads' && fse.lstatSync(file).isFile()) {

        console.log('File', file, 'has been added');

        async.waterfall([

            // initialize
    		function(callback) {
    		    var results = {};
    		    results.application = directories[max-1];
    		    results.filepath = file;
    		    results.filename = path.basename(file);
    			callback(null,results);
    		},

    		// get application
            function(results, callback) {
                console.log(results.filepath, 'find application ['+results.application+']');
                Applications.findOne({ _id : results.application }, function(err,application) {
                    if (err) {
                        callback(err,null);
                    } else {
                        results.application = application;
                        console.log(results.filepath, results.application);
                        callback(null,results);
                    }
                });
            },

    		// get files stats
            function(results, callback) {
            	self.im.analyse(results.filepath, function(err, datas) {
					if (err) {
						callback(err,null);
					} else {
						var stats = {};
						var fstats = fse.lstatSync(results.filepath);
						stats.name = path.basename(results.filepath);
						stats.md5 = md5(results.filepath);
						stats.size = fstats.size;
						stats.mime =  datas.mime;
						stats.date = new Date();
						stats.width = datas.width;
						stats.height = datas.height;
						results.pattern = stats;
						console.log(results.filepath, results.pattern);
						callback(null,results);
					}
				});
            },

		    // insert or update pattern in mongodb ?
            function(results, callback) {
                Patterns.findOne({ name : results.filename, application: results.application._id }, function(err,pattern) {
	        		if (err) {
				    	callback(err,null);
					} else {
						if ( _.isNull(pattern) ) {
							pattern = new Patterns(pattern);
							pattern.application = results.application._id;
							pattern.filepath = path.normalize(configuration.rootDirs.applications+'/'+pattern.application+'/patterns/'+pattern._id+'.jpg');
							pattern.filename = pattern._id+'.jpg';
							pattern = _.merge(pattern,results.pattern);
							pattern.save(function(err) {
							    if (err) {
							        callback(err,null);
							    } else {
							        results.pattern = pattern;
							        console.log(results.filepath, 'CREATE', results.pattern);
							        callback(null, results);
							    }
							});
						} else {
							pattern.filepath = path.normalize(configuration.rootDirs.applications+'/'+pattern.application+'/patterns/'+pattern._id+'.jpg');
							pattern = _.merge(pattern,results.pattern);
							pattern.save(function(err) {
							    if (err) {
							        callback(err,null);
							    } else {
							        results.pattern = pattern;
							        console.log(results.filepath, 'UPDATE', results.pattern);
							        callback(null, results);
							    }
							});
						}
					}
        		});
            },

		    // update application in mongodb ?
            function(results, callback) {
                var pattern_allready_exists = _.findIndex(results.application.patterns, results.pattern._id)!=-1;
                console.log(results.filepath, results.pattern._id, 'allready exists:', pattern_allready_exists);
                if (pattern_allready_exists===true) {
                    callback(null,results);
                } else {
                    results.application.patterns.push(results.pattern._id);
                    results.application.save(function(err) {
                        if (err) {
                            callback(err,null);
                        } else {
                            callback(null,results);
                        }
                    });
                }
            },

		    // batch
		    function(results, callback) {
                console.log('file move', path.normalize(file), path.normalize(results.pattern.filepath));
                fse.move( path.normalize(file), path.normalize(results.pattern.filepath), {clobber: true}, function(err) {
                    if (err) {
                        callback(err,null);
                    } else {
                        results.filepath = results.pattern.filepath;
                        self.batch_Handler(results,'AKAZE',function(err,r) {
                            if (err) {
                                callback(err,null);
                            } else {
                                callback(null, results);
                            }
                          });
                    }
                });
		    },

    	], function(err, results) {
    	    if (err) {
    			console.log('ERROR', 'watcher_Handler', err);
    	    }
    	});

    }

};

internals.BatchController.prototype.batch_Handler = function(params, method, callback_batch) {
    var self = this;

    var maxWidth = 512;
    var maxHeight = 512;

    async.waterfall([

        // initialize
        function(callback) {
            var results = {};
            results.method = 'AKAZE';
            callback(null, results);
        },

        // 1. load image
        function(results, callback) {
            console.log('1. load image', params.filepath);
            self.cv.loadImage(path.normalize(params.filepath), function(err, imview) {
                if (err) {
                    callback(err,null);
                } else {
                    results.imview = imview;
                    callback(null, results);
                }
            });
        },

        // 2. optimize size
        function(results, callback) {
            console.log('2. optimize size', params.filepath);
            getOptimalSizeImage(results.imview, maxWidth, maxHeight, function(w, h) {
                results.imview.thumbnail(w, h, function(err, imview_thumb) {
                    if (err) {
                        callback(err,null);
                    } else {
                        results.imview = imview_thumb;
                        results.imview.asPngStream(function(err, data) {
                            if (err) {
                                callback(err,null);
                            } else {
                                var destination_thbs = configuration.rootDirs.applications+'/'+params.application._id+'/patterns/thumbs/'+params.pattern._id+'-thb.png';
                                var file_thb = path.normalize(destination_thbs);
                                fse.ensureFile(file_thb, function (err) {
                                    fse.writeFileSync(file_thb, new Buffer(data));
                                    callback(null, results);
                                });
                            }
                        });
                    }
                });
            });
        },

        // 3. compute AKAZE
        function(results, callback) {
            console.log('3. compute', params.filepath, results.method, results.imview.width(), results.imview.height());
            results.imview.compute(results.method, function(err, imview_compute) {
                if (err) {
                    callback(err,null);
                } else {

                    var destination_kpts = configuration.rootDirs.applications+'/'+params.pattern.application+'/patterns/keypoints/'+params.pattern._id+'-kpts.yml';
                    var file_kpts = path.normalize(destination_kpts);
                    fse.ensureFileSync(file_kpts);
                    fse.writeFileSync(file_kpts, results.imview.keypoints());

                    var destination_dcts = configuration.rootDirs.applications+'/'+params.pattern.application+'/patterns/descriptors/'+params.pattern._id+'-dcts.yml';
                    var file_dcts = path.normalize(destination_dcts);
                    fse.ensureFileSync(file_dcts);
                    fse.writeFileSync(file_dcts, results.imview.descriptors());

                    imview_compute.asPngStream(function(err, data) {
                        if (err) {
                            callback(err,null);
                        } else {

                            var destination_cpte = configuration.rootDirs.applications+'/'+params.pattern.application+'/patterns/computes/'+params.pattern._id+'-cpte.png';
                            var file_cpte = path.normalize(destination_cpte);
                            fse.ensureFileSync(file_cpte);
                            fse.writeFileSync(file_cpte, new Buffer(data));

                            callback(null, results);
                        }
                    });

                }
            });
        },

    ],
    function(err, results) {
        console.log(err,results);
        if (err) {
            callback_batch(err, null);
        } else {
            callback_batch(null, results);
        }
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

};
