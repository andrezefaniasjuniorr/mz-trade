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
  type?: 'text' | 'system' | 'image' | 'announcement' | 'audio';
  tipo?: string;
  audioUrl?: string;
  duracao?: number;
  announcementTitle?: string;
  announcementType?: 'info' | 'warning' | 'urgent' | 'success';
  pinned?: boolean;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  isDeleted?: boolean;
  isEdited?: boolean;
  editedAt?: any;
  reactions?: Record<string, number>;
  userReactions?: Record<string, string>; // uid -> emoji
  fotoPerfil?: string;
  photoURL?: string;
  // Transient state for live upload progress bar inside bubble
  isUploading?: boolean;
  uploadProgress?: number;
  localPreviewUrl?: string;
}

export interface PrivateChatDoc {
  uid: string;
  userName: string;
  userEmail: string;
  fotoPerfil?: string;
  photoURL?: string;
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
  fotoPerfil?: string;
  photoURL?: string;
  isAdmin: boolean;
  text: string;
  type: 'text' | 'image' | 'system' | 'audio';
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  audioUrl?: string;
  duracao?: number;
  tipo?: string;
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

// Native System Notification Helper (Mobile & Desktop)
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const res = await Notification.requestPermission();
    return res;
  } catch (e) {
    console.warn('Falha ao pedir permissão de notificações:', e);
    return 'denied';
  }
}

export function triggerPushNotification(title: string, body: string, onClickUrl?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'taprise-chat',
        badge: '/favicon.ico'
      });
      notif.onclick = () => {
        window.focus();
        if (onClickUrl && typeof window !== 'undefined') {
          window.location.href = onClickUrl;
        }
      };
    } catch (e) {
      console.warn('Falha ao disparar Notification:', e);
    }
  }
}


/**
 * Compresses an image in the browser ultra-fast using HTML5 Canvas & createObjectURL.
 * Resizes to max 800px and compresses to JPEG (quality 0.68, ~25-40KB)
 * for instant delivery across mobile connections without blocking the UI.
 */
export async function compressChatImage(file: File): Promise<{
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const hardTimeout = setTimeout(() => {
      reject(new Error('Tempo limite excedido ao processar imagem'));
    }, 2500);

    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      // Fallback to FileReader if createObjectURL fails
      const reader = new FileReader();
      reader.onload = () => {
        processImgSrc(reader.result as string, null);
      };
      reader.onerror = () => {
        clearTimeout(hardTimeout);
        reject(new Error('Falha ao ler ficheiro'));
      };
      reader.readAsDataURL(file);
      return;
    }

    processImgSrc(objectUrl, objectUrl);

    function processImgSrc(src: string, urlToRevoke: string | null) {
      const img = new Image();
      img.onload = () => {
        clearTimeout(hardTimeout);
        if (urlToRevoke) {
          try { URL.revokeObjectURL(urlToRevoke); } catch {}
        }

        try {
          const MAX_DIM = 800;
          let width = img.naturalWidth || img.width || 600;
          let height = img.naturalHeight || img.height || 400;

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
            reject(new Error('Canvas não suportado'));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.68);

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
                resolve({
                  blob: file,
                  dataUrl: compressedDataUrl,
                  width,
                  height
                });
              }
            },
            'image/jpeg',
            0.68
          );
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        clearTimeout(hardTimeout);
        if (urlToRevoke) {
          try { URL.revokeObjectURL(urlToRevoke); } catch {}
        }
        reject(new Error('Ficheiro de imagem não suportado'));
      };

      img.src = src;
    }
  });
}

/**
 * Upload image with progress tracking and instant 1.2-second fallback.
 * If Firebase Storage is delayed, throttled, or CORS-blocked, instantly resolves to the
 * lightweight compressed image (~30KB) so the chat NEVER gets stuck 'a processar'.
 */
