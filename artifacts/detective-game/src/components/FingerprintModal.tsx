import React, { useState, useRef, useCallback, useEffect } from "react";

interface FingerprintModalProps {
  killerIds: string[];
  onClose: () => void;
}

type Phase = "zooming" | "tracing" | "revealed";

function generateFakeId(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

const FP_CX = 150;
const FP_CY = 150;

export function FingerprintModal({ killerIds, onClose }: FingerprintModalProps) {
  const [phase, setPhase] = useState<Phase>("zooming");
  const [zoomStep, setZoomStep] = useState(0);
  const [displayIds, setDisplayIds] = useState<string[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [tracePoints, setTracePoints] = useState<Array<{ x: number; y: number }>>([]);
  const [isTracing, setIsTracing] = useState(false);
  const [traceFailed, setTraceFailed] = useState(false);
  const [traceSuccess, setTraceSuccess] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  // Guard: only generate IDs once even if killerIds reference changes each frame
  const idsGeneratedRef = useRef(false);
  // Capture killerIds at mount so game-loop re-renders don't affect us
  const killerIdsRef = useRef(killerIds);

  useEffect(() => {
    if (phase !== "zooming") return;
    const steps = [
      setTimeout(() => setZoomStep(1), 400),
      setTimeout(() => setZoomStep(2), 1100),
      setTimeout(() => setZoomStep(3), 1900),
      setTimeout(() => setZoomStep(4), 2600),
      setTimeout(() => setPhase("tracing"), 3400),
    ];
    return () => steps.forEach(clearTimeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "revealed" || idsGeneratedRef.current) return;
    idsGeneratedRef.current = true;

    const ids = killerIdsRef.current;
    const killerId = ids.length > 0 ? ids[Math.floor(Math.random() * ids.length)] : generateFakeId();
    const fakes = Array.from({ length: 4 }, generateFakeId);
    const finalIds = [...fakes, killerId].sort(() => Math.random() - 0.5);
    setDisplayIds(finalIds);
    setRevealedCount(0);

    let count = 0;
    const interval = setInterval(() => {
      count++;
      setRevealedCount(count);
      if (count >= finalIds.length) clearInterval(interval);
    }, 420);
    return () => clearInterval(interval);
  }, [phase]);

  const checkOval = useCallback((pts: Array<{ x: number; y: number }>) => {
    if (pts.length < 25) return false;
    const cx = FP_CX;
    const cy = FP_CY;
    const q = [false, false, false, false];
    for (const p of pts) {
      if (p.x < cx && p.y < cy) q[0] = true;
      if (p.x > cx && p.y < cy) q[1] = true;
      if (p.x < cx && p.y > cy) q[2] = true;
      if (p.x > cx && p.y > cy) q[3] = true;
    }
    if (!q.every(Boolean)) return false;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return Math.max(...xs) - Math.min(...xs) > 50 && Math.max(...ys) - Math.min(...ys) > 50;
  }, []);

  const getSVGCoords = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (300 / rect.width),
      y: (e.clientY - rect.top) * (300 / rect.height),
    };
  };

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (phase !== "tracing" || traceSuccess) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setTracePoints([getSVGCoords(e)]);
    setIsTracing(true);
    setTraceFailed(false);
  }, [phase, traceSuccess]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isTracing || phase !== "tracing") return;
    setTracePoints((prev) => [...prev, getSVGCoords(e)]);
  }, [isTracing, phase]);

  const handlePointerUp = useCallback(() => {
    if (!isTracing) return;
    setIsTracing(false);
    if (checkOval(tracePoints)) {
      setTraceSuccess(true);
      setTimeout(() => setPhase("revealed"), 900);
    } else {
      setTraceFailed(true);
      setTimeout(() => { setTraceFailed(false); setTracePoints([]); }, 1200);
    }
  }, [isTracing, tracePoints, checkOval]);

  const tracePath =
    tracePoints.length > 1
      ? `M ${tracePoints[0].x} ${tracePoints[0].y} ` +
        tracePoints.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ")
      : "";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: "#000", fontFamily: "'Special Elite','Courier New',serif" }}
    >
      {/* CRT scanlines overlay */}
      <div
        style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10,
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 4px)",
        }}
      />

      {phase === "zooming" && <ZoomScene step={zoomStep} />}

      {phase === "tracing" && (
        <div className="flex flex-col items-center gap-4 select-none" style={{ zIndex: 5 }}>
          <div className="text-center mb-1">
            <p
              className="text-xs tracking-widest font-bold uppercase"
              style={{
                color: traceSuccess ? "#2ecc71" : traceFailed ? "#e74c3c" : "#f5c518",
                transition: "color 0.3s",
              }}
            >
              {traceSuccess ? "✓ Fingerprint Captured!" : traceFailed ? "✗ Too imprecise — try again" : "Trace around the fingerprint to scan it"}
            </p>
            {!traceSuccess && !traceFailed && (
              <p className="text-xs text-muted-foreground/50 mt-1 italic">Draw a closed loop around the print</p>
            )}
          </div>
          <div
            style={{
              border: traceSuccess ? "2px solid #2ecc71" : traceFailed ? "2px solid #e74c3c" : "2px solid rgba(245,197,24,0.35)",
              borderRadius: 12,
              boxShadow: traceSuccess ? "0 0 40px rgba(46,204,113,0.5), 0 0 80px rgba(46,204,113,0.15)" : traceFailed ? "0 0 30px rgba(231,76,60,0.5)" : "0 0 25px rgba(245,197,24,0.1)",
              transition: "all 0.3s",
              touchAction: "none",
            }}
          >
            <svg
              ref={svgRef}
              width={300}
              height={300}
              viewBox="0 0 300 300"
              style={{ cursor: "crosshair", background: "rgba(6,3,3,1)", borderRadius: 10, display: "block" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <FingerprintGraphic success={traceSuccess} failed={traceFailed} />
              {tracePath && (
                <path
                  d={tracePath}
                  fill="none"
                  stroke={traceSuccess ? "#2ecc71" : traceFailed ? "#e74c3c" : "rgba(245,197,24,0.8)"}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.9}
                />
              )}
              {traceSuccess && (
                <>
                  <rect x={0} y={0} width={300} height={300} rx={10} fill="rgba(46,204,113,0.06)" />
                  <text x={150} y={285} textAnchor="middle" fontSize={10} fill="#2ecc71" fontFamily="monospace" letterSpacing={3}>CAPTURED</text>
                </>
              )}
            </svg>
          </div>
        </div>
      )}

      {phase === "revealed" && (
        <div className="flex flex-col items-center gap-5 w-full max-w-sm px-6" style={{ zIndex: 5 }}>
          {/* Header */}
          <div className="text-center space-y-1">
            <p style={{ color: "#f5c518", fontSize: 11, letterSpacing: "0.3em", fontFamily: "monospace" }}>
              ◈ FORENSIC DATABASE MATCH ◈
            </p>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "bold", letterSpacing: "0.15em" }}>
              FINGERPRINT ANALYSIS COMPLETE
            </p>
            <p style={{ color: "rgba(255,100,100,0.8)", fontSize: 10, letterSpacing: "0.2em", fontFamily: "monospace" }}>
              ONE ID BELONGS TO THE KILLER
            </p>
          </div>

          {/* ID cards */}
          <div className="w-full space-y-2">
            {displayIds.map((id, i) => (
              <div
                key={`fp-id-${i}`}
                style={{
                  opacity: i < revealedCount ? 1 : 0,
                  transform: i < revealedCount ? "translateX(0)" : "translateX(-16px)",
                  transition: "opacity 0.35s ease, transform 0.35s ease",
                  background: "linear-gradient(90deg, rgba(40,10,10,0.95) 0%, rgba(20,5,5,0.95) 100%)",
                  border: "1px solid rgba(245,197,24,0.3)",
                  borderLeft: "3px solid rgba(245,197,24,0.7)",
                  borderRadius: 6,
                  padding: "10px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: i < revealedCount ? "0 0 12px rgba(245,197,24,0.08), inset 0 0 20px rgba(245,197,24,0.03)" : "none",
                }}
              >
                <span style={{ color: "rgba(180,140,100,0.6)", fontSize: 9, fontFamily: "monospace", letterSpacing: "0.1em" }}>
                  SUBJECT #{i + 1}
                </span>
                <span style={{ color: "#f5c518", fontSize: 20, fontFamily: "monospace", fontWeight: "bold", letterSpacing: "0.2em" }}>
                  {id}
                </span>
                <span style={{ color: "rgba(180,140,100,0.4)", fontSize: 8, fontFamily: "monospace" }}>
                  {i < revealedCount ? "✓" : ""}
                </span>
              </div>
            ))}
          </div>

          {revealedCount >= displayIds.length && displayIds.length > 0 && (
            <button
              onClick={onClose}
              style={{
                marginTop: 4,
                padding: "8px 28px",
                border: "1px solid rgba(180,50,50,0.6)",
                borderRadius: 4,
                background: "rgba(80,10,10,0.4)",
                color: "rgba(255,120,120,0.9)",
                fontSize: 11,
                letterSpacing: "0.25em",
                cursor: "pointer",
                fontFamily: "monospace",
              }}
            >
              CLOSE FILE
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Zoom animation ─────────────────────────────────────────── */

const ZOOM_STEPS = [
  { label: "FORENSIC SCAN INITIATED", color: "#f5c518" },
  { label: "LOCATING VICTIM...", color: "#e74c3c" },
  { label: "ANALYZING CONTACT SURFACE", color: "#f5c518" },
  { label: "FINGERPRINT ISOLATED", color: "#2ecc71" },
  { label: "EXTRACTING RIDGE DATA...", color: "#2ecc71" },
];

function ZoomScene({ step }: { step: number }) {
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>

      {/* Background grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(245,197,24,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(245,197,24,0.04) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        opacity: step >= 1 ? 1 : 0, transition: "opacity 0.8s",
      }} />

      {/* Central zoom content */}
      <ZoomContent step={step} />

      {/* HUD overlays */}
      <HUDOverlay step={step} />
    </div>
  );
}

function ZoomContent({ step }: { step: number }) {
  const scales = [1, 2.5, 7, 20, 50];
  const scale = scales[Math.min(step, 4)];
  const origins = ["50% 60%", "50% 60%", "50% 72%", "50% 78%", "50% 80%"];
  const origin = origins[Math.min(step, 4)];

  return (
    <div style={{
      position: "relative",
      width: 340,
      height: 340,
      borderRadius: step < 2 ? 12 : 0,
      overflow: "hidden",
      border: step < 2 ? "1px solid rgba(245,197,24,0.2)" : "none",
      transition: "border-radius 0.6s, border 0.6s",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${scale})`,
        transformOrigin: origin,
        transition: "transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94)",
        background: "radial-gradient(ellipse at 50% 65%, #1a0800 0%, #000 100%)",
      }}>
        <svg width={280} height={280} viewBox="0 0 280 280">
          {/* Crime scene: chalk outline */}
          <ellipse cx={140} cy={175} rx={70} ry={28} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeDasharray="4 3" />
          <ellipse cx={140} cy={148} rx={38} ry={20} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} strokeDasharray="4 3" />
          <circle cx={140} cy={115} r={20} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} strokeDasharray="4 3" />

          {/* Fallen body fill */}
          <ellipse cx={140} cy={175} rx={65} ry={25} fill="#2a0000" opacity={0.85} />
          <ellipse cx={140} cy={148} rx={34} ry={17} fill="#200000" opacity={0.9} />
          <circle cx={140} cy={115} r={18} fill="#1a0000" opacity={0.9} />

          {/* X eyes */}
          <line x1={133} y1={109} x2={138} y2={114} stroke="rgba(255,100,100,0.55)" strokeWidth={1.5} />
          <line x1={138} y1={109} x2={133} y2={114} stroke="rgba(255,100,100,0.55)" strokeWidth={1.5} />
          <line x1={142} y1={109} x2={147} y2={114} stroke="rgba(255,100,100,0.55)" strokeWidth={1.5} />
          <line x1={147} y1={109} x2={142} y2={114} stroke="rgba(255,100,100,0.55)" strokeWidth={1.5} />

          {/* Blood pool */}
          <ellipse cx={148} cy={183} rx={30} ry={10} fill="#6b0000" opacity={step >= 1 ? 0.7 : 0} style={{ transition: "opacity 0.6s" }} />

          {/* Hand / finger visible at step 2+ */}
          <g opacity={step >= 2 ? 1 : 0} style={{ transition: "opacity 0.5s" }}>
            <ellipse cx={140} cy={198} rx={14} ry={8} fill="#5a2515" />
            <ellipse cx={140} cy={196} rx={10} ry={6} fill="#7a3320" />
            {/* Finger tip */}
            <ellipse cx={140} cy={205} rx={7} ry={5} fill="#8a3a22" />
            <ellipse cx={140} cy={205} rx={4} ry={3} fill="#9a4028" />
          </g>

          {/* Fingerprint ridges visible at step 3+ */}
          {step >= 3 && (
            <g style={{ opacity: step >= 4 ? 1 : 0.5, transition: "opacity 0.5s" }}>
              {[3, 5, 7, 9, 11].map((r, i) => (
                <ellipse key={i} cx={140} cy={205} rx={r * 1.4} ry={r} fill="none"
                  stroke={step >= 4 ? "#2ecc71" : "#f5c518"}
                  strokeWidth={0.8}
                  opacity={0.7 - i * 0.06}
                />
              ))}
            </g>
          )}
        </svg>
      </div>

      {/* Moving scan beam */}
      {step >= 1 && (
        <div style={{
          position: "absolute", left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, transparent, ${step >= 3 ? "rgba(46,204,113,0.8)" : "rgba(245,197,24,0.8)"}, transparent)`,
          animation: "scan-line 1.2s linear infinite",
          boxShadow: `0 0 8px ${step >= 3 ? "rgba(46,204,113,0.6)" : "rgba(245,197,24,0.6)"}`,
          pointerEvents: "none",
          zIndex: 5,
        }} />
      )}

      {/* Flash on fingerprint detection */}
      {step >= 3 && (
        <div style={{
          position: "absolute", inset: 0,
          background: step === 3 ? "rgba(46,204,113,0.25)" : "rgba(46,204,113,0.06)",
          transition: "background 0.4s",
          pointerEvents: "none",
          zIndex: 4,
        }} />
      )}
    </div>
  );
}

