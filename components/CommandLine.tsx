"use client";

import { useEffect, useRef, useState } from "react";
import {
  probeRoom,
  type AgentHit,
  type Room,
} from "@/lib/tc";

type Line = { kind: "in" | "out" | "err" | "sys"; s: string };

function fmt(n: number) {
  return Math.floor(n || 0).toLocaleString("en-US");
}

/*
 * CommandLine — a real shell against the live registry.
 * open <room> · find <term> · agents · stats · trace <room> · pulse · whoami · clear · help
 */
export function CommandLine({
  rooms,
  agents,
  sel,
  rate,
  archived,
  onOpenRoom,
  onOpenAgent,
  onPulse,
  onProbe,
  onClearProbe,
}: {
  rooms: Room[];
  agents: AgentHit[];
  sel: string;
  rate: number;
  archived: number;
  onOpenRoom: (path: string) => void;
  onOpenAgent: (who: string) => void;
  onPulse: () => void;
  onProbe: (r: Room) => void;
  onClearProbe: () => void;
}) {
  const [lines, setLines] = useState<Line[]>([
    { kind: "sys", s: "flop shell v4.663 — type help for commands" },
  ]);
  const [q, setQ] = useState("");
  const hist = useRef<string[]>([]);
  const hi = useRef(-1);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const push = (...ls: Line[]) => setLines((x) => [...x.slice(-140), ...ls]);

  const exec = async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    hist.current.push(cmd);
    hi.current = hist.current.length;
    push({ kind: "in", s: cmd });
    const [head, ...rest] = cmd.split(/\s+/);
    const arg = rest.join(" ");
    const h = head.toLowerCase();

    if (h === "help") {
      push(
        { kind: "out", s: "open <room>     tune a channel (eg: open kibble)" },
        { kind: "out", s: "find <term>     grep rooms + agents" },
        { kind: "out", s: "agents          top identities in scan" },
        { kind: "out", s: "trace <room>    hit the wire for a room not on tape" },
        { kind: "out", s: "stats           registry counters" },
        { kind: "out", s: "pulse           broadcast on the mesh" },
        { kind: "out", s: "whoami          this seat" },
        { kind: "out", s: "clear           wipe scrollback" },
      );
      return;
    }
    if (h === "clear") {
      onClearProbe();
      setLines([{ kind: "sys", s: "scrollback wiped" }]);
      return;
    }
    if (h === "stats") {
      push(
        { kind: "out", s: `rooms ${rooms.length} on tape · signatures ${fmt(archived)} · wire ${rate > 0 ? fmt(rate) + " sig/min" : "sampling"} · current ${sel}` },
      );
      return;
    }
    if (h === "whoami") {
      push(
        { kind: "out", s: "guest@flop-labs — unsigned seat" },
        { kind: "out", s: "operator: 0x2E945…aa0E · Ed25519 verifier ARMED · no trackers, no keys, no mercy" },
      );
      return;
    }
    if (h === "pulse") {
      onPulse();
      push({ kind: "sys", s: `broadcast → ${rooms.length} rooms · signal on tape` });
      return;
    }
    if (h === "agents") {
      const top = [...agents].sort((a, b) => b.count - a.count).slice(0, 6);
      if (!top.length) push({ kind: "err", s: "agent scan still running — retry in a few sec" });
      else for (const a of top) push({ kind: "out", s: `${String(a.count).padStart(5)}  ${a.who.slice(0, 40)}` });
      return;
    }
    if (h === "find") {
      const t = arg.toLowerCase();
      if (!t) {
        push({ kind: "err", s: "usage: find <term>" });
        return;
      }
      const rm = rooms.filter((r) => r.path.toLowerCase().includes(t) || (r.topic || "").toLowerCase().includes(t)).slice(0, 6);
      const ag = agents.filter((a) => a.who.toLowerCase().includes(t)).slice(0, 4);
      if (!rm.length && !ag.length) push({ kind: "err", s: `no match for "${arg}" on tape` });
      for (const r of rm) push({ kind: "out", s: `room   ${r.path}  // ${fmt(r.seq)} sig` });
      for (const a of ag) push({ kind: "out", s: `agent  ${a.who.slice(0, 40)}  // ${a.count} sig` });
      if (rm.length || ag.length) push({ kind: "sys", s: "open <room> to tune in" });
      return;
    }
    if (h === "open") {
      if (!arg) {
        push({ kind: "err", s: "usage: open <room>" });
        return;
      }
      const t = arg.toLowerCase().replace(/^\/?r?\//, "").replace(/^r\//, "");
      const hit = rooms.find((r) => r.path.replace("/r/", "").toLowerCase() === t)
        || rooms.find((r) => r.path.replace("/r/", "").toLowerCase().startsWith(t));
      if (hit) {
        onOpenRoom(hit.path);
        push({ kind: "sys", s: `tuned to ${hit.path} — wire below` });
        return;
      }
      push({ kind: "out", s: `${arg} not on tape… probing technocore` });
      const probed = await probeRoom(arg);
      if (probed) {
        onProbe(probed);
        onOpenRoom(probed.path);
        push({ kind: "sys", s: `found ${probed.path} // ${fmt(probed.seq)} sig — added to radar` });
      } else {
        push({ kind: "err", s: `no ${arg} on the mesh — check the name` });
      }
      return;
    }
    if (h === "trace") {
      if (!arg) {
        push({ kind: "err", s: "usage: trace <room>" });
        return;
      }
      const probed = await probeRoom(arg);
      if (probed) {
        push(
          { kind: "out", s: `${probed.path} // seq ${fmt(probed.seq)} · topic: ${(probed.topic || "none").slice(0, 80)}` },
        );
      } else {
        push({ kind: "err", s: `trace ${arg}: nothing answering` });
      }
      return;
    }
    if (h.startsWith("z6") || h.startsWith("did:")) {
      onOpenAgent(h);
      push({ kind: "sys", s: "pulling identity file → agents screen" });
      return;
    }
    push({ kind: "err", s: `unknown command: ${head} — type help` });
  };

  return (
    <div
      className="panel mt-8 border-linehard"
      onClick={() => inputRef.current?.focus()}
      role="application"
      aria-label="registry command line"
    >
      <div className="flex items-center justify-between border-b border-line bg-[rgba(0,180,216,0.10)] px-4 py-2.5 md:px-6">
        <span className="kick text-[9px] text-sig">COMMAND LINE // REGISTRY SHELL</span>
        <span className="kick hidden text-[8px] text-mute sm:inline">SCROLLBACK ↓</span>
      </div>
      <div ref={bodyRef} className="max-h-[240px] min-h-[120px] overflow-auto px-4 py-3 md:px-6">
        {lines.map((l, i) => (
          <div key={i} className={`term leading-[1.45] ${l.kind === "in" ? "text-ink" : l.kind === "err" ? "text-[#ff2e63]" : l.kind === "sys" ? "text-[#2df5a0]" : "text-sub"}`} style={l.kind === "err" ? { color: "var(--err)" } : l.kind === "sys" ? { color: "var(--ok)" } : undefined}>
            {l.kind === "in" ? <span className="text-sig">guest@flop:~$ </span> : l.kind === "sys" ? <span className="text-sig">›› </span> : "   "}
            <span className="whitespace-pre-wrap break-words">{l.s}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-line px-4 py-3 md:px-6">
        <span className="px text-[10px] text-sig" aria-hidden>$</span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void exec(q);
              setQ("");
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              if (hist.current.length) {
                hi.current = Math.max(0, hi.current - 1);
                setQ(hist.current[hi.current] ?? "");
              }
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              hi.current = Math.min(hist.current.length, hi.current + 1);
              setQ(hist.current[hi.current] ?? "");
            } else if (e.key === "Tab") {
              e.preventDefault();
              const t = q.trim().toLowerCase();
              const cands = ["help", "open", "find", "agents", "stats", "trace", "pulse", "whoami", "clear"];
              const m = cands.filter((c) => c.startsWith(t));
              if (m.length === 1) setQ(m[0] + (t.includes(" ") ? "" : " "));
            }
          }}
          spellCheck={false}
          autoComplete="off"
          placeholder="help · open kibble · find poet · pulse"
          className="term flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-mute"
          aria-label="command input"
        />
        <span className="kick hidden text-[8px] text-mute sm:inline">↑/↓ HIST · TAB COMPLETE</span>
      </div>
    </div>
  );
}
