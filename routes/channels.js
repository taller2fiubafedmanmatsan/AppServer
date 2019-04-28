const express = require('express');
const Transaction = require('mongoose-transactions');
const _ = require('lodash');
const auth = require('../middleware/auth');
const channelTransform = require('../middleware/channel_transform');
const {Workspace} = require('../models/workspace');
const {Page} = require('../models/page');

const router = express.Router();

const {
  Channel,
  validateChannel,
  validateChannelUpdate
} = require('../models/channel');

router.param('workspaceName', async (request, response, next, elementId) => {
  const workspace = await Workspace.findOne({name: elementId})
      .populate('channels', '-id -__v');
  if (!workspace) return response.status(404).send('Invalid workspace.');

  request.workspace = workspace;
  next();
});

router.param('channelName', async (request, response, next, channelName) => {
  const channel = await Channel.findOne({name: channelName}).
      populate('pages', '-__v')
      .populate('users', '-password -__v')
      .populate('creator', '-password -__v');

  if (!channel) return response.status(404).send('Invalid channel.');

  request.channel = channel;
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

      if (!finishedCreationTransaction(workspace, channel, page)) {
        return response.status(500).send(error);
      }
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

router.patch('/:channelName/addUsers', [auth, channelTransform],
    async (request, response) => {
      const fields = ['users'];

      const users = request.validChannel.users;

      let channel = request.channel;

      if (!channel.users.some((user) => user._id == request.user._id)) {
        return response.status(403).send('The user cannot add users' +
                                          ' this channel');
      }

      channel = await Channel.findByIdAndUpdate(channel._id,
          {$addToSet: {users: users.map((user) => user._id)}},
          {new: true});

      return response.status(200).send(_.pick(channel, fields));
    });

async function finishedCreationTransaction(workspace, channel, page) {
  transaction = new Transaction();
  transaction.insert(Channel.modelName, channel);
  transaction.insert(Page.modelName, page);
  transaction.update(Workspace.modelName, workspace._id, workspace);

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
