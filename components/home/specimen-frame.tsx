export function SpecimenFrame() {
  return (
    <aside className="specimen-panel" aria-hidden="true">
      <div className="specimen-meta absolute inset-[84px_24px_24px] text-label">
        <span className="absolute top-0 left-0 size-[14px] border-t border-l border-ink" />
        <span className="absolute top-0 right-0 size-[14px] border-t border-r border-ink" />
        <span className="absolute bottom-0 left-0 size-[14px] border-b border-l border-ink" />
        <span className="absolute right-0 bottom-0 size-[14px] border-r border-b border-ink" />
        <span className="type-mono absolute top-0 left-6">
          Specimen / <span className="text-ink">Fragment</span>
        </span>
        <span className="type-mono absolute top-0 right-6">
          Plate / <span>01</span>
        </span>
        <span className="type-mono absolute bottom-0 left-6">State / unresolved</span>
        <span className="type-mono absolute right-6 bottom-0 text-acc">● Realtime</span>
        <span className="absolute top-1/2 left-1/2 h-px w-[9px] -translate-x-1/2 bg-[rgba(17,17,16,0.4)]" />
        <span className="absolute top-1/2 left-1/2 h-[9px] w-px -translate-y-1/2 bg-[rgba(17,17,16,0.4)]" />
      </div>
    </aside>
  );
}
