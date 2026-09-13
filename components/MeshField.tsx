"use client";

import { useEffect, useRef } from "react";
import p5 from "p5";
import type { Room } from "@/lib/tc";

/*
 * MeshField — CRT radar sweep of the registry. Nodes = rooms on polar grid,
 * sweeping beam, occasional horizontal tear glitch. Dark phosphor palette.
 */
export function MeshField({
  rooms,
  pulse,
  onPick,
}: {
  rooms: Room[];
  pulse: number;
  onPick: (name: string) => void;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const roomsRef = useRef(rooms);
  const pulseRef = useRef(pulse);
  roomsRef.current = rooms;
  useEffect(() => {
    if (pulse > 0) pulseRef.current = pulse;
    else pulseRef.current = Math.max(0, pulseRef.current * 0.9);
  }, [pulse]);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    let dead = false;
    let sketch: p5 | null = null;
    const el = host.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    type Node = { name: string; seq: number; a: number; r: number; da: number; heat: number; x: number; y: number };
    const nodes: Node[] = [];
    let tears: { y: number; h: number; dx: number; t: number }[] = [];

    const SIG = [0, 180, 216];
    const SIG_HOT = [72, 202, 255];
    const OK = [45, 245, 160];

    const s = (p: p5) => {
      let W = 0;
      let H = 0;
      let CX = 0;
      let CY = 0;
      let sweep = 0;

      const sync = () => {
        const list = [...roomsRef.current].sort((a, b) => b.seq - a.seq).slice(0, 22);
        const names = new Set(list.map((r) => r.path.replace("/r/", "")));
        for (let i = nodes.length - 1; i >= 0; i--) if (!names.has(nodes[i].name)) nodes.splice(i, 1);
        list.forEach((r, i) => {
          const name = r.path.replace("/r/", "");
          let n = nodes.find((x) => x.name === name);
          if (!n) {
            n = {
              name,
              seq: r.seq,
              a: (i * 2.39996) % (Math.PI * 2),
              r: 0.24 + ((i * 7919) % 61) / 100,
              da: (0.0012 + ((i * 131) % 5) * 0.0004) * (i % 2 ? -1 : 1),
              heat: 0,
              x: 0,
              y: 0,
            };
            nodes.push(n);
          } else {
            n.seq = r.seq;
          }
        });
      };

      p.setup = () => {
        W = el.clientWidth;
        H = el.clientHeight;
        const c = p.createCanvas(W, H);
        c.elt.style.display = "block";
        p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
        p.textFont("IBM Plex Mono, monospace");
        p.textSize(9);
        resize();
      };

      const resize = () => {
        W = el.clientWidth;
        H = el.clientHeight;
        p.resizeCanvas(W, H);
        CX = W / 2;
        CY = H / 2;
      };
      p.windowResized = resize;

      p.mouseMoved = () => {
        const cv = (p as unknown as { canvas?: { elt?: HTMLCanvasElement } }).canvas;
        if (!cv?.elt) return;
        const r = cv.elt.getBoundingClientRect();
        const mx = p.mouseX - r.left;
        const my = p.mouseY - r.top;
        for (const n of nodes) {
          if (Math.abs(mx - n.x) < 46 && Math.abs(my - n.y) < 9) n.heat = 1;
        }
      };
      p.mousePressed = () => {
        const cv = (p as unknown as { canvas?: { elt?: HTMLCanvasElement } }).canvas;
        if (!cv?.elt) return;
        const r = cv.elt.getBoundingClientRect();
        const mx = p.mouseX - r.left;
        const my = p.mouseY - r.top;
        for (const n of nodes) {
          if (Math.abs(mx - n.x) < 50 && Math.abs(my - n.y) < 10) {
            onPickRef.current(n.name);
            tears.push({ y: my, h: 14 + Math.random() * 10, dx: (Math.random() - 0.5) * 26, t: 1 });
            n.heat = 1;
            return;
          }
        }
      };

      p.draw = () => {
        sync();
        p.clear();
        const t = p.millis() / 1000;
        const RR = Math.min(W, H) * 0.47;

        // range rings + crosshair
        p.noFill();
        for (let i = 1; i <= 3; i++) {
          p.stroke(72, 202, 255, 18 + i * 4);
          p.strokeWeight(1);
          p.circle(CX, CY, (RR * 2 * i) / 3);
        }
        p.stroke(72, 202, 255, 16);
        p.line(CX - RR, CY, CX + RR, CY);
        p.line(CX, CY - RR, CX, CY + RR);

        // sweep beam
        sweep += reduced ? 0.002 : 0.011 + pulseRef.current * 0.05;
        const beam = (sweep % (Math.PI * 2)) - Math.PI;
        const bx = CX + Math.cos(beam) * RR;
        const by = CY + Math.sin(beam) * RR;
        const grad = p.drawingContext as CanvasRenderingContext2D;
        grad.save();
        const g = grad.createLinearGradient(CX, CY, bx, by);
        g.addColorStop(0, "rgba(0,180,216,0.0)");
        g.addColorStop(1, "rgba(72,202,255,0.55)");
        grad.strokeStyle = g;
        grad.lineWidth = 1.6;
        grad.beginPath();
        grad.moveTo(CX, CY);
        grad.lineTo(bx, by);
        grad.stroke();
        grad.restore();

        // links + nodes
        for (const n of nodes) {
          if (!reduced) n.a += n.da * (1 + n.heat * 2);
          const rr = n.r * RR;
          n.x = CX + Math.cos(n.a) * rr;
          n.y = CY + Math.sin(n.a) * rr * 0.82;
          n.heat *= 0.94;

          // link line, brightness pulses when the sweep passes the node
          const d = Math.abs(((n.a - beam + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          const ping = Math.max(0, 1 - d / 0.35) * 160;
          p.stroke(SIG[0], SIG[1], SIG[2], 26 + ping * 0.35 + n.heat * 90);
          p.strokeWeight(1);
          p.line(CX, CY, n.x, n.y);

          // blip
          const sz = 4 + (n.seq > 100000 ? 3 : 0) + n.heat * 4 + ping * 0.03;
          p.noStroke();
          const col = n.heat > 0.2 ? SIG_HOT : SIG;
          p.fill(col[0], col[1], col[2], 150 + n.heat * 105);
          p.rect(n.x - sz / 2, n.y - sz / 2, sz, sz);
          if (n.heat > 0.25 || ping > 60) {
            p.noFill();
            p.stroke(col[0], col[1], col[2], 110);
            p.rect(n.x - sz / 2 - 4, n.y - sz / 2 - 4, sz + 8, sz + 8);
          }

          // label
          const label = n.name.length > 14 ? n.name.slice(0, 13) + "…" : n.name;
          p.fill(215, 244, 255, n.heat > 0.2 ? 240 : 130 + ping * 0.5);
          p.textAlign(n.x < CX ? p.RIGHT : p.LEFT, p.CENTER);
          p.text(label, n.x + (n.x < CX ? -8 : 8), n.y);
        }

        // pulse waves from core
        const pl = pulseRef.current;
        if (pl > 0.02) {
          p.noFill();
          for (let i = 0; i < 3; i++) {
            const w = ((t * 1.4 + i * 0.33) % 1) * RR * 1.25;
            p.stroke(SIG_HOT[0], SIG_HOT[1], SIG_HOT[2], (1 - w / (RR * 1.25)) * 120 * pl);
            p.strokeWeight(1.4);
            p.circle(CX, CY, w * 2);
          }
          p.noStroke();
          p.textSize(9);
          p.textAlign(p.CENTER, p.CENTER);
          p.fill(OK[0], OK[1], OK[2], 220 * pl);
          p.text("SIGNAL SENT", CX, CY + RR * 0.55);
          pulseRef.current = pl * 0.96;
        }

        // core
        p.noStroke();
        p.fill(SIG_HOT[0], SIG_HOT[1], SIG_HOT[2], 235);
        p.rect(CX - 5, CY - 5, 10, 10);
        p.noFill();
        p.stroke(SIG_HOT[0], SIG_HOT[1], SIG_HOT[2], 90);
        p.rect(CX - 11, CY - 11, 22, 22);

        // glitch tears
        if (!reduced && Math.random() < 0.012) {
          tears.push({ y: Math.random() * H, h: 6 + Math.random() * 14, dx: (Math.random() - 0.5) * 18, t: 1 });
        }
        for (const tr of tears) {
          tr.t -= 0.08;
          p.noStroke();
          p.fill(0, 0, 0, 90);
          p.rect(0, tr.y, W, tr.h);
          const cnv = (p as unknown as { canvas?: { elt?: HTMLCanvasElement } }).canvas?.elt;
          if (cnv) (p.drawingContext as CanvasRenderingContext2D).drawImage(cnv, 0, tr.y, W, tr.h, tr.dx, tr.y, W, tr.h);
        }
        tears = tears.filter((x) => x.t > 0);
      };
    };

    (async () => {
      const { default: P5 } = await import("p5");
      if (dead) return;
      sketch = new P5(s, el);
    })();

    return () => {
      dead = true;
      sketch?.remove();
      el.replaceChildren();
    };
  }, []);

  return <div ref={host} className="absolute inset-0" />;
}
