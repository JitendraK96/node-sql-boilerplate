const express = require('express');
const { adminController } = require('../controllers');

const adminRoutes = express.Router({});

adminRoutes.get('/flat-lists', adminController.getFlatList);
adminRoutes.get('/power-meters', adminController.getPowerMeterStatus);
adminRoutes.post('/mqtt/:senid', adminController.postMQTT);
adminRoutes.post('/deposits', adminController.postDeposits);

module.exports = adminRoutes;
