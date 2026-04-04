import type {
  Person,
  PersonActivity,
  RoomId,
  GameState,
  ClueEntry,
  KillEvent,
  ConfettiPiece,
} from "./types";
import {
  PERSON_NAMES,
  PERSONALITIES,
  PERSON_COLORS,
  ROOMS,
  ROOM_ACTIVITIES,
  KILL_METHODS,
  generateId,
  ACTIVITY_LABELS,
} from "./types";

const ROOM_BOUNDS: Record<RoomId, { minX: number; maxX: number; minY: number; maxY: number }> = {
  library:  { minX: 100, maxX: 340, minY: 20,  maxY: 340 },
  kitchen:  { minX: 15,  maxX: 330, minY: 180, maxY: 340 },
  ballroom: { minX: 60,  maxX: 330, minY: 70,  maxY: 330 },
  garden:   { minX: 80,  maxX: 280, minY: 20,  maxY: 340 },
};

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}

function distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function initializePersons(numKillers: number = 1): Person[] {
  const shuffledColors = [...PERSON_COLORS].sort(() => Math.random() - 0.5);

  // Pick unique killer indices
  const killerIndices = new Set<number>();
  while (killerIndices.size < Math.min(numKillers, 15)) {
    killerIndices.add(randomInt(0, 14));
  }

  const rooms: RoomId[] = ["library", "kitchen", "ballroom", "garden"];

  return PERSON_NAMES.map((name, i) => {
    const room = rooms[i % 4] as RoomId;
    const bounds = ROOM_BOUNDS[room];
    const x = randomBetween(bounds.minX, bounds.maxX);
    const y = randomBetween(bounds.minY, bounds.maxY);
    const c = shuffledColors[i];
    const activities = ROOM_ACTIVITIES[room];
    const activity = activities[randomInt(0, activities.length - 1)];

    return {
      id: generateId(),
      name,
      color: c.color,
      secondaryColor: c.secondary,
      glowColor: c.glow,
      size: randomBetween(14, 20),
      room,
      x,
      y,
      targetX: x,
      targetY: y,
      state: "idle",
      activity,
      activityLabel: ACTIVITY_LABELS[activity],
      isKiller: killerIndices.has(i),
      killCooldown: 0,
      suspicionLevel: 0,
      alibi: generateAlibi(name),
      personality: PERSONALITIES[i],
      speed: randomBetween(0.4, 0.9),
      lastSeenByPlayer: 0,
      eyeAngle: 0,
      blinkTimer: randomBetween(100, 300),
      trail: [],
      wiggle: 0,
      wiggleDir: 1,
      mood: "normal",
      movementTimer: randomInt(60, 200),
      accessories: generateAccessories(i),
    };
  });
}

function generateAlibi(name: string): string[] {
  const alibis = [
    `${name} claims to have been reading alone all evening`,
    `${name} says they were cooking when it happened`,
    `${name} insists they were on the dance floor with others`,
    `${name} says they were tending the garden`,
    `${name} swears they were asleep in the corner`,
    `${name} claims to have spoken to several people at once`,
  ];
  return [alibis[randomInt(0, alibis.length - 1)]];
}

function generateAccessories(index: number): string[] {
  const all = [
    ["hat"],
    ["glasses"],
    ["tie"],
    ["necklace"],
    ["hat", "glasses"],
    ["glasses", "tie"],
    [],
    ["necklace"],
    ["hat"],
    ["tie"],
    [],
    ["glasses"],
    ["hat", "tie"],
    ["necklace", "glasses"],
    [],
  ];
  return all[index] || [];
}

export function getNewTarget(person: Person): { x: number; y: number } {
  const bounds = ROOM_BOUNDS[person.room];
  return {
    x: randomBetween(bounds.minX, bounds.maxX),
    y: randomBetween(bounds.minY, bounds.maxY),
  };
}

