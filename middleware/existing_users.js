const _ = require('lodash');
const mongoose = require('mongoose');
const {User} = require('../models/user');

async function validUser(usersId) {
  return await User.find({email: {$in: usersId}});
};

function addUser(usersId, userEmail) {
  usersId.push(userEmail);
};

function addUsers(usersId, usersArray) {
  usersArray.forEach(function(userEmail) {
    usersId.push(mongoose.Types.ObjectId(userEmail));
  });
  
};

module.exports = function(req, res, next) {
  const userArrays = _.pick(req.body, ['creator', 'users', 'admins']);
  if (!userArrays) next();
  console.log(userArrays);

  userArrays.forEach(function(users) {
    Array.isArray(users) ? addUsers(usersId, users) : addUser(usersId, users);
  });

};
