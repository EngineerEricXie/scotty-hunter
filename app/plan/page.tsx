"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/States";

const PlannerExperience = dynamic(
  () =>
    import("@/components/planner/PlannerExperience").then(
      (mod) => mod.PlannerExperience,
    ),
  { ssr: false, loading: () => <LoadingState label="Opening planner…" /> },
);

export default function PlanPage() {
  return <PlannerExperience />;
}
