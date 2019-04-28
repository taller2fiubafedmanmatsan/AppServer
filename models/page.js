const mongoose = require('mongoose');
const Joi = require('joi');
const messageSchema = require('./message');
Joi.objectId = require('joi-objectid')(Joi);

const pageSchema = mongoose.Schema({
  messages: [messageSchema],
  number: {type: Number, max: 50, require: true}
});

const Page = mongoose.model('Page', pageSchema);

function validatePage(page) {
  const schema = {
    messages: Joi.array().items(Joi.objectId()).required(),
    number: Joi.number().max(50).required()
  };
  return Joi.validate(page, schema);
};

exports.Page = Page;
exports.validatePage = validatePage;
