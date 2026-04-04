import React, { useState, useEffect, useRef, useCallback } from "react";
import type { GameState, Person, ClueEntry, KillEvent, RoomId, ConfettiPiece, SecretNote } from "./types";
import { ROOMS, isWarmColor } from "./types";
import {
  initializePersons,
  updatePersons,
  generateBehaviorClue,
  generateRedHerringClue,
  generateFramingClue,
  generateConfetti,
  formatTime,
} from "./logic";
import { startAmbient, stopAmbient, resumeContext, playMiniCelebration } from "./audio";
import { RoomView } from "./RoomView";
import { CluePanel } from "../components/CluePanel";
import { PersonPanel } from "../components/PersonPanel";
import { AccusationScreen } from "../components/AccusationScreen";
import { IntroScreen } from "../components/IntroScreen";
import { VictoryScreen } from "../components/VictoryScreen";
import { DefeatScreen } from "../components/DefeatScreen";
import { JumpScare } from "../components/JumpScare";
import { Notepad } from "../components/Notepad";
import { SecretNoteModal } from "../components/SecretNoteModal";
import { MiniCelebration } from "../components/MiniCelebration";

const generateId = () => Math.floor(10000 + Math.random() * 90000).toString();

const FRAMING_START_TICKS = 30 * 60;

function buildSecretNote(persons: Person[]): SecretNote {
  const rooms: RoomId[] = ["library", "kitchen", "ballroom", "garden"];
  const roomBounds: Record<RoomId, { minX: number; maxX: number; minY: number; maxY: number }> = {
    library:  { minX: 120, maxX: 280, minY: 200, maxY: 300 },
    kitchen:  { minX: 140, maxX: 240, minY: 200, maxY: 290 },
    ballroom: { minX: 100, maxX: 250, minY: 240, maxY: 300 },
    garden:   { minX: 90,  maxX: 240, minY: 200, maxY: 300 },
  };
  const roomId = rooms[Math.floor(Math.random() * rooms.length)];
  const bounds = roomBounds[roomId];
  const x = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
  const y = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
  const killers = persons.filter((p) => p.isKiller);
  const warm1 = killers[0] ? isWarmColor(killers[0].color) : false;
  const warm2 = killers[1] ? isWarmColor(killers[1].color) : false;
  return { roomId, x, y, warm1, warm2, twoKillers: killers.length > 1, seen: false };
}

const EMPTY_STATE: GameState = {
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
  hardMode: false,
  framingActive: false,
  secretNote: null,
  showSecretNote: false,
  killersCaught: [],
  miniCelebration: null,
};

