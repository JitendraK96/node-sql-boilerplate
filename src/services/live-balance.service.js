/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
const { parseStringPromise } = require('xml2js');
const moment = require('moment');
const axios = require('axios').default;
const _ = require('lodash');
/* eslint-disable no-await-in-loop */
const { docClient } = require('../managers');
const { AWS_DYNAMODB_TABLE, LEDGER } = require('../config');
const { LEDGER_BALANCE, LEDGER_DIFFERENCE, LEDGER_TF } = require('../consts');

const getLiveBalances = async () => {
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    FilterExpression: 'begins_with (SENID, :initial)',
    ExpressionAttributeValues: {
      ':initial': 'GC_A_LB_',
    },
  };

  let allData = [];
  do {
    // eslint-disable-next-line no-await-in-loop
    const response = await docClient.scan(params).promise();
    allData = allData.concat(response.Items);

    // Checking if more data is there
    params.ExclusiveStartKey = response.LastEvaluatedKey ? response.LastEvaluatedKey : null;
  } while (params.ExclusiveStartKey);

  const group = _.groupBy(allData, 'SENID');

  const finalData = [];
  for (const key in group) {
    const orderedArray = _.orderBy(group[key], 'DTM', 'desc');
    finalData.push({
      SENID: key,
      VALUE: orderedArray[0].VALUE,
    });
  }

  return finalData;
};

const getLatestBalance = async ({ id }) => {
  const senid = `${LEDGER_BALANCE}${id}`;
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid',
    ExpressionAttributeValues: {
      ':senid': senid,
    },
    ScanIndexForward: false,
    Limit: 1,
  };

  const { Items } = await docClient.query(params).promise();
  return Items[0] ? Items[0].VALUE : 0;
};

const addLedgerDifference = async ({ id, DTM, VALUE }) => {
  const item = {
    SENID: `${LEDGER_DIFFERENCE}${id}`,
    DTM,
    MsgType: 'AVG',
    VALUE,
  };

  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    Item: item,
  };

  await docClient.put(params).promise();
  return item;
};

const addLedgerTF = async ({ id, DTM, VALUE }) => {
  const item = {
    SENID: `${LEDGER_TF}${id}`,
    DTM,
    MsgType: 'AVG',
    VALUE,
  };

  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    Item: item,
  };

  await docClient.put(params).promise();
  console.log('TF hit for', id);
  return item;
};

const addLedgerTB = async ({ id, DTM, VALUE }) => {
  const item = {
    SENID: `${LEDGER_BALANCE}${id}`,
    DTM,
    MsgType: 'AVG',
    VALUE,
  };

  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    Item: item,
  };

  await docClient.put(params).promise();
  return item;
};

const updateLiveBalance = async () => {
  const { data } = await axios.get(LEDGER);
  const xmlJson = await parseStringPromise(data);
  const entities = xmlJson.xml.entity;
  for (let i = 0; i < entities.length; i += 1) {
    const transactionExist = !(entities[i].result.length >= 2);
    if (transactionExist) {
      const id = entities[i].owner[0].split(';')[0].trim().replace(/[ GC]/g, '');
      const previoudBalance = await getLatestBalance({ id });
      const newBalance = Math.abs(Number(entities[i].balance[0]));
      let balanceDifference = Math.abs(previoudBalance - newBalance);
      const dtm = moment().add(2, 'hours').toISOString();
      if (balanceDifference > 0) {
        balanceDifference /= 100000;
        balanceDifference = balanceDifference.toFixed(2);
        await addLedgerTB({ id, VALUE: newBalance, DTM: dtm });
        await addLedgerDifference({ id, DTM: dtm, VALUE: balanceDifference });
        setTimeout(() => {
          let tfValue = balanceDifference * (3 / 100);
          tfValue = tfValue.toFixed(2);
          const newDtm = moment().add(2, 'hours').toISOString();
          addLedgerTF({ id, DTM: newDtm, VALUE: tfValue });
        }, 180000);
      }
    }
  }
  return entities;
};

const getLatestBalanceById = async ({ id, flatsCount, i }) => {
  if (i >= flatsCount) return 0;
  const senid = `${id}`;
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid',
    ExpressionAttributeValues: {
      ':senid': senid,
    },
    ScanIndexForward: false,
    Limit: 1,
  };

  const { Items } = await docClient.query(params).promise();
  return Items[0] ? Number(Items[0].VALUE).toFixed(2) : 0;
};

module.exports = {
  getLiveBalances,
  updateLiveBalance,
  getLatestBalanceById,
};
