import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

type Weather = {
  temperature: number;
  windspeed: number;
  weathercode: number;
};

const codeToText: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Foggy",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Showers",
  81: "Showers",
  82: "Heavy showers",
  95: "Thunderstorm",
};

function Index() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=47.6062&longitude=-122.3321&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph",
    )
      .then((r) => r.json())
      .then((d) => setWeather(d.current_weather))
      .catch(() => setError("Could not load weather"));
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-sm">
        <h1 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Seattle
        </h1>
        {error ? (
          <p className="mt-4 text-destructive">{error}</p>
        ) : !weather ? (
          <p className="mt-4 text-muted-foreground">Loading…</p>
        ) : (
          <>
            <p className="mt-2 text-6xl font-semibold">
              {Math.round(weather.temperature)}°F
            </p>
            <p className="mt-2 text-lg text-muted-foreground">
              {codeToText[weather.weathercode] ?? "—"}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Wind {Math.round(weather.windspeed)} mph
            </p>
          </>
        )}
      </div>
    </main>
  );
}
