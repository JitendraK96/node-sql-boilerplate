const express = require('express');
const { mqttController } = require('../controllers');

const mqttRoutes = express.Router({});

mqttRoutes.put('/', mqttController.publishMQTT);

mqttRoutes.put('/update', mqttController.publishMQTTDaily);

module.exports = mqttRoutes;
