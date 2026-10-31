import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  Firestore
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export interface GroupMessage {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  isAdmin: boolean;
  text: string;
  replyToId: string | null;
  replyToMessage?: {
    id: string;
    displayName: string;
    text: string;
  } | null;
  createdAt: any;
  type?: 'text' | 'system' | 'image';
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  isDeleted?: boolean;
  isEdited?: boolean;
  editedAt?: any;
  reactions?: Record<string, number>;
  userReactions?: Record<string, string>; // uid -> emoji
  // Transient state for live upload progress bar inside bubble
  isUploading?: boolean;
  uploadProgress?: number;
  localPreviewUrl?: string;
}

export interface PrivateChatDoc {
  uid: string;
  userName: string;
  userEmail: string;
  lastMessage: string;
  lastMessageAt: any;
  lastMessageType?: 'text' | 'image' | 'system';
  unreadUserCount: number; // for the regular trader
  unreadAdminCount: number; // for admin
  updatedAt: any;
}

export interface PrivateMessage {
  id: string;
  uid: string;
  senderName: string;
  senderEmail: string;
  isAdmin: boolean;
  text: string;
  type: 'text' | 'image' | 'system';
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  createdAt: any;
  read: boolean;
  // Transient state for live upload
  isUploading?: boolean;
  uploadProgress?: number;
  localPreviewUrl?: string;
}

export const ADMIN_EMAIL = 'garotoestranho454@gmail.com';

// Pleasant, smooth audio notification using standard Web Audio API (no external asset needed)
export function playMessageSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Gentle dual-tone chime (F#5 to B5)
    osc.frequency.setValueAtTime(739.99, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(987.77, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Silently ignore if audio autoplay blocked by user gesture policy
  }
}

/**
 * Compresses an image in the browser using HTML5 Canvas.
 * Resize maintaining aspect ratio to max 850px and compresses to JPEG (quality 0.72)
 * for sub-second delivery over Mozambique mobile data networks.
 */
export async function compressChatImage(file: File): Promise<{
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler ficheiro de imagem'));
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Ficheiro de imagem inválido'));
      img.onload = () => {
        const MAX_DIM = 850;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context não suportado'));
          return;
        }

        // Draw image smoothly
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG with 0.72 quality for ultra-fast transfer (typically 25-50KB)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                blob,
                dataUrl: compressedDataUrl,
                width,
                height
              });
            } else {
              // Fallback
              fetch(compressedDataUrl)
                .then((r) => r.blob())
                .then((b) => resolve({ blob: b, dataUrl: compressedDataUrl, width, height }))
                .catch(() => reject(new Error('Falha ao converter canvas para blob')));
            }
          },
          'image/jpeg',
          0.72
        );
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload image with progress tracking and aggressive sub-second fallback.
 * If Firebase Storage is delayed or CORS-blocked, instantly resolves to the
 * high-definition compressed image so the chat NEVER gets stuck 'a processar'.
 */
export async function uploadImageWithProgress(
  blob: Blob,
  path: string,
  onProgress?: (progress: number) => void,
  fallbackDataUrl?: string
): Promise<string> {
  // If no storage is available, use fallback immediately
  if (!storage && fallbackDataUrl) {
    if (onProgress) {
      onProgress(50);
      setTimeout(() => onProgress(100), 100);
    }
    return fallbackDataUrl;
  }

  try {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/jpeg'
    });

    // Storage upload promise
    const storagePromise = new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const progress = Math.min(
              95,
              Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            );
            if (onProgress) onProgress(progress);
          }
        },
        (error) => {
          console.warn('Storage upload error, resolving via instant fast image:', error);
          if (fallbackDataUrl) {
            if (onProgress) onProgress(100);
            resolve(fallbackDataUrl);
          } else {
            reject(error);
          }
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve(downloadUrl);
          } catch (urlErr) {
            console.warn('getDownloadURL error, fallback used:', urlErr);
            if (fallbackDataUrl) resolve(fallbackDataUrl);
            else reject(urlErr);
          }
        }
      );
    });

    // 2-second timeout safety guard: if Firebase Storage is hanging/slow,
    // immediately complete with compressed dataUrl to guarantee 0-second perceived latency!
    if (fallbackDataUrl) {
      const timeoutPromise = new Promise<string>((resolve) => {
        setTimeout(() => {
          try {
            uploadTask.cancel();
          } catch {}
          if (onProgress) onProgress(100);
          resolve(fallbackDataUrl);
        }, 2000);
      });

      return await Promise.race([storagePromise, timeoutPromise]);
    }

    return await storagePromise;
  } catch (err) {
    console.warn('Upload fallback applied:', err);
    if (fallbackDataUrl) {
      if (onProgress) onProgress(100);
      return fallbackDataUrl;
    }
    throw err;
  }
}

