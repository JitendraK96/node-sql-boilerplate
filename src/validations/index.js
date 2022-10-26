const getId = require('./get-id.validation');
const getTime = require('./get-time.validation');
const setStatusValidation = require('./set-status.validation');
const getConsumptionValidation = require('./get-consumption.validation');
const getStringIdValidation = require('./get-string-id.validation');
const cronValidation = require('./cron.validation');
const reqAdvanceValidation = require('./req-advance.validation');
const postDepositValidation = require('./post-deposit.validation');

module.exports = {
  getId,
  getTime,
  setStatusValidation,
  getConsumptionValidation,
  getStringIdValidation,
  cronValidation,
  reqAdvanceValidation,
  postDepositValidation,
};
