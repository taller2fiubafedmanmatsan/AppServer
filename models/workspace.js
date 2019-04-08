const mongoose = require('mongoose');
// const userSchema = require('../models/user');
const Joi = require('joi');

const workspaceSchema = mongoose.Schema({
  name: {type: String, require: true, minlenght: 1, maxlength: 250},
  image_url: {type: String},
  location: String, // revisar
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    require: true
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

  };
  Joi.validate(workspace, schema);
};

exports.Workspace = Workspace;
exports.validateWorkspace = validateWorkspace;
