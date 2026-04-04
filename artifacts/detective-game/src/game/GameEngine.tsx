import React, { useState, useEffect, useRef, useCallback } from "react";
import type { GameState, Person, ClueEntry, KillEvent, RoomId, ConfettiPiece } from "./types";
import { ROOMS } from "./types";
import {
  initializePersons,
  updatePersons,
  generateBehaviorClue,
  generateRedHerringClue,
  generateConfetti,
  formatTime,
} from "./logic";
import { RoomView } from "./RoomView";
import { CluePanel } from "../components/CluePanel";
import { PersonPanel } from "../components/PersonPanel";
import { AccusationScreen } from "../components/AccusationScreen";
import { IntroScreen } from "../components/IntroScreen";
import { VictoryScreen } from "../components/VictoryScreen";
import { DefeatScreen } from "../components/DefeatScreen";
import { JumpScare } from "../components/JumpScare";
import { Notepad } from "../components/Notepad";

const generateId = () => Math.floor(10000 + Math.random() * 90000).toString();

export default function GameEngine() {
  const [gameState, setGameState] = useState<GameState>({
    phase: "intro",
    currentRoom: "library",
    persons: [],
    rooms: ROOMS,
    clues: [],
    killHistory: [],
    notes: "",
    accusationInput: "",
    timeElapsed: 0,
    playerMoved: 0,
    suspicionMeterByPerson: {},
    discoveredAlibiFor: [],
    investigatedRooms: new Set(),
    totalKills: 0,
    witnessedEvents: 0,
    showCluePanel: false,
    showNotepad: false,
    showPersonDetails: null,
    confettiPieces: [],
    screenShake: false,
    introStep: 0,
  });

  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  // Start game
  const startGame = useCallback(() => {
    const persons = initializePersons();
    const suspicionMeterByPerson: Record<string, number> = {};
    persons.forEach((p) => {
      suspicionMeterByPerson[p.id] = 0;
    });

    setGameState((prev) => ({
      ...prev,
      phase: "playing",
      persons,
      suspicionMeterByPerson,
      clues: [
        {
          id: generateId(),
          text: "You arrived at the manor. Something feels off. Keep your eyes sharp.",
          room: "library",
          timestamp: 0,
          category: "witness",
          severity: "low",
        },
        {
          id: generateId(),
          text: "The host whispers: 'One of my guests is not who they seem. Find them before it's too late.'",
          room: "library",
          timestamp: 0,
          category: "witness",
          severity: "medium",
        },
      ],
    }));
  }, []);

  // Main game loop
  useEffect(() => {
    if (gameState.phase !== "playing") return;

    const loop = (timestamp: number) => {
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      if (delta > 16) { // ~60fps cap
        setGameState((prev) => {
          if (prev.phase !== "playing") return prev;

          const newTimeElapsed = prev.timeElapsed + 1;
          const newClues: ClueEntry[] = [];
          const newKills: KillEvent[] = [];
          let newTotalKills = prev.totalKills;
          let newScreenShake = false;

          const killer = prev.persons.find((p) => p.isKiller);

          const updatedPersons = updatePersons(
            prev.persons,
            prev.currentRoom,
            prev.investigatedRooms,
            newTimeElapsed,
            (killEvent) => {
              newKills.push(killEvent);
              newTotalKills++;
              newScreenShake = true;
            },
            (clue) => {
              newClues.push(clue);
            },
            (room) => room === prev.currentRoom
          );

          // Generate behavioral clues
          if (killer && killer.state !== "dead") {
            const behaviorClue = generateBehaviorClue(killer, updatedPersons, newTimeElapsed);
            if (behaviorClue) newClues.push(behaviorClue);
          }

          // Red herring clues
          const innocents = updatedPersons.filter((p) => !p.isKiller && p.state !== "dead");
          if (innocents.length > 0) {
            const randomInnocent = innocents[Math.floor(Math.random() * innocents.length)];
            const redHerring = generateRedHerringClue(randomInnocent, newTimeElapsed);
            if (redHerring) newClues.push(redHerring);
          }

          // Add kills as clues if any
          const killClues: ClueEntry[] = newKills.map((k) => ({
            id: generateId(),
            text: `💀 ${prev.persons.find((p) => p.id === k.victimId)?.name ?? "Someone"} was killed in the ${ROOMS.find((r) => r.id === k.room)?.name} while you were away!`,
            room: k.room,
            timestamp: newTimeElapsed,
            category: "murder",
            severity: "critical",
          }));

          return {
            ...prev,
            persons: updatedPersons,
            clues: [...prev.clues, ...newClues, ...killClues].slice(-60),
            killHistory: [...prev.killHistory, ...newKills],
            totalKills: newTotalKills,
            timeElapsed: newTimeElapsed,
            screenShake: newScreenShake,
            lastKillMessage: newKills.length > 0
              ? `${prev.persons.find((p) => p.id === newKills[0].victimId)?.name} was killed while you weren't watching!`
              : undefined,
          };
        });
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [gameState.phase]);

  // Clear screen shake after 500ms
  useEffect(() => {
    if (gameState.screenShake) {
      const timer = setTimeout(() => {
        setGameState((prev) => ({ ...prev, screenShake: false, lastKillMessage: undefined }));
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gameState.screenShake]);

  const navigateToRoom = useCallback((roomId: RoomId) => {
    setGameState((prev) => ({
      ...prev,
      currentRoom: roomId,
      playerMoved: prev.playerMoved + 1,
      investigatedRooms: new Set([...prev.investigatedRooms, roomId]),
    }));
  }, []);

  const selectPerson = useCallback((id: string | null) => {
    setGameState((prev) => ({
      ...prev,
      showPersonDetails: id,
    }));
  }, []);

  const handleObjectClue = useCallback((clueText: string) => {
    setGameState((prev) => {
      const exists = prev.clues.some((c) => c.text === clueText);
      if (exists) return prev;
      return {
        ...prev,
        clues: [
          ...prev.clues,
          {
            id: generateId(),
            text: `🔍 ${clueText}`,
            room: prev.currentRoom,
            timestamp: prev.timeElapsed,
            category: "physical",
            severity: "medium",
          },
        ],
      };
    });
  }, []);

  const adjustSuspicion = useCallback((personId: string, delta: number) => {
    setGameState((prev) => ({
      ...prev,
      suspicionMeterByPerson: {
        ...prev.suspicionMeterByPerson,
        [personId]: Math.max(0, Math.min(100, (prev.suspicionMeterByPerson[personId] ?? 0) + delta)),
      },
    }));
  }, []);

  const handleAccuse = useCallback(() => {
    const { accusationInput, persons } = stateRef.current;
    const trimmed = accusationInput.trim();
    const killer = persons.find((p) => p.isKiller);

    if (!killer) return;

    const correct = trimmed === killer.id;
    const confettiPieces = correct ? generateConfetti() : [];

    setGameState((prev) => ({
      ...prev,
      // Wrong → jumpscare first; correct → victory immediately
      phase: correct ? "victory" : "jumpscare",
      accusationResult: correct ? "correct" : "wrong",
      confettiPieces,
    }));
  }, []);

  const handleJumpScareDone = useCallback(() => {
    setGameState((prev) => ({ ...prev, phase: "defeat" }));
  }, []);

  const updateNotes = useCallback((notes: string) => {
    setGameState((prev) => ({ ...prev, notes }));
  }, []);

  const setAccusationInput = useCallback((v: string) => {
    setGameState((prev) => ({ ...prev, accusationInput: v }));
  }, []);

  const openAccusation = useCallback(() => {
    setGameState((prev) => ({ ...prev, phase: "accusation" }));
  }, []);

  const cancelAccusation = useCallback(() => {
    setGameState((prev) => ({ ...prev, phase: "playing" }));
  }, []);

  const toggleCluePanel = useCallback(() => {
    setGameState((prev) => ({ ...prev, showCluePanel: !prev.showCluePanel }));
  }, []);

  const toggleNotepad = useCallback(() => {
    setGameState((prev) => ({ ...prev, showNotepad: !prev.showNotepad }));
  }, []);

  const restartGame = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    setGameState({
      phase: "intro",
      currentRoom: "library",
      persons: [],
      rooms: ROOMS,
      clues: [],
      killHistory: [],
      notes: "",
      accusationInput: "",
      timeElapsed: 0,
      playerMoved: 0,
      suspicionMeterByPerson: {},
      discoveredAlibiFor: [],
      investigatedRooms: new Set(),
      totalKills: 0,
      witnessedEvents: 0,
      showCluePanel: false,
      showNotepad: false,
      showPersonDetails: null,
      confettiPieces: [],
      screenShake: false,
      introStep: 0,
    });
  }, []);

  if (gameState.phase === "intro") {
    return <IntroScreen onStart={startGame} />;
  }

  if (gameState.phase === "jumpscare") {
    return <JumpScare onDone={handleJumpScareDone} />;
  }

  if (gameState.phase === "victory") {
    const killer = gameState.persons.find((p) => p.isKiller);
    return (
      <VictoryScreen
        killer={killer!}
        killHistory={gameState.killHistory}
        clues={gameState.clues}
        timeElapsed={gameState.timeElapsed}
        confettiPieces={gameState.confettiPieces}
        onRestart={restartGame}
      />
    );
  }

  if (gameState.phase === "defeat") {
    const killer = gameState.persons.find((p) => p.isKiller);
    return (
      <DefeatScreen
        killer={killer!}
        accusedId={gameState.accusationInput}
        persons={gameState.persons}
        onRestart={restartGame}
      />
    );
  }

  if (gameState.phase === "accusation") {
    return (
      <AccusationScreen
        persons={gameState.persons}
        suspicionMeter={gameState.suspicionMeterByPerson}
        accusationInput={gameState.accusationInput}
        onInputChange={setAccusationInput}
        onAccuse={handleAccuse}
        onCancel={cancelAccusation}
        clues={gameState.clues}
      />
    );
  }

  const currentRoom = ROOMS.find((r) => r.id === gameState.currentRoom)!;
  const selectedPerson = gameState.persons.find((p) => p.id === gameState.showPersonDetails);
  const aliveCount = gameState.persons.filter((p) => p.state !== "dead").length;
  const deadCount = gameState.persons.filter((p) => p.state === "dead").length;
  const criticalClues = gameState.clues.filter((c) => c.severity === "critical").length;
  const newClues = gameState.clues.filter((c) => c.timestamp > gameState.timeElapsed - 300).length;

  const roomPersonCounts = ROOMS.map((room) => ({
    room,
    aliveCount: gameState.persons.filter((p) => p.room === room.id && p.state !== "dead").length,
    deadCount: gameState.persons.filter((p) => p.room === room.id && p.state === "dead").length,
  }));

  return (
    <div
      className={`min-h-screen bg-background text-foreground flex flex-col overflow-hidden ${
        gameState.screenShake ? "animate-shake" : ""
      }`}
      style={{ fontFamily: "'Special Elite', 'Courier New', serif" }}
    >
      {/* Kill notification */}
      {gameState.lastKillMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="bg-red-900 border-2 border-red-500 text-red-100 px-6 py-3 rounded-lg shadow-2xl animate-pulse-danger">
            <span className="text-red-400 font-bold mr-2">⚠️ MURDER!</span>
            {gameState.lastKillMessage}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm px-4 py-2 flex items-center gap-4 z-30">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          <div>
            <h1 className="text-primary font-bold text-lg leading-tight tracking-wider">DETECTIVE</h1>
            <p className="text-muted-foreground text-xs tracking-widest">MANOR MYSTERY</p>
          </div>
        </div>

        <div className="h-8 w-px bg-border mx-2" />

        {/* Stats */}
        <div className="flex items-center gap-6 flex-1">
          <Stat icon="⏱" label="Time" value={formatTime(Math.floor(gameState.timeElapsed / 60))} />
          <Stat icon="👥" label="Alive" value={aliveCount.toString()} color={aliveCount < 8 ? "text-red-400" : "text-green-400"} />
          <Stat icon="💀" label="Dead" value={deadCount.toString()} color={deadCount > 0 ? "text-red-500" : "text-muted-foreground"} />
          <Stat icon="🗂" label="Clues" value={gameState.clues.length.toString()} color={criticalClues > 0 ? "text-yellow-400" : "text-muted-foreground"} />
          <Stat icon="🏃" label="Rooms visited" value={gameState.investigatedRooms.size.toString()} />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleNotepad}
            className={`px-3 py-1.5 rounded text-xs border transition-all ${
              gameState.showNotepad
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            📝 Notepad
          </button>
          <button
            onClick={toggleCluePanel}
            className={`px-3 py-1.5 rounded text-xs border transition-all relative ${
              gameState.showCluePanel
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            🗂 Evidence
            {newClues > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {newClues}
              </span>
            )}
          </button>
          <button
            onClick={openAccusation}
            className="px-4 py-1.5 bg-red-800 hover:bg-red-700 text-red-100 border border-red-600 rounded text-xs font-bold transition-all hover:scale-105"
          >
            🎯 ACCUSE
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Room navigation */}
        <div className="w-48 border-r border-border bg-card/40 flex flex-col p-3 gap-2 z-20">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Rooms</p>
          {roomPersonCounts.map(({ room, aliveCount: ac, deadCount: dc }) => (
            <button
              key={room.id}
              onClick={() => navigateToRoom(room.id)}
              className={`w-full text-left px-3 py-2.5 rounded border transition-all text-xs ${
                gameState.currentRoom === room.id
                  ? "bg-primary/20 border-primary text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{room.icon}</span>
                <span className="font-bold">{room.name}</span>
              </div>
              <div className="flex gap-2 text-xs opacity-70">
                <span className="text-green-400">👤 {ac}</span>
                {dc > 0 && <span className="text-red-400">💀 {dc}</span>}
                {gameState.investigatedRooms.has(room.id) && <span className="text-primary">✓</span>}
              </div>
            </button>
          ))}

          <div className="mt-auto border-t border-border pt-3">
            <p className="text-xs text-muted-foreground mb-2">Suspects tracked:</p>
            {gameState.persons.map((p) => {
              const suspicion = gameState.suspicionMeterByPerson[p.id] ?? 0;
              return (
                <button
                  key={p.id}
                  onClick={() => { selectPerson(p.id); navigateToRoom(p.room); }}
                  className="w-full flex items-center gap-1.5 py-1 px-1 rounded hover:bg-white/5 transition-all text-left"
                >
                  <div
                    className="rounded-full flex-shrink-0"
                    style={{ width: 8, height: 8, background: p.color, opacity: p.state === "dead" ? 0.3 : 1 }}
                  />
                  <span className={`text-xs truncate flex-1 ${p.state === "dead" ? "line-through opacity-40" : ""}`}>{p.name}</span>
                  {suspicion > 0 && (
                    <div className="w-8 h-1 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${suspicion}%` }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main room area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Room header */}
          <div className="px-4 py-2 border-b border-border bg-card/20 flex items-center gap-3">
            <span className="text-xl">{currentRoom.icon}</span>
            <div>
              <h2 className="font-bold text-foreground">{currentRoom.name}</h2>
              <p className="text-xs text-muted-foreground italic">{currentRoom.description}</p>
            </div>
            <div className="ml-auto text-xs text-muted-foreground italic">
              Click on objects with [click to examine] to find clues • Click on people to inspect them
            </div>
          </div>

          {/* Room viewport */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            <div
              className="relative scanlines"
              style={{ border: `2px solid ${currentRoom.color}30` }}
            >
              <RoomView
                room={currentRoom}
                persons={gameState.persons}
                isCurrentRoom={true}
                selectedPersonId={gameState.showPersonDetails}
                onPersonClick={(id) => {
                  selectPerson(id === gameState.showPersonDetails ? null : id);
                }}
                onObjectClick={handleObjectClue}
                showIds={true}
              />
              {/* Room corner labels */}
              <div
                className="absolute top-2 left-2 text-xs font-mono px-2 py-0.5 rounded"
                style={{ background: `${currentRoom.color}22`, color: currentRoom.color, border: `1px solid ${currentRoom.color}44` }}
              >
                {currentRoom.name.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel - person details / clues */}
        <div className="w-72 border-l border-border bg-card/40 flex flex-col overflow-hidden z-20">
          {gameState.showPersonDetails && selectedPerson ? (
            <PersonPanel
              person={selectedPerson}
              suspicion={gameState.suspicionMeterByPerson[selectedPerson.id] ?? 0}
              clues={gameState.clues.filter((c) => c.suspectId === selectedPerson.id)}
              onAdjustSuspicion={(delta) => adjustSuspicion(selectedPerson.id, delta)}
              onClose={() => selectPerson(null)}
            />
          ) : (
            <ActivityFeed
              persons={gameState.persons}
              currentRoom={gameState.currentRoom}
              clues={gameState.clues}
              onSelectPerson={selectPerson}
              onNavigate={navigateToRoom}
            />
          )}
        </div>
      </div>

      {/* Overlay panels */}
      {gameState.showCluePanel && (
        <div className="fixed right-80 top-12 bottom-0 w-96 z-40 border-l border-border bg-card/95 backdrop-blur-sm overflow-hidden flex flex-col">
          <CluePanel clues={gameState.clues} onClose={toggleCluePanel} persons={gameState.persons} />
        </div>
      )}

      {gameState.showNotepad && (
        <div className="fixed left-48 top-12 bottom-0 w-80 z-40 border-r border-l border-border bg-card/95 backdrop-blur-sm overflow-hidden flex flex-col">
          <Notepad notes={gameState.notes} onUpdate={updateNotes} onClose={toggleNotepad} />
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, color = "text-foreground" }: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-muted-foreground text-xs">{icon} {label}</span>
      <span className={`font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}

function ActivityFeed({
  persons,
  currentRoom,
  clues,
  onSelectPerson,
  onNavigate,
}: {
  persons: Person[];
  currentRoom: string;
  clues: import("./types").ClueEntry[];
  onSelectPerson: (id: string) => void;
  onNavigate: (room: RoomId) => void;
}) {
  const recentClues = [...clues].reverse().slice(0, 12);
  const roomPersons = persons.filter((p) => p.room === currentRoom && p.state !== "dead");
  const deadPersons = persons.filter((p) => p.state === "dead");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-border">
        <h3 className="text-xs text-muted-foreground uppercase tracking-widest">In This Room</h3>
      </div>

      {/* People in current room */}
      <div className="p-3 border-b border-border">
        {roomPersons.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No one is here</p>
        ) : (
          roomPersons.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectPerson(p.id)}
              className="w-full flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/5 transition-all text-left mb-1"
            >
              <div className="relative flex-shrink-0">
                <svg width={20} height={20} viewBox="-10 -10 20 20">
                  <circle r={8} fill={p.color} stroke={p.secondaryColor} strokeWidth={1.5} />
                  <circle r={4} fill={p.secondaryColor} opacity={0.5} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-foreground truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground truncate">{p.activityLabel}</div>
              </div>
              <span className="text-xs text-muted-foreground font-mono">#{p.id}</span>
            </button>
          ))
        )}
      </div>

      {/* Dead persons */}
      {deadPersons.length > 0 && (
        <div className="p-3 border-b border-border">
          <h4 className="text-xs text-red-500 uppercase tracking-widest mb-2">Victims</h4>
          {deadPersons.map((p) => (
            <div key={p.id} className="flex items-center gap-2 py-0.5 text-xs text-red-400/60">
              <span>💀</span>
              <span className="line-through">{p.name}</span>
              <span className="ml-auto font-mono">#{p.id}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent events */}
      <div className="p-3 border-b border-border">
        <h3 className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Recent Events</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {recentClues.map((clue) => (
          <div
            key={clue.id}
            className={`text-xs rounded px-2 py-1.5 evidence-card ${
              clue.severity === "critical"
                ? "border-l-red-500 bg-red-950/20"
                : clue.severity === "high"
                ? "border-l-orange-500 bg-orange-950/10"
                : ""
            }`}
            style={{ borderLeftColor: clue.severity === "critical" ? "#ef4444" : clue.severity === "high" ? "#f97316" : undefined }}
          >
            <div className="text-muted-foreground leading-relaxed">{clue.text}</div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground/50 capitalize">{clue.category}</span>
              <span className="text-muted-foreground/50 font-mono">{formatTime(Math.floor(clue.timestamp / 60))}</span>
            </div>
          </div>
        ))}
        {recentClues.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No events logged yet. Move around and investigate!</p>
        )}
      </div>
    </div>
  );
}

