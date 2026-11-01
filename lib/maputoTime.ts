/**
 * Utilitários de Horário Oficial de Moçambique (África/Maputo, UTC+2)
 * e motor financeiro da Janela 21h da TapRise (Bolsa e Mercadorias).
 */

export interface MaputoTimeDetails {
  dateStr: string; // YYYY-MM-DD
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
    const d = parts.find((p) => p.type === 'day')?.value || '31';
    return `${y}-${m}-${d}`;
  } catch {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }
}

/**
 * Retorna os detalhes de tempo de Maputo (UTC+2) com validação de dia da semana
 * e janela operacional das 21:00 às 21:30.
 */
export function getMaputoTimeDetails(): MaputoTimeDetails {
  const now = new Date();
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

    // Calcular dayOfWeek no fuso de Maputo (UTC+2)
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const catDate = new Date(utcTime + (2 * 3600000));
    dayOfWeek = catDate.getDay();
  } catch {
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const catDate = new Date(utc + 2 * 3600000);
    hour = catDate.getHours();
    minute = catDate.getMinutes();
    second = catDate.getSeconds();
    dayOfWeek = catDate.getDay();
  }

  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isWeekend = !isWeekday;
  const dayName = DIAS_SEMANA_MAPUTO[dayOfWeek] || 'Dia de Negociação';

  const timeInHours = hour + minute / 60 + second / 3600;
  // Janela das 21:00 às 21:30 apenas em dias úteis (Segunda a Sexta)
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
    // Passou das 21:30
    if (dayOfWeek === 5) { // Sexta após 21:30
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
 * REGRA FIXA OFICIAL DA JANELA 21H TAPRISE:
 * Taxa fixa = 4.73% (0.0473)
 * Custo de Margem por Ordem = 100,00 MT
 *
 * Se Ganhou:
 *   - 100,00 MT estornado integralmente
 *   - + ganho_do_dia = saldo_atual * 0.0473
 *   - novo_saldo = saldo_atual + ganho_do_dia
 *
 * Se Perdeu:
 *   - perde 100,00 MT
 *   - novo_saldo = Math.max(0, saldo_atual - 100)
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
 * Avalia o resultado da ordem de compra ou venda.
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

  // Validação da Janela de Horário (21:00 - 21:30)
  const isTimeValid = time.isInWindow || !!forceOpen;

  // 3. Fora do horário das 21h -> PERDE 100 MT
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

  // 4. Já operou com vitória hoje -> PERDE 100 MT
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
      reasonText: 'Stop Loss Acionado: Limite diário atingido. É permitida apenas 1 ordem institucional por dia útil. Perda de margem de 100,00 MT.'
    };
  }

  // 5. Direção errada em relação ao Admin (Alta requer COMPRAR, Baixa requer VENDER)
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

  // 6. VITÓRIA / GANHO!
  // Ganho = saldo_atual * 0.0473 (4.73% fixo)
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
 * Cálculo de incremento oficial de 4.73% sobre o saldo
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

  const totalSecs = (24 * 3600 - (hour * 3600 + minute * 60 + second)) + (8 * 3600);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  return {
    isOpen: false,
    statusMessage: `Levantamentos Fechados • Abre amanhã às 08:00 (em ${hrs}h ${mins}m)`
  };
}
