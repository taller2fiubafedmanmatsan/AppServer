const {User} = require('../models/user');
const botHelper = require('./bot_helper');
const {Bot} = require('../models/bot');
const firebaseHelper = require('./firebase_helper');

async function handleUserMention(workspace, channel, user) {
  const wsUsers = workspace.users;
  const chUsers = channel.users;
  if (!wsUsers.some((wsUser) => {return wsUser.nickname == user.nickname;})) {
    return;
  }

  if (!chUsers.some((chUser) => {return chUser.nickname == user.nickname;})) {
    const topic = `${channel._id}`;
    channel.users.push(user);
    await firebaseHelper.subscribeToTopic(user, topic);
    user.topics.push(topic);
    await botHelper.sendWelcomeMessage(workspace, channel, [user]);
  }
};


async function handleMentions(workspace, channel, message, sender) {
  if (!message.text.includes('@')) return;
  const name = message.text.split('@')[1].split(' ')[0];

  let user = await User.findOne({nickname: name});
  if (user) {
    await handleUserMention(workspace, channel, user);
  }
  user = await Bot.findOne({name: name});
  if (!user) return;
  if (user.url) {
    botHelper.sendRequest(workspace, channel, user, message, sender);
    return;
  }
};

exports.handleMentions = handleMentions;
