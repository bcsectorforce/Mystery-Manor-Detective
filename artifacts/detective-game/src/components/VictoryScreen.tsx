import React, { useEffect, useState } from "react";
import type { Person, KillEvent, ClueEntry, ConfettiPiece } from "../game/types";
import { formatTime } from "../game/logic";
import { ROOMS } from "../game/types";

interface VictoryScreenProps {
  killers: Person[];
  killHistory: KillEvent[];
  clues: ClueEntry[];
  timeElapsed: number;
  confettiPieces: ConfettiPiece[];
  onRestart: () => void;
}

const CELEBRATION_MESSAGES = [
  "Outstanding detective work!",
  "The killers have been unmasked!",
  "Justice has been served!",
  "A brilliant deduction!",
  "The mansion is safe once more!",
];

function KillerCard({ killer, index, total }: { killer: Person; index: number; total: number }) {
  return (
    <div className="flex items-center gap-6 justify-center">
      <div className="relative">
        <svg width={90} height={90} viewBox="-45 -45 90 90">
          <circle r={38} fill="rgba(139,0,0,0.15)">
            <animate attributeName="r" values="34;40;34" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle r={36} fill={killer.color} stroke="#8b0000" strokeWidth={3} />
          <circle r={18} fill={killer.secondaryColor} opacity={0.5} />
          <circle cx={-9} cy={-8} r={5} fill="white" />
          <circle cx={9} cy={-8} r={5} fill="white" />
          <circle cx={-9} cy={-8} r={2.5} fill="#1a0000" />
          <circle cx={9} cy={-8} r={2.5} fill="#1a0000" />
          <path d="M -10 8 Q 0 15 10 8" fill="none" stroke="white" strokeWidth={1.5} />
          <line x1={-10} y1={8} x2={-7} y2={11} stroke="white" strokeWidth={1} />
          <line x1={10} y1={8} x2={7} y2={11} stroke="white" strokeWidth={1} />
        </svg>
        <div className="absolute -bottom-1 -right-1 text-2xl">🩸</div>
      </div>
      <div className="text-left">
        {total > 1 && (
          <p className="text-xs text-primary/60 uppercase tracking-widest mb-1">
            Killer {index + 1} of {total}
          </p>
        )}
        <h3 className="text-3xl font-bold text-foreground">{killer.name}</h3>
        <p className="text-muted-foreground text-sm mt-1">ID: #{killer.id}</p>
        <p className="text-muted-foreground text-sm">{killer.personality}</p>
      </div>
    </div>
  );
}

