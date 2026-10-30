import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'TapRise - Bolsa e Mercadorias de Moçambique',
  description: 'Plataforma profissional de negociação e simulação financeira em Meticais (MT) para matérias-primas e commodities.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'TapRise - Bolsa e Mercadorias de Moçambique',
    description: 'Plataforma profissional de negociação e simulação financeira em Meticais (MT) para matérias-primas e commodities.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TapRise - Bolsa e Mercadorias de Moçambique',
    description: 'Plataforma profissional de negociação e simulação financeira em Meticais (MT) para matérias-primas e commodities.',
  },
};

import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt">
      <body suppressHydrationWarning className="bg-slate-50 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
