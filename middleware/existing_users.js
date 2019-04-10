const _ = require('lodash');
// const mongoose = require('mongoose');
const {User} = require('../models/user');

async function validUserEmails(email) {
  return await User.find({email: {$in: email}});
};

async function validCreator(emails) {
  emails.creator = await User.find({email: emails.creator});

  return emails.creator;
};

function validUsers(emails) {
  const length = emails.users.length;
  emails.users = validUserEmails(emails.users);
  return length === emails.users.length;
};

function validAdmins(emails) {
  const length = emails.users.length;
  emails.users = validUserEmails(emails.users);
  return length === emails.admins.length;
};

module.exports = function(req, res, next) {
  const emails = _.pick(req.body, ['creator', 'users', 'admins']);
  if (!emails) next();
  if (validCreator(emails) && validUsers(emails) && validAdmins(emails)) {
    next();
  }

  return res.status(404).send('Invalid users.');
};
