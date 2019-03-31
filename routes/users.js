const express = require('express');
const bcrypt = require('bcrypt');
const _ = require('lodash');
const router = express.Router();
const auth = require('../middelware/auth');

const {User, validate, validateUpdate} = require('../models/user');

router.get('/me', auth, async (request, response) => {
  const user = await User.findById(request.user._id)
      .select('-password -__v');

  response.status(200).send(user);
});

router.post('/', async (request, response) => {
  const {error} = validate(request.body);
  if (error) return response.status(400).send(error.details[0].message);

  const {email, password} = request.body;

  let user = await User.findOne({email: email});

  if (user) return response.status(400).send('User already registered.');

  const salt = await bcrypt.genSalt(10);
  request.body.password = await bcrypt.hash(password, salt);
  user = new User(_.pick(request.body,
      [
        'name', 'email', 'nickname', 'password', 'isAdmin', 'photo_url',
        'facebook_log'
      ]
  ));

  await user.save();

  const token = user.getAuthToken();

  response.header('x-auth-token', token).status(200)
      .send(_.pick(user, ['name', 'email']));
});

router.put('/me', auth, async (request, response) => {
  const {error} = validateUpdate(request.body);
  if (error) return response.status(400).send(error.details[0].message);

  if (request.body.password) {
    const salt = await bcrypt.genSalt(10);
    request.body.password = await bcrypt.hash(request.body.password, salt);
  };

  const user = await User.findByIdAndUpdate(request.user._id,
      _.pick(request.body,
          [
            'nickname', 'password', 'photo_url'
          ]
));

  response.status(200).send(_.pick(user, ['name', 'email']));
});


module.exports = router;
