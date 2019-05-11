// Integración con firebase
// PD: Es tremendamente inseguro esto pero bueno
const admin = require('firebase-admin');
const config = require('config');

module.exports = function() {
  if (process.env.NODE_ENV != 'test') {
    admin.initializeApp({
      credential: admin.credential.cert(config.get('firebase-key')),
      databaseURL: config.get('firebase-database')
    });
  }
};
