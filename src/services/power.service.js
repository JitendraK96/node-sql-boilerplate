/* eslint-disable no-prototype-builtins */
/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const _ = require('lodash');
const moment = require('moment');
const { sequelizeManager, docClient } = require('../managers');

const { cognitoUtils } = require('../utils');

const { PowerStatusModel } = sequelizeManager;
const { AWS_DYNAMODB_TABLE } = require('../config');
const {
  POWER_READING, POWER_CONSUMPTION, POWER_COST, POWER_TARIFF,
} = require('../consts');

const deletePowerStatuses = async ({ senid }) => {
  await PowerStatusModel.destroy({
    where: {
      senid,
    },
  });
};

const setStatus = async ({ senid, value }) => {
  await deletePowerStatuses({ senid });

  return PowerStatusModel.create({
    senid, value,
  });
};

const getStatus = async ({ senid }) => {
  const where = {
    senid,
  };

  const item = await PowerStatusModel.findOne({
    where,
  });

  if (!item) {
    return setStatus({ senid, value: 'off' });
  }

  return item;
};

const getPowerTariff = async () => {
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid',
    ExpressionAttributeValues: {
      ':senid': POWER_TARIFF,
    },
    ScanIndexForward: false,
  };

  const paramsComm = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid',
    ExpressionAttributeValues: {
      ':senid': 'GC_TARIFF_COMM',
    },
    ScanIndexForward: false,
  };

  const [flatTariff, commTariff] = await Promise.all([
    docClient.query(params).promise(),
    docClient.query(paramsComm).promise(),
  ]);

  return {
    flat_tariff: flatTariff.Items[0] ? flatTariff.Items[0].VALUE : 0,
    comm_tariff: commTariff.Items[0] ? commTariff.Items[0].VALUE : 0,
  };
};

const getPCAverage = async ({ senid }) => {
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid',
    ExpressionAttributeValues: {
      ':senid': `${senid}`,
    },
    ScanIndexForward: false,
    Limit: 12,
  };

  const { Items } = await docClient.query(params).promise();
  let totalPC = 0;
  for (let i = 0; i < Items.length; i += 1) {
    const value = Number(Items[i].VALUE);
    totalPC += value;
  }

  return (totalPC / 12).toFixed(2);
};

