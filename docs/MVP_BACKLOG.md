# MVP Backlog

## P0 — Preserve and stabilize

- [ ] Run dependency install successfully
- [ ] Generate and commit `package-lock.json`
- [ ] Get `npm run build` clean
- [ ] Remove or environment-gate unused SuperCool database config
- [ ] Identify unused dependencies and prune them carefully
- [x] Localize title/opening cinematic assets into `public/assets` (character concept + skyline + 13 current story beats)
- [ ] Add a save schema version
- [ ] Document the first mission happy path

## P0 — Mobile + desktop input foundation

- [ ] Define semantic `GameAction` types
- [ ] Build `InputManager`
- [ ] Route current keyboard input through InputManager without changing desktop behavior
- [ ] Add touch movement state
- [ ] Add mobile virtual joystick
- [ ] Add mobile camera-look drag zone
- [ ] Add mobile contextual Interact button
- [ ] Add Phone / Camera / Pause mobile controls
- [ ] Add mobile capture button
- [ ] Hide desktop keyboard legends on touch/mobile

## P0 — Responsive HUD

- [ ] Add device/platform detection helper
- [ ] Compact objective UI for mobile
- [ ] Compact stat display for mobile
- [ ] Responsive minimap
- [ ] Responsive interaction prompt
- [ ] Responsive camera HUD
- [ ] Responsive phone/workstation/modals
- [ ] Respect safe-area insets
- [ ] Add landscape recommendation/rotate overlay

## P1 — Mobile performance

- [ ] Mobile quality preset
- [ ] Lower mobile DPR cap
- [ ] Profile shadows
- [ ] Profile `preserveDrawingBuffer`
- [ ] Reduce any expensive per-frame allocations
- [ ] Test common viewport sizes
- [ ] Add FPS/debug overlay behind development flag

## P1 — Photography polish

- [ ] Make captured image visually reflect exposure more strongly
- [ ] Improve focal-length/perspective demonstration
- [ ] Improve depth-of-field visualization
- [ ] Add clearer focus confirmation
- [ ] Improve flash/ambient balance
- [ ] Expand lighting feedback
- [ ] Make pose/direction changes visually more distinct
- [ ] Ensure lesson text is concise and useful

## P1 — Business/story polish

- [ ] Make first inquiry feel fully conversational
- [ ] Improve contract consequence clarity
- [ ] Make deposits/balances visually obvious
- [ ] Add at least five distinct first-client archetypes
- [ ] Ensure 10+ mishaps are reachable and meaningfully different
- [ ] Add stronger studio-unlock payoff scene

## P2 — Save durability

- [ ] Move captured image blobs/thumbs to IndexedDB
- [ ] Add save migrations
- [ ] Add autosave checkpoints
- [ ] Add multiple save slots only if needed

## P2 — PWA

- [ ] Manifest
- [ ] App icons
- [ ] Service worker/offline shell
- [ ] Install prompt strategy
- [ ] Mobile fullscreen behavior

## Not yet

Do not prioritize these until vertical slice/mobile controls are solid:
- Supabase backend
- Auth
- Multiplayer
- Massive city expansion
- Native app-store packaging
- Real-brand licensing
- Complex traffic AI
- Huge NPC population
- Engine migration
