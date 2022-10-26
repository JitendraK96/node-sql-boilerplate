const Sequelize = require('sequelize');
const {
  powerStatus,
  waterStatus,
  cron,
} = require('../models');
const config = require('../config');

const sequelize = new Sequelize(config.MYSQL_DB_NAME, config.MYSQL_USERNAME, config.MYSQL_PASSWORD, {
  host: config.MYSQL_HOST,
  port: config.MYSQL_PORT,
  dialect: 'mysql',
  logging: false,
  dialectOptions: {
    charset: 'utf8mb4',
  },
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
});

const PowerStatusModel = powerStatus(sequelize, Sequelize);
const WaterStatusModel = waterStatus(sequelize, Sequelize);
const CronModel = cron(sequelize, Sequelize);

module.exports = {
  sequelize,
  PowerStatusModel,
  WaterStatusModel,
  CronModel,
};
