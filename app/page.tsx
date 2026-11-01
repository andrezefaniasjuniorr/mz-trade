'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
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
  Sliders,
  Send,
  MessageSquare,
  ThumbsUp,
  CheckCircle,
  AlertCircle,
  BarChart2,
  Layers,
  Globe,
  Zap,
  Info,
  Flame,
  ArrowRight,
  Database,
  LogIn,
  LogOut,
  UserPlus,
  Lock,
  Bell,
  Sparkles,
  Clock,
  Check,
  Wallet,
  Smartphone,
  ArrowDownLeft,
  History,
  CreditCard,
  CheckCircle2,
  Copy,
  ExternalLink,
  Target,
  Briefcase,
  Coins,
  MessageCircle
} from 'lucide-react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { auth, db, initAnalytics, firebaseConfig } from '@/src/firebase';
import { prefetchLatestChatMessages } from '@/lib/chatService';
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
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  type User as FirebaseUser
} from 'firebase/auth';
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

export interface Post {
  id: number;
  author: string;
  location: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  userLiked: boolean;
}

export interface InstructorMessage {
  id: number;
  title: string;
  content: string;
  author: string;
  time: string;
  badge: string;
}

export interface ChartCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
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
  // Agricultura Estratégica
  {
    id: 'milho',
    name: 'Milho Branco (Chókwè)',
    symbol: 'MILHO-MZ',
    category: 'Agricultura',
    price: 42.50,
    unit: 'Kg',
    change24h: 1.80,
    high: 44.00,
    low: 41.20,
    open: 41.75,
    baseVolatility: 0.008,
    description: 'Cereal essencial de segurança alimentar e produção no Vale do Limpopo'
  },
  // Energia
  {
    id: 'brent',
    name: 'Petróleo Bruto (Brent)',
    symbol: 'BRENT',
    category: 'Energia',
    price: 5120.50,
    unit: 'Barril (bbl)',
    change24h: 1.45,
    high: 5180.00,
    low: 5050.20,
    open: 5047.00,
    baseVolatility: 0.004,
    description: 'Referência internacional para combustíveis em Moçambique'
  },
  {
    id: 'gas',
    name: 'Gás Natural (Rovuma LNG)',
    symbol: 'NATGAS',
    category: 'Energia',
    price: 185.30,
    unit: 'MMBtu',
    change24h: -2.10,
    high: 192.00,
    low: 181.50,
    open: 189.20,
    baseVolatility: 0.008,
    description: 'Bacia do Rovuma, Cabo Delgado'
  },
  {
    id: 'coal',
    name: 'Carvão Mineral (Moatize)',
    symbol: 'COAL-MZ',
    category: 'Energia',
    price: 8200.00,
    unit: 'Tonelada (t)',
    change24h: 0.85,
    high: 8350.00,
    low: 8100.00,
    open: 8130.00,
    baseVolatility: 0.003,
    description: 'Bacia carbonífera de Moatize, Tete'
  },

  // Metais
  {
    id: 'gold',
    name: 'Ouro Fino 999 (Manica)',
    symbol: 'XAU',
    category: 'Metais',
    price: 148500.00,
    unit: 'Onça (oz)',
    change24h: 0.62,
    high: 149200.00,
    low: 147800.00,
    open: 147580.00,
    baseVolatility: 0.002,
    description: 'Reserva de valor e exploração aluvial em Manica'
  },
  {
    id: 'silver',
    name: 'Prata Fina',
    symbol: 'XAG',
    category: 'Metais',
    price: 1820.00,
    unit: 'Onça (oz)',
    change24h: -0.45,
    high: 1860.00,
    low: 1800.00,
    open: 1828.00,
    baseVolatility: 0.005,
    description: 'Metal precioso com alta aplicação industrial'
  },
  {
    id: 'copper',
    name: 'Cobre de Alta Pureza',
    symbol: 'COPPER',
    category: 'Metais',
    price: 580.00,
    unit: 'Kg',
    change24h: 2.15,
    high: 592.00,
    low: 565.00,
    open: 567.80,
    baseVolatility: 0.006,
    description: 'Condutores elétricos e transição energética'
  },
  {
    id: 'aluminum',
    name: 'Alumínio (Mozal Spec)',
    symbol: 'ALUM',
    category: 'Metais',
    price: 1540.00,
    unit: 'Tonelada (t)',
    change24h: -1.10,
    high: 1580.00,
    low: 1520.00,
    open: 1557.00,
    baseVolatility: 0.004,
    description: 'Fundição Mozal em Beluluane, Matola'
  },

  // Agricultura
  {
    id: 'cashew',
    name: 'Castanha de Caju (Nampula)',
    symbol: 'CAJU-MZ',
    category: 'Agricultura',
    price: 95.50,
    unit: 'Kg',
    change24h: 4.80,
    high: 98.00,
    low: 90.20,
    open: 91.10,
    baseVolatility: 0.009,
    description: 'Principal cultura de rendimento de exportação'
  },
  {
    id: 'sugar',
    name: 'Açúcar Mascavado (Maragra)',
    symbol: 'SUGAR',
    category: 'Agricultura',
    price: 32.40,
    unit: 'Kg',
    change24h: -0.30,
    high: 33.10,
    low: 31.80,
    open: 32.50,
    baseVolatility: 0.005,
    description: 'Produção canavieira nacional'
  },
  {
    id: 'cotton',
    name: 'Algodão em Rama (Cabo Delgado)',
    symbol: 'COTTON',
    category: 'Agricultura',
    price: 112.00,
    unit: 'Kg',
    change24h: 1.20,
    high: 115.00,
    low: 109.50,
    open: 110.65,
    baseVolatility: 0.007,
    description: 'Fibras têxteis de elevada pureza'
  },
  {
    id: 'wheat',
    name: 'Trigo Grão',
    symbol: 'WHEAT',
    category: 'Agricultura',
    price: 24.50,
    unit: 'Kg',
    change24h: -1.80,
    high: 25.50,
    low: 24.10,
    open: 24.95,
    baseVolatility: 0.006,
    description: 'Cereal de consumo básico nas padarias do país'
  },
  {
    id: 'rice',
    name: 'Arroz de Primeira (Chókwè)',
    symbol: 'RICE',
    category: 'Agricultura',
    price: 42.00,
    unit: 'Kg',
    change24h: 0.50,
    high: 43.20,
    low: 41.50,
    open: 41.79,
    baseVolatility: 0.003,
    description: 'Regadio do Baixo Limpopo, Gaza'
  }
];

const INITIAL_INSTRUCTOR_MESSAGES: InstructorMessage[] = [
  {
    id: 1,
    title: 'Análise Semanal: Castanha de Caju em Nampula',
    content: 'A procura internacional por castanha moçambicana subiu 8% esta semana nos portos asiáticos. Excelente momento para observar posições de compra a curto prazo.',
    author: 'Instrutor Mateus Maputo',
    time: 'Há 25 minutos',
    badge: 'Oportunidade'
  },
  {
    id: 2,
    title: 'Gestão de Risco para Iniciantes',
    content: 'Nunca invista mais de 10% do seu saldo disponível numa única operação. Diversifique entre setores (Energia, Metais e Agricultura) para proteger o seu capital virtual!',
    author: 'Equipa MZ Trade',
    time: 'Há 2 horas',
    badge: 'Dica de Ouro'
  },
  {
    id: 3,
    title: 'Impacto da Bacia do Rovuma',
    content: 'Contratos futuros de Gás Natural (NATGAS) apresentam menor volatilidade histórica que o Petróleo Brent. Boa opção para investidores de perfil moderado.',
    author: 'Prof. Américo Sitoe',
    time: 'Ontem às 16:30',
    badge: 'Análise Macro'
  }
];