const addKWH = async ({ senid, DTM, VALUE }) => {
  const item = {
    SENID: `GC_A_KWH_${senid}`,
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

const addPC = async ({ senid, DTM, VALUE }) => {
  const item = {
    SENID: `GC_A_PC_${senid}`,
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

const addAPC = async ({ senid, DTM, VALUE }) => {
  const item = {
    SENID: `GC_A_APC_${senid}`,
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

const addReference = async ({ senid, DTM, VALUE }) => {
  const item = {
    SENID: `GC_A_PREF_${senid}`,
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

const getAllPR = async () => {
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    FilterExpression: 'begins_with (SENID, :initial)',
    ExpressionAttributeValues: {
      ':initial': POWER_READING,
    },
  };

  let allData = [];
  do {
    // eslint-disable-next-line no-await-in-loop
    const response = await docClient.scan(params).promise();
    allData = allData.concat(response.Items);

    // Checking if more data is there
    params.ExclusiveStartKey = response.LastEvaluatedKey ? response.LastEvaluatedKey : null;
    if (allData.length >= 50) break;
  } while (params.ExclusiveStartKey);

  const group = _.groupBy(allData, 'SENID');
  return group;
};

const getLatestTwoEntities = async ({ flatId }) => {
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid',
    ExpressionAttributeValues: {
      ':senid': `${flatId}`,
    },
    ScanIndexForward: false,
    Limit: 2,
  };

  const { Items } = await docClient.query(params).promise();
  return {
    current: Items[0] ? Items[0] : null,
    previous: Items[1] ? Items[1] : null,
  };
};

const getAllPowerReading = async () => {
  const flatIds = await cognitoUtils.getAllCognitoFlatIds();
  const powerReadingArray = [];
  const latestPRRefrenceArray = [];
  const getPCAverageArray = [];

  for (let i = 0; i < flatIds.length; i += 1) {
    powerReadingArray.push(getLatestTwoEntities({ flatId: `GC_A_PR_${flatIds[i]}` }));
    latestPRRefrenceArray.push(getLatestReference({ senid: `GC_A_PREF_${flatIds[i]}` }));
    getPCAverageArray.push(getPCAverage({ senid: `GC_A_PC_${flatIds[i]}` }));
  }

  const [powerReadingDetails, latestPRRefDetails, powerTariff, powerCostAverageDetails] = await Promise.all([
    Promise.all(powerReadingArray),
    Promise.all(latestPRRefrenceArray),
    getPowerTariff(),
    Promise.all(getPCAverageArray),
  ]);

  const addKWHArray = [];
  const addPCArray = [];
  const addAPCArray = [];
  const addREFArray = [];
  const dtm = moment().add(2, 'hours').toISOString();

  for (let j = 0; j < flatIds.length; j += 1) {
    if (powerReadingDetails[j].current && powerReadingDetails[j].previous) {
      if (powerReadingDetails[j].current.DTM !== latestPRRefDetails[j].DTM) {
        if (powerReadingDetails[j].current.VALUE > powerReadingDetails[j].previous.VALUE) {
          const KWH = Number(Math.abs(powerReadingDetails[j].current.VALUE - powerReadingDetails[j].previous.VALUE)).toFixed(2);
          let PC = 0;
          if (flatIds[j] < 100 || flatIds[j] > 699) {
            PC = (Number(KWH) * Number(powerTariff.comm_tariff)).toFixed(2);
          } else {
            PC = (Number(KWH) * Number(powerTariff.flat_tariff)).toFixed(2);
          }
          addKWHArray.push(addKWH({ senid: flatIds[j], VALUE: KWH, DTM: dtm }));
          addPCArray.push(addPC({ senid: flatIds[j], VALUE: PC, DTM: dtm }));
          addAPCArray.push(addAPC({ senid: flatIds[j], VALUE: powerCostAverageDetails[j], DTM: dtm }));
          addREFArray.push(addReference({ senid: flatIds[j], VALUE: powerReadingDetails[j].current.VALUE, DTM: powerReadingDetails[j].current.DTM }));
        }
      }
    }
  }

  await Promise.all([
    Promise.all(addKWHArray),
    Promise.all(addPCArray),
    Promise.all(addAPCArray),
    Promise.all(addREFArray),
  ]);

  return powerTariff;
};

const updatePowerUsage = async () => {
  try {
    const response = await getAllPowerReading();
    return response;
  } catch (error) {
    console.error(`ERROR -> ${JSON.stringify(error, null, 2)}`);
    throw error;
  }
};

const getEntitySum = async ({ from, senid, initial }) => {
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid and DTM >= :dtm',
    ExpressionAttributeValues: {
      ':dtm': from,
      ':senid': `${initial}${senid}`,
    },
    ScanIndexForward: false,
  };

  const { Items } = await docClient.query(params).promise();

  let total = 0;
  for (let i = 0; i < Items.length; i += 1) {
    total += Number(Items[i].VALUE);
  }
  return total.toFixed(2);
};

const getConsumption = async ({ senid, frame }) => {
  // eslint-disable-next-line no-nested-ternary
  const from = frame === 'daily' ? moment().startOf('day').toISOString() : frame === 'weekly' ? moment().startOf('week').toISOString() : moment().startOf('month').toISOString();

  const totalConsumption = await getEntitySum({ senid, from, initial: POWER_CONSUMPTION });
  const totalCost = await getEntitySum({ senid, from, initial: POWER_COST });

  return {
    totalConsumption,
    totalCost,
  };
};

const getLatestPR = async ({ flatId }) => {
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid',
    ExpressionAttributeValues: {
      ':senid': `${flatId}`,
    },
    ScanIndexForward: false,
    Limit: 1,
  };

  const { Items } = await docClient.query(params).promise();
  return {
    value: Items[0] ? Number(Items[0].VALUE).toFixed(2) : 0,
    time: Items[0] ? Items[0].DTM : '',
  };
};

const updateEntity = async ({ senid, dtm }) => {
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    Key: {
      SENID: senid,
      DTM: dtm,
    },
    UpdateExpression: 'set IsRead = :read',
    ExpressionAttributeValues: {
      ':read': 'true',
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return docClient.update(params).promise();
};

const addEntity = async ({
  senid, DTM, VALUE, msg = 'AVG',
}) => {
  console.log(senid);
  const item = {
    SENID: `${senid}`,
    DTM,
    MsgType: msg,
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
  const flatIds = await cognitoUtils.getAllCognitoFlatIds();

  const powerCostArray = [];
  const smsArray = [];
  const depositArray = [];
  const transactionFeeArray = [];
  const liveBalanceArray = [];

  for (let i = 0; i < flatIds.length; i += 1) {
    powerCostArray.push(getLatestReference({ senid: `GC_A_PC_${flatIds[i]}` }));
    smsArray.push(getLatestReference({ senid: `GC_A_SMS_${flatIds[i]}` }));
    depositArray.push(getLatestReference({ senid: `GC_A_D_${flatIds[i]}` }));
    transactionFeeArray.push(getLatestReference({ senid: `GC_A_TF_${flatIds[i]}` }));
    liveBalanceArray.push(getLatestReference({ senid: `GC_A_LB_${flatIds[i]}` }));
  }

  const [PCDetails, SMSDetails, DDetails, TFDetails, LBDetails] = await Promise.all([
    Promise.all(powerCostArray),
    Promise.all(smsArray),
    Promise.all(depositArray),
    Promise.all(transactionFeeArray),
    Promise.all(liveBalanceArray),
  ]);

  const dtm = moment().add(2, 'hours').toISOString();
  const addArray = [];

  for (let j = 0; j < flatIds.length; j += 1) {
    if (LBDetails[j]) {
      let LB = Number(LBDetails[j].VALUE);
      const tempLB = LB;
      if (PCDetails[j].hasOwnProperty('VALUE') && !PCDetails[j].hasOwnProperty('IsRead')) {
        LB -= Number(PCDetails[j].VALUE);
        addArray.push(updateEntity({ senid: `GC_A_PC_${flatIds[j]}`, dtm: PCDetails[j].DTM }));
      }
      if (SMSDetails[j].hasOwnProperty('VALUE') && !SMSDetails[j].hasOwnProperty('IsRead')) {
        LB -= Number(SMSDetails[j].VALUE);
        addArray.push(updateEntity({ senid: `GC_A_SMS_${flatIds[j]}`, dtm: SMSDetails[j].DTM }));
      }
      if (DDetails[j].hasOwnProperty('VALUE') && !DDetails[j].hasOwnProperty('IsRead')) {
        LB += Number(DDetails[j].VALUE);
        addArray.push(updateEntity({ senid: `GC_A_D_${flatIds[j]}`, dtm: DDetails[j].DTM }));
      }
      if (TFDetails[j].hasOwnProperty('VALUE') && !TFDetails[j].hasOwnProperty('IsRead')) {
        LB -= Number(TFDetails[j].VALUE);
        addArray.push(updateEntity({ senid: `GC_A_TF_${flatIds[j]}`, dtm: TFDetails[j].DTM }));
      }
      if (LB !== tempLB) {
        addArray.push(addEntity({
          senid: `GC_A_LB_${flatIds[j]}`, DTM: dtm, VALUE: LB, msg: 'Live Balance',
        }));
      }
    }
  }

  return true;
};

const addPCOncePerDay = async () => {
  const flatIds = await cognitoUtils.getAllCognitoFlatIds();

  const addPCArray = [];
  const dtm = moment().add(2, 'hours').toISOString();
  for (let j = 0; j < flatIds.length; j += 1) {
    if (flatIds[j] < 100 || flatIds[j] > 699) {
      addPCArray.push(addPC({ senid: flatIds[j], VALUE: 73.4735, DTM: dtm }));
      console.log(flatIds[j], 'ID');
    }
  }

  await Promise.all(addPCArray);
  return true;
};

module.exports = {
  getStatus,
  setStatus,
  updatePowerUsage,
  getConsumption,
  getAllPR,
  getLatestPR,
  updateLiveBalance,
  addPCOncePerDay,
};
