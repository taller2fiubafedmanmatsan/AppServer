const admin = require('firebase-admin');

module.exports.subscribeToTopic = async function(user) {
  fbResponse = await admin.messaging()
      .subscribeToTopic(user.fireBaseToken, user.topics);
  console.log('Successfully subscribed to topic:', fbResponse);
};

module.exports.sendMessageToTopic = async function(payload) {
  const fbResponse = await admin.messaging().send(payload);
  console.log('Successfully sent message:', fbResponse);
};
