const {User} = require('../models/user');
const botHelper = require('./bot_helper');

async function handleMentions(workspace, channel, message, sender) {
  const atPos = message.text.indexOf('@');
  if (atPos < 0) return;
  const spacePos = message.text.indexOf(' ', atPos);
  const name = message.text.substr(atPos + 1, spacePos - atPos - 1);
  const user = await User.findOne({name: name});
  if (!user) return;
  if (user.url) { // El usuario es un bot si la url esta seteada
    botHelper.sendRequest(workspace, channel, user, message, sender);
  }
};

exports.handleMentions = handleMentions;
