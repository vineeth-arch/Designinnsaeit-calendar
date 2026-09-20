"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { useState } from "react";
import {
  previewSummary,
  sendSummary,
} from "../../../app/(use-page-wrapper)/settings/(settings-layout)/integrations-automations/summary/actions";

type Props = { bookings: { uid: string; label: string }[]; defaultBookingLink: string };

const LAYERS = ["Position", "Story and message", "Identity", "Packaging and site"] as const;
const inputClass = "border-subtle bg-default w-full rounded-md border px-3 py-2 text-sm";
const point = { premium: true, distinctive: false };

export default function SummaryComposerView({ bookings, defaultBookingLink }: Props) {
  const { t } = useLocale();
  const [uid, setUid] = useState(bookings[0]?.uid ?? "");
  const [quotes, setQuotes] = useState(["", "", ""]);
  const [categoryNoun, setCategoryNoun] = useState("");
  const [today, setToday] = useState(point);
  const [target, setTarget] = useState({ premium: true, distinctive: true });
  const [goal, setGoal] = useState("");
  const [problem, setProblem] = useState("");
  const [stack, setStack] = useState(LAYERS.map(() => ({ settled: false, note: "" })));
  const [riding, setRiding] = useState([{ title: "", text: "" }]);
  const [fitYes, setFitYes] = useState(true);
  const [fitWhy, setFitWhy] = useState("");
  const [nextTitle, setNextTitle] = useState("");
  const [nextBody, setNextBody] = useState("");
  const [deadline, setDeadline] = useState("");
  const [slots, setSlots] = useState(2);
  const [bookingLink, setBookingLink] = useState(defaultBookingLink);
  const [html, setHtml] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const input = () => ({
    uid,
    fields: {
      quotes,
      categoryNoun,
      today,
      target,
      goal,
      problem,
      stack,
      riding: riding.filter((r) => r.title.trim() || r.text.trim()),
      fit: { yes: fitYes, why: fitWhy },
      nextTitle,
      nextBody,
      deadline,
      slots,
      bookingLink,
    },
  });

  const run = async (fn: () => Promise<{ ok: boolean; html?: string; error?: string }>, done?: string) => {
    setPending(true);
    try {
      const res = await fn();
      if (!res.ok) return setMessage(t("summary_composer_error"));
      if (res.html) setHtml(res.html);
      setMessage(done ?? null);
    } catch {
      setMessage(t("summary_composer_error"));
    } finally {
      setPending(false);
    }
  };

  const patch = <T,>(list: T[], i: number, next: Partial<T>) =>
    list.map((item, j) => (j === i ? { ...item, ...next } : item));

  const field = (label: string, control: React.ReactNode) => (
    <label className="block space-y-1">
      <span className="text-emphasis text-sm font-medium">{label}</span>
      {control}
    </label>
  );

  const pointEditor = (label: string, value: typeof point, set: (p: typeof point) => void) => (
    <fieldset className="space-y-1">
      <legend className="text-emphasis text-sm font-medium">{label}</legend>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.premium}
            onChange={(e) => set({ ...value, premium: e.target.checked })}
          />
          {t("summary_composer_premium")}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.distinctive}
            onChange={(e) => set({ ...value, distinctive: e.target.checked })}
          />
          {t("summary_composer_distinctive")}
        </label>
      </div>
    </fieldset>
  );

  return (
    <SettingsHeader title={t("summary_composer_title")} description={t("summary_composer_subtitle")}>
      <div className="grid gap-8 lg:grid-cols-2">
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          {bookings.length === 0 ? (
            <p className="text-subtle text-sm">{t("summary_composer_no_bookings")}</p>
          ) : (
            field(
              t("summary_composer_pick_booking"),
              <select className={inputClass} value={uid} onChange={(e) => setUid(e.target.value)}>
                {bookings.map((b) => (
                  <option key={b.uid} value={b.uid}>
                    {b.label}
                  </option>
                ))}
              </select>
            )
          )}

          <fieldset className="space-y-2">
            <legend className="text-emphasis text-sm font-medium">{t("summary_composer_quotes")}</legend>
            {quotes.map((q, i) => (
              <input
                key={i}
                className={inputClass}
                maxLength={240}
                value={q}
                onChange={(e) => setQuotes(quotes.map((v, j) => (j === i ? e.target.value : v)))}
              />
            ))}
          </fieldset>

          {field(
            t("summary_composer_category_noun"),
            <input
              className={inputClass}
              maxLength={40}
              value={categoryNoun}
              onChange={(e) => setCategoryNoun(e.target.value)}
            />
          )}
          {pointEditor(t("summary_composer_today"), today, setToday)}
          {pointEditor(t("summary_composer_target"), target, setTarget)}
          {field(
            t("summary_composer_goal"),
            <input
              className={inputClass}
              maxLength={60}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          )}
          {field(
            t("summary_composer_problem"),
            <textarea
              className={inputClass}
              rows={5}
              maxLength={900}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
            />
          )}

          <fieldset className="space-y-2">
            <legend className="text-emphasis text-sm font-medium">{t("summary_composer_stack")}</legend>
            {LAYERS.map((name, i) => (
              <div key={name} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0">{name}</span>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={stack[i].settled}
                    onChange={(e) => setStack(patch(stack, i, { settled: e.target.checked }))}
                  />
                  {t("summary_composer_settled")}
                </label>
                <input
                  className={inputClass}
                  maxLength={60}
                  placeholder={t("summary_composer_stack_note")}
                  value={stack[i].note}
                  onChange={(e) => setStack(patch(stack, i, { note: e.target.value }))}
                />
              </div>
            ))}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-emphasis text-sm font-medium">{t("summary_composer_riding")}</legend>
            {riding.map((r, i) => (
              <div key={i} className="space-y-1">
                <input
                  className={inputClass}
                  maxLength={60}
                  placeholder={t("summary_composer_riding_title")}
                  value={r.title}
                  onChange={(e) => setRiding(patch(riding, i, { title: e.target.value }))}
                />
                <input
                  className={inputClass}
                  maxLength={220}
                  placeholder={t("summary_composer_riding_text")}
                  value={r.text}
                  onChange={(e) => setRiding(patch(riding, i, { text: e.target.value }))}
                />
              </div>
            ))}
            {riding.length < 3 && (
              <Button
                type="button"
                color="minimal"
                onClick={() => setRiding([...riding, { title: "", text: "" }])}>
                {t("summary_composer_add_riding")}
              </Button>
            )}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-emphasis text-sm font-medium">{t("summary_composer_fit")}</legend>
            <select
              className={inputClass}
              value={fitYes ? "yes" : "no"}
              onChange={(e) => setFitYes(e.target.value === "yes")}>
              <option value="yes">{t("summary_composer_fit_yes")}</option>
              <option value="no">{t("summary_composer_fit_no")}</option>
            </select>
            <textarea
              className={inputClass}
              rows={3}
              maxLength={500}
              value={fitWhy}
              onChange={(e) => setFitWhy(e.target.value)}
            />
          </fieldset>

          {field(
            t("summary_composer_next_title"),
            <input
              className={inputClass}
              maxLength={90}
              value={nextTitle}
              onChange={(e) => setNextTitle(e.target.value)}
            />
          )}
          {field(
            t("summary_composer_next_body"),
            <textarea
              className={inputClass}
              rows={3}
              maxLength={500}
              value={nextBody}
              onChange={(e) => setNextBody(e.target.value)}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            {field(
              t("summary_composer_deadline"),
              <input
                type="date"
                className={inputClass}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            )}
            {field(
              t("summary_composer_slots"),
              <input
                type="number"
                min={1}
                max={20}
                className={inputClass}
                value={slots}
                onChange={(e) => setSlots(Number(e.target.value))}
              />
            )}
          </div>
          {field(
            t("summary_composer_booking_link"),
            <input
              className={inputClass}
              maxLength={300}
              value={bookingLink}
              onChange={(e) => setBookingLink(e.target.value)}
            />
          )}
        </form>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending || !uid}
              onClick={() => run(() => previewSummary(input()))}>
              {t("summary_composer_preview")}
            </Button>
            <Button
              type="button"
              color="secondary"
              disabled={pending || !uid}
              onClick={() => run(() => sendSummary(input(), "test"), t("summary_composer_sent_test"))}>
              {t("summary_composer_send_test")}
            </Button>
            <Button
              type="button"
              color="secondary"
              disabled={pending || !uid}
              onClick={() => {
                if (!window.confirm(t("summary_composer_confirm_send"))) return;
                run(() => sendSummary(input(), "attendee"), t("summary_composer_sent_attendee"));
              }}>
              {t("summary_composer_send_attendee")}
            </Button>
            <Button
              type="button"
              color="minimal"
              disabled={!html}
              onClick={() => navigator.clipboard.writeText(html)}>
              {t("summary_composer_copy_html")}
            </Button>
          </div>
          {message && (
            <p role="status" className="text-subtle text-sm">
              {message}
            </p>
          )}
          {html ? (
            <iframe
              title={t("summary_composer_title")}
              sandbox=""
              srcDoc={html}
              className="h-[900px] w-full rounded-md border"
            />
          ) : null}
        </div>
      </div>
    </SettingsHeader>
  );
}
