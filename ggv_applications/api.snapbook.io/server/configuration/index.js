// ---------------------------
//  package.dependencies
// ---------------------------

var _ = require('lodash');

// global variables

var all = {
    version: "2.1.0",
	// environment
    environment: process.env.NODE_ENV,
    // mongo options
    mongo: {
        options: {
            db: {
            sessionafe: true
            }
        }
    },
};

// final exports

module.exports = _.merge(
    all,
    require('./environment/'+process.env.NODE_ENV) || {}
);