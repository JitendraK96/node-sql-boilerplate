const Joi = require('joi');

module.exports = Joi.object().keys({
  amount: Joi.number().greater(0).required()
    .label('Amount'),
  flat_id: Joi.number().positive().required().label('Flat Id'),
  type: Joi.string().valid('deposit', 'withdraw').required().label('Type'),
}).required().label('Body');
