const express = require('express');
const Transaction = require('mongoose-transactions');
const _ = require('lodash');
const auth = require('../middleware/auth');
const channelTransform = require('../middleware/channel_transform');
const firebase = require('../helpers/firebase_helper');
const {Workspace} = require('../models/workspace');
const {Page} = require('../models/page');
const {User} = require('../models/user');

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
        .populate('users', 'name nickname email')
        .populate('creator', 'name nickname email');

    if (!channel) return response.status(404).send('Invalid channel.');

    request.channel = channel;
  }

  request.workspace = workspace;
  next();
});

router.get('/:channelName/workspace/:workspaceName', auth,
    async (request, response) => {
      if (!request.channel.users.some((user) => user._id == request.user._id)) {
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
      if (!workspace.admins.some((userId) => userId == request.user._id)) {
        return response.status(403).send('The user cannot create channels' +
                                          ' in this workspace');
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

      const newTopic = `${workspace.name}-${channel.name}`;
      const users = request.validChannel.users;

      if (Array.isArray(users)) {
        users.forEach(async (user) => {
          if (!user.topics.includes(newTopic)) {
            user.topics.push(newTopic);
            await user.save();
            await firebase.subscribeToTopic(user, newTopic);
          };
          users.forEach((user) => {
            console.log(`user: ${user.name} in topics: ${user.topics}`);
          });
        });
      } else {
        if (!users.topics.includes(newTopic)) {
          users.topics.push(newTopic);
          await users.save();
          await firebase.subscribeToTopic(users, newTopic);
          console.log(`user: ${users.name} in topics: ${users.topics}`);
        };
      }


      if (!finishedCreationTransaction(workspace, channel, page, users)) {
        return response.status(500).send(error);
      }

      // users.forEach(async (user) => {
      //   await firebase.subscribeToTopic(user, newTopic);
      // });
      return response.status(200).send(_.pick(channel,
          [
            '_id', 'name', 'welcomeMessage', 'description', 'isPrivate'
          ]));
    });

router.patch('/', auth, async (request, response) => {
  const fields = [
    'name', 'isPrivate',
    'description', 'welcomeMessage'
  ];

  const {error} = validateChannelUpdate(_.pick(request.body, fields));
  if (error) return response.status(400).send(error.details[0].message);

  const {workspaceId, channelId, name} = request.body;

  const workspace = await Workspace.
      findById(workspaceId).
      populate('channels', 'name');

  if (!workspace) return response.status(404).send('Invalid workspace.');

  if (!workspace.admins.some((userId) => userId == request.user._id)) {
    return response.status(403).send('The user cannot modify channels' +
                                          ' in this workspace');
  }

  if (name && workspace.channels.
      some((aChannel) => aChannel.name == name)) {
    return response.status(400).send('Channel already registered.');
  }

  let channel = workspace.channels.find((aChannel) => {
    return aChannel._id == channelId;
  });

  if (!channel) return response.status(404).send('Invalid channel.');

  channel = await Channel.findByIdAndUpdate(channel._id,
      _.pick(request.body, fields), {new: true});
  return response.status(200).send(_.pick(channel, fields));
});

router.patch('/:channelName/workspace/:workspaceName/addUsers', auth,
    async (request, response) => {
      const fields = ['users'];

      const users = await User.find({email: {$in: request.body.users}});
      if (!users) return response.status(400).send('No users where provided.');

      let channel = request.channel;

      if (channel.isPrivate &&
        !channel.users.some((user) => user._id == request.user._id)) {
        return response.status(403).send('The user cannot add users' +
                                          ' this channel');
      }

      channel = await Channel.findByIdAndUpdate(channel._id,
          {$addToSet: {users: users.map((user) => user._id)}},
          {new: true});

      const topic = `${request.workspace.name}-${channel.name}`;
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

      return response.status(200).send(_.pick(channel, fields));
    });

async function finishedCreationTransaction(workspace, channel, page, users) {
  transaction = new Transaction();
  transaction.insert(Channel.modelName, channel);
  transaction.insert(Page.modelName, page);
  transaction.update(Workspace.modelName, workspace._id, workspace);
  users.forEach((user) => {
    return transaction.update(User.modelName, user._id, user);
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

module.exports = router;
