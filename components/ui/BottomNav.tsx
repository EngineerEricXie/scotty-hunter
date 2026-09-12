"use client";

import { useRouter } from "next/navigation";

const ITEMS = [
  { id: "map", href: "/", label: "MAP", icon: "/icons/nav-map.png" },
  { id: "plan", href: "/?panel=plan", label: "PLAN", icon: "/icons/nav-plan.png" },
  { id: "scotty", href: "/?panel=scotty", label: "SCOTTY", icon: "/icons/nav-scotty.png" },
  { id: "quest", href: "/?panel=quest", label: "QUEST", icon: "/icons/nav-quest.png" },
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
      className={`pointer-events-auto inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-3 pb-[max(10px,env(safe-area-inset-bottom))] ${
        contained ? "absolute" : "fixed"
      }`}
    >
      <div className="pixel-panel flex items-stretch justify-around bg-card px-1 py-1">
        {ITEMS.map((item) => {
          const active =
            item.id === "plan"
              ? current === "/plan" || current === "/?panel=plan"
              : item.id === "quest"
                ? current === "/todos" || current === "/?panel=quest"
                : current === item.href ||
                  (item.id === "scotty" && (current === "/scotty" || current === "/profile"));
          const className = `flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 px-1.5 text-[11px] font-bold ${
            active ? "bg-ink text-gold" : "text-ink"
          }`;

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
              <img
                src={item.icon}
                alt=""
                aria-hidden
                className={`pixel-sprite h-7 w-7 ${active ? "brightness-110 contrast-125" : ""}`}
              />
              <span className="hud text-[8px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
