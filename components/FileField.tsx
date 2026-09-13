"use client";

import { useEffect, useRef } from "react";
import type { Room } from "@/lib/tc";

/*
 * FileField v2 — the registry plate, drawn inside its own framed container
 * (never full-screen, never colliding with the hero).
 *  - rooms are catalog cards with measured width: no truncation, no overlap
 *  - hierarchy: hottest rooms close to the seal (bigger, darker ink); cold far out
 *  - protected dead-zone + paper disc keep the central octagon readable, on top
 *  - live messages land as rotated red "RECV" stamps, then fade
 *  - one red only (hover heat, stamps, pulse waves). flat paper, no 3D shadows.
 * Interactions: hover heats a card + reveals its seq; click a card opens it
 * (flop-pick); click the seal pulses (flop-pulse).
 */

type Card = {
  rg: number;
  slot: number;
  name: string;
  disp: string;
  seq: number;
  rank: number;
  th: number;
  r0: number;
  om: number;
  heat: number;
  w: number;
  h: number;
  fs: number;
  x: number;
  y: number;
};
type Stamp = { x: number; y: number; tx: number; ty: number; t: number; rot: number };

export function FileField({
  rooms,
  pulse,
  quiet,
  archived,
}: {
  rooms: Room[];
  pulse: number;
  quiet: boolean;
  archived: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const roomsRef = useRef(rooms);
  const pulseRef = useRef(pulse);
  const quietRef = useRef(quiet);
  const archRef = useRef(archived);
  roomsRef.current = rooms;
  pulseRef.current = pulse;
  quietRef.current = quiet;
  archRef.current = archived;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let sketch: { remove: () => void } | null = null;
    let dead = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    (async () => {
      const mod = await import("p5");
      const P5 = mod.default;
      if (dead || !host.current) return;
      P5.disableFriendlyErrors = true;

      sketch = new P5(
        (p) => {
          const cards: Card[] = [];
          const stamps: Stamp[] = [];
          const waves: { t: number }[] = [];
          const mouse = { x: -999, y: -999 };
          let W = 0;
          let H = 0;
          let CX = 0;
          let CY = 0;
          let pPulse = 0;

          const inkA = (a: number) => `rgba(26,24,18,${(a / 255).toFixed(3)})`;
          const redA = (a: number) => `rgba(10,111,174,${(a / 255).toFixed(3)})`;
          const muteA = (a: number) => `rgba(133,126,110,${(a / 255).toFixed(3)})`;

          const coreSize = () => Math.min(58, Math.min(W, H) * 0.13);

          function resize() {
            const r = el!.getBoundingClientRect();
            W = Math.max(240, r.width);
            H = Math.max(240, r.height);
            p.resizeCanvas(W, H);
            CX = W / 2;
            CY = H / 2;
          }

          function sync() {
            const area = W * H;
            const cap = Math.max(9, Math.min(19, Math.floor(area / 21000)));
            const list = [...roomsRef.current].sort((a, b) => b.seq - a.seq).slice(0, cap);
            const names = new Set(list.map((r) => r.path.replace("/r/", "")));
            for (let i = cards.length - 1; i >= 0; i--) {
              if (!names.has(cards[i].name)) cards.splice(i, 1);
            }
            const minR = Math.min(W, H) * 0.17;
            const maxR = Math.min(W, H) * 0.445;
            list.forEach((r, i) => {
              const name = r.path.replace("/r/", "");
              const rank = list.length > 1 ? i / (list.length - 1) : 0;
              let c = cards.find((x) => x.name === name);
              if (c) {
                c.seq = r.seq;
                c.rank = rank;
                return;
              }
              cards.push({
                rg: 2,
                slot: 0,
                name,
                disp: name,
                seq: r.seq,
                rank,
                th: i * 2.39996 + (i % 3) * 0.4,
                r0: minR + rank * (maxR - minR),
                om: 0.05 + (i % 5) * 0.011,
                heat: 0,
                w: 60,
                h: 26,
                fs: 10.5,
                x: CX,
                y: CY,
              });
            });
            const cnt = [0, 0, 0];
            for (const c of cards) c.rg = c.rank < 0.21 ? 0 : c.rank < 0.58 ? 1 : 2;
            for (const c of cards) cnt[c.rg]++;
            for (const c of cards) {
              c.slot = cards.filter((x) => x.rg === c.rg).indexOf(c) % Math.max(1, cnt[c.rg]);
            }
          }

          p.setup = () => {
            const c = p.createCanvas(10, 10);
            c.style("position", "absolute");
            c.style("inset", "0");
            p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
            p.frameRate(reduced ? 12 : 30);
            p.textFont("IBM Plex Mono, ui-monospace, monospace");
            resize();
          };
          p.windowResized = resize;
          p.mouseMoved = () => {
            const cv = (p as unknown as { canvas?: { elt?: HTMLCanvasElement } }).canvas;
            if (!cv?.elt) return;
            const r = cv.elt.getBoundingClientRect();
            mouse.x = p.mouseX - r.left;
            mouse.y = p.mouseY - r.top;
          };

          p.draw = () => {
            sync();
            pPulse = Math.max(pPulse * 0.93, pulseRef.current);
            const t = p.millis() / 1000;
            p.clear();

            const cs = coreSize();

            // faint registration orbits
            p.noFill();
            p.stroke(182, 174, 153, 64);
            p.strokeWeight(1);
            for (const f of [0.34, 0.5, 0.66]) p.circle(CX, CY, Math.min(W, H) * f);

            // orbit motion
            const speed = reduced ? 0.2 : quietRef.current ? 0.35 : 1;
            for (const c of cards) {
              c.th += c.om * 0.028 * speed * (1.15 - c.rank);
              c.heat *= 0.955;
            }

            // measure text widths (throttled)
            if (p.frameCount % 24 === 0 || cards.some((c) => c.w === 60 && c.name.length > 3)) {
              for (const c of cards) {
                const small = Math.min(W, H) < 360 ? 0.78 : 1;
                c.fs = (c.rank < 0.18 ? 13 : c.rank < 0.45 ? 11 : c.rank < 0.75 ? 10 : 9) * small;
                p.textSize(c.fs);
                let disp = c.name;
                if (disp.length > 14 && /^[0-9a-zA-Z]{24,}$/.test(disp)) {
                  disp = disp.slice(0, 6) + "\u2026" + disp.slice(-4);
                } else if (disp.length > 18) {
                  disp = disp.slice(0, 16) + "\u2026";
                }
                c.disp = disp;
                let tw = p.textWidth(disp);
                const cap = Math.min(W, H) * 0.5;
                if (tw > cap) {
                  c.fs = 9;
                  p.textSize(9);
                  tw = p.textWidth(disp);
                }
                const seqRoom = String(c.seq).length * 5.4 + 14;
                c.w = tw + 20 + seqRoom * small;
                c.h = c.fs >= 12 ? 30 : c.fs >= 10.5 ? 26 : 22;
              }
            }

            // ring placement: deterministic elliptical orbits, staggered slots
            const rf = [0.5, 0.72, 0.94];
            const spd = [0.055, 0.04, 0.028];
            const stag = [0, Math.PI / 7, 0];
            const cnt = [0, 0, 0];
            for (const c of cards) cnt[c.rg]++;
            const seen = [0, 0, 0];
            const xe = W / 2 - 26;
            const ye = H / 2 - 34;
            for (const c of cards) {
              const r = c.rg;
              const k = seen[r]++;
              const n = Math.max(1, cnt[r]);
              const base = -Math.PI / 2 + ((k + 0.5) / n) * Math.PI * 2 + stag[r] + t * spd[r] * (r % 2 ? -1 : 1);
              const wob = reduced ? 0 : Math.sin(t * 0.9 + c.th * 3 + k) * 1.6;
              const rr = rf[r] + (c.heat * 0.05) + wob / Math.min(W, H);
              const tx = CX + Math.cos(base) * xe * rr;
              const ty = CY + Math.sin(base) * ye * rr;
              c.th = base;
              if (c.w === 60 && c.x === CX && c.y === CY) {
                c.x = tx;
                c.y = ty;
              } else {
                const ease = reduced ? 1 : 0.16;
                c.x += (tx - c.x) * ease;
                c.y += (ty - c.y) * ease;
              }
            }
            contain();
            // light safety: nudge apart anything the border clamp squeezed
            for (let pass = 0; pass < 3; pass++) {
              for (let i = 0; i < cards.length; i++) {
                for (let j = i + 1; j < cards.length; j++) {
                  const a = cards[i];
                  const b = cards[j];
                  const ox = (a.w + b.w) / 2 + 9 - Math.abs(b.x - a.x);
                  const oy = (a.h + b.h) / 2 + 9 - Math.abs(b.y - a.y);
                  if (ox > 0 && oy > 0) {
                    if (ox < oy) {
                      const s2 = ((b.x >= a.x ? 1 : -1) * ox) / 2;
                      a.x -= s2;
                      b.x += s2;
                    } else {
                      const s2 = ((b.y >= a.y ? 1 : -1) * oy) / 2;
                      a.y -= s2;
                      b.y += s2;
                    }
                  }
                }
              }
              contain();
            }
            // dead zones: seal square + counter strip, edge push on overlap
            {
              const cs2 = coreSize() + 6;
              const zones = [
                { x0: CX - cs2, x1: CX + cs2, y0: CY - cs2, y1: CY + cs2 },
                { x0: CX - 78, x1: CX + 78, y0: CY + cs2 - 6, y1: CY + cs2 + 34 },
              ];
              for (let pass = 0; pass < 4; pass++) {
                for (const c of cards) {
                  for (const z of zones) {
                    const ox = Math.min(c.x + c.w / 2, z.x1) - Math.max(c.x - c.w / 2, z.x0);
                    const oy = Math.min(c.y + c.h / 2, z.y1) - Math.max(c.y - c.h / 2, z.y0);
                    if (ox > 0 && oy > 0) {
                      if (ox < oy) c.x += c.x >= (z.x0 + z.x1) / 2 ? ox + 1 : -ox - 1;
                      else c.y += c.y >= (z.y0 + z.y1) / 2 ? oy + 1 : -oy - 1;
                    }
                  }
                }
                contain();
              }
            }
            // final anti-overlap polish (corners can graze after zone pushes)
            for (let pass = 0; pass < 5; pass++) {
              for (let i = 0; i < cards.length; i++) {
                for (let j = i + 1; j < cards.length; j++) {
                  const a = cards[i];
                  const b = cards[j];
                  const ox = (a.w + b.w) / 2 + 9 - Math.abs(b.x - a.x);
                  const oy = (a.h + b.h) / 2 + 9 - Math.abs(b.y - a.y);
                  if (ox > 0 && oy > 0) {
                    if (ox < oy) {
                      const s2 = ((b.x >= a.x ? 1 : -1) * ox) / 2;
                      a.x -= s2;
                      b.x += s2;
                    } else {
                      const s2 = ((b.y >= a.y ? 1 : -1) * oy) / 2;
                      a.y -= s2;
                      b.y += s2;
                    }
                  }
                }
              }
              // keep the seal + counter strip clear after nudging
              {
                const cs2 = coreSize() + 6;
                for (const c of cards) {
                  const inSeal =
                    Math.abs(c.x - CX) < c.w / 2 + cs2 && Math.abs(c.y - CY) < c.h / 2 + cs2;
                  if (inSeal) c.y += c.y >= CY ? c.h / 2 + cs2 - Math.abs(c.y - CY) + 2 : -(c.h / 2 + cs2 - Math.abs(c.y - CY) + 2);
                }
              }
              contain();
            }
            // hover
            for (const c of cards) {
              if (Math.abs(mouse.x - c.x) < c.w / 2 + 2 && Math.abs(mouse.y - c.y) < c.h / 2 + 2) c.heat = 1;
            }

            // edges: hot + top-rank cards tie to the seal; faint card-card links
            p.strokeWeight(1);
            for (let i = 0; i < cards.length; i++) {
              const a = cards[i];
              if (a.rank < 0.3 || a.heat > 0.35) {
                const hot = a.heat > 0.35;
                p.stroke(hot ? redA(140) : inkA(52 * (1 - a.rank / 0.3)));
                p.line(a.x, a.y, CX, CY);
              }
              for (let j = i + 1; j < cards.length; j++) {
                const b = cards[j];
                const d = p.dist(a.x, a.y, b.x, b.y);
                if (d < 128 && a.rank + b.rank < 1.3) {
                  p.stroke(inkA((1 - d / 128) * 40));
                  p.line(a.x, a.y, b.x, b.y);
                }
              }
            }

            // cards — hierarchy by rank: weight, ink, size; red only for #1 + hover
            for (const c of cards) {
              const hot = c.heat > 0.35;
              const top = c.rank < 0.08;
              p.noStroke();
              p.fill(hot ? 251 : top ? 249 : 246, hot ? 248 : top ? 246 : 242, hot ? 240 : top ? 236 : 233);
              p.rect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 2);
              p.noFill();
              if (top) {
                p.stroke(inkA(220));
                p.strokeWeight(1.5);
              } else {
                p.stroke(hot ? redA(235) : inkA(Math.max(70, 140 - c.rank * 90)));
                p.strokeWeight(hot ? 1.3 : 1);
              }
              p.rect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 2);
              p.noStroke();
              if (hot || top) {
                p.fill(hot ? redA(255) : inkA(220));
                p.rect(c.x - c.w / 2 + 2.5, c.y - c.h / 2 + 3, 2.5, c.h - 6);
              }
              p.fill(hot ? redA(255) : inkA(Math.max(110, 235 - c.rank * 105)));
              p.textAlign(p.LEFT, p.CENTER);
              p.textSize(c.fs);
              p.text(c.disp || c.name, c.x - c.w / 2 + 9, c.y + 0.5);
              if (hot || top) {
                p.textSize(8.5);
                p.textAlign(p.RIGHT, p.CENTER);
                p.fill(hot ? redA(235) : muteA(255));
                if (c.rank < 0.35 || hot) p.text(String(c.seq), c.x + c.w / 2 - 11, c.y + 0.5);
              }
            }

            // stamps
            for (let i = stamps.length - 1; i >= 0; i--) {
              const s = stamps[i];
              s.t += 0.045;
              const k = Math.min(1, s.t);
              const e = 1 - Math.pow(1 - k, 2);
              const ex = s.x + (s.tx - s.x) * e;
              const ey = s.y + (s.ty - s.y) * e;
              const fade = k < 0.8 ? 1 : 1 - (k - 0.8) / 0.2;
              p.push();
              p.translate(ex, ey);
              p.rotate(s.rot * (1 - e * 0.8));
              p.noFill();
              p.stroke(redA(230 * fade));
              p.strokeWeight(1.6);
              p.rect(-17, -10, 34, 20, 2);
              p.fill(redA(235 * fade));
              p.textSize(7.5);
              p.textAlign(p.CENTER, p.CENTER);
              p.text("RECV", 0, 0.5);
              p.circle(14, 10, 2.4);
              p.pop();
              if (s.t >= 1) stamps.splice(i, 1);
            }

            // pulse waves (rate-limited by the pulse ref itself going 0→1)
            if (pPulse > 0.86 && !reduced && waves.every((wv) => wv.t > 0.25)) {
              waves.push({ t: 0 });
            }
            for (let i = waves.length - 1; i >= 0; i--) {
              waves[i].t += 0.018;
              p.noFill();
              p.stroke(redA((1 - waves[i].t) * 105));
              p.strokeWeight(1.5);
              oct(p, CX, CY, cs + 16 + waves[i].t * Math.min(W, H) * 0.75, t * 0.16);
              if (waves[i].t >= 1) waves.splice(i, 1);
            }

            // the seal, on top: paper disc erases crossings
            p.noStroke();
            p.fill(242, 238, 227);
            p.circle(CX, CY, cs * 2 + 20);
            p.noFill();
            p.stroke(inkA(242));
            p.strokeWeight(2.2);
            oct(p, CX, CY, cs + pPulse * 12, t * 0.14);
            p.strokeWeight(1);
            oct(p, CX, CY, (cs + pPulse * 12) * 0.84, t * 0.14);
            // aperture blades
            p.stroke(redA(230));
            p.strokeWeight(1.5);
            for (let i = 0; i < 8; i++) {
              const a0 = t * 0.3 + (i * Math.PI) / 4;
              p.line(CX + Math.cos(a0) * cs * 0.26, CY + Math.sin(a0) * cs * 0.26, CX + Math.cos(a0) * cs * 0.5, CY + Math.sin(a0) * cs * 0.5);
            }
            p.noStroke();
            p.fill(redA(255));
            p.circle(CX, CY, 5);
            p.fill(inkA(255));
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(11);
            p.text("FLOP", CX, CY - cs * 0.58 - 3);
            p.text("LABS", CX, CY + cs * 0.58 + 5);
            p.textSize(9.5);
            const signedTxt = `${Math.floor(archRef.current).toLocaleString("en-US")} SIGNED`;
            const stw = p.textWidth(signedTxt);
            p.noStroke();
            p.fill(242, 238, 227, 235);
            p.rect(CX - stw / 2 - 5, CY + cs + 11, stw + 10, 15, 2);
            p.fill(inkA(195));
            p.text(signedTxt, CX, CY + cs + 18);
            if (p.dist(mouse.x, mouse.y, CX, CY) < cs + 12) {
              p.fill(inkA(200));
              p.textSize(8.5);
              p.text("CLICK TO PULSE", CX, CY + cs + 32);
            }
          };

          function contain() {
            for (const c of cards) {
              const mx = c.w / 2 + 7;
              const my = c.h / 2 + 7;
              c.x = Math.min(W - mx, Math.max(mx, c.x));
              c.y = Math.min(H - my, Math.max(my, c.y));
            }
          }

          p.mousePressed = (ev?: MouseEvent) => {
            if (!ev) return;
            const cv = (p as unknown as { canvas?: { elt?: HTMLCanvasElement } }).canvas;
            if (!cv?.elt) return;
            const r = cv.elt.getBoundingClientRect();
            const mx = ev.clientX - r.left;
            const my = ev.clientY - r.top;
            for (const c of cards) {
              if (Math.abs(mx - c.x) < c.w / 2 && Math.abs(my - c.y) < c.h / 2) {
                window.dispatchEvent(new CustomEvent("flop-pick", { detail: { name: c.name } }));
                c.heat = 1;
                return;
              }
            }
            if (Math.hypot(mx - CX, my - CY) < coreSize() + 16) {
              window.dispatchEvent(new CustomEvent("flop-pulse"));
            }
          };

          const onMsg = (e: Event) => {
            const src = cards[(Math.random() * cards.length) | 0];
            const ang = Math.random() * Math.PI * 2;
            const rad = coreSize() * (0.6 + Math.random() * 0.55);
            const sx = src ? src.x : CX + (Math.random() - 0.5) * W * 0.8;
            const sy = src ? src.y : -24;
            if (src) src.heat = 1;
            stamps.push({ x: sx, y: sy, tx: CX + Math.cos(ang) * rad, ty: CY + Math.sin(ang) * rad, t: 0, rot: (Math.random() - 0.5) * 1.8 });
          };
          window.addEventListener("flop-msg", onMsg);
          const prevRemove = p.remove.bind(p);
          p.remove = () => {
            window.removeEventListener("flop-msg", onMsg);
            prevRemove();
          };
        },
        el,
      );
    })();

    return () => {
      dead = true;
      sketch?.remove();
      host.current?.replaceChildren();
    };
  }, []);

  return <div ref={host} className="absolute inset-0" aria-hidden />;
}

function oct(
  p: { beginShape: Function; vertex: Function; endShape: Function; CLOSE: unknown },
  x: number,
  y: number,
  r: number,
  rot: number,
) {
  p.beginShape();
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * Math.PI) / 4 + Math.PI / 8;
    p.vertex(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  p.endShape(p.CLOSE);
}
