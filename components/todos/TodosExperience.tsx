"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Event, Todo } from "@/lib/types";
import { loadTodos, saveTodos } from "@/lib/storage/local-state";
import { relativeDeadline } from "@/lib/timezone";
import { BottomNav } from "@/components/ui/BottomNav";
import { EmptyState } from "@/components/ui/States";
import { StatusBar } from "@/components/ui/PressStart";

export function TodosExperience() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos);
  const [events, setEvents] = useState<Record<string, Event>>({});

  useEffect(() => {
    fetch("/api/events?include_none=true")
      .then((res) => res.json())
      .then((json: { events?: Event[] }) => {
        const map: Record<string, Event> = {};
        for (const event of json.events ?? []) map[event.id] = event;
        setEvents(map);
      })
      .catch(() => undefined);
  }, []);

  const sorted = useMemo(() => {
    return [...todos].sort((a, b) => {
      if (a.status !== b.status) return a.status === "OPEN" ? -1 : 1;
      const ad = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bd = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      return ad - bd;
    });
  }, [todos]);

  function update(id: string, status: Todo["status"]) {
    const next = todos.map((todo) =>
      todo.id === id ? { ...todo, status, updated_at: new Date().toISOString() } : todo,
    );
    setTodos(next);
    saveTodos(next);
  }

  return (
    <div className="min-h-dvh bg-canvas pb-28">
      <main className="mx-auto max-w-lg px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <div className="pixel-panel bg-card p-4">
          <StatusBar right="QUEST" />
          <h1 className="hud mt-3 text-[13px] leading-6">RSVP QUESTS</h1>
          <p className="mt-2 text-sm font-bold text-muted">
            Registration stays on the source site. ScottyBites only reminds you.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {sorted.length === 0 && (
            <EmptyState
              title="No RSVP tasks yet"
              body="Open an event that requires registration and save it as a Quest."
            />
          )}
          {sorted.map((todo) => {
            const event = events[todo.event_id];
            const muted = todo.status !== "OPEN";
            return (
              <article
                key={todo.id}
                className={`pixel-panel bg-card p-4 ${muted ? "opacity-60" : ""}`}
              >
                <p className="hud text-[8px] text-tartan">
                  {todo.type}
                  {todo.deadline ? ` · ${relativeDeadline(todo.deadline)}` : ""}
                </p>
                <h2 className="mt-1 text-base font-bold">{todo.title}</h2>
                {event && <p className="text-sm text-muted">{event.title}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {todo.registration_url && (
                    <a
                      href={todo.registration_url}
                      target="_blank"
                      rel="noreferrer"
                      className="pixel-btn min-h-10 bg-ink px-3 text-sm leading-10 text-gold"
                    >
                      OPEN FORM
                    </a>
                  )}
                  <Link
                    href="/"
                    className="pixel-btn min-h-10 bg-white px-3 text-sm leading-10"
                  >
                    MAP
                  </Link>
                  <button
                    type="button"
                    onClick={() => update(todo.id, "DONE")}
                    className="pixel-btn min-h-10 bg-gold px-3 text-sm"
                  >
                    DONE
                  </button>
                  <button
                    type="button"
                    onClick={() => update(todo.id, "DISMISSED")}
                    className="min-h-10 px-3 text-sm font-bold text-muted"
                  >
                    SKIP
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </main>
      <BottomNav current="/todos" />
    </div>
  );
}
