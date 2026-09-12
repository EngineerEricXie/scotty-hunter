export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[22px] border border-line bg-white px-5 py-8 text-center shadow-[0_4px_18px_rgba(28,28,30,0.06)]">
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-[22px] border border-red-100 bg-white px-5 py-6 text-sm text-ink"
    >
      <p className="font-semibold">Something went wrong</p>
      <p className="mt-1 text-muted">{message}</p>
    </div>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 px-1 py-4 text-sm text-muted" role="status">
      <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-tartan/70" />
      {label}
    </div>
  );
}

export function UnavailableIntegration({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/80 px-4 py-3 text-sm">
      <p className="font-semibold text-ink">{name} not connected</p>
      <p className="mt-1 text-muted">{detail}</p>
    </div>
  );
}
