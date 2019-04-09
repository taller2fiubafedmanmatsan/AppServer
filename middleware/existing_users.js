const _ = require('lodash');
// const mongoose = require('mongoose');
const {User} = require('../models/user');

async function validUserEmails(email) {
  return await User.find({email: {$in: email}});
};

async function validCreator(emails) {
  return await User.find({email: emails.creator});
};

function validUsers(emails) {
  return validUserEmails(emails.users);
};

function validAdmins(emails) {
  return validUserEmails(emails.admins);
};

module.exports = function(req, res, next) {
  const emails = _.pick(req.body, ['creator', 'users', 'admins']);
  if (!emails) next();
  if (validCreator(emails) && validUsers(emails) && validAdmins(emails)) next();

  return res.status(400, 'Invalid users.');
};
