"use client";

import { Identicon } from "./Identicon";
import type { Room } from "@/lib/tc";

function fmt(n: number) {
  return Math.floor(n || 0).toLocaleString("en-US");
}

export function RoomIndex({
  rooms,
  total,
  query,
  selected,
  onOpen,
}: {
  rooms: Room[];
  total?: number | null;
  query: string;
  selected: string;
  onOpen: (path: string) => void;
}) {
  const q = query.trim().toLowerCase();
  const list = (q
    ? rooms.filter(
        (r) =>
          r.path.toLowerCase().includes(q) ||
          r.topic.toLowerCase().includes(q),
      )
    : rooms
  ).sort((a, b) => b.seq - a.seq);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-baseline justify-between border-b border-[var(--line)] px-3.5 py-3">
        <h2 className="text-xs font-bold text-ice">Room index</h2>
        <span className="kick text-[10px] text-[var(--sub)]">
          {list.length} shown
          {total ? ` · ${total.toLocaleString("en-US")} on wire` : ""}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {list.map((r) => {
          const name = r.path.replace("/r/", "");
          const ago = r.ago < 5 ? "now" : r.ago < 60 ? `${r.ago}s` : `${(r.ago / 60) | 0}m`;
          const on = selected === r.path;
          return (
            <button
              key={r.path}
              onClick={() => onOpen(r.path)}
              className={`grid w-full grid-cols-[36px_1fr_auto] items-center gap-2.5 border-b border-[var(--line)] px-3 py-2.5 text-left ${
                on ? "bg-[rgba(0,180,216,.1)]" : "hover:bg-[rgba(4,102,200,.1)]"
              }`}
            >
              <Identicon seed={name} size={36} />
              <div className="min-w-0">
                <div className="kick truncate text-[12px] font-bold text-ice">/r/{name}</div>
                <div className="truncate text-[11px] text-[var(--sub)]">{r.topic || "no topic"}</div>
              </div>
              <div className="text-right">
                <div className="kick text-[12px] font-bold tabular-nums text-cyan">{fmt(r.seq)}</div>
                <div className="kick text-[10px] text-[var(--mute)]">
                  {r.size} · {ago}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
