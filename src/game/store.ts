import { useSyncExternalStore } from 'react';
import {
  DEFAULT_PACKAGES, DEFAULT_CLAUSES, Pkg, ContractClauses, ARCHETYPES, archetypeById,
  Genre, LESSONS, titleFor, ONE_LINERS, Weather, GOAL, gearById,
} from './data';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
export interface ShotSettings {
  aperture: number; shutter: number; iso: number; focal: number;
  focusDist: number; subjectDist: number; wb: string; kelvin: number;
  portrait: boolean; height: number; lightPower: number; lightDist: number;
  modifier: string; reflector: boolean;
}
export interface ShotScore {
  focus: number; exposure: number; motion: number; noise: number;
  comp: number; pose: number; light: number; expression: number; total: number;
}
export interface Photo {
  id: string; url: string; jobId: string;
  settings: ShotSettings; score: ShotScore; tags: string[]; lesson?: string;
  starred: boolean; retouched: boolean;
  edits?: { exposure: number; temp: number; contrast: number; grade: string; smooth: number; sharpen: number; crop: string; spots: number };
}
export interface Message { from: 'me' | 'them'; text: string; t: number }
export interface Contact {
  id: string; archetype: string; name: string; tag: string;
  relationship: number; jobs: number; memory: string[]; phone: string;
}
export interface Inquiry {
  id: string; archetype: string; name: string; genre: Genre; opener: string;
  budget: number; date: string; images: number; location: string; usage: string;
  concept: string; experience: string; reliability: number; networking: number;
  status: 'new' | 'negotiating' | 'booked' | 'ghosted' | 'declined' | 'done';
  thread: Message[]; createdDay: number;
}
export interface Job {
  id: string; inquiryId: string; archetype: string; name: string; genre: Genre;
  pkg: Pkg; price: number; deposit: number; paidDeposit: boolean; paidBalance: boolean;
  contract: boolean; clauses: ContractClauses; location: string; concept: string[];
  confidence: number; frames: number; stage: JobStage; satisfaction: number;
  stars?: number; review?: string; mishapsSolved: string[]; delivered: number;
}
export type JobStage = 'planning' | 'packing' | 'travel' | 'shooting' | 'backup' | 'cull' | 'retouch' | 'deliver' | 'complete';
export interface LenzPost { id: string; url: string; caption: string; likes: number; comments: string[]; viral: boolean; day: number }

export interface GameState {
  screen: 'title' | 'intro' | 'play';
  scene: string;
  playerPos: [number, number]; playerRot: number;
  inCar: boolean; carPos: [number, number]; carRot: number; carParked: boolean;
  clock: number; day: number; weather: Weather; winter: boolean;
  money: number; energy: number; stress: number; rep: number; creativity: number; hunger: number;
  skills: { exposure: number; lighting: number; posing: number; retouch: number; business: number; networking: number };
  fit: string; locsTied: boolean; ownedFits: string[];
  ownedGear: string[]; packed: string[]; cardUsed: number;
  packages: Pkg[]; depositPct: number; clauses: ContractClauses;
  ledger: { day: number; label: string; amount: number }[];
  contacts: Contact[]; inquiries: Inquiry[];
  job: Job | null; history: Job[];
  photos: Photo[];
  mission: number; missionDone: boolean; flags: Record<string, boolean>;
  lessons: string[];
  lenz: { followers: number; posts: LenzPost[] };
  notes: string[];
  studioUnlocked: boolean; act2: boolean;
  quality: 'low' | 'med' | 'high'; muted: boolean;
  notifications: number;
  toast: { id: number; text: string; kind: string } | null;
}

const SAVE_KEY = 'hot_save_v1';

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const uid = () => Math.random().toString(36).slice(2, 10);
export const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v));

export function fmtMoney(n: number) {
  const neg = n < 0;
  const s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${neg ? '-' : ''}$${s}`;
}
export function fmtClock(mins: number) {
  const m = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60); const mm = Math.floor(m % 60);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${mm.toString().padStart(2, '0')} ${ampm}`;
}
export const track = (name: string, props?: Record<string, unknown>) => {
  try { (window as unknown as { supercool?: { track: (n: string, p?: unknown) => void } }).supercool?.track(name, props); } catch { /* no-op */ }
};

