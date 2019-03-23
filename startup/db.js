const mongoose = require('mongoose');
const dbLog = require('debug')('app:dbLog');
const config = require('config');

module.exports = function() {
  const db = config.get('db');
  mongoose.connect(db, {useNewUrlParser: true})
      .then(() => dbLog(`Connected to ${db}`))
      .catch((ex) => dbLog(`An error occured while connecting to ${db}.`, ex));
};
