'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  dismissInstallPrompt,
  isInstallPromptDismissed,
  useInstallApp,
} from '@/components/student/use-install-app';
import { InstallAppIosModal } from '@/components/student/install-app-ios-modal';

export function InstallAppPrompt() {
  const {
    installed,
    ios,
    android,
    mobile,
    canInstall,
    showInstallGuide,
    setShowInstallGuide,
    handleInstall,
  } = useInstallApp();

  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!mobile || installed || !canInstall) return;

    const wasDismissed = isInstallPromptDismissed();
    setDismissed(wasDismissed);
    if (wasDismissed) return;

    const timer = window.setTimeout(() => setVisible(true), 1500);
    return () => window.clearTimeout(timer);
  }, [mobile, installed, canInstall]);

  function handleDismiss() {
    dismissInstallPrompt();
    setDismissed(true);
    setVisible(false);
  }

  if (!mobile || installed || !canInstall) return null;

  return (
    <>
      {!dismissed && visible && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 animate-slide-up px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
          role="dialog"
          aria-label="Install app"
        >
        <div className="mx-auto flex max-w-lg items-center gap-3 rounded-xl border border-[#e1a916]/40 bg-[#003380] p-3 text-white shadow-elevated">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white p-1">
            <Image
              src="/logo.png"
              alt="Excellence Online College"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">Install Excellence Online College</p>
            <p className="mt-0.5 text-xs text-blue-100">
              Add the college app to your home screen with the EOC logo — fees, units, and your ID card in one tap.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleInstall}
            className="shrink-0 border-0 bg-[#e1a916] text-[#003380] hover:bg-[#f0bc2a]"
          >
            <Download className="h-4 w-4" />
            Install
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      )}

      <InstallAppIosModal
        open={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        platform={ios ? 'ios' : 'android'}
      />
    </>
  );
}
