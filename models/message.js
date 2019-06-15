const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const messageSchema = mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    require: true
  },
  text: {type: String, minlenght: 1, require: true},
  type: {type: String, minlenght: 1, require: true},
  dateTime: {type: Date, default: Date.now()}
});

const Message = mongoose.model('Message', messageSchema);

function validateMessage(message) {
  const schema = {
    creator: Joi.string().email(),
    text: Joi.string().min(1).required(),
    type: Joi.string().min(1).required()
  };
  return Joi.validate(message, schema);
};

exports.Message = Message;
exports.validateMessage = validateMessage;
exports.messageSchema = messageSchema;
