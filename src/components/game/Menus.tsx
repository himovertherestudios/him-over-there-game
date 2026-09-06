import React, { useState } from 'react';
import { Crown, Save, FolderOpen, Keyboard, User, SlidersHorizontal, Volume2, VolumeX, X, Check, Backpack, Shirt, ShoppingCart, Coffee, Dumbbell, Tv, Users } from 'lucide-react';
import { useGame, getState, set, saveGame, loadGame, fmtMoney, addMoney, say, updateJob, track } from '@/game/store';
import { GEAR, FITS, FOOD, MOOD_TILES, Mishap } from '@/game/data';
import { IMG } from '@/game/imgs';
import { Btn, Panel, Chip, Bar, cx } from './ui';
import { CONTROLS } from './TitleScreen';
import { sfx } from '@/game/audio';
import { engine } from '@/game/engine';
import { sleep, eat, gym, relaxTV, networkAtBar, resolveMishap } from '@/game/actions';

// ---------------------------------------------------------------
export const PauseMenu: React.FC<{ onClose: () => void; onQuit: () => void }> = ({ onClose, onQuit }) => {
  const s = useGame((g) => g);
  const [tab, setTab] = useState<'main' | 'controls' | 'character' | 'settings'>('main');
  const [saved, setSaved] = useState(false);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <Panel className="w-[min(880px,95vw)]" title="Paused" right={<Btn size="sm" variant="ghost" onClick={onClose}><X className="h-3.5 w-3.5" /> Resume</Btn>}>
        <div className="flex flex-wrap gap-1 border-b border-white/10 px-4 py-2">
          {([['main', 'Game', Crown], ['character', 'Character', User], ['controls', 'Controls', Keyboard], ['settings', 'Settings', SlidersHorizontal]] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => { sfx.click(); setTab(id); }}
              className={cx('inline-flex items-center gap-1.5 rounded px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors', tab === id ? 'bg-amber-400 text-black' : 'text-stone-400 hover:text-stone-100')}>
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>

        {tab === 'main' && (
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Btn variant="gold" className="w-full" onClick={() => { setSaved(saveGame()); window.setTimeout(() => setSaved(false), 1800); }}>
                <Save className="h-3.5 w-3.5" /> {saved ? 'Saved' : 'Save game'}
              </Btn>
              <Btn className="w-full" onClick={() => { if (loadGame()) { engine.refreshPlayerLook(); onClose(); } }}><FolderOpen className="h-3.5 w-3.5" /> Load last save</Btn>
              <Btn variant="ghost" className="w-full" onClick={onClose}>Resume</Btn>
              <Btn variant="danger" className="w-full" onClick={() => { saveGame(); onQuit(); }}>Save &amp; quit to title</Btn>
            </div>
            <div className="space-y-2 rounded-md border border-white/10 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">Skills</p>
              {(Object.keys(s.skills) as (keyof typeof s.skills)[]).map((k) => (
                <Bar key={k} value={s.skills[k]} label={k} color="bg-amber-400" small />
              ))}
              <p className="pt-1 font-mono text-[10px] text-stone-500">Day {s.day} &middot; {fmtMoney(s.money)} &middot; Rep {Math.round(s.rep)}</p>
            </div>
          </div>
        )}

        {tab === 'character' && (
          <div className="grid gap-4 p-5 lg:grid-cols-[1.3fr_1fr]">
            <img src={IMG.concept} alt="Him Over There character concept sheet" className="w-full rounded-lg border border-white/10" />
            <div className="space-y-3">
              <div>
                <h4 style={{ fontFamily: '"Bradley Hand","Segoe Script",cursive' }} className="text-2xl text-amber-300">Him Over There</h4>
                <p className="text-[11px] leading-relaxed text-stone-400">
                  Photographer, explorer, storyteller. Locs with honey tips, full beard, black tee, olive-black cargos,
                  brown harness across the chest. Chicago made him; the background check didn&apos;t.
                </p>
              </div>
              <div className="space-y-1.5 rounded-md border border-white/10 p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">Wardrobe</p>
                {FITS.filter((f) => s.ownedFits.includes(f.id)).map((f) => (
                  <button key={f.id} type="button" onClick={() => { sfx.click(); set({ fit: f.id }); engine.refreshPlayerLook(); }}
                    className={cx('flex w-full items-center justify-between rounded border px-2 py-1.5 text-left text-[11px] transition-colors', s.fit === f.id ? 'border-amber-400/60 bg-amber-400/10 text-amber-200' : 'border-white/10 text-stone-300 hover:border-white/30')}>
                    <span>{f.name}</span>{s.fit === f.id && <Check className="h-3 w-3" />}
                  </button>
                ))}
                <Btn size="sm" className="w-full" onClick={() => { set({ locsTied: !getState().locsTied }); engine.refreshPlayerLook(); }}>
                  Locs: {s.locsTied ? 'Tied up' : 'Hanging'}
                </Btn>
              </div>
              <p className="text-[10px] text-stone-500">Title: <span className="text-amber-300">{s.rep >= 85 ? 'Studio Owner' : s.rep >= 60 ? 'Established Photographer' : s.rep >= 35 ? 'Working Photographer' : s.rep >= 15 ? 'Hustling Freelancer' : 'Unknown Photographer'}</span></p>
            </div>
          </div>
        )}

        {tab === 'controls' && (
          <dl className="grid gap-x-8 gap-y-1 p-5 sm:grid-cols-2">
            {CONTROLS.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 border-b border-white/5 py-1.5">
                <dt className="font-mono text-[10px] uppercase tracking-wider text-amber-300">{k}</dt>
                <dd className="text-right text-[11px] text-stone-400">{v}</dd>
              </div>
            ))}
          </dl>
        )}

        {tab === 'settings' && (
          <div className="space-y-4 p-5">
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-stone-500">Quality</p>
              <div className="flex gap-1.5">
                {(['low', 'med', 'high'] as const).map((q) => (
                  <Btn key={q} variant={s.quality === q ? 'gold' : 'dark'} onClick={() => { set({ quality: q }); engine.resize(); }}>{q}</Btn>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-stone-500">Audio</p>
              <Btn variant={s.muted ? 'dark' : 'gold'} onClick={() => { const m = !getState().muted; set({ muted: m }); sfx.setMuted(m); }}>
                {s.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />} {s.muted ? 'Muted' : 'Sound on'}
              </Btn>
            </div>
            <p className="text-[10px] text-stone-500">Rated M-style: language and grown-folks business. No crime, no weapons, no explicit content.</p>
          </div>
        )}
      </Panel>
    </div>
  );
};

// ---------------------------------------------------------------
export const Moodboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const job = useGame((s) => s.job);
  const [sel, setSel] = useState<string[]>(job?.concept || []);
  if (!job) return null;
  return (
    <Panel title="Moodboard \u2014 pick 3 references" className="w-[min(760px,95vw)]" right={<Btn size="sm" variant="ghost" onClick={onClose}>Close</Btn>}>
      <div className="p-4">
        <p className="mb-3 text-[11px] text-stone-500">Three tiles set the concept. The concept is what {job.name} will judge the gallery against.</p>
        <div className="grid grid-cols-3 gap-2">
          {MOOD_TILES.map((t) => {
            const on = sel.includes(t.concept);
            return (
              <button key={t.id} type="button"
                onClick={() => { sfx.click(); setSel((v) => (v.includes(t.concept) ? v.filter((x) => x !== t.concept) : v.length >= 3 ? v : [...v, t.concept])); }}
                className={cx('group relative aspect-[4/3] overflow-hidden rounded-md border-2 transition-all', on ? 'border-amber-400 scale-[0.98]' : 'border-white/10 hover:border-white/40')}>
                <span className={cx('absolute inset-0 bg-gradient-to-br', t.hue)} />
                <span className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-left text-[10px] text-stone-200">{t.label}</span>
                {on && <Check className="absolute right-1.5 top-1.5 h-4 w-4 text-amber-300" />}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">{sel.length}/3 chosen</span>
          <Btn variant="gold" disabled={sel.length !== 3} onClick={() => { updateJob({ concept: sel, stage: 'packing' }); say(`Concept locked: ${sel.join(' / ')}. Now pack the bag.`, 'good'); onClose(); }}>Lock the concept</Btn>
        </div>
      </div>
    </Panel>
  );
};

// ---------------------------------------------------------------
export const PackGear: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const s = useGame((g) => g);
  const [packed, setPacked] = useState<string[]>(s.packed);
  const slots = 4;
  return (
    <Panel title="Pack gear \u2014 trunk has 3 slots + the bag" className="w-[min(620px,95vw)]" right={<Btn size="sm" variant="ghost" onClick={onClose}>Close</Btn>}>
      <div className="p-4">
        <p className="mb-3 text-[11px] text-stone-500">Whatever isn&apos;t in the bag is at home when it breaks. Camera and a lens are the minimum.</p>
        <div className="space-y-1.5">
          {s.ownedGear.map((id) => {
            const g = GEAR.find((x) => x.id === id)!;
            const on = packed.includes(id);
            return (
              <button key={id} type="button"
                onClick={() => { sfx.click(); setPacked((v) => (v.includes(id) ? v.filter((x) => x !== id) : v.length >= slots ? v : [...v, id])); }}
                className={cx('flex w-full items-center justify-between rounded border px-3 py-2 text-left transition-colors', on ? 'border-amber-400/60 bg-amber-400/10' : 'border-white/10 hover:border-white/30')}>
                <span>
                  <span className="block text-[11px] text-stone-200">{g.name}</span>
                  <span className="block text-[9px] text-stone-500">{g.benefit}</span>
                </span>
                {on ? <Check className="h-4 w-4 text-amber-300" /> : <Backpack className="h-3.5 w-3.5 text-stone-600" />}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">{packed.length}/{slots} slots</span>
          <Btn variant="gold" onClick={() => {
            set({ packed });
            if (getState().job?.stage === 'packing') updateJob({ stage: 'travel' });
            say(packed.includes('battery') ? 'Bag\u2019s loaded. Spare battery in the side pocket like a professional.' : 'Bag\u2019s loaded. No spare battery. Bold.', 'info');
            onClose();
          }}>Load the trunk</Btn>
        </div>
      </div>
    </Panel>
  );
};

// ---------------------------------------------------------------
export const Store: React.FC<{ kind: 'gear' | 'fits'; onClose: () => void }> = ({ kind, onClose }) => {
  const s = useGame((g) => g);
  return (
    <Panel title={kind === 'gear' ? 'Aperture Alley' : 'Fresh Fit'} className="w-[min(640px,95vw)]" right={<Btn size="sm" variant="ghost" onClick={onClose}>Leave</Btn>}>
      <div className="p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-stone-500">Balance {fmtMoney(s.money)}</p>
        <div className="space-y-1.5">
          {kind === 'gear' ? GEAR.filter((g) => g.price > 0).map((g) => {
            const owned = s.ownedGear.includes(g.id);
            return (
              <div key={g.id} className="flex items-center justify-between rounded border border-white/10 px-3 py-2">
                <div>
                  <p className="text-[11px] text-stone-200">{g.name} {owned && <Chip tone="good">owned</Chip>}</p>
                  <p className="text-[9px] text-stone-500">{g.blurb} &middot; {g.benefit}</p>
                </div>
                {!owned && (
                  <Btn size="sm" variant="gold" disabled={s.money < g.price} onClick={() => {
                    addMoney(-g.price, `Aperture Alley \u2014 ${g.name}`);
                    set({ ownedGear: [...getState().ownedGear, g.id] });
                    sfx.cash();
                    track('purchase', { revenue: g.price, product: g.name });
                    say(`${g.name}. Modest technical benefit, immodest price.`, 'money');
                  }}>{fmtMoney(g.price)}</Btn>
                )}
              </div>
            );
          }) : FITS.filter((f) => f.price > 0).map((f) => {
            const owned = s.ownedFits.includes(f.id);
            return (
              <div key={f.id} className="flex items-center justify-between rounded border border-white/10 px-3 py-2">
                <div>
                  <p className="text-[11px] text-stone-200">{f.name} {owned && <Chip tone="good">owned</Chip>}</p>
                  <p className="text-[9px] text-stone-500">{f.desc}</p>
                </div>
                {owned ? (
                  <Btn size="sm" onClick={() => { set({ fit: f.id }); engine.refreshPlayerLook(); say(`${f.name}. Different angles, same dude.`); }}>Wear it</Btn>
                ) : (
                  <Btn size="sm" variant="gold" disabled={s.money < f.price} onClick={() => {
                    addMoney(-f.price, `Fresh Fit \u2014 ${f.name}`);
                    set({ ownedFits: [...getState().ownedFits, f.id], fit: f.id });
                    engine.refreshPlayerLook();
                    sfx.cash();
                    track('purchase', { revenue: f.price, product: f.name });
                  }}>{fmtMoney(f.price)}</Btn>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
};

// ---------------------------------------------------------------
export const LifeMenu: React.FC<{ kind: string; onClose: () => void }> = ({ kind, onClose }) => {
  const s = useGame((g) => g);
  const opt = (icon: React.ElementType, label: string, sub: string, fn: () => void) => {
    const Icon = icon;
    return (
      <button type="button" onClick={() => { sfx.click(); fn(); onClose(); }}
        className="flex w-full items-center gap-3 rounded border border-white/10 px-3 py-2.5 text-left transition-colors hover:border-amber-400/50 hover:bg-amber-400/5">
        <Icon className="h-4 w-4 shrink-0 text-amber-400" />
        <span><span className="block text-[11px] text-stone-200">{label}</span><span className="block text-[9.5px] text-stone-500">{sub}</span></span>
      </button>
    );
  };
  const titles: Record<string, string> = { bed: 'Sleep', kitchen: 'Kitchenette', order: 'Grind House Coffee', tv: 'Downtime', network: 'The Low End', gym: 'Gym' };
  return (
    <Panel title={titles[kind] || 'Life'} className="w-[min(520px,95vw)]" right={<Btn size="sm" variant="ghost" onClick={onClose}>Close</Btn>}>
      <div className="space-y-2 p-4">
        <div className="mb-2 grid grid-cols-3 gap-2">
          <Bar value={s.energy} label="Energy" color="bg-emerald-400" small />
          <Bar value={s.stress} label="Stress" color="bg-red-400" small />
          <Bar value={s.hunger} label="Hunger" color="bg-amber-400" small />
        </div>
        {kind === 'bed' && opt(Crown, 'Sleep until morning', 'Energy +65, stress down, time passes', sleep)}
        {kind === 'bed' && opt(Tv, 'Work late instead', 'Editing goes faster, stress climbs', () => { relaxTV(); })}
        {(kind === 'kitchen' || kind === 'order') && FOOD.filter((f) => (kind === 'kitchen' ? f.id === 'ramen' || f.id === 'sandwich' : f.id === 'coffee' || f.id === 'harolds')).map((f) => (
          <div key={f.id}>{opt(Coffee, `${f.name} \u2014 ${fmtMoney(f.price)}`, `Energy +${f.energy}, hunger +${f.hunger}`, () => eat(f.id))}</div>
        ))}
        {kind === 'order' && opt(Users, 'Sit and listen', 'Overhear an inquiry if you\u2019re lucky', () => { networkAtBar(); })}
        {kind === 'tv' && opt(Tv, 'Two episodes and a nap', 'Stress \u221210', relaxTV)}
        {kind === 'network' && opt(Users, 'Work the room', '$18 in drinks, networking skill up, maybe a client', networkAtBar)}
        {kind === 'gym' && opt(Dumbbell, 'Lift', 'Stress \u221216, energy cap goes up over time', gym)}
      </div>
    </Panel>
  );
};

// ---------------------------------------------------------------
export const MishapModal: React.FC<{ mishap: Mishap; onDone: () => void }> = ({ mishap, onDone }) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
    <Panel title="Well." className="w-[min(560px,95vw)]">
      <div className="p-5">
        <h4 className="text-lg font-semibold text-amber-300">{mishap.title}</h4>
        <p className="mt-1 text-[12px] text-stone-400">{mishap.text}</p>
        <div className="mt-4 space-y-1.5">
          {mishap.options.map((o, i) => (
            <button key={o.label} type="button" onClick={() => { sfx.click(); if (resolveMishap(mishap, i)) onDone(); }}
              className="flex w-full items-center justify-between rounded border border-white/10 px-3 py-2 text-left text-[11px] text-stone-200 transition-colors hover:border-amber-400/60 hover:bg-amber-400/5">
              <span>{o.label}</span>
              <span className="font-mono text-[9px] text-stone-500">
                {o.needs ? `needs: ${o.needs}` : ''}{o.money ? ` ${fmtMoney(o.money)}` : ''}{o.rep ? ` rep ${o.rep > 0 ? '+' : ''}${o.rep}` : ''}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Panel>
  </div>
);

// ---------------------------------------------------------------
export const GasPopup: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const s = useGame((g) => g);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
      <Panel title="ShutterMarket \u2014 deal alert" className="w-[min(480px,95vw)]">
        <div className="p-5 text-center">
          <ShoppingCart className="mx-auto mb-2 h-7 w-7 text-amber-400" />
          <p className="font-mono text-[11px] leading-relaxed text-stone-300">
            BANK: {fmtMoney(s.money)}<br />RENT DUE: $1,700<br />NEW 85MM f/1.8: $2,399
          </p>
          <p className="mt-3 text-sm italic text-stone-400">&hellip;but look at that bokeh though.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Btn onClick={() => { say('Responsible. Boring. Correct.'); onClose(); }}>Be responsible</Btn>
            <Btn variant="gold" disabled={s.money < 2399} onClick={() => {
              addMoney(-2399, 'ShutterMarket \u2014 85mm f/1.8');
              set({ ownedGear: [...getState().ownedGear, 'lens-85'] });
              sfx.cash();
              track('purchase', { revenue: 2399, product: 'Corvid 85mm f/1.8' });
              say('Bought it. Rent is a future problem. Compression is now.', 'money');
              onClose();
            }}>Buy it (regret later)</Btn>
          </div>
        </div>
      </Panel>
    </div>
  );
};

// ---------------------------------------------------------------
export const StudioUnlock: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-6">
    <div className="max-w-2xl text-center">
      <img src={IMG.skyline} alt="" className="mb-6 w-full rounded-lg opacity-40" />
      <p style={{ fontFamily: '"Bradley Hand","Segoe Script",cursive', textWrap: 'balance' }} className="text-3xl leading-snug text-stone-100 sm:text-4xl">
        &ldquo;Nobody can tell me I&rsquo;m not qualified for this.&rdquo;
      </p>
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.3em] text-amber-400">To be continued &mdash; Act 2: Him Over There</p>
      <p className="mt-2 text-[11px] text-stone-500">Free play continues. Loft 4B is yours now.</p>
      <Btn variant="gold" className="mt-6" onClick={onClose}>Keep going</Btn>
    </div>
  </div>
);

export { Shirt };
