"use client";

import { useEffect, useRef } from "react";
import type { Room } from "@/lib/tc";

type Bubble = { x: number; y: number; t: number; who: string };
type Comet = { x: number; y: number; tx: number; ty: number; t: number };
type Agent = {
  name: string;
  th: number;
  r0: number;
  om: number;
  heat: number;
  x: number;
  y: number;
};

export function MeshField({
  rooms,
  pulse,
  view,
}: {
  rooms: Room[];
  pulse: number;
  view: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const roomsRef = useRef(rooms);
  const pulseRef = useRef(pulse);
  const viewRef = useRef(view);
  roomsRef.current = rooms;
  pulseRef.current = pulse;
  viewRef.current = view;

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
        const agents: Agent[] = [];
        const bubbles: Bubble[] = [];
        const comets: Comet[] = [];
        const rings: { t: number }[] = [];
        let CX = 0;
        let CY = 0;
        let pPulse = 0;
        let hover = "";

        function syncAgents() {
            const list = roomsRef.current.slice(0, 40);
          const names = new Set(list.map((r) => r.path.replace("/r/", "")));
          for (const a of [...agents]) {
            if (!names.has(a.name)) agents.splice(agents.indexOf(a), 1);
          }
          list.forEach((r, i) => {
            const name = r.path.replace("/r/", "");
            if (agents.some((a) => a.name === name)) return;
            agents.push({
              name,
              th: i * 2.399,
              r0: 70 + (i % 7) * 28,
              om: 0.04 + (i % 5) * 0.012,
              heat: 1,
              x: 0,
              y: 0,
            });
          });
        }

        p.setup = () => {
          p.createCanvas(p.windowWidth, p.windowHeight);
          p.pixelDensity(1);
          p.frameRate(30);
          p.noStroke();
        };

        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight);
        };

        p.draw = () => {
          syncAgents();
          pPulse = Math.max(pPulse * 0.92, pulseRef.current);
          CX = p.width * (p.width < 860 ? 0.5 : 0.56);
          CY = p.height * (p.width < 860 ? 0.42 : 0.44);
          p.clear();
          const t = p.millis() / 1000;

          for (const a of agents) {
            a.th += a.om * 0.033;
            a.heat *= 0.96;
            const dx = p.mouseX - (CX + Math.cos(a.th) * a.r0 * 1.15);
            const dy = p.mouseY - (CY + Math.sin(a.th) * a.r0 * 0.7);
            if (dx * dx + dy * dy < 1600) a.heat = 1;
            a.x = CX + Math.cos(a.th) * (a.r0 + a.heat * 10) * 1.15;
            a.y = CY + Math.sin(a.th) * (a.r0 + a.heat * 10) * 0.7;
          }

          p.strokeWeight(1);
          for (let i = 0; i < agents.length; i++) {
            for (let j = i + 1; j < agents.length; j++) {
              const d = p.dist(agents[i].x, agents[i].y, agents[j].x, agents[j].y);
              if (d < 130) {
                p.stroke(0, 180, 216, (1 - d / 130) * 90);
                p.line(agents[i].x, agents[i].y, agents[j].x, agents[j].y);
              }
            }
          }

          hover = "";
          for (const a of agents) {
            const hot = a.heat > 0.35;
            p.noStroke();
            p.fill(hot ? 50 : 0, hot ? 215 : 180, hot ? 75 : 216, 230);
            oct(p, a.x, a.y, 11 + a.heat * 5, a.th);
            p.noFill();
            p.stroke(245, 247, 250, 80 + a.heat * 120);
            p.strokeWeight(1.2);
            oct(p, a.x, a.y, 11 + a.heat * 5, a.th);
            if (p.dist(p.mouseX, p.mouseY, a.x, a.y) < 16) {
              hover = a.name;
              p.fill(245, 247, 250);
              p.textFont("Space Mono, ui-monospace, monospace");
              p.textSize(11);
              p.text(a.name, a.x + 12, a.y - 8);
            }
          }

          for (let i = comets.length - 1; i >= 0; i--) {
            const c = comets[i];
            c.t += 0.045;
            const x = c.x + (c.tx - c.x) * c.t;
            const y = c.y + (c.ty - c.y) * c.t;
            p.stroke(50, 215, 75, 180);
            p.strokeWeight(2);
            p.line(c.x + (c.tx - c.x) * Math.max(0, c.t - 0.12), c.y + (c.ty - c.y) * Math.max(0, c.t - 0.12), x, y);
            if (c.t >= 1) comets.splice(i, 1);
          }

          for (let i = bubbles.length - 1; i >= 0; i--) {
            const b = bubbles[i];
            b.t += 0.02;
            p.noStroke();
            p.fill(21, 29, 50, (1 - b.t) * 220);
            p.rect(b.x, b.y - 18, Math.min(160, b.who.length * 7 + 16), 18, 4);
            p.fill(0, 180, 216, (1 - b.t) * 255);
            p.textSize(10);
            p.text(b.who.slice(0, 18), b.x + 6, b.y - 5);
            if (b.t >= 1) bubbles.splice(i, 1);
          }

          const core = 58 + pPulse * 26 + Math.sin(t * 1.3) * 3;
          p.noFill();
          p.stroke(0, 180, 216, 240);
          p.strokeWeight(2.2);
          oct(p, CX, CY, core, t * 0.2);
          p.fill(10, 17, 40);
          p.noStroke();
          oct(p, CX, CY, core * 0.24, t * 0.2);
          p.fill(pPulse > 0.2 ? p.color(50, 215, 75) : p.color(4, 102, 200));
          p.rect(CX - 5, CY - 5, 10, 10);

          if (pPulse > 0.85) rings.push({ t: 0 });
          for (let i = rings.length - 1; i >= 0; i--) {
            rings[i].t += 0.025;
            p.noFill();
            p.stroke(0, 180, 216, (1 - rings[i].t) * 140);
            oct(p, CX, CY, core + rings[i].t * 280, t * 0.2);
            if (rings[i].t >= 1) rings.splice(i, 1);
          }

          if (viewRef.current === "pulse") {
            p.noFill();
            p.stroke(245, 247, 250, 230);
            p.strokeWeight(1.8);
            p.beginShape();
            for (let i = 0; i < 64; i++) {
              const x = (i / 63) * p.width;
              const y = p.height * 0.78 + Math.sin(t * 4 + i * 0.35) * 18 * (0.4 + pPulse);
              p.vertex(x, y);
            }
            p.endShape();
          }
        };

        p.mousePressed = () => {
          for (const a of agents) {
            if (p.dist(p.mouseX, p.mouseY, a.x, a.y) < 18) {
              window.dispatchEvent(new CustomEvent("flop-pick", { detail: { name: a.name } }));
              a.heat = 1;
              return;
            }
          }
          if (p.dist(p.mouseX, p.mouseY, CX, CY) < 70) {
            window.dispatchEvent(new CustomEvent("flop-pulse"));
          }
        };

        const onMsg = (e: Event) => {
          const who = (e as CustomEvent).detail?.who || "agent";
          const src = agents[(Math.random() * agents.length) | 0];
          if (src) {
            src.heat = 1;
            comets.push({ x: src.x, y: src.y, tx: CX, ty: CY, t: 0 });
            bubbles.push({ x: src.x, y: src.y, t: 0, who });
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

  return <div ref={host} className="pointer-events-auto fixed inset-0 z-0" />;
}

function oct(p: { beginShape: Function; vertex: Function; endShape: Function; CLOSE: unknown }, x: number, y: number, r: number, rot: number) {
  p.beginShape();
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * Math.PI) / 4 + Math.PI / 8;
    p.vertex(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  p.endShape("close");
}
