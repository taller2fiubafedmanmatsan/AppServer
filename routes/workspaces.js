const express = require('express');
const auth = require('../middleware/auth');
const Transaction = require('mongoose-transactions');
const usersExist = require('../middleware/existing_users');
const {
  Workspace,
  validate,
  validateWorkspaceUpdate
} = require('../models/workspace');
const {Channel} = require('../models/channel');
const {Page} = require('../models/page');
const {Message} = require('../models/message');

const {User} = require('../models/user');
const _ = require('lodash');
const Fawn = require('fawn');
const mongoose = require('mongoose');
const router = express.Router();

Fawn.init(mongoose);

router.get('/:wsname', auth, async (request, response) => {
  const workspace = await Workspace.findOne({name: request.params.wsname})
      .populate('creator', 'name email')
      .populate('admins', 'name email')
      .populate('users', 'name email')
      .populate('channels', 'name');
  if (!workspace) return response.status(404).send('Workspace not found.');

  response.status(200).send(_.pick(workspace, [
    'name', 'imageUrl', 'location', 'creator', 'description',
    'welcomeMessage', 'channels', 'users', 'admins'
  ]));
});

router.post('/', [auth, usersExist], async (request, response) => {
  const {error} = validate(request.body);
  if (error) return response.status(400).send(error.details[0].message);

  const {name, creator} = request.validWorkspace;
  let workspace = await Workspace.findOne({name, creator});

  if (workspace) {
    return response.status(400).send('Workspace already registered.');
  }

  const ws = request.validWorkspace;
  ws.creator = request.validWorkspace.creator._id;
  ws.admins = request.validWorkspace.admins.map((user) => {
    return user._id;
  });
  ws.users = request.validWorkspace.users.map((user) => {
    return _.pick(user, '_id', 'name');
  });

  workspace = new Workspace(_.pick(ws,
      [
        'name', 'imageUrl', 'location', 'creator', 'description',
        'welcomeMessage', 'channels', 'users', 'admins'
      ]
  ));

  savedWs = await workspace.save();
  creator.workspaces.push(savedWs._id);
  await creator.save();

  response.status(200).send(_.pick(workspace, [
    'name', 'imageUrl', 'location', 'creator', 'description',
    'welcomeMessage', 'channels', 'users', 'admins'
  ]));
});

router.patch('/:wsname', auth, async (request, response) => {
  const workspace = await Workspace.findOne({name: request.params.wsname})
      .populate('users', 'name');

  if (!workspace) return response.status(404).send('Workspace not found.');

  if (workspace.users.some((user) => user._id == request.user._id)) {
    const message = 'The user is already a member of this workspace';
    return response.status(400).send(message);
  }

  const user = await User.findById(request.user._id);
  workspace.users.push(user._id);
  user.workspaces.push(workspace._id);

  if (! await finishedJoinTransaction(user, workspace)) {
    return response.status(500).send(error);
  }
  response.status(200).send(_.pick(workspace, ['name']));
});

router.patch('/:wsname/addAdmins', auth, async (request, response) => {
  let workspace = await Workspace.findOne({name: request.params.wsname})
      .populate('users', 'email')
      .populate('admins', 'email');

  if (!workspace) return response.status(404).send('Workspace not found.');

  if (request.user._id != workspace.creator) {
    const msg = `You have no permissions to modify ${workspace.name} workspace`;
    return response.status(403).send(msg);
  }

  const adminsEmails = request.body.admins;
  if (!adminsEmails) {
    return response.status(400).send('No new admins were specified.');
  }

  const usersEmails = workspace.users.map((user) => {
    return user.email;
  });

  if (!adminsEmails.every((adminEmail) => {
    return usersEmails.includes(adminEmail);
  })) {
    const msg = `Not all the specified admins belong to ${workspace.name}`;
    return response.status(400).send(msg);
  }

  const newAdmins = await User.find({email: {$in: request.body.admins}});

  newAdmins.forEach((newAdmin) => {
    if (!workspace.admins.some((admin) => {
      return admin.email == newAdmin.email;
    })) {
      workspace.admins.push(newAdmin);
    }
  });

  workspace = await Workspace.findByIdAndUpdate(workspace._id,
      workspace, {new: true});
  response.status(200).send(_.pick(workspace, ['name', 'admins']));
});

router.patch('/:wsname/removeAdmins', auth, async (request, response) => {
  let workspace = await Workspace.findOne({name: request.params.wsname})
      .populate('users', 'email')
      .populate('admins', 'email')
      .populate('creator', 'email');

  if (!workspace) return response.status(404).send('Workspace not found.');
  if (request.user._id != workspace.creator._id) {
    const msg = `You have no permissions to modify ${workspace.name} workspace`;
    return response.status(403).send(msg);
  }

  const adminsEmails = request.body.admins;
  if (!adminsEmails) {
    return response.status(400).send('No admins to remove were specified.');
  }

  if (adminsEmails.includes(workspace.creator.email)) {
    const msg = 'Workspace creator cannot be removed from moderators list.';
    return response.status(403).send(msg);
  }

  adminsEmails.forEach((adminEmail) => {
    workspace.admins = workspace.admins.filter((admin) => {
      return admin.email != adminEmail;
    });
  });

  workspace = await Workspace.findByIdAndUpdate(workspace._id,
      workspace, {new: true});
  response.status(200).send(_.pick(workspace, ['name', 'admins']));
});

