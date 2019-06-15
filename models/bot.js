const mongoose = require('mongoose');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const config = require('config');

const botSchema = mongoose.Schema({
  name: {type: String, minlenght: 1, maxlenght: 50, require: true},
  url: String,
  workspaces: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace'
  }]
});

botSchema.methods.getAuthToken = function() {
  return jwt.sign(
      {_id: this._id},
      config.get('jwt_key')
  );
};

const Bot = mongoose.model('Bot', botSchema, 'bots');

function validateBot(bot) {
  const schema = {
    name: Joi.string().min(1).max(50).required(),
    url: Joi.string().trim().uri().required()
  };

  return Joi.validate(bot, schema);
};

exports.Bot = Bot;
exports.validateBot = validateBot;
