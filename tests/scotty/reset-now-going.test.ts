import { describe, expect, it } from "vitest";
import { DEMO_SEEDED_EVENTS } from "@/data/fixtures/demo-events";
import { frozenDemoNow } from "@/lib/demo-clock";
import {
  liveNowGoing,
  resetScottyToDefault,
  type NowGoingPing,
  type ScottyState,
} from "@/lib/scotty/state";

function emptyState(nowGoing: NowGoingPing[]): ScottyState {
  return {
    name: "Scotty",
    hunterName: "YOU",
    hunters: [],
    points: 80,
    xp: 40,
    hunger: 90,
    lastFedAt: "2026-09-12T12:00:00.000Z",
    atlas: {
      pizza: { count: 2, firstAt: "2026-09-12T12:00:00.000Z", lastAt: "2026-09-12T12:00:00.000Z" },
    },
    checkins: [
      {
        id: "ck-1",
        eventId: "demo-ri-pizza",
        labels: ["pizza"],
        atlasIds: ["pizza"],
        points: 20,
        created_at: "2026-09-12T12:00:00.000Z",
      },
    ],
    unlockedMenus: {
      "demo-ri-pizza": { eventId: "demo-ri-pizza", unlockedAt: "2026-09-12T12:00:00.000Z" },
    },
    nowGoing,
    quests: { snap: true, hidden: true },
    seenSplash: true,
    createdAt: "2026-09-12T12:00:00.000Z",
    updatedAt: "2026-09-12T12:00:00.000Z",
  };
}

describe("Scotty reset and NOW GOING", () => {
  it("wipes photos, dex, menus, and quests", () => {
    const fresh = resetScottyToDefault();
    expect(fresh.atlas).toEqual({});
    expect(fresh.checkins).toEqual([]);
    expect(fresh.unlockedMenus).toEqual({});
    expect(fresh.quests).toEqual({});
    expect(fresh.points).toBe(0);
    expect(fresh.xp).toBe(0);
    expect(fresh.seenSplash).toBe(true);
  });

  it("does not mark 12:15 pizza or 4 PM cookies as NOW GOING at 10:00 AM", () => {
    const pizza = DEMO_SEEDED_EVENTS.find((event) => event.id === "demo-ri-pizza")!;
    const cookie = DEMO_SEEDED_EVENTS.find((event) => event.id === "demo-cookie-hour")!;
    const now = frozenDemoNow().getTime();
    const pings: NowGoingPing[] = [
      {
        id: "demo-ri-pizza",
        eventId: pizza.id,
        title: pizza.title,
        buildingId: pizza.building_id,
        dish: "RI pizza",
        handle: "GatesScout",
        kind: "demo",
        at: new Date(now - 4 * 60_000).toISOString(),
        startTime: pizza.start_time,
        endTime: pizza.end_time ?? pizza.start_time,
      },
      {
        id: "demo-cookie",
        eventId: cookie.id,
        title: cookie.title,
        buildingId: cookie.building_id,
        dish: "Cookie Hour",
        handle: "WeanWalker",
        kind: "demo",
        at: new Date(now - 22 * 60_000).toISOString(),
        startTime: cookie.start_time,
        endTime: cookie.end_time ?? cookie.start_time,
      },
    ];
    const duringPizza = new Date(pizza.start_time).getTime() + 60_000;
    const livePings: NowGoingPing[] = [
      {
        ...pings[0]!,
        at: new Date(duringPizza - 4 * 60_000).toISOString(),
      },
      pings[1]!,
    ];
    expect(liveNowGoing(emptyState(livePings), duringPizza).map((ping) => ping.eventId)).toEqual([
      "demo-ri-pizza",
    ]);
  });
});
