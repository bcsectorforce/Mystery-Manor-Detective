import React, { useState, useEffect } from "react";
import type { SecretNote } from "../game/types";

interface SecretNoteModalProps {
  note: SecretNote;
  onClose: () => void;
}

function buildNoteText(note: SecretNote): string {
  if (note.killerCount === 1) {
    return note.warm1
      ? "The one you seek dresses in shades of fire — red, orange, amber. Warm hues hide a cold heart."
      : "The one you seek dresses in shades of frost — blue, green, grey. Cold hues mask a colder soul.";
  }

  if (note.killerCount === 2) {
    if (note.warm1 && note.warm2)
      return "Two wolves stalk this manor. Both dress in warm hues — reds, oranges, the color of blood. Do not be fooled by their warmth.";
    if (!note.warm1 && !note.warm2)
      return "Two wolves stalk this manor. Both dress in cold hues — blues, greens, grey as winter stone. The chill in the air is no accident.";
    return "Two wolves stalk this manor. One wears the warmth of flame — reds and oranges. The other wears the cold of the deep — blues and greens. Find them both.";
  }

  // 3 killers
  const warmCount = [note.warm1, note.warm2, note.warm3].filter(Boolean).length;
  if (warmCount === 3)
    return "Three wolves stalk this manor. All three cloak themselves in warm hues — reds, oranges, the colour of spilled blood. Beware every warm face you see.";
  if (warmCount === 0)
    return "Three wolves stalk this manor. All three wear cold colours — blues, greens, grey as a winter grave. The chill you feel is no accident.";
  if (warmCount === 2)
    return "Three wolves stalk this manor. Two wear warm hues — reds and oranges. The third hides in cold colours — blues or greens. Do not trust a warm smile.";
  return "Three wolves stalk this manor. Two wear cold hues — blues, greens and grey. The third dresses in warm colours — reds or oranges. Find all three before the night ends.";
}

export function SecretNoteModal({ note, onClose }: SecretNoteModalProps) {
  const [revealed, setRevealed] = useState(false);
  const [unfurled, setUnfurled] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setUnfurled(true), 100);
    const t2 = setTimeout(() => setRevealed(true), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const noteText = buildNoteText(note);

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          transformOrigin: "center top",
          transform: unfurled ? "scaleY(1) rotate(-1.5deg)" : "scaleY(0.05) rotate(-1.5deg)",
          transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          maxWidth: 420,
          width: "90%",
        }}
      >
        {/* Paper */}
        <div
          style={{
            background: "linear-gradient(160deg, #f5ead6 0%, #e8d5b0 40%, #ddc898 100%)",
            borderRadius: 4,
            padding: "28px 32px 36px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.8), inset 0 0 60px rgba(0,0,0,0.08)",
            position: "relative",
            fontFamily: "'Special Elite', 'Courier New', serif",
          }}
        >
          {/* Paper texture lines */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 28,
                right: 28,
                top: 60 + i * 22,
                height: 1,
                background: "rgba(180,140,60,0.25)",
              }}
            />
          ))}

          {/* Torn edge effect top */}
          <div
            style={{
              position: "absolute",
              top: -8,
              left: 0,
              right: 0,
              height: 12,
              background: "linear-gradient(180deg, transparent 0%, #f5ead6 100%)",
              clipPath: "polygon(0% 100%, 3% 0%, 6% 80%, 9% 10%, 12% 90%, 15% 20%, 18% 70%, 21% 5%, 24% 85%, 27% 15%, 30% 95%, 33% 30%, 36% 80%, 39% 10%, 42% 90%, 45% 25%, 48% 75%, 51% 0%, 54% 85%, 57% 20%, 60% 95%, 63% 35%, 66% 80%, 69% 10%, 72% 90%, 75% 20%, 78% 80%, 81% 5%, 84% 85%, 87% 15%, 90% 90%, 93% 25%, 96% 70%, 100% 100%)",
            }}
          />

          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: 16, position: "relative" }}>
            <p style={{ fontSize: 10, letterSpacing: "0.3em", color: "#7a5c20", textTransform: "uppercase", marginBottom: 6 }}>
              — confidential —
            </p>
            <p style={{ fontSize: 20, color: "#3a2000", fontWeight: "bold", letterSpacing: "0.08em" }}>
              A WARNING
            </p>
            <div style={{ width: 60, height: 1, background: "#7a5c20", margin: "8px auto 0" }} />
          </div>

          {/* Note content */}
          <div style={{ position: "relative", minHeight: 100 }}>
            {revealed ? (
              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.85,
                  color: "#2a1500",
                  textAlign: "left",
                  animation: "fade-in-note 0.6s ease",
                }}
              >
                {noteText}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>
                {[100, 80, 90, 60].map((w, i) => (
                  <div
                    key={i}
                    style={{
                      height: 10,
                      width: `${w}%`,
                      background: "rgba(120,80,20,0.2)",
                      borderRadius: 3,
                      animation: "pulse 1s ease-in-out infinite",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bottom signature */}
          {revealed && (
            <div
              style={{
                marginTop: 20,
                paddingTop: 12,
                borderTop: "1px solid rgba(120,80,20,0.3)",
                textAlign: "right",
                animation: "fade-in-note 0.8s ease 0.3s both",
              }}
            >
              <p style={{ fontSize: 11, color: "#7a5c20", fontStyle: "italic" }}>
                — written in haste, by one who knows
              </p>
            </div>
          )}

          {/* Wax seal decoration */}
          <div
            style={{
              position: "absolute",
              bottom: -14,
              left: "50%",
              transform: "translateX(-50%)",
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "radial-gradient(circle at 40% 35%, #8b0000, #4a0000)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            🔏
          </div>
        </div>

        {/* Close hint */}
        <p
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.4)",
            fontSize: 11,
            marginTop: 28,
            fontFamily: "monospace",
            letterSpacing: "0.1em",
          }}
        >
          [ click anywhere to close ]
        </p>
      </div>

      <style>{`
        @keyframes fade-in-note {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
