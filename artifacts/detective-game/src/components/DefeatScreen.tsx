import React, { useEffect, useState } from "react";
import type { Person } from "../game/types";

interface DefeatScreenProps {
  killers: Person[];
  accusedId: string;
  persons: Person[];
  onRestart: () => void;
}

const TAUNT_MESSAGES = [
  "You accused the wrong person. The real killers slipped away.",
  "A grievous error. The killers watch you fail.",
  "Wrong. Dead wrong. Pun intended.",
  "The manor grows quiet. The killers have fled. Justice denied.",
  "You were close... but not close enough.",
];

function KillerCard({ killer, index, total }: { killer: Person; index: number; total: number }) {
  return (
    <div className="flex items-center gap-4 justify-center">
      <div className="relative">
        <svg width={80} height={80} viewBox="-40 -40 80 80">
          <circle r={36} fill="rgba(139,0,0,0.2)">
            <animate attributeName="r" values="32;38;32" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle r={32} fill={killer.color} stroke="#8b0000" strokeWidth={3} />
          <circle r={16} fill={killer.secondaryColor} opacity={0.5} />
          <circle cx={-8} cy={-7} r={4} fill="white" />
          <circle cx={8} cy={-7} r={4} fill="white" />
          <circle cx={-8} cy={-7} r={2} fill="#1a0000" />
          <circle cx={8} cy={-7} r={2} fill="#1a0000" />
          <circle cx={-8} cy={-7} r={1} fill="#8b0000" />
          <circle cx={8} cy={-7} r={1} fill="#8b0000" />
          <path d="M -10 8 Q 0 16 10 8" fill="none" stroke="#8b0000" strokeWidth={2} />
          <line x1={-10} y1={8} x2={-7} y2={12} stroke="#8b0000" strokeWidth={1.5} />
          <line x1={10} y1={8} x2={7} y2={12} stroke="#8b0000" strokeWidth={1.5} />
        </svg>
      </div>
      <div className="text-left">
        {total > 1 && (
          <p className="text-xs text-red-500/60 uppercase tracking-widest mb-1">
            Killer {index + 1} of {total}
          </p>
        )}
        <div className="text-2xl font-bold text-red-300">{killer.name}</div>
        <div className="text-sm font-mono text-red-500">ID: #{killer.id}</div>
        <div className="text-xs text-muted-foreground mt-1">{killer.personality}</div>
        <div className="text-sm text-red-400 mt-1">Escaped justice</div>
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
        background: "radial-gradient(ellipse at center, #1a0000 0%, #000 100%)",
        fontFamily: "'Special Elite','Courier New',serif",
      }}
    >
      {/* Blood rain backdrop */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 bg-red-900/50 rounded-full"
            style={{
              left: `${(i / 14) * 100 + (i % 3) * 2}%`,
              top: 0,
              height: `${20 + (i % 4) * 20}px`,
              animation: `blood-drip ${1 + (i % 3) * 0.4}s ease-out ${(i % 5) * 0.6}s infinite`,
            }}
          />
        ))}
      </div>

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
          {killers.length > 1 ? "The Real Killers" : "The Real Killer"}
        </p>

        <div className="bg-black/70 border-2 border-red-900 rounded-xl px-10 py-8">
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

