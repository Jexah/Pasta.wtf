var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcryptjs');
var SALT_WORK_FACTOR = 10;

var MAX_LOGIN_ATTEMPTS = 5;
var LOCK_TIME = 1000 * 60 * 30;

var UserSchema = new Schema({
	local:{
		username: String,
		email: String,
		password: String,
	},
	facebook:{
		id: String,
		givenName: String,
		familyName: String
	},
	email: String,
	displayName: {type: String, required: true},
	loginAttempts: { type: Number, required: true, default: 0 },
	lockUntil: Number,
	credits: Number,
	tests: Schema.Types.Mixed
});

UserSchema.virtual('isLocked').get(function() {
	// check for a future lockUntil timestamp
	return !!(this.lockUntil && this.lockUntil > Date.now());
});

UserSchema.pre('save', function(next) {
	var user = this;
	// only hash the password if it has been modified (or is new)
	if (!user.isModified('local.password')) return next();
		// generate a salt
		bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
		if (err) return next(err);

		// hash the password using our new salt
		bcrypt.hash(user.local.password, salt, function (err, hash) {
			if (err) return next(err);

			// set the hashed password back on our user document
			user.local.password = hash;
			next();
		});
	});
});

UserSchema.methods.comparePassword = function(candidatePassword, cb) {
	bcrypt.compare(candidatePassword, this.local.password, function(err, isMatch) {
		if (err) return cb(err);
		cb(null, isMatch);
	});
};

UserSchema.methods.incLoginAttempts = function(cb) {
	// if we have a previous lock that has expired, restart at 1
	if (this.lockUntil && this.lockUntil < Date.now()) {
		return this.update({
			$set: { loginAttempts: 1 },
			$unset: { lockUntil: 1 }
		}, cb);
	}
	// otherwise we're incrementing
	var updates = { $inc: { loginAttempts: 1 } };
	// lock the account if we've reached max attempts and it's not locked already
	if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
		updates.$set = { lockUntil: Date.now() + LOCK_TIME };
	}
	return this.update(updates, cb);
};

// expose enum on the model, and provide an internal convenience reference 
var reasons = UserSchema.statics.failed = {};
reasons['login'] = UserSchema.statics.failed.login = {
	NOT_FOUND: '0',
	PASSWORD_INCORRECT: '0',
	MAX_ATTEMPTS: '1'
};

UserSchema.statics.login = function(username, password, cb) {
	this.findOne({$or:[{ 'local.username': username.toLowerCase() }, {'local.email': username.toLowerCase()}]}, function(err, user) {
		if (err) return cb(err);

		// make sure the user exists
		if (!user) {
			return cb(null, false, reasons.login.NOT_FOUND);
		}

		// check if the account is currently locked
		if (user.isLocked) {
			// just increment login attempts if account is already locked
			return user.incLoginAttempts(function(err) {
				if (err) return cb(err);
				return cb(null, false, reasons.login.MAX_ATTEMPTS);
			});
		}

		// test for a matching password
		user.comparePassword(password, function(err, isMatch) {
			if (err) return cb(err);

		// check if the password was a match
			if (isMatch) {
				// if there's no lock or failed attempts, just return the user
				if (!user.loginAttempts && !user.lockUntil) return cb(null, user);
				// reset attempts and lock info
				var updates = {
					$set: { loginAttempts: 0 },
					$unset: { lockUntil: 1 }
				};
				return user.update(updates, function(err) {
					if (err) return cb(err);
					return cb(null, user);
				});
			}

		// password is incorrect, so increment login attempts before responding
			user.incLoginAttempts(function(err) {
				if (err) return cb(err);
				return cb(null, false, reasons.login.PASSWORD_INCORRECT);
			});
		});
	});
};

