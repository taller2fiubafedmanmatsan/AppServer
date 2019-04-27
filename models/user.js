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
  nickname: {type: String, minlenght: 1, maxlenght: 50},
  password: {type: String, minlenght: 6, maxlenght: 255, require: true},
  isAdmin: Boolean,
  photoUrl: String,
  facebook_log: {type: Boolean, require: true}
});

userSchema.methods.getAuthToken = function() {
  return jwt.sign({_id: this._id},
      config.get('jwt_key'),
      {expiresIn: 86400} // expires in 24 hours
  );
};

const User = mongoose.model('User', userSchema);

function validateUser(user) {
  const schema = {
    name: Joi.string().min(1).max(50).trim().required(),
    email: Joi.string().min(3).max(50).trim().email().required(),
    nickname: Joi.string().min(1).max(50).trim(),
    password: Joi.string().min(6).max(255).required(),
    isAdmin: Joi.bool(),
    photoUrl: Joi.string().trim().uri(),
    facebook_log: Joi.bool()
  };

  return Joi.validate(user, schema);
};

function validateUpdate(requestBody) {
  const schema = {
    nickname: Joi.string().min(1).max(50).trim(),
    password: Joi.string().min(6).max(255),
    photoUrl: Joi.string().trim().uri()
  };

  return Joi.validate(requestBody, schema);
}

function validatePasswordRestore(requestBody) {
  const schema = {
    email: Joi.string().min(3).max(50).trim().required().email()
  };
  return Joi.validate(requestBody, schema);
}

exports.User = User;
exports.validate = validateUser;
exports.validateUpdate = validateUpdate;
exports.validatePasswordRestore = validatePasswordRestore;
