export type StatusState = "ok" | "warn" | "off";

// Keys are i18n keys so the server-side checks stay translation-free; the view calls t(reasonKey, reasonParams).
export type IntegrationStatus = {
  state: StatusState;
  reasonKey: string;
  reasonParams?: Record<string, string | number>;
  fixHref?: string;
  fixLabelKey?: string;
};
