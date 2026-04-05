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

// ─── Intro Hum: Deep rising dread ────────────────────────────────────────────

let introHumNodes: Array<() => void> = [];
let introHumRunning = false;

export function startIntroHum() {
  if (introHumRunning) return;
  introHumRunning = true;

  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();

  const masterGain = ac.createGain();
  masterGain.gain.setValueAtTime(0, ac.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.38, ac.currentTime + 2.5);
  masterGain.connect(ac.destination);

  const reverb = makeReverb(ac, 7, 1.4);
  const reverbSend = ac.createGain();
  reverbSend.gain.value = 0.55;
  reverb.connect(reverbSend);
  reverbSend.connect(masterGain);

  // Sweep: 35 Hz → 520 Hz over 32 seconds (deeply terrifying rise)
  const SWEEP_SECS = 32;

  interface SweepConfig {
    startHz: number;
    endHz: number;
    detune: number;
    gain: number;
    wave: OscillatorType;
    toReverb: boolean;
  }

  const layers: SweepConfig[] = [
    { startHz: 35,  endHz: 520, detune:   0, gain: 0.28, wave: "sine",     toReverb: false },
    { startHz: 37,  endHz: 535, detune:  14, gain: 0.20, wave: "sine",     toReverb: false },
    { startHz: 52,  endHz: 780, detune:  -9, gain: 0.14, wave: "sine",     toReverb: true  },
    { startHz: 41,  endHz: 490, detune: -18, gain: 0.10, wave: "sawtooth", toReverb: true  },
  ];

  for (const layer of layers) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = layer.wave;
    osc.detune.value = layer.detune;

    // Tremolo — hum character
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.type = "sine";
    lfo.frequency.value = 5.2;
    lfoGain.gain.value = layer.gain * 0.45;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    g.gain.value = layer.gain;

    osc.connect(g);
    g.connect(masterGain);
    if (layer.toReverb) g.connect(reverb);

    // Schedule the rising sweep — looping every SWEEP_SECS
    const schedule = () => {
      if (!introHumRunning) return;
      const now = ac.currentTime;
      osc.frequency.cancelScheduledValues(now);
      osc.frequency.setValueAtTime(layer.startHz, now);
      osc.frequency.exponentialRampToValueAtTime(layer.endHz, now + SWEEP_SECS);
    };

    schedule();
    const sweepInterval = setInterval(schedule, SWEEP_SECS * 1000);

    osc.start();
    lfo.start();

    introHumNodes.push(() => {
      clearInterval(sweepInterval);
      try { osc.stop(); osc.disconnect(); } catch {}
      try { lfo.stop(); lfo.disconnect(); lfoGain.disconnect(); } catch {}
    });
  }

  // Master breathing pulse (very slow, 0.15 Hz)
  const breathLfo = ac.createOscillator();
  const breathLfoGain = ac.createGain();
  breathLfo.type = "sine";
  breathLfo.frequency.value = 0.15;
  breathLfoGain.gain.value = 0.07;
  breathLfo.connect(breathLfoGain);
  breathLfoGain.connect(masterGain.gain);
  breathLfo.start();

  // Dissonant sub-bass rumble (just below hearing, felt more than heard)
  const subOsc = ac.createOscillator();
  const subGain = ac.createGain();
  subOsc.type = "sine";
  subOsc.frequency.setValueAtTime(28, ac.currentTime);
  subOsc.frequency.exponentialRampToValueAtTime(80, ac.currentTime + SWEEP_SECS);
  subGain.gain.value = 0.35;
  subOsc.connect(subGain);
  subGain.connect(masterGain);
  subOsc.start();

  introHumNodes.push(() => {
    const t = ac.currentTime;
    masterGain.gain.setValueAtTime(masterGain.gain.value, t);
    masterGain.gain.linearRampToValueAtTime(0, t + 1.8);
    setTimeout(() => {
      try { masterGain.disconnect(); reverbSend.disconnect(); } catch {}
    }, 2500);
    try { breathLfo.stop(); breathLfo.disconnect(); breathLfoGain.disconnect(); } catch {}
    try { subOsc.stop(); subOsc.disconnect(); subGain.disconnect(); } catch {}
  });
}

