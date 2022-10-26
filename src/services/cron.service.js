const { sequelizeManager } = require('../managers');

const { CronModel } = sequelizeManager;

const createCron = async ({ name, status }) => CronModel.create({
  name,
  run_status: status === 'on' ? 1 : 0,
});

const checkIfCronExists = async ({ name }) => {
  const item = await CronModel.findOne({
    where: {
      name,
    },
  });

  return item;
};

const updateCron = async ({ status, name }) => CronModel.update({
  run_status: status === 'on' ? 1 : 0,
}, {
  where: {
    name,
  },
});

module.exports = {
  updateCron,
  checkIfCronExists,
  createCron,
};
