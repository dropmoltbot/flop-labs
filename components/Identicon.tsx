import type { ReactElement } from "react";

function hash(s: string) {
  let x = 2166136261;
  for (const c of s) {
    x ^= c.charCodeAt(0);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
}

const PAL = ["#00B4D8", "#0466C8", "#F5F7FA", "#3DC5E0"];

export function Identicon({ seed, size = 40 }: { seed: string; size?: number }) {
  const h = hash(seed);
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
          fill={PAL[(h >> (i + 4)) & 3]}
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
        fill="#0A1128"
        stroke="#00B4D8"
        strokeWidth="1.4"
      />
      <g clipPath={`url(#c${h})`}>
        {cells}
        <circle cx={ex} cy={ey} r="1.6" fill="#F5F7FA" />
        <circle cx={ex + 6} cy={ey} r="1.6" fill="#F5F7FA" />
        <path
          d={`M${ex} ${ey + 5} Q${ex + 3} ${ey + 7.2} ${ex + 6} ${ey + 5}`}
          fill="none"
          stroke="#F5F7FA"
          strokeWidth="1.2"
        />
      </g>
    </svg>
  );
}
