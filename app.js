var fse 				= require('fs-extra');
var express 			= require('express');
var path 				= require('path');
var favicon 			= require('serve-favicon');
var logger 				= require('morgan');
var cookieParser 		= require('cookie-parser');
var bodyParser 			= require('body-parser');
var mongo 				= require('mongodb');
var mongoose			= require('mongoose');
var routes 				= require('./routes/index');
var app 				= express();
var app2 				= express();
var key_file			= "<enter your key file here>";
var cert_file  			= "<enter your cert file here>";
var config = {
	key: fse.readFileSync(key_file),
	cert: fse.readFileSync(cert_file)
};
var http				= require('http').Server(app);
var https				= require('https').Server( config, app);
var session 			= require('express-session')
var passport 			= require('passport');
var LocalStrategy 		= require('passport-local').Strategy;
var FacebookStrategy 	= require('passport-facebook').Strategy;
var cookie 				= require('cookie');
var compress			= require('compression');
var ObjectId 			= mongo.ObjectID;
var multer 				= require('multer');

var WINDOWS = process.platform === 'win32';

// Database connection setup
var Schema = mongoose.Schema;
var db = mongoose.connection;
if(WINDOWS){
	mongoose.connect('mongodb://127.0.0.1:27017/pastawtf');
}else{
	mongoose.connect('mongodb://127.0.0.1:27017/pastawtf');
}
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
	console.log("Connected to MongoDB [pastawtf]");
});



var sessionMiddleware = session({
	mongoose_connection: db,
	name: 'somEcokeiE',
	secret: '30)*(#HR()b9p4tgh',
	auto_reconnect: true,
	clear_interval: 900,
	cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
});

var schemas = {};

var User = require('./models/user');
var Unit = require('./models/unit');
schemas['User'] = User;
schemas['Unit'] = Unit;


function isEmptyObj() {
    var name;
    for (name in this) {
        return false;
    }
    return true;
}

