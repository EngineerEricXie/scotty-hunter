"use client";

import { useEffect, useRef } from "react";
import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import { loadScotty, onScottyChange } from "@/lib/scotty/state";
import {
  SCOTTY_MAP_SPRITES,
  createWanderMachine,
  type ScottyFacing,
} from "@/lib/scotty/wander";

function createElement(name: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "scotty-wanderer";
  button.title = "Campus companion animation";
  button.setAttribute("aria-label", `${name} wandering campus`);
  button.innerHTML = `<img alt="" class="pixel-sprite" src="${SCOTTY_MAP_SPRITES.south}" width="48" height="48" />`;
  return button;
}

export function ScottyWanderer({
  map,
  lureBuildingIds,
  onClick,
}: {
  map: MapLibreMap;
  lureBuildingIds: string[];
  onClick?: () => void;
}) {
  const luresRef = useRef(lureBuildingIds);
  const onClickRef = useRef(onClick);
  useEffect(() => {
    luresRef.current = lureBuildingIds;
    onClickRef.current = onClick;
  }, [lureBuildingIds, onClick]);

  useEffect(() => {
    const name = loadScotty().name || "Scotty";
    const el = createElement(name);
    const img = el.querySelector("img");
    const onPress = (event: Event) => {
      event.stopPropagation();
      onClickRef.current?.();
    };
    el.addEventListener("click", onPress);

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const machine = createWanderMachine({
      now: performance.now(),
      lureBuildingIds: () => luresRef.current,
    });
    const first = machine.tick(performance.now(), 0);
    const marker = new Marker({
      element: el,
      anchor: "bottom",
      pitchAlignment: "viewport",
    })
      .setLngLat([first.point.longitude, first.point.latitude])
      .addTo(map);
    marker.setOffset([0, 2]);

    let facing: ScottyFacing = first.facing;
    if (img) img.src = SCOTTY_MAP_SPRITES[facing];

    let raf: number | null = null;
    let last = performance.now();
    let disposed = false;
    const frame = (now: number) => {
      raf = null;
      if (disposed || motionPreference.matches || document.hidden) return;
      const snap = machine.tick(now, now - last);
      last = now;
      marker.setLngLat([snap.point.longitude, snap.point.latitude]);
      el.dataset.walking = snap.walking ? "true" : "false";
      if (img && snap.facing !== facing) {
        facing = snap.facing;
        img.src = SCOTTY_MAP_SPRITES[facing];
      }
      raf = window.requestAnimationFrame(frame);
    };
    const syncMotion = () => {
      if (raf !== null) window.cancelAnimationFrame(raf);
      raf = null;
      el.dataset.walking = "false";
      if (disposed || motionPreference.matches || document.hidden) return;
      last = performance.now();
      raf = window.requestAnimationFrame(frame);
    };
    motionPreference.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncMotion);
    syncMotion();

    const unsub = onScottyChange(() => {
      const next = loadScotty().name || "Scotty";
      el.setAttribute("aria-label", `${next} wandering campus`);
    });

    return () => {
      disposed = true;
      if (raf !== null) window.cancelAnimationFrame(raf);
      motionPreference.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncMotion);
      unsub();
      el.removeEventListener("click", onPress);
      marker.remove();
    };
  }, [map]);

  return null;
}
