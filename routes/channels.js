const express = require('express');
const Transaction = require('mongoose-transactions');
const _ = require('lodash');
const auth = require('../middleware/auth');
const channelTransform = require('../middleware/channel_transform');
const firebase = require('../helpers/firebase_helper');
const {Workspace} = require('../models/workspace');
const {Page} = require('../models/page');
const {Message} = require('../models/message');
const {User} = require('../models/user');
const botHelper = require('../helpers/bot_helper');

const router = express.Router();

const {
  Channel,
  validateChannel,
  validateChannelUpdate
} = require('../models/channel');

router.param('workspaceName', async (request, response, next, elementId) => {
  const workspace = await Workspace.findOne({name: elementId})
      .populate('channels', '-__v');
  if (!workspace) return response.status(404).send('Invalid workspace.');

  if (request.params.channelName) {
    const chId = workspace.channels.filter((ch) => {
      if (ch.name === request.params.channelName) {
        return ch._id;
      }
    });
    const channel = await Channel.findById(chId)
        .populate('pages', '-__v')
        .populate('users', 'name nickname email photoUrl topics welcomeMessage')
        .populate('creator', 'name nickname email')
        .populate('bots', 'name');

    if (!channel) return response.status(404).send('Invalid channel.');

    request.channel = channel;
  }

  request.workspace = workspace;
  next();
});

router.get('/:channelName/workspace/:workspaceName', auth,
    async (request, response) => {
      if (!(request.channel.users.some((user) => user._id == request.user._id))
          && !(request.channel.bots.some((bot) => bot._id == request.user._id)))
      {
        const msg = 'The user cannot see messages from this channel';
        return response.status(403).send(msg);
      }

      response.status(200).send(request.channel);
    });

router.get('/workspace/:workspaceName', auth, async (request, response) => {
  const userChannels = request.workspace.channels.filter((ch) => {
    if (ch.users.some((u) => u._id == request.user._id)) return ch;
  });

  response.status(200).send(userChannels);
});

router.post('/workspace/:workspaceName', [auth, channelTransform],
    async (request, response) => {
      const fields = [
        'name', 'users', 'isPrivate', 'description', 'welcomeMessage',
        'creator', 'pages'
      ];

      const {error} = validateChannel(_.pick(request.body, fields));
      if (error) return response.status(400).send(error.details[0].message);

      const workspace = request.workspace;
      if (!workspace.users.some((userId) => userId == request.user._id)) {
        const msg = 'The user cannot create channels in this workspace';
        return response.status(403).send(msg);
      }

      const page = new Page({
        messages: [],
        number: 0
      });
      request.validChannel.pages = [page];

      const channel = new Channel(_.pick(request.validChannel, fields));
      channel.creator = request.user._id;
      if (workspace.channels
          .some((aChannel) => aChannel.name == channel.name)) {
        return response.status(400).send('Channel already registered.');
      }
      workspace.channels.push(channel._id);

      const newTopic = `${channel._id}`;
      const users = request.validChannel.users;
      if (Array.isArray(users)) {
        users.forEach(async (user) => {
          if (!user.topics.includes(newTopic)) {
            user.topics.push(newTopic);
            await firebase.subscribeToTopic(user, newTopic);
          };
          users.forEach((user) => {
            console.log(`user: ${user.name} in topics: ${user.topics}`);
          });
        });
      } else {
        if (!users.topics.includes(newTopic)) {
          users.topics.push(newTopic);
          await firebase.subscribeToTopic(users, newTopic);
          console.log(`user: ${users.name} in topics: ${users.topics}`);
        };
      }

      if (!await finishedCreationTransaction(workspace, channel, page, users)) {
        return response.status(500).send(error);
      }
      await botHelper.sendWelcomeMessage(workspace, channel, users);
      return response.status(200).send(_.pick(channel,
          [
            '_id', 'name', 'welcomeMessage', 'description', 'isPrivate'
          ]));
    });

router.patch('/:channelName/workspace/:workspaceName', auth,
    async (request, response) => {
      const fields = ['name', 'isPrivate', 'description', 'welcomeMessage'];

      const {error} = validateChannelUpdate(_.pick(request.body, fields));
      if (error) return response.status(400).send(error.details[0].message);

      const workspace = request.workspace;
      let channel = request.channel;

      if (!workspace.admins.some((userId) => userId == request.user._id) &&
               (channel.creator != request.user._id)) {
        const msg = `You cannot modify ${channel.name} channel`;
        return response.status(403).send(msg);
      }

      const {name} = request.body;
      if (name && workspace.channels.
          some((aChannel) => aChannel.name == name)) {
        return response.status(400).send('Channel already registered.');
      }

      channel = await Channel.findByIdAndUpdate(channel._id,
          _.pick(request.body, fields), {new: true});
      return response.status(200).send(_.pick(channel, fields));
    });

