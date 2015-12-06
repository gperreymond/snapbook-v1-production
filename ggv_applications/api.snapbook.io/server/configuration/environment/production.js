// ==================================
// production specific configuration
// ==================================
module.exports = { 
	// hapi
	server: {
		https: false,
		host: '0.0.0.0',
		port: 80
	},
	server_compare: {
		https: false,
		host: '0.0.0.0',
		port: 80
	},
	queue: {
		hostname: 'queue.snapbook.io',
		port: 80
	},
	// session
	secrets: {
		session: 'b1fd04c1-a8b4-4430-a4e3-c9f846304a8e'
	},
	// directories
	rootDirs: {
		applications: '/vagrant/applications',
		modules: '/vagrant/git/ggv_modules'
	},
	upload: {
		maxBytes: 5242880
	},
	// mongo 
	mongo: {
		uri: 'mongodb://adm_snapbook:ADM#SB!CVFG!5469@databases.snapbook.io/snapbook'
	},
	// winston
	winston: {
		snaps: {
			db: 'mongodb://adm_snapbook:ADM#SB!CVFG!5469@databases.snapbook.io/snapbook',
			username: 'adm_snapbook',
			password: 'ADM#SB!CVFG!5469',
			collection: 'stats-snaps'
		}
	}
};