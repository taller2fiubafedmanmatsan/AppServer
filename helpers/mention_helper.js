const https = require('https');
const {User} = require('../models/user');


function parseUrl(url) {
  const protocol = 'https://';
  const urlEnd = url.indexOf('/', protocol.length);
  return url.substr(protocol.length, urlEnd - protocol.length);
};


module.exports.handleMentions =
  async function(workspace, channel, message, sender) {
    const atPos = message.text.indexOf('@');
    if (atPos < 0) return;
    const spacePos = message.text.indexOf(' ', atPos);
    const name = message.text.substr(atPos + 1, spacePos - atPos - 1);
    const user = await User.findOne({name: name});

    if (!user) return;

    if (user.url) { // El usuario es un bot si la url esta seteada
      const options = {
        hostname: parseUrl(user.url),
        method: 'POST',
        body: {
          sender: sender.name,
          message: message.text,
          channel: channel.name,
          workspace: workspace.name
        }
      };
      https.request(options);
    }
  };
