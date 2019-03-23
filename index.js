const express = require('express');
const app = express();

require('./startup/routes')(app);
require('./startup/db')();

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});

module.exports = server;
