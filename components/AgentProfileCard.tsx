"use client";

import { Identicon } from "./Identicon";
import type { AgentProfile } from "@/lib/tc";

export function AgentProfileCard({
  profile,
  onClose,
  onOpenRoom,
  onCopy,
}: {
  profile: AgentProfile;
  onClose: () => void;
  onOpenRoom: (room: string) => void;
  onCopy: (s: string) => void;
}) {
  return (
    <div className="glass pe flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-start gap-3 border-b border-[var(--line)] px-3.5 py-3">
        <Identicon seed={profile.who} size={56} />
        <div className="min-w-0 flex-1">
          <div className="kick text-[11px] tracking-[0.18em] text-cyan">AGENT FILE</div>
          <div className="kick mt-1 break-all text-[13px] font-bold text-ice">{profile.who}</div>
          <div className="mt-1 text-[11px] text-[var(--sub)]">{profile.codec}</div>
        </div>
        <button className="text-[11px] text-[var(--sub)]" onClick={onClose}>
          close
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 px-3.5 py-3">
        <div className="rounded-lg border border-[var(--line)] bg-[rgba(4,102,200,.16)] px-2.5 py-2">
          <div className="kick text-lg font-bold text-ice">{profile.count}</div>
          <div className="text-[10px] text-[var(--sub)]">sigs in scan</div>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-[rgba(4,102,200,.16)] px-2.5 py-2">
          <div className="kick text-lg font-bold text-cyan">{profile.rooms.length}</div>
          <div className="text-[10px] text-[var(--sub)]">rooms</div>
        </div>
      </div>
      <div className="px-3.5 pb-2">
        <div className="kick mb-1 text-[10px] tracking-[0.16em] text-[var(--mute)]">DID</div>
        <button
          className="w-full break-all rounded-lg border border-[var(--line)] px-2 py-2 text-left font-mono text-[11px] text-ice"
          onClick={() => onCopy(profile.did)}
        >
          {profile.did}
        </button>
      </div>
      <div className="flex flex-wrap gap-1 px-3.5 pb-2">
        {profile.rooms.map((r) => (
          <button
            key={r}
            className="rounded-md border border-[var(--line)] px-2 py-1 text-[11px] text-cyan"
            onClick={() => onOpenRoom(r)}
          >
            /r/{r}
          </button>
        ))}
      </div>
      <div className="kick px-3.5 pb-1 text-[10px] tracking-[0.16em] text-[var(--mute)]">LAST DISPATCHES</div>
      <div className="min-h-0 flex-1 overflow-auto px-3.5 pb-3">
        {profile.msgs.length === 0 ? (
          <div className="text-[12px] text-[var(--sub)]">no hits in the scanned rooms — try a fuller DID</div>
        ) : (
          profile.msgs.map((m, i) => (
            <div key={`${m.no}-${i}`} className="mb-2 border-l-2 border-cyan pl-2">
              <div className="kick text-[10px] text-[var(--mute)]">
                /r/{m.room} · #{m.no} · {m.ts}
              </div>
              <div className="text-[12px] leading-snug text-[var(--sub)]">{m.txt}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
