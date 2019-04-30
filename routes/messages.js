const Transaction = require('mongoose-transactions');
const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();
const auth = require('../middleware/auth');
const _ = require('lodash');
const {Workspace} = require('../models/workspace');
const {Channel} = require('../models/channel');
const {Page, isFull} = require('../models/page');
const {
  Message,
  validateMessage,
  validateMessageUpdate
} = require('../models/message');

// Integración con firebase
// PD: Es tremendamente inseguro esto pero bueno

const serviceAccount = require('../firebase_key_sdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://androidapp-bf64b.firebaseio.com'
});
// ---------------------------------------------

router.param('workspaceName', async (request, response, next, elementId) => {
  const workspace = await Workspace.findOne({name: elementId})
      .populate('channels', '-__v');
  if (!workspace) return response.status(404).send('Invalid workspace.');

  request.workspace = workspace;
  next();
});

router.param('channelName', async (request, response, next, channelName) => {
  const channel = await Channel.findOne({name: channelName})
      .populate('pages', '-__v')
      .populate('users', '-password -__v')
      .populate('creator', '-password -__v');

  if (!channel) return response.status(404).send('Invalid channel.');

  request.channel = channel;
  next();
});

// Enviar esto si es correcto el post de un mensaje
/*    var topic = 'channel-topic';

    var message = {
      data: {
        msg: 'Hola ameo'
      },
      topic: topic
    };

    // Send a message to devices subscribed to the provided topic.
    admin.messaging().send(message)
      .then((response) => {
        // Response is a message ID string.
        console.log('Successfully sent message:', response);
      })
      .catch((error) => {
        console.log('Error sending message:', error);
      });
*/
// Si funciona, necesito que implementen algo asi para los mensajes
/*
    var topic = :workspace_name + '-' + :channel_name

    var message = {
      data: {
        msg: message,
        createdAt: timestamp,
        sender: {
          name: userName,
          email: userEmail,
          nickname: userNickname,
          isAdmin: boolean
        }
      },
      topic: topic
    };
*/

router.post('/workspace/:workspaceName/channel/:channelName', auth,
    async (request, response) => {
      const fields = ['creator', 'text'];
      const {error} = validateMessage(_.pick(request.body, fields));
      if (error) return response.status(400).send(error.details[0].message);

      const channel = request.channel;
      if (!request.channel.users.some((user) => user._id == request.user._id)) {
        return response.status(403)
            .send(`The user doesn't belong to the channel`);
      }
      const messageData = {
        text: request.body.text,
        creator: request.user._id
      };
      const message = new Message(_.pick(messageData, fields));

      // Veo en que pagina va el mensaje, sino hay lugar en la ultima,
      //  creo otra.
      let page = channel.pages[channel.pages.length - 1];
      if (!page || isFull(page)) {
        page = new Page({number: channel.pages.length, messages: [message]});
        channel.pages.push(page._id);
      } else {
        // page = await Page.findById(page._id);
        page.messages.push(message);
      }

      if (!finishedCreationTransaction(channel, page, message)) {
        return response.status(500).send('Transaction could not be completed');
      }

      const topic = `${request.workspace.name}-${channel.name}`;
      const sender = await User.findById(request.user._id);
      const fbMessage = {
        data: {
          msg: message.text,
          createdAt: message.dateTime,
          sender: {
            name: sender.name,
            email: sender.email,
            nickname: sender.nickname,
            isAdmin: sender.isAdmin
          }
        },
        topic: topic
      };

      admin.messaging().send(fbMessage)
          .then((response) => {
            console.log('Successfully sent message:', response);
          })
          .catch((error) => {
            console.log('Error sending message:', error);
          });

      return response.status(200).send(
          _.pick(message, ['_id', 'text', 'dateTime', 'creator']));
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
  if (page.messages.length == 1) {
    transaction.insert(Page.modelName, page);
  } else {
    transaction.update(Page.modelName, page._id, page);
  }

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
