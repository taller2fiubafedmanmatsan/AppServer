const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//Create Schema and model

const userSchema = new Schema({
  user_token: String,
  user_name: String,
  user_surname: String,
  user_mail: String,
  user_image: String
});

const User = mongoose.model('user', userSchema, 'users');
module.exports = User; //We export the model to use it in other files
