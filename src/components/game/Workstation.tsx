import React, { useMemo, useState } from 'react';
import { HardDriveDownload, Star, Wand2, Send, Check, Undo2, Crop, Eraser } from 'lucide-react';
import { useGame, getState, starPhoto, fullUrl, Photo, fmtMoney } from '@/game/store';
import { LESSONS } from '@/game/data';
import { backupFiles, retouchPhoto, deliverGallery, afterFirstJobHook } from '@/game/actions';
import { Btn, Chip, Panel, cx, Slide } from './ui';
import { sfx } from '@/game/audio';

const GRADES: Record<string, string> = {
  Clean: '',
  'Warm Film': 'sepia(0.25) saturate(1.15) contrast(1.05)',
  'Moody Teal': 'hue-rotate(-12deg) saturate(0.85) contrast(1.15) brightness(0.94)',
  'B&W': 'grayscale(1) contrast(1.15)',
  Golden: 'sepia(0.4) saturate(1.3) brightness(1.05)',
};
const CROPS = ['Original', '4:5', '1:1', '16:9'];

const defaultEdits = () => ({ exposure: 0, temp: 0, contrast: 0, grade: 'Clean', smooth: 20, sharpen: 20, crop: 'Original', spots: 0 });

const filterFor = (e: ReturnType<typeof defaultEdits>) =>
  [
    `brightness(${(1 + e.exposure / 100).toFixed(2)})`,
    `contrast(${(1 + e.contrast / 140).toFixed(2)})`,
    `saturate(${(1 + e.temp / 260).toFixed(2)})`,
    e.temp !== 0 ? `sepia(${Math.min(0.5, Math.abs(e.temp) / 200).toFixed(2)})` : '',
    e.temp < 0 ? 'hue-rotate(-25deg)' : '',
    e.smooth > 0 ? `blur(${(e.smooth / 90).toFixed(2)}px)` : '',
    GRADES[e.grade] || '',
  ].filter(Boolean).join(' ');

