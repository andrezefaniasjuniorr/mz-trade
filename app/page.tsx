'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Award,
  BookOpen,
  User,
  Shield,
  Search,
  X,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  BarChart2,
  Layers,
  Zap,
  Info,
  ArrowRight,
  Database,
  LogIn,
  LogOut,
  UserPlus,
  Lock,
  Bell,
  Clock,
  Check,
  Wallet,
  Smartphone,
  ArrowDownLeft,
  History,
  CheckCircle2,
  Copy,
  Target,
  Briefcase,
  Coins,
  MessageCircle,
  UserCheck,
  Camera,
  Upload,
  Trash2,
  Maximize2
} from 'lucide-react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db, initAnalytics } from '@/src/firebase';
import { compressProfileImage } from '@/lib/imageUtils';
import {
  prefetchLatestChatMessages,
  playMessageSound,
  triggerPushNotification,
  requestNotificationPermission
} from '@/lib/chatService';
import {
  getMaputoTodayDate,
  getMaputoTimeDetails,
  calculate21hIncrement,
  getMaputoWithdrawalWindowDetails,
  MaputoTimeDetails,
  WithdrawalWindowDetails
} from '@/lib/maputoTime';
import { WalletBalanceChart } from '@/components/WalletBalanceChart';
import Janela21hTerminal from '@/components/Janela21hTerminal';
import {
  COMMODITY_SPECS,
  getGlobalMarketQuotes,
  subscribeToGlobalMarket,
  getDeterministicCandles,
  LiveMarketQuote
} from '@/lib/globalMarketEngine';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  limit,
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface Commodity {
  id: string;
  name: string;
  symbol: string;
  category: 'Energia' | 'Metais' | 'Agricultura';
  price: number;
  unit: string;
  change24h: number;
  high: number;
  low: number;
  open: number;
  baseVolatility: number;
  description?: string;
}

export interface Position {
  id: number;
  assetId: string;
  assetName: string;
  symbol: string;
  unit: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  timestamp: string;
}

export interface ClosedTrade {
  id: number;
  symbol: string;
  assetName: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  timestamp: string;
}

export interface ChartCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  timestamp: number;
}

export interface WithdrawalRecord {
  id: string;
  uid: string;
  userEmail?: string;
  userName?: string;
  operator: 'M-Pesa' | 'e-Mola';
  phoneNumber: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  processingTime: string;
  statusMessage: string;
  requestedAt: any;
  dateStr: string;
  fee: number;
}

export interface UserTransaction {
  id: string;
  uid?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  type: string;
  amount: number;
  oldBalance?: number;
  newBalance?: number;
  date?: string;
  timestamp?: any;
  description?: string;
  operator?: string;
  targetPhone?: string;
  status?: string;
}

// ==========================================
// INITIAL DATA & COMMODITIES DEFINITIONS
// ==========================================

const INITIAL_COMMODITIES: Commodity[] = [
  {
    id: 'milho',
    name: 'Milho Branco (Chókwè)',
    symbol: 'MILHO-MZ',
    category: 'Agricultura',
    price: 42.50,
    unit: 'Kg',
    change24h: 2.45,
    high: 44.80,
    low: 40.80,
    open: 41.48,
    baseVolatility: 0.012,
    description: 'Cereal essencial de segurança alimentar no Vale do Limpopo'
  },
  {
    id: 'brent',
    name: 'Petróleo Bruto (Brent)',
    symbol: 'BRENT',
    category: 'Energia',
    price: 5120.50,
    unit: 'Barril (bbl)',
    change24h: -3.15,
    high: 5290.00,
    low: 5040.00,
    open: 5287.00,
    baseVolatility: 0.018,
    description: 'Referência internacional para combustíveis em Moçambique'
  },
  {
    id: 'gas',
    name: 'Gás Natural (Rovuma LNG)',
    symbol: 'NATGAS',
    category: 'Energia',
    price: 185.30,
    unit: 'MMBtu',
    change24h: 4.82,
    high: 194.20,
    low: 176.40,
    open: 176.78,
    baseVolatility: 0.022,
    description: 'Bacia do Rovuma, Cabo Delgado'
  },
  {
    id: 'coal',
    name: 'Carvão Mineral (Moatize)',
    symbol: 'COAL-MZ',
    category: 'Energia',
    price: 8200.00,
    unit: 'Tonelada (t)',
    change24h: 1.15,
    high: 8420.00,
    low: 8080.00,
    open: 8106.80,
    baseVolatility: 0.014,
    description: 'Bacia carbonífera de Moatize, Tete'
  },
  {
    id: 'gold',
    name: 'Ouro Fino 999 (Manica)',
    symbol: 'XAU',
    category: 'Metais',
    price: 148500.00,
    unit: 'Onça (oz)',
    change24h: 1.85,
    high: 151200.00,
    low: 146100.00,
    open: 145800.00,
    baseVolatility: 0.010,
    description: 'Reserva de valor e exploração aluvial em Manica'
  },
  {
    id: 'silver',
    name: 'Prata Fina',
    symbol: 'XAG',
    category: 'Metais',
    price: 1820.00,
    unit: 'Onça (oz)',
    change24h: -2.40,
    high: 1890.00,
    low: 1785.00,
    open: 1864.80,
    baseVolatility: 0.016,
    description: 'Metal precioso com alta aplicação industrial'
  },
  {
    id: 'copper',
    name: 'Cobre de Alta Pureza',
    symbol: 'COPPER',
    category: 'Metais',
    price: 580.00,
    unit: 'Kg',
    change24h: 3.60,
    high: 598.00,
    low: 556.00,
    open: 559.80,
    baseVolatility: 0.015,
    description: 'Condutores elétricos e transição energética'
  },
  {
    id: 'aluminum',
    name: 'Alumínio (Mozal Spec)',
    symbol: 'ALUM',
    category: 'Metais',
    price: 1540.00,
    unit: 'Tonelada (t)',
    change24h: -1.80,
    high: 1595.00,
    low: 1515.00,
    open: 1568.20,
    baseVolatility: 0.013,
    description: 'Fundição Mozal em Beluluane, Matola'
  },
  {
    id: 'cashew',
    name: 'Castanha de Caju (Nampula)',
    symbol: 'CAJU-MZ',
    category: 'Agricultura',
    price: 95.50,
    unit: 'Kg',
    change24h: 5.40,
    high: 99.20,
    low: 89.80,
    open: 90.60,
    baseVolatility: 0.025,
    description: 'Principal cultura de rendimento de exportação'
  },
  {
    id: 'sugar',
    name: 'Açúcar Mascavado (Maragra)',
    symbol: 'SUGAR',
    category: 'Agricultura',
    price: 32.40,
    unit: 'Kg',
    change24h: -0.90,
    high: 33.60,
    low: 31.40,
    open: 32.70,
    baseVolatility: 0.011,
    description: 'Produção canavieira nacional'
  },
  {
    id: 'cotton',
    name: 'Algodão em Rama (Cabo Delgado)',
    symbol: 'COTTON',
    category: 'Agricultura',
    price: 112.00,
    unit: 'Kg',
    change24h: 2.10,
    high: 116.50,
    low: 108.20,
    open: 109.70,
    baseVolatility: 0.015,
    description: 'Fibras têxteis de elevada pureza'
  },
  {
    id: 'wheat',
    name: 'Trigo Grão',
    symbol: 'WHEAT',
    category: 'Agricultura',
    price: 24.50,
    unit: 'Kg',
    change24h: -3.80,
    high: 25.90,
    low: 23.80,
    open: 25.47,
    baseVolatility: 0.014,
    description: 'Cereal de consumo básico nas padarias do país'
  },
  {
    id: 'rice',
    name: 'Arroz de Primeira (Chókwè)',
    symbol: 'RICE',
    category: 'Agricultura',
    price: 42.00,
    unit: 'Kg',
    change24h: 1.25,
    high: 43.60,
    low: 41.10,
    open: 41.48,
    baseVolatility: 0.010,
    description: 'Regadio do Baixo Limpopo, Gaza'
  }
];

const formatMT = (value: number) => {
  return new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value) + ' MT';
};

