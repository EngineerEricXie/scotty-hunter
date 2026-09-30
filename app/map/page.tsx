import { Suspense } from "react";
import { MapExperience } from "@/components/map/MapExperience";

export default function MapPage() {
  return <Suspense fallback={<div className="h-dvh bg-canvas" />}><MapExperience /></Suspense>;
}
