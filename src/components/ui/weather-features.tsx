"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, animate, type Variants } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowUp,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Gauge as GaugeIcon,
  LocateFixed,
  MapPin,
  Moon,
  RefreshCw,
  Shield,
  ShieldCheck,
  Snowflake,
  Sun,
  Thermometer,
  Umbrella,
  Wind,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CitySearch } from "@/components/ui/city-search";
import type { CitySelection } from "@/components/ui/city-search";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import {
  COMPASS_ROSE,
  useI18n,
  type Language,
  type Translate,
} from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

type ConditionKey =
  | "clear"
  | "partlyCloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm";

type ErrorKey =
  | "generic"
  | "serviceUnavailable"
  | "apiKey"
  | "geoUnsupported"
  | "geoDenied"
  | "geoUnavailable"
  | "geoGeneric";

class WeatherError extends Error {
  constructor(public code: "serviceUnavailable" | "apiKey") {
    super(code);
  }
}

const DEFAULT_LOCATION = { label: "New York", lat: 40.7128, lon: -74.006 };

const MY_LOCATION = "__my_location__";

type Daily = {
  date: string;
  key: ConditionKey;
  min: number;
  max: number;
  precipProb: number;
};

type WeatherData = {
  location: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  precipitation: number;
  uvIndex: number | null;
  currentKey: ConditionKey;
  isDay: boolean;
  aqi: number | null;
  daily: Daily[];
};