router.patch('/:channelName/workspace/:workspaceName/addUsers', auth,
    async (request, response) => {
      const fields = ['users'];

      const users = await User.find({email: {$in: request.body.users}});
      if (!users) return response.status(400).send('No users were provided.');

      const workspace = request.workspace;
      let channel = request.channel;

      if (channel.isPrivate &&
        !channel.users.some((user) => user._id == request.user._id)) {
        const msg = 'The user cannot add members to this channel';
        return response.status(403).send(msg);
      }

      channel = await Channel.findByIdAndUpdate(channel._id,
          {$addToSet: {users: users.map((user) => user._id)}},
          {new: true});

      const topic = `${channel._id}`;
      if (Array.isArray(users)) {
        users.forEach(async (user) => {
          if (!user.topics.includes(topic)) {
            user.topics.push(topic);
            await user.save();
            await firebase.subscribeToTopic(user, topic);
          };
          users.forEach((user) => {
            console.log(`user: ${user.name} in topics: ${user.topics}`);
          });
        });
      } else {
        if (!users.topics.includes(topic)) {
          users.topics.push(topic);
          await users.save();
          await firebase.subscribeToTopic(users, topic);
          console.log(`user: ${users.name} in topics: ${users.topics}`);
        };
      }
      await botHelper.sendWelcomeMessage(workspace, channel, users);
      return response.status(200).send(_.pick(channel, fields));
    });

router.patch('/:channelName/workspace/:workspaceName/users', auth,
    async (request, response) => {
      const fields = ['users'];

      let users = await User.find({email: {$in: request.body.users}});
      if (!users) return response.status(400).send('No users were provided.');

      const channel = request.channel;
      const workspace = request.workspace;

      if (!workspace.admins.some((userId) => userId == request.user._id) &&
               (channel.creator != request.user._id)) {
        const msg = 'The user cannot remove members of this channel.';
        return response.status(403).send(msg);
      }

      channel.users = channel.users.filter((user) => {
        return !(users.some((userToRemove) => {
          return _.isEqual(userToRemove._id, user._id);
        }));
      });

      const topic = `${channel._id}`;
      users = await unsubscribeUsersFromTopic(users, topic);
      if (!await finishedUpdateTransaction(channel, users)) {
        return response.status(500).send(error);
      }
      return response.status(200).send(_.pick(channel, fields));
    });

router.delete('/:channelName/workspace/:workspaceName', [auth],
    async (request, response) => {
      const workspace = request.workspace;
      const channel = request.channel;

      if (!workspace.admins.some((userId) => userId == request.user._id) &&
               (channel.creator != request.user._id)) {
        const msg = `You cannot delete ${channel.name} channel`;
        return response.status(403).send(msg);
      }

      // Remove channel from workspace
      workspace.channels = workspace.channels.filter((aChannel) => {
        return !_.isEqual(aChannel._id, channel._id);
      });

      let users = channel.users;
      const topic = `${channel._id}`;
      users = await unsubscribeUsersFromTopic(users, topic);

      if (!await finishedDeletionTransaction(workspace, channel, users)) {
        return response.status(500).send(error);
      }
      return response.status(200).send(`Deleted ${channel.name} successfully`);
    });


async function finishedCreationTransaction(workspace, channel, page, users) {
  transaction = new Transaction();
  await botHelper.addTitoTo(channel.bots);
  transaction.insert(Channel.modelName, channel);
  transaction.insert(Page.modelName, page);
  transaction.update(Workspace.modelName, workspace._id, workspace);
  users.forEach((user) => {
    transaction.insert(User.modelName, user);
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

async function finishedUpdateTransaction(channel, users) {
  transaction = new Transaction();
  users.forEach((user) => {
    transaction.insert(User.modelName, user);
  });
  transaction.update(Channel.modelName, channel._id, channel);

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

async function finishedDeletionTransaction(workspace, channel, users) {
  transaction = new Transaction();
  users.forEach((user) => {
    transaction.insert(User.modelName, user);
  });

  channel.pages.forEach((aPage) => {
    aPage.messages.forEach((aMessage) => {
      transaction.remove(Message.modelName, aMessage);
    });
    transaction.remove(Page.modelName, aPage);
  });
  transaction.update(Workspace.modelName, workspace._id, workspace);
  transaction.remove(Channel.modelName, channel);

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

async function unsubscribeUsersFromTopic(users, topic) {
  users.forEach(async (user) => {
    user.topics = user.topics.filter((aTopic) => {
      return aTopic !== topic;
    });
    await firebase.unsubscribeFromTopic(user, topic);
  });
  return users;
}


module.exports = router;
