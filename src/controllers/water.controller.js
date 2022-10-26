const _ = require('lodash');
const { error, success } = require('../utils');
const {
  getId,
  getConsumptionValidation,
  setStatusValidation,
  getStringIdValidation,
} = require('../validations');
const { waterService, summaryService } = require('../services');

const getStatus = async (req, res, next) => {
  try {
    const { senid } = req.params;

    await getId.validateAsync(senid);

    const status = await waterService.getStatus({ senid });

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
    if (liveBalanceLast < 0 && value === 'on') return error.throwPreconditionFailed({ message: 'Cannot set water on as live balance is 0' });

    const status = await waterService.setStatus({ senid, value });

    return success.handler({ status }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

const updateData = async (req, res, next) => {
  try {
    const data = await waterService.updateWaterUsage();

    return success.handler({ data }, req, res, next);
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
    } = await waterService.getConsumption({ senid, frame });

    return success.handler({ consumption: totalConsumption, cost: totalCost }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

module.exports = {
  getStatus,
  setStatus,
  updateData,
  getConsumption,
};
