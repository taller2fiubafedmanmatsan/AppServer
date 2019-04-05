const winston = require('winston');
require('express-async-errors');

module.exports = function() {
  process.on('unhandledRejection', (ex) => {
    throw ex; // exception now caught by winston
  });
  process.on('uncaughtException', (ex) => {
    winston.error(ex); // exception now caught by winston
  });

  winston.configure({
    transports: [
      new winston.transports.File({filename: 'errors.log'}),
      new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.prettyPrint(),
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.simple()
        )
      })
    ]
  });
};

