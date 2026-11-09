/**
 * Utilitários de Horário Oficial de Moçambique (África/Maputo, UTC+2)
 * e motor financeiro da Janela 21h da TapRise (Bolsa e Mercadorias).
 *
 * Imune a alterações de data/hora no relógio do computador ou celular do usuário.
 */

export interface MaputoTimeDetails {
  dateStr: string; // YYYY-MM-DD oficial em Maputo
  hour: number;
  minute: number;
  second: number;
  timeInHours: number; // decimal ex: 21.25 para 21:15
  dayOfWeek: number; // 0=Domingo, 1=Segunda, ..., 5=Sexta, 6=Sábado
  dayName: string; // "Segunda-feira", etc.
  isWeekday: boolean; // Segunda a Sexta (dias de mercado aberto)
  isWeekend: boolean; // Sábado e Domingo (mercado fechado)
  isInWindow: boolean; // Verdadeiro se Segunda a Sexta e 21:00 <= hora < 21:30 Maputo
  timeFormatted: string; // HH:mm:ss
  statusMessage: string;
}

const DIAS_SEMANA_MAPUTO = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

// Offset oficial do tempo do servidor em relação a Date.now() local (em milissegundos)
let serverTimeOffsetMs = 0;
let hasSyncedServerTime = false;
let isSyncingServerTime = false;

/**
 * Sincroniza o relógio da aplicação com a hora oficial do servidor (Google / UTC),
 * tornando todo o sistema imune a alterações manuais de data/hora no celular ou computador.
 */
export async function syncServerTime(): Promise<number> {
  if (typeof window === 'undefined') return 0;
  if (isSyncingServerTime) return serverTimeOffsetMs;
  isSyncingServerTime = true;
  const t0 = Date.now();

  // 1. Tentar ler o cabeçalho 'date' oficial retornado pelo próprio backend / servidor
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const res = await fetch(`${origin}/?_ts=${t0}`, {
      method: 'HEAD',
      cache: 'no-store'
    });
    const t1 = Date.now();
    const roundTrip = Math.max(0, (t1 - t0) / 2);
    const dateHeader = res.headers.get('date');
    if (dateHeader) {
      const serverDateMs = new Date(dateHeader).getTime();
      if (!isNaN(serverDateMs) && serverDateMs > 0) {
        serverTimeOffsetMs = (serverDateMs + roundTrip) - t1;
        hasSyncedServerTime = true;
        isSyncingServerTime = false;
        return serverTimeOffsetMs;
      }
    }
  } catch {}

  // 2. Fallback primário: timeapi.io
  try {
    const res = await fetch('https://timeapi.io/api/time/current/zone?timeZone=UTC', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const serverDateMs = new Date(data.dateTime + 'Z').getTime();
      if (!isNaN(serverDateMs) && serverDateMs > 0) {
        serverTimeOffsetMs = serverDateMs - Date.now();
        hasSyncedServerTime = true;
        isSyncingServerTime = false;
        return serverTimeOffsetMs;
      }
    }
  } catch {}

  // 3. Fallback secundário: worldtimeapi.org
  try {
    const res = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const serverDateMs = new Date(data.utc_datetime).getTime();
      if (!isNaN(serverDateMs) && serverDateMs > 0) {
        serverTimeOffsetMs = serverDateMs - Date.now();
        hasSyncedServerTime = true;
        isSyncingServerTime = false;
        return serverTimeOffsetMs;
      }
    }
  } catch {}

  isSyncingServerTime = false;
  return serverTimeOffsetMs;
}

// Inicia a sincronização e revalida a cada 60 segundos
if (typeof window !== 'undefined') {
  syncServerTime();
  setInterval(() => {
    syncServerTime();
  }, 60000);
}

/**
 * Retorna o Date atual baseado estritamente na hora oficial do servidor
 * (ignora qualquer alteração fraudulenta do relógio do aparelho).
 */
export function getServerNow(): Date {
  return new Date(Date.now() + serverTimeOffsetMs);
}

/**
 * Retorna a data atual oficial no fuso horário de Moçambique (África/Maputo, UTC+2) no padrão YYYY-MM-DD.
 */
