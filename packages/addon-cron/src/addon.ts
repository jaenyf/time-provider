import { CronScheduler } from "./cron-scheduler.ts";

export const addon = function <TDate>() {
  return new CronScheduler<TDate>();
};
