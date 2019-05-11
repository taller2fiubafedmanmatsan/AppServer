// Integración con firebase
// PD: Es tremendamente inseguro esto pero bueno
const admin = require('firebase-admin');
const config = require('config');

module.exports = function() {
  if (process.env.NODE_ENV != 'test') {
    const firebasKey = JSON.parse(config.get('firebase-key'));
    console.log(firebasKey);
    admin.initializeApp({
      credential: admin.credential.cert(firebasKey),
      databaseURL: config.get('firebase-database')
    });
  }
};
