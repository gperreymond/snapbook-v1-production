var http = require('http');
var path = require('path');
var configuration = require('./configuration');
var cv = require(configuration.rootDirs.modules+'/ggv-opencv');

var server = http.createServer(function(req, res) {
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end('WTF!');
});

// Chargement de socket.io
var io = require('socket.io').listen(server);

// Quand on client se connecte, on le note dans la console
io.sockets.on('connection', function (socket) {
    
    console.log('Sockets.Server.IO', 'Un client est connecté');
    
    socket.on('start_compare', function (params) {
        console.log('Sockets.Server.IO', 'on', 'start_compare', params);
        var snap_filepath = params.snap_filepath;
        var pattern_filepath = params.pattern_filepath;
        // load pattern's files
        var filename = path.basename(pattern_filepath);
        var dirpath = path.dirname(pattern_filepath);
        var basename = path.basename(pattern_filepath,'.jpg');
        var keypointsFile = path.normalize(dirpath+'/keypoints/'+basename+'-kpts.yml');
        var descriptorsFile = path.normalize(dirpath+'/descriptors/'+basename+'-dcts.yml');
        // compute & compare
        var t1;
        var t2;
        var data = {};
        data.logs = {};
        data.result = {};
        data.params = {
            snap_filepath: snap_filepath,
            pattern_filepath: pattern_filepath,
            pattern: {
                filename: filename,
                dirpath: dirpath,
                basename: basename,
                keypointsFile: keypointsFile,
                descriptorsFile: descriptorsFile
            }
        };
        t1 = new Date();
        cv.loadImage(snap_filepath, function(err, imview) {
            t2 = new Date();
            data.logs.load = t2-t1;
            t1 = new Date();
            imview.compute('AKAZE', function(err, imview_compute) {
                t2 = new Date();
                data.logs.compute = t2-t1;
                t1 = new Date();
                imview.compare(keypointsFile, descriptorsFile, function(err, result) {
                    t2 = new Date();
                    data.logs.compare = t2-t1;
                    data.result.err = err;
                    data.result.data = result;
                    console.log('Sockets.Server.IO', 'emit', 'return_compare', data);
                    socket.emit('return_compare', data);
                });
            });
        });
    });
    
});

server.listen(8090, function() {
    console.log('Sockets.Server.IO', 'Le serveur vous écoute...');
});