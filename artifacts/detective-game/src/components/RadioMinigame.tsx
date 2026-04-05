import React, { useEffect, useRef, useState, useCallback } from "react";
import { createStaticSource, playRevealChime } from "../game/audio";

interface RadioMinigameProps {
  uncaughtKillerIds: string[];
  onClose: () => void;
}

export function RadioMinigame({ uncaughtKillerIds, onClose }: RadioMinigameProps) {
  const [dialY, setDialY] = useState(0.15);
  const [staticZone] = useState(() => 0.22 + Math.random() * 0.56);
  const [staticSecondsLeft, setStaticSecondsLeft] = useState(5);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [inStatic, setInStatic] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [freq, setFreq] = useState(88.1);
  const dragging = useRef(false);
  const barRef = useRef<SVGRectElement>(null);
  const staticRef = useRef<{ stop: () => void } | null>(null);
  const staticTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const killerId = uncaughtKillerIds[0] ?? "?????";
  const revealedDigits = killerId.slice(0, 3);

  const ZONE_HALF = 0.045;
  const isNearStatic = Math.abs(dialY - staticZone) < ZONE_HALF;

  // Frequency display updates as dial moves
  useEffect(() => {
    setFreq(88.1 + dialY * (108 - 88.1));
  }, [dialY]);

  // Hint timer
  useEffect(() => {
    hintTimerRef.current = setTimeout(() => setShowHint(true), 4000);
    return () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); };
  }, []);

  // Static zone logic
  useEffect(() => {
    if (revealed) return;

    if (isNearStatic && !inStatic) {
      setInStatic(true);
      staticRef.current = createStaticSource();
      setStaticSecondsLeft(5);
      staticTimerRef.current = setInterval(() => {
        setStaticSecondsLeft((s) => {
          if (s <= 1) {
            if (staticTimerRef.current) clearInterval(staticTimerRef.current);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else if (!isNearStatic && inStatic) {
      setInStatic(false);
      setStaticSecondsLeft(5);
      if (staticRef.current) { staticRef.current.stop(); staticRef.current = null; }
      if (staticTimerRef.current) clearInterval(staticTimerRef.current);
    }
  }, [isNearStatic, inStatic, revealed]);

  // Trigger reveal when staticSecondsLeft hits 0
  useEffect(() => {
    if (staticSecondsLeft === 0 && !revealed) {
      if (staticRef.current) { staticRef.current.stop(); staticRef.current = null; }
      playRevealChime();
      setRevealed(revealedDigits);
    }
  }, [staticSecondsLeft, revealed, revealedDigits]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (staticRef.current) { staticRef.current.stop(); staticRef.current = null; }
      if (staticTimerRef.current) clearInterval(staticTimerRef.current);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, []);

  const getBarY = useCallback((clientY: number) => {
    const bar = barRef.current;
    if (!bar) return dialY;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
  }, [dialY]);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    setDialY(getBarY(e.clientY));
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setDialY(getBarY(e.clientY));
  };
  const handlePointerUp = () => { dragging.current = false; };

  const BAR_X = 680;
  const BAR_Y = 80;
  const BAR_W = 28;
  const BAR_H = 340;
  const dialCY = BAR_Y + dialY * BAR_H;

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.92)", fontFamily: "'Special Elite','Courier New',serif" }}
    >
      <div className="relative" style={{ width: 760, maxWidth: "98vw" }}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-0 right-0 text-red-400/60 hover:text-red-400 text-sm z-10 px-2 py-1"
          style={{ fontFamily: "monospace" }}
        >
          [ESC]
        </button>

        <p className="text-center text-xs uppercase tracking-widest mb-4" style={{ color: "#8b6020" }}>
          Ravenswood Emergency Frequency Scanner
        </p>

        <svg viewBox="0 0 760 480" style={{ width: "100%", height: "auto", display: "block" }}>
          <defs>
            <linearGradient id="radiobody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2a2a2a" />
              <stop offset="100%" stopColor="#141414" />
            </linearGradient>
            <linearGradient id="speakergrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1a1a1a" />
              <stop offset="100%" stopColor="#333" />
            </linearGradient>
            <linearGradient id="screengrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#001a00" />
              <stop offset="100%" stopColor="#003300" />
            </linearGradient>
            <linearGradient id="freqbar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#003366" />
              <stop offset="25%" stopColor="#0066cc" />
              <stop offset="50%" stopColor="#00cc88" />
              <stop offset="75%" stopColor="#ffcc00" />
              <stop offset="100%" stopColor="#cc2200" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="screenglow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <pattern id="speaker-holes" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="2.5" fill="#0a0a0a" />
            </pattern>
            <pattern id="static-noise" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="#001a00" />
              <rect x="0" y="0" width="2" height="2" fill="#00ff44" opacity="0.3" />
              <rect x="2" y="2" width="2" height="2" fill="#00ff44" opacity="0.15" />
            </pattern>
          </defs>

          {/* ── RADIO BODY ── */}
          <rect x={20} y={60} width={620} height={360} rx={18} fill="url(#radiobody)" stroke="#444" strokeWidth={2} />
          <rect x={24} y={64} width={612} height={352} rx={16} fill="none" stroke="#555" strokeWidth={1} opacity={0.4} />

          {/* Top panel ridge */}
          <rect x={20} y={60} width={620} height={12} rx={18} fill="#333" />

          {/* ── BRAND PLATE ── */}
          <rect x={220} y={72} width={200} height={18} rx={4} fill="#1a1000" stroke="#5a3a00" strokeWidth={1} />
          <text x={320} y={85} textAnchor="middle" fontSize={9} fill="#c8860a" fontFamily="monospace" letterSpacing={3}>
            MANOR COMMS
          </text>

          {/* ── ANTENNA ── */}
          <line x1={580} y1={60} x2={600} y2={10} stroke="#555" strokeWidth={3} strokeLinecap="round" />
          <circle cx={600} cy={10} r={4} fill="#333" stroke="#666" strokeWidth={1} />
          <rect x={575} y={56} width={18} height={10} rx={3} fill="#333" />

          {/* ── SPEAKER GRILLE (left half) ── */}
          <rect x={34} y={88} width={200} height={240} rx={10} fill="url(#speakergrad)" stroke="#333" strokeWidth={1} />
          <rect x={38} y={92} width={192} height={232} rx={8} fill="url(#speaker-holes)" />
          {/* Speaker cone rings */}
          <ellipse cx={134} cy={208} rx={70} ry={70} fill="none" stroke="#222" strokeWidth={8} />
          <ellipse cx={134} cy={208} rx={50} ry={50} fill="none" stroke="#1a1a1a" strokeWidth={6} />
          <ellipse cx={134} cy={208} rx={30} ry={30} fill="#111" stroke="#222" strokeWidth={4} />
          <ellipse cx={134} cy={208} rx={12} ry={12} fill="#222" stroke="#333" strokeWidth={2} />
          <circle cx={134} cy={208} r={4} fill="#333" />

          {/* ── FREQ DISPLAY SCREEN ── */}
          <rect x={250} y={88} width={200} height={60} rx={6} fill="#001800" stroke="#003a00" strokeWidth={2} />
          <rect x={254} y={92} width={192} height={52} rx={4} fill="url(#screengrad)" />
          {/* Scanlines */}
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={i} x1={254} y1={92 + i * 6.5} x2={446} y2={92 + i * 6.5} stroke="#000" strokeWidth={0.8} opacity={0.4} />
          ))}
          {/* Frequency readout */}
          {inStatic && !revealed ? (
            <>
              <text x={350} y={132} textAnchor="middle" fontSize={28} fill="#00ff44" fontFamily="monospace" filter="url(#screenglow)"
                style={{ animation: "radio-flicker 0.12s step-start infinite" }}>
                {Array.from({ length: 5 }).map(() => Math.floor(Math.random() * 10)).join("")}
              </text>
              <style>{`@keyframes radio-flicker { 0%{opacity:1} 50%{opacity:0.4} }`}</style>
            </>
          ) : revealed ? (
            <text x={350} y={132} textAnchor="middle" fontSize={28} fill="#00ff44" fontFamily="monospace" filter="url(#screenglow)">
              {revealed}··
            </text>
          ) : (
            <text x={350} y={132} textAnchor="middle" fontSize={28} fill="#00cc44" fontFamily="monospace" filter="url(#screenglow)">
              {freq.toFixed(1)} <tspan fontSize={12}>MHz</tspan>
            </text>
          )}

          {/* ── VU METER ── */}
          <rect x={250} y={162} width={200} height={28} rx={4} fill="#000" stroke="#222" strokeWidth={1} />
          {Array.from({ length: 20 }).map((_, i) => (
            <rect
              key={i}
              x={254 + i * 9.8}
              y={166}
              width={8}
              height={20}
              rx={1}
              fill={inStatic
                ? (i < Math.floor(Math.random() * 20) ? (i > 14 ? "#cc0000" : i > 10 ? "#ffaa00" : "#00cc44") : "#111")
                : (i < 3 ? "#00cc44" : "#111")
              }
              opacity={0.9}
            />
          ))}

          {/* ── KNOBS ROW ── */}
          {/* Knob labels */}
          {["VOL", "SQ", "PWR", "TONE", "BND"].map((lbl, i) => (
            <text key={i} x={260 + i * 50} y={220} textAnchor="middle" fontSize={7} fill="#555" fontFamily="monospace">{lbl}</text>
          ))}
          {/* Knob bodies */}
          {[0, 1, 2, 3, 4].map((i) => {
            const cx = 260 + i * 50;
            const cy = 240;
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r={14} fill="#1a1a1a" stroke="#444" strokeWidth={2} />
                <circle cx={cx} cy={cy} r={10} fill="#222" stroke="#555" strokeWidth={1} />
                {/* Indicator line */}
                <line x1={cx} y1={cy} x2={cx + Math.cos(-0.8 + i * 0.4) * 8} y2={cy + Math.sin(-0.8 + i * 0.4) * 8}
                  stroke="#c8860a" strokeWidth={2} strokeLinecap="round" />
                {/* Grip dots */}
                {Array.from({ length: 8 }).map((_, j) => (
                  <circle key={j}
                    cx={cx + Math.cos((j / 8) * Math.PI * 2) * 11}
                    cy={cy + Math.sin((j / 8) * Math.PI * 2) * 11}
                    r={1} fill="#555" />
                ))}
              </g>
            );
          })}

          {/* ── SWITCH BANK ── */}
          {["AM", "FM", "SW", "WB"].map((band, i) => (
            <g key={i}>
              <rect x={256 + i * 48} y={272} width={36} height={14} rx={3} fill={i === 1 ? "#003300" : "#111"} stroke="#333" strokeWidth={1} />
              <text x={274 + i * 48} y={283} textAnchor="middle" fontSize={7} fill={i === 1 ? "#00cc44" : "#444"} fontFamily="monospace">{band}</text>
            </g>
          ))}

          {/* ── POWER INDICATOR LED ── */}
          <circle cx={474} cy={100} r={8} fill="#003300" stroke="#004400" strokeWidth={1} />
          <circle cx={474} cy={100} r={5} fill="#00cc44" filter="url(#glow)">
            <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* ── EXTRA DIALS (right section of radio) ── */}
          {/* Large tuning dial */}
          <circle cx={545} cy={220} r={65} fill="#181818" stroke="#3a3a3a" strokeWidth={3} />
          <circle cx={545} cy={220} r={58} fill="#141414" stroke="#444" strokeWidth={1} />
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i / 24) * Math.PI * 2;
            const inner = 48, outer = 56;
            return (
              <line key={i}
                x1={545 + Math.cos(angle) * inner}
                y1={220 + Math.sin(angle) * inner}
                x2={545 + Math.cos(angle) * outer}
                y2={220 + Math.sin(angle) * outer}
                stroke={i % 6 === 0 ? "#888" : "#444"}
                strokeWidth={i % 6 === 0 ? 2 : 1}
              />
            );
          })}
          {/* Dial center */}
          <circle cx={545} cy={220} r={18} fill="#222" stroke="#555" strokeWidth={2} />
          <circle cx={545} cy={220} r={6} fill="#333" />
          {/* Pointer */}
          <line x1={545} y1={220}
            x2={545 + Math.cos(-Math.PI / 2 + dialY * Math.PI * 2) * 14}
            y2={220 + Math.sin(-Math.PI / 2 + dialY * Math.PI * 2) * 14}
            stroke="#c8860a" strokeWidth={2.5} strokeLinecap="round" />
          {/* Grip texture */}
          {Array.from({ length: 16 }).map((_, i) => (
            <circle key={i}
              cx={545 + Math.cos((i / 16) * Math.PI * 2) * 60}
              cy={220 + Math.sin((i / 16) * Math.PI * 2) * 60}
              r={2.5} fill="#2a2a2a" stroke="#555" strokeWidth={0.5} />
          ))}
          <text x={545} y={300} textAnchor="middle" fontSize={8} fill="#555" fontFamily="monospace">TUNE</text>

          {/* Serial plate */}
          <rect x={460} y={350} width={170} height={50} rx={3} fill="#0a0a0a" stroke="#1a1a1a" strokeWidth={1} />
          <text x={545} y={366} textAnchor="middle" fontSize={7} fill="#333" fontFamily="monospace">MODEL: RW-7741B</text>
          <text x={545} y={378} textAnchor="middle" fontSize={7} fill="#333" fontFamily="monospace">SN: 195004-██████</text>
          <text x={545} y={390} textAnchor="middle" fontSize={6} fill="#252525" fontFamily="monospace">FOR EMERGENCY USE ONLY</text>

          {/* ── FREQUENCY BAR (right side) ── */}
          {/* Background track */}
          <rect x={BAR_X - 4} y={BAR_Y - 4} width={BAR_W + 8} height={BAR_H + 8} rx={6} fill="#111" stroke="#333" strokeWidth={1} />
          {/* Freq gradient bar */}
          <rect
            ref={barRef}
            x={BAR_X}
            y={BAR_Y}
            width={BAR_W}
            height={BAR_H}
            rx={4}
            fill="url(#freqbar)"
            style={{ cursor: "ns-resize" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
          {/* Tick marks */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <g key={i}>
              <line x1={BAR_X - 8} y1={BAR_Y + t * BAR_H} x2={BAR_X} y2={BAR_Y + t * BAR_H} stroke="#555" strokeWidth={1.5} />
              <text x={BAR_X - 10} y={BAR_Y + t * BAR_H + 4} textAnchor="end" fontSize={7} fill="#555" fontFamily="monospace">
                {["HI", "", "", "", "LO"][i]}
              </text>
            </g>
          ))}
          {/* Static zone indicator (subtle) */}
          <rect x={BAR_X - 2} y={BAR_Y + (staticZone - ZONE_HALF) * BAR_H} width={BAR_W + 4} height={ZONE_HALF * 2 * BAR_H}
            rx={3} fill="none" stroke={inStatic ? "#00ff44" : "rgba(255,255,255,0.08)"} strokeWidth={1.5}
            style={{ transition: "stroke 0.2s" }}
          />

          {/* Dial circle (draggable) */}
          <circle
            cx={BAR_X + BAR_W / 2}
            cy={dialCY}
            r={16}
            fill={inStatic ? "#003300" : "#1a1a1a"}
            stroke={inStatic ? "#00ff44" : "#888"}
            strokeWidth={inStatic ? 2.5 : 2}
            style={{ cursor: "ns-resize", transition: "fill 0.15s, stroke 0.15s" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            filter={inStatic ? "url(#screenglow)" : undefined}
          />
          {/* Dial grip lines */}
          {[-5, 0, 5].map((dy) => (
            <line key={dy} x1={BAR_X + BAR_W / 2 - 7} y1={dialCY + dy} x2={BAR_X + BAR_W / 2 + 7} y2={dialCY + dy}
              stroke={inStatic ? "#00ff44" : "#555"} strokeWidth={1.5} strokeLinecap="round" />
          ))}

          {/* BAR label */}
          <text x={BAR_X + BAR_W / 2} y={BAR_Y + BAR_H + 20} textAnchor="middle" fontSize={7} fill="#444" fontFamily="monospace">FREQ</text>
        </svg>

        {/* Status / instructions */}
        <div className="text-center mt-2 min-h-16">
          {revealed ? (
            <div style={{ animation: "radio-reveal 0.6s ease-out" }}>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#555" }}>Signal Acquired</p>
              <p className="text-3xl font-mono" style={{ color: "#00ff44", textShadow: "0 0 20px #00ff44" }}>
                {revealed}<span style={{ color: "#333" }}>··</span>
              </p>
              <p className="text-xs mt-2" style={{ color: "#666" }}>
                First 3 digits of an unknown killer's ID
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 rounded text-xs font-mono uppercase tracking-widest border"
                style={{ borderColor: "#333", color: "#555", background: "transparent" }}
              >
                Close Scanner
              </button>
            </div>
          ) : inStatic ? (
            <div>
              <p className="text-xs uppercase tracking-widest" style={{ color: "#00cc44", animation: "radio-flicker 0.15s step-start infinite" }}>
                ◆ STATIC DETECTED ◆
              </p>
              <p className="text-2xl font-mono mt-1" style={{ color: "#00ff44" }}>
                {staticSecondsLeft}s
              </p>
              <p className="text-xs" style={{ color: "#444" }}>Hold still…</p>
            </div>
          ) : (
            <div>
              <p className="text-xs" style={{ color: "#555" }}>
                Drag the dial up and down to scan frequencies
              </p>
              {showHint && (
                <p className="text-xs mt-1" style={{ color: "#333", animation: "radio-fadein 1s ease" }}>
                  Hint: Listen for a signal somewhere in the middle range
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes radio-reveal {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes radio-fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
