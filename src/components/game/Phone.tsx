import React, { useMemo, useState } from 'react';
import {
  MessageSquare, Mail, Inbox, Calendar, Map as MapIcon, Camera, Wallet, BriefcaseBusiness,
  Globe, Users, CloudRain, Car, ShoppingBag, NotebookPen, ChevronLeft, Send, Star, Heart, X,
} from 'lucide-react';
import {
  useGame, getState, fmtMoney, fmtClock, set, addMoney, postToLenz, Inquiry, fullUrl,
} from '@/game/store';
import { LOTS, GEAR, LESSONS, archetypeById, Pkg } from '@/game/data';
import { negotiationChoices, runNegotiation, confirmBooking, collectDeposit, fastTravel } from '@/game/actions';
import { Btn, Chip, Bar, cx, Slide } from './ui';
import { sfx } from '@/game/audio';

type AppId = 'home' | 'messages' | 'mail' | 'inquiries' | 'calendar' | 'map' | 'lenz' | 'bank'
  | 'business' | 'website' | 'contacts' | 'weather' | 'pivot' | 'market' | 'notebook';

const APPS: { id: AppId; label: string; icon: React.ElementType; tint: string }[] = [
  { id: 'messages', label: 'Messages', icon: MessageSquare, tint: 'bg-emerald-500/20 text-emerald-300' },
  { id: 'inquiries', label: 'Inquiries', icon: Inbox, tint: 'bg-amber-500/20 text-amber-300' },
  { id: 'mail', label: 'Mail', icon: Mail, tint: 'bg-sky-500/20 text-sky-300' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, tint: 'bg-rose-500/20 text-rose-300' },
  { id: 'map', label: 'Map', icon: MapIcon, tint: 'bg-lime-500/20 text-lime-300' },
  { id: 'lenz', label: 'Lenz', icon: Camera, tint: 'bg-fuchsia-500/20 text-fuchsia-300' },
  { id: 'bank', label: 'PocketBank', icon: Wallet, tint: 'bg-teal-500/20 text-teal-300' },
  { id: 'business', label: 'Business', icon: BriefcaseBusiness, tint: 'bg-orange-500/20 text-orange-300' },
  { id: 'website', label: 'Website', icon: Globe, tint: 'bg-indigo-500/20 text-indigo-300' },
  { id: 'contacts', label: 'Contacts', icon: Users, tint: 'bg-cyan-500/20 text-cyan-300' },
  { id: 'weather', label: 'Weather', icon: CloudRain, tint: 'bg-blue-500/20 text-blue-300' },
  { id: 'pivot', label: 'Pivot', icon: Car, tint: 'bg-violet-500/20 text-violet-300' },
  { id: 'market', label: 'ShutterMarket', icon: ShoppingBag, tint: 'bg-yellow-500/20 text-yellow-300' },
  { id: 'notebook', label: 'Notebook', icon: NotebookPen, tint: 'bg-stone-500/20 text-stone-300' },
];

const Row: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cx('flex items-center justify-between border-b border-white/6 px-3 py-2 text-[11px]', className)}>{children}</div>
);

