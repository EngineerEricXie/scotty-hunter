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
  luresRef.current = lureBuildingIds;
  onClickRef.current = onClick;

  useEffect(() => {
    const name = loadScotty().name || "Scotty";
    const el = createElement(name);
    const img = el.querySelector("img");
    const onPress = (event: Event) => {
      event.stopPropagation();
      onClickRef.current?.();
    };
    el.addEventListener("click", onPress);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const machine = createWanderMachine({
      now: performance.now(),
      lureBuildingIds: () => luresRef.current,
    });
    const first = machine.tick(performance.now(), 0);
    const marker = new Marker({ element: el, anchor: "bottom", pitchAlignment: "viewport" })
      .setLngLat([first.point.longitude, first.point.latitude])
      .addTo(map);
    marker.setOffset([0, 2]);

    let facing: ScottyFacing = first.facing;
    if (img) img.src = SCOTTY_MAP_SPRITES[facing];

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const snap = machine.tick(now, reduced ? 0 : now - last);
      last = now;
      marker.setLngLat([snap.point.longitude, snap.point.latitude]);
      el.dataset.walking = !reduced && snap.walking ? "true" : "false";
      if (img && snap.facing !== facing) {
        facing = snap.facing;
        img.src = SCOTTY_MAP_SPRITES[facing];
      }
      raf = window.requestAnimationFrame(frame);
    };
    if (!reduced) raf = window.requestAnimationFrame(frame);

    const unsub = onScottyChange(() => {
      const next = loadScotty().name || "Scotty";
      el.setAttribute("aria-label", `${next} wandering campus`);
    });

    return () => {
      window.cancelAnimationFrame(raf);
      unsub();
      el.removeEventListener("click", onPress);
      marker.remove();
    };
  }, [map]);

  return null;
}
