var Watcher = require('./controller/batch.controller');

var watcher = new Watcher();
watcher.start(function() {
    console.log(process.pid, 'Big Brother is batching you!');
});