reasons['create'] = UserSchema.statics.failed.create = {
	NAME_TAKEN: '0',
	INVALID_USERNAME_TOO_LONG: '1',
	INVALID_USERNAME_TOO_SHORT: '1',
	INVALID_USERNAME_BAD_CHAR: '1',
	INVALID_PASSWORD_TOO_LONG: '2',
	INVALID_PASSWORD_TOO_SHORT: '2',
	INVALID_PASSWORD_NO_NUM: '2',
	INVALID_PASSWORD_NO_LETTER: '2',
	INVALID_PASSWORD_BAD_CHAR: '2',
	INVALID_CREDENTIALS: '3',
	INVALID_EMAIL: '4'
};


function checkStr(str, len, len2, alphaNumeric){
	if (str.length < len) {
		return("too_short");
	} else if (str.length > len2) {
		return("too_long");
	} else if (str.search(/[^a-zA-Z0-9\!\@\#\$\%\^\&\*\(\)\_\+]/) != -1 && !alphaNumeric) {
		return("bad_char");
	}else if (str.search(/[^a-zA-Z0-9]/) != -1 && alphaNumeric) {
		return("bad_char");
	} else if (str.search(/\d/) == -1) {
		return("no_num");
	} else if (str.search(/[a-zA-Z]/) == -1) {
		return("no_letter");
	}
	return 'ok';
}
function validateEmail(email) { 
	var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(email);
} 
UserSchema.statics.createAccount = function(username, email, password, cb) {
	var displayName = username;
	username = username.toLowerCase();
	email = email.toLowerCase();
	if(typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string'){
		return cb(null, false, reasons.create.INVALID_CREDENTIALS);
	}
	var usrOk = checkStr(username, 5, 12, true);
	switch(usrOk){
		case "too_short":
		return cb(null, false, reasons.create.INVALID_USERNAME_TOO_SHORT);
		case "too_long":
		return cb(null, false, reasons.create.INVALID_USERNAME_TOO_LONG);
		case "bad_char":
		return cb(null, false, reasons.create.INVALID_USERNAME_BAD_CHAR);
		default:
		break;
	}

	var pwdOk = checkStr(password, 6, 15, false);
	switch(pwdOk){
		case "too_short":
		return cb(null, false, reasons.create.INVALID_PASSWORD_TOO_SHORT);
		case "too_long":
		return cb(null, false, reasons.create.INVALID_PASSWORD_TOO_LONG);
		case "bad_char":
		return cb(null, false, reasons.create.INVALID_PASSWORD_BAD_CHAR);
		case "no_num":
		return cb(null, false, reasons.create.INVALID_PASSWORD_NO_NUM);
		case "no_letter":
		return cb(null, false, reasons.create.INVALID_PASSWORD_NO_LETTER);
		default:
		break;
	}
	if(!validateEmail(email)){
		return cb(null, false, reasons.create.INVALID_EMAIL);
	}
	this.findOne({'local.username':username}, function(err, user) {
		if (err) return cb(err);

		if (user) {
			return cb(null, false, reasons.create.NAME_TAKEN);
		}else{
			var userObj = {
				local:{
					username: username.toLowerCase(),
					password: password
				},
				email: email.toLowerCase(),
				displayName: username,
				credits: 0,
				tests:{}
			};
			return cb(null, userObj);
		}

	});
};

UserSchema.statics.findOrCreateFacebook = function(profile, cb){
	this.findOne({'facebook.id':profile.id}, function(err, user){
		if (err) return cb(err);
		if(user){
			return cb(null, true, user);
		}else{
			var userObj = {
				facebook:{
					id: profile.id,
					givenName: profile.name.givenName,
					familyName: profile.name.familyName
				},
				email: (profile.emails?profile.emails[0]?profile.emails[0].value:'':'').toLowerCase(),
				displayName: '[FB] ' + profile.name.givenName,
				credits: 0,
				tests:{}
			};
			return cb(null, false, userObj);
		}
	});
}

module.exports = mongoose.model('User', UserSchema);