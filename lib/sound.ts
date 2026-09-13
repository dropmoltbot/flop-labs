export type SoundEngine = {
  enabled: boolean;
  start: () => void;
  stop: () => void;
  click: () => void;
  ping: (f?: number) => void;
  chime: () => void;
  agent: (seed: string) => void;
  msg: () => void;
};

export function createSound(): SoundEngine {
  let ac: AudioContext | null = null;
  let drone: { oscA: OscillatorNode; oscB: OscillatorNode; lfo: OscillatorNode; gain: GainNode } | null = null;
  const engine: SoundEngine = {
    enabled: false,
    start() {
      engine.enabled = true;
      const a = ctx();
      if (!a || drone) return;
      const filter = a.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 300;
      const gain = a.createGain();
      gain.gain.value = 0.018;
      const oscA = a.createOscillator();
      oscA.type = "sawtooth";
      oscA.frequency.value = 44;
      const oscB = a.createOscillator();
      oscB.type = "sine";
      oscB.frequency.value = 88;
      const lfo = a.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.1;
      const lfoG = a.createGain();
      lfoG.gain.value = 150;
      lfo.connect(lfoG);
      lfoG.connect(filter.frequency);
      oscA.connect(filter);
      oscB.connect(filter);
      filter.connect(gain);
      gain.connect(a.destination);
      oscA.start();
      oscB.start();
      lfo.start();
      drone = { oscA, oscB, lfo, gain };
    },
    stop() {
      engine.enabled = false;
      if (drone) {
        try {
          drone.oscA.stop();
          drone.oscB.stop();
          drone.lfo.stop();
        } catch {
          /* already */
        }
        drone = null;
      }
    },
    click() {
      blip(1400, 0.05, 0.03, "square");
    },
    ping(f = 760) {
      blip(f, 0.14, 0.05, "sine");
    },
    chime() {
      blip(659, 0.28, 0.04, "sine", 0);
      blip(880, 0.28, 0.04, "sine", 0.1);
      blip(1040, 0.28, 0.04, "sine", 0.2);
    },
    agent(seed: string) {
      let h = 0;
      for (const c of seed) h = (h * 33 + c.charCodeAt(0)) >>> 0;
      blip(420 + (h % 480), 0.18, 0.05, "triangle");
    },
    msg() {
      blip(920, 0.07, 0.035, "sine");
    },
  };

  function ctx() {
    if (!ac) {
      try {
        ac = new AudioContext();
      } catch {
        return null;
      }
    }
    if (ac.state === "suspended") ac.resume().catch(() => {});
    return ac;
  }
  function blip(f: number, d: number, g: number, type: OscillatorType, when = 0) {
    if (!engine.enabled) return;
    const a = ctx();
    if (!a) return;
    const o = a.createOscillator();
    const v = a.createGain();
    o.type = type;
    o.frequency.value = f;
    v.gain.setValueAtTime(g, a.currentTime + when);
    v.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + when + d);
    o.connect(v).connect(a.destination);
    o.start(a.currentTime + when);
    o.stop(a.currentTime + when + d + 0.02);
  }
  return engine;
}
