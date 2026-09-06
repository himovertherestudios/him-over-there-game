import {
  getState, set, addMoney, stat, skillUp, say, advanceTime, remember, reply, setInquiryStatus,
  bookJob, updateJob, generateReview, makeInquiry, pushInquiry, clamp, pick, uid, track, learn,
  Inquiry, Job, Photo, fmtMoney, checkStudioUnlock, setMission,
} from './store';
import { MISHAPS, Mishap, Pkg, archetypeById, FOOD, LOTS } from './data';
import { engine } from './engine';
import { sfx } from './audio';

// ---------------------------------------------------------------
// Negotiation
// ---------------------------------------------------------------
export interface NegotiationChoice {
  id: string;
  label: string;
  hint: string;
  apply: (inq: Inquiry, price: number) => { price: number; text: string; them?: string; close?: 'accept' | 'ghost' | 'walk' };
}

export function negotiationChoices(inq: Inquiry, price: number): NegotiationChoice[] {
  const a = archetypeById(inq.archetype);
  const cheap = a.id === 'kevin';
  return [
    {
      id: 'stand', label: 'Explain the value', hint: 'Respect +, small chance they still walk',
      apply: () => {
        const win = Math.random() < 0.55 + getState().skills.business / 250;
        stat({ stress: 3 });
        skillUp('business', 3);
        return win
          ? { price, text: '"That price covers the light, the edit and the license. I don\u2019t do discounts, I do packages."', them: 'okay okay I got you. when we shooting', close: 'accept' as const }
          : { price, text: '"That price covers the light, the edit and the license."', them: 'seen \u2713\u2713' , close: 'ghost' as const };
      },
    },
    {
      id: 'counter', label: 'Counteroffer', hint: 'Meet in the middle',
      apply: (i, p) => {
        const mid = Math.round((p + i.budget) / 2 / 5) * 5;
        const win = Math.random() < 0.78;
        skillUp('business', 2);
        return win
          ? { price: mid, text: `"I can do ${fmtMoney(mid)} if we keep it to one location."`, them: 'bet. that works', close: 'accept' as const }
          : { price: mid, text: `"I can do ${fmtMoney(mid)}."`, them: 'lemme think about it', close: 'ghost' as const };
      },
    },
    {
      id: 'smaller', label: 'Offer a smaller package', hint: 'Less money, keeps the client',
      apply: (i) => {
        const p = getState().packages[0];
        skillUp('business', 2);
        return { price: p.price, text: `"Then let\u2019s do the ${p.name} \u2014 ${p.images} images, ${p.retouched} retouched. ${fmtMoney(p.price)}."`, them: 'okay yeah that\u2019s better', close: 'accept' as const };
      },
    },
    {
      id: 'accept', label: 'Just take their number', hint: 'Money now, respect later',
      apply: (i) => {
        stat({ stress: 6 });
        remember(i.archetype, 'Got me down to their number without a fight.', -4);
        return { price: i.budget, text: `"Aight. ${fmtMoney(i.budget)}."`, them: 'okayyy see you Saturday', close: 'accept' as const };
      },
    },
    {
      id: 'fee', label: 'Add a fee for the extras', hint: cheap ? 'He will feel some type of way' : 'Charge for what they asked for',
      apply: (i, p) => {
        const np = p + 45;
        return Math.random() < 0.6
          ? { price: np, text: '"Extra people is $45. Everybody eats."', them: 'fine', close: 'accept' as const }
          : { price: p, text: '"Extra people is $45."', them: 'nah I\u2019ll just ask my cousin', close: 'walk' as const };
      },
    },
    {
      id: 'walk', label: 'Walk away', hint: 'Stress down, money zero',
      apply: () => {
        stat({ stress: -6 });
        say('Some money costs too much.');
        return { price: 0, text: '"I don\u2019t think I\u2019m the right photographer for this one. Good luck."', them: '\u2026', close: 'walk' as const };
      },
    },
  ];
}

