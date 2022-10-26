const express = require('express');
const { liveBalanceController } = require('../controllers');

const liveBalanceRoutes = express.Router({});

liveBalanceRoutes.get('/', liveBalanceController.getLiveBalances);

module.exports = liveBalanceRoutes;
