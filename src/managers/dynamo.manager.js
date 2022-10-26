const AWS = require('aws-sdk');
const config = require('../config');

const awsConfig = {
  region: config.AWS_REGION,
  accessKeyId: config.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.AWS_SECRET_KEY_ID,
};

AWS.config.update(awsConfig);

const docClient = new AWS.DynamoDB.DocumentClient();
const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

module.exports = {
  docClient,
  cognitoIdentityServiceProvider,
};
