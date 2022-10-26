/* eslint-disable no-await-in-loop */
const moment = require('moment');
const { docClient, cognitoIdentityServiceProvider } = require('../managers');
const { AWS_DYNAMODB_TABLE, AWS_COGNITO_USER_POOL_ID } = require('../config');

const exclude = ['GC_REF_', 'GC_A_LB_', 'GC_A_APC_'];

const getList = async ({
  senid, time, initials, to, from,
}) => {
  // eslint-disable-next-line no-param-reassign
  senid = `${initials}${senid}`;
  let searchExpression = 'SENID = :senid and DTM >= :dtm';
  const fromCurrentMonth = moment().startOf('month').format('YYYY-MM-DD');

  let params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: searchExpression,
    ExpressionAttributeValues: {
      ':dtm': fromCurrentMonth,
      ':senid': senid,
    },
  };

  if (to && from) {
    const ExpressionAttributeValues = {
      ':senid': senid,
    };
    if (!exclude.includes(initials)) {
      searchExpression = 'SENID = :senid and DTM BETWEEN :ds and :de';
      ExpressionAttributeValues[':ds'] = moment(from).format();
      ExpressionAttributeValues[':de'] = moment(to).format();
    } else {
      searchExpression = 'SENID = :senid';
    }
    params = {
      TableName: AWS_DYNAMODB_TABLE,
      KeyConditionExpression: searchExpression,
      ExpressionAttributeValues,
    };
  }

  if (time === 'none') {
    params = {
      TableName: AWS_DYNAMODB_TABLE,
      KeyConditionExpression: 'SENID = :senid',
      ExpressionAttributeValues: {
        ':senid': senid,
      },
    };
  }

  const { Items } = await docClient.query(params).promise();
  return Items;
};

const getLatestEntityDiff = async (senid) => {
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid',
    ExpressionAttributeValues: {
      ':senid': `${senid}`,
    },
    ScanIndexForward: false,
    Limit: 2,
  };

  const { Items } = await docClient.query(params).promise();
  const current = Items[0] ? Items[0].VALUE : 0;
  const previous = Items[1] ? Items[1].VALUE : 0;

  return Number(current) - Number(previous);
};

const getAllCognitoFlatIds = async () => {
  const flatIds = [];
  const params = {
    UserPoolId: AWS_COGNITO_USER_POOL_ID,
  };
  do {
    await new Promise((resolve, reject) => {
      cognitoIdentityServiceProvider.listUsers(params, (err, data) => {
        if (data) {
          if (data.PaginationToken) {
            params.PaginationToken = data.PaginationToken;
          } else {
            delete params.PaginationToken;
          }
          for (let i = 0; i < data.Users.length; i += 1) {
            flatIds.push(data.Users[i].Username);
          }
          resolve(data);
        }
        if (err) {
          console.error(err);
          reject(err);
        }
      });
    });
  } while (params.PaginationToken);

  return flatIds;
};

const getKwhUsed = async (senid) => {
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid and DTM BETWEEN :ds and :de',
    ExpressionAttributeValues: {
      ':senid': `GC_A_KWH_${senid}`,
      ':ds': moment().subtract(1, 'days').startOf('day').toISOString(),
      ':de': moment().subtract(1, 'days').endOf('day').toISOString(),
    },
  };

  const { Items } = await docClient.query(params).promise();

  let total = 0;
  for (let i = 0; i < Items.length; i += 1) {
    total += Number(Items[i].VALUE);
  }

  return {
    total: total.toFixed(2),
    id: senid,
  };
};

