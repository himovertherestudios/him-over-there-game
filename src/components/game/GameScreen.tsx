import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Battery, Brain, Star, DollarSign, Utensils, Sparkles, Navigation, Smartphone, Crown, Camera as CamIcon, MapPin, Menu,
} from 'lucide-react';
import { engine, Hud } from '@/game/engine';
import { input } from '@/game/input/InputManager';
import { useDeviceProfile } from '@/game/platform/device';
import { MobileControls } from './mobile/MobileControls';
import { RotateOverlay } from './mobile/RotateOverlay';
import { DebugOverlay } from './DebugOverlay';
import {
  useGame, getState, set, advanceTime, stat, say, saveGame, scoreShot, addPhoto, updateJob,
  learn, fmtMoney, fmtClock, MISSION_STEPS, setMission, completeMission, checkStudioUnlock, leaseStudio,
  track, makeInquiry, pushInquiry,
} from '@/game/store';
import { LOTS, lotById, Mishap, WEATHERS, Weather, titleFor } from '@/game/data';
import { newPhoto, startShoot, finishShoot, rollMishap, checkParkingOnExit, randomInquiry } from '@/game/actions';

import { sfx } from '@/game/audio';
import { Phone } from './Phone';
import { CameraHUD } from './CameraHUD';
import { Workstation } from './Workstation';
import { PauseMenu, Moodboard, PackGear, Store, LifeMenu, MishapModal, GasPopup, StudioUnlock } from './Menus';
import { Btn, Chip, cx, Panel } from './ui';

const INTERIOR_FOR: Record<string, string> = {
  apartment: 'apartment', studio: 'studio', camerastore: 'camerastore', coffee: 'coffee',
  bar: 'bar', freshfit: 'freshfit', salon: 'salon',
};

