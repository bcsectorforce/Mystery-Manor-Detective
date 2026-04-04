import React, { useEffect, useState, useRef } from "react";
import { playJumpScareSound } from "../game/audio";

interface JumpScareProps {
  onDone: () => void;
}

const SCARE_MESSAGES = [
  "YOU LET HIM ESCAPE",
  "WRONG. DEAD WRONG.",
  "THE KILLER THANKS YOU",
  "ANOTHER BODY ON YOUR HANDS",
  "HE SEES YOU",
  "YOU WERE WARNED",
  "NO ONE IS SAFE",
];

const SECOND_MESSAGES = [
  "NOWHERE TO HIDE",
  "YOU FAILED THEM ALL",
  "HE FOUND YOU",
  "TOO LATE",
  "RUN.",
];

// Each phase: [duration_ms, phase_type]
// Types: "black" | "red_flash" | "white_flash" | "face_small" | "face_mid" | "face_huge" | "face_extreme" | "blood_red"
const PHASES: Array<[number, string]> = [
  [150,  "black"],       // 0 — silence
  [80,   "red_flash"],   // 1 — sharp red jolt
  [60,   "black"],       // 2 — black
  [900,  "face_small"],  // 3 — face charging in
  [70,   "white_flash"], // 4 — white slam
  [60,   "red_flash"],   // 5 — red flash
  [800,  "face_mid"],    // 6 — face closer, bigger
  [70,   "white_flash"], // 7 — slam
  [50,   "black"],       // 8 — dark
  [60,   "red_flash"],   // 9 — another jolt
  [900,  "face_huge"],   // 10 — face VERY close
  [70,   "white_flash"], // 11 — slam
  [60,   "red_flash"],   // 12 — red
  [700,  "face_extreme"],// 13 — only eyes, extreme close-up
  [120,  "white_flash"], // 14 — final slam
  [700,  "blood_red"],   // 15 — bleed out
  // done
];

