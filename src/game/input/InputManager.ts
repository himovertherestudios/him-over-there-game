import { GameAction, PressListener } from './actions';
import { KeyboardSource } from './keyboard';
import { TouchSource } from './touch';

/**
 * Single point of contact between gameplay code and physical input.
 * Engine/UI code asks "is 'sprint' held" or subscribes to presses of
 * 'interact' — never a key string or touch coordinate directly.
 */
class InputManager {
  readonly keyboard = new KeyboardSource();
  readonly touch = new TouchSource();
  private pressListeners = new Set<PressListener>();

  constructor() {
    this.keyboard.onPress((a) => this.pressListeners.forEach((cb) => cb(a)));
    this.touch.onPress((a) => this.pressListeners.forEach((cb) => cb(a)));
  }

  attachKeyboard() { this.keyboard.attach(); }
  detachKeyboard() { this.keyboard.detach(); }

  isHeld(action: GameAction): boolean {
    return this.keyboard.isHeld(action) || this.touch.isHeld(action);
  }

  onPress(cb: PressListener) {
    this.pressListeners.add(cb);
    return () => { this.pressListeners.delete(cb); };
  }
}

export const input = new InputManager();
