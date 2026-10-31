import "./globals.css";
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/context/AuthContext";
import OfflineBanner from "@/components/OfflineBanner";

export const metadata: Metadata = {
  title: "TapRise",
  description: "Plataforma profissional de negociação e simulação financeira em Meticais (MT) para matérias-primas e commodities.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TapRise"
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  },
  openGraph: {
    title: "TapRise",
    description: "Plataforma profissional de negociação e simulação financeira em Meticais (MT) para matérias-primas e commodities.",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "TapRise",
    description: "Plataforma profissional de negociação e simulação financeira em Meticais (MT) para matérias-primas e commodities."
  }
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-MZ">
      <head>
        <link rel="preload" href="/_next/static/css/app/layout.css" as="style" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body suppressHydrationWarning className="bg-slate-50 text-slate-900 antialiased min-h-screen">
        <AuthProvider>
          <OfflineBanner />
          {children}
        </AuthProvider>

        {/* Registro do Service Worker v=4 com desativação em preview do Studio */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                var isPreview = window.location.hostname.includes('aistudio') || 
                                window.location.hostname.includes('googleusercontent') || 
                                window.location.hostname.includes('run.app');
                if (isPreview) {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    for (var i = 0; i < regs.length; i++) {
                      regs[i].unregister();
                    }
                  });
                } else {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js?v=4')
                      .then(function(reg) {
                        console.log('[TapRise PWA v4] Service Worker registado:', reg.scope);
                      })
                      .catch(function(err) {
                        console.warn('[TapRise PWA v4] Erro ao registar Service Worker:', err);
                      });
                  });
                }
              }
            `
          }}
        />
      </body>
    </html>
  );
}
