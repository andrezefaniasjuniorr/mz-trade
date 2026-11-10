'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share2, PlusSquare, Sparkles, Check, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PWAInstallCard() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // 1. Deteta se JÁ está instalado ou a correr como PWA/TWA/Standalone
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true; // Server-side default
    return Boolean(
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://') ||
      window.location.search.includes('source=pwa') ||
      window.location.search.includes('mode=standalone')
    );
  });

  // 2. Deteta dispositivo iOS (iPhone / iPad / iPod)
  const [isIOS] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  });

  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isInstalledSuccess, setIsInstalledSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Escuta alterações dinâmicas de display-mode
    const mql = window.matchMedia('(display-mode: standalone)');
    const handleMqlChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };
    mql.addEventListener('change', handleMqlChange);

    // Capturar o evento nativo 'beforeinstallprompt' (Chrome, Edge, Samsung Internet, Android, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Capturar confirmação de app instalada
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setIsInstalledSuccess(true);
      setDeferredPrompt(null);
      setTimeout(() => {
        setIsInstalledSuccess(false);
      }, 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mql.removeEventListener('change', handleMqlChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Se já estiver instalado ou rodando como app nativo/PWA/TWA, NUNCA MOSTRA
  if (isStandalone && !isInstalledSuccess) {
    return null;
  }

  // Ação de Instalação Inteligente (qualquer navegador)
  const handleInstallClick = async () => {
    // Caso 1: Navegador Chromium com evento 'beforeinstallprompt' disponível
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsStandalone(true);
          setIsInstalledSuccess(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn('Falha no prompt de instalação nativa:', err);
        setShowManualModal(true);
      }
      return;
    }

    // Caso 2: iOS Safari
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // Caso 3: Outros navegadores ou quando o prompt nativo já expirou
    setShowManualModal(true);
  };

  return (
    <>
      {/* Toast de sucesso caso tenha acabado de instalar */}
      <AnimatePresence>
        {isInstalledSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 sm:bottom-6 right-3 sm:right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-emerald-400"
          >
            <Check className="w-4 h-4 text-white" />
            <span>Aplicação TapRise instalada com sucesso!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CARD LATERAL COMPACTO E ESTRATÉGICO */}
      <aside aria-label="Instalar Aplicação TapRise" className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-40 select-none">
        <AnimatePresence mode="wait">
          {!isMinimized ? (
            <motion.div
              key="card-expanded"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.92 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative w-[290px] sm:w-[320px] bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 p-3 sm:p-3.5 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.65)] text-slate-100 flex flex-col gap-2.5 overflow-hidden"
              style={{
                boxShadow: '0 10px 30px -5px rgba(37, 99, 235, 0.25), 0 20px 25px -5px rgba(0, 0, 0, 0.7)'
              }}
            >
              {/* Linha decorativa no topo */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-400" />

              {/* Botão fechar/minimizar discreto */}
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Minimizar aviso"
                aria-label="Minimizar aviso de instalação"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Cabeçalho do Card */}
              <div className="flex items-center gap-2.5 pr-5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md border border-blue-400/30">
                  TR
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-white tracking-tight truncate">
                      TapRise App
                    </h4>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                      GRÁTIS
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight truncate">
                    Mais rápido, leve e sem barra do navegador
                  </p>
                </div>
              </div>

              {/* Ação Principal: Botão Instalar App */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Instalar App</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMinimized(true)}
                  className="py-2 px-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-[11px] rounded-xl transition cursor-pointer"
                >
                  Agora não
                </button>
              </div>
            </motion.div>
          ) : (
            /* Botão Flutuante Lateral Minimizado (Ultra compacto e sem atrapalhar) */
            <motion.button
              key="card-minimized"
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setIsMinimized(false)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-900/95 hover:bg-slate-850 active:scale-95 text-white border border-blue-500/40 rounded-full shadow-xl transition cursor-pointer group backdrop-blur-md"
              title="Instalar App TapRise"
            >
              <div className="w-5 h-5 rounded-full bg-blue-600 text-[10px] font-black flex items-center justify-center shrink-0">
                TR
              </div>
              <span className="text-[11px] font-bold text-slate-200 group-hover:text-white flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-blue-400" />
                Instalar App
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition" />
            </motion.button>
          )}
        </AnimatePresence>
      </aside>

      {/* MODAL 1: GUIA DE INSTALAÇÃO NO IPHONE / IPAD (SAFARI) */}
      <AnimatePresence>
        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    TR
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Instalar no iPhone / iPad</h3>
                    <p className="text-[11px] text-slate-400">Guia rápido do Safari</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white">1. Toque em Partilhar</p>
                    <p className="text-slate-400 text-[11px]">No Safari, toque no ícone de partilha na barra inferior do telemóvel.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white">2. Adicionar ao Ecrã Principal</p>
                    <p className="text-slate-400 text-[11px]">Role a lista para baixo e toque em <strong>&quot;Ecrã Principal&quot;</strong> ou <strong>&quot;Adicionar ao Ecrã Inicial&quot;</strong>.</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: GUIA DE INSTALAÇÃO MANUAL NO NAVEGADOR (CHROME / OUTROS) */}
      <AnimatePresence>
        {showManualModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    TR
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Instalar Aplicação TapRise</h3>
                    <p className="text-[11px] text-slate-400">Instalação Direta</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <p className="text-slate-300">
                  Para instalar o TapRise diretamente no seu ecrã:
                </p>
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-[11px] text-slate-300">
                  <p className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                    <span>Toque no menu de 3 pontinhos (<strong>⋮</strong>) no topo ou fundo do navegador.</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                    <span>Selecione <strong>&quot;Instalar aplicativo&quot;</strong> ou <strong>&quot;Adicionar ao ecrã inicial&quot;</strong>.</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">3</span>
                    <span>Confirme em <strong>&quot;Instalar&quot;</strong>. O ícone aparecerá no seu telefone como app nativo!</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
              >
                Fechar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
