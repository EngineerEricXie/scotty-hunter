"use client";

import { Map, CalendarDays, Dog, ListChecks } from "lucide-react";
import { useRouter } from "next/navigation";

const ITEMS = [
  { id: "map", href: "/", label: "Explore", icon: Map },
  { id: "plan", href: "/?panel=plan", label: "My plan", icon: CalendarDays },
  { id: "scotty", href: "/?panel=scotty", label: "Scotty", icon: Dog },
  { id: "quest", href: "/?panel=quest", label: "To-dos", icon: ListChecks },
] as const;

export function BottomNav({
  current,
  contained,
  onSelectMap,
  onSelectPlan,
  onSelectScotty,
  onSelectQuest,
}: {
  current: string;
  contained?: boolean;
  onSelectMap?: () => void;
  onSelectPlan?: () => void;
  onSelectScotty?: () => void;
  onSelectQuest?: () => void;
}) {
  const router = useRouter();

  return (
    <nav
      aria-label="Primary"
      className={`app-navigation ${contained ? "is-contained" : "is-fixed"}`}
    >
      <div className="navigation-inner">
        {ITEMS.map((item) => {
          const active =
            item.id === "plan"
              ? current === "/plan" || current === "/?panel=plan"
              : item.id === "quest"
                ? current === "/todos" || current === "/?panel=quest"
                : current === item.href ||
                  (item.id === "scotty" &&
                    (current === "/scotty" || current === "/profile"));
          const className = `navigation-item ${active ? "is-active" : ""}`;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? "page" : undefined}
              className={className}
              onClick={() => {
                if (item.id === "map") {
                  if (onSelectMap) onSelectMap();
                  else router.push("/");
                  return;
                }
                if (item.id === "plan") {
                  if (onSelectPlan) onSelectPlan();
                  else router.push("/?panel=plan");
                  return;
                }
                if (item.id === "scotty") {
                  if (onSelectScotty) onSelectScotty();
                  else router.push("/?panel=scotty");
                  return;
                }
                if (onSelectQuest) onSelectQuest();
                else router.push("/?panel=quest");
              }}
            >
              <Icon size={21} strokeWidth={active ? 2.3 : 1.7} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
