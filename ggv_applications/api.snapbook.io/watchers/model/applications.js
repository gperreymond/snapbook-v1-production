var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var ApplicationSchema = new Schema({
	// fields
	name: { type: String, required: true, trim: true, default: '' }, 
	cover: { type: String, trim: true, default: '' },
	description: { type: String, trim: true, default: '' },
	createdAt: { type: Date, default: Date.now },
	modifiedAt: { type: Date, default: Date.now },
	// relationships
	auth: { type: Schema.Types.ObjectId, ref: 'Users' },
	patterns: [{ type: Schema.Types.ObjectId, ref: 'Patterns' }],
	ressources: [{ type: Schema.Types.ObjectId, ref: 'Ressources' }],
	activities: [{ type: Schema.Types.ObjectId, ref: 'Activities' }]
});

ApplicationSchema.set('versionKey', false);

mongoose.model('Applications', ApplicationSchema, 'applications');
