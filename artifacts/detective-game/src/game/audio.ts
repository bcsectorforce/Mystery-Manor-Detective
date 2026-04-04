// Procedural Web Audio API scary music engine

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
const activeNodes: AudioNode[] = [];
let ambientRunning = false;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

function stopAllAmbient() {
  activeNodes.forEach((n) => {
    try { (n as OscillatorNode).stop?.(); } catch {}
    try { n.disconnect(); } catch {}
  });
  activeNodes.length = 0;
  ambientRunning = false;
}

function makeReverb(ac: AudioContext, duration = 2.5, decay = 2): ConvolverNode {
  const sampleRate = ac.sampleRate;
  const length = sampleRate * duration;
  const impulse = ac.createBuffer(2, length, sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = impulse.getChannelData(c);
    for (let i = 0; i < length; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  const conv = ac.createConvolver();
  conv.buffer = impulse;
  return conv;
}

export function startAmbient(hardMode: boolean) {
  if (ambientRunning) return;
  const ac = getCtx();
  if (ac.state === "suspended") {
    ac.resume();
  }

  masterGain = ac.createGain();
  masterGain.gain.setValueAtTime(0, ac.currentTime);
  masterGain.gain.linearRampToValueAtTime(hardMode ? 0.38 : 0.28, ac.currentTime + 4);
  masterGain.connect(ac.destination);

  const reverb = makeReverb(ac, hardMode ? 4 : 3, hardMode ? 1.5 : 2.5);
  reverb.connect(masterGain);

  const dryGain = ac.createGain();
  dryGain.gain.value = 0.6;
  dryGain.connect(masterGain);

  function addDrone(freq: number, waveType: OscillatorType, gainVal: number, detuneVal = 0, target: AudioNode = dryGain) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = waveType;
    osc.frequency.value = freq;
    osc.detune.value = detuneVal;
    g.gain.value = gainVal;
    osc.connect(g);
    g.connect(target);
    g.connect(reverb);
    osc.start();
    activeNodes.push(osc, g);
    return osc;
  }

  function addLFO(target: AudioParam, rate: number, depth: number, offset: number) {
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = rate;
    lfo.type = "sine";
    lfoGain.gain.value = depth;
    lfo.connect(lfoGain);
    lfoGain.connect(target);
    lfo.start();
    activeNodes.push(lfo, lfoGain);
    return lfo;
  }

  // ─── Base drones ─────────────────────────────────────────────────────────
  // Deep sub-bass growl
  addDrone(38, "sawtooth", 0.35, 0, dryGain);
  addDrone(38.3, "sine", 0.25, 0, dryGain);

  // Mid harmonic — minor second interval (very dissonant)
  addDrone(80, "sine", 0.18, 0, dryGain);
  addDrone(85, "sine", 0.14, 0, dryGain);   // creates beating / dissonance

  // Hollow high drone
  addDrone(160, "sine", 0.07, 0, dryGain);

  // LFO on sub-bass for slow tremolo
  const droneOsc = ac.createOscillator();
  const droneGain = ac.createGain();
  droneOsc.type = "sawtooth";
  droneOsc.frequency.value = 38;
  droneGain.gain.value = 0.3;
  droneOsc.connect(droneGain);
  const tremoloGain = ac.createGain();
  tremoloGain.gain.value = 0.3;
  droneGain.connect(tremoloGain);
  tremoloGain.connect(dryGain);
  tremoloGain.connect(reverb);
  addLFO(tremoloGain.gain, 0.25, 0.3, 0.3);
  droneOsc.start();
  activeNodes.push(droneOsc, droneGain, tremoloGain);

  // Periodic unsettling high ping
  function schedulePing() {
    if (!ambientRunning) return;
    const pingDelay = hardMode ? (2 + Math.random() * 4) : (4 + Math.random() * 8);
    const pingTimer = setTimeout(() => {
      if (!ambientRunning || !masterGain) return;
      const now = ac.currentTime;
      const pingOsc = ac.createOscillator();
      const pingGain = ac.createGain();
      pingOsc.frequency.value = hardMode ? (600 + Math.random() * 800) : (300 + Math.random() * 400);
      pingOsc.type = "sine";
      pingGain.gain.setValueAtTime(0, now);
      pingGain.gain.linearRampToValueAtTime(hardMode ? 0.12 : 0.07, now + 0.01);
      pingGain.gain.exponentialRampToValueAtTime(0.0001, now + (hardMode ? 1.5 : 2.5));
      pingOsc.connect(pingGain);
      pingGain.connect(reverb);
      pingOsc.start(now);
      pingOsc.stop(now + 3);
      schedulePing();
    }, pingDelay * 1000);
    activeNodes.push({ disconnect: () => clearTimeout(pingTimer) } as unknown as AudioNode);
  }
  schedulePing();

  if (hardMode) {
    // ─── Hard mode extras ── truly terrifying ────────────────────────────
    // Devil's tritone (augmented fourth) over the base
    addDrone(57, "sawtooth", 0.22, 0, dryGain);   // ~Bb1 — tritone against A1
    addDrone(57.4, "sawtooth", 0.16, 0, dryGain); // slight beating

    // High unsettling sine — like a distant scream
    addDrone(440, "sine", 0.05, 0, reverb);
    addDrone(466, "sine", 0.04, 0, reverb);        // tritone above A4

    // Chaotic noise layer
    const bufferSize = 2 * ac.sampleRate;
    const noiseBuffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    const noiseSource = ac.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    const noiseBandpass = ac.createBiquadFilter();
    noiseBandpass.type = "bandpass";
    noiseBandpass.frequency.value = 80;
    noiseBandpass.Q.value = 0.5;
    const noiseGainNode = ac.createGain();
    noiseGainNode.gain.value = 0.12;
    noiseSource.connect(noiseBandpass);
    noiseBandpass.connect(noiseGainNode);
    noiseGainNode.connect(dryGain);
    noiseSource.start();
    activeNodes.push(noiseSource, noiseBandpass, noiseGainNode);

    // Fast erratic LFO on master for "breathing" horror effect
    addLFO(masterGain.gain, 0.7, 0.06, 0.38);

    // Occasional downward pitch sweep (like a growl)
    function scheduleGrowl() {
      if (!ambientRunning) return;
      const delay = 6 + Math.random() * 10;
      const t = setTimeout(() => {
        if (!ambientRunning) return;
        const now = ac.currentTime;
        const growlOsc = ac.createOscillator();
        const growlGain = ac.createGain();
        growlOsc.type = "sawtooth";
        growlOsc.frequency.setValueAtTime(120, now);
        growlOsc.frequency.exponentialRampToValueAtTime(28, now + 2.5);
        growlGain.gain.setValueAtTime(0, now);
        growlGain.gain.linearRampToValueAtTime(0.3, now + 0.2);
        growlGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
        growlOsc.connect(growlGain);
        growlGain.connect(dryGain);
        growlGain.connect(reverb);
        growlOsc.start(now);
        growlOsc.stop(now + 3);
        scheduleGrowl();
      }, delay * 1000);
      activeNodes.push({ disconnect: () => clearTimeout(t) } as unknown as AudioNode);
    }
    scheduleGrowl();

    // Occasional whisper-like high noise burst
    function scheduleWhisper() {
      if (!ambientRunning) return;
      const delay = 8 + Math.random() * 14;
      const t = setTimeout(() => {
        if (!ambientRunning) return;
        const now = ac.currentTime;
        const wBuf = ac.createBuffer(1, ac.sampleRate * 0.8, ac.sampleRate);
        const wd = wBuf.getChannelData(0);
        for (let i = 0; i < wd.length; i++) wd[i] = (Math.random() * 2 - 1) * 0.6;
        const wSrc = ac.createBufferSource();
        wSrc.buffer = wBuf;
        const wFilter = ac.createBiquadFilter();
        wFilter.type = "highpass";
        wFilter.frequency.value = 4000;
        const wGain = ac.createGain();
        wGain.gain.setValueAtTime(0, now);
        wGain.gain.linearRampToValueAtTime(0.06, now + 0.05);
        wGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
        wSrc.connect(wFilter);
        wFilter.connect(wGain);
        wGain.connect(reverb);
        wSrc.start(now);
        scheduleWhisper();
      }, delay * 1000);
      activeNodes.push({ disconnect: () => clearTimeout(t) } as unknown as AudioNode);
    }
    scheduleWhisper();
  } else {
    // Normal mode: slow LFO tremolo on master
    addLFO(masterGain.gain, 0.2, 0.04, 0.28);
  }

  ambientRunning = true;
}

export function stopAmbient() {
  if (masterGain) {
    const ac = getCtx();
    masterGain.gain.linearRampToValueAtTime(0, ac.currentTime + 1.5);
    setTimeout(stopAllAmbient, 1600);
  } else {
    stopAllAmbient();
  }
}

export function resumeContext() {
  if (ctx?.state === "suspended") {
    ctx.resume();
  }
}

export function playJumpScareSound() {
  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();
  const now = ac.currentTime;

  const scareGain = ac.createGain();
  scareGain.gain.value = 0;
  scareGain.connect(ac.destination);

  // 1) Massive white noise boom
  const burstLen = ac.sampleRate * 0.25;
  const burstBuf = ac.createBuffer(2, burstLen, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = burstBuf.getChannelData(c);
    for (let i = 0; i < burstLen; i++) ch[i] = (Math.random() * 2 - 1);
  }
  const burst = ac.createBufferSource();
  burst.buffer = burstBuf;
  const burstFilter = ac.createBiquadFilter();
  burstFilter.type = "lowpass";
  burstFilter.frequency.value = 600;
  const burstGain = ac.createGain();
  burstGain.gain.setValueAtTime(0, now);
  burstGain.gain.linearRampToValueAtTime(0.85, now + 0.005);
  burstGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  burst.connect(burstFilter);
  burstFilter.connect(burstGain);
  burstGain.connect(ac.destination);
  burst.start(now);

  // 2) Rising screech — oscillator sweeping 150Hz → 2400Hz
  const screech = ac.createOscillator();
  screech.type = "sawtooth";
  screech.frequency.setValueAtTime(150, now);
  screech.frequency.exponentialRampToValueAtTime(2400, now + 0.6);
  screech.frequency.exponentialRampToValueAtTime(800, now + 1.2);
  const screechGain = ac.createGain();
  screechGain.gain.setValueAtTime(0, now);
  screechGain.gain.linearRampToValueAtTime(0.55, now + 0.03);
  screechGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
  screech.connect(screechGain);
  screechGain.connect(ac.destination);
  screech.start(now);
  screech.stop(now + 1.5);

  // 3) Deep sub-bass impact
  const subOsc = ac.createOscillator();
  subOsc.type = "sine";
  subOsc.frequency.setValueAtTime(80, now);
  subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.5);
  const subGain = ac.createGain();
  subGain.gain.setValueAtTime(0, now);
  subGain.gain.linearRampToValueAtTime(0.75, now + 0.01);
  subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
  subOsc.connect(subGain);
  subGain.connect(ac.destination);
  subOsc.start(now);
  subOsc.stop(now + 0.8);

  // 4) Distorted mid-frequency hit
  const midOsc = ac.createOscillator();
  midOsc.type = "square";
  midOsc.frequency.setValueAtTime(440, now);
  midOsc.frequency.exponentialRampToValueAtTime(110, now + 0.4);
  const midGain = ac.createGain();
  midGain.gain.setValueAtTime(0, now);
  midGain.gain.linearRampToValueAtTime(0.45, now + 0.01);
  midGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  midOsc.connect(midGain);
  midGain.connect(ac.destination);
  midOsc.start(now);
  midOsc.stop(now + 0.6);

  // 5) Lingering high-pitched ringing
  const ringOsc = ac.createOscillator();
  ringOsc.type = "sine";
  ringOsc.frequency.setValueAtTime(3200, now + 0.1);
  const ringGain = ac.createGain();
  ringGain.gain.setValueAtTime(0, now + 0.1);
  ringGain.gain.linearRampToValueAtTime(0.25, now + 0.15);
  ringGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
  ringOsc.connect(ringGain);
  ringGain.connect(ac.destination);
  ringOsc.start(now + 0.1);
  ringOsc.stop(now + 3);
}

export function playMiniCelebration() {
  const ac = getCtx();
  if (ac.state === "suspended") ac.resume();
  const now = ac.currentTime;

  // Short triumphant but tense 3-note sting
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, now + i * 0.12);
    g.gain.linearRampToValueAtTime(0.2, now + i * 0.12 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.4);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.5);
  });
}
