import { createFileRoute } from "@tanstack/react-router";
import { RadarScreen } from "@/components/radar-screen";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <RadarScreen />;
}
