const mongoose = require('mongoose');
const Joi = require('joi');


const userSchema = mongoose.Schema({
  name: {type: String, minlenght: 1, maxlenght: 50, require: true},
  email: {type: String, require: true},
  nickname: String,
  password: String,
  isAdmin: Boolean
});

const User = mongoose.model('User', userSchema);

function validateUser(user) {
  const schema = {
    name: Joi.string().min(1).max(50).required(),
    email: Joi.string().required(),
    nickname: Joi.string(),
    password: Joi.string().min(6).max(30).required()
  };

  return Joi.validate(user, schema);
};

exports.User = User;
exports.validate = validateUser;
