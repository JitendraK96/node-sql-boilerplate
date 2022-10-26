/* eslint-disable no-await-in-loop */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
const _ = require('lodash');
const CsvParser = require('json2csv').Parser;
const { error, success, dateUtil } = require('../utils');
const {
  getId, getTime,
} = require('../validations');
const { summaryService, powerService, liveBalanceService } = require('../services');
const {
  LATEST_BALANCE, TRANSACTION_FEE, APC_VALUE,
  TOP_IT_UP, POWER_COST,
  DEPOSIT_BALANCE, SMS_FEE, ADVANCE,
} = require('../consts');

const getList = async (req, res, next) => {
  try {
    const { senid } = req.params;
    let { time, from, to } = req.query;
    await getId.validateAsync(senid);
    time = await getTime.validateAsync(time);

    if ((from && !to) || (to && !from)) {
      return error.throwCustomJoiValidationError({ message: 'From and To both are required' });
    }

    from = await getTime.validateAsync(from);
    to = await getTime.validateAsync(to);

    const initials = [LATEST_BALANCE, TRANSACTION_FEE, APC_VALUE, TOP_IT_UP, POWER_COST, DEPOSIT_BALANCE, SMS_FEE, ADVANCE];
    const promiseArray = [];

    for (let i = 0; i < initials.length; i += 1) {
      promiseArray.push(summaryService.getList({
        senid,
        time,
        to,
        from,
        initials: initials[i],
      }));
    }

    const [latestBalance, transactionFee, apcValue, topItUp, powerCost, depositBalance, smsFee, advance] = await Promise.all(promiseArray);

    const topItUpRef = _.get(_.last(topItUp), 'REFCODE');
    const liveBalanceLast = _.round(_.get(_.last(latestBalance), 'VALUE'), 2);
    const lastApcValue = _.get(_.last(apcValue), 'VALUE');
    // eslint-disable-next-line no-mixed-operators
    const timeToRechargeLast = liveBalanceLast > 0 ? _.round(liveBalanceLast * -1 / lastApcValue, 2) : 0;
    const allData = _.orderBy([...depositBalance, ...powerCost, ...transactionFee, ...smsFee, ...advance], 'DTM', 'desc');
    const liveBalanceReversed = latestBalance.reverse();
    const advances = advance.reverse();

    const { Days, Hours } = dateUtil.splitTime(Math.ceil(Math.abs(timeToRechargeLast)));

    const summary = {
      top_it_ip: topItUpRef,
      last_live_balance: liveBalanceLast,
      last_acp_value: lastApcValue,
      last_time_to_recharge: `${Days} Days ${Hours} Hours`,
      all_data: allData,
      live_balance_reversed: liveBalanceReversed,
      advances,
    };

    return success.handler({ summary }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

const getCSV = async (req, res, next) => {
  try {
    let flatIds = await summaryService.getAllCognitoFlatIds();
    const flatsCount = flatIds.length;
    const csvFields = ['FLAT NUMBER', 'LATEST LIVE BALANCE', 'LATEST POWER READING', 'LATEST POWER READING TIME'];
    const csvParser = new CsvParser({ csvFields });
    const csvRawData = [];
    const newSenids = ['GC_PR_M', 'GC_PR_M_OUT', 'GC_PR_R1', 'GC_PR_R1_OUT', 'GC_PR_R2', 'GC_PR_R2_OUT', 'GC_PR_R3', 'GC_PR_R3_OUT',
      'GC_PR_R4', 'GC_PR_R4_OUT', 'GC_PR_GYM', 'GC_PR_RS', 'GC_PR_CS', 'GC_PR_C1', 'GC_PR_C1_OUT', 'GC_PR_FISH', 'GC_A_LB_FISH',
      'GC_PR_BUTCH', 'GC_A_LB_BUTCH', 'GC_SOLAR_1_OUT', 'GC_SOLAR_2_OUT', 'GC_SOLAR_3_OUT', 'GC_SOLAR_4_OUT'];

    flatIds = flatIds.concat(newSenids);

    const latestLBPromiseArray = [];
    const latestPRPromiseArray = [];
    for (let i = 0; i < flatIds.length; i += 1) {
      latestLBPromiseArray.push(liveBalanceService.getLatestBalanceById({ id: flatIds[i].startsWith('GC_') ? `${flatIds[i]}` : `GC_A_LB_${flatIds[i]}`, flatsCount, i }));
      latestPRPromiseArray.push(powerService.getLatestPR({ flatId: flatIds[i].startsWith('GC_') ? `${flatIds[i]}` : `GC_A_PR_${flatIds[i]}` }));
    }

    const [latestLBDetails, latestPRDetails] = await Promise.all([
      Promise.all(latestLBPromiseArray),
      Promise.all(latestPRPromiseArray),
    ]);

    for (let j = 0; j < flatIds.length; j += 1) {
      csvRawData.push({
        'FLAT NUMBER': flatIds[j], 'LATEST LIVE BALANCE': latestLBDetails[j], 'LATEST POWER READING': latestPRDetails[j].value, 'LATEST POWER READING TIME': latestPRDetails[j].time,
      });
    }
    const csvData = csvParser.parse(csvRawData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=data.csv');

    return res.status(200).end(csvData);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

const updatePowerCSV = async (req, res, next) => {
  try {
    await summaryService.updatePowerCSV();
    return success.handler({ status: true }, req, res, next);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

const getPowerCSV = async (req, res, next) => {
  try {
    const csvFields = ['DATE', 'SUPPLY MUNI', 'SUPPLY MUNI COMMON 1',
      'SUPPLY MUNI CHICKEN SHOP', 'SUPPLY MUNI GYM', 'SUPPLY MUNI RETAIL',
      'SUPPLY MUNI RISER 1', 'SUPPLY MUNI RISER 2', 'SUPPLY MUNI RISER 3',
      'SUPPLY MUNI RISER 4', 'SUPPLY SOLAR RISER 1', 'SUPPLY SOLAR RISER 2',
      'SUPPLY SOLAR RISER 3', 'SUPPLY SOLAR RISER 4', 'BILLED KWH RISER 1',
      'BILLED KWH RISER 2', 'BILLED KWH RISER 3', 'BILLED KWH RISER 4'];
    const csvParser = new CsvParser({ csvFields });
    const csvRawData = [];

    for (let i = 1; i <= 30; i += 1) {
      const [MP, R1, R2, R3, R4, C1, GYM, RETAIL, CHICKEN, RS1, RS2, RS3, RS4, RC1, RC2, RC3, RC4] = await Promise.all([
        summaryService.getPoweCSV({ senid: 'GC_A_MP_DAY', i }),
        summaryService.getPoweCSV({ senid: 'GC_A_R1_DAY', i }),
        summaryService.getPoweCSV({ senid: 'GC_A_R2_DAY', i }),
        summaryService.getPoweCSV({ senid: 'GC_A_R3_DAY', i }),
        summaryService.getPoweCSV({ senid: 'GC_A_R4_DAY', i }),
        summaryService.getPoweCSV({ senid: 'GC_A_C1_DAY', i }),
        // summaryService.getPoweCSV({ senid: 'GC_A_KWHSUM_DAY', i }),
        summaryService.getPoweCSV({ senid: 'GC_PR_GYM_DAY', i }),
        summaryService.getPoweCSV({ senid: 'GC_PR_RS_DAY', i }),
        summaryService.getPoweCSV({ senid: 'GC_PR_CS_DAY', i }),
        summaryService.getPoweCSV({ senid: 'GC_SOLAR_1_IN_DAY', i }),
        summaryService.getPoweCSV({ senid: 'GC_SOLAR_2_IN_DAY', i }),
        summaryService.getPoweCSV({ senid: 'GC_SOLAR_3_IN_DAY', i }),
        summaryService.getPoweCSV({ senid: 'GC_SOLAR_4_IN_DAY', i }),
        summaryService.getPoweCSV({ senid: 'GC_A_RISER_ONE_KWHSUM_DAY', i }),
        summaryService.getPoweCSV({ senid: 'GC_A_RISER_TWO_KWHSUM_DAY', i }),
        summaryService.getPoweCSV({ senid: 'GC_A_RISER_THREE_KWHSUM_DAY', i }),
        summaryService.getPoweCSV({ senid: 'GC_A_RISER_FOUR_KWHSUM_DAY', i }),
      ]);
      csvRawData.push({
        DATE: MP.date,
        'INCOMER MUNI': Number(MP.value).toFixed(0),
        'SUPPLY MUNI COMMON 1': Number(C1).toFixed(0),
        'SUPPLY MUNI CHICKEN SHOP': Number(CHICKEN).toFixed(0),
        'SUPPLY MUNI GYM': Number(GYM).toFixed(0),
        'SUPPLY MUNI RETAIL': Number(RETAIL).toFixed(0),
        'SUPPLY MUNI RISER 1': Number(R1).toFixed(0),
        'SUPPLY MUNI RISER 2': Number(R2).toFixed(0),
        'SUPPLY MUNI RISER 3': Number(R3).toFixed(0),
        'SUPPLY MUNI RISER 4': Number(R4).toFixed(0),
        'SUPPLY SOLAR RISER 1': Number(RS1).toFixed(0),
        'SUPPLY SOLAR RISER 2': Number(RS2).toFixed(0),
        'SUPPLY SOLAR RISER 3': Number(RS3).toFixed(0),
        'SUPPLY SOLAR RISER 4': Number(RS4).toFixed(0),
        'BILLED KWH RISER 1': Number(RC1).toFixed(0),
        'BILLED KWH RISER 2': Number(RC2).toFixed(0),
        'BILLED KWH RISER 3': Number(RC3).toFixed(0),
        'BILLED KWH RISER 4': Number(RC4).toFixed(0),
      });
    }
    const csvData = csvParser.parse(csvRawData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=data.csv');

    return res.status(200).end(csvData);
  } catch (err) {
    return error.handler(err, req, res, next);
  }
};

module.exports = {
  getList,
  getCSV,
  updatePowerCSV,
  getPowerCSV,
};
