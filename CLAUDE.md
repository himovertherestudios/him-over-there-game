# CLAUDE.md — Him Over There

## Mission

Continue the existing playable game. Do not replace it with a new template, static mockup, or different engine unless explicitly requested.

**Him Over There** is an autobiographical, mature, single-player, stylized 3D photography career/life sim set in a fictional Chicago-inspired city. The player literally plays as Him Over There. The protagonist starts as a convicted felon repeatedly rejected by traditional employers, discovers photography as a path to income and identity, photographs models, dancers, musicians, adult-industry professionals, and local creatives, becomes a father, builds a studio/business, develops fine-art work, teaches others, and moves toward legacy.

The game should combine:
- The life-simulation depth of The Sims
- The explorable-city structure, driving, NPC encounters, side missions, humor, and freedom of an urban open-world game
- Real photography mechanics that genuinely teach photography
- Deep freelance/business systems
- Mature humor and adult-world storytelling without making explicit sexual content the core gameplay

## Non-negotiable design rules

1. **Keep the existing game playable after every meaningful change.**
2. **Do not rebuild from scratch.** Refactor incrementally.
3. **Desktop and mobile are equal first-class targets.**
4. **Abstract player actions from physical inputs.** Game logic should ask for actions such as MOVE, INTERACT, PHONE, CAMERA, CAPTURE, PAUSE—not directly for W/E/Tab/Space.
5. **Photography must be real gameplay.** Aperture, shutter speed, ISO, focal length, focus, lighting, posing, and composition must visibly affect results.
6. **Teach through action → result → consequence → short explanation.** Avoid classroom-style tutorial dumping.
7. **Skill matters more than expensive gear.**
8. **Prefer a polished vertical slice over map size or feature count.**
9. **Preserve the protagonist’s autobiographical voice and Chicago cultural grounding.**
10. **Use fictional brands initially.**
11. **Do not make crime, weapons, or violence the game’s main fantasy.**
12. **Do not treat dancers, adult performers, boudoir clients, or nude-art subjects as jokes or caricatures.** They are working people in the protagonist’s real creative ecosystem.
13. **Do not make explicit sex gameplay a core feature.**
14. **Mobile UX should be intentional, not a desktop UI shrunk onto a phone.**
15. **Do not introduce Supabase, auth, multiplayer, cloud saves, native wrappers, or a new backend until the local core loop is stable unless specifically requested.**

## Current technical reality

The codebase already contains:
- `src/game/engine.ts`: custom Three.js rendering/game loop, keyboard/pointer controls, third-person camera, driving, camera mode, scene switching, capture pipeline
- `src/game/world.ts`: procedural district, interiors, protagonist/NPC character primitives, vehicle, light rig
- `src/game/store.ts`: game state, persistence, economy, inquiries, jobs, photo scoring, progression
- `src/game/actions.ts`: business/shoot workflow, mishaps, culling/retouch helpers, job flow
- `src/components/game/GameScreen.tsx`: gameplay HUD, interaction flow, phone/workstation/modal integration
- `src/components/game/CameraHUD.tsx`: camera settings, lighting controls, direction controls, capture
- `src/components/game/Phone.tsx`: inquiry/business/phone interfaces
- `src/components/game/Workstation.tsx`: culling/retouch/delivery workflow

## Opening cinematic assets

The current autobiographical prologue is intentionally usable now without the final two optional storyboard beats. Local assets live under `public/assets/cinematics/opening/` and are registered in `src/game/imgs.ts`. The current sequence covers job applications, rejection, background-check barrier, bills, walking home, the camera turning point, first opportunity, first inquiry, makeshift setup, first shoot, editing, client reaction, and first payment. Do not reintroduce SuperCool-hosted image URLs.

## Near-term architecture direction

Add, rather than rewrite:

```text
src/
  game/
    input/
      actions.ts
      InputManager.ts
      keyboard.ts
      touch.ts
      gamepad.ts        # later
    platform/
      device.ts
      performance.ts
    storage/
      saveAdapter.ts
      saveMigrations.ts
  components/game/
    mobile/
      MobileControls.tsx
      MobileCameraControls.tsx
      MobileHud.tsx
```

Avoid a giant refactor of `engine.ts` before the input abstraction is proven.

## Mobile goals

Initial mobile target:
- Landscape orientation during 3D gameplay
- Left virtual joystick for movement/driving steering
- Right-side drag zone for camera look
- Contextual interact button
- Sprint button
- Phone button
- Camera-mode button
- Capture/shutter button
- Camera settings accessible with large touch targets
- Hide keyboard legends on mobile
- Responsive/compact objectives, stats, minimap, phone, workstation and modals
- 30 FPS target on modern mobile hardware
- Auto-select lower rendering quality on smaller/mobile devices while allowing manual override

## Desktop goals

- Preserve current WASD/mouse controls
- Keep keyboard shortcuts
- 60 FPS target on typical desktop hardware
- Prepare for controller/gamepad mapping later through the same action layer

## Performance rules

- Do not increase draw calls, real-time shadows, geometry density, post effects, NPC counts, or texture sizes without measuring impact.
- Avoid forcing high DPR on mobile.
- Keep mobile quality tier conservative by default.
- Treat `preserveDrawingBuffer: true` as a performance cost; investigate a more targeted screenshot/capture path before changing it.
- Scene/district modularity should be preserved for eventual world streaming.

## Story tone

The story is struggle → discovery → fatherhood → career → business → art → education → legacy.

The protagonist is laid-back, funny, grown, observant, stubborn, creative, and capable of saying what other people are thinking. Humor should come from believable photographer/freelancer situations, client behavior, gear obsession, Chicago life, traffic, parking, nightlife, and the absurdities of creative work.

## Definition of done for any task

A change is not done until:
- Desktop controls still work.
- Relevant mobile controls work if the feature is player-facing.
- Existing first mission can still progress.
- No obvious regression in the photography loop.
- TypeScript/build errors are resolved.
- New code follows the action/input abstraction when applicable.
- UI remains usable at common desktop and landscape-phone sizes.
