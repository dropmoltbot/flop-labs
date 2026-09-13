"use client";

import { useEffect, useRef, useState } from "react";

/* A number that counts up when it enters the viewport. */
export function CountUp({ to, className, suffix = "" }: { to: number; className?: string; suffix?: string }) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || done.current) return;
        done.current = true;
        const t0 = performance.now();
        const dur = 1100;
        const tick = (t: number) => {
          const k = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - k, 3);
          setV(Math.round(to * eased));
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to]);

  return (
    <span ref={ref} className={className}>
      {v.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

/* Adds .in when the element scrolls into view (one-shot). */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(() => el.classList.add("in"), delay);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

/* Section header band: red plate number + italic serif title + annotation. */
export function PlateHead({
  no,
  title,
  note,
}: {
  no: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="plate-head">
      <span className="plate-no">{no}</span>
      <h2 className="plate-title">{title}</h2>
      {note ? <span className="kick ml-auto hidden text-[10px] text-mute md:inline">{note}</span> : null}
    </div>
  );
}

/* The octagon chip mark, in ink-on-paper. Spins slowly, breathes, stamps on pulse. */
export function ChipMark({ size = 44, pulseKey = 0 }: { size?: number; pulseKey?: number }) {
  const [waveKey, setWaveKey] = useState(0);
  useEffect(() => {
    if (pulseKey > 0) setWaveKey((k) => k + 1);
  }, [pulseKey]);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      {waveKey > 0 ? (
        <polygon
          key={waveKey}
          className="chip-wave"
          points="7.76,1 16.24,1 23,7.76 23,16.24 16.24,23 7.76,23 1,16.24 1,7.76"
          fill="none"
          stroke="var(--red)"
          strokeWidth={3}
        />
      ) : null}
      <g className="chip-spin" style={{ transformOrigin: "12px 12px" }}>
        <polygon
          className="chip-breathe"
          points="7.76,1 16.24,1 23,7.76 23,16.24 16.24,23 7.76,23 1,16.24 1,7.76"
          fill="none"
          stroke="var(--ink)"
          strokeWidth={1.1}
        />
      </g>
      <rect x="10" y="10" width="4" height="4" fill="var(--red)" />
    </svg>
  );
}

/* Left-rail section index (wide screens only). */
export function RailIndex({
  items,
  active,
  onGo,
}: {
  items: { id: string; label: string; no: string }[];
  active: string;
  onGo: (id: string) => void;
}) {
  return (
    <nav className="rail-desk ml-4 hidden items-center gap-4 xl:flex" aria-label="Dossier sections">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onGo(it.id)}
          className={`kick rail-link text-[10px] ${active === it.id ? "active" : "text-sub"}`}
        >
          {it.no} · {it.label}
        </button>
      ))}
    </nav>
  );
}
