# Mobile + Desktop Input and UI Spec

## Platform philosophy

There is one game with one gameplay model and multiple input adapters.

Desktop and mobile should not have separate game logic.

## Desktop controls

Preserve current behavior initially:
- WASD: move / drive
- Shift: sprint
- Mouse drag: camera orbit/look
- E: interact
- Tab: phone
- C: raise/lower camera
- Space: capture in camera mode / handbrake while driving as context requires
- Esc: pause
- Mouse wheel: camera distance / focus
- Shift + wheel: focal length

Future: map controller through the same action system.

## Mobile gameplay orientation

Primary 3D gameplay should target **landscape**.

Menus/phone can be responsive enough to tolerate either orientation, but 3D movement/shooting should clearly communicate that landscape is preferred.

## Mobile walking controls

Left side:
- virtual joystick
- optional sprint region/button near joystick

Right side:
- drag anywhere in a dedicated look zone to orbit the camera

Context buttons:
- Interact
- Phone
- Camera mode
- Pause

Buttons should use icons + short text only when necessary.

## Mobile driving controls

Recommended first implementation:
- left virtual joystick: steering + forward/back
- right side: look camera
- contextual handbrake button
- exit vehicle button when stopped/eligible

Do not build a racing-game control scheme yet.

## Mobile photography controls

When camera mode opens, the UI should feel intentionally camera-like.

Required:
- large shutter button
- tap subject to autofocus
- drag to frame/aim
- easy access to aperture, shutter, ISO, focal length and focus
- one setting at a time can expand into a large bottom slider/scrubber
- lighting tab with large sliders
- directing tab with large tappable pose/direction cards
- lower camera button

Do not place every desktop camera control permanently on screen at phone size.

Suggested pattern:

```text
[ top: exposure meter / frames / battery-like info ]

[          live viewfinder / drag area          ]

[ f/2.8 ] [1/250] [ISO400] [50mm] [AF]

[ Light ] [ Direct ]          [ BIG SHUTTER ]
```

Tapping a setting opens a bottom control tray.

## Mobile HUD

Desktop HUD currently shows too much simultaneously for a phone.

On mobile:
- objectives collapse to one current objective + expand button
- stats become a compact row or drawer
- minimap shrinks or becomes toggleable
- keyboard legends disappear
- contextual prompt becomes a real button
- phone/pause buttons remain reachable by thumb

## Touch target requirements

Aim for approximately 44–48 CSS px minimum touch targets.

Avoid tiny stepper arrows for core camera settings on mobile.

## Device/performance defaults

Suggested automatic defaults:

### Desktop
- quality: high/medium based on GPU/viewport
- DPR cap: 1.5–2
- shadows on
- 60 FPS target

### Mobile/tablet
- quality: low/medium by default
- DPR cap: ~1.0–1.25
- reduce shadow quality or disable some secondary shadows
- 30 FPS target
- allow manual quality override

## Safe areas

Respect iPhone/Android notches and browser UI using CSS safe-area insets where relevant.

## Orientation behavior

If a player enters 3D gameplay in portrait on a narrow phone, show a lightweight rotate-device overlay rather than attempting to cram the full game into portrait.
