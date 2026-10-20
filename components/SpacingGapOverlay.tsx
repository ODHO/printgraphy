import type { SelectionGap } from "@/lib/cardRender";

const pill =
  "absolute bg-[#e11d48] text-white text-base leading-none font-bold px-1 py-0.5 rounded-sm shadow-sm whitespace-nowrap";

/** Canva-style pixel distances from a selected box to the card edges. */
export default function SpacingGapOverlay({ gap }: { gap: SelectionGap | null }) {
  if (!gap || gap.widthPct <= 0 || gap.heightPct <= 0) return null;
  const midY = gap.topPct + gap.heightPct / 2;
  const midX = gap.leftPct + gap.widthPct / 2;
  return (
    <>
      <div
        className="absolute z-40 pointer-events-none border border-[#e11d48]"
        style={{ left: `${gap.leftPct}%`, top: `${gap.topPct}%`, width: `${gap.widthPct}%`, height: `${gap.heightPct}%` }}
      />
      <div className="absolute z-40 pointer-events-none" style={{ left: 0, width: `${gap.leftPct}%`, top: `${midY}%` }}>
        <div className="absolute left-0 right-0 h-px bg-[#e11d48] -translate-y-1/2" />
        <span className={`${pill} left-1/2 -translate-x-1/2 -translate-y-1/2`}>{gap.left}px</span>
      </div>
      <div
        className="absolute z-40 pointer-events-none"
        style={{ left: `${gap.leftPct + gap.widthPct}%`, width: `${Math.max(0, 100 - gap.leftPct - gap.widthPct)}%`, top: `${midY}%` }}
      >
        <div className="absolute left-0 right-0 h-px bg-[#e11d48] -translate-y-1/2" />
        <span className={`${pill} left-1/2 -translate-x-1/2 -translate-y-1/2`}>{gap.right}px</span>
      </div>
      <div className="absolute z-40 pointer-events-none" style={{ top: 0, height: `${gap.topPct}%`, left: `${midX}%` }}>
        <div className="absolute top-0 bottom-0 w-px bg-[#e11d48] -translate-x-1/2" />
        <span className={`${pill} top-1/2 left-0 -translate-x-1/2 -translate-y-1/2`}>{gap.top}px</span>
      </div>
      <div
        className="absolute z-40 pointer-events-none"
        style={{ top: `${gap.topPct + gap.heightPct}%`, height: `${Math.max(0, 100 - gap.topPct - gap.heightPct)}%`, left: `${midX}%` }}
      >
        <div className="absolute top-0 bottom-0 w-px bg-[#e11d48] -translate-x-1/2" />
        <span className={`${pill} top-1/2 left-0 -translate-x-1/2 -translate-y-1/2`}>{gap.bottom}px</span>
      </div>
    </>
  );
}
