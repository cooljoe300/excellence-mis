import { NextResponse } from 'next/server';

export function GET() {
  const manifest = {
    id: '/student',
    name: 'Excellence Online College',
    short_name: 'EOC Student',
    description:
      'Excellence Online College student portal — register units, pay fees, view your ID card, and manage your profile.',
    lang: 'en',
    dir: 'ltr',
    start_url: '/student?source=pwa',
    scope: '/student',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#003380',
    categories: ['education'],
    prefer_related_applications: false,
    icons: [
      {
        src: '/logo.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'any',
      },
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
        src: '/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-maskable-512.png',
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
