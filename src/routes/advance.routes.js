const express = require('express');
const { advanceController } = require('../controllers');

const advanceRoutes = express.Router({});

advanceRoutes.post('/:senid', advanceController.requestAdvance);
advanceRoutes.put('/', advanceController.revertAdvances);

module.exports = advanceRoutes;
