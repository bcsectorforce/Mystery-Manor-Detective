import React, { useState } from "react";
import type { Person, ClueEntry } from "../game/types";

interface AccusationScreenProps {
  persons: Person[];
  suspicionMeter: Record<string, number>;
  accusationInput: string;
  onInputChange: (v: string) => void;
  onAccuse: () => void;
  onCancel: () => void;
  clues: ClueEntry[];
}

export function AccusationScreen({
  persons,
  suspicionMeter,
  accusationInput,
  onInputChange,
  onAccuse,
  onCancel,
  clues,
}: AccusationScreenProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [shake, setShake] = useState(false);

  const aliveSuspects = persons.filter((p) => p.state !== "dead");
  const sortedBySupicion = [...aliveSuspects].sort(
    (a, b) => (suspicionMeter[b.id] ?? 0) - (suspicionMeter[a.id] ?? 0)
  );
  const criticalClues = clues.filter((c) => c.severity === "critical");
  const highClues = clues.filter((c) => c.severity === "high");

  const targetId = accusationInput.trim();
  const targetPerson = persons.find((p) => p.id === targetId);

  const handleAccuse = () => {
    if (!targetPerson) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    onAccuse();
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
      style={{ fontFamily: "'Special Elite', 'Courier New', serif" }}
    >
      <div className="w-full max-w-5xl h-full flex flex-col gap-4 overflow-hidden">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary animate-flicker" style={{ textShadow: "0 0 30px rgba(245,197,24,0.5)" }}>
            MAKE YOUR ACCUSATION
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            You only get one chance. Choose wisely.
          </p>
        </div>

        <div className="flex gap-4 flex-1 overflow-hidden">
          {/* Left: Evidence summary */}
          <div className="w-72 flex flex-col gap-3 overflow-hidden">
            <div className="bg-card/60 border border-border rounded-lg p-3 flex flex-col gap-2">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider">Critical Evidence</h3>
              {criticalClues.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No critical evidence found</p>
              ) : (
                <div className="space-y-1 overflow-y-auto max-h-32">
                  {criticalClues.map((c) => (
                    <div key={c.id} className="text-xs text-red-300 border-l-2 border-red-500 pl-2">{c.text}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-card/60 border border-border rounded-lg p-3 flex flex-col gap-2 flex-1 overflow-hidden">
              <h3 className="text-xs text-muted-foreground uppercase tracking-wider">Strong Leads</h3>
              {highClues.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No strong leads yet</p>
              ) : (
                <div className="space-y-1 overflow-y-auto">
                  {highClues.slice(0, 8).map((c) => (
                    <div key={c.id} className="text-xs text-orange-300 border-l-2 border-orange-500 pl-2">{c.text}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center: Input + suspect list */}
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* Target preview */}
            <div className={`bg-card/60 border rounded-lg p-4 transition-all ${
              targetPerson ? "border-primary" : "border-border"
            }`}>
              {targetPerson ? (
                <div className="flex items-center gap-4">
                  <svg width={48} height={48} viewBox="-24 -24 48 48">
                    <circle r={20} fill={targetPerson.color} stroke={targetPerson.secondaryColor} strokeWidth={2} />
                    <circle r={10} fill={targetPerson.secondaryColor} opacity={0.5} />
                    <circle cx={-6} cy={-5} r={4} fill="white" />
                    <circle cx={6} cy={-5} r={4} fill="white" />
                    <circle cx={-6} cy={-5} r={2} fill="#333" />
                    <circle cx={6} cy={-5} r={2} fill="#333" />
                  </svg>
                  <div>
                    <h3 className="font-bold text-xl text-foreground">{targetPerson.name}</h3>
                    <p className="text-sm text-muted-foreground">ID: #{targetPerson.id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{targetPerson.personality}</p>
                    <p className="text-xs text-muted-foreground">{targetPerson.alibi[0]}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-2">
                  Enter a 5-digit suspect ID to preview your accusation
                </div>
              )}
            </div>

            {/* Input */}
            <div className={`flex gap-2 ${shake ? "animate-shake" : ""}`}>
              <div className="relative flex-1">
                <input
                  type="text"
                  maxLength={5}
                  placeholder="Enter 5-digit suspect ID..."
                  value={accusationInput}
                  onChange={(e) => {
                    onInputChange(e.target.value.replace(/[^0-9]/g, ""));
                    setConfirmed(false);
                  }}
                  className="w-full bg-secondary border-2 border-border rounded-lg px-4 py-3 text-xl font-mono text-primary text-center outline-none focus:border-primary transition-all"
                  style={{ letterSpacing: "0.5em" }}
                  autoFocus
                />
              </div>
              <button
                onClick={handleAccuse}
                disabled={accusationInput.length !== 5}
                className={`px-6 py-3 rounded-lg font-bold text-sm transition-all ${
                  confirmed
                    ? "bg-red-600 hover:bg-red-500 text-white border-2 border-red-400 animate-pulse-danger"
                    : targetPerson
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-primary"
                    : "bg-secondary text-muted-foreground border-2 border-border cursor-not-allowed"
                }`}
              >
                {confirmed ? "⚠️ CONFIRM ACCUSE" : "🎯 ACCUSE"}
              </button>
            </div>

            {confirmed && targetPerson && (
              <div className="bg-red-950/40 border border-red-700 rounded-lg p-3 text-sm text-red-300 text-center animate-fade-in-up">
                You are about to accuse <strong>{targetPerson.name}</strong>. This is your only chance. Are you sure?
              </div>
            )}

            {/* Suspects list */}
            <div className="flex-1 overflow-y-auto">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                All Suspects (by your suspicion level)
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {sortedBySupicion.map((p) => {
                  const s = suspicionMeter[p.id] ?? 0;
                  const isTarget = accusationInput === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { onInputChange(p.id); setConfirmed(false); }}
                      className={`w-full flex items-center gap-3 p-2 rounded border text-left transition-all ${
                        isTarget
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40 hover:bg-white/3"
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: p.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{p.name}</span>
                          <span className="text-xs font-mono text-muted-foreground">#{p.id}</span>
                        </div>
                        <div className="w-full h-1 bg-secondary rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${s}%`,
                              background: s > 70 ? "#ef4444" : s > 40 ? "#f59e0b" : "#22c55e",
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{Math.round(s)}%</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Cancel */}
        <div className="text-center">
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground text-sm border border-border hover:border-primary/50 px-6 py-2 rounded-lg transition-all"
          >
            ← Back to Investigation
          </button>
        </div>
      </div>
    </div>
  );
}