const addEntity = async ({ senid, DTM, VALUE }) => {
  const item = {
    SENID: `${senid}`,
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

const getPoweCSV = async ({ senid, i }) => {
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid and DTM BETWEEN :ds and :de',
    ExpressionAttributeValues: {
      ':senid': `${senid}`,
      ':ds': senid !== 'GC_A_SP_DAY' ? moment().subtract(i, 'days').startOf('day').toISOString() : moment().subtract(i - 1, 'days').startOf('day').toISOString(),
      ':de': senid !== 'GC_A_SP_DAY' ? moment().subtract(i, 'days').endOf('day').toISOString() : moment().subtract(i - 1, 'days').endOf('day').toISOString(),
    },
    ScanIndexForward: false,
    Limit: 1,
  };

  const { Items } = await docClient.query(params).promise();
  if (senid === 'GC_A_MP_DAY') {
    return {
      value: Items[0] ? Items[0].VALUE : 0,
      date: moment().subtract(i, 'days').startOf('day').format('DD-MM-YYYY'),
    };
  }

  return Items[0] ? Items[0].VALUE : 0;
};

const getLatestSOLARDiff = async (senid) => {
  const yesterday = moment().subtract(1, 'days').endOf('day').toISOString();
  const yesterdaysPreviousDay = moment().subtract(2, 'days').endOf('day').toISOString();
  console.log(yesterday, yesterdaysPreviousDay, 'DATE');

  const paramsOne = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid and DTM >= :dtm',
    ExpressionAttributeValues: {
      ':senid': `${senid}`,
      ':dtm': yesterday,
    },
    ScanIndexForward: false,
    Limit: 1,
  };

  const paramsTwo = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid and DTM >= :dtm',
    ExpressionAttributeValues: {
      ':senid': `${senid}`,
      ':dtm': yesterdaysPreviousDay,
    },
    ScanIndexForward: false,
    Limit: 1,
  };

  const [yesterdayResult, previousYesterdayResult] = await Promise.all([
    docClient.query(paramsOne).promise(),
    docClient.query(paramsTwo).promise(),
  ]);

  const yesterdayRes = yesterdayResult.Items[0] ? yesterdayResult.Items[0].VALUE : 0;
  const yesterdayPreviousRes = previousYesterdayResult.Items[0] ? previousYesterdayResult.Items[0].VALUE : 0;

  return Math.abs(Number(yesterdayPreviousRes) - Number(yesterdayRes));
};

