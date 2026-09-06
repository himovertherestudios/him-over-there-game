# First Claude Code Prompt

Paste the prompt below into Claude Code while it has this repository open.

---

You are taking over an existing playable project named **Him Over There**. Do not rebuild it from scratch.

First read:
- `CLAUDE.md`
- `docs/SUPERCOOL_AUDIT.md`
- `docs/PROJECT_BRIEF.md`
- `docs/ARCHITECTURE.md`
- `docs/MOBILE_DESKTOP_SPEC.md`
- `docs/MVP_BACKLOG.md`

Current opening-cinematic status:
- The title skyline and 13 autobiographical opening story images are already local in `public/assets/cinematics/opening/`.
- `src/components/game/TitleScreen.tsx` already uses them in story order.
- Do not block this session on the two intentionally deferred beats (social-media post and second referral inquiry).
- Preserve the current intro while making it responsive on mobile.

Then inspect the existing source, especially:
- `src/game/engine.ts`
- `src/game/world.ts`
- `src/game/store.ts`
- `src/game/actions.ts`
- `src/components/game/GameScreen.tsx`
- `src/components/game/CameraHUD.tsx`
- `src/components/game/Phone.tsx`
- `src/components/game/Workstation.tsx`

## Goal for this work session

Complete **PHASE 0: stabilize the export** and begin **PHASE 1: desktop/mobile input architecture**.

Do not add new story chapters, neighborhoods, backend services, or major gameplay features yet.

### Phase 0 — Stabilize

1. Install dependencies using npm.
2. Generate `package-lock.json`.
3. Run the build and fix all TypeScript/Vite errors.
4. Confirm the current first mission remains playable.
5. Audit `src/lib/db.ts`. It points to a SuperCool-managed backend and appears unused. Remove the hardcoded dependency safely or replace it with environment-only configuration without making the game require a backend.
6. Audit package.json for obviously unused SuperCool/template dependencies. Only remove dependencies you can prove are unused.
7. Keep the project on React + TypeScript + Three.js.

### Phase 1 — Input abstraction

The current code directly binds gameplay to keyboard keys. Refactor incrementally so game logic receives semantic actions instead.

Create a minimal input layer, for example:

- `src/game/input/actions.ts`
- `src/game/input/InputManager.ts`
- `src/game/input/keyboard.ts`
- `src/game/input/touch.ts`

Support semantic actions including:
- move-forward
- move-back
- move-left
- move-right
- sprint
- interact
- toggle-phone
- toggle-camera
- capture-photo
- pause
- handbrake

Requirements:

- Current desktop WASD/mouse behavior must remain functionally unchanged.
- Do not rewrite the entire Engine class.
- Migrate keyboard handling through the new abstraction in small steps.
- Continuous movement actions must support held state.
- One-shot actions must support press events.
- Keep mouse/pointer look behavior working.

### Phase 1B — First mobile controls

Add a first-pass `MobileControls` component shown only on touch/narrow mobile devices during gameplay.

Landscape-first layout:

LEFT:
- virtual joystick for movement
- sprint button

RIGHT:
- transparent drag/look zone if needed
- contextual Interact button
- Phone button
- Camera button
- Pause button

Camera mode:
- show a large touch shutter button mapped to capture-photo
- keep tap/pointer autofocus behavior

Do not redesign the entire CameraHUD yet. Just make the current game controllable enough on mobile to walk around, interact, open the phone, enter camera mode and take a photo.

### Device/performance helper

Add a small `device.ts` helper that detects coarse pointer/touch/narrow landscape use. Do not rely on screen width alone.

Use it to choose a conservative default render quality for mobile without removing the existing quality setting.

### Responsive cleanup

For this session only fix the most blocking mobile issues:
- hide keyboard-only helper text on touch devices
- keep core buttons inside safe areas
- prevent top HUD + minimap from making the 3D view unusable
- show a rotate-to-landscape message on very narrow portrait phone gameplay

Do not attempt a full visual redesign yet.

## Validation

Before stopping:

1. `npm run build` must succeed.
2. Desktop keyboard/mouse controls must still work.
3. On a mobile/touch viewport, the player must be able to:
   - move
   - look around
   - interact
   - open/close phone
   - raise/lower camera
   - capture a photo
   - pause
4. The “How much you charge?” first mission must still progress.
5. Summarize every file changed and any remaining risks.

Do not proceed to PWA, Supabase, native packaging, more districts, or new story acts in this session.

---
