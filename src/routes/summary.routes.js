const express = require('express');
const { summaryController } = require('../controllers');

const summaryRoutes = express.Router({});

summaryRoutes.get('/power-csv', summaryController.getPowerCSV);
summaryRoutes.get('/csv', summaryController.getCSV);
summaryRoutes.get('/:senid', summaryController.getList);
summaryRoutes.put('/update', summaryController.updatePowerCSV);

module.exports = summaryRoutes;
