const winston = require('winston');

module.exports = function(error, request, response, next) {
  winston.error(error.message, error);
  response.status(500).send('Something failed.');
};
