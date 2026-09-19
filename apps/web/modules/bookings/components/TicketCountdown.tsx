"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { getCountdown } from "@calcom/web/modules/bookings/lib/formatCountdown";
import { useEffect, useState } from "react";

interface TicketCountdownProps {
  startTime: string | Date;
  endTime: string | Date;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Owns the 1s tick so only this subtree re-renders every second. Always recomputes from Date.now()
 * (throttled background tabs would otherwise drift) and renders placeholders until mount to avoid a
 * server/client hydration mismatch.
 */
export const TicketCountdown = ({ startTime, endTime }: TicketCountdownProps) => {
  const { t } = useLocale();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => setNow(Date.now());
    sync();
    const id = setInterval(sync, 1000);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  if (!Number.isFinite(startMs)) return null;
  if (now !== null && now >= startMs) {
    if (Number.isFinite(endMs) && now >= endMs) return null;
    return (
      <p data-testid="ticket-countdown" className="text-brand-default font-cal text-2xl font-extrabold">
        {t("ticket_happening_now")}
      </p>
    );
  }

  const countdown = now === null ? null : getCountdown(startMs - now);
  const segments = [
    { value: countdown?.days, label: t("ticket_unit_days"), wide: true },
    { value: countdown?.hours, label: t("ticket_unit_hrs") },
    { value: countdown?.minutes, label: t("ticket_unit_min") },
    { value: countdown?.seconds, label: t("ticket_unit_sec") },
  ];

  return (
    <div data-testid="ticket-countdown" className="flex flex-col items-center">
      <span className="text-brand-default text-xs font-semibold">{t("ticket_starts_in")}</span>
      {countdown && (
        <span className="sr-only">
          {`${countdown.days} ${t("ticket_unit_days")} ${countdown.hours} ${t("ticket_unit_hrs")} ${countdown.minutes} ${t("ticket_unit_min")}`}
        </span>
      )}
      <div aria-hidden="true" className="mt-1 flex items-start gap-1.5 sm:gap-3">
        {segments.map(({ value, label, wide }) => (
          <div key={label} className="flex flex-col items-center">
            <span
              className={`text-emphasis font-cal text-3xl font-extrabold leading-none tabular-nums -tracking-[0.02em] sm:text-4xl ${
                wide ? "min-w-[3ch]" : "min-w-[2ch]"
              } text-center`}>
              {value === undefined ? "--" : pad(value)}
            </span>
            <span className="text-subtle mt-1 text-[10px] font-medium uppercase tracking-wide">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
