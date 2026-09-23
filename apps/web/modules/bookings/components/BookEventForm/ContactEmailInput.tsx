"use client";

import type { GoogleContact } from "@calcom/features/google-contacts/lib/contacts";
import { filterContacts } from "@calcom/features/google-contacts/lib/contacts";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import {
  Autocomplete,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
} from "@coss/ui/components/autocomplete";
import { Sheet, SheetPopup, SheetTitle } from "@coss/ui/components/sheet";
import { useMemo, useRef, useState } from "react";

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

function DesktopContactInput(props: Props) {
  const matches = useMemo(
    () => filterContacts(props.contacts, props.value, 8),
    [props.contacts, props.value]
  );
  return (
    <div>
      <Autocomplete
        items={matches}
        value={props.value}
        onValueChange={(next: string) => props.onChange(next)}
        filter={null}
        itemToStringValue={(contact: GoogleContact) => contact.email}>
        <AutocompleteInput
          id={props.id}
          name={props.name}
          type="email"
          autoComplete="off"
          placeholder={props.placeholder}
          disabled={props.disabled}
          required={props.required}
        />
        {matches.length > 0 && (
          <AutocompletePopup>
            <AutocompleteList>
              {(contact: GoogleContact) => (
                <AutocompleteItem key={contact.email} value={contact}>
                  <ContactRow contact={contact} query={props.value} />
                </AutocompleteItem>
              )}
            </AutocompleteList>
          </AutocompletePopup>
        )}
      </Autocomplete>
      {props.needsGoogleConsent && <ConsentHint />}
    </div>
  );
}

// Plain button styled like an input field: tapping opens the full-screen picker instead of
// showing the on-screen keyboard first, which would be a worse flow than the picker's own search box.
function InputLikeTrigger({
  id,
  name,
  value,
  placeholder,
  disabled,
  onClick,
}: {
  id: string;
  name?: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      id={id}
      data-testid={name}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9.5 w-full min-w-0 items-center rounded-lg border border-input bg-background px-3 text-start text-base text-foreground shadow-xs/5 outline-none disabled:opacity-64 sm:text-sm">
      <span className={value ? "truncate text-emphasis" : "truncate text-muted-foreground/72"}>
        {value || placeholder}
      </span>
    </button>
  );
}

function PhoneContactInput(props: Props) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => filterContacts(props.contacts, query, 50), [props.contacts, query]);

  const pick = (email: string) => {
    props.onChange(email);
    setOpen(false);
  };

  return (
    <div>
      <InputLikeTrigger
        id={props.id}
        name={props.name}
        value={props.value}
        placeholder={props.placeholder}
        disabled={props.disabled}
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
      />
      {props.needsGoogleConsent && <ConsentHint />}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetPopup
          side="bottom"
          showCloseButton={false}
          initialFocus={searchRef}
          className="h-[100dvh] rounded-none border-0">
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-default px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)]">
            <SheetTitle className="sr-only">{t("search_contacts")}</SheetTitle>
            <input
              ref={searchRef}
              type="search"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder={t("search_contacts")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) pick(matches[0]?.email ?? query.trim());
              }}
              className="h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base text-foreground outline-none placeholder:text-muted-foreground/72"
            />
            <button
              type="button"
              className="shrink-0 px-2 text-sm font-medium text-emphasis"
              onClick={() => setOpen(false)}>
              {t("cancel")}
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto overscroll-contain px-2 pb-[env(safe-area-inset-bottom)]">
            {query.trim() && (
              <li>
                <button
                  type="button"
                  className="flex min-h-14 w-full items-center rounded-md px-2 text-left text-sm text-emphasis active:bg-subtle"
                  onClick={() => pick(query.trim())}>
                  {t("use_typed_email", { value: query.trim() })}
                </button>
              </li>
            )}
            {matches.map((contact) => (
              <li key={contact.email}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 active:bg-subtle"
                  onClick={() => pick(contact.email)}>
                  <ContactRow contact={contact} query={query} tall />
                </button>
              </li>
            ))}
            {!query.trim() && (
              <li className="px-2 py-4 text-sm text-subtle">{t("start_typing_name_or_email")}</li>
            )}
            {query.trim() && matches.length === 0 && (
              <li className="px-2 py-4 text-sm text-subtle">{t("no_matching_contacts")}</li>
            )}
          </ul>
        </SheetPopup>
      </Sheet>
    </div>
  );
}

export function ContactEmailInput(props: Props) {
  // 640px = Tailwind `sm`; below it the full-screen picker gives a far larger touch target than an inline dropdown.
  const isPhone = useMediaQuery("(max-width: 640px)");
  return isPhone ? <PhoneContactInput {...props} /> : <DesktopContactInput {...props} />;
}
