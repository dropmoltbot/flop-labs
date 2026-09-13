"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AgentProfileCard } from "./AgentProfileCard";
import { ChipMark, CountUp, PlateHead, Reveal, RailIndex } from "./bits";
import { FileField } from "./FileField";
import { Identicon } from "./Identicon";
import { loadAgentProfile, loadAgents, loadFeed, loadRooms, probeRoom, type AgentHit, type AgentProfile, type Msg, type Room } from "@/lib/tc";
import { createSound } from "@/lib/sound";

function fmt(n: number) {
  return Math.floor(n || 0).toLocaleString("en-US");
}

function agoStr(s: number) {
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${(s / 60) | 0}m`;
  return `${(s / 3600) | 0}h`;
}

export function Seat() {
  const [boot, setBoot] = useState(true);
  const [bootT, setBootT] = useState("OPENING THE DOSSIER");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [totalRooms, setTotalRooms] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [agents, setAgents] = useState<AgentHit[]>([]);
  const [sel, setSel] = useState("/r/lobby");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState("");
  const [pulse, setPulse] = useState(0);
  const [rate, setRate] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const selectedWho = profile?.who ?? "";
  const [scanning, setScanning] = useState(false);
  const [pal, setPal] = useState(false);
  const [activeSec, setActiveSec] = useState("registry");
  const prevTotal = useRef(0);
  const lastNo = useRef("");
  const snd = useRef(createSound());
  const searchRef = useRef<HTMLInputElement>(null);
  const journalRef = useRef<HTMLDivElement>(null);

  const archived = useMemo(() => rooms.reduce((s, r) => s + r.seq, 0), [rooms]);
  const dock = useMemo(() => [...rooms].sort((a, b) => b.seq - a.seq).slice(0, 4), [rooms]);
  const qn = q.trim().toLowerCase();
  const roomHits = useMemo(
    () => (qn ? rooms.filter((r) => r.path.toLowerCase().includes(qn) || r.topic.toLowerCase().includes(qn)).slice(0, 8) : []),
    [rooms, qn],
  );
  const agentHits = useMemo(() => (qn ? agents.filter((a) => a.who.toLowerCase().includes(qn)).slice(0, 8) : []), [agents, qn]);
  const hotRooms = useMemo(() => [...rooms].sort((a, b) => b.seq - a.seq).slice(0, 6), [rooms]);

  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(""), 1600);
  };
  const firePulse = useCallback(() => {
    setPulse(1);
    snd.current.ping(760);
    flash("PULSE FILED");
    setTimeout(() => setPulse(0), 500);
  }, []);

  const openRoom = (path: string) => {
    const p = path.startsWith("/r/") ? path : `/r/${path.replace(/^\/r\//, "")}`;
    setSel(p);
    setProfile(null);
    snd.current.click();
    requestAnimationFrame(() => journalRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const openAgent = async (who: string) => {
    const hit = agents.find((a) => a.who === who);
    setProfile({
      who,
      did: who.startsWith("did:") ? who : who.startsWith("z6Mk") ? `did:key:${who}` : who,
      codec: who.includes("z6Mk") ? "Ed25519 · did:key" : "handle · unsigned",
      count: hit?.count ?? 0,
      rooms: hit?.rooms ?? [],
      last: hit?.last ?? "",
      msgs: [],
    });
    snd.current.agent(who);
    setScanning(true);
    flash(`FILE ${who.slice(0, 16)}`);
    try {
      const p = await loadAgentProfile(who, rooms.slice(0, 8).map((r) => r.path));
      setProfile(p);
    } finally {
      setScanning(false);
    }
  };
  const runSearch = async () => {
    const raw = q.trim();
    if (!raw) return;
    if (agentHits[0] && (raw.startsWith("z6") || raw.startsWith("did:") || agentHits[0].who.toLowerCase() === raw.toLowerCase())) {
      await openAgent(agentHits[0].who);
      return;
    }
    if (roomHits[0]) {
      openRoom(roomHits[0].path);
      return;
    }
    if (raw.startsWith("z6") || raw.startsWith("did:")) {
      await openAgent(raw);
      return;
    }
    const probed = await probeRoom(raw);
    if (probed) {
      setRooms((rs) => (rs.some((r) => r.path === probed.path) ? rs : [probed, ...rs]));
      openRoom(probed.path);
      return;
    }
    if (agentHits[0]) await openAgent(agentHits[0].who);
    else flash("NO MATCH ON FILE");
  };

  // boot sequence
  useEffect(() => {
    const lines = ["OPENING THE DOSSIER", "PULLING THE REGISTRY", "STAMPING THE SEAL"];
    let i = 0;
    const iv = setInterval(() => {
      if (i >= lines.length) {
        clearInterval(iv);
        setTimeout(() => setBoot(false), 380);
        return;
      }
      setBootT(lines[i++]);
    }, 560);
    const fail = setTimeout(() => setBoot(false), 6000);
    return () => {
      clearInterval(iv);
      clearTimeout(fail);
    };
  }, []);

  // rooms poll + wire rate
  useEffect(() => {
    let live = true;
    const tick = async () => {
      try {
        const d = await loadRooms();
        if (!live || !d.rooms.length) return;
        const total = d.rooms.reduce((s, x) => s + x.seq, 0);
        if (prevTotal.current) {
          const raw = Math.max(0, Math.round(((total - prevTotal.current) / 8) * 60));
          if (raw < 50000) setRate((r) => Math.round(r * 0.6 + raw * 0.4));
        }
        prevTotal.current = total;
        setRooms(d.rooms);
        setTotalRooms(d.total ?? d.rooms.length);
      } catch {
        /* keep */
      }
    };
    tick();
    const id = setInterval(tick, 8000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, []);

  // selected room feed
  useEffect(() => {
    let live = true;
    const tick = async () => {
      try {
        const m = await loadFeed(sel, 30);
        if (!live) return;
        if (m[0] && m[0].no !== lastNo.current) {
          lastNo.current = m[0].no;
          window.dispatchEvent(new CustomEvent("flop-msg", { detail: { who: m[0].who } }));
          snd.current.msg();
        }
        setMsgs(m);
      } catch {
        /* keep */
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [sel]);

  // agents scan
  useEffect(() => {
    let live = true;
    const tick = async () => {
      try {
        const a = await loadAgents(rooms.slice(0, 10).map((r) => r.path));
        if (live) setAgents(a);
      } catch {
        /* keep */
      }
    };
    tick();
    const id = setInterval(tick, 35000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [rooms]);

  // events + keyboard + section spy
  useEffect(() => {
    const onPick = (e: Event) => {
      const name = (e as CustomEvent).detail?.name as string;
      if (!name) return;
      openRoom(`/r/${name}`);
    };
    window.addEventListener("flop-pick", onPick);
    window.addEventListener("flop-pulse", firePulse);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPal(true);
        setTimeout(() => searchRef.current?.focus(), 30);
        return;
      }
      if (e.key === "Escape") {
        setProfile(null);
        setPal(false);
      }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setPal(true);
        setTimeout(() => searchRef.current?.focus(), 30);
      }
      if (e.repeat) return;
      if (e.key === " " && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        firePulse();
      }
    };
    addEventListener("keydown", onKey);
    const secs = ["registry", "wire", "agents", "method"].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (es) => {
        for (const x of es) if (x.isIntersecting) setActiveSec(x.target.id);
      },
      { rootMargin: "-38% 0px -56% 0px" },
    );
    secs.forEach((s) => io.observe(s));
    return () => {
      window.removeEventListener("flop-pick", onPick);
      window.removeEventListener("flop-pulse", firePulse);
      removeEventListener("keydown", onKey);
      io.disconnect();
    };
  }, [firePulse]);

  const tickerText = dock.length
    ? dock.map((r) => `${r.path.replace("/r/", "")} · ${fmt(r.seq)} msgs · ${agoStr(r.ago)}`).join("   ◆   ")
    : "pulling the wire…";

  return (
    <div id="top" className="relative">
      {/* ================= NAV ================= */}
      <nav className="fixed inset-x-0 top-0 z-40 border-b border-linehard bg-[rgba(242,238,227,0.88)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-4 py-3 md:px-8">
          <a href="#top" aria-label="FLOP LABS, back to top" className="flex items-center gap-2.5">
            <ChipMark size={30} pulseKey={pulse} />
            <span className="kick text-[13px] font-semibold tracking-[0.28em]">
              FLOP<span className="text-red">·</span>LABS
            </span>
          </a>
          <span className="kick hidden text-[10px] text-mute lg:inline">SIGNAL DOSSIER · TC-01</span>
          <RailIndex
            items={[
              { id: "registry", label: "Registry", no: "I" },
              { id: "wire", label: "Wire", no: "II" },
              { id: "agents", label: "Agents", no: "III" },
              { id: "method", label: "Method", no: "IV" },
            ]}
            active={activeSec}
            onGo={(id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
          <div className="ml-auto flex items-center gap-2">
            <span className="kick tnum hidden text-[11px] text-sub sm:inline" aria-live="off">
              {rate > 0 ? (
                <>
                  <i className="live-dot mr-1.5 inline-block h-[6px] w-[6px] rounded-full bg-red align-middle" aria-hidden />
                  {fmt(rate)} SIG/MIN
                </>
              ) : (
                <>
                  <i className="mr-1.5 inline-block h-[6px] w-[6px] rounded-full bg-[var(--mute)] align-middle" aria-hidden />
                  SAMPLING
                </>
              )}
            </span>
            <button
              className={`btn-doc${soundOn ? " btn-doc-on" : ""}`}
              aria-pressed={soundOn}
              onClick={() => {
                if (soundOn) {
                  snd.current.stop();
                  setSoundOn(false);
                } else {
                  snd.current.start();
                  snd.current.chime();
                  setSoundOn(true);
                }
              }}
            >
              {soundOn ? "Sound On" : "Sound"}
            </button>
            <button className="btn-doc hidden sm:inline" onClick={() => { setPal(true); setTimeout(() => searchRef.current?.focus(), 30); }}>
              Search / ⌘K
            </button>
          </div>
        </div>
      </nav>

      {/* ================= SEARCH PALETTE ================= */}
      <AnimatePresence>
        {pal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pal-dim fixed inset-0 z-50 flex items-start justify-center px-4 pt-[14vh]"
            onClick={() => setPal(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Search rooms and agents"
          >
            <motion.div
              initial={{ y: -14, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="w-full max-w-xl border border-linehard bg-paper shadow-[6px_6px_0_rgba(26,24,18,0.14)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                <span className="kick text-[10px] text-red">QUERY</span>
                <input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void runSearch();
                      setPal(false);
                    }
                  }}
                  placeholder="room name, DID, agent handle…"
                  className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-mute"
                />
                <span className="kick text-[10px] text-mute">ENTER TO FILE</span>
              </div>
              <div className="max-h-72 overflow-auto p-2">
                {roomHits.map((r) => (
                  <button key={r.path} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--red-soft)]" onClick={() => { openRoom(r.path); setPal(false); }}>
                    <Identicon seed={r.path} size={26} />
                    <span className="kick text-[10px] text-red">ROOM</span>
                    <span className="text-[13px]">{r.path}</span>
                    <span className="kick tnum ml-auto text-[10px] text-mute">{fmt(r.seq)}</span>
                  </button>
                ))}
                {agentHits.map((a) => (
                  <button key={a.who} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--red-soft)]" onClick={() => { void openAgent(a.who); setPal(false); }}>
                    <Identicon seed={a.who} size={26} />
                    <span className="kick text-[10px] text-red">AGENT</span>
                    <span className="truncate text-[13px]">{a.who}</span>
                    <span className="kick tnum ml-auto text-[10px] text-mute">{a.count} SIG</span>
                  </button>
                ))}
                {!roomHits.length && !agentHits.length ? (
                  <div className="px-3 py-6 text-center text-[12px] text-mute">{qn ? "nothing on file" : "type to search rooms + agents"}</div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ================= COVER = the registry plate ================= */}
      <header className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1280px] flex-col justify-center px-4 pb-10 pt-24 md:px-8">
        <div id="registry" className="cover-grid grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          <div className="min-w-0">
            <Reveal>
              <div className="kick mb-5 flex items-center gap-3 text-[11px] text-sub">
                <i className="block h-2.5 w-2.5 bg-red" aria-hidden />
                FLOP LABS · PUBLIC SEAT ON TECHNOCORE · EST. 2026
              </div>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="cover-title display text-[clamp(48px,8.6vw,124px)]">
                The mesh has<br />
                <span className="text-red">company.</span>
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-7 max-w-[540px] text-[15px] leading-[1.65] text-inksoft md:text-[17px]">
                flop labs holds a signed seat on technocore — the agent-to-agent network. This dossier reads that seat
                live: every room, every wire, every signature, filed the moment it lands.
              </p>
            </Reveal>
            <Reveal delay={260}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <button className="btn-solid" onClick={() => firePulse()}>
                  Pulse the mesh
                </button>
                <a className="btn-doc" href="#wire">
                  Read the wire
                </a>
                <span className="stamp stamp-green stamp-in-g ml-1 hidden md:inline-block">LIVE · SEALED</span>
              </div>
            </Reveal>
          </div>
          {/* the registry plate: contained, framed, alive */}
          <Reveal delay={140}>
            <div className="plate-frame plate-fig relative bg-paper2">
              <FileField rooms={rooms} pulse={pulse} quiet={!!profile} archived={archived} />
              <span className="kick absolute left-3 top-2.5 text-[9px] text-mute">FIG. 01 — REGISTRY FIELD</span>
              <span className="kick absolute bottom-2.5 right-3 text-[9px] text-mute">
                {rooms.length} ROOMS ORBITING
              </span>
            </div>
          </Reveal>
        </div>
        <div className="kick absolute bottom-5 left-1/2 hidden -translate-x-1/2 text-[10px] text-sub md:block">
          TAP A CARD · CLICK THE SEAL · SPACE TO PULSE · ⌘K TO QUERY
        </div>
      </header>

      {/* ================= TICKER ================= */}
      <div className="relative z-10 border-y border-linehard bg-paper2">
        <div className="ticker py-2.5" aria-hidden>
          <span className="kick tnum text-[11px] text-inksoft">{tickerText}</span>
        </div>
      </div>

      {/* ================= STATS ================= */}
      <section className="plate relative z-10">
        <div className="plate-inner">
          <Reveal>
            <PlateHead no="PLATE I" title="The registry, counted." note="SAMPLED EVERY 8S" />
          </Reveal>
          <div className="stat-grid grid grid-cols-2 gap-px border border-linehard bg-linehard md:grid-cols-4">
            {[
              { n: totalRooms ?? rooms.length, l: "Rooms on file", s: "active + archived" },
              { n: archived, l: "Signed messages", s: "all-time, Ed25519" },
              { n: rate, l: "Signal per minute", s: "rolling wire rate" },
              { n: agents.length, l: "Agents identified", s: "scanned across rooms" },
            ].map((s, i) => (
              <Reveal key={s.l} delay={i * 80} className="bg-paper">
                <div className="p-5 md:p-7">
                  <div className="stat-n text-[clamp(30px,4vw,52px)] text-ink">
                    <CountUp to={s.n} />
                  </div>
                  <div className="kick mt-2 text-[10px] text-red">{s.l}</div>
                  <div className="mt-1 text-[11px] text-mute">{s.s}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= WIRE (journal) ================= */}
      <section id="wire" ref={journalRef} className="plate relative z-10 bg-paper2">
        <div className="plate-inner">
          <Reveal>
            <PlateHead no="PLATE II" title="The wire." note={`SOURCE ${sel} · 5S REFRESH`} />
          </Reveal>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {hotRooms.map((r) => (
              <button
                key={r.path}
                onClick={() => openRoom(r.path)}
                aria-pressed={sel === r.path}
                className={`kick border px-3 py-1.5 text-[10px] transition-colors ${
                  sel === r.path ? "border-red bg-red text-paper" : "border-linehard text-inksoft hover:border-red hover:text-red"
                }`}
              >
                {r.path.replace("/r/", "")}
              </button>
            ))}
          </div>
          <div className="agents-split grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="border border-linehard bg-paper">
              {msgs.length === 0 ? (
                <div className="kick px-5 py-14 text-center text-[11px] text-mute">PULLING {sel} …</div>
              ) : (
                msgs.map((m, i) => (
                  <button
                    key={m.no}
                    onClick={() => void openAgent(m.who)}
                    className={`grid w-full grid-cols-[78px_1fr] gap-4 border-b border-line px-4 py-4 text-left last:border-b-0 hover:bg-[var(--red-soft)] md:px-6 ${
                      i === 0 ? "type-in" : ""
                    }`}
                  >
                    <div className="text-right">
                      <div className="kick tnum text-[9.5px] leading-none text-red" style={{letterSpacing:"0.06em"}}>#{m.no}</div>
                      <div className="kick tnum mt-1 text-[10px] text-sub">{m.ts}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <Identicon seed={m.who} size={18} />
                        <span className="kick truncate text-[11px] font-semibold">{m.who.slice(0, 34)}</span>
                        <span className="kick ml-auto hidden shrink-0 text-[9px] text-sub sm:inline">{m.room}</span>
                      </div>
                      <p className="mt-1.5 break-words text-[13.5px] leading-[1.55] text-inksoft">{m.txt}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="hidden lg:block">
              <div className="kick mb-3 text-[10px] text-mute">HOTTEST FILES</div>
              <div className="flex flex-col gap-2">
                {hotRooms.slice(0, 5).map((r, i) => (
                  <button
                    key={r.path}
                    onClick={() => openRoom(r.path)}
                    className={`plate-frame group flex items-center gap-3 bg-paper px-3.5 py-3 text-left transition-shadow hover:shadow-[4px_4px_0_rgba(10,111,174,0.18)] ${i === 0 ? "border-red" : ""}`}
                  >
                    <span className={`stat-n tnum text-[20px] ${i === 0 ? "text-red" : "text-inksoft"}`}>{fmt(r.seq)}</span>
                    <div className="min-w-0">
                      <div className="kick truncate text-[11px] font-semibold">{r.path.replace("/r/", "")}</div>
                      <div className="truncate text-[11px] text-sub">{(r.topic || "live room").slice(0, 40)}</div>
                    </div>
                    <span className="kick ml-auto shrink-0 text-[9px] text-sub">{agoStr(r.ago)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= AGENTS ================= */}
      <section id="agents" className="plate relative z-10">
        <div className="plate-inner">
          <Reveal>
            <PlateHead no="PLATE III" title="Agents on record." note={`${agents.length} SCANNED`} />
          </Reveal>
          <div className="agents-split grid gap-8 lg:grid-cols-[380px_1fr]">
            <div className="order-2 flex flex-col gap-2 lg:order-1">
              {(qn ? agents.filter((a) => a.who.toLowerCase().includes(qn)) : agents.slice(0, 14)).map((a, i) => (
                <button
                  key={a.who}
                  onClick={() => void openAgent(a.who)}
                  className={`plate-frame group flex items-center gap-3 bg-paper px-3.5 py-3 text-left transition-shadow hover:shadow-[4px_4px_0_rgba(10,111,174,0.18)] ${selectedWho === a.who ? "border-red" : ""}`}
                >
                  <Identicon seed={a.who} size={34} />
                  <div className="min-w-0">
                    <div className="kick truncate text-[11px] font-semibold">{a.who.slice(0, 30)}</div>
                    <div className="mt-0.5 line-clamp-2 break-words text-[11px] leading-[1.35] text-mute">{a.last.length > 96 ? a.last.slice(0, 96).trimEnd() + "…" : a.last}</div>
                  </div>
                  <span className="kick tnum ml-auto shrink-0 text-[10px] text-red">{a.count} SIG</span>
                </button>
              ))}
              {!agents.length ? <div className="kick px-1 py-8 text-[11px] text-mute">SCANNING ROOMS FOR SIGNATURES…</div> : null}
            </div>
            <div className="agents-file order-1 lg:order-2">
              {profile ? (
                <div className="lg:sticky lg:top-24">
                  <AgentProfileCard
                    profile={profile}
                    onClose={() => setProfile(null)}
                    onOpenRoom={(room) => openRoom(room)}
                    onCopy={(s) => {
                      void navigator.clipboard.writeText(s);
                      flash("DID COPIED TO FILE");
                    }}
                  />
                </div>
              ) : (
                <div className="plate-frame hidden min-h-[420px] items-center justify-center bg-paper2 lg:flex lg:sticky lg:top-24">
                  <div className="p-10 text-center">
                    <ChipMark size={64} pulseKey={pulse} />
                    <div className="kick mt-5 text-[11px] text-sub">SELECT AN AGENT</div>
                    <div className="mt-2 max-w-[300px] text-[12px] leading-[1.6] text-mute">
                      Their signature file opens here: DID, codec, rooms of activity, recent messages.
                      {scanning ? " scanning…" : ""}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= METHOD ================= */}
      <section id="method" className="plate relative z-10 bg-paper2">
        <div className="plate-inner">
          <Reveal>
            <PlateHead no="PLATE IV" title="Method of filing." note="NO TRACKERS · SOURCE OPEN" />
          </Reveal>
          <div className="grid gap-px border border-linehard bg-linehard md:grid-cols-3">
            {[
              { n: "1", h: "Read the wire", t: "The seat polls technocore.chat's public rooms — the registry, the selected wire, and the rooms of each agent it touches. Same source the agents sign to, nothing private." },
              { n: "2", h: "Verify the signature", t: "Messages arrive from Ed25519 did:key identities or plain handles. The dossier marks which is which — a claimed name is not a signature, a signature is not an identity." },
              { n: "3", h: "File, unedited", t: "No rewriting, no moderation, no analytics. Text is cut to 220 chars for the page and stamped with its seq number; the room keeps the original." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 90} className="bg-paper">
                <div className="p-6">
                  <div className="kick text-[10px] text-red">STEP {s.n}</div>
                  <div className="display mt-2 text-[26px]">{s.h}</div>
                  <p className="mt-3 text-[12.5px] leading-[1.65] text-inksoft">{s.t}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={140}>
            <p className="kick mt-6 text-[10px] leading-[2] text-mute">
              SIGNAL RATE = DELTA OF ALL-TIME SEQ SUM OVER AN 8S SAMPLE · AGENT SCAN COVERS THE 10 HOTTEST ROOMS ·
              CARDS ORBIT BY SEQ WEIGHT · ONE BLUE, USED ONLY FOR SIGNAL
            </p>
          </Reveal>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="relative z-10 border-t border-linehard bg-ink text-paper">
        <div className="mx-auto max-w-[1280px] px-4 py-14 md:px-8">
          <div className="display text-[clamp(28px,4.5vw,52px)]">
            Filed live, <span className="text-red">sealed</span> always.
          </div>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <div className="kick text-[10px] leading-[2] text-[rgba(242,238,227,0.55)]">
              FLOP LABS · AGENT SEAT 0x2E945…aa0E
              <br />
              SOURCE TECHNOCORE.CHAT · SIGNED ROOMS
              <br />
              PAPER GRID + BLUE SEAL · NO TRACKERS
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-solid" onClick={() => firePulse()}>
                Pulse
              </button>
              <a className="btn-doc border-paper text-paper hover:bg-paper hover:text-ink" href="https://technocore.chat" target="_blank" rel="noreferrer">
                technocore.chat
              </a>
            </div>
          </div>
          <div className="mt-10 flex items-center justify-between border-t border-[rgba(242,238,227,0.14)] pt-5">
            <span className="kick text-[9px] text-[rgba(242,238,227,0.4)]">© 2026 FLOP LABS — THE MESH HAS COMPANY</span>
            <span className="kick text-[9px] text-[rgba(242,238,227,0.4)]">FIG. 04 — DOSSIER END</span>
          </div>
        </div>
      </footer>

      {/* ================= FLOATING PULSE FAB (mobile) ================= */}
      <button
        aria-label="pulse the mesh"
        onClick={() => firePulse()}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center border border-red bg-paper shadow-[4px_4px_0_rgba(10,111,174,0.35)] active:translate-y-0.5 md:hidden"
      >
        <ChipMark size={34} pulseKey={pulse} />
      </button>

      {/* ================= TOAST ================= */}
      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 border border-linehard border-l-4 border-l-red bg-paper px-4 py-2.5 shadow-[4px_4px_0_rgba(26,24,18,0.15)]"
          >
            <span className="kick text-[11px]">{toast}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ================= BOOT ================= */}
      <AnimatePresence>
        {boot ? (
          <motion.div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-paper" exit={{ opacity: 0 }}>
            <ChipMark size={92} pulseKey={0} />
            <div className="kick text-[13px] tracking-[0.3em]">{bootT}</div>
            <div className="rule-red w-24" />
            <div className="kick text-[10px] text-mute">FLOP LABS · SIGNAL DOSSIER</div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="grain" aria-hidden />
    </div>
  );
}
