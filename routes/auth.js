const bcrypt = require('bcrypt');
const Joi = require('joi');
const express = require('express');
const {User} = require('../models/user');

const router = express.Router();

router.post('/singin', async (req, res) => {
  const {error} = validate(req.body);
  if (error) return res.status(400).send('Bad request.');

  const user = await User.findOne({email: req.body.email});
  if (!user) return res.status(400).send('Invalid email or password.');

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword) return res.status(400).send('Invalid email or password.');

  if (user.facebook_log != req.body.facebook_log) {
    return res.status(400).send('User already registered.');
  }

  const token = user.getAuthToken();

  res.status(200).send(token);
});

function validate(user) {
  const schema = {
    email: Joi.string().min(3).max(50).required().email(),
    password: Joi.string().min(6).max(255).required(),
    facebook_log: Joi.bool().required()
  };

  return Joi.validate(user, schema);
};

module.exports = router;

