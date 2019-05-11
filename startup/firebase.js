// Integración con firebase
// PD: Es tremendamente inseguro esto pero bueno
const admin = require('firebase-admin');
const config = require('config');

function setFirebaseKey() {
  console.log(config.get('fireb_type'));
  console.log(config.get('fireb_project_id'));
  console.log(config.get('fireb_private_key_id'));
  console.log(config.get('fireb_private_key'));
  console.log(config.get('fireb_client_email'));
  console.log(config.get('fireb_client_id'));
  console.log(config.get('fireb_auth_uri'));
  console.log(config.get('fireb_token_uri'));
  console.log(config.get('fireb_auth_provider'));
  console.log(config.get('fireb_client_url'));
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
  console.log('hello');
  if (process.env.NODE_ENV != 'test') {
    console.log('empiezo a buscar firebase');
    const firebasKey = setFirebaseKey();
    console.log(firebasKey);
    admin.initializeApp({
      credential: admin.credential.cert(firebasKey),
      databaseURL: config.get('firebase_database')
    });
  }
};