export const GameScreen: React.FC<{ onQuit: () => void }> = ({ onQuit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState<Hud>({ prompt: null, interactId: null, speed: 0, inCar: false, scene: 'apartment', camMode: false, ev: 10, meter: 0, parked: true, hasSubject: false });

  const [overlay, setOverlay] = useState<string | null>(null);
  const [mishap, setMishap] = useState<Mishap | null>(null);
  const [phone, setPhone] = useState(false);
  const [paused, setPaused] = useState(false);
  const [waypoint, setWaypoint] = useState<string | null>('apartment');
  const [flash, setFlash] = useState(false);
  const [wpArrow, setWpArrow] = useState<{ x: number; y: number; behind: boolean; dist: number } | null>(null);
  const s = useGame((g) => g);
  const shotsThisJob = s.photos.filter((p) => p.jobId === s.job?.id).length;
  const device = useDeviceProfile();

  // ---------------- mount ----------------
  useEffect(() => {
    if (!canvasRef.current || !fxRef.current) return;
    engine.mount(canvasRef.current, fxRef.current);
    engine.setMinimap(miniRef.current);
    engine.onHud = (h) => setHud(h);
    engine.setScene(getState().scene || 'apartment', [0, 3]);
    sfx.setMuted(getState().muted);
    return () => { engine.onHud = null; engine.unmount(); };
  }, []);

  useEffect(() => { engine.paused = paused || phone || !!overlay || !!mishap || device.isPortraitPhone; }, [paused, phone, overlay, mishap, device.isPortraitPhone]);

  // ---------------- capture ----------------
  const capture = useCallback(() => {
    const st = getState();
    const job = st.job;
    if (!job) return;
    if (st.cardUsed >= 64) { say('Card full. 64 frames. Cull on the spot or swap a card.', 'bad'); return; }
    const cap = engine.capture();
    setFlash(true);
    window.setTimeout(() => setFlash(false), 90);
    const { score, tags, lesson } = scoreShot(cap.settings, engine.sceneEV(), cap.motion, engine.subjectConfidence, cap.eyesClosed, cap.comp);
    const p = newPhoto(job.id, cap.thumb, cap.settings, score, tags, lesson);
    addPhoto(p, cap.full);
    if (lesson) learn(lesson);
    const frames = job.frames + 1;
    updateJob({ frames, confidence: engine.subjectConfidence });
    advanceTime(2);
    stat({ energy: -0.6 });
    if (frames === 12) { setMission(11); say('Twelve frames in. You got the shot; now get the better one.', 'good'); }
    if (frames === 6 && job.mishapsSolved.length === 0) {
      const m = rollMishap('shoot');
      if (m) window.setTimeout(() => setMishap(m), 900);
    }
    if (frames === 16 && job.mishapsSolved.length === 1 && Math.random() < 0.6) {
      const m = rollMishap('shoot');
      if (m) window.setTimeout(() => setMishap(m), 900);
    }
    track('photo_captured', { quality: Math.round(score.total), aperture: cap.settings.aperture, iso: cap.settings.iso });
  }, []);

  // ---------------- interaction ----------------
  const interact = useCallback((id: string | null) => {
    if (!id) return;
    const st = getState();
    if (id === 'entercar') {
      engine.inCar = true;
      engine.carPos.set(engine.playerPos.x, 0, engine.playerPos.z);
      sfx.door();
      say('Keystone Sedan. Dusty gray, dependable, judgmental.');
      return;
    }
    if (id === 'exitcar') {
      engine.inCar = false;
      engine.playerPos.set(engine.carPos.x + 2.2, 0, engine.carPos.z);
      sfx.door();
      checkParkingOnExit();
      return;
    }
    if (id.startsWith('door:')) {
      const lotId = id.slice(5);
      if (lotId === 'studio' && !st.studioUnlocked) {
        if (st.flags.studioAvailable) { setOverlay('lease'); return; }
        say(`Loft 4B: $1,700/mo. They want proof of steady bookings. Rep 40 and $3,400 saved \u2014 you're at ${Math.round(st.rep)} and ${fmtMoney(st.money)}.`, 'info');
        return;
      }
      sfx.door();
      set({ scene: INTERIOR_FOR[lotId] || lotId });
      engine.setScene(INTERIOR_FOR[lotId] || lotId, [0, 4]);
      if (lotId === 'apartment') setWaypoint(null);
      return;
    }
    if (id.startsWith('spot:')) {
      const lotId = id.slice(5);
      const job = st.job;
      if (job && (job.stage === 'travel' || job.stage === 'packing') && job.concept.length === 3) {
        startShoot(job);
        setWaypoint(null);
        return;
      }
      say(lotById(lotId)?.blurb || 'Good wall.');
      return;
    }
    if (id === 'subject') {
      const job = st.job;
      if (!job) return;
      if (job.stage === 'shooting') {
        if (job.frames >= 12) {
          finishShoot();
          setWaypoint('apartment');
          say('Wrapped. Home, back up, cull. That\u2019s the job.', 'info');
        } else say(`${job.name} is ready. Raise the camera (C) \u2014 you need at least 12 frames.`, 'info');
      }
      return;
    }
    if (id.startsWith('prop:')) {
      const prop = id.slice(5);
      if (prop === 'exit') {
        sfx.door();
        const lot = LOTS.find((l) => INTERIOR_FOR[l.id] === engine.currentId);
        set({ scene: 'district' });
        engine.setScene('district', lot ? [lot.door[0], lot.door[1] + 3] : [0, 20]);
        return;
      }
      if (prop === 'laptop') { setOverlay('work'); return; }
      if (prop === 'closet') { setOverlay('closet'); return; }
      if (prop === 'gearbag') { setOverlay('pack'); return; }
      if (prop === 'shopgear') { setOverlay('storegear'); return; }
      if (prop === 'wardrobe') { setOverlay('storefits'); return; }
      if (prop === 'client') {
        const has = st.inquiries.some((i) => i.archetype === 'alvarez' && i.status !== 'done');
        if (!has) {
          const inq = makeInquiry('alvarez');
          pushInquiry(inq);
          sfx.buzz();
          say('Ms. Alvarez wants brand photos for the salon. Commercial usage. Check the phone.', 'good');
        } else say('Ms. Alvarez: "Did you send that contract yet?"');
        return;
      }

      if (prop === 'shoot') {
        const job = st.job;
        if (job && job.concept.length === 3) { startShoot(job); return; }
        say('Nothing booked into the studio right now.');
        return;
      }
      if (prop === 'couch') { setOverlay('tv'); return; }
      setOverlay(prop);
      return;
    }
  }, []);

  // ---------------- semantic actions (keyboard + touch) ----------------
  useEffect(() => {
    const unsubscribe = input.onPress((action) => {
      if (action === 'toggle-phone') { setPhone((v) => !v); setPaused(false); sfx.click(); return; }
      if (action === 'pause') { setPaused((v) => !v); setPhone(false); sfx.click(); return; }
      if (action === 'interact') {
        if (getState().screen !== 'play') return;
        if (phoneRef.current || overlayRef.current || mishapRef.current || pausedRef.current) return;
        interact(engine.interactTarget()?.id ?? null);
        return;
      }
      if (action === 'toggle-camera') {
        const job = getState().job;
        if (!engine.subject || !job) { say('Camera comes up at a shoot.'); return; }
        if (engine.camMode) engine.exitCameraMode();
        else { engine.enterCameraMode(); setMission(8); }
        return;
      }
      if (action === 'capture-photo' && engine.camMode) capture();
      if (action === 'save-game') saveGame();
    });
    return unsubscribe;
  }, [interact, capture]);

  const phoneRef = useRef(false); const overlayRef = useRef<string | null>(null);
  const mishapRef = useRef<Mishap | null>(null); const pausedRef = useRef(false);
  useEffect(() => { phoneRef.current = phone; }, [phone]);
  useEffect(() => { overlayRef.current = overlay; }, [overlay]);
  useEffect(() => { mishapRef.current = mishap; }, [mishap]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // ---------------- game clock ----------------
  useEffect(() => {
    const iv = window.setInterval(() => {
      if (engine.paused) return;
      advanceTime(1);
      const st = getState();
      const running = engine.playerVel.length() > 4;
      stat({ energy: running ? -0.5 : -0.22, hunger: -0.25, stress: st.energy < 25 ? 0.4 : -0.05 });
      if (st.energy < 12 && Math.random() < 0.05) say('Running on fumes. Eat something or sleep.', 'bad');
      if (Math.random() < 0.012) {
        const w = WEATHERS[Math.floor(Math.random() * (st.winter ? 4 : 3))] as Weather;
        if (w !== st.weather) { set({ weather: w }); say(w === 'rain' ? 'Rain. Chicago does this on purpose.' : `Sky turned ${w}.`, 'info'); }
      }
      if (Math.random() < 0.01) randomInquiry();
      if (!st.flags.gasShown && st.money > 2500 && Math.random() < 0.05) {
        set({ flags: { ...st.flags, gasShown: true } });
        setOverlay('gas');
      }
      checkStudioUnlock();
    }, 6000);
    return () => window.clearInterval(iv);
  }, []);

  // ---------------- autosave ----------------
  useEffect(() => {
    const iv = window.setInterval(() => { set({ playerPos: [engine.playerPos.x, engine.playerPos.z], scene: engine.currentId }); saveGame(); }, 45000);
    return () => window.clearInterval(iv);
  }, []);

  // ---------------- studio unlock cinematic ----------------
  useEffect(() => {
    if (s.studioUnlocked && !s.flags.act2Shown) {
      set({ flags: { ...getState().flags, act2Shown: true } });
      setOverlay('act2');
    }
  }, [s.studioUnlocked, s.flags.act2Shown]);

  // ---------------- waypoint arrow ----------------
  useEffect(() => {
    const iv = window.setInterval(() => {
      if (!waypoint || engine.currentId !== 'district') { setWpArrow(null); return; }
      const lot = lotById(waypoint);
      if (!lot) { setWpArrow(null); return; }
      setWpArrow(engine.waypointScreen(lot.door[0], lot.door[1]));
    }, 120);
    return () => window.clearInterval(iv);
  }, [waypoint]);

  // auto waypoint from job stage
  useEffect(() => {
    const job = s.job;
    if (!job) return;
    if (job.stage === 'travel' || job.stage === 'packing') setWaypoint(job.location.includes('track') ? 'tracks' : job.location.includes('studio') ? 'studio' : job.location.includes('salon') ? 'salon' : 'alley');
    else if (job.stage === 'backup' || job.stage === 'cull' || job.stage === 'retouch') setWaypoint('apartment');
  }, [s.job?.stage]);

  // ---------------- objectives ----------------
  const objectives = (() => {
    const job = s.job;
    const list: { text: string; done: boolean }[] = [];
    if (!s.missionDone) {
      const idx = s.mission;
      MISSION_STEPS.forEach((t, i) => { if (i >= idx - 1 && i <= idx + 2) list.push({ text: t, done: i < idx }); });
      return list;
    }
    if (job) {
      const map: Record<string, string> = {
        planning: 'Lock a concept on the moodboard', packing: 'Pack your gear at the apartment',
        travel: `Get to ${job.location}`, shooting: `Shoot ${job.name} \u2014 ${job.frames}/12 frames`,
        backup: 'Back up the files at the laptop', cull: 'Cull the keepers', retouch: 'Retouch the selects',
        deliver: 'Deliver the gallery', complete: 'Post one frame on Lenz',
      };
      list.push({ text: map[job.stage] || 'Work the job', done: false });
    } else {
      list.push({ text: 'Check the phone for new inquiries', done: false });
      list.push({ text: `Reach Rep 40 and $3,400 to lease Loft 4B (${Math.round(s.rep)} / ${fmtMoney(s.money)})`, done: false });
    }
    return list;
  })();

  const statItem = (Icon: React.ElementType, label: string, value: string, tone: string) => (
    <div className="flex items-center gap-1.5" title={label}>
      <Icon className={cx('h-3.5 w-3.5', tone)} />
      <span className="font-mono text-[11px] text-stone-200">{value}</span>
    </div>
  );

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={fxRef} className={cx('absolute inset-0 h-full w-full', hud.camMode ? 'block' : 'hidden')} />
      {flash && <div className="absolute inset-0 z-30 bg-black" />}

      {/* ---------- TOP BAR ---------- */}
      <header
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="pointer-events-auto max-w-[min(24rem,58vw)] rounded-lg border border-white/10 bg-black/70 p-3 backdrop-blur">
          <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-amber-400">
            <Crown className="h-3 w-3" /> {s.missionDone ? 'Objectives' : 'Mission: How much you charge?'}
          </p>
          <ul className="space-y-0.5">
            {objectives.map((o, i) => (
              <li key={i} className={cx('flex items-start gap-1.5 text-[11px] leading-snug', o.done ? 'text-stone-600 line-through' : 'text-stone-200')}>
                <span className={cx('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', o.done ? 'bg-stone-700' : 'bg-amber-400')} />
                {o.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 rounded-lg border border-white/10 bg-black/70 px-3 py-2 backdrop-blur">
            {statItem(DollarSign, 'Money', fmtMoney(s.money), s.money < 0 ? 'text-red-400' : 'text-emerald-400')}
            {statItem(Battery, 'Energy', `${Math.round(s.energy)}`, s.energy < 25 ? 'text-red-400' : 'text-emerald-400')}
            {statItem(Brain, 'Stress', `${Math.round(s.stress)}`, s.stress > 70 ? 'text-red-400' : 'text-sky-400')}
            {statItem(Star, 'Reputation', `${Math.round(s.rep)}`, 'text-amber-400')}
            {!device.isMobile && statItem(Sparkles, 'Creativity', `${Math.round(s.creativity)}`, 'text-fuchsia-400')}
            {!device.isMobile && statItem(Utensils, 'Hunger', `${Math.round(s.hunger)}`, s.hunger < 25 ? 'text-red-400' : 'text-orange-300')}
          </div>
          {!device.isMobile && (
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-stone-400 backdrop-blur">
              <span className="text-amber-300">{titleFor(s.rep)}</span>
              <span>&middot;</span><span>Day {s.day}</span>
              <span>&middot;</span><span>{fmtClock(s.clock)}</span>
              <span>&middot;</span><span className="capitalize">{s.weather}</span>
            </div>
          )}
          {!device.isMobile && (
            <div className="flex gap-1.5">
              <Btn size="sm" onClick={() => { setPhone((v) => !v); }}><Smartphone className="h-3 w-3" /> Phone (Tab)</Btn>
              <Btn size="sm" onClick={() => setPaused(true)}><Menu className="h-3 w-3" /> Pause (Esc)</Btn>
            </div>
          )}
        </div>
      </header>

      {/* ---------- WAYPOINT ARROW ---------- */}
      {wpArrow && !hud.camMode && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${Math.max(6, Math.min(94, wpArrow.behind ? 100 - wpArrow.x * 100 : wpArrow.x * 100))}%`,
            top: `${wpArrow.behind ? 88 : Math.max(12, Math.min(84, wpArrow.y * 100))}%`,
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <div className="animate-bounce rounded-full border border-amber-400/60 bg-black/70 p-1.5">
              <Navigation className="h-4 w-4 text-amber-400" />
            </div>
            <span className="rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-amber-300">
              GO HERE &middot; {Math.round(wpArrow.dist)}m
            </span>
          </div>
        </div>
      )}

      {/* ---------- MINIMAP ---------- */}
      {!(device.isMobile && hud.camMode) && (
        <div
          className="pointer-events-none absolute left-3 z-10"
          style={{ bottom: device.isMobile ? 'calc(env(safe-area-inset-bottom) + 7.5rem)' : '1rem' }}
        >
          <div className="overflow-hidden rounded-lg border border-white/12 bg-black/70 backdrop-blur">
            <canvas ref={miniRef} width={device.isMobile ? 116 : 168} height={device.isMobile ? 116 : 168} className="block" />
            <div className="flex items-center justify-between border-t border-white/10 px-2 py-1 font-mono text-[8.5px] uppercase tracking-widest text-stone-500">
              <span>Bronzewood</span>
              <span className={hud.parked ? 'text-emerald-400' : 'text-red-400'}>{hud.inCar ? `${Math.round(hud.speed * 2.2)} mph` : hud.parked ? 'parked' : 'not parked'}</span>
            </div>
          </div>
          {!device.isMobile && (
            <p className="mt-1.5 max-w-[168px] font-mono text-[8.5px] leading-relaxed text-stone-500">
              WASD move &middot; Shift run &middot; E interact &middot; Tab phone &middot; C camera &middot; Esc pause
            </p>
          )}
        </div>
      )}

      {/* ---------- INTERACT PROMPT (desktop keyboard hint; mobile has its own Interact button) ---------- */}
      {hud.prompt && !hud.camMode && !phone && !device.isMobile && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 z-10 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-md border border-amber-400/40 bg-black/80 px-3 py-1.5 backdrop-blur">
            <kbd className="rounded bg-amber-400 px-1.5 py-0.5 font-mono text-[10px] font-bold text-black">E</kbd>
            <span className="text-[12px] text-stone-100">{hud.prompt}</span>
          </div>
        </div>
      )}

      {/* ---------- CAMERA CTA (desktop keyboard hint; mobile has its own Camera button) ---------- */}
      {hud.hasSubject && !hud.camMode && !phone && !device.isMobile && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 z-10 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-md border border-white/15 bg-black/70 px-3 py-1.5">
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px] text-stone-200">C</kbd>
            <span className="flex items-center gap-1.5 text-[11px] text-stone-300"><CamIcon className="h-3 w-3" /> Raise the camera &middot; {shotsThisJob} frames</span>
          </div>
        </div>
      )}

      {/* ---------- TOAST ---------- */}
      {s.toast && (
        <div key={s.toast.id} className="pointer-events-none absolute bottom-6 left-1/2 z-30 w-[min(640px,92vw)] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2">
          <div className={cx('rounded-md border px-4 py-2.5 text-center backdrop-blur',
            s.toast.kind === 'good' ? 'border-emerald-400/40 bg-emerald-950/70 text-emerald-100'
              : s.toast.kind === 'bad' ? 'border-red-400/40 bg-red-950/70 text-red-100'
                : s.toast.kind === 'money' ? 'border-amber-400/40 bg-amber-950/70 text-amber-100'
                  : s.toast.kind === 'info' ? 'border-sky-400/40 bg-sky-950/70 text-sky-100'
                    : 'border-white/15 bg-black/80 text-stone-200')}>
            <p className="text-[13px] leading-snug" style={{ textWrap: 'balance' }}>{s.toast.text}</p>
          </div>
        </div>
      )}

      {/* ---------- CAMERA HUD ---------- */}
      {hud.camMode && <CameraHUD onCapture={capture} onExit={() => engine.exitCameraMode()} shots={s.cardUsed} maxShots={64} />}

      {/* ---------- PHONE ---------- */}
      {phone && <Phone onClose={() => setPhone(false)} onMoodboard={() => setOverlay('mood')} onWaypoint={(id) => { setWaypoint(id); say(`Waypoint set: ${lotById(id)?.name}.`, 'info'); }} />}

      {/* ---------- OVERLAYS ---------- */}
      {overlay && overlay !== 'gas' && overlay !== 'act2' && overlay !== 'lease' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          {overlay === 'work' && <Workstation onClose={() => setOverlay(null)} />}
          {overlay === 'mood' && <Moodboard onClose={() => setOverlay(null)} />}
          {overlay === 'pack' && <PackGear onClose={() => setOverlay(null)} />}
          {overlay === 'storegear' && <Store kind="gear" onClose={() => setOverlay(null)} />}
          {overlay === 'storefits' && <Store kind="fits" onClose={() => setOverlay(null)} />}
          {['bed', 'kitchen', 'order', 'tv', 'network', 'gym'].includes(overlay) && <LifeMenu kind={overlay} onClose={() => setOverlay(null)} />}
          {overlay === 'closet' && (
            <Panel title="Closet" className="w-[min(460px,95vw)]" right={<Btn size="sm" variant="ghost" onClick={() => setOverlay(null)}>Close</Btn>}>
              <div className="space-y-1.5 p-4">
                {s.ownedFits.map((id) => {
                  const names: Record<string, string> = { photog: 'Photographer Streetwear', city: 'City Fit', gym: 'Gym Fit', winter: 'Winter Parka' };
                  return (
                    <button key={id} type="button" onClick={() => { sfx.click(); set({ fit: id }); engine.refreshPlayerLook(); say(`${names[id]}. Same dude, different angles.`); }}
                      className={cx('flex w-full items-center justify-between rounded border px-3 py-2 text-left text-[11px] transition-colors', s.fit === id ? 'border-amber-400/60 bg-amber-400/10 text-amber-200' : 'border-white/10 text-stone-300 hover:border-white/30')}>
                      {names[id]}{s.fit === id && <Chip tone="gold">wearing</Chip>}
                    </button>
                  );
                })}

                <Btn size="sm" className="w-full" onClick={() => { set({ locsTied: !getState().locsTied }); engine.refreshPlayerLook(); }}>
                  Locs: {s.locsTied ? 'Tied up' : 'Hanging'}
                </Btn>
                <Btn size="sm" className="w-full" onClick={() => { set({ winter: !getState().winter, weather: getState().winter ? 'overcast' : 'snow' }); say(getState().winter ? 'Winter in Bronzewood. Nineteen degrees and windy.' : 'Winter off.', 'info'); }}>
                  Season: {s.winter ? 'Winter' : 'Regular'}
                </Btn>
              </div>
            </Panel>
          )}
        </div>
      )}
      {overlay === 'gas' && <GasPopup onClose={() => setOverlay(null)} />}
      {overlay === 'act2' && <StudioUnlock onClose={() => setOverlay(null)} />}
      {overlay === 'lease' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4">
          <Panel title="Loft 4B Rentals" className="w-[min(520px,95vw)]">
            <div className="p-5 text-center">
              <MapPin className="mx-auto mb-2 h-6 w-6 text-amber-400" />
              <p className="text-[12px] leading-relaxed text-stone-300">
                $1,700/mo. First month plus deposit is <span className="text-amber-300">$3,400</span> today.
                Seamless backdrop, two lights, a couch, and a door that locks.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Btn onClick={() => setOverlay(null)}>Not yet</Btn>
                <Btn variant="gold" disabled={s.money < 3400} onClick={() => { if (leaseStudio()) { setOverlay(null); completeMission(); } }}>Sign the lease</Btn>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {mishap && <MishapModal mishap={mishap} onDone={() => setMishap(null)} />}
      {paused && <PauseMenu onClose={() => setPaused(false)} onQuit={onQuit} />}

      {/* ---------- MOBILE TOUCH CONTROLS ---------- */}
      {device.isMobile && !phone && !overlay && !mishap && !paused && !device.isPortraitPhone && <MobileControls hud={hud} />}
      {device.isPortraitPhone && <RotateOverlay />}
      {import.meta.env.DEV && <DebugOverlay />}
    </div>
  );
};
