"use client";

import { useEffect, useRef } from "react";

export function MapPanelOverlay({
  open,
  closeLabel,
  onClose,
  children,
}: {
  open: boolean;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => panelRef.current?.focus());
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const controls = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ),
      ).filter((el) => el.getClientRects().length > 0);
      const first = controls[0],
        last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panelRef.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[35]">
      <button
        type="button"
        tabIndex={-1}
        className="absolute inset-0 bg-[#14261c]/35 backdrop-blur-sm"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[108px] z-10 flex justify-center">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={closeLabel.replace(/^Close /, "")}
          tabIndex={-1}
          className="pointer-events-auto h-full w-full max-w-lg overflow-y-auto overscroll-contain outline-none"
          data-map-panel-scroll
        >
          {children}
        </div>
      </div>
    </div>
  );
}
