const { docClient, client } = require('../managers');
const {
  AWS_DYNAMODB_TABLE, MQTT_TOPIC,
} = require('../config');
const { cognitoUtils } = require('../utils');

const addReference = async ({ id, DTM, VALUE }) => {
  const item = {
    SENID: `GC_A_LB_REF_${id}`,
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

const getLatestReference = async ({ id }) => {
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid',
    ExpressionAttributeValues: {
      ':senid': `GC_A_LB_REF_${id}`,
    },
    ScanIndexForward: false,
    Limit: 1,
  };

  const { Items } = await docClient.query(params).promise();
  return Items[0] ? Items[0] : {};
};

const getLatestTwoLiveBalanceById = async ({ id }) => {
  const params = {
    TableName: AWS_DYNAMODB_TABLE,
    KeyConditionExpression: 'SENID = :senid',
    ExpressionAttributeValues: {
      ':senid': `GC_A_LB_${id}`,
    },
    ScanIndexForward: false,
    Limit: 2,
  };

  const { Items } = await docClient.query(params).promise();
  return {
    current: Items[0] ? Items[0] : {},
    previous: Items[1] ? Items[1] : {},
  };
};

const publishMessage = ({ message }) => {
  client.publish(MQTT_TOPIC, message);
  return true;
};

const publishMQTT = async () => {
  const flatIds = await cognitoUtils.getAllCognitoFlatIds();

  const latestLBPromiseArray = [];
  const latestLBREFPromiseArray = [];
  for (let i = 0; i < flatIds.length; i += 1) {
    latestLBPromiseArray.push(getLatestTwoLiveBalanceById({ id: flatIds[i] }));
    latestLBREFPromiseArray.push(getLatestReference({ id: flatIds[i] }));
  }

  const [latestLBDetails, latestLBREFDetails] = await Promise.all([
    Promise.all(latestLBPromiseArray),
    Promise.all(latestLBREFPromiseArray),
  ]);

  const lbREFAddPromiseArray = [];
  const publishArray = [];
  for (let j = 0; j < latestLBDetails.length; j += 1) {
    if (latestLBDetails[j].current.DTM !== latestLBREFDetails[j].DTM) {
      const currentLb = Number(latestLBDetails[j].current.VALUE.toFixed(2));
      const previousLB = latestLBDetails[j].previous.VALUE ? Number(latestLBDetails[j].previous.VALUE.toFixed(2)) : 0;

      console.log(currentLb, previousLB);
      if (currentLb > 0) {
        if (previousLB <= 0) {
          console.log('SWITCH ON');
          publishArray.push(publishMessage({ message: `GC${flatIds[j]}_ON` }));
        }
      }

      if (currentLb < 0) {
        if (previousLB > 0) {
          console.log('SWITCH OFF');
          publishArray.push(publishMessage({ message: `GC${flatIds[j]}_OFF` }));
        }
      }
      lbREFAddPromiseArray.push(addReference({ id: flatIds[j], DTM: latestLBDetails[j].current.DTM, VALUE: latestLBDetails[j].current.VALUE }));
    }
  }

  console.log(`Total ${publishArray.length} Message Published`);
  await Promise.all(lbREFAddPromiseArray);
  await Promise.all(publishArray);

  return latestLBDetails;
};

const publishMQTTDaily = async () => {
  const flatIds = await cognitoUtils.getAllCognitoFlatIds();

  const latestLBPromiseArray = [];
  for (let i = 0; i < flatIds.length; i += 1) {
    latestLBPromiseArray.push(getLatestTwoLiveBalanceById({ id: flatIds[i] }));
  }

  const latestLBDetails = await Promise.all(latestLBPromiseArray);

  const publishArray = [];
  for (let j = 0; j < latestLBDetails.length; j += 1) {
    if (latestLBDetails[j].current.VALUE) {
      const currentLb = Number(latestLBDetails[j].current.VALUE.toFixed(2));

      console.log(currentLb, 'LB');
      if (currentLb > 0) {
        console.log('SWITCH ON', flatIds[j]);
        publishArray.push(publishMessage({ message: `GC${flatIds[j]}_ON` }));
      }

      if (currentLb <= 0) {
        console.log('SWITCH OFF', flatIds[j]);
        publishArray.push(publishMessage({ message: `GC${flatIds[j]}_OFF` }));
      }
    }
  }

  console.log(`Total ${publishArray.length} Message Published`);
  await Promise.all(publishArray);

  return latestLBDetails;
};

module.exports = {
  publishMQTT,
  publishMQTTDaily,
  publishMessage,
};
