import React, { useEffect, useRef } from "react";
import type { Person } from "./types";

interface PersonDotProps {
  person: Person;
  isCurrentRoom: boolean;
  isSelected: boolean;
  onClick: (id: string) => void;
  showId: boolean;
}

export function PersonDot({ person, isCurrentRoom, isSelected, onClick, showId }: PersonDotProps) {
  if (person.state === "dead") {
    return <DeadPerson person={person} isCurrentRoom={isCurrentRoom} showId={showId} />;
  }

  const size = person.size;
  const half = size / 2;
  const moodColors: Record<string, string> = {
    normal: person.color,
    nervous: "#e67e22",
    happy: "#2ecc71",
    scared: "#e74c3c",
    suspicious: "#8e44ad",
  };
  const bodyColor = moodColors[person.mood] || person.color;

  return (
    <g
      transform={`translate(${person.x}, ${person.y})`}
      style={{ cursor: "pointer" }}
      onClick={() => onClick(person.id)}
    >
      {/* Glow effect when selected */}
      {isSelected && (
        <circle r={half + 8} fill="none" stroke={person.glowColor} strokeWidth={2} opacity={0.8}>
          <animate attributeName="r" values={`${half + 6};${half + 12};${half + 6}`} dur="1s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Suspicion aura for killer behaviors */}
      {person.mood === "suspicious" && (
        <circle r={half + 5} fill={person.glowColor} opacity={0.15}>
          <animate attributeName="opacity" values="0.15;0.05;0.15" dur="0.8s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Shadow */}
      <ellipse cx={0} cy={half + 2} rx={half * 0.8} ry={3} fill="rgba(0,0,0,0.4)" />

      {/* Body — main circle */}
      <circle r={half} fill={bodyColor} stroke={person.secondaryColor} strokeWidth={1.5} />

      {/* Inner body detail (personality shape) */}
      <circle r={half * 0.5} fill={person.secondaryColor} opacity={0.5} />

      {/* Face */}
      {/* Eyes */}
      <circle
        cx={Math.cos(person.eyeAngle - 0.5) * half * 0.35}
        cy={Math.sin(person.eyeAngle - 0.5) * half * 0.35 - half * 0.1}
        r={person.blinkTimer < 5 ? 0.5 : half * 0.18}
        fill="white"
      />
      <circle
        cx={Math.cos(person.eyeAngle + 0.5) * half * 0.35}
        cy={Math.sin(person.eyeAngle + 0.5) * half * 0.35 - half * 0.1}
        r={person.blinkTimer < 5 ? 0.5 : half * 0.18}
        fill="white"
      />
      {/* Pupils */}
      <circle
        cx={Math.cos(person.eyeAngle - 0.5) * half * 0.35}
        cy={Math.sin(person.eyeAngle - 0.5) * half * 0.35 - half * 0.1}
        r={half * 0.09}
        fill={person.isKiller ? "#1a0000" : "#333"}
      />
      <circle
        cx={Math.cos(person.eyeAngle + 0.5) * half * 0.35}
        cy={Math.sin(person.eyeAngle + 0.5) * half * 0.35 - half * 0.1}
        r={half * 0.09}
        fill={person.isKiller ? "#1a0000" : "#333"}
      />

      {/* Accessories */}
      {person.accessories.includes("hat") && (
        <g>
          <rect x={-half * 0.7} y={-half - 8} width={half * 1.4} height={5} fill={person.secondaryColor} rx={1} />
          <rect x={-half * 0.45} y={-half - 13} width={half * 0.9} height={6} fill={person.secondaryColor} rx={1} />
        </g>
      )}
      {person.accessories.includes("glasses") && (
        <g>
          <circle cx={-half * 0.3} cy={-half * 0.15} r={half * 0.22} fill="none" stroke="#aaa" strokeWidth={0.8} />
          <circle cx={half * 0.3} cy={-half * 0.15} r={half * 0.22} fill="none" stroke="#aaa" strokeWidth={0.8} />
          <line x1={-half * 0.08} y1={-half * 0.15} x2={half * 0.08} y2={-half * 0.15} stroke="#aaa" strokeWidth={0.8} />
        </g>
      )}
      {person.accessories.includes("tie") && (
        <g>
          <polygon points={`0,${half * 0.2} ${-half * 0.15},${half * 0.6} 0,${half * 0.75} ${half * 0.15},${half * 0.6}`} fill={person.secondaryColor} />
        </g>
      )}

      {/* Activity indicator */}
      {person.state === "walking" && (
        <g>
          <circle cx={half * 0.7} cy={half * 0.7} r={3} fill="rgba(255,255,255,0.6)">
            <animate attributeName="opacity" values="0.6;0;0.6" dur="0.5s" repeatCount="indefinite" />
          </circle>
        </g>
      )}

      {/* Floating text */}
      {person.floatingText && (
        <text
          x={0}
          y={-half - 5}
          textAnchor="middle"
          fontSize={10}
          fill={person.floatingText.color}
          style={{ pointerEvents: "none", animation: "float-up 1.5s ease-out forwards" }}
        >
          {person.floatingText.text}
        </text>
      )}

      {/* Name + ID label */}
      {showId && (
        <g>
          <rect x={-35} y={half + 4} width={70} height={18} fill="rgba(0,0,0,0.7)" rx={3} />
          <text x={0} y={half + 15} textAnchor="middle" fontSize={8} fill="#f5c518" fontFamily="monospace">
            {person.name} #{person.id}
          </text>
        </g>
      )}
      {!showId && (
        <g>
          <rect x={-25} y={half + 4} width={50} height={14} fill="rgba(0,0,0,0.6)" rx={2} />
          <text x={0} y={half + 13} textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.9)">
            {person.name}
          </text>
        </g>
      )}

      {/* Activity bubble */}
      {(person.activity === "looking_around" || person.activity === "pacing" || person.mood === "nervous") && isSelected && (
        <g>
          <ellipse cx={half + 8} cy={-half - 5} rx={20} ry={10} fill="rgba(0,0,0,0.7)" />
          <text x={half + 8} y={-half - 1} textAnchor="middle" fontSize={6} fill="#f5c518">
            {person.activityLabel}
          </text>
        </g>
      )}
    </g>
  );
}

function DeadPerson({ person, isCurrentRoom, showId }: { person: Person; isCurrentRoom: boolean; showId: boolean }) {
  const size = person.size;
  const half = size / 2;

  return (
    <g transform={`translate(${person.x}, ${person.y})`}>
      {/* Blood pool */}
      <ellipse cx={5} cy={half + 2} rx={half + 6} ry={half * 0.6} fill="#8b0000" opacity={0.7} />
      {/* Body (fallen) */}
      <ellipse cx={0} cy={0} rx={half * 1.3} ry={half * 0.6} fill={person.color} opacity={0.6} />
      {/* X eyes */}
      <line x1={-4} y1={-4} x2={-1} y2={-1} stroke="white" strokeWidth={1} />
      <line x1={-1} y1={-4} x2={-4} y2={-1} stroke="white" strokeWidth={1} />
      <line x1={1} y1={-4} x2={4} y2={-1} stroke="white" strokeWidth={1} />
      <line x1={4} y1={-4} x2={1} y2={-1} stroke="white" strokeWidth={1} />
      {/* Crime scene marker */}
      <text x={0} y={-half - 6} textAnchor="middle" fontSize={10}>💀</text>
      {/* Name */}
      {showId && (
        <g>
          <rect x={-28} y={half + 6} width={56} height={14} fill="rgba(100,0,0,0.8)" rx={2} />
          <text x={0} y={half + 16} textAnchor="middle" fontSize={7} fill="#ff6b6b" fontFamily="monospace">
            {person.name} (dead)
          </text>
        </g>
      )}
    </g>
  );
}
