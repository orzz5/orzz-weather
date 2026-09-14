"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

type GeoResult = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
};

export type CitySelection = {
  lat: number;
  lon: number;
  label: string;
};

const MIN_QUERY_LENGTH = 2;

export function CitySearch({
  onSelect,
}: {
  onSelect: (selection: CitySelection) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t, lang } = useI18n();

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setOpen(true);
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            trimmed
          )}&count=8&language=${lang}&format=json`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Geocoding request failed");
        const json = (await res.json()) as { results?: GeoResult[] };
        setResults(json.results ?? []);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, lang]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setOpen(false);
    }
  };

  const select = (result: GeoResult) => {
    const label = `${result.name}, ${result.country ?? result.admin1 ?? t("app.unknown")}`;
    onSelect({ lat: result.latitude, lon: result.longitude, label });
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      select(results[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative">
      <div className="flex h-9 items-center gap-1.5 rounded-lg border border-input bg-card px-2 min-w-56 sm:w-64">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={t("app.searchPlaceholder")}
          role="combobox"
          aria-expanded={open}
          aria-controls="city-search-results"
          aria-label={t("app.searchAria")}
          className="h-full w-full bg-transparent text-sm outline-none"
        />
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {open && results.length > 0 ? (
        <div
          id="city-search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 z-20 mt-1.5 overflow-hidden rounded-lg border border-input bg-popover shadow-lg"
        >
          {results.map((result, i) => (
            <button
              key={`${result.name}-${result.latitude}-${result.longitude}-${i}`}
              type="button"
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                select(result);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
            >
              <MapPin className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{result.name}</span>
                <span className="text-muted-foreground">
                  {result.country ? `, ${result.country}` : ""}
                  {result.country && result.admin1 && result.admin1 !== result.country
                    ? ` · ${result.admin1}`
                    : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}