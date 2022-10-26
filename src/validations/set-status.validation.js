const Joi = require('joi');

module.exports = Joi.string().valid('on', 'off').required().label('value');