export function DefeatScreen({ killers, accusedId, persons, onRestart }: DefeatScreenProps) {
  const [showReveal, setShowReveal] = useState(true);
  const [step, setStep] = useState(0);

  const accusedPerson = persons.find((p) => p.id === accusedId);
  const msg = TAUNT_MESSAGES[Math.floor(Math.random() * TAUNT_MESSAGES.length)];

  useEffect(() => {
    if (!showReveal) {
      const timer = setInterval(() => setStep((s) => Math.min(s + 1, 5)), 700);
      return () => clearInterval(timer);
    }
  }, [showReveal]);

  if (showReveal) {
    return <KillerReveal killers={killers} onDone={() => setShowReveal(false)} />;
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{
        fontFamily: "'Special Elite', 'Courier New', serif",
        background: "radial-gradient(ellipse at center, #1a0000 0%, #000000 100%)",
      }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 bg-red-900/60 rounded-full"
            style={{
              left: `${(i / 20) * 100 + Math.random() * 5}%`,
              top: 0,
              height: `${20 + Math.random() * 60}px`,
              animation: `blood-drip ${1 + Math.random()}s ease-out ${Math.random() * 3}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)"
      }} />

      <div className="absolute inset-0 pointer-events-none opacity-10" style={{
        backgroundImage: "repeating-linear-gradient(45deg, #8b0000 0, #8b0000 1px, transparent 0, transparent 50%)",
        backgroundSize: "20px 20px",
      }} />

      <div className="relative z-10 max-w-2xl w-full px-8 text-center">
        <div
          className="text-7xl mb-4 animate-scream"
          style={{ filter: "drop-shadow(0 0 20px rgba(180,0,0,0.8))" }}
        >
          💀
        </div>

        {step >= 1 && (
          <h1
            className="text-5xl font-bold text-red-500 mb-2 animate-fade-in-up animate-glitch"
            style={{ textShadow: "0 0 30px rgba(180,0,0,0.8), 2px 2px #8b0000" }}
          >
            CASE FAILED
          </h1>
        )}

        {step >= 2 && (
          <p className="text-xl text-red-300/80 mb-6 animate-fade-in-up italic">"{msg}"</p>
        )}

        {step >= 3 && (
          <div className="bg-black/60 border-2 border-red-900 rounded-xl p-6 mb-6 animate-fade-in-up">
            {accusedPerson && (
              <div className="mb-4 pb-4 border-b border-red-900">
                <h3 className="text-muted-foreground text-sm uppercase tracking-wider mb-3">You Accused</h3>
                <div className="flex items-center gap-4 justify-center">
                  <svg width={56} height={56} viewBox="-28 -28 56 56">
                    <circle r={24} fill={accusedPerson.color} stroke={accusedPerson.secondaryColor} strokeWidth={2} opacity={0.5} />
                    <text x={0} y={6} textAnchor="middle" fontSize={20}>😰</text>
                  </svg>
                  <div className="text-left">
                    <div className="text-xl font-bold text-foreground/80">{accusedPerson.name}</div>
                    <div className="text-sm text-green-400">Was INNOCENT</div>
                    <div className="text-xs text-muted-foreground">{accusedPerson.alibi?.[0]}</div>
                  </div>
                </div>
              </div>
            )}

            <h3 className="text-red-400 text-sm uppercase tracking-wider mb-4">
              {killers.length > 1 ? "The Real Killers" : "The Real Killer"}
            </h3>
            <div className="space-y-4">
              {killers.map((killer, i) => (
                <div key={killer.id} className={i > 0 ? "pt-4 border-t border-red-900/40" : ""}>
                  <div className="flex items-center gap-4 justify-center">
                    <svg width={60} height={60} viewBox="-30 -30 60 60">
                      <circle r={26} fill="rgba(139,0,0,0.15)">
                        <animate attributeName="r" values="22;28;22" dur="1.8s" repeatCount="indefinite" />
                      </circle>
                      <circle r={24} fill={killer.color} stroke="#8b0000" strokeWidth={2} />
                      <circle r={12} fill={killer.secondaryColor} opacity={0.5} />
                      <circle cx={-6} cy={-5} r={3} fill="white" />
                      <circle cx={6} cy={-5} r={3} fill="white" />
                      <circle cx={-6} cy={-5} r={1.5} fill="#1a0000" />
                      <circle cx={6} cy={-5} r={1.5} fill="#1a0000" />
                      <path d="M -7 6 Q 0 12 7 6" fill="none" stroke="#8b0000" strokeWidth={1.5} />
                    </svg>
                    <div className="text-left">
                      <div className="text-xl font-bold text-red-300">{killer.name}</div>
                      <div className="text-sm font-mono text-red-500">ID: #{killer.id}</div>
                      <div className="text-xs text-muted-foreground">{killer.personality}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step >= 4 && (
          <div className="mb-6 animate-fade-in-up">
            <div className="bg-black/40 border border-red-900/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {killers[0].name} had been hiding in plain sight. Their subtle nervousness, their carefully constructed alibi — all signs that you missed.
              </p>
              <p className="text-xs text-red-400/70 mt-2 italic">
                "Every clue tells a story. The killer's story ends when you listen to all of them."
              </p>
            </div>
          </div>
        )}

        {step >= 5 && (
          <button
            onClick={onRestart}
            className="px-10 py-3 bg-red-900 hover:bg-red-800 text-red-100 border border-red-700 rounded-xl font-bold text-lg transition-all hover:scale-105 animate-fade-in-up"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
