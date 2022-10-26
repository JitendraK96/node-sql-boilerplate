const Joi = require('joi');

module.exports = Joi.object().keys({
  amount: Joi.number().greater(0).less(100).required()
    .label('Advance'),
}).required().label('Body');
