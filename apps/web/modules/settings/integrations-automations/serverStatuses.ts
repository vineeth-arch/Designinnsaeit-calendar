import process from "node:process";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { serverConfig } from "@calcom/lib/serverConfig";
import prisma from "@calcom/prisma";
import { createTransport } from "nodemailer";
import type { IntegrationStatus } from "./status";

const EMAIL_VERIFY_TIMEOUT_MS = 8000;
const WATCHDOG_TIMEOUT_MS = 5000;
const HEARTBEAT_FRESH_MS = 15 * 60_000;
const MINUTE_MS = 60_000;

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out")), ms)),
  ]);

// Transport errors can echo the failing command; cut anything from "pass" onwards so a credential can never reach the page.
const safeErrorDetail = (error: unknown): string => {
  const message = error instanceof Error ? error.message : "unknown error";
  const passIndex = message.search(/pass/i);
  return (passIndex === -1 ? message : message.slice(0, passIndex)).trim().slice(0, 120);
};

export async function getEmailStatus(): Promise<IntegrationStatus> {
  if (!process.env.RESEND_API_KEY && !process.env.EMAIL_SERVER && !process.env.EMAIL_SERVER_HOST) {
    return { state: "off", reasonKey: "status_email_not_set_up" };
  }
  if (!process.env.EMAIL_FROM) return { state: "warn", reasonKey: "status_email_no_from" };

  try {
    const emailsDisabled = await new FeaturesRepository(prisma).checkIfFeatureIsEnabledGlobally("emails");
    if (emailsDisabled) return { state: "warn", reasonKey: "status_email_kill_switch" };

    await withTimeout(createTransport(serverConfig.transport).verify(), EMAIL_VERIFY_TIMEOUT_MS);
    return {
      state: "ok",
      reasonKey: "status_email_ok",
      reasonParams: { provider: process.env.RESEND_API_KEY ? "Resend" : "SMTP" },
    };
  } catch (error) {
    return {
      state: "warn",
      reasonKey: "status_email_login_failed",
      reasonParams: { detail: safeErrorDetail(error) },
    };
  }
}

type WatchdogState = { lastBeat: number | null; failoverSince: number | null };

export async function getCronStatus(): Promise<IntegrationStatus> {
  if (!process.env.CRON_API_KEY) return { state: "off", reasonKey: "status_cron_no_key" };
  const watchdogUrl = process.env.CRON_WATCHDOG_URL;
  if (!watchdogUrl) return { state: "warn", reasonKey: "status_cron_unmonitored" };

  let watchdog: WatchdogState;
  try {
    const res = await fetch(`${watchdogUrl.replace(/\/$/, "")}/status`, {
      signal: AbortSignal.timeout(WATCHDOG_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`watchdog ${res.status}`);
    watchdog = (await res.json()) as WatchdogState;
  } catch {
    return { state: "warn", reasonKey: "status_cron_watchdog_down" };
  }

  const now = Date.now();
  if (watchdog.lastBeat && now - watchdog.lastBeat <= HEARTBEAT_FRESH_MS) {
    return {
      state: "ok",
      reasonKey: "status_cron_ok",
      reasonParams: { minutes: Math.round((now - watchdog.lastBeat) / MINUTE_MS) },
    };
  }
  if (watchdog.failoverSince) {
    return {
      state: "warn",
      reasonKey: "status_cron_failover",
      reasonParams: { minutes: Math.round((now - watchdog.failoverSince) / MINUTE_MS) },
    };
  }
  return {
    state: "warn",
    reasonKey: "status_cron_stalled",
    reasonParams: { lastBeat: watchdog.lastBeat ? new Date(watchdog.lastBeat).toISOString() : "never" },
    fixHref: "https://console.cron-job.org",
    fixLabelKey: "open_cron_job_org",
  };
}
