import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Activity,
  Award,
  BookOpen,
  User,
  Settings,
  Shield,
  Search,
  Bell,
  Menu,
  X,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Plus,
  Trash2,
  Sliders,
  Send,
  MessageSquare,
  ThumbsUp,
  Share2,
  CheckCircle,
  AlertCircle,
  BarChart2,
  Layers,
  Globe,
  Lock,
  LogOut,
  Maximize2,
  Zap,
  Info
} from 'lucide-react';

// ==========================================
// INITIAL DATA & COMMODITIES DEFINITIONS
// ==========================================

const INITIAL_COMMODITIES = [
  // Energia
  { id: 'brent', name: 'Petróleo Bruto (Brent)', symbol: 'BRENT', category: 'Energia', price: 5120.50, unit: 'Barril (bbl)', change24h: 1.45, high: 5180.00, low: 5050.20, open: 5047.00, baseVolatility: 0.004 },
  { id: 'gas', name: 'Gás Natural', symbol: 'NATGAS', category: 'Energia', price: 185.30, unit: 'MMBtu', change24h: -2.10, high: 192.00, low: 181.50, open: 189.20, baseVolatility: 0.008 },
  { id: 'coal', name: 'Carvão Mineral (Moatize)', symbol: 'COAL-MZ', category: 'Energia', price: 8200.00, unit: 'Tonelada (t)', change24h: 0.85, high: 8350.00, low: 8100.00, open: 8130.00, baseVolatility: 0.003 },

  // Metais
  { id: 'gold', name: 'Ouro Fine 999', symbol: 'XAU', category: 'Metais', price: 148500.00, unit: 'Onça (oz)', change24h: 0.62, high: 149200.00, low: 147800.00, open: 147580.00, baseVolatility: 0.002 },
  { id: 'silver', name: 'Prata Fina', symbol: 'XAG', category: 'Metais', price: 1820.00, unit: 'Onça (oz)', change24h: -0.45, high: 1860.00, low: 1800.00, open: 1828.00, baseVolatility: 0.005 },
  { id: 'copper', name: 'Cobre de Alta Pureza', symbol: 'COPPER', category: 'Metais', price: 580.00, unit: 'Kg', change24h: 2.15, high: 592.00, low: 565.00, open: 567.80, baseVolatility: 0.006 },
  { id: 'aluminum', name: 'Alumínio (Mozal Spec)', symbol: 'ALUM', category: 'Metais', price: 1540.00, unit: 'Tonelada (t)', change24h: -1.10, high: 1580.00, low: 1520.00, open: 1557.00, baseVolatility: 0.004 },

  // Agricultura
  { id: 'cashew', name: 'Castanha de Caju (Nampula)', symbol: 'CAJU-MZ', category: 'Agricultura', price: 95.50, unit: 'Kg', change24h: 4.80, high: 98.00, low: 90.20, open: 91.10, baseVolatility: 0.009 },
  { id: 'sugar', name: 'Açúcar Mascavado', symbol: 'SUGAR', category: 'Agricultura', price: 32.40, unit: 'Kg', change24h: -0.30, high: 33.10, low: 31.80, open: 32.50, baseVolatility: 0.005 },
  { id: 'cotton', name: 'Algodão em Rama', symbol: 'COTTON', category: 'Agricultura', price: 112.00, unit: 'Kg', change24h: 1.20, high: 115.00, low: 109.50, open: 110.65, baseVolatility: 0.007 },
  { id: 'wheat', name: 'Trigo Grão', symbol: 'WHEAT', category: 'Agricultura', price: 24.50, unit: 'Kg', change24h: -1.80, high: 25.50, low: 24.10, open: 24.95, baseVolatility: 0.006 },
  { id: 'rice', name: 'Arroz de Primeira', symbol: 'RICE', category: 'Agricultura', price: 42.00, unit: 'Kg', change24h: 0.50, high: 43.20, low: 41.50, open: 41.79, baseVolatility: 0.003 }
];