export function runNegotiation(inq: Inquiry, choice: NegotiationChoice, price: number) {
  const res = choice.apply(inq, price);
  reply(inq.id, res.text, 'me');
  if (res.them) window.setTimeout(() => reply(inq.id, res.them!, 'them'), 700);
  if (res.close === 'ghost') {
    setInquiryStatus(inq.id, 'ghosted');
    remember(inq.archetype, 'Went quiet after the price.', -2);
    say('Seen. No reply. Cool.', 'bad');
    window.setTimeout(() => {
      reply(inq.id, 'still available?', 'them');
      setInquiryStatus(inq.id, 'negotiating');
      sfx.buzz();
    }, 45000);
  }
  if (res.close === 'walk') {
    setInquiryStatus(inq.id, 'declined');
  }
  advanceTime(6);
  return res;
}

// ---------------------------------------------------------------
// Booking / deposit
// ---------------------------------------------------------------
export function confirmBooking(inq: Inquiry, pkg: Pkg, price: number, contract: boolean, location: string) {
  const job = bookJob(inq, pkg, price, contract, location);
  reply(inq.id, `Locked in. ${pkg.name} \u2014 ${fmtMoney(price)}, ${inq.date}, ${location}. Deposit link sent.`, 'me');
  say(`Booked: ${inq.name}, ${fmtMoney(price)}.`, 'good');
  setMission(4);
  return job;
}

export function collectDeposit() {
  const job = getState().job;
  if (!job || job.paidDeposit) return;
  const a = archetypeById(job.archetype);
  const paid = Math.random() < a.reliability + (job.contract ? 0.15 : 0);
  if (paid) {
    addMoney(job.deposit, `Deposit \u2014 ${job.name}`);
    updateJob({ paidDeposit: true });
    reply(job.inquiryId, `Deposit received \u2014 ${fmtMoney(job.deposit)}. See you ${job.location === 'graffiti alley' ? 'at the alley' : 'there'}.`, 'me');
    sfx.cash();
    say(`Deposit in: ${fmtMoney(job.deposit)}. That's gas and lunch.`, 'money');
    skillUp('business', 4);
    track('deposit_collected', { revenue: job.deposit, client: job.name });
    setMission(4);
  } else {
    say('"I\u2019ll send it the day of." Sure you will.', 'bad');
    remember(job.archetype, 'Dodged the deposit.', -6);
  }
}

// ---------------------------------------------------------------
// Mishaps
// ---------------------------------------------------------------
export function rollMishap(where: 'shoot' | 'travel'): Mishap | null {
  const pool = MISHAPS.filter((m) => m.where === where);
  return pool.length ? pick(pool) : null;
}
export function resolveMishap(m: Mishap, optIndex: number) {
  const o = m.options[optIndex];
  if (o.needs && !getState().packed.includes(o.needs)) {
    say(`You didn\u2019t pack that. ${o.needs === 'battery' ? 'The spare is on the desk at home.' : 'Not in the bag.'}`, 'bad');
    return false;
  }
  if (o.money) addMoney(o.money, `${m.title} \u2014 ${o.label}`);
  stat({ rep: o.rep || 0, energy: o.energy || 0, stress: o.stress || 0 });
  if (o.conf) engine.setConfidence(engine.subjectConfidence + o.conf);
  const job = getState().job;
  if (job) updateJob({ mishapsSolved: [...job.mishapsSolved, m.id], confidence: engine.subjectConfidence });
  say(o.result, (o.rep || 0) >= 0 ? 'good' : 'bad');
  advanceTime(8);
  return true;
}

// ---------------------------------------------------------------
const LOCATION_LOTS: Record<string, string> = {
  'graffiti alley': 'alley',
  'under the tracks': 'tracks',
  'the rented studio': 'studio',
  'the salon': 'salon',
  'my place': 'alley',
};

export function startShoot(job: Job) {
  const lotId = LOCATION_LOTS[job.location] || 'alley';
  const lot = LOTS.find((l) => l.id === lotId) || LOTS.find((l) => l.id === 'alley')!;
  const spot: [number, number] = lot.enterable
    ? [lot.door[0], lot.door[1] + 3]
    : [lot.pos[0], lot.pos[1] + (lotId === 'alley' ? 2 : 0)];
  engine.setSubject(job.archetype, spot, job.confidence);
  engine.teleport(spot[0] + 0.4, spot[1] + 4.2);
  updateJob({ stage: 'shooting' });
  setMission(7);
  say(`${job.name} is here. Confidence reads about ${Math.round(job.confidence)}. Press C to raise the camera.`, 'info');
}