export function updatePersons(
  persons: Person[],
  currentRoom: RoomId,
  playerSeenRooms: Set<RoomId>,
  timeElapsed: number,
  onKill: (event: KillEvent) => void,
  onClue: (clue: ClueEntry) => void,
  isPlayerInRoom: (room: RoomId) => boolean
): Person[] {
  const updated = persons.map((p) => ({ ...p }));

  // Update each person
  for (let i = 0; i < updated.length; i++) {
    const p = updated[i];
    if (p.state === "dead") continue;

    // Update trail
    p.trail = [
      { x: p.x, y: p.y, opacity: 0.5 },
      ...p.trail.slice(0, 4),
    ].map((t, idx) => ({ ...t, opacity: 0.5 - idx * 0.1 }));

    // Update blink timer
    p.blinkTimer--;
    if (p.blinkTimer <= 0) {
      p.blinkTimer = randomBetween(150, 400);
    }

    // Update wiggle
    p.wiggle += 0.05 * p.wiggleDir;
    if (Math.abs(p.wiggle) > 1.5) p.wiggleDir *= -1;

    // Update eye angle (look toward target)
    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      p.eyeAngle = Math.atan2(dy, dx);
    }

    // Float text timer
    if (p.floatingText) {
      p.floatingText.timer--;
      if (p.floatingText.timer <= 0) {
        p.floatingText = undefined;
      }
    }

    // Movement timer
    p.movementTimer--;

    if (p.movementTimer <= 0) {
      // Decide next action
      const activities = ROOM_ACTIVITIES[p.room];
      p.activity = activities[randomInt(0, activities.length - 1)];
      p.activityLabel = ACTIVITY_LABELS[p.activity];

      // Sometimes change rooms (not killer when player watching)
      if (Math.random() < 0.08 && !(p.isKiller && isPlayerInRoom(p.room))) {
        const rooms: RoomId[] = ["library", "kitchen", "ballroom", "garden"];
        const newRoom = rooms[randomInt(0, 3)];
        if (newRoom !== p.room) {
          p.room = newRoom;
          const bounds = ROOM_BOUNDS[newRoom];
          p.x = randomBetween(bounds.minX, bounds.maxX);
          p.y = randomBetween(bounds.minY, bounds.maxY);
          const newActs = ROOM_ACTIVITIES[newRoom];
          p.activity = newActs[randomInt(0, newActs.length - 1)];
          p.activityLabel = ACTIVITY_LABELS[p.activity];
        }
      }

      const t = getNewTarget(p);
      p.targetX = t.x;
      p.targetY = t.y;
      p.movementTimer = randomInt(60, 200);

      // Killer behavior
      if (p.isKiller) {
        p.killCooldown = Math.max(0, p.killCooldown - 1);
      }
    }

    // Move toward target
    const dxMove = p.targetX - p.x;
    const dyMove = p.targetY - p.y;
    const dist = Math.sqrt(dxMove ** 2 + dyMove ** 2);

    if (dist > 2) {
      const speedMod = p.state === "fleeing" ? p.speed * 2.5 : p.speed;
      p.x += (dxMove / dist) * speedMod;
      p.y += (dyMove / dist) * speedMod;
      p.state = "walking";
    } else {
      p.state = "idle";
    }

    // Killer logic — attempt kill when not in player's room
    if (p.isKiller && p.killCooldown <= 0) {
      const canKill = !isPlayerInRoom(p.room);
      if (canKill) {
        const victims = updated.filter(
          (v) => v.id !== p.id && v.room === p.room && v.state !== "dead"
        );
        if (victims.length > 0 && Math.random() < 0.004) {
          const victim = victims[randomInt(0, victims.length - 1)];
          victim.state = "dead";
          victim.activity = "idle";
          victim.activityLabel = "Dead";
          victim.mood = "scared";

          const method = KILL_METHODS[randomInt(0, KILL_METHODS.length - 1)];
          const killEvent: KillEvent = {
            killerId: p.id,
            victimId: victim.id,
            room: p.room,
            timestamp: timeElapsed,
            witnessed: false,
            method,
          };
          onKill(killEvent);

          // Killer floats suspicious text
          p.floatingText = { text: "...", timer: 60, color: "#e74c3c" };
          p.killCooldown = 300 + randomInt(0, 200); // Cooldown before next kill

          // Clue: murder occurred
          const room = ROOMS.find((r) => r.id === p.room);
          onClue({
            id: generateId(),
            text: `${victim.name} was found dead in the ${room?.name}. Cause: ${method}.`,
            room: p.room,
            timestamp: timeElapsed,
            category: "murder",
            severity: "critical",
          });

          // Killer becomes slightly more nervous after kill
          p.mood = "suspicious";
          p.suspicionLevel = Math.min(100, p.suspicionLevel + 15);
        }
      }
    }

    // Killer subtle behaviors when alone (not watched)
    if (p.isKiller && !isPlayerInRoom(p.room)) {
      if (Math.random() < 0.002) {
        p.floatingText = { text: "...", timer: 45, color: "#888" };
      }
    }

    // Killer suspicious behaviors even when watched — very subtle
    if (p.isKiller) {
      if (Math.random() < 0.001) {
        p.activity = "looking_around";
        p.activityLabel = "Looking around";
        p.floatingText = { text: "👀", timer: 30, color: "#888" };
      }
    }

    // Update suspicion level decay
    if (p.suspicionLevel > 0) {
      p.suspicionLevel = Math.max(0, p.suspicionLevel - 0.01);
    }

    // Mood update
    if (p.isKiller) {
      if (p.killCooldown < 50) p.mood = "nervous";
      else p.mood = "normal";
    }

    updated[i] = p;
  }

  return updated;
}

