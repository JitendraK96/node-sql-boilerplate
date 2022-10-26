require('dotenv').config();

const config = {
  APP_HOST: process.env.APP_HOST || '0.0.0.0',
  APP_PORT: process.env.APP_PORT || '8081',
  AWS_REGION: process.env.AWS_REGION,
  AWS_COGNITO_USER_POOL_ID: process.env.AWS_COGNITO_USER_POOL_ID,
  AWS_DYNAMODB_TABLE: process.env.AWS_DYNAMODB_TABLE,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_KEY_ID: process.env.AWS_SECRET_KEY_ID,
  MYSQL_HOST: process.env.MYSQL_HOST || '0.0.0.0',
  MYSQL_USERNAME: process.env.MYSQL_USERNAME || 'root',
  MYSQL_PASSWORD: process.env.MYSQL_PASSWORD || 'root',
  MYSQL_DB_NAME: process.env.MYSQL_DB_NAME || 'grandcentral',
  MYSQL_PORT: process.env.MYSQL_PORT || 3306,
  EDGE_COMPUTER: process.env.EDGE_COMPUTER,
  LEDGER: process.env.LEDGER,
  MQTT_URL: process.env.MQTT_URL,
  MQTT_TOPIC: process.env.MQTT_TOPIC,
};

module.exports = config;
