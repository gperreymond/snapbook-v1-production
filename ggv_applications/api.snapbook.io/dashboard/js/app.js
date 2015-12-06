var facade = new Facade();

var tags = [
    'components/loading.tag',
    'components/homepage.tag'
];

async.map(tags, function(item,callback) {
    // preloading tags
    riot.compile(item, function() {
		callback(null, item);
	});
}, function(err, results){
    // starting application
    console.log(results);
	riot.mount('*', facade);
});