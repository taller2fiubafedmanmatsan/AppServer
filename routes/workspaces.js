const express = require('express');
const auth = require('../middleware/auth');
const Transaction = require('mongoose-transactions');
const usersExist = require('../middleware/existing_users');
const {Workspace, validate} = require('../models/workspace');
const {User} = require('../models/user');
const _ = require('lodash');
const Fawn = require('fawn');
const mongoose = require('mongoose');
const router = express.Router();

Fawn.init(mongoose);

router.get('/:wsname', auth, async (request, response) => {
  const workspace = await Workspace.findOne({name: request.params.wsname})
      .populate('creator', 'name email')
      .populate('admins', 'name email')
      .populate('users', 'name email')
      .populate('channels', 'name');
  if (!workspace) return response.status(404).send('Workspace not found.');

  response.status(200).send(_.pick(workspace, [
    'name', 'imageUrl', 'location', 'creator', 'description',
    'welcomeMessage', 'channels', 'users', 'admins'
  ]));
});

router.post('/', [auth, usersExist], async (request, response) => {
  const {error} = validate(request.body);
  if (error) return response.status(400).send(error.details[0].message);

  const {name, creator} = request.validWorkspace;
  let workspace = await Workspace.findOne({name, creator});

  if (workspace) {
    return response.status(400).send('Workspace already registered.');
  }

  const ws = request.validWorkspace;
  ws.creator = request.validWorkspace.creator._id;
  ws.admins = request.validWorkspace.admins.map((user) => {
    return user._id;
  });
  ws.users = request.validWorkspace.users.map((user) => {
    return _.pick(user, '_id', 'name');
  });

  workspace = new Workspace(_.pick(ws,
      [
        'name', 'imageUrl', 'location', 'creator', 'description',
        'welcomeMessage', 'channels', 'users', 'admins'
      ]
  ));

  savedWs = await workspace.save();
  creator.workspaces.push(savedWs._id);
  await creator.save();

  response.status(200).send(_.pick(workspace, [
    'name', 'imageUrl', 'location', 'creator', 'description',
    'welcomeMessage', 'channels', 'users', 'admins'
  ]));
});

router.patch('/:wsname', auth, async (request, response) => {
  const workspace = await Workspace.findOne({name: request.params.wsname})
      .populate('users', 'name');

  if (!workspace) return response.status(404).send('Workspace not found.');

  if (workspace.users.some((user) => user._id == request.user._id)) {
    const message = 'The user is already a member of this workspace';
    return response.status(400).send(message);
  }

  const user = await User.findById(request.user._id);
  workspace.users.push(user._id);
  user.workspaces.push(workspace._id);

  if (! await finishedJoinTransaction(user, workspace)) {
    return response.status(500).send(error);
  }
  response.status(200).send(_.pick(workspace, ['name']));
});

async function finishedJoinTransaction(user, workspace) {
  transaction = new Transaction();
  transaction.update(Workspace.modelName, workspace._id, workspace);
  transaction.update(User.modelName, user._id, user);

  try {
    await transaction.run();
    return true;
  }
  catch (error) {
    await transaction.rollback();
    transaction.clean();
    return false;
  }
}
module.exports = router;
