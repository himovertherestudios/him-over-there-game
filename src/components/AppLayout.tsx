import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Crown, Play, RotateCcw, Keyboard, Camera, Map, Smartphone, Wallet } from 'lucide-react';
import { Cinematic, CONTROLS, MOBILE_CONTROLS } from './game/TitleScreen';
import { useGame, getState, set, newGame, loadGame, hasSave, makeInquiry, pushInquiry, say, track } from '@/game/store';
import { sfx } from '@/game/audio';
import { IMG } from '@/game/imgs';
import { useDeviceProfile } from '@/game/platform/device';

// GameScreen pulls in the three.js engine, world builder, and every gameplay
// UI panel — real weight the title/intro screens never need. Loading it as
// its own chunk keeps the first paint light; loadGameScreen() below is also
// called as soon as the intro cinematic starts so it's typically already
// cached by the time the player reaches actual gameplay.
const loadGameScreen = () => import('./game/GameScreen');
const GameScreen = lazy(() => loadGameScreen().then((m) => ({ default: m.GameScreen })));

const GameLoading: React.FC = () => (
  <div className="flex h-screen w-full items-center justify-center bg-black">
    <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-amber-400/80">Loading Bronzewood&hellip;</p>
  </div>
);

const FEATURES: { icon: React.ElementType; title: string; body: string }[] = [
  { icon: Camera, title: 'Real photography', body: 'Aperture, shutter, ISO, focal length, focus and white balance change the frame you actually capture. Missed focus stays missed.' },
  { icon: Map, title: 'One district, walkable', body: 'Bronzewood: brick, concrete, a viaduct with a train, parking you will resent, and a studio you cannot afford yet.' },
  { icon: Smartphone, title: 'The phone runs the business', body: 'Inquiries, negotiation, packages, deposits, contracts, banking, and a portfolio that only fills up if you shoot.' },
  { icon: Wallet, title: 'Revenue is not profit', body: 'Rent drafts on the 1st. Gear is a want. Skill and light beat a $2,399 lens every single time.' },
];

