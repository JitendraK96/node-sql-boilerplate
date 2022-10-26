/* eslint-disable no-await-in-loop */
/* eslint-disable no-loop-func */
const { cognitoIdentityServiceProvider } = require('../managers');
const { AWS_COGNITO_USER_POOL_ID } = require('../config');

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

module.exports = {
  getAllCognitoFlatIds,
};
