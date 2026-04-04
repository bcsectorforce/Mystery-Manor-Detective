import React, { useEffect, useState } from "react";
import { playJumpScareSound } from "../game/audio";

interface IntroScareProps {
  onDone: () => void;
}

export function IntroScare({ onDone }: IntroScareProps) {
  const [stage, setStage] = useState<"fadeout" | "black" | "approach" | "sliding" | "away">("fadeout");

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const t = (ms: number, fn: () => void) => {
      const id = setTimeout(fn, ms);
      timers.push(id);
    };

    // 0 → 400ms: fade screen to black
    t(400, () => setStage("black"));

    // 2000ms: hand appears tiny (distant), sound fires
    t(2000, () => {
      setStage("approach");
      playJumpScareSound();
    });

    // 2550ms: impact complete — start slow slide
    t(2550, () => setStage("sliding"));

    // 8800ms: fade away
    t(8800, () => setStage("away"));

    // 9500ms: call done
    t(9500, () => onDone());

    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  if (stage === "fadeout") {
    return (
      <div className="fixed inset-0 z-[9999]" style={{ background: "#000", animation: "is-fadein 0.4s ease-in forwards" }}>
        <style>{`@keyframes is-fadein { from{opacity:0} to{opacity:1} }`}</style>
      </div>
    );
  }

  if (stage === "black") {
    return <div className="fixed inset-0 z-[9999] bg-black" />;
  }

  const isApproaching = stage === "approach";
  const isSliding = stage === "sliding" || stage === "away";
  const isAway = stage === "away";

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ background: "#000", opacity: isAway ? 0 : 1, transition: isAway ? "opacity 0.7s ease-in" : "none" }}
    >
      {/* Blood smear on screen — grows as hand slides */}
      {isSliding && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 55% 30% at 50% 20%, rgba(90,0,0,0.55) 0%, transparent 100%)",
            animation: "is-smear 6s ease-out forwards",
          }}
        />
      )}

      {/* Blood streaks left on screen */}
      {isSliding && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {[18, 28, 38, 50, 62, 72, 82].map((x, i) => (
            <path
              key={i}
              d={`M ${x} 0 Q ${x + (i % 2 === 0 ? 2 : -2)} 30 ${x + (i % 2 === 0 ? 1 : -1)} 60 Q ${x} 80 ${x + (i % 3 === 0 ? 3 : -1)} 100`}
              stroke="#6b0000"
              strokeWidth={0.4 + (i % 3) * 0.25}
              fill="none"
              opacity={0}
              strokeLinecap="round"
              style={{
                animation: `is-drip-${i % 4} ${3 + i * 0.4}s ease-in ${0.1 + i * 0.18}s forwards`,
              }}
            />
          ))}
        </svg>
      )}

      {/* THE HAND — centered, perspective zoom then slow slide */}
      <div
        className="absolute left-1/2 pointer-events-none"
        style={{
          top: 0,
          transform: "translateX(-50%)",
          animation: isApproaching
            ? "is-slam 0.55s cubic-bezier(0.12, 0.8, 0.2, 1) forwards"
            : isSliding
            ? "is-slidedown 6.2s cubic-bezier(0.2, 0, 0.5, 1) forwards"
            : "none",
          filter:
            "drop-shadow(0 8px 80px rgba(0,0,0,1)) drop-shadow(0 0 30px rgba(120,0,0,0.6))",
          width: "min(92vw, 520px)",
        }}
      >
        <svg
          viewBox="0 0 520 580"
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <defs>
            {/* Skin gradient — pallid, dead */}
            <radialGradient id="palmGrad" cx="50%" cy="55%" r="55%">
              <stop offset="0%"   stopColor="#b8896a" />
              <stop offset="40%"  stopColor="#9a6e50" />
              <stop offset="100%" stopColor="#5e3820" />
            </radialGradient>
            <radialGradient id="fingerGrad" cx="50%" cy="30%" r="70%">
              <stop offset="0%"   stopColor="#c49070" />
              <stop offset="60%"  stopColor="#8a5e3e" />
              <stop offset="100%" stopColor="#4a2810" />
            </radialGradient>
            <radialGradient id="thumbGrad" cx="40%" cy="40%" r="60%">
              <stop offset="0%"   stopColor="#be8a68" />
              <stop offset="100%" stopColor="#5a3318" />
            </radialGradient>
            <radialGradient id="nailGrad" cx="50%" cy="40%" r="60%">
              <stop offset="0%"   stopColor="#d4c8b8" />
              <stop offset="100%" stopColor="#8a7860" />
            </radialGradient>
            <radialGradient id="bloodPool" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#8b0000" />
              <stop offset="100%" stopColor="#3a0000" />
            </radialGradient>
            <linearGradient id="wristGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#7a4e30" />
              <stop offset="100%" stopColor="#3a1800" />
            </linearGradient>
            {/* Shadow under each finger */}
            <filter id="softShadow">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#1a0800" floodOpacity="0.8" />
            </filter>
            <filter id="bloodGlow">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#cc0000" floodOpacity="0.7" />
            </filter>
          </defs>

          {/* ── WRIST ── */}
          <path
            d="M 165 560 Q 155 520 160 490 L 360 490 Q 365 520 355 560 Z"
            fill="url(#wristGrad)"
          />
          {/* Wrist tendons */}
          <line x1={230} y1={560} x2={225} y2={490} stroke="#3a1800" strokeWidth={3} opacity={0.5} />
          <line x1={260} y1={560} x2={258} y2={490} stroke="#3a1800" strokeWidth={2.5} opacity={0.4} />
          <line x1={290} y1={560} x2={291} y2={490} stroke="#3a1800" strokeWidth={2} opacity={0.35} />

          {/* ── PALM ── */}
          <path
            d="M 110 480 Q 100 430 105 380 Q 108 340 115 310 Q 135 270 160 260 L 360 260 Q 385 270 405 310 Q 412 340 415 380 Q 420 430 410 480 Z"
            fill="url(#palmGrad)"
            filter="url(#softShadow)"
          />
          {/* Palm crease lines */}
          <path d="M 130 340 Q 200 320 280 335 Q 340 340 390 330" stroke="#5a3018" strokeWidth={2.5} fill="none" opacity={0.55} strokeLinecap="round" />
          <path d="M 125 380 Q 200 368 280 375 Q 350 378 400 365" stroke="#5a3018" strokeWidth={2} fill="none" opacity={0.45} strokeLinecap="round" />
          <path d="M 140 420 Q 210 410 280 415 Q 350 416 400 408" stroke="#5a3018" strokeWidth={1.5} fill="none" opacity={0.38} strokeLinecap="round" />
          {/* Palm veins */}
          <path d="M 200 460 Q 215 400 220 340 Q 222 300 230 270" stroke="#3d1c0a" strokeWidth={2} fill="none" opacity={0.45} strokeLinecap="round" />
          <path d="M 260 465 Q 268 400 265 340 Q 263 300 268 270" stroke="#3d1c0a" strokeWidth={1.5} fill="none" opacity={0.38} strokeLinecap="round" />
          <path d="M 320 460 Q 325 400 320 340 Q 318 305 325 272" stroke="#3d1c0a" strokeWidth={2} fill="none" opacity={0.42} strokeLinecap="round" />
          {/* Mound of thumb (thenar) */}
          <ellipse cx={148} cy={390} rx={40} ry={65} fill="#8a5e3c" opacity={0.5} />

          {/* ── THUMB ── */}
          <path
            d="M 80 310 Q 68 270 75 235 Q 82 200 100 180 Q 118 162 138 168 Q 158 174 162 200 Q 166 225 155 255 Q 148 278 145 310 Z"
            fill="url(#thumbGrad)"
            filter="url(#softShadow)"
          />
          {/* Thumb knuckle */}
          <path d="M 82 270 Q 110 258 148 265" stroke="#4a2810" strokeWidth={2.5} fill="none" opacity={0.6} strokeLinecap="round" />
          <path d="M 85 290 Q 112 280 148 286" stroke="#4a2810" strokeWidth={1.8} fill="none" opacity={0.45} strokeLinecap="round" />
          {/* Thumb nail */}
          <ellipse cx={120} cy={177} rx={18} ry={11} fill="url(#nailGrad)" opacity={0.85} />
          <ellipse cx={120} cy={177} rx={18} ry={11} fill="none" stroke="#6a5040" strokeWidth={1} opacity={0.6} />
          <path d="M 107 177 Q 120 172 133 177" stroke="#d8ccc0" strokeWidth={0.8} fill="none" opacity={0.5} />
          {/* Thumb blood */}
          <ellipse cx={120} cy={170} rx={14} ry={8} fill="url(#bloodPool)" opacity={0.85} filter="url(#bloodGlow)" />
          <path d="M 113 168 Q 116 155 118 140 Q 120 120 116 100" stroke="#8b0000" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.9} />

          {/* ── INDEX FINGER ── */}
          <path
            d="M 163 262 Q 158 220 162 175 Q 166 140 170 110 Q 175 80 185 62 Q 196 44 210 42 Q 224 40 232 58 Q 240 75 242 105 Q 245 140 243 175 Q 241 220 238 262 Z"
            fill="url(#fingerGrad)"
            filter="url(#softShadow)"
          />
          {/* Index knuckles */}
          <path d="M 166 215 Q 200 204 238 212" stroke="#4a2810" strokeWidth={2.5} fill="none" opacity={0.6} strokeLinecap="round" />
          <path d="M 167 240 Q 200 230 237 238" stroke="#4a2810" strokeWidth={2} fill="none" opacity={0.5} strokeLinecap="round" />
          <path d="M 168 172 Q 200 162 238 170" stroke="#4a2810" strokeWidth={2} fill="none" opacity={0.45} strokeLinecap="round" />
          {/* Index nail */}
          <ellipse cx={213} cy={50} rx={17} ry={10} fill="url(#nailGrad)" opacity={0.85} />
          <ellipse cx={213} cy={50} rx={17} ry={10} fill="none" stroke="#6a5040" strokeWidth={1} opacity={0.6} />
          {/* Index blood pool + drip */}
          <ellipse cx={213} cy={44} rx={14} ry={8} fill="url(#bloodPool)" opacity={0.9} filter="url(#bloodGlow)" />
          <path d="M 207 42 Q 210 28 208 10 Q 207 -5 208 -20" stroke="#8b0000" strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.95} />
          <circle cx={208} cy={-22} r={6} fill="#6b0000" opacity={0.9} />

          {/* ── MIDDLE FINGER ── */}
          <path
            d="M 241 262 Q 238 215 240 165 Q 242 125 246 90 Q 251 58 260 38 Q 268 18 282 16 Q 296 14 304 34 Q 312 54 315 90 Q 318 125 318 165 Q 318 215 315 262 Z"
            fill="url(#fingerGrad)"
            filter="url(#softShadow)"
          />
          {/* Middle knuckles */}
          <path d="M 242 208 Q 278 196 316 206" stroke="#4a2810" strokeWidth={2.5} fill="none" opacity={0.62} strokeLinecap="round" />
          <path d="M 242 236 Q 278 225 316 234" stroke="#4a2810" strokeWidth={2} fill="none" opacity={0.5} strokeLinecap="round" />
          <path d="M 243 162 Q 278 152 316 160" stroke="#4a2810" strokeWidth={2} fill="none" opacity={0.45} strokeLinecap="round" />
          {/* Middle nail */}
          <ellipse cx={283} cy={24} rx={19} ry={11} fill="url(#nailGrad)" opacity={0.85} />
          <ellipse cx={283} cy={24} rx={19} ry={11} fill="none" stroke="#6a5040" strokeWidth={1} opacity={0.6} />
          {/* Middle blood */}
          <ellipse cx={283} cy={18} rx={16} ry={9} fill="url(#bloodPool)" opacity={0.95} filter="url(#bloodGlow)" />
          <path d="M 276 16 Q 279 -2 278 -22 Q 277 -38 280 -55" stroke="#8b0000" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.95} />
          <circle cx={280} cy={-57} r={7} fill="#6b0000" opacity={0.9} />

          {/* ── RING FINGER ── */}
          <path
            d="M 317 262 Q 315 218 317 172 Q 319 135 323 102 Q 328 72 337 52 Q 346 34 360 32 Q 374 30 382 48 Q 390 66 393 98 Q 397 132 397 172 Q 397 218 395 262 Z"
            fill="url(#fingerGrad)"
            filter="url(#softShadow)"
          />
          {/* Ring knuckles */}
          <path d="M 319 212 Q 356 200 394 210" stroke="#4a2810" strokeWidth={2.5} fill="none" opacity={0.6} strokeLinecap="round" />
          <path d="M 319 238 Q 356 228 394 237" stroke="#4a2810" strokeWidth={2} fill="none" opacity={0.5} strokeLinecap="round" />
          <path d="M 320 168 Q 356 158 393 167" stroke="#4a2810" strokeWidth={2} fill="none" opacity={0.45} strokeLinecap="round" />
          {/* Ring nail */}
          <ellipse cx={360} cy={40} rx={18} ry={10} fill="url(#nailGrad)" opacity={0.85} />
          <ellipse cx={360} cy={40} rx={18} ry={10} fill="none" stroke="#6a5040" strokeWidth={1} opacity={0.6} />
          {/* Ring blood */}
          <ellipse cx={360} cy={34} rx={15} ry={8} fill="url(#bloodPool)" opacity={0.9} filter="url(#bloodGlow)" />
          <path d="M 354 32 Q 357 16 355 -2 Q 354 -16 357 -30" stroke="#8b0000" strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.92} />
          <circle cx={357} cy={-32} r={5} fill="#6b0000" opacity={0.88} />

          {/* ── PINKY ── */}
          <path
            d="M 396 262 Q 395 228 397 196 Q 400 165 405 140 Q 411 116 420 100 Q 430 86 442 85 Q 454 84 462 98 Q 470 112 473 138 Q 477 165 475 196 Q 473 228 470 262 Z"
            fill="url(#fingerGrad)"
            filter="url(#softShadow)"
          />
          {/* Pinky knuckles */}
          <path d="M 397 220 Q 432 210 470 218" stroke="#4a2810" strokeWidth={2.2} fill="none" opacity={0.58} strokeLinecap="round" />
          <path d="M 398 244 Q 432 234 470 242" stroke="#4a2810" strokeWidth={1.8} fill="none" opacity={0.48} strokeLinecap="round" />
          <path d="M 399 190 Q 432 181 469 188" stroke="#4a2810" strokeWidth={1.8} fill="none" opacity={0.42} strokeLinecap="round" />
          {/* Pinky nail */}
          <ellipse cx={435} cy={93} rx={14} ry={9} fill="url(#nailGrad)" opacity={0.85} />
          <ellipse cx={435} cy={93} rx={14} ry={9} fill="none" stroke="#6a5040" strokeWidth={1} opacity={0.6} />
          {/* Pinky blood */}
          <ellipse cx={435} cy={88} rx={12} ry={7} fill="url(#bloodPool)" opacity={0.88} filter="url(#bloodGlow)" />
          <path d="M 430 86 Q 432 72 431 56 Q 430 44 433 32" stroke="#8b0000" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.9} />
          <circle cx={433} cy={30} r={5} fill="#6b0000" opacity={0.85} />

          {/* Fine skin texture — pores suggestion */}
          {[150, 190, 230, 270, 310, 360].map((x, i) => (
            <ellipse key={i} cx={x} cy={390 + (i % 3) * 20} rx={22} ry={12} fill="none" stroke="#4a2810" strokeWidth={0.6} opacity={0.18} />
          ))}

          {/* Hair on back of hand — subtle */}
          {[170, 200, 240, 280, 320, 360, 395].map((x, i) => (
            <line key={i} x1={x} y1={310 + (i % 4) * 8} x2={x + 15} y2={290 + (i % 3) * 6}
              stroke="#2a1008" strokeWidth={0.8} opacity={0.35} />
          ))}

          {/* Blood pooling at bottom of palm — from palm edge dripping off */}
          <path
            d="M 155 478 Q 180 490 220 485 Q 260 480 300 484 Q 340 488 380 480 Q 400 476 412 480"
            stroke="#7a0000" strokeWidth={3} fill="none" opacity={0.7} strokeLinecap="round"
          />
          <ellipse cx={255} cy={482} rx={80} ry={8} fill="#5a0000" opacity={0.45} />
        </svg>
      </div>

      {/* Impact white flash — momentary at slam */}
      {isApproaching && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "#fff", animation: "is-flash 0.55s ease-out forwards" }}
        />
      )}

      <style>{`
        /* Hand zooms from tiny (distance) and slams in */
        @keyframes is-slam {
          0%   { transform: translateX(-50%) translateY(-10%) scale(0.03); opacity: 0.6; }
          55%  { transform: translateX(-50%) translateY(-2%)  scale(1.12); opacity: 1; }
          75%  { transform: translateX(-50%) translateY(1%)   scale(1.04); opacity: 1; }
          100% { transform: translateX(-50%) translateY(0%)   scale(1.0);  opacity: 1; }
        }

        /* Hand slowly slides down (blood smears as it goes) */
        @keyframes is-slidedown {
          0%   { transform: translateX(-50%) translateY(0vh); }
          100% { transform: translateX(-50%) translateY(105vh); }
        }

        /* Brief white impact flash at moment of slam */
        @keyframes is-flash {
          0%   { opacity: 0; }
          15%  { opacity: 0.75; }
          100% { opacity: 0; }
        }

        /* Blood streaks grow down screen as hand slides */
        @keyframes is-drip-0 {
          0%   { opacity: 0;    stroke-dasharray: 120; stroke-dashoffset: 120; }
          8%   { opacity: 0.80; }
          100% { opacity: 0.78; stroke-dashoffset: 0; }
        }
        @keyframes is-drip-1 {
          0%   { opacity: 0;    stroke-dasharray: 140; stroke-dashoffset: 140; }
          8%   { opacity: 0.65; }
          100% { opacity: 0.62; stroke-dashoffset: 0; }
        }
        @keyframes is-drip-2 {
          0%   { opacity: 0;    stroke-dasharray: 110; stroke-dashoffset: 110; }
          8%   { opacity: 0.70; }
          100% { opacity: 0.68; stroke-dashoffset: 0; }
        }
        @keyframes is-drip-3 {
          0%   { opacity: 0;    stroke-dasharray: 130; stroke-dashoffset: 130; }
          8%   { opacity: 0.72; }
          100% { opacity: 0.70; stroke-dashoffset: 0; }
        }

        @keyframes is-smear {
          0%   { opacity: 0; }
          10%  { opacity: 1; }
          100% { opacity: 0.55; }
        }
      `}</style>
    </div>
  );
}
