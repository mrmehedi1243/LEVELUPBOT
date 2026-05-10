import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

const LevelUpApp = lazy(() => import("@/levelup/App"));

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "GS Level Up Bot" },
      { name: "description", content: "Free Fire Level Up Bot Dashboard" },
    ],
  }),
});

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gaming-dark text-gaming-neon font-mono">
        Loading...
      </div>
    );
  }
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gaming-dark text-gaming-neon font-mono">
          Loading...
        </div>
      }
    >
      <LevelUpApp />
    </Suspense>
  );
}
