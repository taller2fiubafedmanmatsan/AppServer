const express = require('express');
const auth = require('../middleware/auth');
const usersExist = require('../middleware/existing_users');
const {Workspace, validate} = require('../models/workspace');
const router = express.Router();

router.get('/', async (request, response) => {
  response.status(200).send(`It's alive!`);
});

router.post('/', [auth, usersExist], async (request, response) => {
  const {error} = validate(request.body);
  if (error) return response.status(400).send(error.details[0].message);

  const {name, creator} = request.body;

  let workspace = await Workspace.findOne({name, creator});

  if (workspace) {
    return response.status(400).send('Workspace already registered.');
  }

  workspace = new Workspace(_.pick(request.body,
      [
        'name', 'imageUrl', 'location', 'creator', 'description',
        'welcomeMessage', 'channels', 'users', 'admins'
      ]
  ));

  response.status(200).send(_.pick(workspace, ['name', 'email']));
});

module.exports = router;
