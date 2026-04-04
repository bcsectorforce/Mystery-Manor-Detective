import React, { useState, useEffect } from "react";

interface IntroScreenProps {
  onStart: () => void;
}

const STORY_LINES = [
  "A cold autumn night. Ravenswood Manor.",
  "Fifteen guests. One deadly secret.",
  "Someone among them is a killer.",
  "They will strike again... if you let them.",
  "You are the detective. Find the killer.",
  "One accusation. No second chances.",
];

const INSTRUCTIONS = [
  { icon: "🚶", text: "Move between 4 rooms using the sidebar. You cannot see what happens in rooms you're not in." },
  { icon: "👁", text: "Watch for suspicious behavior — nervous pacing, evasive glances, unexplained movements." },
  { icon: "🔍", text: "Click on glowing objects to find physical clues." },
  { icon: "👤", text: "Click on people to inspect them, track their alibi, and adjust your suspicion level." },
  { icon: "📝", text: "Use the Notepad to keep your own notes and observations." },
  { icon: "💀", text: "The killer strikes when you're not watching. The body count grows the longer you wait." },
  { icon: "🎯", text: "When ready, press ACCUSE and enter the 5-digit suspect ID. You have ONE try." },
];

export function IntroScreen({ onStart }: IntroScreenProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (lineIndex < STORY_LINES.length - 1) {
      const timer = setTimeout(() => setLineIndex((i) => i + 1), 1800);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShowInstructions(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [lineIndex]);

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col items-center justify-center"
      style={{ fontFamily: "'Special Elite', 'Courier New', serif" }}
    >
      {/* Ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
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
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.9) 100%)"
      }} />

      <div className="relative z-10 max-w-2xl w-full px-8 text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="text-6xl mb-2 animate-heartbeat">🔍</div>
          <h1
            className="text-5xl font-bold text-primary mb-1 animate-flicker"
            style={{ textShadow: "0 0 40px rgba(245,197,24,0.6), 0 0 80px rgba(245,197,24,0.3)" }}
          >
            RAVENSWOOD
          </h1>
          <h2 className="text-xl text-muted-foreground tracking-[0.5em] uppercase">Manor Mystery</h2>
        </div>

        {/* Story text */}
        <div className="mb-8 h-40 flex flex-col justify-center">
          {STORY_LINES.slice(0, lineIndex + 1).map((line, i) => (
            <p
              key={i}
              className="text-lg text-foreground/90 mb-2 animate-fade-in-up"
              style={{
                opacity: i === lineIndex ? 1 : 0.4,
                transform: i === lineIndex ? "scale(1.05)" : "scale(1)",
                transition: "all 0.5s ease",
                textShadow: i === lineIndex ? "0 0 20px rgba(255,255,255,0.3)" : "none",
              }}
            >
              {line}
            </p>
          ))}
        </div>

        {/* Instructions */}
        {showInstructions && (
          <div className="mb-8 text-left animate-fade-in-up">
            <div className="bg-card/60 border border-border rounded-xl p-5">
              <h3 className="text-primary font-bold mb-4 text-center tracking-wider">HOW TO PLAY</h3>
              <div className="space-y-2.5">
                {INSTRUCTIONS.map((inst, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-sm text-muted-foreground animate-fade-in-up"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <span className="text-base flex-shrink-0">{inst.icon}</span>
                    <span>{inst.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-red-400 font-bold">⚠️ WARNING:</span>
                  <span>This game is intentionally difficult. The killer is subtle. Gather all evidence before accusing.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Start button */}
        {showInstructions && (
          <button
            onClick={() => { setStarted(true); onStart(); }}
            disabled={started}
            className="relative px-12 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-xl tracking-wider transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-fade-in-up"
            style={{ boxShadow: "0 0 30px rgba(245,197,24,0.4)" }}
          >
            {started ? "ENTERING MANOR..." : "BEGIN INVESTIGATION"}
            <span className="absolute inset-0 rounded-xl border-2 border-primary animate-ping opacity-20" />
          </button>
        )}

        {/* Difficulty note */}
        {showInstructions && (
          <p className="mt-4 text-xs text-muted-foreground italic animate-fade-in-up">
            The killer's ID changes every game. No two mysteries are the same.
          </p>
        )}
      </div>
    </div>
  );
}
