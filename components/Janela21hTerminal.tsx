'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  X
} from 'lucide-react';
import {
  getMaputoTimeDetails,
  getMaputoTodayDate,
  evaluate21hOrder,
  OrderExecutionEvaluation,
  MaputoTimeDetails
} from '@/lib/maputoTime';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/src/firebase';
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp
} from 'firebase/firestore';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

type Timeframe = 'M1' | 'M5' | 'M15' | 'H1';

// Gerador de dados históricos realistas por timeframe
function generateHistoricalCandles(tf: Timeframe, basePrice = 1482.50): CandleData[] {
  const configs: Record<Timeframe, { count: number; intervalMins: number; volatility: number }> = {
    M1: { count: 32, intervalMins: 1, volatility: 0.9 },
    M5: { count: 26, intervalMins: 5, volatility: 2.4 },
    M15: { count: 22, intervalMins: 15, volatility: 4.8 },
    H1: { count: 18, intervalMins: 60, volatility: 9.5 }
  };

  const { count, intervalMins, volatility } = configs[tf];
  const list: CandleData[] = [];
  const now = Date.now();
  let current = basePrice - (Math.random() - 0.5) * volatility * 4;

  for (let i = count; i >= 1; i--) {
    const open = Number(current.toFixed(2));
    const trend = (Math.random() - 0.48) * volatility;
    const close = Number((open + trend).toFixed(2));
    const high = Number((Math.max(open, close) + Math.random() * (volatility * 0.7)).toFixed(2));
    const low = Number((Math.min(open, close) - Math.random() * (volatility * 0.7)).toFixed(2));

    const t = new Date(now - i * intervalMins * 60000);
    const timeStr = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;

    list.push({ time: timeStr, open, high, low, close });
    current = close;
  }

  return list;
}

interface Janela21hTerminalProps {
  dailyConfig: {
    actionType: 'buy' | 'sell';
    date: string;
    startHour: number;
    endHour: number;
    forceOpen: boolean;
  };
  onOrderExecuted?: (newBalance: number) => void;
}