// ---------------------------------------------------------------
export const Phone: React.FC<{ onClose: () => void; onMoodboard: () => void; onWaypoint: (id: string) => void }> = ({ onClose, onMoodboard, onWaypoint }) => {
  const s = useGame((g) => g);
  const [app, setApp] = useState<AppId>('home');
  const [openInq, setOpenInq] = useState<string | null>(null);
  const [pkgSel, setPkgSel] = useState<string>('standard');
  const [price, setPrice] = useState<number>(300);
  const [contract, setContract] = useState(true);
  const [caption, setCaption] = useState('bronzewood. one light. no excuses.');
  const [lenzPick, setLenzPick] = useState<string | null>(null);

  const inq = s.inquiries.find((i) => i.id === openInq) || null;
  const activeApp = APPS.find((a) => a.id === app);

  const monthly = useMemo(() => {
    const rev = s.ledger.filter((l) => l.amount > 0).reduce((a, b) => a + b.amount, 0);
    const exp = s.ledger.filter((l) => l.amount < 0).reduce((a, b) => a + b.amount, 0);
    return { rev, exp: Math.abs(exp), profit: rev + exp, tax: Math.max(0, (rev + exp) * 0.22) };
  }, [s.ledger]);

  const openInquiry = (i: Inquiry) => {
    setOpenInq(i.id);
    const pk = s.packages.find((p) => p.id === pkgSel) || s.packages[1];
    setPrice(pk.price);
  };

  const body = () => {
    switch (app) {
      // ---------------- HOME ----------------
      case 'home':
        return (
          <div className="grid grid-cols-4 gap-3 p-4">
            {APPS.map((a) => {
              const badge = a.id === 'inquiries' ? s.inquiries.filter((i) => i.status === 'new').length : 0;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { sfx.click(); setApp(a.id); }}
                  className="group relative flex flex-col items-center gap-1.5 focus-visible:outline-none"
                >
                  <span className={cx('relative flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-amber-400', a.tint)}>
                    <a.icon className="h-5 w-5" />
                    {badge > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{badge}</span>
                    )}
                  </span>
                  <span className="text-center text-[8.5px] leading-tight text-stone-400">{a.label}</span>
                </button>
              );
            })}
          </div>
        );

      // ---------------- INQUIRIES ----------------
      case 'inquiries': {
        if (inq) {
          const a = archetypeById(inq.archetype);
          const job = s.job;
          const mine = job && job.inquiryId === inq.id ? job : null;
          return (
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                <button type="button" onClick={() => { sfx.back(); setOpenInq(null); }} className="text-stone-400 hover:text-amber-300"><ChevronLeft className="h-4 w-4" /></button>
                <div>
                  <p className="text-xs font-semibold text-stone-100">{inq.name}</p>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-stone-500">{a.tag} &middot; {inq.genre} &middot; budget ~{fmtMoney(inq.budget)}</p>
                </div>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                <div className="rounded-md border border-white/8 bg-white/[0.03] p-2 text-[10px] leading-relaxed text-stone-400">
                  <p><span className="text-stone-500">Wants:</span> {inq.images} images &middot; {inq.concept}</p>
                  <p><span className="text-stone-500">When:</span> {inq.date} &middot; <span className="text-stone-500">Where:</span> {inq.location}</p>
                  <p><span className="text-stone-500">Usage:</span> {inq.usage} &middot; <span className="text-stone-500">Experience:</span> {inq.experience}</p>
                </div>
                {inq.thread.map((m, i) => (
                  <div key={i} className={cx('max-w-[80%] rounded-2xl px-3 py-1.5 text-[11px] leading-snug', m.from === 'me' ? 'ml-auto bg-amber-400/90 text-black' : 'bg-white/8 text-stone-200')}>
                    {m.text}
                  </div>
                ))}
                {inq.status === 'ghosted' && <p className="text-center font-mono text-[9px] uppercase tracking-widest text-stone-600">seen &#10003;&#10003;</p>}
              </div>

              {mine ? (
                <div className="space-y-2 border-t border-white/10 p-3">
                  <Row><span className="text-stone-400">{mine.pkg.name} package</span><span className="text-amber-300">{fmtMoney(mine.price)}</span></Row>
                  <Row><span className="text-stone-400">Deposit ({s.depositPct}%)</span><span className={mine.paidDeposit ? 'text-emerald-300' : 'text-stone-500'}>{mine.paidDeposit ? 'PAID' : fmtMoney(mine.deposit)}</span></Row>
                  <div className="flex flex-wrap gap-2">
                    {!mine.paidDeposit && <Btn variant="gold" size="sm" onClick={collectDeposit}>Request deposit</Btn>}
                    {mine.paidDeposit && mine.concept.length < 3 && <Btn variant="gold" size="sm" onClick={() => { onMoodboard(); onClose(); }}>Build moodboard</Btn>}
                    {mine.concept.length >= 3 && <Chip tone="good">Concept locked: {mine.concept.join(' / ')}</Chip>}
                  </div>
                </div>
              ) : inq.status === 'booked' || inq.status === 'done' ? (
                <div className="border-t border-white/10 p-3 text-[10px] text-stone-500">This one is closed out.</div>
              ) : inq.status === 'declined' ? (
                <div className="border-t border-white/10 p-3 text-[10px] text-stone-500">You walked. Sometimes that&apos;s the whole move.</div>
              ) : (
                <div className="space-y-2 border-t border-white/10 p-3">
                  <div className="flex gap-1">
                    {s.packages.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { sfx.click(); setPkgSel(p.id); setPrice(p.price); }}
                        className={cx('flex-1 rounded border px-1.5 py-1 text-left transition-colors', pkgSel === p.id ? 'border-amber-400/70 bg-amber-400/10' : 'border-white/10 hover:border-white/25')}
                      >
                        <span className="block text-[10px] font-semibold text-stone-200">{p.name}</span>
                        <span className="block font-mono text-[9px] text-amber-300">{fmtMoney(p.price)}</span>
                        <span className="block text-[8px] text-stone-500">{p.images} img &middot; {p.retouched} rt</span>
                      </button>
                    ))}
                  </div>
                  <Slide label="Your price" value={price} min={50} max={900} step={5} onChange={setPrice} fmt={(v) => fmtMoney(v)} />
                  <label className="flex cursor-pointer items-center gap-2 text-[10px] text-stone-400">
                    <input type="checkbox" checked={contract} onChange={(e) => setContract(e.target.checked)} className="accent-amber-400" />
                    Send the contract (deposit non-refundable, {s.clauses.deliveryDays}-day delivery, no RAWs)
                  </label>
                  {inq.thread.length < 3 ? (
                    <Btn
                      variant="gold"
                      className="w-full"
                      onClick={() => {
                        const pk = s.packages.find((p) => p.id === pkgSel)!;
                        const st = getState();
                        set({ inquiries: st.inquiries.map((x) => (x.id === inq.id ? { ...x, status: 'negotiating', thread: [...x.thread, { from: 'me', text: `${pk.name} is ${fmtMoney(price)} \u2014 ${pk.images} images, ${pk.retouched} retouched, about ${pk.minutes} minutes.`, t: st.clock }] } : x)) });
                        window.setTimeout(() => {
                          const st2 = getState();
                          const push = inq.budget < price
                            ? (inq.archetype === 'tasha' ? 'that\u2019s a lot\u2026 can you do 100?' : 'can you do it cheaper?')
                            : 'okay bet, send me the deposit link';
                          set({ inquiries: st2.inquiries.map((x) => (x.id === inq.id ? { ...x, thread: [...x.thread, { from: 'them', text: push, t: st2.clock }] } : x)) });
                          sfx.buzz();
                        }, 900);
                      }}
                    >
                      <Send className="h-3 w-3" /> Send the price
                    </Btn>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {negotiationChoices(inq, price).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          title={c.hint}
                          onClick={() => {
                            sfx.click();
                            const res = runNegotiation(inq, c, price);
                            if (res.close === 'accept') {
                              const pk = s.packages.find((p) => p.id === pkgSel)! as Pkg;
                              window.setTimeout(() => confirmBooking(getState().inquiries.find((x) => x.id === inq.id)!, pk, res.price, contract, inq.location), 900);
                            }
                          }}
                          className="rounded border border-white/10 px-2 py-1.5 text-left text-[10px] text-stone-300 transition-colors hover:border-amber-400/60 hover:bg-amber-400/5"
                        >
                          <span className="block font-medium">{c.label}</span>
                          <span className="block text-[8.5px] text-stone-500">{c.hint}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }
        return (
          <div className="divide-y divide-white/6">
            {s.inquiries.length === 0 && <p className="p-6 text-center text-[11px] text-stone-500">No inquiries yet. Post something. Talk to somebody. Exist.</p>}
            {s.inquiries.map((i) => (
              <button key={i.id} type="button" onClick={() => { sfx.click(); openInquiry(i); }} className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-amber-300">{i.name[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[11px] font-semibold text-stone-100">{i.name}</span>
                    <Chip tone={i.status === 'new' ? 'gold' : i.status === 'booked' ? 'good' : i.status === 'ghosted' ? 'bad' : 'neutral'}>{i.status}</Chip>
                  </span>
                  <span className="block truncate text-[10px] text-stone-500">{i.thread[i.thread.length - 1].text}</span>
                </span>
              </button>
            ))}
          </div>
        );
      }

      // ---------------- MESSAGES ----------------
      case 'messages':
        return (
          <div className="divide-y divide-white/6">
            <Row><span className="text-stone-300">Keisha</span><span className="text-stone-500">you still got that camera?</span></Row>
            {s.inquiries.map((i) => (
              <Row key={i.id}><span className="text-stone-300">{i.name}</span><span className="max-w-[55%] truncate text-stone-500">{i.thread[i.thread.length - 1].text}</span></Row>
            ))}
            {s.history.map((h) => (
              <Row key={h.id}><span className="text-stone-300">{h.name}</span><span className="text-emerald-300/80">{h.stars}&#9733; review posted</span></Row>
            ))}
            {getState().money < 0 && <Row><span className="text-red-300">PocketBank</span><span className="text-stone-500">You are overdrawn. Again. Love, the bank.</span></Row>}
          </div>
        );

      // ---------------- MAIL ----------------
      case 'mail':
        return (
          <div className="divide-y divide-white/6">
            <div className="px-3 py-2.5">
              <p className="text-[11px] font-semibold text-stone-200">Loft 4B Rentals &mdash; availability</p>
              <p className="mt-1 text-[10px] leading-relaxed text-stone-500">The 4th-floor loft is $1,700/mo. First month plus deposit due at signing ($3,400). We require proof of steady bookings.</p>
            </div>
            {s.history.slice(-4).reverse().map((h) => (
              <div key={h.id} className="px-3 py-2.5">
                <p className="text-[11px] font-semibold text-stone-200">Receipt &mdash; {h.name}</p>
                <p className="mt-1 text-[10px] text-stone-500">{h.pkg.name} package, {fmtMoney(h.price)}. {h.contract ? 'Contract on file.' : 'No contract on file.'}</p>
              </div>
            ))}
            <div className="px-3 py-2.5">
              <p className="text-[11px] font-semibold text-stone-200">Darkroom Suite &mdash; subscription</p>
              <p className="mt-1 text-[10px] text-stone-500">$20/mo. Renews on the 12th whether you edited anything or not.</p>
            </div>
          </div>
        );

      // ---------------- CALENDAR ----------------
      case 'calendar':
        return (
          <div className="space-y-2 p-3 text-[11px]">
            <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">Day {s.day} &middot; {fmtClock(s.clock)}</p>
            {s.job && (
              <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-2">
                <p className="font-semibold text-amber-300">{s.job.name} &mdash; {s.job.genre}</p>
                <p className="text-[10px] text-stone-400">{s.job.location} &middot; {s.job.pkg.name} &middot; {fmtMoney(s.job.price)}</p>
                <p className="text-[10px] text-stone-500">Stage: {s.job.stage}</p>
              </div>
            )}
            <div className="rounded-md border border-white/8 p-2">
              <p className="text-stone-300">Rent &mdash; $900</p>
              <p className="text-[10px] text-stone-500">Auto-drafts on the 1st. It does not negotiate.</p>
            </div>
            <div className="rounded-md border border-white/8 p-2">
              <p className="text-stone-300">Phone bill &mdash; $60 &middot; Darkroom &mdash; $20</p>
              <p className="text-[10px] text-stone-500">The cost of being reachable and being able to edit.</p>
            </div>
          </div>
        );

      // ---------------- MAP ----------------
      case 'map':
        return (
          <div className="divide-y divide-white/6">
            {LOTS.map((l) => (
              <Row key={l.id}>
                <span>
                  <span className="block text-stone-200">{l.name}</span>
                  <span className="block text-[9px] text-stone-500">{l.blurb}</span>
                </span>
                <Btn size="sm" variant="ghost" onClick={() => { onWaypoint(l.id); onClose(); }}>Set waypoint</Btn>
              </Row>
            ))}
          </div>
        );

      // ---------------- LENZ ----------------
      case 'lenz': {
        const pool = s.photos.filter((p) => p.starred);
        return (
          <div className="p-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-stone-100">{s.lenz.followers.toLocaleString()} <span className="text-[10px] font-normal text-stone-500">followers</span></p>
                <p className="text-[9px] text-stone-600">Follower count is not skill. Repeat it.</p>
              </div>
              <Chip tone="gold">@himoverthere</Chip>
            </div>
            {pool.length > 0 && (
              <div className="mb-3 rounded-md border border-white/10 p-2">
                <p className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-stone-500">New post</p>
                <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
                  {pool.slice(-8).map((p) => (
                    <button key={p.id} type="button" onClick={() => { sfx.click(); setLenzPick(p.id); }} className={cx('h-12 w-12 shrink-0 overflow-hidden rounded border-2 transition-colors', lenzPick === p.id ? 'border-amber-400' : 'border-transparent hover:border-white/30')}>
                      <img src={p.url} alt="Captured frame" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  aria-label="Caption"
                  className="mb-2 w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-stone-200 outline-none focus:border-amber-400/60"
                />
                <Btn
                  variant="gold"
                  size="sm"
                  disabled={!lenzPick}
                  onClick={() => {
                    const p = s.photos.find((x) => x.id === lenzPick);
                    if (!p) return;
                    const r = postToLenz(p, caption);
                    setLenzPick(null);
                    sfx.cash();
                    set({ notifications: getState().notifications + 1 });
                    window.setTimeout(() => { /* noop */ }, 0);
                    void r;
                  }}
                >Post</Btn>
              </div>
            )}
            <div className="space-y-3">
              {s.lenz.posts.map((p) => (
                <article key={p.id} className="overflow-hidden rounded-md border border-white/10">
                  <img src={p.url} alt={p.caption} className="w-full" />
                  <div className="p-2">
                    <p className="flex items-center gap-1 text-[10px] text-stone-300"><Heart className="h-3 w-3 text-rose-400" /> {p.likes.toLocaleString()} {p.viral && <Chip tone="gold">viral</Chip>}</p>
                    <p className="mt-0.5 text-[10px] text-stone-400">{p.caption}</p>
                    {p.comments.slice(0, 2).map((c, i) => <p key={i} className="text-[9px] text-stone-600">{c}</p>)}
                  </div>
                </article>
              ))}
              {s.lenz.posts.length === 0 && <p className="py-6 text-center text-[11px] text-stone-500">Nothing posted yet. The work doesn&apos;t market itself.</p>}
            </div>
          </div>
        );
      }

      // ---------------- BANK ----------------
      case 'bank':
        return (
          <div>
            <div className="border-b border-white/10 p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">Checking</p>
              <p className={cx('text-2xl font-semibold', s.money < 0 ? 'text-red-400' : 'text-stone-100')}>{fmtMoney(s.money)}</p>
              {s.money < 0 && <p className="mt-1 text-[10px] text-red-300">Overdraft fee incoming. The bank always finds you.</p>}
            </div>
            <div className="divide-y divide-white/6">
              {[...s.ledger].reverse().slice(0, 18).map((l, i) => (
                <Row key={i}>
                  <span><span className="block text-stone-300">{l.label}</span><span className="text-[9px] text-stone-600">Day {l.day}</span></span>
                  <span className={l.amount >= 0 ? 'text-emerald-300' : 'text-red-300'}>{l.amount >= 0 ? '+' : ''}{fmtMoney(l.amount)}</span>
                </Row>
              ))}
            </div>
          </div>
        );

      // ---------------- BUSINESS ----------------
      case 'business':
        return (
          <div className="space-y-3 p-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded border border-white/10 p-2"><p className="font-mono text-[9px] uppercase text-stone-500">Revenue</p><p className="text-xs text-emerald-300">{fmtMoney(monthly.rev)}</p></div>
              <div className="rounded border border-white/10 p-2"><p className="font-mono text-[9px] uppercase text-stone-500">Expenses</p><p className="text-xs text-red-300">{fmtMoney(monthly.exp)}</p></div>
              <div className="rounded border border-amber-400/30 bg-amber-400/5 p-2"><p className="font-mono text-[9px] uppercase text-stone-500">Profit</p><p className="text-xs text-amber-300">{fmtMoney(monthly.profit)}</p></div>
            </div>
            <p className="text-[9.5px] text-stone-500">Revenue is not profit. Set aside <span className="text-amber-300">{fmtMoney(monthly.tax)}</span> for quarterly taxes before you touch it.</p>

            <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">Packages</p>
            {s.packages.map((p, idx) => (
              <div key={p.id} className="rounded border border-white/10 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <input
                    value={p.name}
                    aria-label={`${p.name} package name`}
                    onChange={(e) => set({ packages: s.packages.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)) })}
                    className="w-28 rounded bg-transparent text-[11px] font-semibold text-stone-100 outline-none focus:bg-white/5"
                  />
                  <span className="font-mono text-[11px] text-amber-300">{fmtMoney(p.price)}</span>
                </div>
                <Slide label="Price" value={p.price} min={50} max={1200} step={10} onChange={(v) => set({ packages: s.packages.map((x, i) => (i === idx ? { ...x, price: v } : x)) })} fmt={fmtMoney} />
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <Slide label="Images" value={p.images} min={1} max={40} onChange={(v) => set({ packages: s.packages.map((x, i) => (i === idx ? { ...x, images: v } : x)) })} />
                  <Slide label="Retouched" value={p.retouched} min={0} max={p.images} onChange={(v) => set({ packages: s.packages.map((x, i) => (i === idx ? { ...x, retouched: v } : x)) })} />
                </div>
              </div>
            ))}

            <Slide label="Deposit %" value={s.depositPct} min={0} max={50} step={5} onChange={(v) => set({ depositPct: v })} fmt={(v) => `${v}%`} />

            <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">Contract clauses</p>
            <div className="space-y-1">
              {([
                ['depositNonRefundable', 'Deposit non-refundable'],
                ['cancellation', 'Cancellation policy'],
                ['lateArrival', '15-min grace, then session shortens'],
                ['rawFiles', 'RAW files included'],
                ['commercialLicense', 'Commercial license (+fee)'],
                ['locationFee', 'Location fee'],
              ] as const).map(([k, label]) => (
                <label key={k} className="flex cursor-pointer items-center justify-between text-[10px] text-stone-400">
                  <span>{label}</span>
                  <input type="checkbox" checked={Boolean(s.clauses[k])} onChange={(e) => set({ clauses: { ...s.clauses, [k]: e.target.checked } })} className="accent-amber-400" />
                </label>
              ))}
              <Slide label="Delivery days" value={s.clauses.deliveryDays} min={1} max={21} onChange={(v) => set({ clauses: { ...s.clauses, deliveryDays: v } })} />
            </div>
          </div>
        );

      // ---------------- WEBSITE ----------------
      case 'website':
        return (
          <div className="p-3">
            <div className="rounded-md border border-white/10 bg-black/40 p-3">
              <p style={{ fontFamily: '"Bradley Hand","Segoe Script",cursive' }} className="text-xl text-amber-300">Him Over There</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-stone-500">Portraits &middot; Beauty &middot; Branding &middot; Bronzewood</p>
              <div className="mt-3 grid grid-cols-3 gap-1">
                {s.photos.filter((p) => p.retouched).slice(-6).map((p) => (
                  <img key={p.id} src={p.url} alt="Portfolio frame" className="aspect-square w-full rounded object-cover" />
                ))}
                {s.photos.filter((p) => p.retouched).length === 0 && (
                  <p className="col-span-3 py-6 text-center text-[10px] text-stone-600">Portfolio empty. Go make something.</p>
                )}
              </div>
              <div className="mt-3 space-y-1">
                {s.packages.map((p) => (
                  <Row key={p.id} className="px-0"><span className="text-stone-300">{p.name} &mdash; {p.images} images</span><span className="text-amber-300">{fmtMoney(p.price)}</span></Row>
                ))}
              </div>
              <p className="mt-2 text-[9px] text-stone-600">Deposit {s.depositPct}% to hold the date. Balance due at delivery. No RAWs, and that&apos;s not personal.</p>
            </div>
          </div>
        );

      // ---------------- CONTACTS ----------------
      case 'contacts':
        return (
          <div className="divide-y divide-white/6">
            {s.contacts.map((c) => (
              <div key={c.id} className="px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-stone-100">{c.name} <Chip>{c.tag}</Chip></p>
                  <span className="font-mono text-[9px] text-stone-500">{c.phone}</span>
                </div>
                <div className="my-1.5"><Bar value={c.relationship} label="Relationship" color={c.relationship > 60 ? 'bg-emerald-400' : c.relationship > 35 ? 'bg-amber-400' : 'bg-red-400'} small /></div>
                {c.memory.slice(-3).map((m, i) => <p key={i} className="text-[9.5px] leading-snug text-stone-500">&bull; {m}</p>)}
              </div>
            ))}
          </div>
        );

      // ---------------- WEATHER ----------------
      case 'weather':
        return (
          <div className="p-4 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">Bronzewood</p>
            <p className="mt-1 text-3xl font-semibold capitalize text-stone-100">{s.weather}</p>
            <p className="mt-1 text-[11px] text-stone-500">{s.winter ? '19\u00b0F, feels like a personal attack' : s.weather === 'rain' ? '54\u00b0F and sideways' : s.weather === 'overcast' ? '61\u00b0F, gray as a parking garage' : '73\u00b0F, gorgeous, suspicious'}</p>
            <p className="mt-4 text-[10px] leading-relaxed text-stone-500">
              {s.weather === 'rain' ? 'Rain means the alley is out. Under the tracks is dry and the light is better anyway.'
                : s.weather === 'clear' ? 'Clear sky, hard sun. Look for open shade or bring the softbox close.'
                : 'Overcast is a free softbox the size of the sky. Use it.'}
            </p>
            <div className="mt-4 grid grid-cols-4 gap-1 text-[9px] text-stone-500">
              {['Tue', 'Wed', 'Thu', 'Fri'].map((d, i) => (
                <div key={d} className="rounded border border-white/8 p-1.5"><p className="text-stone-400">{d}</p><p>{['53\u00b0', '61\u00b0', '48\u00b0', '55\u00b0'][i]}</p></div>
              ))}
            </div>
          </div>
        );

      // ---------------- PIVOT ----------------
      case 'pivot':
        return (
          <div className="p-3">
            <p className="mb-2 text-[10px] text-stone-500">Ride share. $12 flat inside Bronzewood. Cheaper than a ticket, faster than walking on 14 energy.</p>
            <div className="space-y-1.5">
              {LOTS.filter((l) => l.kind !== 'park').map((l) => (
                <Row key={l.id}>
                  <span className="text-stone-300">{l.name}</span>
                  <Btn size="sm" disabled={s.money < 12} onClick={() => { if (fastTravel(l.id)) onClose(); }}>$12 &middot; Go</Btn>
                </Row>
              ))}
            </div>
          </div>
        );

      // ---------------- SHUTTERMARKET ----------------
      case 'market':
        return (
          <div className="divide-y divide-white/6">
            <p className="px-3 py-2 text-[10px] text-stone-500">Used gear from people who quit. Prices are firm until they aren&apos;t.</p>
            {GEAR.filter((g) => g.price > 0).map((g) => {
              const owned = s.ownedGear.includes(g.id);
              const usedPrice = Math.round(g.price * 0.82);
              return (
                <Row key={g.id}>
                  <span>
                    <span className="block text-stone-200">{g.name}</span>
                    <span className="block text-[9px] text-stone-500">{g.blurb} &middot; {g.benefit}</span>
                  </span>
                  {owned ? <Chip tone="good">owned</Chip> : (
                    <Btn size="sm" disabled={s.money < usedPrice} onClick={() => {
                      addMoney(-usedPrice, `ShutterMarket \u2014 ${g.name}`);
                      set({ ownedGear: [...getState().ownedGear, g.id] });
                      sfx.cash();
                    }}>{fmtMoney(usedPrice)}</Btn>
                  )}
                </Row>
              );
            })}
          </div>
        );

      // ---------------- NOTEBOOK ----------------
      case 'notebook':
        return (
          <div className="divide-y divide-white/6">
            <p className="px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-stone-500">Lessons learned ({s.lessons.length}/{LESSONS.length})</p>
            {LESSONS.map((l) => {
              const known = s.lessons.includes(l.id);
              return (
                <div key={l.id} className="px-3 py-2">
                  <p className={cx('text-[10px]', known ? 'text-stone-300' : 'text-stone-700')}>
                    {known ? l.text : '\u2014 locked \u2014 make the mistake first'}
                  </p>
                  {known && <Chip>{l.trigger}</Chip>}
                </div>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="pointer-events-auto fixed bottom-0 right-4 z-30 flex h-[86vh] max-h-[720px] w-[330px] flex-col overflow-hidden rounded-t-[28px] border-x-4 border-t-4 border-[#26262b] bg-[#0b0b0d] shadow-[0_-10px_60px_-10px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between bg-black px-4 py-1.5 font-mono text-[9px] text-stone-400">
        <span>{fmtClock(s.clock)}</span>
        <span className="flex items-center gap-2">DAY {s.day} <span className="text-amber-400">{Math.round(s.rep)} REP</span></span>
      </div>
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-2">
          {app !== 'home' && (
            <button type="button" onClick={() => { sfx.back(); setOpenInq(null); setApp('home'); }} aria-label="Back" className="text-stone-400 hover:text-amber-300">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">{activeApp ? activeApp.label : 'Home'}</span>
        </div>
        <button type="button" onClick={() => { sfx.back(); onClose(); }} aria-label="Close phone" className="text-stone-500 hover:text-stone-200"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto">{body()}</div>
      <div className="flex items-center justify-center gap-1 border-t border-white/10 bg-black/60 py-2">
        <button type="button" onClick={() => { sfx.back(); setApp('home'); setOpenInq(null); }} className="h-1 w-24 rounded-full bg-white/25 transition-colors hover:bg-amber-400" aria-label="Home" />
      </div>
    </div>
  );
};

export const StarIcon = Star;
export const photoSrc = fullUrl;
