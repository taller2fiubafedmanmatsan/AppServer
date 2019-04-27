const express = require('express');
const auth = require('../middleware/auth');
const usersExist = require('../middleware/existing_users');
const {Workspace, validate} = require('../models/workspace');
const _ = require('lodash');
const router = express.Router();

function setupWorkspaceData(request) {
  const workspace = _.pick(request.body,
      [
        'name', 'imageUrl', 'location', 'description',
        'welcomeMessage', 'channels'
      ]
  );
  workspace.creator = request.validUsers.creator;
  workspace.users = request.validUsers.users;
  workspace.admins = request.validUsers.admins;

  return workspace;
};

router.get('/:wsname', auth, async (request, response) => {
  const workspace = await Workspace.findOne({name: params.wsname});
  if (!workspace) return response.status(404).send('Workspace not found.');

  response.status(200).send(_.pick(workspace, [
    'name', 'imageUrl', 'location', 'creator', 'description',
    'welcomeMessage', 'channels', 'users', 'admins'
  ]));
});

router.post('/', [auth, usersExist], async (request, response) => {
  const {error} = validate(request.body);
  if (error) return response.status(400).send(error.details[0].message);

  const wsData = setupWorkspaceData(request);

  const {name, creator} = wsData;

  let workspace = await Workspace.findOne({name, creator});

  if (workspace) {
    return response.status(400).send('Workspace already registered.');
  }

  workspace = new Workspace(_.pick(wsData,
      [
        'name', 'imageUrl', 'location', 'creator', 'description',
        'welcomeMessage', 'channels', 'users', 'admins'
      ]
  ));

  response.status(200).send(_.pick(workspace, [
    'name', 'imageUrl', 'location', 'creator', 'description',
    'welcomeMessage', 'channels', 'users', 'admins'
  ]));
});

module.exports = router;
