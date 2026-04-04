// Procedural horror audio engine using Web Audio API
// Uses formant synthesis, Shepard tones, tonal clusters, and scream synthesis

let ctx: AudioContext | null = null;
const stopCallbacks: Array<() => void> = [];
let ambientRunning = false;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function resumeContext() {
  if (ctx?.state === "suspended") ctx.resume();
}

// ─── Utility ───────────────────────────────────────────────────────────────

function semitone(base: number, n: number) {
  return base * Math.pow(2, n / 12);
}

function makeReverb(ac: AudioContext, seconds = 3, decay = 2): ConvolverNode {
  const len = ac.sampleRate * seconds;
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  const conv = ac.createConvolver();
  conv.buffer = buf;
  return conv;
}

function makeDistortion(ac: AudioContext, amount = 80): WaveShaperNode {
  const ws = ac.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i * 2) / 256 - 1;
    curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
  }
  ws.curve = curve;
  ws.oversample = "4x";
  return ws;
}

// ─── Shepard Descending Tone (endless falling dread) ───────────────────────

function createShepardTone(
  ac: AudioContext,
  destination: AudioNode,
  rootHz: number,
  speedFactor: number // higher = faster descent
): () => void {
  const numOsc = 8;
  const oscs: OscillatorNode[] = [];
  const gains: GainNode[] = [];
  const duration = (2 / speedFactor) * 8; // seconds for full octave descent

  for (let i = 0; i < numOsc; i++) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    // Each oscillator starts at a different octave
    const startFreq = rootHz * Math.pow(2, i - numOsc / 2);
    osc.frequency.value = startFreq;
    // Bell-shaped volume: loudest in the middle octave range
    const center = numOsc / 2;
    const gaussVol = Math.exp(-0.5 * Math.pow((i - center) / 2.5, 2)) * 0.12;
    g.gain.value = gaussVol;
    osc.connect(g);
    g.connect(destination);
    osc.start();
    oscs.push(osc);
    gains.push(g);
  }

  // Continuously pitch each oscillator down, wrapping around when too low
  const interval = setInterval(() => {
    if (!ambientRunning) return;
    const now = ac.currentTime;
    for (let i = 0; i < numOsc; i++) {
      const freq = oscs[i].frequency.value;
      // Lower frequency slightly each tick
      const newFreq = freq * Math.pow(0.5, (1 / (ac.sampleRate * duration)) * 512);
      // Wrap: if too low, jump up an octave
      const lowestHz = rootHz * Math.pow(2, -numOsc / 2);
      oscs[i].frequency.value = newFreq < lowestHz ? newFreq * Math.pow(2, numOsc) : newFreq;
    }
  }, 64);

  return () => {
    clearInterval(interval);
    oscs.forEach((o) => { try { o.stop(); o.disconnect(); } catch {} });
    gains.forEach((g) => { try { g.disconnect(); } catch {} });
  };
}

// ─── Tonal Cluster (dense dissonant harmony) ────────────────────────────────

function createTonalCluster(
  ac: AudioContext,
  destination: AudioNode,
  rootHz: number,
  numNotes: number,
  intervalSemitones: number,
  gainPerNote: number,
  waveType: OscillatorType = "sawtooth"
): () => void {
  const oscs: OscillatorNode[] = [];
  const gains: GainNode[] = [];
  for (let i = 0; i < numNotes; i++) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = waveType;
    osc.frequency.value = semitone(rootHz, i * intervalSemitones);
    // Slight detune for extra unease
    osc.detune.value = (Math.random() - 0.5) * 8;
    g.gain.value = gainPerNote;
    osc.connect(g);
    g.connect(destination);
    osc.start();
    oscs.push(osc);
    gains.push(g);
  }
  return () => {
    oscs.forEach((o) => { try { o.stop(); o.disconnect(); } catch {} });
    gains.forEach((g) => { try { g.disconnect(); } catch {} });
  };
}

// ─── Breath / Whisper (bandpass-filtered noise) ────────────────────────────