export function getMaputoTodayDate(): string {
  const now = getServerNow();
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Maputo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(now);
  } catch {
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const catDate = new Date(utcTime + (2 * 3600000));
    const y = catDate.getFullYear();
    const m = String(catDate.getMonth() + 1).padStart(2, '0');
    const d = String(catDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Retorna os detalhes de tempo de Moçambique (África/Maputo, UTC+2) com validação
 * de dias úteis e janela operacional das 21:00 às 21:30.
 */
export function getMaputoTimeDetails(): MaputoTimeDetails {
  const now = getServerNow();
  const dateStr = getMaputoTodayDate();

  let hour = 0;
  let minute = 0;
  let second = 0;
  let dayOfWeek = 1;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Maputo',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    }).formatToParts(now);

    hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    second = parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);

    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const catDate = new Date(utcTime + (2 * 3600000));
    dayOfWeek = catDate.getDay();
  } catch {
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const catDate = new Date(utc + (2 * 3600000));
    hour = catDate.getHours();
    minute = catDate.getMinutes();
    second = catDate.getSeconds();
    dayOfWeek = catDate.getDay();
  }

  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isWeekend = !isWeekday;
  const dayName = DIAS_SEMANA_MAPUTO[dayOfWeek] || 'Dia de Negociação';

  const timeInHours = hour + minute / 60 + second / 3600;
  // Janela das 21:00 às 21:30 em dias úteis (Segunda a Sexta)
  const isInWindow = isWeekday && hour === 21 && minute < 30;

  let statusMessage = '';
  if (isWeekend) {
    statusMessage = 'Mercado Fechado • Reabre Segunda-feira às 21:00';
  } else if (isInWindow) {
    const minsLeft = 29 - minute;
    const secsLeft = 59 - second;
    statusMessage = `Janela 21h Aberta • Encerra em ${minsLeft}m ${secsLeft}s`;
  } else if (timeInHours < 21) {
    const totalSecs = (21 * 3600) - (hour * 3600 + minute * 60 + second);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    statusMessage = `Mesa em Standby • Sessão hoje às 21:00 (em ${hrs}h ${mins}m)`;
  } else {
    if (dayOfWeek === 5) {
      statusMessage = 'Mercado Fechado para o Fim de Semana • Reabre Segunda às 21:00';
    } else {
      const totalSecs = (24 * 3600 - (hour * 3600 + minute * 60 + second)) + (21 * 3600);
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      statusMessage = `Sessão Encerrada • Próxima Sessão amanhã às 21:00 (em ${hrs}h ${mins}m)`;
    }
  }

  return {
    dateStr,
    hour,
    minute,
    second,
    timeInHours,
    dayOfWeek,
    dayName,
    isWeekday,
    isWeekend,
    isInWindow,
    timeFormatted: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
    statusMessage
  };
}

/**
 * REGRAS OFICIAIS DA JANELA 21H TAPRISE:
 * Taxa de Lucro Fixa = 4.73% (0.0473)
 * Custo de Margem por Ordem = 100,00 MT
 *
 * Vitória:
 *   - Ganho = saldo_atual * 0.0473
 *   - Novo saldo = saldo_atual + Ganho
 *
 * Derrota / Fora de Horário / Já Operou / Direção Incorreta:
 *   - Perda = 100,00 MT
 *   - Novo saldo = Math.max(0, saldo_atual - 100)
 */
export const TAXA_FIXA_21H = 0.0473; // 4.73%
export const VALOR_ORDEM_MARGEM = 100; // 100,00 MT

export interface OrderExecutionEvaluation {
  allowed: boolean;
  won: boolean;
  gain: number;
  loss: number;
  oldBalance: number;
  newBalance: number;
  reasonCode: 'SUCCESS' | 'WEEKEND_CLOSED' | 'OUTSIDE_HOURS' | 'ALREADY_CLAIMED' | 'WRONG_DIRECTION' | 'INSUFFICIENT_FUNDS';
  reasonText: string;
}

/**
 * Avalia o resultado da ordem da Janela 21h.
 */
