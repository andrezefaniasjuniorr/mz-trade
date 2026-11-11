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
 * Gerador pseudo-aleatório determinístico de 32-bit (Mulberry32).
 * Retorna um número no intervalo [0, 1) baseado em uma seed e um salt.
 */
function pseudoRand(seed: number, salt = 0): number {
  let t = (seed + salt * 0x6D2B79F5) ^ 0x85EBCA6B;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Avalia o preço determinístico do ativo para um segundo específico do dia em Maputo.
 * Utiliza frequências incomensuráveis e passeios fractais sem qualquer repetição ou loop sinusoidal.
 */
export function calculateDeterministicPrice(
  spec: CommoditySpec,
  dateStr: string,
  secOfDay: number
): number {
  const seed = hashString(`${spec.symbol}_${dateStr}`);
  
  // Parâmetros do ativo baseados na seed diária
  const dailyDrift = (((seed % 800) - 380) / 10000); // Ex: -3.8% a +4.2% no dia
  const phase1 = ((seed >> 2) % 628) / 100;
  const phase2 = ((seed >> 5) % 628) / 100;
  const phase3 = ((seed >> 8) % 628) / 100;
  const phase4 = ((seed >> 11) % 628) / 100;
  const phase5 = ((seed >> 14) % 628) / 100;

  // Ondas fractais contínuas com períodos irracionais (incomensuráveis entre si, evitando qualquer loop periódico)
  // Períodos: ~9.6h, ~3.8h, ~1.17h, ~18.7min, ~4.7min
  const waveMacro = Math.sin((secOfDay / 34567.89) * 2 * Math.PI + phase1) * 0.019;
  const waveSwing = Math.sin((secOfDay / 13888.88) * 2 * Math.PI + phase2) * 0.012;
  const waveImpulse = Math.cos((secOfDay / 4217.41) * 2 * Math.PI + phase3) * 0.007;
  const waveShort = Math.sin((secOfDay / 1123.58) * 2 * Math.PI + phase4) * 0.0035;
  const waveMicro = Math.sin((secOfDay / 281.82) * 2 * Math.PI + phase5) * 0.0016;

  // Jitter vivo de segundo em segundo (variação tick-a-tick orgânica)
  const tickJitter = Math.sin(secOfDay * 0.7321 + phase1) * 0.00045;

  // Progressão de drift cumulativo ao longo do dia
  const driftProgression = (secOfDay / 86400) * dailyDrift;

  const totalPercent = (waveMacro + waveSwing + waveImpulse + waveShort + waveMicro + tickJitter + driftProgression) * (spec.baseVolatility / 0.012);
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
 * 
 * Correção de Loops e Realismo:
 * - Utiliza tempo absoluto contínuo (nowMs / periodMs) que nunca fica negativo ou preso no mesmo dia.
 * - Simula ciclos de mercado reais: ondas de alta consistentes (3-8 velas de alta consecutivas),
 *   ondas de baixa consistentes (3-8 velas de baixa consecutivas), consolidações e reversões.
 * - Encadeamento contínuo: o open de cada vela é exatamente igual ao close da vela anterior.
 * - A última vela fecha exatamente no preço ao vivo atual (live quote).
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
  const periodMs = periodSec * 1000;
  const serverNow = getServerNow();
  const nowMs = serverNow.getTime();
  const currentBucket = Math.floor(nowMs / periodMs);
  const precision = spec.basePrice < 100 ? 3 : 2;

  // Cotação atual ao vivo para cravar a vela atual
  const liveQuote = getLiveQuote(spec);
  const currentPrice = liveQuote.price;

  // Multiplicador de volatilidade por timeframe
  let tfVolFactor = 0.20;
  if (periodSec >= 86400) tfVolFactor = 1.6;
  else if (periodSec >= 3600) tfVolFactor = 0.55; // H1: volatilidade realista por hora (0.7% a 1.4%)
  else if (periodSec >= 900) tfVolFactor = 0.32;  // M15
  else if (periodSec >= 300) tfVolFactor = 0.18;  // M5
  else tfVolFactor = 0.08;                         // M1

  const barVol = spec.basePrice * spec.baseVolatility * tfVolFactor;
  const specSeed = hashString(`${spec.symbol}_${normTf}`);

  // Fases e frequências incomensuráveis (irracionais) para regimes de tendência
  // Duração de onda: ~18 a 35 velas por ciclo macro, criando séries de 4 a 8 velas na mesma direção
  const phi = 1.61803398875;
  const phase1 = ((specSeed % 1000) / 1000) * 2 * Math.PI;
  const phase2 = (((specSeed >> 4) % 1000) / 1000) * 2 * Math.PI;
  const phase3 = (((specSeed >> 8) % 1000) / 1000) * 2 * Math.PI;

  // 1. Gera os retornos percentuais para cada barra de startBucket até currentBucket
  const barDeltas: { delta: number; wickUp: number; wickDown: number; vol: number; bucket: number }[] = [];

  for (let i = 0; i < candleCount; i++) {
    const bucket = currentBucket - i;
    const bucketSeed = hashString(`${spec.symbol}_${normTf}_${bucket}`);

    // Regime de tendência macro no bucket (onda suave contínua)
    const waveMacro = Math.sin((bucket / 24.3) * 2 * Math.PI + phase1);
    const waveIntermediate = Math.sin((bucket / (11.8 * phi)) * 2 * Math.PI + phase2);
    const waveShort = Math.cos((bucket / (5.6 * phi)) * 2 * Math.PI + phase3);

    // Tendência resultante (-1.0 a +1.0)
    const trendMomentum = waveMacro * 0.52 + waveIntermediate * 0.33 + waveShort * 0.15;

    const r1 = pseudoRand(bucketSeed, 1);
    const r2 = pseudoRand(bucketSeed, 2);
    const r3 = pseudoRand(bucketSeed, 3);
    const r4 = pseudoRand(bucketSeed, 4);

    let barChange = 0;
    if (trendMomentum > 0.20) {
      // REGIME DE ALTA (Bull trend): 80% das velas são de alta consistente
      if (r1 > 0.20) {
        barChange = (0.25 + 0.85 * r2) * barVol; // Vela de alta
      } else {
        barChange = -(0.10 + 0.35 * r2) * barVol; // Pequeno pullback corretivo
      }
    } else if (trendMomentum < -0.20) {
      // REGIME DE BAIXA (Bear trend): 80% das velas são de baixa consistente
      if (r1 > 0.20) {
        barChange = -(0.25 + 0.85 * r2) * barVol; // Vela de baixa
      } else {
        barChange = (0.10 + 0.35 * r2) * barVol; // Pequeno ressalto de alívio
      }
    } else {
      // CONSOLIDAÇÃO / TRANSIÇÃO: variação bilateral
      barChange = ((r1 - 0.49) * 1.4) * barVol;
    }

    // Pavios proporcionais e variados
    const wickBonus = barVol * 0.25;
    const wickUp = (0.10 + 0.80 * r3) * wickBonus;
    const wickDown = (0.10 + 0.80 * r4) * wickBonus;

    // Volume realista com aumento em rompimentos e barras de expansão
    const volumeBase = 12000 + Math.floor(r1 * 28000);
    const volumeMultiplier = Math.abs(barChange) > barVol * 0.6 ? 1.6 : 1.0;
    const barVolume = Math.floor(volumeBase * volumeMultiplier);

    barDeltas.unshift({
      delta: barChange,
      wickUp,
      wickDown,
      vol: barVolume,
      bucket
    });
  }

  // 2. Constrói as velas encadeadas perfeitamente:
  // candle[k].open === candle[k-1].close
  // A última vela (índice candleCount - 1) fecha exatamente no currentPrice!
  const list: MarketCandle[] = [];
  const prices: { open: number; close: number }[] = new Array(candleCount);
  
  let runningClose = currentPrice;
  for (let k = candleCount - 1; k >= 0; k--) {
    const item = barDeltas[k];
    
    const candleClose = runningClose;
    let candleOpen = candleClose - item.delta;
    if (candleOpen <= 0) candleOpen = spec.basePrice * 0.5;

    prices[k] = {
      open: Number(candleOpen.toFixed(precision)),
      close: Number(candleClose.toFixed(precision))
    };

    runningClose = candleOpen;
  }

  // 3. Monta o array final com high, low, volume e horário de Moçambique (UTC+2)
  for (let k = 0; k < candleCount; k++) {
    const item = barDeltas[k];
    const { open, close } = prices[k];
    const isLatest = (k === candleCount - 1);

    let high = Math.max(open, close) + item.wickUp;
    let low = Math.min(open, close) - item.wickDown;

    if (isLatest) {
      high = Math.max(open, close, high * 0.995);
      low = Math.min(open, close, low * 1.005);
    }

    if (low <= 0.001) low = 0.001;
    if (high < Math.max(open, close)) high = Math.max(open, close);

    const candleTimestampMs = item.bucket * periodMs;
    // Converte para Hora Oficial de Moçambique (UTC+2)
    const maputoTimeMs = candleTimestampMs + (2 * 3600 * 1000);
    const maputoDate = new Date(maputoTimeMs);
    const hours = String(maputoDate.getUTCHours()).padStart(2, '0');
    const mins = String(maputoDate.getUTCMinutes()).padStart(2, '0');
    const day = String(maputoDate.getUTCDate()).padStart(2, '0');
    const month = String(maputoDate.getUTCMonth() + 1).padStart(2, '0');

    const timeStr = (normTf === '1D' || normTf === 'D1')
      ? `${day}/${month}`
      : `${hours}:${mins}`;

    list.push({
      time: timeStr,
      open: Number(open.toFixed(precision)),
      high: Number(high.toFixed(precision)),
      low: Number(low.toFixed(precision)),
      close: Number(close.toFixed(precision)),
      volume: item.vol,
      timestamp: candleTimestampMs
    });
  }

  return list;
}

// ==========================================
// STORE GLOBAL EM MEMÓRIA (SINGLETON) COM SUPORTE A OFFLINE FREEZE & CATCH-UP
// ==========================================

let currentGlobalQuotes: LiveMarketQuote[] = COMMODITY_SPECS.map(getLiveQuote);
const listeners = new Set<(quotes: LiveMarketQuote[]) => void>();
let isMarketOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
let offlineSinceMs: number | null = null;

function updateGlobalMarket() {
  // Se estiver sem conexão à internet, congela completamente (não simula localmente)
  if (typeof window !== 'undefined') {
    if (!navigator.onLine || isMarketOffline) {
      return;
    }
  }

  currentGlobalQuotes = COMMODITY_SPECS.map(getLiveQuote);
  listeners.forEach((cb) => {
    try { cb(currentGlobalQuotes); } catch {}
  });
}

// Inicia o motor global com intervalo fixo de 1000ms e listeners de conexão
if (typeof window !== 'undefined') {
  setInterval(updateGlobalMarket, 1000);

  window.addEventListener('offline', () => {
    isMarketOffline = true;
    offlineSinceMs = Date.now();
  });

  window.addEventListener('online', () => {
    isMarketOffline = false;
    offlineSinceMs = null;
    // Catch-up imediato: atualiza instantaneamente para o estado real após o tempo inativo
    updateGlobalMarket();
  });
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

export function isGlobalMarketOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine && !isMarketOffline;
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