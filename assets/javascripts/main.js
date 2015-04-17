var _G = {
	login:{
		fail:[
			'Incorrect username or password.',
			'Account has been locked due to security reasons.',
			'An unknown error has occured. Please try again.',
			'An unknown error has occured. Please try again.'
		]
	},
	create:{
		fail:[
			'Username in use.',
			'Invalid username.\n'+
			'Must be between 5 and 12 characters long.\n'+
			'Must have only alphanumeric and some special characters.',
			'Invalid password.\n'+
			'Must be between 6 and 15 characters long.\n'+
			'Must have at least one number and one letter.\n'+
			'Must have only alphanumeric and some special characters.',
			'Invalid credentials.',
			'Invalid email format.',
			'An unknown error has occured'
		]
	}
}

var facebookLoginWindow;
var loginWindowTimer;
function facebookLogin(){
	var popupWidth=500;
	var popupHeight=500;
	var xPosition=($(window).width()-popupWidth)/2;
	var yPosition=($(window).height()-popupHeight)/2;
	var loginUrl="/auth/facebook";
	
	facebookLoginWindow=window.open(loginUrl, "LoginWindow", 
		"location=1,scrollbars=1,"+
		"width="+popupWidth+",height="+popupHeight+","+
		"left="+xPosition+",top="+yPosition);
		
	loginWindowTimer = setInterval(onTimerCallbackToCheckLoginWindowClosure, 100);
}
function onTimerCallbackToCheckLoginWindowClosure() {
	// If the window is closed, then reinit Facebook 
	if (facebookLoginWindow.closed) 
	{
		clearInterval(loginWindowTimer);
	}
}
window.addEventListener('message', function (event) {
	if(event.data === 'success'){
		location.href='/';
	}else{
		alert('Failed to authenticate.');
	}
});

