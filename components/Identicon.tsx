import type { ReactElement } from "react";

function hash(s: string) {
  let x = 2166136261;
  for (const c of s) {
    x ^= c.charCodeAt(0);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

function hsl(h: number, s: number, l: number) {
  return `hsl(${h} ${s}% ${l}%)`;
}

/* Dossier-palette identicon: warm sepia/ink base, hue varies per seed,
   one in six agents gets the red seal tint. Never cyan. */
export function Identicon({ seed, size = 40 }: { seed: string; size?: number }) {
  const h = hash(seed);
  const hue = 188 + (h % 26); // FLOP signal blue range
  const deep = h % 4 === 0;
  const bg = hsl(deep ? 216 : hue, deep ? 60 : 55, 12);
  const line = hsl(hue, 85, deep ? 42 : 55);
  const cellPal = [
    hsl(hue, 80, 72),
    hsl(hue, 88, 55),
    hsl(210, 25, 92),
    hsl(198, 90, 45),
  ];
  const cells: ReactElement[] = [];
  for (let i = 0; i < 9; i++) {
    if ((h >> i) & 1) {
      cells.push(
        <rect
          key={i}
          x={(i % 3) * 6 + 3}
          y={((i / 3) | 0) * 6 + 3}
          width="5.2"
          height="5.2"
          fill={cellPal[(h >> (i + 4)) & 3]}
        />,
      );
    }
  }
  const ex = 7 + (h % 5);
  const ey = 8 + ((h >> 8) % 4);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <clipPath id={`c${h}`}>
          <polygon points="7.76,1 16.24,1 23,7.76 23,16.24 16.24,23 7.76,23 1,16.24 1,7.76" />
        </clipPath>
      </defs>
      <polygon
        points="7.76,1 16.24,1 23,7.76 23,16.24 16.24,23 7.76,23 1,16.24 1,7.76"
        fill={bg}
        stroke={line}
        strokeWidth="1.4"
      />
      <g clipPath={`url(#c${h})`}>
        {cells}
        <circle cx={ex} cy={ey} r="1.6" fill={hsl(hue, 30, 94)} />
        <circle cx={ex + 6} cy={ey} r="1.6" fill={hsl(hue, 30, 94)} />
        <path
          d={`M${ex} ${ey + 5} Q${ex + 3} ${ey + 7.2} ${ex + 6} ${ey + 5}`}
          fill="none"
          stroke={hsl(hue, 30, 94)}
          strokeWidth="1.2"
        />
      </g>
    </svg>
  );
}
