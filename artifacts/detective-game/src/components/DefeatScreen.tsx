import React, { useEffect, useState } from "react";
import type { Person } from "../game/types";

interface DefeatScreenProps {
  killer: Person;
  accusedId: string;
  persons: Person[];
  onRestart: () => void;
}

const TAUNT_MESSAGES = [
  "You accused the wrong person. The real killer slipped away.",
  "A grievous error. The killer watches you fail.",
  "Wrong. Dead wrong. Pun intended.",
  "The manor grows quiet. The killer has fled. Justice denied.",
  "You were close... but not close enough.",
];

export function DefeatScreen({ killer, accusedId, persons, onRestart }: DefeatScreenProps) {
  const [step, setStep] = useState(0);
  const accusedPerson = persons.find((p) => p.id === accusedId);
  const msg = TAUNT_MESSAGES[Math.floor(Math.random() * TAUNT_MESSAGES.length)];

  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, 5)), 700);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{
        fontFamily: "'Special Elite', 'Courier New', serif",
        background: "radial-gradient(ellipse at center, #1a0000 0%, #000000 100%)",
      }}
    >
      {/* Dramatic red rain / blood effect */}
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

      {/* Dark vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)"
      }} />

      {/* Diagonal red lines */}
      <div className="absolute inset-0 pointer-events-none opacity-10" style={{
        backgroundImage: "repeating-linear-gradient(45deg, #8b0000 0, #8b0000 1px, transparent 0, transparent 50%)",
        backgroundSize: "20px 20px",
      }} />

      <div className="relative z-10 max-w-2xl w-full px-8 text-center">
        {/* Broken magnifying glass */}
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
          <p className="text-xl text-red-300/80 mb-6 animate-fade-in-up italic">
            "{msg}"
          </p>
        )}

        {step >= 3 && (
          <div className="bg-black/60 border-2 border-red-900 rounded-xl p-6 mb-6 animate-fade-in-up">
            {/* Wrong accusation */}
            {accusedPerson && (
              <div className="mb-4 pb-4 border-b border-red-900">
                <h3 className="text-muted-foreground text-sm uppercase tracking-wider mb-3">You Accused</h3>
                <div className="flex items-center gap-4 justify-center">
                  <div className="relative">
                    <svg width={56} height={56} viewBox="-28 -28 56 56">
                      <circle r={24} fill={accusedPerson.color} stroke={accusedPerson.secondaryColor} strokeWidth={2} opacity={0.5} />
                      <text x={0} y={6} textAnchor="middle" fontSize={20}>😰</text>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold text-foreground/80">{accusedPerson.name}</div>
                    <div className="text-sm text-green-400">Was INNOCENT</div>
                    <div className="text-xs text-muted-foreground">{accusedPerson.alibi[0]}</div>
                  </div>
                </div>
              </div>
            )}

            {/* The real killer reveal */}
            <h3 className="text-red-400 text-sm uppercase tracking-wider mb-3">The Real Killer</h3>
            <div className="flex items-center gap-4 justify-center">
              <div className="relative">
                <svg width={70} height={70} viewBox="-35 -35 70 70">
                  {/* Dark aura */}
                  <circle r={33} fill="rgba(139,0,0,0.2)">
                    <animate attributeName="r" values="30;36;30" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                  <circle r={28} fill={killer.color} stroke="#8b0000" strokeWidth={3} />
                  <circle r={14} fill={killer.secondaryColor} opacity={0.5} />
                  {/* Sinister eyes */}
                  <circle cx={-8} cy={-7} r={4} fill="white" />
                  <circle cx={8} cy={-7} r={4} fill="white" />
                  <circle cx={-8} cy={-7} r={2} fill="#1a0000" />
                  <circle cx={8} cy={-7} r={2} fill="#1a0000" />
                  {/* Red pupils */}
                  <circle cx={-8} cy={-7} r={1} fill="#8b0000" />
                  <circle cx={8} cy={-7} r={1} fill="#8b0000" />
                  {/* Evil grin */}
                  <path d="M -10 8 Q 0 16 10 8" fill="none" stroke="#8b0000" strokeWidth={2} />
                  <line x1={-10} y1={8} x2={-7} y2={12} stroke="#8b0000" strokeWidth={1.5} />
                  <line x1={10} y1={8} x2={7} y2={12} stroke="#8b0000" strokeWidth={1.5} />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-red-300">{killer.name}</div>
                <div className="text-sm font-mono text-red-500">ID: #{killer.id}</div>
                <div className="text-xs text-muted-foreground mt-1">{killer.personality}</div>
                <div className="text-sm text-red-400 mt-1">
                  Escaped justice
                </div>
              </div>
            </div>
          </div>
        )}

        {step >= 4 && (
          <div className="mb-6 animate-fade-in-up">
            <div className="bg-black/40 border border-red-900/50 rounded-lg p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {killer.name} had been hiding in plain sight. Their subtle nervousness, their carefully constructed alibi, their habit of {killer.activity === "looking_around" ? "constantly scanning the room" : "deflecting questions"} — all signs that you missed.
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
