const express = require('express');
const dbLog = require('debug')('app:dbLog');
const router = express.Router();

const {User, validate} = require('../models/user');

router.get('/:id', async (request, response) => {
  const user = await User.findById(request.params.id).select('-password');
  const msg = `The user by id: ${request.params.id} doesn't exists.`;
  if (!user) return response.status(404).send(msg);

  response.send(user);
});

router.post('/', async (request, response) => {
  const {error} = validate(request.body);
  if (error) return response.status(400).send(error.details[0].message);

  const {name, email, password, isAdmin} = request.body;
  dbLog(`Por preguntar si hay un user`);
  let user = await User.findOne({email});
  dbLog(`Pregunte!`);
  if (user) return response.status(400).send('User already registered.');

  user = new User({name, email, password, isAdmin});
  dbLog(`Por hacer save!`);
  const newUser = await user.save();
  dbLog(`save loco!`);
  response.status(200).send(`New user ${newUser.name} created`);
});

module.exports = router;