export function JumpScare({ onDone }: JumpScareProps) {
  const [phase, setPhase] = useState(0);
  const msgRef = useRef(SCARE_MESSAGES[Math.floor(Math.random() * SCARE_MESSAGES.length)]);
  const msg2Ref = useRef(SECOND_MESSAGES[Math.floor(Math.random() * SECOND_MESSAGES.length)]);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    // Fire the terrifying sound immediately
    playJumpScareSound();

    let current = 0;

    const advance = () => {
      current++;
      if (current >= PHASES.length) {
        onDoneRef.current();
        return;
      }
      setPhase(current);
      setTimeout(advance, PHASES[current][0]);
    };

    const firstTimer = setTimeout(advance, PHASES[0][0]);
    return () => clearTimeout(firstTimer);
  }, []);

  const type = PHASES[Math.min(phase, PHASES.length - 1)][1];

  if (type === "black") {
    return <div className="fixed inset-0 bg-black z-[9999]" />;
  }

  if (type === "red_flash") {
    return (
      <div
        className="fixed inset-0 z-[9999]"
        style={{ background: "radial-gradient(ellipse at center, #cc0000 0%, #550000 50%, #000 100%)" }}
      />
    );
  }

  if (type === "white_flash") {
    return <div className="fixed inset-0 z-[9999] bg-white" />;
  }

  if (type === "blood_red") {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "#1a0000" }}
      >
        {/* Dripping blood streaks */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-red-900 rounded-full"
              style={{
                left: `${i * 3.5}%`,
                top: 0,
                width: `${1 + Math.random() * 3}px`,
                height: `${60 + Math.random() * 40}%`,
                opacity: 0.6 + Math.random() * 0.4,
                animation: `blood-drip-fast ${0.3 + Math.random() * 0.4}s ease-out forwards`,
                animationDelay: `${Math.random() * 0.3}s`,
              }}
            />
          ))}
        </div>
        <p
          style={{
            color: "#550000",
            fontSize: "clamp(18px, 4vw, 40px)",
            fontFamily: "'Special Elite', 'Courier New', serif",
            letterSpacing: "0.3em",
            textAlign: "center",
            animation: "scare-fade 0.6s ease-out forwards",
          }}
        >
          {msg2Ref.current}
        </p>
        <style>{`
          @keyframes blood-drip-fast {
            from { transform: scaleY(0); transform-origin: top; opacity: 1; }
            to { transform: scaleY(1); transform-origin: top; opacity: 0.8; }
          }
          @keyframes scare-fade {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Face phases — each progressively larger / closer
  const faceConfigs = {
    face_small:   { scale: 0.55, shakeAmt: 6,  textSize: "clamp(20px, 4vw, 48px)",  zoom: "scale(0.55) translateZ(0)" },
    face_mid:     { scale: 0.82, shakeAmt: 10, textSize: "clamp(26px, 5vw, 60px)",  zoom: "scale(0.82) translateZ(0)" },
    face_huge:    { scale: 1.15, shakeAmt: 16, textSize: "clamp(30px, 6vw, 72px)",  zoom: "scale(1.15) translateZ(0)" },
    face_extreme: { scale: 1.9,  shakeAmt: 22, textSize: "clamp(32px, 7vw, 80px)",  zoom: "scale(1.9) translateZ(0)" },
  } as const;

  const config = faceConfigs[type as keyof typeof faceConfigs] ?? faceConfigs.face_small;
  const isExtreme = type === "face_extreme";

  const W = Math.min(typeof window !== "undefined" ? window.innerWidth * 0.98 : 700, 720);
  const H = Math.min(typeof window !== "undefined" ? window.innerHeight * 0.98 : 700, 720);

  // Animate the scale: start smaller, end at config.scale
  const startScale = config.scale * 0.6;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background: isExtreme ? "#000" : "#080000",
        animation: `scare-shake-${Math.min(3, Math.ceil(config.shakeAmt / 7))} 0.06s ease-in-out infinite`,
      }}
    >
      {/* Red vignette radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, rgba(200,0,0,${isExtreme ? 0.9 : 0.5}) 0%, ${isExtreme ? "#220000" : "#080000"} 65%)`,
          animation: "scare-pulse 0.12s ease-in-out infinite",
        }}
      />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 3px)",
          zIndex: 2,
        }}
      />

      {/* THE FACE */}
      <div
        style={{
          animation: `scare-zoom-in 0.12s ease-out forwards, scare-shake-jitter 0.05s ease-in-out infinite`,
          filter: `drop-shadow(0 0 ${isExtreme ? 120 : 80}px rgba(220,0,0,1)) drop-shadow(0 0 30px rgba(255,0,0,0.9))`,
          zIndex: 3,
        }}
      >
        <svg
          width={W}
          height={H}
          viewBox={isExtreme ? "-60 -80 120 100" : "-200 -210 400 420"}
          style={{ display: "block" }}
        >
          {!isExtreme && (
            <>
              {/* Neck */}
              <ellipse cx={0} cy={275} rx={95} ry={65} fill="#0d0000" />
              <rect x={-65} y={150} width={130} height={150} fill="#0d0000" rx={10} />
              {/* Shoulders — ripped shirt */}
              <path d="M -160 260 Q -100 200 -65 210 L -65 340 Z" fill="#0d0000" />
              <path d="M 160 260 Q 100 200 65 210 L 65 340 Z" fill="#0d0000" />
              {/* Bloody collar area */}
              <path d="M -50 200 Q 0 225 50 200 Q 30 250 0 245 Q -30 250 -50 200" fill="#1a0000" />
              {Array.from({ length: 6 }).map((_, i) => (
                <line key={i} x1={(i - 3) * 18} y1={205} x2={(i - 3) * 18 + 4} y2={240 + i * 5} stroke="#5a0000" strokeWidth={2.5} opacity={0.7} />
              ))}
            </>
          )}

          {/* Head */}
          <ellipse cx={0} cy={0} rx={isExtreme ? 200 : 172} ry={isExtreme ? 200 : 185} fill="#0d0000" />

          {/* Texture patches */}
          <ellipse cx={-85} cy={-65} rx={65} ry={50} fill="#1a0500" opacity={0.7} />
          <ellipse cx={105} cy={45} rx={55} ry={65} fill="#1a0500" opacity={0.6} />
          <ellipse cx={20} cy={120} rx={85} ry={45} fill="#1a0500" opacity={0.5} />
          <ellipse cx={-30} cy={-150} rx={50} ry={35} fill="#1a0500" opacity={0.4} />

          {/* Veins — more of them */}
          <path d="M -130 -110 Q -90 -30 -60 50 Q -40 90 -20 120" stroke="#4a0000" strokeWidth={3.5} fill="none" opacity={0.8} />
          <path d="M 110 -130 Q 75 -10 90 80 Q 100 120 80 150" stroke="#4a0000" strokeWidth={2.5} fill="none" opacity={0.7} />
          <path d="M -50 -175 Q -25 -120 -40 -60 Q -50 -20 -20 20" stroke="#3a0000" strokeWidth={2} fill="none" opacity={0.6} />
          <path d="M 40 -170 Q 20 -100 45 -50 Q 60 0 40 40" stroke="#3a0000" strokeWidth={2} fill="none" opacity={0.5} />
          <path d="M -160 20 Q -120 40 -80 20 Q -50 10 -30 30" stroke="#4a0000" strokeWidth={2} fill="none" opacity={0.6} />
          <path d="M 130 -20 Q 100 10 80 -10 Q 60 -20 40 0" stroke="#3a0000" strokeWidth={2} fill="none" opacity={0.5} />

          {/* Flesh wounds */}
          <ellipse cx={-70} cy={30} rx={18} ry={8} fill="#3a0000" opacity={0.8} />
          <ellipse cx={80} cy={-50} rx={12} ry={6} fill="#3a0000" opacity={0.7} />

          {/* LEFT EYE */}
          <ellipse cx={-42} cy={-28} rx={56} ry={52} fill="#050000" />
          <ellipse cx={-42} cy={-28} rx={48} ry={44} fill="#0a0000" />
          <circle cx={-42} cy={-28} r={36} fill="#ede5d5" />
          {[-30, -15, 0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 200, 230, 260, 300, 330].map((angle, i) => (
            <line
              key={i}
              x1={-42 + Math.cos((angle * Math.PI) / 180) * 5}
              y1={-28 + Math.sin((angle * Math.PI) / 180) * 5}
              x2={-42 + Math.cos((angle * Math.PI) / 180) * 34}
              y2={-28 + Math.sin((angle * Math.PI) / 180) * 34}
              stroke={i % 2 === 0 ? "#cc0000" : "#880000"}
              strokeWidth={i % 4 === 0 ? 1.8 : 0.9}
              opacity={0.75}
            />
          ))}
          <circle cx={-42} cy={-28} r={18} fill="#030000" />
          <circle cx={-42} cy={-28} r={14} fill="#000" />
          <circle cx={-42} cy={-28} r={18} fill="none" stroke="#990000" strokeWidth={2.5} />
          {/* Dilated red pupil ring */}
          <circle cx={-42} cy={-28} r={9} fill="#1a0000" />
          {/* Glint */}
          <circle cx={-52} cy={-37} r={4} fill="rgba(255,255,255,0.95)" />
          <circle cx={-36} cy={-22} r={2} fill="rgba(255,255,255,0.6)" />

          {/* RIGHT EYE */}
          <ellipse cx={42} cy={-28} rx={56} ry={52} fill="#050000" />
          <ellipse cx={42} cy={-28} rx={48} ry={44} fill="#0a0000" />
          <circle cx={42} cy={-28} r={36} fill="#ede5d5" />
          {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340].map((angle, i) => (
            <line
              key={i}
              x1={42 + Math.cos((angle * Math.PI) / 180) * 5}
              y1={-28 + Math.sin((angle * Math.PI) / 180) * 5}
              x2={42 + Math.cos((angle * Math.PI) / 180) * 34}
              y2={-28 + Math.sin((angle * Math.PI) / 180) * 34}
              stroke={i % 2 === 0 ? "#dd0000" : "#770000"}
              strokeWidth={i % 3 === 0 ? 1.8 : 0.9}
              opacity={0.8}
            />
          ))}
          <circle cx={42} cy={-28} r={18} fill="#030000" />
          <circle cx={42} cy={-28} r={14} fill="#000" />
          <circle cx={42} cy={-28} r={18} fill="none" stroke="#990000" strokeWidth={2.5} />
          <circle cx={42} cy={-28} r={9} fill="#1a0000" />
          <circle cx={32} cy={-37} r={4} fill="rgba(255,255,255,0.95)" />
          <circle cx={48} cy={-22} r={2} fill="rgba(255,255,255,0.6)" />

          {/* Stiches over right eye */}
          {!isExtreme && Array.from({ length: 5 }).map((_, i) => (
            <line key={i} x1={20 + i * 8} y1={-68 + i * 3} x2={24 + i * 8} y2={-55 + i * 3} stroke="#5a0000" strokeWidth={1.5} opacity={0.8} />
          ))}

          {/* Nose */}
          {!isExtreme && (
            <>
              <path d="M -20 22 Q -32 65 -22 86 Q 0 96 22 86 Q 32 65 20 22" fill="#0d0000" />
              <ellipse cx={-24} cy={80} rx={15} ry={11} fill="#060000" />
              <ellipse cx={24} cy={80} rx={15} ry={11} fill="#060000" />
            </>
          )}

          {/* MOUTH — WIDE GAPING */}
          <path d="M -120 110 Q -85 94 0 100 Q 85 94 120 110 Q 100 195 0 198 Q -100 195 -120 110 Z" fill="#060000" />
          {/* Deep throat */}
          <ellipse cx={0} cy={158} rx={60} ry={40} fill="#020000" />
          <ellipse cx={0} cy={170} rx={30} ry={20} fill="#000" />
          {/* Upper teeth — jagged, rotten */}
          {[-95, -68, -44, -22, 0, 22, 46, 70].map((x, i) => (
            <path
              key={i}
              d={`M ${x} 114 L ${x + 13} 114 L ${x + 6} ${128 + (i % 4) * 10} Z`}
              fill={i % 5 === 0 ? "#8a7040" : i % 3 === 0 ? "#b0963c" : "#d8c888"}
            />
          ))}
          {/* Lower teeth */}
          {[-72, -50, -28, -6, 16, 38, 62].map((x, i) => (
            <path
              key={i}
              d={`M ${x} 180 L ${x + 13} 180 L ${x + 6} ${168 - (i % 3) * 7} Z`}
              fill={i % 4 === 0 ? "#7a6030" : "#c8b070"}
            />
          ))}
          {/* Heavy blood dripping from mouth */}
          {[-80, -50, -20, 12, 45, 75].map((x, i) => (
            <g key={i}>
              <circle cx={x} cy={110} r={5 + i % 2} fill="#6b0000" />
              <path
                d={`M ${x} 112 Q ${x + (i % 2 === 0 ? 3 : -3)} ${120 + i * 6} ${x + (i % 2 === 0 ? 1 : -1)} ${132 + i * 9}`}
                stroke="#6b0000"
                strokeWidth={3 + i % 3}
                fill="none"
              />
              <circle cx={x + (i % 2 === 0 ? 1 : -1)} cy={132 + i * 9} r={3} fill="#5a0000" />
            </g>
          ))}

          {/* Forehead wounds */}
          <path d="M -60 -150 Q -30 -130 15 -105 Q 35 -88 25 -65" stroke="#7b0000" strokeWidth={4} fill="none" opacity={0.9} />
          <path d="M 70 -140 Q 50 -115 62 -85" stroke="#6a0000" strokeWidth={3} fill="none" opacity={0.8} />
          <path d="M -100 -80 Q -70 -60 -60 -30" stroke="#5a0000" strokeWidth={2} fill="none" opacity={0.6} />
          {/* Gash wound on forehead */}
          <ellipse cx={-20} cy={-130} rx={22} ry={8} fill="#3a0000" opacity={0.9} />
          <ellipse cx={-20} cy={-130} rx={12} ry={4} fill="#1a0000" opacity={0.9} />

          {/* Wild hair */}
          {Array.from({ length: isExtreme ? 0 : 26 }).map((_, i) => {
            const angle = (i / 26) * Math.PI * 2;
            const baseR = 162;
            const tipR = baseR + 18 + Math.sin(i * 137.5) * 35;
            return (
              <line
                key={i}
                x1={Math.cos(angle) * baseR}
                y1={Math.sin(angle) * baseR * 0.88 - 25}
                x2={Math.cos(angle) * tipR}
                y2={Math.sin(angle) * tipR * 0.88 - 30}
                stroke="#080000"
                strokeWidth={3.5 + Math.sin(i) * 1.8}
                opacity={0.95}
              />
            );
          })}
        </svg>
      </div>

      {/* Text overlay */}
      {!isExtreme ? (
        <div
          className="absolute bottom-10 left-0 right-0 text-center"
          style={{ zIndex: 10, animation: "scare-text-glitch 0.07s ease-in-out infinite" }}
        >
          <p
            style={{
              color: "#ff1111",
              fontSize: "clamp(22px, 5.5vw, 68px)",
              fontFamily: "'Special Elite', 'Courier New', serif",
              letterSpacing: "0.12em",
              textShadow: "4px 4px 0 #660000, -4px -4px 0 #660000, 4px -4px 0 #660000, 0 0 30px #ff0000",
              animation: "scare-text-glitch 0.08s ease-in-out infinite",
            }}
          >
            {msgRef.current}
          </p>
        </div>
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 10 }}
        >
          <p
            style={{
              color: "#ff0000",
              fontSize: "clamp(28px, 9vw, 110px)",
              fontFamily: "'Special Elite', 'Courier New', serif",
              letterSpacing: "0.15em",
              textShadow: "0 0 60px #ff0000, 6px 6px 0 #550000, -6px -6px 0 #550000",
              animation: "scare-text-glitch 0.05s ease-in-out infinite",
              textAlign: "center",
              mixBlendMode: "difference",
            }}
          >
            {msg2Ref.current}
          </p>
        </div>
      )}

      <style>{`
        @keyframes scare-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes scare-zoom-in {
          from { transform: scale(0.55); }
          to { transform: scale(1); }
        }
        @keyframes scare-text-glitch {
          0% { transform: translate(0, 0) skewX(0deg); }
          20% { transform: translate(-3px, 2px) skewX(-2deg); }
          40% { transform: translate(-3px, -2px) skewX(1deg); }
          60% { transform: translate(3px, 2px) skewX(2deg); }
          80% { transform: translate(3px, -2px) skewX(-1deg); }
          100% { transform: translate(0, 0) skewX(0deg); }
        }
        @keyframes scare-shake-jitter {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-${config.shakeAmt}px, -${config.shakeAmt * 0.5}px); }
          20% { transform: translate(${config.shakeAmt}px, ${config.shakeAmt * 0.7}px); }
          30% { transform: translate(-${config.shakeAmt * 0.8}px, ${config.shakeAmt * 0.3}px); }
          40% { transform: translate(${config.shakeAmt * 0.6}px, -${config.shakeAmt * 0.8}px); }
          50% { transform: translate(-${config.shakeAmt * 0.4}px, ${config.shakeAmt * 0.6}px); }
          60% { transform: translate(${config.shakeAmt * 0.9}px, -${config.shakeAmt * 0.4}px); }
          70% { transform: translate(-${config.shakeAmt * 0.7}px, ${config.shakeAmt * 0.9}px); }
          80% { transform: translate(${config.shakeAmt * 0.5}px, ${config.shakeAmt * 0.5}px); }
          90% { transform: translate(-${config.shakeAmt * 0.3}px, -${config.shakeAmt * 0.7}px); }
        }
        @keyframes scare-shake-1 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(-5px, 3px); }
          66% { transform: translate(5px, -3px); }
        }
        @keyframes scare-shake-2 {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-9px, 5px); }
          50% { transform: translate(9px, -7px); }
          75% { transform: translate(-7px, 8px); }
        }
        @keyframes scare-shake-3 {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-14px, 8px); }
          40% { transform: translate(14px, -10px); }
          60% { transform: translate(-12px, 12px); }
          80% { transform: translate(10px, -8px); }
        }
      `}</style>
    </div>
  );
}
