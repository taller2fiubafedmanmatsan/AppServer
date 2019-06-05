const {User} = require('../models/user');
const botHelper = require('./bot_helper');


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
    botHelper.sendRequest(hostname, path, body);
  }
};

exports.handleMentions = handleMentions;
