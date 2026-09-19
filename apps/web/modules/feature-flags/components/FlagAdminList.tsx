import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { PanelCard } from "@calcom/ui/components/card";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { Switch, TextField } from "@calcom/ui/components/form";
import { List, ListItem, ListItemText, ListItemTitle } from "@calcom/ui/components/list";
import { showToast } from "@calcom/ui/components/toast";
import { useEffect, useState } from "react";
import type { FlagVerdict } from "../lib/flagGuidance";
import { getFlagGuidance, VERDICT_STYLE } from "../lib/flagGuidance";
import { AssignFeatureSheet } from "./AssignFeatureSheet";

type Flag = RouterOutputs["viewer"]["features"]["list"][number];
type Filter = "all" | "risky" | FlagVerdict;

const FILTERS: Filter[] = [
  "all",
  "recommended",
  "situational",
  "experiment",
  "not_needed",
  "inactive",
  "risky",
];

const GROUP_TITLE_KEY: Record<string, string> = {
  EXPERIMENT: "flags_group_experiment",
  KILL_SWITCH: "flags_group_kill_switch",
  OPERATIONAL: "flags_group_operational",
  RELEASE: "flags_group_release",
};

const matchesFilter = (flag: Flag, filter: Filter) => {
  if (filter === "all") return true;
  const guidance = getFlagGuidance(flag.slug);
  if (filter === "risky") return !!guidance?.danger;
  return guidance?.verdict === filter;
};

const matchesQuery = (flag: Flag, query: string) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const guidance = getFlagGuidance(flag.slug);
  return [flag.slug, flag.description, guidance?.summary, guidance?.benefit]
    .filter(Boolean)
    .some((text) => text?.toLowerCase().includes(needle));
};

