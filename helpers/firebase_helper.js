const admin = require('firebase-admin');

module.exports.subscribeToTopic = async function(user, topic) {
  fbResponse = await admin.messaging()
      .subscribeToTopic(user.fireBaseToken, topic);
  console.log('Successfully subscribed to topic:', fbResponse);
};

module.exports.sendMessageToTopic = async function(payload) {
  const fbResponse = await admin.messaging().send(payload);
  console.log('Successfully sent message:', fbResponse);
};

module.exports.unsubscribeFromTopic = async function(user, topic) {
  fbResponse = await admin.messaging()
      .unsubscribeFromTopic(user.fireBaseToken, topic);
  console.log('Successfully unsuscribed from topic:', fbResponse);
};
