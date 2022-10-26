module.exports = (sequelize, Sequelize) => sequelize.define('water_status', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  senid: {
    type: Sequelize.STRING(255),
    allowNull: false,
  },
  value: {
    type: Sequelize.STRING(45),
    allowNull: false,
  },
});
