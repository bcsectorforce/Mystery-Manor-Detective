import React, { useEffect, useRef, useState } from "react";
import { playStrangerWhisper, playStrangerKnifeStrike } from "../game/audio";

interface Props {
  phase: "prompt" | "cinematic";
  uncaughtKillerIds: string[];
  onFollow: () => void;
  onStay: () => void;
  onKilled: () => void;
  onRevealed: () => void;
}

type AnimPhase =
  | "letterbox"
  | "walking"
  | "entering_room"
  | "fadeout"
  | "outcome_killed"
  | "outcome_revealed"
  | "done";

export function StrangerCinematic({ phase, uncaughtKillerIds, onFollow, onStay, onKilled, onRevealed }: Props) {
  const [animPhase, setAnimPhase] = useState<AnimPhase>("letterbox");
  const [figureX, setFigureX] = useState(220);
  const [playerX, setPlayerX] = useState(280);
  const [torchFlicker, setTorchFlicker] = useState(1);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [outcome] = useState<"killed" | "revealed">(() =>
    Math.random() < 0.45 ? "killed" : "revealed"
  );
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const clearTimer = () => { if (animRef.current) clearTimeout(animRef.current); };

  useEffect(() => {
    if (phase !== "cinematic") return;
    setAnimPhase("letterbox");

    animRef.current = setTimeout(() => {
      setAnimPhase("walking");
      startTimeRef.current = Date.now();

      const walkDuration = 4800;

      const animateWalk = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const t = Math.min(elapsed / walkDuration, 1);
        setFigureX(220 - t * 155);
        setPlayerX(280 - t * 155);
        setTorchFlicker(0.7 + Math.sin(elapsed * 0.012) * 0.15 + Math.random() * 0.15);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(animateWalk);
        } else {
          setAnimPhase("entering_room");
          animRef.current = setTimeout(() => {
            setAnimPhase("fadeout");
            let op = 0;
            const fadeStart = Date.now();
            const doFade = () => {
              op = Math.min((Date.now() - fadeStart) / 1200, 1);
              setFadeOpacity(op);
              if (op < 1) {
                rafRef.current = requestAnimationFrame(doFade);
              } else {
                if (outcome === "killed") {
                  playStrangerKnifeStrike();
                  setAnimPhase("outcome_killed");
                  animRef.current = setTimeout(() => { onKilled(); }, 2200);
                } else {
                  setAnimPhase("outcome_revealed");
                  const killerId = uncaughtKillerIds[Math.floor(Math.random() * uncaughtKillerIds.length)] ?? "00000";
                  const first = killerId[0] ?? "?";
                  const last = killerId[killerId.length - 1] ?? "?";
                  playStrangerWhisper(first, last);
                  animRef.current = setTimeout(() => { onRevealed(); }, 8500);
                }
              }
            };
            rafRef.current = requestAnimationFrame(doFade);
          }, 900);
        }
      };

      rafRef.current = requestAnimationFrame(animateWalk);
    }, 900);

    return () => {
      clearTimer();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  if (phase === "prompt") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(4px)" }}>
        <div
          className="relative flex flex-col items-center gap-6 px-10 py-8 rounded-lg"
          style={{
            background: "linear-gradient(160deg, #0a0808 0%, #1a0f0f 100%)",
            border: "1px solid rgba(180,30,30,0.35)",
            boxShadow: "0 0 60px rgba(120,0,0,0.4), inset 0 0 40px rgba(0,0,0,0.6)",
            maxWidth: 420,
          }}
        >
          <div className="text-4xl animate-pulse" style={{ filter: "drop-shadow(0 0 8px #ff4444)" }}>🕯</div>

          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-red-400/60 text-xs tracking-[0.35em] uppercase font-bold mb-1">A stranger approaches</p>
            <p
              className="text-lg font-bold leading-relaxed"
              style={{ color: "#e8d8c0", fontFamily: "'Special Elite', 'Courier New', serif", letterSpacing: "0.04em" }}
            >
              "Follow me.
              <br />
              I will tell you who the killer is."
            </p>
          </div>

          <div className="flex flex-col items-center gap-1 w-full">
            <ShadowyFigure />
          </div>

          <p className="text-red-300/50 text-xs italic text-center">
            Something feels wrong about this offer…
          </p>

          <div className="flex gap-4 w-full">
            <button
              onClick={onStay}
              className="flex-1 py-2.5 rounded border text-sm font-bold transition-all hover:scale-105"
              style={{
                border: "1px solid rgba(120,120,120,0.4)",
                color: "#999",
                background: "rgba(30,30,30,0.6)",
              }}
            >
              Stay
            </button>
            <button
              onClick={onFollow}
              className="flex-1 py-2.5 rounded text-sm font-bold transition-all hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #7a0000, #c00000)",
                color: "#ffdada",
                border: "1px solid rgba(220,50,50,0.5)",
                boxShadow: "0 0 16px rgba(180,0,0,0.4)",
              }}
            >
              Follow
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden" style={{ background: "#000" }}>
      {/* Cinematic letterbox bars */}
      <div
        className="absolute left-0 right-0 top-0 z-20 transition-all"
        style={{
          height: animPhase === "letterbox" ? 0 : "14vh",
          background: "#000",
          transitionDuration: "800ms",
          transitionTimingFunction: "ease-in-out",
        }}
      />
      <div
        className="absolute left-0 right-0 bottom-0 z-20 transition-all"
        style={{
          height: animPhase === "letterbox" ? 0 : "14vh",
          background: "#000",
          transitionDuration: "800ms",
          transitionTimingFunction: "ease-in-out",
        }}
      />

      {/* Main scene area */}
      <div className="absolute inset-0 flex items-center justify-center">
        {animPhase === "letterbox" && (
          <div className="text-red-900/40 text-lg tracking-widest animate-pulse" style={{ fontFamily: "monospace" }}>
            …
          </div>
        )}

        {(animPhase === "walking" || animPhase === "entering_room") && (
          <CorridorScene figureX={figureX} playerX={playerX} torchFlicker={torchFlicker} enteringRoom={animPhase === "entering_room"} />
        )}

        {animPhase === "fadeout" && (
          <CorridorScene figureX={figureX} playerX={playerX} torchFlicker={torchFlicker} enteringRoom />
        )}

        {animPhase === "outcome_killed" && (
          <KnifeOutcome />
        )}

        {animPhase === "outcome_revealed" && (
          <RevealOutcome />
        )}
      </div>

      {/* Fade to black overlay */}
      {(animPhase === "fadeout" || animPhase === "outcome_killed" || animPhase === "outcome_revealed") && (
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: `rgba(0,0,0,${animPhase === "fadeout" ? fadeOpacity : 1})`,
            transition: animPhase !== "fadeout" ? "none" : undefined,
          }}
        />
      )}
    </div>
  );
}

