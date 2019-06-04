const http = require('http');
const {User} = require('../models/user');


function parseUrl(url) {
  const protocol = 'https://';
  const urlEnd = url.indexOf('/', protocol.length);
  return url.substr(protocol.length, urlEnd - protocol.length);
};

function parsePath(url) {
  const protocol = 'https://';
  const path = url.substr(protocol.length);
  const slashPos = path.indexOf('/');
  return path.substr(slashPos);
};

function parseBotCommand(message, botName) {
  return message.substr(message.indexOf(botName) + 1 + botName.length);
}

function sendRequest(hostname, path, body) {
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
  console.log(body);
  request.on('response', (res) => {
    res.on('data', (body) => {
      console.log(body.toString());
    });
  });
}

async function handleMentions(workspace, channel, message, sender) {
  const atPos = message.text.indexOf('@');
  if (atPos < 0) return;
  const spacePos = message.text.indexOf(' ', atPos);
  const name = message.text.substr(atPos + 1, spacePos - atPos - 1);
  const user = await User.findOne({name: name});
  if (!user) return;
  if (user.url) { // El usuario es un bot si la url esta seteada
    const hostname = parseUrl(user.url);
    const botCommand = parseBotCommand(message.text, user.name);
    const body = JSON.stringify({
      sender: sender.email,
      message: botCommand,
      channel: channel.name,
      workspace: workspace.name
    });

    const path = parsePath(user.url);
    sendRequest(hostname, path, body);
  }
};

exports.handleMentions = handleMentions;
