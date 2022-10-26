const moment = require('moment');
const { error, success } = require('../utils');
const {
  getId, reqAdvanceValidation,
} = require('../validations');
const { advanceService, liveBalanceService } = require('../services');

const requestAdvance = async (req, res, next) => {
  try {
    const { senid } = req.params;

    const { amount } = await reqAdvanceValidation.validateAsync(req.body);
    await getId.validateAsync(senid);

    const dtm = moment().add(2, 'hours').toISOString();

    const [value, canRequest] = await Promise.all([
      liveBalanceService.getLatestBalanceById({ id: `GC_A_LB_${senid}` }),
      advanceService.canAdvanceBeRequested({ senid, dtm }),
    ]);

    if (!canRequest) return error.throwPreconditionFailed({ message: 'Advance already request in past 24 hours' });
    if (Number(value) <= -90) return error.throwPreconditionFailed({ message: 'Not enough live balance to request advance' });

    const advance = await advanceService.addAdvance({
      senid, DTM: dtm, VALUE: amount, IsRead: false,
    });
    await advanceService.addLB({ senid, DTM: dtm, VALUE: (Number(value) + Number(amount)) });

    return success.handler({ advance }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

const revertAdvances = async (req, res, next) => {
  try {
    const status = await advanceService.revertAdvances();
    return success.handler({ status }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

module.exports = {
  requestAdvance,
  revertAdvances,
};
