"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

export type Language = "en" | "es" | "fr";

export type Translate = (
  key: string,
  vars?: Record<string, string | number>
) => string;

const LOCALES: Record<Language, string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
};

export const COMPASS_ROSE: Record<Language, string[]> = {
  en: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"],
  es: ["N", "NE", "E", "SE", "S", "SO", "O", "NO"],
  fr: ["N", "NE", "E", "SE", "S", "SO", "O", "NO"],
};

const STORAGE_KEY = "i18n-lang";
const LANGUAGES: Language[] = ["en", "es", "fr"];

const en = {
  "app.title": "Weather Dashboard",
  "app.subtitle": "Real-time conditions, a 7-day forecast and safety alerts.",
  "app.myLocation": "My Location",
  "app.refresh": "Refresh",
  "app.searchPlaceholder": "Search country or city...",
  "app.searchAria": "Search for a city",
  "app.unknown": "Unknown",
  "lang.label": "Language",
  "day.today": "Today",
  "weather.clear": "Clear Sky",
  "weather.partlyCloudy": "Partly Cloudy",
  "weather.cloudy": "Overcast",
  "weather.fog": "Fog",
  "weather.drizzle": "Light Drizzle",
  "weather.rain": "Rain",
  "weather.snow": "Snow",
  "weather.storm": "Thunderstorm",
  "current.updatedAt": "Updated at {time}",
  "current.liveData": "Live data",
  "current.rainChance": "{value}% rain",
  "current.highLow": "High {high}° · Low {low}°",
  "current.feelsLike": "Feels like {value}°",
  "current.humidity": "Humidity",
  "current.pressure": "Pressure",
  "current.uvIndex": "UV Index",
  "current.precipitation": "Precipitation",
  "windAir.title": "Wind & Air Quality",
  "windAir.aqiSubtitle": "European AQI",
  "windAir.conditionsSubtitle": "Current conditions",
  "windAir.wind": "Wind",
  "windAir.windSpeed": "Wind Speed",
  "windAir.aqi": "AQI",
  "windAir.from": "From {deg}°",
  "aqi.good": "Good",
  "aqi.fair": "Fair",
  "aqi.moderate": "Moderate",
  "aqi.poor": "Poor",
  "aqi.veryPoor": "Very Poor",
  "weekly.title": "Weekly Forecast",
  "weekly.next": "Next {count} days",
  "weekly.trend": "High temperature trend",
  "alerts.title": "Weather Alerts",
  "alerts.active": "{count} active",
  "alerts.nominal": "All systems nominal",
  "alerts.allClear": "All Clear",
  "alerts.none": "No active weather alerts for this location.",
  "alert.severeThunderstorm": "Severe Thunderstorm",
  "alert.severeThunderstormDesc":
    "Lightning and heavy rain are likely. Stay indoors and avoid open areas.",
  "alert.windAdvisory": "High Wind Advisory",
  "alert.windAdvisoryDesc":
    "Winds of {value} km/h may cause travel disruptions.",
  "alert.breezy": "Breezy Conditions",
  "alert.breezyDesc":
    "Moderate winds around {value} km/h are expected today.",
  "alert.winter": "Winter Weather",
  "alert.winterDesc":
    "Snowfall may reduce visibility and make roads slippery.",
  "alert.fog": "Low Visibility",
  "alert.fogDesc": "Fog may reduce visibility. Drive with extra caution.",
  "alert.heat": "Heat Advisory",
  "alert.heatDesc":
    "Extreme heat is expected. Stay hydrated and limit sun exposure.",
  "alert.cold": "Extreme Cold",
  "alert.coldDesc":
    "Very cold conditions. Dress warmly and limit time outdoors.",
  "alert.rainLikely": "Rain Likely",
  "alert.rainLikelyDesc":
    "There is a {value}% chance of precipitation today.",
  "alert.airQuality": "Air Quality Concern",
  "alert.airQualityDesc":
    "Pollution levels are elevated. Limit prolonged outdoor activity.",
  "error.title": "Unable to load weather data",
  "error.retry": "Try Again",
  "error.generic": "Something went wrong while fetching weather data.",
  "error.serviceUnavailable": "Weather service unavailable. Please try again.",
  "error.apiKey": "Could not reach the weather service. Check your API key.",
  "error.geoUnsupported": "Geolocation is not supported by this browser.",
  "error.geoDenied": "Location access was denied. Pick a city from the list instead.",
  "error.geoUnavailable":
    "Location is currently unavailable. Please try again in a moment.",
  "error.geoGeneric": "Could not determine your location. Please try again.",
  "chart.ariaTrend": "Temperature trend chart",
  "theme.toggleLight": "Switch to light mode",
  "theme.toggleDark": "Switch to dark mode",
} as const;

type MessageKey = keyof typeof en;

