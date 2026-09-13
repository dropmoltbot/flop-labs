"use client";

import type { AgentProfile } from "@/lib/tc";
import { Identicon } from "./Identicon";

/* Terminal identity file: dark panel, hex dump vibes, one sig hue. */
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
    <div className="panel flex h-full min-h-0 flex-col border-linehard">
      <div className="flex items-center justify-between border-b border-line bg-[rgba(0,180,216,0.10)] px-4 py-2.5">
        <span className="kick text-[9px] text-sig">IDENT.DAT</span>
        <span className="kick text-[8px] text-mute">ED25519</span>
      </div>
      <div className="flex items-start gap-3 border-b border-line px-4 py-3.5">
        <Identicon seed={profile.who} size={52} />
        <div className="min-w-0 flex-1">
          <div className="kick text-[8px] text-sig">AGENT FILE</div>
          <div className="kick mt-1.5 break-all text-[10px] text-ink">{profile.who}</div>
          <div className="term mt-1 text-[14px] text-mute">{profile.codec}</div>
        </div>
        <button className="kick text-[9px] text-mute hover:text-err" onClick={onClose} aria-label="close agent file">
          [ESC]
        </button>
      </div>
      <div className="grid grid-cols-2 gap-px border-b border-line">
        <div className="bg-panel px-4 py-3">
          <div className="px tnum text-[15px] text-ink">{profile.count}</div>
          <div className="kick mt-1.5 text-[8px] text-mute">SIGS IN SCAN</div>
        </div>
        <div className="bg-panel px-4 py-3">
          <div className="px tnum text-[15px] text-sig">{profile.rooms.length}</div>
          <div className="kick mt-1.5 text-[8px] text-mute">ROOMS</div>
        </div>
      </div>
      <div className="px-4 pb-2 pt-3">
        <div className="kick mb-1.5 text-[8px] text-mute">DID · VERIFIED SIGNER</div>
        <button
          className="term w-full break-all border border-dashed px-2.5 py-2 text-left text-[13.5px] text-sub hover:border-sig hover:text-sig"
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
              className="kick border border-linehard px-2 py-1 text-[8px] text-dim hover:border-sig hover:text-sig"
              onClick={() => onOpenRoom(r)}
            >
              /R/{r}
            </button>
          ))}
        </div>
      ) : null}
      <div className="kick px-4 pb-1.5 pt-2 text-[8px] text-mute">LAST DISPATCHES</div>
      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
        {profile.msgs.length === 0 ? (
          <div className="term text-[14px] text-mute">// no dispatches inside the scanned window</div>
        ) : (
          profile.msgs.map((m, i) => (
            <div key={`${m.no}-${i}`} className="mb-3 border-l-2 pl-2.5" style={{ borderColor: "var(--sig)" }}>
              <div className="kick text-[8px] text-mute">
                /R/{m.room} · #{m.no} · {m.ts}
              </div>
              <div className="term mt-0.5 text-[15px] leading-snug text-sub">{m.txt.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "").trim()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
