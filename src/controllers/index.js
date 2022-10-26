const summaryController = require('./summary.controller');
const powerController = require('./power.controller');
const waterController = require('./water.controller');
const liveBalanceController = require('./live-balance.controller');
const cronController = require('./cron.controller');
const mqttController = require('./mqtt.controller');
const advanceController = require('./advance.controller');
const adminController = require('./admin.controller');

module.exports = {
  summaryController,
  powerController,
  waterController,
  liveBalanceController,
  cronController,
  mqttController,
  advanceController,
  adminController,
};
