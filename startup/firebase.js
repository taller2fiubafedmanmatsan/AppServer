// Integración con firebase
// PD: Es tremendamente inseguro esto pero bueno
const admin = require('firebase-admin');
const serviceAccount = require('../firebase_key_sdk.json');

module.exports = function() {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://androidapp-bf64b.firebaseio.com'
  });
};
