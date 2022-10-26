const { error, success } = require('../utils');
const { mqttService } = require('../services');

const publishMQTT = async (req, res, next) => {
  try {
    const data = await mqttService.publishMQTT();

    return success.handler({ status: data }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

const publishMQTTDaily = async (req, res, next) => {
  try {
    const data = await mqttService.publishMQTTDaily();

    return success.handler({ status: data }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

module.exports = {
  publishMQTT,
  publishMQTTDaily,
};
