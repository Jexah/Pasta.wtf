var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var UnitSchema = new Schema({
	name: String,
	visible: Boolean,
	categories: Schema.Types.Mixed
});


UnitSchema.statics.getAll = function() {
	this.find({}, function(err, units){
		if(err) throw err;
		return units;
	});
}

UnitSchema.statics.getUnit = function(name){
	this.findOne({name:name}, function(err, unit){
		if(err) throw err;
		if(unit){
			return unit;
		}else{
			return {};
		}
	});
}

module.exports = mongoose.model('Unit', UnitSchema);