import React from "react";
import type { ClueEntry, Person } from "../game/types";
import { formatTime } from "../game/logic";

interface CluePanelProps {
  clues: ClueEntry[];
  persons: Person[];
  onClose: () => void;
}

const SEVERITY_COLORS = {
  critical: { bg: "bg-red-950/30", border: "border-red-700", text: "text-red-400", dot: "#ef4444" },
  high: { bg: "bg-orange-950/20", border: "border-orange-700", text: "text-orange-400", dot: "#f97316" },
  medium: { bg: "bg-yellow-950/10", border: "border-yellow-700/50", text: "text-yellow-500", dot: "#eab308" },
  low: { bg: "", border: "border-border", text: "text-muted-foreground", dot: "#6b7280" },
};

const CATEGORY_ICONS: Record<string, string> = {
  behavior: "👁",
  physical: "🔬",
  witness: "👤",
  location: "📍",
  murder: "💀",
};

export function CluePanel({ clues, persons, onClose }: CluePanelProps) {
  const [filter, setFilter] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");

  const categories = ["all", "murder", "behavior", "physical", "witness", "location"];

  const filtered = [...clues]
    .reverse()
    .filter((c) => filter === "all" || c.category === filter)
    .filter((c) => !search || c.text.toLowerCase().includes(search.toLowerCase()));

  const critCount = clues.filter((c) => c.severity === "critical").length;
  const highCount = clues.filter((c) => c.severity === "high").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between bg-card/50">
        <div>
          <h2 className="font-bold text-foreground flex items-center gap-2">
            🗂 Evidence Board
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {clues.length} entries • {critCount} critical • {highCount} high priority
          </p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg transition-colors">✕</button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <input
          type="text"
          placeholder="Search evidence..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-secondary border border-border rounded px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
        />
      </div>

      {/* Category filter */}
      <div className="p-2 border-b border-border flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-2 py-0.5 rounded text-xs border transition-all capitalize ${
              filter === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {CATEGORY_ICONS[cat] || "📋"} {cat}
          </button>
        ))}
      </div>

      {/* Clue list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center mt-8">No evidence found</p>
        ) : (
          filtered.map((clue) => {
            const styles = SEVERITY_COLORS[clue.severity];
            const suspect = clue.suspectId ? persons.find((p) => p.id === clue.suspectId) : null;
            return (
              <div
                key={clue.id}
                className={`rounded border px-3 py-2 ${styles.bg} ${styles.border} text-xs animate-fade-in-up`}
              >
                <div className="flex items-start gap-2">
                  <span>{CATEGORY_ICONS[clue.category]}</span>
                  <div className="flex-1">
                    <p className="text-foreground leading-relaxed">{clue.text}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`capitalize font-bold ${styles.text}`}>{clue.severity}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span className="text-muted-foreground/70 capitalize">{clue.category}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span className="text-muted-foreground/50 font-mono">{formatTime(Math.floor(clue.timestamp / 60))}</span>
                      {suspect && (
                        <>
                          <span className="text-muted-foreground/50">•</span>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ background: suspect.color }} />
                            <span className="text-muted-foreground/70">{suspect.name}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary footer */}
      <div className="p-3 border-t border-border bg-card/30">
        <p className="text-xs text-muted-foreground">
          Tip: Critical clues point to murder. High clues suggest the killer. Check them carefully.
        </p>
      </div>
    </div>
  );
}
