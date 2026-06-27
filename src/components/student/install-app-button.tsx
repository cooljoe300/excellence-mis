'use client';

import { useEffect, useState } from 'react';
import { Download, Share, PlusSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallAppButton({ className }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIosDevice());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (installed) return null;

  const canInstall = deferredPrompt || ios;
  if (!canInstall) return null;

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
      return;
    }
    setShowIosGuide(true);
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={handleInstall}
        className={className}
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Install app</span>
        <span className="sm:hidden">Install</span>
      </Button>

      <Modal
        open={showIosGuide}
        onClose={() => setShowIosGuide(false)}
        title="Install on iPhone or iPad"
        description="Add the student portal to your home screen for quick access."
        size="sm"
      >
        <ol className="space-y-4 text-sm text-slate-700">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
              1
            </span>
            <span>
              Tap the <Share className="inline h-4 w-4 text-primary" /> Share button in Safari
              (bottom of the screen).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
              2
            </span>
            <span>
              Scroll down and tap <strong>Add to Home Screen</strong>{' '}
              <PlusSquare className="inline h-4 w-4 text-primary" />.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
              3
            </span>
            <span>
              Tap <strong>Add</strong>. The EOC Student app will appear on your home screen.
            </span>
          </li>
        </ol>
        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={() => setShowIosGuide(false)}>
            Got it
          </Button>
        </div>
      </Modal>
    </>
  );
}
