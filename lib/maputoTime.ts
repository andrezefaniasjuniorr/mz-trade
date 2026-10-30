/**
 * Utilitários de Horário Oficial de Moçambique (África/Maputo, UTC+2)
 * e motor de cálculo da Recompensa Crescente da Janela 21h do TapRise.
 */

export interface MaputoTimeDetails {
  dateStr: string; // YYYY-MM-DD
  hour: number;
  minute: number;
  second: number;
  timeInHours: number; // decimal ex: 21.25 para 21:15
  isInWindow: boolean; // Verdadeiro se 21:00 <= hora < 21:30 Maputo
  timeFormatted: string; // HH:mm:ss
  statusMessage: string;
}

/**
 * Retorna a data atual oficial no fuso horário de Moçambique (YYYY-MM-DD).
 */
export function getMaputoTodayDate(): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Maputo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());

    const y = parts.find((p) => p.type === 'year')?.value || '2026';
    const m = parts.find((p) => p.type === 'month')?.value || '10';
    const d = parts.find((p) => p.type === 'day')?.value || '26';
    return `${y}-${m}-${d}`;
  } catch {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }
}

/**
 * Retorna os detalhes de tempo de Maputo para a verificação da janela 21:00 - 21:30.
 */
export function getMaputoTimeDetails(): MaputoTimeDetails {
  const now = new Date();
  const dateStr = getMaputoTodayDate();

  let hour = 0;
  let minute = 0;
  let second = 0;

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
  } catch {
    // Fallback: UTC+2
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const catDate = new Date(utc + 2 * 3600000);
    hour = catDate.getHours();
    minute = catDate.getMinutes();
    second = catDate.getSeconds();
  }

  const timeInHours = hour + minute / 60 + second / 3600;
  // Janela das 21:00 às 21:30
  const isInWindow = hour === 21 && minute < 30;

  let statusMessage = '';
  if (isInWindow) {
    const minsLeft = 29 - minute;
    const secsLeft = 59 - second;
    statusMessage = `Janela 21h Aberta • Encerra em ${minsLeft}m ${secsLeft}s`;
  } else if (timeInHours < 21) {
    const totalSecs = (21 * 3600) - (hour * 3600 + minute * 60 + second);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    statusMessage = `Mercado Fechado - Volta às 21h (em ${hrs}h ${mins}m)`;
  } else {
    // Passou das 21:30
    const totalSecs = (24 * 3600 - (hour * 3600 + minute * 60 + second)) + (21 * 3600);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    statusMessage = `Mercado Fechado - Volta amanhã às 21h (em ${hrs}h ${mins}m)`;
  }

  return {
    dateStr,
    hour,
    minute,
    second,
    timeInHours,
    isInWindow,
    timeFormatted: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
    statusMessage
  };
}

/**
 * Fórmula oficial do Jogo 21h:
 * incremento = 50 + Math.floor((saldoAtual - 1000)/20) + random(5,15)
 * novoSaldo = saldoAtual + incremento
 * Saldo só sobe.
 */
export function calculate21hIncrement(currentBalance: number): { increment: number; newBalance: number } {
  const safeBalance = Math.max(0, Number(currentBalance) || 0);
  const baseBonus = Math.floor(Math.max(0, safeBalance - 1000) / 20);
  const randomExtra = Math.floor(Math.random() * (15 - 5 + 1)) + 5; // 5 a 15
  const increment = 50 + baseBonus + randomExtra;
  const newBalance = safeBalance + increment;

  return {
    increment,
    newBalance
  };
}

export interface WithdrawalWindowDetails {
  isOpen: boolean;
  statusMessage: string;
  hoursLeft?: number;
  minutesLeft?: number;
}

/**
 * Regra Oficial de Levantamentos TapRise:
 * Os levantamentos processam-se exclusivamente entre as 08:00 e as 12:00 todos os dias (Hora de Moçambique Maputo, CAT, UTC+2).
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

  // hour >= 12
  const totalSecs = (24 * 3600 - (hour * 3600 + minute * 60 + second)) + (8 * 3600);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  return {
    isOpen: false,
    statusMessage: `Levantamentos Fechados • Abre amanhã às 08:00 (em ${hrs}h ${mins}m)`
  };
}

