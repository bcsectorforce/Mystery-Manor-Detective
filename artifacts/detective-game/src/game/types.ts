export type RoomId = "library" | "kitchen" | "ballroom" | "garden";

export interface Room {
  id: RoomId;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
  objects: RoomObject[];
  width: number;
  height: number;
}

export interface RoomObject {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  shape: "rect" | "circle" | "rounded";
  label?: string;
  interactive?: boolean;
  clue?: string;
}

export type PersonState =
  | "idle"
  | "walking"
  | "interacting"
  | "dead"
  | "suspicious"
  | "fleeing"
  | "hiding";

export type PersonActivity =
  | "reading"
  | "cooking"
  | "dancing"
  | "gardening"
  | "talking"
  | "sleeping"
  | "looking_around"
  | "pacing"
  | "whispering"
  | "cleaning"
  | "eating"
  | "examining"
  | "hiding"
  | "idle";

export interface Person {
  id: string;
  name: string;
  color: string;
  secondaryColor: string;
  glowColor: string;
  size: number;
  room: RoomId;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  state: PersonState;
  activity: PersonActivity;
  activityLabel: string;
  isKiller: boolean;
  killCooldown: number;
  suspicionLevel: number;
  alibi: string[];
  personality: string;
  speed: number;
  lastSeenByPlayer: number;
  eyeAngle: number;
  blinkTimer: number;
  trail: Array<{ x: number; y: number; opacity: number }>;
  floatingText?: { text: string; timer: number; color: string };
  wiggle: number;
  wiggleDir: number;
  mood: "normal" | "nervous" | "happy" | "scared" | "suspicious";
  movementTimer: number;
  interactingWith?: string;
  accessories: string[];
}

