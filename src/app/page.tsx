import { WeatherFeatures } from "@/components/ui/weather-features";

export default function Home() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="mx-auto w-full max-w-[80rem] px-4 py-10 sm:px-6">
        <WeatherFeatures />
      </div>
    </main>
  );
}