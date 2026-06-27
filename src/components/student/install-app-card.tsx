'use client';

import Image from 'next/image';
import { Download, Smartphone, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallApp } from '@/components/student/use-install-app';
import { InstallAppIosModal } from '@/components/student/install-app-ios-modal';

const benefits = [
  'Open your portal from your home screen',
  'Pay fees and register units faster',
  'View your ID card anytime',
];

export function InstallAppCard() {
  const {
    installed,
    ios,
    canOneClickInstall,
    showInstallGuide,
    setShowInstallGuide,
    handleInstall,
  } = useInstallApp();

  if (installed) return null;

  return (
    <>
      <div className="mb-8 overflow-hidden rounded-xl border border-[#e1a916]/40 bg-gradient-to-br from-[#003380] via-[#003380] to-[#004a99] text-white shadow-sm">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white p-1.5">
              <Image
                src="/logo.png"
                alt="Excellence Online College"
                width={48}
                height={48}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#e1a916]">
                Get the app
              </p>
              <h2 className="mt-1 text-lg font-bold">Install Excellence Online College on your phone</h2>
              <p className="mt-1 text-sm text-blue-100">
                Add the student portal as an app on your home screen — the college logo appears as the app icon.
              </p>
            </div>
          </div>

          {canOneClickInstall ? (
            <Button
              type="button"
              onClick={handleInstall}
              className="shrink-0 bg-[#e1a916] text-[#003380] hover:bg-[#f0bc2a] border-0 shadow-md"
            >
              <Download className="h-4 w-4" />
              Install app
            </Button>
          ) : (
            <div className="flex shrink-0 items-center gap-2 rounded-lg bg-white/10 px-4 py-3 text-sm text-blue-100">
              <Smartphone className="h-5 w-5 text-[#e1a916]" />
              Open on your phone to install
            </div>
          )}
        </div>

        <ul className="grid gap-2 border-t border-white/10 px-6 py-4 sm:grid-cols-3">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2 text-sm text-blue-100">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#e1a916]" />
              {benefit}
            </li>
          ))}
        </ul>

        {!canOneClickInstall && (
          <p className="border-t border-white/10 px-6 py-3 text-xs text-blue-200">
            On Android, use Chrome. On iPhone, use Safari — then tap Install when prompted, or use
            Share → Add to Home Screen.
          </p>
        )}
      </div>

      <InstallAppIosModal
        open={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        platform={ios ? 'ios' : 'android'}
      />
    </>
  );
}
