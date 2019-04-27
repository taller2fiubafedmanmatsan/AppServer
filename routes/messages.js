const Transaction = require('mongoose-transactions');
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const _ = require('lodash');
const {Channel} = require('../models/channel');
const {Page, isFull} = require('../models/page');
const {
  Message,
  validateMessage,
  validateMessageUpdate
} = require('../models/message');

router.post('/', auth, async (request, response) => {
  const fields = ['text'];
  const {error} = validateMessage(_.pick(request.body, fields));
  if (error) return response.status(400).send(error.details[0].message);

  const {channelId} = request.body;

  const channel = await Channel.findById(channelId).populate('pages');

  if (!channel) return response.status(404).send('Invalid channel.');

  if (!channel.users.some((userId) => userId == request.user._id)) {
    return response.status(403).send(`The user doesn't belong to the channel`);
  }

  const message = new Message(_.pick(request.body, fields));
  message.user = request.user._id;
  // Veo en que pagina va el mensaje, sino hay lugar en la ultima, creo otra.
  let page = channel.pages[channel.pages.length - 1];
  if (!page || isFull(page)) {
    page = new Page({number: channel.pages.length});
    channel.pages.push(page._id);
  }
  page.messages.push(message);
  if (!finishedCreationTransaction(channel, page, message)) {
    return response.status(500).send('Transaction could not be completed');
  }
  return response.status(200).send(
      _.pick(message, ['_id', 'text', 'dateTime', 'user']));
});


router.patch('/', auth, async (request, response) => {
  const fields = [{user: request.user._id}, 'text'];
  const {error} = validateMessageUpdate(_.pick(request.body, fields));
  if (error) return response.status(400).send(error.details[0].message);

  const {messageId} = request.body;
  let message = await Message.findById(messageId);

  if (!message) return response.status(404).send('Message not found');

  if (request.user._id != message.user) {
    return response.status(403).send('You are not allowed to modify'+
                                      ' this message');
  }
  message = await Message.findByIdAndUpdate(messageId,
      _.pick(request.body,
          [
            'text'
          ]
      ), {new: true});

  return response.status(200).send(
      _.pick(message, ['_id', 'text', 'dateTime', 'user']));
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

module.exports = router;
