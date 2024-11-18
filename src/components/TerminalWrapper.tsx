"use client";

import dynamic from "next/dynamic";

// Dynamically import the Terminal component with SSR disabled
const Terminal = dynamic(
  () => import("./Terminal").then((mod) => mod.TerminalPanel),
  { ssr: false }
);

export function TerminalWrapper() {
  return <Terminal />;
}
