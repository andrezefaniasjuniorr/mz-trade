/**
 * MOTOR GLOBAL DE MERCADO SINCRONIZADO - TAPRISE
 * 
 * Regras fundamentais:
 * 1. Baseado 100% na Hora Oficial de Moçambique (África/Maputo, UTC+2).
 * 2. Imune a manipulações do relógio do aparelho (sincronizado com o servidor).
 * 3. Seed determinístico baseado em Símbolo + Data do Servidor.
 * 4. Preço idêntico e velas idênticas para todos os usuários ao mesmo segundo.
 * 5. Nunca reinicia ao trocar de conta, sair ou entrar.
 */

import { getServerNow, getMaputoTimeDetails, getMaputoTodayDate } from './maputoTime';

export interface CommoditySpec {
  id: string;
  name: string;
  symbol: string;
  category: string;
  basePrice: number;
  unit: string;
  baseVolatility: number;
  description: string;
}

export interface LiveMarketQuote {
  id: string;
  name: string;
  symbol: string;
  category: string;
  price: number;
  unit: string;
  change24h: number;
  high: number;
  low: number;
  open: number;
  baseVolatility: number;
  description: string;
  lastTickDir: 'up' | 'down';
}

export interface MarketCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export const COMMODITY_SPECS: CommoditySpec[] = [
  {
    id: 'milho',
    name: 'Milho Branco (Chókwè)',
    symbol: 'MILHO-MZ',
    category: 'Agricultura',
    basePrice: 42.50,
    unit: 'Kg',
    baseVolatility: 0.012,
    description: 'Cereal essencial de segurança alimentar no Vale do Limpopo'
  },
  {
    id: 'brent',
    name: 'Petróleo Bruto (Brent)',
    symbol: 'BRENT',
    category: 'Energia',
    basePrice: 5120.50,
    unit: 'Barril (bbl)',
    baseVolatility: 0.018,
    description: 'Referência internacional para combustíveis em Moçambique'
  },
  {
    id: 'gas',
    name: 'Gás Natural (Rovuma LNG)',
    symbol: 'NATGAS',
    category: 'Energia',
    basePrice: 185.30,
    unit: 'MMBtu',
    baseVolatility: 0.022,
    description: 'Bacia do Rovuma, Cabo Delgado'
  },
  {
    id: 'coal',
    name: 'Carvão Mineral (Moatize)',
    symbol: 'COAL-MZ',
    category: 'Energia',
    basePrice: 8200.00,
    unit: 'Tonelada (t)',
    baseVolatility: 0.014,
    description: 'Bacia carbonífera de Moatize, Tete'
  },
  {
    id: 'gold',
    name: 'Ouro Fino 999 (Manica)',
    symbol: 'XAU',
    category: 'Metais',
    basePrice: 148500.00,
    unit: 'Onça (oz)',
    baseVolatility: 0.010,
    description: 'Reserva de valor e exploração aluvial em Manica'
  },
  {
    id: 'silver',
    name: 'Prata Fina',
    symbol: 'XAG',
    category: 'Metais',
    basePrice: 1820.00,
    unit: 'Onça (oz)',
    baseVolatility: 0.016,
    description: 'Metal precioso com alta aplicação industrial'
  },
  {
    id: 'copper',
    name: 'Cobre de Alta Pureza',
    symbol: 'COPPER',
    category: 'Metais',
    basePrice: 580.00,
    unit: 'Kg',
    baseVolatility: 0.015,
    description: 'Condutores elétricos e transição energética'
  },
  {
    id: 'aluminum',
    name: 'Alumínio (Mozal Spec)',
    symbol: 'ALUM',
    category: 'Metais',
    basePrice: 1540.00,
    unit: 'Tonelada (t)',
    baseVolatility: 0.013,
    description: 'Fundição Mozal em Beluluane, Matola'
  },
  {
    id: 'cashew',
    name: 'Castanha de Caju (Nampula)',
    symbol: 'CAJU-MZ',
    category: 'Agricultura',
    basePrice: 95.50,
    unit: 'Kg',
    baseVolatility: 0.025,
    description: 'Principal cultura de rendimento de exportação'
  },
  {
    id: 'bmm',
    name: 'Bolsa de Mercadorias de Moçambique',
    symbol: 'BMM-MZ',
    category: 'Índice Geral',
    basePrice: 1482.50,
    unit: 'Pontos (MZN)',
    baseVolatility: 0.015,
    description: 'Índice de Cotações Central da Bolsa BMM'
  }
];

