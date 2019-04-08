const mongoose = require('mongoose');
const Joi = require('joi');

const workspaceSchema = mongoose.Schema({
  name: {type: String, require: true, minlenght: 1, maxlength: 250},
  imageUrl: {type: String},
  location: String, // revisar
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  description: {type: String, minlength: 1, maxlenght: 250},
  welcomeMessage: {type: String, minlength: 1, maxlenght: 250},
  channels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel'
  }],
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

const Workspace = mongoose.model('Workspace', workspaceSchema);

function validateWorkspace(workspace) {
  const schema = {
    name: Joi.string().trim().min(1).max(250).required(),
    imageUrl: Joi.string().trim().uri(),
    location: Joi.string(),
    creator: Joi.objectId().required(),
    description: Joi.string().min(1).max(250),
    welcomeMessage: Joi.string().min(1).max(250),
    channels: Joi.array().items(Joi.objectId()).required(),
    users: Joi.array().items(Joi.objectId()).required(),
    admins: Joi.array().items(Joi.objectId()).required()
  };
  Joi.validate(workspace, schema);
};

exports.Workspace = Workspace;
exports.validateWorkspace = validateWorkspace;