function HUDOverlay({ step }: { step: number }) {
  const label = ZOOM_STEPS[Math.min(step, ZOOM_STEPS.length - 1)];

  return (
    <>
      {/* Top left corner bracket */}
      <div style={{ position: "absolute", top: 20, left: 20, pointerEvents: "none" }}>
        <div style={{ width: 40, height: 40, borderTop: "2px solid rgba(245,197,24,0.5)", borderLeft: "2px solid rgba(245,197,24,0.5)", opacity: step >= 1 ? 1 : 0, transition: "opacity 0.5s" }} />
      </div>
      {/* Top right */}
      <div style={{ position: "absolute", top: 20, right: 20, pointerEvents: "none" }}>
        <div style={{ width: 40, height: 40, borderTop: "2px solid rgba(245,197,24,0.5)", borderRight: "2px solid rgba(245,197,24,0.5)", opacity: step >= 1 ? 1 : 0, transition: "opacity 0.5s" }} />
      </div>
      {/* Bottom left */}
      <div style={{ position: "absolute", bottom: 20, left: 20, pointerEvents: "none" }}>
        <div style={{ width: 40, height: 40, borderBottom: "2px solid rgba(245,197,24,0.5)", borderLeft: "2px solid rgba(245,197,24,0.5)", opacity: step >= 1 ? 1 : 0, transition: "opacity 0.5s" }} />
      </div>
      {/* Bottom right */}
      <div style={{ position: "absolute", bottom: 20, right: 20, pointerEvents: "none" }}>
        <div style={{ width: 40, height: 40, borderBottom: "2px solid rgba(245,197,24,0.5)", borderRight: "2px solid rgba(245,197,24,0.5)", opacity: step >= 1 ? 1 : 0, transition: "opacity 0.5s" }} />
      </div>

      {/* Status text — bottom center */}
      <div style={{
        position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)",
        textAlign: "center", pointerEvents: "none",
        opacity: step >= 1 ? 1 : 0, transition: "opacity 0.5s",
      }}>
        <p style={{ color: label.color, fontSize: 12, letterSpacing: "0.3em", fontFamily: "monospace", fontWeight: "bold", textShadow: `0 0 10px ${label.color}` }}>
          {label.label}
        </p>
        <p style={{ color: "rgba(245,197,24,0.35)", fontSize: 9, letterSpacing: "0.2em", fontFamily: "monospace", marginTop: 4 }}>
          FORENSIC ANALYSIS SYSTEM v3.1
        </p>
      </div>

      {/* Zoom level indicator — top center */}
      {step >= 1 && (
        <div style={{
          position: "absolute", top: 28, left: "50%", transform: "translateX(-50%)",
          textAlign: "center", pointerEvents: "none",
        }}>
          <p style={{ color: "rgba(245,197,24,0.5)", fontSize: 9, letterSpacing: "0.25em", fontFamily: "monospace" }}>
            ZOOM ×{[1, 12, 40, 120, 320][Math.min(step, 4)]}
          </p>
        </div>
      )}

      {/* Simulated data readout — right side */}
      {step >= 2 && (
        <div style={{
          position: "absolute", right: 70, top: "50%", transform: "translateY(-50%)",
          opacity: step >= 2 ? 1 : 0, transition: "opacity 0.6s",
          pointerEvents: "none",
        }}>
          {["RIDGE COUNT: --", "PATTERN: WHORL", "DELTA: SINGLE", "QUALITY: HIGH"].map((line, i) => (
            <p key={i} style={{ color: "rgba(245,197,24,0.35)", fontSize: 8, letterSpacing: "0.1em", fontFamily: "monospace", marginBottom: 4 }}>
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Green confirm box at step 3+ */}
      {step >= 3 && (
        <div style={{
          position: "absolute", left: 70, top: "50%", transform: "translateY(-50%)",
          border: "1px solid rgba(46,204,113,0.4)",
          padding: "6px 12px",
          borderRadius: 4,
          background: "rgba(46,204,113,0.05)",
          pointerEvents: "none",
        }}>
          <p style={{ color: "#2ecc71", fontSize: 8, letterSpacing: "0.15em", fontFamily: "monospace" }}>MATCH FOUND</p>
          <p style={{ color: "rgba(46,204,113,0.6)", fontSize: 7, letterSpacing: "0.1em", fontFamily: "monospace", marginTop: 2 }}>PROCESSING...</p>
        </div>
      )}
    </>
  );
}

/* ─── Fingerprint graphic ────────────────────────────────────── */

function FingerprintGraphic({ success, failed }: { success: boolean; failed: boolean }) {
  const cx = FP_CX;
  const cy = FP_CY;
  const baseColor = success ? "#2ecc71" : failed ? "#e74c3c" : "#f5c518";

  const ridges = [
    { rx: 11, ry: 7 },
    { rx: 19, ry: 13 },
    { rx: 28, ry: 20 },
    { rx: 37, ry: 28 },
    { rx: 46, ry: 36 },
    { rx: 55, ry: 44 },
    { rx: 64, ry: 52 },
    { rx: 73, ry: 60 },
    { rx: 81, ry: 67 },
    { rx: 88, ry: 74 },
    { rx: 95, ry: 80 },
    { rx: 101, ry: 85 },
  ];

  return (
    <g>
      <rect x={0} y={0} width={300} height={300} fill="rgba(5,2,2,1)" />

      {/* Dim grid */}
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 40} x2={300} y2={i * 40} stroke="rgba(245,197,24,0.04)" strokeWidth={1} />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 40} y1={0} x2={i * 40} y2={300} stroke="rgba(245,197,24,0.04)" strokeWidth={1} />
      ))}

      {/* Outer glow halo */}
      <ellipse cx={cx} cy={cy} rx={112} ry={97} fill="none" stroke={baseColor} strokeWidth={0.5} opacity={0.1} />

      {/* Fingerprint ridges */}
      {ridges.map((r, i) => (
        <ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx={r.rx}
          ry={r.ry}
          fill="none"
          stroke={baseColor}
          strokeWidth={i === 0 ? 2 : 1.3}
          opacity={0.75 - i * 0.025}
          strokeDasharray={i % 4 === 1 ? `${r.rx * 0.35} ${r.rx * 0.07}` : i % 4 === 3 ? `${r.rx * 0.2} ${r.rx * 0.05}` : undefined}
        />
      ))}

      {/* Center whorl */}
      <ellipse cx={cx} cy={cy} rx={7} ry={4.5} fill={baseColor} opacity={0.85} />
      <ellipse cx={cx} cy={cy} rx={3.5} ry={2.2} fill={baseColor} opacity={1} />

      {/* Corner targeting brackets */}
      {([[28, 20], [272, 20], [28, 280], [272, 280]] as [number, number][]).map(([x, y], i) => (
        <g key={i}>
          <line x1={x - 10} y1={y} x2={x + 10} y2={y} stroke={baseColor} strokeWidth={1.2} opacity={0.45} />
          <line x1={x} y1={y - 10} x2={x} y2={y + 10} stroke={baseColor} strokeWidth={1.2} opacity={0.45} />
        </g>
      ))}

      {/* Bottom label */}
      <text x={cx} y={276} textAnchor="middle" fontSize={8} fill={baseColor} fontFamily="monospace" opacity={0.6} letterSpacing={3}>
        SCAN ACTIVE
      </text>

      {/* Pulsing guide ring */}
      {!success && !failed && (
        <ellipse cx={cx} cy={cy} rx={75} ry={63} fill="none" stroke={baseColor} strokeWidth={1} opacity={0.2}>
          <animate attributeName="rx" values="75;83;75" dur="2s" repeatCount="indefinite" />
          <animate attributeName="ry" values="63;70;63" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.2;0.06;0.2" dur="2s" repeatCount="indefinite" />
        </ellipse>
      )}
    </g>
  );
}
