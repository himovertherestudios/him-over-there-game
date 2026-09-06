import React, { useRef, useState } from 'react';
import { Hand, Smartphone, Camera, Pause, Zap, OctagonPause } from 'lucide-react';
import { input } from '@/game/input/InputManager';
import { GameAction } from '@/game/input/actions';
import { Hud } from '@/game/engine';
import { cx } from '../ui';

const JOYSTICK_RADIUS = 46;

/**
 * Generic virtual joystick: reports normalized -1..1 x/y while held and
 * snaps back to center on release. Used for both the left move stick and
 * the right look stick, which differ only in what they do with that vector.
 */
const StickBase: React.FC<{ onStick: (x: number, y: number) => void; onRelease: () => void; label: string; knobClassName: string }> = ({ onStick, onRelease, label, knobClassName }) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pointerId = useRef<number | null>(null);

  const updateFromPoint = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx0 = rect.left + rect.width / 2;
    const cy0 = rect.top + rect.height / 2;
    let dx = clientX - cx0;
    let dy = clientY - cy0;
    const dist = Math.hypot(dx, dy);
    if (dist > JOYSTICK_RADIUS) { dx = (dx / dist) * JOYSTICK_RADIUS; dy = (dy / dist) * JOYSTICK_RADIUS; }
    setKnob({ x: dx, y: dy });
    onStick(dx / JOYSTICK_RADIUS, dy / JOYSTICK_RADIUS);
  };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    pointerId.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateFromPoint(e.clientX, e.clientY);
  };
  const onMove = (e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    updateFromPoint(e.clientX, e.clientY);
  };
  const onUp = (e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    setKnob({ x: 0, y: 0 });
    onRelease();
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className="relative h-24 w-24 select-none rounded-full border border-white/25 bg-black/45 backdrop-blur"
      style={{ touchAction: 'none' }}
      aria-label={label}
    >
      <div
        className={cx('pointer-events-none absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full', knobClassName)}
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
};

/** Left-side virtual joystick. Drives the same held move-* actions WASD does. */
const Joystick: React.FC = () => (
  <StickBase
    label="Move"
    knobClassName="bg-amber-400/85 shadow-[0_0_16px_-2px_rgba(251,191,36,0.8)]"
    onStick={(x, y) => input.touch.setJoystick(x, y)}
    onRelease={() => input.touch.resetJoystick()}
  />
);

/** Right-side virtual joystick. Continuously turns the camera (yaw/pitch), same as dragging, so both thumbs stay anchored. */
const LookStick: React.FC = () => (
  <StickBase
    label="Look"
    knobClassName="bg-sky-400/85 shadow-[0_0_16px_-2px_rgba(56,189,248,0.8)]"
    onStick={(x, y) => input.touch.setLook(x, y)}
    onRelease={() => input.touch.resetLook()}
  />
);

/** Press-and-hold control: sets a held action while the finger is down. */
const HoldButton: React.FC<{ action: GameAction; className?: string; children: React.ReactNode; label: string }> = ({ action, className, children, label }) => {
  const [active, setActive] = useState(false);
  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setActive(true);
    input.touch.setHeld(action, true);
  };
  const up = () => { setActive(false); input.touch.setHeld(action, false); };
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      style={{ touchAction: 'none' }}
      className={cx(
        'flex select-none items-center justify-center rounded-full border backdrop-blur transition-colors',
        active ? 'border-amber-400/70 bg-amber-400/25 text-amber-200' : 'border-white/20 bg-black/45 text-stone-300',
        className,
      )}
    >
      {children}
    </button>
  );
};

/** One-shot control: presses a semantic action, same as a single key press. */
const TapButton: React.FC<{ action: GameAction; className?: string; children: React.ReactNode; label: string; disabled?: boolean }> = ({ action, className, children, label, disabled }) => (
  <button
    type="button"
    aria-label={label}
    disabled={disabled}
    onPointerDown={(e) => { e.preventDefault(); if (disabled) return; input.touch.press(action); }}
    style={{ touchAction: 'none' }}
    className={cx(
      'flex select-none items-center justify-center rounded-full border border-white/20 bg-black/45 text-stone-200 backdrop-blur transition-colors active:bg-amber-400/25 active:text-amber-200',
      disabled && 'opacity-40',
      className,
    )}
  >
    {children}
  </button>
);

export const MobileControls: React.FC<{ hud: Hud }> = ({ hud }) => {
  if (hud.camMode) {
    // Camera settings/shutter are handled by CameraHUD; movement still works
    // (matches desktop, where WASD keeps working with the camera raised).
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex items-end justify-between px-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="pointer-events-auto">
          <Joystick />
        </div>
        <div className="pointer-events-auto">
          <LookStick />
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex items-end justify-between px-4 pb-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}>
      {/* LEFT: movement */}
      <div className="pointer-events-auto flex items-end gap-3">
        <Joystick />
        <HoldButton action="sprint" label="Sprint" className="mb-1 h-12 w-12 text-[10px] font-mono uppercase tracking-wider">
          <Zap className="h-5 w-5" />
        </HoldButton>
      </div>

      {/* RIGHT: contextual actions */}
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        {hud.inCar && (
          <HoldButton action="handbrake" label="Handbrake" className="h-12 w-12">
            <OctagonPause className="h-5 w-5" />
          </HoldButton>
        )}
        <div className="flex items-center gap-2">
          <TapButton action="toggle-camera" label="Camera" disabled={!hud.hasSubject} className="h-12 w-12">
            <Camera className="h-5 w-5" />
          </TapButton>
          <TapButton action="toggle-phone" label="Phone" className="h-12 w-12">
            <Smartphone className="h-5 w-5" />
          </TapButton>
          <TapButton action="pause" label="Pause" className="h-12 w-12">
            <Pause className="h-5 w-5" />
          </TapButton>
        </div>
        <TapButton
          action="interact"
          label={hud.prompt || 'Interact'}
          disabled={!hud.prompt}
          className={cx('h-14 min-w-[3.5rem] gap-1.5 rounded-full px-4', hud.prompt && 'border-amber-400/60 bg-amber-400/15 text-amber-200')}
        >
          <Hand className="h-5 w-5" />
          {hud.prompt && <span className="max-w-[9rem] truncate text-[11px] font-medium">{hud.prompt}</span>}
        </TapButton>
        <LookStick />
      </div>
    </div>
  );
};
