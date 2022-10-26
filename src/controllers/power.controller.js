const _ = require('lodash');
const { error, success } = require('../utils');
const {
  getId,
  setStatusValidation,
  getConsumptionValidation,
  getStringIdValidation,
} = require('../validations');
const { powerService, summaryService } = require('../services');

const getStatus = async (req, res, next) => {
  try {
    const { senid } = req.params;

    await getId.validateAsync(senid);

    const status = await powerService.getStatus({ senid });

    return success.handler({ status }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

const setStatus = async (req, res, next) => {
  try {
    const { senid } = req.params;
    const { value } = req.body;

    await getId.validateAsync(senid);
    await setStatusValidation.validateAsync(value);

    const latestBalance = await summaryService.getList({
      senid,
      initials: 'GC_A_LB_',
    });

    const liveBalanceLast = _.round(_.get(_.last(latestBalance), 'VALUE'), 2);

    if (liveBalanceLast < 0 && value === 'on') return error.throwPreconditionFailed({ message: 'Cannot set power on as live balance is 0' });

    const status = await powerService.setStatus({ senid, value });

    return success.handler({ status }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

const updateData = async (req, res, next) => {
  try {
    const result = await powerService.updatePowerUsage();

    return success.handler({ status: result }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

const getConsumption = async (req, res, next) => {
  try {
    let { senid } = req.params;
    const { frame } = req.query;

    senid = await getStringIdValidation.validateAsync(senid);
    await getConsumptionValidation.validateAsync(frame);

    const {
      totalConsumption,
      totalCost,
    } = await powerService.getConsumption({ senid, frame });

    return success.handler({ consumption: totalConsumption, cost: totalCost }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

const updateLiveBalance = async (req, res, next) => {
  try {
    const status = await powerService.updateLiveBalance();

    return success.handler({ status }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

const addPCOncePerDay = async (req, res, next) => {
  try {
    await powerService.addPCOncePerDay();

    return success.handler({ status: true }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

module.exports = {
  getStatus,
  setStatus,
  updateData,
  getConsumption,
  updateLiveBalance,
  addPCOncePerDay,
};
