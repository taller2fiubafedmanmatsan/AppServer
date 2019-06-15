const {User} = require('./models/user');
const FacebookStrategy = require('passport-facebook-token');
const config = require('config');

module.exports = function(passport) {
  passport.serializeUser(function(user, done) {
    done(null, user);
  });

  passport.deserializeUser(function(obj, done) {
    done(null, obj);
  });

  passport.use('facebookToken', new FacebookStrategy({
    clientID: '455315281701166', // config.facebook.id,
    clientSecret: 'e156a7678ffb72709187aed027e8bf76' // config.facebook.secret
  }, async (accessToken, refreshToken, profile, done) => {
    const existingUser = await User.findOne({email: profile.emails[0].value});
    if (existingUser) {
      return done(null, existingUser);
    }
    const newUser = new User({
      email: profile.emails[0].value,
      name: profile._json.name,
      nickname: profile.displayName,
      photoUrl: profile.photos[0].value
    });
    console.log(config.facebook.secret);
    await newUser.save();
    done(null, newUser);
  }));
};