$(document).ready(function(){

	$('[id^=unitSelector]').click(function(){
		var btnId = $(this).attr('id');
		var unitId = btnId.substring(btnId.length - 4);
		location.href = '/unit/' + $(this).text();
	});

	$('[id^=unitPage][id$=Test]').click(function(){
		$(this).parent().find('input').click();
	});

	
	$('[type=file]').each(function(){
		var $this = $(this);
		$this.change(function(){
			var btn = $this.parent().find('button');
			btn.attr('disabled', 'disabled');
			btn.html('<img height="20px" width="20px" src="/images/loader.gif"></img> Testing...');
			var _this = this;
			var data = new FormData();
			var file = _this.files[0];
			data.append('unit', $this.attr('unit-val'));
			data.append('category', $this.attr('category-val'));
			data.append('test', $this.attr('test-val'));

			data.append('src', file);
			$.ajax({
			    url: '/upload',
			    data: data,
			    cache: false,
			    contentType: false,
			    processData: false,
			    type: 'POST',
			    success: function(data){
			        if(data === 'done'){
						btn.html('<img height="20px" width="20px" src="/images/tick.png"></img> Done!');
						setTimeout(function(){location.reload();}, 1000);
			        }
			    }
			});
		});

	});

	$('#signInContainerRegularUsername').on('keydown', function(e) {
		if (e.which == 13) {
			$('#signInContainerRegularButton').css({
				'-webkit-transform':'scale(0.95)',
				'-ms-transform':'scale(0.95)',
				'transform':'scale(0.95)',
				'opacity':'.8'
			});
		}
	});
	$('#signInContainerRegularUsername').on('keyup', function(e) {
		if (e.which == 13) {
			$('#signInContainerRegularButton').css({
				'-webkit-transform':'scale('+(1)+')',
				'-ms-transform':'scale('+(1)+')',
				'transform':'scale('+(1)+')',
				'opacity':'1'
			});
			$('#signInContainerRegularButton').click();
		}
	});
	$('#signInContainerRegularPassword').on('keydown', function(e) {
		if (e.which == 13) {
			$('#signInContainerRegularButton').css({
				'-webkit-transform':'scale(0.95)',
				'-ms-transform':'scale(0.95)',
				'transform':'scale(0.95)',
				'opacity':'.8'
			});
		}
	});
	$('#signInContainerRegularPassword').on('keyup', function(e) {
		if (e.which == 13) {
			$('#signInContainerRegularButton').css({
				'-webkit-transform':'scale('+(1)+')',
				'-ms-transform':'scale('+(1)+')',
				'transform':'scale('+(1)+')',
				'opacity':'1'
			});
			$('#signInContainerRegularButton').click();
		}
	});
	$('#signInContainerFacebook').click(function(){
		facebookLogin();
	});
	$('#signInContainerRegularButton').click(function(){
		var dis = $(this);
		dis.attr('disabled', 'disabled');
		dis.html('<img height="20px" width="20px" src="/images/loader.gif"></img><span>Logging in...</span>');
		$.ajax({
			url: '/login',
			type: 'POST',
			cache: false,
			data:{'username': $('#signInContainerRegularUsername').val(), 'password': $('#signInContainerRegularPassword').val()},
			success: function(data){
				if(data !== 'good'){
					dis.html('Login');
					dis.removeAttr('disabled');
					alert(_G.login.fail[data]);
				}else{
					dis.html('<img height="20px" width="20px" src="/images/tick.png"></img> <span>Success!</span>');
					setTimeout(function(){location.href = '/';}, 1000);
				}
			},
			error: function(jqXHR, textStatus, err){
				alert('An error has occured. Please try again.')
				dis.html('Login');
				dis.removeAttr('disabled');
			}
		});
	});



	$('#headerLogo').click(function(){
		location.href = '/';
	});
	$('#headerActionsRecharge').click(function(){
		location.href = '/recharge';
	});
	$('#headerActionsGift').click(function(){
		location.href = '/gift';
	});
	$('#headerActionsSignIn').click(function(){
		location.href='/login';
	});
	$('#headerActionsProfile').click(function(){
		location.href = '/profile';
	});	
						
	$('.unitDisplayContainerSave').click(function(){
		var dis = $(this);
		dis.attr('disabled', 'disabled');
		dis.html('<img height="20px" width="20px" src="/images/loader.gif"></img>Saving...');
		var oldUnitName = dis.attr('val-unit');
		var oldCategoryName = dis.attr('val-category');
		var oldTestName = dis.attr('val-test');
		var newUnitName = $('#save' + oldUnitName + 'Name').val();
		var newCategoryName = $('#save' + oldUnitName  + oldCategoryName + 'Name').val().replace(/ /g, '_');
		var newTestName = $('#save' + oldUnitName  + oldCategoryName  + oldTestName + 'Name').val().replace(/ /g, '_');
		var newTestContent = $('#save' + oldUnitName  + oldCategoryName  + oldTestName + 'Content').val();
		var testCost = $('#save' + oldUnitName  + oldCategoryName  + oldTestName + 'Cost').val();

		$.ajax({
			url: '/saveunit',
			type: 'POST',
			cache: false,
			data:{
				'unitName':oldUnitName,
				'categoryName':oldCategoryName,
				'testName':oldTestName,
				'newUnitName':newUnitName,
				'newCategoryName':newCategoryName,
				'newTestName':newTestName,
				'newTestContent':newTestContent,
				'testCost':testCost
			},
			success: function(data){
				if(data !== 'good'){
					dis.html('Save');
					dis.removeAttr('disabled');
					alert('Save failed.');
				}else{
					dis.html('<img height="20px" width="20px" src="/images/tick.png"></img> Success');
					setTimeout(function(){
						location.reload();
					}, 1000);
				}
			},
			error: function(jqXHR, textStatus, err){
				alert('An error has occured. Please try again.')
				dis.html('Save');
				dis.removeAttr('disabled');
			}
		});
	});

	
});