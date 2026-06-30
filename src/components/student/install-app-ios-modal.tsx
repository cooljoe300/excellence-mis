'use client';

import { Share, PlusSquare, MoreVertical, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

export function InstallAppIosModal({
  open,
  onClose,
  platform = 'ios',
  pending = false,
}: {
  open: boolean;
  onClose: () => void;
  platform?: 'ios' | 'android';
  pending?: boolean;
}) {
  const isIos = platform === 'ios';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        pending
          ? 'Preparing install'
          : isIos
            ? 'Install on iPhone or iPad'
            : 'Install on Android'
      }
      description={
        pending
          ? 'Chrome is getting the app ready to install.'
          : isIos
            ? 'Add the student portal to your home screen for quick access.'
            : 'Use Chrome to install the app directly on your phone.'
      }
      size="sm"
    >
      {pending ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center text-sm text-slate-700">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p>
            If the install dialog does not appear, refresh this page and tap{' '}
            <strong>Install</strong> again.
          </p>
        </div>
      ) : isIos ? (
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
              Tap <strong>Add</strong>. The Excellence Online College app will appear on your home
              screen with the college logo.
            </span>
          </li>
        </ol>
      ) : (
        <ol className="space-y-4 text-sm text-slate-700">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
              1
            </span>
            <span>
              Open this page in <strong>Chrome</strong> if you are not already using it.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
              2
            </span>
            <span>
              Tap the menu <MoreVertical className="inline h-4 w-4 text-primary" /> (top right),
              then choose <strong>Install app</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
              3
            </span>
            <span>
              Tap <Download className="inline h-4 w-4 text-primary" /> <strong>Install</strong> in
              the browser dialog. The app will be added to your phone like a normal app.
            </span>
          </li>
        </ol>
      )}
      <div className="mt-6 flex justify-end">
        <Button type="button" onClick={onClose}>
          Got it
        </Button>
      </div>
    </Modal>
  );
}
