import Link from "next/link";

const ITEMS = [
  { href: "/", label: "MAP", glyph: "▣" },
  { href: "/plan", label: "PLAN", glyph: "▦" },
  { href: "/scotty", label: "SCOTTY", glyph: "▼" },
  { href: "/todos", label: "QUEST", glyph: "!" },
] as const;

export function BottomNav({ current }: { current: string }) {
  return (
    <nav
      aria-label="Primary"
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-3 pb-[max(10px,env(safe-area-inset-bottom))]"
    >
      <div className="pixel-panel flex items-stretch justify-around bg-card px-1 py-1">
        {ITEMS.map((item) => {
          const active = current === item.href || (item.href === "/scotty" && current === "/profile");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 px-2 text-[11px] font-bold ${
                active ? "bg-ink text-gold" : "text-ink"
              }`}
            >
              <span aria-hidden className="hud text-[10px] leading-none">
                {item.glyph}
              </span>
              <span className="hud text-[8px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
