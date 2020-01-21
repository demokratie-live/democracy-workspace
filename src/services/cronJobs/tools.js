import { CronTime } from 'cron';

import CronJobModel from '../../models/CronJob';

export const testCronTime = time => {
  try {
    const p = new CronTime(time); // eslint-disable-line no-unused-vars
  } catch (e) {
    return false;
  }
  return true;
};

export const getCron = async ({ name }) => {
  const cronjob = await CronJobModel.findOne({ name });
  if (!cronjob) {
    return {
      name,
      lastStartDate: null,
      lastErrorDate: null,
      lastError: null,
      lastSuccessDate: null,
      lastSuccessStartDate: null,
      running: false,
    };
  }
  return cronjob;
};

export const setCronStart = async ({ name, startDate = new Date(), running = true }) => {
  Log.info(`[Cronjob][${name}] started: ${startDate}`);
  await CronJobModel.findOneAndUpdate(
    { name },
    { lastStartDate: startDate, running },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
};

export const setCronSuccess = async ({
  name,
  successDate = new Date(),
  successStartDate,
  running = false,
}) => {
  Log.info(`[Cronjob][${name}] finished: ${successStartDate} - ${successDate}`);
  await CronJobModel.findOneAndUpdate(
    { name },
    { lastSuccessDate: successDate, lastSuccessStartDate: successStartDate, running },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
};

export const setCronError = async ({
  name,
  errorDate = new Date(),
  running = false,
  error = null,
}) => {
  Log.error(`[Cronjob][${name}] errored: ${error}`);
  await CronJobModel.findOneAndUpdate(
    { name },
    { lastErrorDate: errorDate, running, lastError: error },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
};

export const resetCronSuccessStartDate = async () => {
  const CRON_NAME = 'resetCronSuccessStartDate';
  const startDate = new Date();
  const cron = await getCron({ name: CRON_NAME });
  if (cron.running) {
    Log.error(`[Cronjob][${CRON_NAME}] running still - skipping`);
    return;
  }
  await setCronStart({ name: CRON_NAME, startDate });
  await CronJobModel.updateMany({}, { lastSuccessStartDate: new Date(0) });
  await setCronSuccess({ name: CRON_NAME, successStartDate: startDate });
};

export const resetCronRunningState = async () => CronJobModel.updateMany({}, { running: false });
