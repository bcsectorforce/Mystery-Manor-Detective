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
