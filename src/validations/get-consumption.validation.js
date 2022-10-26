const Joi = require('joi');

module.exports = Joi.string().valid('daily', 'weekly', 'monthly').required().label('frame');