export default function Janela21hTerminal({ dailyConfig, onOrderExecuted }: Janela21hTerminalProps) {
  const { user, userProfile, updateBalance } = useAuth();

  // Estados de Tempo e Configuração do Gráfico
  const [maputoTime, setMaputoTime] = useState<MaputoTimeDetails>(getMaputoTimeDetails());
  const [chartType, setChartType] = useState<'candle' | 'line'>('candle');
  const [timeframe, setTimeframe] = useState<Timeframe>('M5');

  // Preço Ao Vivo
  const [currentPrice, setCurrentPrice] = useState<number>(1482.50);
  const [lastTickDir, setLastTickDir] = useState<'up' | 'down'>('up');
  const tickCounterRef = useRef<number>(0);

  // Histórico de Velas por Timeframe
  const [candles, setCandles] = useState<CandleData[]>(() => generateHistoricalCandles('M5', 1482.50));

  // Estados de Execução da Ordem
  const [isProcessingOrder, setIsProcessingOrder] = useState<boolean>(false);
  const [orderModalResult, setOrderModalResult] = useState<{
    open: boolean;
    evaluation: OrderExecutionEvaluation | null;
    action: 'buy' | 'sell';
    ticket: string;
  }>({
    open: false,
    evaluation: null,
    action: 'buy',
    ticket: ''
  });

  // Atualizar Relógio de Maputo a cada 1 segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setMaputoTime(getMaputoTimeDetails());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Quando o utilizador altera o timeframe (M1, M5, M15, H1)
  const handleTimeframeChange = (newTf: Timeframe) => {
    setTimeframe(newTf);
    const generated = generateHistoricalCandles(newTf, currentPrice);
    setCandles(generated);
  };

  // Motor de Comportamento Real de Forex (Ticks dinâmicos, volatilidade e novas velas)
  useEffect(() => {
    const intervalMs = timeframe === 'M1' ? 650 : timeframe === 'M5' ? 1100 : 1600;

    const tickInterval = setInterval(() => {
      setCurrentPrice((prev) => {
        // Movimento Browniano realista com oscilação contínua
        const delta = (Math.random() - 0.495) * (timeframe === 'M1' ? 0.45 : 0.85);
        const nextPrice = Number((prev + delta).toFixed(2));
        setLastTickDir(nextPrice >= prev ? 'up' : 'down');

        tickCounterRef.current += 1;

        // Atualizar a vela ativa em tempo real
        setCandles((prevCandles) => {
          if (prevCandles.length === 0) return prevCandles;

          // Limite de ticks por timeframe para formar nova vela
          const ticksPerCandle = timeframe === 'M1' ? 20 : timeframe === 'M5' ? 45 : 90;

          if (tickCounterRef.current >= ticksPerCandle) {
            tickCounterRef.current = 0;
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const newCandle: CandleData = {
              time: timeStr,
              open: nextPrice,
              high: nextPrice,
              low: nextPrice,
              close: nextPrice
            };
            return [...prevCandles.slice(1), newCandle];
          }

          const lastIdx = prevCandles.length - 1;
          const last = prevCandles[lastIdx];
          const updatedLast: CandleData = {
            ...last,
            close: nextPrice,
            high: Math.max(last.high, nextPrice),
            low: Math.min(last.low, nextPrice)
          };

          const nextArr = [...prevCandles];
          nextArr[lastIdx] = updatedLast;
          return nextArr;
        });

        return nextPrice;
      });
    }, intervalMs);

    return () => clearInterval(tickInterval);
  }, [timeframe]);

  // Saldo e validação de sessão
  const userBalance = Number(userProfile?.balance ?? userProfile?.saldoVirtual ?? 0);
  const todayMaputoStr = maputoTime.dateStr;
  const userClaimedToday = userProfile?.lastClaimDate === todayMaputoStr;
  const isWindowActive = maputoTime.isInWindow || dailyConfig.forceOpen;

  // Executar Ordem de Compra ou Venda
  const handleExecuteOrder = async (action: 'buy' | 'sell') => {
    if (!user) {
      alert('Por favor, inicie sessão na sua conta para negociar.');
      return;
    }

    if (isProcessingOrder) return;

    // Avaliação matemática estrita pelas regras
    const evaluation = evaluate21hOrder({
      currentBalance: userBalance,
      userAction: action,
      adminAction: dailyConfig.actionType,
      forceOpen: dailyConfig.forceOpen,
      alreadyClaimedToday: userClaimedToday
    });

    const orderTicket = `TR-${Math.floor(100000 + Math.random() * 900000)}`;

    if (!evaluation.allowed) {
      setOrderModalResult({
        open: true,
        evaluation,
        action,
        ticket: orderTicket
      });
      return;
    }

    try {
      setIsProcessingOrder(true);
      await new Promise((r) => setTimeout(r, 700));

      const finalBalance = evaluation.newBalance;
      const userRef = doc(db, 'users', user.uid);
      const updatePayload: Record<string, unknown> = {
        balance: finalBalance,
        saldoVirtual: finalBalance,
        patrimonioTotal: finalBalance,
        atualizadoEm: serverTimestamp(),
        ultimaOperacao21h: {
          ticket: orderTicket,
          data: todayMaputoStr,
          hora: maputoTime.timeFormatted,
          tipo: action,
          resultado: evaluation.won ? 'lucro' : 'perda',
          valor: evaluation.won ? evaluation.gain : -evaluation.loss,
          saldoNovo: finalBalance
        }
      };

      if (evaluation.won) {
        updatePayload.lastClaimDate = todayMaputoStr;
      }

      await updateDoc(userRef, updatePayload);

      // Registrar transação
      await addDoc(collection(db, 'transactions'), {
        uid: user.uid,
        userId: user.uid,
        userEmail: user.email || '',
        userName: userProfile?.nome || 'Investidor TapRise',
        ticket: orderTicket,
        type: evaluation.won ? 'ordem_21h_lucro' : 'ordem_21h_perda',
        amount: evaluation.won ? evaluation.gain : -evaluation.loss,
        oldBalance: evaluation.oldBalance,
        newBalance: finalBalance,
        actionType: action,
        date: todayMaputoStr,
        timestamp: serverTimestamp(),
        description: evaluation.won
          ? `Execução de ${action === 'buy' ? 'COMPRA' : 'VENDA'} (+${evaluation.gain.toFixed(2)} MT)`
          : `Execução de ${action === 'buy' ? 'COMPRA' : 'VENDA'} (-${evaluation.loss.toFixed(2)} MT)`
      });

      await updateBalance(finalBalance, finalBalance);
      if (onOrderExecuted) {
        onOrderExecuted(finalBalance);
      }

      setOrderModalResult({
        open: true,
        evaluation,
        action,
        ticket: orderTicket
      });
    } catch (err: any) {
      console.error('Erro na ordem:', err);
      alert(`Falha na ordem: ${err.message || 'Erro de conexão'}`);
    } finally {
      setIsProcessingOrder(false);
    }
  };

  // Dimensões do Gráfico
  const chartHeight = 210;
  const chartWidth = 720;

  const minPrice = useMemo(() => {
    const lows = candles.map((c) => c.low);
    return Math.min(...lows, currentPrice) - 0.8;
  }, [candles, currentPrice]);

  const maxPrice = useMemo(() => {
    const highs = candles.map((c) => c.high);
    return Math.max(...highs, currentPrice) + 0.8;
  }, [candles, currentPrice]);

  const priceRange = maxPrice - minPrice || 1;

  const getY = useCallback((val: number) => {
    return chartHeight - ((val - minPrice) / priceRange) * (chartHeight - 30) - 15;
  }, [minPrice, priceRange]);

  const candleGap = chartWidth / Math.max(candles.length, 1);
  const candleWidth = Math.max(4, Math.min(12, candleGap * 0.7));

  const linePoints = useMemo(() => {
    return candles.map((c, i) => {
      const x = i * candleGap + candleGap / 2;
      const y = getY(c.close);
      return `${x},${y}`;
    }).join(' ');
  }, [candles, candleGap, getY]);

  return (
    <div className="bg-[#0b1220] rounded-2xl p-4 sm:p-5 text-white border border-slate-800 shadow-xl relative overflow-hidden">
      
      {/* ======================================================== */}
      {/* 1. TOPO COMPACTO E LIMPO (Ativo, Preço e Status) */}
      {/* ======================================================== */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 gap-3">
        
        {/* Ativo e Cotação */}
        <div className="flex items-center space-x-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm sm:text-base tracking-wide text-white">
                BMM/MZN
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                Spot
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-base sm:text-lg font-black font-mono tracking-tight transition-colors ${
                lastTickDir === 'up' ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {currentPrice.toFixed(2)} MT
              </span>
              <span className="text-[11px] font-bold text-emerald-400">
                +2,84%
              </span>
            </div>
          </div>
        </div>

        {/* Relógio e Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{maputoTime.timeFormatted}</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border bg-slate-900/80 border-slate-800">
            <span className={`w-2 h-2 rounded-full ${
              maputoTime.isWeekend
                ? 'bg-rose-500'
                : isWindowActive
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
            }`}></span>
            <span className={
              maputoTime.isWeekend
                ? 'text-rose-400'
                : isWindowActive
                  ? 'text-emerald-400'
                  : 'text-amber-400'
            }>
              {maputoTime.isWeekend ? 'Fechado' : isWindowActive ? '21h Aberta' : '21:00'}
            </span>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. GRÁFICO REAL DE FOREX (Velas Japonesas / Linha) */}
      {/* ======================================================== */}
      <div className="mt-3 bg-slate-950/70 rounded-xl border border-slate-800/80 p-3 relative overflow-hidden max-w-full w-full">
        
        {/* Barra de Controles: Tipo de Gráfico & Timeframes */}
        <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-slate-900 text-xs gap-2 max-w-full overflow-hidden">
          
          {/* Tipo de Gráfico */}
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 shrink-0 max-w-full">
            <button
              type="button"
              onClick={() => setChartType('candle')}
              className={`px-2.5 py-1 rounded font-bold transition cursor-pointer text-xs shrink-0 ${
                chartType === 'candle' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Velas
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`px-2.5 py-1 rounded font-bold transition cursor-pointer text-xs shrink-0 ${
                chartType === 'line' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Linha
            </button>
          </div>

          {/* Timeframes: M1, M5, M15, H1 */}
          <div className="flex space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 font-mono text-xs">
            {(['M1', 'M5', 'M15', 'H1'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => handleTimeframeChange(tf)}
                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

        </div>

        {/* Área do Gráfico */}
        <div className="relative w-full h-[210px] overflow-hidden select-none">
          
          {/* Linhas de Grade e Valores */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] font-mono text-slate-700">
            <div className="border-b border-slate-900/60 pb-0.5 flex justify-between">
              <span>{maxPrice.toFixed(2)}</span>
            </div>
            <div className="border-b border-slate-900/40 pb-0.5 flex justify-between">
              <span>{((maxPrice + minPrice) / 2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span>{minPrice.toFixed(2)}</span>
            </div>
          </div>

          <svg
            className="w-full h-full"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* MODO VELAS */}
            {chartType === 'candle' && (
              <g>
                {candles.map((candle, i) => {
                  const x = i * candleGap + candleGap / 2;
                  const isBull = candle.close >= candle.open;
                  const color = isBull ? '#10b981' : '#ef4444';

                  const yHigh = getY(candle.high);
                  const yLow = getY(candle.low);
                  const yOpen = getY(candle.open);
                  const yClose = getY(candle.close);

                  const bodyTop = Math.min(yOpen, yClose);
                  const bodyHeight = Math.max(Math.abs(yClose - yOpen), 2);

                  return (
                    <g key={i}>
                      <line
                        x1={x}
                        y1={yHigh}
                        x2={x}
                        y2={yLow}
                        stroke={color}
                        strokeWidth="1.2"
                      />
                      <rect
                        x={x - candleWidth / 2}
                        y={bodyTop}
                        width={candleWidth}
                        height={bodyHeight}
                        fill={color}
                        rx="1"
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* MODO LINHA */}
            {chartType === 'line' && (
              <g>
                <polygon
                  points={`0,${chartHeight} ${linePoints} ${chartWidth},${chartHeight}`}
                  fill="url(#chartGradient)"
                />
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={linePoints}
                />
              </g>
            )}

            {/* Linha Tracejada do Preço Atual */}
            <line
              x1="0"
              y1={getY(currentPrice)}
              x2={chartWidth}
              y2={getY(currentPrice)}
              stroke={lastTickDir === 'up' ? '#10b981' : '#ef4444'}
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.8"
            />
          </svg>

          {/* Tag de Preço Flutuante no Eixo Y */}
          <div
            className={`absolute right-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded text-white pointer-events-none transition-all duration-200 ${
              lastTickDir === 'up' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
            style={{
              top: `${Math.max(6, Math.min(chartHeight - 24, getY(currentPrice) - 10))}px`
            }}
          >
            {currentPrice.toFixed(2)} MT
          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* 3. BOTÕES COMPRAR E VENDER (LADO A LADO, SÓ AS PALAVRAS) */}
      {/* ======================================================== */}
      {/* Solicitado: comprar vermelho vender verde, lado a lado, sem palavras adicionais */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        
        {/* COMPRAR: Vermelho */}
        <button
          type="button"
          onClick={() => handleExecuteOrder('buy')}
          disabled={isProcessingOrder}
          className="w-full py-4 px-4 rounded-xl font-black text-base sm:text-lg tracking-wider transition-all duration-150 cursor-pointer text-center bg-red-600 hover:bg-red-500 active:scale-98 text-white shadow-lg shadow-red-600/30 disabled:opacity-50"
        >
          {isProcessingOrder ? (
            <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            'Comprar'
          )}
        </button>

        {/* VENDER: Verde */}
        <button
          type="button"
          onClick={() => handleExecuteOrder('sell')}
          disabled={isProcessingOrder}
          className="w-full py-4 px-4 rounded-xl font-black text-base sm:text-lg tracking-wider transition-all duration-150 cursor-pointer text-center bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white shadow-lg shadow-emerald-600/30 disabled:opacity-50"
        >
          {isProcessingOrder ? (
            <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            'Vender'
          )}
        </button>

      </div>

      {/* ======================================================== */}
      {/* MODAL DE RESULTADO DA ORDEM */}
      {/* ======================================================== */}
      {orderModalResult.open && orderModalResult.evaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 max-w-sm w-full relative shadow-2xl">
            
            <button
              type="button"
              onClick={() => setOrderModalResult({ open: false, evaluation: null, action: 'buy', ticket: '' })}
              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/80 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-2 mt-1">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto ${
                orderModalResult.evaluation.won
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}>
                {orderModalResult.evaluation.won ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>

              <h3 className="text-base font-black text-white">
                {orderModalResult.evaluation.won ? 'Ordem Concluída' : 'Ordem Encerrada'}
              </h3>
              
              <p className="text-xs text-slate-400 font-mono">
                {orderModalResult.ticket}
              </p>
            </div>

            <div className="mt-4 bg-slate-950 p-3 rounded-xl border border-slate-900 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Ordem:</span>
                <span className="font-bold text-white uppercase">{orderModalResult.action === 'buy' ? 'Compra' : 'Venda'}</span>
              </div>

              {orderModalResult.evaluation.won ? (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Resultado (+4,73%):</span>
                  <span>+{orderModalResult.evaluation.gain.toFixed(2)} MT</span>
                </div>
              ) : orderModalResult.evaluation.loss > 0 ? (
                <div className="flex justify-between text-rose-400 font-bold">
                  <span>Resultado:</span>
                  <span>-{orderModalResult.evaluation.loss.toFixed(2)} MT</span>
                </div>
              ) : null}

              <div className="flex justify-between pt-1.5 border-t border-slate-900 text-white font-bold">
                <span>Novo Saldo:</span>
                <span>{orderModalResult.evaluation.newBalance.toFixed(2)} MT</span>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400 leading-snug text-center">
              {orderModalResult.evaluation.reasonText}
            </p>

            <button
              type="button"
              onClick={() => setOrderModalResult({ open: false, evaluation: null, action: 'buy', ticket: '' })}
              className="w-full mt-4 py-2.5 rounded-xl font-bold text-xs uppercase bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
            >
              OK
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
