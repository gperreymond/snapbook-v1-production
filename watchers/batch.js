var Watcher = require('./controller/batch.controller');

var watcher = new Watcher();
watcher.start(function() {
  console.log('Big Brother is batching you!');
});
