"use client";

import type { DateRangeFilterOptions } from "@calcom/features/data-table/lib/types";
import { ColumnFilterType } from "@calcom/features/data-table/lib/types";
import { createColumnHelper, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo } from "react";
import { DateRangeFilter } from "~/data-table/components/filters/DateRangeFilter";
import { DataTableProvider } from "~/data-table/DataTableProvider";

type DemoRow = {
  id: number;
  name: string;
  date: string;
};

const columnHelper = createColumnHelper<DemoRow>();

type ScenarioProps = {
  id: string;
  title: string;
  description: string;
  expected: string;
  range: DateRangeFilterOptions["range"];
};

const scenarios: ScenarioProps[] = [
  {
    id: "past",
    title: 'Range: "past"',
    description: "Restricts date selection to past dates only. Shows presets that are past-compatible.",
    expected:
      "Presets visible: Today, Last 7 days, Last 30 days, Month to date, Year to date, Custom. Calendar allows dates from 2 years ago up to today (maxDate = today).",
    range: "past",
  },
  {
    id: "future",
    title: 'Range: "future"',
    description:
      "Restricts date selection to future dates only. Only the Custom preset is compatible, so it behaves like customOnly.",
    expected:
      "No presets dropdown (Custom is the only compatible preset, so the filter opens the calendar directly). Calendar minDate = today, no upper limit.",
    range: "future",
  },
  {
    id: "any",
    title: 'Range: "any"',
    description: "No date restrictions. Shows all presets.",
    expected: "All presets visible. No calendar date restrictions.",
    range: "any",
  },
  {
    id: "customOnly",
    title: 'Range: "customOnly"',
    description: "Forces custom date picker only. Always hides presets dropdown.",
    expected: "No presets dropdown. Only calendar picker visible when opened. No date restrictions.",
    range: "customOnly",
  },
];

function ScenarioCard({ scenario }: { scenario: ScenarioProps }) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("date", {
        id: "dateRange",
        header: "Date Range",
        cell: (info) => info.getValue(),
        enableColumnFilter: true,
        meta: {
          filter: {
            type: ColumnFilterType.DATE_RANGE,
            dateRangeOptions: {
              range: scenario.range,
            },
          },
        },
      }),
    ],
    [scenario.range]
  );

  const data = useMemo<DemoRow[]>(
    () => [
      { id: 1, name: "Demo Item 1", date: "2024-01-15" },
      { id: 2, name: "Demo Item 2", date: "2024-02-20" },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Get the column definition to pass to DateRangeFilter
  const dateRangeColumn = table.getAllColumns().find((col) => col.id === "dateRange");
  const columnMeta = dateRangeColumn?.columnDef.meta as
    | { filter?: { type: string; dateRangeOptions?: DateRangeFilterOptions } }
    | undefined;
  const dateRangeOptions = columnMeta?.filter?.dateRangeOptions;

  return (
    <div className="border-subtle mb-8 rounded-lg border p-6" data-testid={`drf-scenario-${scenario.id}`}>
      <h3 className="text-emphasis mb-2 text-lg font-semibold">{scenario.title}</h3>
      <p className="text-default mb-2 text-sm">{scenario.description}</p>
      <p className="text-subtle mb-4 text-xs">
        <strong>Expected:</strong> {scenario.expected}
      </p>

      <div className="mt-4">
        <DataTableProvider tableIdentifier={`playground-date-range-${scenario.id}`}>
          {dateRangeColumn && (
            <DateRangeFilter
              column={{
                id: dateRangeColumn.id,
                title: dateRangeColumn.columnDef.header as string,
                type: "dr",
              }}
              options={dateRangeOptions}
              showColumnName={false}
              showClearButton={false}
            />
          )}
        </DataTableProvider>
      </div>
    </div>
  );
}

export default function DateRangeFilterPlayground() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-emphasis text-2xl font-bold">DateRangeFilter Playground</h1>
        <p className="text-default mt-2">
          This page demonstrates the different <code>range</code> options for the DateRangeFilter component.
        </p>
        <p className="text-subtle mt-1 text-sm">
          The <code>range</code> option controls both date restrictions and presets visibility. Presets
          visibility is derived automatically based on compatible presets.
        </p>
      </div>

      <div className="border-subtle bg-muted rounded-lg border p-4 text-sm" data-testid="drf-how-to">
        <h2 className="text-emphasis mb-1 font-semibold">How to use this page</h2>
        <ol className="text-default list-decimal space-y-1 pl-5">
          <li>This is an admin-only test page. Nothing you pick here is saved.</li>
          <li>Open the filter button in each card below and choose a preset or a custom date range.</li>
          <li>Compare what you see with the "Expected" line on that card.</li>
        </ol>
        <p className="text-subtle mt-2">
          The same filter is used for real in the bookings list, Out of Office entries and the admin user
          table, where <code>range</code> decides whether past dates, future dates or any date can be picked.
        </p>
      </div>

      {scenarios.map((scenario) => (
        <ScenarioCard key={scenario.id} scenario={scenario} />
      ))}
    </div>
  );
}
