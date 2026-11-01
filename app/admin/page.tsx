'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Users,
  PieChart,
  BarChart2,
  Bell,
  Clock,
  PlusCircle,
  CheckCircle,
  AlertCircle,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  PauseCircle,
  PlayCircle,
  Send,
  Sliders,
  Wallet,
  Check,
  X,
  Calendar,
  Lock,
  FileText,
  Zap,
  Flame,
  Sparkles,
  Smartphone,
  MessageSquare,
  MessageCircle,
  Pin,
  Trash2,
  ExternalLink,
  BookOpen,
  CreditCard
} from 'lucide-react';
import { useAuth, ADMIN_EMAIL } from '@/context/AuthContext';
import { getMaputoTodayDate, getMaputoTimeDetails, evaluate21hOrder, MaputoTimeDetails } from '@/lib/maputoTime';
import { db } from '@/src/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  onSnapshot
} from 'firebase/firestore';

interface WithdrawalAdminRecord {
  id: string;
  uid?: string;
  userEmail?: string;
  userName?: string;
  operator?: string;
  phoneNumber?: string;
  amount?: number;
  status?: string;
  processingTime?: string;
  statusMessage?: string;
  requestedAt?: any;
  dateStr?: string;
  fee?: number;
}

interface UserRecord {
  id: string;
  uid?: string;
  nome?: string;
  email?: string;
  provincia?: string;
  idade?: number;
  saldoVirtual?: number;
  balance?: number;
  saldoDisponivel?: number;
  saldoTotal?: number;
  status?: string;
  ultimoCreditoEm?: any;
  patrimonioTotal?: number;
  criadoEm?: any;
  inviteCode?: string;
  invitedBy?: string;
  invitedByCode?: string;
  commissionPaid?: boolean;
  totalComissoes?: number;
  indicadosCount?: number;
}

interface CommodityConfig {
  id: string;
  name: string;
  symbol: string;
  category: string;
  isPaused: boolean;
  basePrice: number;
  unit: string;
}

interface MarketHoursConfig {
  scheduleText: string;
  openHour: number;
  closeHour: number;
  openDays: string[];
  globalMarketOpen: boolean;
  pausedAssets: Record<string, boolean>;
  updatedAt?: any;
}

interface AnnouncementConfig {
  active: boolean;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent' | 'success';
  author: string;
  updatedAt?: any;
}

interface InstructorTipConfig {
  title: string;
  badge: string;
  author: string;
  content: string;
  active: boolean;
  updatedAt?: any;
  updatedBy?: string;
}

interface DailyConfig {
  actionType: 'buy' | 'sell';
  date: string;
  startHour: number;
  endHour: number;
  forceOpen: boolean;
  updatedAt?: any;
  updatedBy?: string;
}

interface TransactionRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
  adminEmail: string;
  timestamp: any;
  description: string;
}

