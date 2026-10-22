"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import type { CSSProperties, ReactNode } from "react";

export type GuestPassPerson = {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  isHost: boolean;
};

const MAX_STACK_AVATARS = 4;

const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

// Indigo goes translucent white in dark mode because the card itself is indigo there.
const avatarTone = (index: number) => (index % 2 === 0 ? "bg-[#280A86] dark:bg-white/15" : "bg-[#FF006C]");

const Avatar = ({ name, index, className }: { name: string; index: number; className?: string }) => (
  <span
    aria-hidden
    className={classNames(
      "inline-flex shrink-0 items-center justify-center rounded-full font-cal text-white ring-2 ring-[var(--cal-stamp)]",
      avatarTone(index),
      className
    )}>
    {getInitial(name)}
  </span>
);

const WhatsAppGlyph = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor">
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.2-3.58.94.96-3.49-.22-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.21 4.24-9.45 9.46-9.45 2.52 0 4.9.99 6.68 2.77a9.4 9.4 0 0 1 2.76 6.68c0 5.21-4.24 9.46-9.43 9.46zM20.07 3.9A11.35 11.35 0 0 0 12.05.5C5.78.5.68 5.6.68 11.87c0 2 .52 3.96 1.52 5.69L.58 23.5l6.08-1.6a11.36 11.36 0 0 0 5.38 1.37h.01c6.27 0 11.37-5.1 11.37-11.37 0-3.04-1.18-5.89-3.35-8.01z" />
  </svg>
);

export function InviteSentPill() {
  const { t } = useLocale();
  return (
    <div className="mt-6 flex justify-center">
      <span className="inline-flex items-center gap-2.5 rounded-full bg-[var(--cal-stamp)] px-4 py-2 font-semibold text-emphasis text-sm">
        <span aria-hidden className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <span id="modal-headline">{t("invite_sent_to_everyone")}</span>
      </span>
    </div>
  );
}

export function BookingGuestPass({
  people,
  whatsappHref,
  children,
}: {
  people: GuestPassPerson[];
  whatsappHref: string | null;
  children?: ReactNode;
}) {
  const { t } = useLocale();
  const stack = people.slice(0, MAX_STACK_AVATARS);
  const overflow = people.length - stack.length;

  return (
    <div
      className="rounded-2xl bg-[var(--cal-stamp)] p-5 text-left font-cal sm:p-6"
      style={{ filter: "drop-shadow(8px 8px 14px rgba(0,0,0,0.18))" }}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold font-cal text-[#280A86] text-[11px] uppercase tracking-[0.08em] dark:text-brand-default">
          {t("whos_joining")}
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {stack.map((person, i) => (
              <Avatar key={person.key} name={person.name} index={i} className="h-6 w-6 text-[11px]" />
            ))}
            {overflow > 0 ? (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-black/10 px-1 font-bold text-[10px] text-emphasis ring-2 ring-[var(--cal-stamp)] dark:bg-white/20">
                +{overflow}
              </span>
            ) : null}
          </div>
          <span className="font-semibold text-sm text-subtle">{people.length}</span>
        </div>
      </div>

      <div className="my-4 border-[var(--cal-border)] border-t border-dashed" />

      <ul className="space-y-4">
        {people.map((person, i) => (
          <li
            key={person.key}
            className="flex items-start gap-3 [animation-fill-mode:both] motion-safe:animate-fade-in-up"
            style={{ "--animation-delay": `${i * 40}ms` } as CSSProperties}>
            <Avatar name={person.name} index={i} className="h-9 w-9 font-bold text-sm" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className="wrap-break-word font-semibold text-emphasis"
                  data-testid={person.isHost ? "booking-host-name" : `attendee-name-${person.name}`}>
                  {person.name}
                </p>
                {person.isHost ? (
                  <span className="rounded-full border border-[#280A86]/40 px-2 py-0.5 font-semibold text-[#280A86] text-[11px] dark:border-white/40 dark:text-white">
                    {t("Host")}
                  </span>
                ) : null}
              </div>
              {person.email ? (
                <p
                  className="break-all text-sm text-subtle"
                  data-testid={person.isHost ? "booking-host-email" : `attendee-email-${person.email}`}>
                  {person.email}
                </p>
              ) : null}
              {person.phone ? (
                <p className="break-all text-sm text-subtle" data-testid={`attendee-phone-${person.phone}`}>
                  {person.phone}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {children ? (
        <div className="mt-5 border-[var(--cal-border)] border-t border-dashed pt-5">{children}</div>
      ) : null}

      {whatsappHref ? (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="share-whatsapp"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-5 py-3 font-bold text-[#128C4A] text-sm transition-colors dark:text-[#25D366] [@media(hover:hover)]:hover:bg-[#25D366] [@media(hover:hover)]:hover:text-white">
          <WhatsAppGlyph />
          {t("share_on_whatsapp")}
        </a>
      ) : null}
    </div>
  );
}
