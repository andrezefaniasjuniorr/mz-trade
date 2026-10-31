import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import OfflineBanner from '@/components/OfflineBanner';

export const metadata: Metadata = {
  title: 'TapRise - Bolsa e Mercadorias de Moçambique',
  description: 'Plataforma profissional de negociação e simulação financeira em Meticais (MT) para matérias-primas e commodities.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TapRise'
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg'
  },
  openGraph: {
    title: 'TapRise - Bolsa e Mercadorias de Moçambique',
    description: 'Plataforma profissional de negociação e simulação financeira em Meticais (MT) para matérias-primas e commodities.',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TapRise - Bolsa e Mercadorias de Moçambique',
    description: 'Plataforma profissional de negociação e simulação financeira em Meticais (MT) para matérias-primas e commodities.'
  }
};

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body suppressHydrationWarning className="bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <AuthProvider>
          <OfflineBanner />
          {children}
        </AuthProvider>

        {/* Registro do Service Worker no cliente (Offline-First estilo WhatsApp) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) {
                      console.log('[TapRise PWA] Service Worker registado:', reg.scope);
                    })
                    .catch(function(err) {
                      console.warn('[TapRise PWA] Erro ao registar Service Worker:', err);
                    });
                });
              }
            `
          }}
        />
      </body>
    </html>
  );
}