// ========================================================
// OFFLINE-FIRST LOCAL STORAGE PERSISTENCE (WHATSAPP STYLE)
// ========================================================

const STORAGE_KEYS = {
  GROUP_MESSAGES: 'taprise_offline_group_messages',
  PRIVATE_MESSAGES_PREFIX: 'taprise_offline_private_',
  PRIVATE_CHATS_LIST: 'taprise_offline_private_chats_list'
};

export function saveLocalGroupMessages(msgs: GroupMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    const toSave = msgs.slice(-80).map((m) => ({
      ...m,
      createdAt: m.createdAt?.seconds ? { seconds: m.createdAt.seconds } : m.createdAt
    }));
    localStorage.setItem(STORAGE_KEYS.GROUP_MESSAGES, JSON.stringify(toSave));
    cachedMessages = msgs;
  } catch (err) {
    console.warn('[TapRise Offline] Failed to persist group messages:', err);
  }
}

export function loadLocalGroupMessages(): GroupMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GROUP_MESSAGES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      cachedMessages = parsed;
      return parsed;
    }
  } catch (err) {
    console.warn('[TapRise Offline] Failed to load cached group messages:', err);
  }
  return [];
}

export function saveLocalPrivateMessages(chatUid: string, msgs: PrivateMessage[]) {
  if (typeof window === 'undefined' || !chatUid) return;
  try {
    const toSave = msgs.slice(-100).map((m) => ({
      ...m,
      createdAt: m.createdAt?.seconds ? { seconds: m.createdAt.seconds } : m.createdAt
    }));
    localStorage.setItem(`${STORAGE_KEYS.PRIVATE_MESSAGES_PREFIX}${chatUid}`, JSON.stringify(toSave));
  } catch (err) {
    console.warn('[TapRise Offline] Failed to persist private messages:', err);
  }
}

export function loadLocalPrivateMessages(chatUid: string): PrivateMessage[] {
  if (typeof window === 'undefined' || !chatUid) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.PRIVATE_MESSAGES_PREFIX}${chatUid}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (err) {
    console.warn('[TapRise Offline] Failed to load cached private messages:', err);
  }
  return [];
}

export function saveLocalPrivateChats(chats: PrivateChatDoc[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.PRIVATE_CHATS_LIST, JSON.stringify(chats.slice(0, 100)));
  } catch (err) {
    console.warn('[TapRise Offline] Failed to persist private chats list:', err);
  }
}

export function loadLocalPrivateChats(): PrivateChatDoc[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRIVATE_CHATS_LIST);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (err) {
    console.warn('[TapRise Offline] Failed to load cached private chats:', err);
  }
  return [];
}

// In-memory cache for sub-300ms instant open
let cachedMessages: GroupMessage[] = [];
let hasPrefetched = false;

export function getCachedMessages(): GroupMessage[] {
  if (cachedMessages.length === 0) {
    cachedMessages = loadLocalGroupMessages();
  }
  return cachedMessages;
}

export function setCachedMessages(msgs: GroupMessage[]) {
  cachedMessages = msgs;
  saveLocalGroupMessages(msgs);
}

/**
 * Prefetch latest 50 messages in background when user is on home/dashboard
 */
export async function prefetchLatestChatMessages(db: Firestore): Promise<GroupMessage[]> {
  if (hasPrefetched && cachedMessages.length > 0) return cachedMessages;
  try {
    const colRef = collection(db, 'taprise_group_messages');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return cachedMessages;

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

    cachedMessages = list;
    hasPrefetched = true;
    return cachedMessages;
  } catch (err) {
    console.warn('Erro ao pré-carregar chat:', err);
    return cachedMessages;
  }
}
