import { createFileRoute } from "@tanstack/react-router";
import { RickApp } from "@/components/rick/app-shell";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <RickApp />;
}
