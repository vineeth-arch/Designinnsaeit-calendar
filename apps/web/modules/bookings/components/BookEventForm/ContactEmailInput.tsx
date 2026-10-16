"use client";

import type { GoogleContact } from "@calcom/features/google-contacts/lib/contacts";
import { filterContacts } from "@calcom/features/google-contacts/lib/contacts";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Input } from "@calcom/ui/components/form";
import { useEffect, useId, useMemo, useRef, useState } from "react";

type Props = {
  id: string;
  name?: string;
  value: string;
  onChange: (email: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  contacts: GoogleContact[];
  needsGoogleConsent: boolean;
};

function Highlight({ text, query }: { text: string; query: string }) {
  const index = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (!query.trim() || index < 0) return <>{text}</>;
  const end = index + query.trim().length;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-transparent font-semibold text-emphasis">{text.slice(index, end)}</mark>
      {text.slice(end)}
    </>
  );
}

function ContactRow({ contact, query, tall }: { contact: GoogleContact; query: string; tall?: boolean }) {
  const initial = (contact.name ?? contact.email).charAt(0).toUpperCase();
  return (
    <div className={`flex w-full items-center gap-3 ${tall ? "min-h-14" : "min-h-11"}`}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-subtle text-sm font-medium text-emphasis">
        {initial}
      </span>
      <span className="flex min-w-0 flex-col text-left">
        <span className="truncate text-sm font-medium text-emphasis">
          <Highlight text={contact.name ?? contact.email} query={query} />
        </span>
        {contact.name && (
          <span className="truncate text-xs text-subtle">
            <Highlight text={contact.email} query={query} />
          </span>
        )}
      </span>
    </div>
  );
}

function ConsentHint() {
  const { t } = useLocale();
  return (
    <a href="/apps/google-calendar" className="mt-1 inline-block text-xs text-subtle underline">
      {t("connect_google_contacts")}
    </a>
  );
}

// Suggestions render in normal flow, never in a portal: on phones (and week/column layouts) the booking
// form sits inside a Radix modal that traps focus, blocks pointer events outside itself, and closes —
// clearing the chosen slot — on any outside tap.
export function ContactEmailInput(props: Props) {
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = useMemo(
    () => filterContacts(props.contacts, props.value, 5),
    [props.contacts, props.value]
  );
  const typed = props.value.trim().toLowerCase();
  // Hide once the field already holds the only remaining suggestion, e.g. right after picking it.
  const showList = open && matches.length > 0 && !(matches.length === 1 && matches[0].email === typed);
  const activeIndex = Math.min(active, matches.length - 1);

  // Keeps the list visible above the on-screen keyboard inside the scrollable dialog.
  useEffect(() => {
    if (showList) listRef.current?.scrollIntoView({ block: "nearest" });
  }, [showList]);

  const pick = (email: string) => {
    props.onChange(email);
    setOpen(false);
  };

  return (
    <div>
      <Input
        id={props.id}
        name={props.name}
        data-testid={props.name}
        type="email"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder={props.placeholder}
        disabled={props.disabled}
        required={props.required}
        value={props.value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList ? `${listId}-${activeIndex}` : undefined}
        onChange={(e) => {
          props.onChange(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((activeIndex + 1) % matches.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((activeIndex - 1 + matches.length) % matches.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(matches[activeIndex].email);
          }
        }}
      />
      {showList && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="mt-1 max-h-60 overflow-y-auto overscroll-contain rounded-lg border border-subtle bg-default p-1 shadow-sm">
          {matches.map((contact, index) => (
            <li
              key={contact.email}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // Keeps input focus so onBlur doesn't unmount the list before the click lands.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(contact.email)}
              className={`cursor-pointer rounded-md px-2 ${index === activeIndex ? "bg-subtle" : ""}`}>
              <ContactRow contact={contact} query={props.value} />
            </li>
          ))}
        </ul>
      )}
      {props.needsGoogleConsent && <ConsentHint />}
    </div>
  );
}
