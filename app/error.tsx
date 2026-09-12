"use client";

export default function ErrorView({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6 text-center">
      <div className="pixel-panel bg-card p-5">
        <p className="hud text-[12px] leading-6">SNAG!</p>
        <p className="mt-2 text-sm font-bold text-muted">
          The campus map still works from demo data after a refresh.
        </p>
        <button
          type="button"
          onClick={reset}
          className="pixel-btn mt-4 min-h-11 bg-ink px-4 text-sm font-bold text-gold"
        >
          TRY AGAIN
        </button>
      </div>
    </div>
  );
}
