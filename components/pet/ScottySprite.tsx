"use client";

const PALETTE: Record<string, string> = {
  ".": "transparent",
  K: "#1b1224",
  B: "#8a5a32",
  C: "#f3e0c4",
  R: "#d62839",
  N: "#2b1a12",
  W: "#fff4d6",
  G: "#f4d03f",
  P: "#c48a6a",
};

const IDLE = [
  "....KKKKKK....",
  "...KBBBBBBK...",
  "..KBBWBBWBBK..",
  "..KBKBBBBKBK..",
  "...KBBPPBBK...",
  "....KBBBBK....",
  "...KCRRRRCK...",
  "..KC BBBB CK..",
  "..K CCCCC K...",
  "...KBBBBBK....",
  "...KBK..KBK...",
  "...KK....KK...",
];

const EAT = [
  "....KKKKKK....",
  "...KBBBBBBK...",
  "..KBBWBBWBBK..",
  "..KBKBBBBKBK..",
  "...KBBNNBBK...",
  "....KBBBBK....",
  "...KCRRRRCK...",
  "..KC BBBB CK..",
  ".KK CCCCC KK..",
  "...KBBBBBK....",
  "..KKBK..KBKK..",
  "...KK....KK...",
];

const HUNGRY = [
  "....KKKKKK....",
  "...KBBBBBBK...",
  "..KB.WBBW.BK..",
  "..KBKBBBBKBK..",
  "...KBBPPBBK...",
  "....KBBBBK....",
  "...KCRRRRCK...",
  "..KC BBBB CK..",
  "..K CCCCC K...",
  "...KBBBBBK....",
  "..KBK....KBK..",
  "..KK......KK..",
];

export function ScottySprite({
  mood = "ok",
  action = "idle",
}: {
  mood?: "hungry" | "ok" | "happy" | "legendary";
  action?: "idle" | "eat" | "hungry";
}) {
  const rows = action === "eat" ? EAT : mood === "hungry" || action === "hungry" ? HUNGRY : IDLE;
  const cls =
    action === "eat" ? "scotty-eat" : mood === "hungry" ? "scotty-hungry" : "scotty-idle";

  return (
    <div className={cls} aria-hidden>
      <svg
        viewBox={`0 0 ${rows[0].length} ${rows.length}`}
        className="h-auto w-full"
        shapeRendering="crispEdges"
        role="img"
      >
        <title>Scotty the pixel terrier</title>
        {rows.flatMap((row, y) =>
          row.split("").map((cell, x) => {
            const fill = PALETTE[cell] ?? "transparent";
            if (fill === "transparent") return null;
            return <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />;
          }),
        )}
        {mood === "legendary" ? (
          <rect x={6} y={0} width={2} height={1} fill="#f4d03f" />
        ) : null}
      </svg>
    </div>
  );
}