export function stopIntroHum() {
  if (!introHumRunning) return;
  introHumRunning = false;
  introHumNodes.forEach((fn) => { try { fn(); } catch {} });
  introHumNodes = [];
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

// ─── JUMP SCARE: Ear-splitting high-pitched scream ────────────────────────────
// Stays HIGH the whole time (no downward pitch glide = no balloon sound).
// Loud, sharp, lots of noise/breathiness, abrupt end.

export function playJumpScareSound() {
  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();
  const now = ac.currentTime;

  // Compressor to keep volume hot without clipping
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -6;
  comp.knee.value = 3;
  comp.ratio.value = 4;
  comp.attack.value = 0.001;
  comp.release.value = 0.1;
  comp.connect(ac.destination);

  // Tight room reverb (small amount — keeps it human, not ghostly)
  const tightReverb = makeReverb(ac, 0.6, 4.0);
  const rvSend = ac.createGain(); rvSend.gain.value = 0.14;
  tightReverb.connect(rvSend); rvSend.connect(ac.destination);

  // ── VOCAL SOURCE ────────────────────────────────────────────────────────
  const sawOsc = ac.createOscillator();
  sawOsc.type = "sawtooth";
  const sineOsc = ac.createOscillator();
  sineOsc.type = "sine";

  // Pitch: rush from 380Hz → 1350Hz in 0.12s, then LOCK at ~1300Hz
  // No slow descent — that's the balloon. Stay high, end abruptly.
  [sawOsc, sineOsc].forEach((osc) => {
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(1350, now + 0.12);
    // Tiny irregular micro-drifts to stay human, not mechanical
    osc.frequency.setValueAtTime(1350, now + 0.12);
    osc.frequency.linearRampToValueAtTime(1320, now + 0.5);
    osc.frequency.linearRampToValueAtTime(1360, now + 1.0);
    osc.frequency.linearRampToValueAtTime(1310, now + 1.5);
    osc.frequency.linearRampToValueAtTime(1380, now + 2.0);
    osc.frequency.linearRampToValueAtTime(1330, now + 2.5);
    osc.frequency.linearRampToValueAtTime(1300, now + 3.0);
    // Hold and end — no long glide down
  });

  const sawMix = ac.createGain(); sawMix.gain.value = 0.68;
  const sineMix = ac.createGain(); sineMix.gain.value = 0.32;
  sawOsc.connect(sawMix);
  sineOsc.connect(sineMix);

  // ── VIBRATO: two mismatched LFOs = irregular, human feel ────────────────
  const vibLfo1 = ac.createOscillator();
  const vibGain1 = ac.createGain();
  vibLfo1.type = "sine";
  vibLfo1.frequency.setValueAtTime(0, now);
  vibLfo1.frequency.linearRampToValueAtTime(10, now + 0.25); // fast child vibrato
  vibGain1.gain.value = 30; // wider depth = more urgent/panicked
  vibLfo1.connect(vibGain1);
  vibGain1.connect(sawOsc.frequency);
  vibGain1.connect(sineOsc.frequency);

  const vibLfo2 = ac.createOscillator();
  const vibGain2 = ac.createGain();
  vibLfo2.type = "sine";
  vibLfo2.frequency.value = 11.4; // different rate = irregular
  vibGain2.gain.value = 16;
  vibLfo2.connect(vibGain2);
  vibGain2.connect(sawOsc.frequency);
  vibGain2.connect(sineOsc.frequency);

  // Amplitude tremolo — voice shakes when screaming hard
  const tremoloLfo = ac.createOscillator();
  const tremoloGain = ac.createGain();
  tremoloLfo.type = "sine";
  tremoloLfo.frequency.value = 13; // fast shake
  tremoloGain.gain.value = 0.06;
  tremoloLfo.connect(tremoloGain);
  // connected to masterScream.gain below

  // ── BREATHINESS: high noise layer — the "rawness" of a real scream ───────
  // This is what makes it sound human vs synthetic. More = more human.
  const breathBufSize = Math.floor(ac.sampleRate * 3.5);
  const breathBuf = ac.createBuffer(1, breathBufSize, ac.sampleRate);
  const bd = breathBuf.getChannelData(0);
  for (let i = 0; i < breathBufSize; i++) bd[i] = Math.random() * 2 - 1;
  const breathSrc = ac.createBufferSource();
  breathSrc.buffer = breathBuf;
  const breathHP = ac.createBiquadFilter();
  breathHP.type = "highpass";
  breathHP.frequency.value = 2800; // only high-frequency air
  const breathGain = ac.createGain();
  breathGain.gain.value = 0.28; // much louder than before — adds rawness
  breathSrc.connect(breathHP);
  breathHP.connect(breathGain);

  // ── FORMANT FILTERS: child vocal tract (all frequencies shifted up) ──────
  // Formants stay FIXED — not tracking pitch down, that's what caused the balloon

  const f1 = ac.createBiquadFilter(); // ~1250 Hz — chest/open vowel
  f1.type = "bandpass"; f1.frequency.value = 1250; f1.Q.value = 10;

  const f2 = ac.createBiquadFilter(); // ~2700 Hz — throat mid
  f2.type = "bandpass"; f2.frequency.value = 2700; f2.Q.value = 9;

  const f3 = ac.createBiquadFilter(); // ~4200 Hz — nasal edge / shrillness
  f3.type = "bandpass"; f3.frequency.value = 4200; f3.Q.value = 7;

  const f4 = ac.createBiquadFilter(); // ~5500 Hz — piercing air
  f4.type = "bandpass"; f4.frequency.value = 5500; f4.Q.value = 4;

  const m1 = ac.createGain(); m1.gain.value = 0.70;
  const m2 = ac.createGain(); m2.gain.value = 0.60;
  const m3 = ac.createGain(); m3.gain.value = 0.48;
  const m4 = ac.createGain(); m4.gain.value = 0.28;

  sawMix.connect(f1); sawMix.connect(f2); sawMix.connect(f3); sawMix.connect(f4);
  sineMix.connect(f1); sineMix.connect(f2); sineMix.connect(f3); sineMix.connect(f4);
  breathGain.connect(f2); breathGain.connect(f3); breathGain.connect(f4);

  f1.connect(m1); f2.connect(m2); f3.connect(m3); f4.connect(m4);

  // ── OVERTONE SCREECH: a pitched layer an octave up for extra shrillness ──
  const overtone = ac.createOscillator();
  overtone.type = "sawtooth";
  overtone.frequency.setValueAtTime(760, now);
  overtone.frequency.exponentialRampToValueAtTime(2700, now + 0.12);
  overtone.frequency.setValueAtTime(2700, now + 0.12);
  const overtoneGain = ac.createGain();
  overtoneGain.gain.value = 0.22;
  overtone.connect(overtoneGain);

  // ── MASTER ENVELOPE ───────────────────────────────────────────────────────
  // Instant attack, FULL VOLUME for 3 seconds, short 0.4s fade — not a balloon glide
  const masterScream = ac.createGain();
  masterScream.gain.setValueAtTime(0, now);
  masterScream.gain.linearRampToValueAtTime(1.35, now + 0.015); // very loud, instant
  masterScream.gain.setValueAtTime(1.35, now + 2.95);
  masterScream.gain.exponentialRampToValueAtTime(0.0001, now + 3.45); // sharp cutoff

  tremoloGain.connect(masterScream.gain); // amplitude tremolo

  m1.connect(masterScream); m2.connect(masterScream);
  m3.connect(masterScream); m4.connect(masterScream);
  breathGain.connect(masterScream);
  overtoneGain.connect(masterScream);

  masterScream.connect(comp);
  masterScream.connect(tightReverb);

  // ── START ────────────────────────────────────────────────────────────────
  const endAt = now + 3.6;
  sawOsc.start(now);     sawOsc.stop(endAt);
  sineOsc.start(now);    sineOsc.stop(endAt);
  overtone.start(now);   overtone.stop(endAt);
  vibLfo1.start(now);    vibLfo1.stop(endAt);
  vibLfo2.start(now);    vibLfo2.stop(endAt);
  tremoloLfo.start(now); tremoloLfo.stop(endAt);
  breathSrc.start(now);

  // ── PRE-SCREAM GASP ──────────────────────────────────────────────────────
  const gaspLen = Math.floor(ac.sampleRate * 0.05);
  const gaspBuf = ac.createBuffer(1, gaspLen, ac.sampleRate);
  const gd = gaspBuf.getChannelData(0);
  for (let i = 0; i < gaspLen; i++) gd[i] = Math.random() * 2 - 1;
  const gasp = ac.createBufferSource();
  gasp.buffer = gaspBuf;
  const gaspHP = ac.createBiquadFilter();
  gaspHP.type = "highpass"; gaspHP.frequency.value = 2500;
  const gaspGain = ac.createGain();
  gaspGain.gain.setValueAtTime(0.65, now);
  gaspGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  gasp.connect(gaspHP); gaspHP.connect(gaspGain); gaspGain.connect(ac.destination);
  gasp.start(now);

  // ── IMPACT THUD ──────────────────────────────────────────────────────────
  const thud = ac.createOscillator();
  thud.type = "sine";
  thud.frequency.setValueAtTime(130, now);
  thud.frequency.exponentialRampToValueAtTime(40, now + 0.22);
  const thudGain = ac.createGain();
  thudGain.gain.setValueAtTime(0, now);
  thudGain.gain.linearRampToValueAtTime(0.65, now + 0.005);
  thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
  thud.connect(thudGain); thudGain.connect(ac.destination);
  thud.start(now); thud.stop(now + 0.32);
}

// ─── Kill Sound — terrifying high-pitch shriek blast ─────────────────────────

export function playKillSound() {
  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();
  const now = ac.currentTime;

  // Sharp impact thud
  const thud = ac.createOscillator();
  thud.type = "sine";
  thud.frequency.setValueAtTime(120, now);
  thud.frequency.exponentialRampToValueAtTime(30, now + 0.25);
  const thudG = ac.createGain();
  thudG.gain.setValueAtTime(0.9, now);
  thudG.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  thud.connect(thudG); thudG.connect(ac.destination);
  thud.start(now); thud.stop(now + 0.3);

  // Multiple terrifying high-pitched shriek oscillators
  const freqs = [2200, 3600, 4900, 6400, 1900, 8000];
  freqs.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = i % 2 === 0 ? "sawtooth" : "square";
    osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 300, now + i * 0.015);
    osc.frequency.linearRampToValueAtTime(freq * 0.6, now + 2);
    const dist = makeDistortion(ac, 80);
    g.gain.setValueAtTime(0, now + i * 0.015);
    g.gain.linearRampToValueAtTime(0.28, now + i * 0.015 + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
    osc.connect(dist); dist.connect(g); g.connect(ac.destination);
    osc.start(now + i * 0.015);
    osc.stop(now + 2.1);
  });

  // Noise burst
  const noiseLen = Math.floor(ac.sampleRate * 0.1);
  const nBuf = ac.createBuffer(1, noiseLen, ac.sampleRate);
  const nd = nBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) nd[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  noise.buffer = nBuf;
  const noiseHP = ac.createBiquadFilter();
  noiseHP.type = "highpass"; noiseHP.frequency.value = 3000;
  const noiseG = ac.createGain();
  noiseG.gain.setValueAtTime(0.7, now);
  noiseG.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
  noise.connect(noiseHP); noiseHP.connect(noiseG); noiseG.connect(ac.destination);
  noise.start(now);
}

