import React from "react";

interface NotepadProps {
  notes: string;
  onUpdate: (notes: string) => void;
  onClose: () => void;
}

const PROMPTS = [
  "Who was near the body?",
  "Any suspicious behavior noted?",
  "Who has a confirmed alibi?",
  "Which rooms did they avoid?",
  "Timing of the kills?",
  "Any consistent behavioral patterns?",
];

export function Notepad({ notes, onUpdate, onClose }: NotepadProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <span>📝</span> Detective's Notepad
        </h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">✕</button>
      </div>

      {/* Prompts */}
      <div className="p-3 border-b border-border">
        <p className="text-xs text-muted-foreground mb-2">Questions to ask yourself:</p>
        <div className="space-y-1">
          {PROMPTS.map((p, i) => (
            <div key={i} className="text-xs text-muted-foreground/70 flex items-start gap-1.5">
              <span className="text-primary mt-0.5">→</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Note area - styled as paper */}
      <div className="flex-1 p-3">
        <div className="note-paper rounded-lg h-full flex flex-col p-3" style={{ minHeight: "300px" }}>
          <div className="text-xs text-center mb-2 opacity-50 uppercase tracking-wider" style={{ color: "#8b6914" }}>
            Your Notes
          </div>
          <textarea
            className="flex-1 resize-none outline-none text-xs leading-6 bg-transparent w-full"
            style={{
              color: "#1a1208",
              fontFamily: "'Courier New', monospace",
              backgroundImage: "repeating-linear-gradient(transparent, transparent 23px, rgba(139,105,20,0.2) 23px, rgba(139,105,20,0.2) 24px)",
              caretColor: "#4a2800",
            }}
            placeholder="Write your observations here...&#10;&#10;E.g.:&#10;- Victor was near the kitchen when the 1st murder happened&#10;- Helena keeps pacing near the door&#10;- Sebastian's alibi seems shaky..."
            value={notes}
            onChange={(e) => onUpdate(e.target.value)}
          />
        </div>
      </div>

      <div className="p-3 border-t border-border">
        <p className="text-xs text-muted-foreground italic">
          Your notes are private. Use them to track suspects and observations.
        </p>
      </div>
    </div>
  );
}
