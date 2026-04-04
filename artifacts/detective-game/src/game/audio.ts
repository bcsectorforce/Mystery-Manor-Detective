// Procedural horror audio engine — Web Audio API
// Formant synthesis, Shepard tones, realistic scream synthesis

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

// ─── Utilities ───────────────────────────────────────────────────────────────

function semitone(base: number, n: number) {
  return base * Math.pow(2, n / 12);
}

function makeReverb(ac: AudioContext, seconds = 5, decay = 1.2): ConvolverNode {
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

function makeDistortion(ac: AudioContext, amount = 120): WaveShaperNode {
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

// ─── Shepard Descending Tone (endless falling dread) ────────────────────────

function createShepardTone(
  ac: AudioContext,
  destination: AudioNode,
  rootHz: number,
  speedFactor: number
): () => void {
  const numOsc = 8;
  const oscs: OscillatorNode[] = [];
  const duration = (2 / speedFactor) * 8;

  for (let i = 0; i < numOsc; i++) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = rootHz * Math.pow(2, i - numOsc / 2);
    osc.detune.value = (Math.random() - 0.5) * 6;
    const center = numOsc / 2;
    g.gain.value = Math.exp(-0.5 * Math.pow((i - center) / 2.5, 2)) * 0.13;
    osc.connect(g);
    g.connect(destination);
    osc.start();
    oscs.push(osc);
  }

  const interval = setInterval(() => {
    if (!ambientRunning) return;
    for (let i = 0; i < numOsc; i++) {
      const freq = oscs[i].frequency.value;
      const newFreq = freq * Math.pow(0.5, (1 / (ac.sampleRate * duration)) * 512);
      const lowestHz = rootHz * Math.pow(2, -numOsc / 2);
      oscs[i].frequency.value = newFreq < lowestHz ? newFreq * Math.pow(2, numOsc) : newFreq;
    }
  }, 64);

  return () => {
    clearInterval(interval);
    oscs.forEach((o) => { try { o.stop(); o.disconnect(); } catch {} });
  };
}

// ─── Tonal Cluster ───────────────────────────────────────────────────────────

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
  for (let i = 0; i < numNotes; i++) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = waveType;
    osc.frequency.value = semitone(rootHz, i * intervalSemitones);
    osc.detune.value = (Math.random() - 0.5) * 10;
    g.gain.value = gainPerNote;
    osc.connect(g);
    g.connect(destination);
    osc.start();
    oscs.push(osc);
  }
  return () => { oscs.forEach((o) => { try { o.stop(); o.disconnect(); } catch {} }); };
}

// ─── Breath / Whisper layer ──────────────────────────────────────────────────

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

// ─── Intermittent Formant Wails ──────────────────────────────────────────────

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
    const src = ac.createOscillator();
    src.type = "sawtooth";
    src.frequency.setValueAtTime(80 + Math.random() * 80, now);
    src.frequency.exponentialRampToValueAtTime(160 + Math.random() * 200, now + 0.8);
    src.frequency.exponentialRampToValueAtTime(60 + Math.random() * 40, now + 1.6);

    const vibLfo = ac.createOscillator();
    const vibGain = ac.createGain();
    vibLfo.frequency.value = 5 + Math.random() * 3;
    vibGain.gain.value = 8;
    vibLfo.connect(vibGain);
    vibGain.connect(src.frequency);

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

  setTimeout(fireHit, (2 + Math.random() * 4) * 1000);
  return () => { stopped = true; };
}

// ─── Heartbeat ───────────────────────────────────────────────────────────────

