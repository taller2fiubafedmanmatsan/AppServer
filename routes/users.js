const express = require('express');
const bcrypt = require('bcrypt');
const _ = require('lodash');
const router = express.Router();
const auth = require('../middleware/auth');
const mailer = require('../mailer/password_restoration_mail');
const randomstring = require('randomstring');

const admin = require('firebase-admin');

const {
  User,
  validate,
  validateUpdate,
  validatePasswordRestore
} = require('../models/user');

router.get('/me', auth, async (request, response) => {
  const user = await User.findById(request.user._id)
      .populate('workspaces', 'name')
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
  request.workspaces = [];
  user = new User(_.pick(request.body,
      [
        'name', 'email', 'nickname', 'password', 'isAdmin', 'photoUrl',
        'facebook_log', 'workspaces'
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
            'nickname', 'password', 'photoUrl'
          ]
      ), {new: true});

  response.status(200).send(_.pick(user,
      [
        'name', 'email', 'nickname', 'photoUrl'
      ]
  ));
});

router.patch('/fbtoken/:fbToken', auth, async (request, response) => {
  console.log(request.params);
  const user = await User.findByIdAndUpdate(request.user._id,
      {fireBaseToken: request.params.fbToken},
      {new: true});

  let fbResponse;
  if (user.topics && user.topics.lenght > 0) {
    fbResponse = await admin.messaging()
        .subscribeToTopic(user.fireBaseToken, user.topics);
    console.log('Successfully subscribed to topic:', fbResponse);
  };

  response.status(200).send(fbResponse);
});

router.post('/restorepassword', async (request, response) => {
  let {error} = validatePasswordRestore(request.body);
  if (error) return response.status(400).send(error.details[0].message);

  const email = request.body.email;
  const user = await User.findOne({email: email});
  if (!user) return response.status(400).send('Invalid email');

  const newPassword = randomstring.generate(10);
  const salt = await bcrypt.genSalt(10);

  error = mailer.sendMail(email, newPassword);
  if (error) return response.send(500, error.message);

  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();
  response.status(200).send(`New password sent to ${request.body.email}` );
});

module.exports = router;
