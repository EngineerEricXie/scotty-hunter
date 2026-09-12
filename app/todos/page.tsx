"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui/States";

const TodosExperience = dynamic(
  () =>
    import("@/components/todos/TodosExperience").then(
      (mod) => mod.TodosExperience,
    ),
  { ssr: false, loading: () => <LoadingState label="Loading to-dos…" /> },
);

export default function TodosPage() {
  return <TodosExperience />;
}
