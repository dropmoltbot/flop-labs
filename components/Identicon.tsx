import type { ReactElement } from "react";

function hash(s: string) {
  let x = 2166136261;
  for (const c of s) {
    x ^= c.charCodeAt(0);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

/* Phosphor pixel identicon: blocky invader pattern, electric blue by
   default, one in six agents burns hot magenta. Square chrome, no round. */
export function Identicon({ seed, size = 40 }: { seed: string; size?: number }) {
  const h = hash(seed);
  const hot = h % 6 === 0;
  const fg = hot ? "#ff2e63" : "#48caff";
  const dim = hot ? "rgba(255,46,99,0.35)" : "rgba(72,202,255,0.3)";
  const bg = "#04070e";
  const cells: ReactElement[] = [];
  for (let gy = 0; gy < 5; gy++) {
    for (let gx = 0; gx < 5; gx++) {
      const mirror = gx < 3 ? gx : 4 - gx; // horizontal symmetry, invader style
      const bit = (h >> (mirror * 5 + gy)) & 1;
      if (bit) {
        cells.push(
          <rect key={`${gx}${gy}`} x={gx * 4 + 2} y={gy * 4 + 2} width="4" height="4" fill={fg} />,
        );
      } else if ((h >> (mirror + gy * 2)) & 1) {
        cells.push(
          <rect key={`d${gx}${gy}`} x={gx * 4 + 2} y={gy * 4 + 2} width="4" height="4" fill={dim} />,
        );
      }
    }
  }
  const ring = (h >> 16) & 1 ? "var(--sig)" : hot ? "var(--err)" : "rgba(72,202,255,0.5)";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden shapeRendering="crispEdges">
      <rect x="0.5" y="0.5" width="23" height="23" fill={bg} stroke={ring} strokeWidth="1" />
      {cells}
    </svg>
  );
}
