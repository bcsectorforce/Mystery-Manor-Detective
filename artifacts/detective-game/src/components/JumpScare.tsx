import React, { useEffect, useState } from "react";

interface JumpScareProps {
  onDone: () => void;
}

const SCARE_MESSAGES = [
  "YOU LET HIM ESCAPE",
  "WRONG. DEAD WRONG.",
  "THE KILLER THANKS YOU",
  "ANOTHER BODY ON YOUR HANDS",
];

// Random creepy eye positions for extra unease
const EYE_OFFSETS = [
  { lx: -38, ly: -22, rx: 38, ry: -22 },
  { lx: -42, ly: -18, rx: 34, ry: -26 },
  { lx: -36, ly: -24, rx: 40, ry: -18 },
];

export function JumpScare({ onDone }: JumpScareProps) {
  const [frame, setFrame] = useState(0);
  const msg = SCARE_MESSAGES[Math.floor(Math.random() * SCARE_MESSAGES.length)];
  const eyes = EYE_OFFSETS[Math.floor(Math.random() * EYE_OFFSETS.length)];

  useEffect(() => {
    // Frame sequence: 0=black, 1=FACE, 2=flash, 3=dark, 4=done
    const timings = [80, 600, 150, 500];
    let current = 0;

    const advance = () => {
      current++;
      setFrame(current);
      if (current < timings.length) {
        setTimeout(advance, timings[current]);
      } else {
        // Done — hand off to defeat screen
        onDone();
      }
    };

    const firstTimer = setTimeout(advance, timings[0]);
    return () => clearTimeout(firstTimer);
  }, [onDone]);

  // Phase 0: Black silence
  if (frame === 0) {
    return (
      <div className="fixed inset-0 bg-black z-[9999]" />
    );
  }

  // Phase 1: THE FACE
  if (frame === 1) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
        style={{ background: "#0a0000" }}
      >
        {/* Red vignette flash */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, rgba(180,0,0,0.6) 0%, #0a0000 70%)",
            animation: "pulse-danger 0.3s ease-in-out infinite",
          }}
        />

        {/* Creepy scanlines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 1px, transparent 1px, transparent 3px)",
          }}
        />

        {/* THE FACE */}
        <div
          style={{
            animation: "scream 0.08s ease-in-out infinite",
            filter: "drop-shadow(0 0 60px rgba(200,0,0,1)) drop-shadow(0 0 20px rgba(255,0,0,0.8))",
          }}
        >
          <svg
            width={Math.min(window.innerWidth * 0.95, 700)}
            height={Math.min(window.innerHeight * 0.95, 700)}
            viewBox="-200 -200 400 400"
          >
            {/* Neck / body shadow */}
            <ellipse cx={0} cy={260} rx={90} ry={60} fill="#1a0000" />
            <rect x={-60} y={140} width={120} height={140} fill="#1a0000" rx={10} />

            {/* Head — bloated, asymmetric */}
            <ellipse cx={0} cy={0} rx={165} ry={175} fill="#1a0000" />
            {/* Skin texture patches */}
            <ellipse cx={-80} cy={-60} rx={60} ry={45} fill="#250800" opacity={0.6} />
            <ellipse cx={100} cy={40} rx={50} ry={60} fill="#250800" opacity={0.5} />
            <ellipse cx={20} cy={110} rx={80} ry={40} fill="#250800" opacity={0.4} />

            {/* Veins */}
            <path d="M -120 -100 Q -80 -20 -50 60" stroke="#4a0000" strokeWidth={3} fill="none" opacity={0.7} />
            <path d="M 100 -120 Q 60 0 80 80" stroke="#4a0000" strokeWidth={2} fill="none" opacity={0.6} />
            <path d="M -40 -160 Q -10 -100 -30 -40" stroke="#3a0000" strokeWidth={2} fill="none" opacity={0.5} />

            {/* Left eye socket — sunken */}
            <ellipse cx={eyes.lx} cy={eyes.ly} rx={52} ry={48} fill="#080000" />
            <ellipse cx={eyes.lx} cy={eyes.ly} rx={44} ry={40} fill="#0f0000" />
            {/* Left eye — bloodshot */}
            <circle cx={eyes.lx} cy={eyes.ly} r={34} fill="#e8e0d0" />
            {/* Bloodshot veins */}
            {[-30, -15, 0, 15, 30, 45, 60, 75, 90, 120, 150, 180].map((angle, i) => (
              <line
                key={i}
                x1={eyes.lx + Math.cos((angle * Math.PI) / 180) * 6}
                y1={eyes.ly + Math.sin((angle * Math.PI) / 180) * 6}
                x2={eyes.lx + Math.cos((angle * Math.PI) / 180) * 32}
                y2={eyes.ly + Math.sin((angle * Math.PI) / 180) * 32}
                stroke={i % 3 === 0 ? "#cc0000" : "#880000"}
                strokeWidth={i % 4 === 0 ? 1.5 : 0.8}
                opacity={0.7}
              />
            ))}
            <circle cx={eyes.lx} cy={eyes.ly} r={16} fill="#050000" />
            <circle cx={eyes.lx} cy={eyes.ly} r={12} fill="#0a0000" />
            {/* Sickly red iris ring */}
            <circle cx={eyes.lx} cy={eyes.ly} r={16} fill="none" stroke="#8b0000" strokeWidth={2} />
            {/* Tiny white glint */}
            <circle cx={eyes.lx - 5} cy={eyes.ly - 5} r={3} fill="rgba(255,255,255,0.9)" />

            {/* Right eye socket */}
            <ellipse cx={eyes.rx} cy={eyes.ry} rx={52} ry={48} fill="#080000" />
            <ellipse cx={eyes.rx} cy={eyes.ry} rx={44} ry={40} fill="#0f0000" />
            {/* Right eye */}
            <circle cx={eyes.rx} cy={eyes.ry} r={34} fill="#e8e0d0" />
            {[0, 20, 40, 60, 80, 100, 120, 140, 160, 200, 240, 300].map((angle, i) => (
              <line
                key={i}
                x1={eyes.rx + Math.cos((angle * Math.PI) / 180) * 6}
                y1={eyes.ry + Math.sin((angle * Math.PI) / 180) * 6}
                x2={eyes.rx + Math.cos((angle * Math.PI) / 180) * 32}
                y2={eyes.ry + Math.sin((angle * Math.PI) / 180) * 32}
                stroke={i % 2 === 0 ? "#cc0000" : "#880000"}
                strokeWidth={i % 3 === 0 ? 1.5 : 0.8}
                opacity={0.8}
              />
            ))}
            <circle cx={eyes.rx} cy={eyes.ry} r={16} fill="#050000" />
            <circle cx={eyes.rx} cy={eyes.ry} r={12} fill="#0a0000" />
            <circle cx={eyes.rx} cy={eyes.ry} r={16} fill="none" stroke="#8b0000" strokeWidth={2} />
            <circle cx={eyes.rx + 5} cy={eyes.ry - 5} r={3} fill="rgba(255,255,255,0.9)" />

            {/* Nose — wide, decayed */}
            <path d="M -18 20 Q -30 60 -20 80 Q 0 90 20 80 Q 30 60 18 20" fill="#120000" />
            <ellipse cx={-22} cy={74} rx={14} ry={10} fill="#080000" />
            <ellipse cx={22} cy={74} rx={14} ry={10} fill="#080000" />

            {/* MOUTH — wide gaping scream */}
            <path d="M -110 105 Q -80 90 0 95 Q 80 90 110 105 Q 90 175 0 180 Q -90 175 -110 105 Z" fill="#080000" />
            {/* Throat darkness */}
            <ellipse cx={0} cy={145} rx={55} ry={35} fill="#030000" />
            {/* Teeth — jagged, yellowed */}
            {[-80, -55, -30, -8, 15, 40, 65].map((x, i) => (
              <path
                key={i}
                d={`M ${x} 108 L ${x + 10} 108 L ${x + 5} ${118 + (i % 3) * 8} Z`}
                fill={i % 4 === 0 ? "#c8b870" : "#ddd0a0"}
              />
            ))}
            {/* Bottom teeth */}
            {[-65, -42, -20, 0, 22, 45].map((x, i) => (
              <path
                key={i}
                d={`M ${x} 168 L ${x + 10} 168 L ${x + 5} ${158 - (i % 3) * 5} Z`}
                fill={i % 3 === 0 ? "#bba860" : "#ccc090"}
              />
            ))}
            {/* Blood dripping from mouth */}
            {[-60, -20, 20, 60].map((x, i) => (
              <g key={i}>
                <circle cx={x} cy={108} r={4} fill="#8b0000" />
                <line x1={x} y1={108} x2={x + (i % 2 === 0 ? 2 : -2)} y2={108 + 15 + i * 5} stroke="#8b0000" strokeWidth={3} />
              </g>
            ))}

            {/* Forehead cracks / wounds */}
            <path d="M -50 -140 Q -20 -120 10 -100 Q 30 -80 20 -60" stroke="#6b0000" strokeWidth={3} fill="none" opacity={0.8} />
            <path d="M 60 -130 Q 40 -110 50 -80" stroke="#5a0000" strokeWidth={2} fill="none" opacity={0.7} />

            {/* Hair — wild, disheveled */}
            {Array.from({ length: 20 }).map((_, i) => {
              const angle = (i / 20) * Math.PI * 2;
              const baseR = 155;
              const tipR = baseR + 15 + Math.sin(i * 137) * 30;
              return (
                <line
                  key={i}
                  x1={Math.cos(angle) * baseR}
                  y1={Math.sin(angle) * baseR * 0.85 - 20}
                  x2={Math.cos(angle) * tipR}
                  y2={Math.sin(angle) * tipR * 0.85 - 25}
                  stroke="#0a0000"
                  strokeWidth={3 + Math.sin(i) * 1.5}
                  opacity={0.9}
                />
              );
            })}
          </svg>
        </div>

        {/* Text over face */}
        <div
          className="absolute bottom-12 left-0 right-0 text-center"
          style={{
            animation: "glitch 0.1s ease-in-out infinite",
            textShadow: "3px 3px 0 #8b0000, -3px -3px 0 #8b0000, 3px -3px 0 #8b0000",
          }}
        >
          <p
            className="text-red-500 font-bold"
            style={{
              fontSize: "clamp(24px, 6vw, 64px)",
              fontFamily: "'Special Elite', 'Courier New', serif",
              letterSpacing: "0.1em",
            }}
          >
            {msg}
          </p>
        </div>
      </div>
    );
  }

  // Phase 2: White flash
  if (frame === 2) {
    return (
      <div
        className="fixed inset-0 z-[9999]"
        style={{ background: "#ffffff", animation: "none" }}
      />
    );
  }

  // Phase 3: Fade to black before defeat screen
  return (
    <div
      className="fixed inset-0 z-[9999] bg-black"
      style={{ transition: "opacity 0.5s ease", opacity: 1 }}
    />
  );
}
