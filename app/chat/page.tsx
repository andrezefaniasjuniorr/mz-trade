'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Send,
  Reply,
  Trash2,
  Clock,
  ArrowLeft,
  CheckCheck,
  Crown,
  AlertCircle,
  X,
  ChevronDown,
  Megaphone,
  CheckCircle2,
  Radio,
  Camera,
  Image as ImageIcon,
  Shield,
  Users,
  Search,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Loader2,
  Pencil,
  Check,
  Bell,
  Pin,
  Flame,
  Mic,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TapRiseModal from '@/components/TapRiseModal';
import { useAuth, ADMIN_EMAIL } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  where
} from 'firebase/firestore';
import {
  GroupMessage,
  PrivateChatDoc,
  PrivateMessage,
  getCachedMessages,
  setCachedMessages,
  loadLocalGroupMessages,
  saveLocalGroupMessages,
  loadLocalPrivateMessages,
  saveLocalPrivateMessages,
  loadLocalPrivateChats,
  saveLocalPrivateChats,
  compressChatImage,
  uploadImageWithProgress,
  uploadChatAudio,
  playMessageSound,
  triggerPushNotification
} from '@/lib/chatService';
import WhatsAppLightbox from '@/components/WhatsAppLightbox';
import WhatsAppAudioPlayer from '@/components/WhatsAppAudioPlayer';

const AVAILABLE_REACTIONS = ['👍', '❤️', '🚀'];

const SEED_MESSAGES = [
  {
    displayName: 'Administração TapRise',
    email: ADMIN_EMAIL,
    isAdmin: true,
    text: 'Bem-vindos ao Grupo Oficial TapRise! Canal em tempo real para partilha de estratégias, acompanhamento das cotações e avisos da Janela 21h.',
    type: 'system' as const,
    replyToId: null
  },
  {
    displayName: 'Armando Cossa',
    email: 'armando.c@taprise.co.mz',
    isAdmin: false,
    text: 'Boa noite investidores! Hoje a cotação do Milho Branco em Chókwè subiu bastante. Todos prontos para a Janela das 21h? 🌽📈',
    type: 'text' as const,
    replyToId: null
  },
  {
    displayName: 'Eunice Macamo',
    email: 'eunice.m@taprise.co.mz',
    isAdmin: false,
    text: 'Prontíssima! Já solicitei o meu levantamento via M-Pesa de manhã e caiu certinho em 2 horas. Plataforma 100% profissional! 🇲🇿💰',
    type: 'text' as const,
    replyToId: null
  },
  {
    displayName: 'Administração TapRise',
    email: ADMIN_EMAIL,
    isAdmin: true,
    text: '📢 AVISO OFICIAL: Mantenham sempre a reserva de garantia de 1.000,00 MT em conta para custódia e execução segura na abertura das 21h.',
    type: 'system' as const,
    replyToId: null
  }
];