export interface ClueEntry {
  id: string;
  text: string;
  room: RoomId | "unknown";
  timestamp: number;
  category: "behavior" | "physical" | "witness" | "location" | "murder";
  suspectId?: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface KillEvent {
  killerId: string;
  victimId: string;
  room: RoomId;
  timestamp: number;
  witnessed: boolean;
  method: string;
}

export interface GameState {
  phase: "intro" | "playing" | "accusation" | "victory" | "defeat" | "jumpscare";
  currentRoom: RoomId;
  persons: Person[];
  rooms: Room[];
  clues: ClueEntry[];
  killHistory: KillEvent[];
  notes: string;
  accusationInput: string;
  accusationResult?: "correct" | "wrong";
  timeElapsed: number;
  playerMoved: number;
  suspicionMeterByPerson: Record<string, number>;
  discoveredAlibiFor: string[];
  investigatedRooms: Set<RoomId>;
  totalKills: number;
  witnessedEvents: number;
  lastKillMessage?: string;
  showCluePanel: boolean;
  showNotepad: boolean;
  showPersonDetails: string | null;
  confettiPieces: ConfettiPiece[];
  screenShake: boolean;
  introStep: number;
}

export interface ConfettiPiece {
  id: string;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

export const ROOM_OBJECTS: Record<RoomId, RoomObject[]> = {
  library: [
    { id: "bookshelf1", name: "Bookshelf", x: 5, y: 10, width: 80, height: 200, color: "#5c3a1e", shape: "rect", label: "📚" },
    { id: "bookshelf2", name: "Bookshelf", x: 5, y: 220, width: 80, height: 180, color: "#5c3a1e", shape: "rect" },
    { id: "desk", name: "Study Desk", x: 160, y: 30, width: 120, height: 70, color: "#7c5430", shape: "rect", label: "📖", interactive: true, clue: "Scattered papers with someone's name circled repeatedly" },
    { id: "chair1", name: "Armchair", x: 170, y: 120, width: 50, height: 50, color: "#8b4513", shape: "rounded" },
    { id: "lamp", name: "Floor Lamp", x: 300, y: 20, width: 20, height: 20, color: "#d4a017", shape: "circle", label: "💡" },
    { id: "globestand", name: "Globe", x: 320, y: 180, width: 35, height: 35, color: "#1a6b9a", shape: "circle", label: "🌍", interactive: true, clue: "The globe has been recently moved — a bloodstain behind it" },
    { id: "fireplace", name: "Fireplace", x: 240, y: 280, width: 100, height: 60, color: "#c0392b", shape: "rect", label: "🔥" },
    { id: "rug", name: "Rug", x: 130, y: 200, width: 180, height: 100, color: "#6b3a8c", shape: "rect" },
  ],
  kitchen: [
    { id: "counter", name: "Counter", x: 10, y: 10, width: 300, height: 60, color: "#a8a8a8", shape: "rect", label: "🍳" },
    { id: "stove", name: "Stove", x: 10, y: 80, width: 80, height: 80, color: "#555", shape: "rect", label: "🔥", interactive: true, clue: "Something was burned here recently — smells metallic, not food" },
    { id: "fridge", name: "Fridge", x: 110, y: 80, width: 60, height: 100, color: "#e8e8e8", shape: "rect", label: "🧊" },
    { id: "table", name: "Dining Table", x: 100, y: 230, width: 160, height: 90, color: "#8b6914", shape: "rect", interactive: true, clue: "One chair has been knocked over. Scratch marks on the floor" },
    { id: "chair_k1", name: "Chair", x: 90, y: 250, width: 40, height: 40, color: "#6b5010", shape: "rect" },
    { id: "chair_k2", name: "Chair", x: 270, y: 250, width: 40, height: 40, color: "#6b5010", shape: "rect" },
    { id: "sink", name: "Sink", x: 250, y: 80, width: 70, height: 60, color: "#aaa", shape: "rect", label: "🚿" },
    { id: "knifeholder", name: "Knife Block", x: 200, y: 20, width: 40, height: 30, color: "#222", shape: "rect", label: "🔪", interactive: true, clue: "One knife is missing from the block" },
  ],
  ballroom: [
    { id: "dancefloor", name: "Dance Floor", x: 50, y: 60, width: 250, height: 200, color: "#1a1a3e", shape: "rect" },
    { id: "chandelier", name: "Chandelier", x: 155, y: 20, width: 50, height: 30, color: "#d4af37", shape: "circle", label: "✨" },
    { id: "piano", name: "Grand Piano", x: 280, y: 20, width: 80, height: 70, color: "#111", shape: "rect", label: "🎹", interactive: true, clue: "Sheet music has been shredded and crumpled, not from practice" },
    { id: "bar", name: "Bar Counter", x: 10, y: 10, width: 60, height: 150, color: "#4a2800", shape: "rect", label: "🍸" },
    { id: "couch1", name: "Couch", x: 10, y: 280, width: 120, height: 50, color: "#8b0000", shape: "rounded" },
    { id: "couch2", name: "Couch", x: 220, y: 280, width: 120, height: 50, color: "#8b0000", shape: "rounded" },
    { id: "mirror", name: "Mirror", x: 320, y: 150, width: 20, height: 120, color: "#c0e8ff", shape: "rect", label: "🪞", interactive: true, clue: "A lipstick message on the mirror was hastily wiped — you can still faintly read: 'WATCH'" },
    { id: "speaker", name: "Speakers", x: 30, y: 200, width: 30, height: 30, color: "#333", shape: "rect", label: "🔊" },
  ],
  garden: [
    { id: "fountain", name: "Fountain", x: 150, y: 130, width: 70, height: 70, color: "#1a6b9a", shape: "circle", label: "⛲", interactive: true, clue: "The fountain water is slightly discolored near the south edge" },
    { id: "hedge1", name: "Hedge", x: 5, y: 5, width: 70, height: 200, color: "#1a5e1a", shape: "rect" },
    { id: "hedge2", name: "Hedge", x: 285, y: 5, width: 70, height: 200, color: "#1a5e1a", shape: "rect" },
    { id: "bench1", name: "Garden Bench", x: 100, y: 40, width: 80, height: 30, color: "#a07040", shape: "rect", label: "🪑", interactive: true, clue: "A torn piece of cloth caught on the bench — dark colored" },
    { id: "bench2", name: "Garden Bench", x: 180, y: 280, width: 80, height: 30, color: "#a07040", shape: "rect" },
    { id: "flowerbed1", name: "Flowerbed", x: 100, y: 290, width: 70, height: 50, color: "#e74c8b", shape: "rounded", label: "🌸" },
    { id: "tree1", name: "Oak Tree", x: 280, y: 230, width: 60, height: 60, color: "#2d4a0a", shape: "circle", label: "🌳" },
    { id: "shed", name: "Garden Shed", x: 5, y: 230, width: 70, height: 100, color: "#7c4e1e", shape: "rect", label: "🏚", interactive: true, clue: "The shed door was recently forced open — fresh scratches on the lock" },
    { id: "path", name: "Stone Path", x: 160, y: 10, width: 40, height: 360, color: "#999", shape: "rect" },
  ],
};

export const ROOMS: Room[] = [
  {
    id: "library",
    name: "Library",
    description: "A dim, book-lined study with crackling fireplace",
    color: "#f5c518",
    bgColor: "#1a110a",
    icon: "📚",
    objects: ROOM_OBJECTS.library,
    width: 360,
    height: 360,
  },
  {
    id: "kitchen",
    name: "Kitchen",
    description: "A large industrial kitchen, smell of something off",
    color: "#22c55e",
    bgColor: "#0a1a0e",
    icon: "🍳",
    objects: ROOM_OBJECTS.kitchen,
    width: 360,
    height: 360,
  },
  {
    id: "ballroom",
    name: "Ballroom",
    description: "Grand ballroom with gleaming floors and dimmed lights",
    color: "#a855f7",
    bgColor: "#0e0a1a",
    icon: "🕺",
    objects: ROOM_OBJECTS.ballroom,
    width: 360,
    height: 360,
  },
  {
    id: "garden",
    name: "Garden",
    description: "A moonlit garden with overgrown hedges and shadows",
    color: "#06b6d4",
    bgColor: "#0a1218",
    icon: "🌿",
    objects: ROOM_OBJECTS.garden,
    width: 360,
    height: 360,
  },
];

export const PERSON_NAMES = [
  "Victor", "Helena", "Sebastian", "Margot", "Dorian",
  "Isolde", "Edmund", "Rowena", "Leopold", "Beatrix",
  "Caspian", "Lavinia", "Thaddeus", "Evangeline", "Mortimer"
];

export const PERSONALITIES = [
  "nervous and talkative",
  "calm and observant",
  "flirtatious and distracted",
  "paranoid and secretive",
  "jovial and careless",
  "meticulous and quiet",
  "boisterous and clumsy",
  "introspective and slow",
  "arrogant and loud",
  "timid and helpful",
  "sarcastic and clever",
  "melancholic and artistic",
  "energetic and forgetful",
  "stoic and watchful",
  "charismatic and manipulative",
];

export const PERSON_COLORS = [
  { color: "#e74c3c", secondary: "#c0392b", glow: "#ff6b6b" },
  { color: "#3498db", secondary: "#2980b9", glow: "#74b9ff" },
  { color: "#2ecc71", secondary: "#27ae60", glow: "#55efc4" },
  { color: "#f39c12", secondary: "#d68910", glow: "#fdcb6e" },
  { color: "#9b59b6", secondary: "#8e44ad", glow: "#a29bfe" },
  { color: "#1abc9c", secondary: "#16a085", glow: "#00cec9" },
  { color: "#e67e22", secondary: "#ca6f1e", glow: "#ff7675" },
  { color: "#e91e63", secondary: "#c2185b", glow: "#fd79a8" },
  { color: "#00bcd4", secondary: "#0097a7", glow: "#74b9ff" },
  { color: "#8bc34a", secondary: "#689f38", glow: "#a9e34b" },
  { color: "#ff5722", secondary: "#e64a19", glow: "#fab1a0" },
  { color: "#607d8b", secondary: "#455a64", glow: "#b2bec3" },
  { color: "#795548", secondary: "#5d4037", glow: "#d7ccc8" },
  { color: "#ff9800", secondary: "#f57c00", glow: "#ffeaa7" },
  { color: "#4db6ac", secondary: "#26a69a", glow: "#81ecec" },
];

export const KILL_METHODS = [
  "poisoning",
  "strangulation",
  "blunt force",
  "sharp object",
  "drowning",
  "asphyxiation",
];

export function generateId(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

export const ACTIVITY_LABELS: Record<PersonActivity, string> = {
  reading: "Reading",
  cooking: "Cooking",
  dancing: "Dancing",
  gardening: "Tending garden",
  talking: "Chatting",
  sleeping: "Resting",
  looking_around: "Looking around",
  pacing: "Pacing nervously",
  whispering: "Whispering",
  cleaning: "Cleaning",
  eating: "Eating",
  examining: "Examining something",
  hiding: "Standing still",
  idle: "Idle",
};

export const ROOM_ACTIVITIES: Record<RoomId, PersonActivity[]> = {
  library: ["reading", "examining", "idle", "looking_around", "sleeping"],
  kitchen: ["cooking", "eating", "cleaning", "idle", "examining"],
  ballroom: ["dancing", "talking", "idle", "looking_around", "whispering"],
  garden: ["gardening", "idle", "pacing", "examining", "looking_around"],
};
