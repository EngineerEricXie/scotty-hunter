"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/States";

const ProfileExperience = dynamic(
  () =>
    import("@/components/profile/ProfileExperience").then(
      (mod) => mod.ProfileExperience,
    ),
  { ssr: false, loading: () => <LoadingState label="Loading profile…" /> },
);

export default function ProfilePage() {
  return <ProfileExperience />;
}
