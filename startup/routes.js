const express = require('express');
const users = require('../routes/users');
const messages = require('../routes/messages');
const rootFile = require('../routes/root');
const auth = require('../routes/auth');
const workspaces = require('../routes/workspaces');
const error = require('../middleware/error');
const swaggerUi = require('swagger-ui-express');
const read = require('read-yaml');
const swaggerDocument = read.sync('./swagger.yaml');

module.exports = function(app) {
  app.use(express.json());
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.use('/', rootFile);
  app.use('/api/users', users);
  app.use('/api/auth', auth);
  app.use('/api/workspaces/channels/messages', messages);
  app.use('/api/workspaces', workspaces);
  app.use(error);
};