const formatQuote = (val: number) => {
  if (val < 10) return val.toFixed(4);
  if (val < 100) return val.toFixed(3);
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ========================================================
// ENGINE TÉCNICO: CADA MERCADO COM IDENTIDADE E ONDAS PRÓPRIAS
// ========================================================

interface AssetSeed {
  primaryFreq: number;
  secondaryFreq: number;
  primaryAmp: number;
  secondaryAmp: number;
  drift: number;
  volatilityMult: number;
}

function getOrCreateCandles(commodity: Commodity | LiveMarketQuote, timeframe: string): ChartCandle[] {
  const spec = COMMODITY_SPECS.find((s) => s.id === commodity.id) || {
    id: commodity.id,
    name: commodity.name,
    symbol: commodity.symbol,
    category: commodity.category,
    basePrice: commodity.price || 100,
    unit: commodity.unit || 'MT',
    baseVolatility: commodity.baseVolatility || 0.015,
    description: ''
  };

  return getDeterministicCandles(spec, timeframe, 36);
}

// ==========================================
// PROFESSIONAL FINANCIAL CHART COMPONENT
// ==========================================

const InteractiveChart = ({
  commodity,
  chartType: externalChartType,
  timeframe: externalTimeframe,
  height = 320,
  onTimeframeChange,
  onChartTypeChange
}: {
  commodity: Commodity;
  chartType?: 'candle' | 'line';
  timeframe?: string;
  height?: number;
  onTimeframeChange?: (tf: '1M' | '5M' | '15M' | '1H' | '1D') => void;
  onChartTypeChange?: (ct: 'candle' | 'line') => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [internalTimeframe, setInternalTimeframe] = useState<'1M' | '5M' | '15M' | '1H' | '1D'>('5M');
  const [internalChartType, setInternalChartType] = useState<'candle' | 'line'>('candle');

  const activeTimeframe = (externalTimeframe ? externalTimeframe.toUpperCase() : internalTimeframe) as '1M' | '5M' | '15M' | '1H' | '1D';
  const activeChartType = externalChartType || internalChartType;

  const [hoverInfo, setHoverInfo] = useState<{
    candle: ChartCandle;
    x: number;
    y: number;
    price: number;
  } | null>(null);

  const [lastTickDir, setLastTickDir] = useState<'up' | 'down'>('up');
  const prevPriceRef = useRef<number>(commodity.price);

  useEffect(() => {
    if (commodity.price !== prevPriceRef.current) {
      setLastTickDir(commodity.price >= prevPriceRef.current ? 'up' : 'down');
      prevPriceRef.current = commodity.price;
    }
  }, [commodity.price]);

  const candles = useMemo(() => {
    return getOrCreateCandles(commodity, activeTimeframe);
  }, [commodity, activeTimeframe]);

  const handleSetTimeframe = (tf: '1M' | '5M' | '15M' | '1H' | '1D') => {
    setInternalTimeframe(tf);
    onTimeframeChange?.(tf);
  };

  const handleSetChartType = (ct: 'candle' | 'line') => {
    setInternalChartType(ct);
    onChartTypeChange?.(ct);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const width = canvas.clientWidth || 760;
    const chartHeight = height;

    if (canvas.width !== width * dpr || canvas.height !== chartHeight * dpr) {
      canvas.width = width * dpr;
      canvas.height = chartHeight * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Fundo Escuro Trading Station
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, width, chartHeight);

    const rightAxisWidth = 68;
    const bottomAxisHeight = 24;
    const plotWidth = width - rightAxisWidth;
    const plotHeight = chartHeight - bottomAxisHeight;
    const volumeHeight = plotHeight * 0.16;
    const pricePlotHeight = plotHeight - volumeHeight;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 1;

    candles.forEach((p) => {
      if (p.low < minPrice) minPrice = p.low;
      if (p.high > maxPrice) maxPrice = p.high;
      if ((p.volume || 0) > maxVolume) maxVolume = p.volume || 1;
    });

    const priceRange = maxPrice - minPrice || 1;
    const padding = priceRange * 0.10;
    minPrice -= padding;
    maxPrice += padding;
    const effectiveRange = maxPrice - minPrice;

    const getY = (val: number) => pricePlotHeight - ((val - minPrice) / effectiveRange) * pricePlotHeight;
    const stepX = plotWidth / candles.length;

    const drawRoundedRect = (context: CanvasRenderingContext2D, rx: number, ry: number, rw: number, rh: number, r: number) => {
      if (typeof (context as any).roundRect === 'function') {
        (context as any).roundRect(rx, ry, rw, rh, r);
      } else {
        context.rect(rx, ry, rw, rh);
      }
    };

    // GRADE TÉCNICA FINANCEIRA
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);

    const gridLevels = 5;
    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';

    for (let i = 0; i <= gridLevels; i++) {
      const y = (pricePlotHeight / gridLevels) * i;
      const priceVal = maxPrice - (effectiveRange / gridLevels) * i;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(plotWidth, y);
      ctx.stroke();

      ctx.fillText(formatQuote(priceVal), plotWidth + 8, y + 3.5);
    }

    const timeStepCount = Math.min(7, Math.floor(candles.length / 5));
    for (let i = 1; i <= timeStepCount; i++) {
      const idx = Math.floor((candles.length / (timeStepCount + 1)) * i);
      const x = idx * stepX + stepX / 2;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, plotHeight);
      ctx.stroke();

      if (candles[idx]) {
        ctx.textAlign = 'center';
        ctx.fillText(candles[idx].time, x, plotHeight + 16);
      }
    }
    ctx.setLineDash([]);

    // Volume Inferior
    candles.forEach((p, idx) => {
      const x = idx * stepX + stepX / 2;
      const barW = Math.max(2, stepX * 0.6);
      const vol = p.volume || 25000;
      const barH = (vol / maxVolume) * (volumeHeight - 6);
      const y = plotHeight - barH;

      ctx.fillStyle = p.close >= p.open ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)';
      ctx.fillRect(x - barW / 2, y, barW, barH);
    });

    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, plotHeight);
    ctx.lineTo(width, plotHeight);
    ctx.moveTo(plotWidth, 0);
    ctx.lineTo(plotWidth, chartHeight);
    ctx.stroke();

    // VELAS OU LINHA COM ALTA VISIBILIDADE DE QUEDAS E ALTAS
    if (activeChartType === 'line') {
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.4;

      candles.forEach((p, idx) => {
        const x = idx * stepX + stepX / 2;
        const y = getY(p.close);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.lineTo((candles.length - 1) * stepX + stepX / 2, pricePlotHeight);
      ctx.lineTo(stepX / 2, pricePlotHeight);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, 0, 0, pricePlotHeight);
      gradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
      ctx.fillStyle = gradient;
      ctx.fill();
    } else {
      const candleWidth = Math.max(3.5, Math.min(18, stepX * 0.74));

      candles.forEach((p, idx) => {
        const x = idx * stepX + stepX / 2;
        const openY = getY(p.open);
        const closeY = getY(p.close);
        const highY = getY(p.high);
        const lowY = getY(p.low);

        const isBullish = p.close >= p.open;
        const color = isBullish ? '#10b981' : '#ef4444';

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        ctx.fillStyle = color;
        const top = Math.min(openY, closeY);
        const bodyH = Math.max(2.5, Math.abs(openY - closeY));
        ctx.fillRect(x - candleWidth / 2, top, candleWidth, bodyH);
      });
    }

    // Linha de Preço Atual
    const currentPrice = commodity.price;
    const currentY = getY(currentPrice);

    ctx.strokeStyle = lastTickDir === 'up' ? '#10b981' : '#ef4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, currentY);
    ctx.lineTo(plotWidth, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    const lastX = (candles.length - 1) * stepX + stepX / 2;
    ctx.fillStyle = lastTickDir === 'up' ? '#10b981' : '#ef4444';
    ctx.beginPath();
    ctx.arc(lastX, currentY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    const badgeH = 20;
    const badgeW = rightAxisWidth - 6;
    const badgeY = Math.max(2, Math.min(pricePlotHeight - badgeH, currentY - badgeH / 2));

    ctx.fillStyle = lastTickDir === 'up' ? '#059669' : '#dc2626';
    ctx.beginPath();
    drawRoundedRect(ctx, plotWidth + 3, badgeY, badgeW, badgeH, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(formatQuote(currentPrice), plotWidth + 3 + badgeW / 2, badgeY + 13.5);

    // Crosshair Interativo
    if (hoverInfo) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      ctx.beginPath();
      ctx.moveTo(hoverInfo.x, 0);
      ctx.lineTo(hoverInfo.x, plotHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, hoverInfo.y);
      ctx.lineTo(plotWidth, hoverInfo.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      drawRoundedRect(ctx, plotWidth + 3, hoverInfo.y - 9, badgeW, 18, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(formatQuote(hoverInfo.price), plotWidth + 3 + badgeW / 2, hoverInfo.y + 3.5);

      const timePillW = 46;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      drawRoundedRect(ctx, hoverInfo.x - timePillW / 2, plotHeight + 3, timePillW, 18, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 9.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(hoverInfo.candle.time, hoverInfo.x, plotHeight + 15);
    }

    ctx.restore();
  }, [candles, activeChartType, commodity.price, lastTickDir, hoverInfo, height]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = canvas.clientWidth || 760;
    const plotWidth = width - 68;
    const pricePlotHeight = height - 24 - (height - 24) * 0.16;

    if (x < 0 || x > plotWidth || y < 0 || y > pricePlotHeight) {
      setHoverInfo(null);
      return;
    }

    const stepX = plotWidth / candles.length;
    const idx = Math.min(candles.length - 1, Math.max(0, Math.floor(x / stepX)));
    const candle = candles[idx];

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    candles.forEach((p) => {
      if (p.low < minPrice) minPrice = p.low;
      if (p.high > maxPrice) maxPrice = p.high;
    });
    const priceRange = maxPrice - minPrice || 1;
    const padding = priceRange * 0.10;
    minPrice -= padding;
    maxPrice += padding;
    const cursorPrice = maxPrice - (y / pricePlotHeight) * (maxPrice - minPrice);

    setHoverInfo({
      candle,
      x: idx * stepX + stepX / 2,
      y,
      price: cursorPrice
    });
  };

  const activeCandle = hoverInfo ? hoverInfo.candle : (candles.length > 0 ? candles[candles.length - 1] : null);
  const spreadPoints = (commodity.price * 0.00018).toFixed(commodity.price < 100 ? 3 : 2);
  const volumeDisplay = activeCandle && activeCandle.volume ? `${(activeCandle.volume / 1000).toFixed(1)}K` : '42.5K';
  const rsiValue = (50 + Math.sin(commodity.price * 0.4) * 18).toFixed(1);

  return (
    <div className="relative w-full bg-[#0b0f19] rounded-2xl border border-slate-800 p-3 sm:p-4 shadow-xl select-none text-white">
      <div className="flex flex-wrap justify-between items-center pb-3 mb-2 border-b border-slate-800/80 gap-2">
        <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
          <span className="text-xs font-black font-mono px-2 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-md">
            {commodity.symbol}
          </span>
          <span className="text-sm font-bold text-slate-100">{commodity.name}</span>
          
          <div className="flex items-center gap-1.5 font-mono text-xs ml-1">
            <span className={`font-black text-sm ${lastTickDir === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatQuote(commodity.price)}
            </span>
            <span className={`text-[11px] font-bold ${commodity.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {commodity.change24h >= 0 ? '+' : ''}{commodity.change24h.toFixed(2)}%
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
            <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">Spread: {spreadPoints} pts</span>
            <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">Vol: {volumeDisplay}</span>
            <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-blue-400">RSI: {rsiValue}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex space-x-0.5 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono font-bold">
            {(['1M', '5M', '15M', '1H', '1D'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => handleSetTimeframe(tf)}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  activeTimeframe === tf
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`Análise Gráfica ${tf}`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="flex space-x-0.5 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => handleSetChartType('candle')}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                activeChartType === 'candle' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Velas
            </button>
            <button
              type="button"
              onClick={() => handleSetChartType('line')}
              className={`px-2 py-0.5 rounded transition cursor-pointer ${
                activeChartType === 'line' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Linha
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 pb-2 px-1 gap-2">
        {activeCandle ? (
          <div className="flex items-center gap-3 flex-wrap">
            <span>Hora: <strong className="text-slate-200">{activeCandle.time}</strong></span>
            <span>Abertura: <strong className="text-slate-200">{formatQuote(activeCandle.open)}</strong></span>
            <span>Máxima: <strong className="text-emerald-400">{formatQuote(activeCandle.high)}</strong></span>
            <span>Mínima: <strong className="text-rose-400">{formatQuote(activeCandle.low)}</strong></span>
            <span>Fecho: <strong className="text-slate-200">{formatQuote(activeCandle.close)}</strong></span>
          </div>
        ) : (
          <div>Carregando parâmetros técnicos...</div>
        )}

        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-sans">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Terminal Cotações Ao Vivo</span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-[#0b0f19] border border-slate-800/80">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverInfo(null)}
          style={{ width: '100%', height: `${height}px` }}
          className="cursor-crosshair block"
        />
      </div>
    </div>
  );
};

// Stable Clock Store for pure render ticks
let cachedClockNow = typeof window !== 'undefined' ? Date.now() : 0;
const clockListeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  setInterval(() => {
    cachedClockNow = Date.now();
    clockListeners.forEach((cb) => cb());
  }, 10000);
}

const subscribeToClock = (callback: () => void) => {
  clockListeners.add(callback);
  return () => {
    clockListeners.delete(callback);
  };
};

const getClockSnapshot = () => cachedClockNow;
const getClockServerSnapshot = () => 0;

// ==========================================
// MAIN COMPONENT (PAGE)
// ==========================================

export default function Home() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading, logout, updateBalance, updateProfilePhoto, removeProfilePhoto, isAdmin } = useAuth();
  const profile = (userProfile || {}) as any;

  // Foto de Perfil State & Upload Handler
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [fullscreenPhotoModal, setFullscreenPhotoModal] = useState<{ url: string; name: string } | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  const handleProfilePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecione uma imagem válida (JPG, PNG, WebP).', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('A imagem é muito grande. Escolha uma foto de até 10MB.', 'error');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      showToast('A otimizar e guardar foto de perfil...', 'info');
      const compressedBase64 = await compressProfileImage(file, 360, 0.82);
      const res = await updateProfilePhoto(compressedBase64);
      if (res.success) {
        showToast('Foto de perfil atualizada com sucesso!', 'success');
      } else {
        showToast(res.error || 'Erro ao guardar foto de perfil.', 'error');
      }
    } catch (err) {
      console.error('Erro ao processar foto:', err);
      showToast('Falha ao processar a imagem. Tente outra foto.', 'error');
    } finally {
      setIsUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setIsUploadingPhoto(true);
      const res = await removeProfilePhoto();
      if (res.success) {
        showToast('Foto de perfil removida com sucesso.', 'info');
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Pure clock timestamp for cooldown calculations
  const nowMs = useSyncExternalStore(subscribeToClock, getClockSnapshot, getClockServerSnapshot);

  // Fullscreen MT5 modal asset state for Mercados
  const [fullscreenAssetId, setFullscreenAssetId] = useState<string | null>(null);
  const [commodities, setCommodities] = useState<LiveMarketQuote[]>(() =>
    getGlobalMarketQuotes().filter((c) => c.id !== 'bmm')
  );
  const fullscreenAsset = useMemo(
    () => commodities.find((c) => c.id === fullscreenAssetId) || null,
    [commodities, fullscreenAssetId]
  );

  const openFullscreenAsset = useCallback((asset: Commodity | null) => {
    if (asset) {
      setFullscreenAssetId(asset.id);
      if (typeof window !== 'undefined') {
        try {
          window.history.pushState({ modal: 'fullscreen_chart', assetId: asset.id }, '');
        } catch {
          // ignore
        }
      }
    } else {
      setFullscreenAssetId(null);
    }
  }, []);
  const setFullscreenAsset = openFullscreenAsset;

  const [activeTab, setActiveTabState] = useState<'inicio' | 'mercados' | 'carteira' | 'perfil'>('inicio');
  const setActiveTab = useCallback((tab: 'inicio' | 'mercados' | 'carteira' | 'perfil') => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      try {
        if (window.location.hash !== `#${tab}`) {
          window.history.pushState({ tab }, '', `#${tab}`);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });
  const latestChatMsgIdRef = useRef<string | null>(null);

  const [localBalance, setLocalBalance] = useState<number | null>(null);
  const balance = localBalance !== null ? localBalance : (profile?.balance ?? profile?.saldoVirtual ?? 0.00);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tradeHistory, setTradeHistory] = useState<ClosedTrade[]>([]);
  const [favorites, setFavorites] = useState<string[]>(['milho', 'brent', 'cashew', 'gold']);
  
  const [customInstructorTip, setCustomInstructorTip] = useState<{
    title: string;
    badge: string;
    author: string;
    content: string;
    active: boolean;
  }>({
    title: 'Dica do Instrutor',
    badge: 'Dica de Ouro',
    author: 'Instrutor Mateus Maputo',
    content: 'Nunca invista mais de 10% do seu saldo disponível numa única operação. Diversifique entre setores (Energia, Metais e Agricultura) para proteger o seu capital!',
    active: true
  });

  const [marketHoursConfig, setMarketHoursConfig] = useState<{
    scheduleText: string;
    openHour: number;
    closeHour: number;
    globalMarketOpen: boolean;
    pausedAssets: Record<string, boolean>;
  }>({
    scheduleText: 'Segunda a Sexta às 21:00',
    openHour: 8,
    closeHour: 21,
    globalMarketOpen: true,
    pausedAssets: {}
  });

  const [globalAnnouncement, setGlobalAnnouncement] = useState<{
    active: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'urgent' | 'success';
  } | null>(null);
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState<boolean>(false);

  const [selectedAssetId, setSelectedAssetId] = useState<string>(INITIAL_COMMODITIES[0].id);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState<boolean>(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState<string>('');
  const [tradeSide, setTradeSide] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeQty, setTradeQty] = useState<number>(1);

  const counterRef = useRef(100);



  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Contador de mensagens não lidas no Chat (Badge 1, 2, 3...)
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  // Monitorização de mensagens não lidas e notificações em tempo real
  useEffect(() => {
    let isInitialMount = true;
    const messagesRef = collection(db, 'taprise_group_messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50));

    const calculateUnread = (docs: any[]) => {
      const lastReadTime = typeof window !== 'undefined'
        ? Number(localStorage.getItem('taprise_last_read_group_time') || 0)
        : 0;

      let count = 0;
      for (const docSnap of docs) {
        const d = docSnap.data();
        if (d.uid === user?.uid) continue;
        const msgTime = d.createdAt?.toMillis
          ? d.createdAt.toMillis()
          : (d.createdAt?.seconds ? d.createdAt.seconds * 1000 : 0);

        if (lastReadTime === 0 || msgTime > lastReadTime) {
          count++;
        }
      }
      return count;
    };

    let latestDocs: any[] = [];

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setUnreadChatCount(0);
          return;
        }

        latestDocs = snapshot.docs;
        const unreadCount = calculateUnread(snapshot.docs);
        setUnreadChatCount(unreadCount);

        const latestDoc = snapshot.docs[0];
        const d = latestDoc.data();
        const msgId = latestDoc.id;

        if (isInitialMount) {
          isInitialMount = false;
          latestChatMsgIdRef.current = msgId;
          return;
        }

        if (msgId !== latestChatMsgIdRef.current) {
          latestChatMsgIdRef.current = msgId;
          if (d.uid !== user?.uid) {
            playMessageSound();
            const senderName = d.displayName || 'Investidor TapRise';
            const bodyText = d.type === 'image' ? '📷 Enviou uma foto' : (d.type === 'audio' || d.tipo === 'audio' ? '🎤 Enviou uma nota de voz' : (d.text || 'Nova mensagem no chat'));
            triggerPushNotification(`TapRise Chat • ${senderName}`, bodyText, '/chat');
            showToast(`💬 ${senderName}: ${bodyText}`, 'info');
          }
        }
      },
      (err) => console.warn('Erro ao escutar mensagens do chat em segundo plano:', err)
    );

    const handleSync = () => {
      if (latestDocs.length > 0) {
        setUnreadChatCount(calculateUnread(latestDocs));
      } else {
        const lastReadTime = Number(localStorage.getItem('taprise_last_read_group_time') || 0);
        if (lastReadTime > 0) setUnreadChatCount(0);
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      unsub();
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [user?.uid, showToast]);

  const selectedAsset = useMemo(() => {
    return commodities.find((c) => c.id === selectedAssetId) || commodities[0];
  }, [commodities, selectedAssetId]);

  const isCurrentAssetPaused = !!marketHoursConfig.pausedAssets[selectedAsset.id];
  const isGlobalMarketClosed = marketHoursConfig.globalMarketOpen === false;
  const isTradingDisabled = isGlobalMarketClosed || isCurrentAssetPaused;
  const tradingDisabledReason = isCurrentAssetPaused
    ? 'Ativo Temporariamente Suspenso pela Administração'
    : `Mercado Fechado - ${marketHoursConfig.scheduleText || 'Abre às 21h'}`;

  const [marketSearch, setMarketSearch] = useState<string>('');
  const [marketCategory, setMarketCategory] = useState<string>('Todos');
  const [selectedChartType, setSelectedChartType] = useState<'candle' | 'line'>('candle');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1M' | '5M' | '15M' | '1H' | '1D'>('5M');

  const [dailyConfig, setDailyConfig] = useState<{
    actionType: 'buy' | 'sell';
    date: string;
    startHour: number;
    endHour: number;
    forceOpen: boolean;
  }>({
    actionType: 'buy',
    date: getMaputoTodayDate(),
    startHour: 21,
    endHour: 21.5,
    forceOpen: false
  });
  const [maputoTime, setMaputoTime] = useState<MaputoTimeDetails>(() => getMaputoTimeDetails());

  // Carteira State
  const [carteiraSubTab, setCarteiraSubTab] = useState<'deposito' | 'visao-geral' | 'transacoes' | 'levantamentos' | 'fechadas'>('visao-geral');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [userTransactions, setUserTransactions] = useState<UserTransaction[]>([]);
  const [userWithdrawals, setUserWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [userCommissions, setUserCommissions] = useState<Array<{
    id: string;
    amount: number;
    referredName?: string;
    referredEmail?: string;
    referredUid?: string;
  }>>([]);
  const [withdrawalWindow, setWithdrawalWindow] = useState<WithdrawalWindowDetails>(() => getMaputoWithdrawalWindowDetails());
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState<boolean>(false);
  const [withdrawalMethod, setWithdrawalMethod] = useState<'mpesa' | 'emola'>('mpesa');
  const [withdrawalPhone, setWithdrawalPhone] = useState<string>('');
  const [withdrawalName, setWithdrawalName] = useState<string>('');
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('300');
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState<boolean>(false);
  const [withdrawalSuccessData, setWithdrawalSuccessData] = useState<{
    id: string;
    amount: number;
    operator: string;
    phone: string;
    name: string;
  } | null>(null);

  // Hardware and Mobile Back Button listener
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (fullscreenAssetId) {
        setFullscreenAssetId(null);
        return;
      }
      if (isTradeModalOpen) {
        setIsTradeModalOpen(false);
        return;
      }
      if (isNotificationsOpen) {
        setIsNotificationsOpen(false);
        return;
      }
      if (isQuickSearchOpen) {
        setIsQuickSearchOpen(false);
        return;
      }
      if (isDepositModalOpen) {
        setIsDepositModalOpen(false);
        return;
      }
      if (isWithdrawalModalOpen) {
        setIsWithdrawalModalOpen(false);
        return;
      }

      if (e.state && e.state.tab) {
        setActiveTabState(e.state.tab);
      } else {
        const hash = window.location.hash.replace('#', '');
        if (['inicio', 'mercados', 'carteira', 'perfil'].includes(hash)) {
          setActiveTabState(hash as any);
        } else {
          setActiveTabState('inicio');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    fullscreenAssetId,
    isTradeModalOpen,
    isNotificationsOpen,
    isQuickSearchOpen,
    isDepositModalOpen,
    isWithdrawalModalOpen
  ]);

  const handleCopyText = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedField(label);
    showToast(`${label} copiado com sucesso!`, 'success');
    setTimeout(() => setCopiedField(null), 2500);
  };

  const fallbackCode = user ? (user.uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || 'TRBONUS5') : 'TRBONUS5';
  const displayInviteCode = profile?.inviteCode || fallbackCode;

  const liveCommissionsSum = userCommissions.reduce((acc, c) => acc + (c.amount || 0), 0);
  const liveDepositedCount = userCommissions.length;
  const activeDepositedInvitedCount = Math.max(profile?.indicadosCount || 0, liveDepositedCount);
  const totalCommissionsEarned = Math.max(profile?.totalComissoes || 0, liveCommissionsSum);

  useEffect(() => {
    if (user && !profile?.inviteCode) {
      const codeToSave = fallbackCode;
      const userRef = doc(db, 'users', user.uid);
      setDoc(userRef, { inviteCode: codeToSave }, { merge: true }).catch(() => {});
    }
  }, [user, profile?.inviteCode, fallbackCode]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        prefetchLatestChatMessages(db).catch(() => {});
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    const marketDocRef = doc(db, 'admin_config', 'market_hours');
    const unsubMarket = onSnapshot(marketDocRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setMarketHoursConfig({
          scheduleText: d.scheduleText || 'Segunda a Sexta às 21:00',
          openHour: typeof d.openHour === 'number' ? d.openHour : 8,
          closeHour: typeof d.closeHour === 'number' ? d.closeHour : 21,
          globalMarketOpen: d.globalMarketOpen !== undefined ? d.globalMarketOpen : true,
          pausedAssets: d.pausedAssets || {}
        });
      }
    }, (e) => console.warn('Erro ao carregar market_hours:', e));

    const annDocRef = doc(db, 'admin_config', 'announcement');
    const unsubAnn = onSnapshot(annDocRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setGlobalAnnouncement({
          active: !!d.active,
          title: d.title || 'Comunicado Oficial',
          message: d.message || '',
          type: d.type || 'info'
        });
      }
    }, (e) => console.warn('Erro ao carregar comunicado:', e));

    const dailyDocRef = doc(db, 'admin_config', 'daily');
    const unsubDaily = onSnapshot(dailyDocRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setDailyConfig({
          actionType: d.actionType === 'sell' ? 'sell' : 'buy',
          date: d.date || getMaputoTodayDate(),
          startHour: typeof d.startHour === 'number' ? d.startHour : 21,
          endHour: typeof d.endHour === 'number' ? d.endHour : 21.5,
          forceOpen: !!d.forceOpen
        });
      }
    }, (e) => console.warn('Erro ao carregar daily config:', e));

    const dicaDocRef = doc(db, 'config', 'dicaInstrutor');
    const unsubDica = onSnapshot(dicaDocRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setCustomInstructorTip({
          title: 'Dica do Instrutor',
          badge: d.tipo || 'Dica de Ouro',
          author: d.instrutor || 'Instrutor Mateus Maputo',
          content: d.texto || d.content || 'Nunca invista mais de 10% do seu saldo disponível numa única operação. Diversifique entre setores para proteger o seu capital!',
          active: true
        });
      } else {
        const tipDocRef = doc(db, 'admin_config', 'instructor_tip');
        getDoc(tipDocRef).then((oldSnap) => {
          if (oldSnap.exists()) {
            const d = oldSnap.data();
            setCustomInstructorTip({
              title: d.title || 'Dica do Instrutor',
              badge: d.badge || 'Dica de Ouro',
              author: d.author || 'Instrutor Mateus Maputo',
              content: d.content || 'Nunca invista mais de 10% do seu saldo disponível numa única operação. Diversifique entre setores para proteger o seu capital!',
              active: d.active !== false
            });
          }
        }).catch(() => {});
      }
    }, (e) => console.warn('Erro ao carregar dica do instrutor:', e));

    const maputoInterval = setInterval(() => {
      setMaputoTime(getMaputoTimeDetails());
      setWithdrawalWindow(getMaputoWithdrawalWindowDetails());
    }, 1000);

    return () => {
      unsubMarket();
      unsubAnn();
      unsubDaily();
      unsubDica();
      clearInterval(maputoInterval);
    };
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const txRef = collection(db, 'transactions');
    const qTx = query(txRef, limit(100));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      const list: UserTransaction[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.uid === user.uid || data.userId === user.uid) {
          list.push({ id: d.id, ...data } as UserTransaction);
        }
      });
      list.sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
        return tB - tA;
      });
      setUserTransactions(list);
    }, (e) => console.warn('Erro ao escutar transações:', e));

    const wRef = collection(db, 'withdrawals');
    const unsubW = onSnapshot(wRef, (snapshot) => {
      const list: WithdrawalRecord[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.uid === user.uid || data.userId === user.uid || (user.email && data.userEmail === user.email)) {
          list.push({ id: d.id, ...data } as WithdrawalRecord);
        }
      });
      list.sort((a, b) => {
        const tA = a.requestedAt?.toMillis ? a.requestedAt.toMillis() : (a.requestedAt?.seconds ? a.requestedAt.seconds * 1000 : (a.requestedAt ? new Date(a.requestedAt).getTime() : 0));
        const tB = b.requestedAt?.toMillis ? b.requestedAt.toMillis() : (b.requestedAt?.seconds ? b.requestedAt.seconds * 1000 : (b.requestedAt ? new Date(b.requestedAt).getTime() : 0));
        return tB - tA;
      });
      setUserWithdrawals(list);
    }, (e) => console.warn('Erro ao escutar levantamentos:', e));

    const commRef = collection(db, 'commissions');
    const unsubComm = onSnapshot(commRef, (snapshot) => {
      const list: Array<{ id: string; amount: number; referredName?: string; referredEmail?: string; referredUid?: string }> = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.referrerUid === user.uid) {
          list.push({
            id: d.id,
            amount: Number(data.commissionAmount || 0),
            referredName: data.referredName || '',
            referredEmail: data.referredEmail || '',
            referredUid: data.referredUid || ''
          });
        }
      });
      setUserCommissions(list);
    }, (e) => console.warn('Erro ao escutar comissões:', e));

    return () => {
      unsubTx();
      unsubW();
      unsubComm();
    };
  }, [user?.uid, user?.email]);

  useEffect(() => {
    initAnalytics();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Sincronização contínua com o Motor Global de Mercado (nunca reinicia, sincronizado para todas as contas)
  useEffect(() => {
    const unsub = subscribeToGlobalMarket((quotes) => {
      setCommodities(quotes.filter((q) => q.id !== 'bmm'));
    });
    return unsub;
  }, []);

  const unrealizedPnL = useMemo(() => {
    return positions.reduce((acc, pos) => {
      const currentAsset = commodities.find((c) => c.id === pos.assetId);
      if (!currentAsset) return acc;

      const priceDiff = currentAsset.price - pos.entryPrice;
      const posPnL = pos.type === 'BUY' ? priceDiff * pos.quantity : -priceDiff * pos.quantity;
      return acc + posPnL;
    }, 0);
  }, [positions, commodities]);

  const portfolioValue = useMemo(() => {
    return balance + unrealizedPnL;
  }, [balance, unrealizedPnL]);

  const realizedPnL = useMemo(() => {
    return tradeHistory.reduce((acc, trade) => acc + trade.pnl, 0);
  }, [tradeHistory]);

  const reserveAmount = 1000.00;
  const rawWithdrawable = Math.max(0, Math.floor(((balance - reserveAmount) / 1.05) * 100) / 100);
  const withdrawableBalance = Math.min(2000, rawWithdrawable);

  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const lastWithdrawal = userWithdrawals && userWithdrawals.length > 0 ? userWithdrawals[0] : null;
  const lastWithdrawalTime = lastWithdrawal
    ? (lastWithdrawal.requestedAt?.toMillis ? lastWithdrawal.requestedAt.toMillis() : (lastWithdrawal.requestedAt?.seconds ? lastWithdrawal.requestedAt.seconds * 1000 : (lastWithdrawal.requestedAt ? new Date(lastWithdrawal.requestedAt).getTime() : 0)))
    : 0;

  const timeSinceLastWithdrawal = nowMs > 0 && lastWithdrawalTime > 0 ? nowMs - lastWithdrawalTime : 0;
  const isWithdrawalCooldownActive = lastWithdrawalTime > 0 && nowMs > 0 && timeSinceLastWithdrawal < THREE_DAYS_MS;
  const remainingCooldownMs = isWithdrawalCooldownActive ? THREE_DAYS_MS - timeSinceLastWithdrawal : 0;

  const getCooldownLabel = (ms: number) => {
    const totalHours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days} dia(s) e ${hours} hora(s)`;
    if (hours > 0) return `${hours} hora(s) e ${mins} min`;
    return `${Math.max(1, mins)} minuto(s)`;
  };

  const positionsAllocatedMargin = useMemo(() => {
    return positions.reduce((acc, pos) => {
      const posCost = pos.type === 'BUY' ? pos.entryPrice * pos.quantity : pos.entryPrice * pos.quantity * 0.2;
      return acc + posCost;
    }, 0);
  }, [positions]);

  const handleExecuteWithdrawal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      showToast('Inicie sessão para solicitar levantamentos.', 'error');
      return;
    }

    const windowStatus = getMaputoWithdrawalWindowDetails();
    if (!windowStatus.isOpen) {
      showToast('O levantamento só pode ser feito das 8h às 12h todos os dias (Hora de Moçambique Maputo).', 'error');
      return;
    }

    if (isWithdrawalCooldownActive) {
      showToast(
        `Regra de Segurança: Só é permitido solicitar um novo levantamento após 3 dias do último pedido. Próximo levantamento desbloqueado em: ${getCooldownLabel(remainingCooldownMs)}.`,
        'error'
      );
      return;
    }

    const numAmount = parseFloat(withdrawalAmount);
    if (isNaN(numAmount) || numAmount < 300) {
      showToast('O valor mínimo de levantamento é de 300,00 MT.', 'error');
      return;
    }

    if (numAmount > 2000) {
      showToast('O valor máximo permitido por levantamento é de 2.000,00 MT.', 'error');
      return;
    }

    const fee = Math.round(numAmount * 0.05 * 100) / 100;
    const totalDebitado = Number((numAmount + fee).toFixed(2));
    const saldoRestante = Number((balance - totalDebitado).toFixed(2));

    if (saldoRestante < 1000) {
      showToast(
        `Regra TapRise: O levantamento foi recusado porque deve sempre sobrar no mínimo 1.000,00 MT na conta após o levantamento e a taxa de 5% (${fee.toFixed(2)} MT). Com o saldo atual de ${balance.toFixed(2)} MT, restariam apenas ${saldoRestante.toFixed(2)} MT.`,
        'error'
      );
      return;
    }

    const cleanName = withdrawalName.trim();
    if (!cleanName || cleanName.length < 3) {
      showToast('Por favor, informe o seu nome completo de confirmação do titular da conta.', 'error');
      return;
    }

    const cleanPhone = withdrawalPhone.replace(/\D/g, '');
    if (withdrawalMethod === 'mpesa') {
      if (cleanPhone.length !== 9 || (!cleanPhone.startsWith('84') && !cleanPhone.startsWith('85'))) {
        showToast('Número M-Pesa inválido. Deve conter 9 dígitos e iniciar com 84 ou 85 (ex: 841234567).', 'error');
        return;
      }
    } else {
      if (cleanPhone.length !== 9 || (!cleanPhone.startsWith('86') && !cleanPhone.startsWith('87'))) {
        showToast('Número e-Mola inválido. Deve conter 9 dígitos e iniciar com 86 ou 87 (ex: 861234567).', 'error');
        return;
      }
    }

    if (withdrawalSubmitting) return;

    try {
      setWithdrawalSubmitting(true);
      const newBal = saldoRestante;
      const hoje = getMaputoTodayDate();
      const operatorLabel = withdrawalMethod === 'mpesa' ? 'M-Pesa' : 'e-Mola';

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        balance: newBal,
        saldoVirtual: newBal,
        patrimonioTotal: newBal + unrealizedPnL,
        lastWithdrawalAt: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      });

      try {
        await updateDoc(doc(db, 'usuarios', user.uid), {
          saldoDisponivel: newBal,
          saldoTotal: newBal + unrealizedPnL
        });
      } catch {}

      const withdrawalDocRef = await addDoc(collection(db, 'withdrawals'), {
        uid: user.uid,
        userId: user.uid,
        userEmail: user.email || '',
        userName: cleanName,
        operator: operatorLabel,
        phoneNumber: cleanPhone,
        amount: numAmount,
        fee: fee,
        totalDebited: totalDebitado,
        remainingBalance: saldoRestante,
        status: 'pendente',
        statusNormalized: 'PENDING',
        processingTime: '2 a 3 horas',
        statusMessage: 'Aguarde entre 2 a 3 horas para a validação bancária e envio dos fundos.',
        requestedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        dateStr: hoje,
      });

      await addDoc(collection(db, 'transactions'), {
        uid: user.uid,
        userId: user.uid,
        userEmail: user.email || '',
        userName: cleanName,
        type: 'withdrawal',
        amount: -totalDebitado,
        netAmount: numAmount,
        fee: fee,
        operator: operatorLabel,
        targetPhone: cleanPhone,
        status: 'PENDING',
        oldBalance: balance,
        newBalance: newBal,
        date: hoje,
        timestamp: serverTimestamp(),
        description: `Pedido de Levantamento via ${operatorLabel} (${cleanPhone}): ${numAmount.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT (Taxa 5%: ${fee.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT | Total cortado: ${totalDebitado.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT)`
      });

      setLocalBalance(newBal);
      if (updateBalance) {
        updateBalance(newBal, newBal + unrealizedPnL);
      }

      setWithdrawalSuccessData({
        id: withdrawalDocRef.id,
        amount: numAmount,
        operator: operatorLabel,
        phone: cleanPhone,
        name: cleanName
      });

      setIsWithdrawalModalOpen(false);
      showToast(`Pedido de ${formatMT(numAmount)} submetido com sucesso! Taxa de 5% (${formatMT(fee)}) aplicada. Aguarde entre 2 a 3 horas.`, 'success');
    } catch (err: any) {
      console.error('Erro ao processar levantamento:', err);
      showToast(`Falha ao submeter pedido: ${err.message || 'Tente novamente.'}`, 'error');
    } finally {
      setWithdrawalSubmitting(false);
    }
  };

  const executeTrade = () => {
    if (isTradingDisabled) {
      showToast(tradingDisabledReason, 'error');
      return;
    }

    if (balance <= 0) {
      showToast('Conta sem saldo disponível (0,00 MT). Aguarde a atribuição de saldo pela administração.', 'error');
      return;
    }

    const cost = selectedAsset.price * tradeQty;

    if (tradeSide === 'BUY' && cost > balance) {
      showToast('Saldo disponível insuficiente em Meticais (MT)!', 'error');
      return;
    }

    if (tradeSide === 'SELL' && cost * 0.2 > balance) {
      showToast('Margem de garantia insuficiente (20% de caução necessária)!', 'error');
      return;
    }

    if (tradeQty <= 0) {
      showToast('A quantidade deve ser maior que zero.', 'error');
      return;
    }

    counterRef.current += 1;
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    if (tradeSide === 'BUY') {
      const newBal = balance - cost;
      setLocalBalance(newBal);
      if (updateBalance) updateBalance(newBal, newBal + unrealizedPnL);

      const newPosition: Position = {
        id: counterRef.current,
        assetId: selectedAsset.id,
        assetName: selectedAsset.name,
        symbol: selectedAsset.symbol,
        unit: selectedAsset.unit,
        type: 'BUY',
        quantity: Number(tradeQty),
        entryPrice: selectedAsset.price,
        timestamp: timeString
      };

      setPositions((prev) => [newPosition, ...prev]);
      showToast(`Compra realizada: ${tradeQty}x ${selectedAsset.symbol} por ${formatMT(cost)}`);
    } else {
      const margin = cost * 0.2;
      const newBal = balance - margin;
      setLocalBalance(newBal);
      if (updateBalance) updateBalance(newBal, newBal + unrealizedPnL);

      const newPosition: Position = {
        id: counterRef.current,
        assetId: selectedAsset.id,
        assetName: selectedAsset.name,
        symbol: selectedAsset.symbol,
        unit: selectedAsset.unit,
        type: 'SELL',
        quantity: Number(tradeQty),
        entryPrice: selectedAsset.price,
        timestamp: timeString
      };

      setPositions((prev) => [newPosition, ...prev]);
      showToast(`Posição de venda aberta: ${tradeQty}x ${selectedAsset.symbol} (Margem: ${formatMT(margin)})`);
    }

    if (user) {
      addDoc(collection(db, 'orders'), {
        orderId: counterRef.current,
        userId: user.uid,
        userName: profile?.nome || 'Investidor TapRise',
        userEmail: user.email || '',
        assetId: selectedAsset.id,
        assetName: selectedAsset.name,
        symbol: selectedAsset.symbol,
        type: tradeSide,
        quantity: Number(tradeQty),
        entryPrice: selectedAsset.price,
        cost: cost,
        status: 'OPEN',
        timestamp: serverTimestamp()
      }).catch(() => {});
    }

    setIsTradeModalOpen(false);
  };

  const closePosition = (position: Position) => {
    const currentAsset = commodities.find((c) => c.id === position.assetId);
    if (!currentAsset) return;

    const priceDiff = currentAsset.price - position.entryPrice;
    const pnl = position.type === 'BUY' ? priceDiff * position.quantity : -priceDiff * position.quantity;

    let returnedCapital = 0;
    if (position.type === 'BUY') {
      returnedCapital = (position.entryPrice * position.quantity) + pnl;
    } else {
      returnedCapital = (position.entryPrice * position.quantity * 0.2) + pnl;
    }

    const newBal = Math.max(0, balance + returnedCapital);
    setLocalBalance(newBal);
    if (updateBalance) updateBalance(newBal, newBal + (unrealizedPnL - pnl));

    counterRef.current += 1;
    const now = new Date();
    const timeString = `${now.toLocaleDateString('pt-MZ')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const closedTrade: ClosedTrade = {
      id: counterRef.current,
      symbol: position.symbol,
      assetName: position.assetName,
      type: position.type,
      quantity: position.quantity,
      entryPrice: position.entryPrice,
      exitPrice: currentAsset.price,
      pnl: pnl,
      timestamp: timeString
    };

    setTradeHistory((prev) => [closedTrade, ...prev]);
    setPositions((prev) => prev.filter((p) => p.id !== position.id));

    if (pnl >= 0) {
      showToast(`Posição fechada com LUCRO de +${formatMT(pnl)}! 🎉`);
    } else {
      showToast(`Posição fechada com prejuízo de ${formatMT(pnl)}`, 'error');
    }
  };

  const toggleFavorite = (assetId: string) => {
    setFavorites((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  const filteredCommodities = commodities.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(marketSearch.toLowerCase()) ||
      c.symbol.toLowerCase().includes(marketSearch.toLowerCase());
    const matchesCat = marketCategory === 'Todos' || c.category === marketCategory;
    return matchesSearch && matchesCat;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black tracking-widest text-2xl shadow-xl shadow-blue-200 animate-pulse">
          TR
        </div>
        <p className="mt-4 text-sm font-bold text-slate-800">A carregar a plataforma TapRise...</p>
        <p className="text-xs text-slate-400">Sincronizando cotações em tempo real...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col pt-13 sm:pt-14 pb-28 md:pb-8 overflow-x-hidden">
      
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed top-16 right-3 sm:right-5 z-50 animate-bounce">
          <div
            className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl shadow-xl border text-xs font-semibold transition ${
              toastMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : toastMessage.type === 'info'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
            {toastMessage.type === 'info' && <Zap className="w-4 h-4 text-blue-500 shrink-0" />}
            {toastMessage.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* 1. BARRA SUPERIOR FIXA (FIXED TOP MT5) */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs h-13 sm:h-14 flex items-center">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full flex items-center justify-between">
          <div
            className="flex items-center space-x-2 cursor-pointer select-none"
            onClick={() => setActiveTab('inicio')}
            title="Ir para o Início"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#2563eb] rounded-lg text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
              TR
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none">
                  TapRise
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  AO VIVO
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-medium leading-tight mt-0.5">
                BMM • Moçambique
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-1.5">
            {/* 1. ÍCONE DE PESQUISA */}
            <button
              type="button"
              onClick={() => setIsQuickSearchOpen(!isQuickSearchOpen)}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition cursor-pointer shrink-0 ${
                isQuickSearchOpen
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Pesquisar Ativos e Mercados"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* 2. ÍCONE DE NOTIFICAÇÕES COM BADGE */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition cursor-pointer shrink-0 relative ${
                  isNotificationsOpen
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Notificações e Alertas Oficiais"
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
              </button>

              {/* DROPDOWN NOTIFICAÇÕES (POSICIONADO COM PRECISÃO) */}
              {isNotificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
                    onClick={() => setIsNotificationsOpen(false)}
                  />
                  <div className="fixed top-14 right-2 sm:right-4 left-2 sm:left-auto sm:w-84 max-w-sm mx-auto z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3.5 text-slate-800 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-blue-600" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">Notificações TapRise</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Banner Permissão de Notificação Sonora & Push */}
                    {notificationPermission !== 'granted' && (
                      <div className="my-2 p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                        <p className="text-[11px] font-bold text-blue-900">Alertas de Mensagens no Celular</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">Receba avisos instantâneos de mensagens no chat em tempo real.</p>
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await requestNotificationPermission();
                            setNotificationPermission(res);
                            if (res === 'granted') {
                              playMessageSound();
                              triggerPushNotification('TapRise Notificações', 'Notificações ativadas no seu celular com sucesso!');
                              showToast('Notificações no celular ativadas com sucesso!', 'success');
                            }
                          }}
                          className="mt-2 w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                        >
                          <Bell className="w-3 h-3" />
                          <span>Ativar Notificações no Celular</span>
                        </button>
                      </div>
                    )}

                    {notificationPermission === 'granted' && (
                      <div className="my-2 py-1 px-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] text-emerald-800 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> Alertas no celular ativados</span>
                        <span className="text-emerald-600 text-[9px] uppercase font-mono">Ao Vivo</span>
                      </div>
                    )}

                    <div className="mt-2 space-y-2 max-h-72 overflow-y-auto pr-0.5">
                      {/* Janela Operacional BMM */}
                      <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100 text-xs">
                        <div className="flex items-center justify-between font-bold text-blue-900 mb-0.5">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3 text-blue-600" />
                            Janela BMM 21:00
                          </span>
                          <span className="text-[9px] text-blue-600 bg-white px-1.5 py-0.5 rounded border border-blue-200">Seg — Sex</span>
                        </div>
                        <p className="text-[10px] text-slate-600">
                          Sessão diária no card BMM/MZN com liquidação pontual às 21:00 CAT.
                        </p>
                      </div>

                      {/* Janela Levantamento */}
                      <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs">
                        <div className="flex items-center justify-between font-bold text-emerald-900 mb-0.5">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Smartphone className="w-3 h-3 text-emerald-600" />
                            Janela de Levantamento (08h — 12h)
                          </span>
                          <span className="text-[9px] text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">M-Pesa / e-Mola</span>
                        </div>
                        <p className="text-[10px] text-slate-600">
                          Mín. 300 MT, máx. 2.000 MT por pedido (intervalo obrigatório de 3 dias).
                        </p>
                      </div>

                      {/* Depósito Mínimo */}
                      <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-100 text-xs">
                        <div className="flex items-center justify-between font-bold text-amber-900 mb-0.5">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Coins className="w-3 h-3 text-amber-600" />
                            Depósito Mínimo: 1.000 MT
                          </span>
                          <span className="text-[9px] text-amber-700 bg-white px-1.5 py-0.5 rounded border border-amber-200">e-Mola</span>
                        </div>
                        <p className="text-[10px] text-slate-600">
                          Depósitos via e-Mola creditados na carteira institucional.
                        </p>
                      </div>

                      {/* Programa Afiliados */}
                      <div className="p-2 rounded-xl bg-purple-50/70 border border-purple-100 text-xs">
                        <div className="flex items-center justify-between font-bold text-purple-900 mb-0.5">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Award className="w-3 h-3 text-purple-600" />
                            Afiliados (+20 Ativos)
                          </span>
                          <span className="text-[9px] text-purple-700 bg-white px-1.5 py-0.5 rounded border border-purple-200">Salário Semanal</span>
                        </div>
                        <p className="text-[10px] text-slate-600">
                          +20 convidados com primeiro depósito garantem salário semanal fixo da Administração.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 3. ÍCONE DO PERFIL */}
            <button
              type="button"
              onClick={() => setActiveTab('perfil')}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full font-bold text-xs flex items-center justify-center shadow-xs hover:ring-2 hover:ring-blue-300 transition cursor-pointer shrink-0 overflow-hidden ${
                activeTab === 'perfil'
                  ? 'bg-blue-700 text-white ring-2 ring-blue-400'
                  : 'bg-[#2563eb] text-white'
              }`}
              title="Perfil do Investidor"
            >
              {profile?.fotoPerfil || profile?.photoURL ? (
                <img
                  src={profile.fotoPerfil || profile.photoURL}
                  alt={profile?.nome || 'Perfil'}
                  className="w-full h-full object-cover"
                />
              ) : (
                profile?.nome ? profile.nome.charAt(0).toUpperCase() : (user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A')
              )}
            </button>

            {/* 4. CHAT LINK COM BADGE DE NÃO LIDAS */}
            <Link
              href="/chat"
              prefetch={true}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition relative cursor-pointer shrink-0"
              title="Grupo de Chat Ao Vivo"
            >
              <MessageCircle className="w-3.5 h-3.5 text-slate-700" />
              {unreadChatCount > 0 ? (
                <span className="absolute -top-1 -right-1 px-1 py-0.5 bg-emerald-500 text-white font-black text-[9px] rounded-full min-w-[15px] h-[15px] flex items-center justify-center shadow-md leading-none animate-in zoom-in-50">
                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                </span>
              ) : (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              )}
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                prefetch={true}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition cursor-pointer shadow-xs shrink-0"
                title="Painel Administrativo Central (/admin)"
              >
                <Shield className="w-3.5 h-3.5 text-amber-600" />
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
              title="Terminar Sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* QUICK SEARCH OVERLAY EM POPDOWN NA BARRA FIXA */}
        {isQuickSearchOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
            <div className="max-w-2xl mx-auto flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Pesquisar por ativo, símbolo ou categoria..."
                  value={headerSearchQuery}
                  onChange={(e) => setHeaderSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 border-0 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (headerSearchQuery.trim()) {
                    setMarketSearch(headerSearchQuery.trim());
                    setActiveTab('mercados');
                  }
                  setIsQuickSearchOpen(false);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
              >
                Ver em Mercados
              </button>
              <button
                type="button"
                onClick={() => setIsQuickSearchOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {headerSearchQuery.trim() && (
              <div className="max-w-2xl mx-auto mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pt-1">
                {commodities
                  .filter((c) =>
                    c.name.toLowerCase().includes(headerSearchQuery.toLowerCase()) ||
                    c.symbol.toLowerCase().includes(headerSearchQuery.toLowerCase())
                  )
                  .slice(0, 4)
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setFullscreenAsset(item);
                        setIsQuickSearchOpen(false);
                      }}
                      className="p-2 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-black font-mono text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                          {item.symbol}
                        </span>
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[140px]">{item.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black font-mono text-slate-900">{formatMT(item.price)}</p>
                        <span className="text-[10px] text-blue-600 font-bold flex items-center gap-0.5 justify-end">
                          <BarChart2 className="w-3 h-3" /> Gráfico MT5
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* GLOBAL ANNOUNCEMENT BANNER */}
      {globalAnnouncement?.active && !dismissedAnnouncement && (
        <div
          className={`px-4 py-2.5 text-xs font-semibold shadow-md flex items-center justify-between border-b ${
            globalAnnouncement.type === 'warning'
              ? 'bg-amber-500/15 text-amber-950 border-amber-300'
              : globalAnnouncement.type === 'urgent'
              ? 'bg-rose-600 text-white border-rose-700'
              : globalAnnouncement.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-blue-600 text-white border-blue-700'
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
            <div className="flex items-center space-x-2.5 truncate mr-3">
              <Bell className="w-4 h-4 shrink-0 animate-bounce" />
              <div className="truncate">
                <strong className="mr-1.5">{globalAnnouncement.title}:</strong>
                <span>{globalAnnouncement.message}</span>
              </div>
            </div>
            <button
              onClick={() => setDismissedAnnouncement(true)}
              className="p-1 hover:bg-black/10 rounded-lg shrink-0 transition cursor-pointer"
              title="Dispensar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* LAYOUT CONTAINER */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        
        {/* DESKTOP SIDEBAR NAVIGATION */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 space-y-4">
          <nav className="space-y-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            {[
              { id: 'inicio', label: 'Início', icon: BarChart2 },
              { id: 'mercados', label: 'Mercados', icon: TrendingUp },
              { id: 'carteira', label: 'Carteira', icon: Briefcase },
              { id: 'perfil', label: 'Perfil', icon: User }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'inicio' | 'mercados' | 'carteira' | 'perfil')}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition cursor-pointer ${
                    isActive
                      ? 'bg-[#2563eb] text-white shadow-md shadow-blue-200 font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            <div className="pt-2 border-t border-slate-100 mt-2">
              <Link
                href="/chat"
                prefetch={true}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-sm transition bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 border border-blue-200"
              >
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-4 h-4 shrink-0 text-blue-600" />
                  <span>Grupo Ao Vivo</span>
                </div>
                {unreadChatCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-white shadow-xs">
                    {unreadChatCount > 99 ? '99+' : unreadChatCount}
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </Link>
            </div>

            {isAdmin && (
              <div className="pt-2 border-t border-slate-100 mt-2">
                <Link
                  href="/admin"
                  prefetch={true}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-black text-xs transition bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 border border-amber-500/30"
                >
                  <Shield className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>PAINEL ADMIN</span>
                </Link>
              </div>
            )}
          </nav>

          <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-4 text-white space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-200">Destaque Nacional</span>
              <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded font-bold">ALTO VOLUME</span>
            </div>
            <div>
              <p className="text-xs text-blue-100 font-medium">Castanha de Caju (Nampula)</p>
              <p className="text-xl font-black mt-0.5">
                {formatMT(commodities.find((c) => c.id === 'cashew')?.price || 95.50)}
              </p>
              <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                +{(commodities.find((c) => c.id === 'cashew')?.change24h || 5.4).toFixed(2)}% nas últimas 24h
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedAssetId('cashew');
                setTradeSide('BUY');
                setIsTradeModalOpen(true);
              }}
              className="w-full py-2 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center space-x-1 cursor-pointer"
            >
              <span>Negociar Agora</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-[11px] text-blue-900 space-y-1">
            <p className="font-bold flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              Mesa de Operações
            </p>
            <p className="text-blue-700 leading-tight">
              Cotações e ordens em tempo real com base no mercado de matérias-primas e commodities de Moçambique.
            </p>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0">
          
          {/* 1. INÍCIO / DASHBOARD */}
          {activeTab === 'inicio' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-[#f1f5f9] p-3.5 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      TOTAL
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#2563eb] flex items-center justify-center">
                      <Coins className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="my-1">
                    {authLoading ? (
                      <div className="animate-pulse bg-slate-200 h-6 w-28 rounded my-0.5"></div>
                    ) : (
                      <p className="text-xl font-bold text-slate-900 font-mono tracking-tight leading-none">
                        {formatMT(portfolioValue)}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 leading-tight">
                    Operacional + Posições
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-[#f1f5f9] p-3.5 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      DISPONÍVEL
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Target className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="my-1">
                    {authLoading ? (
                      <div className="animate-pulse bg-slate-200 h-6 w-28 rounded my-0.5"></div>
                    ) : (
                      <p className="text-xl font-bold text-[#2563eb] font-mono tracking-tight leading-none">
                        {formatMT(balance)}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 leading-tight">
                    Livre p/ negociar
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-[#f1f5f9] p-3.5 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      NÃO REALIZ.
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="my-1">
                    {authLoading ? (
                      <div className="animate-pulse bg-slate-200 h-6 w-28 rounded my-0.5"></div>
                    ) : (
                      <p className={`text-xl font-bold font-mono tracking-tight leading-none ${
                        unrealizedPnL >= 0 ? 'text-[#16a34a]' : 'text-rose-600'
                      }`}>
                        {unrealizedPnL >= 0 ? '+' : ''}{formatMT(unrealizedPnL)}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 leading-tight">
                    Em aberto
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-[#f1f5f9] p-3.5 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      REALIZADO
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 text-[#16a34a] flex items-center justify-center">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="my-1">
                    {authLoading ? (
                      <div className="animate-pulse bg-slate-200 h-6 w-28 rounded my-0.5"></div>
                    ) : (
                      <p className={`text-xl font-bold font-mono tracking-tight leading-none ${
                        realizedPnL >= 0 ? 'text-[#16a34a]' : 'text-rose-600'
                      }`}>
                        {realizedPnL >= 0 ? '+' : ''}{formatMT(realizedPnL)}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 leading-tight">
                    Liquidadas
                  </span>
                </div>
              </div>

              {/* TERMINAL OPERACIONAL 21H */}
              <Janela21hTerminal
                dailyConfig={dailyConfig}
                onOrderExecuted={(newBal) => {
                  setLocalBalance(newBal);
                  showToast('Ordem liquidada e saldo atualizado no terminal.', 'success');
                }}
              />

              {/* DESTAQUES DO MERCADO & DICA DO INSTRUTOR (Clean MT5 Layout) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Watchlist de Favoritos */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Cotações Rápidas (Favoritos)</h3>
                        <p className="text-[11px] text-slate-400">Preços em direto de matérias-primas nacionais</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('mercados')}
                      className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      Ver todos
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {commodities
                      .filter((c) => favorites.includes(c.id))
                      .slice(0, 4)
                      .map((asset) => (
                        <div
                          key={asset.id}
                          className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition flex flex-col justify-between gap-2"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] font-black font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                {asset.symbol}
                              </span>
                              <p className="text-xs font-bold text-slate-900 mt-1 truncate max-w-[120px]">{asset.name}</p>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                asset.change24h >= 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
                            <p className="text-sm font-black font-mono text-slate-900">{formatMT(asset.price)}</p>
                            <button
                              type="button"
                              onClick={() => setFullscreenAsset(asset)}
                              className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                              title="Abrir Gráfico MT5"
                            >
                              <BarChart2 className="w-3 h-3" />
                              <span>Gráfico</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Dica do Instrutor Oficial */}
                {customInstructorTip.active && (
                  <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/60 to-white rounded-2xl p-5 border border-blue-100 shadow-sm flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between text-blue-900 font-bold text-xs border-b border-blue-100/80 pb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">{customInstructorTip.title || 'Dica do Instrutor'}</h4>
                          <span className="text-[10px] text-blue-600 font-medium">Educação e Gestão de Risco</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-blue-100 text-[#2563eb] px-2.5 py-1 rounded-full font-bold border border-blue-200">
                        {customInstructorTip.badge || 'Dica de Ouro'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white/70 p-3.5 rounded-xl border border-blue-100/50">
                      &ldquo;{customInstructorTip.content}&rdquo;
                    </p>

                    <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                      <span className="font-semibold text-slate-700">{customInstructorTip.author || 'Instrutor Mateus Maputo'}</span>
                      <span className="text-[10px] text-blue-600 font-bold bg-white px-2 py-0.5 rounded-md border border-blue-100 shadow-xs">
                        Oficial TapRise
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Active Positions Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-slate-900">Posições Abertas</h3>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                      {positions.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('carteira')}
                    className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Abrir Diário de Carteira
                  </button>
                </div>

                {positions.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs space-y-2">
                    <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                    <p>Nenhuma posição aberta de momento.</p>
                    <button
                      onClick={() => setActiveTab('mercados')}
                      className="px-4 py-1.5 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition cursor-pointer"
                    >
                      Explorar Mercados
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100 font-semibold uppercase">
                          <th className="pb-3">Ativo</th>
                          <th className="pb-3">Tipo</th>
                          <th className="pb-3">Qtd</th>
                          <th className="pb-3">Preço Entrada</th>
                          <th className="pb-3">Preço Atual</th>
                          <th className="pb-3">Lucro / Prejuízo</th>
                          <th className="pb-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {positions.map((pos) => {
                          const currentAsset = commodities.find((c) => c.id === pos.assetId);
                          const currentPrice = currentAsset ? currentAsset.price : pos.entryPrice;
                          const priceDiff = currentPrice - pos.entryPrice;
                          const posPnL = pos.type === 'BUY' ? priceDiff * pos.quantity : -priceDiff * pos.quantity;

                          return (
                            <tr key={pos.id} className="hover:bg-slate-50 transition">
                              <td className="py-3 font-bold text-slate-800">
                                {pos.symbol}
                                <span className="block text-[10px] text-slate-400 font-normal">{pos.assetName}</span>
                              </td>
                              <td className="py-3">
                                <span
                                  className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                    pos.type === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                  }`}
                                >
                                  {pos.type === 'BUY' ? 'COMPRA' : 'VENDA'}
                                </span>
                              </td>
                              <td className="py-3">{pos.quantity}</td>
                              <td className="py-3">{formatMT(pos.entryPrice)}</td>
                              <td className="py-3">{formatMT(currentPrice)}</td>
                              <td className={`py-3 font-bold ${posPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {posPnL >= 0 ? '+' : ''}{formatMT(posPnL)}
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => closePosition(pos)}
                                  className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition text-xs cursor-pointer"
                                >
                                  Fechar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 2. MERCADOS (COMMODITIES MARKET) */}
          {activeTab === 'mercados' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h1 className="text-xl font-black text-slate-900">Mercado de Matérias-Primas</h1>
                  <p className="text-xs text-slate-500">Cotações oficiais e instrumentos negociáveis em Moçambique</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar produto ou código..."
                      value={marketSearch}
                      onChange={(e) => setMarketSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-100 border-0 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex space-x-2 overflow-x-auto pb-1">
                {['Todos', 'Energia', 'Metais', 'Agricultura'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setMarketCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      marketCategory === cat
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Commodities Grid (Lista Limpa Estilo MT5 sem gráfico em background) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCommodities.map((item) => {
                  const isFav = favorites.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-blue-300 transition flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-black font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                              {item.symbol}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">{item.category}</span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 mt-1">{item.name}</h3>
                          <p className="text-[11px] text-slate-400">Unidade: {item.unit}</p>
                          {item.description && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{item.description}</p>
                          )}
                        </div>

                        <button
                          onClick={() => toggleFavorite(item.id)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            isFav
                              ? 'bg-amber-50 border-amber-200 text-amber-500 font-bold'
                              : 'border-slate-100 text-slate-300 hover:text-slate-400'
                          }`}
                          title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                        >
                          ★
                        </button>
                      </div>

                      <div>
                        <div className="flex items-baseline justify-between">
                          <p className="text-xl font-black font-mono text-slate-900">{formatMT(item.price)}</p>
                          <p
                            className={`text-xs font-bold flex items-center ${
                              item.change24h >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {item.change24h >= 0 ? (
                              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                            )}
                            <span>
                              {item.change24h >= 0 ? '+' : ''}
                              {item.change24h.toFixed(2)}%
                            </span>
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                          <div>
                            <span>Máx 24h: </span>
                            <strong className="text-slate-700">{formatMT(item.high)}</strong>
                          </div>
                          <div className="text-right">
                            <span>Mín 24h: </span>
                            <strong className="text-slate-700">{formatMT(item.low)}</strong>
                          </div>
                        </div>
                      </div>

                      {isGlobalMarketClosed || marketHoursConfig.pausedAssets[item.id] ? (
                        <div className="pt-2">
                          <div className="w-full py-2.5 px-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-bold flex items-center justify-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{marketHoursConfig.pausedAssets[item.id] ? 'Ativo Pausado' : 'Mercado Fechado'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setFullscreenAsset(item)}
                            className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                            title="Abrir Gráfico MT5 em Tela Cheia"
                          >
                            <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Gráfico</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAssetId(item.id);
                              setTradeSide('BUY');
                              setIsTradeModalOpen(true);
                            }}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer text-center"
                          >
                            Comprar
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAssetId(item.id);
                              setTradeSide('SELL');
                              setIsTradeModalOpen(true);
                            }}
                            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer text-center"
                          >
                            Vender
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. CARTEIRA */}
          {activeTab === 'carteira' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <Wallet className="w-6 h-6 text-blue-600" />
                      Carteira Institucional TapRise
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Custódia Moçambique • MT
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Gestão patrimonial, posições ativas, extrato em tempo real e levantamentos via M-Pesa e e-Mola
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  <div className={`px-3.5 py-2 rounded-2xl border text-xs flex items-center gap-2 ${
                    withdrawalWindow.isOpen
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    <Clock className={`w-4 h-4 shrink-0 ${withdrawalWindow.isOpen ? 'text-emerald-600' : 'text-amber-600'}`} />
                    <div className="leading-tight">
                      <span className="block text-[10px] uppercase font-bold tracking-wider">
                        Janela de Levantamento (08h — 12h CAT)
                      </span>
                      <span className="font-semibold text-[11px]">
                        {withdrawalWindow.statusMessage}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCarteiraSubTab('deposito');
                      setIsDepositModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-[0.98] text-white font-bold text-xs rounded-2xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Fazer Depósito (e-Mola)</span>
                  </button>

                  <button
                    onClick={() => setIsWithdrawalModalOpen(true)}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-2xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Solicitar Levantamento</span>
                  </button>
                </div>
              </div>

              {/* 5 KPI CARDS DA CARTEIRA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Património Total</span>
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xl font-black text-slate-900">{formatMT(portfolioValue)}</p>
                  <p className="text-[11px] text-slate-500">Saldo + Margem em Posições</p>
                </div>

                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Saldo em Conta</span>
                    <Award className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-xl font-black text-blue-600">{formatMT(balance)}</p>
                  <p className="text-[11px] text-slate-500">Capital total creditado</p>
                </div>

                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm space-y-1 relative overflow-hidden">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Saldo Retirável</span>
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className={`text-xl font-black ${withdrawableBalance >= 300 ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {formatMT(withdrawableBalance)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {withdrawableBalance >= 300
                      ? 'Livre p/ M-Pesa / e-Mola'
                      : 'Mínimo 300 MT retirável'}
                  </p>
                </div>

                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Reserva Mínima</span>
                    <Shield className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-xl font-black text-amber-600">{formatMT(reserveAmount)}</p>
                  <p className="text-[11px] text-slate-500">Obrigatória em conta</p>
                </div>

                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Rendimento (PnL)</span>
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className={`text-xl font-black ${realizedPnL + unrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {realizedPnL + unrealizedPnL >= 0 ? '+' : ''}{formatMT(realizedPnL + unrealizedPnL)}
                  </p>
                  <p className="text-[11px] text-slate-500">Histórico + Em aberto</p>
                </div>
              </div>

              <WalletBalanceChart
                currentBalance={balance}
                portfolioValue={portfolioValue}
                unrealizedPnL={unrealizedPnL}
                positionsCount={positions.length}
                positionsValue={positionsAllocatedMargin}
                transactions={userTransactions}
              />

              {/* Sub-abas de Navegação */}
              <div className="bg-white rounded-3xl border border-slate-200 p-2 shadow-sm">
                <div className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setCarteiraSubTab('deposito')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      carteiraSubTab === 'deposito'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Coins className={`w-4 h-4 ${carteiraSubTab === 'deposito' ? 'text-white' : 'text-amber-500'}`} />
                    <span>Depósito (e-Mola)</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      carteiraSubTab === 'deposito' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                    }`}>
                      877083749
                    </span>
                  </button>

                  <button
                    onClick={() => setCarteiraSubTab('visao-geral')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      carteiraSubTab === 'visao-geral'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Posições Ativas</span>
                    {positions.length > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        carteiraSubTab === 'visao-geral' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {positions.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setCarteiraSubTab('transacoes')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      carteiraSubTab === 'transacoes'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>Extrato de Transações</span>
                    {userTransactions.length > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        carteiraSubTab === 'transacoes' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {userTransactions.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setCarteiraSubTab('levantamentos')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      carteiraSubTab === 'levantamentos'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Pedidos de Levantamento</span>
                    {userWithdrawals.length > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        carteiraSubTab === 'levantamentos' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {userWithdrawals.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setCarteiraSubTab('fechadas')}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                      carteiraSubTab === 'fechadas'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Operações Fechadas</span>
                    {tradeHistory.length > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        carteiraSubTab === 'fechadas' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {tradeHistory.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* SUB-ABA: DEPÓSITO */}
              {carteiraSubTab === 'deposito' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 rounded-3xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10 max-w-xl space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white border border-white/30 uppercase tracking-wider">
                          Canal Oficial de Recarga
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-900 uppercase tracking-wider">
                          Mínimo: 1.000,00 MT
                        </span>
                        <span className="text-xs text-amber-100 font-medium">
                          Carteira Móvel e-Mola (Movitel)
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white">
                        Depósito via e-Mola
                      </h3>
                      <p className="text-xs text-amber-100/90 leading-relaxed">
                        Faça a recarga da sua conta de forma simples e rápida diretamente pelo seu telemóvel usando o serviço e-Mola. O valor mínimo para qualquer depósito é de <strong>1.000,00 MT</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-900 shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-black">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-black text-amber-950 uppercase tracking-wider text-[11px]">
                        Regra Oficial: Depósito Mínimo de 1.000,00 MT
                      </p>
                      <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                        O montante mínimo de recarga permitido na plataforma é de <strong>1.000,00 MT</strong>. Transferências com valores inferiores a 1.000 MT não serão validadas nem creditadas pelo sistema.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-3xl border-2 border-amber-300/80 p-5 sm:p-6 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                          1. Número de Envio e-Mola
                        </span>
                        <span className="text-xs text-slate-400 font-mono">Movitel</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs text-slate-500 font-semibold block">Transferir para este contacto:</span>
                        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-mono text-sm">+258</span>
                            <span className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-slate-900">
                              877083749
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText('877083749', 'Número e-Mola')}
                            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            {copiedField === 'Número e-Mola' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-white" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Insira exatamente o número <strong>877083749</strong> no seu menu <strong>*898#</strong> ou app e-Mola.
                      </p>
                    </div>

                    <div className="bg-white rounded-3xl border-2 border-emerald-300/80 p-5 sm:p-6 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          2. Nome de Confirmação
                        </span>
                        <span className="text-xs text-emerald-700 font-bold">Oficial</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs text-slate-500 font-semibold block">Nome que deve constar no ecrã:</span>
                        <div className="flex items-center justify-between bg-emerald-50/50 border border-emerald-200 rounded-2xl p-3.5 sm:p-4">
                          <span className="text-lg sm:text-xl font-black tracking-wide text-slate-900 uppercase">
                            ELIZABETE NHATSUNGUE
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText('ELIZABETE NHATSUNGUE', 'Nome')}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
                          >
                            {copiedField === 'Nome' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-white" />
                                <span>Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Antes de digitar o PIN, confirme se o nome exibido é <strong>ELIZABETE NHATSUNGUE</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Como Fazer o Depósito Passo a Passo:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center">1</span>
                        <p className="font-bold text-slate-900 pt-1">Abra o e-Mola</p>
                        <p className="text-slate-500 text-[11px]">Disque <strong>*898#</strong> ou aceda à aplicação móvel e-Mola.</p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center">2</span>
                        <p className="font-bold text-slate-900 pt-1">Transferir Dinheiro</p>
                        <p className="text-slate-500 text-[11px]">Selecione Enviar / Transferir e digite o número <strong>877083749</strong>.</p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-[11px] font-black flex items-center justify-center">3</span>
                        <p className="font-bold text-slate-900 pt-1">Confirme o Titular</p>
                        <p className="text-slate-500 text-[11px]">Verifique <strong>ELIZABETE NHATSUNGUE</strong>, digite o valor (mínimo <strong>1.000,00 MT</strong>) e confirme com o PIN.</p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center">4</span>
                        <p className="font-bold text-slate-900 pt-1">Mande o Comprovativo</p>
                        <p className="text-slate-500 text-[11px]">Tire print da SMS de confirmação e envie no chat privado do Admin!</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100/60 border-2 border-blue-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                      <div className="flex items-start gap-4 max-w-2xl">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                          <MessageCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white uppercase tracking-wider">
                              Passo Final Obrigatório
                            </span>
                            <span className="text-[11px] text-blue-700 font-semibold">Crédito Rápido</span>
                          </div>
                          <h4 className="text-base sm:text-lg font-black text-slate-900">
                            Após o depósito, envie a captura de tela no Privado do Admin!
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                            Assim que concluir a sua transferência no <strong>e-Mola</strong>, tire uma <strong>captura de tela</strong> da mensagem SMS de confirmação recebida e envie diretamente no <strong>chat privado com o nosso Administrador</strong>.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                        <Link
                          href="/chat?tab=privado"
                          className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer text-center"
                        >
                          <MessageCircle className="w-4 h-4 text-white" />
                          <span>Enviar no Privado do Admin</span>
                          <ArrowRight className="w-4 h-4 text-white" />
                        </Link>
                        <span className="text-[10px] text-slate-400 text-center font-medium">
                          Chat direto com o Administrador Oficial
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-ABA: POSIÇÕES ATIVAS */}
              {carteiraSubTab === 'visao-geral' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900">Posições Abertas em Tempo Real</h3>
                      <p className="text-xs text-slate-500">Acompanhe as cotações em direto e liquide suas posições quando desejar</p>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Sincronização Ativa</span>
                    </div>
                  </div>

                  {positions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs space-y-3">
                      <Activity className="w-10 h-10 mx-auto text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">Nenhuma posição aberta no momento</p>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Explore o catálogo de matérias-primas moçambicanas na aba <strong>Mercados</strong> para iniciar uma operação de compra ou venda.
                      </p>
                      <button
                        onClick={() => setActiveTab('mercados')}
                        className="px-4 py-2 bg-blue-50 text-blue-700 font-bold text-xs rounded-xl hover:bg-blue-100 transition cursor-pointer"
                      >
                        Ir para Mercados
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100 font-semibold uppercase">
                            <th className="pb-3">Símbolo</th>
                            <th className="pb-3">Produto</th>
                            <th className="pb-3">Tipo</th>
                            <th className="pb-3">Quantidade</th>
                            <th className="pb-3">Entrada</th>
                            <th className="pb-3">Preço Atual</th>
                            <th className="pb-3">Resultado (MT)</th>
                            <th className="pb-3 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {positions.map((pos) => {
                            const currentAsset = commodities.find((c) => c.id === pos.assetId);
                            const currentPrice = currentAsset ? currentAsset.price : pos.entryPrice;
                            const priceDiff = currentPrice - pos.entryPrice;
                            const posPnL = pos.type === 'BUY' ? priceDiff * pos.quantity : -priceDiff * pos.quantity;

                            return (
                              <tr key={pos.id} className="hover:bg-slate-50 transition">
                                <td className="py-3.5 font-bold text-blue-700">{pos.symbol}</td>
                                <td className="py-3.5 font-semibold text-slate-800">{pos.assetName}</td>
                                <td className="py-3.5">
                                  <span
                                    className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                      pos.type === 'BUY'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-rose-100 text-rose-700'
                                    }`}
                                  >
                                    {pos.type === 'BUY' ? 'COMPRADO' : 'VENDIDO'}
                                  </span>
                                </td>
                                <td className="py-3.5">{pos.quantity} ({pos.unit})</td>
                                <td className="py-3.5 font-mono">{formatMT(pos.entryPrice)}</td>
                                <td className="py-3.5 font-mono font-bold text-slate-900">{formatMT(currentPrice)}</td>
                                <td className={`py-3.5 font-mono font-bold ${posPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {posPnL >= 0 ? '+' : ''}{formatMT(posPnL)}
                                </td>
                                <td className="py-3.5 text-right">
                                  <button
                                    onClick={() => closePosition(pos)}
                                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm"
                                  >
                                    Liquidar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-ABA: EXTRATO DE TRANSAÇÕES */}
              {carteiraSubTab === 'transacoes' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900">Extrato Central de Movimentações</h3>
                      <p className="text-xs text-slate-500">Histórico completo de depósitos, bónus e débitos em Meticais (MT)</p>
                    </div>
                    <span className="text-xs font-mono bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
                      {userTransactions.length} Registo(s)
                    </span>
                  </div>

                  {userTransactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                      <History className="w-10 h-10 mx-auto text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">Nenhuma transação registada até ao momento</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100 font-semibold uppercase">
                            <th className="pb-3">Data / Protocolo</th>
                            <th className="pb-3">Tipo de Operação</th>
                            <th className="pb-3">Descrição Detalhada</th>
                            <th className="pb-3">Montante (MT)</th>
                            <th className="pb-3 text-right">Saldo Resultante</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {userTransactions.map((tx) => {
                            const isPositive = (tx.amount ?? 0) >= 0;
                            let formattedDate = tx.date || 'Hoje';
                            if (tx.timestamp?.toDate) {
                              const d = tx.timestamp.toDate();
                              formattedDate = `${d.toLocaleDateString('pt-MZ')} ${d.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}`;
                            }

                            return (
                              <tr key={tx.id} className="hover:bg-slate-50 transition">
                                <td className="py-3.5 text-slate-500 font-mono text-[11px]">
                                  {formattedDate}
                                </td>
                                <td className="py-3.5">
                                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                    tx.type === 'admin_bonus'
                                      ? 'bg-blue-100 text-blue-800'
                                      : tx.type === 'bonus_21h'
                                      ? 'bg-amber-100 text-amber-800'
                                      : tx.type === 'withdrawal'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-slate-100 text-slate-800'
                                  }`}>
                                    {tx.type === 'admin_bonus'
                                      ? 'Crédito Admin'
                                      : tx.type === 'bonus_21h'
                                      ? 'Lucro Janela 21h'
                                      : tx.type === 'withdrawal'
                                      ? `Levantamento (${tx.operator || 'Móvel'})`
                                      : 'Movimento'}
                                  </span>
                                </td>
                                <td className="py-3.5 text-slate-800 font-medium">
                                  {tx.description || 'Operação na bolsa MZ TRADE'}
                                  {tx.targetPhone && (
                                    <span className="block text-[11px] text-slate-400 font-mono">
                                      Destino: {tx.operator} ({tx.targetPhone})
                                    </span>
                                  )}
                                </td>
                                <td className={`py-3.5 font-mono font-bold text-sm ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {isPositive ? '+' : ''}{formatMT(tx.amount)}
                                </td>
                                <td className="py-3.5 text-right font-mono font-semibold text-slate-700">
                                  {typeof tx.newBalance === 'number' ? formatMT(tx.newBalance) : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-ABA: PEDIDOS DE LEVANTAMENTO */}
              {carteiraSubTab === 'levantamentos' && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Carteira Móvel Moçambique
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          M-Pesa (84/85) & e-Mola (86/87)
                        </span>
                      </div>
                      <h3 className="text-xl font-black tracking-tight text-white">
                        Levantamento Direto para o seu Telemóvel
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Retire o seu saldo disponível entre <strong>300,00 MT</strong> e <strong>2.000,00 MT</strong> por pedido (intervalo mínimo de <strong>3 dias</strong> entre pedidos). Taxa operacional de <strong>5%</strong>. Deve sempre sobrar no mínimo <strong>1.000,00 MT</strong> em conta. Horário diário: <strong>08:00 às 12:00</strong> (Maputo).
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                      <button
                        onClick={() => setIsWithdrawalModalOpen(true)}
                        className="px-6 py-3.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-black text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Novo Levantamento</span>
                      </button>
                      <span className="text-[10px] text-slate-400 text-center">
                        Mínimo: 300 MT • Máx: 2.000 MT • 1x a cada 3 dias
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-base font-black text-slate-900">Histórico de Pedidos de Levantamento</h3>
                        <p className="text-xs text-slate-500">Monitorize o estado dos seus pedidos M-Pesa e e-Mola em tempo real</p>
                      </div>
                      <span className="text-xs font-mono bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
                        {userWithdrawals.length} Pedido(s)
                      </span>
                    </div>

                    {userWithdrawals.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs space-y-3">
                        <Smartphone className="w-10 h-10 mx-auto text-slate-300" />
                        <p className="text-sm font-semibold text-slate-600">Nenhum pedido de levantamento registado</p>
                        <button
                          onClick={() => setIsWithdrawalModalOpen(true)}
                          className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-blue-700 transition cursor-pointer"
                        >
                          Solicitar Agora
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-100 font-semibold uppercase">
                              <th className="pb-3">Data / Hora</th>
                              <th className="pb-3">Operadora</th>
                              <th className="pb-3">Número de Destino</th>
                              <th className="pb-3">Titular Confirmado</th>
                              <th className="pb-3">Montante</th>
                              <th className="pb-3">Tempo Estimado</th>
                              <th className="pb-3 text-right">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {userWithdrawals.map((item) => {
                              let formattedDate = item.dateStr || 'Hoje';
                              if (item.requestedAt?.toDate) {
                                const d = item.requestedAt.toDate();
                                formattedDate = `${d.toLocaleDateString('pt-MZ')} ${d.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}`;
                              }

                              return (
                                <tr key={item.id} className="hover:bg-slate-50 transition">
                                  <td className="py-3.5 text-slate-500 font-mono text-[11px]">{formattedDate}</td>
                                  <td className="py-3.5">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                      item.operator === 'M-Pesa'
                                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}>
                                      {item.operator}
                                    </span>
                                  </td>
                                  <td className="py-3.5 font-mono font-bold text-slate-800">{item.phoneNumber}</td>
                                  <td className="py-3.5 text-slate-700">{item.userName}</td>
                                  <td className="py-3.5 font-mono font-bold text-slate-900 text-sm">{formatMT(item.amount)}</td>
                                  <td className="py-3.5 text-slate-600 flex items-center gap-1.5 font-medium">
                                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span>{item.processingTime || '2 a 3 horas'}</span>
                                  </td>
                                  <td className="py-3.5 text-right">
                                    {(() => {
                                      const s = (item.status || '').toLowerCase();
                                      const isAceito = s === 'aceito' || s === 'completed' || s === 'aprovado' || s === 'fechado';
                                      const isRejeitado = s === 'rejeitado' || s === 'rejected';

                                      if (isAceito) {
                                        return (
                                          <span className="px-3 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300">
                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Aceito</span>
                                          </span>
                                        );
                                      }
                                      if (isRejeitado) {
                                        return (
                                          <span className="px-3 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 border border-rose-300">
                                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                            <span>Rejeitado</span>
                                          </span>
                                        );
                                      }
                                      return (
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                                          <span>Pendente</span>
                                        </span>
                                      );
                                    })()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-ABA: OPERAÇÕES FECHADAS */}
              {carteiraSubTab === 'fechadas' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900">Diário de Operações Liquidadas</h3>
                      <p className="text-xs text-slate-500">Registo de compras e vendas já fechadas na sessão</p>
                    </div>
                    <span className="text-xs font-mono bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
                      {tradeHistory.length} Fechada(s)
                    </span>
                  </div>

                  {tradeHistory.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                      <CheckCircle className="w-10 h-10 mx-auto text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">Nenhuma operação fechada ainda</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-100 font-semibold uppercase">
                            <th className="pb-3">Data / Hora</th>
                            <th className="pb-3">Ativo</th>
                            <th className="pb-3">Tipo</th>
                            <th className="pb-3">Quantidade</th>
                            <th className="pb-3">Entrada</th>
                            <th className="pb-3">Saída</th>
                            <th className="pb-3 text-right">Lucro Realizado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {tradeHistory.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition">
                              <td className="py-3 text-slate-500 font-mono text-[11px]">{item.timestamp}</td>
                              <td className="py-3 font-bold text-slate-800">{item.symbol}</td>
                              <td className="py-3">
                                <span
                                  className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                    item.type === 'BUY'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {item.type}
                                </span>
                              </td>
                              <td className="py-3">{item.quantity}</td>
                              <td className="py-3 font-mono">{formatMT(item.entryPrice)}</td>
                              <td className="py-3 font-mono">{formatMT(item.exitPrice)}</td>
                              <td className={`py-3 text-right font-mono font-bold ${item.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {item.pnl >= 0 ? '+' : ''}{formatMT(item.pnl)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. PERFIL */}
          {activeTab === 'perfil' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center space-y-3">
                {/* Input de ficheiro oculto para seleção da foto */}
                <input
                  type="file"
                  ref={profilePhotoInputRef}
                  onChange={handleProfilePhotoSelect}
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                />

                {/* Avatar com suporte a Foto e Inicial */}
                <div className="relative w-24 h-24 mx-auto group">
                  {profile?.fotoPerfil || profile?.photoURL ? (
                    <img
                      src={profile.fotoPerfil || profile.photoURL}
                      alt={profile?.nome || 'Foto de Perfil'}
                      onClick={() => setFullscreenPhotoModal({ url: profile.fotoPerfil || profile.photoURL, name: profile?.nome || 'Minha Foto' })}
                      className="w-24 h-24 rounded-full object-cover shadow-lg shadow-blue-200 border-3 border-blue-600 cursor-pointer hover:opacity-95 transition"
                      title="Clique para ver a foto em tamanho grande"
                    />
                  ) : (
                    <div
                      onClick={() => profilePhotoInputRef.current?.click()}
                      className="w-24 h-24 rounded-full bg-blue-600 text-white font-black text-3xl flex items-center justify-center shadow-lg shadow-blue-200 cursor-pointer hover:bg-blue-700 transition"
                      title="Clique para adicionar foto de perfil"
                    >
                      {profile?.nome ? profile.nome.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}

                  {/* Botão de câmara para alterar/adicionar foto */}
                  <button
                    type="button"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md border-2 border-white transition cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
                    title="Adicionar ou alterar foto de perfil"
                  >
                    {isUploadingPhoto ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Ações da Foto de Perfil */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3 h-3 text-blue-600" />
                    <span>{profile?.fotoPerfil || profile?.photoURL ? 'Trocar Foto' : 'Adicionar Foto'}</span>
                  </button>

                  {(profile?.fotoPerfil || profile?.photoURL) && (
                    <>
                      <button
                        type="button"
                        onClick={() => setFullscreenPhotoModal({ url: profile.fotoPerfil || profile.photoURL, name: profile?.nome || 'Minha Foto' })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                        title="Ver foto em tamanho inteiro"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Ver</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={isUploadingPhoto}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
                        title="Remover foto de perfil"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remover</span>
                      </button>
                    </>
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {profile?.nome || 'Utilizador Moçambicano'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {profile?.email || user.email || 'utilizador@taprise.co.mz'}
                  </p>
                  <p className="text-xs font-semibold text-blue-600 mt-0.5">
                    {profile?.provincia || 'Moçambique'}
                  </p>
                </div>
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Conta Operacional Verificada (+18 Anos)</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Dados do Investidor
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Nome Completo:</span>
                    <span className="font-bold text-slate-800">{profile?.nome || 'Investidor TapRise'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">E-mail:</span>
                    <span className="font-bold text-slate-800">{profile?.email || user.email}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Idade Registada:</span>
                    <span className="font-bold text-slate-800">{profile?.idade || 18} anos</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Província:</span>
                    <span className="font-bold text-blue-700">{profile?.provincia || 'Maputo Cidade'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">N.º da Conta / ID de Negociação:</span>
                    <span className="font-mono text-slate-700 truncate max-w-[200px]">{user.uid}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Saldo Disponível:</span>
                    <span className="font-black text-blue-600">{formatMT(balance)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Património Operacional:</span>
                    <span className="font-black text-slate-900">{formatMT(portfolioValue)}</span>
                  </div>
                </div>
              </div>

              {/* CONVITE & AFILIADOS (Compacto & Profissional MT5) */}
              <div className="bg-gradient-to-br from-[#1d4ed8] via-[#1e40af] to-[#1e3a8a] text-white p-4 rounded-2xl shadow-sm border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/15 text-amber-300 flex items-center justify-center font-black text-xs">
                      5%
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight">Programa de Convites & Bónus</h3>
                      <p className="text-[10px] text-blue-200">5% creditado após 1º depósito do convidado (mín. 1.000 MT)</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-300/30">
                    Bónus 5%
                  </span>
                </div>

                {/* KPI Estatísticas em 2 Colunas Compactas */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                    <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-blue-200">
                      <UserCheck className="w-3 h-3 text-emerald-300" />
                      <span>Convidados Ativos</span>
                    </div>
                    <p className="text-lg font-black text-white mt-0.5 leading-none">{activeDepositedInvitedCount}</p>
                    <span className="text-[9px] text-blue-200/70">Com 1º depósito</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                    <div className="flex items-center gap-1 text-[9px] uppercase font-bold text-blue-200">
                      <Coins className="w-3 h-3 text-amber-300" />
                      <span>Comissões Recebidas</span>
                    </div>
                    <p className="text-lg font-black text-amber-300 mt-0.5 leading-none">{formatMT(totalCommissionsEarned)}</p>
                    <span className="text-[9px] text-blue-200/70">Saldo disponível</span>
                  </div>
                </div>

                {/* Campo Compacto de Link de Convite com Cópia Direta */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-blue-200 px-0.5">
                    <span>Link Exclusivo de Indicação:</span>
                    <span>Código: <strong className="text-white font-mono">{displayInviteCode}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-xl border border-white/15">
                    <input
                      type="text"
                      readOnly
                      value={`https://taprise.pages.dev/register?ref=${displayInviteCode}`}
                      className="flex-1 bg-transparent text-white font-mono text-[11px] px-2 py-1 select-all focus:outline-none truncate"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyText(`https://taprise.pages.dev/register?ref=${displayInviteCode}`, 'Link de Convite')}
                      className="px-3 py-1.5 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs rounded-lg transition flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                    >
                      {copiedField === 'Link de Convite' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 text-[10px]">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[10px]">Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Barra de Afiliados Oficiais (+20 Ativos = Salário Semanal) */}
                <div className="p-2.5 bg-black/25 rounded-xl border border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1 text-amber-200">
                      <Award className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span className="font-bold">Afiliado Oficial (+20 ativos = Salário Semanal)</span>
                    </div>
                    {activeDepositedInvitedCount >= 20 ? (
                      <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[9px] font-black uppercase rounded-full">
                        Ativo
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-amber-300">{Math.min(20, activeDepositedInvitedCount)}/20</span>
                    )}
                  </div>
                  <div className="w-full bg-white/15 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-300"
                      style={{ width: `${Math.min(100, (activeDepositedInvitedCount / 20) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Infraestrutura e Acesso */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Infraestrutura e Custódia do Sistema
                    </h3>
                  </div>
                  <span className="flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Servidor Operacional</span>
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Nó de Negociação:</span>
                    <span className="font-mono font-bold text-slate-800">TR-BVM-CORE-01</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Protocolo de Segurança:</span>
                    <span className="font-mono text-slate-700">TLS 1.3 / Encriptação Bancária 256-bit</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Sincronização de Ordens:</span>
                    <span className="text-emerald-600 font-bold">Ativa em tempo real</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Terminar Sessão</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR (FIXED BOTTOM MT5) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200/90 z-40 px-2 py-1.5 flex justify-around items-center shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        {[
          { id: 'inicio', label: 'Início', icon: BarChart2 },
          { id: 'mercados', label: 'Mercados', icon: TrendingUp },
          { id: 'carteira', label: 'Carteira', icon: Briefcase },
          { id: 'perfil', label: 'Perfil', icon: User }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'inicio' | 'mercados' | 'carteira' | 'perfil')}
              className={`flex-1 flex flex-col items-center py-1 px-1 rounded-xl transition cursor-pointer ${
                isActive ? 'text-[#2563eb] font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1 rounded-lg transition ${isActive ? 'bg-blue-50 text-[#2563eb]' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] mt-0.5 leading-none ${isActive ? 'font-bold text-[#2563eb]' : 'font-medium'}`}>{tab.label}</span>
            </button>
          );
        })}
        <Link
          href="/chat"
          prefetch={true}
          className="flex-1 flex flex-col items-center py-1 px-1 rounded-xl transition text-slate-500 hover:text-blue-600 font-medium relative cursor-pointer"
          title="Grupo Chat Ao Vivo"
        >
          <div className="relative p-1 rounded-lg">
            <MessageCircle className="w-5 h-5 text-slate-600" />
            {unreadChatCount > 0 ? (
              <span className="absolute -top-1 -right-2 px-1.5 py-0.5 bg-emerald-500 text-white font-black text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-md animate-in zoom-in-50 leading-none">
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            ) : (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 leading-none font-medium">Chat</span>
        </Link>
      </nav>

      {/* MT5 FULLSCREEN TRADING TERMINAL MODAL */}
      {fullscreenAsset && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="max-w-5xl w-full mx-auto bg-[#0b0f19] border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto">
            {/* Header Barra Superior MT5 */}
            <div className="flex flex-wrap items-center justify-between p-3.5 sm:p-5 border-b border-slate-800/90 gap-3 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFullscreenAsset(null)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition cursor-pointer shrink-0"
                  title="Fechar Terminal (Voltar à Lista)"
                >
                  <X className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black font-mono px-2 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-md">
                      {fullscreenAsset.symbol}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white">{fullscreenAsset.name}</h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      Terminal Cotações Ao Vivo
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs font-mono">
                    <span className="text-white font-black text-sm">{formatMT(fullscreenAsset.price)}</span>
                    <span className={`font-bold ${fullscreenAsset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {fullscreenAsset.change24h >= 0 ? '+' : ''}{fullscreenAsset.change24h.toFixed(2)}%
                    </span>
                    <span className="text-slate-400 hidden sm:inline">• {fullscreenAsset.category}</span>
                  </div>
                </div>
              </div>

              {/* Botões Comprar / Vender no Topo do Terminal */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAssetId(fullscreenAsset.id);
                    setTradeSide('BUY');
                    setIsTradeModalOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Comprar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAssetId(fullscreenAsset.id);
                    setTradeSide('SELL');
                    setIsTradeModalOpen(true);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Vender</span>
                </button>
              </div>
            </div>

            {/* Gráfico Interativo com Grade Técnica, Timeframes e Barra OHLC */}
            <div className="p-2 sm:p-4">
              <InteractiveChart
                commodity={fullscreenAsset}
                chartType={selectedChartType}
                timeframe={selectedTimeframe}
                onTimeframeChange={(tf) => setSelectedTimeframe(tf)}
                onChartTypeChange={(ct) => setSelectedChartType(ct)}
                height={380}
              />
            </div>

            {/* Rodapé Informativo MT5 */}
            <div className="px-4 sm:px-5 py-3 bg-slate-950/90 border-t border-slate-800/80 flex flex-wrap justify-between items-center text-xs text-slate-400 gap-3">
              <div className="flex items-center gap-4 text-[11px] font-mono">
                <span>Máx 24h: <strong className="text-slate-200">{formatMT(fullscreenAsset.high)}</strong></span>
                <span>Mín 24h: <strong className="text-slate-200">{formatMT(fullscreenAsset.low)}</strong></span>
                <span>Unidade: <strong className="text-slate-200">{fullscreenAsset.unit}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setFullscreenAsset(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Fechar Terminal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER EXECUTION MODAL */}
      {isTradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {tradeSide === 'BUY' ? 'Comprar' : 'Vender'} {selectedAsset.name}
                </h3>
                <p className="text-xs text-slate-400">Moeda da Operação: Meticais Moçambicanos (MT)</p>
              </div>
              <button
                onClick={() => setIsTradeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Preço de Mercado Atual:</span>
                <span className="text-sm font-black text-slate-900">{formatMT(selectedAsset.price)}</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Quantidade a Negociar ({selectedAsset.unit})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={tradeQty}
                    onChange={(e) => setTradeQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-3 bg-slate-100 border-0 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <div className="flex gap-1">
                    {[1, 5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setTradeQty(num)}
                        className={`px-2.5 py-3 text-xs font-bold rounded-xl border transition cursor-pointer ${
                          tradeQty === num
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs border-t border-slate-100 pt-3">
                <div className="flex justify-between text-slate-500">
                  <span>Valor Total da Posição:</span>
                  <span className="font-bold text-slate-800">{formatMT(selectedAsset.price * tradeQty)}</span>
                </div>
                {tradeSide === 'SELL' && (
                  <div className="flex justify-between text-amber-600">
                    <span>Margem Necessária (20%):</span>
                    <span className="font-bold">{formatMT(selectedAsset.price * tradeQty * 0.2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Saldo Disponível:</span>
                  <span className={`font-bold ${balance <= 0 ? 'text-amber-600' : 'text-blue-600'}`}>{formatMT(balance)}</span>
                </div>
              </div>

              {isTradingDisabled && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{tradingDisabledReason}</span>
                </div>
              )}
              {balance <= 0 && !isTradingDisabled && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Conta sem saldo operacional (0,00 MT). Aguarde a atribuição pelo administrador.</span>
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setIsTradeModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeTrade}
                  disabled={isTradingDisabled || balance <= 0}
                  className={`flex-1 py-3 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                    tradeSide === 'BUY'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isTradingDisabled
                    ? 'Mercado Indisponível'
                    : balance <= 0
                    ? 'Aguardando Saldo'
                    : `Confirmar ${tradeSide === 'BUY' ? 'Compra' : 'Venda'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DEPÓSITO VIA E-MOLA */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                  <Coins className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Depósito via e-Mola (Movitel)
                  </h3>
                  <p className="text-xs text-slate-500">Recarga Oficial • Moçambique (+258)</p>
                </div>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                    Número e-Mola
                  </span>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-100/70 px-2 py-0.5 rounded-full">
                    Movitel
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono text-sm">+258</span>
                    <span className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-slate-900">
                      877083749
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText('877083749', 'Número e-Mola')}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedField === 'Número e-Mola' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Nome de Confirmação
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/70 px-2 py-0.5 rounded-full">
                    Titular Oficial
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">
                    ELIZABETE NHATSUNGUE
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText('ELIZABETE NHATSUNGUE', 'Nome')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedField === 'Nome' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold text-[11px] text-amber-950">
                    Depósito Mínimo Obrigatório: 1.000,00 MT
                  </p>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    O valor mínimo de recarga é de <strong>1.000,00 MT</strong>. Valores inferiores não são aceites pelo sistema.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-600 space-y-1.5">
                <p className="font-bold text-slate-800">Instruções no telemóvel:</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                  <li>Disque <strong>*898#</strong> ou aceda à app e-Mola.</li>
                  <li>Escolha <strong>Transferir Dinheiro</strong> para <strong>877083749</strong>.</li>
                  <li>Confirme o nome <strong>ELIZABETE NHATSUNGUE</strong>, digite o valor (mínimo <strong>1.000,00 MT</strong>) e conclua com o seu PIN.</li>
                </ol>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 text-xs space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-xs">
                      Envie o comprovativo no Privado do Admin!
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Após realizar a transferência no seu telemóvel, tire uma <strong>captura de tela</strong> da mensagem SMS de confirmação recebida e envie no <strong>chat privado do Administrador</strong>.
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <Link
                    href="/chat?tab=privado"
                    onClick={() => setIsDepositModalOpen(false)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer text-center"
                  >
                    <MessageCircle className="w-4 h-4 text-white" />
                    <span>Abrir Chat Privado com o Admin</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SOLICITAÇÃO DE LEVANTAMENTO */}
      {isWithdrawalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Levantamento de Fundos TapRise
                  </h3>
                  <p className="text-xs text-slate-500">M-Pesa (Vodacom) ou e-Mola (Movitel)</p>
                </div>
              </div>
              <button
                onClick={() => setIsWithdrawalModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
              withdrawalWindow.isOpen
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <Clock className={`w-4 h-4 shrink-0 mt-0.5 ${withdrawalWindow.isOpen ? 'text-emerald-600' : 'text-amber-600'}`} />
              <div className="space-y-0.5">
                <p className="font-bold">
                  {withdrawalWindow.isOpen ? 'Janela de Levantamento Aberta' : 'Janela Fechada (Abre às 08:00)'}
                </p>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  Os levantamentos processam-se exclusivamente das <strong>08:00 às 12:00</strong> todos os dias (Hora de Moçambique Maputo). Tempo de espera bancário: <strong>2 a 3 horas</strong>.
                </p>
              </div>
            </div>

            <form onSubmit={handleExecuteWithdrawal} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  1. Selecione a Operadora de Pagamento
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setWithdrawalMethod('mpesa');
                      if (withdrawalPhone.startsWith('86') || withdrawalPhone.startsWith('87')) {
                        setWithdrawalPhone('');
                      }
                    }}
                    className={`p-3.5 rounded-2xl border-2 text-left transition flex items-center justify-between cursor-pointer ${
                      withdrawalMethod === 'mpesa'
                        ? 'border-rose-500 bg-rose-50/50 shadow-sm ring-2 ring-rose-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                        <strong className="text-xs text-slate-900">M-Pesa</strong>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Vodacom (84 / 85)</span>
                    </div>
                    {withdrawalMethod === 'mpesa' && (
                      <CheckCircle2 className="w-4 h-4 text-rose-600" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWithdrawalMethod('emola');
                      if (withdrawalPhone.startsWith('84') || withdrawalPhone.startsWith('85')) {
                        setWithdrawalPhone('');
                      }
                    }}
                    className={`p-3.5 rounded-2xl border-2 text-left transition flex items-center justify-between cursor-pointer ${
                      withdrawalMethod === 'emola'
                        ? 'border-amber-500 bg-amber-50/50 shadow-sm ring-2 ring-amber-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                        <strong className="text-xs text-slate-900">e-Mola</strong>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Movitel (86 / 87)</span>
                    </div>
                    {withdrawalMethod === 'emola' && (
                      <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  2. Número de Telemóvel ({withdrawalMethod === 'mpesa' ? 'Prefixo 84 ou 85' : 'Prefixo 86 ou 87'})
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-xs font-mono font-bold">
                    +258
                  </div>
                  <input
                    type="tel"
                    maxLength={9}
                    placeholder={withdrawalMethod === 'mpesa' ? '841234567' : '861234567'}
                    value={withdrawalPhone}
                    onChange={(e) => setWithdrawalPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    className="w-full pl-16 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  3. Nome Completo de Confirmação (Titular da Conta)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Armando Celso Cossa"
                  value={withdrawalName}
                  onChange={(e) => setWithdrawalName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  O nome deve corresponder exatamente ao titular registado na operadora móvel.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    4. Montante a Levantar (MT)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Mínimo: <strong className="text-slate-800">300 MT</strong> • Máx: <strong className="text-slate-800">2.000 MT</strong>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="50"
                    min="300"
                    max="2000"
                    placeholder="300"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    MT
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[300, 500, 1000, 2000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWithdrawalAmount(preset.toString())}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      {preset === 2000 ? '2.000 MT (Máx)' : `+${preset.toLocaleString('pt-MZ')} MT`}
                    </button>
                  ))}
                  {withdrawableBalance >= 300 && (
                    <button
                      type="button"
                      onClick={() => setWithdrawalAmount(withdrawableBalance.toString())}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-700 transition cursor-pointer"
                    >
                      Máximo Permitido ({formatMT(withdrawableBalance)})
                    </button>
                  )}
                </div>
              </div>

              {(() => {
                const amt = parseFloat(withdrawalAmount) || 0;
                const feeAmt = Math.round(amt * 0.05 * 100) / 100;
                const debAmt = amt + feeAmt;
                const remBal = balance - debAmt;
                const isShort = remBal < 1000;
                const isOverMax = amt > 2000;

                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Saldo Atual:</span>
                      <span className="font-mono font-bold text-slate-800">{formatMT(balance)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Valor do Levantamento (a receber):</span>
                      <span className="font-mono font-bold text-blue-600">
                        {formatMT(amt)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Taxa Operacional (5% cortada do saldo):</span>
                      <span className="font-mono font-bold text-amber-600">
                        +{formatMT(feeAmt)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-700">
                      <span>Total Cortado da Conta:</span>
                      <span className="font-mono font-bold text-rose-600">
                        -{formatMT(debAmt)}
                      </span>
                    </div>
                    <div className="h-px bg-slate-200 my-1"></div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-700">Saldo que Sobra na Conta:</span>
                      <span className={`font-mono font-black ${!isShort ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatMT(remBal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Reserva Mínima Obrigatória:</span>
                      <span className="font-mono font-bold text-amber-700">1.000,00 MT</span>
                    </div>

                    {isOverMax && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-semibold flex items-start gap-1.5 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>Atenção: O valor máximo por levantamento é de 2.000,00 MT a cada pedido.</span>
                      </div>
                    )}

                    {isShort && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-semibold flex items-start gap-1.5 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>Atenção: O levantamento será recusado porque devem sempre sobrar pelo menos 1.000,00 MT na conta após o valor e a taxa de 5%.</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {isWithdrawalCooldownActive ? (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Período de Segurança (Intervalo de 3 Dias Ativo)</p>
                    <p className="text-amber-800 mt-0.5">
                      Só é permitido solicitar 1 levantamento a cada 3 dias. Próximo pedido disponível em: <strong>{getCooldownLabel(remainingCooldownMs)}</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-[11px] text-blue-900 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <span><strong>Prazo de Envio:</strong> 2 a 3 horas após confirmação (1 levantamento a cada 3 dias).</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                    Disponível
                  </span>
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawalModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    withdrawalSubmitting ||
                    isWithdrawalCooldownActive ||
                    !withdrawalWindow.isOpen ||
                    parseFloat(withdrawalAmount) < 300 ||
                    parseFloat(withdrawalAmount) > 2000 ||
                    balance - ((parseFloat(withdrawalAmount) || 0) * 1.05) < 1000 ||
                    withdrawalPhone.length !== 9 ||
                    !withdrawalName.trim()
                  }
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-2xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {withdrawalSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>A Submeter Pedido...</span>
                    </>
                  ) : isWithdrawalCooldownActive ? (
                    <span>Disponível em {getCooldownLabel(remainingCooldownMs)}</span>
                  ) : !withdrawalWindow.isOpen ? (
                    <span>Janela Fechada (Abre 08h)</span>
                  ) : parseFloat(withdrawalAmount) > 2000 ? (
                    <span>Máximo Permitido: 2.000 MT</span>
                  ) : balance - ((parseFloat(withdrawalAmount) || 0) * 1.05) < 1000 ? (
                    <span>Reserva Insuficiente (&lt; 1.000 MT)</span>
                  ) : (
                    <span>Confirmar Levantamento</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE SUCESSO DO LEVANTAMENTO */}
      {withdrawalSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Pedido Submetido com Sucesso
              </span>
              <h3 className="text-xl font-black text-slate-900 pt-1">
                Levantamento Registado!
              </h3>
              <p className="text-xs text-slate-500">
                A solicitação foi encaminhada para a mesa de liquidação TapRise
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 text-left space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wide">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Tempo de Espera: 2 a 3 Horas</span>
              </div>
              <p className="text-xs text-amber-950 leading-relaxed font-medium">
                Por favor, <strong>aguarde entre 2 a 3 horas</strong> para que o montante seja validado e enviado para a sua carteira móvel <strong>{withdrawalSuccessData.operator}</strong>.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Montante a Receber:</span>
                <span className="font-mono font-black text-emerald-600 text-sm">
                  {formatMT(withdrawalSuccessData.amount)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Operadora Móvel:</span>
                <span className="font-bold text-slate-800">{withdrawalSuccessData.operator}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Número de Destino:</span>
                <span className="font-mono font-bold text-slate-800">+258 {withdrawalSuccessData.phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Titular Confirmado:</span>
                <span className="font-semibold text-slate-800">{withdrawalSuccessData.name}</span>
              </div>
              <div className="flex justify-between py-1 items-center">
                <span className="text-slate-500">Protocolo Central:</span>
                <span className="font-mono text-[11px] bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                  {withdrawalSuccessData.id.slice(0, 12)}...
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setWithdrawalSuccessData(null);
                setCarteiraSubTab('levantamentos');
              }}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-2xl shadow-md transition cursor-pointer"
            >
              Compreendi, Voltar à Carteira
            </button>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAÇÃO DE FOTO DE PERFIL EM TAMANHO GRANDE */}
      {fullscreenPhotoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setFullscreenPhotoModal(null)}
        >
          <div
            className="relative max-w-sm sm:max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-4 sm:p-5 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                <h4 className="text-sm font-bold text-white truncate">{fullscreenPhotoModal.name}</h4>
              </div>
              <button
                type="button"
                onClick={() => setFullscreenPhotoModal(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full aspect-square max-w-[320px] max-h-[320px] my-4 rounded-2xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center shadow-inner">
              <img
                src={fullscreenPhotoModal.url}
                alt={fullscreenPhotoModal.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="w-full flex items-center justify-between gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setFullscreenPhotoModal(null);
                  profilePhotoInputRef.current?.click();
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition cursor-pointer text-center"
              >
                Alterar Esta Foto
              </button>
              <button
                type="button"
                onClick={() => setFullscreenPhotoModal(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
