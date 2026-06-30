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

export function isAndroidChrome() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Android/i.test(ua) && /Chrome/i.test(ua) && !/Edg|OPR|SamsungBrowser|wv/i.test(ua);
}

export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

const DISMISS_KEY = 'eoc-student-install-dismissed';
const DISMISS_DAYS = 7;
const INSTALL_INTENT_KEY = 'eoc-student-install-intent';

async function runNativeInstall(prompt: BeforeInstallPromptEvent) {
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  return outcome;
}

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
  const [installPending, setInstallPending] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [android, setAndroid] = useState(false);
  const [androidChrome, setAndroidChrome] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIosDevice());
    setAndroid(isAndroidDevice());
    setAndroidChrome(isAndroidChrome());
    setMobile(isMobileDevice());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallPending(false);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const canNativeInstall = Boolean(deferredPrompt);
  const canManualInstall = ios || (android && !androidChrome);
  const canInstall = !installed && (canNativeInstall || canManualInstall || (androidChrome && mobile));
  const canOneClickInstall = canNativeInstall || canManualInstall;

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      const outcome = await runNativeInstall(deferredPrompt);
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setInstalled(true);
      }
      sessionStorage.removeItem(INSTALL_INTENT_KEY);
      return;
    }

    if (ios || (android && !androidChrome)) {
      setShowInstallGuide(true);
      return;
    }

    if (androidChrome) {
      sessionStorage.setItem(INSTALL_INTENT_KEY, '1');
      setInstallPending(true);
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration('/student/');
          if (!navigator.serviceWorker.controller && registration?.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          if (!navigator.serviceWorker.controller) {
            window.location.reload();
            return;
          }
        } catch {
          // Fall through to the pending message below.
        }
      }
    }
  }, [deferredPrompt, ios, android, androidChrome]);

  useEffect(() => {
    if (!deferredPrompt || !sessionStorage.getItem(INSTALL_INTENT_KEY)) return;

    let cancelled = false;

    (async () => {
      const outcome = await runNativeInstall(deferredPrompt);
      if (cancelled) return;

      sessionStorage.removeItem(INSTALL_INTENT_KEY);
      setInstallPending(false);

      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setInstalled(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deferredPrompt]);

  const dismissInstallFlow = useCallback(() => {
    setShowInstallGuide(false);
    setInstallPending(false);
    sessionStorage.removeItem(INSTALL_INTENT_KEY);
  }, []);

  return {
    installed,
    ios,
    android,
    androidChrome,
    mobile,
    canInstall,
    canOneClickInstall,
    canNativeInstall,
    installPending,
    showInstallGuide,
    setShowInstallGuide,
    setInstallPending,
    dismissInstallFlow,
    handleInstall,
  };
}
