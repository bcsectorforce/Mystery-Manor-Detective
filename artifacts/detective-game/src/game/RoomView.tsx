import React from "react";
import type { Room, Person, RoomId, SecretNote } from "./types";
import { PersonDot } from "./PersonDot";

interface RoomViewProps {
  room: Room;
  persons: Person[];
  isCurrentRoom: boolean;
  selectedPersonId: string | null;
  onPersonClick: (id: string) => void;
  onObjectClick: (clue: string) => void;
  showIds: boolean;
  secretNote?: SecretNote | null;
  onNoteClick?: () => void;
  onDeadBodyClick?: (id: string) => void;
  scanAvailable?: boolean;
  radioState?: "unavailable" | "idle" | "charging" | "charged";
  radioChargeProgress?: number;
  onRadioClick?: () => void;
  blakeDoorVisible?: boolean;
  onBlakeDoorClick?: () => void;
}

export function RoomView({
  room,
  persons,
  isCurrentRoom,
  selectedPersonId,
  onPersonClick,
  onObjectClick,
  showIds,
  secretNote,
  onNoteClick,
  onDeadBodyClick,
  scanAvailable,
  radioState,
  radioChargeProgress = 0,
  onRadioClick,
  blakeDoorVisible,
  onBlakeDoorClick,
}: RoomViewProps) {
  const roomPersons = persons.filter((p) => p.room === room.id);
  const bgPatterns: Record<RoomId, string> = {
    library: "rgba(60,30,10,0.8)",
    kitchen: "rgba(20,40,25,0.8)",
    ballroom: "rgba(20,10,40,0.8)",
    garden: "rgba(10,30,15,0.8)",
  };

  const floorPatterns: Record<RoomId, JSX.Element> = {
    library: (
      <g>
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={i} x1={0} y1={i * 50} x2={360} y2={i * 50} stroke="rgba(100,60,20,0.3)" strokeWidth={1} />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 50} y1={0} x2={i * 50} y2={360} stroke="rgba(100,60,20,0.3)" strokeWidth={1} />
        ))}
      </g>
    ),
    kitchen: (
      <g>
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x={(i % 6) * 60 + (Math.floor(i / 6) % 2 === 0 ? 0 : 30)} y={Math.floor(i / 6) * 180} width={58} height={178} fill="rgba(180,180,180,0.05)" />
        ))}
      </g>
    ),
    ballroom: (
      <g>
        {Array.from({ length: 36 }).map((_, i) => (
          <rect key={i} x={(i % 6) * 60} y={Math.floor(i / 6) * 60} width={58} height={58}
            fill={(i + Math.floor(i / 6)) % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.1)"} />
        ))}
        <ellipse cx={175} cy={180} rx={120} ry={110} fill="rgba(100,80,200,0.05)" />
      </g>
    ),
    garden: (
      <g>
        <rect x={0} y={0} width={360} height={360} fill="rgba(30,60,20,0.3)" />
        {Array.from({ length: 20 }).map((_, i) => (
          <circle key={i} cx={Math.sin(i * 137) * 150 + 180} cy={Math.cos(i * 137) * 150 + 180} r={3} fill="rgba(40,120,40,0.4)" />
        ))}
      </g>
    ),
  };

  return (
    <svg
      width={room.width}
      height={room.height}
      style={{
        background: bgPatterns[room.id],
        borderRadius: "8px",
        display: "block",
      }}
    >
      {/* Floor pattern */}
      {floorPatterns[room.id]}

      {/* Room objects */}
      {room.objects.map((obj) => (
        <g key={obj.id}>
          {obj.shape === "circle" ? (
            <circle
              cx={obj.x + obj.width / 2}
              cy={obj.y + obj.height / 2}
              r={obj.width / 2}
              fill={obj.color}
              onClick={obj.interactive ? () => obj.clue && onObjectClick(obj.clue) : undefined}
              style={{ cursor: obj.interactive ? "pointer" : "default" }}
              stroke={obj.interactive ? "rgba(245,197,24,0.4)" : "transparent"}
              strokeWidth={2}
            />
          ) : (
            <rect
              x={obj.x}
              y={obj.y}
              width={obj.width}
              height={obj.height}
              fill={obj.color}
              rx={obj.shape === "rounded" ? 8 : 2}
              onClick={obj.interactive ? () => obj.clue && onObjectClick(obj.clue) : undefined}
              style={{ cursor: obj.interactive ? "pointer" : "default" }}
              stroke={obj.interactive ? "rgba(245,197,24,0.4)" : "rgba(0,0,0,0.3)"}
              strokeWidth={obj.interactive ? 2 : 1}
            />
          )}
          {obj.label && (
            <text
              x={obj.x + obj.width / 2}
              y={obj.y + obj.height / 2 + 4}
              textAnchor="middle"
              fontSize={Math.min(obj.width, obj.height) * 0.45}
              style={{ pointerEvents: "none" }}
            >
              {obj.label}
            </text>
          )}
          {obj.interactive && (
            <text
              x={obj.x + obj.width / 2}
              y={obj.y - 3}
              textAnchor="middle"
              fontSize={7}
              fill="rgba(245,197,24,0.7)"
              style={{ pointerEvents: "none" }}
            >
              [click to examine]
            </text>
          )}
        </g>
      ))}

      {/* Person trails */}
      {roomPersons.map((p) =>
        p.state !== "dead"
          ? p.trail.map((t, idx) => (
              <circle
                key={`${p.id}-trail-${idx}`}
                cx={t.x}
                cy={t.y}
                r={p.size * 0.3 * (1 - idx * 0.15)}
                fill={p.color}
                opacity={t.opacity * 0.3}
              />
            ))
          : null
      )}

      {/* Persons */}
      {roomPersons.map((p) => (
        <PersonDot
          key={p.id}
          person={p}
          isCurrentRoom={isCurrentRoom}
          isSelected={selectedPersonId === p.id}
          onClick={onPersonClick}
          showId={showIds}
          onDeadClick={onDeadBodyClick}
          scanAvailable={scanAvailable}
        />
      ))}

      {/* Secret note — hidden in plain sight */}
      {secretNote && secretNote.roomId === room.id && isCurrentRoom && (
        <g
          onClick={onNoteClick}
          style={{ cursor: "pointer" }}
          transform={`translate(${secretNote.x}, ${secretNote.y})`}
        >
          <rect x={2} y={3} width={20} height={26} rx={2} fill="rgba(0,0,0,0.3)" />
          <rect
            x={0}
            y={0}
            width={20}
            height={26}
            rx={2}
            fill="#e8d5b0"
            stroke="#c9b07a"
            strokeWidth={0.8}
            style={{
              filter: secretNote.seen ? "none" : "drop-shadow(0 0 4px rgba(245,197,24,0.7))",
            }}
          />
          <line x1={3} y1={8} x2={17} y2={8} stroke="#b8904a" strokeWidth={0.6} opacity={0.6} />
          <line x1={3} y1={12} x2={17} y2={12} stroke="#b8904a" strokeWidth={0.6} opacity={0.6} />
          <line x1={3} y1={16} x2={17} y2={16} stroke="#b8904a" strokeWidth={0.6} opacity={0.6} />
          <line x1={3} y1={20} x2={13} y2={20} stroke="#b8904a" strokeWidth={0.6} opacity={0.6} />
          <circle cx={10} cy={22} r={3} fill="#8b0000" opacity={0.8} />
          {!secretNote.seen && (
            <>
              <rect x={-3} y={-3} width={26} height={32} rx={4} fill="none" stroke="rgba(245,197,24,0.4)" strokeWidth={1}>
                <animate attributeName="stroke-opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
              </rect>
              <text x={10} y={-6} textAnchor="middle" fontSize={6} fill="rgba(245,197,24,0.8)" style={{ pointerEvents: "none" }}>
                [examine]
              </text>
            </>
          )}
        </g>
      )}

      {/* ── RADIO (library only, hard mode) ── */}
      {room.id === "library" && radioState && radioState !== "unavailable" && isCurrentRoom && (
        <g
          onClick={radioState === "idle" || radioState === "charged" ? onRadioClick : undefined}
          style={{ cursor: radioState === "idle" || radioState === "charged" ? "pointer" : "default" }}
        >
          <rect x={272} y={52} width={72} height={42} rx={5}
            fill={radioState === "charged" ? "#0a1a0a" : "#1a1208"}
            stroke={radioState === "charged" ? "#00cc44" : "#5a3a10"}
            strokeWidth={radioState === "charged" ? 2 : 1.5}
          >
            {radioState === "charged" && (
              <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
            )}
          </rect>
          {[0,1,2,3,4,5].map((i) => (
            <circle key={i} cx={278 + (i % 3) * 7} cy={61 + Math.floor(i / 3) * 7} r={2}
              fill={radioState === "charged" ? "#004400" : "#2a1800"} />
          ))}
          <circle cx={322} cy={68} r={10} fill="#111" stroke="#444" strokeWidth={1.5} />
          <circle cx={322} cy={68} r={6} fill="#1a1a1a" />
          <line x1={322} y1={68} x2={326} y2={63} stroke="#c8860a" strokeWidth={1.5} strokeLinecap="round" />
          <circle cx={308} cy={62} r={3}
            fill={radioState === "charged" ? "#00ff44" : radioState === "charging" ? "#ffaa00" : "#330000"}
            filter={radioState === "charged" ? "url(#screenglow)" : undefined}
          />
          <line x1={336} y1={52} x2={342} y2={34} stroke="#444" strokeWidth={2} strokeLinecap="round" />
          <circle cx={342} cy={33} r={2} fill="#333" />
          <rect x={280} y={78} width={56} height={12} rx={2} fill="#001800" stroke="#003300" strokeWidth={1} />
          {radioState === "charged" ? (
            <text x={308} y={88} textAnchor="middle" fontSize={7} fill="#00ff44" fontFamily="monospace">READY</text>
          ) : radioState === "charging" ? (
            <text x={308} y={88} textAnchor="middle" fontSize={7} fill="#ffaa00" fontFamily="monospace">CHARGING</text>
          ) : (
            <text x={308} y={88} textAnchor="middle" fontSize={7} fill="#336633" fontFamily="monospace">88.1 MHz</text>
          )}
          <text x={308} y={50} textAnchor="middle" fontSize={6} fill={radioState === "charged" ? "rgba(0,255,68,0.8)" : "rgba(245,197,24,0.6)"}>
            {radioState === "charged" ? "▶ USE RADIO" : radioState === "charging" ? "CHARGING…" : "▶ CHARGE RADIO"}
          </text>
          {radioState === "charging" && (
            <g>
              <rect x={272} y={97} width={72} height={8} rx={4} fill="#111" stroke="#333" strokeWidth={1} />
              <rect x={272} y={97} width={Math.max(0, 72 * radioChargeProgress)} height={8} rx={4} fill="#c8860a" />
              <text x={308} y={114} textAnchor="middle" fontSize={6} fill="#c8860a">
                {Math.round(radioChargeProgress * 100)}%
              </text>
            </g>
          )}
          {radioState === "charged" && (
            <g>
              <rect x={272} y={97} width={72} height={8} rx={4} fill="#001800" stroke="#00cc44" strokeWidth={1}>
                <animate attributeName="stroke-opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />
              </rect>
              <rect x={272} y={97} width={72} height={8} rx={4} fill="#00cc44" opacity={0.3} />
            </g>
          )}
        </g>
      )}

      {/* ── BLAKE DOOR (library only, appears at 90s) ── */}
      {room.id === "library" && blakeDoorVisible && isCurrentRoom && (
        <g
          onClick={onBlakeDoorClick}
          style={{ cursor: "pointer" }}
        >
          {/* Door frame */}
          <rect x={308} y={105} width={46} height={82} rx={3}
            fill="#2a1808"
            stroke="#c89040"
            strokeWidth={2}
          >
            <animate attributeName="stroke-opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
          </rect>
          {/* Door panel */}
          <rect x={311} y={108} width={40} height={76} rx={2}
            fill="#1e1004"
            stroke="#a07030"
            strokeWidth={1}
          />
          {/* Door panels decoration */}
          <rect x={314} y={112} width={16} height={26} rx={1} fill="#251608" stroke="#7a5020" strokeWidth={0.8} />
          <rect x={332} y={112} width={16} height={26} rx={1} fill="#251608" stroke="#7a5020" strokeWidth={0.8} />
          <rect x={314} y={142} width={34} height={36} rx={1} fill="#251608" stroke="#7a5020" strokeWidth={0.8} />
          {/* Doorknob */}
          <circle cx={318} cy={149} r={4} fill="#c89040" />
          <circle cx={318} cy={149} r={2.5} fill="#e0aa50" />
          {/* Keyhole */}
          <ellipse cx={318} cy={149} rx={1} ry={1.5} fill="#1a0c04" />
          {/* Glow around door */}
          <rect x={305} y={102} width={52} height={88} rx={4}
            fill="none"
            stroke="rgba(200,160,40,0.3)"
            strokeWidth={3}
          >
            <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2.5s" repeatCount="indefinite" />
          </rect>
          {/* Light leaking from under door */}
          <ellipse cx={331} cy={188} rx={18} ry={4}
            fill="rgba(255,220,100,0.15)"
          >
            <animate attributeName="opacity" values="0.15;0.05;0.15" dur="3s" repeatCount="indefinite" />
          </ellipse>
          {/* Label */}
          <text x={331} y={100} textAnchor="middle" fontSize={6.5}
            fill="rgba(200,160,40,0.9)"
            style={{ pointerEvents: "none" }}
            fontFamily="monospace"
          >
            [enter]
          </text>
        </g>
      )}

      {/* Darkness overlay if not current room */}
      {!isCurrentRoom && (
        <rect x={0} y={0} width={room.width} height={room.height} fill="rgba(0,0,0,0.72)" rx={8} />
      )}
      {!isCurrentRoom && (
        <>
          <text x={room.width / 2} y={room.height / 2 - 10} textAnchor="middle" fontSize={24} fill="rgba(255,255,255,0.15)">🔒</text>
          <text x={room.width / 2} y={room.height / 2 + 15} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,0.2)" fontFamily="monospace">
            Room Hidden
          </text>
        </>
      )}
    </svg>
  );
}
