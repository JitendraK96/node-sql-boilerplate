const moment = require('moment');
const { error, success, cognitoUtils } = require('../utils');
const {
  postDepositValidation, getId, setStatusValidation,
} = require('../validations');
const { adminService, mqttService } = require('../services');

const postDeposits = async (req, res, next) => {
  try {
    const {
      amount, flat_id, type,
    } = await postDepositValidation.validateAsync(req.body);

    const deposit = await adminService.postDeposits({
      VALUE: type === 'deposit' ? amount : -amount,
      flat_id,
      DTM: moment().add(2, 'hours').toISOString(),
    });

    return success.handler({ deposit }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

const getFlatList = async (req, res, next) => {
  try {
    const flat_ids = await cognitoUtils.getAllCognitoFlatIds();

    return success.handler({ flat_ids }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

const getPowerMeterStatus = async (req, res, next) => {
  try {
    const flat_ids = await cognitoUtils.getAllCognitoFlatIds();
    const status = await adminService.getPowerMeterStatus({ flat_ids });

    return success.handler({ status }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

const postMQTT = async (req, res, next) => {
  try {
    let { senid } = req.params;
    let { status } = req.query;

    senid = await getId.validateAsync(senid);
    status = await setStatusValidation.validateAsync(status);

    await mqttService.publishMessage({ message: `GC${senid}_${status.toUpperCase()}` });

    return success.handler({ status }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

module.exports = {
  postDeposits,
  getFlatList,
  getPowerMeterStatus,
  postMQTT,
};
