import { createFileRoute } from "@tanstack/react-router";
import { EchoApp } from "@/components/editor/echo-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <EchoApp />;
}
