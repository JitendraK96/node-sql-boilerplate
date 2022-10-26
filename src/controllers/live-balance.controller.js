const { error, success } = require('../utils');
const { liveBalanceService } = require('../services');

const getLiveBalances = async (req, res, next) => {
  try {
    const live_balance = await liveBalanceService.getLiveBalances();

    return success.handler({ live_balance }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

const updateLiveBalance = async (req, res, next) => {
  try {
    const result = await liveBalanceService.updateLiveBalance();
    return success.handler({ result }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

module.exports = {
  getLiveBalances,
  updateLiveBalance,
};
