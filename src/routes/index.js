const express = require('express');
const { error } = require('../utils');

const apiRoutes = express.Router();

const summaryRoutes = require('./summary.routes');
const powerRoutes = require('./power.routes');
const waterRoutes = require('./water.routes');
const liveBalanceRoutes = require('./live-balance.routes');
const cronRoutes = require('./cron.routes');
const walletRoutes = require('./wallet.routes');
const mqttRoutes = require('./mqtt.routes');
const advanceRoutes = require('./advance.routes');
const adminRoutes = require('./admin.routes');

apiRoutes.use('/summaries', [summaryRoutes]);
apiRoutes.use('/powers', [powerRoutes]);
apiRoutes.use('/waters', [waterRoutes]);
apiRoutes.use('/live-balances', [liveBalanceRoutes]);
apiRoutes.use('/crons', [cronRoutes]);
apiRoutes.use('/wallets', [walletRoutes]);
apiRoutes.use('/mqtt', [mqttRoutes]);
apiRoutes.use('/advances', [advanceRoutes]);

// ADMIN API
apiRoutes.use('/admin', [adminRoutes]);

apiRoutes.use('*', () => error.throwNotFound({ item: 'Route' }));

module.exports = apiRoutes;
