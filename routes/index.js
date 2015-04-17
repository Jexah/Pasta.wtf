var express = require('express');
var router = express.Router();
var spawn = require('spawn-cmd').spawn;
var fse = require('fs-extra');
var unzip = require('unzip');
var walk = require('walk').walk;
var marked = require('marked');

/* GET home page. */
router.get('/', function(req, res) {
    var db = req.db;
    var units = [];
    db['Unit'].find({}, function(err, docs){
        for(i in docs){
            units.push(docs[i].name);
        }
        
        res.render('index', {
            units:units,
            user:req.user
        });
    });
});


router.get('/tos', function(req, res) {
    res.render('tos', {
        user:req.user,
        marked:marked
    });
});

router.get('/unit/*', function(req, res) {
    var urlSplit = req.url.split('/');
    var unitName = urlSplit[urlSplit.length-1];

    req.db['Unit'].findOne({'name':unitName}, function(err, unit){
        if(unit){
        	res.render('unitPage', {
                unit:unit,
                user:req.user
            }, function(err, html){
                if(err){
                    res.render('error', {
					message: err.message,
					error: err
				});
                }else{
                    res.end(html);
                }
            });
        }else{
            res.redirect('/');
        }
    });
});

function repeat(pattern, count) {
    if (count < 1) return '';
    var result = '';
    while (count > 1) {
        if (count & 1) result += pattern;
        count >>= 1, pattern += pattern;
    }
    return result + pattern;
}

function nth_occurrence(string, char, nth) {
    var first_index = string.indexOf(char);
    var length_up_to_first_index = first_index + 1;

    if (nth == 1) {
        return first_index;
    } else {
        var string_after_first_occurrence = string.slice(length_up_to_first_index);
        var next_occurrence = nth_occurrence(string_after_first_occurrence, char, nth - 1);

        if (next_occurrence === -1) {
            return -1;
        } else {
            return length_up_to_first_index + next_occurrence;  
        }
    }
}

router.post('/upload', function(req, res){
	if(!req.files.src){
		return;
	}
	var file = req.files.src;
	if(!(file && file.extension.toLowerCase() == 'zip')){
		return;
	}
	if(req.user && req.body){
		var unitName = req.body.unit;
		var categoryName = req.body.category;
		var testName = req.body.test;
		var db = req.db;
		db['Unit'].findOne({'name':unitName}, function(err, unit){
			if(unit){
				var category = unit.categories.filter(function(category){
					return category.name === categoryName;
				}).pop() || false;
				if(category){
					var test = category.tests.filter(function(test){
						return test.name === testName;
					}).pop() || false;
					if(test){
						var dir = req.user.facebook.id ? 'permanent/users/facebook/'+req.user.facebook.id+'/' : 'permanent/users/local/'+req.user.local.username+'/';
						fse.ensureDir(dir, function(err){
							if(err) return console.log(err);
							var newDir = dir+unitName+'/'+categoryName+'/'+testName+'/';
							for(var i = 0; true; ++i){
								var newDiri = newDir+i+'/';
								if(!fse.existsSync(newDir+i)){
									fse.mkdirp(newDir+i, function(err){
										if(err) return console.log(err);
										fse.copy('permanent/templates/'+unitName+'/'+categoryName+'/'+testName, newDiri, function(err){
											if(err) return console.error(err);
											fse.createReadStream(file.path).pipe(unzip.Extract({ path: newDiri }))
											.on('close', function(){
												fse.unlink(file.path, function(err){
													if(err) console.log(err);
													var output = '';
													var dash15 = repeat('-', 15);
													var onceOut = false;
													var onceErr = false;
													var k = spawn('ant', ['-f', newDiri]);
													k.on('error', function(err){
														throw err;
													});
													k.stdout.on('data', function (data) {
														var bufferString = data.toString('utf8');
														console.log(bufferString);
														if(~bufferString.indexOf('[junit]')){
															if(!onceOut){
																onceOut=true;
																return;
															}
															output += bufferString + '\n';
														}
													});
													k.stderr.on('data', function (data) {
														var bufferString = data.toString('utf8');
														console.log(bufferString);
													});
													k.on('close', function(){
														output = output.substring(output.indexOf('-------------'));
														output = output.substring(0, output.lastIndexOf('-------------')+13);
														output = output.split('    [junit] ').join('');
														var walker  = walk(newDiri+'src', { followLinks: false });
														files = [];
														walker.on('file', function(root, stat, next) {
															files.push(root + '/' + stat.name);
															next();
														});

														walker.on('end', function() {
															if(req.user.tests == undefined){
																req.user.tests = {};
															}
															if(req.user.tests[unitName] == undefined){
																req.user.tests[unitName] = {};
															}
															if(req.user.tests[unitName][categoryName] == undefined){
																req.user.tests[unitName][categoryName] = {};
															}
															if(req.user.tests[unitName][categoryName][testName] == undefined){
																req.user.tests[unitName][categoryName][testName] = [];
															}
															req.user.tests[unitName][categoryName][testName].push({
																date:Date.now(),
																files:(function(){
																	var ret = [];
																	for(var i = 0; i < files.length; ++i){
																		if(files[i].substring(files[i].length-5) == ".keep"){
																			continue;
																		}
																		ret.push({
																			name:files[i].substring(nth_occurrence(files[i], '/', 8)),
																			content:fse.readFileSync(files[i], 'utf8')
																		});
																	}
																	return ret;
																})(),
																result:output != '' ? output : 'There were compilation errors. Please fix or check on PASTA.'
															});
															if(output != ''){
																req.user.credits -= test.cost;
															}
															req.user.markModified('tests');
															req.user.save();
															fse.remove(newDiri, function(err){
																if(err) console.log(err);
																res.send('done');
															})
														});
													})
												})
											});
										})
									});
									break;
								}
							}
						});
					}
				}
			}
		});
	}
});

router.get('/admin', function(req, res){
    if(req.user && req.user.facebook && req.user.facebook.id == '972394002786065'){
        var db = req.db;
        db['Unit'].find({}, function(err, units){
            res.render('admin', {
                user:req.user,
                units:units
            });
        });
    }else{
        res.redirect('/');
    }
});

router.get('/close', function(req, res){
    res.render('fbcb');
});

router.get('/login', function(req, res){
    res.render('login', {
        user:req.user
    });
});


module.exports = router;