// ------------------------------------------------------------------
// Initial state
// ------------------------------------------------------------------
function baseState(): GameState {
  return {
    screen: 'title', scene: 'apartment',
    playerPos: [0, 0], playerRot: 0,
    inCar: false, carPos: [-30, 13], carRot: 0, carParked: true,
    clock: 9 * 60, day: 1, weather: 'overcast', winter: false,
    money: 312.4, energy: 78, stress: 34, rep: 3, creativity: 40, hunger: 55,
    skills: { exposure: 12, lighting: 8, posing: 10, retouch: 6, business: 5, networking: 9 },
    fit: 'photog', locsTied: false, ownedFits: ['photog'],
    ownedGear: ['body-d1', 'lens-35', 'lens-2470', 'strobe', 'softbox'], packed: [], cardUsed: 0,
    packages: DEFAULT_PACKAGES.map((p) => ({ ...p })), depositPct: 30, clauses: { ...DEFAULT_CLAUSES },
    ledger: [{ day: 1, label: 'Opening balance', amount: 312.4 }],
    contacts: [{ id: 'keisha', archetype: 'friend', name: 'Keisha', tag: 'FRIEND', relationship: 70, jobs: 0, memory: ['Put her cousin Tasha on to you.'], phone: '773-01' }],
    inquiries: [], job: null, history: [], photos: [],
    mission: 0, missionDone: false, flags: {},
    lessons: [], lenz: { followers: 84, posts: [] }, notes: [],
    studioUnlocked: false, act2: false,
    quality: 'med', muted: false, notifications: 0, toast: null,
  };
}

// ------------------------------------------------------------------
// Store plumbing
// ------------------------------------------------------------------
let state: GameState = baseState();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
export function getState() { return state; }
export function set(patch: Partial<GameState> | ((s: GameState) => Partial<GameState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...p };
  emit();
}
export function useGame<T>(sel: (s: GameState) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
}

// full-res photo data lives in memory only (localStorage would explode)
export const photoCache = new Map<string, string>();
export const fullUrl = (p: Photo) => photoCache.get(p.id) || p.url;

// ------------------------------------------------------------------
// Persistence
// ------------------------------------------------------------------
export function saveGame() {
  try {
    const trimmed: GameState = { ...state, toast: null, photos: state.photos.slice(-44) };
    localStorage.setItem(SAVE_KEY, JSON.stringify(trimmed));
    return true;
  } catch { return false; }
}
export function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; } }
export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as GameState;
    state = { ...baseState(), ...parsed, screen: 'play', toast: null };
    emit();
    return true;
  } catch { return false; }
}
export function newGame() {
  state = { ...baseState(), screen: 'intro' };
  photoCache.clear();
  emit();
}

// ------------------------------------------------------------------
// Toasts / one-liners
// ------------------------------------------------------------------
let toastId = 0;
let toastTimer: number | null = null;
export function say(text: string, kind: 'him' | 'info' | 'good' | 'bad' | 'money' = 'him') {
  toastId += 1;
  set({ toast: { id: toastId, text, kind } });
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => set({ toast: null }), 4200);
}
export const oneLiner = () => say(pick(ONE_LINERS));

// ------------------------------------------------------------------
// Economy
// ------------------------------------------------------------------
export function addMoney(amount: number, label: string) {
  set((s) => ({
    money: Math.round((s.money + amount) * 100) / 100,
    ledger: [...s.ledger.slice(-80), { day: s.day, label, amount }],
  }));
}
export function stat(patch: Partial<Pick<GameState, 'energy' | 'stress' | 'rep' | 'creativity' | 'hunger'>>) {
  set((s) => ({
    energy: clamp(s.energy + (patch.energy || 0)),
    stress: clamp(s.stress + (patch.stress || 0)),
    rep: clamp(s.rep + (patch.rep || 0)),
    creativity: clamp(s.creativity + (patch.creativity || 0)),
    hunger: clamp(s.hunger + (patch.hunger || 0)),
  }));
}
export function skillUp(k: keyof GameState['skills'], amount: number) {
  set((s) => ({ skills: { ...s.skills, [k]: clamp(s.skills[k] + amount) } }));
}
export const title = () => titleFor(state.rep);

// ------------------------------------------------------------------
// Clock
// ------------------------------------------------------------------
export function advanceTime(mins: number) {
  set((s) => {
    let clock = s.clock + mins;
    let day = s.day;
    const ledger = [...s.ledger];
    let money = s.money;
    while (clock >= 1440) {
      clock -= 1440; day += 1;
      if ((day - 1) % 30 === 0) {
        money -= 900; ledger.push({ day, label: 'Rent auto-draft', amount: -900 });
      }
      if (day % 30 === 5) { money -= 60; ledger.push({ day, label: 'Phone bill', amount: -60 }); }
      if (day % 30 === 12) { money -= 20; ledger.push({ day, label: 'Darkroom software sub', amount: -20 }); }
    }
    return { clock, day, money: Math.round(money * 100) / 100, ledger: ledger.slice(-80) };
  });
}
export const isNight = () => state.clock < 6 * 60 || state.clock > 19 * 60;

