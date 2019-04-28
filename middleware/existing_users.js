const {User} = require('../models/user');
const _ = require('lodash');

function selectUser(users, email) {
  return users.filter((user) => {
    if (Array.isArray(email)) return email.includes(user.email);

    return user.email === email;
  });
};

function transformRequest(users, req) {
  const validWorkspace = _.pick(req.body,
      [
        'name', 'imageUrl', 'location', 'description',
        'welcomeMessage', 'channels'
      ]
  );

  validWorkspace.creator = selectUser(users, req.body.creator)[0];
  validWorkspace.users = selectUser(users, req.body.admins);
  validWorkspace.admins = selectUser(users, req.body.users);

  req.validWorkspace = validWorkspace;
};

async function validUserEmails(emails, req) {
  const users = await User.find({email: {$in: emails}});
  transformRequest(users, req);
};

function allUsers(creator, admins, users) {
  const emails = [creator];
  if (admins) {
    admins.forEach(function(email) {
      if (!emails.includes(email)) emails.push(email);
    });
  }
  if (users) {
    users.forEach(function(email) {
      if (!emails.includes(email)) emails.push(email);
    });
  }
  return emails;
};

module.exports = async function(req, res, next) {
  const emails = allUsers(req.body.creator, req.body.admins, req.body.users);
  await validUserEmails(emails, req);

  if (req.validWorkspace.creator && (req.validWorkspace.users.length > 0)
   && (req.validWorkspace.admins.length > 0)) {
    next();
  } else {
    return res.status(404).send('Invalid users.');
  }
};
