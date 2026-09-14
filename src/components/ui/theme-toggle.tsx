"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

const emptySubscribe = () => () => {};

function setThemeWithTransition(next: string, setTheme: (v: string) => void) {
  if (typeof document !== "undefined" && "startViewTransition" in document) {
    (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(
      () => setTheme(next)
    );
  } else {
    setTheme(next);
  }
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isHydrated) {
    return <div className="size-9 rounded-lg border border-input bg-card" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setThemeWithTransition(isDark ? "light" : "dark", setTheme)}
      aria-label={isDark ? t("theme.toggleLight") : t("theme.toggleDark")}
      title={isDark ? t("theme.toggleLight") : t("theme.toggleDark")}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-input bg-card text-sm font-medium transition-colors hover:bg-accent"
    >
      {isDark ? <Sun className="size-4 text-foreground" /> : <Moon className="size-4 text-foreground" />}
    </button>
  );
}