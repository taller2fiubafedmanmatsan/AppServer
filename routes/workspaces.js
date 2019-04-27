const express = require('express');
const auth = require('../middleware/auth');
const usersExist = require('../middleware/existing_users');
const {Workspace, validate} = require('../models/workspace');
const _ = require('lodash');
const router = express.Router();

router.get('/:wsname', auth, async (request, response) => {
  console.log(request.params.wsname);
  const workspace = await Workspace.findOne({name: request.params.wsname});
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

  workspace = new Workspace(_.pick(request.validWorkspace,
      [
        'name', 'imageUrl', 'location', 'creator', 'description',
        'welcomeMessage', 'channels', 'users', 'admins'
      ]
  ));

  await workspace.save();

  response.status(200).send(_.pick(workspace, [
    'name', 'imageUrl', 'location', 'creator', 'description',
    'welcomeMessage', 'channels', 'users', 'admins'
  ]));
});

module.exports = router;
