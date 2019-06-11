const {User} = require('../models/user');
const botHelper = require('./bot_helper');

async function handleMentions(workspace, channel, message, sender) {
  if (!message.text.includes('@')) return;
  const name = message.text.split('@')[1].split(' ')[0];
  const user = await User.findOne({name: name});
  if (!user) return;
  if (user.url) { // El usuario es un bot si la url esta seteada
    botHelper.sendRequest(workspace, channel, user, message, sender);
  }
};

exports.handleMentions = handleMentions;
