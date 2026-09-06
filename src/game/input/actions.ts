// Semantic player actions. Keyboard, touch and (later) gamepad adapters all
// produce these — gameplay code never checks a raw key string or touch id.
export type GameAction =
  | 'move-forward'
  | 'move-back'
  | 'move-left'
  | 'move-right'
  | 'sprint'
  | 'handbrake'
  | 'interact'
  | 'toggle-phone'
  | 'toggle-camera'
  | 'capture-photo'
  | 'pause'
  | 'save-game';

/** Actions with a meaningful held/not-held state, queried every frame. */
export const HELD_ACTIONS: readonly GameAction[] = [
  'move-forward', 'move-back', 'move-left', 'move-right', 'sprint', 'handbrake',
];

/** Actions that fire once per press, delivered as discrete events. */
export const PRESS_ACTIONS: readonly GameAction[] = [
  'interact', 'toggle-phone', 'toggle-camera', 'capture-photo', 'pause', 'save-game',
];

export type PressListener = (action: GameAction) => void;

/** Common shape for any input source (keyboard, touch, future gamepad). */
export interface InputSource {
  isHeld(action: GameAction): boolean;
  onPress(cb: PressListener): () => void;
}
