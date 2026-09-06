# Him Over There — Claude Code Handoff

This repository is the exported SuperCool prototype for **Him Over There**, a stylized 3D, single-player, Chicago-inspired photography career and life simulation game.

The current prototype is already more than a mockup: it contains a custom Three.js game loop, a playable district/interiors, a protagonist, a vehicle, a phone/business system, client inquiries, camera settings, lighting, posing, photo scoring, culling, retouching, delivery, money/reputation/stress systems, a first-mission narrative, and studio progression.

## Start here

1. Read `CLAUDE.md`.
2. Read `docs/SUPERCOOL_AUDIT.md`.
3. Read `docs/PROJECT_BRIEF.md`.
4. Read `docs/ARCHITECTURE.md` and `docs/MOBILE_DESKTOP_SPEC.md`.
5. Use `docs/CLAUDE_FIRST_PROMPT.md` as the first Claude Code task.

## Current stack

- React 18
- TypeScript
- Vite
- Three.js
- Tailwind CSS
- shadcn/Radix UI
- Local browser save state

## Immediate goal

Do **not** rebuild the game or migrate engines yet. Stabilize this prototype and make desktop + mobile first-class targets through an input abstraction layer, responsive HUDs, touch controls, performance tiers, and local asset ownership.

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL.

## Build

```bash
npm run build
```

Note: the exported project did not include a lockfile. The first successful dependency install should commit the generated `package-lock.json`.
