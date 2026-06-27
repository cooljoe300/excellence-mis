'use client';

import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroidDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

const DISMISS_KEY = 'eoc-student-install-dismissed';
const DISMISS_DAYS = 7;

export function isInstallPromptDismissed() {
  if (typeof localStorage === 'undefined') return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt)) return false;
  return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export function dismissInstallPrompt() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function useInstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [android, setAndroid] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIosDevice());
    setAndroid(isAndroidDevice());
    setMobile(isMobileDevice());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const canInstall = !installed && (Boolean(deferredPrompt) || ios || (mobile && android));
  const canOneClickInstall = Boolean(deferredPrompt) || ios || (mobile && android);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setInstalled(true);
      }
      return;
    }
    if (ios || android) {
      setShowInstallGuide(true);
    }
  }, [deferredPrompt, ios, android]);

  return {
    installed,
    ios,
    android,
    mobile,
    canInstall,
    canOneClickInstall,
    showInstallGuide,
    setShowInstallGuide,
    handleInstall,
  };
}
