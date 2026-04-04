import React from "react";
import type { Person, ClueEntry } from "../game/types";

interface PersonPanelProps {
  person: Person;
  suspicion: number;
  clues: ClueEntry[];
  onAdjustSuspicion: (delta: number) => void;
  onClose: () => void;
}

const MOOD_LABELS: Record<string, string> = {
  normal: "Calm",
  nervous: "Nervous",
  happy: "Cheerful",
  scared: "Frightened",
  suspicious: "Evasive",
};

const MOOD_COLORS: Record<string, string> = {
  normal: "#6b7280",
  nervous: "#f59e0b",
  happy: "#22c55e",
  scared: "#ef4444",
  suspicious: "#a855f7",
};

const ACTIVITY_ICONS: Record<string, string> = {
  reading: "📖",
  cooking: "🍳",
  dancing: "💃",
  gardening: "🌱",
  talking: "💬",
  sleeping: "😴",
  looking_around: "👀",
  pacing: "🚶",
  whispering: "🤫",
  cleaning: "🧹",
  eating: "🍽",
  examining: "🔍",
  hiding: "🪑",
  idle: "⋯",
};

export function PersonPanel({ person, suspicion, clues, onAdjustSuspicion, onClose }: PersonPanelProps) {
  const isDead = person.state === "dead";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Person avatar */}
            <div className="relative">
              <svg width={44} height={44} viewBox="-22 -22 44 44">
                {isDead ? (
                  <>
                    <ellipse cx={0} cy={2} rx={18} ry={10} fill={person.color} opacity={0.4} />
                    <text x={0} y={6} textAnchor="middle" fontSize={16}>💀</text>
                  </>
                ) : (
                  <>
                    <circle r={18} fill={person.color} stroke={person.secondaryColor} strokeWidth={2} />
                    <circle r={9} fill={person.secondaryColor} opacity={0.5} />
                    {/* Eyes */}
                    <circle cx={-5} cy={-4} r={3} fill="white" />
                    <circle cx={5} cy={-4} r={3} fill="white" />
                    <circle cx={-5} cy={-4} r={1.5} fill="#333" />
                    <circle cx={5} cy={-4} r={1.5} fill="#333" />
                    {/* Mouth */}
                    {person.mood === "nervous" && (
                      <path d="M -5 5 Q 0 3 5 5" fill="none" stroke="white" strokeWidth={1} />
                    )}
                    {person.mood === "happy" && (
                      <path d="M -5 3 Q 0 8 5 3" fill="none" stroke="white" strokeWidth={1} />
                    )}
                    {(person.mood === "normal" || person.mood === "suspicious") && (
                      <line x1={-4} y1={5} x2={4} y2={5} stroke="white" strokeWidth={1} />
                    )}
                    {/* Accessories */}
                    {person.accessories.includes("hat") && (
                      <g>
                        <rect x={-14} y={-28} width={28} height={6} fill={person.secondaryColor} rx={1} />
                        <rect x={-10} y={-34} width={20} height={7} fill={person.secondaryColor} rx={1} />
                      </g>
                    )}
                    {person.accessories.includes("glasses") && (
                      <g>
                        <circle cx={-7} cy={-4} r={5} fill="none" stroke="#aaa" strokeWidth={1} />
                        <circle cx={7} cy={-4} r={5} fill="none" stroke="#aaa" strokeWidth={1} />
                        <line x1={-2} y1={-4} x2={2} y2={-4} stroke="#aaa" strokeWidth={1} />
                      </g>
                    )}
                  </>
                )}
              </svg>
              {!isDead && (
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card"
                  style={{ background: MOOD_COLORS[person.mood] }}
                />
              )}
            </div>

            <div>
              <h3 className={`font-bold text-base ${isDead ? "line-through text-red-400/60" : "text-foreground"}`}>
                {person.name}
              </h3>
              <p className="text-xs font-mono text-muted-foreground">ID: #{person.id}</p>
              {isDead && <p className="text-xs text-red-400 mt-0.5">DECEASED</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">✕</button>
        </div>

        {/* Mood + activity */}
        {!isDead && (
          <div className="flex gap-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full border"
              style={{ color: MOOD_COLORS[person.mood], borderColor: MOOD_COLORS[person.mood] + "66" }}
            >
              {MOOD_LABELS[person.mood] || "Unknown"}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">
              {ACTIVITY_ICONS[person.activity] || "•"} {person.activityLabel}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 border-b border-border space-y-3">
        <InfoRow label="Personality" value={person.personality} />
        <InfoRow label="Location" value={person.room.charAt(0).toUpperCase() + person.room.slice(1)} />
        {person.alibi.map((a, i) => (
          <InfoRow key={i} label="Alibi" value={a} />
        ))}
      </div>

      {/* Suspicion meter */}
      {!isDead && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Your Suspicion Level</span>
            <span className="text-xs font-mono font-bold" style={{
              color: suspicion > 70 ? "#ef4444" : suspicion > 40 ? "#f59e0b" : "#6b7280"
            }}>{Math.round(suspicion)}%</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${suspicion}%`,
                background: suspicion > 70 ? "#ef4444" : suspicion > 40 ? "#f59e0b" : "#22c55e",
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onAdjustSuspicion(-10)}
              className="flex-1 py-1 text-xs border border-border rounded hover:bg-white/5 text-muted-foreground transition-all"
            >
              ▼ Less
            </button>
            <button
              onClick={() => onAdjustSuspicion(10)}
              className="flex-1 py-1 text-xs border border-red-700 rounded hover:bg-red-950/30 text-red-400 transition-all"
            >
              ▲ More
            </button>
          </div>
        </div>
      )}

      {/* Clues about this person */}
      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          Evidence Linked to {person.name}
        </h4>
        {clues.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No specific evidence yet. Keep watching them.
          </p>
        ) : (
          <div className="space-y-2">
            {[...clues].reverse().map((clue) => (
              <div
                key={clue.id}
                className={`text-xs rounded p-2 border ${
                  clue.severity === "critical"
                    ? "border-red-700 bg-red-950/20 text-red-300"
                    : clue.severity === "high"
                    ? "border-orange-700/50 bg-orange-950/10 text-orange-300"
                    : "border-border text-muted-foreground"
                }`}
              >
                {clue.text}
              </div>
            ))}
          </div>
        )}

        {/* Quick accusation note */}
        <div className="mt-4 p-3 rounded border border-border bg-secondary/20">
          <p className="text-xs text-muted-foreground">
            To accuse this person, press the{" "}
            <span className="text-red-400 font-bold">ACCUSE</span> button and enter:
          </p>
          <p className="text-primary font-mono font-bold mt-1">#{person.id}</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}: </span>
      <span className="text-xs text-foreground">{value}</span>
    </div>
  );
}