function KillerReveal({ killers, onDone }: { killers: Person[]; onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    setPhase("in");
    const t1 = setTimeout(() => setPhase("hold"), 600);
    const t2 = setTimeout(() => setPhase("out"), 3600);
    const t3 = setTimeout(() => {
      if (idx < killers.length - 1) {
        setIdx((i) => i + 1);
      } else {
        onDone();
      }
    }, 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [idx]);

  const opacity = phase === "in" ? 0 : phase === "hold" ? 1 : 0;
  const translateY = phase === "in" ? 24 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: "radial-gradient(ellipse at center, #1a0a00 0%, #000 100%)",
        fontFamily: "'Special Elite','Courier New',serif",
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}
      >
        <p
          className="text-center text-sm uppercase tracking-widest mb-8"
          style={{ color: "#8b0000" }}
        >
          {killers.length > 1 ? "The Killers Were" : "The Killer Was"}
        </p>

        <div className="bg-black/60 border-2 border-red-900 rounded-xl px-10 py-8">
          <KillerCard killer={killers[idx]} index={idx} total={killers.length} />
        </div>

        {killers.length > 1 && (
          <div className="flex gap-2 justify-center mt-6">
            {killers.map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  background: i === idx ? "#8b0000" : "#3a0000",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function VictoryScreen({ killers, killHistory, clues, timeElapsed, confettiPieces, onRestart }: VictoryScreenProps) {
  const [showReveal, setShowReveal] = useState(true);
  const [step, setStep] = useState(0);
  const [rotations, setRotations] = useState<number[]>([]);

  const killer = killers[0];
  const msg = CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];
  const totalCluesAboutKillers = clues.filter((c) => killers.some((k) => k.id === c.suspectId)).length;
  const criticalClues = clues.filter((c) => c.severity === "critical" && killers.some((k) => k.id === c.suspectId));
  const minutes = Math.floor(timeElapsed / 60 / 60);
  const seconds = Math.floor((timeElapsed / 60) % 60);

  useEffect(() => {
    setRotations(confettiPieces.map(() => Math.random() * 360 - 180));
  }, []);

  useEffect(() => {
    if (!showReveal) {
      const timer = setInterval(() => setStep((s) => Math.min(s + 1, 5)), 600);
      return () => clearInterval(timer);
    }
  }, [showReveal]);

  if (showReveal) {
    return <KillerReveal killers={killers} onDone={() => setShowReveal(false)} />;
  }

  return (
    <div
      className="min-h-screen bg-black relative"
      style={{ fontFamily: "'Special Elite', 'Courier New', serif" }}
    >
      {/* Confetti + glow — absolute behind content */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confettiPieces.map((piece, i) => (
          <div
            key={piece.id}
            className="absolute animate-confetti pointer-events-none"
            style={{
              left: `${piece.x}%`,
              top: `-${piece.size}px`,
              width: piece.size,
              height: piece.size,
              background: piece.color,
              borderRadius: i % 3 === 0 ? "50%" : i % 3 === 1 ? "2px" : "0",
              animationDuration: `${piece.duration}s`,
              animationDelay: `${piece.delay}s`,
              transform: `rotate(${rotations[i] || 0}deg)`,
            }}
          />
        ))}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at center, rgba(245,197,24,0.15) 0%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 max-w-2xl w-full px-8 text-center mx-auto py-12">
        <div
          className="text-8xl mb-4"
          style={{
            animation: "heartbeat 1s ease-in-out infinite",
            filter: "drop-shadow(0 0 30px rgba(245,197,24,0.8))",
          }}
        >
          🏆
        </div>

        {step >= 1 && (
          <h1
            className="text-5xl font-bold text-primary mb-2 animate-fade-in-up"
            style={{ textShadow: "0 0 40px rgba(245,197,24,0.8)" }}
          >
            CASE SOLVED!
          </h1>
        )}

        {step >= 2 && (
          <p className="text-xl text-foreground/80 mb-6 animate-fade-in-up">{msg}</p>
        )}

        {step >= 3 && (
          <div className="bg-card/80 border-2 border-primary rounded-xl p-6 mb-6 animate-fade-in-up">
            <h2 className="text-lg text-muted-foreground mb-4 uppercase tracking-widest">
              {killers.length > 1 ? `${killers.length} Killers Caught` : "The Killer Was"}
            </h2>
            <div className="space-y-4">
              {killers.map((k, i) => (
                <div key={k.id} className={`flex items-center gap-4 justify-center ${i > 0 ? "pt-4 border-t border-border" : ""}`}>
                  <svg width={60} height={60} viewBox="-30 -30 60 60">
                    <circle r={26} fill={k.color} stroke={k.secondaryColor} strokeWidth={2} />
                    <circle r={13} fill={k.secondaryColor} opacity={0.5} />
                    <circle cx={-7} cy={-6} r={4} fill="white" />
                    <circle cx={7} cy={-6} r={4} fill="white" />
                    <circle cx={-7} cy={-6} r={2} fill="#1a0000" />
                    <circle cx={7} cy={-6} r={2} fill="#1a0000" />
                    <path d="M -8 6 Q 0 12 8 6" fill="none" stroke="white" strokeWidth={1.5} />
                  </svg>
                  <div className="text-left">
                    <p className="text-xl font-bold text-foreground">{k.name}</p>
                    <p className="text-xs text-muted-foreground">ID: #{k.id} · {k.personality}</p>
                  </div>
                  <div className="ml-2 text-xl">🩸</div>
                </div>
              ))}
            </div>

            {killHistory.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border text-left">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Crimes committed:</p>
                <div className="space-y-1">
                  {killHistory.map((k, i) => (
                    <div key={i} className="text-xs text-red-400/80">
                      • Murdered victim by {k.method} in the {ROOMS.find((r) => r.id === k.room)?.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step >= 4 && (
          <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-in-up">
            <StatCard icon="⏱" label="Time Taken" value={`${minutes}m ${seconds}s`} />
            <StatCard icon="🗂" label="Evidence Found" value={`${totalCluesAboutKillers} clues`} />
            <StatCard icon="🎯" label="Accuracy" value={criticalClues.length > 0 ? "Excellent" : "Good"} />
          </div>
        )}

        {step >= 5 && (
          <button
            onClick={onRestart}
            className="px-10 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-lg transition-all hover:scale-105 animate-fade-in-up"
            style={{ boxShadow: "0 0 20px rgba(245,197,24,0.4)" }}
          >
            Play Again
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-card/60 border border-border rounded-lg p-3 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}
