"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { ButtonProps } from "@calcom/ui/components/button";
import { Button } from "@calcom/ui/components/button";

/**
 * Quick light/dark toggle usable on every page (dashboard shell + public Booker).
 * The organizer's configured theme is applied on load; this toggle wins for the session.
 */
export function ThemeToggle({
  className,
  size = "sm",
  withLabel = false,
}: {
  className?: string;
  size?: ButtonProps["size"];
  /** Render a wider pill with "Light mode" / "Dark mode" text next to the icon. */
  withLabel?: boolean;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);

  // Avoid a hydration mismatch: render the default (moon) until mounted, then reflect resolvedTheme.
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const nextIsDark = !isDark;

  if (withLabel) {
    return (
      <Button
        variant="button"
        color="minimal"
        size={size}
        className={className}
        StartIcon={nextIsDark ? "moon" : "sun"}
        aria-label={nextIsDark ? t("dark_mode") : t("light_mode")}
        onClick={() => setTheme(nextIsDark ? "dark" : "light")}
        data-testid="theme-toggle">
        {nextIsDark ? t("dark_mode") : t("light_mode")}
      </Button>
    );
  }

  return (
    <Button
      variant="icon"
      color="minimal"
      size={size}
      className={className}
      StartIcon={isDark ? "sun" : "moon"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      data-testid="theme-toggle"
    />
  );
}

export default ThemeToggle;
