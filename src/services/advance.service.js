/* eslint-disable no-await-in-loop */
/* eslint-disable no-prototype-builtins */
const moment = require('moment');
const { docClient } = require('../managers');
const { AWS_DYNAMODB_TABLE } = require('../config');
const {
  ADVANCE, LATEST_BALANCE,
} = require('../consts');

const { cognitoUtils } = require('../utils');

const canAdvanceBeRequested = async ({ senid }) => {
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid',
    ExpressionAttributeValues: {
      ':senid': `${ADVANCE}${senid}`,
    },
    ScanIndexForward: false,
    Limit: 1,
  };

  const { Items } = await docClient.query(params).promise();
  if (Items[0]) {
    if (Items[0].VALUE > 0) {
      return false;
    }
  }
  return true;
};

const addLB = async ({ senid, DTM, VALUE }) => {
  const item = {
    SENID: `${LATEST_BALANCE}${senid}`,
    DTM,
    MsgType: 'Advance Live Balance',
    VALUE,
  };

  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    Item: item,
  };

  await docClient.put(params).promise();
  return item;
};

const addAdvance = async ({
  senid, DTM, VALUE, IsRead,
}) => {
  const item = {
    SENID: `${ADVANCE}${senid}`,
    DTM,
    MsgType: 'AVG',
    VALUE,
    IsRead,
  };

  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    Item: item,
  };

  await docClient.put(params).promise();
  return item;
};

const getLatestReference = async ({ senid }) => {
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid',
    ExpressionAttributeValues: {
      ':senid': `${senid}`,
    },
    ScanIndexForward: false,
    Limit: 1,
  };

  const { Items } = await docClient.query(params).promise();
  return Items[0] ? Items[0] : {};
};

// const updateAdvanceRead = async ({ senid, dtm }) => {
//   const params = {
//     TableName: AWS_DYNAMODB_TABLE,
//     Key: {
//       SENID: senid,
//       DTM: dtm,
//     },
//     UpdateExpression: 'set IsRead = :read',
//     ExpressionAttributeValues: {
//       ':read': 'true',
//     },
//     ReturnValues: 'UPDATED_NEW',
//   };

//   return docClient.update(params).promise();
// };

const getLatestBalanceById = async ({ id }) => {
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

const revertAdvances = async () => {
  const flatIds = await cognitoUtils.getAllCognitoFlatIds();
  const advanceRequestArray = [];
  const updateAdvanceRequestRead = [];
  const revertAdvanceValue = [];
  const revertLiveBalance = [];
  for (let i = 0; i < flatIds.length; i += 1) {
    advanceRequestArray.push(getLatestReference({ senid: `${ADVANCE}${flatIds[i]}` }));
  }

  const advanceRequestDetails = await Promise.all(advanceRequestArray);

  const dtm = moment().add(2, 'hours').toISOString();
  for (let j = 0; j < flatIds.length; j += 1) {
    if (advanceRequestDetails[j] && advanceRequestDetails[j].hasOwnProperty('VALUE') && !advanceRequestDetails[j].IsRead) {
      const duration = moment(dtm).diff(moment(advanceRequestDetails[j].DTM), 'hours');
      if (duration > 48) {
        console.log(advanceRequestDetails[j].VALUE, 'VSLUE');
        // updateAdvanceRequestRead.push(updateAdvanceRead({ senid: `${ADVANCE}${flatIds[j]}`, dtm: advanceRequestDetails[j].DTM }));
        revertAdvanceValue.push(addAdvance({
          senid: `${flatIds[j]}`, DTM: dtm, VALUE: -advanceRequestDetails[j].VALUE, IsRead: true,
        }));
        revertLiveBalance.push(addLB({ senid: `${flatIds[j]}`, DTM: dtm, VALUE: (Number(await getLatestBalanceById({ id: `${LATEST_BALANCE}${flatIds[j]}` })) - Number(advanceRequestDetails[j].VALUE)) }));
      }
    }
  }

  await Promise.all([
    Promise.all(updateAdvanceRequestRead),
    Promise.all(revertAdvanceValue),
  ]);

  return flatIds;
};

module.exports = {
  canAdvanceBeRequested,
  addAdvance,
  revertAdvances,
  addLB,
};