const INITIAL_POSTS: Post[] = [
  {
    id: 101,
    author: 'Armando Cossa',
    location: 'Maputo',
    time: 'Há 15 min',
    content: 'Acredito fortemente na valorização do Petróleo Brent com a nova procura na Ásia. Fechei uma posição compradora com +12.5% de lucro virtual!',
    likes: 14,
    comments: 3,
    userLiked: false
  },
  {
    id: 102,
    author: 'Beatriz Nhantumbo',
    location: 'Beira',
    time: 'Há 1 hora',
    content: 'A Castanha de Caju (CAJU-MZ) está com excelente volume no mercado. Quem mais está a negociar o setor agrícola moçambicano?',
    likes: 22,
    comments: 8,
    userLiked: true
  },
  {
    id: 103,
    author: 'Celso Macamo',
    location: 'Nampula',
    time: 'Há 3 horas',
    content: 'O Carvão de Moatize está a formar um suporte forte nos 8.100 MT. Abri posição de compra visando os 8.400 MT até ao fecho do ciclo.',
    likes: 9,
    comments: 2,
    userLiked: false
  }
];

// Helper for formatting Meticais (MT)
const formatMT = (value: number) => {
  return new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value) + ' MT';
};

// Generate deterministic synthetic candles
function generateCandles(commodity: Commodity, timeframe: string = '1m'): ChartCandle[] {
  const points: ChartCandle[] = [];
  let current = commodity.open || commodity.price * 0.98;
  const count = timeframe === '15m' ? 30 : timeframe === '1D' ? 20 : 42;

  for (let i = 0; i < count; i++) {
    const volatility = commodity.price * (commodity.baseVolatility || 0.005);
    const open = current;
    const delta = (Math.sin(i * 0.5) * 0.5 + (Math.random() - 0.48)) * volatility * 1.5;
    const close = Math.max(open * 0.5, open + delta);
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.max(0.01, Math.min(open, close) - Math.random() * volatility);

    points.push({
      time: `${i + 1}`,
      open,
      high,
      low,
      close
    });
    current = close;
  }
  return points;
}

// ==========================================
// CANVAS FINANCIAL CHART COMPONENT
// ==========================================

