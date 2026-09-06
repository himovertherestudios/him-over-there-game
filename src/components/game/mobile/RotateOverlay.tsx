import React from 'react';
import { RotateCcw } from 'lucide-react';

/** Blocks gameplay on very narrow portrait phones rather than cramming the 3D view into it. */
export const RotateOverlay: React.FC = () => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black px-8 text-center">
    <RotateCcw className="h-10 w-10 animate-pulse text-amber-400" />
    <p className="font-mono text-sm uppercase tracking-widest text-amber-300">Rotate your device</p>
    <p className="max-w-xs text-[13px] leading-relaxed text-stone-400">
      Him Over There plays best in landscape. Turn your phone sideways to keep shooting.
    </p>
  </div>
);