// ------------------------------------------------------------------
// Lessons / notebook
// ------------------------------------------------------------------
export function learn(id: string) {
  const l = LESSONS.find((x) => x.id === id);
  if (!l || state.lessons.includes(id)) return;
  set((s) => ({ lessons: [...s.lessons, id] }));
  say(`NOTEBOOK: ${l.text}`, 'info');
}

// ------------------------------------------------------------------
// Inquiries
// ------------------------------------------------------------------
const DATES = ['this Saturday', 'Sunday afternoon', 'next Friday', 'tomorrow evening', 'the 14th'];
const LOCS = ['graffiti alley', 'under the tracks', 'my place', 'the rented studio', 'the salon'];
const EXP = ['first time shooting', 'shot a few times', 'shoots monthly', 'been modeling 3 years'];

export function makeInquiry(archId?: string): Inquiry {
  const a = archId ? archetypeById(archId) : pick(ARCHETYPES);
  const budget = Math.round(rnd(a.budget[0], a.budget[1]) / 10) * 10;
  return {
    id: uid(), archetype: a.id, name: a.name, genre: a.genre, opener: a.greeting,
    budget, date: pick(DATES), images: pick([3, 5, 8, 12, 20]),
    location: pick(LOCS), usage: a.id === 'alvarez' ? 'commercial' : 'personal',
    concept: pick(['moody alley energy', 'clean beauty, glowy skin', 'golden hour warm', 'brand shots for the website', 'promo images for the flyer']),
    experience: pick(EXP), reliability: a.reliability, networking: a.networking,
    status: 'new', createdDay: state.day,
    thread: [{ from: 'them', text: a.greeting, t: state.clock }],
  };
}
export function pushInquiry(inq: Inquiry) {
  set((s) => ({ inquiries: [inq, ...s.inquiries].slice(0, 24), notifications: s.notifications + 1 }));
}
export function reply(inqId: string, text: string, from: 'me' | 'them' = 'me') {
  set((s) => ({
    inquiries: s.inquiries.map((i) => (i.id === inqId ? { ...i, thread: [...i.thread, { from, text, t: s.clock }] } : i)),
  }));
}
export function setInquiryStatus(inqId: string, status: Inquiry['status']) {
  set((s) => ({ inquiries: s.inquiries.map((i) => (i.id === inqId ? { ...i, status } : i)) }));
}

export function ensureContact(archId: string) {
  if (state.contacts.some((c) => c.id === archId)) return;
  const a = archetypeById(archId);
  set((s) => ({
    contacts: [...s.contacts, { id: a.id, archetype: a.id, name: a.name, tag: a.tag, relationship: 50, jobs: 0, memory: [a.quirk], phone: '773-0' + (s.contacts.length + 2) }],
  }));
}
export function remember(archId: string, note: string, rel = 0) {
  ensureContact(archId);
  set((s) => ({
    contacts: s.contacts.map((c) => (c.id === archId
      ? { ...c, relationship: clamp(c.relationship + rel), memory: [...c.memory.slice(-6), note] }
      : c)),
  }));
}

// ------------------------------------------------------------------
// Jobs
// ------------------------------------------------------------------
export function bookJob(inq: Inquiry, pkg: Pkg, price: number, contract: boolean, location: string): Job {
  const a = archetypeById(inq.archetype);
  const job: Job = {
    id: uid(), inquiryId: inq.id, archetype: inq.archetype, name: inq.name, genre: inq.genre,
    pkg, price, deposit: Math.round(price * (state.depositPct / 100)), paidDeposit: false, paidBalance: false,
    contract, clauses: { ...state.clauses }, location, concept: [],
    confidence: a.confidence, frames: 0, stage: 'planning', satisfaction: 60,
    mishapsSolved: [], delivered: 0,
  };
  set({ job });
  setInquiryStatus(inq.id, 'booked');
  ensureContact(inq.archetype);
  track('booking_created', { client: inq.name, price, genre: inq.genre });
  return job;
}
export function updateJob(patch: Partial<Job>) {
  set((s) => (s.job ? { job: { ...s.job, ...patch } } : {}));
}

