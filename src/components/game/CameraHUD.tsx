import React, { useEffect, useState } from 'react';
import { Aperture, Timer, Gauge, Focus, Sun, RotateCw, Grid3x3, Lightbulb, Users, X, Camera } from 'lucide-react';
import { engine } from '@/game/engine';
import { useGame, getState } from '@/game/store';
import { DIRECTIONS, APERTURES, SHUTTERS, ISOS, WBS, fmtShutter } from '@/game/data';
import { directSubject } from '@/game/actions';
import { Btn, Chip, cx } from './ui';
import { sfx } from '@/game/audio';
import { useDeviceProfile } from '@/game/platform/device';
import { MobileCameraControls } from './mobile/MobileCameraControls';

const Stepper: React.FC<{
  icon: React.ElementType; label: string; value: string; onPrev: () => void; onNext: () => void; tone?: string;
}> = ({ icon: Icon, label, value, onPrev, onNext, tone }) => (
  <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/70 px-2 py-1">
    <Icon className="h-3.5 w-3.5 text-stone-500" />
    <div className="min-w-[62px]">
      <p className="font-mono text-[8px] uppercase tracking-wider text-stone-500">{label}</p>
      <p className={cx('font-mono text-[12px] leading-tight', tone || 'text-amber-300')}>{value}</p>
    </div>
    <div className="flex flex-col">
      <button type="button" aria-label={`${label} up`} onClick={() => { sfx.click(); onNext(); }} className="px-1 text-[9px] leading-none text-stone-500 hover:text-amber-300">&#9650;</button>
      <button type="button" aria-label={`${label} down`} onClick={() => { sfx.click(); onPrev(); }} className="px-1 text-[9px] leading-none text-stone-500 hover:text-amber-300">&#9660;</button>
    </div>
  </div>
);

