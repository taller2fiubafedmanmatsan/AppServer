const mongoose = require('mongoose');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const config = require('config');

const userSchema = mongoose.Schema({
  name: {type: String, minlenght: 1, maxlenght: 50, require: true},
  email: {
    type: String,
    minlenght: 3,
    maxlenght: 50,
    require: true,
    unique: true
  },
  nickname: {type: String, minlenght: 1, maxlenght: 50, require: true},
  password: {type: String, minlenght: 6, maxlenght: 255, require: true},
  isAdmin: Boolean
});

userSchema.methods.getAuthToken = function() {
  return jwt.sign({_id: this._id, name: this.name, isAdmin: this.isAdmin},
      config.get('jwt_key'),
      {expiresIn: 86400} // expires in 24 hours
  );
};

const User = mongoose.model('User', userSchema);

function validateUser(user) {
  const schema = {
    name: Joi.string().min(1).max(50).required(),
    email: Joi.string().min(3).max(50).required().email(),
    nickname: Joi.string().min(1).max(50),
    password: Joi.string().min(6).max(255).required(),
    isAdmin: Joi.bool()
  };

  return Joi.validate(user, schema);
};

exports.User = User;
exports.validate = validateUser;