const DEFAULT_COMMODITIES: CommodityConfig[] = [
  { id: 'milho', name: 'Milho Branco (Chókwè)', symbol: 'MILHO-MZ', category: 'Agricultura', isPaused: false, basePrice: 42.50, unit: 'Kg' },
  { id: 'cashew', name: 'Castanha de Caju (Nampula)', symbol: 'CAJU-MZ', category: 'Agricultura', isPaused: false, basePrice: 95.50, unit: 'Kg' },
  { id: 'brent', name: 'Petróleo Bruto (Brent)', symbol: 'BRENT', category: 'Energia', isPaused: false, basePrice: 5120.50, unit: 'Barril (bbl)' },
  { id: 'gas', name: 'Gás Natural (Rovuma LNG)', symbol: 'NATGAS', category: 'Energia', isPaused: false, basePrice: 185.30, unit: 'MMBtu' },
  { id: 'coal', name: 'Carvão Mineral (Moatize)', symbol: 'COAL-MZ', category: 'Energia', isPaused: false, basePrice: 8200.00, unit: 'Tonelada (t)' },
  { id: 'gold', name: 'Ouro Fino 999 (Manica)', symbol: 'XAU', category: 'Metais', isPaused: false, basePrice: 148500.00, unit: 'Onça (oz)' },
  { id: 'silver', name: 'Prata Fina', symbol: 'XAG', category: 'Metais', isPaused: false, basePrice: 1820.00, unit: 'Onça (oz)' },
  { id: 'copper', name: 'Cobre de Alta Pureza', symbol: 'COPPER', category: 'Metais', isPaused: false, basePrice: 580.00, unit: 'Kg' },
  { id: 'aluminum', name: 'Alumínio (Mozal Spec)', symbol: 'ALUM', category: 'Metais', isPaused: false, basePrice: 1540.00, unit: 'Tonelada (t)' }
];

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // REGRA 1 - ACESSO EXCLUSIVO:
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Active Tab: 1 - Visão Geral, 2 - Usuários, 3 - Levantamentos, 4 - Jogo 21h, 5 - Mercado, 6 - Comunicados, 7 - Dica do Instrutor, 8 - Chat Global
  const [activeTab, setActiveTab] = useState<'visao-geral' | 'usuarios' | 'levantamentos' | 'jogo-21h' | 'mercado' | 'comunicados' | 'dica-instrutor' | 'chat'>('visao-geral');

  // Dica do Instrutor State (doc: config/dicaInstrutor)
  const [instructorTipText, setInstructorTipText] = useState<string>('Nunca invista mais de 10% do seu saldo disponível numa única operação. Diversifique entre setores (Energia, Metais e Agricultura) para proteger o seu capital virtual!');
  const [instructorTipAuthor, setInstructorTipAuthor] = useState<string>('Mateus Maputo');
  const [instructorTipTipo, setInstructorTipTipo] = useState<string>('Dica de Ouro');
  const [instructorTip, setInstructorTip] = useState<InstructorTipConfig>({
    title: 'Dica do Instrutor',
    badge: 'Dica de Ouro',
    author: 'Instrutor Mateus Maputo',
    content: 'Nunca invista mais de 10% do seu saldo disponível numa única operação. Diversifique entre setores (Energia, Metais e Agricultura) para proteger o seu capital virtual!',
    active: true
  });
  const [isSavingInstructorTip, setIsSavingInstructorTip] = useState<boolean>(false);

  // Chat notice broadcast state
  const [chatNoticeText, setChatNoticeText] = useState<string>('');
  const [isSendingChatNotice, setIsSendingChatNotice] = useState<boolean>(false);
  const [pinChatNotice, setPinChatNotice] = useState<boolean>(true);
  const [adminChatMessages, setAdminChatMessages] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('taprise_offline_admin_chat_msgs');
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return [];
  });
  const [pinnedChatConfig, setPinnedChatConfig] = useState<any>(null);

  // State
  const [usersList, setUsersList] = useState<UserRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('taprise_offline_admin_users');
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return [];
  });
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [userSearch, setUserSearch] = useState<string>('');
  const [filterZeroBalance, setFilterZeroBalance] = useState<boolean>(false);
  const [adminWithdrawals, setAdminWithdrawals] = useState<WithdrawalAdminRecord[]>([]);

  // Stats
  const [ordersTodayCount, setOrdersTodayCount] = useState<number>(0);
  const [recentTransactions, setRecentTransactions] = useState<TransactionRecord[]>([]);

  // Jogo 21h State (admin_config/daily)
  const [dailyConfig, setDailyConfig] = useState<DailyConfig>({
    actionType: 'buy',
    date: getMaputoTodayDate(),
    startHour: 21,
    endHour: 21.5,
    forceOpen: false
  });
  const [isSavingDaily, setIsSavingDaily] = useState<boolean>(false);
  const [dailyClaimsToday, setDailyClaimsToday] = useState<TransactionRecord[]>([]);
  const [maputoTime, setMaputoTime] = useState<MaputoTimeDetails>(getMaputoTimeDetails());
  const [adminTestResult, setAdminTestResult] = useState<{
    action: 'buy' | 'sell';
    won: boolean;
    message: string;
  } | null>(null);

  const handleRunAdminTest = (testAction: 'buy' | 'sell') => {
    const res = evaluate21hOrder({
      currentBalance: 1000,
      userAction: testAction,
      adminAction: dailyConfig.actionType,
      forceOpen: dailyConfig.forceOpen,
      alreadyClaimedToday: false
    });

    if (res.won) {
      setAdminTestResult({
        action: testAction,
        won: true,
        message: `✅ TESTE APROVADO: Ao clicar em ${testAction === 'buy' ? 'COMPRAR' : 'VENDER'}, o investidor GANHA +4,73% (+${res.gain.toFixed(2)} MT). Saldo de 1.000 MT vai para ${res.newBalance.toFixed(2)} MT.`
      });
    } else {
      setAdminTestResult({
        action: testAction,
        won: false,
        message: `❌ TESTE STOP LOSS: Ao clicar em ${testAction === 'buy' ? 'COMPRAR' : 'VENDER'}, o investidor PERDE 100 MT. Motivo: ${res.reasonText}`
      });
    }
  };

  // Modal "Creditar / Gerir Saldo"
  const [selectedUserForCredit, setSelectedUserForCredit] = useState<UserRecord | null>(null);
  const [creditAmount, setCreditAmount] = useState<string>('5000');
  const [isCrediting, setIsCrediting] = useState<boolean>(false);

  // Market hours & pause configuration
  const [marketConfig, setMarketConfig] = useState<MarketHoursConfig>({
    scheduleText: 'Segunda a Sexta às 21:00',
    openHour: 8,
    closeHour: 21,
    openDays: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
    globalMarketOpen: true,
    pausedAssets: {}
  });
  const [isSavingMarket, setIsSavingMarket] = useState<boolean>(false);

  // Announcement state
  const [announcement, setAnnouncement] = useState<AnnouncementConfig>({
    active: false,
    title: 'Aviso da Mesa de Operações TapRise',
    message: 'Horário oficial de cotações ativo. Consulte as regras institucionais.',
    type: 'info',
    author: 'Administração TapRise'
  });
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // PROTEÇÃO DE ROTA (REGRA 1)
  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin) {
        router.push('/');
      }
    }
  }, [user, isAdmin, authLoading, router]);

  // Carregar Dados do Firestore em Tempo Real
  useEffect(() => {
    if (!isAdmin) return;

    // 1. Ouvir Usuários em tempo real (users e usuarios)
    const usersRef = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const users: UserRecord[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const saldoDisp = typeof d.saldoDisponivel === 'number'
          ? d.saldoDisponivel
          : (typeof d.balance === 'number' ? d.balance : (typeof d.saldoVirtual === 'number' ? d.saldoVirtual : 0));
        const saldoTot = typeof d.saldoTotal === 'number'
          ? d.saldoTotal
          : (typeof d.patrimonioTotal === 'number' ? d.patrimonioTotal : saldoDisp);

        users.push({
          id: docSnap.id,
          uid: docSnap.id,
          nome: d.nome || d.displayName || 'Investidor TapRise',
          email: d.email || 'Sem e-mail',
          provincia: d.provincia || 'Maputo',
          idade: d.idade || 18,
          saldoDisponivel: saldoDisp,
          saldoTotal: saldoTot,
          saldoVirtual: saldoDisp,
          balance: saldoDisp,
          patrimonioTotal: saldoTot,
          status: d.status || (saldoDisp > 0 ? 'ativo' : 'aguardando'),
          ultimoCreditoEm: d.ultimoCreditoEm,
          criadoEm: d.criadoEm || d.createdAt,
          inviteCode: d.inviteCode,
          invitedBy: d.invitedBy,
          invitedByCode: d.invitedByCode,
          commissionPaid: !!d.commissionPaid,
          totalComissoes: d.totalComissoes || 0,
          indicadosCount: d.indicadosCount || 0
        });
      });
      users.sort((a, b) => {
        const timeA = a.criadoEm?.seconds || (a.criadoEm ? new Date(a.criadoEm).getTime() / 1000 : 0);
        const timeB = b.criadoEm?.seconds || (b.criadoEm ? new Date(b.criadoEm).getTime() / 1000 : 0);
        return timeB - timeA;
      });
      setUsersList(users);
      setLoadingUsers(false);
    }, (error) => {
      console.warn('Erro ao ler usuários em tempo real:', error);
      setLoadingUsers(false);
    });

    const usuariosRef = collection(db, 'usuarios');
    const unsubscribeUsuarios = onSnapshot(usuariosRef, (snapshot) => {
      if (!snapshot.empty) {
        setUsersList((prev) => {
          const map = new Map<string, UserRecord>();
          prev.forEach((u) => map.set(u.id, u));
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            const existing = map.get(docSnap.id);
            const saldoDisp = typeof d.saldoDisponivel === 'number'
              ? d.saldoDisponivel
              : (existing?.saldoDisponivel ?? 0);
            const saldoTot = typeof d.saldoTotal === 'number'
              ? d.saldoTotal
              : (existing?.saldoTotal ?? saldoDisp);

            map.set(docSnap.id, {
              id: docSnap.id,
              uid: docSnap.id,
              nome: d.nome || d.displayName || existing?.nome || 'Investidor TapRise',
              email: d.email || existing?.email || 'Sem e-mail',
              provincia: d.provincia || existing?.provincia || 'Maputo',
              idade: d.idade || existing?.idade || 18,
              saldoDisponivel: saldoDisp,
              saldoTotal: saldoTot,
              saldoVirtual: saldoDisp,
              balance: saldoDisp,
              patrimonioTotal: saldoTot,
              status: d.status || existing?.status || (saldoDisp > 0 ? 'ativo' : 'aguardando'),
              ultimoCreditoEm: d.ultimoCreditoEm || existing?.ultimoCreditoEm,
              criadoEm: d.criadoEm || existing?.criadoEm,
              inviteCode: d.inviteCode || existing?.inviteCode,
              invitedBy: d.invitedBy || existing?.invitedBy,
              invitedByCode: d.invitedByCode || existing?.invitedByCode,
              commissionPaid: d.commissionPaid !== undefined ? !!d.commissionPaid : existing?.commissionPaid,
              totalComissoes: d.totalComissoes || existing?.totalComissoes || 0,
              indicadosCount: d.indicadosCount || existing?.indicadosCount || 0
            });
          });
          const merged = Array.from(map.values());
          merged.sort((a, b) => {
            const timeA = a.criadoEm?.seconds || (a.criadoEm ? new Date(a.criadoEm).getTime() / 1000 : 0);
            const timeB = b.criadoEm?.seconds || (b.criadoEm ? new Date(b.criadoEm).getTime() / 1000 : 0);
            return timeB - timeA;
          });
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('taprise_offline_admin_users', JSON.stringify(merged.slice(0, 100)));
            } catch {}
          }
          return merged;
        });
      }
    }, () => {});

    // 2. Ouvir Configuração de Mercado (admin_config/market_hours)
    const marketDocRef = doc(db, 'admin_config', 'market_hours');
    const unsubscribeMarket = onSnapshot(marketDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as MarketHoursConfig;
        setMarketConfig({
          scheduleText: data.scheduleText || 'Segunda a Sexta às 21:00',
          openHour: typeof data.openHour === 'number' ? data.openHour : 8,
          closeHour: typeof data.closeHour === 'number' ? data.closeHour : 21,
          openDays: data.openDays || ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'],
          globalMarketOpen: data.globalMarketOpen !== undefined ? data.globalMarketOpen : true,
          pausedAssets: data.pausedAssets || {}
        });
      }
    }, (e) => console.warn('Erro config mercado:', e));

    // 3. Ouvir Comunicados (admin_config/announcement)
    const annDocRef = doc(db, 'admin_config', 'announcement');
    const unsubscribeAnn = onSnapshot(annDocRef, (snap) => {
      if (snap.exists()) {
        setAnnouncement(snap.data() as AnnouncementConfig);
      }
    }, (e) => console.warn('Erro comunicados:', e));

    // 4. Ouvir Transações do Admin (admin_bonus logs)
    const transRef = collection(db, 'transactions');
    const unsubscribeTrans = onSnapshot(transRef, (snap) => {
      const list: TransactionRecord[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          userId: d.userId || '',
          userName: d.userName || 'Investidor',
          userEmail: d.userEmail || '',
          type: d.type || 'admin_bonus',
          amount: Number(d.amount) || 0,
          previousBalance: Number(d.previousBalance) || 0,
          newBalance: Number(d.newBalance) || 0,
          adminEmail: d.adminEmail || '',
          timestamp: d.timestamp,
          description: d.description || ''
        });
      });
      // Ordenar por timestamp decrescente
      list.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setRecentTransactions(list);

      // Separar coletas do Jogo 21h hoje
      const todayStr = getMaputoTodayDate();
      const claimsToday = list.filter((t) => t.type === 'bonus_21h');
      setDailyClaimsToday(claimsToday);
    }, (e) => console.warn('Erro transações:', e));

    // 5. Contar ordens abertas hoje
    const ordersRef = collection(db, 'orders');
    const unsubscribeOrders = onSnapshot(ordersRef, (snap) => {
      setOrdersTodayCount(snap.size);
    }, () => {});

    // 6. Ouvir Configuração do Jogo 21h (admin_config/daily)
    const dailyDocRef = doc(db, 'admin_config', 'daily');
    const unsubscribeDaily = onSnapshot(dailyDocRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setDailyConfig({
          actionType: d.actionType === 'sell' ? 'sell' : 'buy',
          date: d.date || getMaputoTodayDate(),
          startHour: typeof d.startHour === 'number' ? d.startHour : 21,
          endHour: typeof d.endHour === 'number' ? d.endHour : 21.5,
          forceOpen: !!d.forceOpen,
          updatedAt: d.updatedAt,
          updatedBy: d.updatedBy
        });
      }
    }, (e) => console.warn('Erro config daily:', e));

    // 7. Ouvir Pedidos de Levantamento (M-Pesa / e-Mola) em tempo real
    const withdrawalsRef = collection(db, 'withdrawals');
    const unsubscribeWithdrawals = onSnapshot(withdrawalsRef, (snap) => {
      const list: WithdrawalAdminRecord[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as WithdrawalAdminRecord);
      });
      list.sort((a, b) => {
        const tA = a.requestedAt?.toMillis ? a.requestedAt.toMillis() : (a.requestedAt?.seconds ? a.requestedAt.seconds * 1000 : 0);
        const tB = b.requestedAt?.toMillis ? b.requestedAt.toMillis() : (b.requestedAt?.seconds ? b.requestedAt.seconds * 1000 : 0);
        return tB - tA;
      });
      setAdminWithdrawals(list);
    }, (e) => console.warn('Erro ao carregar levantamentos admin:', e));

    // 8. Ouvir Mensagens do Chat Global em tempo real (taprise_group_messages)
    const chatRef = collection(db, 'taprise_group_messages');
    const qChat = query(chatRef, orderBy('createdAt', 'desc'), limit(40));
    const unsubscribeChat = onSnapshot(qChat, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setAdminChatMessages(list);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('taprise_offline_admin_chat_msgs', JSON.stringify(list.slice(0, 50)));
        } catch {}
      }
    }, (e) => console.warn('Erro ao carregar chat admin:', e));

    // 9. Ouvir Mensagem Fixada
    const pinnedDocRef = doc(db, 'admin_config', 'chat');
    const unsubscribePinned = onSnapshot(pinnedDocRef, (snap) => {
      if (snap.exists()) setPinnedChatConfig(snap.data());
      else setPinnedChatConfig(null);
    }, (e) => console.warn('Erro config fixado:', e));

    // 10. Ouvir Dica do Instrutor em tempo real (doc: config/dicaInstrutor)
    const dicaDocRef = doc(db, 'config', 'dicaInstrutor');
    const unsubscribeDica = onSnapshot(dicaDocRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.texto) setInstructorTipText(d.texto);
        if (d.instrutor) setInstructorTipAuthor(d.instrutor);
        if (d.tipo) setInstructorTipTipo(d.tipo);
        setInstructorTip({
          title: 'Dica do Instrutor',
          badge: d.tipo || 'Dica de Ouro',
          author: d.instrutor || 'Instrutor Mateus Maputo',
          content: d.texto || '',
          active: true
        });
      } else {
        // Fallback para admin_config/instructor_tip
        const tipDocRef = doc(db, 'admin_config', 'instructor_tip');
        getDoc(tipDocRef).then((oldSnap) => {
          if (oldSnap.exists()) {
            const d = oldSnap.data();
            if (d.content) setInstructorTipText(d.content);
            if (d.author) setInstructorTipAuthor(d.author);
            if (d.badge) setInstructorTipTipo(d.badge);
            setInstructorTip({
              title: d.title || 'Dica do Instrutor',
              badge: d.badge || 'Dica de Ouro',
              author: d.author || 'Instrutor Mateus Maputo',
              content: d.content || '',
              active: d.active !== false
            });
          }
        }).catch(() => {});
      }
    }, (e) => console.warn('Erro config dica instrutor:', e));

    // 11. Relógio oficial de Maputo em tempo real (atualiza a cada 1 segundo)
    const timerInterval = setInterval(() => {
      setMaputoTime(getMaputoTimeDetails());
    }, 1000);

    return () => {
      unsubscribeUsers();
      unsubscribeUsuarios();
      unsubscribeMarket();
      unsubscribeAnn();
      unsubscribeTrans();
      unsubscribeOrders();
      unsubscribeDaily();
      unsubscribeWithdrawals();
      unsubscribeChat();
      unsubscribePinned();
      unsubscribeDica();
      clearInterval(timerInterval);
    };
  }, [isAdmin]);

  // Cálculos de Visão Geral
  const totalUsers = usersList.length;
  const totalBalanceInCirculation = useMemo(() => {
    return usersList.reduce((acc, u) => acc + (u.balance || u.saldoVirtual || 0), 0);
  }, [usersList]);
  const zeroBalanceCount = useMemo(() => {
    return usersList.filter((u) => (u.balance || u.saldoVirtual || 0) <= 0).length;
  }, [usersList]);
  const pendingWithdrawalsCount = useMemo(() => {
    return adminWithdrawals.filter((w) => w.status === 'PENDING').length;
  }, [adminWithdrawals]);

  // Ação Admin: Atualizar estado do Levantamento
  const handleUpdateWithdrawalStatus = async (id: string, newStatus: 'COMPLETED' | 'REJECTED') => {
    try {
      const wRef = doc(db, 'withdrawals', id);
      await updateDoc(wRef, {
        status: newStatus,
        statusMessage: newStatus === 'COMPLETED' ? 'Levantamento transferido com sucesso para a carteira móvel.' : 'Levantamento rejeitado pela administração.',
        processedAt: serverTimestamp(),
        processedBy: user?.email || 'admin'
      });
      showToast(
        newStatus === 'COMPLETED' ? 'Levantamento marcado como CONCLUÍDO com sucesso!' : 'Levantamento marcado como CANCELADO.',
        'success'
      );
    } catch (e: any) {
      showToast(`Erro ao atualizar estado: ${e.message}`, 'error');
    }
  };

  // Usuários Filtrados (Filtro 'Apenas Sem Saldo (0 MT)' real com saldoDisponivel == 0)
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const q = userSearch.toLowerCase();
      const matchSearch =
        (u.nome || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.id || '').toLowerCase().includes(q) ||
        (u.provincia || '').toLowerCase().includes(q);

      const saldoDisp = Number(u.saldoDisponivel ?? u.balance ?? u.saldoVirtual ?? 0);

      if (filterZeroBalance) {
        return matchSearch && saldoDisp === 0;
      }
      return matchSearch;
    });
  }, [usersList, userSearch, filterZeroBalance]);

  // Helper para formatar data de cadastro
  const formatRegistrationDate = (val: any) => {
    if (!val) return 'Recente';
    if (val.toDate) {
      try {
        return val.toDate().toLocaleDateString('pt-MZ', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return 'Recente';
      }
    }
    if (val.seconds) {
      try {
        return new Date(val.seconds * 1000).toLocaleDateString('pt-MZ', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return 'Recente';
      }
    }
    if (typeof val === 'string') return val.slice(0, 16);
    return 'Recente';
  };

  // AÇÃO: Confirmar Crédito de Saldo ao Usuário (Requisito 2)
  const handleConfirmCredit = async () => {
    if (!selectedUserForCredit) return;
    const amountNum = parseFloat(creditAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('Por favor, introduza um valor positivo válido.', 'error');
      return;
    }

    try {
      setIsCrediting(true);
      const targetUserId = selectedUserForCredit.id || selectedUserForCredit.uid;
      if (!targetUserId) throw new Error('ID do utilizador inválido');

      const currentBalance = Number(
        selectedUserForCredit.saldoDisponivel ??
        selectedUserForCredit.balance ??
        selectedUserForCredit.saldoVirtual ?? 0
      );
      const newBalance = Number((currentBalance + amountNum).toFixed(2));

      // 1. REQUISITO 2 EXATO: doc(db, "usuarios", userId) -> updateDoc com increment
      const usuarioRef = doc(db, 'usuarios', targetUserId);
      await setDoc(usuarioRef, {
        saldoDisponivel: increment(amountNum),
        saldoTotal: increment(amountNum),
        status: 'ativo',
        ultimoCreditoEm: serverTimestamp()
      }, { merge: true });

      // 2. Atualizar documento na coleção 'users' para sincronização instantânea em toda a aplicação
      const userRef = doc(db, 'users', targetUserId);
      await setDoc(userRef, {
        saldoDisponivel: increment(amountNum),
        saldoTotal: increment(amountNum),
        saldoVirtual: increment(amountNum),
        balance: increment(amountNum),
        patrimonioTotal: increment(amountNum),
        status: 'ativo',
        ultimoCreditoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      }, { merge: true });

      // 3. Registar log de transações
      await addDoc(collection(db, 'transactions'), {
        userId: targetUserId,
        uid: targetUserId,
        userName: selectedUserForCredit.nome || 'Investidor TapRise',
        userEmail: selectedUserForCredit.email || '',
        type: 'admin_bonus',
        amount: amountNum,
        previousBalance: currentBalance,
        newBalance: newBalance,
        adminEmail: user?.email || ADMIN_EMAIL,
        timestamp: serverTimestamp(),
        description: `Crédito de saldo (+${amountNum.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT) pelo Administrador`
      });

      // 4. REQUISITO 3: Pagar 5% de comissão ao indicador se for o 1º crédito e tiver invitedBy
      if (selectedUserForCredit.invitedBy && !selectedUserForCredit.commissionPaid) {
        const referrerUid = selectedUserForCredit.invitedBy;
        const commissionAmount = Number((amountNum * 0.05).toFixed(2));

        if (commissionAmount > 0 && referrerUid !== targetUserId) {
          try {
            // A. Creditar saldo do indicador em users/{invitedBy}
            const referrerRef = doc(db, 'users', referrerUid);
            await updateDoc(referrerRef, {
              balance: increment(commissionAmount),
              saldoVirtual: increment(commissionAmount),
              patrimonioTotal: increment(commissionAmount),
              totalComissoes: increment(commissionAmount),
              atualizadoEm: serverTimestamp()
            });

            // B. Também atualizar usuarios/{invitedBy} para compatibilidade
            try {
              const refUsuarioDoc = doc(db, 'usuarios', referrerUid);
              await updateDoc(refUsuarioDoc, {
                saldoDisponivel: increment(commissionAmount),
                saldoTotal: increment(commissionAmount)
              });
            } catch {}

            // C. Registar na coleção 'commissions'
            await addDoc(collection(db, 'commissions'), {
              referrerUid: referrerUid,
              referredUid: targetUserId,
              referredName: selectedUserForCredit.nome || 'Investidor Convidado',
              referredEmail: selectedUserForCredit.email || '',
              creditAmount: amountNum,
              rate: 0.05,
              commissionAmount: commissionAmount,
              status: 'paid',
              paidAt: serverTimestamp(),
              description: `Bônus de convite de 5% sobre 1º crédito de ${amountNum.toFixed(2)} MT`
            });

            // D. Registar no histórico do indicador como "Bônus de convite"
            await addDoc(collection(db, 'transactions'), {
              userId: referrerUid,
              uid: referrerUid,
              userName: 'Indicador TapRise',
              userEmail: '',
              type: 'bonus_convite',
              amount: commissionAmount,
              referredUserId: targetUserId,
              referredUserName: selectedUserForCredit.nome || 'Investidor Convidado',
              timestamp: serverTimestamp(),
              description: `Bônus de convite (+5%): +${commissionAmount.toFixed(2)} MT pelo 1º crédito de ${selectedUserForCredit.nome || 'convidado'}`
            });

            // E. Marcar commissionPaid = true para nunca pagar de novo a este usuário
            await updateDoc(userRef, {
              commissionPaid: true,
              commissionPaidAt: serverTimestamp(),
              commissionAmount: commissionAmount
            });
            try {
              await updateDoc(usuarioRef, {
                commissionPaid: true
              });
            } catch {}

            showToast(`Bônus de convite de +${commissionAmount.toFixed(2)} MT (5%) pago com sucesso ao indicador!`, 'info');
          } catch (commErr) {
            console.warn('Erro ao processar comissão de convite:', commErr);
          }
        }
      }

      showToast(`Sucesso! +${amountNum.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT creditados com sucesso a ${selectedUserForCredit.nome}!`, 'success');
      setSelectedUserForCredit(null);
      setCreditAmount('5000');
    } catch (err: any) {
      console.error('Erro ao creditar saldo:', err);
      showToast(err.message || 'Erro ao creditar saldo no Firestore.', 'error');
    } finally {
      setIsCrediting(false);
    }
  };

  // AÇÃO ABA 2: Bónus Manual Rápido (+500MT ou +1000MT) com 1 clique imediato
  const handleQuickCredit = async (targetUser: UserRecord, amount: number) => {
    try {
      const currentBalance = targetUser.balance || targetUser.saldoVirtual || 0;
      const newBalance = Number((currentBalance + amount).toFixed(2));
      const targetUserId = targetUser.id || targetUser.uid;
      if (!targetUserId) throw new Error('ID do utilizador inválido');

      await updateDoc(doc(db, 'users', targetUserId), {
        saldoVirtual: newBalance,
        balance: newBalance,
        patrimonioTotal: newBalance,
        atualizadoEm: serverTimestamp()
      });

      await addDoc(collection(db, 'transactions'), {
        userId: targetUserId,
        userName: targetUser.nome || 'Investidor TapRise',
        userEmail: targetUser.email || '',
        type: 'admin_bonus',
        amount: amount,
        previousBalance: currentBalance,
        newBalance: newBalance,
        adminEmail: user?.email || ADMIN_EMAIL,
        timestamp: serverTimestamp(),
        description: `Bónus manual rápido de +${amount} MT atribuído pelo Administrador`
      });

      // Pagar 5% de comissão ao indicador se for 1º crédito
      if (targetUser.invitedBy && !targetUser.commissionPaid) {
        const referrerUid = targetUser.invitedBy;
        const commissionAmount = Number((amount * 0.05).toFixed(2));
        if (commissionAmount > 0 && referrerUid !== targetUserId) {
          try {
            await updateDoc(doc(db, 'users', referrerUid), {
              balance: increment(commissionAmount),
              saldoVirtual: increment(commissionAmount),
              patrimonioTotal: increment(commissionAmount),
              totalComissoes: increment(commissionAmount),
              atualizadoEm: serverTimestamp()
            });

            await addDoc(collection(db, 'commissions'), {
              referrerUid: referrerUid,
              referredUid: targetUserId,
              referredName: targetUser.nome || 'Investidor Convidado',
              creditAmount: amount,
              rate: 0.05,
              commissionAmount: commissionAmount,
              status: 'paid',
              paidAt: serverTimestamp(),
              description: `Bônus de convite de 5% sobre 1º crédito rápido de ${amount.toFixed(2)} MT`
            });

            await addDoc(collection(db, 'transactions'), {
              userId: referrerUid,
              uid: referrerUid,
              userName: 'Indicador TapRise',
              userEmail: '',
              type: 'bonus_convite',
              amount: commissionAmount,
              referredUserId: targetUserId,
              referredUserName: targetUser.nome || 'Investidor Convidado',
              timestamp: serverTimestamp(),
              description: `Bônus de convite (+5%): +${commissionAmount.toFixed(2)} MT pelo 1º crédito de ${targetUser.nome || 'convidado'}`
            });

            await updateDoc(doc(db, 'users', targetUserId), {
              commissionPaid: true,
              commissionPaidAt: serverTimestamp(),
              commissionAmount: commissionAmount
            });
          } catch (commErr) {
            console.warn('Erro ao pagar comissão no crédito rápido:', commErr);
          }
        }
      }

      showToast(`+${amount} MT creditados imediatamente a ${targetUser.nome || targetUser.email}!`, 'success');
    } catch (err: any) {
      console.error('Erro ao creditar saldo rápido:', err);
      showToast(err.message || 'Erro ao creditar saldo no Firestore.', 'error');
    }
  };

  // AÇÃO ABA JOGO 21H: Salvar Ação Oficial do Dia (COMPRAR ou VENDER)
  const handleSaveDailyConfig = async (newAction?: 'buy' | 'sell', newForceOpen?: boolean) => {
    try {
      setIsSavingDaily(true);
      const targetAction = newAction || dailyConfig.actionType;
      const targetForce = newForceOpen !== undefined ? newForceOpen : dailyConfig.forceOpen;
      const todayDate = getMaputoTodayDate();

      await setDoc(doc(db, 'admin_config', 'daily'), {
        actionType: targetAction,
        date: todayDate,
        startHour: 21,
        endHour: 21.5,
        forceOpen: targetForce,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || ADMIN_EMAIL
      }, { merge: true });

      setDailyConfig(prev => ({
        ...prev,
        actionType: targetAction,
        date: todayDate,
        forceOpen: targetForce
      }));

      // Mensagens do sistema automáticas no Chat Global para todos os investidores
      try {
        await addDoc(collection(db, 'taprise_group_messages'), {
          uid: user?.uid || 'admin',
          displayName: 'Administração TapRise',
          email: user?.email || ADMIN_EMAIL,
          isAdmin: true,
          type: 'system',
          text: `📢 ADMIN definiu a ação de hoje: ${targetAction === 'buy' ? 'COMPRAR' : 'VENDER'} às 21h`,
          replyToId: null,
          isDeleted: false,
          reactions: {},
          createdAt: serverTimestamp()
        });
      } catch (chatErr) {
        console.warn('Erro ao emitir aviso automático no chat:', chatErr);
      }

      showToast(`Diretriz 21h gravada! Ação oficial: ${targetAction === 'buy' ? 'COMPRAR (Alta)' : 'VENDER (Baixa)'}${targetForce ? ' (Janela Forçada Aberta)' : ''}`, 'success');
    } catch (err: any) {
      console.error('Erro ao salvar diretriz da Janela 21h:', err);
      showToast('Falha ao salvar diretriz da Janela 21h.', 'error');
    } finally {
      setIsSavingDaily(false);
    }
  };

  // AÇÃO ABA: Enviar aviso no chat (destaque amarelo como type: 'system')
  const handleSendChatNotice = async () => {
    if (!chatNoticeText.trim()) {
      showToast('Por favor, digite a mensagem de aviso a transmitir no chat.', 'error');
      return;
    }

    try {
      setIsSendingChatNotice(true);
      await addDoc(collection(db, 'taprise_group_messages'), {
        uid: user?.uid || 'admin',
        displayName: 'Administração TapRise',
        email: user?.email || ADMIN_EMAIL,
        isAdmin: true,
        type: 'system',
        text: chatNoticeText.trim(),
        replyToId: null,
        isDeleted: false,
        reactions: {},
        createdAt: serverTimestamp()
      });

      setChatNoticeText('');
      showToast('Aviso transmitido como SISTEMA no Chat Global com sucesso!', 'success');
    } catch (e: any) {
      console.error('Erro ao enviar aviso no chat:', e);
      showToast('Erro ao transmitir aviso no chat.', 'error');
    } finally {
      setIsSendingChatNotice(false);
    }
  };

  // AÇÃO ABA: Apagar mensagem do chat (Soft delete)
  const handleDeleteChatMessage = async (msgId: string) => {
    if (!confirm('Deseja realmente remover esta mensagem (soft delete) para todos os utilizadores?')) return;
    try {
      await updateDoc(doc(db, 'taprise_group_messages', msgId), {
        isDeleted: true,
        text: 'Esta mensagem foi removida pela administração.'
      });
      showToast('Mensagem removida com sucesso (soft delete).', 'success');
    } catch (e: any) {
      console.error('Erro ao apagar mensagem:', e);
      showToast('Erro ao remover mensagem.', 'error');
    }
  };

  // AÇÃO ABA: Fixar / Desafixar mensagem
  const handlePinChatMessage = async (msg: any) => {
    try {
      await setDoc(doc(db, 'admin_config', 'chat'), {
        pinnedMessageId: msg.id,
        pinnedText: msg.text?.slice(0, 140) || '',
        pinnedAuthor: msg.displayName || msg.userName || 'Investidor',
        pinnedAt: serverTimestamp()
      });
      showToast('Mensagem fixada no topo do grupo!', 'success');
    } catch (e) {
      showToast('Erro ao fixar mensagem.', 'error');
    }
  };

  const handleUnpinChatMessage = async () => {
    try {
      await setDoc(doc(db, 'admin_config', 'chat'), {
        pinnedMessageId: null,
        pinnedText: '',
        pinnedAuthor: '',
        pinnedAt: null
      });
      showToast('Mensagem desfixada do topo.', 'info');
    } catch (e) {
      showToast('Erro ao desfixar.', 'error');
    }
  };

  // AÇÃO ABA 3: Alternar Pausa de Commodity
  const handleToggleCommodityPause = async (commodityId: string) => {
    try {
      const isCurrentlyPaused = !!marketConfig.pausedAssets[commodityId];
      const updatedPausedAssets = {
        ...marketConfig.pausedAssets,
        [commodityId]: !isCurrentlyPaused
      };

      const marketDocRef = doc(db, 'admin_config', 'market_hours');
      await setDoc(marketDocRef, {
        ...marketConfig,
        pausedAssets: updatedPausedAssets,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setMarketConfig((prev) => ({
        ...prev,
        pausedAssets: updatedPausedAssets
      }));

      showToast(
        !isCurrentlyPaused ? `Ativo ${commodityId.toUpperCase()} pausado no mercado.` : `Ativo ${commodityId.toUpperCase()} retomado no mercado.`,
        'info'
      );
    } catch (err) {
      console.error('Erro ao pausar commodity:', err);
      showToast('Falha ao atualizar estado da commodity.', 'error');
    }
  };

  // AÇÃO ABA 3: Salvar Horário Oficial de Trading
  const handleSaveMarketHours = async () => {
    try {
      setIsSavingMarket(true);
      const marketDocRef = doc(db, 'admin_config', 'market_hours');
      await setDoc(marketDocRef, {
        ...marketConfig,
        updatedAt: serverTimestamp()
      }, { merge: true });

      showToast('Horário Oficial e Regras de Mercado salvas com sucesso!', 'success');
    } catch (e) {
      showToast('Erro ao salvar horários de mercado.', 'error');
    } finally {
      setIsSavingMarket(false);
    }
  };

  // AÇÃO ABA 4: Salvar Comunicado Global
  const handleSaveAnnouncement = async () => {
    try {
      setIsSavingAnnouncement(true);
      const annDocRef = doc(db, 'admin_config', 'announcement');
      await setDoc(annDocRef, {
        ...announcement,
        author: 'Administração TapRise',
        updatedAt: serverTimestamp()
      });

      showToast(
        announcement.active ? 'Aviso Global ativado e transmitido a todos os usuários!' : 'Aviso Global desativado com sucesso.',
        'success'
      );
    } catch (e) {
      showToast('Erro ao salvar comunicado global.', 'error');
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  // AÇÃO ABA: Salvar Dica do Instrutor (Requisito 3: doc(db, "config", "dicaInstrutor"))
  const handleSaveInstructorTip = async () => {
    const textToSave = instructorTipText.trim() || instructorTip.content.trim();
    if (!textToSave) {
      showToast('Por favor, digite o conteúdo da dica do instrutor.', 'error');
      return;
    }
    try {
      setIsSavingInstructorTip(true);

      // Requisito 3 Exato: doc(db, "config", "dicaInstrutor")
      const tipDocRef = doc(db, 'config', 'dicaInstrutor');
      await setDoc(tipDocRef, {
        texto: textToSave,
        instrutor: instructorTipAuthor.trim() || 'Mateus Maputo',
        tipo: instructorTipTipo.trim() || 'Dica de Ouro',
        atualizadoEm: serverTimestamp()
      }, { merge: true });

      // Sincronizar com admin_config/instructor_tip
      const oldDocRef = doc(db, 'admin_config', 'instructor_tip');
      await setDoc(oldDocRef, {
        title: 'Dica do Instrutor',
        badge: instructorTipTipo.trim() || 'Dica de Ouro',
        author: instructorTipAuthor.trim() || 'Instrutor Mateus Maputo',
        content: textToSave,
        active: true,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || ADMIN_EMAIL
      }, { merge: true });

      showToast('Dica do Instrutor salva e publicada em tempo real!', 'success');
    } catch (e: any) {
      console.error('Erro ao salvar dica do instrutor:', e);
      showToast('Falha ao salvar a dica do instrutor.', 'error');
    } finally {
      setIsSavingInstructorTip(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-xl animate-pulse shadow-lg shadow-blue-500/20">
          TR
        </div>
        <p className="mt-4 text-xs font-mono text-slate-400">A validar credenciais de administrador...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // O useEffect redireciona imediatamente para /
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div
            className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-800'
                : toast.type === 'info'
                ? 'bg-blue-950/90 text-blue-200 border-blue-800'
                : 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
            }`}
          >
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Activity className="w-4 h-4 text-blue-400 shrink-0" />}
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* TOP ADMIN HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Super Admin Badge */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="bg-blue-600 group-hover:bg-blue-500 text-white p-2 rounded-xl flex items-center justify-center font-black tracking-widest text-base shadow-md shadow-blue-600/30 transition">
                TR
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-white tracking-tight">TapRise</span>
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-amber-400" />
                    PAINEL ADMIN CENTRAL
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">Bolsa e Mercadorias de Moçambique</p>
              </div>
            </Link>
          </div>

          {/* Admin Identity & Return to Terminal */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex flex-col text-right pr-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                garotoestranho454@gmail.com
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Super Administrador (Acesso Exclusivo)</span>
            </div>

            <Link
              href="/chat"
              prefetch={true}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
              title="Abrir Chat do Grupo"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chat Ao Vivo</span>
            </Link>

            <Link
              href="/"
              prefetch={true}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition"
              title="Voltar ao Terminal de Negociação"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Terminal</span>
            </Link>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-slate-800/60 overflow-x-auto">
          {[
            { id: 'visao-geral', label: 'Aba 1 - Visão Geral', icon: PieChart },
            { id: 'usuarios', label: 'Gestão de Usuários', icon: Users, badge: zeroBalanceCount > 0 ? `${zeroBalanceCount} novos` : undefined },
            { id: 'levantamentos', label: 'Levantamentos (M-Pesa/e-Mola)', icon: Smartphone, badge: pendingWithdrawalsCount > 0 ? `${pendingWithdrawalsCount} pendente(s)` : undefined },
            { id: 'jogo-21h', label: '⚡ Janela 21h (Alta/Baixa)', icon: Zap, badge: dailyConfig.actionType === 'buy' ? 'ALTA (COMPRA)' : 'BAIXA (VENDA)' },
            { id: 'mercado', label: 'Aba 4 - Mercado & Horários', icon: BarChart2 },
            { id: 'comunicados', label: 'Aba 5 - Comunicados Globais', icon: Bell },
            { id: 'dica-instrutor', label: 'Dica do Instrutor', icon: BookOpen },
            { id: 'chat', label: 'Gerir Chat Ao Vivo', icon: MessageSquare, badge: adminChatMessages.length > 0 ? `${adminChatMessages.length} msgs` : undefined }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-3 px-4 text-xs font-bold border-b-2 transition shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-blue-500 text-blue-400 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6">
        
        {/* ======================================================== */}
        {/* ABA 1: VISÃO GERAL */}
        {/* ======================================================== */}
        {activeTab === 'visao-geral' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Users */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Usuários</span>
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-white">{totalUsers}</span>
                  <span className="text-xs text-slate-400 block mt-1">Investidores registados no Firestore</span>
                </div>
                {zeroBalanceCount > 0 && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-lg text-[11px] font-bold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{zeroBalanceCount} conta(s) a aguardar saldo</span>
                  </div>
                )}
              </div>

              {/* Total Balance in Circulation */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo Total em Circulação</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-emerald-400">
                    {totalBalanceInCirculation.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">Capital atribuído sob custódia</span>
                </div>
              </div>

              {/* Open Orders Today */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ordens Abertas</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-purple-400">{ordersTodayCount}</span>
                  <span className="text-xs text-slate-400 block mt-1">Posições ativas de investidores</span>
                </div>
              </div>

              {/* Market Status */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado do Mercado</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-base font-black text-white flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {marketConfig.scheduleText || 'Segunda a Sexta às 21:00'}
                  </span>
                  <span className="text-xs text-slate-400 block mt-1">Cotação autônoma de mercado</span>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* CONTROLE CENTRAL DA JANELA 21H • MANIPULAÇÃO ALTA / BAIXA */}
            {/* ======================================================== */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/70 border border-slate-700/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                      <Zap className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white flex items-center gap-2">
                        <span>Controle Central • Janela 21h</span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                          dailyConfig.actionType === 'buy'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}>
                          Diretriz Atual: {dailyConfig.actionType === 'buy' ? 'ALTA (COMPRA)' : 'BAIXA (VENDA)'}
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Altere a diretriz oficial para que os investidores saibam se devem COMPRAR ou VENDER às 21h.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800 shrink-0">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">Horário Maputo (CAT)</span>
                    <span className="text-sm font-black font-mono text-white">{maputoTime.timeFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Botões Grandes de Manipulação Alta e Baixa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                {/* Definir ALTA */}
                <button
                  type="button"
                  onClick={() => handleSaveDailyConfig('buy')}
                  disabled={isSavingDaily}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer text-left flex items-center justify-between ${
                    dailyConfig.actionType === 'buy'
                      ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-500/50'
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block">Diretriz 1</span>
                    <span className="text-xl font-black text-white mt-1 block">DEFINIR ALTA (COMPRA)</span>
                    <p className="text-xs text-slate-300 mt-1">
                      Investidores que clicarem em <strong>COMPRAR</strong> ganham +4,73%. Quem vender perde 100 MT.
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ml-3 ${
                    dailyConfig.actionType === 'buy' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40' : 'bg-slate-800 text-slate-500'
                  }`}>
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </button>

                {/* Definir BAIXA */}
                <button
                  type="button"
                  onClick={() => handleSaveDailyConfig('sell')}
                  disabled={isSavingDaily}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer text-left flex items-center justify-between ${
                    dailyConfig.actionType === 'sell'
                      ? 'bg-rose-950/80 border-rose-500 text-white shadow-xl shadow-rose-500/20 ring-2 ring-rose-500/50'
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-400 block">Diretriz 2</span>
                    <span className="text-xl font-black text-white mt-1 block">DEFINIR BAIXA (VENDA)</span>
                    <p className="text-xs text-slate-300 mt-1">
                      Investidores que clicarem em <strong>VENDER</strong> ganham +4,73%. Quem comprar perde 100 MT.
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ml-3 ${
                    dailyConfig.actionType === 'sell' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40' : 'bg-slate-800 text-slate-500'
                  }`}>
                    <TrendingDown className="w-6 h-6" />
                  </div>
                </button>
              </div>

              {/* Barra de Testes & Forçar Janela */}
              <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                
                {/* Forçar Janela Aberta */}
                <div className="flex items-center justify-between gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800 flex-1">
                  <div>
                    <span className="text-xs font-bold text-white block">Forçar Janela Aberta (Modo de Teste)</span>
                    <span className="text-[11px] text-slate-400 block">
                      Permite testar e operar a qualquer hora do dia fora do horário das 21:00 às 21:30.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveDailyConfig(dailyConfig.actionType, !dailyConfig.forceOpen)}
                    disabled={isSavingDaily}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                      dailyConfig.forceOpen
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    {dailyConfig.forceOpen ? 'FORÇADO ATIVO' : 'MODO NORMAL (21h)'}
                  </button>
                </div>

                {/* Simulador de Teste do Admin */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-400 hidden sm:inline">Simular Teste:</span>
                  <button
                    type="button"
                    onClick={() => handleRunAdminTest('buy')}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🧪 Testar COMPRA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunAdminTest('sell')}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🧪 Testar VENDA</span>
                  </button>
                </div>

              </div>

              {/* Resultado do Teste Imediato */}
              {adminTestResult && (
                <div className={`mt-3 p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
                  adminTestResult.won
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                    : 'bg-rose-950/70 border-rose-500/60 text-rose-200'
                }`}>
                  <span>{adminTestResult.message}</span>
                  <button
                    type="button"
                    onClick={() => setAdminTestResult(null)}
                    className="text-slate-400 hover:text-white ml-2 cursor-pointer font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions & Audit Trail */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Summary Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span>Acesso Rápido da Mesa</span>
                </h3>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setFilterZeroBalance(true);
                      setActiveTab('usuarios');
                    }}
                    className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-200">Ver Contas Sem Saldo (0 MT)</p>
                      <p className="text-[11px] text-slate-400">Atribuir bónus a novos cadastros</p>
                    </div>
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded text-xs font-bold">
                      {zeroBalanceCount}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('mercado')}
                    className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-200">Definir Horário de Trading</p>
                      <p className="text-[11px] text-slate-400">{marketConfig.scheduleText}</p>
                    </div>
                    <Clock className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                  </button>

                  <button
                    onClick={() => setActiveTab('comunicados')}
                    className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-200">Emitir Comunicado Geral</p>
                      <p className="text-[11px] text-slate-400">{announcement.active ? 'Aviso Ativo no ar' : 'Nenhum aviso ativo'}</p>
                    </div>
                    <Bell className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                  </button>
                </div>
              </div>

              {/* Recent Admin Transactions (Logs) */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Últimas Recargas / Bónus Atribuídos (transactions)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">Tipo: admin_bonus</span>
                </div>

                {recentTransactions.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    Nenhum bónus concedido ainda. Aceda à <strong>Aba 2 - Usuários</strong> para creditar saldo aos novos cadastros.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto pr-1">
                    {recentTransactions.slice(0, 10).map((t) => (
                      <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{t.userName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">({t.userEmail})</span>
                          </div>
                          <span className="text-[11px] text-slate-400 block">{t.description}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-emerald-400 text-sm">
                            +{t.amount.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                          </span>
                          <span className="text-[10px] text-slate-500 block">Novo saldo: {t.newBalance.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SEÇÃO RÁPIDA: 📘 Dica do Instrutor - Controle Central na Visão Geral */}
            <div className="bg-[#111a2e] border border-[#1e293b] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e293b] pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      📘 Dica do Instrutor - Controle Central
                    </h3>
                    <p className="text-xs text-slate-400">
                      Atualize em tempo real a dica que todos os investidores veem no topo da tela inicial.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('dica-instrutor')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer flex items-center gap-1"
                >
                  Ver aba completa de dicas &rarr;
                </button>
              </div>

              <div className="space-y-3">
                <textarea
                  rows={3}
                  value={instructorTipText}
                  onChange={(e) => {
                    setInstructorTipText(e.target.value);
                    setInstructorTip((prev) => ({ ...prev, content: e.target.value }));
                  }}
                  placeholder="Escreva a nova dica do instrutor que será publicada em tempo real para todos os investidores..."
                  className="w-full p-3.5 bg-[#0a1020] border border-[#1e293b] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition leading-relaxed"
                />

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>
                      Instrutor: <strong className="text-white">{instructorTipAuthor}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Selo: <strong className="text-amber-400">{instructorTipTipo}</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveInstructorTip}
                    disabled={isSavingInstructorTip || !instructorTipText.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer border border-blue-400/30"
                  >
                    {isSavingInstructorTip ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>A publicar...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Salvar e Publicar em Tempo Real</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 2: USUÁRIOS & ATRIBUIÇÃO DE SALDO */}
        {/* ======================================================== */}
        {/* ABA 2: GESTÃO DE USUÁRIOS & ATRIBUIÇÃO DE SALDO */}
        {/* ======================================================== */}
        {activeTab === 'usuarios' && (
          <div className="space-y-5">
            {/* Control Bar: Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111a2e] p-4 rounded-2xl border border-[#1e293b] shadow-xl">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Pesquisar por nome, e-mail, ID ou província..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0a1020] border border-[#1e293b] rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Filter Zero Balance */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterZeroBalance(!filterZeroBalance)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
                    filterZeroBalance
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/20'
                      : 'bg-[#0a1020] border-[#1e293b] text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${filterZeroBalance ? 'bg-amber-400 animate-ping' : 'bg-slate-500'}`}></span>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Apenas Sem Saldo (0 MT) [{zeroBalanceCount}]</span>
                </button>
              </div>
            </div>

            {/* Users Data Table */}
            <div className="bg-[#111a2e] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    Gestão Central de Investidores ({filteredUsers.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Controle de contas cadastradas. Atribua e gerencie saldo para cada investidor com atualização imediata no Firestore.
                  </p>
                </div>
                {zeroBalanceCount > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    <span>{zeroBalanceCount} conta(s) a aguardar saldo</span>
                  </div>
                )}
              </div>

              {loadingUsers ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                  A carregar utilizadores do Firestore em tempo real...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Nenhum investidor encontrado para os critérios de pesquisa.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0a1020]/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-[#1e293b]">
                      <tr>
                        <th className="py-3.5 px-4">Investidor</th>
                        <th className="py-3.5 px-4">E-mail</th>
                        <th className="py-3.5 px-4 text-right">Saldo Disponível</th>
                        <th className="py-3.5 px-4">Data Cadastro</th>
                        <th className="py-3.5 px-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e293b]/80">
                      {filteredUsers.map((u) => {
                        const balance = Number(u.saldoDisponivel ?? u.balance ?? u.saldoVirtual ?? 0);
                        const isZero = balance <= 0;
                        return (
                          <tr key={u.id} className="hover:bg-[#0a1020]/50 transition group">
                            {/* Investidor: Avatar, Nome, ID, Província */}
                            <td className="py-3.5 px-4 font-bold text-slate-100">
                              <div className="flex items-center space-x-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 font-black flex items-center justify-center shrink-0 text-sm shadow-inner">
                                  {u.nome?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="min-w-0">
                                  <span className="block truncate font-bold text-white group-hover:text-blue-300 transition">
                                    {u.nome || 'Investidor Sem Nome'}
                                  </span>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                    <span>ID: {u.id.slice(0, 8)}...</span>
                                    {u.provincia && (
                                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-sans">
                                        {u.provincia}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                              <div>{u.email || '—'}</div>
                              {u.invitedBy && (
                                <div className="mt-1">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold ${
                                    u.commissionPaid
                                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                                      : 'bg-blue-950/80 text-blue-300 border border-blue-800'
                                  }`}>
                                    {u.commissionPaid ? '✓ 5% Comissão Paga' : '🎁 Convidado (Paga 5%)'}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Saldo Disponível */}
                            <td className="py-3.5 px-4 text-right font-black">
                              {isZero ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                                  0,00 MT (Aguardando Saldo)
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-bold text-sm">
                                  {balance.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT
                                </span>
                              )}
                            </td>

                            {/* Data Cadastro */}
                            <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                              {formatRegistrationDate(u.criadoEm)}
                            </td>

                            {/* Botão de Ação: 💳 Creditar / Gerir */}
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUserForCredit(u);
                                  setCreditAmount('5000');
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 transition cursor-pointer border border-blue-400/30 active:scale-95"
                                title="Creditar / Gerir Saldo do Investidor"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>💳 Creditar / Gerir</span>
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

        {/* MODAL PROFISSIONAL: CREDITAR / GERIR SALDO (REQUISITO 2) */}
        {selectedUserForCredit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#111a2e] border border-[#1e293b] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Creditar / Gerir Saldo</h3>
                    <p className="text-[11px] text-slate-400">Atribuição Imediata de Saldo Operacional</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUserForCredit(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Informações do Usuário */}
              <div className="p-3.5 bg-[#0a1020] rounded-2xl border border-[#1e293b] space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Investidor:</span>
                  <span className="font-bold text-white text-sm">{selectedUserForCredit.nome || 'Investidor Sem Nome'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">E-mail:</span>
                  <span className="font-mono text-slate-300">{selectedUserForCredit.email}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">ID / Província:</span>
                  <span className="font-mono text-slate-400">
                    {selectedUserForCredit.id.slice(0, 10)}... {selectedUserForCredit.provincia ? `• ${selectedUserForCredit.provincia}` : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-[#1e293b]">
                  <span className="text-slate-300 font-bold">Saldo Atual:</span>
                  <span className="font-black text-amber-400 text-sm">
                    {Number(
                      selectedUserForCredit.saldoDisponivel ??
                      selectedUserForCredit.balance ??
                      selectedUserForCredit.saldoVirtual ?? 0
                    ).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                  </span>
                </div>
              </div>

              {/* Botões Rápidos (+1.000 MT, +5.000 MT, +10.000 MT) */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Escolha Rápida de Valor
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '+1.000 MT', value: '1000' },
                    { label: '+5.000 MT', value: '5000' },
                    { label: '+10.000 MT', value: '10000' }
                  ].map((btn) => (
                    <button
                      key={btn.value}
                      type="button"
                      onClick={() => setCreditAmount(btn.value)}
                      className={`py-2.5 text-xs font-black rounded-xl border transition cursor-pointer ${
                        creditAmount === btn.value
                          ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                          : 'bg-[#0a1020] text-slate-300 border-[#1e293b] hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Customizado */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Valor a Creditar (MT)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">MT</span>
                  <input
                    type="number"
                    min="1"
                    step="100"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="Ex: 5000"
                    className="w-full pl-11 pr-4 py-2.5 bg-[#0a1020] border border-[#1e293b] rounded-xl text-sm font-black text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Previsão do Novo Saldo */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-bold">Novo Saldo Final:</span>
                <span className="text-base font-black text-emerald-400">
                  {(
                    Number(
                      selectedUserForCredit.saldoDisponivel ??
                      selectedUserForCredit.balance ??
                      selectedUserForCredit.saldoVirtual ?? 0
                    ) + (parseFloat(creditAmount) || 0)
                  ).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                </span>
              </div>

              {/* Aviso de Bónus de Convite de 5% */}
              {selectedUserForCredit.invitedBy && !selectedUserForCredit.commissionPaid && (
                <div className="p-3 bg-blue-950/60 border border-blue-500/40 rounded-2xl space-y-1 text-xs">
                  <div className="flex items-center justify-between text-blue-300 font-bold">
                    <span>🎁 Bónus de Convite (5%)</span>
                    <span className="font-mono text-amber-300 font-black">
                      +{((parseFloat(creditAmount) || 0) * 0.05).toFixed(2)} MT
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Este utilizador foi indicado (código: <span className="font-mono text-white font-bold">{selectedUserForCredit.invitedByCode || selectedUserForCredit.invitedBy.slice(0, 8)}</span>). 5% deste 1º crédito será pago automaticamente ao indicador!
                  </p>
                </div>
              )}

              {/* Botões: Cancelar e Confirmar Crédito */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForCredit(null)}
                  disabled={isCrediting}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCredit}
                  disabled={isCrediting}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer border border-blue-400/30"
                >
                  {isCrediting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>A creditar...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirmar Crédito</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA: GESTÃO DE LEVANTAMENTOS (M-PESA / E-MOLA) */}
        {/* ======================================================== */}
        {activeTab === 'levantamentos' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">
                      Mesa de Levantamentos • M-Pesa & e-Mola
                    </h2>
                    <p className="text-xs text-slate-400">
                      Pedidos submetidos por investidores entre as 08:00 e as 12:00 (Prazo institucional: 2 a 3 horas)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    {pendingWithdrawalsCount} Pendente(s)
                  </span>
                  <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {adminWithdrawals.length} Total
                  </span>
                </div>
              </div>

              {adminWithdrawals.length === 0 ? (
                <div className="p-16 text-center text-slate-500 text-xs space-y-2">
                  <Smartphone className="w-10 h-10 mx-auto text-slate-700" />
                  <p className="font-bold text-slate-400">Nenhum pedido de levantamento registado no Firestore</p>
                  <p className="text-slate-600">
                    Assim que os utilizadores solicitarem retirada via M-Pesa ou e-Mola, as operações aparecerão aqui para liquidação imediata.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-3.5 px-4">Data / Hora</th>
                        <th className="py-3.5 px-4">Investidor</th>
                        <th className="py-3.5 px-4">Operadora</th>
                        <th className="py-3.5 px-4">Telemóvel Destino</th>
                        <th className="py-3.5 px-4">Titular Confirmado</th>
                        <th className="py-3.5 px-4 text-right">Montante (MT)</th>
                        <th className="py-3.5 px-4 text-center">Estado</th>
                        <th className="py-3.5 px-4 text-right">Ação Administrativa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {adminWithdrawals.map((w) => {
                        let formattedDate = w.dateStr || 'Hoje';
                        if (w.requestedAt?.toDate) {
                          const d = w.requestedAt.toDate();
                          formattedDate = `${d.toLocaleDateString('pt-MZ')} ${d.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}`;
                        }

                        return (
                          <tr key={w.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                              {formattedDate}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-white block">{w.userName || 'Investidor'}</span>
                              <span className="text-[10px] font-mono text-slate-500">{w.userEmail}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                w.operator === 'M-Pesa'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {w.operator}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                              +258 {w.phoneNumber}
                            </td>
                            <td className="py-3.5 px-4 text-slate-300">
                              {w.userName}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-400 text-sm">
                              {(w.amount || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                w.status === 'COMPLETED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : w.status === 'REJECTED'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  w.status === 'COMPLETED' ? 'bg-emerald-400' : 'bg-amber-400'
                                }`}></span>
                                {w.status === 'COMPLETED'
                                  ? 'Concluído'
                                  : w.status === 'REJECTED'
                                  ? 'Rejeitado'
                                  : 'Pendente (2-3h)'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-1.5">
                              {w.status === 'PENDING' ? (
                                <>
                                  <button
                                    onClick={() => handleUpdateWithdrawalStatus(w.id, 'COMPLETED')}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] transition shadow-xs cursor-pointer"
                                    title="Marcar como enviado via M-Pesa/e-Mola"
                                  >
                                    Concluir
                                  </button>
                                  <button
                                    onClick={() => handleUpdateWithdrawalStatus(w.id, 'REJECTED')}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-rose-900 text-rose-300 font-bold rounded-lg text-[11px] transition cursor-pointer"
                                    title="Cancelar pedido"
                                  >
                                    Rejeitar
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] font-mono text-slate-500">
                                  Processado
                                </span>
                              )}
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

        {/* ======================================================== */}
        {/* ABA: JOGO 21H - JANELA DE RECOMPENSA NOTURNA DIÁRIA */}
        {/* ======================================================== */}
        {activeTab === 'jogo-21h' && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl -z-0 pointer-events-none"></div>
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-white">Janela Operacional 21h • Janela Diária de Execução (admin_config/daily)</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        1x Por Dia
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Controlo central da sessão noturna das 21:00 às 21:30 (Horário Oficial de Maputo). Os utilizadores recebem o lucro crescente com 1 toque.
                    </p>
                  </div>
                </div>

                {/* Maputo Live Clock Badge */}
                <div className="flex items-center gap-3 bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800">
                  <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Hora de Moçambique (CAT, UTC+2)</span>
                    <span className="text-sm font-black font-mono text-white tracking-widest">{maputoTime.timeFormatted}</span>
                  </div>
                  <span className={`ml-2 px-2.5 py-1 rounded-xl text-[10px] font-black border ${
                    (maputoTime.isInWindow || dailyConfig.forceOpen)
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {(maputoTime.isInWindow || dailyConfig.forceOpen) ? 'JANELA ABERTA' : 'JANELA FECHADA'}
                  </span>
                </div>
              </div>

              {/* Status and Configuration Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                
                {/* 1. Escolha da AÇÃO DO DIA */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <span>Ação Oficial do Dia (COMPRAR ou VENDER)</span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Esta é a diretriz oficial que determina a ação exibida no botão dos utilizadores às 21h.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      Doc: admin_config/daily
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Botão COMPRAR */}
                    <button
                      type="button"
                      onClick={() => handleSaveDailyConfig('buy')}
                      disabled={isSavingDaily}
                      className={`p-4 rounded-2xl border transition text-left cursor-pointer flex flex-col justify-between ${
                        dailyConfig.actionType === 'buy'
                          ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/50'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Diretriz de Alta</span>
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-xl font-black text-emerald-300">COMPRAR (Alta)</span>
                      <span className="text-[11px] text-slate-300 mt-1">
                        Tendência de Alta: Investidores que clicarem COMPRAR às 21h ganham +4,73% do saldo. Quem vender perde 100 MT.
                      </span>
                    </button>

                    {/* Botão VENDER */}
                    <button
                      type="button"
                      onClick={() => handleSaveDailyConfig('sell')}
                      disabled={isSavingDaily}
                      className={`p-4 rounded-2xl border transition text-left cursor-pointer flex flex-col justify-between ${
                        dailyConfig.actionType === 'sell'
                          ? 'bg-rose-950/70 border-rose-500 text-white shadow-lg shadow-rose-500/20 ring-2 ring-rose-500/50'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Diretriz de Baixa</span>
                        <TrendingDown className="w-5 h-5 text-rose-400" />
                      </div>
                      <span className="text-xl font-black text-rose-300">VENDER (Baixa)</span>
                      <span className="text-[11px] text-slate-300 mt-1">
                        Tendência de Baixa: Investidores que clicarem VENDER às 21h ganham +4,73% do saldo. Quem comprar perde 100 MT.
                      </span>
                    </button>
                  </div>

                  {/* Force Open Toggle (Modo Teste) */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Forçar Janela Aberta (Modo Teste do Admin)</span>
                      <span className="text-[11px] text-slate-400 block">
                        Permite que os utilizadores e você testem o botão de coleta a qualquer hora do dia fora das 21h.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSaveDailyConfig(dailyConfig.actionType, !dailyConfig.forceOpen)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        dailyConfig.forceOpen
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {dailyConfig.forceOpen ? 'ATIVADO (Forçado)' : 'DESATIVADO (Normal)'}
                    </button>
                  </div>
                </div>

                {/* 2. Regras e Estatísticas de Coletas Hoje */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <span>Estatísticas da Janela 21h Hoje</span>
                    </h3>
                    <span className="text-xs font-mono text-slate-400 font-bold">{getMaputoTodayDate()}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Investidores que Coletaram</span>
                      <span className="text-2xl font-black text-amber-400 mt-1 block">
                        {dailyClaimsToday.length}
                      </span>
                      <span className="text-[10px] text-slate-500">Hoje em Maputo</span>
                    </div>

                    <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Total Distribuído (MT)</span>
                      <span className="text-2xl font-black text-emerald-400 mt-1 block">
                        {dailyClaimsToday.reduce((acc, c) => acc + (c.amount || 0), 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                      </span>
                      <span className="text-[10px] text-slate-500">Bónus virtual creditado</span>
                    </div>
                  </div>

                  {/* Fórmula Explicativa */}
                  <div className="p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl text-[11px] text-blue-200 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-blue-300">
                      <Activity className="w-3.5 h-3.5" />
                      Fórmula de Recompensa Crescente:
                    </p>
                    <code className="block bg-slate-900/80 px-2 py-1 rounded text-[10px] text-amber-300 font-mono">
                      incremento = 50 + Math.floor((saldoAtual - 1000)/20) + random(5, 15)
                    </code>
                    <p className="text-slate-400 text-[10px] leading-tight">
                      Garante que investidores com maior saldo ganham recompensas crescentes proporcionais, e o saldo só sobe.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela de Investidores que Coletaram Hoje */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Auditoria de Coletas Realizadas Hoje (transactions / bonus_21h)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Registo em tempo real de cada utilizador que tocou no botão de lucro durante a janela das 21h.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400 font-bold">
                  {dailyClaimsToday.length} coletas
                </span>
              </div>

              {dailyClaimsToday.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  Nenhum investidor realizou a coleta hoje ainda. Assim que a janela abrir às 21h e clicarem no botão, as transações surgirão aqui em tempo real.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Investidor</th>
                        <th className="py-3 px-4">E-mail</th>
                        <th className="py-3 px-4 text-center">Ação</th>
                        <th className="py-3 px-4 text-right">Recompensa (MT)</th>
                        <th className="py-3 px-4 text-right">Saldo Anterior</th>
                        <th className="py-3 px-4 text-right">Novo Saldo</th>
                        <th className="py-3 px-4 text-right">Data/Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {dailyClaimsToday.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-bold text-slate-200">{t.userName}</td>
                          <td className="py-3 px-4 font-mono text-slate-400">{t.userEmail}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              {dailyConfig.actionType === 'buy' ? 'COMPRAR' : 'VENDER'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-400">
                            +{t.amount.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400">
                            {t.previousBalance.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-white">
                            {t.newBalance.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                            {t.timestamp?.toDate ? t.timestamp.toDate().toLocaleTimeString('pt-MZ') : 'Hoje'}
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

        {/* ======================================================== */}
        {/* ABA 4: MERCADO & HORÁRIOS DE TRADING */}
        {/* ======================================================== */}
        {activeTab === 'mercado' && (
          <div className="space-y-6">
            {/* Market Schedule Configuration Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Horário Oficial de Trading (admin_config/market_hours)</h3>
                    <p className="text-xs text-slate-400">
                      Quando fora deste horário, Comprar e Vender são desabilitados com a mensagem definida, sem prejuízo forçado.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
                    marketConfig.globalMarketOpen
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${marketConfig.globalMarketOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                    {marketConfig.globalMarketOpen ? 'Mercado Global Aberto' : 'Mercado Global Fechado'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Schedule Label */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Descrição do Horário Oficial
                  </label>
                  <input
                    type="text"
                    value={marketConfig.scheduleText}
                    onChange={(e) => setMarketConfig({ ...marketConfig, scheduleText: e.target.value })}
                    placeholder="Ex: Segunda a Sexta às 21:00"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Exibido no aviso de &quot;Mercado Fechado - Abre às...&quot;</p>
                </div>

                {/* Open Hour */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Hora de Encerramento Noturno
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={marketConfig.closeHour}
                    onChange={(e) => setMarketConfig({ ...marketConfig, closeHour: parseInt(e.target.value, 10) || 21 })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Hora limite (ex: 21 para 21:00)</p>
                </div>

                {/* Global Toggle */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Interruptor Geral de Negociação
                  </label>
                  <button
                    type="button"
                    onClick={() => setMarketConfig({ ...marketConfig, globalMarketOpen: !marketConfig.globalMarketOpen })}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                      marketConfig.globalMarketOpen
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {marketConfig.globalMarketOpen ? (
                      <>
                        <PauseCircle className="w-4 h-4 text-rose-400" />
                        <span>Fechar Todo o Mercado Manualmente</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 text-emerald-400" />
                        <span>Abrir Mercado para Operações</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-500 mt-1">Sobrepõe-se temporariamente ao relógio</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveMarketHours}
                  disabled={isSavingMarket}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingMarket ? 'A guardar horários...' : 'Salvar Regras de Horário'}</span>
                </button>
              </div>
            </div>

            {/* Commodities List & Pause/Resume Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Controlo Individual de Commodities</h3>
                  <p className="text-xs text-slate-400">
                    O preço continuará em cotação autônoma contínua. Pausar desabilita ordens para a matéria-prima selecionada.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Commodity</th>
                      <th className="py-3 px-4">Símbolo</th>
                      <th className="py-3 px-4">Categoria</th>
                      <th className="py-3 px-4">Unidade</th>
                      <th className="py-3 px-4 text-center">Estado Atual</th>
                      <th className="py-3 px-4 text-right">Ação de Mercado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {DEFAULT_COMMODITIES.map((c) => {
                      const isPaused = !!marketConfig.pausedAssets[c.id];
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-100 flex items-center gap-2">
                            <span>{c.name}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-blue-400 font-bold">{c.symbol}</td>
                          <td className="py-3.5 px-4 text-slate-400">{c.category}</td>
                          <td className="py-3.5 px-4 text-slate-400">{c.unit}</td>
                          <td className="py-3.5 px-4 text-center">
                            {isPaused ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[11px] font-bold">
                                <PauseCircle className="w-3.5 h-3.5" />
                                <span>Pausada</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Ativa</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleToggleCommodityPause(c.id)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer ${
                                isPaused
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {isPaused ? (
                                <>
                                  <PlayCircle className="w-3.5 h-3.5" />
                                  <span>Retomar</span>
                                </>
                              ) : (
                                <>
                                  <PauseCircle className="w-3.5 h-3.5" />
                                  <span>Pausar</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 4: COMUNICADOS GLOBAIS */}
        {/* ======================================================== */}
        {activeTab === 'comunicados' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Transmissor de Comunicados Globais</h3>
                    <p className="text-xs text-slate-400">
                      O comunicado ativo aparece como banner no topo da plataforma de todos os utilizadores em tempo real.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-bold text-slate-300">
                    {announcement.active ? 'Comunicado Ativo' : 'Desativado'}
                  </span>
                  <input
                    type="checkbox"
                    checked={announcement.active}
                    onChange={(e) => setAnnouncement({ ...announcement, active: e.target.checked })}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Título do Comunicado
                  </label>
                  <input
                    type="text"
                    value={announcement.title}
                    onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                    placeholder="Ex: Aviso Importante da Mesa de Operações"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Mensagem a Exibir para Todos os Usuários
                  </label>
                  <textarea
                    rows={3}
                    value={announcement.message}
                    onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                    placeholder="Mensagem oficial..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Estilo / Nível de Alerta
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'info', label: 'Informativo', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
                      { id: 'warning', label: 'Aviso / Alerta', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
                      { id: 'urgent', label: 'Urgente', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
                      { id: 'success', label: 'Institucional', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setAnnouncement({ ...announcement, type: t.id as any })}
                        className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                          announcement.type === t.id
                            ? `${t.color} ring-1 ring-white/20`
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Pré-visualização em Tempo Real (Como os Investidores Verão no Terminal)
                </label>
                <div
                  className={`p-3.5 rounded-2xl border flex items-start space-x-3 text-xs ${
                    announcement.type === 'warning'
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                      : announcement.type === 'urgent'
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                      : announcement.type === 'success'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                      : 'bg-blue-500/15 border-blue-500/30 text-blue-200'
                  }`}
                >
                  <Bell className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{announcement.title || 'Título do Comunicado'}</p>
                    <p className="mt-0.5 opacity-90">{announcement.message || 'Mensagem do comunicado...'}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveAnnouncement}
                  disabled={isSavingAnnouncement}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSavingAnnouncement ? 'A transmitir...' : 'Publicar Comunicado'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA: GESTÃO DA DICA DO INSTRUTOR (admin_config/instructor_tip) */}
        {/* ======================================================== */}
        {/* ABA: GESTÃO DA DICA DO INSTRUTOR - CONTROLE CENTRAL */}
        {/* ======================================================== */}
        {activeTab === 'dica-instrutor' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[#111a2e] border border-[#1e293b] rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Header do Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1e293b] pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      📘 Dica do Instrutor - Controle Central
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Altere a dica diária em tempo real. Salva diretamente em <code className="text-blue-300 font-mono">{'doc(db, "config", "dicaInstrutor")'}</code> e reflete instantaneamente para todos os investidores.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Sincronização Ao Vivo
                  </span>
                </div>
              </div>

              {/* Presets Rápidos de Dicas */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Modelos Rápidos (Preencher com 1 Clique)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    {
                      label: 'Gestão de 10%',
                      badge: 'Gestão de Risco',
                      title: 'Dica do Instrutor',
                      author: 'Mateus Maputo',
                      content: 'Nunca invista mais de 10% do seu saldo disponível numa única operação. Diversifique entre setores (Energia, Metais e Agricultura) para proteger o seu capital!'
                    },
                    {
                      label: 'Caju Nampula',
                      badge: 'Oportunidade',
                      title: 'Análise de Mercado',
                      author: 'Mateus Maputo',
                      content: 'A procura internacional por castanha moçambicana nos portos asiáticos subiu 8% esta semana. Excelente momento para acompanhar o setor agrícola!'
                    },
                    {
                      label: 'Janela das 21h',
                      badge: 'Estratégia 21h',
                      title: 'Sessão Noturna',
                      author: 'Mateus Maputo',
                      content: 'A Janela das 21h abre pontualmente de segunda a sexta. Confirme a diretriz oficial (Comprar ou Vender) e garanta o seu lucro de trading com 1 toque.'
                    },
                    {
                      label: 'Gás do Rovuma',
                      badge: 'Análise Macro',
                      title: 'Energia Nacional',
                      author: 'Mateus Maputo',
                      content: 'Contratos futuros de Gás Natural (NATGAS) apresentam menor volatilidade que o Petróleo Brent. Boa opção para investidores com perfil moderado.'
                    }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setInstructorTipText(preset.content);
                        setInstructorTipAuthor(preset.author);
                        setInstructorTipTipo(preset.badge);
                        setInstructorTip({
                          ...instructorTip,
                          title: preset.title,
                          badge: preset.badge,
                          author: preset.author,
                          content: preset.content,
                          active: true
                        });
                      }}
                      className="p-2.5 bg-[#0a1020] hover:bg-slate-800 border border-[#1e293b] rounded-xl text-left transition cursor-pointer group"
                    >
                      <span className="text-xs font-bold text-white group-hover:text-blue-400 block truncate">
                        {preset.label}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                        {preset.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form de Edição */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Instrutor / Autor
                  </label>
                  <input
                    type="text"
                    value={instructorTipAuthor}
                    onChange={(e) => {
                      setInstructorTipAuthor(e.target.value);
                      setInstructorTip(prev => ({ ...prev, author: e.target.value }));
                    }}
                    placeholder="Ex: Mateus Maputo"
                    className="w-full px-3.5 py-2.5 bg-[#0a1020] border border-[#1e293b] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Tipo / Selo (Badge)
                  </label>
                  <input
                    type="text"
                    value={instructorTipTipo}
                    onChange={(e) => {
                      setInstructorTipTipo(e.target.value);
                      setInstructorTip(prev => ({ ...prev, badge: e.target.value }));
                    }}
                    placeholder="Ex: Dica de Ouro"
                    className="w-full px-3.5 py-2.5 bg-[#0a1020] border border-[#1e293b] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Textarea para digitar a Dica do Instrutor */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Conteúdo da Dica do Instrutor
                </label>
                <textarea
                  rows={4}
                  value={instructorTipText}
                  onChange={(e) => {
                    setInstructorTipText(e.target.value);
                    setInstructorTip(prev => ({ ...prev, content: e.target.value }));
                  }}
                  placeholder="Escreva aqui a dica ou estratégia oficial que todos os investidores verão no topo do painel..."
                  className="w-full p-4 bg-[#0a1020] border border-[#1e293b] rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition leading-relaxed"
                ></textarea>
              </div>

              {/* Prévia ao Vivo */}
              <div className="pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Prévia em Tempo Real (Como é exibida no painel dos Investidores)
                </span>
                <div className="bg-blue-50/95 rounded-2xl p-4 border border-blue-100 space-y-2 shadow-sm text-left max-w-lg">
                  <div className="flex items-center justify-between text-blue-900 font-bold text-xs">
                    <div className="flex items-center space-x-1.5">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span>Dica do Instrutor</span>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200">
                      {instructorTipTipo || 'Dica de Ouro'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    &ldquo;{instructorTipText || 'O conteúdo da sua dica aparecerá aqui...'}&rdquo;
                  </p>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-blue-100">
                    <span className="font-semibold text-slate-600">{instructorTipAuthor || 'Mateus Maputo'}</span>
                    <span className="text-blue-600 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                      Ao Vivo
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão: Salvar e Publicar em Tempo Real */}
              <div className="flex justify-end pt-3 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={handleSaveInstructorTip}
                  disabled={isSavingInstructorTip || !instructorTipText.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer border border-blue-400/30"
                >
                  {isSavingInstructorTip ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>A publicar...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Salvar e Publicar em Tempo Real</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 6: CHAT GLOBAL DO GRUPO (GESTÃO, AVISOS E MODERAÇÃO) */}
        {/* ======================================================== */}
        {activeTab === 'chat' && (
          <div className="space-y-6">
            
            {/* Header com Atalho para o Chat Ao Vivo */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                    Controlo do Chat Global (WhatsApp/Telegram Style)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Canal Ao Vivo
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Transmita avisos oficiais em destaque amarelo, fixe mensagens no topo do grupo e modere mensagens em tempo real.
                </p>
              </div>

              <Link
                href="/chat"
                prefetch={true}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Abrir Chat Ao Vivo em Ecrã Inteiro</span>
              </Link>
            </div>

            {/* Grid: Enviar Aviso no Chat + Mensagem Fixada */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Card 1: Formulário de Envio de Aviso no Chat */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Enviar Aviso Oficial no Chat (Destaque Amarelo)
                  </h3>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    type: &apos;system&apos;
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Texto do Aviso Oficial
                    </label>
                    <textarea
                      rows={3}
                      value={chatNoticeText}
                      onChange={(e) => setChatNoticeText(e.target.value)}
                      placeholder="Ex: 📢 ATENÇÃO: A Janela de Trading 21h abre em 15 minutos! Todos os investidores devem confirmar as ordens."
                      className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                    ></textarea>
                  </div>

                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={pinChatNotice}
                      onChange={(e) => setPinChatNotice(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                    <span className="font-semibold text-amber-300">
                      Fixar este aviso no topo do chat para todos os usuários (admin_config/chat)
                    </span>
                  </label>

                  {/* Prévia do Destaque Amarelo */}
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Prévia do Destaque (Como os Investidores Verão)
                    </span>
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 border border-amber-500/40 text-amber-200 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase text-amber-400">ADMINISTRAÇÃO TAPRISE • SISTEMA</span>
                        <span className="text-[10px] text-amber-300/70 font-mono">Agora</span>
                      </div>
                      <p className="text-white text-xs font-semibold leading-relaxed">
                        {chatNoticeText.trim() || 'O seu aviso aparecerá destacado aqui com borda dourada e fundo luminoso para todos os investidores.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSendChatNotice}
                      disabled={isSendingChatNotice || !chatNoticeText.trim()}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSendingChatNotice ? 'A transmitir...' : 'Enviar Aviso no Chat'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Gestão da Mensagem Fixada no Topo */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Pin className="w-4 h-4 text-amber-400 rotate-45" />
                    Mensagem Atualmente Fixada no Topo
                  </h3>
                  {pinnedChatConfig?.pinnedMessageId ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Fixada
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                      Nenhuma
                    </span>
                  )}
                </div>

                {pinnedChatConfig?.pinnedMessageId ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-400">
                          {pinnedChatConfig.pinnedAuthor || 'Administração TapRise'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ID: {pinnedChatConfig.pinnedMessageId?.slice(0, 10)}...
                        </span>
                      </div>
                      <p className="text-white text-xs leading-relaxed font-medium">
                        {pinnedChatConfig.pinnedText}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleUnpinChatMessage}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-xl text-xs font-bold border border-rose-500/20 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Desafixar do Topo</span>
                      </button>
                      <Link
                        href="/chat"
                        className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-xl text-xs font-bold border border-blue-500/30 transition flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ver no Chat</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 text-xs space-y-2">
                    <Pin className="w-8 h-8 mx-auto text-slate-600 rotate-45" />
                    <p className="font-semibold text-slate-400">Nenhuma mensagem fixada no momento</p>
                    <p className="text-[11px] text-slate-500">
                      Pode fixar qualquer aviso transmitido acima ou fixar diretamente no histórico abaixo.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Card 3: Histórico e Moderação de Mensagens do Chat */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-blue-400" />
                    Histórico Recente e Moderação do Chat
                  </h3>
                  <p className="text-xs text-slate-400">
                    O admin pode fixar qualquer mensagem no topo ou apagá-la para todos os utilizadores.
                  </p>
                </div>
                <span className="text-xs font-mono bg-slate-800 text-slate-300 px-3 py-1 rounded-full">
                  {adminChatMessages.length} mensagem(ns) recente(s)
                </span>
              </div>

              {adminChatMessages.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  A carregar mensagens do chat...
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto pr-1">
                  {adminChatMessages.map((msg) => (
                    <div key={msg.id} className="py-3 flex items-start justify-between gap-3 group hover:bg-slate-950/40 px-2 rounded-xl transition">
                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">
                            {msg.displayName || msg.userName || 'Investidor'}
                          </span>
                          {msg.isAdmin && (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black px-1.5 py-0.2 rounded">
                              ADMIN
                            </span>
                          )}
                          {msg.type === 'system' && (
                            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[9px] font-black px-1.5 py-0.2 rounded">
                              SISTEMA
                            </span>
                          )}
                          {msg.isDeleted && (
                            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold px-1.5 py-0.2 rounded">
                              REMOVIDA
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-mono">
                            {msg.email || msg.userEmail}
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed break-words ${
                          msg.isDeleted
                            ? 'text-slate-500 italic'
                            : msg.type === 'system'
                            ? 'text-amber-300 font-semibold'
                            : 'text-slate-300'
                        }`}>
                          {msg.text}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 pt-1">
                        <button
                          type="button"
                          onClick={() => handlePinChatMessage(msg)}
                          className="p-1.5 bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-slate-400 rounded-lg text-xs transition cursor-pointer"
                          title="Fixar no topo do chat"
                        >
                          <Pin className="w-3.5 h-3.5 rotate-45" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteChatMessage(msg.id)}
                          className="p-1.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded-lg text-xs transition cursor-pointer"
                          title="Apagar mensagem para todos"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
