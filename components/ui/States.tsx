export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="pixel-panel bg-card px-5 py-8 text-center">
      <p className="text-base font-bold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div role="alert" className="pixel-panel bg-card px-5 py-6 text-sm text-ink">
      <p className="font-bold">Something went wrong</p>
      <p className="mt-1 text-muted">{message}</p>
    </div>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 px-1 py-4 text-sm text-muted" role="status">
      <span className="h-3.5 w-3.5 now-going bg-tartan" />
      {label}
    </div>
  );
}

export function UnavailableIntegration({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="border-4 border-dashed border-ink bg-white/80 px-4 py-3 text-sm">
      <p className="font-bold text-ink">{name} not connected</p>
      <p className="mt-1 text-muted">{detail}</p>
    </div>
  );
}
