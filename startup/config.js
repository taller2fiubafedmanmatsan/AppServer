const config = require('config');

function errorMessage(variable) {
  return `FATAL ERROR: ${variable} is not defined.`;
};

module.exports = function() {
  if (!config.get('jwt_key')) throw new Error(errorMessage(jwt_key));

  if (!config.get('mail_service_pwd')) {
    throw new Error(errorMessage(mail_service_pwd));
  }

  if (!config.get('firebase-key')) {
    throw new Error(errorMessage(firebase_key));
  }

  if (!config.get('db')) throw new Error(errorMessage(db));
};