export function evaluate21hOrder(params: {
  currentBalance: number;
  userAction: 'buy' | 'sell';
  adminAction: 'buy' | 'sell';
  forceOpen?: boolean;
  alreadyClaimedToday?: boolean;
}): OrderExecutionEvaluation {
  const { currentBalance, userAction, adminAction, forceOpen, alreadyClaimedToday } = params;
  const time = getMaputoTimeDetails();
  const safeBalance = Math.max(0, Number(currentBalance) || 0);

  // 1. Saldo insuficiente (mínimo 100 MT)
  if (safeBalance < VALOR_ORDEM_MARGEM) {
    return {
      allowed: false,
      won: false,
      gain: 0,
      loss: 0,
      oldBalance: safeBalance,
      newBalance: safeBalance,
      reasonCode: 'INSUFFICIENT_FUNDS',
      reasonText: 'Saldo insuficiente. É necessária uma margem mínima de 100,00 MT para abrir uma ordem de mercado.'
    };
  }

  // 2. Fim de semana (Sábado e Domingo mercado fechado)
  if (time.isWeekend && !forceOpen) {
    return {
      allowed: false,
      won: false,
      gain: 0,
      loss: 0,
      oldBalance: safeBalance,
      newBalance: safeBalance,
      reasonCode: 'WEEKEND_CLOSED',
      reasonText: 'Mercado Encerrado: A Mesa de Operações da Bolsa de Mercadorias funciona de segunda a sexta. As negociações reabrem segunda-feira às 21:00.'
    };
  }

  // Validação da Janela de Horário Oficial (21:00 às 21:30)
  const isTimeValid = time.isInWindow || !!forceOpen;

  // 3. Fora do horário das 21h (antes das 21:00 ou após 21:30) -> PERDE 100 MT
  if (!isTimeValid) {
    const newBal = Math.max(0, Number((safeBalance - VALOR_ORDEM_MARGEM).toFixed(2)));
    return {
      allowed: true,
      won: false,
      gain: 0,
      loss: VALOR_ORDEM_MARGEM,
      oldBalance: safeBalance,
      newBalance: newBal,
      reasonCode: 'OUTSIDE_HOURS',
      reasonText: 'Stop Loss Acionado: Ordem executada fora da janela oficial das 21:00 às 21:30. Perda de margem de 100,00 MT.'
    };
  }

  // 4. Já operou com vitória hoje (apenas 1 ganho por dia útil) -> PERDE 100 MT
  if (alreadyClaimedToday) {
    const newBal = Math.max(0, Number((safeBalance - VALOR_ORDEM_MARGEM).toFixed(2)));
    return {
      allowed: true,
      won: false,
      gain: 0,
      loss: VALOR_ORDEM_MARGEM,
      oldBalance: safeBalance,
      newBalance: newBal,
      reasonCode: 'ALREADY_CLAIMED',
      reasonText: 'Stop Loss Acionado: Limite diário atingido. É permitida apenas 1 ordem institucional com ganho por dia útil. Perda de margem de 100,00 MT.'
    };
  }

  // 5. Direção errada em relação à diretriz definida pelo Admin (Admin = Compra -> requer Compra; Admin = Venda -> requer Venda)
  const isCorrectDirection = userAction === adminAction;
  if (!isCorrectDirection) {
    const newBal = Math.max(0, Number((safeBalance - VALOR_ORDEM_MARGEM).toFixed(2)));
    return {
      allowed: true,
      won: false,
      gain: 0,
      loss: VALOR_ORDEM_MARGEM,
      oldBalance: safeBalance,
      newBalance: newBal,
      reasonCode: 'WRONG_DIRECTION',
      reasonText: `Stop Loss Acionado: A ordem de ${userAction === 'buy' ? 'COMPRA' : 'VENDA'} divergiu da diretriz institucional da Mesa (${adminAction === 'buy' ? 'ALTA' : 'BAIXA'}). Perda de margem de 100,00 MT.`
    };
  }

  // 6. VITÓRIA / LUCRO OFICIAL (+4.73% do saldo)
  const gain = Number((safeBalance * TAXA_FIXA_21H).toFixed(2));
  const newBal = Number((safeBalance + gain).toFixed(2));

  return {
    allowed: true,
    won: true,
    gain,
    loss: 0,
    oldBalance: safeBalance,
    newBalance: newBal,
    reasonCode: 'SUCCESS',
    reasonText: `Ordem Executada com Êxito! Diretriz de ${adminAction === 'buy' ? 'ALTA (Compra)' : 'BAIXA (Venda)'} confirmada. Retorno de 100,00 MT de margem + Lucro líquido de +${gain.toFixed(2)} MT creditados.`
  };
}

/**
 * Cálculo oficial do incremento de 4.73%
 */
export function calculate21hIncrement(currentBalance: number): { increment: number; newBalance: number } {
  const safeBalance = Math.max(0, Number(currentBalance) || 0);
  const increment = Number((safeBalance * TAXA_FIXA_21H).toFixed(2));
  const newBalance = Number((safeBalance + increment).toFixed(2));
  return { increment, newBalance };
}

export interface WithdrawalWindowDetails {
  isOpen: boolean;
  statusMessage: string;
  hoursLeft?: number;
  minutesLeft?: number;
}

/**
 * Regra Oficial de Levantamentos TapRise:
 * Exclusivamente entre as 08:00 e as 12:00 todos os dias (Hora de Moçambique Maputo, CAT, UTC+2).
 */
export function getMaputoWithdrawalWindowDetails(): WithdrawalWindowDetails {
  const { hour, minute, second } = getMaputoTimeDetails();
  const isOpen = hour >= 8 && hour < 12;

  if (isOpen) {
    const minsLeft = 59 - minute;
    const hoursLeft = 11 - hour;
    return {
      isOpen: true,
      statusMessage: `Janela de Levantamento Aberta • Encerra às 12:00 (restam ${hoursLeft}h ${minsLeft}m)`,
      hoursLeft,
      minutesLeft: minsLeft
    };
  }

  if (hour < 8) {
    const totalSecs = (8 * 3600) - (hour * 3600 + minute * 60 + second);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    return {
      isOpen: false,
      statusMessage: `Levantamentos Fechados • Abre hoje às 08:00 (em ${hrs}h ${mins}m)`
    };
  }

  const totalSecs = (24 * 3600 - (hour * 3600 + minute * 60 + second)) + (8 * 3600);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  return {
    isOpen: false,
    statusMessage: `Levantamentos Fechados • Abre amanhã às 08:00 (em ${hrs}h ${mins}m)`
  };
}