const AppLayout: React.FC = () => {
  const screen = useGame((s) => s.screen);
  const [saveExists, setSaveExists] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const device = useDeviceProfile();

  useEffect(() => { setSaveExists(hasSave()); }, [screen]);

  // Warm the GameScreen chunk during the cinematic so it's ready by the time
  // the intro ends and 'play' actually needs it (no visible loading state
  // in the common path — only a slow network would still see the fallback).
  useEffect(() => { if (screen === 'intro') loadGameScreen(); }, [screen]);

  // First mission trigger: Tasha texts as soon as the apartment loads.
  useEffect(() => {
    if (screen !== 'play') return;
    const s = getState();
    if (s.mission !== 0 || s.inquiries.length > 0 || s.missionDone) return;

    const t1 = window.setTimeout(() => {
      const st = getState();
      const inq = makeInquiry('tasha');
      inq.thread = [{ from: 'them', text: 'Heyyy', t: st.clock }];
      inq.location = 'graffiti alley';
      inq.date = 'this Saturday';
      inq.images = 8;
      inq.concept = 'moody alley energy, my first real shoot';
      inq.experience = 'first time shooting';
      pushInquiry(inq);
      sfx.buzz();
      say('Phone buzzing. Keisha\u2019s cousin.', 'info');
    }, 1800);

    const t2 = window.setTimeout(() => {
      const st = getState();
      const target = st.inquiries.find((i) => i.archetype === 'tasha');
      if (target) {
        set({
          inquiries: st.inquiries.map((i) => (i.id === target.id
            ? { ...i, thread: [...i.thread, { from: 'them' as const, text: 'How much you charge?', t: st.clock }] }
            : i)),
        });
        sfx.buzz();
        say('"How much you charge?" \u2014 the whole business in four words.', 'info');
      }
      set({ mission: 1 });
    }, 4600);

    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [screen]);

  if (screen === 'intro') {
    return <Cinematic onDone={() => { set({ screen: 'play', scene: 'apartment' }); track('intro_complete'); }} />;
  }

  if (screen === 'play') {
    return (
      <Suspense fallback={<GameLoading />}>
        <GameScreen onQuit={() => set({ screen: 'title' })} />
      </Suspense>
    );
  }

  // ---------------- TITLE SCREEN ----------------
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-black text-stone-200">
      <img src={IMG.skyline} alt="" className="absolute inset-x-0 top-0 h-[70vh] w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/90 to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_28%_38%,rgba(251,191,36,0.10),transparent_60%)]" />

      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-stone-500">
          <Crown className="h-4 w-4 text-amber-400" /> Open-world photography game
        </span>
        <span className="rounded border border-white/20 px-2 py-1 font-mono text-[10px] tracking-[0.2em] text-stone-400">M &middot; 17+</span>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 pb-24">
        <section className="flex flex-col gap-12 py-10 lg:flex-row lg:items-center lg:gap-16">
          <div className="lg:w-1/2">
            <h1
              className="text-6xl leading-[0.92] text-white sm:text-7xl xl:text-8xl"
              style={{ fontFamily: '"Bradley Hand","Segoe Script","Brush Script MT",cursive' }}
            >
              Him<br />Over There
            </h1>
            <div className="mt-4 h-px w-40 bg-gradient-to-r from-amber-400 to-transparent" />
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.3em] text-stone-400">
              A different perspective. Same city.
            </p>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-stone-400">
              A photography career and life sim. Bronzewood doesn&apos;t hand you anything: you take the inquiry,
              set the price, place the light, and make the frame. Then you cull it, retouch it, deliver it and
              find out what the client actually thinks.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => { sfx.resume(); newGame(); track('cta_click', { cta: 'new_game' }); }}
                className="group inline-flex items-center gap-2.5 rounded-md bg-amber-400 px-7 py-3 text-sm font-semibold tracking-wide text-black transition-all hover:bg-amber-300 hover:shadow-[0_0_36px_-8px_rgba(251,191,36,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
              >
                <Play className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /> New Game
              </button>
              {saveExists && (
                <button
                  type="button"
                  onClick={() => { sfx.resume(); loadGame(); }}
                  className="inline-flex items-center gap-2.5 rounded-md border border-white/20 px-6 py-3 text-sm tracking-wide text-stone-200 transition-colors hover:border-amber-400/70 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <RotateCcw className="h-4 w-4" /> Continue
                </button>
              )}
              <button
                type="button"
                onClick={() => { sfx.click(); setShowControls((v) => !v); }}
                className="inline-flex items-center gap-2.5 rounded-md px-4 py-3 text-sm text-stone-400 transition-colors hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <Keyboard className="h-4 w-4" /> Controls
              </button>
            </div>

            {showControls && (
              <dl className="mt-7 grid max-w-lg grid-cols-1 gap-x-8 gap-y-1.5 rounded-lg border border-white/10 bg-black/60 p-4 sm:grid-cols-2">
                {(device.isMobile ? MOBILE_CONTROLS : CONTROLS).map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3 border-b border-white/5 py-1">
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-amber-300">{k}</dt>
                    <dd className="text-right text-[11px] text-stone-400">{v}</dd>
                  </div>
                ))}
              </dl>
            )}

            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-stone-600">
              Real life &middot; Real people &middot; Real struggles &middot; Real growth
            </p>
          </div>

          <div className="lg:w-1/2">
            <figure className="group relative overflow-hidden rounded-xl border border-white/12 shadow-[0_40px_100px_-30px_rgba(0,0,0,1)]">
              <img
                src={IMG.concept}
                alt="Character concept sheet for Him Over There: the protagonist in a black tee, cargo pants and camera harness, with shoulder-length locs with honey tips, head studies and alternate outfits"
                className="w-full transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <figcaption className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/70 to-transparent px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-stone-400">
                Main character concept &middot; &ldquo;Same dude, different angles.&rdquo;
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="grid gap-4 border-t border-white/10 pt-12 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <article key={f.title} className="rounded-lg border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-amber-400/40">
              <f.icon className="mb-3 h-5 w-5 text-amber-400" strokeWidth={1.6} />
              <h2 className="text-sm font-semibold text-stone-100">{f.title}</h2>
              <p className="mt-1.5 text-[12px] leading-relaxed text-stone-400">{f.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-lg border border-white/10 bg-white/[0.02] p-6">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-amber-400">The loop</h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-400" style={{ textWrap: 'pretty' }}>
            Explore &rarr; receive an inquiry &rarr; read the client &rarr; negotiate &rarr; book &rarr; collect the deposit &rarr;
            moodboard &rarr; pack the bag &rarr; travel &rarr; set up one light &rarr; photograph &rarr; direct the subject &rarr;
            solve whatever goes wrong &rarr; back up &rarr; cull &rarr; retouch &rarr; deliver &rarr; collect the balance &rarr;
            read the review &rarr; post it &rarr; reputation up &rarr; new inquiries &rarr; upgrade. Reach Reputation 40 and
            $3,400 saved and Loft 4B is yours.
          </p>
        </section>
      </main>

      <footer className="relative border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p style={{ fontFamily: '"Bradley Hand","Segoe Script",cursive' }} className="text-xl text-amber-300">Him Over There</p>
          <nav className="flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500">
            <button type="button" onClick={() => { sfx.resume(); newGame(); }} className="transition-colors hover:text-amber-300">New Game</button>
            {saveExists && <button type="button" onClick={() => { sfx.resume(); loadGame(); }} className="transition-colors hover:text-amber-300">Continue</button>}
            <button type="button" onClick={() => { sfx.click(); setShowControls(true); }} className="transition-colors hover:text-amber-300">Controls</button>
            <span>Explore &middot; Photograph &middot; Meet people &middot; Build a life</span>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