export const Workstation: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const s = useGame((g) => g);
  const job = s.job;
  const [stage, setStage] = useState<'backup' | 'cull' | 'retouch' | 'deliver'>(job?.stage === 'cull' ? 'cull' : job?.stage === 'retouch' ? 'retouch' : job?.stage === 'deliver' ? 'deliver' : 'backup');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [edits, setEdits] = useState(defaultEdits());
  const [showBefore, setShowBefore] = useState(false);
  const [spots, setSpots] = useState<{ x: number; y: number; gone: boolean }[]>([]);
  const [result, setResult] = useState<{ stars: number; review: string; owed: number; willPay: boolean } | null>(null);

  const shots = useMemo(() => s.photos.filter((p) => p.jobId === job?.id), [s.photos, job?.id]);
  const stars = shots.filter((p) => p.starred);
  const limit = job?.pkg.images ?? 12;
  const retouchLimit = job?.pkg.retouched ?? 8;
  const photo = shots.find((p) => p.id === editing) || null;

  if (!job) {
    return (
      <Panel title="Laptop" className="w-[min(560px,92vw)]">
        <div className="p-6 text-center">
          <p className="text-sm text-stone-400">No active job. The laptop just shows your bank balance and judges you.</p>
          <p className="mt-2 font-mono text-[11px] text-amber-300">{fmtMoney(s.money)}</p>
          <Btn className="mt-4" onClick={onClose}>Close</Btn>
        </div>
      </Panel>
    );
  }

  const runBackup = (skip: boolean) => {
    if (skip) { backupFiles(true); setStage('cull'); return; }
    setBusy(true);
    let p = 0;
    const iv = window.setInterval(() => {
      p += 4 + Math.random() * 7;
      setProgress(Math.min(100, p));
      if (p >= 100) {
        window.clearInterval(iv);
        setBusy(false);
        backupFiles(false);
        setStage('cull');
      }
    }, 90);
  };

  const startEdit = (p: Photo) => {
    sfx.click();
    setEditing(p.id);
    setEdits(p.edits ? { ...defaultEdits(), ...p.edits } : defaultEdits());
    const n = 2 + Math.floor(Math.random() * 3);
    setSpots(Array.from({ length: n }, () => ({ x: 18 + Math.random() * 64, y: 15 + Math.random() * 60, gone: false })));
    setShowBefore(false);
  };

  return (
    <Panel title={`Darkroom \u2014 ${job.name} \u2014 ${job.pkg.name}`} className="w-[min(1100px,96vw)]" right={<Btn size="sm" variant="ghost" onClick={onClose}>Close</Btn>}>
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 px-4 py-2">
        {(['backup', 'cull', 'retouch', 'deliver'] as const).map((st, i) => (
          <button
            key={st}
            type="button"
            onClick={() => { if (st === 'backup' || (st === 'cull' && stage !== 'backup') || (st === 'retouch' && stars.length > 0) || (st === 'deliver' && stars.length > 0)) { sfx.click(); setStage(st); } }}
            className={cx('rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors',
              stage === st ? 'bg-amber-400 text-black' : 'text-stone-500 hover:text-stone-200')}
          >
            {i + 1}. {st}
          </button>
        ))}
        <span className="ml-auto font-mono text-[10px] text-stone-500">{shots.length} frames &middot; {stars.length}/{limit} selected</span>
      </div>

      {/* ---------------- BACKUP ---------------- */}
      {stage === 'backup' && (
        <div className="p-6">
          <div className="mx-auto max-w-md text-center">
            <HardDriveDownload className="mx-auto mb-3 h-8 w-8 text-amber-400" strokeWidth={1.5} />
            <h4 className="text-sm font-semibold text-stone-100">Back up {shots.length} files</h4>
            <p className="mt-1 text-[11px] text-stone-500">Card to laptop, laptop to the external. Two copies or it didn&apos;t happen.</p>
            <div className="my-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-amber-400 transition-all duration-150" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-center gap-2">
              <Btn variant="gold" disabled={busy} onClick={() => runBackup(false)}>{busy ? 'Copying\u2026' : 'Back up files'}</Btn>
              <Btn variant="ghost" onClick={() => runBackup(true)}>Skip it (risky)</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- CULL ---------------- */}
      {stage === 'cull' && (
        <div className="p-4">
          <p className="mb-3 text-[11px] text-stone-500">
            Contact sheet. Star up to <span className="text-amber-300">{limit}</span> keepers. Hover a tag to see what happened.
          </p>
          <div className="grid max-h-[52vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-4 lg:grid-cols-6">
            {shots.map((p) => {
              const lesson = p.lesson ? LESSONS.find((l) => l.id === p.lesson) : null;
              return (
                <figure key={p.id} className="group relative overflow-hidden rounded border border-white/10">
                  <img src={fullUrl(p)} alt={`Frame scored ${Math.round(p.score.total)}`} className="aspect-[3/2] w-full object-cover" />
                  <button
                    type="button"
                    aria-label={p.starred ? 'Unstar frame' : 'Star frame'}
                    onClick={() => { sfx.click(); if (!p.starred && stars.length >= limit) return; starPhoto(p.id, !p.starred); }}
                    className={cx('absolute right-1 top-1 rounded-full p-1 transition-colors', p.starred ? 'bg-amber-400 text-black' : 'bg-black/60 text-stone-400 hover:text-amber-300')}
                  >
                    <Star className="h-3 w-3" fill={p.starred ? 'currentColor' : 'none'} />
                  </button>
                  <figcaption className="space-y-0.5 p-1">
                    <span className="block font-mono text-[8px] text-stone-600">f/{p.settings.aperture} &middot; 1/{Math.round(1 / p.settings.shutter)} &middot; ISO {p.settings.iso} &middot; {p.settings.focal}mm</span>
                    <span className="flex flex-wrap gap-0.5">
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t} title={lesson && ['Missed focus', 'Motion blur', 'Noisy', 'Face distortion', 'Poor composition', 'Flat lighting'].includes(t) ? lesson.text : t} className={cx('rounded-sm px-1 py-px text-[7.5px] uppercase tracking-wider',
                          ['Portfolio-worthy', 'Great expression', 'Strong pose', 'Perfect lighting', 'Client favorite \u2605'].includes(t) ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/15 text-red-300')}>
                          {t}
                        </span>
                      ))}
                    </span>
                  </figcaption>
                </figure>
              );
            })}
            {shots.length === 0 && <p className="col-span-full py-10 text-center text-[11px] text-stone-500">No frames from this job yet.</p>}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Btn variant="gold" disabled={stars.length === 0} onClick={() => setStage('retouch')}>Retouch {stars.length} selects</Btn>
          </div>
        </div>
      )}

      {/* ---------------- RETOUCH ---------------- */}
      {stage === 'retouch' && (
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_300px]">
          <div>
            {photo ? (
              <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black">
                <img
                  src={fullUrl(photo)}
                  alt="Editing preview"
                  className={cx('w-full transition-all duration-200', edits.crop === '1:1' && 'aspect-square object-cover', edits.crop === '4:5' && 'aspect-[4/5] object-cover', edits.crop === '16:9' && 'aspect-video object-cover')}
                  style={{ filter: showBefore ? 'none' : filterFor(edits) }}
                />
                {!showBefore && spots.filter((sp) => !sp.gone).map((sp, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label="Remove blemish"
                    onClick={() => { sfx.click(); setSpots((v) => v.map((x, j) => (j === i ? { ...x, gone: true } : x))); setEdits((e) => ({ ...e, spots: e.spots + 1 })); }}
                    className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-300/70 bg-rose-400/30 transition-transform hover:scale-125"
                    style={{ left: `${sp.x}%`, top: `${sp.y}%` }}
                  />
                ))}
                <div className="absolute bottom-2 left-2 flex gap-1">
                  <Btn size="sm" variant="ghost" onClick={() => setShowBefore((v) => !v)}><Undo2 className="h-3 w-3" /> {showBefore ? 'After' : 'Before'}</Btn>
                  {photo.retouched && <Chip tone="good">retouched</Chip>}
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-white/12 p-10 text-center text-[11px] text-stone-500">Pick a select from the strip to edit it.</p>
            )}
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {stars.map((p) => (
                <button key={p.id} type="button" onClick={() => startEdit(p)} className={cx('relative h-14 w-20 shrink-0 overflow-hidden rounded border-2 transition-colors', editing === p.id ? 'border-amber-400' : 'border-transparent hover:border-white/30')}>
                  <img src={fullUrl(p)} alt="" className="h-full w-full object-cover" />
                  {p.retouched && <Check className="absolute right-0.5 top-0.5 h-3 w-3 text-emerald-300" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <Slide label="Exposure" value={edits.exposure} min={-50} max={50} onChange={(v) => setEdits((e) => ({ ...e, exposure: v }))} />
            <Slide label="Temp / tint" value={edits.temp} min={-50} max={50} onChange={(v) => setEdits((e) => ({ ...e, temp: v }))} />
            <Slide label="Contrast" value={edits.contrast} min={-50} max={50} onChange={(v) => setEdits((e) => ({ ...e, contrast: v }))} />
            <Slide label="Skin smoothing" value={edits.smooth} min={0} max={100} onChange={(v) => setEdits((e) => ({ ...e, smooth: v }))} fmt={(v) => (v > 70 ? `${v}% plastic` : `${v}%`)} />
            <Slide label="Sharpen" value={edits.sharpen} min={0} max={100} onChange={(v) => setEdits((e) => ({ ...e, sharpen: v }))} />
            <div>
              <p className="mb-1 font-mono text-[9px] uppercase tracking-wider text-stone-400">Color grade</p>
              <div className="flex flex-wrap gap-1">
                {Object.keys(GRADES).map((g) => (
                  <Btn key={g} size="sm" variant={edits.grade === g ? 'gold' : 'dark'} onClick={() => setEdits((e) => ({ ...e, grade: g }))}>{g}</Btn>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-stone-400"><Crop className="h-3 w-3" /> Crop</p>
              <div className="flex flex-wrap gap-1">
                {CROPS.map((c) => <Btn key={c} size="sm" variant={edits.crop === c ? 'gold' : 'dark'} onClick={() => setEdits((e) => ({ ...e, crop: c }))}>{c}</Btn>)}
              </div>
            </div>
            <p className="flex items-center gap-1 text-[9.5px] text-stone-500"><Eraser className="h-3 w-3" /> {spots.filter((x) => x.gone).length} distractions cleaned &middot; retouch skill {Math.round(s.skills.retouch)} cuts the time cost</p>
            <Btn
              variant="gold"
              className="w-full"
              disabled={!photo || stars.filter((p) => p.retouched).length >= retouchLimit && !photo?.retouched}
              onClick={() => { if (photo) { retouchPhoto(photo.id, edits); } }}
            >
              <Wand2 className="h-3.5 w-3.5" /> Export this edit
            </Btn>
            <Btn className="w-full" disabled={stars.filter((p) => p.retouched).length === 0} onClick={() => setStage('deliver')}>
              Go to delivery
            </Btn>
          </div>
        </div>
      )}

      {/* ---------------- DELIVER ---------------- */}
      {stage === 'deliver' && (
        <div className="p-6">
          {!result ? (
            <div className="mx-auto max-w-lg text-center">
              <Send className="mx-auto mb-3 h-8 w-8 text-amber-400" strokeWidth={1.5} />
              <h4 className="text-sm font-semibold text-stone-100">Deliver the gallery to {job.name}</h4>
              <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
                {stars.length} images, {stars.filter((p) => p.retouched).length} retouched. Balance owed: {fmtMoney(job.price - (job.paidDeposit ? job.deposit : 0))}.
                {job.contract ? ' Contract on file.' : ' No contract on file \u2014 you are running on trust.'}
              </p>
              <div className="mt-4 grid grid-cols-4 gap-1">
                {stars.slice(0, 8).map((p) => <img key={p.id} src={fullUrl(p)} alt="" className="aspect-square w-full rounded object-cover" style={{ filter: p.edits ? filterFor({ ...defaultEdits(), ...p.edits }) : undefined }} />)}
              </div>
              <Btn variant="gold" size="lg" className="mt-5" onClick={() => {
                const r = deliverGallery();
                if (r) { setResult(r); afterFirstJobHook(); }
              }}>Send the gallery link</Btn>
            </div>
          ) : (
            <div className="mx-auto max-w-lg text-center">
              <div className="mb-2 flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cx('h-6 w-6', n <= result.stars ? 'text-amber-400' : 'text-stone-700')} fill={n <= result.stars ? 'currentColor' : 'none'} />)}
              </div>
              <p className="text-sm italic text-stone-200">{result.review}</p>
              <p className={cx('mt-3 font-mono text-xs', result.willPay ? 'text-emerald-300' : 'text-red-300')}>
                {result.willPay ? `Balance received: ${fmtMoney(result.owed)}` : 'Balance unpaid. No contract, no leverage.'}
              </p>
              <p className="mt-2 text-[11px] text-stone-500">Now put one on Lenz. The work doesn&apos;t market itself.</p>
              <Btn variant="gold" className="mt-4" onClick={onClose}>Back to it</Btn>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
};
