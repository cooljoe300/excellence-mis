'use client';

import { useEffect } from 'react';

export function RegisterStudentServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw-student.js', { scope: '/student/' })
      .catch(() => {
        // Silent fail — install still works on some browsers without SW
      });
  }, []);

  return null;
}
