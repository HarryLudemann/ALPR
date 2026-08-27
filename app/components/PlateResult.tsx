import type { PlateHit } from "@/lib/types";

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function PlateResult({
  plate,
  index,
}: {
  plate: PlateHit;
  index: number;
}) {
  return (
    <article className="hud-panel overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          Plate {String(index + 1).padStart(2, "0")}
        </p>
        <span
          className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
            plate.is_nz_format
              ? "bg-teal-400/15 text-teal-300"
              : "bg-white/8 text-zinc-400"
          }`}
        >
          {plate.is_nz_format ? "NZ format" : "Unverified"}
        </span>
      </div>

      <div className="nz-plate mt-4">{plate.text || "————"}</div>

      {plate.raw_text && plate.raw_text !== plate.text ? (
        <p className="mt-3 font-mono text-xs text-zinc-500">
          Raw OCR {plate.raw_text}
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-3 gap-2 font-mono text-[11px] text-zinc-400">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-zinc-600">OCR</dt>
          <dd className="mt-1 text-zinc-200">{pct(plate.confidence)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-zinc-600">Detect</dt>
          <dd className="mt-1 text-zinc-200">{pct(plate.detection_confidence)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-zinc-600">Pattern</dt>
          <dd className="mt-1 text-zinc-200">{pct(plate.pattern_confidence)}</dd>
        </div>
      </dl>

      {plate.candidates.length > 1 ? (
        <p className="mt-3 font-mono text-[11px] text-zinc-500">
          Also considered {plate.candidates.filter((item) => item !== plate.text).join(" · ")}
        </p>
      ) : null}
    </article>
  );
}