function createBreathLayer(
  ac: AudioContext,
  destination: AudioNode,
  centerHz: number,
  gainVal: number,
  tremoloRate: number
): () => void {
  const bufferSize = 2 * ac.sampleRate;
  const noiseBuf = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) noiseData[i] = Math.random() * 2 - 1;

  const noise = ac.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;

  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = centerHz;
  bp.Q.value = 3;

  const tremoloGain = ac.createGain();
  tremoloGain.gain.value = gainVal;

  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.frequency.value = tremoloRate;
  lfo.type = "sine";
  lfoGain.gain.value = gainVal * 0.6;
  lfo.connect(lfoGain);
  lfoGain.connect(tremoloGain.gain);

  noise.connect(bp);
  bp.connect(tremoloGain);
  tremoloGain.connect(destination);
  noise.start();
  lfo.start();

  return () => {
    try { noise.stop(); } catch {}
    try { lfo.stop(); } catch {}
    [noise, bp, tremoloGain, lfo, lfoGain].forEach((n) => { try { n.disconnect(); } catch {} });
  };
}

// ─── Intermittent Scream-like Formant Hits ──────────────────────────────────

function scheduleFormantHits(
  ac: AudioContext,
  destination: AudioNode,
  minInterval: number,
  maxInterval: number,
  intensity: number
): () => void {
  let stopped = false;

  function fireHit() {
    if (stopped || !ambientRunning) return;
    const now = ac.currentTime;

    // Sawtooth "vocal cord" source
    const src = ac.createOscillator();
    src.type = "sawtooth";
    // Start lower, rise quickly (like a wail starting)
    src.frequency.setValueAtTime(80 + Math.random() * 80, now);
    src.frequency.exponentialRampToValueAtTime(160 + Math.random() * 200, now + 0.8);
    src.frequency.exponentialRampToValueAtTime(60 + Math.random() * 40, now + 1.6);

    // Vibrato
    const vibLfo = ac.createOscillator();
    const vibGain = ac.createGain();
    vibLfo.frequency.value = 5 + Math.random() * 3;
    vibGain.gain.value = 8;
    vibLfo.connect(vibGain);
    vibGain.connect(src.frequency);

    // Formant filter chain (F1, F2, F3 simulate vocal tract resonances)
    const f1 = ac.createBiquadFilter(); f1.type = "bandpass"; f1.frequency.value = 500 + Math.random() * 300; f1.Q.value = 6;
    const f2 = ac.createBiquadFilter(); f2.type = "bandpass"; f2.frequency.value = 1200 + Math.random() * 400; f2.Q.value = 5;
    const f3 = ac.createBiquadFilter(); f3.type = "bandpass"; f3.frequency.value = 2500 + Math.random() * 500; f3.Q.value = 4;

    const mix1 = ac.createGain(); mix1.gain.value = 0.5;
    const mix2 = ac.createGain(); mix2.gain.value = 0.35;
    const mix3 = ac.createGain(); mix3.gain.value = 0.2;
    const masterG = ac.createGain();
    masterG.gain.setValueAtTime(0, now);
    masterG.gain.linearRampToValueAtTime(intensity, now + 0.1);
    masterG.gain.setValueAtTime(intensity, now + 1.2);
    masterG.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

    src.connect(f1); f1.connect(mix1); mix1.connect(masterG);
    src.connect(f2); f2.connect(mix2); mix2.connect(masterG);
    src.connect(f3); f3.connect(mix3); mix3.connect(masterG);
    masterG.connect(destination);

    src.start(now); vibLfo.start(now);
    src.stop(now + 2.2); vibLfo.stop(now + 2.2);

    const delay = (minInterval + Math.random() * (maxInterval - minInterval)) * 1000;
    setTimeout(fireHit, delay);
  }

  const initDelay = (2 + Math.random() * 4) * 1000;
  setTimeout(fireHit, initDelay);

  return () => { stopped = true; };
}

// ─── Heartbeat Pulse ────────────────────────────────────────────────────────

