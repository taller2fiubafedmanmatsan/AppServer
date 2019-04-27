const express = require('express');
const auth = require('../middleware/auth');
// const usersExist = require('../middleware/existing_users');
const {Workspace, validate} = require('../models/workspace');
const {User} = require('../models/user');
const _ = require('lodash');
const router = express.Router();

async function setupWorkspaceData(wsData) {
  const workspace = _.pick(wsData,
      [
        'name', 'imageUrl', 'location', 'description',
        'welcomeMessage', 'channels'
      ]
  );
  workspace.creator = await User.findOne({email: wsData.creator});
  workspace.users = await User.find({email: {$in: wsData.users}});
  workspace.admins = await User.find({email: {$in: wsData.admins}});

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

router.post('/', auth, async (request, response) => {
  const {error} = validate(request.body);
  if (error) return response.status(400).send(error.details[0].message);
  const wsData = await setupWorkspaceData(request.body);

  if (!wsData.creator || !wsData.users || !wsData.admins) {
    return response.status(400).send(error);
  }

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