// ------------------------------------------------------------------
// Shot scoring
// ------------------------------------------------------------------
export function scoreShot(s: ShotSettings, sceneEV: number, subjectMotion: number, confidence: number, eyesClosed: boolean, compositionScore: number): { score: ShotScore; tags: string[]; lesson?: string } {
  const ev = Math.log2((s.aperture * s.aperture) / (1 / s.shutter)) - Math.log2(s.iso / 100);
  const err = ev - sceneEV;
  const exposure = clamp(100 - Math.abs(err) * 26);
  const coc = Math.abs(s.focusDist - s.subjectDist) * (s.focal / 50) / Math.max(1.2, s.aperture);
  const focus = clamp(100 - coc * 130);
  const shakeLimit = 1 / s.focal;
  const shake = s.shutter > shakeLimit ? Math.min(1, (1 / s.shutter) / shakeLimit / 3) : 0;
  const motionAmt = (s.shutter > 1 / 125 ? (s.shutter * 125 - 1) * subjectMotion * 0.8 : 0) + shake;
  const motion = clamp(100 - motionAmt * 55);
  const noise = clamp(105 - Math.log2(Math.max(100, s.iso) / 100) * 13);
  const lightQ = (() => {
    let q = 45;
    if (s.lightPower > 0) {
      q += s.modifier === 'softbox' ? 26 : 12;
      const d = s.lightDist;
      q += d < 1.2 ? 18 : d < 2.4 ? 12 : d < 4 ? 2 : -14;
      if (s.reflector) q += 10;
    } else q += 6;
    return clamp(q);
  })();
  const pose = clamp(confidence * 0.7 + 20 + (s.focal >= 50 ? 8 : 0));
  const expression = eyesClosed ? clamp(18 + confidence * 0.1) : clamp(35 + confidence * 0.6);
  const distort = s.focal < 35 && s.subjectDist < 1.4 ? 22 : 0;
  const comp = clamp(compositionScore - distort);
  const total = clamp(
    focus * 0.2 + exposure * 0.16 + motion * 0.13 + noise * 0.08 +
    comp * 0.13 + pose * 0.11 + lightQ * 0.11 + expression * 0.08,
  );

  const tags: string[] = [];
  let lesson: string | undefined;
  if (focus < 62) { tags.push('Missed focus'); lesson = 'focus'; }
  if (motion < 62) { tags.push('Motion blur'); lesson = lesson || (shake > 0.2 ? 'handshake' : 'shutter'); }
  if (noise < 66) { tags.push('Noisy'); lesson = lesson || 'iso'; }
  if (exposure < 55) { tags.push(err > 0 ? 'Underexposed' : 'Overexposed'); lesson = lesson || 'expo'; }
  if (eyesClosed) { tags.push('Closed eyes'); }
  if (distort) { tags.push('Face distortion'); lesson = lesson || 'wide'; }
  if (comp < 55) { tags.push('Poor composition'); lesson = lesson || 'comp'; }
  if (lightQ < 55) { tags.push('Flat lighting'); lesson = lesson || 'lightdist'; }
  if (expression > 78) tags.push('Great expression');
  if (pose > 74) tags.push('Strong pose');
  if (lightQ > 78) tags.push('Perfect lighting');
  if (total > 82) tags.push('Portfolio-worthy');
  if (total > 74 && expression > 70) tags.push('Client favorite \u2605');
  if (tags.length === 0) tags.push('Usable');
  return { score: { focus, exposure, motion, noise, comp, pose, light: lightQ, expression, total }, tags, lesson };
}

export function addPhoto(p: Photo, fullDataUrl: string) {
  photoCache.set(p.id, fullDataUrl);
  set((s) => ({ photos: [...s.photos, p], cardUsed: s.cardUsed + 1 }));
}
export function starPhoto(id: string, on: boolean) {
  set((s) => ({ photos: s.photos.map((p) => (p.id === id ? { ...p, starred: on } : p)) }));
}

// ------------------------------------------------------------------
// Review generation
// ------------------------------------------------------------------
export function generateReview(job: Job, avgQuality: number) {
  const a = archetypeById(job.archetype);
  const sat = clamp(avgQuality * 0.6 + job.satisfaction * 0.3 + (job.contract ? 6 : 0) + job.mishapsSolved.length * 2);
  const stars = sat > 88 ? 5 : sat > 74 ? 4 : sat > 58 ? 3 : sat > 42 ? 2 : 1;
  const good = [
    `${job.name}: "He made me feel like I knew what I was doing. Gallery came back fast."`,
    `${job.name}: "Best pictures I ever had of myself. Booking again."`,
    `${job.name}: "Professional, clear, funny. The light in these? Come on."`,
  ];
  const mid = [
    `${job.name}: "Pictures were nice. Took a minute to get them back."`,
    `${job.name}: "Good session, a couple I didn\u2019t love, but solid."`,
  ];
  const bad = [
    `${job.name}: "Some of them was blurry. And why my face look like a doll?"`,
    `${job.name}: "It was okay. I expected more for the price."`,
  ];
  const review = stars >= 4 ? pick(good) : stars === 3 ? pick(mid) : pick(bad);
  const repGain = Math.round((stars - 2.4) * 4 + avgQuality / 22);
  return { stars, review, sat, repGain };
}

