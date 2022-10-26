const express = require('express');
const { cronController } = require('../controllers');

const cronRoutes = express.Router({});

cronRoutes.post('/', cronController.setCron);

module.exports = cronRoutes;
