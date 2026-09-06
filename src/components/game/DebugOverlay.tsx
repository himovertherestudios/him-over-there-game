import React, { useEffect, useState } from 'react';
import { engine } from '@/game/engine';
import { getState } from '@/game/store';
import { getDeviceProfile } from '@/game/platform/device';

/** Dev-only perf readout (FPS, quality tier, target cap). Never rendered in production builds. */
export const DebugOverlay: React.FC = () => {
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((v) => v + 1), 400);
    return () => window.clearInterval(id);
  }, []);

  const device = getDeviceProfile();
  const cap = engine.frameInterval > 0 ? `${Math.round(1 / engine.frameInterval)}fps cap` : 'uncapped';

  return (
    <div className="pointer-events-none fixed left-2 top-2 z-50 rounded bg-black/80 px-2 py-1 font-mono text-[10px] leading-tight text-emerald-400">
      <div>{engine.fps} fps &middot; {cap}</div>
      <div className="text-stone-400">
        {getState().quality} &middot; {device.isMobile ? 'mobile' : 'desktop'} &middot; dpr {window.devicePixelRatio.toFixed(2)}
      </div>
    </div>
  );
};