function createHeartbeat(
  ac: AudioContext,
  destination: AudioNode,
  bpm: number,
  gainVal: number
): () => void {
  let stopped = false;
  const interval = (60 / bpm) * 1000;

  function beat(offset: number) {
    if (stopped || !ambientRunning) return;
    const now = ac.currentTime;

    // "lub" - low thud
    const osc1 = ac.createOscillator();
    const g1 = ac.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(60, now + offset / 1000);
    osc1.frequency.exponentialRampToValueAtTime(30, now + offset / 1000 + 0.15);
    g1.gain.setValueAtTime(0, now + offset / 1000);
    g1.gain.linearRampToValueAtTime(gainVal, now + offset / 1000 + 0.01);
    g1.gain.exponentialRampToValueAtTime(0.0001, now + offset / 1000 + 0.18);
    osc1.connect(g1); g1.connect(destination);
    osc1.start(now + offset / 1000);
    osc1.stop(now + offset / 1000 + 0.2);

    // "dub" - slightly higher, delayed 120ms
    const osc2 = ac.createOscillator();
    const g2 = ac.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(50, now + offset / 1000 + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(25, now + offset / 1000 + 0.28);
    g2.gain.setValueAtTime(0, now + offset / 1000 + 0.12);
    g2.gain.linearRampToValueAtTime(gainVal * 0.7, now + offset / 1000 + 0.13);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + offset / 1000 + 0.3);
    osc2.connect(g2); g2.connect(destination);
    osc2.start(now + offset / 1000 + 0.12);
    osc2.stop(now + offset / 1000 + 0.32);
  }

  const handle = setInterval(() => {
    if (stopped || !ambientRunning) return;
    beat(0);
  }, interval);

  return () => { stopped = true; clearInterval(handle); };
}

// ─── PUBLIC API ─────────────────────────────────────────────────────────────

export function startAmbient(hardMode: boolean) {
  if (ambientRunning) return;
  ambientRunning = true;

  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();

  const masterGain = ac.createGain();
  masterGain.gain.setValueAtTime(0, ac.currentTime);
  masterGain.gain.linearRampToValueAtTime(hardMode ? 0.55 : 0.42, ac.currentTime + 5);
  masterGain.connect(ac.destination);

  const reverb = makeReverb(ac, hardMode ? 5 : 4, hardMode ? 1.2 : 2.0);
  reverb.connect(masterGain);

  const dry = ac.createGain();
  dry.gain.value = 0.65;
  dry.connect(masterGain);

  const reverbSend = ac.createGain();
  reverbSend.gain.value = 0.45;
  reverbSend.connect(reverb);

  // 1) Shepard descending tone — constant sense of falling dread
  const shepardSpeed = hardMode ? 0.28 : 0.14;
  stopCallbacks.push(createShepardTone(ac, dry, hardMode ? 55 : 40, shepardSpeed));

  // 2) Low tonal cluster — dense dissonant bass
  // 6 notes spaced 1 semitone apart starting at ~40Hz
  stopCallbacks.push(createTonalCluster(ac, dry, hardMode ? 50 : 38, hardMode ? 8 : 6, 1, hardMode ? 0.055 : 0.04, "sawtooth"));

  // 3) Mid cluster — tritone-heavy chord
  stopCallbacks.push(createTonalCluster(ac, reverbSend, hardMode ? 150 : 110, hardMode ? 5 : 4, 6, hardMode ? 0.04 : 0.03, "sine"));

  // 4) Breath layer — low, whispery
  stopCallbacks.push(createBreathLayer(ac, reverbSend, hardMode ? 300 : 200, hardMode ? 0.08 : 0.05, hardMode ? 0.6 : 0.3));

  // 5) Heartbeat — slow, building dread
  const bpm = hardMode ? 72 : 54;
  stopCallbacks.push(createHeartbeat(ac, dry, bpm, hardMode ? 0.38 : 0.28));

  // 6) Distant formant wails — the most terrifying part
  stopCallbacks.push(scheduleFormantHits(
    ac, reverbSend,
    hardMode ? 4 : 8,   // min interval (seconds)
    hardMode ? 9 : 18,  // max interval (seconds)
    hardMode ? 0.22 : 0.13
  ));

  if (hardMode) {
    // 7) Extra hard mode: second, higher-pitched formant layer (shrieks)
    stopCallbacks.push(scheduleFormantHits(ac, reverbSend, 3, 7, 0.18));

    // 8) High distorted cluster
    const dist = makeDistortion(ac, 120);
    dist.connect(reverbSend);
    stopCallbacks.push(createTonalCluster(ac, dist, 220, 4, 1, 0.03, "square"));

    // 9) Faster tremolo breath at high frequency
    stopCallbacks.push(createBreathLayer(ac, reverbSend, 3500, 0.04, 1.8));

    // 10) Master LFO — slightly pulsing overall volume
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 0.55;
    lfoGain.gain.value = 0.06;
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    lfo.start();
    stopCallbacks.push(() => { try { lfo.stop(); lfo.disconnect(); lfoGain.disconnect(); } catch {} });
  } else {
    // Normal mode: gentle slow pulse
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 0.18;
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);
    lfo.start();
    stopCallbacks.push(() => { try { lfo.stop(); lfo.disconnect(); lfoGain.disconnect(); } catch {} });
  }

  // Register masterGain stop
  stopCallbacks.push(() => {
    const t = ac.currentTime;
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(0, t + 1.5);
    setTimeout(() => { try { masterGain.disconnect(); } catch {} }, 2000);
  });
}