router.patch('/:wsname/addUsers', auth,
    async (request, response) => {
      const workspace = await Workspace.findOne({name: request.params.wsname})
          .populate('users');
      if (!workspace) return response.status(404).send('Workspace not found.');

      if (!workspace.admins.some((userId) => userId == request.user._id)) {
        const msg = `You have no permissions to modify ${workspace.name}`;
        return response.status(403).send(msg);
      }

      if (!request.body.users) {
        return response.status(400).send('No new users were specified.');
      }

      const newUsers = await User.find({email: {$in: request.body.users}});

      newUsers.forEach((user) => {
        if (!workspace.users.some((wsUser) => {
          return user.email === wsUser.email;
        })) {
          workspace.users.push(user);
          user.workspaces.push(workspace);
        };
      });

      if (!await finishedUsersUpdateTransaction(workspace, newUsers)) {
        return response.status(500).send(error);
      }

      response.status(200).send(_.pick(workspace, ['name', 'users']));
    });

router.patch('/:wsname/removeUsers', auth, async (request, response) => {
  const workspace = await Workspace.findOne({name: request.params.wsname})
      .populate('users', 'email workspaces')
      .populate('creator', 'email');

  if (!workspace) return response.status(404).send('Workspace not found.');

  if (!workspace.admins.some((userId) => userId == request.user._id)) {
    const msg = `You have no permissions to modify ${workspace.name}`;
    return response.status(403).send(msg);
  }

  if (!request.body.users) {
    return response.status(400).send('No users to remove were specified.');
  }

  if (request.body.users.includes(workspace.creator.email)) {
    const msg = 'Workspace creator cannot be removed from users list.';
    return response.status(403).send(msg);
  }

  const usersToRemove = await User.find({email: {$in: request.body.users}});

  usersToRemove.forEach((user) =>{
    user.workspaces = user.workspaces.filter((aWorkspace) => {
      return aWorkspace.name == workspace.name;
    });
    workspace.users = workspace.users.filter((wsUser) => {
      return wsUser.email != user.email;
    });
  });

  if (!await finishedUsersUpdateTransaction(workspace, usersToRemove)) {
    return response.status(500).send(error);
  }
  return response.status(200).send('Users were successfully removed');
});

router.patch('/:wsname/fields', auth, async (request, response) => {
  const fields = ['name', 'imageUrl', 'location', 'description',
    'welcomeMessage'];

  const {error} = validateWorkspaceUpdate(_.pick(request.body, fields));
  if (error) return response.status(400).send(error.details[0].message);

  let workspace = await Workspace.findOne({name: request.params.wsname});

  if (!workspace) return response.status(404).send('Workspace not found.');

  if (request.user._id != workspace.creator) {
    const msg = `You cannot modify ${workspace.name} workspace`;
    return response.status(403).send(msg);
  }

  const {name} = request.body;
  if (name && (await Workspace.findOne({name: name}) )) {
    return response.status(400).send('Workspace name already taken.');
  }

  workspace = await Workspace.findByIdAndUpdate(workspace._id,
      _.pick(request.body, fields), {new: true});
  return response.status(200).send(_.pick(workspace, fields));
});

router.delete('/:wsname', [auth],
    async (request, response) => {
      const workspace = await Workspace.findOne({name: request.params.wsname})
          .populate({path: 'channels', populate: {path: 'pages'}})
          .populate('users', '-__v');

      if (!workspace) return response.status(404).send('Invalid workspace.');

      if (request.user._id != workspace.creator) {
        const msg = `You cannot delete ${workspace.name} workspace`;
        return response.status(403).send(msg);
      }

      const users = workspace.users;
      const channels = workspace.channels;

      if (!await finishedDeletionTransaction(workspace, channels, users)) {
        // return response.status(500).send(error);
      }
      const resMsg = `Deleted ${workspace.name} successfully`;
      return response.status(200).send(resMsg);
    });

async function finishedJoinTransaction(user, workspace) {
  transaction = new Transaction();
  transaction.update(Workspace.modelName, workspace._id, workspace);
  transaction.update(User.modelName, user._id, user);

  try {
    await transaction.run();
    return true;
  }
  catch (error) {
    await transaction.rollback();
    transaction.clean();
    return false;
  }
}

async function finishedUsersUpdateTransaction(workspace, users) {
  transaction = new Transaction();
  transaction.update(Workspace.modelName, workspace._id, workspace);
  users.forEach((user) => {
    transaction.update(User.modelName, user._id, user);
  });

  try {
    await transaction.run();
    return true;
  }
  catch (error) {
    await transaction.rollback();
    transaction.clean();
    return false;
  }
}

async function finishedDeletionTransaction(workspace, channels, users) {
  transaction = new Transaction();
  users.forEach((user) => {
    user.workspaces = user.workspaces.filter((aWorkspace) => {
      return !_.isEqual(aWorkspace._id, workspace._id);
    });
    transaction.insert(User.modelName, user);
  });

  channels.forEach((channel) => {
    channel.pages.forEach((aPage) => {
      aPage.messages.forEach((aMessage) => {
        transaction.remove(Message.modelName, aMessage._id);
      });
      transaction.remove(Page.modelName, aPage._id);
    });
    transaction.remove(Channel.modelName, channel._id);
  });

  transaction.remove(Workspace.modelName, workspace);

  try {
    await transaction.run();
    return true;
  }
  catch (error) {
    await transaction.rollback();
    transaction.clean();
    return false;
  }
}
module.exports = router;
