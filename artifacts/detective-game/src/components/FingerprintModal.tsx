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

  useEffect(() => {
    if (phase !== "zooming") return;
    const steps = [
      setTimeout(() => setZoomStep(1), 600),
      setTimeout(() => setZoomStep(2), 1400),
      setTimeout(() => setZoomStep(3), 2100),
      setTimeout(() => setPhase("tracing"), 2700),
    ];
    return () => steps.forEach(clearTimeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "revealed") return;
    const killerId = killerIds[Math.floor(Math.random() * killerIds.length)];
    const fakes = Array.from({ length: 4 }, generateFakeId);
    const ids = [...fakes, killerId].sort(() => Math.random() - 0.5);
    setDisplayIds(ids);
    setRevealedCount(0);
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setRevealedCount(count);
      if (count >= ids.length) clearInterval(interval);
    }, 350);
    return () => clearInterval(interval);
  }, [phase, killerIds]);

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
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    return w > 50 && h > 50;
  }, []);

  const getSVGCoords = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 300 / rect.width;
    const scaleY = 300 / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (phase !== "tracing" || traceSuccess) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getSVGCoords(e);
    setTracePoints([pt]);
    setIsTracing(true);
    setTraceFailed(false);
  }, [phase, traceSuccess]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isTracing || phase !== "tracing") return;
    const pt = getSVGCoords(e);
    setTracePoints((prev) => [...prev, pt]);
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
      style={{ background: "rgba(0,0,0,0.97)", fontFamily: "'Special Elite','Courier New',serif" }}
    >
      {phase === "zooming" && (
        <div className="flex flex-col items-center gap-6 select-none">
          <ZoomScene step={zoomStep} />
          <div className="text-center space-y-2">
            <p
              className="text-red-400 text-sm tracking-widest font-bold"
              style={{ opacity: zoomStep >= 1 ? 1 : 0, transition: "opacity 0.5s" }}
            >
              EXAMINING BODY...
            </p>
            <p
              className="text-yellow-300 text-sm tracking-widest font-bold"
              style={{ opacity: zoomStep >= 2 ? 1 : 0, transition: "opacity 0.5s" }}
            >
              FINGERPRINT DETECTED
            </p>
            <p
              className="text-white text-xs tracking-widest"
              style={{ opacity: zoomStep >= 3 ? 1 : 0, transition: "opacity 0.5s" }}
            >
              SCANNING...
            </p>
          </div>
        </div>
      )}

      {phase === "tracing" && (
        <div className="flex flex-col items-center gap-4 select-none">
          <p className="text-yellow-300 text-xs tracking-widest font-bold uppercase">
            {traceSuccess
              ? "✓ Fingerprint Captured!"
              : traceFailed
              ? "✗ Too imprecise — try again"
              : "Trace around the fingerprint to scan it"}
          </p>
          <div
            style={{
              border: traceSuccess
                ? "2px solid #2ecc71"
                : traceFailed
                ? "2px solid #e74c3c"
                : "2px solid rgba(245,197,24,0.4)",
              borderRadius: 12,
              boxShadow: traceSuccess
                ? "0 0 30px rgba(46,204,113,0.6)"
                : traceFailed
                ? "0 0 30px rgba(231,76,60,0.5)"
                : "0 0 20px rgba(245,197,24,0.15)",
              transition: "all 0.3s",
              touchAction: "none",
            }}
          >
            <svg
              ref={svgRef}
              width={300}
              height={300}
              viewBox="0 0 300 300"
              style={{
                cursor: "crosshair",
                background: "rgba(10,5,5,0.95)",
                borderRadius: 10,
                display: "block",
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <FingerprintGraphic success={traceSuccess} failed={traceFailed} />
              {tracePath && (
                <path
                  d={tracePath}
                  fill="none"
                  stroke={traceSuccess ? "#2ecc71" : traceFailed ? "#e74c3c" : "rgba(245,197,24,0.7)"}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.85}
                />
              )}
              {traceSuccess && (
                <>
                  <rect x={0} y={0} width={300} height={300} rx={10} fill="rgba(46,204,113,0.08)" />
                  <text x={150} y={285} textAnchor="middle" fontSize={11} fill="#2ecc71" fontFamily="monospace">
                    ✓ CAPTURED
                  </text>
                </>
              )}
            </svg>
          </div>
          <p className="text-muted-foreground text-xs italic opacity-60">
            Draw a loop around the print
          </p>
        </div>
      )}

      {phase === "revealed" && (
        <div className="flex flex-col items-center gap-6 max-w-xs w-full px-4">
          <div className="text-center">
            <p className="text-yellow-400 text-xs tracking-widest uppercase font-bold mb-1">
              Fingerprint Analysis Complete
            </p>
            <p className="text-muted-foreground text-xs">
              One of these IDs belongs to a killer
            </p>
          </div>
          <div className="w-full space-y-2">
            {displayIds.map((id, i) => (
              <div
                key={id}
                className="w-full px-4 py-2.5 rounded border font-mono text-center text-lg tracking-widest font-bold transition-all"
                style={{
                  opacity: i < revealedCount ? 1 : 0,
                  transform: i < revealedCount ? "translateY(0)" : "translateY(8px)",
                  transition: "opacity 0.3s, transform 0.3s",
                  background: "rgba(30,10,10,0.9)",
                  border: "1px solid rgba(245,197,24,0.35)",
                  color: "#f5c518",
                  boxShadow: "0 0 8px rgba(245,197,24,0.1)",
                }}
              >
                #{id}
              </div>
            ))}
          </div>
          {revealedCount >= displayIds.length && (
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2 rounded border border-red-700 text-red-300 text-xs tracking-widest hover:bg-red-900/30 transition-all"
            >
              CLOSE
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ZoomScene({ step }: { step: number }) {
  const scales = [1, 3.5, 10, 28];
  const scale = scales[Math.min(step, 3)];

  return (
    <div style={{ width: 220, height: 220, position: "relative", overflow: "hidden", borderRadius: 12, border: "1px solid rgba(245,197,24,0.2)" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94)",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          background: "radial-gradient(ellipse at center, rgba(30,10,10,1) 0%, rgba(0,0,0,1) 100%)",
        }}
      >
        <svg width={180} height={180} viewBox="0 0 180 180">
          {/* Crime scene silhouette - fallen body */}
          <ellipse cx={90} cy={105} rx={55} ry={22} fill="#4a0000" opacity={0.8} />
          <ellipse cx={90} cy={90} rx={28} ry={15} fill="#3a0000" opacity={0.9} />
          <circle cx={90} cy={68} r={14} fill="#2a0000" opacity={0.9} />
          {/* X eyes */}
          <line x1={84} y1={63} x2={88} y2={67} stroke="rgba(255,100,100,0.5)" strokeWidth={1.5} />
          <line x1={88} y1={63} x2={84} y2={67} stroke="rgba(255,100,100,0.5)" strokeWidth={1.5} />
          <line x1={92} y1={63} x2={96} y2={67} stroke="rgba(255,100,100,0.5)" strokeWidth={1.5} />
          <line x1={96} y1={63} x2={92} y2={67} stroke="rgba(255,100,100,0.5)" strokeWidth={1.5} />
          {/* Finger / hand detail appearing at step 2+ */}
          {step >= 2 && (
            <g opacity={step >= 3 ? 1 : 0.5} style={{ transition: "opacity 0.4s" }}>
              <ellipse cx={90} cy={115} rx={12} ry={7} fill="#5a2a1a" opacity={0.9} />
              <ellipse cx={90} cy={115} rx={8} ry={5} fill="#7a3a22" opacity={0.8} />
            </g>
          )}
        </svg>
      </div>
      {/* Scan line overlay */}
      {step >= 1 && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(transparent 48%, rgba(245,197,24,0.08) 50%, transparent 52%)",
          animation: "scan-line 1s linear infinite",
          pointerEvents: "none",
        }} />
      )}
    </div>
  );
}

function FingerprintGraphic({ success, failed }: { success: boolean; failed: boolean }) {
  const cx = FP_CX;
  const cy = FP_CY;
  const baseColor = success ? "#2ecc71" : failed ? "#e74c3c" : "#f5c518";
  const ridgeOpacity = success ? 0.9 : 0.65;

  const ridges = [
    { rx: 12, ry: 8 },
    { rx: 20, ry: 14 },
    { rx: 29, ry: 21 },
    { rx: 38, ry: 29 },
    { rx: 47, ry: 37 },
    { rx: 56, ry: 45 },
    { rx: 65, ry: 53 },
    { rx: 74, ry: 61 },
    { rx: 82, ry: 68 },
    { rx: 89, ry: 75 },
    { rx: 96, ry: 81 },
    { rx: 102, ry: 86 },
  ];

  return (
    <g>
      {/* Dark background */}
      <rect x={0} y={0} width={300} height={300} fill="rgba(8,4,4,0.95)" />

      {/* Outer glow */}
      <ellipse cx={cx} cy={cy} rx={110} ry={95} fill="none" stroke={baseColor} strokeWidth={1} opacity={0.12} />

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
          strokeWidth={i === 0 ? 1.8 : 1.2}
          opacity={ridgeOpacity - i * 0.02}
          strokeDasharray={
            i % 3 === 0 ? undefined : i % 3 === 1 ? `${r.rx * 0.4} ${r.rx * 0.08}` : undefined
          }
        />
      ))}

      {/* Center whorl detail */}
      <ellipse cx={cx} cy={cy} rx={6} ry={4} fill={baseColor} opacity={0.8} />
      <ellipse cx={cx} cy={cy} rx={3} ry={2} fill={baseColor} opacity={1} />

      {/* Corner markers */}
      {[
        [40, 30], [260, 30], [40, 270], [260, 270],
      ].map(([x, y], i) => (
        <g key={i}>
          <line x1={x - 8} y1={y} x2={x + 8} y2={y} stroke={baseColor} strokeWidth={1} opacity={0.4} />
          <line x1={x} y1={y - 8} x2={x} y2={y + 8} stroke={baseColor} strokeWidth={1} opacity={0.4} />
        </g>
      ))}

      {/* Label */}
      <text x={cx} y={270} textAnchor="middle" fontSize={9} fill={baseColor} fontFamily="monospace" opacity={0.7}>
        FINGERPRINT SCAN ACTIVE
      </text>

      {/* Pulsing ring when not yet traced */}
      {!success && !failed && (
        <ellipse cx={cx} cy={cy} rx={75} ry={63} fill="none" stroke={baseColor} strokeWidth={1} opacity={0.25}>
          <animate attributeName="rx" values="75;82;75" dur="2s" repeatCount="indefinite" />
          <animate attributeName="ry" values="63;69;63" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.25;0.08;0.25" dur="2s" repeatCount="indefinite" />
        </ellipse>
      )}
    </g>
  );
}
