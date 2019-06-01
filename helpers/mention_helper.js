const http = require('http');
const {User} = require('../models/user');

module.exports.handleMentions =
  async function(workspace, channel, message, sender) {
    const atPos = message.text.indexOf('@');
    if (atPos < 0) return;
    const spacePos = message.text.indexOf(' ', atPos);
    const name = message.text.substr(atPos + 1, spacePos - atPos);
    console.log(name);
    const user = User.findOne({name: name});

    if (!user) return;

    if (user.url) { // El usuario es un bot si la url esta seteada
      const body = {
        sender: sender.name,
        message: message.text,
        channel: channel.name,
        workspace: workspace.name
      };
      http.request(bot.url, body);
    }
  };
