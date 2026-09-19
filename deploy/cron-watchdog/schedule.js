// Which cal.diy cron routes are due at a given minute (UTC). Mirrors the cron-job.org job list in README.md.
export function dueRoutes(date) {
  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();
  const dayOfMonth = date.getUTCDate();
  const routes = [{ path: "/api/cron/webhookTriggers", method: "POST" }];

  if (minute % 15 === 0) {
    routes.push(
      { path: "/api/cron/bookingReminder", method: "POST" },
      { path: "/api/cron/attendeeAutomations", method: "POST" },
      { path: "/api/cron/selected-calendars", method: "GET" },
      { path: "/api/cron/calendar-subscriptions", method: "GET" }
    );
  }
  if (hour === 3 && minute === 0) {
    routes.push({ path: "/api/cron/calendar-subscriptions-cleanup", method: "GET" });
  }
  if (hour === 0 && minute === 5) {
    routes.push({ path: "/api/cron/changeTimeZone", method: "POST" });
  }
  if (dayOfMonth === 1 && hour === 0 && minute === 10) {
    routes.push({ path: "/api/cron/syncAppMeta", method: "POST" });
  }
  return routes;
}
