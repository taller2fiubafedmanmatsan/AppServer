const {User} = require('../models/user');

function selectUser(users, email) {
  return users.filter((user) => {
    if (Array.isArray(email)) return email.includes(user.email);

    return user.email === email;
  });
};

function addValidUsersInRequest(users, req) {
  req.validUsers = {
    creator: selectUser(users, req.body.creator)[0],
    admins: selectUser(users, req.body.admins),
    users: selectUser(users, req.body.users)
  };
};

async function validUserEmails(emails, req) {
  const length = emails.length;
  const users = await User.find({email: {$in: emails}});
  addValidUsersInRequest(users, req);
  return length === req.validUsers.length;
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

  if (req.validUsers.creator && (req.validUsers.users.length > 0)
   && (req.validUsers.admins.length > 0)) {
    next();
  } else {
    return res.status(404).send('Invalid users.');
  }
};