export function stopAmbient() {
  ambientRunning = false;
  stopCallbacks.forEach((fn) => { try { fn(); } catch {} });
  stopCallbacks.length = 0;
}

// ─── JUMP SCARE SOUND ───────────────────────────────────────────────────────

export function playJumpScareSound() {
  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();
  const now = ac.currentTime;

  // ── LAYER 1: Synthesized SCREAM ──────────────────────────────────────────
  // Sawtooth vocal source + 3 formant bandpass filters
  for (let screamIdx = 0; screamIdx < 2; screamIdx++) {
    const delay = screamIdx * 0.05;
    const src = ac.createOscillator();
    src.type = "sawtooth";
    // Pitch arc: 180Hz → 640Hz → 260Hz (rising then settling, like a scream)
    src.frequency.setValueAtTime(180, now + delay);
    src.frequency.exponentialRampToValueAtTime(640, now + delay + 0.35);
    src.frequency.exponentialRampToValueAtTime(320, now + delay + 0.9);
    src.frequency.exponentialRampToValueAtTime(80, now + delay + 1.6);

    // Vibrato (shaking voice effect)
    const vibLfo = ac.createOscillator();
    const vibGain = ac.createGain();
    vibLfo.frequency.value = 7;
    vibGain.gain.value = 18;
    vibLfo.connect(vibGain);
    vibGain.connect(src.frequency);

    // Formant 1 — chest resonance (~600-800 Hz)
    const f1 = ac.createBiquadFilter();
    f1.type = "bandpass";
    f1.frequency.value = 700;
    f1.Q.value = 5;

    // Formant 2 — throat resonance (~1300-1800 Hz)
    const f2 = ac.createBiquadFilter();
    f2.type = "bandpass";
    f2.frequency.value = 1500;
    f2.Q.value = 4;

    // Formant 3 — nasal/high (~2400-3000 Hz)
    const f3 = ac.createBiquadFilter();
    f3.type = "bandpass";
    f3.frequency.value = 2700;
    f3.Q.value = 3;

    const g1 = ac.createGain(); g1.gain.value = 0.7;
    const g2 = ac.createGain(); g2.gain.value = 0.55;
    const g3 = ac.createGain(); g3.gain.value = 0.35;

    const masterScream = ac.createGain();
    masterScream.gain.setValueAtTime(0, now + delay);
    masterScream.gain.linearRampToValueAtTime(0.75, now + delay + 0.04);
    masterScream.gain.setValueAtTime(0.75, now + delay + 0.9);
    masterScream.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.8);

    src.connect(f1); f1.connect(g1); g1.connect(masterScream);
    src.connect(f2); f2.connect(g2); g2.connect(masterScream);
    src.connect(f3); f3.connect(g3); g3.connect(masterScream);
    masterScream.connect(ac.destination);

    src.start(now + delay); vibLfo.start(now + delay);
    src.stop(now + delay + 2.0); vibLfo.stop(now + delay + 2.0);
  }

  // ── LAYER 2: Massive sub-bass impact ("BOOM") ───────────────────────────
  const boom = ac.createOscillator();
  boom.type = "sine";
  boom.frequency.setValueAtTime(90, now);
  boom.frequency.exponentialRampToValueAtTime(22, now + 0.4);
  const boomGain = ac.createGain();
  boomGain.gain.setValueAtTime(0, now);
  boomGain.gain.linearRampToValueAtTime(0.9, now + 0.008);
  boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  boom.connect(boomGain);
  boomGain.connect(ac.destination);
  boom.start(now); boom.stop(now + 0.6);

  // ── LAYER 3: White noise burst (physical shock) ─────────────────────────
  const burstLen = Math.floor(ac.sampleRate * 0.18);
  const burstBuf = ac.createBuffer(2, burstLen, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = burstBuf.getChannelData(c);
    for (let i = 0; i < burstLen; i++) ch[i] = Math.random() * 2 - 1;
  }
  const burst = ac.createBufferSource();
  burst.buffer = burstBuf;
  const burstLp = ac.createBiquadFilter();
  burstLp.type = "lowpass";
  burstLp.frequency.value = 1200;
  const burstGain = ac.createGain();
  burstGain.gain.setValueAtTime(0, now);
  burstGain.gain.linearRampToValueAtTime(0.8, now + 0.004);
  burstGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  burst.connect(burstLp); burstLp.connect(burstGain); burstGain.connect(ac.destination);
  burst.start(now);

  // ── LAYER 4: High screech (sustained ringing) ───────────────────────────
  const screech = ac.createOscillator();
  screech.type = "sawtooth";
  screech.frequency.setValueAtTime(2400, now + 0.05);
  screech.frequency.exponentialRampToValueAtTime(1200, now + 1.2);
  const screechGain = ac.createGain();
  screechGain.gain.setValueAtTime(0, now + 0.05);
  screechGain.gain.linearRampToValueAtTime(0.22, now + 0.08);
  screechGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
  screech.connect(screechGain);
  screechGain.connect(ac.destination);
  screech.start(now + 0.05); screech.stop(now + 1.8);

  // ── LAYER 5: Second scream hit at 0.7s (like the killer strikes again) ──
  const src2 = ac.createOscillator();
  src2.type = "sawtooth";
  src2.frequency.setValueAtTime(300, now + 0.7);
  src2.frequency.exponentialRampToValueAtTime(900, now + 1.0);
  src2.frequency.exponentialRampToValueAtTime(200, now + 1.8);
  const vibLfo2 = ac.createOscillator();
  const vibGain2 = ac.createGain();
  vibLfo2.frequency.value = 9; vibGain2.gain.value = 25;
  vibLfo2.connect(vibGain2); vibGain2.connect(src2.frequency);
  const f2a = ac.createBiquadFilter(); f2a.type = "bandpass"; f2a.frequency.value = 1000; f2a.Q.value = 5;
  const f2b = ac.createBiquadFilter(); f2b.type = "bandpass"; f2b.frequency.value = 2200; f2b.Q.value = 4;
  const m2a = ac.createGain(); m2a.gain.value = 0.6;
  const m2b = ac.createGain(); m2b.gain.value = 0.4;
  const masterScream2 = ac.createGain();
  masterScream2.gain.setValueAtTime(0, now + 0.7);
  masterScream2.gain.linearRampToValueAtTime(0.65, now + 0.73);
  masterScream2.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
  src2.connect(f2a); f2a.connect(m2a); m2a.connect(masterScream2);
  src2.connect(f2b); f2b.connect(m2b); m2b.connect(masterScream2);
  masterScream2.connect(ac.destination);
  src2.start(now + 0.7); vibLfo2.start(now + 0.7);
  src2.stop(now + 2.4); vibLfo2.stop(now + 2.4);
}

// ─── Mini celebration chime ─────────────────────────────────────────────────

export function playMiniCelebration() {
  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();
  const now = ac.currentTime;
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, now + i * 0.12);
    g.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.5);
    osc.connect(g); g.connect(ac.destination);
    osc.start(now + i * 0.12); osc.stop(now + i * 0.12 + 0.6);
  });
}
