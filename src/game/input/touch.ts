import { GameAction, InputSource, PressListener } from './actions';

// A joystick push past this fraction of its radius registers as a direction.
// Below it, the stick is treated as centered (dead zone).
const DEADZONE = 0.35;

/**
 * Touch adapter. The virtual joystick maps onto the same four directional
 * actions WASD produces (each axis independently, exactly like two key
 * pairs), so every consumer of held movement actions works unmodified.
 * Buttons (sprint, interact, phone, camera, pause, capture, handbrake) push
 * state in directly from `MobileControls`.
 */
export class TouchSource implements InputSource {
  private held = new Set<GameAction>();
  private pressListeners = new Set<PressListener>();
  private joyX = 0;
  private joyY = 0;

  /** x, y in -1..1, screen-drag convention (up = -1, left = -1). */
  setJoystick(x: number, y: number) {
    this.joyX = x;
    this.joyY = y;
    this.held.delete('move-forward');
    this.held.delete('move-back');
    this.held.delete('move-left');
    this.held.delete('move-right');
    if (y < -DEADZONE) this.held.add('move-forward');
    if (y > DEADZONE) this.held.add('move-back');
    if (x < -DEADZONE) this.held.add('move-left');
    if (x > DEADZONE) this.held.add('move-right');
  }

  resetJoystick() {
    this.setJoystick(0, 0);
  }

  get joystick() {
    return { x: this.joyX, y: this.joyY };
  }

  setHeld(action: GameAction, on: boolean) {
    if (on) this.held.add(action); else this.held.delete(action);
  }

  press(action: GameAction) {
    this.pressListeners.forEach((cb) => cb(action));
  }

  isHeld(action: GameAction) {
    return this.held.has(action);
  }

  onPress(cb: PressListener) {
    this.pressListeners.add(cb);
    return () => { this.pressListeners.delete(cb); };
  }
}
