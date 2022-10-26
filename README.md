# Grand Central

This project covers all the API needed for grand central.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

## Setup

### External Services

- Database: DYNAMO DB.
## Running

A step by step series of examples that tell you how to get a development env running

### Environment variables

| Name | Description | Default |
|---|---|---|
| APP_HOST | | `0.0.0.0`|
| APP_PORT | Service port | `8081`|
| AWS_REGION | AWS region |  |
| AWS_DYNAMODB_TABLE | Dynamo DB table name |  |
| AWS_ACCESS_KEY_ID | AWS access key |  |
| AWS_SECRET_KEY_ID | AWS secret key |  |

### Using npm

1. To build a project, `npm run build`
2. To test a project, `npm run test`
3. To test linter, `npm run lint`
4. To test and fix linter, `npm run lintfix`
5. To audit packages, `npm audit` and to fix minor package issues run `npm audit fix`
6. To start a project server, `npm run start`

### Fetching latest code
1. Main branch `main`
1. Run `cd projects`
2. Run `cd GrandCentralBackEnd`
3. Git pull your main branch and restart the server.

### Starting server
1. Run `cd projects`
2. Run `cd GrandCentralBackEnd`
3. To start the server `sudo pm2 start src/app.js`
4. To stop the server `sudo pm2 stop {app-name}`
5. Get list of running servers `sudo pm2 list`
