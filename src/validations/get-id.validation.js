const Joi = require('joi');

module.exports = Joi.number().positive().required().label('Id');
