import React, { useEffect, useState } from "react";
import type { Person, KillEvent, ClueEntry, ConfettiPiece } from "../game/types";
import { formatTime } from "../game/logic";
import { ROOMS } from "../game/types";

interface VictoryScreenProps {
  killer: Person;
  killHistory: KillEvent[];
  clues: ClueEntry[];
  timeElapsed: number;
  confettiPieces: ConfettiPiece[];
  onRestart: () => void;
}

const CELEBRATION_MESSAGES = [
  "Outstanding detective work!",
  "The killer has been unmasked!",
  "Justice has been served!",
  "A brilliant deduction!",
  "The manor is safe once more!",
];

export function VictoryScreen({ killer, killHistory, clues, timeElapsed, confettiPieces, onRestart }: VictoryScreenProps) {
  const [step, setStep] = useState(0);
  const [rotations, setRotations] = useState<number[]>([]);

  const msg = CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];
  const criticalClues = clues.filter((c) => c.severity === "critical" && c.suspectId === killer.id);
  const highClues = clues.filter((c) => c.severity === "high" && c.suspectId === killer.id);
  const totalCluesAboutKiller = clues.filter((c) => c.suspectId === killer.id).length;
  const minutes = Math.floor(timeElapsed / 60 / 60);
  const seconds = Math.floor(timeElapsed / 60 % 60);

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, 5)), 600);
    setRotations(confettiPieces.map(() => Math.random() * 360 - 180));
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden"
      style={{ fontFamily: "'Special Elite', 'Courier New', serif" }}
    >
      {/* Confetti */}
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

      {/* Radiant glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(245,197,24,0.15) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-2xl w-full px-8 text-center">
        {/* Trophy */}
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
          <p className="text-xl text-foreground/80 mb-6 animate-fade-in-up">
            {msg}
          </p>
        )}

        {step >= 3 && (
          <div className="bg-card/80 border-2 border-primary rounded-xl p-6 mb-6 animate-fade-in-up">
            <h2 className="text-lg text-muted-foreground mb-4 uppercase tracking-widest">The Killer Was</h2>
            <div className="flex items-center gap-6 justify-center">
              <div className="relative">
                <svg width={80} height={80} viewBox="-40 -40 80 80">
                  <circle r={35} fill={killer.color} stroke={killer.secondaryColor} strokeWidth={3} />
                  <circle r={17} fill={killer.secondaryColor} opacity={0.5} />
                  <circle cx={-9} cy={-8} r={5} fill="white" />
                  <circle cx={9} cy={-8} r={5} fill="white" />
                  <circle cx={-9} cy={-8} r={2.5} fill="#1a0000" />
                  <circle cx={9} cy={-8} r={2.5} fill="#1a0000" />
                  {/* Villain smile */}
                  <path d="M -10 8 Q 0 15 10 8" fill="none" stroke="white" strokeWidth={1.5} />
                  <line x1={-10} y1={8} x2={-7} y2={11} stroke="white" strokeWidth={1} />
                  <line x1={10} y1={8} x2={7} y2={11} stroke="white" strokeWidth={1} />
                </svg>
                <div className="absolute -bottom-1 -right-1 text-2xl">🩸</div>
              </div>
              <div className="text-left">
                <h3 className="text-3xl font-bold text-foreground">{killer.name}</h3>
                <p className="text-muted-foreground text-sm mt-1">ID: #{killer.id}</p>
                <p className="text-muted-foreground text-sm">{killer.personality}</p>
                <p className="text-red-400 text-sm mt-2 font-bold">
                  Responsible for {killHistory.length} murder{killHistory.length !== 1 ? "s" : ""}
                </p>
              </div>
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
            <StatCard icon="🗂" label="Evidence Found" value={`${totalCluesAboutKiller} clues`} />
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