export function directSubject(optId: string, conf: number, pose: number, line: string) {
  const before = engine.subjectConfidence;
  engine.setConfidence(before + conf);
  const job = getState().job;
  if (job) updateJob({ confidence: engine.subjectConfidence, satisfaction: clamp(job.satisfaction + (conf > 0 ? 1.2 : -3)) });
  skillUp('posing', conf > 0 ? 2 : 0);
  say(line, conf > 0 ? 'good' : 'bad');
  void optId; void pose;
  advanceTime(2);
}

export function finishShoot() {
  const job = getState().job;
  if (!job) return;
  updateJob({ stage: 'backup' });
  engine.clearSubject();
  engine.exitCameraMode();
  advanceTime(35);
  stat({ energy: -14, stress: 5 });
  skillUp('exposure', 4);
  skillUp('lighting', 4);
  say('Wrapped. Now the part nobody posts about: the files.', 'info');
  setMission(12);
}

// ---------------------------------------------------------------
// Delivery / review / payment
// ---------------------------------------------------------------
export function deliverGallery() {
  const s = getState();
  const job = s.job;
  if (!job) return null;
  const selects = s.photos.filter((p) => p.jobId === job.id && p.starred);
  const avg = selects.length ? selects.reduce((a, p) => a + p.score.total + (p.retouched ? 8 : 0), 0) / selects.length : 30;
  const { stars, review, sat, repGain } = generateReview(job, avg);
  reply(job.inquiryId, `Gallery\u2019s ready \u2014 ${selects.length} images, ${selects.filter((p) => p.retouched).length} retouched. Link sent to your email.`, 'me');
  window.setTimeout(() => { reply(job.inquiryId, review.split(': ')[1] || 'Thank you!!', 'them'); sfx.buzz(); }, 1200);

  const owed = job.price - (job.paidDeposit ? job.deposit : 0);
  const willPay = job.contract || Math.random() < archetypeById(job.archetype).reliability + 0.25;
  if (willPay) {
    addMoney(owed, `Balance \u2014 ${job.name}`);
    sfx.cash();
    say(`Balance cleared: ${fmtMoney(owed)}.`, 'money');
    track('purchase', { revenue: owed, product: `${job.pkg.name} session`, client: job.name });
  } else {
    say('"Can I pay you next week?" No contract, no leverage. Lesson filed.', 'bad');
    remember(job.archetype, 'Still owes the balance. No contract signed.', -12);
  }
  stat({ rep: repGain, creativity: 3 });
  skillUp('business', 3);
  skillUp('networking', Math.round(archetypeById(job.archetype).networking * 5));
  remember(job.archetype, `${stars}\u2605 \u2014 ${job.pkg.name} session, ${selects.length} delivered.`, stars >= 4 ? 12 : stars === 3 ? 2 : -8);
  updateJob({ stage: 'complete', stars, review, satisfaction: sat, paidBalance: willPay, delivered: selects.length });
  set((st) => ({ history: [...st.history, { ...job, stage: 'complete', stars, review, delivered: selects.length }] }));
  advanceTime(120);
  checkStudioUnlock();
  setMission(15);
  track('gallery_delivered', { stars, images: selects.length });
  return { stars, review, owed, willPay };
}

export function afterFirstJobHook() {
  const s = getState();
  if (s.flags.dreInquiry) return;
  set({ flags: { ...s.flags, dreInquiry: true } });
  const inq = makeInquiry('dre');
  inq.thread = [{ from: 'them', text: 'yo who shot this? how much you charge?', t: s.clock }];
  window.setTimeout(() => {
    pushInquiry(inq);
    sfx.buzz();
    say('\u2026this might actually work.', 'good');
  }, 2500);
}

export function randomInquiry() {
  const s = getState();
  if (s.inquiries.filter((i) => i.status === 'new').length >= 4) return;
  const roll = Math.random() * 100;
  if (roll > 34 + s.rep) return;
  const inq = makeInquiry();
  pushInquiry(inq);
  sfx.buzz();
}

