'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';

export interface TapRiseModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  variant?: 'danger' | 'primary' | 'warning' | 'info';
  icon?: React.ReactNode;
  isLoading?: boolean;
  showCancel?: boolean;
}

export default function TapRiseModal({
  isOpen,
  title,
  description,
  children,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'primary',
  icon,
  isLoading = false,
  showCancel = true
}: TapRiseModalProps) {
  // Fecha modal com tecla Esc
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCancel && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, isLoading]);

  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
      iconDefault: <AlertTriangle className="w-6 h-6 text-rose-400" />,
      confirmBtn: 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-rose-600/30'
    },
    warning: {
      iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      iconDefault: <AlertCircle className="w-6 h-6 text-amber-400" />,
      confirmBtn: 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-amber-600/30'
    },
    primary: {
      iconBg: 'bg-[#2563eb]/20 text-blue-400 border border-blue-500/30',
      iconDefault: <CheckCircle2 className="w-6 h-6 text-blue-400" />,
      confirmBtn: 'bg-[#2563eb] hover:bg-blue-600 active:bg-blue-700 text-white shadow-blue-600/30'
    },
    info: {
      iconBg: 'bg-slate-800 text-slate-300 border border-slate-700',
      iconDefault: <Info className="w-6 h-6 text-slate-300" />,
      confirmBtn: 'bg-[#2563eb] hover:bg-blue-600 active:bg-blue-700 text-white shadow-blue-600/30'
    }
  }[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
          {/* Backdrop click */}
          <div
            className="fixed inset-0"
            onClick={() => {
              if (onCancel && !isLoading) onCancel();
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 14 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-center space-y-4 overflow-hidden z-10"
          >
            {/* Fechar botão superior */}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Ícone */}
            <div className={`w-13 h-13 mx-auto rounded-2xl ${variantStyles.iconBg} flex items-center justify-center shadow-lg shrink-0`}>
              {icon || variantStyles.iconDefault}
            </div>

            {/* Conteúdo textual (sem links, URLs ou domínios) */}
            <div className="space-y-1.5 px-1">
              <h3 className="text-base font-bold text-white tracking-wide">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {description}
                </p>
              )}
            </div>

            {/* Conteúdo opcional */}
            {children && <div className="text-left pt-1">{children}</div>}

            {/* Ações */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              {showCancel && onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 transition cursor-pointer disabled:opacity-50"
                >
                  {cancelText}
                </button>
              )}

              {onConfirm && (
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${variantStyles.confirmBtn}`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    confirmText
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
