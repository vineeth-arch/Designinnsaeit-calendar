# Disabled GitHub workflows

Disabled on 2026-09-19 with `gh workflow disable <id>`. These are inherited from upstream Cal.com and
need its release, e2e or hosting infrastructure, so they only produced red runs here. Nothing is deleted;
re-enable any of them with `gh workflow enable <id>`.

| Workflow file | ID | Why disabled |
|---|---|---|
| release-docker.yaml | 304617752 | Invalid file (`secrets.*` in `if:`); upstream Docker Hub release |
| i18n.yml | 304617730 | Invalid file (`secrets.*` in a job `if:`); needs Lingo.dev key |
| draft-release.yml | 304617722 | Upstream release tooling |
| re-draft.yml | 304617746 | Upstream release tooling |
| post-release.yml | 304617741 | Upstream release tooling |
| changesets.yml | 304617697 | Upstream NPM release tooling |
| e2e.yml | 304617729 | Needs upstream e2e infrastructure |
| e2e-api-v2.yml | 304617723 | Needs upstream e2e infrastructure |
| e2e-app-store.yml | 304617724 | Needs upstream e2e infrastructure |
| e2e-atoms.yml | 304617725 | Needs upstream e2e infrastructure |
| e2e-embed-react.yml | 304617726 | Needs upstream e2e infrastructure |
| e2e-embed.yml | 304617727 | Needs upstream e2e infrastructure |
| e2e-report.yml | 304617728 | Startup failure, reports for the e2e workflows above |
| merge-reports.yml | 304617734 | Reports for the e2e workflows above |
| publish-report.yml | 304617745 | Reports for the e2e workflows above |
| nextjs-bundle-analysis.yml | 304617737 | Fails; upstream bundle tracking |
| nextjs-bundle-analysis-annotation.yml | 304617736 | Upstream bundle tracking |
| performance-tests.yml | 304617740 | Upstream performance infrastructure |
| pr-welcome-bot.yml | 304617742 | Upstream community bot |
| pr.yml (PR Update) | 304617743 | Fails; upstream PR automation |
| cleanup-report.yml | 304617705 | Fails; upstream report cleanup |
| on-changes-requested.yml | 304617739 | Upstream review bot |
| cron-stale-issue.yml | 304617719 | Upstream issue hygiene |
| cron-checkSmsPrices.yml | 304617712 | Route no longer exists in this fork |
| cron-downgradeUsers.yml | 304617714 | Route no longer exists in this fork |
| cron-monthlyDigestEmail.yml | 304617715 | Route no longer exists in this fork |
| cron-scheduleEmailReminders.yml | 304617716 | Route no longer exists in this fork |
| cron-scheduleSMSReminders.yml | 304617717 | Route no longer exists in this fork |
| cron-scheduleWhatsappReminders.yml | 304617718 | Route no longer exists in this fork |

## The live cron workflows

`cron-bookingReminder`, `cron-changeTimeZone`, `cron-syncAppMeta` and `cron-webhooks-triggers` target routes
that exist, but they never ran: their curl step is skipped because the `APP_URL` and `CRON_API_KEY` secrets
are not set. They stay enabled until cron-job.org is confirmed working, then get disabled too
(`deploy/cron-watchdog/README.md`).