const INITIAL_INSTRUCTOR_MESSAGES = [
  {
    id: 1,
    title: 'Análise Semanal: Castanha de Caju em Nampula',
    content: 'A procura internacional por castanha moçambicana subiu 8% esta semana. Excelente momento para observar posições de compra a curto prazo.',
    author: 'Instrutor Mateus Maputo',
    time: 'Há 25 minutos',
    badge: 'Oportunidade'
  },
  {
    id: 2,
    title: 'Gestão de Risco para Iniciantes',
    content: 'Nunca invista mais de 10% do seu saldo disponível numa única operação. Utilize o Stop Loss para proteger o seu capital virtual!',
    author: 'Equipa MZ Trade',
    time: 'Há 2 horas',
    badge: 'Dica de Ouro'
  }
];

const INITIAL_POSTS = [
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
  }
];

// Helper for formatting MT
const formatMT = (value) => {
  return new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value) + ' MT';
};

// ==========================================
// CANVAS FINANCIAL CHART COMPONENT
// ==========================================

const InteractiveChart = ({ commodity, chartType = 'candle', timeframe = '1m', height = 300 }) => {
  const canvasRef = useRef(null);
  const [dataPoints, setDataPoints] = useState([]);
  const [hoverInfo, setHoverInfo] = useState(null);

  // Generate synthetic historical candles based on commodity base price
  useEffect(() => {
    const points = [];
    let current = commodity.open || commodity.price * 0.98;
    const count = 40;

    for (let i = 0; i < count; i++) {
      const volatility = commodity.price * (commodity.baseVolatility || 0.005);
      const open = current;
      const delta = (Math.random() - 0.48) * volatility * 2;
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

    // Force last candle close to match current commodity price
    if (points.length > 0) {
      points[points.length - 1].close = commodity.price;
      points[points.length - 1].high = Math.max(points[points.length - 1].high, commodity.price);
      points[points.length - 1].low = Math.min(points[points.length - 1].low, commodity.price);
    }

    setDataPoints(points);
  }, [commodity.id]);

  // Render Chart onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dataPoints.length === 0) return;

    const ctx = canvas.getContext('2d');
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
    dataPoints.forEach((p) => {
      if (p.low < minPrice) minPrice = p.low;
      if (p.high > maxPrice) maxPrice = p.high;
    });

    const padding = (maxPrice - minPrice) * 0.1 || 1;
    minPrice -= padding;
    maxPrice += padding;

    const getY = (val) => chartHeight - ((val - minPrice) / (maxPrice - minPrice)) * chartHeight;
    const stepX = width / dataPoints.length;

    if (chartType === 'line') {
      // LINE CHART
      ctx.beginPath();
      ctx.strokeStyle = commodity.change24h >= 0 ? '#10B981' : '#EF4444';
      ctx.lineWidth = 2.5;

      dataPoints.forEach((p, idx) => {
        const x = idx * stepX + stepX / 2;
        const y = getY(p.close);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Area fill under line
      ctx.lineTo((dataPoints.length - 1) * stepX + stepX / 2, chartHeight);
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
      const candleWidth = Math.max(2, stepX * 0.6);

      dataPoints.forEach((p, idx) => {
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

    // Current Price Line
    const currentY = getY(commodity.price);
    ctx.strokeStyle = '#2563EB';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, currentY);
    ctx.lineTo(width, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price Badge on right
    ctx.fillStyle = '#1E40AF';
    ctx.fillRect(width - 85, currentY - 10, 85, 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(`${commodity.price.toFixed(2)} MT`, width - 80, currentY + 4);
  }, [dataPoints, chartType, commodity.price]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || dataPoints.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const stepX = canvas.width / dataPoints.length;
    const idx = Math.min(dataPoints.length - 1, Math.max(0, Math.floor(x / stepX)));

    setHoverInfo(dataPoints[idx]);
  };

  return (
    <div className="relative w-full bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
      <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
            {commodity.symbol}
          </span>
          <span className="text-sm font-bold text-slate-800">{commodity.name}</span>
        </div>

        {hoverInfo ? (
          <div className="flex items-center space-x-3 text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
            <span>A: <strong className="text-slate-800">{hoverInfo.open.toFixed(2)}</strong></span>
            <span>M: <strong className="text-emerald-600">{hoverInfo.high.toFixed(2)}</strong></span>
            <span>B: <strong className="text-rose-600">{hoverInfo.low.toFixed(2)}</strong></span>
            <span>F: <strong className="text-slate-800">{hoverInfo.close.toFixed(2)}</strong></span>
          </div>
        ) : (
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Ao vivo (Mercado Virtual MZ)
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-lg bg-white">
        <canvas
          ref={canvasRef}
          width={700}
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
// MAIN APP COMPONENT
// ==========================================

export default function App() {
  // Global State
  const [activeTab, setActiveTab] = useState('inicio');
  const [commodities, setCommodities] = useState(INITIAL_COMMODITIES);
  const [balance, setBalance] = useState(1000.00); // Default Mozambican Virtual MT
  const [positions, setPositions] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [favorites, setFavorites] = useState(['brent', 'cashew', 'gold']);
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [instructorMessages, setInstructorMessages] = useState(INITIAL_INSTRUCTOR_MESSAGES);

  // Admin Simulation Controls
  const [isAdmin, setIsAdmin] = useState(false);
  const [simulationTrend, setSimulationTrend] = useState('neutral'); // 'bullish' | 'bearish' | 'neutral'
  const [volatilityFactor, setVolatilityFactor] = useState(1.0);
  const [adminNotification, setAdminNotification] = useState('');

  // Modals & Active selections
  const [selectedAsset, setSelectedAsset] = useState(INITIAL_COMMODITIES[0]);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeSide, setTradeSide] = useState('BUY'); // 'BUY' | 'SELL'
  const [tradeQty, setTradeQty] = useState(1);

  // UI Filters
  const [marketSearch, setMarketSearch] = useState('');
  const [marketCategory, setMarketCategory] = useState('Todos');
  const [selectedChartType, setSelectedChartType] = useState('candle');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1m');

  // Notifications system
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
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
    }, 2500);

    return () => clearInterval(interval);
  }, [simulationTrend, volatilityFactor]);

  // Keep selectedAsset updated with latest price
  useEffect(() => {
    const updated = commodities.find((c) => c.id === selectedAsset.id);
    if (updated) setSelectedAsset(updated);
  }, [commodities]);

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

    if (tradeQty <= 0) {
      showToast('A quantidade deve ser maior que zero.', 'error');
      return;
    }

    if (tradeSide === 'BUY') {
      setBalance((prev) => prev - cost);

      const newPosition = {
        id: Date.now(),
        assetId: selectedAsset.id,
        assetName: selectedAsset.name,
        symbol: selectedAsset.symbol,
        unit: selectedAsset.unit,
        type: 'BUY',
        quantity: Number(tradeQty),
        entryPrice: selectedAsset.price,
        timestamp: new Date().toLocaleTimeString('pt-MZ')
      };

      setPositions((prev) => [newPosition, ...prev]);
      showToast(`Compra realizada: ${tradeQty}x ${selectedAsset.symbol} por ${formatMT(cost)}`);
    } else {
      // Venda / Short Virtual
      setBalance((prev) => prev - cost * 0.2); // Margin collateral 20%
      const newPosition = {
        id: Date.now(),
        assetId: selectedAsset.id,
        assetName: selectedAsset.name,
        symbol: selectedAsset.symbol,
        unit: selectedAsset.unit,
        type: 'SELL',
        quantity: Number(tradeQty),
        entryPrice: selectedAsset.price,
        timestamp: new Date().toLocaleTimeString('pt-MZ')
      };

      setPositions((prev) => [newPosition, ...prev]);
      showToast(`Venda aberta: ${tradeQty}x ${selectedAsset.symbol}`);
    }

    setIsTradeModalOpen(false);
  };

  const closePosition = (position) => {
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

    setBalance((prev) => Math.max(0, prev + returnedCapital));

    // Log Trade
    const closedTrade = {
      id: Date.now(),
      symbol: position.symbol,
      assetName: position.assetName,
      type: position.type,
      quantity: position.quantity,
      entryPrice: position.entryPrice,
      exitPrice: currentAsset.price,
      pnl: pnl,
      timestamp: new Date().toLocaleDateString('pt-MZ') + ' ' + new Date().toLocaleTimeString('pt-MZ')
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
    setBalance(1000.00);
    setPositions([]);
    setTradeHistory([]);
    showToast('Conta virtual reiniciada para 1.000,00 MT.');
  };

  const toggleFavorite = (assetId) => {
    setFavorites((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  // Filtered market list
  const filteredCommodities = commodities.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(marketSearch.toLowerCase()) ||
                          c.symbol.toLowerCase().includes(marketSearch.toLowerCase());
    const matchesCat = marketCategory === 'Todos' || c.category === marketCategory;
    return matchesSearch && matchesCat;
  });

  // Admin trigger event
  const triggerMarketEvent = (eventName, impact) => {
    setCommodities((prev) =>
      prev.map((item) => {
        if (item.category === 'Agricultura' || eventName.includes('Caju')) {
          const newP = item.price * (1 + impact);
          return { ...item, price: Number(newP.toFixed(2)), change24h: item.change24h + (impact * 100) };
        }
        return item;
      })
    );
    setAdminNotification(`Evento disparado: ${eventName}`);
    setTimeout(() => setAdminNotification(''), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col pb-20 md:pb-0">
      
      {/* Toast Notification Popup */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 animate-bounce">
          <div className={`flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-semibold ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            {toastMessage.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-500" /> : <CheckCircle className="w-5 h-5 text-emerald-500" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Moz Flag Icon */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('inicio')}>
            <div className="bg-blue-700 text-white p-2 rounded-xl flex items-center justify-center font-black tracking-widest text-lg shadow-md shadow-blue-200">
              MZ
            </div>
            <div>
              <span className="text-xl font-black text-slate-900 tracking-tight">MZ TRADE</span>
              <span className="hidden sm:inline-block ml-2 text-xs bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                Moçambique
              </span>
            </div>
          </div>

          {/* Top Stats Summary */}
          <div className="hidden lg:flex items-center space-x-6 border-x border-slate-200 px-6 py-1">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase">Património Virtual</p>
              <p className="text-sm font-bold text-slate-900">{formatMT(portfolioValue)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase">Saldo Livre</p>
              <p className="text-sm font-bold text-blue-600">{formatMT(balance)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase">Rendimento</p>
              <p className={`text-sm font-bold flex items-center ${totalReturnPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {totalReturnPercent >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Quick Actions & Admin Toggle */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                isAdmin
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Modo Admin' : 'Painel Admin'}</span>
            </button>

            <button
              onClick={() => setActiveTab('perfil')}
              className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 font-bold text-sm flex items-center justify-center border border-blue-200"
            >
              U
            </button>
          </div>
        </div>
      </header>

      {/* ADMIN STATUS BANNER */}
      {isAdmin && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-inner">
          <div className="flex items-center space-x-2 max-w-7xl mx-auto w-full">
            <Zap className="w-4 h-4 animate-pulse" />
            <span>PAINEL ADMINISTRATIVO ATIVO — Controle a volatilidade, simule eventos e gira o mercado em tempo real.</span>
          </div>
        </div>
      )}

      {/* LAYOUT CONTAINER */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        
        {/* DESKTOP SIDEBAR NAVIGATION */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 space-y-1">
          <nav className="space-y-1">
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
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200 font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {isAdmin && (
            <div className="pt-6 border-t border-slate-200">
              <button
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition ${
                  activeTab === 'admin'
                    ? 'bg-amber-600 text-white shadow-md font-bold'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <Sliders className="w-5 h-5" />
                <span>Gestão Admin</span>
              </button>
            </div>
          )}

          {/* Quick Moz Market Widget */}
          <div className="mt-auto bg-gradient-to-br from-blue-900 to-indigo-900 rounded-2xl p-4 text-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-200">Destaque Local</span>
              <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold">ALTO VOLUME</span>
            </div>
            <div>
              <p className="text-xs text-blue-100">Castanha de Caju</p>
              <p className="text-lg font-bold">95,50 MT <span className="text-xs text-emerald-400 font-semibold">+4.8%</span></p>
            </div>
            <button
              onClick={() => {
                const cashew = commodities.find((c) => c.id === 'cashew');
                if (cashew) {
                  setSelectedAsset(cashew);
                  setIsTradeModalOpen(true);
                }
              }}
              className="w-full py-2 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-lg transition"
            >
              Negociar Agora
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 min-w-0">
          
          {/* 1. INÍCIO / DASHBOARD */}
          {activeTab === 'inicio' && (
            <div className="space-y-6">
              
              {/* Financial Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Património Total</span>
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-900">{formatMT(portfolioValue)}</p>
                  <p className="text-xs text-slate-500">Saldo virtual + Posições</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Saldo Disponível</span>
                    <Award className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-blue-600">{formatMT(balance)}</p>
                  <p className="text-xs text-slate-500">Pronto para investir</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Lucro Não Realizado</span>
                    <Activity className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className={`text-2xl font-black ${unrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {unrealizedPnL >= 0 ? '+' : ''}{formatMT(unrealizedPnL)}
                  </p>
                  <p className="text-xs text-slate-500">Posições em aberto</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Lucro Realizado</span>
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className={`text-2xl font-black ${realizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {realizedPnL >= 0 ? '+' : ''}{formatMT(realizedPnL)}
                  </p>
                  <p className="text-xs text-slate-500">Operações fechadas</p>
                </div>
              </div>

              {/* Chart & Quick Watchlist */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Interactive Chart Box */}
                <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Gráfico Interativo de Mercado</h2>
                      <p className="text-xs text-slate-500">Acompanhe as cotações em tempo real</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <select
                        value={selectedAsset.id}
                        onChange={(e) => {
                          const found = commodities.find((c) => c.id === e.target.value);
                          if (found) setSelectedAsset(found);
                        }}
                        className="bg-slate-100 text-xs font-bold text-slate-700 px-3 py-1.5 rounded-lg border-0 focus:ring-2 focus:ring-blue-500"
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
                          className={`px-2.5 py-1 rounded-md ${selectedChartType === 'candle' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
                        >
                          Velas
                        </button>
                        <button
                          onClick={() => setSelectedChartType('line')}
                          className={`px-2.5 py-1 rounded-md ${selectedChartType === 'line' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
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

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-2xl font-black text-slate-900">{formatMT(selectedAsset.price)}</span>
                      <span className={`ml-2 text-sm font-bold ${selectedAsset.change24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {selectedAsset.change24h >= 0 ? '+' : ''}{selectedAsset.change24h}%
                      </span>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setTradeSide('BUY');
                          setIsTradeModalOpen(true);
                        }}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                      >
                        Comprar
                      </button>
                      <button
                        onClick={() => {
                          setTradeSide('SELL');
                          setIsTradeModalOpen(true);
                        }}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                      >
                        Vender
                      </button>
                    </div>
                  </div>
                </div>

                {/* Favorites Watchlist */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-900">Produtos Favoritos</h3>
                      <button onClick={() => setActiveTab('mercados')} className="text-xs text-blue-600 font-semibold hover:underline">
                        Ver todos
                      </button>
                    </div>

                    <div className="space-y-3">
                      {commodities
                        .filter((c) => favorites.includes(c.id))
                        .map((asset) => (
                          <div
                            key={asset.id}
                            onClick={() => setSelectedAsset(asset)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                              selectedAsset.id === asset.id ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 hover:bg-slate-50'
                            }`}
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-800">{asset.symbol}</p>
                              <p className="text-[11px] text-slate-500">{asset.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold">{formatMT(asset.price)}</p>
                              <p className={`text-[10px] font-bold ${asset.change24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {asset.change24h >= 0 ? '+' : ''}{asset.change24h}%
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Educational Signals Box */}
                  <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <div className="flex items-center space-x-2 text-blue-900 font-bold text-xs mb-1">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>Mensagem do Instrutor</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      "{instructorMessages[0].content}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Positions Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Posições Abertas ({positions.length})</h3>
                  <button onClick={() => setActiveTab('carteira')} className="text-xs font-semibold text-blue-600 hover:underline">
                    Gerir Carteira
                  </button>
                </div>

                {positions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Nenhuma posição aberta de momento. Clique no botão "Comprar" ou "Vender" em Mercados para iniciar.
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
                            <tr key={pos.id} className="hover:bg-slate-50">
                              <td className="py-3 font-bold text-slate-800">{pos.symbol}</td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                  pos.type === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                }`}>
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
            </div>
          )}

          {/* 2. MERCADOS (COMMODITIES MARKET) */}
          {activeTab === 'mercados' && (
            <div className="space-y-6">
              
              {/* Header & Search */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h1 className="text-xl font-black text-slate-900">Mercado de Matérias-Primas</h1>
                  <p className="text-xs text-slate-500">Cotações e instrumentos negociáveis em Moçambique</p>
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
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-blue-300 transition flex flex-col justify-between space-y-4"
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
                        </div>

                        <button
                          onClick={() => toggleFavorite(item.id)}
                          className={`p-1.5 rounded-lg border transition ${
                            isFav ? 'bg-amber-50 border-amber-200 text-amber-500' : 'border-slate-100 text-slate-300 hover:text-slate-400'
                          }`}
                        >
                          ★
                        </button>
                      </div>

                      <div>
                        <div className="flex items-baseline justify-between">
                          <p className="text-xl font-black text-slate-900">{formatMT(item.price)}</p>
                          <p className={`text-xs font-bold flex items-center ${item.change24h >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {item.change24h >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            <span>{item.change24h >= 0 ? '+' : ''}{item.change24h}%</span>
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
                            setSelectedAsset(item);
                            setTradeSide('BUY');
                            setIsTradeModalOpen(true);
                          }}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                        >
                          Comprar
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAsset(item);
                            setTradeSide('SELL');
                            setIsTradeModalOpen(true);
                          }}
                          className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
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
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
                    <p className={`text-sm font-bold ${realizedPnL + unrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatMT(realizedPnL + unrealizedPnL)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Positions Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
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
                                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                  pos.type === 'BUY' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                }`}>
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
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-900">Histórico de Operações Fechadas</h3>

                {tradeHistory.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Ainda não fechou nenhuma posição.
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
                              <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                item.type === 'BUY' ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-700'
                              }`}>
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
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h1 className="text-xl font-black text-slate-900">Comunidade MZ Trade</h1>
                <p className="text-xs text-slate-500">Troque ideias, estratégias e sentimentos sobre o mercado moçambicano</p>
              </div>

              {/* Feed Input Box */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <textarea
                  rows={3}
                  placeholder="Partilhe a sua visão sobre as matérias-primas moçambicanas..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                ></textarea>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400">Maputo, Moçambique</span>
                  <button
                    onClick={() => showToast('Mensagem publicada na comunidade!')}
                    className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-blue-700 transition"
                  >
                    Publicar
                  </button>
                </div>
              </div>

              {/* Posts Feed */}
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
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
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                        Investidor MZ
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">{post.content}</p>

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
                        className={`flex items-center space-x-1 font-semibold ${post.userLiked ? 'text-blue-600' : 'hover:text-slate-800'}`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>{post.likes}</span>
                      </button>

                      <div className="flex items-center space-x-1">
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
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center space-y-3">
                <div className="w-20 h-20 rounded-full bg-blue-600 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-200">
                  U
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Utilizador Moçambicano</h2>
                  <p className="text-xs text-slate-500">utilizador@mztrade.co.mz</p>
                </div>
                <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full">
                  Conta Virtual Verificada
                </div>
              </div>

              {/* Account Details Box */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Detalhes da Conta Virtual</h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">ID da Conta:</span>
                    <span className="font-mono font-bold text-slate-800">MZ-884920-VIRTUAL</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Moeda da Conta:</span>
                    <span className="font-bold text-slate-800">Metical Moçambicano (MT)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Capital Inicial:</span>
                    <span className="font-bold text-slate-800">1.000,00 MT</span>
                  </div>
                </div>
              </div>

              {/* Danger / Reset Zone */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-rose-600 border-b border-slate-100 pb-2">Ações de Aprendizagem</h3>
                <p className="text-xs text-slate-500">
                  Pretende reiniciar a sua banca de demonstração para o valor original de 1.000,00 MT?
                </p>
                <button
                  onClick={resetAccount}
                  className="px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs rounded-xl transition"
                >
                  Reiniciar Banca Virtual (1.000,00 MT)
                </button>
              </div>
            </div>
          )}

          {/* 6. PAINEL ADMINISTRATIVO (ADMIN CONTROL AREA) */}
          {activeTab === 'admin' && isAdmin && (
            <div className="space-y-6">
              <div className="bg-amber-500 text-white p-6 rounded-2xl shadow-lg space-y-2">
                <h1 className="text-xl font-black">Painel de Controlo do Servidor de Simulação</h1>
                <p className="text-xs opacity-90">
                  Configure os parâmetros globais do motor financeiro. As alterações afetam as cotações em tempo real de todos os utilizadores.
                </p>
              </div>

              {adminNotification && (
                <div className="p-3 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold">
                  {adminNotification}
                </div>
              )}

              {/* Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Trend & Volatility Controls */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                    Tendência Global & Volatilidade
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
                          onClick={() => setSimulationTrend(t.id)}
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
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Simulated Events Trigger */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                    Injetar Eventos de Mercado Simultâneos
                  </h3>

                  <div className="space-y-2">
                    <button
                      onClick={() => triggerMarketEvent('Seca em Nampula impulsiona Castanha de Caju +8%', 0.08)}
                      className="w-full text-left p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 transition flex items-center justify-between"
                    >
                      <span>Seca em Nampula (+8% Caju)</span>
                      <Zap className="w-4 h-4 text-amber-600" />
                    </button>

                    <button
                      onClick={() => triggerMarketEvent('Queda na procura de Petróleo (-5%)', -0.05)}
                      className="w-full text-left p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold text-rose-900 transition flex items-center justify-between"
                    >
                      <span>Choque de Petróleo (-5% Brent)</span>
                      <AlertCircle className="w-4 h-4 text-rose-600" />
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
              onClick={() => setActiveTab(tab.id)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {tradeSide === 'BUY' ? 'Comprar' : 'Vender'} {selectedAsset.name}
                </h3>
                <p className="text-xs text-slate-400">Moeda: Meticais Moçambicanos (MT)</p>
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
                <span className="text-slate-500">Preço Atual de Execução:</span>
                <span className="text-sm font-black text-slate-900">{formatMT(selectedAsset.price)}</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Quantidade ({selectedAsset.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={tradeQty}
                  onChange={(e) => setTradeQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-3 bg-slate-100 border-0 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1 text-xs border-t border-slate-100 pt-3">
                <div className="flex justify-between text-slate-500">
                  <span>Custo Total Estimado:</span>
                  <span className="font-bold text-slate-800">{formatMT(selectedAsset.price * tradeQty)}</span>
                </div>
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
                    tradeSide === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
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