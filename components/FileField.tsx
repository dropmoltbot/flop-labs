"use client";

import { useEffect, useRef, useState } from "react";
import type { Room, Msg } from "@/lib/tc";

/*
 * FileField — the hero surface. Paper-canvas p5 sketch:
 *  - rooms as archival card-catalog chips orbiting a central octagon seal
 *  - live messages fly as red "rubber stamp" marks from a chip to the seal
 *  - ink lines connect nearby rooms (registration-mark style)
 *  - subtle blueprint grid + concentric registration circles
 * Interactions: hover heats a chip, click opens its file (flop-pick), click seal pulses.
 */

type Chip = {
  name: string;
  th: number;
  r0: number;
  om: number;
  heat: number;
  x: number;
  y: number;
  seq: number;
};
type Stamp = { x: number; y: number; tx: number; ty: number; t: number; label: string };
type Wave = { t: number };

export function FileField({ rooms, pulse, quiet }: { rooms: Room[]; pulse: number; quiet: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const roomsRef = useRef(rooms);
  const pulseRef = useRef(pulse);
  const quietRef = useRef(quiet);
  roomsRef.current = rooms;
  pulseRef.current = pulse;
  quietRef.current = quiet;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let sketch: { remove: () => void } | null = null;
    let dead = false;

    (async () => {
      const mod = await import("p5");
      const P5 = mod.default;
      if (dead || !host.current) return;
      P5.disableFriendlyErrors = true;

      sketch = new P5((p) => {
        const chips: Chip[] = [];
        const stamps: Stamp[] = [];
        const waves: Wave[] = [];
        const mouse = { x: -999, y: -999 };
        let CX = 0;
        let CY = 0;
        let pPulse = 0;
        let hover = "";
        const inkA = (a: number) => `rgba(26,24,18,${(a/255).toFixed(3)})`;
        const redA = (a: number) => `rgba(200,54,31,${(a/255).toFixed(3)})`;
        const muteA = (a: number) => `rgba(164,156,138,${(a/255).toFixed(3)})`;

        function syncChips() {
          const list = roomsRef.current.slice(0, 34);
          const names = new Set(list.map((r) => r.path.replace("/r/", "")));
          for (let i = chips.length - 1; i >= 0; i--) {
            if (!names.has(chips[i].name)) chips.splice(i, 1);
          }
          list.forEach((r, i) => {
            const name = r.path.replace("/r/", "");
            if (chips.some((c) => c.name === name)) return;
            chips.push({
              name,
              seq: r.seq,
              th: i * 2.399 + 0.7,
              r0: 130 + (i % 6) * 52,
              om: 0.05 + ((i * 7) % 5) * 0.011,
              heat: 0,
              x: 0,
              y: 0,
            });
          });
        }

        p.setup = () => {
          const c = p.createCanvas(p.windowWidth, p.windowHeight);
          c.style("z-index", "0");
          p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
          p.frameRate(30);
          p.noStroke();
          p.textFont("IBM Plex Mono, ui-monospace, monospace");
        };
        p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight);
        p.mouseMoved = () => {
          mouse.x = p.mouseX;
          mouse.y = p.mouseY;
        };

        p.draw = () => {
          syncChips();
          pPulse = Math.max(pPulse * 0.93, pulseRef.current);
          const narrow = p.width < 860;
          CX = p.width * (narrow ? 0.5 : 0.5);
          CY = p.height * (narrow ? 0.4 : 0.46);
          const t = p.millis() / 1000;

          // paper
          p.noStroke();
          p.fill(242, 238, 227);
          p.rect(0, 0, p.width, p.height);

          // blueprint grid
          p.stroke(217, 210, 192);
          p.strokeWeight(1);
          const gs = 48;
          for (let x = (CX % gs); x < p.width; x += gs) p.line(x, 0, x, p.height);
          for (let y = (CY % gs); y < p.height; y += gs) p.line(0, y, p.width, y);

          // registration circles
          p.noFill();
          p.stroke(185, 174, 153, 90);
          p.strokeWeight(1);
          for (const rr of [170, 240, 320, 410]) {
            p.circle(CX, CY, rr * 2);
          }
          p.stroke(muteA(110));
          p.line(CX - 452, CY, CX + 452, CY);
          p.line(CX, CY - 452, CX, CY + 452);

          // chips: orbit + heat
          for (const c of chips) {
            c.th += c.om * 0.032 * (quietRef.current ? 0.4 : 1);
            c.heat *= 0.955;
            const wob = Math.sin(t * 0.9 + c.th * 3) * 3;
            const dx = mouse.x - (CX + Math.cos(c.th) * c.r0);
            const dy = mouse.y - (CY + Math.sin(c.th) * c.r0 * 0.72);
            if (dx * dx + dy * dy < 2500) c.heat = 1;
            c.x = CX + Math.cos(c.th) * (c.r0 + c.heat * 12 + wob) * 1.06;
            c.y = CY + Math.sin(c.th) * (c.r0 + c.heat * 12 + wob) * 0.72;
          }
          // wide screens: confine the whole registry to the right 55% so hero text is never touched
          if (p.width >= 1024) {
            const minX = p.width * 0.56;
            for (const c of chips) {
              if (c.x < minX) {
                // re-project onto orbit but with center pushed right & radius clamped
                const rx = Math.max(120, Math.abs(Math.cos(c.th)) * c.r0 * 1.1);
                c.x = Math.max(minX, CX + (c.x >= CX ? 1 : -1) * rx);
              }
            }
          }

          // separation pass: push overlapping chips apart radially
          for (let pass = 0; pass < 3; pass++) {
            for (let i = 0; i < chips.length; i++) {
              for (let j = i + 1; j < chips.length; j++) {
                const a = chips[i];
                const b = chips[j];
                const dx = b.x - a.x;
                const dy = (b.y - a.y) * 1.4;
                const dd = Math.sqrt(dx * dx + dy * dy) || 1;
                if (dd < 108) {
                  const push = ((92 - dd) / 2) * 0.55;
                  const nx = (dx / dd) * push;
                  const ny = (dy / dd) * push;
                  a.x -= nx; a.y -= ny * 0.7;
                  b.x += nx; b.y += ny * 0.7;
                }
              }
            }
          }

          // registration lines between close chips
          p.strokeWeight(1);
          for (let i = 0; i < chips.length; i++) {
            for (let j = i + 1; j < chips.length; j++) {
              const a = chips[i];
              const b = chips[j];
              const d = p.dist(a.x, a.y, b.x, b.y);
              if (d < 168) {
                p.stroke(inkA((1 - d / 168) * 52));
                p.line(a.x, a.y, b.x, b.y);
              }
            }
          }

          // chips as catalog cards
          hover = "";
          for (const c of chips) {
            const hot = c.heat > 0.4;
            p.textSize(10.5);
            const nameW = Math.min(96, p.textWidth(c.name.slice(0, 14)));
            const w = nameW + 46;
            const h = 24;
            // card shadow
            p.noStroke();
            p.fill(26, 24, 18, 24);
            p.rect(c.x - w / 2 + 2.5, c.y - h / 2 + 3, w, h, 2);
            // card
            p.fill(hot ? 250 : 247, hot ? 246 : 243, hot ? 240 : 235);
            p.rect(c.x - w / 2, c.y - h / 2, w, h, 2);
            // border + corner punch
            p.stroke(hot ? redA(220) : inkA(150));
            p.strokeWeight(hot ? 1.6 : 1);
            p.rect(c.x - w / 2, c.y - h / 2, w, h, 2);
            // seq number right side
            p.noStroke();
            p.fill(hot ? redA(255) : muteA(255));
            p.textSize(8);
            p.textAlign(p.RIGHT, p.CENTER);
            p.text(String(c.seq), c.x + w / 2 - 6, c.y + 0.5);
            // name
            p.textAlign(p.LEFT, p.CENTER);
            p.fill(hot ? redA(255) : inkA(255));
            p.textSize(10.5);
            p.text(c.name.slice(0, 14), c.x - w / 2 + 7, c.y + 0.5);
            // little red tick when hot
            if (hot) {
              p.fill(redA(255));
              p.rect(c.x - w / 2, c.y - h / 2, 3, h);
            }
            if (p.dist(mouse.x, mouse.y, c.x, c.y) < 22) hover = c.name;
          }

          // flying stamps (msg events)
          for (let i = stamps.length - 1; i >= 0; i--) {
            const s = stamps[i];
            s.t += 0.042;
            const ex = s.x + (s.tx - s.x) * s.t;
            const ey = s.y + (s.ty - s.y) * s.t;
            const k = 1 - Math.abs(0.5 - s.t) * 2; // 0..1..0
            p.push();
            p.translate(ex, ey);
            p.rotate(s.t * 2.4);
            p.noFill();
            p.stroke(redA(k * 235));
            p.strokeWeight(1.8);
            p.rect(-13, -9, 26, 18, 2);
            p.fill(redA(k * 235));
            p.textSize(8);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(s.label.slice(0, 3).toUpperCase(), 0, 0.5);
            p.pop();
            // trail
            p.stroke(redA(k * 70));
            p.strokeWeight(1);
            p.line(s.x + (s.tx - s.x) * Math.max(0, s.t - 0.14), s.y + (s.ty - s.y) * Math.max(0, s.t - 0.14), ex, ey);
            if (s.t >= 1) stamps.splice(i, 1);
          }

          // central seal: the octagon stamp
          const core = 64 + pPulse * 20 + Math.sin(t * 1.1) * 2.5;
          // stamp waves on pulse
          if (pPulse > 0.86) waves.push({ t: 0 });
          for (let i = waves.length - 1; i >= 0; i--) {
            waves[i].t += 0.022;
            p.noFill();
            p.stroke(redA((1 - waves[i].t) * 120));
            p.strokeWeight(1.6);
            oct(p, CX, CY, core + waves[i].t * 300, t * 0.16);
            if (waves[i].t >= 1) waves.splice(i, 1);
          }
          // seal body: double octagon + inner rule
          p.noFill();
          p.stroke(inkA(235));
          p.strokeWeight(2.4);
          oct(p, CX, CY, core, t * 0.16);
          p.strokeWeight(1);
          oct(p, CX, CY, core * 0.86, t * 0.16);
          // text around seal
          p.fill(inkA(255));
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(10);
          p.text("FLOP", CX, CY - 9);
          p.textSize(8);
          p.fill(muteA(255));
          p.text("LABS · SIG", CX, CY + 8);
          p.fill(redA(255));
          p.rect(CX - 4, CY - 4, 8, 8);
          // seal hover hint
          if (p.dist(mouse.x, mouse.y, CX, CY) < core + 10) {
            p.fill(inkA(200));
            p.textSize(9);
            p.textAlign(p.CENTER, p.TOP);
            p.text("TAP THE SEAL", CX, CY + core + 16);
          }
        };

        p.mousePressed = () => {
          for (const c of chips) {
            if (p.dist(p.mouseX, p.mouseY, c.x, c.y) < 26) {
              window.dispatchEvent(new CustomEvent("flop-pick", { detail: { name: c.name } }));
              c.heat = 1;
              return;
            }
          }
          if (p.dist(p.mouseX, p.mouseY, CX, CY) < 80) {
            window.dispatchEvent(new CustomEvent("flop-pulse"));
          }
        };

        const onMsg = (e: Event) => {
          const who = ((e as CustomEvent).detail?.who as string) || "sig";
          const src = chips[(Math.random() * chips.length) | 0];
          if (src) {
            src.heat = 1;
            stamps.push({ x: src.x, y: src.y, tx: CX, ty: CY, t: 0, label: who });
          }
        };
        window.addEventListener("flop-msg", onMsg);
        const prevRemove = p.remove.bind(p);
        p.remove = () => {
          window.removeEventListener("flop-msg", onMsg);
          prevRemove();
        };
      }, el);
    })();

    return () => {
      dead = true;
      sketch?.remove();
      host.current?.replaceChildren();
    };
  }, []);

  return <div ref={host} className="pointer-events-auto fixed inset-0 z-0" aria-hidden />;
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