// ─── Intro Scare Sound — BANG + scream for hand slam ─────────────────────────

export function playIntroScareSound() {
  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();
  const now = ac.currentTime;

  // ── MASSIVE BANG (white noise slam) ──────────────────────────────────────
  const bangLen = Math.floor(ac.sampleRate * 0.2);
  const bangBuf = ac.createBuffer(2, bangLen, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = bangBuf.getChannelData(c);
    for (let i = 0; i < bangLen; i++) ch[i] = Math.random() * 2 - 1;
  }
  const bang = ac.createBufferSource();
  bang.buffer = bangBuf;
  const bangLP = ac.createBiquadFilter();
  bangLP.type = "lowpass"; bangLP.frequency.value = 1200;
  const bangG = ac.createGain();
  bangG.gain.setValueAtTime(1.4, now);
  bangG.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  bang.connect(bangLP); bangLP.connect(bangG); bangG.connect(ac.destination);
  bang.start(now);

  // ── BASS THUD ─────────────────────────────────────────────────────────────
  const thud = ac.createOscillator();
  thud.type = "sine";
  thud.frequency.setValueAtTime(180, now);
  thud.frequency.exponentialRampToValueAtTime(28, now + 0.35);
  const thudG = ac.createGain();
  thudG.gain.setValueAtTime(1.1, now);
  thudG.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  thud.connect(thudG); thudG.connect(ac.destination);
  thud.start(now); thud.stop(now + 0.4);

  // ── BLOODCURDLING SCREAM (formant synthesis) ──────────────────────────────
  const screamStart = now + 0.05;
  const screamDur = 3.0;

  const vowelFormants = [
    { freq: 800,  bw: 120,  gain: 0.9 },
    { freq: 1800, bw: 180,  gain: 0.6 },
    { freq: 2700, bw: 250,  gain: 0.4 },
    { freq: 3800, bw: 300,  gain: 0.25 },
  ];

  const screamPitch = ac.createOscillator();
  screamPitch.type = "sawtooth";
  screamPitch.frequency.setValueAtTime(480, screamStart);
  screamPitch.frequency.linearRampToValueAtTime(940, screamStart + 0.15);
  screamPitch.frequency.linearRampToValueAtTime(1100, screamStart + 0.5);
  screamPitch.frequency.exponentialRampToValueAtTime(380, screamStart + screamDur);

  const screamSourceG = ac.createGain();
  screamSourceG.gain.value = 1.0;
  screamPitch.connect(screamSourceG);

  vowelFormants.forEach(({ freq, bw, gain }) => {
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = freq / bw;
    const fGain = ac.createGain();
    fGain.gain.value = gain;
    screamSourceG.connect(filter);
    filter.connect(fGain);

    const env = ac.createGain();
    env.gain.setValueAtTime(0, screamStart);
    env.gain.linearRampToValueAtTime(1.0, screamStart + 0.08);
    env.gain.setValueAtTime(1.0, screamStart + screamDur - 0.4);
    env.gain.exponentialRampToValueAtTime(0.0001, screamStart + screamDur);
    fGain.connect(env);

    const reverb = makeReverb(ac, 2, 0.8);
    env.connect(reverb);
    reverb.connect(ac.destination);
    env.connect(ac.destination);
  });

  // Rough tremolo
  const tremoloLfo = ac.createOscillator();
  tremoloLfo.type = "sine";
  tremoloLfo.frequency.value = 14;
  const tremoloDepth = ac.createGain();
  tremoloDepth.gain.value = 0.3;
  tremoloLfo.connect(tremoloDepth);
  tremoloDepth.connect(screamSourceG.gain);

  screamPitch.start(screamStart);
  screamPitch.stop(screamStart + screamDur + 0.1);
  tremoloLfo.start(screamStart);
  tremoloLfo.stop(screamStart + screamDur + 0.1);

  // ── SECOND HIGH-PITCH SHRIEK ──────────────────────────────────────────────
  const shriekFreqs = [3200, 5100, 7200];
  shriekFreqs.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, screamStart + i * 0.03);
    osc.frequency.linearRampToValueAtTime(freq * 1.3, screamStart + 0.1);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, screamStart + 1.5);
    g.gain.setValueAtTime(0, screamStart + i * 0.03);
    g.gain.linearRampToValueAtTime(0.18, screamStart + i * 0.03 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, screamStart + 1.6);
    osc.connect(g); g.connect(ac.destination);
    osc.start(screamStart + i * 0.03);
    osc.stop(screamStart + 1.7);
  });
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

