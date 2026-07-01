"use client";

import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import type { IconName } from "@calcom/ui/components/icon";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

type WebhookSummary = { url: string; active: boolean; triggers: string[] };

type Props = {
  googleCalendarConnected: boolean;
  googleMeetConnected: boolean;
  emailConfigured: boolean;
  cronConfigured: boolean;
  recallAiConnected: boolean;
  webhooks: WebhookSummary[];
};

type StatusCardProps = {
  icon: IconName;
  title: string;
  description: string;
  connected: boolean;
  connectedLabel: string;
  disconnectedLabel: string;
  manageHref?: string;
  external?: boolean;
  children?: React.ReactNode;
};

const StatusCard = ({
  icon,
  title,
  description,
  connected,
  connectedLabel,
  disconnectedLabel,
  manageHref,
  external,
  children,
}: StatusCardProps) => {
  const { t } = useLocale();
  return (
    <div className="border-subtle bg-default flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="bg-subtle text-emphasis flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <div>
          <div className="text-emphasis flex items-center gap-2 text-sm font-semibold">{title}</div>
          <p className="text-subtle mt-0.5 text-sm">{description}</p>
          {children}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Badge variant={connected ? "success" : "gray"} startIcon={connected ? "check" : "x"}>
          {connected ? connectedLabel : disconnectedLabel}
        </Badge>
        {manageHref &&
          (external ? (
            <Button color="secondary" href={manageHref} target="_blank" EndIcon="external-link">
              {t("manage")}
            </Button>
          ) : (
            <Button color="secondary" href={manageHref}>
              {t("manage")}
            </Button>
          ))}
      </div>
    </div>
  );
};

export default function IntegrationsAutomationsView(props: Props) {
  const { t } = useLocale();
  const n8nWebhook = props.webhooks.find((w) => w.triggers.some((trigger) => trigger.startsWith("BOOKING_")));

  return (
    <SettingsHeader
      title={t("integrations_automations")}
      description={t("integrations_automations_description")}>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-emphasis text-sm font-semibold uppercase tracking-wide">
            {t("integrations")}
          </h2>
          <StatusCard
            icon="calendar"
            title="Google Calendar"
            description={t("google_calendar_status_description")}
            connected={props.googleCalendarConnected}
            connectedLabel={t("connected")}
            disconnectedLabel={t("not_connected")}
            manageHref="/apps/installed/calendar"
          />
          <StatusCard
            icon="video"
            title="Google Meet"
            description={t("google_meet_status_description")}
            connected={props.googleMeetConnected}
            connectedLabel={t("connected")}
            disconnectedLabel={t("not_connected")}
            manageHref="/apps/installed/conferencing"
          />
          <StatusCard
            icon="mail"
            title={t("email_resend_smtp")}
            description={t("email_transport_description")}
            connected={props.emailConfigured}
            connectedLabel={t("configured")}
            disconnectedLabel={t("not_configured")}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-emphasis text-sm font-semibold uppercase tracking-wide">{t("automations")}</h2>
          <StatusCard
            icon="bell"
            title={t("new_booking_alert")}
            description={t("new_booking_alert_description")}
            connected={true}
            connectedLabel={t("active_native")}
            disconnectedLabel={t("not_connected")}
          />
          <StatusCard
            icon="clock"
            title={t("reminder_24h_card_title")}
            description={t("reminder_24h_card_description")}
            connected={props.cronConfigured}
            connectedLabel={t("active")}
            disconnectedLabel={t("needs_cron_setup")}
          />
          <StatusCard
            icon="clock"
            title={t("reminder_1h_card_title")}
            description={t("reminder_1h_card_description")}
            connected={props.cronConfigured}
            connectedLabel={t("active")}
            disconnectedLabel={t("needs_cron_setup")}
          />
          <StatusCard
            icon="circle-check"
            title={t("follow_up_card_title")}
            description={t("follow_up_card_description")}
            connected={props.cronConfigured}
            connectedLabel={t("active")}
            disconnectedLabel={t("needs_cron_setup")}
          />
          <StatusCard
            icon="webhook"
            title={t("webhook_n8n")}
            description={t("webhook_n8n_description")}
            connected={!!n8nWebhook?.active}
            connectedLabel={t("connected")}
            disconnectedLabel={t("not_connected")}
            manageHref="/settings/developer/webhooks">
            {n8nWebhook && (
              <p className="text-subtle mt-1 break-all text-xs">
                {n8nWebhook.url} · {n8nWebhook.triggers.filter((x) => x.startsWith("BOOKING_")).join(", ")}
              </p>
            )}
          </StatusCard>
          <StatusCard
            icon="sparkles"
            title="Recall.ai"
            description={t("recall_ai_description")}
            connected={props.recallAiConnected}
            connectedLabel={t("connected")}
            disconnectedLabel={t("not_connected")}
            manageHref="https://www.recall.ai"
            external
          />
        </section>
      </div>
    </SettingsHeader>
  );
}