function omToKey(code: number): ConditionKey {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partlyCloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 61 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if (code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
}

function owmToKey(id: number): ConditionKey {
  if (id === 800) return "clear";
  if (id >= 801 && id <= 802) return "partlyCloudy";
  if (id >= 803) return "cloudy";
  if (id >= 701 && id <= 781) return "fog";
  if (id >= 300 && id < 400) return "drizzle";
  if (id >= 500 && id < 600) return "rain";
  if (id >= 600 && id < 700) return "snow";
  if (id >= 200 && id < 300) return "storm";
  return "cloudy";
}

function dayLabel(
  dateStr: string,
  index: number,
  t: Translate,
  locale: string
): string {
  if (index === 0) return t("day.today");
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(locale, { weekday: "short" });
}

function mostFrequent<T>(arr: T[]): T {
  const counts = new Map<T, number>();
  for (const x of arr) counts.set(x, (counts.get(x) ?? 0) + 1);
  let best = arr[0];
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

function openMeteoUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max",
    timezone: "auto",
    forecast_days: "7",
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

interface OmResponse {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    surface_pressure?: number;
    precipitation?: number;
    weather_code?: number;
    is_day?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    uv_index_max?: number[];
  };
}

interface OmAirResponse {
  current?: { european_aqi?: number };
}

async function fetchOpenMeteo(
  lat: number,
  lon: number,
  label: string
): Promise<WeatherData> {
  const [weatherRes, airRes] = await Promise.allSettled([
    fetch(openMeteoUrl(lat, lon)),
    fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi`
    ),
  ]);

  if (weatherRes.status !== "fulfilled" || !weatherRes.value.ok) {
    throw new WeatherError("serviceUnavailable");
  }

  const json = (await weatherRes.value.json()) as OmResponse;
  const current = json.current ?? {};
  const daily = json.daily ?? {};

  const airJson =
    airRes.status === "fulfilled" && airRes.value.ok
      ? ((await airRes.value.json()) as OmAirResponse)
      : null;

  const dailyList: Daily[] = (daily.time ?? []).map((date, i) => ({
    date,
    key: omToKey(Number(daily.weather_code?.[i] ?? 0)),
    min: Math.round(Number(daily.temperature_2m_min?.[i] ?? 0)),
    max: Math.round(Number(daily.temperature_2m_max?.[i] ?? 0)),
    precipProb: Math.round(Number(daily.precipitation_probability_max?.[i] ?? 0)),
  }));

  return {
    location: label,
    temperature: Math.round(Number(current.temperature_2m ?? 0)),
    feelsLike: Math.round(Number(current.apparent_temperature ?? 0)),
    humidity: Math.round(Number(current.relative_humidity_2m ?? 0)),
    windSpeed: Math.round(Number(current.wind_speed_10m ?? 0)),
    windDirection: Math.round(Number(current.wind_direction_10m ?? 0)),
    pressure: Math.round(Number(current.surface_pressure ?? 0)),
    precipitation: Math.round(Number(current.precipitation ?? 0)),
    uvIndex: Number(daily.uv_index_max?.[0] ?? null) || null,
    currentKey: omToKey(Number(current.weather_code ?? 0)),
    isDay: Number(current.is_day ?? 1) === 1,
    aqi:
      airJson && typeof airJson.current?.european_aqi === "number"
        ? Math.round(airJson.current.european_aqi)
        : null,
    daily: dailyList,
  };
}

interface OwmForecastItem {
  dt_txt?: string;
  main?: { temp_min?: number; temp_max?: number };
  weather?: Array<{ id?: number }>;
  pop?: number;
}

interface OwmCurrentResponse {
  main?: {
    temp?: number;
    feels_like?: number;
    humidity?: number;
    pressure?: number;
  };
  wind?: { speed?: number; deg?: number };
  weather?: Array<{ id?: number }>;
  sys?: { sunrise?: number; sunset?: number };
  rain?: { "1h"?: number };
}

interface OwmForecastResponse {
  list?: OwmForecastItem[];
}

function aggregateForecast(forecast: OwmForecastResponse): Daily[] {
  const groups = new Map<
    string,
    { mins: number[]; maxs: number[]; keys: ConditionKey[]; pops: number[] }
  >();
  for (const item of forecast.list ?? []) {
    const date = item.dt_txt?.slice(0, 10) ?? "";
    if (!date) continue;
    if (!groups.has(date)) groups.set(date, { mins: [], maxs: [], keys: [], pops: [] });
    const group = groups.get(date)!;
    group.mins.push(item.main?.temp_min ?? 0);
    group.maxs.push(item.main?.temp_max ?? 0);
    group.keys.push(owmToKey(item.weather?.[0]?.id ?? 0));
    group.pops.push(item.pop ?? 0);
  }
  return Array.from(groups.entries())
    .slice(0, 7)
    .map(([date, group]) => ({
      date,
      key: mostFrequent(group.keys),
      min: Math.round(Math.min(...group.mins)),
      max: Math.round(Math.max(...group.maxs)),
      precipProb: Math.round(Math.max(...group.pops) * 100),
    }));
}

async function fetchOpenWeatherMap(
  lat: number,
  lon: number,
  label: string,
  apiKey: string
): Promise<WeatherData> {
  const base = "https://api.openweathermap.org/data/2.5";
  const [currentRes, forecastRes] = await Promise.all([
    fetch(`${base}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`),
    fetch(`${base}/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`),
  ]);

  if (!currentRes.ok) {
    throw new WeatherError("apiKey");
  }

  const current = (await currentRes.json()) as OwmCurrentResponse;
  const forecast = forecastRes.ok
    ? ((await forecastRes.json()) as OwmForecastResponse)
    : null;

  const sunrise = current.sys?.sunrise ?? 0;
  const sunset = current.sys?.sunset ?? 0;
  const now = Math.floor(Date.now() / 1000);
  const isDay = sunrise === 0 || sunset === 0 ? true : now > sunrise && now < sunset;

  return {
    location: label,
    temperature: Math.round(current.main?.temp ?? 0),
    feelsLike: Math.round(current.main?.feels_like ?? 0),
    humidity: Math.round(current.main?.humidity ?? 0),
    windSpeed: Math.round((current.wind?.speed ?? 0) * 3.6),
    windDirection: Math.round(current.wind?.deg ?? 0),
    pressure: Math.round(current.main?.pressure ?? 0),
    precipitation: Math.round(current.rain?.["1h"] ?? 0),
    uvIndex: null,
    currentKey: owmToKey(current.weather?.[0]?.id ?? 0),
    isDay,
    aqi: null,
    daily: forecast ? aggregateForecast(forecast) : [],
  };
}

async function fetchWeather(
  lat: number,
  lon: number,
  label: string
): Promise<WeatherData> {
  const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY;
  if (apiKey) {
    return fetchOpenWeatherMap(lat, lon, label, apiKey);
  }
  return fetchOpenMeteo(lat, lon, label);
}

function AnimatedNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const previous = useRef(0);

  useEffect(() => {
    const controls = animate(previous.current, value, {
      duration: 1.1,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    previous.current = value;
    return () => controls.stop();
  }, [value]);

  return <span className={className}>{display}</span>;
}

function RainDrops({ type }: { type: "rain" | "snow" }) {
  const positions = [
    { left: "30%", delay: 0 },
    { left: "46%", delay: 0.18 },
    { left: "62%", delay: 0.36 },
  ];
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      {positions.map((p, i) => (
        <motion.span
          key={i}
          className={cn(
            "absolute bottom-2 block",
            type === "rain"
              ? "size-[3px] rounded-full bg-foreground/50"
              : "size-1 rounded-full bg-foreground/70"
          )}
          style={{ left: p.left }}
          animate={{ y: [0, 8], opacity: [0, 1, 0] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: "easeIn",
            delay: p.delay,
          }}
        />
      ))}
    </span>
  );
}

function WeatherIcon({
  kind,
  isDay = true,
  className,
}: {
  kind: ConditionKey;
  isDay?: boolean;
  className?: string;
}) {
  switch (kind) {
    case "clear":
      return (
        <motion.div
          className={cn("relative", className)}
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          aria-hidden
        >
          {isDay ? (
            <Sun className="size-full text-foreground" strokeWidth={1.5} />
          ) : (
            <Moon className="size-full text-foreground" strokeWidth={1.5} />
          )}
        </motion.div>
      );
    case "partlyCloudy":
      return (
        <div className="relative" aria-hidden>
          {isDay ? (
            <Sun
              className="absolute -top-1 -left-1 size-[74%] text-foreground"
              strokeWidth={1.5}
            />
          ) : (
            <Moon
              className="absolute -top-1 -left-1 size-[74%] text-foreground"
              strokeWidth={1.5}
            />
          )}
          <motion.div
            className="absolute right-0 bottom-0 size-[72%]"
            animate={{ scale: [1, 1.06, 1], y: [0, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Cloud
              className="size-full text-zinc-500 dark:text-zinc-400"
              strokeWidth={1.5}
            />
          </motion.div>
        </div>
      );
    case "cloudy":
      return (
        <motion.div
          className={cn("relative", className)}
          animate={{ scale: [1, 1.04, 1], y: [0, -2, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          <Cloud
            className="size-full text-zinc-500 dark:text-zinc-400"
            strokeWidth={1.5}
          />
        </motion.div>
      );
    case "fog":
      return (
        <div className={cn("relative", className)} aria-hidden>
          <Cloud className="size-full text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <CloudFog className="size-full text-zinc-400 dark:text-zinc-300" strokeWidth={1.5} />
          </motion.div>
        </div>
      );
    case "drizzle":
    case "rain":
      return (
        <motion.div
          className={cn("relative", className)}
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          <CloudRain
            className="size-full text-zinc-500 dark:text-zinc-400"
            strokeWidth={1.5}
          />
          <RainDrops type="rain" />
        </motion.div>
      );
    case "snow":
      return (
        <motion.div
          className={cn("relative", className)}
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          <CloudSnow
            className="size-full text-zinc-500 dark:text-zinc-400"
            strokeWidth={1.5}
          />
          <RainDrops type="snow" />
        </motion.div>
      );
    case "storm":
      return (
        <motion.div
          className={cn("relative", className)}
          animate={{ opacity: [1, 0.55, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          <CloudLightning
            className="size-full text-zinc-500 dark:text-zinc-400"
            strokeWidth={1.5}
          />
        </motion.div>
      );
  }
}

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function TrendChart({ daily }: { daily: Daily[] }) {
  const { t, locale } = useI18n();
  const [hovered, setHovered] = useState<number | null>(null);
  const W = 320;
  const H = 118;
  const PAD = 14;

  if (daily.length === 0) return null;

  const highs = daily.map((d) => d.max);
  const maxValue = Math.max(...highs) + 3;
  const minValue = Math.min(...highs) - 3;
  const span = Math.max(1, maxValue - minValue);

  const points = daily.map((d, i) => ({
    x: PAD + (i * (W - PAD * 2)) / Math.max(1, daily.length - 1),
    y: PAD + ((maxValue - d.max) / span) * (H - PAD * 2),
    i,
    ...d,
  }));

  const line = smoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];
  const area = `${line} L ${last.x} ${H - PAD} L ${first.x} ${H - PAD} Z`;

  const hoveredPoint = hovered !== null ? points[hovered] : null;
  const leftPct = hoveredPoint
    ? Math.min(86, Math.max(14, (hoveredPoint.x / W) * 100))
    : 0;

  return (
    <div className="relative">
<svg viewBox={`0 0 ${W} ${H}`} className="w-full text-foreground" role="img" aria-label={t("chart.ariaTrend")}>
        <motion.path
          d={area}
          fill="currentColor"
          fillOpacity="0.12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.9 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.3, ease: "easeInOut", delay: 0.2 }}
        />
        {points.map((p, i) => (
          <g
            key={`${p.date}-${i}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer"
          >
            <circle cx={p.x} cy={p.y} r={11} fill="transparent" />
            {hovered === i ? (
              <circle
                cx={p.x}
                cy={p.y}
                r="7"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.45"
                strokeWidth="2"
              />
            ) : null}
            <motion.circle
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill="currentColor"
              strokeWidth="2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7 + i * 0.07, type: "spring", stiffness: 300, damping: 18 }}
              style={{ transformOrigin: `${p.x}px ${p.y}px` }}
            />
          </g>
        ))}
      </svg>

      {hoveredPoint ? (
        <div
          className="pointer-events-none absolute z-10"
          style={{
            left: `${leftPct}%`,
            top: `${(hoveredPoint.y / H) * 100}%`,
            transform: "translate(-50%, 14px)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="rounded-lg border border-border/60 bg-popover px-3 py-2 text-center shadow-lg"
          >
            <p className="text-xs font-semibold">
              {dayLabel(hoveredPoint.date, hoveredPoint.i, t, locale)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t(`weather.${hoveredPoint.key}`)}
            </p>
            <p className="mt-1 flex items-center justify-center gap-1 text-xs font-semibold">
              <Thermometer className="size-3 text-foreground" />
              {hoveredPoint.max}°
              <span className="font-normal text-muted-foreground">/ {hoveredPoint.min}°</span>
            </p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Umbrella className="size-3" />
              {hoveredPoint.precipProb}%
            </p>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}

function Gauge({
  value,
  max,
  colorClass,
  label,
  unit,
}: {
  value: number;
  max: number;
  colorClass: string;
  label: string;
  unit: string;
}) {
  const r = 44;
  const cx = 50;
  const cy = 50;
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const length = Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));

  return (
    <div className="relative mx-auto w-full max-w-[230px]">
      <svg viewBox="0 0 100 60" className={cn("w-full", colorClass)} role="img" aria-label={`${label}: ${value} ${unit}`}>
        <path
          d={arc}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.12"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <motion.path
          d={arc}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={length}
          initial={{ strokeDashoffset: length }}
          animate={{ strokeDashoffset: length * (1 - pct) }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.4 }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-1 flex-col items-center">
        <AnimatedNumber value={value} className="text-3xl font-bold tracking-tight" />
        <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
          {unit}
        </span>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

function compassDirection(deg: number, lang: Language): string {
  const dirs = COMPASS_ROSE[lang];
  return dirs[Math.round(deg / 45) % 8];
}

const AQI_LEVELS: Array<{ max: number; labelKey: string }> = [
  { max: 20, labelKey: "aqi.good" },
  { max: 40, labelKey: "aqi.fair" },
  { max: 60, labelKey: "aqi.moderate" },
  { max: 80, labelKey: "aqi.poor" },
  { max: Infinity, labelKey: "aqi.veryPoor" },
];

function CardHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="rounded-lg bg-muted p-1.5 text-foreground/70">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium leading-tight">{title}</p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: LucideIcon;
  label: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className="group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-border/60 bg-card/50 px-3 py-2.5 transition-colors duration-300 hover:border-foreground/30 hover:bg-foreground/5"
    >
      <div className="relative rounded-md bg-muted p-2 text-foreground/70 transition-colors duration-300 group-hover:bg-foreground/10 group-hover:text-foreground">
        <Icon className="size-4" />
      </div>
      <div className="relative min-w-0">
        <p className="truncate text-[10px] font-medium leading-tight tracking-widest text-muted-foreground uppercase">
          {label}
        </p>
        <p className="text-sm font-semibold">
          {value === null ? (
            "—"
          ) : (
            <>
              <AnimatedNumber value={value} />
              {suffix}
            </>
          )}
        </p>
      </div>
    </motion.div>
  );
}

function CurrentWeatherCard({
  data,
  updatedAt,
}: {
  data: WeatherData;
  updatedAt: number | null;
}) {
  const { t, locale } = useI18n();
  const today = data.daily[0];

  return (
    <Card className="h-full min-w-0 w-full bg-card">
      <CardContent className="flex h-full min-w-0 flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <CardHeading
            icon={MapPin}
            title={data.location === MY_LOCATION ? t("app.myLocation") : data.location}
            subtitle={
              updatedAt !== null
                ? t("current.updatedAt", {
                    time: new Date(updatedAt).toLocaleTimeString(locale, {
                      hour: "numeric",
                      minute: "2-digit",
                    }),
                  })
                : t("current.liveData")
            }
          />
          <div className="flex shrink-0 items-center gap-1 text-xs whitespace-nowrap text-muted-foreground">
            <Umbrella className="size-3.5" />
            {t("current.rainChance", { value: today?.precipProb ?? 0 })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              {t(`weather.${data.currentKey}`)}
            </p>
            <div className="mt-1 flex items-start">
              <AnimatedNumber
                value={data.temperature}
                className="text-6xl font-bold tracking-tighter text-foreground"
              />
              <span className="mt-2 text-3xl font-semibold text-foreground">°C</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {today
                ? t("current.highLow", { high: today.max, low: today.min })
                : null}{" "}
              · {t("current.feelsLike", { value: data.feelsLike })}
            </p>
          </div>
          <WeatherIcon
            kind={data.currentKey}
            isDay={data.isDay}
            className="size-24 shrink-0"
          />
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatTile
            icon={Droplets}
            label={t("current.humidity")}
            value={data.humidity}
            suffix="%"
          />
          <StatTile
            icon={GaugeIcon}
            label={t("current.pressure")}
            value={data.pressure}
            suffix=" hPa"
          />
          <StatTile
            icon={Sun}
            label={t("current.uvIndex")}
            value={data.uvIndex === null ? null : Math.round(data.uvIndex)}
          />
          <StatTile
            icon={Umbrella}
            label={t("current.precipitation")}
            value={today?.precipProb ?? data.precipitation}
            suffix="%"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function WindAirCard({ data }: { data: WeatherData }) {
  const { t, lang } = useI18n();
  const aqi = data.aqi;
  const isAqi = aqi !== null;
  const level = AQI_LEVELS.find((l) => (aqi ?? 0) <= l.max) ?? AQI_LEVELS[AQI_LEVELS.length - 1];

  const gaugeValue = isAqi ? (aqi ?? 0) : data.windSpeed;
  const gaugeMax = isAqi ? 100 : 60;
  const gaugeColor = "text-foreground";
  const gaugeLabel = isAqi ? t(level.labelKey) : t("windAir.windSpeed");
  const gaugeUnit = isAqi ? t("windAir.aqi") : "km/h";

  return (
    <Card className="h-full min-w-0 w-full bg-card">
      <CardContent className="flex h-full min-w-0 flex-col gap-5">
        <CardHeading
          icon={Wind}
          title={t("windAir.title")}
          subtitle={isAqi ? t("windAir.aqiSubtitle") : t("windAir.conditionsSubtitle")}
        />

        <Gauge
          value={gaugeValue}
          max={gaugeMax}
          colorClass={gaugeColor}
          label={gaugeLabel}
          unit={gaugeUnit}
        />

        <div className="mt-auto flex items-center justify-between rounded-lg border border-border/60 bg-card/50 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Wind className="size-4" /> {t("windAir.wind")}
          </span>
          <span className="text-sm font-semibold">
            <AnimatedNumber value={data.windSpeed} /> km/h
          </span>
        </div>

        <motion.div
          className="flex items-center justify-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <motion.div
            className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground"
            initial={{ rotate: 0 }}
            animate={{ rotate: data.windDirection }}
            transition={{ duration: 1.1, ease: "easeOut", delay: 0.9 }}
          >
            <ArrowUp className="size-5" />
          </motion.div>
          <div>
            <p className="text-sm font-semibold">
              {compassDirection(data.windDirection, lang)}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("windAir.from", { deg: data.windDirection })}
            </p>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}

function WeeklyForecastCard({ data }: { data: WeatherData }) {
  const { t, locale } = useI18n();
  return (
    <Card className="h-full min-w-0 w-full bg-card">
      <CardContent className="flex min-w-0 flex-col gap-5">
        <div className="flex items-center justify-between">
          <CardHeading
            icon={CloudSun}
            title={t("weekly.title")}
            subtitle={t("weekly.next", { count: data.daily.length })}
          />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Thermometer className="size-3.5" />
            {t("weekly.trend")}
          </div>
        </div>

        <TrendChart daily={data.daily} />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {data.daily.map((d, i) => (
            <motion.div
              key={d.date}
              whileHover={{ y: -5, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="group flex min-w-0 flex-col items-center gap-1.5 rounded-lg border border-border/60 bg-card/50 py-3 transition-colors duration-300 hover:border-foreground/30 hover:bg-foreground/5"
            >
              <span className="text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                {dayLabel(d.date, i, t, locale)}
              </span>
              <div className="transition-transform duration-300 group-hover:scale-110">
                <WeatherIcon kind={d.key} className="size-7" />
              </div>
              <span className="text-sm">
                <span className="font-semibold">{d.max}°</span>
                <span className="text-muted-foreground"> / {d.min}°</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Umbrella className="size-3" />
                {d.precipProb}%
              </span>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type AlertItem = {
  severity: "critical" | "warning" | "notice";
  title: string;
  description: string;
  icon: LucideIcon;
};

const SEVERITY_STYLE: Record<
  AlertItem["severity"],
  { dot: string; badge: string }
> = {
  critical: {
    dot: "bg-foreground",
    badge: "bg-foreground/10 text-foreground ring-foreground/30",
  },
  warning: {
    dot: "bg-foreground/60",
    badge: "bg-foreground/5 text-foreground/85 ring-foreground/20",
  },
  notice: {
    dot: "bg-foreground/30",
    badge: "bg-foreground/0 text-foreground/65 ring-foreground/15",
  },
};

function buildAlerts(data: WeatherData, t: Translate): AlertItem[] {
  const alerts: AlertItem[] = [];
  const today = data.daily[0];

  if (data.currentKey === "storm") {
    alerts.push({
      severity: "critical",
      title: t("alert.severeThunderstorm"),
      description: t("alert.severeThunderstormDesc"),
      icon: CloudLightning,
    });
  }
  if (data.windSpeed >= 41) {
    alerts.push({
      severity: "warning",
      title: t("alert.windAdvisory"),
      description: t("alert.windAdvisoryDesc", { value: data.windSpeed }),
      icon: Wind,
    });
  } else if (data.windSpeed >= 25) {
    alerts.push({
      severity: "notice",
      title: t("alert.breezy"),
      description: t("alert.breezyDesc", { value: data.windSpeed }),
      icon: Wind,
    });
  }
  if (data.currentKey === "snow") {
    alerts.push({
      severity: "warning",
      title: t("alert.winter"),
      description: t("alert.winterDesc"),
      icon: Snowflake,
    });
  }
  if (data.currentKey === "fog") {
    alerts.push({
      severity: "notice",
      title: t("alert.fog"),
      description: t("alert.fogDesc"),
      icon: CloudFog,
    });
  }
  if (data.temperature >= 35) {
    alerts.push({
      severity: "warning",
      title: t("alert.heat"),
      description: t("alert.heatDesc"),
      icon: Sun,
    });
  }
  if (data.temperature <= -10) {
    alerts.push({
      severity: "warning",
      title: t("alert.cold"),
      description: t("alert.coldDesc"),
      icon: Thermometer,
    });
  }
  if (today && today.precipProb >= 60 && data.currentKey !== "storm") {
    alerts.push({
      severity: "notice",
      title: t("alert.rainLikely"),
      description: t("alert.rainLikelyDesc", { value: today.precipProb }),
      icon: CloudRain,
    });
  }
  if (data.aqi !== null && data.aqi >= 60) {
    alerts.push({
      severity: "notice",
      title: t("alert.airQuality"),
      description: t("alert.airQualityDesc"),
      icon: Shield,
    });
  }

  return alerts;
}

function AlertsCard({ data }: { data: WeatherData }) {
  const { t } = useI18n();
  const alerts = buildAlerts(data, t);

  return (
    <Card className="h-full min-w-0 w-full bg-card">
      <CardContent className="flex h-full min-w-0 flex-col gap-4">
        <CardHeading
          icon={Shield}
          title={t("alerts.title")}
          subtitle={
            alerts.length > 0
              ? t("alerts.active", { count: alerts.length })
              : t("alerts.nominal")
          }
        />

        {alerts.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ShieldCheck className="size-12 text-foreground" />
            </motion.div>
            <p className="font-semibold">{t("alerts.allClear")}</p>
            <p className="max-w-[220px] text-sm text-muted-foreground">
              {t("alerts.none")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {alerts.map((alert, i) => {
              const style = SEVERITY_STYLE[alert.severity];
              const Icon = alert.icon;
              return (
                <motion.div
                  key={`${alert.title}-${i}`}
                  className={cn("flex items-start gap-3 rounded-lg p-3 ring-1", style.badge)}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }}
                >
                  <Icon className="mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("size-1.5 rounded-full", style.dot)} />
                      <p className="text-sm font-semibold">{alert.title}</p>
                    </div>
                    <p className="mt-0.5 text-xs opacity-80">{alert.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const gridContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const gridItem: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

function DashboardGrid({
  data,
  updatedAt,
}: {
  data: WeatherData;
  updatedAt: number | null;
}) {
  return (
    <motion.div
      variants={gridContainer}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-12"
    >
      <motion.div variants={gridItem} transition={{ type: "spring", stiffness: 260, damping: 22 }} className="min-w-0 md:col-span-8">
        <motion.div whileHover={{ y: -5 }} className="h-full min-w-0">
          <CurrentWeatherCard data={data} updatedAt={updatedAt} />
        </motion.div>
      </motion.div>
      <motion.div variants={gridItem} className="min-w-0 md:col-span-4">
        <motion.div whileHover={{ y: -5 }} className="h-full min-w-0">
          <WindAirCard data={data} />
        </motion.div>
      </motion.div>
      <motion.div variants={gridItem} className="min-w-0 md:col-span-8">
        <motion.div whileHover={{ y: -5 }} className="h-full min-w-0">
          <WeeklyForecastCard data={data} />
        </motion.div>
      </motion.div>
      <motion.div variants={gridItem} className="min-w-0 md:col-span-4">
        <motion.div whileHover={{ y: -5 }} className="h-full min-w-0">
          <AlertsCard data={data} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "animate-pulse min-w-0 w-full rounded-xl bg-card p-5 ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-5 h-14 w-32 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-4 h-3 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-2 h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
    </motion.div>
  );
}

function SkeletonGrid() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-12"
    >
      <SkeletonCard className="min-w-0 md:col-span-8" />
      <SkeletonCard className="min-w-0 md:col-span-4" />
      <SkeletonCard className="min-w-0 md:col-span-8" />
      <SkeletonCard className="min-w-0 md:col-span-4" />
    </motion.div>
  );
}

function ErrorCard({
  kind,
  onRetry,
}: {
  kind: ErrorKey;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex flex-col items-center justify-center gap-4 rounded-xl bg-card p-10 text-center ring-1 ring-foreground/10"
    >
      <div className="rounded-full bg-foreground/10 p-4">
        <AlertTriangle className="size-8 text-foreground" />
      </div>
      <div>
        <p className="font-semibold">{t("error.title")}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {t(`error.${kind}`)}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        <RefreshCw className="size-4" /> {t("error.retry")}
      </button>
    </motion.div>
  );
}

function geoErrorKey(code: number): ErrorKey {
  if (code === 1) return "geoDenied";
  if (code === 2) return "geoUnavailable";
  return "geoGeneric";
}

export function WeatherFeatures() {
  const { t } = useI18n();
  const [coords, setCoords] = useState({
    lat: DEFAULT_LOCATION.lat,
    lon: DEFAULT_LOCATION.lon,
  });
  const [label, setLabel] = useState(DEFAULT_LOCATION.label);
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const timeout = window.setTimeout(async () => {
      try {
        const weather = await fetchWeather(coords.lat, coords.lon, label);
        if (cancelled) return;
        setData(weather);
        setUpdatedAt(Date.now());
      } catch (e) {
        if (cancelled) return;
        setData(null);
        setError(e instanceof WeatherError ? e.code : "generic");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [coords, label, requestKey]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    setRequestKey((k) => k + 1);
  };

  const handleSearchSelect = (selection: CitySelection) => {
    setCoords({ lat: selection.lat, lon: selection.lon });
    setLabel(selection.label);
    setLoading(true);
    setError(null);
  };

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setError("geoUnsupported");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let name: string | null = null;
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const json = (await res.json()) as { city?: string; locality?: string };
          name = json.city ?? json.locality ?? null;
        } catch {
          name = null;
        }
        setCoords({ lat: latitude, lon: longitude });
        setLabel(name ?? MY_LOCATION);
        setLoading(true);
        setError(null);
      },
      (err) => {
        setError(geoErrorKey(err.code));
        setLoading(false);
      },
      { timeout: 12000, maximumAge: 60000 }
    );
  };

  return (
    <section>
      <div className="mb-8 flex min-w-0 flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="flex min-w-0 items-center gap-2.5 text-2xl font-semibold tracking-tight">
            <Image
              src="/logo.png"
              alt="Tiempo logo"
              width={28}
              height={28}
              className="size-7 hidden shrink-0 rounded-md dark:block"
            />
            <Image
              src="/logo2.png"
              alt="Tiempo logo"
              width={28}
              height={28}
              className="size-7 block shrink-0 rounded-md dark:hidden"
            />
            <span className="truncate">{t("app.title")}</span>
          </h1>
          <p className="mt-1 min-w-0 truncate text-sm text-muted-foreground">
            {t("app.subtitle")}
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="shrink-0">
            <CitySearch onSelect={handleSearchSelect} />
          </div>
          <button
            onClick={locate}
            disabled={loading}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-60"
          >
            <LocateFixed className="size-4 shrink-0 text-foreground" />
            {t("app.myLocation")}
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-60"
          >
            <RefreshCw className={cn("size-4 shrink-0", loading && "animate-spin")} />
            {t("app.refresh")}
          </button>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <SkeletonGrid key="skeleton" />
        ) : error ? (
          <ErrorCard key="error" kind={error} onRetry={refresh} />
        ) : data ? (
          <DashboardGrid key="dashboard" data={data} updatedAt={updatedAt} />
        ) : null}
      </AnimatePresence>
    </section>
  );
}