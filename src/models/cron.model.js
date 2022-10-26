module.exports = (sequelize, Sequelize) => sequelize.define('crons', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: Sequelize.STRING(255),
    allowNull: false,
  },
  run_status: {
    type: Sequelize.TINYINT(1),
    allowNull: false,
  },
});
