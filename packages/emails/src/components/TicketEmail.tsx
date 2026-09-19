import getLabelValueMapFromResponses from "@calcom/lib/bookings/getLabelValueMapFromResponses";
import { formatPrice } from "@calcom/lib/currencyConversions";
import type { TimeFormat } from "@calcom/lib/timeFormat";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
import type { TFunction } from "i18next";
import { AppsStatus } from "./AppsStatus";
import { Info } from "./Info";
import { TicketEmailHtml } from "./TicketEmailHtml";
import { buildTicketEmailContent, type TicketEmailVariant } from "./ticketEmailContent";
import { UserFieldsResponses } from "./UserFieldsResponses";

export const TicketEmail = (props: {
  calEvent: CalendarEvent;
  recipient: Person;
  variant: TicketEmailVariant;
  t: TFunction;
  timeZone: string;
  locale: string;
  timeFormat?: TimeFormat;
  isOrganizer?: boolean;
}) => {
  const { calEvent, t, isOrganizer = false } = props;
  const content = buildTicketEmailContent(props);

  const responses = getLabelValueMapFromResponses(calEvent, isOrganizer);
  const hasResponses = !!responses && Object.values(responses).some((value) => value !== "");
  const hasDetails =
    !!calEvent.description ||
    !!calEvent.additionalNotes ||
    hasResponses ||
    !!calEvent.paymentInfo?.amount ||
    (isOrganizer && !!calEvent.appsStatus?.length);

  const details = hasDetails ? (
    <>
      <Info label={t("description")} description={calEvent.description} withSpacer formatted />
      <Info label={t("additional_notes")} description={calEvent.additionalNotes} withSpacer />
      <UserFieldsResponses t={t} calEvent={calEvent} isOrganizer={isOrganizer} />
      {calEvent.paymentInfo?.amount && (
        <Info
          label={calEvent.paymentInfo.paymentOption === "HOLD" ? t("no_show_fee") : t("price")}
          description={formatPrice(calEvent.paymentInfo.amount, calEvent.paymentInfo.currency, props.locale)}
          withSpacer
        />
      )}
      {isOrganizer && <AppsStatus calEvent={calEvent} t={t} />}
    </>
  ) : null;

  return (
    <TicketEmailHtml
      subject={calEvent.title}
      preheader={content.preheader}
      label={content.label}
      eventName={content.eventName}
      dateText={content.dateText}
      timeText={content.timeText}
      durationText={content.durationText}
      timezoneText={content.timezoneText}
      heroRight={
        content.startsInText ? (
          <span
            data-testid="ticket-email-starts-in"
            style={{
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: 22,
              fontWeight: 800,
              lineHeight: "28px",
              color: "#101010",
            }}>
            {content.startsInText}
          </span>
        ) : null
      }
      joinUrl={content.joinUrl}
      joinLabel={t("join_meeting")}
      appointmentCaption={t("appointment_time")}
      manageCaption={t("ticket_join_caption")}
      withLabel={t("ticket_email_with")}
      withText={content.withText}
      locationLabel={t("location")}
      locationText={content.locationText}
      detailsLabel={t("ticket_email_details")}
      details={details}
      actions={content.actions}
      footerText={t("ticket_email_sent_by")}
    />
  );
};
