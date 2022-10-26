const { docClient, cognitoIdentityServiceProvider } = require('./dynamo.manager');
const sequelizeManager = require('./sequelize.manager');
const { client } = require('./mqtt.manager');

module.exports = {
  docClient,
  sequelizeManager,
  cognitoIdentityServiceProvider,
  client,
};
