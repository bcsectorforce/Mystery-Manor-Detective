# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### Murder Mystery Detective Game (`artifacts/detective-game`)
A fully client-side React + Vite detective game. No backend needed.

**Features:**
- 15 animated characters (stylized "people dots" with eyes, accessories, mood indicators)
- 4 unique rooms: Library, Kitchen, Ballroom, Garden
- Real-time game loop — characters move, interact, change rooms
- One randomly selected killer each game with a random 5-digit ID
- Killer strikes victims only when player is in a different room
- Behavioral and physical clue generation system
- Red herring clues to mislead the player
- Clue evidence board with severity levels (critical, high, medium, low)
- Personal suspicion tracker per suspect
- In-game notepad for custom observations
- Animated intro screen with typewriter story text
- Win screen with confetti burst animation
- Defeat screen with dramatic blood-rain reveal
- Interactive room objects that yield clues on click
- Person detail panel with alibi, mood, activity tracking

**Key Files:**
- `src/game/types.ts` — All types, constants, room definitions
- `src/game/logic.ts` — Game logic: person init, AI movement, kill system, clue generation
- `src/game/GameEngine.tsx` — Main game loop + UI orchestrator
- `src/game/PersonDot.tsx` — SVG-based animated character renderer
- `src/game/RoomView.tsx` — Room SVG canvas with objects and people
- `src/components/CluePanel.tsx` — Filterable evidence board
- `src/components/PersonPanel.tsx` — Suspect inspection panel
- `src/components/AccusationScreen.tsx` — Final accusation interface
- `src/components/IntroScreen.tsx` — Cinematic intro with sequential text reveal
- `src/components/VictoryScreen.tsx` — Celebration animation on correct guess
- `src/components/DefeatScreen.tsx` — Dramatic defeat reveal on wrong guess
- `src/components/Notepad.tsx` — Paper-styled detective notepad

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
