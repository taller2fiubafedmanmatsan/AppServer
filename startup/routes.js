const express = require('express');
const users = require('../routes/users');
const messages = require('../routes/messages');
const workspaces = require('../routes/workspaces');
const channels = require('../routes/channels');
const rootFile = require('../routes/root');
const auth = require('../routes/auth');
const error = require('../middleware/error');
const swaggerUi = require('swagger-ui-express');
const oauth = require('../routes/oauth');
const read = require('read-yaml');
const swaggerDocument = read.sync('./swagger.yaml');
const cors = require('cors');

module.exports = function(app) {
  app.use(express.json());
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.use('/', rootFile);
  app.use('/api/users', users);
  app.use('/api/auth', auth);
  app.use('/api/oauth', oauth);
  app.use('/api/messages', messages);
  app.use('/api/workspaces', workspaces);
  app.use('/api/channels', channels);
  app.use(error);
  app.use(cors);
};
