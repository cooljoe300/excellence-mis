'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallApp } from '@/components/student/use-install-app';
import { InstallAppIosModal } from '@/components/student/install-app-ios-modal';

export function InstallAppButton({ className }: { className?: string }) {
  const {
    installed,
    canOneClickInstall,
    androidChrome,
    canNativeInstall,
    installPending,
    showInstallGuide,
    dismissInstallFlow,
    handleInstall,
    ios,
  } = useInstallApp();

  if (installed || (!canOneClickInstall && !androidChrome)) return null;

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
      <InstallAppIosModal
        open={showInstallGuide || installPending}
        onClose={dismissInstallFlow}
        platform={ios ? 'ios' : 'android'}
        pending={installPending && androidChrome && !canNativeInstall}
      />
    </>
  );
}
