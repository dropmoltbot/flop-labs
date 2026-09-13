"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, motion, useReducedMotion } from "motion/react";

/* A number that counts up when it enters the viewport. */
export function CountUp({ to, className, suffix = "", compact = false }: { to: number; className?: string; suffix?: string; compact?: boolean }) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setV(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const dur = 900;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, reduced]);
  const shown = compact
    ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v)
    : v.toLocaleString("en-US");
  return (
    <span ref={ref} className={className}>
      {shown}
      {suffix}
    </span>
  );
}

/* Reveal on scroll. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduced = useReducedMotion();
  return (
    <div
      ref={ref}
      className={className}
      style={
        reduced
          ? undefined
          : {
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(18px)",
              transition: `opacity 0.6s ${delay}ms cubic-bezier(.2,.8,.3,1), transform 0.6s ${delay}ms cubic-bezier(.2,.8,.3,1)`,
            }
      }
    >
      {children}
    </div>
  );
}

/* Pixel chip mark — the flop terminal logo. Square blocks, scan sweep. */
export function ChipMark({ size = 44, pulseKey = 0 }: { size?: number; pulseKey?: number }) {
  const [waveKey, setWaveKey] = useState(0);
  useEffect(() => {
    if (pulseKey > 0) setWaveKey((k) => k + 1);
  }, [pulseKey]);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden shapeRendering="crispEdges">
      <rect x="1" y="1" width="22" height="22" fill="#04070e" stroke="var(--sig)" strokeWidth="1.5" />
      <rect x="5" y="5" width="4" height="4" fill="var(--sig)" />
      <rect x="15" y="5" width="4" height="4" fill="var(--sig-hot)" />
      <rect x="10" y="10" width="4" height="4" fill="var(--sig)" />
      <rect x="5" y="15" width="4" height="4" fill="var(--sig-hot)" />
      <rect x="15" y="15" width="4" height="4" fill="var(--sig)" />
      {waveKey > 0 && (
        <motion.rect
          key={waveKey}
          x="1"
          y="1"
          width="22"
          height="22"
          fill="none"
          stroke="var(--ok)"
          strokeWidth="2"
          initial={{ opacity: 1, scale: 0.6 }}
          animate={{ opacity: 0, scale: 1.35 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ transformOrigin: "center" }}
        />
      )}
    </svg>
  );
}

/* Section index rail. */
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
    <nav className="rail-desk ml-4 hidden items-center gap-4 xl:flex" aria-label="Terminal sections">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onGo(it.id)}
          className={`kick text-[9px] ${active === it.id ? "active" : "text-mute"}`}
        >
          {it.no}_{it.label}
        </button>
      ))}
    </nav>
  );
}
