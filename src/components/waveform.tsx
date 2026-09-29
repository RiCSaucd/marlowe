import { useEffect, useRef } from "react";

const BARS = 28;

export function Waveform({
  analyser,
  active,
}: {
  analyser: AnalyserNode | null;
  active: boolean;
}) {
  const bars = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    let frame = 0;
    const data = new Uint8Array(analyser?.fftSize ?? 1024);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const paint = () => {
      if (active && analyser && !reduced) analyser.getByteTimeDomainData(data);
      for (let i = 0; i < BARS; i++) {
        const el = bars.current[i];
        if (!el) continue;
        let height = 2;
        if (active && analyser && !reduced) {
          const sample = Math.abs((data[Math.floor((i * data.length) / BARS)] ?? 128) - 128) / 128;
          const wobble = 0.45 + 0.55 * Math.abs(Math.sin(i * 0.55 + frame / 8));
          height = 3 + sample * 32 * wobble;
        }
        el.style.height = `${height}px`;
      }
      frame += 1;
      if (active && !reduced) frameId = requestAnimationFrame(paint);
    };

    let frameId = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frameId);
  }, [analyser, active]);

  return (
    <div className="flex h-10 items-center gap-1" aria-hidden="true">
      {Array.from({ length: BARS }, (_, index) => (
        <span
          key={index}
          ref={(node) => {
            bars.current[index] = node;
          }}
          className={`h-0.5 w-1 rounded-full ${active ? "bg-brass" : "bg-line"}`}
        />
      ))}
    </div>
  );
}