function createHeartbeat(
  ac: AudioContext,
  destination: AudioNode,
  bpm: number,
  gainVal: number
): () => void {
  let stopped = false;

  function beat() {
    if (stopped || !ambientRunning) return;
    const now = ac.currentTime;

    const osc1 = ac.createOscillator();
    const g1 = ac.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(60, now);
    osc1.frequency.exponentialRampToValueAtTime(30, now + 0.15);
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(gainVal, now + 0.01);
    g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc1.connect(g1); g1.connect(destination);
    osc1.start(now); osc1.stop(now + 0.2);

    const osc2 = ac.createOscillator();
    const g2 = ac.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(50, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(25, now + 0.28);
    g2.gain.setValueAtTime(0, now + 0.12);
    g2.gain.linearRampToValueAtTime(gainVal * 0.7, now + 0.13);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc2.connect(g2); g2.connect(destination);
    osc2.start(now + 0.12); osc2.stop(now + 0.32);
  }

  const handle = setInterval(() => {
    if (stopped || !ambientRunning) return;
    beat();
  }, (60 / bpm) * 1000);

  return () => { stopped = true; clearInterval(handle); };
}

// ─── PUBLIC: Start Ambient (same terror for both modes) ──────────────────────

export function startAmbient(_hardMode: boolean) {
  if (ambientRunning) return;
  ambientRunning = true;

  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();

  const masterGain = ac.createGain();
  masterGain.gain.setValueAtTime(0, ac.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.55, ac.currentTime + 5);
  masterGain.connect(ac.destination);

  const reverb = makeReverb(ac, 5, 1.2);
  reverb.connect(masterGain);

  const dry = ac.createGain();
  dry.gain.value = 0.65;
  dry.connect(masterGain);

  const reverbSend = ac.createGain();
  reverbSend.gain.value = 0.45;
  reverbSend.connect(reverb);

  // 1. Shepard descending — endless dread
  stopCallbacks.push(createShepardTone(ac, dry, 55, 0.28));

  // 2. Dense low tonal cluster
  stopCallbacks.push(createTonalCluster(ac, dry, 50, 8, 1, 0.055, "sawtooth"));

  // 3. Mid tritone cluster through reverb
  stopCallbacks.push(createTonalCluster(ac, reverbSend, 150, 5, 6, 0.04, "sine"));

  // 4. Low breath whisper
  stopCallbacks.push(createBreathLayer(ac, reverbSend, 300, 0.08, 0.6));

  // 5. Heartbeat
  stopCallbacks.push(createHeartbeat(ac, dry, 72, 0.38));

  // 6. Distant formant wails every 4–9s
  stopCallbacks.push(scheduleFormantHits(ac, reverbSend, 4, 9, 0.22));

  // 7. Second higher shriek layer every 3–7s
  stopCallbacks.push(scheduleFormantHits(ac, reverbSend, 3, 7, 0.18));

  // 8. Distorted square cluster
  const dist = makeDistortion(ac, 120);
  dist.connect(reverbSend);
  stopCallbacks.push(createTonalCluster(ac, dist, 220, 4, 1, 0.03, "square"));

  // 9. High-frequency hiss
  stopCallbacks.push(createBreathLayer(ac, reverbSend, 3500, 0.04, 1.8));

  // 10. Master LFO pulse
  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.type = "sine";
  lfo.frequency.value = 0.55;
  lfoGain.gain.value = 0.06;
  lfo.connect(lfoGain);
  lfoGain.connect(masterGain.gain);
  lfo.start();
  stopCallbacks.push(() => { try { lfo.stop(); lfo.disconnect(); lfoGain.disconnect(); } catch {} });

  // Fade-out on stop
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

// ─── JUMP SCARE: High-pitched human child scream ─────────────────────────────
// Child vocal tract is ~30% shorter than adult → all formants shift up proportionally.
// Fundamental: 450–1100 Hz range. Formants: F1~1200, F2~2600, F3~4000, F4~5200.
// Minimal reverb (reverb causes the "ghostly" effect). No heavy distortion.

export function playJumpScareSound() {
  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();
  const now = ac.currentTime;

  // Very small, tight room reverb — just enough to place the voice in a space,
  // not enough to make it sound supernatural
  const tightReverb = makeReverb(ac, 0.8, 3.5);
  const reverbSend = ac.createGain();
  reverbSend.gain.value = 0.18;  // low reverb mix = human, not ghost
  tightReverb.connect(reverbSend);
  reverbSend.connect(ac.destination);

  // ── VOCAL SOURCE: sawtooth (primary harmonic content) ───────────────────
  const sawOsc = ac.createOscillator();
  sawOsc.type = "sawtooth";

  // Child pitch arc: gasp at 450 Hz → sharp rise to 1100 Hz by 0.15s
  // (children scream much higher than adults, 900-1200 Hz is realistic)
  // Sustains with wavering → slow fall as breath runs out → fade
  sawOsc.frequency.setValueAtTime(450, now);
  sawOsc.frequency.exponentialRampToValueAtTime(1100, now + 0.15);
  sawOsc.frequency.exponentialRampToValueAtTime(1060, now + 0.5);
  sawOsc.frequency.exponentialRampToValueAtTime(1150, now + 1.0);
  sawOsc.frequency.exponentialRampToValueAtTime(1020, now + 1.6);
  sawOsc.frequency.exponentialRampToValueAtTime(1080, now + 2.1);
  sawOsc.frequency.exponentialRampToValueAtTime(900, now + 2.7);
  sawOsc.frequency.exponentialRampToValueAtTime(600, now + 3.3);
  sawOsc.frequency.exponentialRampToValueAtTime(320, now + 4.0);

  // Sine mixed in for warmth — stops it sounding purely synthetic
  const sineOsc = ac.createOscillator();
  sineOsc.type = "sine";
  sineOsc.frequency.setValueAtTime(450, now);
  sineOsc.frequency.exponentialRampToValueAtTime(1100, now + 0.15);
  sineOsc.frequency.exponentialRampToValueAtTime(1060, now + 0.5);
  sineOsc.frequency.exponentialRampToValueAtTime(1150, now + 1.0);
  sineOsc.frequency.exponentialRampToValueAtTime(1020, now + 1.6);
  sineOsc.frequency.exponentialRampToValueAtTime(1080, now + 2.1);
  sineOsc.frequency.exponentialRampToValueAtTime(900, now + 2.7);
  sineOsc.frequency.exponentialRampToValueAtTime(600, now + 3.3);
  sineOsc.frequency.exponentialRampToValueAtTime(320, now + 4.0);

  const sawMix = ac.createGain(); sawMix.gain.value = 0.72;
  const sineMix = ac.createGain(); sineMix.gain.value = 0.28;
  sawOsc.connect(sawMix);
  sineOsc.connect(sineMix);

  // ── VIBRATO: two LFOs at slightly different rates (irregular = human) ────
  // Children's vibrato is faster and shallower than adults
  const vibLfo1 = ac.createOscillator();
  const vibGain1 = ac.createGain();
  vibLfo1.type = "sine";
  vibLfo1.frequency.setValueAtTime(0, now);            // starts silent (gasp)
  vibLfo1.frequency.linearRampToValueAtTime(9.5, now + 0.3); // fast child-like rate
  vibGain1.gain.value = 22;   // depth in Hz — tighter than adult
  vibLfo1.connect(vibGain1);
  vibGain1.connect(sawOsc.frequency);
  vibGain1.connect(sineOsc.frequency);

  const vibLfo2 = ac.createOscillator();
  const vibGain2 = ac.createGain();
  vibLfo2.type = "sine";
  vibLfo2.frequency.value = 10.3; // second LFO slightly different = irregular
  vibGain2.gain.value = 11;
  vibLfo2.connect(vibGain2);
  vibGain2.connect(sawOsc.frequency);
  vibGain2.connect(sineOsc.frequency);

  // ── BREATHINESS: airy noise component (sharp/high) ───────────────────────
  // Adds the breathy, raw edge of a real scream — especially prominent at high pitch
  const breathBufSize = Math.floor(ac.sampleRate * 4.5);
  const breathBuf = ac.createBuffer(1, breathBufSize, ac.sampleRate);
  const bd = breathBuf.getChannelData(0);
  for (let i = 0; i < breathBufSize; i++) bd[i] = Math.random() * 2 - 1;
  const breathSrc = ac.createBufferSource();
  breathSrc.buffer = breathBuf;
  // High-pass the noise — keeps only the airy top end
  const breathHP = ac.createBiquadFilter();
  breathHP.type = "highpass";
  breathHP.frequency.value = 3500;
  const breathGain = ac.createGain();
  breathGain.gain.value = 0.09;
  breathSrc.connect(breathHP);
  breathHP.connect(breathGain);

  // ── FORMANT FILTERS: child vocal tract proportions ───────────────────────
  // Child vocal tract ~30% shorter → all formants ~30% higher than adult values

  // F1 — ~1200 Hz  (adult equivalent ~820 Hz, ×1.46 for child)
  const f1 = ac.createBiquadFilter();
  f1.type = "bandpass";
  f1.frequency.setValueAtTime(900, now);
  f1.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
  f1.frequency.setValueAtTime(1200, now + 2.8);
  f1.frequency.exponentialRampToValueAtTime(950, now + 4.0);
  f1.Q.value = 8;

  // F2 — ~2600 Hz  (adult ~1600 Hz)
  const f2 = ac.createBiquadFilter();
  f2.type = "bandpass";
  f2.frequency.setValueAtTime(2000, now);
  f2.frequency.exponentialRampToValueAtTime(2600, now + 0.2);
  f2.frequency.setValueAtTime(2600, now + 2.8);
  f2.frequency.exponentialRampToValueAtTime(2100, now + 4.0);
  f2.Q.value = 7;

  // F3 — ~4000 Hz  (adult ~2900 Hz) — the piercing "edge" quality
  const f3 = ac.createBiquadFilter();
  f3.type = "bandpass";
  f3.frequency.setValueAtTime(3400, now);
  f3.frequency.exponentialRampToValueAtTime(4000, now + 0.2);
  f3.frequency.setValueAtTime(4000, now + 2.8);
  f3.frequency.exponentialRampToValueAtTime(3500, now + 4.0);
  f3.Q.value = 5;

  // F4 — ~5200 Hz  (adult ~3800 Hz) — ultra-bright sheen / air
  const f4 = ac.createBiquadFilter();
  f4.type = "bandpass";
  f4.frequency.value = 5200;
  f4.Q.value = 3;

  const m1 = ac.createGain(); m1.gain.value = 0.62;
  const m2 = ac.createGain(); m2.gain.value = 0.52;
  const m3 = ac.createGain(); m3.gain.value = 0.40;
  const m4 = ac.createGain(); m4.gain.value = 0.22;

  // Wire sources into formants
  sawMix.connect(f1); sawMix.connect(f2); sawMix.connect(f3); sawMix.connect(f4);
  sineMix.connect(f1); sineMix.connect(f2); sineMix.connect(f3); sineMix.connect(f4);
  breathGain.connect(f3); breathGain.connect(f4); // breathiness only in upper formants

  f1.connect(m1); f2.connect(m2); f3.connect(m3); f4.connect(m4);

  // ── MASTER ENVELOPE ───────────────────────────────────────────────────────
  // Instant sharp attack → loud for 3 seconds → gradual natural fade
  const masterScream = ac.createGain();
  masterScream.gain.setValueAtTime(0, now);
  masterScream.gain.linearRampToValueAtTime(1.0, now + 0.018); // razor-sharp attack
  masterScream.gain.setValueAtTime(1.0, now + 2.8);            // sustain ~3s
  masterScream.gain.linearRampToValueAtTime(0.55, now + 3.3);  // breath running out
  masterScream.gain.exponentialRampToValueAtTime(0.0001, now + 4.3); // gone

  m1.connect(masterScream);
  m2.connect(masterScream);
  m3.connect(masterScream);
  m4.connect(masterScream);
  breathGain.connect(masterScream);

  // Output: mostly dry (human), small reverb send
  masterScream.connect(ac.destination);
  masterScream.connect(tightReverb);

  // ── START ALL OSCILLATORS ─────────────────────────────────────────────────
  const stopAt = now + 4.6;
  sawOsc.start(now);   sawOsc.stop(stopAt);
  sineOsc.start(now);  sineOsc.stop(stopAt);
  vibLfo1.start(now);  vibLfo1.stop(stopAt);
  vibLfo2.start(now);  vibLfo2.stop(stopAt);
  breathSrc.start(now);

  // ── PRE-SCREAM: sharp inhale gasp (50ms of high-passed noise) ────────────
  const gaspLen = Math.floor(ac.sampleRate * 0.055);
  const gaspBuf = ac.createBuffer(1, gaspLen, ac.sampleRate);
  const gd = gaspBuf.getChannelData(0);
  for (let i = 0; i < gaspLen; i++) gd[i] = Math.random() * 2 - 1;
  const gasp = ac.createBufferSource();
  gasp.buffer = gaspBuf;
  const gaspHP = ac.createBiquadFilter();
  gaspHP.type = "highpass";
  gaspHP.frequency.value = 2000;
  const gaspGain = ac.createGain();
  gaspGain.gain.setValueAtTime(0.5, now);
  gaspGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
  gasp.connect(gaspHP); gaspHP.connect(gaspGain); gaspGain.connect(ac.destination);
  gasp.start(now);

  // ── IMPACT THUD (lighter than before — just a quick punch, not monster bass) ─
  const thud = ac.createOscillator();
  thud.type = "sine";
  thud.frequency.setValueAtTime(120, now);
  thud.frequency.exponentialRampToValueAtTime(45, now + 0.25);
  const thudGain = ac.createGain();
  thudGain.gain.setValueAtTime(0, now);
  thudGain.gain.linearRampToValueAtTime(0.5, now + 0.006);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  thud.connect(thudGain); thudGain.connect(ac.destination);
  thud.start(now); thud.stop(now + 0.35);
}

// ─── Mini celebration chime ───────────────────────────────────────────────────

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