function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Avalia o preço determinístico do ativo para um segundo específico do dia em Maputo.
 * Garante que qualquer usuário no mesmo segundo veja exatamente o mesmo centavo.
 */
export function calculateDeterministicPrice(
  spec: CommoditySpec,
  dateStr: string,
  secOfDay: number
): number {
  const seed = hashString(`${spec.symbol}_${dateStr}`);
  
  // Parâmetros fixos diários do ativo baseados no seed do dia
  const dailyDrift = (((seed % 600) - 275) / 10000); // Ex: -2.75% a +3.25% no dia
  const phase1 = ((seed >> 2) % 628) / 100;
  const phase2 = ((seed >> 5) % 628) / 100;
  const phase3 = ((seed >> 8) % 628) / 100;
  const phase4 = ((seed >> 11) % 628) / 100;

  // Ondas harmônicas contínuas de Fourier (independem de sessão de usuário)
  const wave1 = Math.sin((secOfDay / 10800) * 2 * Math.PI + phase1) * 0.016; // Ciclo 3h
  const wave2 = Math.cos((secOfDay / 2700) * 2 * Math.PI + phase2) * 0.009;  // Ciclo 45m
  const wave3 = Math.sin((secOfDay / 600) * 2 * Math.PI + phase3) * 0.004;   // Ciclo 10m
  const wave4 = Math.sin((secOfDay / 90) * 2 * Math.PI + phase4) * 0.0018;  // Ciclo 90s
  const microJitter = Math.sin(secOfDay * 1.57 + phase1) * 0.0006;           // Variação viva a cada 1-2s

  const driftProgression = (secOfDay / 86400) * dailyDrift;

  const totalPercent = (wave1 + wave2 + wave3 + wave4 + microJitter + driftProgression) * (spec.baseVolatility / 0.012);
  const raw = spec.basePrice * (1 + totalPercent);
  const precision = spec.basePrice < 100 ? 3 : 2;
  return Math.max(0.001, Number(raw.toFixed(precision)));
}

/**
 * Obtém a cotação ao vivo para um ativo baseada na Hora Oficial de Moçambique.
 */
export function getLiveQuote(spec: CommoditySpec): LiveMarketQuote {
  const time = getMaputoTimeDetails();
  const dateStr = time.dateStr;
  const currentSec = time.hour * 3600 + time.minute * 60 + time.second;
  const prevSec = Math.max(0, currentSec - 1);

  const price = calculateDeterministicPrice(spec, dateStr, currentSec);
  const prevPrice = calculateDeterministicPrice(spec, dateStr, prevSec);
  const openPrice = calculateDeterministicPrice(spec, dateStr, 0); // Preço de abertura oficial às 00:00

  // Amostragem diária para High e Low
  let high = Math.max(openPrice, price);
  let low = Math.min(openPrice, price);
  const sampleStep = 300; // amostra a cada 5 minutos
  const maxSample = Math.min(currentSec, 86400);
  for (let s = 0; s < maxSample; s += sampleStep) {
    const p = calculateDeterministicPrice(spec, dateStr, s);
    if (p > high) high = p;
    if (p < low) low = p;
  }

  const change24h = Number((((price - openPrice) / openPrice) * 100).toFixed(2));
  const precision = spec.basePrice < 100 ? 3 : 2;

  return {
    id: spec.id,
    name: spec.name,
    symbol: spec.symbol,
    category: spec.category,
    price,
    unit: spec.unit,
    change24h,
    high: Number(high.toFixed(precision)),
    low: Number(low.toFixed(precision)),
    open: Number(openPrice.toFixed(precision)),
    baseVolatility: spec.baseVolatility,
    description: spec.description,
    lastTickDir: price >= prevPrice ? 'up' : 'down'
  };
}

/**
 * Gera velas históricas e vela atual sincronizadas globalmente para todos os investidores.
 * Timeframes suportados: 'M1', 'M5', 'M15', 'H1', '1D'.
 */
