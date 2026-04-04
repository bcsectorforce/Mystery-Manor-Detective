import React, { useEffect, useState } from "react";
import { playIntroScareSound } from "../game/audio";

interface IntroScareProps {
  onDone: () => void;
}

export function IntroScare({ onDone }: IntroScareProps) {
  const [stage, setStage] = useState<"fadeout" | "black" | "hand" | "fadeaway">("fadeout");
  const [handSlid, setHandSlid] = useState(false);
  const [fadeAway, setFadeAway] = useState(false);

  useEffect(() => {
    // Stage 0: fade out (0.4s)
    const t1 = setTimeout(() => {
      setStage("black");
    }, 400);

    // Stage 1: black screen for 2s total from start
    const t2 = setTimeout(() => {
      setStage("hand");
      playIntroScareSound();
    }, 2000);

    // Stage 2: hand slams in — start slide after 0.1s
    const t3 = setTimeout(() => {
      setHandSlid(true);
    }, 2100);

    // Stage 3: after 6s of hand, fade away
    const t4 = setTimeout(() => {
      setFadeAway(true);
    }, 8000);

    // Stage 4: call done after fade
    const t5 = setTimeout(() => {
      onDone();
    }, 8700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onDone]);

  if (stage === "fadeout") {
    return (
      <div
        className="fixed inset-0 z-[9999] bg-black"
        style={{ animation: "introscare-fadein 0.4s ease-in forwards" }}
      >
        <style>{`
          @keyframes introscare-fadein {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (stage === "black") {
    return <div className="fixed inset-0 z-[9999] bg-black" />;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black flex items-start justify-center overflow-hidden"
      style={{
        opacity: fadeAway ? 0 : 1,
        transition: fadeAway ? "opacity 0.7s ease-in" : "none",
      }}
    >
      {/* Blood splatter background */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              background: "#6b0000",
              left: `${10 + i * 4.5 + (i % 3) * 3}%`,
              top: `${5 + (i % 5) * 8}%`,
              width: `${6 + (i % 4) * 4}px`,
              height: `${6 + (i % 4) * 4}px`,
              opacity: handSlid ? 0.7 : 0,
              transition: `opacity 0.3s ease ${0.1 + i * 0.04}s`,
            }}
          />
        ))}
      </div>

      {/* THE HAND */}
      <div
        style={{
          transform: handSlid ? "translateY(0px) scale(1)" : "translateY(-120%) scale(1.15)",
          transition: handSlid ? "transform 0.18s cubic-bezier(0.25, 0.1, 0.15, 1.5)" : "none",
          position: "relative",
          zIndex: 2,
          filter: "drop-shadow(0 0 40px rgba(180,0,0,0.9)) drop-shadow(0 20px 60px rgba(0,0,0,0.95))",
        }}
      >
        <svg
          width="min(98vw, 580px)"
          height="min(75vh, 560px)"
          viewBox="0 0 580 560"
          style={{ display: "block" }}
        >
          {/* Palm */}
          <ellipse cx={290} cy={400} rx={175} ry={155} fill="#0d0000" />
          <ellipse cx={290} cy={380} rx={160} ry={140} fill="#140000" />

          {/* Palm texture / veins */}
          <path d="M 200 360 Q 230 320 260 380 Q 280 340 310 380 Q 340 320 370 360" stroke="#3a0000" strokeWidth={3} fill="none" opacity={0.8} />
          <path d="M 180 400 Q 220 370 260 400 Q 300 370 340 400 Q 370 370 400 400" stroke="#2a0000" strokeWidth={2} fill="none" opacity={0.6} />
          <path d="M 195 430 Q 250 410 290 430 Q 330 410 385 430" stroke="#3a0000" strokeWidth={2.5} fill="none" opacity={0.7} />

          {/* Wrist */}
          <rect x={195} y={490} width={200} height={80} rx={20} fill="#0d0000" />
          <ellipse cx={290} cy={490} rx={100} ry={25} fill="#110000" />

          {/* Thumb */}
          <ellipse cx={140} cy={310} rx={42} ry={95} fill="#0d0000" transform="rotate(-30 140 310)" />
          <ellipse cx={143} cy={308} rx={32} ry={82} fill="#110000" transform="rotate(-30 143 308)" />
          <ellipse cx={118} cy={245} rx={28} ry={35} fill="#0d0000" transform="rotate(-30 118 245)" />

          {/* Index finger */}
          <rect x={168} y={100} width={58} height={195} rx={29} fill="#0d0000" />
          <rect x={174} y={105} width={46} height={180} rx={23} fill="#110000" />
          <ellipse cx={197} cy={103} rx={29} ry={32} fill="#0d0000" />
          {/* Knuckle lines */}
          <line x1={172} y1={210} x2={220} y2={208} stroke="#060000" strokeWidth={3} opacity={0.9} />
          <line x1={173} y1={238} x2={219} y2={236} stroke="#060000" strokeWidth={2.5} opacity={0.8} />

          {/* Middle finger */}
          <rect x={234} y={60} width={62} height={220} rx={31} fill="#0d0000" />
          <rect x={240} y={65} width={50} height={205} rx={25} fill="#110000" />
          <ellipse cx={265} cy={62} rx={31} ry={34} fill="#0d0000" />
          <line x1={237} y1={218} x2={292} y2={215} stroke="#060000" strokeWidth={3} opacity={0.9} />
          <line x1={238} y1={248} x2={291} y2={245} stroke="#060000" strokeWidth={2.5} opacity={0.8} />

          {/* Ring finger */}
          <rect x={306} y={80} width={58} height={210} rx={29} fill="#0d0000" />
          <rect x={312} y={85} width={46} height={195} rx={23} fill="#110000" />
          <ellipse cx={335} cy={82} rx={29} ry={32} fill="#0d0000" />
          <line x1={309} y1={220} x2={360} y2={218} stroke="#060000" strokeWidth={3} opacity={0.9} />
          <line x1={310} y1={248} x2={359} y2={246} stroke="#060000" strokeWidth={2.5} opacity={0.8} />

          {/* Pinky */}
          <rect x={374} y={130} width={48} height={175} rx={24} fill="#0d0000" />
          <rect x={379} y={135} width={38} height={162} rx={19} fill="#110000" />
          <ellipse cx={398} cy={132} rx={24} ry={27} fill="#0d0000" />
          <line x1={376} y1={232} x2={420} y2={230} stroke="#060000" strokeWidth={2.5} opacity={0.9} />
          <line x1={377} y1={256} x2={419} y2={254} stroke="#060000" strokeWidth={2} opacity={0.8} />

          {/* Wounds on palm */}
          <ellipse cx={255} cy={380} rx={12} ry={6} fill="#3a0000" opacity={0.9} />
          <ellipse cx={320} cy={360} rx={9} ry={5} fill="#3a0000" opacity={0.8} />

          {/* BLOOD dripping from fingers */}
          {/* Index blood */}
          <path d="M 188 103 Q 192 140 185 180 Q 183 210 190 245" stroke="#8b0000" strokeWidth={5} fill="none" opacity={0.9} strokeLinecap="round" />
          <circle cx={190} cy={248} r={7} fill="#6b0000" />
          {handSlid && <path d="M 190 248 Q 188 280 187 330 Q 186 380 188 430" stroke="#6b0000" strokeWidth={4} fill="none" strokeLinecap="round" style={{ animation: "blood-slide 2s ease-in 0.2s forwards", opacity: 0 }} />}

          {/* Middle blood */}
          <path d="M 258 63 Q 263 110 258 158 Q 255 200 262 238" stroke="#8b0000" strokeWidth={6} fill="none" opacity={0.95} strokeLinecap="round" />
          <circle cx={262} cy={241} r={8} fill="#6b0000" />
          {handSlid && <path d="M 262 241 Q 260 300 258 370 Q 256 430 260 480" stroke="#6b0000" strokeWidth={5} fill="none" strokeLinecap="round" style={{ animation: "blood-slide 2.5s ease-in 0.35s forwards", opacity: 0 }} />}

          {/* Ring blood */}
          <path d="M 327 83 Q 330 130 326 175 Q 323 215 329 250" stroke="#8b0000" strokeWidth={5} fill="none" opacity={0.9} strokeLinecap="round" />
          <circle cx={329} cy={253} r={7} fill="#6b0000" />
          {handSlid && <path d="M 329 253 Q 327 310 325 380 Q 323 440 327 480" stroke="#6b0000" strokeWidth={4} fill="none" strokeLinecap="round" style={{ animation: "blood-slide 2.2s ease-in 0.15s forwards", opacity: 0 }} />}

          {/* Palm drips */}
          {[230, 270, 310, 350].map((x, i) => (
            <g key={i}>
              {handSlid && (
                <path
                  d={`M ${x} 520 Q ${x + (i % 2 === 0 ? 4 : -4)} 540 ${x + (i % 2 === 0 ? 2 : -2)} 560`}
                  stroke="#6b0000"
                  strokeWidth={3 + i % 2}
                  fill="none"
                  strokeLinecap="round"
                  style={{ animation: `blood-slide ${1.5 + i * 0.3}s ease-in ${0.5 + i * 0.2}s forwards`, opacity: 0 }}
                />
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Bloody fingerprint smear overlay */}
      {handSlid && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 40% at 50% 60%, rgba(80,0,0,0.35) 0%, transparent 80%)",
            animation: "smear-in 0.4s ease-out forwards",
          }}
        />
      )}

      {/* Message */}
      {handSlid && (
        <div
          className="absolute bottom-12 left-0 right-0 text-center pointer-events-none"
          style={{ zIndex: 10, animation: "msg-appear 0.6s ease-out 1.5s both" }}
        >
          <p
            style={{
              color: "#550000",
              fontSize: "clamp(16px, 3.5vw, 44px)",
              fontFamily: "'Special Elite', 'Courier New', serif",
              letterSpacing: "0.25em",
              textShadow: "2px 2px 0 #1a0000",
              opacity: 0.8,
            }}
          >
            YOU ARE NOT ALONE
          </p>
        </div>
      )}

      <style>{`
        @keyframes blood-slide {
          0%   { opacity: 0; stroke-dashoffset: 300; stroke-dasharray: 300; }
          10%  { opacity: 0.85; }
          100% { opacity: 0.85; stroke-dashoffset: 0; stroke-dasharray: 300; }
        }
        @keyframes smear-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes msg-appear {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
