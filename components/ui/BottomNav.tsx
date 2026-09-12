import Link from "next/link";
import { CalendarDays, Map, ListTodo, UserRound } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Map", icon: Map },
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/todos", label: "To-Dos", icon: ListTodo },
  { href: "/profile", label: "Me", icon: UserRound },
] as const;

export function BottomNav({ current }: { current: string }) {
  return (
    <nav
      aria-label="Primary"
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-3 pb-[max(12px,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around rounded-[22px] border border-line bg-white/92 px-2 py-2 shadow-[0_10px_40px_rgba(28,28,30,0.12)] backdrop-blur-md">
        {ITEMS.map((item) => {
          const active = current === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 min-w-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-1 text-[11px] font-semibold ${
                active ? "text-tartan" : "text-muted"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
