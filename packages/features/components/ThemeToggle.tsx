"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import type { ButtonProps } from "@calcom/ui/components/button";
import { Button } from "@calcom/ui/components/button";

/**
 * Quick light/dark toggle usable on every page (dashboard shell + public Booker).
 * The organizer's configured theme is applied on load; this toggle wins for the session.
 */
export function ThemeToggle({
  className,
  size = "sm",
}: {
  className?: string;
  size?: ButtonProps["size"];
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid a hydration mismatch: render the default (moon) until mounted, then reflect resolvedTheme.
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

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
