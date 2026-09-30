"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Globe2, Map as MapIcon, Compass } from "lucide-react";
import { BUILDINGS } from "@/lib/maps/buildings";
import { foodEmoji, markerHour } from "@/lib/food-ui";
import { projectBuilding, projectCampus } from "@/lib/maps/pixel-campus";
import { ScottySprite } from "@/components/pet/ScottySprite";
import type { Event } from "@/lib/types";
import type { MealRouteStop } from "@/lib/maps/meal-route";

const GeographicMap = dynamic(() => import("./CampusMap").then((m) => m.CampusMap), {
  ssr: false,
});
interface Props {
  events: Event[];
  selectedId: string | null;
  plannedIds?: string[];
  showRoute?: boolean;
  routeStops?: MealRouteStop[];
  goingEventIds?: string[];
  onOpen: (events: Event[]) => void;
  onScottyClick?: () => void;
}
export function DiscoveryMap(props: Props) {
  const [geographic, setGeographic] = useState(false);
  const clusters = useMemo(() => {
    const grouped = new Map<string, Event[]>();
    for (const event of props.events) {
      const key = event.building_id ?? "unknown";
      grouped.set(key, [...(grouped.get(key) ?? []), event]);
    }
    return [...grouped.entries()]
      .map(([id, events]) => ({ building: BUILDINGS.find((b) => b.id === id), events }))
      .filter((group) => group.building);
  }, [props.events]);
  const route = (props.routeStops ?? [])
    .map((stop) => {
      const p = projectCampus(stop.latitude, stop.longitude);
      return `${p.x * 10},${p.y * 10}`;
    })
    .join(" ");
  return (
    <div className="discovery-map" aria-label="Campus food map">
      {geographic ? (
        <GeographicMap {...props} />
      ) : (
        <div className="illustrated-map">
          <svg
            className="campus-illustration"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="map-grain"
                width="22"
                height="22"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="2" cy="3" r=".7" fill="#859c75" opacity=".15" />
              </pattern>
            </defs>
            <rect width="1000" height="1000" fill="#e9ecdf" />
            <rect width="1000" height="1000" fill="url(#map-grain)" />
            <path
              d="M105 -40 L200 225 L155 490 L210 800 L260 1050 M0 747 Q350 715 550 815 T1080 855 M590 -30 L680 255 L930 550"
              fill="none"
              stroke="#d4d9ca"
              strokeWidth="66"
            />
            <path
              d="M105 -40 L200 225 L155 490 L210 800 L260 1050 M0 747 Q350 715 550 815 T1080 855 M590 -30 L680 255 L930 550"
              fill="none"
              stroke="#faf9f1"
              strokeWidth="48"
            />
            <path
              d="M215 490 Q440 425 600 510 L800 630 M430 310 L470 775 M740 435 L610 800"
              fill="none"
              stroke="#fbfaf4"
              strokeWidth="19"
            />
            <path
              d="M492 477 Q576 431 645 503 L667 700 Q560 728 508 661 Z"
              fill="#cbd9b2"
              stroke="#becfa4"
              strokeWidth="2"
            />
            <path d="M272 525 L397 533 L410 662 L273 652 Z" fill="#d2ddbb" />
            <ellipse cx="826" cy="225" rx="125" ry="83" fill="#d0dcba" />
            <ellipse cx="875" cy="715" rx="82" ry="93" fill="#d5dfc1" />
            {Array.from({ length: 34 }, (_, i) => {
              const x = 60 + ((i * 137) % 870),
                y = 130 + ((i * 211) % 690);
              return (
                <g key={i}>
                  <ellipse
                    cx={x + 2}
                    cy={y + 6}
                    rx="10"
                    ry="10"
                    fill="#a9bc98"
                    opacity=".23"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={8 + (i % 5)}
                    fill={i % 2 ? "#b1c49b" : "#becfa8"}
                  />
                </g>
              );
            })}
            <text
              x="567"
              y="590"
              textAnchor="middle"
              fill="#899b73"
              fontSize="15"
              letterSpacing="5"
              fontWeight="700"
              transform="rotate(8 567 590)"
            >
              THE CUT
            </text>
            <text
              x="538"
              y="820"
              fill="#a6aa9b"
              fontSize="12"
              letterSpacing="4"
              transform="rotate(13 538 820)"
            >
              FORBES AVENUE
            </text>
            {BUILDINGS.filter((b) => !b.off_campus).map((b, i) => {
              const p = projectBuilding(b);
              const w = Math.min(90, (b.footprint_width_m ?? 60) * 0.9),
                h = Math.min(62, (b.footprint_height_m ?? 50) * 0.7);
              return (
                <g key={b.id} transform={`translate(${p.x * 10} ${p.y * 10})`}>
                  <rect
                    x={-w / 2 + 4}
                    y={-h / 2 + 6}
                    width={w}
                    height={h}
                    rx="5"
                    fill="#acb7a3"
                    opacity=".25"
                  />
                  <rect
                    x={-w / 2}
                    y={-h / 2}
                    width={w}
                    height={h}
                    rx="5"
                    fill={i % 3 === 0 ? "#d8ccb6" : "#dfd9c8"}
                    stroke="#b9b6a3"
                    strokeWidth="1.2"
                  />
                  <rect
                    x={-w / 2 + 7}
                    y={-h / 2 + 6}
                    width={w - 14}
                    height={h - 12}
                    rx="2"
                    fill="none"
                    stroke="#b6b09a"
                    strokeWidth="1"
                    opacity=".45"
                  />
                  <text
                    y={h / 2 + 19}
                    textAnchor="middle"
                    fill="#8a8b79"
                    fontSize="11"
                    fontWeight="650"
                  >
                    {b.short_name}
                  </text>
                </g>
              );
            })}
            {props.showRoute && route && (
              <polyline
                points={route}
                fill="none"
                stroke="#b83e2d"
                strokeWidth="4"
                strokeDasharray="8 7"
                strokeLinecap="round"
              />
            )}
          </svg>
          {clusters.map(({ building, events }) => {
            if (!building) return null;
            const point = projectBuilding(building);
            const selected = events.some((e) => e.id === props.selectedId);
            const planned = events.some((e) => props.plannedIds?.includes(e.id));
            return (
              <button
                key={building.id}
                className={`illustrated-pin ${selected ? "is-selected" : ""} ${planned ? "is-planned" : ""}`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                onClick={() => props.onOpen(events)}
                aria-label={`${events.length} food event${events.length === 1 ? "" : "s"} at ${building.name}, ${events[0].title}`}
              >
                <span className="pin-food" aria-hidden="true">
                  {foodEmoji(events[0])}
                </span>
                <span className="pin-info">
                  <strong>{markerHour(events[0].start_time)}</strong>
                  <small>
                    {events.length > 1
                      ? `${events.length} bites here`
                      : building.short_name}
                  </small>
                </span>
                {events.length > 1 && <span className="pin-count">{events.length}</span>}
              </button>
            );
          })}
          <button
            className="map-scotty"
            onClick={props.onScottyClick}
            aria-label="Visit Scotty, your campus companion"
          >
            <ScottySprite mood="happy" action="idle" />
            <span>Your adventure buddy</span>
          </button>
          <div className="map-compass" aria-hidden="true">
            <Compass size={27} strokeWidth={1.2} />
            <span>N</span>
          </div>
          <p className="map-schematic-note">Illustrated campus · Approximate locations</p>
        </div>
      )}
      <button
        className="map-mode-toggle"
        onClick={() => setGeographic(!geographic)}
        aria-pressed={geographic}
      >
        {geographic ? <MapIcon size={14} /> : <Globe2 size={14} />}{" "}
        {geographic ? "Illustrated map" : "Street map"}
      </button>
    </div>
  );
}
