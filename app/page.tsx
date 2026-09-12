import { Suspense } from "react";
import { MapExperience } from "@/components/map/MapExperience";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-canvas" />}>
      <MapExperience />
    </Suspense>
  );
}
