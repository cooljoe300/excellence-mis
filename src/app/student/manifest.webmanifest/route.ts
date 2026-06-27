import { NextResponse } from 'next/server';

export function GET() {
  const manifest = {
    name: 'Excellence Online College — Student Portal',
    short_name: 'EOC Student',
    description: 'Register units, pay fees, view your ID card, and manage your student profile.',
    start_url: '/student',
    scope: '/student',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#003380',
    categories: ['education'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
