"use client";

export default function ErrorView({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6 text-center">
      <div>
        <p className="text-lg font-semibold">ScottyBites hit a snag</p>
        <p className="mt-2 text-sm text-muted">
          The map should still work from demo data after a refresh.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 min-h-11 rounded-2xl bg-ink px-4 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
