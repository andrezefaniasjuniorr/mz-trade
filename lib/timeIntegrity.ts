/**
 * TapRise Time Integrity & Server Synchronization Engine
 * 
 * Protege a plataforma contra manipulação de data/hora no telemóvel (ex: adiantar 3 dias para burlar o intervalo de levantamentos).
 * - Sincroniza o relógio real com base no cabeçalho HTTP Date do servidor (Cloudflare / Nginx / Host).
 * - Monitoriza derivação de tempo monotónica (performance.now()) para detetar saltos artificiais de relógio.
 * - Impede abertura ou operações na plataforma se a data do telemóvel estiver adulterada.
 */

const DRIFT_TOLERANCE_MS = 15 * 60 * 1000; // Máximo de 15 minutos de desvio tolerado
const JUMP_TOLERANCE_MS = 60 * 1000; // Saltos rápidos superiores a 1 minuto enquanto o app está aberto

let serverOffsetMs = 0;
let isInitialized = false;
let lastPerfNow = typeof performance !== 'undefined' ? performance.now() : 0;
let lastDateNow = Date.now();
let lastVerifiedServerTime = 0;
let isTamperedGlobal = false;
let tamperedReasonGlobal = '';

const listeners = new Set<(isTampered: boolean, reason: string) => void>();

function notifyListeners() {
  listeners.forEach((cb) => {
    try { cb(isTamperedGlobal, tamperedReasonGlobal); } catch {}
  });
}

/**
 * Retorna o carimbo de data/hora oficial e confiável (sincronizado com o servidor).
 */
export function getTrustedCurrentTime(): number {
  return Date.now() + serverOffsetMs;
}

/**
 * Consulta o cabeçalho 'date' oficial do servidor via requisição HEAD leve sem cache.
 */
export async function syncServerTime(): Promise<{ success: boolean; offset: number; serverTime: number }> {
  if (typeof window === 'undefined') {
    return { success: true, offset: 0, serverTime: Date.now() };
  }

  try {
    const probeUrl = `${window.location.origin}/manifest.json?_sync=${Date.now()}`;
    const startPing = performance.now();
    const res = await fetch(probeUrl, {
      method: 'HEAD',
      cache: 'no-store'
    });

    const endPing = performance.now();
    const roundTripMs = endPing - startPing;
    const dateHeader = res.headers.get('date');

    if (dateHeader) {
      const serverDateMs = new Date(dateHeader).getTime();
      if (!isNaN(serverDateMs) && serverDateMs > 0) {
        // Compensação de latência (metade do round trip)
        const adjustedServerTime = serverDateMs + Math.round(roundTripMs / 2);
        const deviceTime = Date.now();
        const calculatedOffset = adjustedServerTime - deviceTime;

        serverOffsetMs = calculatedOffset;
        lastVerifiedServerTime = adjustedServerTime;

        // Persiste última hora verificada
        try {
          localStorage.setItem('taprise_last_verified_server_time', String(adjustedServerTime));
          localStorage.setItem('taprise_server_offset_ms', String(calculatedOffset));
        } catch {}

        // Validação estrita: se a data do dispositivo diferir por mais de 15 minutos da data real do servidor
        if (Math.abs(calculatedOffset) > DRIFT_TOLERANCE_MS) {
          isTamperedGlobal = true;
          const diffMinutes = Math.round(Math.abs(calculatedOffset) / (60 * 1000));
          const direction = calculatedOffset < 0 ? 'adiantada' : 'atrasada';
          tamperedReasonGlobal = `A data do seu telemóvel está ${direction} em cerca de ${diffMinutes} minutos em relação ao horário oficial.`;
          notifyListeners();
          return { success: true, offset: calculatedOffset, serverTime: adjustedServerTime };
        }

        // Tudo correto e alinhado
        isTamperedGlobal = false;
        tamperedReasonGlobal = '';
        notifyListeners();
        return { success: true, offset: calculatedOffset, serverTime: adjustedServerTime };
      }
    }
  } catch (err) {
    console.warn('[TimeIntegrity] Falha ao sincronizar com servidor via HEAD:', err);
  }

  // Fallback: verificar se a hora atual do dispositivo é anterior à última hora verificada guardada
  try {
    const saved = localStorage.getItem('taprise_last_verified_server_time');
    if (saved) {
      const savedTime = parseInt(saved, 10);
      if (!isNaN(savedTime) && Date.now() < savedTime - JUMP_TOLERANCE_MS) {
        isTamperedGlobal = true;
        tamperedReasonGlobal = 'A data do seu dispositivo foi retrocedida para um momento anterior ao último acesso registado.';
        notifyListeners();
      }
    }
  } catch {}

  return { success: false, offset: serverOffsetMs, serverTime: getTrustedCurrentTime() };
}

/**
 * Monitoriza saltos bruscos no relógio do sistema enquanto a aplicação está em execução.
 */
export function checkMonotonicIntegrity(): boolean {
  if (typeof performance === 'undefined') return true;

  const currentPerf = performance.now();
  const currentDate = Date.now();

  const elapsedPerf = currentPerf - lastPerfNow;
  const elapsedDate = currentDate - lastDateNow;

  lastPerfNow = currentPerf;
  lastDateNow = currentDate;

  // Se o relógio do sistema pulou para a frente ou para trás enquanto o app estava ativo
  const jumpDiff = Math.abs(elapsedDate - elapsedPerf);
  if (jumpDiff > JUMP_TOLERANCE_MS) {
    isTamperedGlobal = true;
    tamperedReasonGlobal = 'Alteração manual no relógio do telemóvel detetada enquanto a plataforma estava aberta.';
    notifyListeners();
    // Revalida com o servidor imediatamente
    syncServerTime();
    return false;
  }

  return true;
}

/**
 * Inicia os monitores de integridade temporal no client-side.
 */
export function initTimeIntegrity(): () => void {
  if (typeof window === 'undefined' || isInitialized) {
    return () => {};
  }
  isInitialized = true;

  lastPerfNow = performance.now();
  lastDateNow = Date.now();

  // Sincroniza imediatamente com o servidor
  syncServerTime();

  // Reavalia quando o usuário volta de outra aplicação (ex: Configurações do telemóvel)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      lastPerfNow = performance.now();
      lastDateNow = Date.now();
      syncServerTime();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Monitor regular a cada 4 segundos
  const interval = setInterval(() => {
    checkMonotonicIntegrity();
  }, 4000);

  // Re-sincronização periódica com o servidor a cada 3 minutos
  const serverSyncInterval = setInterval(() => {
    syncServerTime();
  }, 3 * 60 * 1000);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    clearInterval(interval);
    clearInterval(serverSyncInterval);
    isInitialized = false;
  };
}

/**
 * Subscreve a alterações no estado de integridade temporal.
 */
export function subscribeTimeIntegrity(callback: (isTampered: boolean, reason: string) => void): () => void {
  listeners.add(callback);
  callback(isTamperedGlobal, tamperedReasonGlobal);
  return () => {
    listeners.delete(callback);
  };
}

export function isDeviceTimeTampered(): boolean {
  return isTamperedGlobal;
}

export function getTamperedReason(): string {
  return tamperedReasonGlobal;
}
