import './globals.css';
import React from 'react';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Ludus Cloud — Game Hub',
  description: 'Plataforma modular PWA para jugar juegos arcade multijugador por WiFi local y de forma Offline.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ludus Cloud',
  },
};

export const viewport: Viewport = {
  themeColor: '#09070f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full scroll-smooth">
      <head>
        <link rel="icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-512x512.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Modern high-tech gaming font styling */}
        <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;800;900&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full bg-[#09070f] text-[#fafaf9] selection:bg-[#a855f7]/30 select-none antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

function ServiceWorkerRegister() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').then((reg) => {
                console.log('Ludus SW registrado con éxito:', reg.scope);
              }).catch((err) => {
                console.error('Ludus SW error de registro:', err);
              });
            });
          }
        `,
      }}
    />
  );
}
