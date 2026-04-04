import React, { useState, useEffect } from "react";

interface IntroScreenProps {
  onStart: () => void;
}

const STORY_LINES = [
  "A cold autumn night. Ravenswood Manor.",
  "Fifteen guests. One deadly secret.",
  "Someone among them is a killer.",
  "They will strike again... if you let them.",
];

const INSTRUCTIONS = [
  { icon: "🚶", text: "Move between 4 rooms using the sidebar. You can't see what happens in other rooms." },
  { icon: "👁", text: "Watch for suspicious behavior — nervous pacing, evasive glances, odd movements." },
  { icon: "🔍", text: "Click on glowing objects to find physical clues hidden in each room." },
  { icon: "👤", text: "Click on people to inspect them, track alibis, and set your suspicion level." },
  { icon: "💀", text: "The killer strikes when you leave. Every room you skip costs lives." },
  { icon: "🎯", text: "When ready, press ACCUSE and enter the 5-digit suspect ID. ONE try only." },
];

export function IntroScreen({ onStart }: IntroScreenProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (lineIndex < STORY_LINES.length - 1) {
      const timer = setTimeout(() => setLineIndex((i) => i + 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShowInstructions(true), 700);
      return () => clearTimeout(timer);
    }
  }, [lineIndex]);

  const handleStart = () => {
    setStarted(true);
    onStart();
  };

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-y-auto"
      style={{ fontFamily: "'Special Elite', 'Courier New', serif" }}
    >
      {/* Ambient particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-yellow-500 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `blink ${2 + Math.random() * 4}s ease-in-out ${Math.random() * 5}s infinite`,
              opacity: Math.random() * 0.5 + 0.1,
            }}
          />
        ))}
      </div>

      {/* Vignette */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.9) 100%)"
      }} />

      <div className="relative z-10 w-full max-w-xl px-6 py-8 text-center flex flex-col items-center gap-4">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1">
          <div className="text-5xl animate-heartbeat" style={{ filter: "drop-shadow(0 0 16px rgba(245,197,24,0.6))" }}>🔍</div>
          <h1
            className="text-4xl font-bold text-primary animate-flicker"
            style={{ textShadow: "0 0 30px rgba(245,197,24,0.6)" }}
          >
            RAVENSWOOD
          </h1>
          <h2 className="text-sm text-muted-foreground tracking-[0.4em] uppercase">Manor Mystery</h2>
        </div>

        {/* Story text */}
        <div className="flex flex-col items-center gap-1 min-h-[90px] justify-center">
          {STORY_LINES.slice(0, lineIndex + 1).map((line, i) => (
            <p
              key={i}
              className="text-sm text-foreground/90 animate-fade-in-up"
              style={{
                opacity: i === lineIndex ? 1 : 0.45,
                transition: "all 0.4s ease",
              }}
            >
              {line}
            </p>
          ))}
        </div>

        {/* Instructions */}
        {showInstructions && (
          <div className="w-full animate-fade-in-up bg-card/60 border border-border rounded-xl p-4">
            <h3 className="text-primary font-bold mb-3 text-center tracking-wider text-sm">HOW TO PLAY</h3>
            <div className="space-y-2">
              {INSTRUCTIONS.map((inst, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs text-muted-foreground text-left animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <span className="flex-shrink-0">{inst.icon}</span>
                  <span>{inst.text}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-start gap-2 text-xs">
                <span className="text-red-400 font-bold flex-shrink-0">⚠️</span>
                <span className="text-muted-foreground">Hard by design. Gather all evidence before accusing. The killer is subtle.</span>
              </div>
            </div>
          </div>
        )}

        {/* Start button */}
        {showInstructions && (
          <button
            onClick={handleStart}
            disabled={started}
            className="relative w-full px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-base tracking-wider transition-all duration-300 hover:scale-105 animate-fade-in-up"
            style={{ boxShadow: "0 0 24px rgba(245,197,24,0.4)" }}
          >
            {started ? "ENTERING MANOR..." : "BEGIN INVESTIGATION"}
          </button>
        )}

        {/* Skip option — always visible */}
        {!showInstructions && (
          <button
            onClick={() => setShowInstructions(true)}
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground underline underline-offset-2 transition-colors"
          >
            Skip intro
          </button>
        )}

        {showInstructions && (
          <p className="text-xs text-muted-foreground/50 italic animate-fade-in-up">
            The killer's ID changes every game. No two mysteries are the same.
          </p>
        )}
      </div>
    </div>
  );
}