// ─── Radio static + reveal chime ──────────────────────────────────────────────

export function createStaticSource(): { stop: () => void } {
  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();
  const bufSize = ac.sampleRate * 2;
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const bandpass = ac.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 2200;
  bandpass.Q.value = 0.6;

  const gain = ac.createGain();
  gain.gain.value = 0.18;

  src.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(ac.destination);
  src.start();

  return {
    stop: () => {
      try {
        gain.gain.setTargetAtTime(0, ac.currentTime, 0.05);
        setTimeout(() => { try { src.stop(); } catch (_) {} }, 300);
      } catch (_) {}
    },
  };
}

export function playStrangerWhisper(firstDigit: string, lastDigit: string) {
  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();
  const now = ac.currentTime;

  const reverb = makeReverb(ac, 3, 1.8);
  reverb.connect(ac.destination);

  const dry = ac.createGain();
  dry.gain.value = 0.5;
  dry.connect(ac.destination);

  const reverbSend = ac.createGain();
  reverbSend.gain.value = 0.7;
  reverbSend.connect(reverb);

  // Eerie low drone underneath the speech
  const drone = ac.createOscillator();
  const droneGain = ac.createGain();
  drone.type = "sine";
  drone.frequency.value = 60;
  droneGain.gain.setValueAtTime(0, now);
  droneGain.gain.linearRampToValueAtTime(0.08, now + 0.5);
  droneGain.gain.setValueAtTime(0.08, now + 4.5);
  droneGain.gain.linearRampToValueAtTime(0, now + 5.5);
  drone.connect(droneGain);
  droneGain.connect(reverbSend);
  drone.start(now);
  drone.stop(now + 6);

  // High whisper noise layer
  const bufSize = ac.sampleRate * 6;
  const noiseBuf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) nd[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  noise.buffer = noiseBuf;
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 4000;
  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(0.04, now + 0.3);
  noiseGain.gain.setValueAtTime(0.04, now + 4.5);
  noiseGain.gain.linearRampToValueAtTime(0, now + 5.5);
  noise.connect(hp);
  hp.connect(noiseGain);
  noiseGain.connect(reverbSend);
  noise.start(now);

  // Use Web Speech API with a slow, low-pitched whisper
  setTimeout(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const msg = `The killer's ID... starts with ${firstDigit}... and ends with... ${lastDigit}`;
    const utter = new SpeechSynthesisUtterance(msg);
    utter.rate = 0.6;
    utter.pitch = 0.35;
    utter.volume = 1.0;

    const applyVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const deepVoice = voices.find(
        (v) => v.name.toLowerCase().includes("male") || v.lang === "en-GB" || v.lang.startsWith("en")
      );
      if (deepVoice) utter.voice = deepVoice;
      window.speechSynthesis.speak(utter);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      applyVoiceAndSpeak();
    } else {
      // Voices not loaded yet — wait for them
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        applyVoiceAndSpeak();
      };
      // Fallback: also try immediately in case event never fires
      setTimeout(applyVoiceAndSpeak, 300);
    }
  }, 600);
}

