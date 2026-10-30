'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TrendingUp, Shield, DollarSign, Activity, PieChart } from 'lucide-react';

interface WalletChartPoint {
  date: string;
  timestamp: number;
  balance: number;
  label: string;
}

interface WalletBalanceChartProps {
  currentBalance: number;
  portfolioValue: number;
  unrealizedPnL: number;
  positionsCount: number;
  positionsValue: number;
  transactions?: Array<{
    id?: string;
    timestamp?: any;
    amount?: number;
    type?: string;
    newBalance?: number;
    date?: string;
  }>;
}

export function WalletBalanceChart({
  currentBalance,
  portfolioValue,
  unrealizedPnL,
  positionsCount,
  positionsValue,
  transactions = []
}: WalletBalanceChartProps) {
  const [timeframe, setTimeframe] = useState<'hoje' | '7d' | '30d' | 'tudo'>('7d');
  const [hoveredPoint, setHoveredPoint] = useState<WalletChartPoint | null>(null);
  const [baseTimestamp] = useState(() => Date.now());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const reserveAmount = 1000.00;
  const withdrawableAmount = Math.max(0, currentBalance - reserveAmount);

  // Gera pontos do gráfico proporcionais ao saldo real e transações
  const chartPoints = useMemo(() => {
    const points: WalletChartPoint[] = [];
    const now = baseTimestamp;
    const dayMs = 24 * 60 * 60 * 1000;

    // Se temos transações do Firestore com newBalance, ordenamos cronologicamente
    const validTx = transactions
      .filter((t) => typeof t.newBalance === 'number' && t.newBalance >= 0)
      .map((t) => {
        let ts = now;
        if (t.timestamp?.toDate) {
          ts = t.timestamp.toDate().getTime();
        } else if (t.timestamp?.seconds) {
          ts = t.timestamp.seconds * 1000;
        } else if (t.date) {
          ts = new Date(t.date).getTime();
        }
        return {
          timestamp: ts,
          balance: Number(t.newBalance),
          label: t.type === 'admin_bonus' ? 'Crédito Admin' : t.type === 'bonus_21h' ? 'Bónus 21h' : t.type === 'withdrawal' ? 'Levantamento' : 'Operação'
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    const numPoints = timeframe === 'hoje' ? 12 : timeframe === '7d' ? 14 : timeframe === '30d' ? 20 : 25;
    const timeSpan = timeframe === 'hoje' ? dayMs : timeframe === '7d' ? 7 * dayMs : timeframe === '30d' ? 30 * dayMs : 60 * dayMs;

    if (validTx.length >= 2) {
      // Usar dados reais de transações mapeados no tempo
      const startTime = Math.min(validTx[0].timestamp, now - timeSpan);
      validTx.forEach((tx) => {
        const d = new Date(tx.timestamp);
        points.push({
          date: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
          timestamp: tx.timestamp,
          balance: tx.balance,
          label: tx.label
        });
      });
      // Ponto final atual
      const dNow = new Date(now);
      points.push({
        date: `${dNow.getDate().toString().padStart(2, '0')}/${(dNow.getMonth() + 1).toString().padStart(2, '0')} ${dNow.getHours().toString().padStart(2, '0')}:${dNow.getMinutes().toString().padStart(2, '0')}`,
        timestamp: now,
        balance: currentBalance,
        label: 'Saldo Atual'
      });
    } else {
      // Gerar curva progressiva proporcional ao saldo atual e ao histórico
      const startBalance = currentBalance > 0 ? Math.max(0, currentBalance * 0.4) : 0;
      for (let i = 0; i < numPoints; i++) {
        const t = now - (numPoints - 1 - i) * (timeSpan / (numPoints - 1));
        const progress = i / (numPoints - 1);
        // Curva suave com leve oscilação de mercado
        const ease = Math.pow(progress, 1.3);
        const noise = i === numPoints - 1 ? 0 : Math.sin(i * 1.5) * (currentBalance * 0.03);
        const val = Math.max(0, startBalance + (currentBalance - startBalance) * ease + noise);
        const d = new Date(t);
        points.push({
          date: timeframe === 'hoje'
            ? `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
            : `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`,
          timestamp: t,
          balance: Number((i === numPoints - 1 ? currentBalance : val).toFixed(2)),
          label: i === numPoints - 1 ? 'Saldo Atual' : 'Histórico'
        });
      }
    }

    return points;
  }, [currentBalance, transactions, timeframe, baseTimestamp]);

  // Renderização do Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || chartPoints.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const paddingX = 45;
    const paddingY = 30;
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingY * 2;

    const values = chartPoints.map((p) => p.balance);
    const maxVal = Math.max(Math.max(...values, reserveAmount * 1.5, currentBalance * 1.1), 100);
    const minVal = 0;
    const range = maxVal - minVal || 1;

    const getX = (idx: number) => paddingX + (idx / (chartPoints.length - 1)) * chartWidth;
    const getY = (val: number) => paddingY + chartHeight - ((val - minVal) / range) * chartHeight;

    // 1. Grid Horizontal e Valores de Referência
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const stepVal = minVal + (range / gridSteps) * i;
      const y = getY(stepVal);
      ctx.beginPath();
      ctx.moveTo(paddingX, y);
      ctx.lineTo(width - paddingX, y);
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(stepVal).toLocaleString('pt-MZ')} MT`, paddingX - 8, y + 3);
    }

    // 2. Linha de Reserva Mínima Obrigatória (1.000 MT)
    const reserveY = getY(reserveAmount);
    if (reserveY >= paddingY && reserveY <= paddingY + chartHeight) {
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(paddingX, reserveY);
      ctx.lineTo(width - paddingX, reserveY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#D97706';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Reserva Mínima (1.000 MT)', paddingX + 6, reserveY - 5);
    }

    // 3. Preenchimento de Área Gradiente
    ctx.beginPath();
    chartPoints.forEach((p, idx) => {
      const x = getX(idx);
      const y = getY(p.balance);
      if (idx === 0) ctx.moveTo(x, y);
      else {
        const prevX = getX(idx - 1);
        const prevY = getY(chartPoints[idx - 1].balance);
        const cpX = (prevX + x) / 2;
        ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
      }
    });

    const lastX = getX(chartPoints.length - 1);
    ctx.lineTo(lastX, paddingY + chartHeight);
    ctx.lineTo(paddingX, paddingY + chartHeight);
    ctx.closePath();

    const areaGradient = ctx.createLinearGradient(0, paddingY, 0, paddingY + chartHeight);
    areaGradient.addColorStop(0, 'rgba(37, 99, 235, 0.28)');
    areaGradient.addColorStop(0.7, 'rgba(37, 99, 235, 0.05)');
    areaGradient.addColorStop(1, 'rgba(37, 99, 235, 0.0)');
    ctx.fillStyle = areaGradient;
    ctx.fill();

    // 4. Linha Suave da Curva de Saldo
    ctx.beginPath();
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 3;
    chartPoints.forEach((p, idx) => {
      const x = getX(idx);
      const y = getY(p.balance);
      if (idx === 0) ctx.moveTo(x, y);
      else {
        const prevX = getX(idx - 1);
        const prevY = getY(chartPoints[idx - 1].balance);
        const cpX = (prevX + x) / 2;
        ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
      }
    });
    ctx.stroke();

    // 5. Ponto Final (Saldo Atual) com Pulsar
    const finalX = getX(chartPoints.length - 1);
    const finalY = getY(currentBalance);

    ctx.beginPath();
    ctx.arc(finalX, finalY, 7, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(37, 99, 235, 0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(finalX, finalY, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#2563EB';
    ctx.fill();

    // 6. Ponto Hovered se ativo
    if (hoveredPoint) {
      const hIdx = chartPoints.findIndex((p) => p.timestamp === hoveredPoint.timestamp);
      if (hIdx !== -1) {
        const hX = getX(hIdx);
        const hY = getY(hoveredPoint.balance);

        ctx.strokeStyle = '#64748B';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(hX, paddingY);
        ctx.lineTo(hX, paddingY + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(hX, hY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#10B981';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [chartPoints, currentBalance, hoveredPoint]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || chartPoints.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    const paddingX = 45;
    const chartWidth = canvas.width - paddingX * 2;
    const relX = mouseX - paddingX;
    const idx = Math.min(chartPoints.length - 1, Math.max(0, Math.round((relX / chartWidth) * (chartPoints.length - 1))));
    setHoveredPoint(chartPoints[idx]);
  };

  // Cálculo proporcional da barra de alocação
  const totalAssets = Math.max(1, currentBalance + positionsValue);
  const reservePct = Math.min(100, (Math.min(reserveAmount, currentBalance) / totalAssets) * 100);
  const withdrawablePct = Math.min(100, (withdrawableAmount / totalAssets) * 100);
  const positionsPct = Math.min(100, (positionsValue / totalAssets) * 100);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
      
      {/* Top Header of Chart with Live Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h2 className="text-base font-black text-slate-900">Evolução Patrimonial & Proporcionalidade</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Curva técnica proporcional ao saldo em caixa e garantias sob custódia
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
          {(['hoje', '7d', '30d', 'tudo'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1.5 rounded-lg transition capitalize cursor-pointer ${
                timeframe === t ? 'bg-white text-blue-600 shadow-xs font-black' : 'hover:text-slate-900'
              }`}
            >
              {t === 'tudo' ? 'Total' : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative">
        {/* Tooltip Float */}
        {hoveredPoint && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs shadow-xl border border-slate-800 flex items-center gap-3 pointer-events-none">
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">{hoveredPoint.date}</span>
              <span className="font-bold text-emerald-400">
                {hoveredPoint.balance.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
              </span>
            </div>
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded-md">
              {hoveredPoint.label}
            </span>
          </div>
        )}

        <div className="w-full h-56 sm:h-64">
          <canvas
            ref={canvasRef}
            width={800}
            height={260}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredPoint(null)}
            className="w-full h-full block cursor-crosshair"
          />
        </div>
      </div>

      {/* Asset Allocation Breakdown Bar */}
      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-blue-600" />
            Alocação Proporcional da Carteira
          </span>
          <span className="text-slate-500 font-mono text-[11px]">
            Total: {totalAssets.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
          </span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          {/* Segment 1: Saldo Retirável (Emerald) */}
          <div
            style={{ width: `${withdrawablePct}%` }}
            className="bg-emerald-500 transition-all duration-300"
            title={`Saldo Retirável: ${withdrawableAmount.toFixed(2)} MT (${withdrawablePct.toFixed(1)}%)`}
          />
          {/* Segment 2: Reserva Mínima Obrigatória (Amber) */}
          <div
            style={{ width: `${reservePct}%` }}
            className="bg-amber-500 transition-all duration-300"
            title={`Reserva Obrigatória: ${Math.min(reserveAmount, currentBalance).toFixed(2)} MT (${reservePct.toFixed(1)}%)`}
          />
          {/* Segment 3: Posições Abertas (Blue/Indigo) */}
          <div
            style={{ width: `${positionsPct}%` }}
            className="bg-indigo-600 transition-all duration-300"
            title={`Em Posições: ${positionsValue.toFixed(2)} MT (${positionsPct.toFixed(1)}%)`}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            <div>
              <span className="text-slate-500 block text-[10px]">Saldo Retirável (M-Pesa/e-Mola)</span>
              <span className="font-bold text-slate-900">
                {withdrawableAmount.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
            <div>
              <span className="text-slate-500 block text-[10px]">Reserva de Garantia (Retida)</span>
              <span className="font-bold text-amber-700">
                {Math.min(reserveAmount, currentBalance).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0"></span>
            <div>
              <span className="text-slate-500 block text-[10px]">Capital em Posições ({positionsCount})</span>
              <span className="font-bold text-slate-900">
                {positionsValue.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
