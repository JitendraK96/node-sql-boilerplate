const express = require('express');
const { waterController } = require('../controllers');

const waterRoutes = express.Router({});

waterRoutes.get('/:senid/status', waterController.getStatus);
waterRoutes.post('/:senid/status', waterController.setStatus);
waterRoutes.put('/update', waterController.updateData);
waterRoutes.get('/:senid/consumptions', waterController.getConsumption);

module.exports = waterRoutes;
