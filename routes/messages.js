const Transaction = require('mongoose-transactions');
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const _ = require('lodash');
const firebase = require('../helpers/firebase_helper');
const {Workspace} = require('../models/workspace');
const {Channel} = require('../models/channel');
const {Page, isFull} = require('../models/page');
const {User} = require('../models/user');
const {
  Message,
  validateMessage
} = require('../models/message');
const mentionsHandler = require('../helpers/mention_helper');

/* Nuevo feature bot*/
const {Bot} = require('../models/bot');


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


router.post('/workspace/:workspaceName/channel/:channelName/bot', auth,
    async (request, response) => {
      const fields = ['creator', 'text', 'type'];
      const {error} = validateMessage(_.pick(request.body, fields));
      if (error) return response.status(400).send(error.details[0].message);

      const workspace = request.workspace;
      const channel = request.channel;
      if (!request.channel.bots.some((user) => user._id == request.user._id)) {
        return response.status(403)
            .send(`The user doesn't belong to the channel`);
      }
      const messageData = {
        text: request.body.text,
        creator: request.user._id,
        type: request.body.type
      };
      const message = new Message(_.pick(messageData, fields));

      let page = channel.pages[channel.pages.length - 1];
      if (!page || isFull(page)) {
        page = new Page({number: channel.pages.length, messages: [message]});
        channel.pages.push(page._id);
      } else {
        page.messages.push(message);
      }

      if (!finishedCreationTransaction(channel, page, message)) {
        return response.status(500).send('Transaction could not be completed');
      }

      const sender = await Bot.findById(request.user._id);

      await sendMessageToTopic(sender, workspace, channel, message);
      const resObj = {
        message: _.pick(message, ['_id', 'text', 'dateTime',
          'creator', 'type']),
        name: sender.name
      };
      await mentionsHandler.handleMentions(workspace, channel, message, sender);
      return response.status(200).send(resObj);
    });


router.post('/workspace/:workspaceName/channel/:channelName', auth,
    async (request, response) => {
      const fields = ['creator', 'text', 'type'];
      const {error} = validateMessage(_.pick(request.body, fields));
      if (error) return response.status(400).send(error.details[0].message);

      const workspace = request.workspace;
      const channel = request.channel;
      if (!request.channel.users.some((user) => user._id == request.user._id)) {
        return response.status(403)
            .send(`The user doesn't belong to the channel`);
      }
      const messageData = {
        text: request.body.text,
        creator: request.user._id,
        type: request.body.type
      };
      const message = new Message(_.pick(messageData, fields));

      // Veo en que pagina va el mensaje, sino hay lugar en la ultima,
      //  creo otra.
      let page = channel.pages[channel.pages.length - 1];
      if (!page || isFull(page)) {
        page = new Page({number: channel.pages.length, messages: [message]});
        channel.pages.push(page._id);
      } else {
        page.messages.push(message);
      }

      if (!finishedCreationTransaction(channel, page, message)) {
        return response.status(500).send('Transaction could not be completed');
      }

      const sender = await User.findById(request.user._id); // Distinta

      await sendMessageToTopic(sender, workspace, channel, message);
      const resObj = {
        message: _.pick(message, ['_id', 'text', 'dateTime',
          'creator', 'type']),
        name: sender.name,
        photoUrl: sender.photoUrl // Distinta
      };
      await mentionsHandler.handleMentions(workspace, channel, message, sender);
      return response.status(200).send(resObj);
    });

async function finishedCreationTransaction(channel, page, message) {
  transaction = new Transaction();
  transaction.update(Channel.modelName, channel._id, channel);
  transaction.insert(Message.modelName, message);
  transaction.insert(Page.modelName, page);
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

async function sendMessageToTopic(sender, workspace, channel, message) {
  const topic = `${channel._id}`;

  const fbMessage = {
    data: {
      msgId: message._id.toString(),
      msg: message.text,
      msgType: message.type,
      createdAt: message.dateTime.toISOString(),
      workspace: workspace.name,
      channel: channel.name,
      sender_id: sender._id.toString(),
      sender_photoUrl: sender.photoUrl || '',
      sender_name: sender.name,
      sender_email: sender.email || '',
      sender_nickname: sender.nickname || ''
    },
    topic: topic
  };
  await firebase.sendMessageToTopic(fbMessage);
}

module.exports = router;
