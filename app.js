/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose/');
var session = require('express-session');
var bcrypt = require('bcrypt');

var secretconfig = require('./secretconfig.json');


mongoose.connect('mongodb://localhost/cdj-adv');
var app = express();

app.use(session({
  secret: secretconfig.secret,
  resave: true,
  saveUninitialized: true
}))

// all environments
app.set('port', process.env.PORT || 3001);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var Schema = mongoose.Schema;


var UserDetail = new Schema({
    username: String,
    password: String
}, {collection: 'userInfo'});

var userSchema = mongoose.Schema({
  username: {type: String, required:true, trim: true},
  password: {type: String, required:true},
  name: String
}, {collection: 'userInfo'});

var UserDetails = mongoose.model('userInfo',userSchema);

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});


passport.use(new LocalStrategy(
  function(username, password, done) {

    process.nextTick(function () {
    UserDetails.findOne({'username':username},
  		function(err, user) {
  			if (err) { return done(err); }
  			if (!user) { return done(null, false); }
  			if (!user.username) { return done(null, false); }
  			if (!user.password) { return done(null, false); }
        var passwordsMatch = bcrypt.compareSync(password,user.password);
  			return done(null, passwordsMatch ? user : false);
  		});
    });
  }
));




app.get('/' , function(req, res, next){
  if(req.session.username){
    var uname = req.session.username;
    res.render('index_loggedin', { title: secretconfig.title, uname: uname });
  }else{
    res.render('index', { title: secretconfig.title});
  }


});

app.get('/logout' , function(req, res, next){
  req.session.loggedIn = false;
  req.session.username = null;
  res.redirect("/#loggedOut");
});

app.get('/login' , function(req, res, next){
  res.render('login');
});

app.get('/auth', function(req, res, next) {
  res.sendfile('views/login.html');
});


app.get('/loginFailure' , function(req, res, next){
	res.send('Failure to authenticate');
});

app.get('/loginSuccess' , function(req, res, next){
	res.send('Successfully authenticated');
});

app.post('/login',
  passport.authenticate('local', {
    failureRedirect: '/login#loginFailure'
  }),function(req,res){
    req.session.loggedIn = true;
    req.session.username = req.user.username;
    res.redirect("/#loginSuccess");
  }
);

app.get('/signup', function(req,res){
  res.render('signup.jade');
});

app.post('/signup', function(req,res){
  if(req.body.id != secretconfig.id){res.redirect("/signup#idIncorrect");return;}
  if(req.body.password != req.body.passConf){res.redirect("/signup#confirmPassword");return;}
  var usernameTest = /^[a-zA-Z0-9]+([._]?[a-zA-Z0-9]+)*$/;
  if(req.body.username.length > 12 || req.body.username.length < 3){res.redirect("/signup#usernameRules");return;}
  if(!usernameTest.test(req.body.username)){res.redirect("/signup#usernameRules");return;}
  UserDetails.findOne({'username':req.body.username},
    function(err, user) {
      if(err || !user){
        bcrypt.hash(req.body.password, 8, function(err, hash) {
          if(err){res.redirect("/error#500");console.log(err);}
          var registerUser = new UserDetails({username: req.body.username, password: hash});
          console.log(registerUser);
          // save registerUser Mongo
          registerUser.save(function(err,data) {
            if(err) {
              console.log(err);
              res.redirect("/error#500");
            } else {
              console.log('registerUser: ' + data.username + " saved.");
              res.redirect("/login#signupSuccessful");
            }
          });
        });
      }else{
        res.redirect("/signup#userExistant");
      }
    }
  );
});

app.use(express.static(path.join(__dirname, 'public')));

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
