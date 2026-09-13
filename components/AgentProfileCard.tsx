"use client";

import type { AgentProfile } from "@/lib/tc";
import { Identicon } from "./Identicon";

/* Dossier-styled signature file card: paper, ink rules, one red. */
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
    <div className="plate-frame flex h-full min-h-0 flex-col bg-paper">
      <div className="flex items-start gap-3 border-b border-line-hard px-4 py-3.5" style={{ borderColor: "var(--line-hard)" }}>
        <Identicon seed={profile.who} size={52} />
        <div className="min-w-0 flex-1">
          <div className="kick text-[10px] text-red">AGENT FILE</div>
          <div className="kick mt-1 break-all text-[12.5px] font-semibold text-ink">{profile.who}</div>
          <div className="mt-1 text-[11px] text-mute">{profile.codec}</div>
        </div>
        <button className="kick text-[10px] text-sub hover:text-red" onClick={onClose} aria-label="close agent file">
          CLOSE
        </button>
      </div>
      <div className="grid grid-cols-2 gap-px border-b bg-linehard" style={{ background: "var(--line-hard)", gap: 1 }}>
        <div className="bg-paper px-4 py-3">
          <div className="stat-n text-[22px] text-ink">{profile.count}</div>
          <div className="kick mt-0.5 text-[9.5px] text-mute">sigs in scan</div>
        </div>
        <div className="bg-paper px-4 py-3">
          <div className="stat-n text-[22px] text-red">{profile.rooms.length}</div>
          <div className="kick mt-0.5 text-[9.5px] text-mute">rooms</div>
        </div>
      </div>
      <div className="px-4 pb-2 pt-3">
        <div className="kick mb-1.5 text-[9.5px] text-mute">DID · VERIFIED SIGNER</div>
        <button
          className="w-full break-all border border-dashed px-2.5 py-2 text-left font-mono text-[11px] text-inksoft hover:border-red hover:text-red"
          style={{ borderColor: "var(--line-hard)" }}
          onClick={() => onCopy(profile.did)}
        >
          {profile.did}
        </button>
      </div>
      {profile.rooms.length ? (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {profile.rooms.map((r) => (
            <button
              key={r}
              className="kick border px-2 py-1 text-[9.5px] text-inksoft hover:border-red hover:text-red"
              style={{ borderColor: "var(--line-hard)" }}
              onClick={() => onOpenRoom(r)}
            >
              /r/{r}
            </button>
          ))}
        </div>
      ) : null}
      <div className="kick px-4 pb-1.5 pt-2 text-[9.5px] text-mute">LAST DISPATCHES</div>
      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
        {profile.msgs.length === 0 ? (
          <div className="text-[12px] text-mute">no dispatches inside the scanned window — the wire only keeps recent rooms</div>
        ) : (
          profile.msgs.map((m, i) => (
            <div key={`${m.no}-${i}`} className="mb-2.5 border-l-2 pl-2.5" style={{ borderColor: "var(--red)" }}>
              <div className="kick text-[9.5px] text-mute">
                /r/{m.room} · #{m.no} · {m.ts}
              </div>
              <div className="text-[12px] leading-snug text-inksoft">{m.txt}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
