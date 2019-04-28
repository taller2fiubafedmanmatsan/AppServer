const express = require('express');
const auth = require('../middleware/auth');
const usersExist = require('../middleware/existing_users');
const {Workspace, validate} = require('../models/workspace');
const _ = require('lodash');
const Fawn = require('fawn');
const mongoose = require('mongoose');
const router = express.Router();

Fawn.init(mongoose);

router.get('/:wsname', auth, async (request, response) => {
  const workspace = await Workspace.findOne({name: request.params.wsname})
      .populate('creator', 'name _id')
      .populate('admins', 'name _id')
      .populate('users', 'name _id');
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
    return user._id;
  });

  workspace = new Workspace(_.pick(ws,
      [
        'name', 'imageUrl', 'location', 'creator', 'description',
        'welcomeMessage', 'channels', 'users', 'admins'
      ]
  ));

  await new Fawn.Task()
      .save('workspaces', workspace)
      .update('users', {_id: creator._id}, {
        $addToSet: {workspaces: _.pick(workspace, ['_id'])}
      })
      .run();

  // creator.workspaces.push(_.pick(workspace, ['_id', 'name']));
  // await creator.save();
  // await workspace.save();

  response.status(200).send(_.pick(workspace, [
    'name', 'imageUrl', 'location', 'creator', 'description',
    'welcomeMessage', 'channels', 'users', 'admins'
  ]));
});

module.exports = router;