function formatTime(ts: any) {
  if (!ts) {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const d = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatRecordingTime(sec: number): string {
  if (!sec || isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function formatDateHeader(ts: any) {
  if (!ts) return 'Hoje';
  const date = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return 'Hoje';
  }
  return date.toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' });
}

function getAvatarBg(name: string, isMsgAdmin: boolean) {
  if (isMsgAdmin) return 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black shadow-xs';
  const colors = [
    'bg-[#2563eb] text-white',
    'bg-indigo-600 text-white',
    'bg-emerald-600 text-white',
    'bg-teal-600 text-white',
    'bg-purple-600 text-white',
    'bg-rose-600 text-white'
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// ==========================================
// ITEM DE MENSAGEM DO GRUPO (MEMOIZED)
// ==========================================
interface GroupMessageItemProps {
  msg: GroupMessage;
  isMe: boolean;
  isAdmin: boolean;
  onReply: (msg: GroupMessage) => void;
  onDelete: (id: string) => void;
  onEdit?: (msg: GroupMessage) => void;
  onReact: (msg: GroupMessage, emoji: string) => void;
  onScrollToReply: (replyId: string) => void;
  onOpenImage: (url: string, caption?: string, author?: string, time?: string) => void;
  currentUserId?: string;
  userPhoto?: string;
}

const GroupMessageItem = memo(function GroupMessageItem({
  msg,
  isMe,
  isAdmin,
  onReply,
  onDelete,
  onEdit,
  onReact,
  onScrollToReply,
  onOpenImage,
  currentUserId,
  userPhoto
}: GroupMessageItemProps) {
  const [showPicker, setShowPicker] = useState(false);
  const isAnnouncement =
    msg.type === 'announcement' ||
    Boolean(msg.announcementTitle) ||
    Boolean(msg.isAdmin && msg.text && (msg.text.includes('📢') || msg.text.includes('COMUNICADO') || msg.text.includes('AVISO OFICIAL')));
  const isSystem = msg.type === 'system' && !isAnnouncement;
  const isMsgAdmin = msg.isAdmin;
  const isImage = msg.type === 'image' || !!msg.imageUrl || !!msg.localPreviewUrl;
  const isAudio = msg.type === 'audio' || msg.tipo === 'audio' || !!msg.audioUrl;

  // ----------------------------------------------------
  // CARD DE COMUNICADO GERAL OFICIAL (ORGANIZADO, ELEGANTE E PROFISSIONAL)
  // ----------------------------------------------------
  if (isAnnouncement) {
    const aType = msg.announcementType || 'info';
    const titleDisplay =
      msg.announcementTitle ||
      (msg.text?.includes('21h')
        ? 'DIRETRIZ OFICIAL • JANELA DAS 21H'
        : msg.text?.includes('AVISO')
        ? 'AVISO DA MESA DIRETORA'
        : 'COMUNICADO OFICIAL DA ADMINISTRAÇÃO');

    const theme = {
      urgent: {
        wrapper: 'from-rose-950/80 via-slate-900 to-rose-950/70 border-rose-500/70 shadow-rose-950/50',
        glow: 'bg-rose-500/20',
        badgeClass: 'bg-rose-600 text-white shadow-rose-600/30 font-black',
        badgeText: 'COMUNICADO URGENTE',
        iconBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        icon: <AlertCircle className="w-5 h-5 text-rose-400" />,
        topBorder: 'from-rose-500 via-red-400 to-rose-600',
        titleColor: 'text-white',
        bodyBg: 'bg-rose-950/40 border-rose-800/40 text-rose-50',
        authorColor: 'text-rose-300'
      },
      warning: {
        wrapper: 'from-amber-950/80 via-slate-900 to-amber-950/70 border-amber-500/70 shadow-amber-950/50',
        glow: 'bg-amber-500/20',
        badgeClass: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-amber-500/30',
        badgeText: 'AVISO DE MERCADO',
        iconBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: <Flame className="w-5 h-5 text-amber-400" />,
        topBorder: 'from-amber-500 via-yellow-400 to-amber-600',
        titleColor: 'text-amber-100',
        bodyBg: 'bg-amber-950/40 border-amber-800/40 text-amber-50',
        authorColor: 'text-amber-300'
      },
      success: {
        wrapper: 'from-emerald-950/80 via-slate-900 to-emerald-950/70 border-emerald-500/70 shadow-emerald-950/50',
        glow: 'bg-emerald-500/20',
        badgeClass: 'bg-emerald-600 text-white shadow-emerald-600/30 font-black',
        badgeText: 'DIRETRIZ INSTITUCIONAL',
        iconBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        topBorder: 'from-emerald-500 via-teal-400 to-emerald-600',
        titleColor: 'text-emerald-100',
        bodyBg: 'bg-emerald-950/40 border-emerald-800/40 text-emerald-50',
        authorColor: 'text-emerald-300'
      },
      info: {
        wrapper: 'from-blue-950/85 via-slate-900 to-indigo-950/70 border-blue-500/70 shadow-blue-950/50',
        glow: 'bg-blue-500/20',
        badgeClass: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-600/30 font-black',
        badgeText: 'COMUNICADO OFICIAL',
        iconBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        icon: <ShieldCheck className="w-5 h-5 text-blue-400" />,
        topBorder: 'from-blue-500 via-indigo-400 to-blue-600',
        titleColor: 'text-white',
        bodyBg: 'bg-blue-950/40 border-blue-800/40 text-blue-50',
        authorColor: 'text-blue-300'
      }
    }[aType] || {
      wrapper: 'from-blue-950/85 via-slate-900 to-indigo-950/70 border-blue-500/70 shadow-blue-950/50',
      glow: 'bg-blue-500/20',
      badgeClass: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-600/30 font-black',
      badgeText: 'COMUNICADO OFICIAL',
      iconBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      icon: <ShieldCheck className="w-5 h-5 text-blue-400" />,
      topBorder: 'from-blue-500 via-indigo-400 to-blue-600',
      titleColor: 'text-white',
      bodyBg: 'bg-blue-950/40 border-blue-800/40 text-blue-50',
      authorColor: 'text-blue-300'
    };

    return (
      <motion.div
        id={`msg-${msg.id}`}
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="w-full max-w-2xl mx-auto my-4 group relative select-text"
      >
        <div className={`rounded-3xl bg-gradient-to-br ${theme.wrapper} border-2 shadow-2xl p-4 sm:p-6 backdrop-blur-md relative overflow-hidden`}>
          {/* Barra de brilho superior */}
          <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${theme.topBorder}`} />
          <div className={`absolute -top-12 -right-12 w-40 h-40 ${theme.glow} rounded-full blur-3xl pointer-events-none`} />

          {/* Topo do Comunicado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className={`w-11 h-11 rounded-2xl ${theme.iconBg} border flex items-center justify-center shrink-0 shadow-lg`}>
                {theme.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
                    {msg.displayName || 'Administração Central TapRise'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
                    <CheckCircle2 className="w-2.5 h-2.5 text-blue-400" />
                    OFICIAL BMM
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Mesa Diretora de Operações • TapRise Mercadorias Moçambique
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1.5 ${theme.badgeClass}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>{theme.badgeText}</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400 pl-1">
                {formatTime(msg.createdAt)}
              </span>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onDelete(msg.id)}
                  className="opacity-70 hover:opacity-100 p-1.5 bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white rounded-xl transition cursor-pointer ml-1"
                  title="Apagar comunicado do grupo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Título do Comunicado */}
          {titleDisplay && (
            <div className="pt-4 pb-2">
              <div className="flex items-center gap-2 text-xs text-amber-300 font-bold uppercase tracking-wider mb-1">
                <Megaphone className="w-3.5 h-3.5 text-amber-400" />
                <span>Transmissão Oficial aos Investidores</span>
              </div>
              <h3 className={`text-base sm:text-lg font-black tracking-tight leading-snug ${theme.titleColor}`}>
                {titleDisplay}
              </h3>
            </div>
          )}

          {/* Mensagem / Corpo */}
          <div className={`mt-2 p-4 rounded-2xl ${theme.bodyBg} border leading-relaxed text-xs sm:text-sm whitespace-pre-wrap font-sans select-text shadow-inner`}>
            {msg.text}
          </div>

          {/* Rodapé com Assinatura e Reações */}
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Comunicado em vigor para todos os participantes de mercado.</span>
            </div>

            {/* Reações dos Investidores */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              {AVAILABLE_REACTIONS.map((emoji) => {
                const count = msg.reactions?.[emoji] || 0;
                const userReacted = currentUserId && msg.userReactions?.[currentUserId] === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onReact(msg, emoji)}
                    className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1 transition cursor-pointer border ${
                      userReacted
                        ? 'bg-blue-600/30 border-blue-400 text-white font-bold'
                        : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{emoji}</span>
                    {count > 0 && <span className="font-mono text-[10px] font-bold">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // MENSAGEM DO SISTEMA (UPGRADED)
  if (isSystem) {
    return (
      <motion.div
        id={`msg-${msg.id}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="max-w-xl mx-auto my-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/15 border border-amber-500/40 text-amber-200 text-xs shadow-lg space-y-2 transition relative group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-amber-400 font-black text-[11px] uppercase tracking-wider">
            <Megaphone className="w-4 h-4 text-amber-400" />
            <span>{msg.displayName}</span>
            <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-md">
              SISTEMA OFICIAL
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-300/70 font-mono">
              {formatTime(msg.createdAt)}
            </span>
            {isAdmin && (
              <button
                type="button"
                onClick={() => onDelete(msg.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-rose-400 hover:text-rose-200 rounded transition cursor-pointer"
                title="Apagar aviso"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <p className="text-white text-xs font-semibold leading-relaxed whitespace-pre-wrap">
          {msg.text}
        </p>
      </motion.div>
    );
  }

  const effectiveImageUrl = msg.imageUrl || msg.localPreviewUrl;

  return (
    <motion.div
      id={`msg-${msg.id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex items-end gap-2 group transition relative ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      {!isMe && (
        (msg.fotoPerfil || userPhoto || msg.photoURL) ? (
          <img
            src={msg.fotoPerfil || userPhoto || msg.photoURL}
            alt={msg.displayName}
            onClick={() => onOpenImage(msg.fotoPerfil || userPhoto || msg.photoURL || '', 'Foto de perfil', msg.displayName)}
            className="w-8 h-8 rounded-xl object-cover shrink-0 select-none shadow-xs border border-slate-700/60 cursor-pointer hover:opacity-90 hover:scale-105 active:scale-95 transition"
            title={`Clique para ver a foto de perfil de ${msg.displayName}`}
          />
        ) : (
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-xs ${getAvatarBg(
              msg.displayName,
              isMsgAdmin
            )}`}
          >
            {msg.displayName ? msg.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
        )
      )}

      <div className={`max-w-[85%] sm:max-w-md relative flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <span className="text-[11px] font-bold text-slate-300">
              {msg.displayName}
            </span>
            {isMsgAdmin && (
              <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider flex items-center gap-0.5 shadow-xs">
                <Crown className="w-2.5 h-2.5" />
                ADMIN
              </span>
            )}
          </div>
        )}

        {/* Bolha de Mensagem */}
        <div
          className={`p-2.5 sm:p-3 rounded-2xl text-xs leading-relaxed break-words relative shadow-xs transition ${
            isMe
              ? isMsgAdmin
                ? 'bg-gradient-to-br from-[#2563eb] to-blue-700 text-white rounded-tr-xs border-2 border-amber-400'
                : 'bg-[#2563eb] text-white rounded-tr-xs'
              : isMsgAdmin
              ? 'bg-slate-900 border-2 border-amber-400 text-slate-100 rounded-tl-xs shadow-md shadow-amber-500/10'
              : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs'
          }`}
        >
          {/* Citação se for resposta */}
          {msg.replyToMessage && (
            <div
              onClick={() => msg.replyToId && onScrollToReply(msg.replyToId)}
              className={`mb-2 p-2 rounded-xl text-[11px] cursor-pointer transition border-l-2 ${
                isMe
                  ? 'bg-blue-800/60 border-amber-300 text-blue-100 hover:bg-blue-800'
                  : 'bg-slate-950/70 border-blue-400 text-slate-300 hover:bg-slate-950'
              }`}
            >
              <div className="flex items-center gap-1 font-bold text-[10px] text-amber-300">
                <Reply className="w-2.5 h-2.5" />
                <span>{msg.replyToMessage.displayName}</span>
              </div>
              <p className="line-clamp-1 italic text-slate-300/90 text-[10px] mt-0.5">
                {msg.replyToMessage.text}
              </p>
            </div>
          )}

          {/* Imagem Thumb estilo WhatsApp */}
          {isImage && effectiveImageUrl && !msg.isDeleted && (
            <div className="relative mb-2 overflow-hidden rounded-xl bg-slate-950/40 border border-white/10 group/img">
              <img
                src={effectiveImageUrl}
                alt={msg.text || 'Imagem TapRise'}
                loading="lazy"
                onClick={() =>
                  !msg.isUploading &&
                  onOpenImage(
                    effectiveImageUrl,
                    msg.text,
                    msg.displayName,
                    formatTime(msg.createdAt)
                  )
                }
                className={`w-full max-h-[240px] object-cover rounded-xl transition duration-200 cursor-pointer hover:opacity-95 ${
                  msg.isUploading ? 'filter blur-xs brightness-75' : ''
                }`}
              />

              {/* Upload Progress Bar estilo WhatsApp */}
              {msg.isUploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-4">
                  <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-[#2563eb] animate-spin mb-2" />
                  <span className="text-[11px] font-bold text-white font-mono">
                    {msg.uploadProgress ?? 40}%
                  </span>
                  <div className="w-3/4 bg-white/20 h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-[#2563eb] h-full transition-all duration-200"
                      style={{ width: `${msg.uploadProgress ?? 40}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Botão sutil de ampliar */}
              {!msg.isUploading && (
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-xs rounded-md text-[10px] text-white/90 flex items-center gap-1 opacity-0 group-hover/img:opacity-100 transition">
                  <ImageIcon className="w-3 h-3" />
                  <span>Ver foto</span>
                </div>
              )}
            </div>
          )}

          {/* Player de Áudio estilo WhatsApp */}
          {isAudio && (msg.audioUrl || msg.localPreviewUrl) && !msg.isDeleted && (
            <div className="mb-1">
              <WhatsAppAudioPlayer
                id={msg.id}
                audioUrl={msg.audioUrl || msg.localPreviewUrl || ''}
                duracao={msg.duracao}
                isMe={isMe}
                isUploading={msg.isUploading}
                canPlay={Boolean(currentUserId)}
              />
            </div>
          )}

          {/* Texto principal */}
          {msg.isDeleted ? (
            <p className="italic text-slate-400 text-[11px] flex items-center gap-1.5">
              <span>Esta mensagem foi removida.</span>
            </p>
          ) : (
            msg.text && (
              <div className="space-y-0.5">
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.isEdited && (
                  <span className={`text-[10px] italic block text-right font-mono ${isMe ? 'text-blue-200/80' : 'text-slate-400'}`}>
                    (editada)
                  </span>
                )}
              </div>
            )
          )}

          {/* Rodapé: Horário + Check duplo */}
          <div
            className={`flex items-center justify-end space-x-1 mt-1 text-[10px] font-mono ${
              isMe ? 'text-blue-200' : 'text-slate-400'
            }`}
          >
            <span>{formatTime(msg.createdAt)}</span>
            {isMe && <CheckCheck className="w-3.5 h-3.5 text-blue-300" />}
          </div>

          {/* Reações */}
          {msg.reactions && Object.keys(msg.reactions).length > 0 && !msg.isDeleted && (
            <div className="flex flex-wrap gap-1 mt-2 pt-1 border-t border-white/10">
              {Object.entries(msg.reactions).map(([emoji, count]) => {
                const userReacted = currentUserId && msg.userReactions?.[currentUserId] === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onReact(msg, emoji)}
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer border ${
                      userReacted
                        ? 'bg-blue-500/30 text-white border-blue-400 ring-1 ring-blue-400'
                        : isMe
                        ? 'bg-blue-700/60 text-blue-100 border-blue-500/40 hover:bg-blue-700'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="text-[10px] font-mono">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Hover action bar */}
        {!msg.isDeleted && (
          <div
            className={`flex items-center gap-1 text-[11px] text-slate-400 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity mt-1 px-1 ${
              isMe ? 'justify-end' : 'justify-start'
            }`}
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className="hover:text-amber-400 transition cursor-pointer p-0.5 rounded"
                title="Reagir"
              >
                <span>👍/❤️/🚀</span>
              </button>

              {showPicker && (
                <div
                  className={`absolute bottom-full mb-1 bg-slate-900 border border-slate-700 p-1 rounded-2xl flex gap-1 shadow-2xl z-30 ${
                    isMe ? 'right-0' : 'left-0'
                  }`}
                >
                  {AVAILABLE_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onReact(msg, emoji);
                        setShowPicker(false);
                      }}
                      className="p-1.5 hover:bg-slate-800 rounded-xl text-sm transition transform hover:scale-125 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onReply(msg)}
              className="hover:text-blue-400 flex items-center gap-0.5 cursor-pointer ml-1"
              title="Responder com citação"
            >
              <Reply className="w-3 h-3" />
              <span>Responder</span>
            </button>

            {/* Usuário pode editar apenas as suas próprias mensagens de texto */}
            {isMe && msg.type !== 'image' && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(msg)}
                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-0.5 cursor-pointer ml-1 transition"
                title="Editar minha mensagem"
              >
                <Pencil className="w-3 h-3" />
                <span>Editar</span>
              </button>
            )}

            {/* Admin pode apagar qualquer mensagem; Usuários só podem apagar a sua própria */}
            {(isAdmin || isMe) && (
              <button
                type="button"
                onClick={() => onDelete(msg.id)}
                className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-0.5 cursor-pointer ml-1 transition"
                title={isAdmin ? (isMe ? 'Apagar minha mensagem' : 'Apagar mensagem para todos (Ação Admin)') : 'Apagar minha mensagem'}
              >
                <Trash2 className="w-3 h-3" />
                <span>{isAdmin && !isMe ? 'Apagar (Admin)' : 'Apagar'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

// ==========================================
// ITEM DE MENSAGEM DO CHAT PRIVADO
// ==========================================
interface PrivateMessageItemProps {
  msg: PrivateMessage;
  isMe: boolean;
  onOpenImage: (url: string, caption?: string, author?: string, time?: string) => void;
  userPhoto?: string;
}

const PrivateMessageItem = memo(function PrivateMessageItem({
  msg,
  isMe,
  onOpenImage,
  userPhoto
}: PrivateMessageItemProps) {
  const isImage = msg.type === 'image' || !!msg.imageUrl || !!msg.localPreviewUrl;
  const isAudio = msg.type === 'audio' || msg.tipo === 'audio' || !!msg.audioUrl;
  const effectiveImageUrl = msg.imageUrl || msg.localPreviewUrl;
  const effectivePhoto = msg.fotoPerfil || userPhoto || msg.photoURL;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex items-end gap-2 my-2 ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      {!isMe && (
        effectivePhoto ? (
          <img
            src={effectivePhoto}
            alt={msg.senderName}
            onClick={() => onOpenImage(effectivePhoto, 'Foto de perfil', msg.senderName)}
            className="w-8 h-8 rounded-xl object-cover shrink-0 cursor-pointer select-none shadow-xs border border-slate-700/60 hover:opacity-90 hover:scale-105 active:scale-95 transition"
            title={`Clique para ver a foto de perfil de ${msg.senderName}`}
          />
        ) : (
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-xs ${
              msg.isAdmin
                ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {msg.isAdmin ? '🛡️' : (msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'U')}
          </div>
        )
      )}

      <div className={`max-w-[85%] sm:max-w-md flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && (
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <span className="text-[11px] font-bold text-slate-300">
              {msg.senderName}
            </span>
            {msg.isAdmin && (
              <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider flex items-center gap-0.5 shadow-xs">
                <Crown className="w-2.5 h-2.5" />
                ADMIN OFICIAL
              </span>
            )}
          </div>
        )}

        <div
          className={`p-3 rounded-2xl text-xs leading-relaxed break-words relative shadow-xs transition ${
            isMe
              ? 'bg-[#2563eb] text-white rounded-tr-xs'
              : msg.isAdmin
              ? 'bg-slate-900 border-2 border-amber-400 text-slate-100 rounded-tl-xs shadow-md shadow-amber-500/10'
              : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs'
          }`}
        >
          {/* Imagem Thumb */}
          {isImage && effectiveImageUrl && (
            <div className="relative mb-2 overflow-hidden rounded-xl bg-slate-950/40 border border-white/10 group/img">
              <img
                src={effectiveImageUrl}
                alt={msg.text || 'Foto privada'}
                loading="lazy"
                onClick={() =>
                  !msg.isUploading &&
                  onOpenImage(
                    effectiveImageUrl,
                    msg.text,
                    msg.senderName,
                    formatTime(msg.createdAt)
                  )
                }
                className={`w-full max-h-[240px] object-cover rounded-xl cursor-pointer hover:opacity-95 ${
                  msg.isUploading ? 'filter blur-xs brightness-75' : ''
                }`}
              />

              {msg.isUploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-4">
                  <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-[#2563eb] animate-spin mb-2" />
                  <span className="text-[11px] font-bold text-white font-mono">
                    {msg.uploadProgress ?? 45}%
                  </span>
                  <div className="w-3/4 bg-white/20 h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-[#2563eb] h-full transition-all duration-200"
                      style={{ width: `${msg.uploadProgress ?? 45}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Player de Áudio estilo WhatsApp */}
          {isAudio && (msg.audioUrl || msg.localPreviewUrl) && (
            <div className="mb-1">
              <WhatsAppAudioPlayer
                id={msg.id}
                audioUrl={msg.audioUrl || msg.localPreviewUrl || ''}
                duracao={msg.duracao}
                isMe={isMe}
                isUploading={msg.isUploading}
                canPlay={true}
              />
            </div>
          )}

          {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

          <div
            className={`flex items-center justify-end space-x-1 mt-1 text-[10px] font-mono ${
              isMe ? 'text-blue-200' : 'text-slate-400'
            }`}
          >
            <span>{formatTime(msg.createdAt)}</span>
            {isMe && <CheckCheck className="w-3.5 h-3.5 text-blue-300" />}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// ==========================================
// COMPONENTE PRINCIPAL: CHATPAGE
// ==========================================
export default function ChatPage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Segmented Control: 'grupo' | 'privado' (com suporte a ?tab=privado vindo da Carteira)
  const [activeSegment, setActiveSegment] = useState<'grupo' | 'privado'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'privado') {
        return 'privado';
      }
    }
    return 'grupo';
  });

  // --- ESTADO DO GRUPO ---
  const [messages, setMessages] = useState<GroupMessage[]>(() => getCachedMessages());
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(() => getCachedMessages().length === 0);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<GroupMessage | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState<boolean>(false);
  const [pinnedNotice, setPinnedNotice] = useState<{
    pinnedMessageId?: string | null;
    pinnedText?: string;
    pinnedAuthor?: string;
  } | null>(null);

  // Mapa de fotos de perfil em tempo real para sincronização instantânea
  const [userPhotos, setUserPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const photosMap: Record<string, string> = {};
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const p = d.fotoPerfil || d.photoURL;
          if (p) {
            photosMap[docSnap.id] = p;
          }
        });
        setUserPhotos(photosMap);
      },
      (err) => console.warn('Erro ao escutar fotos de perfil de usuários:', err)
    );
    return () => unsub();
  }, []);

  // --- ESTADO DO CHAT PRIVADO ---
  const [privateChatsList, setPrivateChatsList] = useState<PrivateChatDoc[]>(() => loadLocalPrivateChats());
  const [adminSelectedUserId, setAdminSelectedUserId] = useState<string | null>(null);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [isLoadingPrivateMessages, setIsLoadingPrivateMessages] = useState<boolean>(false);
  const [privateInputText, setPrivateInputText] = useState<string>('');
  const [isSendingPrivate, setIsSendingPrivate] = useState<boolean>(false);
  const [unreadPrivateCount, setUnreadPrivateCount] = useState<number>(0);
  const [searchPrivateUser, setSearchPrivateUser] = useState<string>('');

  // --- UPLOAD DE IMAGEM & LIGHTBOX ---
  const [pendingImage, setPendingImage] = useState<{
    file: File;
    dataUrl: string;
    width: number;
    height: number;
    blob: Blob;
  } | null>(null);
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    url: string | null;
    caption?: string;
    author?: string;
    time?: string;
  }>({ isOpen: false, url: null });

  // --- GRAVAÇÃO DE ÁUDIO (ATÉ 01:30 MÁX, 64kbps, COMPATÍVEL COM TELEMÓVEIS) ---
  const [showMicPermissionModal, setShowMicPermissionModal] = useState<boolean>(false);
  const [showMicBlockedModal, setShowMicBlockedModal] = useState<boolean>(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [recordingTarget, setRecordingTarget] = useState<'group' | 'private'>('group');
  const [msgToDelete, setMsgToDelete] = useState<{ id: string; text: string; isMyMessage: boolean } | null>(null);
  const [isDeletingMsg, setIsDeletingMsg] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  // Refs
  const groupFilePickerRef = useRef<HTMLInputElement | null>(null);
  const privateFilePickerRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const privateEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const privateContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const privateInputRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialMountRef = useRef<boolean>(true);
  const lastSeenGroupMsgIdRef = useRef<string | null>(null);

  // Hardware Mobile Back Button listener
  useEffect(() => {
    const handlePopState = () => {
      if (showMicPermissionModal) {
        setShowMicPermissionModal(false);
        return;
      }
      if (showMicBlockedModal) {
        setShowMicBlockedModal(false);
        return;
      }
      if (isRecordingAudio) {
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          try {
            mediaRecorderRef.current.stop();
          } catch {}
        }
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        setIsRecordingAudio(false);
        setRecordingDuration(0);
        return;
      }
      if (lightboxData.isOpen) {
        setLightboxData({ isOpen: false, url: null });
        return;
      }
      if (pendingImage) {
        setPendingImage(null);
        return;
      }
      if (adminSelectedUserId) {
        setAdminSelectedUserId(null);
        return;
      }
      if (activeSegment === 'privado') {
        setActiveSegment('grupo');
        return;
      }
      // Voltar ao terminal principal
      router.push('/');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [lightboxData.isOpen, pendingImage, adminSelectedUserId, activeSegment, showMicPermissionModal, showMicBlockedModal, isRecordingAudio, router]);

  // Toast
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Modal Lightbox opener com histórico para botão recuar
  const handleOpenLightbox = useCallback((url: string, caption?: string, author?: string, time?: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({ modal: 'lightbox' }, '');
    }
    setLightboxData({
      isOpen: true,
      url,
      caption,
      author,
      time
    });
  }, []);

  // 1. CARREGAMENTO DO GRUPO (Últimas 50 mensagens em tempo real)
  useEffect(() => {
    const messagesRef = collection(db, 'taprise_group_messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setIsLoadingMessages(false);
          return;
        }

        const list: GroupMessage[] = [];
        const msgMap = new Map<string, GroupMessage>();

        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const isMsgAdmin = d.isAdmin === true || d.email === ADMIN_EMAIL;
          const msgType = d.type || (d.audioUrl || d.tipo === 'audio' ? 'audio' : d.imageUrl ? 'image' : (d.announcementTitle ? 'announcement' : 'text'));
          const msg: GroupMessage = {
            id: docSnap.id,
            uid: d.uid || '',
            displayName: d.displayName || (isMsgAdmin ? 'Administração Central TapRise' : 'Investidor TapRise'),
            email: d.email || '',
            isAdmin: isMsgAdmin,
            text: d.text || '',
            replyToId: d.replyToId || null,
            createdAt: d.createdAt,
            type: msgType,
            tipo: d.tipo,
            audioUrl: d.audioUrl,
            duracao: d.duracao,
            announcementTitle: d.announcementTitle || d.title || (msgType === 'announcement' ? 'COMUNICADO OFICIAL DA ADMINISTRAÇÃO' : undefined),
            announcementType: d.announcementType || d.alertType || 'info',
            pinned: Boolean(d.pinned),
            imageUrl: d.imageUrl,
            imageWidth: d.imageWidth,
            imageHeight: d.imageHeight,
            isDeleted: d.isDeleted === true,
            reactions: d.reactions || {},
            userReactions: d.userReactions || {},
            fotoPerfil: d.fotoPerfil || d.photoURL || '',
            photoURL: d.photoURL || d.fotoPerfil || ''
          };
          list.push(msg);
          msgMap.set(docSnap.id, msg);
        });

        list.reverse();

        list.forEach((msg) => {
          if (msg.replyToId && msgMap.has(msg.replyToId)) {
            const original = msgMap.get(msg.replyToId)!;
            msg.replyToMessage = {
              id: original.id,
              displayName: original.displayName,
              text: original.type === 'image' ? '📷 Foto' : (original.type === 'audio' || original.tipo === 'audio' ? '🎤 Nota de voz' : original.text.slice(0, 75))
            };
          }
        });

        setMessages(list);
        setCachedMessages(list);
        setIsLoadingMessages(false);

        // Notificação sonora e push em tempo real para mensagens no chat de grupo
        if (!initialMountRef.current && list.length > 0) {
          const newest = list[list.length - 1];
          if (newest.id !== lastSeenGroupMsgIdRef.current) {
            lastSeenGroupMsgIdRef.current = newest.id;
            if (newest.uid !== user?.uid) {
              playMessageSound();
              if (typeof document !== 'undefined' && document.hidden) {
                triggerPushNotification(
                  `TapRise • ${newest.displayName}`,
                  newest.type === 'image' ? '📷 Foto' : (newest.type === 'audio' || newest.tipo === 'audio' ? '🎤 Nota de voz' : newest.text)
                );
              }
            }
          }
        } else if (list.length > 0) {
          lastSeenGroupMsgIdRef.current = list[list.length - 1].id;
        }

        const container = chatContainerRef.current;
        if (container) {
          const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 220;
          if (isNearBottom) {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 60);
          } else {
            setShowScrollBottomBtn(true);
          }
        }
      },
      (err) => {
        console.warn('Erro ao carregar mensagens:', err);
        setIsLoadingMessages(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // 1.1 COMUNICADO / AVISO FIXADO NO TOPO (admin_config/chat)
  useEffect(() => {
    const pinnedRef = doc(db, 'admin_config', 'chat');
    const unsub = onSnapshot(pinnedRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.pinnedText) {
          setPinnedNotice({
            pinnedMessageId: d.pinnedMessageId || null,
            pinnedText: d.pinnedText,
            pinnedAuthor: d.pinnedAuthor || 'Administração TapRise'
          });
        } else {
          setPinnedNotice(null);
        }
      } else {
        setPinnedNotice(null);
      }
    }, (err) => console.warn('Erro ao escutar aviso fixado:', err));

    return () => unsub();
  }, []);

  // 2. PRESENÇA REAL (taprise_presence)
  useEffect(() => {
    if (!user) return;
    let heartbeatInterval: NodeJS.Timeout;
    let unsubscribePresence: () => void = () => {};
    const myUid = user.uid;
    const myName = userProfile?.nome || user.displayName || 'Investidor TapRise';
    const presenceRef = doc(db, 'taprise_presence', myUid);

    const timer = setTimeout(() => {
      const updatePresence = async () => {
        try {
          await setDoc(
            presenceRef,
            {
              uid: myUid,
              displayName: myName,
              email: user.email || '',
              lastSeen: serverTimestamp()
            },
            { merge: true }
          );
        } catch (err) {
          console.warn('Erro de presença:', err);
        }
      };

      updatePresence();
      heartbeatInterval = setInterval(updatePresence, 30000);

      const colPresence = collection(db, 'taprise_presence');
      unsubscribePresence = onSnapshot(colPresence, (snapshot) => {
        const now = Date.now();
        let activeCount = 0;
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const lastSeenMs = d.lastSeen?.toMillis
            ? d.lastSeen.toMillis()
            : (d.lastSeen?.seconds ? d.lastSeen.seconds * 1000 : 0);
          if (now - lastSeenMs < 120000 || docSnap.id === myUid) {
            activeCount++;
          }
        });
        setOnlineCount(Math.max(1, activeCount));
      });
    }, 600);

    return () => {
      clearTimeout(timer);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      unsubscribePresence();
      deleteDoc(presenceRef).catch(() => {});
    };
  }, [user, userProfile]);

  // 3. DIGITANDO NO GRUPO (taprise_typing)
  useEffect(() => {
    if (!user) return;
    const typingCol = collection(db, 'taprise_typing');
    const unsubscribeTyping = onSnapshot(typingCol, (snapshot) => {
      const now = Date.now();
      const currentTypers: string[] = [];

      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.uid === user.uid) return;

        const ts = d.timestamp?.toMillis
          ? d.timestamp.toMillis()
          : (d.timestamp?.seconds ? d.timestamp.seconds * 1000 : 0);

        if (now - ts < 6000 || !ts) {
          if (d.displayName) {
            currentTypers.push(d.displayName);
          }
        }
      });

      setTypingUsers(currentTypers);
    });

    return () => {
      unsubscribeTyping();
      if (user) {
        deleteDoc(doc(db, 'taprise_typing', user.uid)).catch(() => {});
      }
    };
  }, [user]);

  // 4. CHAT PRIVADO: LISTENER DE CONVERSAS E BADGE DE NÃO LIDAS
  useEffect(() => {
    if (!user) return;

    if (isAdmin) {
      // ADMIN: escuta todas as conversas privadas de `private_chats`
      const privateChatsRef = collection(db, 'private_chats');
      const q = query(privateChatsRef, orderBy('updatedAt', 'desc'), limit(100));

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const list: PrivateChatDoc[] = [];
          let totalUnread = 0;

          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            const chatDoc: PrivateChatDoc = {
              uid: docSnap.id,
              userName: d.userName || 'Investidor',
              userEmail: d.userEmail || '',
              fotoPerfil: d.fotoPerfil || d.photoURL || '',
              photoURL: d.photoURL || d.fotoPerfil || '',
              lastMessage: d.lastMessage || '',
              lastMessageAt: d.lastMessageAt,
              lastMessageType: d.lastMessageType || 'text',
              unreadUserCount: d.unreadUserCount || 0,
              unreadAdminCount: d.unreadAdminCount || 0,
              updatedAt: d.updatedAt
            };
            list.push(chatDoc);
            totalUnread += chatDoc.unreadAdminCount;
          });

          // Notificação sonora quando chegar nova mensagem para o admin
          if (!initialMountRef.current && totalUnread > unreadPrivateCount) {
            playMessageSound();
          }

          setPrivateChatsList(list);
          saveLocalPrivateChats(list);
          setUnreadPrivateCount(totalUnread);

          // Se nenhuma conversa selecionada e houver lista, seleciona a primeira
          setAdminSelectedUserId((prev) => {
            if (prev) return prev;
            return list.length > 0 ? list[0].uid : null;
          });
        },
        (err) => console.warn('Erro ao carregar lista de privados para admin:', err)
      );

      return () => unsub();
    } else {
      // USUÁRIO COMUM: escuta apenas o seu próprio doc `private_chats/{user.uid}`
      const myPrivateDocRef = doc(db, 'private_chats', user.uid);
      const unsub = onSnapshot(
        myPrivateDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const d = docSnap.data();
            const unread = Number(d.unreadUserCount || 0);
            if (!initialMountRef.current && unread > unreadPrivateCount) {
              playMessageSound();
            }
            setUnreadPrivateCount(unread);
          } else {
            setUnreadPrivateCount(0);
          }
        },
        (err) => console.warn('Erro ao escutar contador privado:', err)
      );

      return () => unsub();
    }
  }, [user, isAdmin, unreadPrivateCount]);

  // Marca mount inicial para não tocar som na abertura da página
  useEffect(() => {
    const timer = setTimeout(() => {
      initialMountRef.current = false;
    }, 1500);
    return () => {
      clearTimeout(timer);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 5. CHAT PRIVADO: LISTENER DE MENSAGENS DA CONVERSA SELECIONADA
  const activePrivateTargetUid = isAdmin ? adminSelectedUserId : user?.uid;

  useEffect(() => {
    if (!user || !activePrivateTargetUid) {
      return;
    }

    // Carrega instantaneamente mensagens em cache deste usuário (Offline-first estilo WhatsApp)
    const cacheTimer = setTimeout(() => {
      const localCached = loadLocalPrivateMessages(activePrivateTargetUid);
      if (localCached.length > 0) {
        setPrivateMessages(localCached);
      }
    }, 0);

    const msgsRef = collection(db, 'private_chats', activePrivateTargetUid, 'messages');
    const q = query(msgsRef, orderBy('createdAt', 'asc'), limit(150));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: PrivateMessage[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            uid: d.uid || '',
            senderName: d.senderName || 'Utilizador',
            senderEmail: d.senderEmail || '',
            isAdmin: d.isAdmin === true || d.senderEmail === ADMIN_EMAIL,
            text: d.text || '',
            type: d.type || (d.audioUrl || d.tipo === 'audio' ? 'audio' : d.imageUrl ? 'image' : 'text'),
            imageUrl: d.imageUrl,
            imageWidth: d.imageWidth,
            imageHeight: d.imageHeight,
            audioUrl: d.audioUrl,
            duracao: d.duracao,
            tipo: d.tipo,
            fotoPerfil: d.fotoPerfil || d.photoURL || '',
            photoURL: d.photoURL || d.fotoPerfil || '',
            createdAt: d.createdAt,
            read: d.read === true
          });
        });

        setPrivateMessages(list);
        saveLocalPrivateMessages(activePrivateTargetUid, list);
        setIsLoadingPrivateMessages(false);

        // Se o usuário/admin estiver a ver a conversa, zera os não lidos da sua parte
        if (activeSegment === 'privado') {
          const parentDocRef = doc(db, 'private_chats', activePrivateTargetUid);
          if (isAdmin) {
            updateDoc(parentDocRef, { unreadAdminCount: 0 }).catch(() => {});
          } else {
            updateDoc(parentDocRef, { unreadUserCount: 0 }).catch(() => {});
          }
        }

        setTimeout(() => {
          privateEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      },
      (err) => {
        console.warn('Erro ao carregar mensagens privadas:', err);
        setIsLoadingPrivateMessages(false);
      }
    );

    return () => {
      clearTimeout(cacheTimer);
      unsub();
      setPrivateMessages([]);
    };
  }, [user, activePrivateTargetUid, isAdmin, activeSegment]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Scroll detection
  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    setShowScrollBottomBtn(!isAtBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottomBtn(false);
  }, []);

  const scrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-amber-400');
      setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 1500);
    }
  }, []);

  // SELEÇÃO DE ARQUIVO DE IMAGEM
  const handleSelectImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione um ficheiro de imagem válido (JPG, PNG, WebP).', 'error');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      showToast('A imagem não pode ter mais de 25MB.', 'error');
      return;
    }

    try {
      showToast('A preparar foto para envio rápido...', 'info');
      const compressed = await compressChatImage(file);
      setPendingImage({
        file,
        dataUrl: compressed.dataUrl,
        blob: compressed.blob,
        width: compressed.width,
        height: compressed.height
      });
      showToast('✓ Foto pronta! Toque em Enviar.', 'success');
    } catch (err: any) {
      console.error('Erro ao comprimir imagem:', err);
      showToast('Falha ao processar imagem. Tente outra foto.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  // --- MÉTODOS DE GRAVAÇÃO E ENVIO DE ÁUDIO (OPUS 48000Hz, 64kbps, MÁX 01:30) ---
  const cancelAudioRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setIsRecordingAudio(false);
    setRecordingDuration(0);
  }, []);

  const executeSendAudio = useCallback(async (audioBlob: Blob, durationSeconds: number, target: 'group' | 'private') => {
    if (!user) return;
    const localUrl = URL.createObjectURL(audioBlob);

    if (target === 'group') {
      const tempId = `temp-audio-${Date.now()}`;
      const replyTarget = replyingTo;
      const optimisticMsg: GroupMessage = {
        id: tempId,
        uid: user.uid,
        displayName: userProfile?.nome || user.displayName || 'Investidor TapRise',
        email: user.email || '',
        isAdmin,
        text: '',
        tipo: 'audio',
        type: 'audio',
        audioUrl: localUrl,
        localPreviewUrl: localUrl,
        duracao: durationSeconds,
        replyToId: replyTarget ? replyTarget.id : null,
        replyToMessage: replyTarget
          ? {
              id: replyTarget.id,
              displayName: replyTarget.displayName,
              text: replyTarget.type === 'image' ? '📷 Foto' : (replyTarget.type === 'audio' || replyTarget.tipo === 'audio' ? '🎤 Nota de voz' : replyTarget.text.slice(0, 75))
            }
          : null,
        createdAt: new Date(),
        isUploading: true
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setReplyingTo(null);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

      try {
        const audioUrl = await uploadChatAudio(audioBlob);

        // Atualiza a mensagem otimista imediatamente
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, isUploading: false, audioUrl } : m))
        );

        // Firestore guarda só: tipo: "audio", audioUrl, duracao (SEM base64)
        await addDoc(collection(db, 'taprise_group_messages'), {
          uid: user.uid,
          displayName: userProfile?.nome || user.displayName || 'Investidor TapRise',
          email: user.email || '',
          isAdmin,
          fotoPerfil: userProfile?.fotoPerfil || userProfile?.photoURL || '',
          photoURL: userProfile?.fotoPerfil || userProfile?.photoURL || '',
          text: '',
          tipo: 'audio',
          type: 'audio',
          audioUrl,
          duracao: durationSeconds,
          replyToId: replyTarget ? replyTarget.id : null,
          isDeleted: false,
          reactions: {},
          userReactions: {},
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error('Erro ao enviar áudio no grupo:', err);
        showToast('Falha ao enviar áudio. Tente novamente.', 'error');
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } else {
      // Chat Privado
      const targetUid = isAdmin ? adminSelectedUserId : user.uid;
      if (!targetUid) return;

      const tempId = `temp-priv-audio-${Date.now()}`;
      const senderName = userProfile?.nome || user.displayName || (isAdmin ? 'Administração TapRise' : 'Investidor');
      const optimisticMsg: PrivateMessage = {
        id: tempId,
        uid: user.uid,
        senderName,
        senderEmail: user.email || '',
        isAdmin,
        fotoPerfil: userProfile?.fotoPerfil || userProfile?.photoURL || '',
        photoURL: userProfile?.fotoPerfil || userProfile?.photoURL || '',
        text: '',
        tipo: 'audio',
        type: 'audio',
        audioUrl: localUrl,
        localPreviewUrl: localUrl,
        duracao: durationSeconds,
        createdAt: new Date(),
        read: false,
        isUploading: true
      };

      setPrivateMessages((prev) => [...prev, optimisticMsg]);
      setTimeout(() => privateEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

      try {
        const audioUrl = await uploadChatAudio(audioBlob);

        setPrivateMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, isUploading: false, audioUrl } : m))
        );

        await addDoc(collection(db, 'private_chats', targetUid, 'messages'), {
          uid: user.uid,
          senderName,
          senderEmail: user.email || '',
          isAdmin,
          fotoPerfil: userProfile?.fotoPerfil || userProfile?.photoURL || '',
          photoURL: userProfile?.fotoPerfil || userProfile?.photoURL || '',
          text: '',
          tipo: 'audio',
          type: 'audio',
          audioUrl,
          duracao: durationSeconds,
          createdAt: serverTimestamp(),
          read: false
        });

        await setDoc(
          doc(db, 'private_chats', targetUid),
          {
            uid: targetUid,
            userName: isAdmin ? (privateChatsList.find((c) => c.uid === targetUid)?.userName || 'Investidor') : senderName,
            userEmail: isAdmin ? (privateChatsList.find((c) => c.uid === targetUid)?.userEmail || '') : (user.email || ''),
            fotoPerfil: userProfile?.fotoPerfil || userProfile?.photoURL || '',
            photoURL: userProfile?.fotoPerfil || userProfile?.photoURL || '',
            lastMessage: '🎤 Nota de voz',
            lastMessageType: 'audio',
            lastMessageAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            ...(isAdmin
              ? { unreadUserCount: 1 }
              : { unreadAdminCount: 1 })
          },
          { merge: true }
        );
      } catch (err) {
        console.error('Erro ao enviar áudio no privado:', err);
        showToast('Falha ao enviar áudio.', 'error');
        setPrivateMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    }
  }, [user, userProfile, isAdmin, replyingTo, adminSelectedUserId, privateChatsList, showToast]);

  const stopAndSendAudio = useCallback((forcedDuration?: number, targetOverride?: 'group' | 'private') => {
    if (!mediaRecorderRef.current) return;
    const target = targetOverride || recordingTarget;
    const duration = forcedDuration || Math.max(1, recordingDuration);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    const mimeType = recorder.mimeType || 'audio/webm';

    recorder.onstop = async () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];
      mediaRecorderRef.current = null;
      setIsRecordingAudio(false);
      setRecordingDuration(0);

      if (audioBlob.size < 400) {
        showToast('Áudio muito curto para envio.', 'info');
        return;
      }

      await executeSendAudio(audioBlob, duration, target);
    };

    try {
      recorder.stop();
    } catch {
      cancelAudioRecording();
    }
  }, [recordingTarget, recordingDuration, showToast, executeSendAudio, cancelAudioRecording]);

  const startAudioRecording = useCallback(async (target: 'group' | 'private') => {
    try {
      // 1. Verifica contexto de segurança (HTTPS exigido por navegadores de telemóvel)
      if (typeof window !== 'undefined' && !window.isSecureContext && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        showToast('A gravação de áudio requer conexão segura HTTPS.', 'error');
        return;
      }

      // 2. Tentativa com filtros avançados (sem forçar sampleRate fixo que quebra DACs de telemóveis)
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (firstErr: any) {
        console.warn('Tentativa com filtros de áudio falhou, recorrendo a fallback universal:', firstErr);
        // Fallback universal: áudio básico compatível com 100% dos telemóveis
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (secondErr: any) {
          throw secondErr;
        }
      }

      if (!stream) {
        throw new Error('Não foi possível inicializar o microfone.');
      }

      // Sucesso: marca como permitido localmente para agilizar próximos envios
      if (typeof window !== 'undefined') {
        localStorage.setItem('taprise_mic_allowed', 'true');
      }

      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      // Seleção flexível de MIME type suportado pelo telemóvel (Android / iOS / Desktop)
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        const candidateTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/aac',
          'audio/ogg;codecs=opus'
        ];
        for (const t of candidateTypes) {
          if (MediaRecorder.isTypeSupported(t)) {
            mimeType = t;
            break;
          }
        }
      }

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType, audioBitsPerSecond: 64000 } : undefined
      );

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);

      setIsRecordingAudio(true);
      setRecordingDuration(0);
      setRecordingTarget(target);
      const startTime = Date.now();
      recordingStartTimeRef.current = startTime;

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);

        // Parar sozinho aos 01:30 (90 segundos)
        if (elapsed >= 90) {
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          stopAndSendAudio(90, target);
        }
      }, 250);

    } catch (err: any) {
      console.warn('Erro ao aceder ao microfone:', err);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('taprise_mic_allowed');
      }
      cancelAudioRecording();

      const errName = err?.name || '';
      const errMsg = err?.message || '';

      if (
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errName === 'SecurityError' ||
        errMsg.toLowerCase().includes('denied') ||
        errMsg.toLowerCase().includes('not allowed') ||
        errMsg.toLowerCase().includes('permission') ||
        errMsg.toLowerCase().includes('dismissed')
      ) {
        setShowMicBlockedModal(true);
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        showToast('Nenhum microfone encontrado neste telemóvel.', 'error');
      } else {
        showToast('Não foi possível ativar o microfone.', 'error');
      }
    }
  }, [showToast, cancelAudioRecording, stopAndSendAudio]);

  const handleConfirmMicPermission = useCallback(async () => {
    setShowMicPermissionModal(false);
    await startAudioRecording(recordingTarget);
  }, [recordingTarget, startAudioRecording]);

  const handleMicClick = useCallback((isPrivate = false) => {
    if (!user) {
      showToast('Por favor, inicie sessão para gravar notas de voz.', 'error');
      router.push('/login');
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      showToast('O seu navegador não suporta gravação ou requer conexão HTTPS.', 'error');
      return;
    }

    const targetMode = isPrivate ? 'private' : 'group';
    setRecordingTarget(targetMode);

    const previouslyAllowed = typeof window !== 'undefined' && localStorage.getItem('taprise_mic_allowed') === 'true';
    if (!previouslyAllowed) {
      setShowMicPermissionModal(true);
      return;
    }

    startAudioRecording(targetMode);
  }, [user, showToast, router, startAudioRecording]);

  // ENVIAR MENSAGEM NO GRUPO (TEXTO, EDIÇÃO OU IMAGEM COM PROGRESSO NO BALÃO)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !pendingImage) || isSending) return;

    if (!user) {
      showToast('Por favor, inicie sessão para participar no grupo.', 'error');
      router.push('/login');
      return;
    }

    // 0. Modo de Edição da própria mensagem
    if (editingMessage) {
      if (!inputText.trim()) {
        showToast('A mensagem não pode ficar vazia.', 'error');
        return;
      }
      try {
        setIsSending(true);
        const msgRef = doc(db, 'taprise_group_messages', editingMessage.id);
        await updateDoc(msgRef, {
          text: inputText.trim().slice(0, 500),
          isEdited: true,
          editedAt: serverTimestamp()
        });
        showToast('Mensagem editada com sucesso!', 'success');
        setEditingMessage(null);
        setInputText('');
      } catch (err: any) {
        console.error('Erro ao editar mensagem:', err);
        showToast('Falha ao editar mensagem.', 'error');
      } finally {
        setIsSending(false);
      }
      return;
    }

    if (cooldown > 0 && !isAdmin) {
      showToast(`Aguarde ${cooldown}s para enviar outra mensagem.`, 'info');
      return;
    }

    const textToSend = inputText.trim().slice(0, 500);
    const replyTarget = replyingTo;
    const imageToSend = pendingImage;

    try {
      setIsSending(true);

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      deleteDoc(doc(db, 'taprise_typing', user.uid)).catch(() => {});

      // 1. Se tem imagem: cria bolha local otimista com preview e progresso
      if (imageToSend) {
        const tempId = `temp-${Date.now()}`;
        const optimisticMsg: GroupMessage = {
          id: tempId,
          uid: user.uid,
          displayName: userProfile?.nome || user.displayName || 'Investidor TapRise',
          email: user.email || '',
          isAdmin,
          text: textToSend,
          replyToId: replyTarget ? replyTarget.id : null,
          type: 'image',
          imageUrl: undefined,
          localPreviewUrl: imageToSend.dataUrl,
          imageWidth: imageToSend.width,
          imageHeight: imageToSend.height,
          createdAt: new Date(),
          isUploading: true,
          uploadProgress: 35
        };

        setMessages((prev) => [...prev, optimisticMsg]);
        setInputText('');
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
        }
        setPendingImage(null);
        setReplyingTo(null);

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 60);

        try {
          // Upload rápido com timeout de 2s e fallback garantido (sem travar)
          const storagePath = `group_images/${user.uid}_${Date.now()}.jpg`;
          const downloadUrl = await uploadImageWithProgress(
            imageToSend.blob,
            storagePath,
            (progress) => {
              setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? { ...m, uploadProgress: progress } : m))
              );
            },
            imageToSend.dataUrl
          );

          // Salvar no Firestore taprise_group_messages
          await addDoc(collection(db, 'taprise_group_messages'), {
            uid: user.uid,
            displayName: userProfile?.nome || user.displayName || 'Investidor TapRise',
            email: user.email || '',
            isAdmin,
            fotoPerfil: userProfile?.fotoPerfil || userProfile?.photoURL || '',
            photoURL: userProfile?.fotoPerfil || userProfile?.photoURL || '',
            text: textToSend,
            type: 'image',
            imageUrl: downloadUrl,
            imageWidth: imageToSend.width,
            imageHeight: imageToSend.height,
            replyToId: replyTarget ? replyTarget.id : null,
            isDeleted: false,
            reactions: {},
            userReactions: {},
            createdAt: serverTimestamp()
          });
        } finally {
          // Limpa mensagem temporária com segurança em qualquer cenário
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      } else {
        // Envio de texto normal
        await addDoc(collection(db, 'taprise_group_messages'), {
          uid: user.uid,
          displayName: userProfile?.nome || user.displayName || 'Investidor TapRise',
          email: user.email || '',
          isAdmin,
          fotoPerfil: userProfile?.fotoPerfil || userProfile?.photoURL || '',
          photoURL: userProfile?.fotoPerfil || userProfile?.photoURL || '',
          text: textToSend,
          replyToId: replyTarget ? replyTarget.id : null,
          type: 'text',
          isDeleted: false,
          reactions: {},
          userReactions: {},
          createdAt: serverTimestamp()
        });

        setInputText('');
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
        }
        setReplyingTo(null);
      }

      setCooldown(2);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } catch (err: any) {
      console.error('Erro ao enviar mensagem no grupo:', err);
      showToast('Falha ao enviar mensagem. Tente novamente.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // ENVIAR MENSAGEM NO CHAT PRIVADO (TEXTO OU IMAGEM)
  const handleSendPrivateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!privateInputText.trim() && !pendingImage) || isSendingPrivate) return;

    if (!user) {
      showToast('Inicie sessão para enviar mensagem privada.', 'error');
      return;
    }

    const targetUid = isAdmin ? adminSelectedUserId : user.uid;
    if (!targetUid) {
      showToast('Selecione um utilizador para responder.', 'error');
      return;
    }

    const textToSend = privateInputText.trim().slice(0, 600);
    const imageToSend = pendingImage;
    const senderName = userProfile?.nome || user.displayName || (isAdmin ? 'Administração TapRise' : 'Investidor');

    try {
      setIsSendingPrivate(true);

      let downloadUrl: string | undefined = undefined;
      const isImg = !!imageToSend;

      if (imageToSend) {
        const tempId = `temp-priv-${Date.now()}`;
        const optimisticMsg: PrivateMessage = {
          id: tempId,
          uid: user.uid,
          senderName,
          senderEmail: user.email || '',
          isAdmin,
          text: textToSend,
          type: 'image',
          localPreviewUrl: imageToSend.dataUrl,
          imageWidth: imageToSend.width,
          imageHeight: imageToSend.height,
          createdAt: new Date(),
          read: false,
          isUploading: true,
          uploadProgress: 35
        };

        setPrivateMessages((prev) => [...prev, optimisticMsg]);
        setPrivateInputText('');
        if (privateInputRef.current) {
          privateInputRef.current.style.height = 'auto';
        }
        setPendingImage(null);

        setTimeout(() => {
          privateEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);

        try {
          const storagePath = `private_images/${targetUid}_${Date.now()}.jpg`;
          downloadUrl = await uploadImageWithProgress(
            imageToSend.blob,
            storagePath,
            (progress) => {
              setPrivateMessages((prev) =>
                prev.map((m) => (m.id === tempId ? { ...m, uploadProgress: progress } : m))
              );
            },
            imageToSend.dataUrl
          );
        } finally {
          setPrivateMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      } else {
        setPrivateInputText('');
        if (privateInputRef.current) {
          privateInputRef.current.style.height = 'auto';
        }
      }

      // 1. Salvar na subcoleção `private_chats/{targetUid}/messages`
      const msgsColRef = collection(db, 'private_chats', targetUid, 'messages');
      await addDoc(msgsColRef, {
        uid: user.uid,
        senderName,
        senderEmail: user.email || '',
        isAdmin,
        fotoPerfil: userProfile?.fotoPerfil || userProfile?.photoURL || '',
        photoURL: userProfile?.fotoPerfil || userProfile?.photoURL || '',
        text: textToSend,
        type: isImg ? 'image' : 'text',
        imageUrl: downloadUrl || null,
        imageWidth: imageToSend?.width || null,
        imageHeight: imageToSend?.height || null,
        createdAt: serverTimestamp(),
        read: false
      });

      // 2. Atualizar ou criar doc pai `private_chats/{targetUid}`
      const parentDocRef = doc(db, 'private_chats', targetUid);
      const targetUserDoc = privateChatsList.find((c) => c.uid === targetUid);
      const targetUserName = targetUserDoc?.userName || userProfile?.nome || user.displayName || 'Investidor TapRise';
      const targetUserEmail = targetUserDoc?.userEmail || user.email || '';

      await setDoc(
        parentDocRef,
        {
          uid: targetUid,
          userName: targetUserName,
          userEmail: targetUserEmail,
          fotoPerfil: targetUserDoc?.fotoPerfil || userProfile?.fotoPerfil || userProfile?.photoURL || '',
          photoURL: targetUserDoc?.photoURL || userProfile?.photoURL || '',
          lastMessage: isImg ? (textToSend ? `📷 ${textToSend}` : '📷 Imagem enviada') : textToSend,
          lastMessageAt: serverTimestamp(),
          lastMessageType: isImg ? 'image' : 'text',
          unreadUserCount: isAdmin ? (targetUserDoc?.unreadUserCount || 0) + 1 : 0,
          unreadAdminCount: isAdmin ? 0 : (targetUserDoc?.unreadAdminCount || 0) + 1,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      setTimeout(() => {
        privateEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } catch (err: any) {
      console.error('Erro ao enviar mensagem privada:', err);
      showToast('Falha ao enviar mensagem privada.', 'error');
    } finally {
      setIsSendingPrivate(false);
    }
  };

  // Reações
  const handleToggleReaction = useCallback(
    async (message: GroupMessage, emoji: string) => {
      if (!user) {
        showToast('Inicie sessão para reagir às mensagens.', 'error');
        return;
      }

      try {
        const msgRef = doc(db, 'taprise_group_messages', message.id);
        const userReactionRef = doc(db, 'taprise_group_messages', message.id, 'reactions', user.uid);

        const currentReactions = { ...(message.reactions || {}) };
        const currentUserReactions = { ...(message.userReactions || {}) };
        const previousEmoji = currentUserReactions[user.uid];

        if (previousEmoji === emoji) {
          delete currentUserReactions[user.uid];
          currentReactions[emoji] = Math.max(0, (currentReactions[emoji] || 1) - 1);
          if (currentReactions[emoji] === 0) delete currentReactions[emoji];
          await deleteDoc(userReactionRef).catch(() => {});
        } else {
          if (previousEmoji) {
            currentReactions[previousEmoji] = Math.max(0, (currentReactions[previousEmoji] || 1) - 1);
            if (currentReactions[previousEmoji] === 0) delete currentReactions[previousEmoji];
          }
          currentUserReactions[user.uid] = emoji;
          currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
          await setDoc(userReactionRef, {
            uid: user.uid,
            emoji,
            displayName: userProfile?.nome || user.displayName || 'Investidor',
            createdAt: serverTimestamp()
          });
        }

        await updateDoc(msgRef, {
          reactions: currentReactions,
          userReactions: currentUserReactions
        });
      } catch (err: any) {
        console.error('Erro ao reagir:', err);
      }
    },
    [user, userProfile, showToast]
  );

  // Apagar Mensagem: Admin pode apagar qualquer mensagem para todos; Usuários só podem apagar a sua própria
  const handleDeleteMessage = useCallback(
    (msgId: string) => {
      const msg = messages.find((m) => m.id === msgId);
      const isMyMessage = Boolean(msg && msg.uid === user?.uid);

      if (!isAdmin && !isMyMessage) {
        showToast('Você só pode apagar as suas próprias mensagens.', 'error');
        return;
      }

      const confirmText = isAdmin && !isMyMessage
        ? 'Deseja apagar esta mensagem para todos os participantes do grupo (Ação de Administrador)?'
        : 'Deseja apagar a sua mensagem para todos?';

      setMsgToDelete({ id: msgId, text: confirmText, isMyMessage });
    },
    [isAdmin, user, messages, showToast]
  );

  const confirmDeleteMessage = useCallback(async () => {
    if (!msgToDelete) return;
    const { id: msgId, isMyMessage } = msgToDelete;
    setIsDeletingMsg(true);

    try {
      const msgRef = doc(db, 'taprise_group_messages', msgId);
      await deleteDoc(msgRef);
      showToast(isAdmin && !isMyMessage ? 'Mensagem apagada para todos com sucesso.' : 'Sua mensagem foi apagada.', 'success');
    } catch (err: any) {
      console.warn('Erro ao apagar com deleteDoc, aplicando soft delete:', err);
      try {
        const msgRef = doc(db, 'taprise_group_messages', msgId);
        await updateDoc(msgRef, {
          isDeleted: true,
          text: 'Esta mensagem foi removida.'
        });
        showToast('Mensagem removida com sucesso.', 'success');
      } catch (updateErr) {
        console.error('Erro ao remover mensagem:', updateErr);
        showToast('Falha ao apagar mensagem.', 'error');
      }
    } finally {
      setIsDeletingMsg(false);
      setMsgToDelete(null);
    }
  }, [msgToDelete, isAdmin, showToast]);

  // Iniciar Edição da própria mensagem
  const handleStartEdit = useCallback((msg: GroupMessage) => {
    if (msg.uid !== user?.uid) {
      showToast('Apenas o autor pode editar esta mensagem.', 'error');
      return;
    }
    setEditingMessage(msg);
    setInputText(msg.text);
    setReplyingTo(null);
    setPendingImage(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
  }, [user, showToast]);

  const handleSelectReply = useCallback((msg: GroupMessage) => {
    setEditingMessage(null);
    setReplyingTo(msg);
    inputRef.current?.focus();
  }, []);

  // Filtro de conversas privadas para o Admin
  const filteredPrivateChats = useMemo(() => {
    if (!searchPrivateUser.trim()) return privateChatsList;
    const term = searchPrivateUser.toLowerCase();
    return privateChatsList.filter(
      (c) => c.userName.toLowerCase().includes(term) || c.userEmail.toLowerCase().includes(term)
    );
  }, [privateChatsList, searchPrivateUser]);

  const activeChatTarget = useMemo(() => {
    if (!isAdmin) return null;
    return privateChatsList.find((c) => c.uid === adminSelectedUserId);
  }, [isAdmin, privateChatsList, adminSelectedUserId]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f172a] text-slate-100 overflow-hidden font-sans select-none" style={{ backgroundColor: '#0f172a' }}>
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-bounce max-w-sm">
          <div
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-800'
                : toast.type === 'info'
                ? 'bg-blue-950/90 text-blue-200 border-blue-800'
                : 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
            }`}
          >
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Radio className="w-4 h-4 text-blue-400 shrink-0" />}
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Lightbox em Tela Cheia estilo WhatsApp */}
      <WhatsAppLightbox
        isOpen={lightboxData.isOpen}
        imageUrl={lightboxData.url}
        caption={lightboxData.caption}
        senderName={lightboxData.author}
        timestamp={lightboxData.time}
        onClose={() => setLightboxData({ isOpen: false, url: null })}
      />

      {/* MODAL DE PERMISSÃO DE MICROFONE PROFISSIONAL (NUNCA MOSTRA LINKS/URLS) */}
      <TapRiseModal
        isOpen={showMicPermissionModal}
        title="Permitir acesso ao microfone"
        description="Para gravar e enviar notas de voz no chat com clareza e sem ruídos, precisamos de autorização para usar o microfone deste dispositivo."
        confirmText="Permitir"
        cancelText="Agora não"
        onConfirm={handleConfirmMicPermission}
        onCancel={() => setShowMicPermissionModal(false)}
        variant="primary"
        icon={<Mic className="w-6 h-6 text-blue-400" />}
      />

      {/* MODAL DE AJUDA QUANDO O MICROFONE ESTÁ BLOQUEADO NO TELEMÓVEL */}
      <TapRiseModal
        isOpen={showMicBlockedModal}
        title="Microfone Bloqueado no Telemóvel"
        description="O navegador bloqueou o acesso ao microfone. Para desbloquear: toque no ícone de opções ou cadeado ao lado da barra de endereço, abra 'Definições do Site' ou 'Permissões', selecione 'Microfone' e mude para 'Permitir'."
        confirmText="Tentar Novamente"
        cancelText="Fechar"
        onConfirm={() => {
          setShowMicBlockedModal(false);
          startAudioRecording(recordingTarget);
        }}
        onCancel={() => setShowMicBlockedModal(false)}
        variant="primary"
        icon={<Mic className="w-6 h-6 text-amber-400" />}
      />

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE MENSAGEM */}
      <TapRiseModal
        isOpen={Boolean(msgToDelete)}
        title="Remover Mensagem"
        description={msgToDelete?.text}
        confirmText="Apagar Mensagem"
        cancelText="Cancelar"
        isLoading={isDeletingMsg}
        variant="danger"
        onConfirm={confirmDeleteMessage}
        onCancel={() => {
          if (!isDeletingMsg) setMsgToDelete(null);
        }}
      />

      {/* Inputs de arquivo ocultos (aceita apenas jpg, png, webp max 3MB) */}
      <input
        ref={groupFilePickerRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleSelectImageFile}
        className="hidden"
      />
      <input
        ref={privateFilePickerRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleSelectImageFile}
        className="hidden"
      />

      {/* HEADER PRINCIPAL (56px) COM SEGMENTED CONTROL [👥 GRUPO] [🛡️ ADMIN] */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 h-14 shrink-0 px-3 sm:px-6 flex items-center justify-between z-30 shadow-xs">
        
        {/* Esquerda: [<-] [TR Logo] + Título */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/');
              }
            }}
            className="p-1.5 -ml-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Voltar ao Terminal TapRise"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 rounded-[10px] bg-[#2563eb] text-white font-black text-sm flex items-center justify-center shadow-xs">
            TR
          </div>

          <div className="hidden xs:block">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                TapRise
              </h1>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                AO VIVO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-none">
              {activeSegment === 'grupo'
                ? `Chat Geral • ${onlineCount} online`
                : 'Suporte VIP Direto ao Administrador'}
            </p>
          </div>
        </div>

        {/* Centro: SEGMENTED CONTROL [👥 Grupo] [🛡️ Admin / Privado] */}
        <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setActiveSegment('grupo')}
            className={`flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSegment === 'grupo'
                ? 'bg-[#2563eb] text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Grupo</span>
          </button>

          <button
            onClick={() => setActiveSegment('privado')}
            className={`relative flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSegment === 'privado'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{isAdmin ? 'Admin (Privados)' : 'Admin'}</span>

            {/* Badge Vermelho de Mensagens Não Lidas */}
            {unreadPrivateCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-1 px-1.5 py-0.2 text-[10px] font-black rounded-full bg-rose-600 text-white animate-pulse"
              >
                {unreadPrivateCount}
              </motion.span>
            )}
          </button>
        </div>

        {/* Direita: Avatar */}
        <div className="flex items-center space-x-2">
          <Link
            href="/"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#2563eb] text-white font-bold text-xs flex items-center justify-center shadow-xs hover:ring-2 hover:ring-blue-400 transition cursor-pointer overflow-hidden"
            title="Perfil do Investidor"
          >
            {userProfile?.fotoPerfil || userProfile?.photoURL ? (
              <img
                src={userProfile.fotoPerfil || userProfile.photoURL}
                alt="Meu Perfil"
                className="w-full h-full object-cover"
              />
            ) : (
              userProfile?.nome ? userProfile.nome.charAt(0).toUpperCase() : (user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A')
            )}
          </Link>
        </div>
      </header>

      {/* ================================================================= */}
      {/* VISTA 1: CHAT DO GRUPO (AO VIVO)                                  */}
      {/* ================================================================= */}
      {activeSegment === 'grupo' && (
        <div className="flex-1 flex flex-col min-h-0 relative bg-[#0f172a]" style={{ backgroundColor: '#0f172a' }}>
          
          {/* Barra Fixada de Comunicado no Topo do Grupo */}
          {pinnedNotice && pinnedNotice.pinnedText && (
            <div
              onClick={() => {
                if (pinnedNotice.pinnedMessageId) {
                  scrollToMessage(pinnedNotice.pinnedMessageId);
                }
              }}
              className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-b border-amber-500/40 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200 cursor-pointer hover:bg-amber-900/40 transition shrink-0 z-20 shadow-md"
            >
              <div className="flex items-center gap-2 overflow-hidden mr-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Pin className="w-3.5 h-3.5 rotate-45" />
                </div>
                <div className="overflow-hidden">
                  <span className="font-black text-amber-400 text-[10px] uppercase tracking-wider block">
                    Aviso Fixado da Administração
                  </span>
                  <p className="text-slate-200 truncate text-xs font-medium">
                    {pinnedNotice.pinnedText}
                  </p>
                </div>
              </div>
              <span className="text-[11px] text-amber-400 font-bold font-mono shrink-0 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 flex items-center gap-1">
                <span>Ver</span>
                <span>↗</span>
              </span>
            </div>
          )}

          {/* Stream de Mensagens com Scroll */}
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-3 relative pb-28"
            style={{ backgroundColor: '#0f172a' }}
          >
            {isLoadingMessages && messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-3 py-20">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-[#2563eb] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-3 h-3 bg-[#2563eb] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-3 h-3 bg-[#2563eb] rounded-full animate-bounce"></div>
                </div>
                <p className="text-xs text-slate-400 font-medium">A conectar ao Grupo TapRise em tempo real...</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe = user?.uid === msg.uid;
                const prevMsg = messages[index - 1];
                const showDateSeparator = !prevMsg || formatDateHeader(msg.createdAt) !== formatDateHeader(prevMsg.createdAt);

                return (
                  <React.Fragment key={msg.id}>
                    {showDateSeparator && (
                      <div className="flex items-center justify-center my-3">
                        <span className="px-3 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-full text-[10px] font-bold shadow-xs">
                          {formatDateHeader(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    <GroupMessageItem
                      msg={msg}
                      isMe={isMe}
                      isAdmin={isAdmin}
                      onReply={handleSelectReply}
                      onDelete={handleDeleteMessage}
                      onEdit={handleStartEdit}
                      onReact={handleToggleReaction}
                      onScrollToReply={scrollToMessage}
                      onOpenImage={handleOpenLightbox}
                      currentUserId={user?.uid}
                      userPhoto={userPhotos[msg.uid]}
                    />
                  </React.Fragment>
                );
              })
            )}

            <div ref={messagesEndRef} className="h-2" />
          </div>

          {/* Botão flutuante "Novas mensagens ↓" */}
          <AnimatePresence>
            {showScrollBottomBtn && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                onClick={scrollToBottom}
                className="absolute bottom-24 right-5 z-20 px-3.5 py-2 bg-[#2563eb] hover:bg-blue-500 text-white text-xs font-bold rounded-full shadow-2xl transition cursor-pointer border border-blue-400/40 flex items-center gap-1.5"
              >
                <span>Novas mensagens</span>
                <ChevronDown className="w-4 h-4 animate-bounce" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Indicador "Digitando..." real */}
          <div className="h-6 px-4 sm:px-6 bg-slate-900/60 text-[11px] text-slate-400 flex items-center space-x-1.5 shrink-0">
            {typingUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center space-x-1.5 text-emerald-400 font-medium"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>
                  {typingUsers.length === 1
                    ? `${typingUsers[0]} está a digitar`
                    : `${typingUsers.length} pessoas estão a digitar`}
                </span>
                <span className="flex space-x-0.5">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce [animation-delay:150ms]">.</span>
                  <span className="animate-bounce [animation-delay:300ms]">.</span>
                </span>
              </motion.div>
            )}
          </div>

          {/* Input do Grupo com Ícone [📷] à esquerda + Preview Acoplado + Textarea estilo WhatsApp */}
          <footer className="fixed bottom-0 left-0 right-0 w-full bg-[#0f172a] border-t border-slate-800 z-40 shadow-2xl" style={{ backgroundColor: '#0f172a' }}>
            {/* Preview de Resposta Ativa */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-300 shrink-0"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Reply className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="font-bold text-blue-400">Respondendo a {replyingTo.displayName}:</span>
                    <span className="text-slate-400 truncate max-w-[200px] sm:max-w-md">{replyingTo.text || '📷 Imagem'}</span>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 hover:text-white text-slate-400 cursor-pointer"
                    title="Cancelar resposta"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Preview de Edição de Mensagem */}
            <AnimatePresence>
              {editingMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-2 flex items-center justify-between text-xs text-amber-200 shrink-0"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Pencil className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-bold text-amber-400">A editar mensagem:</span>
                    <span className="text-slate-300 truncate max-w-[200px] sm:max-w-md">{editingMessage.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMessage(null);
                      setInputText('');
                      if (inputRef.current) inputRef.current.style.height = 'auto';
                    }}
                    className="p-1 hover:text-white text-slate-400 cursor-pointer"
                    title="Cancelar edição"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Preview de Imagem selecionada antes de enviar (DIRETAMENTE POR CIMA DA BARRA DE ESCREVER) */}
            <AnimatePresence>
              {pendingImage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-slate-900 border-b border-slate-800 p-3 flex items-center space-x-3 shrink-0"
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-700 shrink-0 bg-black shadow-md">
                    <img src={pendingImage.dataUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPendingImage(null)}
                      className="absolute top-1 right-1 p-0.5 bg-black/80 rounded-full text-white hover:bg-rose-600 transition cursor-pointer"
                      title="Cancelar foto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 text-xs text-slate-300 min-w-0">
                    <p className="font-bold text-white flex items-center gap-1.5 truncate">
                      <Camera className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>Foto pronta para envio</span>
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">Escreva uma legenda abaixo ou envie diretamente.</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleSendMessage(e as any)}
                    disabled={isSending}
                    className="px-3.5 py-2 bg-[#2563eb] hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Foto</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-3 sm:p-4">
              {isRecordingAudio && recordingTarget === 'group' ? (
                <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 bg-slate-950 border border-rose-500/50 rounded-2xl px-4 py-2.5 shadow-lg">
                  {/* Gravando indicador e tempo */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="relative flex items-center justify-center shrink-0">
                      <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping absolute" />
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 relative" />
                    </div>
                    <div className="flex items-center space-x-1 font-mono text-xs font-bold text-white shrink-0">
                      <span className={recordingDuration >= 80 ? 'text-amber-400' : 'text-rose-400'}>
                        {formatRecordingTime(recordingDuration)}
                      </span>
                      <span className="text-[11px] text-slate-500 font-normal">/ 01:30</span>
                    </div>
                    <div className="hidden sm:flex items-center space-x-1 pl-2">
                      <span className="w-1 h-3 bg-rose-500/80 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1 h-5 bg-rose-500 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1 h-2 bg-rose-500/70 rounded-full animate-bounce [animation-delay:300ms]" />
                      <span className="w-1 h-6 bg-rose-500 rounded-full animate-bounce [animation-delay:75ms]" />
                      <span className="w-1 h-3 bg-rose-500/80 rounded-full animate-bounce [animation-delay:225ms]" />
                    </div>
                  </div>

                  {/* Ações: Cancelar e Enviar Áudio */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={cancelAudioRecording}
                      className="px-3 py-2 rounded-xl text-rose-400 hover:text-white hover:bg-rose-950/60 transition text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      title="Cancelar gravação"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Cancelar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => stopAndSendAudio()}
                      className="w-10 h-10 rounded-xl bg-[#2563eb] hover:bg-blue-600 active:bg-blue-700 text-white flex items-center justify-center shadow-md transition cursor-pointer"
                      title="Enviar nota de voz"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="max-w-5xl mx-auto flex items-end space-x-2">
                  
                  {/* Botão [📷] para abrir file picker */}
                  <button
                    type="button"
                    onClick={() => groupFilePickerRef.current?.click()}
                    className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-2xl transition cursor-pointer shrink-0 mb-0.5"
                    title="Enviar foto (JPG, PNG, WebP máx 3MB)"
                  >
                    <Camera className="w-5 h-5 text-blue-400" />
                  </button>

                  <div className="flex-1 relative flex items-center">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={inputText}
                      onChange={(e) => {
                        setInputText(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(130, Math.max(46, e.target.scrollHeight))}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e as any);
                        }
                      }}
                      placeholder={
                        editingMessage
                          ? 'Edite a sua mensagem...'
                          : pendingImage
                          ? 'Adicione uma legenda à foto...'
                          : 'Escreva uma mensagem para o Grupo TapRise...'
                      }
                      maxLength={500}
                      className="w-full pl-4 pr-12 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#2563eb] transition resize-none overflow-y-auto overflow-x-auto max-h-32 min-h-[46px] leading-relaxed break-words whitespace-pre-wrap"
                    />
                    {inputText.length > 400 && (
                      <span className="absolute right-3 bottom-3 text-[10px] font-mono text-amber-400 pointer-events-none">
                        {500 - inputText.length}
                      </span>
                    )}
                  </div>

                  {/* Botão ao lado do texto: Microfone se vazio, Enviar se tiver texto/foto */}
                  {!inputText.trim() && !pendingImage && !editingMessage ? (
                    <button
                      type="button"
                      onClick={() => handleMicClick(false)}
                      className="p-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl transition shadow-md shadow-emerald-900/30 flex items-center justify-center cursor-pointer shrink-0 mb-0.5"
                      title="Gravar nota de voz (máx 01:30)"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={(!inputText.trim() && !pendingImage) || isSending || (cooldown > 0 && !isAdmin && !editingMessage)}
                      className={`px-4 sm:px-5 py-3 rounded-2xl font-bold text-xs flex items-center space-x-1.5 transition shadow-xs cursor-pointer disabled:cursor-not-allowed mb-0.5 ${
                        cooldown > 0 && !isAdmin && !editingMessage
                          ? 'bg-slate-800 text-slate-400 border border-slate-700 opacity-60'
                          : editingMessage
                          ? 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-amber-600/30'
                          : 'bg-[#2563eb] hover:bg-blue-600 active:bg-blue-700 text-white shadow-blue-600/30'
                      }`}
                      title={editingMessage ? 'Salvar alterações' : 'Enviar mensagem'}
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : cooldown > 0 && !isAdmin && !editingMessage ? (
                        <>
                          <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                          <span>{cooldown}s</span>
                        </>
                      ) : editingMessage ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span className="hidden sm:inline">Salvar</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span className="hidden sm:inline">Enviar</span>
                        </>
                      )}
                    </button>
                  )}
                </form>
              )}
            </div>
          </footer>
        </div>
      )}

      {/* ================================================================= */}
      {/* VISTA 2: CHAT PRIVADO COM ADMIN (ESTRUTURA WHATSAPP)              */}
      {/* ================================================================= */}
      {activeSegment === 'privado' && (
        <div className="flex-1 flex overflow-hidden bg-slate-950">
          
          {/* LADO A: SE FOR ADMIN, LISTA LATERAL DE TODAS AS CONVERSAS */}
          {isAdmin && (
            <div
              className={`w-full md:w-80 lg:w-96 border-r border-slate-800 flex flex-col bg-slate-900/90 shrink-0 ${
                adminSelectedUserId ? 'hidden md:flex' : 'flex'
              }`}
            >
              {/* Barra de pesquisa de clientes */}
              <div className="p-3 border-b border-slate-800">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchPrivateUser}
                    onChange={(e) => setSearchPrivateUser(e.target.value)}
                    placeholder="Pesquisar investidor por nome ou email..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Lista de Chats Privados */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
                {filteredPrivateChats.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>Nenhuma conversa privada registada ainda.</p>
                  </div>
                ) : (
                  filteredPrivateChats.map((chat) => {
                    const isSelected = adminSelectedUserId === chat.uid;
                    return (
                      <div
                        key={chat.uid}
                        onClick={() => setAdminSelectedUserId(chat.uid)}
                        className={`p-3.5 flex items-center space-x-3 cursor-pointer transition ${
                          isSelected
                            ? 'bg-amber-500/15 border-l-4 border-amber-400'
                            : 'hover:bg-slate-800/50'
                        }`}
                      >
                        {chat.fotoPerfil || userPhotos[chat.uid] ? (
                          <img
                            src={chat.fotoPerfil || userPhotos[chat.uid]}
                            alt={chat.userName}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLightbox(chat.fotoPerfil || userPhotos[chat.uid], 'Foto de perfil de ' + chat.userName, chat.userName);
                            }}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-xs border border-slate-700 hover:scale-105 transition cursor-pointer"
                            title="Ver foto de perfil"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 shadow-xs">
                            {chat.userName ? chat.userName.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className="text-xs font-bold text-white truncate">
                              {chat.userName}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatTime(chat.lastMessageAt || chat.updatedAt)}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 truncate">
                            {chat.lastMessage || 'Sem mensagens'}
                          </p>
                        </div>

                        {chat.unreadAdminCount > 0 && (
                          <span className="px-2 py-0.5 bg-rose-600 text-white font-black text-[10px] rounded-full shrink-0 animate-pulse">
                            {chat.unreadAdminCount}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* LADO B: PAINEL DA CONVERSA PRIVADA ATIVA */}
          <div
            className={`flex-1 flex flex-col min-h-0 bg-slate-950 ${
              isAdmin && !adminSelectedUserId ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Header da conversa privada */}
            <div className="h-12 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                {isAdmin && (
                  <button
                    onClick={() => setAdminSelectedUserId(null)}
                    className="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-white rounded-lg"
                    title="Voltar à lista"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}

                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs">
                  {isAdmin ? '👤' : '🛡️'}
                </div>

                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    {isAdmin ? activeChatTarget?.userName || 'Investidor' : '🛡️ Suporte Admin - Privado'}
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </h3>
                  <p className="text-[10px] text-emerald-400 font-medium">
                    {isAdmin ? activeChatTarget?.userEmail || 'Chat seguro' : 'Online • Resposta Direta'}
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Encriptação de Ponta a Ponta</span>
              </div>
            </div>

            {/* Mensagens Privadas */}
            <div
              ref={privateContainerRef}
              className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-3 pb-28"
              style={{ backgroundColor: '#0f172a' }}
            >
              {isLoadingPrivateMessages ? (
                <div className="h-full flex flex-col items-center justify-center space-y-2 py-10">
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400">A carregar conversa segura...</p>
                </div>
              ) : privateMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center space-y-3 py-12 text-center text-slate-400 max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Canal Privado com a Administração</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Dúvidas sobre levantamentos via M-Pesa/Emola, depósitos, regras de mercado ou suporte técnico? Envie a sua mensagem ou foto diretamente aqui.
                  </p>
                </div>
              ) : (
                privateMessages.map((msg) => {
                  const isMe = user?.uid === msg.uid;
                  return (
                    <PrivateMessageItem
                      key={msg.id}
                      msg={msg}
                      isMe={isMe}
                      onOpenImage={handleOpenLightbox}
                      userPhoto={userPhotos[msg.uid]}
                    />
                  );
                })
              )}
              <div ref={privateEndRef} className="h-2" />
            </div>

            {/* Input do Chat Privado com Câmera e Preview Acoplado */}
            <footer className="fixed bottom-0 left-0 right-0 w-full bg-[#0f172a] border-t border-slate-800 z-40 shadow-2xl" style={{ backgroundColor: '#0f172a' }}>
              {/* Preview de imagem no chat privado (DIRETAMENTE POR CIMA DA BARRA DE ESCREVER) */}
              <AnimatePresence>
                {pendingImage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="bg-slate-900 border-b border-slate-800 p-3 flex items-center space-x-3 shrink-0"
                  >
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-700 shrink-0 bg-black shadow-md">
                      <img src={pendingImage.dataUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPendingImage(null)}
                        className="absolute top-1 right-1 p-0.5 bg-black/80 rounded-full text-white hover:bg-rose-600 transition cursor-pointer"
                        title="Cancelar foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex-1 text-xs text-slate-300 min-w-0">
                      <p className="font-bold text-white flex items-center gap-1.5 truncate">
                        <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Foto pronta para envio privado</span>
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">Escreva uma nota abaixo ou envie diretamente.</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleSendPrivateMessage(e as any)}
                      disabled={isSendingPrivate}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar Foto</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-3 sm:p-4">
                {isRecordingAudio && recordingTarget === 'private' ? (
                  <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 bg-slate-950 border border-rose-500/50 rounded-2xl px-4 py-2.5 shadow-lg">
                    {/* Gravando indicador e tempo */}
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="relative flex items-center justify-center shrink-0">
                        <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping absolute" />
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 relative" />
                      </div>
                      <div className="flex items-center space-x-1 font-mono text-xs font-bold text-white shrink-0">
                        <span className={recordingDuration >= 80 ? 'text-amber-400' : 'text-rose-400'}>
                          {formatRecordingTime(recordingDuration)}
                        </span>
                        <span className="text-[11px] text-slate-500 font-normal">/ 01:30</span>
                      </div>
                      <div className="hidden sm:flex items-center space-x-1 pl-2">
                        <span className="w-1 h-3 bg-rose-500/80 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1 h-5 bg-rose-500 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1 h-2 bg-rose-500/70 rounded-full animate-bounce [animation-delay:300ms]" />
                        <span className="w-1 h-6 bg-rose-500 rounded-full animate-bounce [animation-delay:75ms]" />
                        <span className="w-1 h-3 bg-rose-500/80 rounded-full animate-bounce [animation-delay:225ms]" />
                      </div>
                    </div>

                    {/* Ações: Cancelar e Enviar Áudio */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={cancelAudioRecording}
                        className="px-3 py-2 rounded-xl text-rose-400 hover:text-white hover:bg-rose-950/60 transition text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        title="Cancelar gravação"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Cancelar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => stopAndSendAudio()}
                        className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 flex items-center justify-center shadow-md transition cursor-pointer"
                        title="Enviar nota de voz"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendPrivateMessage} className="max-w-5xl mx-auto flex items-end space-x-2">
                    <button
                      type="button"
                      onClick={() => privateFilePickerRef.current?.click()}
                      className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-2xl transition cursor-pointer shrink-0 mb-0.5"
                      title="Enviar foto para o Admin (máx 3MB)"
                    >
                      <Camera className="w-5 h-5 text-amber-400" />
                    </button>

                    <div className="flex-1 relative flex items-center">
                      <textarea
                        ref={privateInputRef}
                        rows={1}
                        value={privateInputText}
                        onChange={(e) => {
                          setPrivateInputText(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = `${Math.min(130, Math.max(46, e.target.scrollHeight))}px`;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendPrivateMessage(e as any);
                          }
                        }}
                        placeholder={
                          pendingImage
                            ? 'Adicione uma nota à foto...'
                            : isAdmin
                            ? 'Responder ao investidor...'
                            : 'Mensagem privada para o Admin...'
                        }
                        maxLength={600}
                        className="w-full pl-4 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition resize-none overflow-y-auto overflow-x-auto max-h-32 min-h-[46px] leading-relaxed break-words whitespace-pre-wrap"
                      />
                    </div>

                    {!privateInputText.trim() && !pendingImage ? (
                      <button
                        type="button"
                        onClick={() => handleMicClick(true)}
                        className="p-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 rounded-2xl transition shadow-md shadow-amber-900/30 flex items-center justify-center cursor-pointer shrink-0 mb-0.5"
                        title="Gravar nota de voz (máx 01:30)"
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={(!privateInputText.trim() && !pendingImage) || isSendingPrivate}
                        className="px-4 sm:px-5 py-3 rounded-2xl font-bold text-xs bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 flex items-center space-x-1.5 transition shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mb-0.5"
                      >
                        {isSendingPrivate ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span className="hidden sm:inline">Enviar</span>
                          </>
                        )}
                      </button>
                    )}
                  </form>
                )}
              </div>
            </footer>

          </div>
        </div>
      )}

    </div>
  );
}