export function generateBehaviorClue(
  killer: Person,
  persons: Person[],
  timeElapsed: number
): ClueEntry | null {
  if (Math.random() > 0.003) return null;

  const clueTypes: Array<() => ClueEntry | null> = [
    () => ({
      id: generateId(),
      text: `${killer.name} was seen moving away from ${killer.room} suspiciously quickly`,
      room: killer.room,
      timestamp: timeElapsed,
      category: "behavior",
      suspectId: killer.id,
      severity: "medium",
    }),
    () => {
      const deadPerson = persons.find((p) => p.state === "dead");
      if (!deadPerson) return null;
      return {
        id: generateId(),
        text: `${killer.name} was near ${deadPerson.name} shortly before the body was found`,
        room: killer.room,
        timestamp: timeElapsed,
        category: "witness",
        suspectId: killer.id,
        severity: "high",
      };
    },
    () => ({
      id: generateId(),
      text: `${killer.name} appears nervous and keeps glancing at the door`,
      room: killer.room,
      timestamp: timeElapsed,
      category: "behavior",
      suspectId: killer.id,
      severity: "low",
    }),
    () => ({
      id: generateId(),
      text: `${killer.name}'s hands were noticed to be trembling`,
      room: killer.room,
      timestamp: timeElapsed,
      category: "physical",
      suspectId: killer.id,
      severity: "medium",
    }),
    () => ({
      id: generateId(),
      text: `${killer.name} claims not to have been in the ${killer.room}, but was clearly seen there`,
      room: killer.room,
      timestamp: timeElapsed,
      category: "witness",
      suspectId: killer.id,
      severity: "high",
    }),
  ];

  const type = clueTypes[randomInt(0, clueTypes.length - 1)];
  return type();
}

export function generateRedHerringClue(
  innocent: Person,
  timeElapsed: number
): ClueEntry | null {
  if (Math.random() > 0.002) return null;

  const clues = [
    `${innocent.name} was seen arguing with someone, voices raised`,
    `${innocent.name} disappeared briefly and no one can say where they went`,
    `${innocent.name} refused to answer when asked about their whereabouts`,
    `${innocent.name} seems very anxious tonight for unknown reasons`,
    `${innocent.name} was overheard saying something cryptic`,
    `${innocent.name} had a mysterious stain on their clothing`,
  ];

  return {
    id: generateId(),
    text: clues[randomInt(0, clues.length - 1)],
    room: innocent.room,
    timestamp: timeElapsed,
    category: "behavior",
    suspectId: innocent.id,
    severity: Math.random() > 0.5 ? "medium" : "low",
  };
}

export function generateFramingClue(
  innocent: Person,
  timeElapsed: number
): ClueEntry {
  const messages = [
    `${innocent.name}'s fingerprints were found on the murder weapon`,
    `A witness saw ${innocent.name} fleeing the scene moments ago`,
    `${innocent.name}'s belongings were found near the latest victim`,
    `Someone overheard ${innocent.name} say "they deserved it"`,
    `${innocent.name} cannot account for their whereabouts during the killing`,
    `A torn piece of cloth near the body matches ${innocent.name}'s clothing`,
    `${innocent.name} was seen purchasing a suspicious item earlier today`,
    `${innocent.name}'s handwriting was found on a threatening note`,
  ];
  return {
    id: generateId(),
    text: messages[randomInt(0, messages.length - 1)],
    room: innocent.room,
    timestamp: timeElapsed,
    category: "physical",
    suspectId: innocent.id,
    severity: "high",
  };
}

export function generateConfetti(): ConfettiPiece[] {
  const colors = ["#f5c518", "#e74c3c", "#2ecc71", "#3498db", "#9b59b6", "#e67e22", "#1abc9c"];
  return Array.from({ length: 80 }, (_, i) => ({
    id: `confetti-${i}`,
    x: Math.random() * 100,
    color: colors[randomInt(0, colors.length - 1)],
    delay: Math.random() * 3,
    duration: 3 + Math.random() * 3,
    size: randomBetween(6, 16),
  }));
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
