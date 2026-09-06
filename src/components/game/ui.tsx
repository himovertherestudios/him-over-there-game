import React from 'react';
import { sfx } from '@/game/audio';

export const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');

export const Btn: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'gold' | 'ghost' | 'dark' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  title?: string;
}> = ({ children, onClick, variant = 'dark', size = 'md', disabled, className, title }) => {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md font-medium tracking-wide transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]';
  const sizes = { sm: 'px-2.5 py-1 text-[11px]', md: 'px-3.5 py-1.5 text-xs', lg: 'px-6 py-2.5 text-sm' }[size];
  const vars = {
    gold: 'bg-amber-400 text-black hover:bg-amber-300 shadow-[0_0_18px_-6px_rgba(251,191,36,0.9)]',
    dark: 'bg-white/[0.06] text-stone-200 hover:bg-white/[0.13] border border-white/10',
    ghost: 'text-stone-400 hover:text-amber-300 hover:bg-white/5',
    danger: 'bg-red-900/50 text-red-200 hover:bg-red-800/60 border border-red-500/30',
  }[variant];
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={() => { if (disabled) return; sfx.click(); onClick?.(); }}
      className={cx(base, sizes, vars, className)}
    >
      {children}
    </button>
  );
};

export const Panel: React.FC<{ children: React.ReactNode; className?: string; title?: string; right?: React.ReactNode }> = ({ children, className, title, right }) => (
  <div className={cx('rounded-lg border border-white/10 bg-[#111114]/95 backdrop-blur-md shadow-2xl', className)}>
    {title && (
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber-300/90">{title}</h3>
        {right}
      </div>
    )}
    {children}
  </div>
);

export const Modal: React.FC<{ children: React.ReactNode; onClose?: () => void; wide?: boolean; label: string }> = ({ children, onClose, wide, label }) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-label={label}>
    <div className={cx('max-h-[92vh] w-full overflow-y-auto rounded-xl border border-white/12 bg-[#0e0e11] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)]', wide ? 'max-w-5xl' : 'max-w-2xl')}>
      {children}
    </div>
    {onClose && <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 -z-10" />}
  </div>
);

export const Bar: React.FC<{ value: number; max?: number; color?: string; label?: string; small?: boolean }> = ({ value, max = 100, color = 'bg-amber-400', label, small }) => (
  <div className="w-full">
    {label && <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-wider text-stone-500"><span>{label}</span><span>{Math.round(value)}</span></div>}
    <div className={cx('w-full overflow-hidden rounded-full bg-white/10', small ? 'h-1' : 'h-1.5')}>
      <div className={cx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  </div>
);

export const Slide: React.FC<{
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; fmt?: (v: number) => string;
}> = ({ label, value, min, max, step = 1, onChange, fmt }) => (
  <label className="block">
    <span className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-stone-400">
      <span>{label}</span>
      <span className="text-amber-300">{fmt ? fmt(value) : value}</span>
    </span>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-amber-400"
      aria-label={label}
    />
  </label>
);

export const Chip: React.FC<{ children: React.ReactNode; tone?: 'good' | 'bad' | 'neutral' | 'gold' }> = ({ children, tone = 'neutral' }) => (
  <span className={cx('inline-block rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
    tone === 'good' && 'bg-emerald-500/15 text-emerald-300',
    tone === 'bad' && 'bg-red-500/15 text-red-300',
    tone === 'gold' && 'bg-amber-400/15 text-amber-300',
    tone === 'neutral' && 'bg-white/8 text-stone-400')}>
    {children}
  </span>
);
