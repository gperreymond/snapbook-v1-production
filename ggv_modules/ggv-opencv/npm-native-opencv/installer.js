var fs       = require('fs');
var os       = require('os');
var path     = require('path');
var opencv   = require('./opencv.js');

var opencvPath = path.resolve(__dirname, 'opencv');
console.log('OpenCV will be downloaded to ', opencvPath);

function runInOpenCVDoesNotExists(cb) {
    fs.mkdir(opencvPath, 0777, function(err) {
        if (err)
            console.log("OpenCV directory already exists. Skipping download.");
        else
            cb(); // successfully created folder
    });
}
