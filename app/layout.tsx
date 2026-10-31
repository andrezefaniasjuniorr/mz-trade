import "./globals.css";
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/context/AuthContext";
import OfflineBanner from "@/components/OfflineBanner";

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
    icon: "/icon.svg",
    apple: "/icon.svg"
  },
  openGraph: {
    title: "TapRise - Bolsa e Mercadorias",
    description: "Crie sua conta e entre no nosso chat. Garanta sua presença todos os dias às 21h. De segunda a sexta. 1 clique, menos de 1 minuto. O minuto mais valioso do seu dia.",
    url: "https://taprise.pages.dev/",
    siteName: "TapRise",
    type: "website",
    images: [
      {
        url: "https://taprise.pages.dev/logo.png",
        width: 1200,
        height: 630,
        alt: "TapRise - Bolsa e Mercadorias"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "TapRise - Bolsa e Mercadorias",
    description: "Crie sua conta e entre no nosso chat. Garanta sua presença todos os dias às 21h. De segunda a sexta. 1 clique, menos de 1 minuto. O minuto mais valioso do seu dia.",
    images: ["https://taprise.pages.dev/logo.png"]
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
        <meta property="og:url" content="https://taprise.pages.dev/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://taprise.pages.dev/logo.png" />
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
