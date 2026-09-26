import "server-only";
import { GeoPoint } from "@/lib/enrichment/geoapify";

interface DailyWeather {
  date: string;
  minC: number;
  maxC: number;
  precipMm: number;
}

interface OpenMeteoDailyResponse {
  daily: {
    time: string[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    precipitation_sum: number[];
  };
}

const FORECAST_HORIZON_DAYS = 16;

function daysFromToday(dateStr: string): number {
  const diffMs = new Date(dateStr).getTime() - Date.now();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function shiftYear(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function parseDaily(json: OpenMeteoDailyResponse): DailyWeather[] {
  return json.daily.time.map((date, i) => ({
    date,
    minC: json.daily.temperature_2m_min[i],
    maxC: json.daily.temperature_2m_max[i],
    precipMm: json.daily.precipitation_sum[i],
  }));
}

// Open-Meteo's forecast only covers ~16 days ahead, but trips are usually
// planned months out. For dates beyond the forecast horizon, we fall back
// to actual historical weather from the same calendar dates one year
// earlier as a "what it was like around this time" proxy - clearly
// distinct from a real forecast, which the caller should label as such.
export async function fetchWeather(
  point: GeoPoint,
  startDate: string,
  endDate: string
): Promise<{ days: DailyWeather[]; isForecast: boolean }> {
  const withinForecastHorizon = daysFromToday(startDate) <= FORECAST_HORIZON_DAYS;

  if (withinForecastHorizon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_min,temperature_2m_max,precipitation_sum&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo forecast failed: ${res.status}`);
    return { days: parseDaily(await res.json()), isForecast: true };
  }

  const historicalStart = shiftYear(startDate, -1);
  const historicalEnd = shiftYear(endDate, -1);
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${point.lat}&longitude=${point.lon}&start_date=${historicalStart}&end_date=${historicalEnd}&daily=temperature_2m_min,temperature_2m_max,precipitation_sum&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo archive failed: ${res.status}`);
  return { days: parseDaily(await res.json()), isForecast: false };
}
