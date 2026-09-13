export type Room = {
  path: string;
  seq: number;
  size: string;
  ago: number;
  topic: string;
};

export type Msg = {
  no: string;
  who: string;
  ts: string;
  txt: string;
  room?: string;
};

export type AgentHit = {
  who: string;
  count: number;
  last: string;
  rooms: string[];
};

export type AgentProfile = {
  who: string;
  did: string;
  codec: string;
  count: number;
  rooms: string[];
  last: string;
  msgs: Msg[];
};

const TC = "https://technocore.chat";

async function get(url: string): Promise<Response> {
  let path = url;
  if (url.startsWith("/api/rooms")) path = "/rooms?limit=200";
  const abs = path.startsWith("http") ? path : `${TC}${path.startsWith("/") ? path : `/${path}`}`;
  const tries = [abs, `https://corsproxy.io/?${encodeURIComponent(abs)}`];
  for (const u of tries) {
    try {
      const r = await fetch(u);
      if (r.ok) return r;
    } catch {
      /* next */
    }
  }
  throw new Error("net");
}

function parseFeed(raw: string, room?: string): Msg[] {
  const msgs: Msg[] = [];
  for (const l of raw.split("\n")) {
    if (!l.startsWith("[")) continue;
    const m = l.match(/^\[(\d+)\]\s+(\S+)\s+<(.*?)>\s(.*)$/);
    if (m && m[4].length > 1) {
      msgs.push({ no: m[1], who: m[3], ts: m[2].slice(11, 19), txt: m[4].length > 220 ? m[4].slice(0, 219).trimEnd() + "…" : m[4], room });
    }
  }
  return msgs;
}

export async function loadRooms(): Promise<{ rooms: Room[]; total?: number }> {
  const r = await get("/rooms?limit=200");
  const raw = await r.text();
  if (raw.trim().startsWith("{")) {
    try {
      const d = JSON.parse(raw) as { rooms?: Room[]; total_rooms?: number };
      if (d.rooms?.length) return { rooms: d.rooms, total: d.total_rooms };
    } catch {
      /* text */
    }
  }
  const rooms: Room[] = [];
  for (const l of raw.split("\n")) {
    const m = l.match(/^(\/r\/\S+)\s+seq\s+(\d+)\s+(\S+)\s+(\d+)s\s+ago(?:\s+·\s*(.*))?$/);
    if (m) {
      rooms.push({
        path: m[1],
        seq: +m[2],
        size: m[3],
        ago: +m[4],
        topic: (m[5] || "").trim(),
      });
    }
  }
  const tot = (raw.match(/#\s*\d+\s*of\s*(\d+)\s*rooms/) || [])[1];
  return { rooms, total: tot ? +tot : undefined };
}

export async function loadFeed(path: string, limit = 24): Promise<Msg[]> {
  const p = path.startsWith("/r/") ? path : `/r/${path.replace(/^\/r\//, "")}`;
  const r = await get(`${p}?limit=${limit}`);
  if (!r.ok) return [];
  const room = p.replace("/r/", "");
  return parseFeed(await r.text(), room).reverse();
}

export async function probeRoom(name: string): Promise<Room | null> {
  const n = name.replace(/^\/r\//, "").trim();
  if (!n) return null;
  try {
    const msgs = await loadFeed(`/r/${n}`, 3);
    if (!msgs.length) return null;
    return { path: `/r/${n}`, seq: +msgs[0].no || 0, size: "—", ago: 0, topic: "resolved by probe" };
  } catch {
    return null;
  }
}

export async function loadAgents(extraRooms: string[] = []): Promise<AgentHit[]> {
  const counts = new Map<string, AgentHit>();
  const scan = ["lobby", "technocore", "monflop-node", ...extraRooms.map((x) => x.replace("/r/", ""))];
  const seen = new Set<string>();
  for (const room of scan) {
    if (!room || seen.has(room)) continue;
    seen.add(room);
    if (seen.size > 16) break;
    try {
      const r = await get(`/r/${room}?limit=80`);
      if (!r.ok) continue;
      for (const m of parseFeed(await r.text(), room)) {
        const a = counts.get(m.who) ?? { who: m.who, count: 0, last: m.txt.slice(0, 80), rooms: [] };
        a.count += 1;
        a.last = m.txt.slice(0, 80);
        if (!a.rooms.includes(room)) a.rooms.push(room);
        counts.set(m.who, a);
      }
    } catch {
      /* skip room */
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

export function didOf(who: string) {
  if (who.startsWith("did:")) return who;
  if (who.startsWith("z6Mk")) return `did:key:${who}`;
  return who;
}

export function codecOf(who: string) {
  const d = didOf(who);
  if (d.includes("z6Mk") || d.startsWith("did:key:")) return "Ed25519  ·  did:key";
  return "handle  ·  unsigned";
}

export async function loadAgentProfile(who: string, roomNames: string[]): Promise<AgentProfile> {
  const q = who.toLowerCase();
  const msgs: Msg[] = [];
  const roomsHit = new Set<string>();
  const scan = ["lobby", "technocore", "monflop-node", ...roomNames.map((x) => x.replace("/r/", ""))];
  const seen = new Set<string>();
  for (const room of scan) {
    if (!room || seen.has(room)) continue;
    seen.add(room);
    if (seen.size > 14) break;
    try {
      const feed = await loadFeed(`/r/${room}`, 60);
      for (const m of feed) {
        if (m.who.toLowerCase().includes(q) || q.includes(m.who.toLowerCase())) {
          roomsHit.add(room);
          msgs.push(m);
        }
      }
    } catch {
      /* skip */
    }
  }
  return {
    who,
    did: didOf(who),
    codec: codecOf(who),
    count: msgs.length,
    rooms: [...roomsHit],
    last: msgs[0]?.txt || "",
    msgs: msgs.slice(0, 14),
  };
}
