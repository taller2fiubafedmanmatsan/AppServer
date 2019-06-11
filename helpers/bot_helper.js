const {User} = require('../models/user');
const {Message} = require('../models/message');
const http = require('http');

function parseUrl(url) {
  return url.split('//')[1].split('/')[0];
};

function parsePath(url) {
  const domainAndPath = url.split('//')[1];
  return domainAndPath.slice(domainAndPath.indexOf('/'));
};

function parseBotCommand(message, botName) {
  return message.split(botName + ' ')[1];
}


async function addTitoTo(users) {
  const tito = await User.findOne({name: 'Tito'});
  if (tito) users.push(tito);
  return users;
}


function sendRequest(workspace, channel, user, message, sender) {
  const hostname = parseUrl(user.url);
  const botCommand = parseBotCommand(message.text, user.name);
  const body = JSON.stringify({
    sender: sender.email,
    message: botCommand,
    channel: channel.name,
    workspace: workspace.name
  });
  const path = parsePath(user.url);
  const request = new http.ClientRequest({
    hostname: hostname,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  });
  request.end(body);
  request.on('response', (res) => {
    res.on('data', (body) => {
      console.log(body.toString());
    });
  });
}

async function sendWelcomeMessage(workspace, channel, users) {
  const tito = await User.findOne({name: 'Tito'});
  users.forEach((user) => {
    const messageData = {
      text: '@Tito welcome',
      creator: user._id,
      type: '2'
    };
    const message = new Message(messageData);
    sendRequest(workspace, channel, tito, message, user);
  });
}

exports.sendWelcomeMessage = sendWelcomeMessage;
exports.addTitoTo = addTitoTo;
exports.sendRequest = sendRequest;
exports.parseUrl = parseUrl;
exports.parsePath = parsePath;
exports.parseBotCommand = parseBotCommand;
