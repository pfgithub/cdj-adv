/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose/');
var session = require('express-session');
var bcrypt = require('bcrypt');

var latestPosts = [];

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


//var UserDetail = new Schema({
//    username: String,
//    password: String
//}, {collection: 'userInfo'});

var userSchema = mongoose.Schema({
  username: {type: String, required:true, trim: true},
  password: {type: String, required:true},
  name: String,
  details: {
    lineOfCode: String,
    programmingLanguage: String,
    programmingProject: String
  }
}, {collection: 'userInfo'});

var postSchema = mongoose.Schema({
  date: { type: Date, default: Date.now },
  user: {type: String, required:true},
  title: {type: String, required:true},
  message: String
}, {collection: 'posts'});

postSchema.pre('save', function(next) {
  getPosts();
  next();
});

var UserDetails = mongoose.model('userInfo',userSchema);
var Posts = mongoose.model('posts',postSchema);




function getPosts(){
  Posts.find({}).sort('-date').limit(100).exec(function(err, posts){
    latestPosts = posts;
    console.log("Posts updated");
  });
}

getPosts();

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
    res.render('index_loggedin', { title: secretconfig.title, uname: uname, posts: latestPosts });
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

app.get('/dashboard', function(req,res){
  if(req.session.username){
    res.render('dashboard.jade', { title: secretconfig.title, uname: req.session.username });
  }else{
    res.redirect("/login");
  }
});

// IMPORTANT: rubixmc.no-ip.org:25567

app.post('/post', function(req, res){
  if(req.session.username){
    if(req.body.title){
      if(req.body.title.length > 2 && req.body.title.length < 50){
        if(req.body.message){
          if(req.body.message.length < 1000){
            var testPost = new Posts({user:req.session.username,title:req.body.title, message: req.body.message});
            testPost.save(function(err,data) {console.log("saved");});
          }
        }else{
          var testPost = new Posts({user:req.session.username,title:req.body.title});
          testPost.save(function(err,data) {console.log("saved");});
        }
        res.redirect("/");
      }else{
        res.redirect("/");
      }
    }else{
      res.redirect("/");
    }
  }else{
    res.redirect("/login");
  }
});

app.post('/signup', function(req,res){
  if(req.body.id != secretconfig.id){res.redirect("/signup#idIncorrect");return;}
  if(req.body.password != req.body.passConf){res.redirect("/signup#confirmPassword");return;}
  var usernameTest = /^[a-zA-Z0-9]+([._]?[a-zA-Z0-9]+)*$/;
  if(req.body.username.length > 12 || req.body.username.length < 3){res.redirect("/signup#usernameRules");return;}
  if(req.body.password.length >= 6){res.redirect("/signup#passwordRules");return;}
  if(!usernameTest.test(req.body.username)){res.redirect("/signup#usernameRules");return;}
  if(!usernameTest.test(req.body.password)){res.redirect("/signup#passwordRules");return;}
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

app.post("/comments/:id", function(req,res){
  res.redirect("/");
});

app.get("/api/comments/:id", function(req,res){
  res.send(
    JSON.stringify({
      id:req.params.id,
      comments:[
        {
          user:"me",
          time:Date.now(),
          text: "Hi there",
          subcomments:[]
        }
      ]
    })
  );
});

app.get("/comments/:id", function(req,res){
  res.render("comments", {title: secretconfig.title, uname: req.session.username,id: req.params.id});
});

app.use(express.static(path.join(__dirname, 'public')));

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
