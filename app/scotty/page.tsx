"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/States";

const ScottyExperience = dynamic(
  () =>
    import("@/components/pet/ScottyExperience").then((mod) => mod.ScottyExperience),
  { ssr: false, loading: () => <LoadingState label="Waking Scotty…" /> },
);

export default function ScottyPage() {
  return <ScottyExperience />;
}