export const FlagAdminList = () => {
  const { t } = useLocale();
  const [data] = trpc.viewer.features.list.useSuspenseQuery();
  const [selectedFlag, setSelectedFlag] = useState<Flag | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const visibleFlags = data.filter((flag) => matchesFilter(flag, filter) && matchesQuery(flag, query));

  const groupedFlags = visibleFlags.reduce(
    (acc, flag) => {
      const type = flag.type || "OTHER";
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(flag);
      return acc;
    },
    {} as Record<string, typeof data>
  );

  const sortedTypes = Object.keys(groupedFlags).sort();
  const recommendedFlags = data.filter((flag) => getFlagGuidance(flag.slug)?.verdict === "recommended");

  const handleAssignClick = (flag: Flag) => {
    setSelectedFlag(flag);
    setSheetOpen(true);
  };

  return (
    <>
      <div className="stack-y-4">
        {recommendedFlags.length > 0 && (
          <PanelCard title={t("flags_start_here")} subtitle={t("flags_start_here_description")}>
            <div className="flex flex-wrap gap-2 p-4">
              {recommendedFlags.map((flag) => (
                <Badge
                  key={flag.slug}
                  variant={flag.enabled ? "green" : "gray"}
                  startIcon={flag.enabled ? "check" : "ban"}>
                  {flag.slug} · {flag.enabled ? t("flags_on") : t("flags_off")}
                </Badge>
              ))}
            </div>
          </PanelCard>
        )}

        <div className="stack-y-2">
          <p className="text-subtle text-sm">{t("flags_legend_description")}</p>
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((item) => (
              <FilterChip
                key={item}
                item={item}
                selected={filter === item}
                onSelect={() => setFilter(item)}
              />
            ))}
          </div>
          <TextField
            name="flag-search"
            placeholder={t("flags_search_placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {sortedTypes.length === 0 && <p className="text-subtle text-sm">{t("flags_no_results")}</p>}

        {sortedTypes.map((type) => (
          <PanelCard
            key={type}
            title={t(GROUP_TITLE_KEY[type] ?? "flags_group_other")}
            collapsible
            defaultCollapsed={false}>
            <List roundContainer noBorderTreatment>
              {groupedFlags[type].map((flag: Flag, index: number) => (
                <FlagRow
                  key={flag.slug}
                  flag={flag}
                  rounded={index === 0 || index === groupedFlags[type].length - 1}
                  onAssign={() => handleAssignClick(flag)}
                />
              ))}
            </List>
          </PanelCard>
        ))}
      </div>
      {selectedFlag && (
        <AssignFeatureSheet flag={selectedFlag} open={sheetOpen} onOpenChange={setSheetOpen} />
      )}
    </>
  );
};

const FilterChip = (props: { item: Filter; selected: boolean; onSelect: () => void }) => {
  const { t } = useLocale();
  const { item, selected, onSelect } = props;
  const style = item === "all" || item === "risky" ? null : VERDICT_STYLE[item];
  const label =
    item === "all"
      ? t("flags_filter_all")
      : item === "risky"
        ? t("flag_verdict_risky")
        : t(style?.labelKey ?? "");

  return (
    <Badge
      variant={item === "risky" ? "red" : (style?.variant ?? "grayWithoutHover")}
      startIcon={item === "risky" ? "triangle-alert" : style?.icon}
      className={selected ? "ring-emphasis ring-2" : "opacity-70"}
      onClick={onSelect}
      aria-pressed={selected}>
      {label}
    </Badge>
  );
};

const FlagRow = (props: { flag: Flag; rounded: boolean; onAssign: () => void }) => {
  const { t } = useLocale();
  const { flag, rounded, onAssign } = props;
  const guidance = getFlagGuidance(flag.slug);
  const style = guidance ? VERDICT_STYLE[guidance.verdict] : null;

  return (
    <ListItem rounded={rounded} className={guidance?.danger ? "border-l-2 border-l-red-500" : undefined}>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          {style && <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dotClass}`} />}
          <ListItemTitle component="h3">{flag.slug}</ListItemTitle>
          {guidance && style && (
            <Badge variant={style.variant} startIcon={style.icon}>
              {t(style.labelKey)}
            </Badge>
          )}
          {guidance?.danger && (
            <Badge variant="red" startIcon="triangle-alert">
              {t("flag_verdict_risky")}
            </Badge>
          )}
        </div>
        <ListItemText component="p">{guidance?.summary ?? flag.description}</ListItemText>
        {guidance && (
          <>
            <ListItemText component="p">
              <span className="font-medium">{t("flags_benefit")}:</span> {guidance.benefit}
            </ListItemText>
            {guidance.note && <ListItemText component="p">{guidance.note}</ListItemText>}
          </>
        )}
      </div>
      <div className="flex items-center gap-2 py-2">
        <FlagToggle flag={flag} />
        <Button color="secondary" size="sm" variant="icon" onClick={onAssign} StartIcon="users" />
      </div>
    </ListItem>
  );
};

const FlagToggle = (props: { flag: Flag }) => {
  const { t } = useLocale();
  const {
    flag: { slug, enabled },
  } = props;
  const utils = trpc.useUtils();
  const [checked, setChecked] = useState(enabled);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isDanger = !!getFlagGuidance(slug)?.danger;

  useEffect(() => {
    setChecked(enabled);
  }, [enabled]);

  const mutation = trpc.viewer.admin.toggleFeatureFlag.useMutation({
    onSuccess: () => {
      showToast(t("flags_updated"), "success");
      utils.viewer.features.list.invalidate();
      utils.viewer.features.map.invalidate();
    },
    onError: () => {
      setChecked(enabled);
      showToast(t("flags_update_failed"), "error");
    },
  });

  const apply = (next: boolean) => {
    setChecked(next);
    mutation.mutate({ slug, enabled: next });
  };

  return (
    <>
      <Switch
        checked={checked}
        onCheckedChange={(next) => {
          if (isDanger && next) {
            setConfirmOpen(true);
            return;
          }
          apply(next);
        }}
      />
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("flags_confirm_title", { slug })}
          onConfirm={() => {
            setConfirmOpen(false);
            apply(true);
          }}>
          {t("flags_confirm_description")}
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
};
