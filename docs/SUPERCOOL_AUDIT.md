# SuperCool Export Audit

## Executive summary

This export is worth continuing. It is not merely a landing page or fake prototype. SuperCool produced a real browser game foundation using React + TypeScript + Three.js.

The correct move is **continue in Claude Code**, not restart.

## What is already implemented

### 3D/game layer
- Custom Three.js renderer and update loop
- Third-person player movement
- Mouse/pointer camera orbit
- Scene switching between district and interiors
- Procedurally assembled Chicago-inspired district
- Apartment and multiple interiors
- Stylized protagonist built from primitive Three.js meshes
- NPC/subject generation
- Drivable car
- Parking checks
- Interactive doors/props/locations
- Basic minimap
- Weather/time hooks
- Basic audio

### Photography layer
- Camera mode
- Aperture
- Shutter speed
- ISO
- Focal length
- Focus distance
- White balance/Kelvin
- Portrait/landscape orientation
- Camera-height changes
- Rule-of-thirds grid
- One-light system
- Light power, distance, angle, height
- Bare vs softbox
- Reflector
- Subject confidence
- Direction/posing choices
- Photo capture
- Shot-quality scoring based on exposure, focus, motion, ISO noise, composition, lighting, pose and expression
- Educational lesson triggers for mistakes such as missed focus, blur, high ISO, exposure error, wide-angle distortion and weak lighting

### Business/career layer
- Client inquiries
- Message threads
- Archetypes/personality flavor
- Package/pricing logic
- Negotiation
- Contracts and clauses
- Deposits/balances
- Money ledger
- Rent/bills
- Reputation
- Energy/stress/creativity/hunger
- Job stages
- Moodboard
- Gear packing
- Random shoot mishaps
- Culling
- Retouching
- Delivery
- Reviews/progression
- Studio unlock goal

### Story layer
- Intro cinematic showing job rejection/background-check struggle and financial pressure
- First mission built around the “Heyyy / How much you charge?” inquiry
- Strong Him Over There tone in dialogue and flavor text

## Biggest technical strengths

1. The project is already organized around game-specific files instead of everything living in one React component.
2. The photography scoring model is surprisingly useful and can be expanded rather than replaced.
3. `world.ts` is procedural/modular, which is helpful for an indie browser game.
4. The first mission already proves the intended loop: inquiry → booking → shoot → cull → retouch → deliver.
5. The custom engine is small enough that Claude can reason about it.

## Main migration risks

### 1. Mobile input is not implemented

The current engine directly listens for keyboard keys:
- WASD
- Shift
- E
- Tab
- C
- Space
- Escape

Pointer drag can likely work with touch to some extent, but there is no virtual joystick, contextual interaction control, mobile shutter control, or mobile driving interface.

A mobile hook exists but is not integrated into the game.

### 2. Input and gameplay logic are coupled

`engine.ts` and `GameScreen.tsx` currently respond directly to specific key strings. This should be replaced gradually with semantic game actions.

### 3. HUD is desktop-first

The objectives panel, stats, minimap, key legends and camera HUD use desktop placement and dense controls. They need responsive variants for landscape phones.

### 4. External SuperCool image URLs — resolved in handoff v2

The original export referenced SuperCool/CloudFront-hosted images. Handoff v2 replaces the title skyline and opening cinematic with user-provided Gemini artwork stored locally under `public/assets/cinematics/opening/`. The character concept is also local. `src/game/imgs.ts` no longer depends on SuperCool image hosting for the title/opening sequence.

A local copy of the Him Over There character concept has been included in this handoff at:
- `public/assets/him-over-there-character-concept.png`
- `docs/reference/him-over-there-character-concept.png`

The title/opening sequence has now been localized. Two optional future opening beats (first social-media post and second referral inquiry) are deferred and are not blockers.

### 5. SuperCool database configuration is hardcoded

`src/lib/db.ts` contains a SuperCool-managed DatabasePad/Supabase-style URL and anon key. The current game code does not appear to use `db.ts` anywhere.

Do not build new persistence on this dependency. Either remove it for now or replace it with environment variables only when a backend is genuinely needed.

### 6. No package lockfile

The source export has `package.json` but no `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`.

Run a successful install and commit the generated lockfile before substantial development.

### 7. Browser save limitations

The current save uses `localStorage`. Full-resolution photo data is intentionally kept in memory because localStorage is too small. This means full photo capture data is not durable across reloads.

Short term: keep local save simple.
Later: move screenshots/photos to IndexedDB and version the save schema.

### 8. Performance tuning is only partial

The renderer already supports low/medium/high pixel-ratio behavior, which is a good start. However mobile device detection, automatic quality defaults, render-budget testing and explicit mobile performance controls are not present.

### 9. `preserveDrawingBuffer: true`

The renderer uses `preserveDrawingBuffer: true`, probably to make photo capture straightforward. This can hurt rendering performance, especially on mobile. Do not blindly remove it—first confirm how screenshots are captured, then replace with a dedicated render target or capture path if feasible.

### 10. No tests/build validation from the export

The environment used for this audit could not complete `npm install` within the available execution window, and the export had no installed modules. Therefore the source was inspected statically but not fully built here.

Claude should begin by installing dependencies, generating a lockfile, and getting `npm run build` clean before feature work.
