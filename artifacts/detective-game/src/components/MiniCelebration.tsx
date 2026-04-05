import React, { useEffect, useState } from "react";

interface MiniCelebrationProps {
  killerName: string;
  onDone: () => void;
}

export function MiniCelebration({ killerName, onDone }: MiniCelebrationProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 600);
    const t3 = setTimeout(() => setStep(3), 1400);
    const t4 = setTimeout(() => onDone(), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[800] flex items-center justify-center pointer-events-none"
      style={{ background: "rgba(0,0,0,0.55)" }}
    >
      {/* Mini confetti burst — fewer pieces, gold/green */}
      {step >= 1 && Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-sm"
          style={{
            left: `${40 + Math.random() * 20}%`,
            top: `${30 + Math.random() * 20}%`,
            width: `${6 + Math.random() * 8}px`,
            height: `${6 + Math.random() * 8}px`,
            background: ["#f5c518", "#22c55e", "#3b82f6", "#ffffff", "#fbbf24"][i % 5],
            transform: `rotate(${Math.random() * 360}deg)`,
            animation: `mini-confetti-fall ${1.2 + Math.random() * 1}s ease-out ${Math.random() * 0.3}s forwards`,
            opacity: 1,
          }}
        />
      ))}

      {/* Card */}
      {step >= 1 && (
        <div
          className="relative z-10 text-center px-10 py-8 rounded-2xl border-2 animate-fade-in-up"
          style={{
            background: "linear-gradient(135deg, rgba(20,40,10,0.97) 0%, rgba(10,30,10,0.97) 100%)",
            borderColor: "#22c55e",
            boxShadow: "0 0 60px rgba(34,197,94,0.5), 0 0 20px rgba(34,197,94,0.3)",
            fontFamily: "'Special Elite', 'Courier New', serif",
            maxWidth: 420,
          }}
        >
          <div
            className="text-5xl mb-3"
            style={{ filter: "drop-shadow(0 0 12px rgba(34,197,94,0.8))", animation: "heartbeat 0.6s ease-in-out 3" }}
          >
            🎯
          </div>

          {step >= 2 && (
            <div className="animate-fade-in-up">
              <p
                className="text-green-400 font-bold tracking-widest mb-1"
                style={{ fontSize: "clamp(18px, 3vw, 28px)", textShadow: "0 0 20px rgba(34,197,94,0.8)" }}
              >
                FIRST KILLER DOWN
              </p>
              <p className="text-green-300/80 text-sm mt-1">
                <span className="font-bold text-green-200">{killerName}</span> has been caught
              </p>
            </div>
          )}

          {step >= 3 && (
            <div className="mt-4 animate-fade-in-up">
              <div
                className="px-4 py-2 rounded-lg border border-red-700/60 text-red-300 text-sm"
                style={{ background: "rgba(80,0,0,0.4)", animation: "pulse-danger 1.2s infinite" }}
              >
                ☠ One killer still lurks in the mansion…
              </div>
              <p className="text-muted-foreground text-xs mt-2 italic">Returning to investigation…</p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes mini-confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(180px) rotate(540deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
