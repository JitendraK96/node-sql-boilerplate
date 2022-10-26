const { error, success } = require('../utils');
const { cronService } = require('../services');
const { cronValidation } = require('../validations');

const setCron = async (req, res, next) => {
  try {
    const {
      name,
      status,
    } = req.query;
    await cronValidation.validateAsync(req.query);

    const cronDetails = await cronService.checkIfCronExists({ name });

    if (!cronDetails) {
      await cronService.createCron({ name, status });
    } else {
      cronService.updateCron({ status, name });
    }

    return success.handler({ cron: status }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

module.exports = {
  setCron,
};
