"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/ui/States";

function RedirectToPanel({ panel, label }: { panel: string; label: string }) {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const next = new URLSearchParams(params.toString());
    next.set("panel", panel);
    router.replace(`/?${next.toString()}`);
  }, [panel, params, router]);

  return <LoadingState label={label} />;
}

export function PanelRedirect({ panel, label }: { panel: string; label: string }) {
  return (
    <Suspense fallback={<LoadingState label={label} />}>
      <RedirectToPanel panel={panel} label={label} />
    </Suspense>
  );
}
