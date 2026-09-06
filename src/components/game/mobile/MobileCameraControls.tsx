import React, { useState } from 'react';
import { Aperture, Timer, Gauge, Focus as FocusIcon, Sun, Minus, Plus, X } from 'lucide-react';
import { engine, CamState } from '@/game/engine';
import { getState } from '@/game/store';
import { APERTURES, SHUTTERS, ISOS, WBS, fmtShutter } from '@/game/data';
import { cx } from '../ui';
import { sfx } from '@/game/audio';

type SettingId = 'aperture' | 'shutter' | 'iso' | 'focal' | 'focus' | 'wb' | 'kelvin';

const step = <T,>(arr: T[], cur: T, dir: number): T => {
  const i = arr.indexOf(cur);
  return arr[Math.max(0, Math.min(arr.length - 1, (i < 0 ? 0 : i) + dir))];
};

interface SettingDef {
  id: SettingId;
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: string;
  onPrev: () => void;
  onNext: () => void;
  slider: { min: number; max: number; step: number; value: number; onChange: (v: number) => void };
}

/**
 * Mobile equivalent of the desktop Stepper row: a compact chip per setting
 * (tap to open) plus one big slider + large +/- buttons for whichever
 * setting is open, instead of nine permanent tiny stepper arrows.
 */
export const MobileCameraControls: React.FC<{ c: CamState }> = ({ c }) => {
  const [open, setOpen] = useState<SettingId | null>(null);

  const settings: SettingDef[] = [
    {
      id: 'aperture', icon: Aperture, label: 'Aperture', value: `f/${c.aperture}`,
      onPrev: () => engine.setCam({ aperture: step(APERTURES, c.aperture, -1) }),
      onNext: () => engine.setCam({ aperture: step(APERTURES, c.aperture, 1) }),
      slider: {
        min: 0, max: APERTURES.length - 1, step: 1, value: Math.max(0, APERTURES.indexOf(c.aperture)),
        onChange: (i) => engine.setCam({ aperture: APERTURES[Math.round(i)] }),
      },
    },
    {
      id: 'shutter', icon: Timer, label: 'Shutter', value: fmtShutter(c.shutter), tone: c.shutter > 1 / 125 ? 'text-red-400' : undefined,
      onPrev: () => engine.setCam({ shutter: step(SHUTTERS, c.shutter, -1) }),
      onNext: () => engine.setCam({ shutter: step(SHUTTERS, c.shutter, 1) }),
      slider: {
        min: 0, max: SHUTTERS.length - 1, step: 1, value: Math.max(0, SHUTTERS.indexOf(c.shutter)),
        onChange: (i) => engine.setCam({ shutter: SHUTTERS[Math.round(i)] }),
      },
    },
    {
      id: 'iso', icon: Gauge, label: 'ISO', value: `${c.iso}`, tone: c.iso > 3200 ? 'text-red-400' : undefined,
      onPrev: () => engine.setCam({ iso: step(ISOS, c.iso, -1) }),
      onNext: () => engine.setCam({ iso: step(ISOS, c.iso, 1) }),
      slider: {
        min: 0, max: ISOS.length - 1, step: 1, value: Math.max(0, ISOS.indexOf(c.iso)),
        onChange: (i) => engine.setCam({ iso: ISOS[Math.round(i)] }),
      },
    },
    {
      id: 'focal', icon: FocusIcon, label: 'Focal', value: `${c.focal}mm`,
      onPrev: () => engine.setCam({ focal: Math.max(24, c.focal - 5) }),
      onNext: () => engine.setCam({ focal: Math.min(getState().ownedGear.includes('lens-85') ? 85 : 70, c.focal + 5) }),
      slider: {
        min: 24, max: getState().ownedGear.includes('lens-85') ? 85 : 70, step: 5, value: c.focal,
        onChange: (v) => engine.setCam({ focal: v }),
      },
    },
    {
      id: 'focus', icon: FocusIcon, label: 'Focus', value: `${c.focus.toFixed(2)}m`,
      onPrev: () => engine.setCam({ focus: Math.max(0.4, c.focus - 0.1) }),
      onNext: () => engine.setCam({ focus: Math.min(20, c.focus + 0.1) }),
      slider: {
        min: 0.4, max: 20, step: 0.1, value: c.focus,
        onChange: (v) => engine.setCam({ focus: v }),
      },
    },
    {
      id: 'wb', icon: Sun, label: 'White balance', value: c.wb === 'Auto' ? 'Auto' : `${c.kelvin}K`,
      onPrev: () => engine.setCam({ wb: step(WBS, c.wb, -1) }),
      onNext: () => engine.setCam({ wb: step(WBS, c.wb, 1) }),
      slider: {
        min: 0, max: WBS.length - 1, step: 1, value: Math.max(0, WBS.indexOf(c.wb)),
        onChange: (i) => engine.setCam({ wb: WBS[Math.round(i)] }),
      },
    },
    {
      id: 'kelvin', icon: Sun, label: 'Kelvin', value: `${c.kelvin}K`,
      onPrev: () => engine.setCam({ kelvin: Math.max(2500, c.kelvin - 250) }),
      onNext: () => engine.setCam({ kelvin: Math.min(9000, c.kelvin + 250) }),
      slider: {
        min: 2500, max: 9000, step: 250, value: c.kelvin,
        onChange: (v) => engine.setCam({ kelvin: v }),
      },
    },
  ];

  const active = settings.find((s) => s.id === open) || null;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {settings.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => { sfx.click(); setOpen(open === s.id ? null : s.id); }}
            className={cx(
              'flex h-11 min-w-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-lg border px-2 transition-colors',
              open === s.id ? 'border-amber-400/70 bg-amber-400/15' : 'border-white/15 bg-black/50',
            )}
          >
            <s.icon className="h-3.5 w-3.5 text-stone-500" />
            <span className={cx('font-mono text-[11px] leading-none', s.tone || 'text-amber-300')}>{s.value}</span>
          </button>
        ))}
      </div>

      {active && (
        <div className="mt-2 rounded-lg border border-amber-400/30 bg-black/90 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-stone-400">
              <active.icon className="h-3.5 w-3.5" /> {active.label}
            </span>
            <button type="button" aria-label="Close setting" onClick={() => setOpen(null)} className="text-stone-500">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={`Decrease ${active.label}`}
              onClick={() => { sfx.click(); active.onPrev(); }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-stone-200 active:bg-amber-400/20"
              style={{ touchAction: 'none' }}
            >
              <Minus className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <input
                aria-label={active.label}
                type="range"
                min={active.slider.min}
                max={active.slider.max}
                step={active.slider.step}
                value={active.slider.value}
                onChange={(e) => active.slider.onChange(parseFloat(e.target.value))}
                className="h-3 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-amber-400"
              />
              <p className="mt-1.5 text-center font-mono text-base text-amber-300">{active.value}</p>
            </div>
            <button
              type="button"
              aria-label={`Increase ${active.label}`}
              onClick={() => { sfx.click(); active.onNext(); }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-stone-200 active:bg-amber-400/20"
              style={{ touchAction: 'none' }}
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
