const express = require('express');
const users = require('../routes/users');
const rootFile = require('../routes/root');

module.exports = function(app) {
  app.use(express.json());
  app.use('/', rootFile);
  app.use('/api/users', users);
};