// ------------------------------------------------------------------
// Lenz
// ------------------------------------------------------------------
export function postToLenz(photo: Photo, caption: string) {
  const viralRoll = Math.random();
  const q = photo.score.total;
  const viral = viralRoll > 0.9;
  const base = state.lenz.followers * rnd(0.12, 0.3) + q * rnd(1.2, 3.4);
  const likes = Math.round(viral ? base * rnd(6, 14) : q < 55 && viralRoll > 0.78 ? base * 3 : base);
  const gained = Math.round(likes / rnd(9, 20)) + (viral ? 180 : 0);
  const comments = [
    'this is HIM over there fr',
    'okay the lighting though',
    'who shot this?? how much you charge',
    viral ? 'algorithm blessed you' : 'clean. real clean.',
  ];
  set((s) => ({
    lenz: {
      followers: s.lenz.followers + gained,
      posts: [{ id: uid(), url: photo.url, caption, likes, comments, viral, day: s.day }, ...s.lenz.posts].slice(0, 20),
    },
  }));
  track('lenz_post', { likes, followers_gained: gained, quality: Math.round(q) });
  if (viral) say('A mid frame just went viral. Follower count is not skill.', 'info');
  if (state.history.length > 0 && !state.missionDone) window.setTimeout(() => completeMission(), 1200);
  return { likes, gained, viral };
}


// ------------------------------------------------------------------
// Progression
// ------------------------------------------------------------------
export function checkStudioUnlock() {
  if (!state.studioUnlocked && state.rep >= GOAL.rep && state.money >= GOAL.money) {
    set({ flags: { ...state.flags, studioAvailable: true } });
    say(`Loft 4B just became real. Rep ${Math.round(state.rep)}, ${fmtMoney(state.money)} in the account.`, 'good');
  }
}
export function leaseStudio() {
  if (state.money < 3400) { say('Not yet. First month plus deposit is $3,400.', 'bad'); return false; }
  addMoney(-3400, 'Loft 4B \u2014 first month + deposit');
  set({ studioUnlocked: true, act2: true });
  track('studio_leased', { revenue: 0, day: state.day });
  return true;
}

// ------------------------------------------------------------------
// Mission script (first mission objectives)
// ------------------------------------------------------------------
export const MISSION_STEPS = [
  'Answer Tasha on the phone (Tab \u2192 Inquiries)',
  'Choose a package and send your price',
  'Handle the negotiation',
  'Secure the deposit',
  'Build the moodboard (pick 3 references)',
  'Pack your gear at the apartment',
  'Get to the Graffiti Alley',
  'Meet Tasha and place your light',
  'Raise the camera (C) and set exposure',
  'Direct her \u2014 get her confidence up',
  'Shoot at least 12 frames',
  'Handle whatever goes wrong',
  'Head home and back up the files',
  'Cull the keepers',
  'Retouch the selects',
  'Deliver the gallery',
  'Collect the balance and read the review',
  'Post one frame on Lenz',
];
export function setMission(i: number) {
  if (i > state.mission) set({ mission: i });
}
export function completeMission() {
  if (state.missionDone) return;
  set({ missionDone: true });
  say('\u2026this might actually work.', 'good');
  track('mission_complete', { mission: 'how_much_you_charge' });
}

export function packedHas(id: string) { return state.packed.includes(id); }
export function ownsGear(id: string) { return state.ownedGear.includes(id); }
export function buyGear(id: string) {
  const g = gearById(id);
  if (!g || state.ownedGear.includes(id)) return false;
  if (state.money < g.price) { say('Bank said no. Politely.', 'bad'); return false; }
  addMoney(-g.price, `Aperture Alley \u2014 ${g.name}`);
  set((s) => ({ ownedGear: [...s.ownedGear, id] }));
  track('purchase', { revenue: g.price, product: g.name });
  return true;
}

export const activeLensFocal = () => {
  if (state.ownedGear.includes('lens-85')) return 85;
  return 35;
};
