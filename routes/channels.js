const express = require('express');
const Transaction = require('mongoose-transactions');
const _ = require('lodash');
const auth = require('../middleware/auth');
const channelTransform = require('../middleware/channel_transform');
const {Workspace} = require('../models/workspace');

const router = express.Router();

const {
  Channel,
  validateChannel,
  validateChannelUpdate
} = require('../models/channel');

router.get('/:channelId', auth, async (request, response) => {
  const channelId = request.params.channelId;
  const channel = await Channel.findById(channelId).
      populate({path: 'pages',
        populate: {path: 'pages.messages', model: 'Message'}});

  if (!channel) return response.status(404).send('Invalid channel.');

  if (!channel.users.some((userId) => userId == request.user._id)) {
    const msg = 'The user cannot see messages from this channel';
    return response.status(403).send(msg);
  }

  const messages = [];
  channel.pages.forEach((aPage) => {
    aPage.messages.forEach((aMessage) => messages.push(aMessage));
  });


  response.status(200).send(messages);
});

router.post('/', [auth, channelTransform], async (request, response) => {
  const fields = [
    'name', 'users', 'isPrivate', 'description', 'welcomeMessage'
  ];

  const {error} = validateChannel(_.pick(request.body, fields));
  if (error) return response.status(400).send(error.details[0].message);

  const {workspaceId} = request.body;
  const workspace = await Workspace.
      findById(workspaceId).
      populate('channels', 'name');
  if (!workspace) return response.status(404).send('Invalid workspace.');

  if (!workspace.admins.some((userId) => userId == request.user._id)) {
    return response.status(403).send('The user cannot create channels' +
                                      ' in this workspace');
  }
  const channel = new Channel(_.pick(request.body, fields));
  channel.creator = request.user._id;
  if (workspace.channels.some((aChannel) => aChannel.name == channel.name)) {
    return response.status(400).send('Channel already registered.');
  }
  workspace.channels.push(channel._id);
  if (!finishedCreationTransaction(workspace, channel)) {
    return response.status(500).send(error);
  }
  return response.status(200).send(_.pick(channel,
      [
        '_id', 'name', 'welcomeMessage', 'description'
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

router.patch('/addUsers', [auth, channelTransform],
    async (request, response) => {
      const fields = ['users'];

      const {error} = validateChannelUpdate(_.pick(request.body, fields));
      if (error) return response.status(400).send(error.details[0].message);

      const {channelId, users} = request.body;

      let channel = await Channel.findById(channelId);
      if (!channel) return response.status(404).send('Invalid channel.');

      if (!channel.users.some((userId) => userId == request.user._id)) {
        return response.status(403).send('The user cannot add users' +
                                          ' this channel');
      }

      users.forEach((userMail) => {
        if (!channel.users.some((memberMail) => memberMail == userMail)) {
          channel.users.push(userMail);
        }
      });
      channel = await Channel.findByIdAndUpdate(channel._id,
          _.pick(channel, fields), {new: true});
      return response.status(200).send(_.pick(channel, fields));
    });

async function finishedCreationTransaction(workspace, channel) {
  transaction = new Transaction();
  transaction.update(Workspace.modelName, workspace._id, workspace);
  transaction.insert(Channel.modelName, channel);
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