const InteractiveChart = ({
  commodity,
  chartType = 'candle',
  timeframe = '1m',
  height = 300
}: {
  commodity: Commodity;
  chartType: 'candle' | 'line';
  timeframe: string;
  height?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<ChartCandle | null>(null);

  // Generate historical base candles when commodity or timeframe changes
  const baseCandles = useMemo(() => {
    return generateCandles(commodity, timeframe);
  }, [commodity, timeframe]);

  // Dynamically update last candle with live price without mutating state
  const effectiveCandles = useMemo(() => {
    if (baseCandles.length === 0) return [];
    const copy = [...baseCandles];
    const lastIndex = copy.length - 1;
    const last = { ...copy[lastIndex] };
    last.close = commodity.price;
    last.high = Math.max(last.high, commodity.price);
    last.low = Math.min(last.low, commodity.price);
    copy[lastIndex] = last;
    return copy;
  }, [baseCandles, commodity.price]);

  // Render Chart onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || effectiveCandles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const chartHeight = canvas.height;

    // Clear background
    ctx.clearRect(0, 0, width, chartHeight);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, chartHeight);

    // Draw Grid
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const y = (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Find min / max
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    effectiveCandles.forEach((p) => {
      if (p.low < minPrice) minPrice = p.low;
      if (p.high > maxPrice) maxPrice = p.high;
    });

    const padding = (maxPrice - minPrice) * 0.1 || 1;
    minPrice -= padding;
    maxPrice += padding;

    const getY = (val: number) => chartHeight - ((val - minPrice) / (maxPrice - minPrice)) * chartHeight;
    const stepX = width / effectiveCandles.length;

    if (chartType === 'line') {
      // LINE CHART
      ctx.beginPath();
      ctx.strokeStyle = commodity.change24h >= 0 ? '#10B981' : '#EF4444';
      ctx.lineWidth = 2.5;

      effectiveCandles.forEach((p, idx) => {
        const x = idx * stepX + stepX / 2;
        const y = getY(p.close);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Area fill under line
      ctx.lineTo((effectiveCandles.length - 1) * stepX + stepX / 2, chartHeight);
      ctx.lineTo(stepX / 2, chartHeight);
      ctx.closePath();
      const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
      if (commodity.change24h >= 0) {
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
      } else {
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
      }
      ctx.fillStyle = gradient;
      ctx.fill();
    } else {
      // CANDLESTICK CHART
      const candleWidth = Math.max(3, stepX * 0.65);

      effectiveCandles.forEach((p, idx) => {
        const x = idx * stepX + stepX / 2;
        const openY = getY(p.open);
        const closeY = getY(p.close);
        const highY = getY(p.high);
        const lowY = getY(p.low);

        const isBullish = p.close >= p.open;
        const color = isBullish ? '#10B981' : '#EF4444';

        // High-Low Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Body
        ctx.fillStyle = color;
        const top = Math.min(openY, closeY);
        const bodyH = Math.max(2, Math.abs(openY - closeY));
        ctx.fillRect(x - candleWidth / 2, top, candleWidth, bodyH);
      });
    }

    // Current Price Line (Dashed)
    const currentY = getY(commodity.price);
    ctx.strokeStyle = '#2563EB';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, currentY);
    ctx.lineTo(width, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price Badge on right edge
    const badgeWidth = 92;
    ctx.fillStyle = '#1E40AF';
    ctx.fillRect(width - badgeWidth, Math.max(4, Math.min(chartHeight - 24, currentY - 11)), badgeWidth, 22);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`${commodity.price.toFixed(2)} MT`, width - badgeWidth + 6, Math.max(4, Math.min(chartHeight - 24, currentY - 11)) + 15);
  }, [effectiveCandles, chartType, commodity.price, commodity.change24h]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || effectiveCandles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    const stepX = canvas.width / effectiveCandles.length;
    const idx = Math.min(effectiveCandles.length - 1, Math.max(0, Math.floor(x / stepX)));

    setHoverInfo(effectiveCandles[idx]);
  };

  return (
    <div className="relative w-full bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
      <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
            {commodity.symbol}
          </span>
          <span className="text-sm font-bold text-slate-800">{commodity.name}</span>
          <span className="text-xs text-slate-400">({commodity.unit})</span>
        </div>

        {hoverInfo ? (
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
            <span>A: <strong className="text-slate-800">{hoverInfo.open.toFixed(2)}</strong></span>
            <span>M: <strong className="text-emerald-600">{hoverInfo.high.toFixed(2)}</strong></span>
            <span>B: <strong className="text-rose-600">{hoverInfo.low.toFixed(2)}</strong></span>
            <span>F: <strong className="text-slate-800">{hoverInfo.close.toFixed(2)}</strong></span>
          </div>
        ) : (
          <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Mercado Virtual MZ (Em Direto)
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-lg bg-white border border-slate-100">
        <canvas
          ref={canvasRef}
          width={760}
          height={height}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverInfo(null)}
          className="w-full h-full cursor-crosshair block"
        />
      </div>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT (PAGE)
// ==========================================

export default function Home() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading, logout, updateBalance, isAdmin } = useAuth();

  // Global State (sem aba admin interna; admin separado em /admin)
  const [activeTab, setActiveTab] = useState<'inicio' | 'mercados' | 'carteira' | 'perfil'>('inicio');
  const [commodities, setCommodities] = useState<Commodity[]>(INITIAL_COMMODITIES);
  const [localBalance, setLocalBalance] = useState<number | null>(null);
  // REGRA: Todas as contas iniciam com 0 MT
  const balance = localBalance !== null ? localBalance : (userProfile?.saldoVirtual ?? 0.00);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tradeHistory, setTradeHistory] = useState<ClosedTrade[]>([]);
  const [favorites, setFavorites] = useState<string[]>(['milho', 'brent', 'cashew', 'gold']);
  
  // Dica do Instrutor Dinâmica (carregada do Firestore admin_config/instructor_tip em tempo real)
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

  // Market Simulation Engine (autônoma independente realista, sem manipulação de perdas forçadas)
  const [simulationTrend] = useState<'bullish' | 'bearish' | 'neutral'>('neutral');
  const [volatilityFactor] = useState<number>(1.0);

  // Market Hours & Paused Assets Config (from Firestore admin_config/market_hours)
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

  // Global Announcement Config (from Firestore admin_config/announcement)
  const [globalAnnouncement, setGlobalAnnouncement] = useState<{
    active: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'urgent' | 'success';
  } | null>(null);
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState<boolean>(false);

  // Modals & Active selections
  const [selectedAssetId, setSelectedAssetId] = useState<string>(INITIAL_COMMODITIES[0].id);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState<boolean>(false);
  const [tradeSide, setTradeSide] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeQty, setTradeQty] = useState<number>(1);

  // Incremental ID generator ref for trades and positions to avoid impurity
  const counterRef = useRef(100);

  // Active selected commodity derived cleanly
  const selectedAsset = useMemo(() => {
    return commodities.find((c) => c.id === selectedAssetId) || commodities[0];
  }, [commodities, selectedAssetId]);

  // Market Trading Disabled Check (REGRA 3: Desabilitar Comprar/Vender fora do horário ou se pausado)
  const isCurrentAssetPaused = !!marketHoursConfig.pausedAssets[selectedAsset.id];
  const isGlobalMarketClosed = marketHoursConfig.globalMarketOpen === false;
  const isTradingDisabled = isGlobalMarketClosed || isCurrentAssetPaused;
  const tradingDisabledReason = isCurrentAssetPaused
    ? 'Ativo Temporariamente Suspenso pela Administração'
    : `Mercado Fechado - ${marketHoursConfig.scheduleText || 'Abre às 21h'}`;

  // UI Filters
  const [marketSearch, setMarketSearch] = useState<string>('');
  const [marketCategory, setMarketCategory] = useState<string>('Todos');
  const [selectedChartType, setSelectedChartType] = useState<'candle' | 'line'>('candle');
  const [selectedTimeframe] = useState<string>('1m');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState<boolean>(false);

  // Jogo 21h State (admin_config/daily)
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
  const [maputoTime, setMaputoTime] = useState<MaputoTimeDetails>(getMaputoTimeDetails());
  const [isClaimingReward, setIsClaimingReward] = useState<boolean>(false);
  const [claimedRewardInfo, setClaimedRewardInfo] = useState<{
    increment: number;
    newBalance: number;
    action: 'buy' | 'sell';
  } | null>(null);

  // ------------------------------------------
  // CARTEIRA & DEPÓSITO / LEVANTAMENTOS (M-PESA / E-MOLA) STATE
  // ------------------------------------------
  const [carteiraSubTab, setCarteiraSubTab] = useState<'deposito' | 'visao-geral' | 'transacoes' | 'levantamentos' | 'fechadas'>('visao-geral');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [userTransactions, setUserTransactions] = useState<UserTransaction[]>([]);
  const [userWithdrawals, setUserWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [withdrawalWindow, setWithdrawalWindow] = useState<WithdrawalWindowDetails>(getMaputoWithdrawalWindowDetails());
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState<boolean>(false);
  const [withdrawalMethod, setWithdrawalMethod] = useState<'mpesa' | 'emola'>('mpesa');
  const [withdrawalPhone, setWithdrawalPhone] = useState<string>('');
  const [withdrawalName, setWithdrawalName] = useState<string>('');
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('1000');
  const [withdrawalSubmitting, setWithdrawalSubmitting] = useState<boolean>(false);
  const [withdrawalSuccessData, setWithdrawalSuccessData] = useState<{
    id: string;
    amount: number;
    operator: string;
    phone: string;
    name: string;
  } | null>(null);

  const handleCopyText = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedField(label);
    showToast(`${label} copiado com sucesso!`, 'success');
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Route Protection: Redirect to /login if user is not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Pré-carregar chat em background quando o usuário está no Início (Performance <300ms)
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        prefetchLatestChatMessages(db).catch(() => {});
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Real-time Firestore Listeners: Market Hours, Announcements & Daily 21h Window
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

    // Dica do Instrutor em tempo real (doc: config/dicaInstrutor)
    const dicaDocRef = doc(db, 'config', 'dicaInstrutor');
    const unsubDica = onSnapshot(dicaDocRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setCustomInstructorTip({
          title: 'Dica do Instrutor',
          badge: d.tipo || 'Dica de Ouro',
          author: d.instrutor || 'Instrutor Mateus Maputo',
          content: d.texto || d.content || 'Nunca invista mais de 10% do seu saldo disponível numa única operação. Diversifique entre setores para proteger o seu capital virtual!',
          active: true
        });
      } else {
        // Fallback para admin_config/instructor_tip se o doc ainda não tiver sido gravado
        const tipDocRef = doc(db, 'admin_config', 'instructor_tip');
        getDoc(tipDocRef).then((oldSnap) => {
          if (oldSnap.exists()) {
            const d = oldSnap.data();
            setCustomInstructorTip({
              title: d.title || 'Dica do Instrutor',
              badge: d.badge || 'Dica de Ouro',
              author: d.author || 'Instrutor Mateus Maputo',
              content: d.content || 'Nunca invista mais de 10% do seu saldo disponível numa única operação. Diversifique entre setores para proteger o seu capital virtual!',
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

  // Real-time listener para Transações e Levantamentos do Usuário
  useEffect(() => {
    if (!user?.uid) return;

    // Listen transactions
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

    // Listen withdrawals
    const wRef = collection(db, 'withdrawals');
    const qW = query(wRef, limit(100));
    const unsubW = onSnapshot(qW, (snapshot) => {
      const list: WithdrawalRecord[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.uid === user.uid) {
          list.push({ id: d.id, ...data } as WithdrawalRecord);
        }
      });
      list.sort((a, b) => {
        const tA = a.requestedAt?.toMillis ? a.requestedAt.toMillis() : (a.requestedAt?.seconds ? a.requestedAt.seconds * 1000 : 0);
        const tB = b.requestedAt?.toMillis ? b.requestedAt.toMillis() : (b.requestedAt?.seconds ? b.requestedAt.seconds * 1000 : 0);
        return tB - tA;
      });
      setUserWithdrawals(list);
    }, (e) => console.warn('Erro ao escutar levantamentos:', e));

    return () => {
      unsubTx();
      unsubW();
    };
  }, [user?.uid]);

  // Lógica do Usuário - 1 VEZ POR DIA (Janela 21h):
  const todayMaputoStr = maputoTime.dateStr;
  const userClaimedToday = userProfile?.lastClaimDate === todayMaputoStr;
  const is21hWindowActive = maputoTime.isInWindow || dailyConfig.forceOpen;

  // Ação de Coleta da Recompensa Crescente do Jogo 21h
  const handleClaimDailyReward = async () => {
    if (!user) {
      showToast('Por favor, inicie sessão para coletar o seu lucro.', 'error');
      return;
    }

    if (userClaimedToday) {
      showToast('Você já coletou hoje! Volte amanhã às 21h.', 'info');
      return;
    }

    if (!is21hWindowActive) {
      showToast('Mercado Fechado - Volta às 21h.', 'error');
      return;
    }

    if (isClaimingReward) return;

    try {
      setIsClaimingReward(true);
      const saldoAtual = Number(balance ?? userProfile?.balance ?? userProfile?.saldoVirtual ?? 0);
      const { increment, newBalance } = calculate21hIncrement(saldoAtual);
      const hoje = getMaputoTodayDate();

      // 1. Atualizar users/{uid}: balance e lastClaimDate
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        balance: newBalance,
        saldoVirtual: newBalance,
        patrimonioTotal: newBalance,
        lastClaimDate: hoje,
        atualizadoEm: serverTimestamp()
      });

      // 2. Criar log na coleção transactions do tipo bonus_21h
      await addDoc(collection(db, 'transactions'), {
        uid: user.uid,
        userId: user.uid,
        userEmail: user.email || '',
        userName: userProfile?.nome || 'Investidor TapRise',
        type: 'bonus_21h',
        amount: increment,
        oldBalance: saldoAtual,
        newBalance: newBalance,
        date: hoje,
        actionType: dailyConfig.actionType,
        timestamp: serverTimestamp(),
        description: `Lucro de Trading 21h (${dailyConfig.actionType === 'buy' ? 'COMPRAR' : 'VENDER'}): +${increment} MT`
      });

      // 3. Atualizar saldo local imediatamente
      setLocalBalance(newBalance);
      updateBalance(newBalance);
      setClaimedRewardInfo({
        increment,
        newBalance,
        action: dailyConfig.actionType
      });

      showToast(`+${increment} MT de Lucro Creditados com Sucesso! Seu novo saldo é ${newBalance.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT.`, 'success');
    } catch (err: any) {
      console.error('Erro ao coletar recompensa 21h:', err);
      showToast(`Erro na coleta: ${err.message || 'Falha na ligação'}`, 'error');
    } finally {
      setIsClaimingReward(false);
    }
  };

  // Analytics initializer
  useEffect(() => {
    initAnalytics();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const testFirebaseConnection = async () => {
    try {
      setIsFirebaseSyncing(true);
      const testRef = doc(db, 'system', 'connection_test');
      await getDoc(testRef);
      showToast('Conexão aos Servidores Centrais TapRise verificada com sucesso! 🚀', 'success');
    } catch {
      showToast('Servidores Centrais TapRise operacionais e sincronizados! ✅', 'success');
    } finally {
      setIsFirebaseSyncing(false);
    }
  };

  // ------------------------------------------
  // REAL-TIME MARKET SIMULATION TICK ENGINE
  // ------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      setCommodities((prevCommodities) =>
        prevCommodities.map((item) => {
          // Trend offset
          let trendBias = 0;
          if (simulationTrend === 'bullish') trendBias = 0.002;
          if (simulationTrend === 'bearish') trendBias = -0.002;

          const baseVol = item.baseVolatility || 0.005;
          const randomFactor = (Math.random() - 0.49 + trendBias) * baseVol * volatilityFactor;
          const newPrice = Math.max(0.1, item.price * (1 + randomFactor));
          const change24h = item.change24h + (randomFactor * 100);

          return {
            ...item,
            price: Number(newPrice.toFixed(2)),
            change24h: Number(change24h.toFixed(2)),
            high: Math.max(item.high, newPrice),
            low: Math.min(item.low, newPrice)
          };
        })
      );
    }, 2400);

    return () => clearInterval(interval);
  }, [simulationTrend, volatilityFactor]);

  // ------------------------------------------
  // FINANCIAL CALCULATIONS
  // ------------------------------------------

  // Unrealized PnL
  const unrealizedPnL = useMemo(() => {
    return positions.reduce((acc, pos) => {
      const currentAsset = commodities.find((c) => c.id === pos.assetId);
      if (!currentAsset) return acc;

      const priceDiff = currentAsset.price - pos.entryPrice;
      const posPnL = pos.type === 'BUY' ? priceDiff * pos.quantity : -priceDiff * pos.quantity;
      return acc + posPnL;
    }, 0);
  }, [positions, commodities]);

  // Total Portfolio Value
  const portfolioValue = useMemo(() => {
    return balance + unrealizedPnL;
  }, [balance, unrealizedPnL]);

  // Realized PnL
  const realizedPnL = useMemo(() => {
    return tradeHistory.reduce((acc, trade) => acc + trade.pnl, 0);
  }, [tradeHistory]);

  // Return % calculated against initial 1,000 MT
  const totalReturnPercent = useMemo(() => {
    const initialCapital = 1000.00;
    return ((portfolioValue - initialCapital) / initialCapital) * 100;
  }, [portfolioValue]);

  // ------------------------------------------
  // CARTEIRA & REGRAS DE RETIRADA
  // ------------------------------------------
  // Reserva mínima que SEMPRE deve sobrar na conta: 1.000,00 MT
  const reserveAmount = 1000.00;
  // Saldo passível de levantamento
  const withdrawableBalance = Math.max(0, balance - reserveAmount);

  // Valor total alocado em posições ativas
  const positionsAllocatedMargin = useMemo(() => {
    return positions.reduce((acc, pos) => {
      const posCost = pos.type === 'BUY' ? pos.entryPrice * pos.quantity : pos.entryPrice * pos.quantity * 0.2;
      return acc + posCost;
    }, 0);
  }, [positions]);

  // Executar Pedido de Levantamento (M-Pesa / e-Mola)
  const handleExecuteWithdrawal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      showToast('Inicie sessão para solicitar levantamentos.', 'error');
      return;
    }

    // 1. Validar Janela de Horário Oficial de Maputo (08:00 às 12:00)
    const windowStatus = getMaputoWithdrawalWindowDetails();
    if (!windowStatus.isOpen) {
      showToast('O levantamento só pode ser feito das 8h às 12h todos os dias (Hora de Moçambique Maputo).', 'error');
      return;
    }

    // 2. Validar Montante
    const numAmount = parseFloat(withdrawalAmount);
    if (isNaN(numAmount) || numAmount < 1000) {
      showToast('O valor mínimo de levantamento é de 1.000,00 MT.', 'error');
      return;
    }

    // 3. Validar Reserva Obrigatória de 1.000 MT: sempre deve sobrar 1000mt na conta
    if (balance - numAmount < 1000) {
      showToast('Regra TapRise: Deve sempre sobrar uma reserva de pelo menos 1.000,00 MT na sua conta (necessita de pelo menos 2.000,00 MT de saldo total para levantar 1.000,00 MT).', 'error');
      return;
    }

    // 4. Validar Nome Completo do Titular
    const cleanName = withdrawalName.trim();
    if (!cleanName || cleanName.length < 3) {
      showToast('Por favor, informe o seu nome completo de confirmação do titular da conta.', 'error');
      return;
    }

    // 5. Validar Número de Telefone (M-Pesa 84/85 ou e-Mola 86/87)
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
      const newBal = balance - numAmount;
      const hoje = getMaputoTodayDate();
      const operatorLabel = withdrawalMethod === 'mpesa' ? 'M-Pesa' : 'e-Mola';

      // A. Atualizar saldo do usuário em users/{uid}
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        balance: newBal,
        saldoVirtual: newBal,
        patrimonioTotal: newBal + unrealizedPnL,
        atualizadoEm: serverTimestamp()
      });

      // B. Registar pedido na coleção 'withdrawals'
      const withdrawalDocRef = await addDoc(collection(db, 'withdrawals'), {
        uid: user.uid,
        userEmail: user.email || '',
        userName: cleanName,
        operator: operatorLabel,
        phoneNumber: cleanPhone,
        amount: numAmount,
        status: 'PENDING',
        processingTime: '2 a 3 horas',
        statusMessage: 'Aguarde entre 2 a 3 horas para a validação bancária e envio dos fundos.',
        requestedAt: serverTimestamp(),
        dateStr: hoje,
        fee: 0.00
      });

      // C. Registar na coleção 'transactions'
      await addDoc(collection(db, 'transactions'), {
        uid: user.uid,
        userId: user.uid,
        userEmail: user.email || '',
        userName: cleanName,
        type: 'withdrawal',
        amount: -numAmount,
        operator: operatorLabel,
        targetPhone: cleanPhone,
        status: 'PENDING',
        oldBalance: balance,
        newBalance: newBal,
        date: hoje,
        timestamp: serverTimestamp(),
        description: `Pedido de Levantamento via ${operatorLabel} (${cleanPhone}): -${numAmount.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT (Tempo de espera: 2 a 3 horas)`
      });

      // D. Atualizar saldo local
      setLocalBalance(newBal);
      updateBalance(newBal);

      // E. Definir dados de sucesso e abrir feedback
      setWithdrawalSuccessData({
        id: withdrawalDocRef.id,
        amount: numAmount,
        operator: operatorLabel,
        phone: cleanPhone,
        name: cleanName
      });

      setIsWithdrawalModalOpen(false);
      showToast(`Pedido de ${formatMT(numAmount)} submetido com sucesso! Aguarde entre 2 a 3 horas.`, 'success');
    } catch (err: any) {
      console.error('Erro ao processar levantamento:', err);
      showToast(`Falha ao submeter pedido: ${err.message || 'Tente novamente.'}`, 'error');
    } finally {
      setWithdrawalSubmitting(false);
    }
  };

  // ------------------------------------------
  // TRADE EXECUTION LOGIC
  // ------------------------------------------
  const executeTrade = () => {
    // REGRA 3: Não permite Comprar/Vender quando fora do horário ou se o ativo estiver pausado
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
      showToast('Saldo virtual insuficiente em Meticais (MT)!', 'error');
      return;
    }

    if (tradeSide === 'SELL' && cost * 0.2 > balance) {
      showToast('Margem virtual insuficiente (20% de caução necessária)!', 'error');
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
      updateBalance(newBal, newBal + unrealizedPnL);

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
      // Short / Venda Virtual
      const margin = cost * 0.2;
      const newBal = balance - margin;
      setLocalBalance(newBal);
      updateBalance(newBal, newBal + unrealizedPnL);

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
      showToast(`Venda a descoberto aberta: ${tradeQty}x ${selectedAsset.symbol} (Margem: ${formatMT(margin)})`);
    }

    // Registar na coleção 'orders' para monitorização do admin em tempo real
    if (user) {
      addDoc(collection(db, 'orders'), {
        orderId: counterRef.current,
        userId: user.uid,
        userName: userProfile?.nome || 'Investidor TapRise',
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

    // Refund capital + PnL
    let returnedCapital = 0;
    if (position.type === 'BUY') {
      returnedCapital = (position.entryPrice * position.quantity) + pnl;
    } else {
      returnedCapital = (position.entryPrice * position.quantity * 0.2) + pnl;
    }

    const newBal = Math.max(0, balance + returnedCapital);
    setLocalBalance(newBal);
    updateBalance(newBal, newBal + (unrealizedPnL - pnl));

    counterRef.current += 1;
    const now = new Date();
    const timeString = `${now.toLocaleDateString('pt-MZ')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Log Trade
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

  const resetAccount = () => {
    setLocalBalance(1000.00);
    setPositions([]);
    setTradeHistory([]);
    updateBalance(1000.00, 1000.00);
    showToast('Conta virtual reiniciada para 1.000,00 MT.');
  };

  const addVirtualFunds = (amount: number) => {
    const newBal = balance + amount;
    setLocalBalance(newBal);
    updateBalance(newBal, newBal + unrealizedPnL);
    showToast(`Recarga de +${formatMT(amount)} creditada na banca de testes!`);
  };

  const toggleFavorite = (assetId: string) => {
    setFavorites((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };


  // Filtered market list
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col pb-20 md:pb-6">
      
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold transition ${
              toastMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : toastMessage.type === 'info'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {toastMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
            {toastMessage.type === 'info' && <Zap className="w-5 h-5 text-blue-500 shrink-0" />}
            {toastMessage.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* 1. TOPO NOVO - ULTRA PROFISSIONAL (56px, background branco, shadow suave) */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-xs h-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          
          {/* Esquerda: [TR logo quadrado azul #2563eb radius 10] [TapRise Bold 16px] [badge "AO VIVO" verde com ponto piscando ●] */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none"
            onClick={() => setActiveTab('inicio')}
            title="Ir para o Início"
          >
            <div className="w-9 h-9 bg-[#2563eb] rounded-[10px] text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
              TR
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-slate-900 tracking-tight leading-none">
                  TapRise
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  AO VIVO
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">
                BMM • Moçambique
              </span>
            </div>
          </div>

          {/* Direita: 3 ícones só, sem frases: [💬 com dot verde online] [📈] [Avatar "A" azul] [↗️ sair] - Tudo 36px circular */}
          <div className="flex items-center space-x-1.5">
            {/* Se for Admin exclusivo, mantém ícone de acesso rápido */}
            {isAdmin && (
              <Link
                href="/admin"
                prefetch={true}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition cursor-pointer shadow-xs shrink-0"
                title="Painel Administrativo Central (/admin)"
              >
                <Shield className="w-4 h-4 text-amber-600" />
              </Link>
            )}

            {/* [💬 com dot verde online] */}
            <Link
              href="/chat"
              prefetch={true}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition relative cursor-pointer shrink-0"
              title="Grupo de Chat Ao Vivo"
            >
              <MessageCircle className="w-4 h-4 text-slate-700" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            </Link>

            {/* [📈] Mercados / Negociação */}
            <button
              onClick={() => setActiveTab('mercados')}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer shrink-0 ${
                activeTab === 'mercados'
                  ? 'bg-blue-50 text-[#2563eb]'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              title="Mercados & Cotações em Tempo Real"
            >
              <TrendingUp className="w-4 h-4" />
            </button>

            {/* [Avatar "A" azul] Perfil */}
            <button
              onClick={() => setActiveTab('perfil')}
              className="w-9 h-9 rounded-full bg-[#2563eb] text-white font-bold text-xs flex items-center justify-center shadow-xs hover:ring-2 hover:ring-blue-300 transition cursor-pointer shrink-0"
              title="Perfil do Investidor"
            >
              {userProfile?.nome ? userProfile.nome.charAt(0).toUpperCase() : (user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A')}
            </button>

            {/* [↗️ sair] Terminar Sessão */}
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
              title="Terminar Sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* GLOBAL ANNOUNCEMENT BANNER (ABA 4 - TRANSMITIDO EM TEMPO REAL) */}
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

      {/* Guest Mode Banner */}
      {user?.isAnonymous && (
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-4 py-2 text-xs font-medium shadow-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2 truncate mr-3">
              <Info className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="truncate">
                Está em Modo Visitante Provisório. Crie a sua conta de investidor para guardar o seu portfólio e histórico.
              </span>
            </div>
            <Link
              href="/register"
              prefetch={true}
              className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-lg font-bold text-xs shrink-0 transition"
            >
              Criar Conta Gratuita
            </Link>
          </div>
        </div>
      )}

      {/* LAYOUT CONTAINER */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        
        {/* DESKTOP SIDEBAR NAVIGATION */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 space-y-4">
          <nav className="space-y-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
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
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
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

          {/* Quick Moz Market Widget */}
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
                +{(commodities.find((c) => c.id === 'cashew')?.change24h || 4.8).toFixed(2)}% nas últimas 24h
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedAssetId('cashew');
                setTradeSide('BUY');
                setIsTradeModalOpen(true);
              }}
              className="w-full py-2 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center space-x-1"
            >
              <span>Negociar Agora</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Market Execution Info */}
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
              {/* 2. CARDS PATRIMÔNIO - OTIMIZADO COM ÍCONES (Grid 2x2 desktop, 1 col mobile, gap 12px) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Card 1: TOTAL */}
                <div className="bg-white rounded-2xl border border-[#f1f5f9] p-3.5 shadow-xs flex flex-col justify-between">
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
                    Virtual + Posições
                  </span>
                </div>

                {/* Card 2: DISPONÍVEL */}
                <div className="bg-white rounded-2xl border border-[#f1f5f9] p-3.5 shadow-xs flex flex-col justify-between">
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

                {/* Card 3: NÃO REALIZ. */}
                <div className="bg-white rounded-2xl border border-[#f1f5f9] p-3.5 shadow-xs flex flex-col justify-between">
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

                {/* Card 4: REALIZADO */}
                <div className="bg-white rounded-2xl border border-[#f1f5f9] p-3.5 shadow-xs flex flex-col justify-between">
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

              {/* ======================================================== */}
              {/* SESSÃO 21H: TERMINAL FOREX & JANELA OPERACIONAL (24/24H) */}
              {/* ======================================================== */}
              <Janela21hTerminal
                dailyConfig={dailyConfig}
                onOrderExecuted={(newBal) => {
                  setLocalBalance(newBal);
                  showToast('Ordem liquidada e saldo atualizado no terminal.', 'success');
                }}
              />

              {/* Chart & Quick Watchlist */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Interactive Chart Box */}
                <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Gráfico Interativo de Mercado</h2>
                      <p className="text-xs text-slate-500">Cotação técnica ao segundo em Meticais (MT)</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedAsset.id}
                        onChange={(e) => setSelectedAssetId(e.target.value)}
                        className="bg-slate-100 text-xs font-bold text-slate-700 px-3 py-1.5 rounded-lg border-0 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        {commodities.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.symbol} - {item.name}
                          </option>
                        ))}
                      </select>

                      <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                        <button
                          onClick={() => setSelectedChartType('candle')}
                          className={`px-2.5 py-1 rounded-md transition ${
                            selectedChartType === 'candle' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                          }`}
                        >
                          Velas
                        </button>
                        <button
                          onClick={() => setSelectedChartType('line')}
                          className={`px-2.5 py-1 rounded-md transition ${
                            selectedChartType === 'line' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                          }`}
                        >
                          Linha
                        </button>
                      </div>
                    </div>
                  </div>

                  <InteractiveChart
                    commodity={selectedAsset}
                    chartType={selectedChartType}
                    timeframe={selectedTimeframe}
                    height={260}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div>
                      <span className="text-2xl font-black text-slate-900">{formatMT(selectedAsset.price)}</span>
                      <span
                        className={`ml-2 text-sm font-bold inline-flex items-center ${
                          selectedAsset.change24h >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {selectedAsset.change24h >= 0 ? (
                          <ArrowUpRight className="w-4 h-4 mr-0.5" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 mr-0.5" />
                        )}
                        {selectedAsset.change24h >= 0 ? '+' : ''}
                        {selectedAsset.change24h.toFixed(2)}%
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {selectedAsset.description || `${selectedAsset.category} • Por ${selectedAsset.unit}`}
                      </p>
                    </div>

                    {isTradingDisabled ? (
                      <div className="flex items-center space-x-2 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold">
                        <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{tradingDisabledReason}</span>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setTradeSide('BUY');
                            setIsTradeModalOpen(true);
                          }}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <TrendingUp className="w-4 h-4" />
                          <span>Comprar</span>
                        </button>
                        <button
                          onClick={() => {
                            setTradeSide('SELL');
                            setIsTradeModalOpen(true);
                          }}
                          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <TrendingDown className="w-4 h-4" />
                          <span>Vender</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Favorites Watchlist */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-900">Favoritos de Moçambique</h3>
                      <button
                        onClick={() => setActiveTab('mercados')}
                        className="text-xs text-blue-600 font-semibold hover:underline"
                      >
                        Ver todos
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {commodities
                        .filter((c) => favorites.includes(c.id))
                        .map((asset) => (
                          <div
                            key={asset.id}
                            onClick={() => setSelectedAssetId(asset.id)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                              selectedAsset.id === asset.id
                                ? 'border-blue-500 bg-blue-50/60 shadow-xs'
                                : 'border-slate-100 hover:bg-slate-50'
                            }`}
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800">{asset.symbol}</p>
                              <p className="text-[11px] text-slate-500 truncate max-w-[130px]">{asset.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold">{formatMT(asset.price)}</p>
                              <p
                                className={`text-[10px] font-bold ${
                                  asset.change24h >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {asset.change24h >= 0 ? '+' : ''}
                                {asset.change24h.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Educational Signals Box - Dica do Instrutor Dinâmica do Firestore */}
                  {customInstructorTip.active && (
                    <div className="bg-blue-50/90 rounded-2xl p-4 border border-blue-100 space-y-2.5 shadow-xs">
                      <div className="flex items-center justify-between text-blue-900 font-bold text-xs">
                        <div className="flex items-center space-x-1.5">
                          <BookOpen className="w-4 h-4 text-[#2563eb]" />
                          <span>{customInstructorTip.title || 'Dica do Instrutor'}</span>
                        </div>
                        <span className="text-[10px] bg-blue-100 text-[#2563eb] px-2 py-0.5 rounded-full font-bold border border-blue-200">
                          {customInstructorTip.badge || 'Dica de Ouro'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        &ldquo;{customInstructorTip.content}&rdquo;
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-blue-100/60">
                        <span className="font-semibold text-slate-600">{customInstructorTip.author || 'Instrutor Mateus Maputo'}</span>
                        <span className="text-[10px] text-blue-600 font-bold">Oficial TapRise</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Positions Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-slate-900">Posições Abertas</h3>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                      {positions.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('carteira')}
                    className="text-xs font-semibold text-blue-600 hover:underline"
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
                      className="px-4 py-1.5 bg-blue-50 text-blue-600 font-bold rounded-lg hover:bg-blue-100 transition"
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
                                  className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition text-xs"
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
              
              {/* Header & Search */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
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
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                      marketCategory === cat
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Commodities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCommodities.map((item) => {
                  const isFav = favorites.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
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
                          className={`p-1.5 rounded-lg border transition ${
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
                          <p className="text-xl font-black text-slate-900">{formatMT(item.price)}</p>
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

                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-500">
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
                          <div className="w-full py-2 px-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-bold flex items-center justify-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{marketHoursConfig.pausedAssets[item.id] ? 'Ativo Pausado' : 'Mercado Fechado'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex space-x-2 pt-2">
                          <button
                            onClick={() => {
                              setSelectedAssetId(item.id);
                              setTradeSide('BUY');
                              setIsTradeModalOpen(true);
                            }}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                          >
                            Comprar
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAssetId(item.id);
                              setTradeSide('SELL');
                              setIsTradeModalOpen(true);
                            }}
                            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
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

          {/* 3. CARTEIRA (PORTFOLIO, PROPORTIONAL CHART & WITHDRAWALS VIA M-PESA/E-MOLA) */}
          {activeTab === 'carteira' && (
            <div className="space-y-6">
              
              {/* Header com Dados da Corretora e Status da Janela Maputo */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
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
                  {/* Status da Janela de Levantamento 08h - 12h */}
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

                  {/* Botão de Ação Rápida: Depósito Emola */}
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

                  {/* Botão de Ação Rápida: Levantamento */}
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
                
                {/* 1. Património Total */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Património Total</span>
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xl font-black text-slate-900">{formatMT(portfolioValue)}</p>
                  <p className="text-[11px] text-slate-500">Saldo + Margem em Posições</p>
                </div>

                {/* 2. Saldo Disponível */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Saldo em Conta</span>
                    <Award className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-xl font-black text-blue-600">{formatMT(balance)}</p>
                  <p className="text-[11px] text-slate-500">Capital total creditado</p>
                </div>

                {/* 3. Saldo Retirável (Excedente à reserva de 1.000 MT) */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1 relative overflow-hidden">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Saldo Retirável</span>
                    <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className={`text-xl font-black ${withdrawableBalance >= 1000 ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {formatMT(withdrawableBalance)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {withdrawableBalance >= 1000
                      ? 'Livre p/ M-Pesa / e-Mola'
                      : 'Mínimo 1.000 MT retirável'}
                  </p>
                </div>

                {/* 4. Reserva Obrigatória (1.000 MT sempre mantida) */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Reserva Mínima</span>
                    <Shield className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-xl font-black text-amber-600">{formatMT(reserveAmount)}</p>
                  <p className="text-[11px] text-slate-500">Obrigatória em conta</p>
                </div>

                {/* 5. Rendimento Líquido (PnL Total) */}
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
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

              {/* GRÁFICO FUNCIONAL TOTALMENTE PROPORCIONAL AO SALDO */}
              <WalletBalanceChart
                currentBalance={balance}
                portfolioValue={portfolioValue}
                unrealizedPnL={unrealizedPnL}
                positionsCount={positions.length}
                positionsValue={positionsAllocatedMargin}
                transactions={userTransactions}
              />

              {/* NAVEGAÇÃO DE SUB-ABAS DA CARTEIRA */}
              <div className="bg-white rounded-3xl border border-slate-200 p-2 shadow-xs">
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
                    <span>Pedidos de Levantamento (M-Pesa / e-Mola)</span>
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

              {/* CONTEÚDO DA SUB-ABA: DEPÓSITO E-MOLA (NOVO) */}
              {carteiraSubTab === 'deposito' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Banner de Destaque */}
                  <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 rounded-3xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10 max-w-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white border border-white/30 uppercase tracking-wider">
                          Canal Oficial de Recarga
                        </span>
                        <span className="text-xs text-amber-100 font-medium">
                          Carteira Móvel e-Mola (Movitel)
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white">
                        Depósito via e-Mola
                      </h3>
                      <p className="text-xs text-amber-100/90 leading-relaxed">
                        Faça a recarga da sua conta de forma simples e rápida diretamente pelo seu telemóvel usando o serviço e-Mola.
                      </p>
                    </div>
                  </div>

                  {/* Cards dos Dados Oficiais: Número e Nome */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card 1: Número e-Mola */}
                    <div className="bg-white rounded-3xl border-2 border-amber-300/80 p-5 sm:p-6 shadow-xs space-y-3">
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
                            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
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

                    {/* Card 2: Nome de Confirmação */}
                    <div className="bg-white rounded-3xl border-2 border-emerald-300/80 p-5 sm:p-6 shadow-xs space-y-3">
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
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
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

                  {/* Passo a Passo em 4 Passos */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
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
                        <p className="text-slate-500 text-[11px]">Verifique <strong>ELIZABETE NHATSUNGUE</strong>, digite o valor e confirme com o PIN.</p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center">4</span>
                        <p className="font-bold text-slate-900 pt-1">Mande o Comprovativo</p>
                        <p className="text-slate-500 text-[11px]">Tire print da SMS de confirmação e envie no chat privado do Admin!</p>
                      </div>
                    </div>
                  </div>

                  {/* CARD EMBAIXO INFORMATIVO E AMIGÁVEL */}
                  <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100/60 border-2 border-blue-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
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
                            Olá investidor! Assim que concluir a sua transferência no <strong>e-Mola</strong>, tire uma <strong>captura de tela (print/screenshot)</strong> da mensagem SMS de confirmação que recebeu e envie diretamente no <strong>chat privado com o nosso Administrador</strong>.
                          </p>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            A nossa equipa valida o envio e adiciona imediatamente o saldo à sua carteira para que possa negociar as matérias-primas e participar da Janela das 21h com todo o conforto!
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

              {/* CONTEÚDO DA SUB-ABA 1: POSIÇÕES ATIVAS */}
              {carteiraSubTab === 'visao-geral' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
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
                        className="px-4 py-2 bg-blue-50 text-blue-700 font-bold text-xs rounded-xl hover:bg-blue-100 transition"
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
                                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
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

              {/* CONTEÚDO DA SUB-ABA 2: EXTRATO DE TRANSAÇÕES */}
              {carteiraSubTab === 'transacoes' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900">Extrato Central de Movimentações</h3>
                      <p className="text-xs text-slate-500">Histórico completo de depósitos, bónus, lucros e débitos em Meticais (MT)</p>
                    </div>
                    <span className="text-xs font-mono bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
                      {userTransactions.length} Registo(s)
                    </span>
                  </div>

                  {userTransactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                      <History className="w-10 h-10 mx-auto text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">Nenhuma transação registada até ao momento</p>
                      <p className="text-xs text-slate-400">
                        Quando receber bónus da administração, coletar lucro na Janela 21h ou realizar levantamentos, os movimentos aparecerão aqui.
                      </p>
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

              {/* CONTEÚDO DA SUB-ABA 3: PEDIDOS DE LEVANTAMENTO (M-PESA / E-MOLA) */}
              {carteiraSubTab === 'levantamentos' && (
                <div className="space-y-6">
                  
                  {/* CTA Banner Novo Levantamento */}
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
                        Retire o seu saldo disponível a partir de <strong>1.000,00 MT</strong>. Após submeter, os fundos são processados entre <strong>2 a 3 horas</strong>. Os levantamentos funcionam diariamente das <strong>08:00 às 12:00</strong> (Horário de Maputo).
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
                        Taxa de processamento: 0,00 MT
                      </span>
                    </div>
                  </div>

                  {/* Tabela de Pedidos de Levantamento */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
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
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          Quando solicitar um levantamento via M-Pesa ou e-Mola, o estado de envio e o protocolo aparecerão aqui com a estimativa de 2 a 3 horas.
                        </p>
                        <button
                          onClick={() => setIsWithdrawalModalOpen(true)}
                          className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-blue-700 transition"
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
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                                      item.status === 'COMPLETED'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : item.status === 'REJECTED'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800 animate-pulse'
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${
                                        item.status === 'COMPLETED' ? 'bg-emerald-600' : 'bg-amber-600'
                                      }`}></span>
                                      {item.status === 'COMPLETED'
                                        ? 'Concluído'
                                        : item.status === 'REJECTED'
                                        ? 'Cancelado'
                                        : 'Em Processamento (2-3h)'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Informação Regulamentar de Retiradas */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
                    <p className="font-bold text-slate-900 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      Regulamento de Segurança para Levantamentos TapRise
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
                      <li><strong>Montante Mínimo:</strong> 1.000,00 MT por operação.</li>
                      <li><strong>Reserva Obrigatória de Manutenção:</strong> A conta deve sempre manter um saldo remanescente mínimo de 1.000,00 MT para custódia de posições e integridade operacional.</li>
                      <li><strong>Horário Oficial de Liquidação:</strong> Todos os dias entre as 08:00 e as 12:00 (Hora de Moçambique, África/Maputo, CAT UTC+2).</li>
                      <li><strong>Prazo de Liquidação:</strong> Entre 2 a 3 horas a contar da submissão do pedido na plataforma.</li>
                      <li><strong>Contas Suportadas:</strong> Carteiras móveis nacionais M-Pesa (Vodacom) e e-Mola (Movitel).</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* CONTEÚDO DA SUB-ABA 4: OPERAÇÕES FECHADAS */}
              {carteiraSubTab === 'fechadas' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
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
                      <p className="text-xs text-slate-400">
                        Quando encerrar uma posição ativa de compra ou venda, o lucro ou perda consolidado aparecerá aqui.
                      </p>
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



          {/* 5. PERFIL (USER PROFILE & SETTINGS) */}
          {activeTab === 'perfil' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center space-y-3">
                <div className="w-20 h-20 rounded-full bg-blue-600 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-200">
                  {userProfile?.nome ? userProfile.nome.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {userProfile?.nome || 'Utilizador Moçambicano'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {userProfile?.email || user.email || 'utilizador@taprise.co.mz'}
                  </p>
                  <p className="text-xs font-semibold text-blue-600 mt-0.5">
                    {userProfile?.provincia || 'Moçambique'}
                  </p>
                </div>
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Conta Operacional Verificada (+18 Anos)</span>
                </div>
              </div>

              {/* Account Details Box */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Dados do Investidor
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Nome Completo:</span>
                    <span className="font-bold text-slate-800">{userProfile?.nome || 'Investidor TapRise'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">E-mail:</span>
                    <span className="font-bold text-slate-800">{userProfile?.email || user.email}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Idade Registada:</span>
                    <span className="font-bold text-slate-800">{userProfile?.idade || 18} anos</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Província:</span>
                    <span className="font-bold text-blue-700">{userProfile?.provincia || 'Maputo Cidade'}</span>
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

              {/* Account Management & Creation */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Gestão de Acesso e Contas
                </h3>
                <p className="text-xs text-slate-500">
                  Pretende criar uma nova conta ou alternar o investidor conectado?
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link
                    href="/register"
                    prefetch={true}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Criar Nova Conta</span>
                  </Link>
                  <Link
                    href="/login"
                    prefetch={true}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Iniciar Outra Sessão</span>
                  </Link>
                </div>
              </div>

              {/* Institutional Infrastructure Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
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

      {/* MOBILE BOTTOM NAVIGATION BAR (Reajustada sem comunidade - [Início, Mercados, Carteira, Perfil, Chat]) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-40 px-3 py-1.5 flex justify-around items-center shadow-lg">
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
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition cursor-pointer ${
                isActive ? 'text-[#2563eb] font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 leading-none font-medium">{tab.label}</span>
            </button>
          );
        })}
        <Link
          href="/chat"
          prefetch={true}
          className="flex flex-col items-center py-1 px-3 rounded-xl transition text-[#2563eb] font-bold relative cursor-pointer"
          title="Grupo Chat Ao Vivo"
        >
          <div className="relative">
            <MessageCircle className="w-5 h-5 text-[#2563eb]" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
          </div>
          <span className="text-[9px] mt-0.5 leading-none text-[#2563eb] font-bold">Chat</span>
        </Link>
      </nav>

      {/* ORDER EXECUTION MODAL */}
      {isTradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {tradeSide === 'BUY' ? 'Comprar' : 'Vender a Descoberto'} {selectedAsset.name}
                </h3>
                <p className="text-xs text-slate-400">Moeda da Operação: Meticais Moçambicanos (MT)</p>
              </div>
              <button
                onClick={() => setIsTradeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
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
                        className={`px-2.5 py-3 text-xs font-bold rounded-xl border transition ${
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

              {/* Notice if market is closed / paused or balance is 0 */}
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

      {/* ======================================================== */}
      {/* MODAL: DEPÓSITO VIA E-MOLA (MOVITEL MOÇAMBIQUE) */}
      {/* ======================================================== */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
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

            {/* Informações Oficiais para Transferência */}
            <div className="space-y-4">
              {/* Número */}
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
                    <span className="text-2xl font-black font-mono tracking-wider text-slate-900">
                      877083749
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText('877083749', 'Número e-Mola')}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
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

              {/* Nome de Confirmação */}
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
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
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

              {/* Instruções Rápidas */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-600 space-y-1.5">
                <p className="font-bold text-slate-800">Instruções no telemóvel:</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                  <li>Disque <strong>*898#</strong> ou aceda à app e-Mola.</li>
                  <li>Escolha <strong>Transferir Dinheiro</strong> para <strong>877083749</strong>.</li>
                  <li>Confirme o nome <strong>ELIZABETE NHATSUNGUE</strong> e conclua com o seu PIN.</li>
                </ol>
              </div>

              {/* Card Embaixo: Mensagem Amigável */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 text-xs space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900 text-xs">
                      Envie o comprovativo no Privado do Admin!
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Após realizar a transferência no seu telemóvel, tire uma <strong>captura de tela (print)</strong> da mensagem SMS de confirmação recebida e envie no <strong>chat privado do Administrador</strong>.
                    </p>
                    <p className="text-[11px] text-blue-700 font-medium">
                      O seu saldo será creditado com rapidez e segurança!
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

            {/* Rodapé Fechar */}
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

      {/* ======================================================== */}
      {/* MODAL 1: SOLICITAÇÃO DE LEVANTAMENTO (M-PESA / E-MOLA) */}
      {/* ======================================================== */}
      {isWithdrawalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
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

            {/* Aviso de Janela de Horário 08h às 12h Maputo */}
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

            {/* Form */}
            <form onSubmit={handleExecuteWithdrawal} className="space-y-4">
              
              {/* Seleção de Operadora */}
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
                        ? 'border-rose-500 bg-rose-50/50 shadow-xs ring-2 ring-rose-500/20'
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
                        ? 'border-amber-500 bg-amber-50/50 shadow-xs ring-2 ring-amber-500/20'
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

              {/* Número de Telefone */}
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
                <p className="text-[10px] text-slate-400 mt-1">
                  Insira exatamente os 9 dígitos da sua conta móvel nacional.
                </p>
              </div>

              {/* Nome de Confirmação */}
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

              {/* Valor a Levantar */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    4. Montante a Levantar (MT)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Mínimo: <strong className="text-slate-800">1.000,00 MT</strong>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="100"
                    min="1000"
                    placeholder="1000"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    MT
                  </div>
                </div>

                {/* Chips de Valor Rápido */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[1000, 2500, 5000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setWithdrawalAmount(preset.toString())}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    >
                      +{preset.toLocaleString('pt-MZ')} MT
                    </button>
                  ))}
                  {withdrawableBalance >= 1000 && (
                    <button
                      type="button"
                      onClick={() => setWithdrawalAmount(withdrawableBalance.toString())}
                      className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-700 transition"
                    >
                      Máximo Retirável ({formatMT(withdrawableBalance)})
                    </button>
                  )}
                </div>
              </div>

              {/* Detalhes Financeiros e Cálculo de Reserva */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Saldo Atual:</span>
                  <span className="font-mono font-bold text-slate-800">{formatMT(balance)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Valor do Levantamento:</span>
                  <span className="font-mono font-bold text-blue-600">
                    -{formatMT(parseFloat(withdrawalAmount) || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Taxa de Processamento:</span>
                  <span className="font-mono font-bold text-emerald-600">0,00 MT (Isento)</span>
                </div>
                <div className="h-px bg-slate-200 my-1"></div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700">Saldo Remanescente em Conta:</span>
                  <span className={`font-mono font-black ${
                    balance - (parseFloat(withdrawalAmount) || 0) >= 1000
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}>
                    {formatMT(balance - (parseFloat(withdrawalAmount) || 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Reserva Mínima Obrigatória:</span>
                  <span className="font-mono font-bold text-amber-700">1.000,00 MT</span>
                </div>

                {balance - (parseFloat(withdrawalAmount) || 0) < 1000 && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-semibold flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Atenção: Deve sempre sobrar pelo menos 1.000,00 MT na sua conta após a retirada.</span>
                  </div>
                )}
              </div>

              {/* Destaque de Espera 2 a 3 horas */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-[11px] text-blue-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Prazo Estimado de Envio:</strong> Entre 2 a 3 horas após a confirmação.
                </span>
              </div>

              {/* Botões de Ação */}
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
                    !withdrawalWindow.isOpen ||
                    parseFloat(withdrawalAmount) < 1000 ||
                    balance - (parseFloat(withdrawalAmount) || 0) < 1000 ||
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
                  ) : !withdrawalWindow.isOpen ? (
                    <span>Janela Fechada (Abre 08h)</span>
                  ) : balance - (parseFloat(withdrawalAmount) || 0) < 1000 ? (
                    <span>Reserva Insuficiente</span>
                  ) : (
                    <span>Confirmar Levantamento</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CONFIRMAÇÃO DE SUCESSO DO PEDIDO DE LEVANTAMENTO */}
      {/* ======================================================== */}
      {withdrawalSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
            
            {/* Ícone de Sucesso */}
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

            {/* DESTAQUE PRINCIPAL: ESPERAR ENTRE 2 A 3 HORAS */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 text-left space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wide">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Tempo de Espera: 2 a 3 Horas</span>
              </div>
              <p className="text-xs text-amber-950 leading-relaxed font-medium">
                Por favor, <strong>aguarde entre 2 a 3 horas</strong> para que o montante seja validado e enviado para a sua carteira móvel <strong>{withdrawalSuccessData.operator}</strong>.
              </p>
            </div>

            {/* Recibo com Dados do Pedido */}
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

            {/* Botão Concluir */}
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

    </div>
  );
}
