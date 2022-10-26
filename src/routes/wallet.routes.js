const express = require('express');
const { liveBalanceController } = require('../controllers');

const liveBalanceRoutes = express.Router({});

liveBalanceRoutes.put('/update', liveBalanceController.updateLiveBalance);

module.exports = liveBalanceRoutes;
