const Joi = require('joi');

module.exports = Joi.object().keys({
  name: Joi.string().valid('water', 'power', 'wallet').required().label('name'),
  status: Joi.string().valid('on', 'off').required().label('status'),
}).required();
