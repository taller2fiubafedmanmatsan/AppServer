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

const Workspace = mongoose.model('Workspace', workspaceSchema, 'workspaces');

function validateWorkspace(workspace) {
  const schema = {
    name: Joi.string().trim().min(1).max(250).required(),
    imageUrl: Joi.string().trim().uri(),
    location: Joi.string(),
    creator: Joi.string().trim().email().required(),
    description: Joi.string().min(1).max(250),
    welcomeMessage: Joi.string().min(1).max(250),
    channels: Joi.array().items(Joi.string().trim()),
    users: Joi.array().items(Joi.string().trim().email()).required(),
    admins: Joi.array().items(Joi.string().trim().email()).required()
  };

  return Joi.validate(workspace, schema);
};

function validateWorkspaceUpdate(workspace) {
  const schema = {
    name: Joi.string().trim().min(1).max(250),
    imageUrl: Joi.string().trim().uri(),
    location: Joi.string(),
    description: Joi.string().min(1).max(250),
    welcomeMessage: Joi.string().min(1).max(250)
  };

  return Joi.validate(workspace, schema);
};

exports.Workspace = Workspace;
exports.validate = validateWorkspace;
exports.validateWorkspaceUpdate = validateWorkspaceUpdate;
