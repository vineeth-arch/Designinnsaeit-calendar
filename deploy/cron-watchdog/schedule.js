// Single source of truth for the cal.diy cron routes. The Worker uses it to decide what is due, and
// setup-cronjobs.mjs turns the same table into cron-job.org jobs. In `schedule`, -1 means "every" and
// times are UTC, the same convention as cron-job.org's REST API.
const EVERY = [-1];
const QUARTER_HOURS = [0, 15, 30, 45];

export const JOBS = [
  { title: "cal.diy webhookTriggers", path: "/api/cron/webhookTriggers", method: "POST", schedule: { minutes: EVERY, hours: EVERY, mdays: EVERY } },
  { title: "cal.diy bookingReminder", path: "/api/cron/bookingReminder", method: "POST", schedule: { minutes: QUARTER_HOURS, hours: EVERY, mdays: EVERY } },
  { title: "cal.diy attendeeAutomations", path: "/api/cron/attendeeAutomations", method: "POST", schedule: { minutes: QUARTER_HOURS, hours: EVERY, mdays: EVERY } },
  { title: "cal.diy selected-calendars", path: "/api/cron/selected-calendars", method: "GET", schedule: { minutes: QUARTER_HOURS, hours: EVERY, mdays: EVERY } },
  { title: "cal.diy calendar-subscriptions", path: "/api/cron/calendar-subscriptions", method: "GET", schedule: { minutes: QUARTER_HOURS, hours: EVERY, mdays: EVERY } },
  { title: "cal.diy calendar-subscriptions-cleanup", path: "/api/cron/calendar-subscriptions-cleanup", method: "GET", schedule: { minutes: [0], hours: [3], mdays: EVERY } },
  { title: "cal.diy changeTimeZone", path: "/api/cron/changeTimeZone", method: "POST", schedule: { minutes: [5], hours: [0], mdays: EVERY } },
  { title: "cal.diy syncAppMeta", path: "/api/cron/syncAppMeta", method: "POST", schedule: { minutes: [10], hours: [0], mdays: [1] } },
];

const matches = (allowed, value) => allowed.includes(-1) || allowed.includes(value);

// Which cron routes are due at a given minute (UTC).
export function dueRoutes(date) {
  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();
  const dayOfMonth = date.getUTCDate();
  return JOBS.filter(
    ({ schedule }) =>
      matches(schedule.minutes, minute) && matches(schedule.hours, hour) && matches(schedule.mdays, dayOfMonth)
  ).map(({ path, method }) => ({ path, method }));
}