export default function GameEngine() {
  const [gameState, setGameState] = useState<GameState>({ ...EMPTY_STATE });

  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  // Start game
  const startGame = useCallback((hardMode: boolean) => {
    const numKillers = hardMode ? 2 : 1;
    const persons = initializePersons(numKillers);
    const suspicionMeterByPerson: Record<string, number> = {};
    persons.forEach((p) => { suspicionMeterByPerson[p.id] = 0; });
    const secretNote = hardMode ? buildSecretNote(persons) : null;

    // Start background music after user interaction (game start click)
    startAmbient(hardMode);

    setGameState((prev) => ({
      ...EMPTY_STATE,
      phase: "playing",
      hardMode,
      persons,
      rooms: ROOMS,
      suspicionMeterByPerson,
      secretNote,
      notes: prev.notes,
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
          text: hardMode
            ? "Two killers lurk among the guests. The host whispers: 'Not one, but two shadows hide in this manor…'"
            : "The host whispers: 'One of my guests is not who they seem. Find them before it's too late.'",
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

      if (delta > 16) {
        setGameState((prev) => {
          if (prev.phase !== "playing") return prev;

          const newTimeElapsed = prev.timeElapsed + 1;
          const newClues: ClueEntry[] = [];
          const newKills: KillEvent[] = [];
          let newTotalKills = prev.totalKills;
          let newScreenShake = false;

          const newFramingActive = prev.framingActive || newTimeElapsed >= FRAMING_START_TICKS;
          if (!prev.framingActive && newTimeElapsed >= FRAMING_START_TICKS) {
            newClues.push({
              id: generateId(),
              text: "⚠️ Something shifts in the manor. Evidence is being planted…",
              room: prev.currentRoom,
              timestamp: newTimeElapsed,
              category: "witness",
              severity: "high",
            });
          }

          const killers = prev.persons.filter((p) => p.isKiller);
          const updatedPersons = updatePersons(
            prev.persons,
            prev.currentRoom,
            prev.investigatedRooms,
            newTimeElapsed,
            (killEvent) => { newKills.push(killEvent); newTotalKills++; newScreenShake = true; },
            (clue) => { newClues.push(clue); },
            (room) => room === prev.currentRoom
          );

          for (const killer of killers) {
            if (killer.state !== "dead") {
              const bc = generateBehaviorClue(killer, updatedPersons, newTimeElapsed);
              if (bc) newClues.push(bc);
            }
          }

          const innocents = updatedPersons.filter((p) => !p.isKiller && p.state !== "dead");
          if (innocents.length > 0) {
            const ri = innocents[Math.floor(Math.random() * innocents.length)];
            const rh = generateRedHerringClue(ri, newTimeElapsed);
            if (rh) newClues.push(rh);
          }

          if (newFramingActive && innocents.length > 0) {
            for (const killer of killers) {
              if (killer.state !== "dead" && Math.random() < 0.002) {
                const target = innocents[Math.floor(Math.random() * innocents.length)];
                newClues.push(generateFramingClue(target, newTimeElapsed));
              }
            }
          }

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
            framingActive: newFramingActive,
            lastKillMessage: newKills.length > 0
              ? `${prev.persons.find((p) => p.id === newKills[0].victimId)?.name} was killed while you weren't watching!`
              : undefined,
          };
        });
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [gameState.phase]);

  // Clear screen shake
  useEffect(() => {
    if (gameState.screenShake) {
      const timer = setTimeout(() => {
        setGameState((prev) => ({ ...prev, screenShake: false, lastKillMessage: undefined }));
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gameState.screenShake]);

  // Stop music when leaving playing/accusation phases
  useEffect(() => {
    if (gameState.phase === "jumpscare" || gameState.phase === "victory" || gameState.phase === "defeat") {
      stopAmbient();
    }
  }, [gameState.phase]);

  const navigateToRoom = useCallback((roomId: RoomId) => {
    resumeContext();
    setGameState((prev) => ({
      ...prev,
      currentRoom: roomId,
      playerMoved: prev.playerMoved + 1,
      investigatedRooms: new Set([...prev.investigatedRooms, roomId]),
    }));
  }, []);

  const selectPerson = useCallback((id: string | null) => {
    setGameState((prev) => ({ ...prev, showPersonDetails: id }));
  }, []);

  const handleObjectClue = useCallback((clueText: string) => {
    setGameState((prev) => {
      const exists = prev.clues.some((c) => c.text === clueText);
      if (exists) return prev;
      return {
        ...prev,
        clues: [...prev.clues, {
          id: generateId(),
          text: `🔍 ${clueText}`,
          room: prev.currentRoom,
          timestamp: prev.timeElapsed,
          category: "physical",
          severity: "medium",
        }],
      };
    });
  }, []);

  const handleNoteClick = useCallback(() => {
    setGameState((prev) => {
      if (!prev.secretNote) return prev;
      return { ...prev, showSecretNote: true, secretNote: { ...prev.secretNote, seen: true } };
    });
  }, []);

  const closeSecretNote = useCallback(() => {
    setGameState((prev) => ({ ...prev, showSecretNote: false }));
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
    const { accusationInput, persons, hardMode, killersCaught } = stateRef.current;
    const trimmed = accusationInput.trim();
    const allKillers = persons.filter((p) => p.isKiller);
    const uncaughtKillers = allKillers.filter((k) => !killersCaught.includes(k.id));

    if (allKillers.length === 0) return;

    const matchedKiller = uncaughtKillers.find((k) => k.id === trimmed);

    if (hardMode && matchedKiller) {
      const newCaught = [...killersCaught, matchedKiller.id];
      const allCaught = newCaught.length >= allKillers.length;

      if (allCaught) {
        // All killers caught — full victory!
        setGameState((prev) => ({
          ...prev,
          phase: "victory",
          accusationResult: "correct",
          killersCaught: newCaught,
          miniCelebration: null,
          confettiPieces: generateConfetti(),
          accusationInput: "",
        }));
      } else {
        // First killer caught — mini celebration, keep playing
        playMiniCelebration();
        setGameState((prev) => ({
          ...prev,
          phase: "playing",
          killersCaught: newCaught,
          miniCelebration: { killerName: matchedKiller.name, killerId: matchedKiller.id },
          accusationInput: "",
          clues: [...prev.clues, {
            id: generateId(),
            text: `🎯 ${matchedKiller.name} (ID: #${matchedKiller.id}) has been caught! One killer remains.`,
            room: prev.currentRoom,
            timestamp: prev.timeElapsed,
            category: "murder",
            severity: "critical",
          }],
        }));
      }
    } else if (!hardMode && allKillers.some((k) => k.id === trimmed)) {
      // Normal mode — single killer caught
      setGameState((prev) => ({
        ...prev,
        phase: "victory",
        accusationResult: "correct",
        confettiPieces: generateConfetti(),
      }));
    } else {
      // Wrong accusation — jumpscare!
      setGameState((prev) => ({
        ...prev,
        phase: "jumpscare",
        accusationResult: "wrong",
      }));
    }
  }, []);

  const dismissMiniCelebration = useCallback(() => {
    setGameState((prev) => ({ ...prev, miniCelebration: null }));
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
    stopAmbient();
    setGameState({ ...EMPTY_STATE });
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
  const caughtCount = gameState.killersCaught.length;

  return (
    <div
      className={`min-h-screen bg-background text-foreground flex flex-col overflow-hidden ${
        gameState.screenShake ? "animate-shake" : ""
      }`}
      style={{ fontFamily: "'Special Elite', 'Courier New', serif" }}
      onClick={resumeContext}
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

      {/* Framing banner */}
      {gameState.framingActive && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-1 rounded text-xs font-bold tracking-widest pointer-events-none animate-fade-in-up"
          style={{
            background: "rgba(80,0,0,0.7)",
            border: "1px solid rgba(200,0,0,0.5)",
            color: "#ff6666",
            letterSpacing: "0.2em",
          }}
        >
          ☠ EVIDENCE IS BEING PLANTED ☠
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

        <div className="flex items-center gap-6 flex-1">
          <Stat icon="⏱" label="Time" value={formatTime(Math.floor(gameState.timeElapsed / 60))} />
          <Stat icon="👥" label="Alive" value={aliveCount.toString()} color={aliveCount < 8 ? "text-red-400" : "text-green-400"} />
          <Stat icon="💀" label="Dead" value={deadCount.toString()} color={deadCount > 0 ? "text-red-500" : "text-muted-foreground"} />
          <Stat icon="🗂" label="Clues" value={gameState.clues.length.toString()} color={criticalClues > 0 ? "text-yellow-400" : "text-muted-foreground"} />
          <Stat icon="🏃" label="Rooms visited" value={gameState.investigatedRooms.size.toString()} />
          {gameState.hardMode && (
            <span className="text-red-400 text-xs font-bold tracking-wider border border-red-800 px-2 py-0.5 rounded">
              ☠ HARD {caughtCount > 0 ? `(${caughtCount}/2 caught)` : ""}
            </span>
          )}
        </div>

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
        {/* Left sidebar */}
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
                {gameState.secretNote?.roomId === room.id && !gameState.secretNote.seen && (
                  <span className="text-yellow-400 animate-heartbeat">📄</span>
                )}
              </div>
            </button>
          ))}

          <div className="mt-auto border-t border-border pt-3">
            <p className="text-xs text-muted-foreground mb-2">Suspects tracked:</p>
            {gameState.persons.map((p) => {
              const suspicion = gameState.suspicionMeterByPerson[p.id] ?? 0;
              const caught = gameState.killersCaught.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => { selectPerson(p.id); navigateToRoom(p.room); }}
                  className="w-full flex items-center gap-1.5 py-1 px-1 rounded hover:bg-white/5 transition-all text-left"
                >
                  <div
                    className="rounded-full flex-shrink-0"
                    style={{ width: 8, height: 8, background: p.color, opacity: p.state === "dead" || caught ? 0.3 : 1 }}
                  />
                  <span className={`text-xs truncate flex-1 ${(p.state === "dead" || caught) ? "line-through opacity-40" : ""}`}>
                    {p.name}{caught ? " ✓" : ""}
                  </span>
                  {suspicion > 0 && !caught && (
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

          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            <div className="relative scanlines" style={{ border: `2px solid ${currentRoom.color}30` }}>
              <RoomView
                room={currentRoom}
                persons={gameState.persons}
                isCurrentRoom={true}
                selectedPersonId={gameState.showPersonDetails}
                onPersonClick={(id) => selectPerson(id === gameState.showPersonDetails ? null : id)}
                onObjectClick={handleObjectClue}
                showIds={true}
                secretNote={gameState.secretNote}
                onNoteClick={handleNoteClick}
              />
              <div
                className="absolute top-2 left-2 text-xs font-mono px-2 py-0.5 rounded"
                style={{ background: `${currentRoom.color}22`, color: currentRoom.color, border: `1px solid ${currentRoom.color}44` }}
              >
                {currentRoom.name.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
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

      {/* Secret note modal */}
      {gameState.showSecretNote && gameState.secretNote && (
        <SecretNoteModal note={gameState.secretNote} onClose={closeSecretNote} />
      )}

      {/* Mini celebration overlay */}
      {gameState.miniCelebration && (
        <MiniCelebration
          killerName={gameState.miniCelebration.killerName}
          onDone={dismissMiniCelebration}
        />
      )}
    </div>
  );
}

function Stat({ icon, label, value, color = "text-foreground" }: {
  icon: string; label: string; value: string; color?: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-muted-foreground text-xs">{icon} {label}</span>
      <span className={`font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}

function ActivityFeed({
  persons, currentRoom, clues, onSelectPerson, onNavigate,
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
      <div className="p-3 border-b border-border">
        {roomPersons.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No one is here</p>
        ) : (
          roomPersons.map((p) => (
            <button key={p.id} onClick={() => onSelectPerson(p.id)}
              className="w-full flex items-center gap-2 py-1 px-1 rounded hover:bg-white/5 transition-all text-left"
            >
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.activityLabel}</p>
              </div>
            </button>
          ))
        )}
      </div>
      <div className="p-3 border-b border-border flex-shrink-0">
        <h3 className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Recent Events</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {recentClues.map((clue) => (
          <div key={clue.id} className={`text-xs p-2 rounded border ${
            clue.severity === "critical"
              ? "bg-red-900/30 border-red-800 text-red-200"
              : clue.severity === "high"
              ? "bg-orange-900/20 border-orange-800/50 text-orange-200"
              : "bg-card/50 border-border text-muted-foreground"
          }`}>
            {clue.text}
          </div>
        ))}
      </div>
      {deadPersons.length > 0 && (
        <div className="p-3 border-t border-border">
          <h3 className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Victims ({deadPersons.length})</h3>
          {deadPersons.map((p) => (
            <div key={p.id} className="flex items-center gap-2 py-0.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0 opacity-40" style={{ background: p.color }} />
              <span className="text-xs text-muted-foreground/60 line-through">{p.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
