/* eslint-disable no-await-in-loop */
const moment = require('moment');
const { sequelizeManager, docClient } = require('../managers');
const { AWS_DYNAMODB_TABLE } = require('../config');
const { cognitoUtils } = require('../utils');
const {
  NEW_WATER_READING, NEW_WATER_COST_PER_HOUR, WATER_READING,
} = require('../consts');

const { WaterStatusModel } = sequelizeManager;

const deletePowerStatuses = async ({ senid }) => {
  await WaterStatusModel.destroy({
    where: {
      senid,
    },
  });
};

const setStatus = async ({ senid, value }) => {
  await deletePowerStatuses({ senid });

  return WaterStatusModel.create({
    senid, value,
  });
};

const getStatus = async ({ senid }) => {
  const where = {
    senid,
  };

  const item = await WaterStatusModel.findOne({
    where,
  });

  if (!item) {
    return setStatus({ senid, value: 'off' });
  }

  return item;
};

// const getWaterTariff = async () => {
//   const params = {
//     TableName: AWS_DYNAMODB_TABLE,
//     KeyConditionExpression: 'SENID = :senid',
//     ExpressionAttributeValues: {
//       ':senid': WATER_TARIFF,
//     },
//     ScanIndexForward: false,
//   };
//   const { Items } = await docClient.query(params).promise();
//   return Items[0] ? Items[0].VALUE : 0;
// };

const getWaterReading = async ({ senid }) => {
  const previousDay = moment().subtract(1, 'days').format();
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid and DTM >= :dtm',
    ExpressionAttributeValues: {
      ':dtm': previousDay,
      ':senid': `${WATER_READING}${senid}`,
    },
    ScanIndexForward: false,
  };
  const { Items } = await docClient.query(params).promise();
  return {
    current_reading: Items[0] ? Number(Items[0].VALUE) : 0,
    previous_reading: Items[1] ? Number(Items[1].VALUE) : 0,
    senid,
  };
};

const addWaterConsumed = async ({ senid, waterConsumed, dtm }) => {
  const item = {
    SENID: `${NEW_WATER_READING}${senid}`,
    DTM: dtm,
    MsgType: 'AVG',
    VALUE: waterConsumed.toFixed(2),
  };

  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    Item: item,
  };

  await docClient.put(params).promise();
  return item;
};

const addWaterCost = async ({ senid, waterCost, dtm }) => {
  const item = {
    SENID: `${NEW_WATER_COST_PER_HOUR}${senid}`,
    DTM: dtm,
    MsgType: 'AVG',
    VALUE: waterCost.toFixed(2),
  };

  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    Item: item,
  };

  await docClient.put(params).promise();
  return item;
};

const getTotalWaterReadingMonth = async ({ senid, dtm }) => {
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid and DTM BETWEEN :ds and :de',
    ExpressionAttributeValues: {
      ':senid': `GC_A_W_${senid}`,
      ':de': dtm,
      ':ds': moment(dtm).startOf('month').toISOString(),
    },
    ScanIndexForward: false,
  };

  const { Items } = await docClient.query(params).promise();

  let total = 0;
  for (let i = 0; i < Items.length; i += 1) {
    total += Number(Items[i].VALUE);
  }

  if (total >= 0 && total <= 6) return 15.86;
  if (total > 6 && total <= 10.5) return 21.79;
  if (total >= 10.5 && total <= 35) return 29.61;
  return 54.65;
};

const updateWaterUsage = async () => {
  try {
    const dtm = moment().add(2, 'hours').toISOString();
    const flatIds = await cognitoUtils.getAllCognitoFlatIds();

    const waterReadingPromise = [];
    const tariffPromise = [];
    for (let i = 0; i < flatIds.length; i += 1) {
      waterReadingPromise.push(getWaterReading({ senid: flatIds[i] }));
      tariffPromise.push(getTotalWaterReadingMonth({ senid: flatIds[i], dtm }));
    }

    const [waterReadings, tariffReadings] = await Promise.all([
      Promise.all(waterReadingPromise),
      Promise.all(tariffPromise),
    ]);

    const addPromise = [];
    for (let j = 0; j < waterReadings.length; j += 1) {
      const waterConsumed = waterReadings[j].current_reading ? (Math.abs(waterReadings[j].previous_reading - waterReadings[j].current_reading) * 1000) : 0;
      const waterCost = waterConsumed * tariffReadings[j];
      addPromise.push(addWaterConsumed({ senid: waterReadings[j].senid, waterConsumed, dtm }));
      addPromise.push(addWaterCost({ senid: waterReadings[j].senid, waterCost, dtm }));
    }

    await Promise.all(addPromise);

    return waterReadings;
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

  const totalConsumption = await getEntitySum({ senid, from, initial: NEW_WATER_READING });
  const totalCost = await getEntitySum({ senid, from, initial: NEW_WATER_COST_PER_HOUR });

  return {
    totalConsumption,
    totalCost,
  };
};

module.exports = {
  getStatus,
  setStatus,
  updateWaterUsage,
  getConsumption,
};
