const express = require('express');
const bcrypt = require('bcrypt');
const _ = require('lodash');
const router = express.Router();
const auth = require('../middleware/auth');
const mailer = require('../mailer/password_restoration_mail');
const randomstring = require('randomstring');
const firebase = require('../helpers/firebase_helper');

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

  return response.status(200).send(user);
});

router.get('/:userEmail', auth, async (request, response) => {
  const user = await User.findOne({email: request.params.userEmail})
      .select('name email nickname photoUrl -_id');

  return response.status(200).send(user);
});

router.get('/', auth, async (request, response) => {
  const user = await User.findById(request.user._id);
  console.log(user);
  if (!user.isAdmin) {
    const msg = `You have no permissions to perform this action.`;
    return response.status(401).send(msg);
  }

  const users = await User.find({})
      .select('-__v -password -topics -workspaces -fireBaseToken');
  response.status(200).send(users);
});

router.post('/', async (request, response) => {
  const {error} = validate(request.body);
  if (error) return response.status(400).send(error.details[0].message);

  const {email, password} = request.body;

  let user = await User.findOne({email: email});

  if (user) return response.status(400).send('User already registered.');

  const salt = await bcrypt.genSalt(10);
  request.body.password = await bcrypt.hash(password, salt);
  request.body.workspaces = [];
  request.body.fireBaseToken = '';
  user = new User(_.pick(request.body,
      [
        'name', 'email', 'nickname', 'password', 'isAdmin', 'photoUrl',
        'facebook_log', 'workspaces', 'fireBaseToken'
      ]
  ));
  await user.save();

  const token = user.getAuthToken();

  return response.header('x-auth-token', token).status(200)
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

  return response.status(200).send(_.pick(user,
      [
        'name', 'email', 'nickname', 'photoUrl'
      ]
  ));
});

router.patch('/fbtoken/:fbToken', auth, async (request, response) => {
  console.log(request.params);
  const user = await User.findById(request.user._id);
  if (user.fireBaseToken === request.params.fbToken) {
    return response.status(200).send(`Token updated.`);
  }
  console.log(`Por guardar su nuevo token al user ${user.name}`);
  user.fireBaseToken = request.params.fbToken;
  await user.save();

  if (user.topics && user.topics.lenght > 0) {
    console.log(`entre a mandat cosas a un topic: ${user.topics}`);
    user.topics.forEach(async (topic) => {
      await firebase.subscribeToTopic(user, topic);
    });
  };
  console.log(`Todo genial updateando el fb token de ${user.name}`);
  return response.status(200).send(`Token updated.`);
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
  return response.status(200)
      .send(`New password sent to ${request.body.email}` );
});

module.exports = router;
