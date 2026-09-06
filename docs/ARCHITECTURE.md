# Architecture Direction

## Current stack decision

Stay on React + TypeScript + Three.js for the current vertical slice.

Do not migrate to Unity, Unreal, Godot or another engine merely because the eventual dream game is larger. The current goal is to prove the loop and ship a strong web/mobile/desktop-browser prototype first.

Re-evaluate engine choice only after the vertical slice proves fun and the project has a concrete need the current stack cannot reasonably support.

## Principle: semantic actions, not keys

Today, several systems directly check keyboard strings such as `e`, `c`, `tab`, `space`, `w`, etc.

Refactor toward actions:

```ts
type GameAction =
  | 'move-forward'
  | 'move-back'
  | 'move-left'
  | 'move-right'
  | 'sprint'
  | 'interact'
  | 'toggle-phone'
  | 'toggle-camera'
  | 'capture-photo'
  | 'pause'
  | 'handbrake';
```

Keyboard, touch and future gamepad adapters should produce those actions.

## Suggested incremental files

```text
src/game/input/actions.ts
src/game/input/InputManager.ts
src/game/input/keyboard.ts
src/game/input/touch.ts
src/game/platform/device.ts
src/game/platform/performance.ts
src/game/storage/saveAdapter.ts
src/game/storage/saveMigrations.ts
src/components/game/mobile/MobileControls.tsx
src/components/game/mobile/MobileCameraControls.tsx
```

Do not split the entire app into dozens of new abstractions at once.

## Rendering

Preserve one renderer/canvas.

Near-term improvements:
- device-aware default pixel ratio
- mobile quality preset
- optional reduced shadows on mobile
- lower fog/draw distance if necessary
- lower/minimal antialiasing on low tier if needed
- avoid excess React re-render churn from per-frame state
- profile capture path and `preserveDrawingBuffer`

## World/district model

The current code already switches between a district and interiors. Preserve that pattern.

Future city growth should use:
- one active district at a time
- independent interior scenes
- lightweight transitions/loading
- data-driven district metadata
- reusable building/interior kits

Avoid one giant always-loaded city scene.

## Game state

Current store is a hand-rolled global state system. Keep it for now.

Before adding large systems, introduce:
- save version number
- migration function for old saves
- explicit serializable vs runtime-only state
- IndexedDB later for captured photo blobs

Do not add a state library simply for fashion.

## Backend

No backend is required for the current single-player vertical slice.

When eventually needed, backend use cases might include:
- cloud save sync
- account authentication
- community photo challenges
- analytics
- remote content updates

Do not let backend work block core game development.

## PWA/native path

Phase order:

1. Desktop + mobile browser
2. PWA installability/offline shell
3. iOS/Android packaging only after mobile browser experience is stable
4. Native-store-specific work later

Possible future wrappers can be evaluated later. Do not prematurely couple gameplay to one wrapper.
