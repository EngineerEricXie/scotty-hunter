"use client";

const SRC = {
  idle: "/sprites/scotty-idle.png",
  eat: "/sprites/scotty-eat.png",
  hungry: "/sprites/scotty-hungry.png",
} as const;

export function ScottySprite({
  mood = "ok",
  action = "idle",
}: {
  mood?: "hungry" | "ok" | "happy" | "legendary";
  action?: "idle" | "eat" | "hungry";
}) {
  const src =
    action === "eat"
      ? SRC.eat
      : mood === "hungry" || action === "hungry"
        ? SRC.hungry
        : SRC.idle;
  const cls =
    action === "eat" ? "scotty-eat" : mood === "hungry" ? "scotty-hungry" : "scotty-idle";

  return (
    <div className={`${cls} overflow-hidden`} aria-hidden>
      <img
        src={src}
        alt=""
        className="pixel-sprite h-auto w-full origin-center scale-[1.28] object-cover"
      />
    </div>
  );
}