app2.use(function(req, res, next) {
	if(!req.secure) {
		return res.redirect(['https://', req.get('Host'), req.url].join(''));
	}
	next();
});
var redirect = app2.listen(80, function() {
	console.log('Redirect server listening on port ' + redirect.address().port);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(compress());
app.use(logger('dev'));
app.use(multer({
	dest: 'permanent/users/tmp',
	limits:{
		fileSize:5000000,
		files:1,
		parts:4
	}
}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());


// passport stuff
passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	User.findById(id, function(err, user) {
		done(err, user);
	});
});

passport.use(new LocalStrategy({
	usernameField: 'username',
	passwordField: 'password'
},
function(username, password, done) {
	User.login(username, password, function(err, usr, reason){
		if(usr){
			return done(null, usr);
		}else{
			return done(null, false, reason);
		}
	});
}
));


passport.use(new FacebookStrategy({
	clientID: WINDOWS?'':'<your client ID',
	clientSecret: WINDOWS?'':'<your client secret>',
	callbackURL: WINDOWS?'':"https://<your IP>/auth/facebook/callback"
},
function(accessToken, refreshToken, profile, done) {
	if(!accessToken){
		return done(null, false, '0')
	}
	User.findOrCreateFacebook(profile, function(err, exists, userObj){
		if(err) done(err);
		if(exists){
			return done(null, userObj);
		}else{
			var newFB = new User(userObj);
			newFB.save(function(err, user){
				if (err) return err;
				fse.mkdirp('permanent/users/facebook/'+newFB.facebook.id, function(err){
					if(err) throw err
				});
				return done(null, user);
			});
		}
	});
}));


app.post('/login', function(req, res, next) {
	passport.authenticate('local', function(err, user, info) {
		if (err) { return next(err); }
		if (!user) {
			return res.send(info);
		}
		req.login(user, function(err) {
			if (err) { return next(err); }
			return res.send('good');
		});
	}) (req, res, next);
});

app.post('/saveunit', function(req, res, next){
	if(req.user && req.user.facebook && req.user.facebook.id == '<admin facebook id>'){
		var data = req.body;
		if(data.unitName == 'empty'){
			res.send('bad');
			return;
		}
		Unit.findOne({'name':data.unitName}, function(err, unit){
			if(err) return err;
			if(unit){
				if(unit.name !== data.newUnitName){
					if(data.newUnitName == '' || data.newUnitName == undefined){
						unit.remove();
						fse.remove('permanent/templates/'+unit.name, function(err){
							return (err);
						});
						res.send('good');
						return;
					}else{
						fse.rename('permanent/templates/'+unit.name, 'permanent/templates/'+data.newUnitName, function(err) {
							if(err) return console.log(err);
							unit.name = data.newUnitName;
						});
					}
					unit.markModified('name');
				}
				var category = unit.categories.filter(function (category) {
					return category.name === data.categoryName;
				}).pop() || {};
				if(unit.categories.indexOf(category) === -1){
					category.name = 'New_Category';
					category.tests = [];
					unit.categories.push(category);
					fse.mkdirp('permanent/templates/'+unit.name+'/'+data.newCategoryName, function(err){
						if(err) throw err
					});
				}
				if(category.name !== data.newCategoryName){
					if(data.newCategoryName === ''){
						unit.categories.splice(unit.categories.indexOf(category), 1);
						fse.remove('permanent/templates/'+unit.name+'/'+category.name, function(err){
							return (err);
						});
					}else{
						fse.rename('permanent/templates/'+unit.name+'/'+category.name,
							'permanent/templates/'+unit.name+'/'+data.newCategoryName, function(err) {
							if(err) return console.log(err);
							category.name = data.newCategoryName;
						});
					}
					unit.markModified('categories');
				}
				var test = category.tests.filter(function(test){
					return test.name === data.testName;
				}).pop() || {};
				if(category.tests.indexOf(test) === -1){
					test.name ='New_Test';
					test.cost ='5';
					test.content = 'New_Test_Content';
					category.tests.push(test);
					fse.mkdirp('permanent/templates/'+unit.name+'/'+data.newCategoryName+'/'+data.newTestName, function(err){
						if(err) throw err
						fse.copy('permanent/templates/empty', '/permanent/templates/'+
							data.newUnitName + '/' + data.newCategoryName + '/' + data.newTestName, function(err){
							if(err) return console.error(err);
						})
					});
				}
				if(test.name !== data.newTestName || test.content !== data.newTestContent){
					if(data.newTestName === ''){
						category.tests.splice(category.tests.indexOf(test), 1);
						fse.remove('permanent/templates/'+unit.name+'/'+data.newCategoryName+'/'+test.name, function(err){
							return (err);
						});
					}else{
						fse.rename('permanent/templates/'+unit.name+'/'+data.newCategoryName+'/'+test.name,
							'permanent/templates/'+unit.name+'/'+data.newCategoryName+'/'+data.newTestName, function(err) {
							if(err) return console.log(err);
							category.name = data.newCategoryName;
						});
						test.name = data.newTestName;
						test.cost = data.testCost;
						test.content = data.newTestContent;
						fse.writeFile('permanent/templates/'+
							data.newUnitName + '/' + data.newCategoryName + '/' + data.newTestName+'/test/'+data.newTestName + 'Test.java', data.newTestContent, function(err) {
							if(err) console.log(err);
						});
					}
					unit.markModified('categories');
				}
				unit.save();
				res.send('good');
			}else{
				Unit.findOne({'name':data.newUnitName}, function(err, unit){
					if(err) return err;
					if(unit){
						var category = unit.categories.filter(function (category) {
							return category.name === data.newCategoryName;
						}).pop() || {};
						if(unit.categories.indexOf(category) === -1){
							category.name = 'New_Category';
							category.tests = [];
							unit.categories.push(category);
							fse.mkdirp('permanent/templates/'+unit.name+'/'+data.newCategoryName, function(err){
								if(err) throw err
							});
						}
						if(category.name !== data.newCategoryName){
							if(data.newCategoryName === ''){
								unit.categories.splice(unit.categories.indexOf(category), 1);
								fse.remove('permanent/templates/'+data.newUnitName+'/'+category.name, function(err){
									return (err);
								});
							}else{
								category.name = data.newCategoryName;
							}
							unit.markModified('categories');
						}
						var test = category.tests.filter(function(test){
							return test.name === data.newTestName;
						}).pop() || {};
						if(category.tests.indexOf(test) === -1){
							test.name ='New_Test';
							test.cost = 5;
							test.content = 'New_Test_Content';
							category.tests.push(test);
							fse.mkdirp('permanent/templates/'+unit.name+'/'+data.newCategoryName+'/'+data.newTestName, function(err){
								if(err) console.log(err);
								if(data.oldTestName !== data.newTestName || data.oldTestContent !== data.newTestContent){
									if(data.newTestName != '' && data.newTestName != undefined){
										fse.copy('permanent/templates/empty', 'permanent/templates/'+
										data.newUnitName + '/' + data.newCategoryName + '/' + data.newTestName, function(err){
											if(err) console.error(err);
											fse.writeFile('permanent/templates/'+
											data.newUnitName + '/' + data.newCategoryName + '/' + data.newTestName+'/test/'+data.newTestName + 'Test.java', data.newTestContent, function(err) {
												if(err) console.log(err);
											});	
										})
									}
								}
							});
						}
						if(test.name !== data.newTestName || test.content !== data.newTestContent){
							if(data.newTestName == '' || data.newTestName == undefined){
								category.tests.splice(category.tests.indexOf(test), 1);
								fse.remove('permanent/templates/'+data.newUnitName+'/'+category.name+'/'+test.name, function(err){
									return (err);
								});
							}else{
								test.name = data.newTestName;
								test.cost = data.testCost;
								test.content = data.newTestContent;
							}
							unit.markModified('categories');
						}
						unit.save();
						res.send('good');
					}else{
						var newUnit = new Unit({
							name:data.newUnitName,
							categories:[
							{
								name:data.newCategoryName,
								tests:[
								{
									name:data.newTestName,
									cost:data.testCost,
									content:data.newTestContent
								}
								]
							}
							]
						});
						newUnit.markModified('name');
						newUnit.markModified('categories');
						newUnit.save();
						fse.mkdirp('permanent/templates/'+data.newUnitName + '/' + data.newCategoryName + '/' + data.newTestName, function(err){
							if(err) return console.log(err);
							fse.copy('permanent/templates/empty', 'permanent/templates/'+
							data.newUnitName + '/' + data.newCategoryName + '/' + data.newTestName, function(err){
								if(err) return console.error(err);
								fse.writeFile('permanent/templates/'+
									data.newUnitName + '/' + data.newCategoryName + '/' + data.newTestName+'/test/'+data.newTestName + 'Test.java', data.newTestContent, function(err) {
									if(err) console.log(err);
								});
							});
						})
						res.send('good');
					};
				});
			}
		});
	}
});




app.post('/logout', function(req, res, next){
	req.logout();
});
app.get('/auth/facebook', passport.authenticate('facebook'));
app.use('/auth/facebook/callback', passport.authenticate('facebook', {
	successRedirect: '/close',
	failureRedirect: '/fail'
}));
// Make our db accessible to our router
app.use(function(req,res,next){
	req.db = schemas;
	next();
});


app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	//var err = new Error('Not Found');
	//err.status = 404;
	//next(err);
	res.redirect('/');
});


// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});


module.exports = https;
