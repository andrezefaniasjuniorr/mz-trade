import "./globals.css";
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/context/AuthContext";
import OfflineBanner from "@/components/OfflineBanner";
import PWAInstallCard from "@/components/PWAInstallCard";
import TimeTamperOverlay from "@/components/TimeTamperOverlay";

export const metadata: Metadata = {
  metadataBase: new URL("https://taprise.pages.dev"),
  title: "TapRise - Bolsa e Mercadorias",
  description: "TapRise - Plataforma profissional com conta de investidor, chat ao vivo com a Mesa e outros investidores. Janela operacional de segunda a sexta, das 21h às 21h30. 1 clique, menos de 1 minuto.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TapRise - Bolsa e Mercadorias"
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "32x32" }
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" }
    ]
  },
  openGraph: {
    title: "TapRise - Bolsa e Mercadorias",
    description: "Crie sua conta e entre no nosso chat. Garanta sua presença todos os dias às 21h. De segunda a sexta. 1 clique, menos de 1 minuto. O minuto mais valioso do seu dia.",
    url: "https://taprise.pages.dev/",
    siteName: "TapRise",
    locale: "pt_MZ",
    type: "website",
    images: [
      {
        url: "https://taprise.pages.dev/og-image.png",
        secureUrl: "https://taprise.pages.dev/og-image.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "TapRise - Bolsa e Mercadorias"
      },
      {
        url: "https://taprise.pages.dev/icon.png",
        secureUrl: "https://taprise.pages.dev/icon.png",
        width: 512,
        height: 512,
        type: "image/png",
        alt: "TapRise - Ícone Oficial"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "TapRise - Bolsa e Mercadorias",
    description: "Crie sua conta e entre no nosso chat. Garanta sua presença todos os dias às 21h. De segunda a sexta. 1 clique, menos de 1 minuto. O minuto mais valioso do seu dia.",
    images: ["https://taprise.pages.dev/og-image.png"]
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
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="image_src" href="https://taprise.pages.dev/og-image.png" />
        <meta property="og:image" content="https://taprise.pages.dev/og-image.png" />
        <meta property="og:image:secure_url" content="https://taprise.pages.dev/og-image.png" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="TapRise - Bolsa e Mercadorias" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body suppressHydrationWarning className="bg-[#0f172a] text-slate-900 antialiased min-h-screen overflow-x-hidden">
        <AuthProvider>
          <OfflineBanner />
          <TimeTamperOverlay />
          <PWAInstallCard />
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
