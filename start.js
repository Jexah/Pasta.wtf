
process.env.NODE_ENV = 'production';

var debug = require('debug')('anothertest');
var app = require('./app');
var server = app.listen(443, function() {
	debug('Express server listening on port ' + server.address().port);
	console.log('Express server listening on port ' + server.address().port);
});