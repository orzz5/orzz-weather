# Tiempo — Weather Dashboard

A responsive, bilingual weather dashboard built with
[Next.js](https://nextjs.org) (App Router), React 19, Tailwind CSS v4, and
shadcn/ui. It renders real-time conditions, a 7-day forecast, wind and air
quality gauges, a temperature trend chart, and severe-weather alerts in a
bento-style card grid.

## Features

- **Current weather** — temperature, feels-like, condition, humidity, UV index,
  and rain probability from the extended daily forecast.
- **Air & wind gauge** — animated gauge showing European AQI plus wind speed
  and direction.
- **Temperature trend** — sparkline of the next 7 days of high/low
  temperatures with hover tooltips.
- **Week forecast** — 7-day pills with min/max temperatures and condition
  icons.
- **Alerts** — active weather alerts (tornado, hurricane, flood, extreme
  temperature, etc.) shown as a severity-ranked list.
- **Location search** — city autocomplete, plus "use my location" via the
  browser's geolocation API.
- **i18n** — English, Spanish, and French (persisted in
  `localStorage` under `i18n-lang`).
- **Dark / light theme** — toggle kept in sync with selection, including
  native `color-scheme` for form controls.
- **Animations** — framer-motion page transitions, card entrance stagger,
  and hover lift.

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- [React 19](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [framer-motion](https://motion.dev)
- [next-themes](https://github.com/pacocoursey/next-themes)
- [Lucide](https://lucide.dev) icons

## Data Sources

| Source | Used for | API key |
| --- | --- | --- |
| [Open-Meteo](https://open-meteo.com) | Forecast + European AQI | none (free) |
| [OpenWeatherMap](https://openweathermap.org) | Current weather + forecast (used when key is set) | required |
| [BigDataCloud](https://www.bigdatacloud.com) | Reverse geocoding for "My Location" | none (free) |

If `NEXT_PUBLIC_WEATHER_API_KEY` is not set the app falls back to the free
Open-Meteo API, so it runs out of the box with no configuration.

## Getting Started

Prerequisites: Node.js 20.9+ and npm.

```bash
# install dependencies
npm install

# run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Environment Variables

Copy `.env.example` to `.env.local` (optional):

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_WEATHER_API_KEY` | OpenWeatherMap API key. When set, OpenWeatherMap is used as the weather source; otherwise Open-Meteo is used. |

## Scripts

```bash
npm run dev       # start the development server
npm run build     # create an optimized production build
npm run start     # serve the production build
npm run lint      # run ESLint
```

## Project Structure

```
src/
├── app/
│   ├── globals.css        # Tailwind v4 styles, color-scheme, select dropdown
│   ├── layout.tsx         # root layout, fonts, ThemeProvider + I18nProvider
│   └── page.tsx           # page shell (centered 1280px container)
├── components/
│   ├── providers.tsx      # nests ThemeProvider and I18nProvider
│   ├── ui/
│   │   ├── weather-features.tsx  # main dashboard, data fetching, all cards
│   │   ├── i18n-provider.tsx     # EN/ES/FR dictionary + useI18n hook
│   │   ├── city-search.tsx       # geocoding autocomplete
│   │   ├── language-toggle.tsx   # language selector
│   │   ├── theme-toggle.tsx      # dark/light switcher
│   │   └── (shadcn primitives)
│   └── ...
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the
[Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)
from the creators of Next.js.

Check out the
[Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)
for more details.