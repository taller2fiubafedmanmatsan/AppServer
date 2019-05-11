// Integración con firebase
const admin = require('firebase-admin');
const winston = require('winston');
const config = require('config');

function setFirebaseKey() {
  const firebaseKey = {
    type: `${config.get('fireb_type')}`,
    project_id: `${config.get('fireb_project_id')}`,
    private_key_id: `${config.get('fireb_private_key_id')}`,
    private_key: `${config.get('fireb_private_key')}`,
    client_email: `${config.get('fireb_client_email')}`,
    client_id: `${config.get('fireb_client_id')}`,
    auth_uri: `${config.get('fireb_auth_uri')}`,
    token_uri: `${config.get('fireb_token_uri')}`,
    auth_provider_x509_cert_url: `${config.get('fireb_auth_provider')}`,
    client_x509_cert_url: `${config.get('fireb_client_url')}`
  };

  return firebaseKey;
};

module.exports = function() {
  if (process.env.NODE_ENV != 'test') {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(setFirebaseKey()),
        databaseURL: config.get('firebase_database')
      });
    } catch (e) {
      error = `Or there was an error while initializing. ${e}`;
      winston.error(`FATAL: Firebase config is missing. ${error}`);
      process.exit(1);
    }
  }
};
