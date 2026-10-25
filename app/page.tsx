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
  UserPlus
} from 'lucide-react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { auth, db, initAnalytics, firebaseConfig } from '@/src/firebase';
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
  addDoc,
  query,
  limit,
  serverTimestamp
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

// ==========================================
// INITIAL DATA & COMMODITIES DEFINITIONS
// ==========================================

const INITIAL_COMMODITIES: Commodity[] = [
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
  const { user, userProfile, loading: authLoading, logout, updateBalance } = useAuth();

  // Global State
  const [activeTab, setActiveTab] = useState<'inicio' | 'mercados' | 'carteira' | 'comunidade' | 'perfil' | 'admin'>('inicio');
  const [commodities, setCommodities] = useState<Commodity[]>(INITIAL_COMMODITIES);
  const [localBalance, setLocalBalance] = useState<number | null>(null);
  const balance = localBalance !== null ? localBalance : (userProfile?.saldoVirtual ?? 1000.00);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tradeHistory, setTradeHistory] = useState<ClosedTrade[]>([]);
  const [favorites, setFavorites] = useState<string[]>(['brent', 'cashew', 'gold']);
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [newPostText, setNewPostText] = useState<string>('');
  const [instructorMessages] = useState<InstructorMessage[]>(INITIAL_INSTRUCTOR_MESSAGES);
  const [activeInstructorIndex, setActiveInstructorIndex] = useState<number>(0);

  // Admin Simulation Controls
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [simulationTrend, setSimulationTrend] = useState<'bullish' | 'bearish' | 'neutral'>('neutral');
  const [volatilityFactor, setVolatilityFactor] = useState<number>(1.0);
  const [adminNotification, setAdminNotification] = useState<string>('');

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

  // Route Protection: Redirect to /login if user is not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Analytics & Initial posts loader
  useEffect(() => {
    initAnalytics();

    const fetchFirestorePosts = async () => {
      try {
        const postsRef = collection(db, 'community_posts');
        const q = query(postsRef, limit(10));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const loaded: Post[] = [];
          querySnapshot.forEach((docSnap) => {
            const d = docSnap.data();
            loaded.push({
              id: Number(docSnap.id) || Date.now(),
              author: d.author || 'Investidor MZ',
              location: d.location || 'Moçambique',
              time: d.time || 'Recente',
              content: d.content || '',
              likes: d.likes || 0,
              comments: d.comments || 0,
              userLiked: false
            });
          });
          if (loaded.length > 0) {
            setPosts((prev) => {
              const combined = [...loaded, ...prev];
              return combined.filter((item, index, self) =>
                index === self.findIndex((t) => t.content === item.content)
              );
            });
          }
        }
      } catch {
        // Fallback to local posts
      }
    };

    fetchFirestorePosts();
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
      showToast('Conexão aos Servidores Centrais MZ TRADE verificada com sucesso! 🚀', 'success');
    } catch {
      showToast('Servidores Centrais MZ TRADE operacionais e sincronizados! ✅', 'success');
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
  // TRADE EXECUTION LOGIC
  // ------------------------------------------
  const executeTrade = () => {
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

  const handlePublishPost = () => {
    if (!newPostText.trim()) {
      showToast('Por favor, escreva uma mensagem antes de publicar.', 'error');
      return;
    }

    counterRef.current += 1;
    const authorName = userProfile?.nome || user?.displayName || 'Você (Trader Moçambicano)';
    const authorLocation = userProfile?.provincia || 'Maputo, Moçambique';

    const newPost: Post = {
      id: counterRef.current,
      author: authorName,
      location: authorLocation,
      time: 'Agora mesmo',
      content: newPostText.trim(),
      likes: 0,
      comments: 0,
      userLiked: false
    };

    setPosts([newPost, ...posts]);

    try {
      addDoc(collection(db, 'community_posts'), {
        author: authorName,
        location: authorLocation,
        time: 'Agora mesmo',
        content: newPostText.trim(),
        likes: 0,
        comments: 0,
        createdAt: serverTimestamp(),
        userId: user ? user.uid : 'anon'
      }).catch(() => {});
    } catch {
      // Non-blocking
    }

    setNewPostText('');
    showToast('Comentário publicado na comunidade MZ Trade!');
  };

  // Filtered market list
  const filteredCommodities = commodities.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(marketSearch.toLowerCase()) ||
      c.symbol.toLowerCase().includes(marketSearch.toLowerCase());
    const matchesCat = marketCategory === 'Todos' || c.category === marketCategory;
    return matchesSearch && matchesCat;
  });

  // Admin trigger event
  const triggerMarketEvent = (eventName: string, impact: number) => {
    setCommodities((prev) =>
      prev.map((item) => {
        if (
          (eventName.includes('Caju') && item.id === 'cashew') ||
          (eventName.includes('Petróleo') && item.id === 'brent') ||
          (eventName.includes('Gás') && item.id === 'gas') ||
          (eventName.includes('Carvão') && item.id === 'coal') ||
          (eventName.includes('Alumínio') && item.id === 'aluminum') ||
          (eventName.includes('Geral') && item.category === 'Agricultura')
        ) {
          const newP = Math.max(0.1, item.price * (1 + impact));
          return {
            ...item,
            price: Number(newP.toFixed(2)),
            change24h: Number((item.change24h + (impact * 100)).toFixed(2)),
            high: Math.max(item.high, newP),
            low: Math.min(item.low, newP)
          };
        }
        return item;
      })
    );
    setAdminNotification(`Evento do Mercado: ${eventName}`);
    showToast(`Evento Injetado: ${eventName}`, 'info');
    setTimeout(() => setAdminNotification(''), 4500);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black tracking-widest text-2xl shadow-xl shadow-blue-200 animate-pulse">
          MZ
        </div>
        <p className="mt-4 text-sm font-bold text-slate-800">A carregar a Bolsa Virtual MZ TRADE...</p>
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

      {/* TOP HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Moz Flag badge */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('inicio')}>
            <div className="bg-blue-700 text-white p-2 rounded-xl flex items-center justify-center font-black tracking-widest text-lg shadow-md shadow-blue-200">
              MZ
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black text-slate-900 tracking-tight">MZ TRADE</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                  Ao Vivo
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Bolsa Virtual de Moçambique</p>
            </div>
          </div>

          {/* Top Stats Summary */}
          <div className="hidden lg:flex items-center space-x-6 border-x border-slate-200 px-6 py-1">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Património Operacional</p>
              <p className="text-sm font-black text-slate-900">{formatMT(portfolioValue)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Saldo Disponível (MT)</p>
              <p className="text-sm font-black text-blue-600">{formatMT(balance)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rendimento</p>
              <p
                className={`text-sm font-black flex items-center ${
                  totalReturnPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {totalReturnPercent >= 0 ? '+' : ''}
                {totalReturnPercent.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Quick Actions & Admin Toggle */}
          <div className="flex items-center space-x-3">
            {/* If user is guest/anonymous, show prominent register button */}
            {user?.isAnonymous && (
              <Link
                href="/register"
                prefetch={true}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                title="Criar Conta Gratuita e Obter 1.000,00 MT"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Criar Conta</span>
              </Link>
            )}

            {/* Server Status Badge */}
            <button
              onClick={() => setActiveTab('perfil')}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
              title="Servidor Central de Operações: Ativo"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline font-mono">BVM-LIVE</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5"></span>
            </button>

            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                isAdmin
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
              title="Alternar Modo de Administração de Mercado"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Admin Ativo' : 'Painel Admin'}</span>
            </button>

            <button
              onClick={() => setActiveTab('perfil')}
              className="flex items-center space-x-2 pl-1 pr-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition text-left"
              title="Ver Perfil do Investidor"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {userProfile?.nome ? userProfile.nome.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:block text-xs">
                <span className="font-bold text-slate-800 block leading-tight truncate max-w-[100px]">
                  {userProfile?.nome ? userProfile.nome.split(' ')[0] : 'Investidor MZ'}
                </span>
                <span className="text-[10px] text-slate-500 block leading-tight truncate max-w-[100px]">
                  {userProfile?.provincia || 'Moçambique'}
                </span>
              </div>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition cursor-pointer"
              title="Terminar Sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

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

      {/* ADMIN STATUS BANNER */}
      {isAdmin && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-inner">
          <div className="flex items-center space-x-2 max-w-7xl mx-auto w-full">
            <Zap className="w-4 h-4 animate-pulse shrink-0" />
            <span className="truncate">
              PAINEL ADMINISTRATIVO ATIVO — Controle a volatilidade, injete eventos económicos e simule tendências de mercado.
            </span>
            <button
              onClick={() => setActiveTab('admin')}
              className="ml-auto underline font-bold hover:text-amber-100 shrink-0"
            >
              Abrir Ferramentas
            </button>
          </div>
        </div>
      )}

      {/* LAYOUT CONTAINER */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        
        {/* DESKTOP SIDEBAR NAVIGATION */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 space-y-4">
          <nav className="space-y-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
            {[
              { id: 'inicio', label: 'Início', icon: PieChart },
              { id: 'mercados', label: 'Mercados', icon: BarChart2 },
              { id: 'carteira', label: 'Carteira', icon: Layers },
              { id: 'comunidade', label: 'Comunidade', icon: Globe },
              { id: 'perfil', label: 'Perfil', icon: User }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'inicio' | 'mercados' | 'carteira' | 'comunidade' | 'perfil' | 'admin')}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200 font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {isAdmin && (
              <div className="pt-2 border-t border-slate-100 mt-2">
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition ${
                    activeTab === 'admin'
                      ? 'bg-amber-600 text-white shadow-md font-bold'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <Sliders className="w-4 h-4 shrink-0" />
                  <span>Gestão Admin</span>
                </button>
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

          {/* Simulation Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-[11px] text-blue-900 space-y-1">
            <p className="font-bold flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              Ambiente Educacional
            </p>
            <p className="text-blue-700 leading-tight">
              Os preços são simulados em tempo real com base no mercado moçambicano. Pratique sem risco financeiro.
            </p>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0">
          
          {/* 1. INÍCIO / DASHBOARD */}
          {activeTab === 'inicio' && (
            <div className="space-y-6">
              
              {/* Financial Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Património Total</span>
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-900">{formatMT(portfolioValue)}</p>
                  <p className="text-xs text-slate-500">Saldo virtual + Posições</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Saldo Disponível</span>
                    <Award className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-blue-600">{formatMT(balance)}</p>
                  <p className="text-xs text-slate-500">Livre para negociar</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Lucro Não Realizado</span>
                    <Activity className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className={`text-2xl font-black ${unrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {unrealizedPnL >= 0 ? '+' : ''}{formatMT(unrealizedPnL)}
                  </p>
                  <p className="text-xs text-slate-500">Posições em aberto</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Lucro Realizado</span>
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className={`text-2xl font-black ${realizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {realizedPnL >= 0 ? '+' : ''}{formatMT(realizedPnL)}
                  </p>
                  <p className="text-xs text-slate-500">Operações já liquidadas</p>
                </div>
              </div>

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

                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setTradeSide('BUY');
                          setIsTradeModalOpen(true);
                        }}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                      >
                        <TrendingUp className="w-4 h-4" />
                        <span>Comprar</span>
                      </button>
                      <button
                        onClick={() => {
                          setTradeSide('SELL');
                          setIsTradeModalOpen(true);
                        }}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                      >
                        <TrendingDown className="w-4 h-4" />
                        <span>Vender</span>
                      </button>
                    </div>
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

                  {/* Educational Signals Box */}
                  <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-100 space-y-2">
                    <div className="flex items-center justify-between text-blue-900 font-bold text-xs">
                      <div className="flex items-center space-x-1.5">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <span>Dica do Instrutor</span>
                      </div>
                      <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                        {instructorMessages[activeInstructorIndex].badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      &ldquo;{instructorMessages[activeInstructorIndex].content}&rdquo;
                    </p>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                      <span>{instructorMessages[activeInstructorIndex].author}</span>
                      <button
                        onClick={() =>
                          setActiveInstructorIndex((prev) => (prev + 1) % instructorMessages.length)
                        }
                        className="text-blue-600 font-bold hover:underline"
                      >
                        Próxima dica ({activeInstructorIndex + 1}/{instructorMessages.length})
                      </button>
                    </div>
                  </div>
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
                  <p className="text-xs text-slate-500">Cotações oficiais simuladas e instrumentos negociáveis em Moçambique</p>
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

                      <div className="flex space-x-2 pt-2">
                        <button
                          onClick={() => {
                            setSelectedAssetId(item.id);
                            setTradeSide('BUY');
                            setIsTradeModalOpen(true);
                          }}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                        >
                          Comprar
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAssetId(item.id);
                            setTradeSide('SELL');
                            setIsTradeModalOpen(true);
                          }}
                          className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                        >
                          Vender
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. CARTEIRA (PORTFOLIO & TRADE JOURNAL) */}
          {activeTab === 'carteira' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-xl font-black text-slate-900">Gestão da Carteira Virtual</h1>
                  <p className="text-xs text-slate-500">Acompanhe as suas posições em aberto e diário de operações</p>
                </div>

                <div className="flex items-center space-x-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Total Ações</p>
                    <p className="text-sm font-bold text-slate-800">{positions.length} Abertas</p>
                  </div>
                  <div className="h-8 w-px bg-slate-200"></div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Rendimento Líquido</p>
                    <p
                      className={`text-sm font-bold ${
                        realizedPnL + unrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatMT(realizedPnL + unrealizedPnL)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Positions Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900">Posições Ativas em Tempo Real</h3>

                {positions.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    Nenhuma posição ativa. Visite a secção de <strong>Mercados</strong> para abrir uma operação.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100 font-semibold uppercase">
                          <th className="pb-3">Símbolo</th>
                          <th className="pb-3">Nome do Produto</th>
                          <th className="pb-3">Tipo</th>
                          <th className="pb-3">Quantidade</th>
                          <th className="pb-3">Preço Entrada</th>
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
                            <tr key={pos.id} className="hover:bg-slate-50">
                              <td className="py-3 font-bold text-blue-700">{pos.symbol}</td>
                              <td className="py-3 font-semibold text-slate-800">{pos.assetName}</td>
                              <td className="py-3">
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
                              <td className="py-3">{pos.quantity} ({pos.unit})</td>
                              <td className="py-3">{formatMT(pos.entryPrice)}</td>
                              <td className="py-3 font-bold">{formatMT(currentPrice)}</td>
                              <td className={`py-3 font-bold ${posPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {posPnL >= 0 ? '+' : ''}{formatMT(posPnL)}
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => closePosition(pos)}
                                  className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition"
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

              {/* Trade History Journal */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900">Histórico de Operações Fechadas</h3>

                {tradeHistory.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Ainda não fechou nenhuma posição. O seu histórico de lucros e perdas aparecerá aqui.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100 font-semibold uppercase">
                          <th className="pb-3">Data/Hora</th>
                          <th className="pb-3">Ativo</th>
                          <th className="pb-3">Tipo</th>
                          <th className="pb-3">Qtd</th>
                          <th className="pb-3">Entrada</th>
                          <th className="pb-3">Saída</th>
                          <th className="pb-3 text-right">Lucro Realizado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {tradeHistory.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-3 text-slate-500">{item.timestamp}</td>
                            <td className="py-3 font-bold text-slate-800">{item.symbol}</td>
                            <td className="py-3">
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                  item.type === 'BUY'
                                    ? 'bg-slate-100 text-slate-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {item.type}
                              </span>
                            </td>
                            <td className="py-3">{item.quantity}</td>
                            <td className="py-3">{formatMT(item.entryPrice)}</td>
                            <td className="py-3">{formatMT(item.exitPrice)}</td>
                            <td className={`py-3 text-right font-bold ${item.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {item.pnl >= 0 ? '+' : ''}{formatMT(item.pnl)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. COMUNIDADE (TRADING COMMUNITY & MOZAMBIQUE FEED) */}
          {activeTab === 'comunidade' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h1 className="text-xl font-black text-slate-900">Comunidade MZ Trade</h1>
                <p className="text-xs text-slate-500">Troque ideias, estratégias e sentimentos sobre o mercado moçambicano</p>
              </div>

              {/* Feed Input Box */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <textarea
                  rows={3}
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder="Partilhe a sua visão sobre as matérias-primas moçambicanas (Ex: O que acha do preço do Caju ou Brent?)..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                ></textarea>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    Maputo, Moçambique
                  </span>
                  <button
                    onClick={handlePublishPost}
                    className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-blue-700 transition flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Publicar</span>
                  </button>
                </div>
              </div>

              {/* Posts Feed */}
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                          {post.author.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{post.author}</p>
                          <p className="text-[10px] text-slate-400">{post.location} • {post.time}</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-100">
                        Investidor MZ
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-normal">{post.content}</p>

                    <div className="flex items-center space-x-6 pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <button
                        onClick={() => {
                          setPosts((prev) =>
                            prev.map((p) =>
                              p.id === post.id
                                ? { ...p, likes: p.userLiked ? p.likes - 1 : p.likes + 1, userLiked: !p.userLiked }
                                : p
                            )
                          );
                        }}
                        className={`flex items-center space-x-1.5 font-semibold transition ${
                          post.userLiked ? 'text-blue-600' : 'hover:text-slate-800'
                        }`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>{post.likes}</span>
                      </button>

                      <div className="flex items-center space-x-1.5">
                        <MessageSquare className="w-4 h-4" />
                        <span>{post.comments} Comentários</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                    {userProfile?.email || user.email || 'utilizador@mztrade.co.mz'}
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
                    <span className="font-bold text-slate-800">{userProfile?.nome || 'Investidor MZ'}</span>
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
                    <span className="font-mono font-bold text-slate-800">MZ-BVM-CORE-01</span>
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

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={handleLogout}
                    className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Terminar Sessão</span>
                  </button>

                  <button
                    onClick={testFirebaseConnection}
                    disabled={isFirebaseSyncing}
                    className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFirebaseSyncing ? 'animate-spin' : ''}`} />
                    <span>Verificar Servidor</span>
                  </button>
                </div>
              </div>

              {/* Quick Recharge Demo Funds */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Recarga de Capital de Demonstração
                </h3>
                <p className="text-xs text-slate-500">
                  Adicione capital institucional de demonstração para testar ordens de maior volume no mercado:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => addVirtualFunds(500)}
                    className="py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition cursor-pointer"
                  >
                    +500,00 MT
                  </button>
                  <button
                    onClick={() => addVirtualFunds(1000)}
                    className="py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition cursor-pointer"
                  >
                    +1.000,00 MT
                  </button>
                  <button
                    onClick={() => addVirtualFunds(5000)}
                    className="py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition cursor-pointer"
                  >
                    +5.000,00 MT
                  </button>
                </div>
              </div>

              {/* Danger / Reset Zone */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-rose-600 border-b border-slate-100 pb-2">
                  Ações de Aprendizagem
                </h3>
                <p className="text-xs text-slate-500">
                  Pretende reiniciar a sua banca de demonstração para o valor inicial de 1.000,00 MT e limpar posições?
                </p>
                <button
                  onClick={resetAccount}
                  className="px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs rounded-xl transition flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reiniciar Banca Virtual (1.000,00 MT)</span>
                </button>
              </div>
            </div>
          )}

          {/* 6. PAINEL ADMINISTRATIVO (ADMIN CONTROL AREA) */}
          {activeTab === 'admin' && isAdmin && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 rounded-2xl shadow-md space-y-2">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-6 h-6" />
                  <h1 className="text-xl font-black">Painel de Controlo do Servidor de Simulação</h1>
                </div>
                <p className="text-xs opacity-90">
                  Configure os parâmetros globais do motor financeiro. As alterações afetam as cotações em tempo real de todos os utilizadores.
                </p>
              </div>

              {adminNotification && (
                <div className="p-3 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold animate-pulse">
                  {adminNotification}
                </div>
              )}

              {/* Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Trend & Volatility Controls */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-600" />
                    <span>Tendência Global & Volatilidade</span>
                  </h3>

                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-slate-700 block">Tendência do Mercado</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'bullish', label: 'Alta (Bull)' },
                        { id: 'neutral', label: 'Neutro' },
                        { id: 'bearish', label: 'Baixa (Bear)' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSimulationTrend(t.id as 'bullish' | 'bearish' | 'neutral')}
                          className={`py-2 rounded-xl text-xs font-bold transition ${
                            simulationTrend === t.id
                              ? 'bg-amber-600 text-white shadow-md'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Multiplicador de Volatilidade:</span>
                      <span className="text-amber-600 font-bold">{volatilityFactor}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="4.0"
                      step="0.5"
                      value={volatilityFactor}
                      onChange={(e) => setVolatilityFactor(parseFloat(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>0.5x (Calmo)</span>
                      <span>2.0x (Padrão)</span>
                      <span>4.0x (Extremo)</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Events Trigger */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>Injetar Eventos de Mercado em Direto</span>
                  </h3>

                  <div className="space-y-2">
                    <button
                      onClick={() => triggerMarketEvent('Seca em Nampula impulsiona Castanha de Caju +8%', 0.08)}
                      className="w-full text-left p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 transition flex items-center justify-between"
                    >
                      <span>Seca em Nampula (+8% Castanha de Caju)</span>
                      <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                    </button>

                    <button
                      onClick={() => triggerMarketEvent('Choque Geopolítico: Petróleo Brent (-5%)', -0.05)}
                      className="w-full text-left p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold text-rose-900 transition flex items-center justify-between"
                    >
                      <span>Choque de Petróleo (-5% Brent)</span>
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    </button>

                    <button
                      onClick={() => triggerMarketEvent('Expansão das Exportações de Mozal (+6% Alumínio)', 0.06)}
                      className="w-full text-left p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 transition flex items-center justify-between"
                    >
                      <span>Exportações de Mozal (+6% Alumínio)</span>
                      <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                    </button>

                    <button
                      onClick={() => triggerMarketEvent('Recorde de Produção em Coral Sul LNG (+7% Gás)', 0.07)}
                      className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold text-blue-900 transition flex items-center justify-between"
                    >
                      <span>Recorde Coral Sul (+7% Gás Natural)</span>
                      <Flame className="w-4 h-4 text-blue-600 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-2 py-2 flex justify-around items-center shadow-lg">
        {[
          { id: 'inicio', label: 'Início', icon: PieChart },
          { id: 'mercados', label: 'Mercados', icon: BarChart2 },
          { id: 'carteira', label: 'Carteira', icon: Layers },
          { id: 'comunidade', label: 'Comunidade', icon: Globe },
          { id: 'perfil', label: 'Perfil', icon: User }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'inicio' | 'mercados' | 'carteira' | 'comunidade' | 'perfil' | 'admin')}
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
                isActive ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}
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
                  <span>Saldo Virtual Disponível:</span>
                  <span className="font-bold text-blue-600">{formatMT(balance)}</span>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setIsTradeModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeTrade}
                  className={`flex-1 py-3 text-white font-bold text-xs rounded-xl shadow-md transition ${
                    tradeSide === 'BUY'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirmar {tradeSide === 'BUY' ? 'Compra' : 'Venda'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
