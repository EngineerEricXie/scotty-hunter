"use client";

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
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[35]">
      <button
        type="button"
        className="absolute inset-0 bg-[#14261c]/40 backdrop-blur-md"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[108px] z-10 flex justify-center">
        <div className="pointer-events-auto h-full w-full max-w-lg overflow-y-auto overscroll-contain" data-map-panel-scroll>
          {children}
        </div>
      </div>
    </div>
  );
}