function ShadowyFigure() {
  return (
    <svg width="80" height="90" viewBox="0 0 80 90" style={{ filter: "drop-shadow(0 0 12px rgba(180,0,0,0.5))" }}>
      <ellipse cx="40" cy="20" rx="10" ry="12" fill="#1a0a0a" />
      <rect x="26" y="30" width="28" height="38" rx="4" fill="#0f0707" />
      <rect x="14" y="32" width="10" height="28" rx="3" fill="#0f0707" />
      <rect x="56" y="32" width="10" height="28" rx="3" fill="#0f0707" />
      <rect x="28" y="67" width="10" height="20" rx="3" fill="#0f0707" />
      <rect x="42" y="67" width="10" height="20" rx="3" fill="#0f0707" />
      <ellipse cx="34" cy="19" rx="2" ry="2" fill="rgba(200,50,50,0.6)" />
      <ellipse cx="46" cy="19" rx="2" ry="2" fill="rgba(200,50,50,0.6)" />
    </svg>
  );
}

function CorridorScene({ figureX, playerX, torchFlicker, enteringRoom }: {
  figureX: number;
  playerX: number;
  torchFlicker: number;
  enteringRoom: boolean;
}) {
  return (
    <svg
      width="700"
      height="420"
      viewBox="0 0 700 420"
      style={{ maxWidth: "100vw", maxHeight: "72vh" }}
    >
      {/* Stone corridor background */}
      <rect width="700" height="420" fill="#080506" />

      {/* Perspective floor */}
      <polygon points="0,420 700,420 500,260 200,260" fill="#100b0b" />
      <polygon points="0,420 700,420 500,260 200,260" fill="url(#floorLines)" opacity="0.6" />

      {/* Perspective ceiling */}
      <polygon points="0,0 700,0 500,160 200,160" fill="#0c0809" />

      {/* Left wall */}
      <polygon points="0,0 200,160 200,260 0,420" fill="#130d0c" />

      {/* Right wall */}
      <polygon points="700,0 500,160 500,260 700,420" fill="#130d0c" />

      {/* Center corridor wall (far end) */}
      <rect x="200" y="160" width="300" height="100" fill="#1a1212" />

      {/* Door at the far end */}
      <rect x="295" y="170" width="110" height="90" rx="3" fill={enteringRoom ? "#3a1a0a" : "#0f0a08"} />
      <rect x="300" y="175" width="100" height="80" rx="2" fill={enteringRoom ? "#2a0f05" : "#080604"} />
      {enteringRoom && <rect x="300" y="175" width="100" height="80" rx="2" fill="rgba(150,60,0,0.3)" />}
      <circle cx="393" cy="215" r="4" fill="#c8a060" />
      <line x1="295" y1="215" x2="405" y2="215" stroke="#333" strokeWidth="1" />

      {/* Defs for patterns/gradients */}
      <defs>
        <pattern id="floorLines" width="40" height="40" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="40" y2="0" stroke="#1e1414" strokeWidth="1" />
          <line x1="0" y1="0" x2="0" y2="40" stroke="#1e1414" strokeWidth="1" />
        </pattern>
        <radialGradient id="torchGlow1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={`rgba(220,140,30,${torchFlicker * 0.7})`} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <radialGradient id="torchGlow2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={`rgba(200,120,20,${torchFlicker * 0.65})`} />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      {/* Left wall torch + glow */}
      <ellipse cx="55" cy="200" rx="55" ry="55" fill="url(#torchGlow1)" />
      <rect x="48" y="185" width="6" height="16" rx="2" fill="#5c3010" />
      <ellipse cx="51" cy="183" rx="5" ry="7" fill={`rgba(255,160,30,${torchFlicker})`} />
      <ellipse cx="51" cy="179" rx="3" ry="4" fill={`rgba(255,220,120,${torchFlicker * 0.9})`} />

      {/* Right wall torch + glow */}
      <ellipse cx="645" cy="200" rx="55" ry="55" fill="url(#torchGlow2)" />
      <rect x="638" y="185" width="6" height="16" rx="2" fill="#5c3010" />
      <ellipse cx="641" cy="183" rx="5" ry="7" fill={`rgba(255,150,20,${torchFlicker * 0.95})`} />
      <ellipse cx="641" cy="179" rx="3" ry="4" fill={`rgba(255,210,100,${torchFlicker * 0.85})`} />

      {/* Left wall: portrait painting */}
      <rect x="70" y="100" width="55" height="75" rx="3" fill="#1a0f0e" stroke="#3a2820" strokeWidth="2" />
      <rect x="74" y="104" width="47" height="67" fill="#100c0b" />
      <ellipse cx="97" cy="125" rx="10" ry="12" fill="#2a1810" />
      <rect x="85" y="134" width="25" height="28" fill="#1e1210" />
      <ellipse cx="93" cy="122" rx="2" ry="2" fill="#3a2015" />
      <ellipse cx="101" cy="122" rx="2" ry="2" fill="#3a2015" />

      {/* Left wall: skull on a small shelf */}
      <rect x="100" y="295" width="40" height="6" rx="1" fill="#2a1a14" />
      <ellipse cx="120" cy="288" rx="9" ry="8" fill="#c8b8a0" opacity="0.6" />
      <ellipse cx="115" cy="291" rx="3" ry="2" fill="#080604" opacity="0.7" />
      <ellipse cx="125" cy="291" rx="3" ry="2" fill="#080604" opacity="0.7" />
      <path d="M 114 296 L 120 296 L 126 296" stroke="#080604" strokeWidth="1" fill="none" opacity="0.6" />

      {/* Right wall: old clock */}
      <rect x="572" y="90" width="50" height="60" rx="4" fill="#1e1008" stroke="#3a2010" strokeWidth="2" />
      <circle cx="597" cy="118" r="18" fill="#0a0804" stroke="#5a3820" strokeWidth="1.5" />
      <line x1="597" y1="118" x2="597" y2="105" stroke="#c0a060" strokeWidth="1.5" />
      <line x1="597" y1="118" x2="606" y2="118" stroke="#c0a060" strokeWidth="1.5" />
      <text x="597" y="145" textAnchor="middle" fill="#5a3820" fontSize="8" fontFamily="serif">XII</text>

      {/* Right wall: cobweb corner */}
      <g opacity="0.4">
        <line x1="620" y1="260" x2="660" y2="310" stroke="#aaa" strokeWidth="0.5" />
        <line x1="640" y1="255" x2="660" y2="310" stroke="#aaa" strokeWidth="0.5" />
        <line x1="660" y1="262" x2="660" y2="310" stroke="#aaa" strokeWidth="0.5" />
        <path d="M 630 268 Q 645 285 635 295" stroke="#aaa" strokeWidth="0.5" fill="none" />
        <path d="M 645 265 Q 655 280 650 295" stroke="#aaa" strokeWidth="0.5" fill="none" />
      </g>

      {/* Wall stone lines (left) */}
      <line x1="0" y1="130" x2="200" y2="195" stroke="#1e1414" strokeWidth="1" opacity="0.4" />
      <line x1="0" y1="230" x2="200" y2="220" stroke="#1e1414" strokeWidth="1" opacity="0.4" />
      <line x1="0" y1="330" x2="200" y2="250" stroke="#1e1414" strokeWidth="1" opacity="0.4" />
      <line x1="80" y1="0" x2="200" y2="180" stroke="#1e1414" strokeWidth="1" opacity="0.3" />

      {/* Wall stone lines (right) */}
      <line x1="700" y1="130" x2="500" y2="195" stroke="#1e1414" strokeWidth="1" opacity="0.4" />
      <line x1="700" y1="230" x2="500" y2="220" stroke="#1e1414" strokeWidth="1" opacity="0.4" />
      <line x1="700" y1="330" x2="500" y2="250" stroke="#1e1414" strokeWidth="1" opacity="0.4" />

      {/* Mysterious stranger figure (dark silhouette) */}
      <g transform={`translate(${figureX}, 0)`}>
        <ellipse cx="0" cy="235" rx="10" ry="12" fill="#0d0505" />
        <rect x="-13" y="245" width="26" height="45" rx="3" fill="#080404" />
        <rect x="-22" y="248" width="8" height="30" rx="2" fill="#080404" />
        <rect x="14" y="248" width="8" height="30" rx="2" fill="#080404" />
        <rect x="-10" y="289" width="8" height="22" rx="2" fill="#080404" />
        <rect x="2" y="289" width="8" height="22" rx="2" fill="#080404" />
        <ellipse cx="-4" cy="233" rx="1.5" ry="1.5" fill="rgba(180,30,30,0.8)" />
        <ellipse cx="4" cy="233" rx="1.5" ry="1.5" fill="rgba(180,30,30,0.8)" />
        {/* Cloak trailing shadow */}
        <ellipse cx="0" cy="320" rx="18" ry="6" fill="rgba(0,0,0,0.5)" />
        {/* Knife glint */}
        <line x1="14" y1="262" x2="26" y2="278" stroke="rgba(200,200,220,0.25)" strokeWidth="1.5" />
      </g>

      {/* Player dot */}
      <g transform={`translate(${playerX}, 0)`}>
        <ellipse cx="0" cy="335" rx="16" ry="5" fill="rgba(0,0,0,0.4)" />
        <circle cx="0" cy="318" r="12" fill="#c8a060" opacity="0.85" />
        <circle cx="0" cy="316" r="9" fill="#e0c080" opacity="0.7" />
        <circle cx="-3" cy="314" r="2" fill="#3a2a10" />
        <circle cx="3" cy="314" r="2" fill="#3a2a10" />
      </g>

      {/* Vignette overlay */}
      <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
        <stop offset="50%" stopColor="rgba(0,0,0,0)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.75)" />
      </radialGradient>
      <rect width="700" height="420" fill="url(#vignette)" />

      {/* Caption */}
      <text
        x="350" y="405"
        textAnchor="middle"
        fill="rgba(200,160,100,0.55)"
        fontSize="11"
        fontFamily="'Special Elite', 'Courier New', serif"
        letterSpacing="3"
      >
        {enteringRoom ? "THE DOOR SWINGS OPEN…" : "YOU FOLLOW THE STRANGER DOWN THE CORRIDOR…"}
      </text>
    </svg>
  );
}