const updatePowerCSV = async () => {
  // eslint-disable-next-line max-len
  const [mainPowerIncoming, riserOnePowerUsed, riserTwoPowerUsed,
    riserThreePowerUsed, riserFourPowerUsed, commonPowerUsed, flatIds,
    gymPower, retailShopPower, chickenShopPower,
    riserOneSolr, riserTwoSolr, riserThreeSolr, riserFourSolr,
  ] = await Promise.all([
    getLatestEntityDiff('GC_PR_M'),
    getLatestEntityDiff('GC_PR_R1'),
    getLatestEntityDiff('GC_PR_R2'),
    getLatestEntityDiff('GC_PR_R3'),
    getLatestEntityDiff('GC_PR_R4'),
    getLatestEntityDiff('GC_PR_C1'),
    getAllCognitoFlatIds(),
    getLatestEntityDiff('GC_PR_GYM'),
    getLatestEntityDiff('GC_PR_RS'),
    getLatestEntityDiff('GC_PR_CS'),
    getLatestSOLARDiff('GC_SOLAR_1_IN'),
    getLatestSOLARDiff('GC_SOLAR_2_IN'),
    getLatestSOLARDiff('GC_SOLAR_3_IN'),
    getLatestSOLARDiff('GC_SOLAR_4_IN'),
  ]);

  const promiseArray = [];
  for (let i = 0; i < flatIds.length; i += 1) {
    promiseArray.push(getKwhUsed(flatIds[i]));
  }
  const total = await Promise.all(promiseArray);

  let totalConsumedByFlats = 0;
  let riserOneComsumed = 0;
  let riserTwoComsumed = 0;
  let riserThreeComsumed = 0;
  let riserFourComsumed = 0;
  for (let j = 0; j < total.length; j += 1) {
    totalConsumedByFlats += Number(total[j].total);
    if ((Number(total[j].id) >= 101 && Number(total[j].id) <= 118) || (Number(total[j].id) >= 201 && Number(total[j].id) <= 218) || (Number(total[j].id) >= 301 && Number(total[j].id) <= 318) || (Number(total[j].id) >= 401 && Number(total[j].id) <= 418) || (Number(total[j].id) >= 501 && Number(total[j].id) <= 518) || (Number(total[j].id) >= 601 && Number(total[j].id) <= 618)) {
      riserThreeComsumed += Number(total[j].total);
    }
    if ((Number(total[j].id) >= 119 && Number(total[j].id) <= 136) || (Number(total[j].id) >= 219 && Number(total[j].id) <= 236) || (Number(total[j].id) >= 319 && Number(total[j].id) <= 336) || (Number(total[j].id) >= 419 && Number(total[j].id) <= 436) || (Number(total[j].id) >= 519 && Number(total[j].id) <= 536) || (Number(total[j].id) >= 619 && Number(total[j].id) <= 636)) {
      riserFourComsumed += Number(total[j].total);
    }
    if ((Number(total[j].id) >= 137 && Number(total[j].id) <= 150) || (Number(total[j].id) >= 237 && Number(total[j].id) <= 250) || (Number(total[j].id) >= 337 && Number(total[j].id) <= 350) || (Number(total[j].id) >= 437 && Number(total[j].id) <= 450) || (Number(total[j].id) >= 537 && Number(total[j].id) <= 550) || (Number(total[j].id) >= 637 && Number(total[j].id) <= 650)) {
      riserOneComsumed += Number(total[j].total);
    }
    if ((Number(total[j].id) >= 151 && Number(total[j].id) <= 169) || (Number(total[j].id) >= 251 && Number(total[j].id) <= 269) || (Number(total[j].id) >= 351 && Number(total[j].id) <= 369) || (Number(total[j].id) >= 451 && Number(total[j].id) <= 469) || (Number(total[j].id) >= 551 && Number(total[j].id) <= 569) || (Number(total[j].id) >= 651 && Number(total[j].id) <= 669)) {
      riserTwoComsumed += Number(total[j].total);
    }
  }
  totalConsumedByFlats = totalConsumedByFlats.toFixed(2);

  const dtm = moment().subtract(1, 'days').startOf('day').toISOString();
  await Promise.all([
    addEntity({ senid: 'GC_A_MP_DAY', DTM: dtm, VALUE: mainPowerIncoming }),
    addEntity({ senid: 'GC_A_R1_DAY', DTM: dtm, VALUE: riserOnePowerUsed }),
    addEntity({ senid: 'GC_A_R2_DAY', DTM: dtm, VALUE: riserTwoPowerUsed }),
    addEntity({ senid: 'GC_A_R3_DAY', DTM: dtm, VALUE: riserThreePowerUsed }),
    addEntity({ senid: 'GC_A_R4_DAY', DTM: dtm, VALUE: riserFourPowerUsed }),
    addEntity({ senid: 'GC_A_C1_DAY', DTM: dtm, VALUE: commonPowerUsed }),
    addEntity({ senid: 'GC_A_KWHSUM_DAY', DTM: dtm, VALUE: totalConsumedByFlats }),
    addEntity({ senid: 'GC_PR_GYM_DAY', DTM: dtm, VALUE: gymPower }),
    addEntity({ senid: 'GC_PR_RS_DAY', DTM: dtm, VALUE: retailShopPower }),
    addEntity({ senid: 'GC_PR_CS_DAY', DTM: dtm, VALUE: chickenShopPower }),
    addEntity({ senid: 'GC_SOLAR_1_IN_DAY', DTM: dtm, VALUE: riserOneSolr }),
    addEntity({ senid: 'GC_SOLAR_2_IN_DAY', DTM: dtm, VALUE: riserTwoSolr }),
    addEntity({ senid: 'GC_SOLAR_3_IN_DAY', DTM: dtm, VALUE: riserThreeSolr }),
    addEntity({ senid: 'GC_SOLAR_4_IN_DAY', DTM: dtm, VALUE: riserFourSolr }),
    addEntity({ senid: 'GC_A_RISER_ONE_KWHSUM_DAY', DTM: dtm, VALUE: riserOneComsumed }),
    addEntity({ senid: 'GC_A_RISER_TWO_KWHSUM_DAY', DTM: dtm, VALUE: riserTwoComsumed }),
    addEntity({ senid: 'GC_A_RISER_THREE_KWHSUM_DAY', DTM: dtm, VALUE: riserThreeComsumed }),
    addEntity({ senid: 'GC_A_RISER_FOUR_KWHSUM_DAY', DTM: dtm, VALUE: riserFourComsumed }),
  ]);
  // console.log(solarPowerIncoming, mainPowerIncoming, totalIncomingPower, riserOnePowerUsed, riserTwoPowerUsed,
  //   riserThreePowerUsed, riserFourPowerUsed, commonPowerUsed, totalPowerConsumed, totalConsumedByFlats,
  //   gymPower, retailShopPower, chickenShopPower, moment(dtm).toString());
};

module.exports = {
  getList,
  getLatestEntityDiff,
  getAllCognitoFlatIds,
  getKwhUsed,
  addEntity,
  getPoweCSV,
  updatePowerCSV,
};
