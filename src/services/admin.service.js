const { docClient } = require('../managers');
const { AWS_DYNAMODB_TABLE } = require('../config');
const {
  DEPOSIT, POWER_STATUS,
} = require('../consts');

const postDeposits = async ({ flat_id, DTM, VALUE }) => {
  const item = {
    SENID: `${DEPOSIT}${flat_id}`,
    DTM,
    MsgType: 'Deposit',
    VALUE,
  };

  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    Item: item,
  };

  await docClient.put(params).promise();
  return item;
};

const getLatestPowerStatus = async ({ id }) => {
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid',
    ExpressionAttributeValues: {
      ':senid': `${POWER_STATUS}${id}`,
    },
    ScanIndexForward: false,
    Limit: 1,
  };

  const { Items } = await docClient.query(params).promise();
  return Items[0] ? { SENID: id, VALUE: Items[0].VALUE } : { SENID: id, VALUE: 'OFF' };
};

const getPowerMeterStatus = async ({ flat_ids }) => {
  const promiseArray = [];
  for (let i = 0; i < flat_ids.length; i += 1) {
    promiseArray.push(getLatestPowerStatus({ id: flat_ids[i] }));
  }

  return Promise.all(promiseArray);
};

module.exports = {
  postDeposits,
  getPowerMeterStatus,
};