const es: Record<MessageKey, string> = {
  "app.title": "Panel del Clima",
  "app.subtitle":
    "Condiciones en tiempo real, pronóstico de 7 días y alertas de seguridad.",
  "app.myLocation": "Mi Ubicación",
  "app.refresh": "Actualizar",
  "app.searchPlaceholder": "Buscar país o ciudad...",
  "app.searchAria": "Buscar una ciudad",
  "app.unknown": "Desconocido",
  "lang.label": "Idioma",
  "day.today": "Hoy",
  "weather.clear": "Despejado",
  "weather.partlyCloudy": "Parcialmente Nublado",
  "weather.cloudy": "Nublado",
  "weather.fog": "Niebla",
  "weather.drizzle": "Llovizna",
  "weather.rain": "Lluvia",
  "weather.snow": "Nieve",
  "weather.storm": "Tormenta",
  "current.updatedAt": "Actualizado a las {time}",
  "current.liveData": "Datos en vivo",
  "current.rainChance": "{value}% de lluvia",
  "current.highLow": "Máx {high}° · Mín {low}°",
  "current.feelsLike": "Sensación de {value}°",
  "current.humidity": "Humedad",
  "current.pressure": "Presión",
  "current.uvIndex": "Índice UV",
  "current.precipitation": "Precipitación",
  "windAir.title": "Viento y Calidad del Aire",
  "windAir.aqiSubtitle": "ICA Europeo",
  "windAir.conditionsSubtitle": "Condiciones actuales",
  "windAir.wind": "Viento",
  "windAir.windSpeed": "Velocidad del Viento",
  "windAir.aqi": "ICA",
  "windAir.from": "Desde {deg}°",
  "aqi.good": "Buena",
  "aqi.fair": "Aceptable",
  "aqi.moderate": "Moderada",
  "aqi.poor": "Mala",
  "aqi.veryPoor": "Muy mala",
  "weekly.title": "Pronóstico Semanal",
  "weekly.next": "Próximos {count} días",
  "weekly.trend": "Tendencia de temperaturas máximas",
  "alerts.title": "Alertas Meteorológicas",
  "alerts.active": "{count} activas",
  "alerts.nominal": "Todo en orden",
  "alerts.allClear": "Todo despejado",
  "alerts.none":
    "No hay alertas meteorológicas activas para esta ubicación.",
  "alert.severeThunderstorm": "Tormenta Severa",
  "alert.severeThunderstormDesc":
    "Es probable que haya rayos y lluvias intensas. Quédate en casa y evita zonas abiertas.",
  "alert.windAdvisory": "Aviso de Viento Fuerte",
  "alert.windAdvisoryDesc":
    "Vientos de {value} km/h pueden causar interrupciones en los viajes.",
  "alert.breezy": "Condiciones Ventosas",
  "alert.breezyDesc":
    "Se esperan vientos moderados de alrededor de {value} km/h hoy.",
  "alert.winter": "Clima Invernal",
  "alert.winterDesc":
    "Las nevadas pueden reducir la visibilidad y hacer resbaladizas las carreteras.",
  "alert.fog": "Baja Visibilidad",
  "alert.fogDesc":
    "La niebla puede reducir la visibilidad. Conduce con precaución extra.",
  "alert.heat": "Aviso de Calor",
  "alert.heatDesc":
    "Se espera calor extremo. Mantente hidratado y limita la exposición al sol.",
  "alert.cold": "Frío Extremo",
  "alert.coldDesc":
    "Condiciones de mucho frío. Abrígate bien y limita el tiempo al aire libre.",
  "alert.rainLikely": "Lluvia Probable",
  "alert.rainLikelyDesc":
    "Hay un {value}% de probabilidad de precipitaciones hoy.",
  "alert.airQuality": "Preocupación por la Calidad del Aire",
  "alert.airQualityDesc":
    "Los niveles de contaminación están elevados. Limita la actividad prolongada al aire libre.",
  "error.title": "No se pudieron cargar los datos del clima",
  "error.retry": "Reintentar",
  "error.generic": "Algo salió mal al obtener los datos del clima.",
  "error.serviceUnavailable":
    "El servicio del clima no está disponible. Inténtalo de nuevo.",
  "error.apiKey":
    "No se pudo conectar con el servicio del clima. Revisa la clave de API.",
  "error.geoUnsupported": "Este navegador no admite la geolocalización.",
  "error.geoDenied":
    "Se denegó el acceso a la ubicación. Elige una ciudad de la lista.",
  "error.geoUnavailable":
    "La ubicación no está disponible en este momento. Inténtalo en un momento.",
  "error.geoGeneric": "No se pudo determinar tu ubicación. Inténtalo de nuevo.",
  "chart.ariaTrend": "Gráfico de tendencia de temperaturas",
  "theme.toggleLight": "Cambiar a modo claro",
  "theme.toggleDark": "Cambiar a modo oscuro",
};

