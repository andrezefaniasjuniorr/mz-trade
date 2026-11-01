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
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  playMessageSound
} from '@/lib/chatService';
import WhatsAppLightbox from '@/components/WhatsAppLightbox';

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
  currentUserId
}: GroupMessageItemProps) {
  const [showPicker, setShowPicker] = useState(false);
  const isSystem = msg.type === 'system';
  const isMsgAdmin = msg.isAdmin;
  const isImage = msg.type === 'image' || !!msg.imageUrl || !!msg.localPreviewUrl;

  if (isSystem) {
    return (
      <motion.div
        id={`msg-${msg.id}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="max-w-xl mx-auto my-2.5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border border-amber-500/40 text-amber-200 text-xs shadow-xs space-y-1.5 transition relative group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-amber-400 font-black text-[11px] uppercase tracking-wider">
            <Megaphone className="w-3.5 h-3.5 text-amber-400" />
            <span>{msg.displayName}</span>
            <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-md">
              SISTEMA
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-300/70 font-mono">
              {formatTime(msg.createdAt)}
            </span>
            {isAdmin && (
              <button
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
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-xs ${getAvatarBg(
            msg.displayName,
            isMsgAdmin
          )}`}
        >
          {msg.displayName ? msg.displayName.charAt(0).toUpperCase() : 'U'}
        </div>
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
}

const PrivateMessageItem = memo(function PrivateMessageItem({
  msg,
  isMe,
  onOpenImage
}: PrivateMessageItemProps) {
  const isImage = msg.type === 'image' || !!msg.imageUrl || !!msg.localPreviewUrl;
  const effectiveImageUrl = msg.imageUrl || msg.localPreviewUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex items-end gap-2 my-2 ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      {!isMe && (
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 select-none shadow-xs ${
            msg.isAdmin
              ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black'
              : 'bg-emerald-600 text-white'
          }`}
        >
          {msg.isAdmin ? '🛡️' : (msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'U')}
        </div>
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

  // Refs
  const groupFilePickerRef = useRef<HTMLInputElement | null>(null);
  const privateFilePickerRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const privateEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const privateContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const privateInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialMountRef = useRef<boolean>(true);

  // Toast
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Modal Lightbox opener
  const handleOpenLightbox = useCallback((url: string, caption?: string, author?: string, time?: string) => {
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
          const msg: GroupMessage = {
            id: docSnap.id,
            uid: d.uid || '',
            displayName: d.displayName || 'Investidor TapRise',
            email: d.email || '',
            isAdmin: d.isAdmin === true || d.email === ADMIN_EMAIL,
            text: d.text || '',
            replyToId: d.replyToId || null,
            createdAt: d.createdAt,
            type: d.type || (d.imageUrl ? 'image' : 'text'),
            imageUrl: d.imageUrl,
            imageWidth: d.imageWidth,
            imageHeight: d.imageHeight,
            isDeleted: d.isDeleted === true,
            reactions: d.reactions || {},
            userReactions: d.userReactions || {}
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
              text: original.type === 'image' ? '📷 Foto' : original.text.slice(0, 75)
            };
          }
        });

        setMessages(list);
        setCachedMessages(list);
        setIsLoadingMessages(false);

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
    return () => clearTimeout(timer);
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
            type: d.type || (d.imageUrl ? 'image' : 'text'),
            imageUrl: d.imageUrl,
            imageWidth: d.imageWidth,
            imageHeight: d.imageHeight,
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

    if (file.size > 3 * 1024 * 1024) {
      showToast('A imagem não pode ter mais de 3MB.', 'error');
      return;
    }

    try {
      showToast('A otimizar imagem para envio rápido...', 'info');
      const compressed = await compressChatImage(file);
      setPendingImage({
        file,
        dataUrl: compressed.dataUrl,
        blob: compressed.blob,
        width: compressed.width,
        height: compressed.height
      });
    } catch (err: any) {
      console.error('Erro ao comprimir imagem:', err);
      showToast('Falha ao processar imagem.', 'error');
    } finally {
      e.target.value = '';
    }
  };

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
          text: textToSend,
          replyToId: replyTarget ? replyTarget.id : null,
          type: 'text',
          isDeleted: false,
          reactions: {},
          userReactions: {},
          createdAt: serverTimestamp()
        });

        setInputText('');
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
      }

      // 1. Salvar na subcoleção `private_chats/{targetUid}/messages`
      const msgsColRef = collection(db, 'private_chats', targetUid, 'messages');
      await addDoc(msgsColRef, {
        uid: user.uid,
        senderName,
        senderEmail: user.email || '',
        isAdmin,
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
    async (msgId: string) => {
      const msg = messages.find((m) => m.id === msgId);
      const isMyMessage = msg && msg.uid === user?.uid;

      if (!isAdmin && !isMyMessage) {
        showToast('Você só pode apagar as suas próprias mensagens.', 'error');
        return;
      }

      const confirmText = isAdmin && !isMyMessage
        ? 'Deseja apagar esta mensagem para todos os participantes do grupo (Ação Admin)?'
        : 'Deseja apagar a sua mensagem?';

      if (!confirm(confirmText)) return;

      try {
        const msgRef = doc(db, 'taprise_group_messages', msgId);
        // Exclusão definitiva para remover para todos em tempo real
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
      }
    },
    [isAdmin, user, messages, showToast]
  );

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
          <Link
            href="/"
            className="p-1.5 -ml-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Voltar ao Terminal TapRise"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

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
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#2563eb] text-white font-bold text-xs flex items-center justify-center shadow-xs hover:ring-2 hover:ring-blue-400 transition cursor-pointer"
            title="Perfil do Investidor"
          >
            {userProfile?.nome ? userProfile.nome.charAt(0).toUpperCase() : (user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A')}
          </Link>
        </div>
      </header>

      {/* ================================================================= */}
      {/* VISTA 1: CHAT DO GRUPO (AO VIVO)                                  */}
      {/* ================================================================= */}
      {activeSegment === 'grupo' && (
        <div className="flex-1 flex flex-col min-h-0 relative bg-[#0f172a]" style={{ backgroundColor: '#0f172a' }}>
          
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

          {/* Preview de Resposta Ativa */}
          <AnimatePresence>
            {replyingTo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-300 shrink-0 z-20"
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
                className="bg-amber-950/60 border-t border-amber-800/80 px-4 py-2 flex items-center justify-between text-xs text-amber-200 shrink-0 z-20"
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
                  }}
                  className="p-1 hover:text-white text-slate-400 cursor-pointer"
                  title="Cancelar edição"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview de Imagem selecionada antes de enviar (com botão X de cancelar) */}
          <AnimatePresence>
            {pendingImage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-slate-900 border-t border-slate-800 p-3 flex items-center space-x-3 shrink-0 z-20"
              >
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-700 shrink-0 bg-black">
                  <img src={pendingImage.dataUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPendingImage(null)}
                    className="absolute top-1 right-1 p-0.5 bg-black/80 rounded-full text-white hover:bg-rose-600 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 text-xs text-slate-300">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-400" />
                    <span>Foto pronta para envio</span>
                  </p>
                  <p className="text-[11px] text-slate-400">Escreva uma legenda opcional abaixo e toque em Enviar.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input do Grupo com Ícone [📷] à esquerda + Botão Enviar */}
          <footer className="fixed bottom-0 left-0 right-0 w-full bg-[#0f172a] border-t border-slate-800 p-3 sm:p-4 z-40" style={{ backgroundColor: '#0f172a' }}>
            <form onSubmit={handleSendMessage} className="max-w-5xl mx-auto flex items-center space-x-2">
              
              {/* Botão [📷] para abrir file picker */}
              <button
                type="button"
                onClick={() => groupFilePickerRef.current?.click()}
                className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-2xl transition cursor-pointer shrink-0"
                title="Enviar foto (JPG, PNG, WebP máx 3MB)"
              >
                <Camera className="w-5 h-5 text-blue-400" />
              </button>

              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    editingMessage
                      ? 'Edite a sua mensagem...'
                      : pendingImage
                      ? 'Adicione uma legenda à foto...'
                      : 'Escreva uma mensagem para o Grupo TapRise...'
                  }
                  maxLength={500}
                  className="w-full pl-4 pr-12 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#2563eb] transition"
                />
                {inputText.length > 400 && (
                  <span className="absolute right-3 top-3 text-[10px] font-mono text-amber-400">
                    {500 - inputText.length}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={(!inputText.trim() && !pendingImage) || isSending || (cooldown > 0 && !isAdmin && !editingMessage)}
                className={`px-4 sm:px-5 py-3 rounded-2xl font-bold text-xs flex items-center space-x-1.5 transition shadow-xs cursor-pointer disabled:cursor-not-allowed ${
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
            </form>
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
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 shadow-xs">
                          {chat.userName ? chat.userName.charAt(0).toUpperCase() : 'U'}
                        </div>

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
                    />
                  );
                })
              )}
              <div ref={privateEndRef} className="h-2" />
            </div>

            {/* Preview de imagem no chat privado */}
            <AnimatePresence>
              {pendingImage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-slate-900 border-t border-slate-800 p-3 flex items-center space-x-3 shrink-0"
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-700 shrink-0 bg-black">
                    <img src={pendingImage.dataUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPendingImage(null)}
                      className="absolute top-1 right-1 p-0.5 bg-black/80 rounded-full text-white hover:bg-rose-600 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex-1 text-xs text-slate-300">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>Foto pronta para envio privado</span>
                    </p>
                    <p className="text-[11px] text-slate-400">Adicione uma nota explicativa ou toque em Enviar.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input do Chat Privado com Câmera */}
            <footer className="fixed bottom-0 left-0 right-0 w-full bg-[#0f172a] border-t border-slate-800 p-3 sm:p-4 z-40" style={{ backgroundColor: '#0f172a' }}>
              <form onSubmit={handleSendPrivateMessage} className="max-w-5xl mx-auto flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => privateFilePickerRef.current?.click()}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-2xl transition cursor-pointer shrink-0"
                  title="Enviar foto para o Admin (máx 3MB)"
                >
                  <Camera className="w-5 h-5 text-amber-400" />
                </button>

                <div className="flex-1 relative">
                  <input
                    ref={privateInputRef}
                    type="text"
                    value={privateInputText}
                    onChange={(e) => setPrivateInputText(e.target.value)}
                    placeholder={isAdmin ? "Responder ao investidor..." : "Mensagem privada para o Admin..."}
                    maxLength={600}
                    className="w-full pl-4 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={(!privateInputText.trim() && !pendingImage) || isSendingPrivate}
                  className="px-4 sm:px-5 py-3 rounded-2xl font-bold text-xs bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 flex items-center space-x-1.5 transition shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
              </form>
            </footer>

          </div>
        </div>
      )}

    </div>
  );
}
