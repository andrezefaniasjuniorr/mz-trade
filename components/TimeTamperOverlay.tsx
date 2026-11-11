'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, RefreshCw, Settings, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initTimeIntegrity, subscribeTimeIntegrity, syncServerTime } from '@/lib/timeIntegrity';

export default function TimeTamperOverlay() {
  const [isTampered, setIsTampered] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);

  useEffect(() => {
    const cleanupInit = initTimeIntegrity();
    const unsub = subscribeTimeIntegrity((tampered, tamperedReason) => {
      setIsTampered(tampered);
      setReason(tamperedReason);
    });

    return () => {
      cleanupInit();
      unsub();
    };
  }, []);

  const handleRecheck = async () => {
    setIsChecking(true);
    await syncServerTime();
    setTimeout(() => {
      setIsChecking(false);
    }, 600);
  };

  if (!isTampered) {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(244,63,94,0.35)] text-slate-100 space-y-5 text-center relative overflow-hidden"
        >
          {/* Barra de alerta no topo */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 animate-pulse" />

          {/* Ícone de advertência */}
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8 text-rose-500 animate-spin [animation-duration:8s]" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Bloqueio de Segurança
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Data e Hora Incorretas
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              O sistema de proteção da plataforma detetou que a data ou hora do seu dispositivo foi alterada ou está dessincronizada em relação ao horário oficial de Moçambique (Maputo).
            </p>
          </div>

          {/* Detalhe do desvio detetado */}
          {reason && (
            <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5 text-left">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-tight text-[11px] font-medium">{reason}</p>
            </div>
          )}

          {/* Passos de resolução */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-left space-y-2 text-xs">
            <p className="font-bold text-slate-200 flex items-center gap-1.5 text-[11px]">
              <Settings className="w-3.5 h-3.5 text-blue-400" />
              Como resolver no seu telemóvel:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-400">
              <li>Aceda às <strong>Definições / Configurações</strong> do telemóvel.</li>
              <li>Procure pela secção <strong>Data e Hora</strong>.</li>
              <li>Ative a opção <strong>&quot;Data e hora automáticas&quot;</strong> (definida pela rede).</li>
            </ol>
          </div>

          {/* Botão de verificação */}
          <button
            type="button"
            onClick={handleRecheck}
            disabled={isChecking}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'A verificar horário...' : 'Já atualizei a data — Verificar Novamente'}</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