const fr: Record<MessageKey, string> = {
  "app.title": "Tableau de Bord Météo",
  "app.subtitle":
    "Conditions en temps réel, prévisions sur 7 jours et alertes de sécurité.",
  "app.myLocation": "Ma Position",
  "app.refresh": "Actualiser",
  "app.searchPlaceholder": "Rechercher un pays ou une ville...",
  "app.searchAria": "Rechercher une ville",
  "app.unknown": "Inconnu",
  "lang.label": "Langue",
  "day.today": "Aujourd'hui",
  "weather.clear": "Ciel Dégagé",
  "weather.partlyCloudy": "Partiellement Nuageux",
  "weather.cloudy": "Couvert",
  "weather.fog": "Brouillard",
  "weather.drizzle": "Bruine",
  "weather.rain": "Pluie",
  "weather.snow": "Neige",
  "weather.storm": "Orage",
  "current.updatedAt": "Mis à jour à {time}",
  "current.liveData": "Données en direct",
  "current.rainChance": "{value}% de pluie",
  "current.highLow": "Max {high}° · Min {low}°",
  "current.feelsLike": "Ressenti {value}°",
  "current.humidity": "Humidité",
  "current.pressure": "Pression",
  "current.uvIndex": "Indice UV",
  "current.precipitation": "Précipitations",
  "windAir.title": "Vent et Qualité de l'Air",
  "windAir.aqiSubtitle": "IQA Européen",
  "windAir.conditionsSubtitle": "Conditions actuelles",
  "windAir.wind": "Vent",
  "windAir.windSpeed": "Vitesse du Vent",
  "windAir.aqi": "IQA",
  "windAir.from": "Depuis {deg}°",
  "aqi.good": "Bon",
  "aqi.fair": "Correct",
  "aqi.moderate": "Modéré",
  "aqi.poor": "Mauvais",
  "aqi.veryPoor": "Très mauvais",
  "weekly.title": "Prévisions Hebdomadaires",
  "weekly.next": "Prochains {count} jours",
  "weekly.trend": "Tendance des températures maximales",
  "alerts.title": "Alertes Météo",
  "alerts.active": "{count} actives",
  "alerts.nominal": "Tout est nominal",
  "alerts.allClear": "Rien à Signal",
  "alerts.none": "Aucune alerte météo active pour cet emplacement.",
  "alert.severeThunderstorm": "Orage Violent",
  "alert.severeThunderstormDesc":
    "Foudre et fortes pluies probables. Restez à l'intérieur et évitez les zones ouvertes.",
  "alert.windAdvisory": "Avis de Vent Fort",
  "alert.windAdvisoryDesc":
    "Des vents de {value} km/h peuvent perturber les déplacements.",
  "alert.breezy": "Conditions Venteuses",
  "alert.breezyDesc":
    "Des vents modérés d'environ {value} km/h sont attendus aujourd'hui.",
  "alert.winter": "Conditions Hivernales",
  "alert.winterDesc":
    "Les chutes de neige peuvent réduire la visibilité et rendre les routes glissantes.",
  "alert.fog": "Visibilité Réduite",
  "alert.fogDesc":
    "Le brouillard peut réduire la visibilité. Conduisez avec prudence.",
  "alert.heat": "Avis de Chaleur",
  "alert.heatDesc":
    "Une chaleur extrême est attendue. Restez hydraté et limitez l'exposition au soleil.",
  "alert.cold": "Froid Extrême",
  "alert.coldDesc":
    "Conditions très froides. Habillez-vous chaudement et limitez le temps passé dehors.",
  "alert.rainLikely": "Pluie Probable",
  "alert.rainLikelyDesc":
    "Il y a {value}% de risque de précipitations aujourd'hui.",
  "alert.airQuality": "Qualité de l'Air Détériorée",
  "alert.airQualityDesc":
    "Les niveaux de pollution sont élevés. Limitez les activités prolongées en extérieur.",
  "error.title": "Impossible de charger les données météo",
  "error.retry": "Réessayer",
  "error.generic": "Une erreur est survenue lors du chargement des données météo.",
  "error.serviceUnavailable":
    "Le service météo est indisponible. Veuillez réessayer.",
  "error.apiKey":
    "Impossible de contacter le service météo. Vérifiez votre clé API.",
  "error.geoUnsupported":
    "Ce navigateur ne prend pas en charge la géolocalisation.",
  "error.geoDenied":
    "L'accès à la position a été refusé. Choisissez une ville dans la liste.",
  "error.geoUnavailable":
    "La position est actuellement indisponible. Veuillez réessayer dans un instant.",
  "error.geoGeneric":
    "Impossible de déterminer votre position. Veuillez réessayer.",
  "chart.ariaTrend": "Graphique de tendance des températures",
  "theme.toggleLight": "Passer en mode clair",
  "theme.toggleDark": "Passer en mode sombre",
};

const DICTIONARY: Record<Language, Record<MessageKey, string>> = { en, es, fr };

type I18nContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  locale: string;
  t: Translate;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && LANGUAGES.includes(stored as Language)) {
        setLangState(stored as Language);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = LOCALES[lang];
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage may be unavailable (e.g. private mode)
    }
  }, []);

  const t = useCallback<Translate>(
    (key, vars) => {
      const fallback = DICTIONARY.en as Record<string, string>;
      const dict = DICTIONARY[lang] as Record<string, string>;
      let text = dict[key] ?? fallback[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.split(`{${name}}`).join(String(value));
        }
      }
      return text;
    },
    [lang]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ lang, setLang, locale: LOCALES[lang], t }),
    [lang, setLang, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}