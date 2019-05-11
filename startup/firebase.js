// Integración con firebase
// PD: Es tremendamente inseguro esto pero bueno
const admin = require('firebase-admin');
const config = require('config');

module.exports = function() {
  console.log('hello');
  if (process.env.NODE_ENV != 'test') {
    console.log('empiezo a buscar firebase');
    const firebasKey = JSON.parse(config.get('firebase_key'));
    console.log(firebaseKey);
    admin.initializeApp({
      credential: admin.credential.cert(firebasKey),
      databaseURL: config.get('firebase_database')
    });
  }
};