export async function uploadImageWithProgress(
  blob: Blob,
  path: string,
  onProgress?: (progress: number) => void,
  fallbackDataUrl?: string
): Promise<string> {
  if (onProgress) onProgress(30);

  // If no storage is available, use fallback immediately
  if (!storage && fallbackDataUrl) {
    if (onProgress) onProgress(100);
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
          if (snapshot.totalBytes > 0 && onProgress) {
            const progress = Math.min(
              95,
              Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            );
            onProgress(progress);
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

    // 1.2-second timeout safety guard: if Firebase Storage is slow,
    // immediately complete with compressed dataUrl to guarantee near-instant delivery!
    if (fallbackDataUrl) {
      const timeoutPromise = new Promise<string>((resolve) => {
        setTimeout(() => {
          try {
            uploadTask.cancel();
          } catch {}
          if (onProgress) onProgress(100);
          resolve(fallbackDataUrl);
        }, 1200);
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

// Local audio blob/URL memory cache for sub-millisecond instant playback
const audioBlobCache = new Map<string, string>();

export function registerLocalAudioUrl(audioId: string, url: string) {
  audioBlobCache.set(audioId, url);
  audioBlobCache.set(`taprise://audio/${audioId}`, url);
}

export function getCachedAudioUrl(audioUrl: string): string | undefined {
  return audioBlobCache.get(audioUrl);
}

/**
 * Resolves any audio URL (including taprise://audio/{id}) into a playable ObjectURL or standard URL.
 */
export async function resolveAudioUrl(audioUrl: string): Promise<string> {
  if (!audioUrl) return '';
  if (audioBlobCache.has(audioUrl)) {
    return audioBlobCache.get(audioUrl)!;
  }
  if (audioUrl.startsWith('data:') || audioUrl.startsWith('blob:') || (audioUrl.startsWith('http') && !audioUrl.includes('taprise://'))) {
    return audioUrl;
  }

  // If it's a taprise custom audio pointer: taprise://audio/{id}
  if (audioUrl.startsWith('taprise://audio/')) {
    const audioId = audioUrl.replace('taprise://audio/', '');
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const docSnap = await getDoc(doc(db, 'chat_audios', audioId));
      if (docSnap.exists()) {
        const d = docSnap.data();
        if (d.storageUrl) {
          audioBlobCache.set(audioUrl, d.storageUrl);
          return d.storageUrl;
        }
        if (d.data) {
          const res = await fetch(d.data);
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          audioBlobCache.set(audioUrl, objUrl);
          return objUrl;
        }
      }
    } catch (e) {
      console.warn('Erro ao resolver áudio do chat:', e);
    }
  }

  return audioUrl;
}

/**
 * Uploads voice audio note with instant, reliable delivery:
 * 1. Stores audio payload in dedicated chat_audios collection (takes ~100ms)
 * 2. Background attempts Storage upload without blocking
 * 3. Returns audio pointer taprise://audio/{audioId}
 */
export async function uploadChatAudio(
  blob: Blob,
  fileName?: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  if (onProgress) onProgress(30);

  const audioId = fileName || `audio_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const audioPointer = `taprise://audio/${audioId}`;

  // Register in memory cache immediately so sender has instant play
  if (typeof window !== 'undefined') {
    const localUrl = URL.createObjectURL(blob);
    registerLocalAudioUrl(audioId, localUrl);
  }

  try {
    // 1. Convert Blob to compact base64 dataUrl (~60-180KB)
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Falha ao ler áudio'));
      reader.readAsDataURL(blob);
    });

    if (onProgress) onProgress(70);

    // 2. Save directly to Firestore doc `chat_audios/{audioId}` - instant, guaranteed delivery!
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');

    await setDoc(doc(db, 'chat_audios', audioId), {
      audioId,
      data: base64Data,
      mimeType: blob.type || 'audio/webm',
      size: blob.size,
      createdAt: new Date()
    });

    if (onProgress) onProgress(100);

    // 3. Background Storage upload attempt (non-blocking)
    if (storage) {
      try {
        const { uploadBytes } = await import('firebase/storage');
        const storageRef = ref(storage, `chat_audios/${audioId}.webm`);
        uploadBytes(storageRef, blob, { contentType: blob.type || 'audio/webm' })
          .then(async (snap) => {
            const dlUrl = await getDownloadURL(snap.ref);
            const { updateDoc } = await import('firebase/firestore');
            updateDoc(doc(db, 'chat_audios', audioId), { storageUrl: dlUrl }).catch(() => {});
          })
          .catch(() => {});
      } catch {}
    }

    return audioPointer;
  } catch (err) {
    console.warn('Erro ao processar áudio:', err);
    return audioPointer;
  }
}

// ========================================================
// OFFLINE-FIRST LOCAL STORAGE PERSISTENCE
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
        type: d.type || (d.audioUrl || d.tipo === 'audio' ? 'audio' : d.imageUrl ? 'image' : 'text'),
        imageUrl: d.imageUrl,
        imageWidth: d.imageWidth,
        imageHeight: d.imageHeight,
        audioUrl: d.audioUrl,
        duracao: d.duracao,
        tipo: d.tipo,
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
          text: original.type === 'image' ? '📷 Foto' : (original.type === 'audio' || original.tipo === 'audio' ? '🎤 Nota de voz' : original.text.slice(0, 75))
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
