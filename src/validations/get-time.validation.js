const Joi = require('joi');

module.exports = Joi.date().allow('none').default(null).label('Time');
