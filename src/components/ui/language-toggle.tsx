"use client";

import { Languages } from "lucide-react";
import { useI18n, type Language } from "@/components/i18n-provider";

const LANG_OPTIONS: Array<{ value: Language; label: string }> = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
];

export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-input bg-card px-2 text-sm">
      <Languages className="size-4 shrink-0 text-muted-foreground" />
      <select
        aria-label={t("lang.label")}
        title={t("lang.label")}
        value={lang}
        onChange={(e) => setLang(e.target.value as Language)}
        className="h-full cursor-pointer bg-transparent font-medium outline-none"
      >
        {LANG_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}