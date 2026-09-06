import { useEffect, useState } from 'react';

export interface DeviceProfile {
  /** Device reports any touch points at all. */
  isTouch: boolean;
  /** Primary pointer is coarse (finger), per CSS media feature — not screen width. */
  isCoarsePointer: boolean;
  /** Touch + coarse pointer together — the actual "show mobile controls" signal. */
  isMobile: boolean;
  /** Short side of the viewport is phone-sized, used only to pick a quality tier. */
  isSmallScreen: boolean;
  /** Viewport is taller than wide on a phone-sized screen — gameplay wants landscape. */
  isPortraitPhone: boolean;
  recommendedQuality: 'low' | 'med' | 'high';
}

function hasTouch(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.maxTouchPoints > 0 || (typeof window !== 'undefined' && 'ontouchstart' in window);
}

function hasCoarsePointer(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

function shortSide(): number {
  if (typeof window === 'undefined') return 0;
  return Math.min(window.innerWidth, window.innerHeight);
}

export function getDeviceProfile(): DeviceProfile {
  const isTouch = hasTouch();
  const isCoarsePointer = hasCoarsePointer();
  const isMobile = isTouch && isCoarsePointer;
  const isSmallScreen = shortSide() > 0 && shortSide() <= 480;
  const isPortraitPhone = isMobile && typeof window !== 'undefined' && window.innerHeight > window.innerWidth && isSmallScreen;
  const recommendedQuality: DeviceProfile['recommendedQuality'] = !isMobile ? 'high' : isSmallScreen ? 'low' : 'med';
  return { isTouch, isCoarsePointer, isMobile, isSmallScreen, isPortraitPhone, recommendedQuality };
}

/** Reactive device profile, recomputed on resize/orientation change. */
export function useDeviceProfile(): DeviceProfile {
  const [profile, setProfile] = useState(getDeviceProfile);
  useEffect(() => {
    const update = () => setProfile(getDeviceProfile());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);
  return profile;
}
