'use client';

import { useEffect } from 'react';

const SW_RELOAD_KEY = 'eoc-student-sw-reload';

export function RegisterStudentServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let reloaded = false;

    const onControllerChange = () => {
      if (reloaded || sessionStorage.getItem(SW_RELOAD_KEY)) return;
      sessionStorage.setItem(SW_RELOAD_KEY, '1');
      reloaded = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker
      .register('/student/sw.js', { scope: '/student/', updateViaCache: 'none' })
      .catch(() => {
        // Fall back to legacy path if the scoped worker cannot be registered.
        return navigator.serviceWorker.register('/sw-student.js', { scope: '/student/' });
      })
      .catch(() => {
        // Silent fail — install prompt may still appear on some browsers.
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return null;
}
