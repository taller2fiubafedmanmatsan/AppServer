const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const channelSchema = mongoose.Schema({
  name: {type: String, minlength: 1, maxlenght: 50},
  pages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Page'
  }],
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    require: true
  },
  bots: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bot'
  }],
  isPrivate: {type: Boolean, default: false},
  description: {type: String, minlength: 1, maxlenght: 250},
  welcomeMessage: {type: String, minlength: 1, maxlenght: 250},
  channelType: {type: String, minlength: 1, maxlenght: 250}
});

const Channel = mongoose.model('Channel', channelSchema);

function validateChannel(channel) {
  const schema = {
    name: Joi.string().min(1).max(50).required(),
    pages: Joi.array().items(Joi.objectId()),
    users: Joi.array().items(Joi.string().trim().email()).required(),
    creator: Joi.string().trim().email(),
    isPrivate: Joi.boolean(),
    description: Joi.string().min(1).max(250),
    welcomeMessage: Joi.string().min(1).max(250),
    channelType: Joi.string().min(1).max(250).required()
  };
  return Joi.validate(channel, schema);
};

function validateChannelUpdate(channel) {
  const schema = {
    name: Joi.string().min(1).max(50),
    isPrivate: Joi.boolean(),
    description: Joi.string().min(1).max(250),
    welcomeMessage: Joi.string().min(1).max(250)
  };
  return Joi.validate(channel, schema);
};

exports.Channel = Channel;
exports.validateChannel = validateChannel;
exports.validateChannelUpdate = validateChannelUpdate;
exports.channelSchema = channelSchema;
