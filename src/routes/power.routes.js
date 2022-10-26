const express = require('express');
const { powerController } = require('../controllers');

const powerRoutes = express.Router({});

powerRoutes.get('/:senid/status', powerController.getStatus);
powerRoutes.post('/:senid/status', powerController.setStatus);
powerRoutes.put('/update', powerController.updateData);
powerRoutes.get('/:senid/consumptions', powerController.getConsumption);
powerRoutes.put('/update-balance', powerController.updateLiveBalance);
powerRoutes.put('/update-pc-once', powerController.addPCOncePerDay);

module.exports = powerRoutes;
