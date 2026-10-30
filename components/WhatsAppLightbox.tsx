'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Share2, ZoomIn, ZoomOut, RotateCcw, Check } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';

interface WhatsAppLightboxProps {
  isOpen: boolean;
  imageUrl: string | null;
  caption?: string;
  senderName?: string;
  timestamp?: string;
  onClose: () => void;
}

export default function WhatsAppLightbox({
  isOpen,
  imageUrl,
  caption,
  senderName,
  timestamp,
  onClose
}: WhatsAppLightboxProps) {
  const [scale, setScale] = useState(1);
  const [copied, setCopied] = useState(false);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-200, 0, 200], [0.4, 1, 0.4]);

  // Reset motion value when modal changes
  useEffect(() => {
    y.set(0);
  }, [isOpen, imageUrl, y]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `taprise_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback
      window.open(imageUrl, '_blank');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Imagem TapRise',
          text: caption || 'Imagem partilhada no TapRise',
          url: imageUrl
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleZoomIn = () => setScale((s) => Math.min(3, s + 0.35));
  const handleZoomOut = () => setScale((s) => Math.max(0.7, s - 0.35));
  const handleResetZoom = () => setScale(1);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden touch-none select-none">
        {/* Backdrop escuro estilo WhatsApp 90% blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ opacity }}
          className="absolute inset-0 bg-black/92 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Top bar WhatsApp */}
        <div className="relative z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent text-white">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-2 -ml-2 rounded-full hover:bg-white/10 active:bg-white/20 transition cursor-pointer"
              title="Fechar (Arrastar para baixo)"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white tracking-wide truncate max-w-[180px] sm:max-w-md">
                {senderName || 'TapRise'}
              </span>
              {timestamp && (
                <span className="text-[11px] text-white/70 font-mono">
                  {timestamp}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons: Zoom controls, Baixar, Partilhar */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="hidden sm:flex items-center space-x-1 mr-2 bg-white/10 rounded-full px-2 py-1">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 0.8}
                className="p-1 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition disabled:opacity-30 cursor-pointer"
                title="Reduzir zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-white/90 min-w-8 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={scale >= 3}
                className="p-1 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition disabled:opacity-30 cursor-pointer"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              {scale !== 1 && (
                <button
                  onClick={handleResetZoom}
                  className="p-1 rounded-full hover:bg-white/10 text-amber-400 hover:text-amber-300 transition cursor-pointer"
                  title="Restaurar tamanho"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={handleDownload}
              className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition cursor-pointer text-white"
              title="Baixar imagem"
            >
              <Download className="w-5 h-5" />
            </button>

            <button
              onClick={handleShare}
              className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition cursor-pointer text-white"
              title="Partilhar imagem"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Viewport Central com Drag-to-dismiss */}
        <div className="relative z-10 flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.8}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.y) > 120 || Math.abs(info.velocity.y) > 400) {
                onClose();
              }
            }}
            style={{ y }}
            className="flex items-center justify-center w-full h-full cursor-grab active:cursor-grabbing"
          >
            <motion.img
              src={imageUrl}
              alt={caption || 'Visualização TapRise'}
              animate={{ scale }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onDoubleClick={() => setScale((s) => (s > 1 ? 1 : 2))}
              className="max-h-[82vh] max-w-[95vw] object-contain rounded-lg shadow-2xl select-none"
              draggable={false}
            />
          </motion.div>
        </div>

        {/* Caption footer estilo WhatsApp */}
        {caption ? (
          <div className="relative z-20 px-4 py-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent text-white text-center">
            <p className="max-w-xl mx-auto text-xs sm:text-sm font-medium text-slate-100 whitespace-pre-wrap leading-relaxed">
              {caption}
            </p>
          </div>
        ) : (
          <div className="h-6" />
        )}
      </div>
    </AnimatePresence>
  );
}
