import { shallow } from "zustand/shallow";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { nameOfDay } from "@calcom/lib/weekday";
import { BookerLayouts } from "@calcom/prisma/zod-utils";
import classNames from "@calcom/ui/classNames";

import { TimeFormatToggle } from "@calcom/features/bookings/components/TimeFormatToggle";

type AvailableTimesHeaderProps = {
  date: Dayjs;
  showTimeFormatToggle?: boolean;
  availableMonth?: string | undefined;
  customClassNames?: {
    availableTimeSlotsHeaderContainer?: string;
    availableTimeSlotsTitle?: string;
    availableTimeSlotsTimeFormatToggle?: string;
  };
};

export const AvailableTimesHeader = ({
  date,
  showTimeFormatToggle = true,
  availableMonth,
  customClassNames,
}: AvailableTimesHeaderProps) => {
  const { t, i18n } = useLocale();
  const [layout] = useBookerStoreContext((state) => [state.layout], shallow);
  const isColumnView = layout === BookerLayouts.COLUMN_VIEW;
  const isToday = dayjs().isSame(date, "day");

  // Column view keeps the compact, centered per-day label (multiple days sit side by side).
  if (isColumnView) {
    return (
      <header
        className={classNames(
          `dark:bg-cal-muted dark:before:bg-cal-muted mb-3 flex w-full flex-row items-center font-medium`,
          "bg-default before:bg-default",
          customClassNames?.availableTimeSlotsHeaderContainer
        )}>
        <span className="text-subtle w-full text-center text-xs uppercase">
          <span
            className={classNames(
              isToday && !customClassNames?.availableTimeSlotsTitle && "!text-default",
              customClassNames?.availableTimeSlotsTitle
            )}>
            {nameOfDay(i18n.language, Number(date.format("d")), "short")}
          </span>
          <span
            className={classNames(
              isToday && "bg-brand-default text-brand ml-2",
              "inline-flex items-center justify-center rounded-3xl px-1 pt-0.5 text-xs font-medium",
              customClassNames?.availableTimeSlotsTitle
            )}>
            {date.format("DD")}
            {availableMonth && `, ${availableMonth}`}
          </span>
        </span>
      </header>
    );
  }

  // Month view (the public Booker): the Braun "systems" ruler head — "Wed 12" + "Feb · 12h".
  return (
    <header
      className={classNames(
        `dark:bg-cal-muted dark:before:bg-cal-muted mb-1.5 flex w-full flex-row items-baseline justify-between`,
        "bg-default before:bg-default",
        customClassNames?.availableTimeSlotsHeaderContainer
      )}>
      <span
        className={classNames(
          "text-emphasis font-cal text-3xl font-extrabold leading-none -tracking-[0.02em]",
          customClassNames?.availableTimeSlotsTitle
        )}>
        {nameOfDay(i18n.language, Number(date.format("d")), "short")} {date.format("D")}
      </span>
      <span className="text-subtle flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]">
        {availableMonth ?? date.format("MMM")} ·
        {showTimeFormatToggle && (
          <TimeFormatToggle
            customClassName={classNames(
              "!rounded-full [&_button]:!rounded-full [&_button]:!px-2.5 [&_button]:!py-1 [&_button]:font-bold [&_button]:uppercase [&_button]:tracking-[0.08em]",
              customClassNames?.availableTimeSlotsTimeFormatToggle
            )}
          />
        )}
      </span>
    </header>
  );
};
