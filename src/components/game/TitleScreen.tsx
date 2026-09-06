import React, { useEffect, useState } from 'react';
import { Crown, Play, RotateCcw, Keyboard, SkipForward } from 'lucide-react';
import { IMG } from '@/game/imgs';
import { sfx } from '@/game/audio';

const CARDS: { img: string; line: string; sub?: string; position?: string }[] = [
  { img: IMG.opening.jobApplication, line: 'Third application this week.', sub: 'Warehouse. Overnight. Whatever pays.' },
  { img: IMG.opening.jobRejection, line: '“We’ve decided to move forward with another candidate.”', sub: 'Read it anyway.' },
  { img: IMG.opening.backgroundCheck, line: 'Then the background check.', sub: 'One more door that closes before you even touch the handle.' },
  { img: IMG.opening.rentBills, line: 'Rent still wants its money.', sub: 'Bills do not care why the job said no.' },
  { img: IMG.opening.walkHome, line: 'Same city. Same walk home.', sub: 'Trying to figure out what comes next.' },
  { img: IMG.opening.cameraTurningPoint, line: 'The camera was still on the table.', sub: 'Not a career. Not yet. Just something that was mine.' },
  { img: IMG.opening.firstOpportunity, line: '“You still got that camera?”', sub: 'Sometimes the first opportunity does not look like one.' },
  { img: IMG.opening.howMuchYouCharge, line: '“Heyyy… how much you charge?”', sub: 'First time somebody asked the question that mattered.' },
  { img: IMG.opening.makeshiftSetup, line: 'No studio. No fancy setup.', sub: 'Just enough gear to find out if I could really do this.' },
  { img: IMG.opening.firstShoot, line: 'So I started shooting.', sub: 'One light. Small room. Figure it out.', position: 'center 40%' },
  { img: IMG.opening.lateNightEditing, line: 'Then came the part nobody sees.', sub: 'Late nights learning how to make the frame match the idea.' },
  { img: IMG.opening.clientReaction, line: '“OMG I LOVE THESE.”', sub: 'That was the first proof this might be more than a hobby.', position: 'center 70%' },
  { img: IMG.opening.firstPayment, line: 'Then somebody paid me.', sub: 'Not enough to change my life. Enough to change my direction.' },
];

export const Cinematic: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [i, setI] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    setFade(true);
    const t1 = window.setTimeout(() => setFade(false), 2500);
    const t2 = window.setTimeout(() => {
      if (i >= CARDS.length - 1) onDone();
      else setI((v) => v + 1);
    }, 3000);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [i, onDone]);

  const card = CARDS[i];
  return (
    <div className="fixed inset-0 z-50 bg-black">
      <img
        src={card.img}
        alt=""
        className={`h-full w-full object-cover transition-opacity duration-[1200ms] ${fade ? 'opacity-45' : 'opacity-10'}`}
        style={{ objectPosition: card.position || 'center' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <p
          key={`l-${i}`}
          className="max-w-3xl text-2xl leading-snug text-stone-100 sm:text-4xl"
          style={{ fontFamily: '"Bradley Hand","Segoe Script","Brush Script MT",cursive', textWrap: 'balance' }}
        >
          {card.line}
        </p>
        {card.sub && <p className="mt-5 max-w-xl font-mono text-[11px] uppercase tracking-[0.22em] text-stone-500">{card.sub}</p>}
      </div>
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2">
        {CARDS.map((_, n) => (
          <span key={n} className={`h-0.5 w-8 rounded-full transition-colors ${n <= i ? 'bg-amber-400' : 'bg-white/20'}`} />
        ))}
      </div>
      <button
        type="button"
        onClick={() => { sfx.click(); onDone(); }}
        className="absolute bottom-6 right-6 inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-stone-400 transition-colors hover:border-amber-400/60 hover:text-amber-300"
      >
        <SkipForward className="h-3 w-3" /> Skip
      </button>
    </div>
  );
};

export const CONTROLS: [string, string][] = [
  ['W A S D', 'Move (drive when in the car)'],
  ['Shift', 'Run \u2014 drains energy faster'],
  ['Mouse drag', 'Orbit the camera'],
  ['Mouse wheel', 'Zoom \u2014 focus distance in camera mode'],
  ['Shift + wheel', 'Zoom the lens (24\u201385mm)'],
  ['E', 'Interact / enter door / get in the car'],
  ['Tab', 'Phone'],
  ['C', 'Raise the camera at a shoot'],
  ['Space', 'Handbrake while driving'],
  ['Esc', 'Pause \u2014 save, load, character, settings'],
];

export const TitleScreen: React.FC<{
  hasSave: boolean;
  onNew: () => void;
  onContinue: () => void;
}> = ({ hasSave, onNew, onContinue }) => {
  const [showControls, setShowControls] = useState(false);
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-stone-200">
      <img src={IMG.skyline} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black/85 to-stone-900/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,rgba(251,191,36,0.09),transparent_60%)]" />

      <main className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center gap-10 px-6 py-16 lg:flex-row lg:items-center lg:gap-16">
        <div className="lg:w-1/2">
          <Crown className="mb-1 h-9 w-9 text-amber-400" strokeWidth={1.6} />
          <h1
            className="text-6xl leading-[0.92] text-white sm:text-7xl xl:text-8xl"
            style={{ fontFamily: '"Bradley Hand","Segoe Script","Brush Script MT",cursive' }}
          >
            Him<br />Over There
          </h1>
          <div className="mt-4 h-px w-40 bg-gradient-to-r from-amber-400 to-transparent" />
          <p className="mt-5 max-w-md font-mono text-[11px] uppercase tracking-[0.3em] text-stone-400">
            A different perspective. Same city.
          </p>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-stone-400">
            An open-world photography life-sim. Bronzewood doesn&apos;t hand you anything: you take the inquiry,
            set the price, place the light, and make the frame. Rated M for language and grown-folks business.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => { sfx.click(); onNew(); }}
              className="group inline-flex items-center gap-2.5 rounded-md bg-amber-400 px-7 py-3 text-sm font-semibold tracking-wide text-black transition-all hover:bg-amber-300 hover:shadow-[0_0_36px_-8px_rgba(251,191,36,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
            >
              <Play className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /> New Game
            </button>
            {hasSave && (
              <button
                type="button"
                onClick={() => { sfx.click(); onContinue(); }}
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
            <dl className="mt-7 grid max-w-lg grid-cols-1 gap-x-8 gap-y-1.5 rounded-lg border border-white/10 bg-black/50 p-4 sm:grid-cols-2">
              {CONTROLS.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 border-b border-white/5 py-1">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-amber-300">{k}</dt>
                  <dd className="text-right text-[11px] text-stone-400">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-stone-600">
            Mature 17+ &middot; Real life, real people, real growth
          </p>
        </div>

        <div className="lg:w-1/2">
          <figure className="group relative overflow-hidden rounded-xl border border-white/12 shadow-[0_40px_100px_-30px_rgba(0,0,0,1)]">
            <img
              src={IMG.concept}
              alt="Character concept sheet for Him Over There: the protagonist in black tee, cargo pants, camera harness, shoulder-length locs with honey tips, plus head studies and alternate outfits"
              className="w-full transition-transform duration-700 group-hover:scale-[1.03]"
              loading="eager"
            />
            <figcaption className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/70 to-transparent px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-stone-400">
              Main character concept &middot; &ldquo;Same dude, different angles.&rdquo;
            </figcaption>
          </figure>
        </div>
      </main>
    </div>
  );
};