function KnifeOutcome() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 animate-fade-in-up z-20 relative">
      <div
        className="text-8xl"
        style={{ filter: "drop-shadow(0 0 30px #ff0000)", animation: "pulse 0.4s infinite" }}
      >
        🔪
      </div>
      <p
        className="text-2xl font-bold tracking-widest text-red-400"
        style={{ fontFamily: "'Special Elite', 'Courier New', serif", textShadow: "0 0 20px rgba(255,0,0,0.8)" }}
      >
        YOU'VE BEEN BETRAYED
      </p>
      <p className="text-red-600 text-sm tracking-widest animate-pulse">
        IT WAS A TRAP
      </p>
    </div>
  );
}

function RevealOutcome() {
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowText(true), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 z-20 relative px-8 text-center">
      <div
        className="text-5xl"
        style={{ filter: "drop-shadow(0 0 16px rgba(200,160,80,0.6))", animation: "pulse 3s infinite" }}
      >
        🕯
      </div>
      {showText && (
        <div className="flex flex-col gap-3 animate-fade-in-up">
          <p
            className="text-xl font-bold tracking-wider"
            style={{ color: "#e8d0a0", fontFamily: "'Special Elite', 'Courier New', serif", textShadow: "0 0 20px rgba(200,140,30,0.5)" }}
          >
            "Listen carefully…"
          </p>
          <p className="text-amber-200/50 text-sm tracking-widest italic">
            A whisper in the dark. Listen for the digits…
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-amber-500/70 text-xs tracking-widest font-mono uppercase">Audio playing…</p>
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
}
