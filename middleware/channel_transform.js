const {User} = require('../models/user');
const _ = require('lodash');

function selectUser(users, email) {
  return users.filter((user) => {
    if (Array.isArray(email)) return email.includes(user.email);

    return user.email === email;
  });
};

function transformRequest(users, req) {
  const validChannel = _.pick(req.body,
      [
        'name', 'description', 'isPrivate', 'welcomeMessage'
      ]
  );
  validChannel.creator = selectUser(users, req.body.creator)[0];
  validChannel.users = selectUser(users, req.body.users);

  req.validChannel = validChannel;
};

async function validUserEmails(emails, req) {
  const users = await User.find({email: {$in: emails}});
  transformRequest(users, req);
};

function allUsers(creator, users) {
  const emails = [creator];
  if (users) {
    users.forEach(function(email) {
      if (!emails.includes(email)) emails.push(email);
    });
  }
  return emails;
};

module.exports = async function(req, res, next) {
  const emails = allUsers(req.body.creator, req.body.users);
  await validUserEmails(emails, req);

  if (req.validChannel.creator && (req.validChannel.users.length > 0)) {
    next();
  } else {
    return res.status(404).send('Invalid users.');
  }
};