export function getDeterministicCandles(
  spec: CommoditySpec,
  timeframe: string,
  candleCount = 36
): MarketCandle[] {
  const normTf = (timeframe || 'M5').toUpperCase();
  const tfSeconds: Record<string, number> = {
    M1: 60,
    '1M': 60,
    M5: 300,
    '5M': 300,
    M15: 900,
    '15M': 900,
    H1: 3600,
    '1H': 3600,
    '1D': 86400,
    D1: 86400
  };

  const periodSec = tfSeconds[normTf] || 300;
  const serverNow = getServerNow();
  const timeDetails = getMaputoTimeDetails();
  const dateStr = timeDetails.dateStr;
  const currentSecOfDay = timeDetails.hour * 3600 + timeDetails.minute * 60 + timeDetails.second;
  const precision = spec.basePrice < 100 ? 3 : 2;

  const list: MarketCandle[] = [];
  const currentBucket = Math.floor(currentSecOfDay / periodSec);

  // Constrói para trás de forma determinística: a última vela fecha exatamente na cotação atual
  for (let i = 0; i < candleCount; i++) {
    const bucket = currentBucket - i;
    const bucketStartSec = Math.max(0, bucket * periodSec);
    const bucketEndSec = Math.min(86399, (bucket + 1) * periodSec - 1);

    const isCurrent = (i === 0);
    const actualEndSec = isCurrent ? currentSecOfDay : bucketEndSec;

    const open = calculateDeterministicPrice(spec, dateStr, bucketStartSec);
    const close = calculateDeterministicPrice(spec, dateStr, actualEndSec);

    // Amostragem interna de máxima e mínima da vela
    let high = Math.max(open, close);
    let low = Math.min(open, close);
    const midStep = Math.max(1, Math.floor(periodSec / 6));
    for (let s = bucketStartSec; s <= actualEndSec; s += midStep) {
      const p = calculateDeterministicPrice(spec, dateStr, s);
      if (p > high) high = p;
      if (p < low) low = p;
    }

    // Pavios adicionais proporcionais à volatilidade real
    const seed = hashString(`${spec.symbol}_${bucket}_${dateStr}`);
    const wickBonus = (spec.basePrice * spec.baseVolatility * 0.15);
    high = Number((high + (((seed % 100) / 100) * wickBonus)).toFixed(precision));
    low = Number((Math.max(0.001, low - ((((seed >> 3) % 100) / 100) * wickBonus))).toFixed(precision));

    // Timestamp da vela
    const candleServerTime = new Date(serverNow.getTime() - i * periodSec * 1000);
    const h = String(candleServerTime.getHours()).padStart(2, '0');
    const m = String(candleServerTime.getMinutes()).padStart(2, '0');
    const timeStr = normTf === '1D' || normTf === 'D1'
      ? `${candleServerTime.getDate()}/${candleServerTime.getMonth() + 1}`
      : `${h}:${m}`;

    const vol = Math.floor(18000 + ((seed % 40000)));

    list.unshift({
      time: timeStr,
      open,
      high,
      low,
      close,
      volume: vol,
      timestamp: candleServerTime.getTime()
    });
  }

  return list;
}

// ==========================================
// STORE GLOBAL EM MEMÓRIA (SINGLETON)
// ==========================================

let currentGlobalQuotes: LiveMarketQuote[] = COMMODITY_SPECS.map(getLiveQuote);
const listeners = new Set<(quotes: LiveMarketQuote[]) => void>();

function updateGlobalMarket() {
  currentGlobalQuotes = COMMODITY_SPECS.map(getLiveQuote);
  listeners.forEach((cb) => {
    try { cb(currentGlobalQuotes); } catch {}
  });
}

// Inicia o motor global com intervalo fixo de 1000ms
if (typeof window !== 'undefined') {
  setInterval(updateGlobalMarket, 1000);
}

/**
 * Retorna as cotações sincronizadas globais atuais.
 */
export function getGlobalMarketQuotes(): LiveMarketQuote[] {
  if (currentGlobalQuotes.length === 0) {
    currentGlobalQuotes = COMMODITY_SPECS.map(getLiveQuote);
  }
  return currentGlobalQuotes;
}

/**
 * Subscreve um componente para receber atualizações do mercado em tempo real.
 */
export function subscribeToGlobalMarket(callback: (quotes: LiveMarketQuote[]) => void): () => void {
  listeners.add(callback);
  callback(getGlobalMarketQuotes());
  return () => {
    listeners.delete(callback);
  };
}