export const CameraHUD: React.FC<{ onCapture: () => void; onExit: () => void; shots: number; maxShots: number }> = ({ onCapture, onExit, shots, maxShots }) => {
  const [, force] = useState(0);
  const [tab, setTab] = useState<'cam' | 'light' | 'direct'>('cam');
  const job = useGame((s) => s.job);
  const [tip, setTip] = useState<string | null>('Closer light = softer light, faster falloff.');
  const device = useDeviceProfile();

  useEffect(() => {
    engine.onCamChange = () => force((v) => v + 1);
    const id = window.setInterval(() => force((v) => v + 1), 180);
    return () => { engine.onCamChange = null; window.clearInterval(id); };
  }, []);

  const c = engine.cam;
  const L = engine.light;
  const meter = engine.meterError();
  const conf = engine.subjectConfidence;

  // AF bracket: tracks the subject on screen when there's one to focus on,
  // otherwise sits centered like a rangefinder's default focus point.
  // Turns green using the same circle-of-confusion math scoreShot() grades
  // photos on, so "locked" here means the frame would actually score sharp.
  let afPos = { x: 50, y: 50 };
  let afLocked = false;
  if (engine.subject) {
    const head = engine.subjectHeadPos().clone().project(engine.camera);
    if (head.z <= 1) {
      const x = (head.x + 1) / 2, y = (1 - head.y) / 2;
      if (x > -0.15 && x < 1.15 && y > -0.15 && y < 1.15) {
        afPos = { x: x * 100, y: y * 100 };
        const subjDist = engine.camera.position.distanceTo(engine.subjectHeadPos());
        const coc = Math.abs(c.focus - subjDist) * (c.focal / 50) / Math.max(1.2, c.aperture);
        afLocked = coc < 0.2;
      }
    }
  }

  const step = <T,>(arr: T[], cur: T, dir: number): T => {
    const i = arr.indexOf(cur);
    return arr[Math.max(0, Math.min(arr.length - 1, (i < 0 ? 0 : i) + dir))];
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {/* viewfinder frame */}
      <div className="absolute inset-0 border-[10px] border-black/70" />

      {/* AF-area corner brackets, inset from the frame like a mirrorless
          viewfinder's focus-zone boundary — clear of the corner chips */}
      <div className="absolute left-[9%] top-[13%] h-6 w-6 border-l-2 border-t-2 border-white/40" />
      <div className="absolute right-[9%] top-[13%] h-6 w-6 border-r-2 border-t-2 border-white/40" />
      <div className="absolute bottom-[13%] left-[9%] h-6 w-6 border-b-2 border-l-2 border-white/40" />
      <div className="absolute bottom-[13%] right-[9%] h-6 w-6 border-b-2 border-r-2 border-white/40" />

      {/* AF bracket: on the subject when there is one, centered otherwise */}
      <div
        className={cx('absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 transition-colors duration-150',
          afLocked ? 'border-emerald-400' : 'border-white/60')}
        style={{ left: `${afPos.x}%`, top: `${afPos.y}%` }}
      >
        <div className={cx('absolute -left-1 -top-1 h-2 w-2 border-l-2 border-t-2', afLocked ? 'border-emerald-400' : 'border-white/60')} />
        <div className={cx('absolute -right-1 -top-1 h-2 w-2 border-r-2 border-t-2', afLocked ? 'border-emerald-400' : 'border-white/60')} />
        <div className={cx('absolute -bottom-1 -left-1 h-2 w-2 border-b-2 border-l-2', afLocked ? 'border-emerald-400' : 'border-white/60')} />
        <div className={cx('absolute -bottom-1 -right-1 h-2 w-2 border-b-2 border-r-2', afLocked ? 'border-emerald-400' : 'border-white/60')} />
      </div>

      <div className="absolute left-6 top-6 flex items-center gap-2">
        <Chip tone="gold">VIEWFINDER</Chip>
        <span className="font-mono text-[10px] text-stone-400">{shots}/{maxShots} FRAMES</span>
        {shots >= maxShots && <Chip tone="bad">CARD FULL</Chip>}
      </div>

      {/* exposure meter */}
      <div className="absolute left-1/2 top-6 w-64 -translate-x-1/2 rounded-md border border-white/10 bg-black/70 px-3 py-1.5">
        <div className="relative h-4">
          {[-3, -2, -1, 0, 1, 2, 3].map((n) => (
            <span key={n} className="absolute top-0 font-mono text-[8px] text-stone-600" style={{ left: `${((n + 3) / 6) * 100}%`, transform: 'translateX(-50%)' }}>{n === 0 ? '0' : n > 0 ? `+${n}` : n}</span>
          ))}
          <div className="absolute bottom-0 h-px w-full bg-white/20" />
          <div
            className={cx('absolute bottom-0 h-3 w-0.5 transition-all duration-150', Math.abs(meter) < 0.4 ? 'bg-emerald-400' : Math.abs(meter) < 1.2 ? 'bg-amber-400' : 'bg-red-500')}
            style={{ left: `${Math.max(0, Math.min(100, ((-meter + 3) / 6) * 100))}%` }}
          />
        </div>
        <p className="mt-0.5 text-center font-mono text-[8px] uppercase tracking-widest text-stone-500">
          {Math.abs(meter) < 0.4 ? 'Exposure good' : meter > 0 ? 'Underexposed' : 'Overexposed'}
        </p>
      </div>

      {/* subject confidence */}
      {job && (
        <div className="absolute right-6 top-6 w-44 rounded-md border border-white/10 bg-black/70 p-2">
          <p className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-stone-400">
            <span>{job.name}</span><span className={conf > 65 ? 'text-emerald-300' : conf > 35 ? 'text-amber-300' : 'text-red-400'}>{Math.round(conf)}</span>
          </p>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div className={cx('h-full transition-all duration-500', conf > 65 ? 'bg-emerald-400' : conf > 35 ? 'bg-amber-400' : 'bg-red-500')} style={{ width: `${conf}%` }} />
          </div>
          <p className="mt-1 text-[9px] leading-snug text-stone-500">
            {conf > 75 ? 'Loose, moving on her own, giving you options.' : conf > 45 ? 'Warming up. Keep talking.' : 'Stiff. Shoulders at her ears.'}
          </p>
        </div>
      )}

      {/* tabs */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 w-[min(940px,94vw)] -translate-x-1/2">
        <div className="mb-2 flex items-center justify-center gap-1">
          {([['cam', 'Camera', Camera], ['light', 'Light', Lightbulb], ['direct', 'Direct', Users]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => { sfx.click(); setTab(id); }}
              className={cx('inline-flex items-center gap-1.5 rounded-t-md border-x border-t px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors',
                tab === id ? 'border-amber-400/40 bg-black/85 text-amber-300' : 'border-white/10 bg-black/50 text-stone-500 hover:text-stone-300')}
            >
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-white/12 bg-black/85 p-3 backdrop-blur">
          {tab === 'cam' && (
            <div className="flex flex-col items-center gap-2">
              {device.isMobile ? (
                <MobileCameraControls c={c} />
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Stepper icon={Aperture} label="Aperture" value={`f/${c.aperture}`} onPrev={() => engine.setCam({ aperture: step(APERTURES, c.aperture, -1) })} onNext={() => engine.setCam({ aperture: step(APERTURES, c.aperture, 1) })} />
                  <Stepper icon={Timer} label="Shutter" value={fmtShutter(c.shutter)} tone={c.shutter > 1 / 125 ? 'text-red-400' : 'text-amber-300'} onPrev={() => engine.setCam({ shutter: step(SHUTTERS, c.shutter, -1) })} onNext={() => engine.setCam({ shutter: step(SHUTTERS, c.shutter, 1) })} />
                  <Stepper icon={Gauge} label="ISO" value={`${c.iso}`} tone={c.iso > 3200 ? 'text-red-400' : 'text-amber-300'} onPrev={() => engine.setCam({ iso: step(ISOS, c.iso, -1) })} onNext={() => engine.setCam({ iso: step(ISOS, c.iso, 1) })} />
                  <Stepper icon={Focus} label="Focal" value={`${c.focal}mm`} onPrev={() => engine.setCam({ focal: Math.max(24, c.focal - 5) })} onNext={() => engine.setCam({ focal: Math.min(getState().ownedGear.includes('lens-85') ? 85 : 70, c.focal + 5) })} />
                  <Stepper icon={Focus} label="Focus" value={`${c.focus.toFixed(2)}m`} onPrev={() => engine.setCam({ focus: Math.max(0.4, c.focus - 0.1) })} onNext={() => engine.setCam({ focus: Math.min(20, c.focus + 0.1) })} />
                  <Stepper icon={Sun} label="WB" value={c.wb === 'Auto' ? 'Auto' : `${c.kelvin}K`} onPrev={() => engine.setCam({ wb: step(WBS, c.wb, -1) })} onNext={() => engine.setCam({ wb: step(WBS, c.wb, 1) })} />
                  <Stepper icon={Sun} label="Kelvin" value={`${c.kelvin}K`} onPrev={() => engine.setCam({ kelvin: Math.max(2500, c.kelvin - 250) })} onNext={() => engine.setCam({ kelvin: Math.min(9000, c.kelvin + 250) })} />
                </div>
              )}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Btn size={device.isMobile ? 'md' : 'sm'} className={device.isMobile ? 'h-11 px-4' : undefined} onClick={() => engine.setCam({ portrait: !c.portrait })}><RotateCw className="h-3 w-3" /> {c.portrait ? 'Portrait' : 'Landscape'}</Btn>
                <Btn size={device.isMobile ? 'md' : 'sm'} className={device.isMobile ? 'h-11 px-4' : undefined} onClick={() => engine.setCam({ grid: !c.grid })}><Grid3x3 className="h-3 w-3" /> Thirds {c.grid ? 'on' : 'off'}</Btn>
                <Btn size={device.isMobile ? 'md' : 'sm'} className={device.isMobile ? 'h-11 px-4' : undefined} onClick={() => engine.setCam({ height: c.height <= 1.1 ? 1.55 : c.height >= 1.9 ? 1.1 : 2.0 })}>Height {c.height <= 1.1 ? 'Low' : c.height >= 1.9 ? 'High' : 'Eye'}</Btn>
              </div>
            </div>
          )}

          {tab === 'light' && (
            <div className={cx('grid grid-cols-2 gap-4', !device.isMobile && 'md:grid-cols-4')}>
              <label className="block">
                <span className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-wider text-stone-400"><span>Power</span><span className="text-amber-300">1/{Math.round(1 / Math.max(0.015, L.power))}</span></span>
                <input aria-label="Light power" type="range" min={0.015} max={1} step={0.015} value={L.power} onChange={(e) => engine.setLight({ power: parseFloat(e.target.value) })} className={cx('w-full accent-amber-400', device.isMobile && 'h-3')} />
              </label>
              <label className="block">
                <span className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-wider text-stone-400"><span>Distance</span><span className="text-amber-300">{engine.lightDistance().toFixed(1)}m</span></span>
                <input
                  aria-label="Light distance" type="range" min={0.8} max={6} step={0.1}
                  value={Math.min(6, engine.lightDistance())}
                  onChange={(e) => {
                    const d = parseFloat(e.target.value);
                    const a = Math.atan2(engine.light.z - engine.subjectPos.z, engine.light.x - engine.subjectPos.x);
                    engine.setLight({ x: engine.subjectPos.x + Math.cos(a) * d, z: engine.subjectPos.z + Math.sin(a) * d });
                    setTip('Closer light = softer light, faster falloff.');
                  }}
                  className={cx('w-full accent-amber-400', device.isMobile && 'h-3')}
                />
              </label>
              <label className="block">
                <span className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-wider text-stone-400"><span>Angle</span><span className="text-amber-300">{Math.round(L.angle * 57)}&deg;</span></span>
                <input
                  aria-label="Light angle" type="range" min={-3.14} max={3.14} step={0.05} value={L.angle}
                  onChange={(e) => {
                    const a = parseFloat(e.target.value);
                    const d = engine.lightDistance() || 2;
                    engine.setLight({ angle: a, x: engine.subjectPos.x + Math.cos(a) * d, z: engine.subjectPos.z + Math.sin(a) * d });
                    setTip('45\u00b0 off the nose and a little above = Rembrandt. Straight on = flat.');
                  }}
                  className={cx('w-full accent-amber-400', device.isMobile && 'h-3')}
                />
              </label>
              <label className="block">
                <span className="mb-1 flex justify-between font-mono text-[9px] uppercase tracking-wider text-stone-400"><span>Height</span><span className="text-amber-300">{L.height.toFixed(1)}m</span></span>
                <input aria-label="Light height" type="range" min={0.8} max={3} step={0.1} value={L.height} onChange={(e) => engine.setLight({ height: parseFloat(e.target.value) })} className={cx('w-full accent-amber-400', device.isMobile && 'h-3')} />
              </label>
              <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-4">
                <Btn size="sm" variant={L.on ? 'gold' : 'dark'} onClick={() => engine.setLight({ on: !L.on })}>{L.on ? 'Strobe ON' : 'Strobe OFF'}</Btn>
                <Btn size="sm" variant={L.modifier === 'softbox' ? 'gold' : 'dark'} onClick={() => { engine.setLight({ modifier: 'softbox' }); setTip('Softbox: bigger source, softer shadow edge.'); }}>Softbox</Btn>
                <Btn size="sm" variant={L.modifier === 'bare' ? 'gold' : 'dark'} onClick={() => { engine.setLight({ modifier: 'bare' }); setTip('Bare bulb: small source, hard-edged shadows. Use it on purpose.'); }}>Bare</Btn>
                <Btn size="sm" variant={L.reflector ? 'gold' : 'dark'} onClick={() => { engine.setLight({ reflector: !L.reflector }); setTip('Reflector opposite the key fills the shadow side for free.'); }}>Reflector</Btn>
                {tip && <span className="text-[9.5px] text-stone-500">{tip}</span>}
              </div>
            </div>
          )}

          {tab === 'direct' && (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
              {DIRECTIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    sfx.click();
                    const poseMap: Record<string, Record<string, unknown>> = {
                      'chin-down': { chin: -0.35 }, 'chin-up': { chin: 0.3 },
                      'eyes-cam': { eyes: 0 }, 'eyes-away': { eyes: 1 },
                      smize: { expression: 'smize' }, laugh: { expression: 'laugh' }, serious: { expression: 'serious' },
                      'hands-hips': { hands: 'hips' }, 'hands-hair': { hands: 'hair' }, 'hands-pockets': { hands: 'pockets' },
                      weight: { weight: 0.8 }, lean: { stance: 'lean' }, walk: { stance: 'walk' },
                    };
                    if (poseMap[d.id]) engine.setPose(poseMap[d.id] as never);
                    directSubject(d.id, d.conf, d.pose, d.line);
                  }}
                  className={cx('rounded border px-2 py-1.5 text-left text-[10px] transition-colors',
                    d.conf < 0 ? 'border-red-500/25 text-red-300/80 hover:border-red-400/60' : 'border-white/10 text-stone-300 hover:border-amber-400/60 hover:bg-amber-400/5')}
                >
                  <span className="block font-mono text-[8px] uppercase tracking-wider text-stone-600">{d.group}</span>
                  {d.label}
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-2">
            {!device.isMobile && (
              <p className="font-mono text-[9px] uppercase tracking-wider text-stone-600">
                WASD move &middot; drag to aim &middot; wheel = focus &middot; shift+wheel = zoom &middot; click subject = autofocus
              </p>
            )}
            {device.isMobile && (
              <p className="font-mono text-[9px] uppercase tracking-wider text-stone-600">
                Drag to aim &middot; tap subject to autofocus
              </p>
            )}
            <div className={cx('flex items-center gap-2', device.isMobile && 'mr-20')}>
              <Btn
                variant="gold"
                size={device.isMobile ? undefined : 'lg'}
                onClick={onCapture}
                disabled={shots >= maxShots}
                className={device.isMobile ? 'h-16 w-16 rounded-full !p-0' : undefined}
              >
                <Camera className={device.isMobile ? 'h-6 w-6' : 'h-4 w-4'} />
                {!device.isMobile && 'Shoot (Space)'}
              </Btn>
              <Btn variant="ghost" onClick={onExit}><X className="h-3.5 w-3.5" /> Lower camera{!device.isMobile && ' (C)'}</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
