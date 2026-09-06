import { GameAction, InputSource, PressListener } from './actions';

interface KeyBinding {
  held?: GameAction[];
  press?: GameAction[];
}

// Mirrors the physical bindings the engine used directly before the input
// abstraction existed. Desktop feel must not change.
const KEY_MAP: Record<string, KeyBinding> = {
  w: { held: ['move-forward'] },
  s: { held: ['move-back'] },
  a: { held: ['move-left'] },
  d: { held: ['move-right'] },
  shift: { held: ['sprint'] },
  ' ': { held: ['handbrake'], press: ['capture-photo'] },
  e: { press: ['interact'] },
  tab: { press: ['toggle-phone'] },
  c: { press: ['toggle-camera'] },
  escape: { press: ['pause'] },
  m: { press: ['save-game'] },
};

// Keys whose default browser behavior (scroll, tab focus change, etc.) would
// otherwise interfere with gameplay. Kept identical to the original list.
const PREVENT_DEFAULT_KEYS = new Set([' ', 'tab', 'e', 'c', 'w', 'a', 's', 'd', 'r']);

/** Keyboard adapter: window keydown/keyup -> semantic GameActions. */
export class KeyboardSource implements InputSource {
  private held = new Set<GameAction>();
  private pressListeners = new Set<PressListener>();
  private attached = false;

  attach() {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  detach() {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.held.clear();
  }

  isHeld(action: GameAction) {
    return this.held.has(action);
  }

  onPress(cb: PressListener) {
    this.pressListeners.add(cb);
    return () => { this.pressListeners.delete(cb); };
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    const binding = KEY_MAP[k];
    if (PREVENT_DEFAULT_KEYS.has(k)) e.preventDefault();
    if (!binding) return;
    binding.held?.forEach((a) => this.held.add(a));
    if (!e.repeat) binding.press?.forEach((a) => this.pressListeners.forEach((cb) => cb(a)));
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    KEY_MAP[k]?.held?.forEach((a) => this.held.delete(a));
  };
}