// ---------------------------------------------------------------
// Life sim
// ---------------------------------------------------------------
export function sleep() {
  const s = getState();
  const toMorning = s.clock < 8 * 60 ? 8 * 60 - s.clock : 24 * 60 - s.clock + 8 * 60;
  advanceTime(toMorning);
  stat({ energy: 65, stress: -22, hunger: -30 });
  set({ cardUsed: getState().cardUsed });
  say('Eight hours. Radiator won.', 'good');
  randomInquiry();
}
export function eat(id: string) {
  const f = FOOD.find((x) => x.id === id)!;
  if (getState().money < f.price) { say('Card declined. Loudly.', 'bad'); return; }
  addMoney(-f.price, f.name);
  stat({ energy: f.energy, hunger: f.hunger, stress: f.stress });
  advanceTime(25);
  say(`${f.name}. Worth it.`, 'good');
}
export function gym() {
  stat({ energy: -18, stress: -16, rep: 0 });
  advanceTime(70);
  set({ flags: { ...getState().flags, gym: true } });
  say('Legs are done. Head is clear.', 'good');
}
export function relaxTV() {
  advanceTime(60);
  stat({ stress: -10, energy: 6 });
  say('Two episodes. One nap. Call it research.');
}
export function networkAtBar() {
  const s = getState();
  advanceTime(90);
  stat({ energy: -12, stress: -14 });
  addMoney(-18, 'The Low End \u2014 two drinks');
  skillUp('networking', 6);
  if (Math.random() < 0.55 + s.skills.networking / 200) {
    const who = pick(['monique', 'dre', 'alvarez']);
    const inq = makeInquiry(who);
    pushInquiry(inq);
    remember(who, 'Met at The Low End. Vibes were good.', 8);
    sfx.buzz();
    say(`Met ${archetypeById(who).name}. She took your number and actually used it.`, 'good');
  } else {
    say('Nobody who books anybody was in there tonight. Still, the music was right.');
  }
}
export function fastTravel(toId: string) {
  if (getState().money < 12) { say('Pivot needs $12. You have vibes.', 'bad'); return false; }
  const lot = LOTS.find((l) => l.id === toId);
  if (!lot) return false;
  addMoney(-12, `Pivot ride \u2014 ${lot.name}`);
  advanceTime(14);
  stat({ energy: 4 });
  engine.setScene('district', [lot.door[0] + 2, lot.door[1] + 3]);
  say(`Pivot dropped you at ${lot.name}. Driver had opinions about the Bears.`, 'info');
  return true;
}

// ---------------------------------------------------------------
// Parking
// ---------------------------------------------------------------
export function checkParkingOnExit() {
  if (engine.isParked()) return;
  if (Math.random() < 0.55) {
    addMoney(-60, 'Parking ticket');
    say('Parking ticket. $60. "Of course."', 'bad');
    track('parking_ticket', { amount: 60 });
  } else {
    say('Not a legal spot. You\u2019re rolling the dice and you know it.', 'bad');
  }
}

// ---------------------------------------------------------------
// Retouch / cull helpers
// ---------------------------------------------------------------
export function backupFiles(skipped: boolean) {
  const s = getState();
  updateJob({ stage: 'cull' });
  set({ flags: { ...s.flags, skippedBackup: skipped || s.flags.skippedBackup } });
  advanceTime(20);
  if (skipped) say('Skipped the backup. One drive, one copy, one prayer.', 'bad');
  else { say('Backed up. Two copies or it didn\u2019t happen.', 'good'); skillUp('retouch', 2); }
  setMission(13);
}

export function retouchPhoto(id: string, edits: NonNullable<Photo['edits']>) {
  const s = getState();
  const skill = s.skills.retouch;
  const minutes = Math.max(4, 18 - skill / 8);
  advanceTime(minutes);
  stat({ energy: -3, stress: 1 });
  skillUp('retouch', 2);
  const plastic = edits.smooth > 70;
  set({
    photos: s.photos.map((p) => (p.id === id
      ? { ...p, retouched: true, edits, score: { ...p.score, total: clamp(p.score.total + (plastic ? -9 : 7)) } }
      : p)),
  });
  if (plastic) { say('Smoothing past 70 is how you get "why my face look like a doll".', 'bad'); learn('comp'); }
  else say('Clean. Skin still has texture. That\u2019s the whole job.', 'good');
  setMission(14);
}

export function newPhoto(jobId: string, thumb: string, settings: Photo['settings'], score: Photo['score'], tags: string[], lesson?: string): Photo {
  return { id: uid(), url: thumb, jobId, settings, score, tags, lesson, starred: false, retouched: false };
}