export function playStrangerKnifeStrike() {
  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();
  const now = ac.currentTime;

  // Metallic scrape
  const scrapeLen = Math.floor(ac.sampleRate * 0.15);
  const scrapeBuf = ac.createBuffer(1, scrapeLen, ac.sampleRate);
  const sd = scrapeBuf.getChannelData(0);
  for (let i = 0; i < scrapeLen; i++) sd[i] = (Math.random() * 2 - 1) * (1 - i / scrapeLen);
  const scrape = ac.createBufferSource();
  scrape.buffer = scrapeBuf;
  const scrapeHP = ac.createBiquadFilter();
  scrapeHP.type = "bandpass";
  scrapeHP.frequency.value = 3500;
  scrapeHP.Q.value = 2;
  const scrapeG = ac.createGain();
  scrapeG.gain.value = 0.5;
  scrape.connect(scrapeHP); scrapeHP.connect(scrapeG); scrapeG.connect(ac.destination);
  scrape.start(now);

  // Heavy thud impact
  const thud = ac.createOscillator();
  thud.type = "sine";
  thud.frequency.setValueAtTime(200, now + 0.12);
  thud.frequency.exponentialRampToValueAtTime(25, now + 0.45);
  const thudG = ac.createGain();
  thudG.gain.setValueAtTime(0, now + 0.12);
  thudG.gain.linearRampToValueAtTime(1.1, now + 0.13);
  thudG.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
  thud.connect(thudG); thudG.connect(ac.destination);
  thud.start(now + 0.12); thud.stop(now + 0.5);
}

export function playRevealChime() {
  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();
  const now = ac.currentTime;

  // Three rising tones — like a signal locking in
  const freqs = [440, 554, 659];
  freqs.forEach((f, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, now + i * 0.18);
    g.gain.linearRampToValueAtTime(0.22, now + i * 0.18 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.7);
    osc.connect(g); g.connect(ac.destination);
    osc.start(now + i * 0.18); osc.stop(now + i * 0.18 + 0.8);
  });

  // Low rumble underneath
  const rumble = ac.createOscillator();
  const rg = ac.createGain();
  rumble.type = "triangle";
  rumble.frequency.value = 80;
  rg.gain.setValueAtTime(0, now);
  rg.gain.linearRampToValueAtTime(0.1, now + 0.1);
  rg.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
  rumble.connect(rg); rg.connect(ac.destination);
  rumble.start(now); rumble.stop(now + 1.3);
}
