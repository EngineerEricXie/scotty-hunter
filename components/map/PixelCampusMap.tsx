"use client";

import { useMemo, useRef, useState } from "react";
import type { Event } from "@/lib/types";
import { campusBuildings, PIXEL_WORLD, pixelStyle, projectBuilding } from "@/lib/maps/pixel-campus";
import { foodEmoji, markerHour } from "@/lib/food-ui";
import { isNowGoing } from "@/lib/scotty/state";

export function PixelCampusMap({
  events,
  selectedId,
  onSelect,
}: {
  events: Event[];
  selectedId: string | null;
  onSelect: (event: Event) => void;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [cam, setCam] = useState({ x: -40, y: -40, scale: 0.78 });

  const byBuilding = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const event of events) {
      if (!event.building_id) continue;
      const list = map.get(event.building_id) ?? [];
      list.push(event);
      map.set(event.building_id, list);
    }
    return map;
  }, [events]);

  function pointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: cam.x, oy: cam.y };
  }

  function pointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setCam((prev) => ({
      ...prev,
      x: drag.current!.ox + (e.clientX - drag.current!.x),
      y: drag.current!.oy + (e.clientY - drag.current!.y),
    }));
  }

  function pointerUp() {
    drag.current = null;
  }

  function zoom(delta: number) {
    setCam((prev) => ({
      ...prev,
      scale: Math.min(1.8, Math.max(0.72, prev.scale + delta)),
    }));
  }

  return (
    <div
      ref={frameRef}
      className="absolute inset-0 overflow-hidden bg-sky"
      role="application"
      aria-label="Pixel Carnegie Mellon campus map"
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onWheel={(e) => zoom(e.deltaY > 0 ? -0.08 : 0.08)}
    >
      <div
        className="campus-world absolute origin-top-left"
        style={{
          width: PIXEL_WORLD.width,
          height: PIXEL_WORLD.height,
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`,
        }}
      >
        <div className="absolute left-[18%] top-[38%] h-[8%] w-[58%] bg-path" />
        <div className="absolute left-[8%] top-[18%] h-[70%] w-[7%] bg-[#6d6a66]" />
        <div className="absolute left-[6%] top-[86%] h-[7%] w-[88%] bg-[#6d6a66]" />
        <div className="absolute left-[36%] top-[48%] h-[3%] w-[28%] bg-[#c41230]" />
        <p className="hud absolute left-[40%] top-[46%] text-[9px] text-white">THE FENCE</p>
        <p className="hud absolute left-[10%] top-[48%] rotate-90 text-[8px] text-white/80">
          MOREWOOD
        </p>
        <p className="hud absolute left-[38%] top-[88%] text-[8px] text-white/80">FORBES AVE</p>
        <p className="hud absolute left-[42%] top-[40%] text-[8px] text-[#fff4d6]">THE CUT</p>
        <div className="absolute left-[8%] top-[4%] border-4 border-dashed border-ink bg-[#d9b07a] px-2 py-1">
          <p className="hud text-[8px]">OFF CAMPUS</p>
        </div>
        <div className="absolute left-[52%] top-[34%] h-8 w-24 border-4 border-ink bg-tartan">
          <p className="hud pt-1 text-center text-[8px] text-gold">HACKCMU</p>
        </div>

        {campusBuildings().map((building) => {
          const pos = projectBuilding(building);
          const style = pixelStyle(building.id);
          const hosted = byBuilding.get(building.id) ?? [];
          const selected = hosted.some((event) => event.id === selectedId);
          const going = hosted.some((event) => isNowGoing(event.id));
          const left = (pos.x / 100) * PIXEL_WORLD.width - style.w / 2;
          const top = (pos.y / 100) * PIXEL_WORLD.height - style.h / 2;
          return (
            <div
              key={building.id}
              className="absolute"
              style={{ left, top, width: style.w, height: style.h + 16 }}
            >
              <div
                className="absolute -top-3 left-1/2 h-3 w-[86%] -translate-x-1/2 border-4 border-ink"
                style={{ background: style.roof }}
              />
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => hosted[0] && onSelect(hosted[0])}
                className={`absolute inset-x-0 top-0 grid place-items-end border-4 border-ink ${
                  selected ? "outline outline-4 outline-gold" : ""
                }`}
                style={{ height: style.h, background: style.fill }}
                aria-label={building.name}
              >
                <span className="hud w-full bg-ink/80 py-0.5 text-center text-[8px] text-gold">
                  {style.label}
                </span>
              </button>
              {going && (
                <div className="pixel-flag absolute -right-10 -top-4 border-4 border-ink bg-tartan px-1">
                  <p className="hud now-going text-[7px] text-gold">NOW GOING</p>
                </div>
              )}
              <div className="absolute left-1/2 top-full flex -translate-x-1/2 flex-col items-center gap-1 pt-1">
                {hosted.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onSelect(event)}
                    className="food-marker whitespace-nowrap"
                    data-status={event.food_status}
                    data-selected={event.id === selectedId ? "true" : "false"}
                    data-going={isNowGoing(event.id) ? "true" : "false"}
                    aria-label={`${event.title} at ${building.short_name}`}
                  >
                    <span aria-hidden>{foodEmoji(event)}</span>
                    <span className="hour">{markerHour(event.start_time)}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pointer-events-auto absolute right-3 top-[42%] z-10 flex flex-col gap-2">
        <button type="button" className="pixel-btn h-10 w-10 bg-card" onClick={() => zoom(0.12)} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="pixel-btn h-10 w-10 bg-card" onClick={() => zoom(-0.12)} aria-label="Zoom out">
          −
        </button>
      </div>
    </div>
  );
}
