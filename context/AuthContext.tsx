'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '@/src/firebase';

export interface UserProfile {
  uid: string;
  nome: string;
  email: string;
  idade: number;
  provincia: string;
  saldoVirtual: number;
  patrimonioTotal: number;
  criadoEm?: unknown;
  atualizadoEm?: unknown;
}

export const MOZAMBIQUE_PROVINCES = [
  'Maputo Cidade',
  'Maputo Província',
  'Gaza',
  'Inhambane',
  'Sofala',
  'Manica',
  'Tete',
  'Zambézia',
  'Nampula',
  'Cabo Delgado',
  'Niassa'
] as const;

export type MozambiqueProvince = (typeof MOZAMBIQUE_PROVINCES)[number];

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  register: (
    email: string,
    pass: string,
    nome: string,
    idade: number,
    provincia: string
  ) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginGuest: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateBalance: (saldo: number, patrimonio?: number) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper for promise timeout to ensure the UI never hangs
const promiseWithTimeout = <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs))
  ]);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to get cached profile instantly from localStorage
  const getCachedProfile = (uid: string): UserProfile | null => {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(`mz_profile_${uid}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  };

  const saveCachedProfile = (profile: UserProfile) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`mz_profile_${profile.uid}`, JSON.stringify(profile));
    } catch {
      // ignore
    }
  };

  // Helper to fetch user document with non-blocking timeout fallback
  const fetchUserProfile = useCallback(async (uid: string, fallbackEmail = '', fallbackName = ''): Promise<UserProfile> => {
    const cached = getCachedProfile(uid);

    const defaultFallback: UserProfile = cached || {
      uid,
      nome: fallbackName || 'Investidor MZ TRADE',
      email: fallbackEmail || 'investidor@mztrade.co.mz',
      idade: 21,
      provincia: 'Maputo Cidade',
      saldoVirtual: 1000.0,
      patrimonioTotal: 1000.0
    };

    try {
      const userRef = doc(db, 'users', uid);
      // Timeout getDoc after 2.5 seconds to never freeze slow networks
      const snapshot = await promiseWithTimeout(getDoc(userRef), 2500, null);

      if (snapshot && snapshot.exists()) {
        const data = snapshot.data();
        const profile: UserProfile = {
          uid,
          nome: data.nome || fallbackName || defaultFallback.nome,
          email: data.email || fallbackEmail || defaultFallback.email,
          idade: typeof data.idade === 'number' ? data.idade : defaultFallback.idade,
          provincia: data.provincia || defaultFallback.provincia,
          saldoVirtual: typeof data.saldoVirtual === 'number' ? data.saldoVirtual : defaultFallback.saldoVirtual,
          patrimonioTotal: typeof data.patrimonioTotal === 'number' ? data.patrimonioTotal : defaultFallback.patrimonioTotal,
          criadoEm: data.criadoEm,
          atualizadoEm: data.atualizadoEm
        };
        saveCachedProfile(profile);
        return profile;
      } else if (snapshot && !snapshot.exists()) {
        // Document doesn't exist yet, seed it in background
        const newProfile: UserProfile = {
          uid,
          nome: fallbackName || 'Investidor MZ TRADE',
          email: fallbackEmail || 'investidor@mztrade.co.mz',
          idade: 21,
          provincia: 'Maputo Cidade',
          saldoVirtual: 1000.0,
          patrimonioTotal: 1000.0
        };
        saveCachedProfile(newProfile);
        setDoc(userRef, {
          ...newProfile,
          criadoEm: serverTimestamp()
        }).catch(() => {});
        return newProfile;
      }
    } catch (err) {
      console.warn('Sincronização de perfil em segundo plano:', err);
    }

    return defaultFallback;
  }, []);

  // Listen to auth state changes across all sessions / devices
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;
      setUser(currentUser);

      if (currentUser) {
        // Check local cache for immediate display
        const cached = getCachedProfile(currentUser.uid);
        if (cached && isMounted) {
          setUserProfile(cached);
          setLoading(false); // Unblock UI immediately!
        }

        // Fetch or sync profile in background
        fetchUserProfile(
          currentUser.uid,
          currentUser.email || '',
          currentUser.displayName || ''
        ).then((profile) => {
          if (isMounted) {
            setUserProfile(profile);
            setLoading(false);
          }
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [fetchUserProfile]);

  // CADASTRO / REGISTRO
  const register = async (
    email: string,
    pass: string,
    nome: string,
    idade: number,
    provincia: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Validação de idade mínima 18 anos
    if (idade < 18) {
      return {
        success: false,
        error: 'Apenas maiores de 18 anos podem usar a Bolsa Virtual de Moçambique'
      };
    }

    if (!email || !email.includes('@')) {
      return { success: false, error: 'Por favor, insira um endereço de e-mail válido.' };
    }

    if (!pass || pass.length < 6) {
      return { success: false, error: 'A palavra-passe deve conter pelo menos 6 caracteres.' };
    }

    if (!nome.trim()) {
      return { success: false, error: 'Por favor, preencha o seu nome completo.' };
    }

    try {
      setLoading(true);

      // If user was an anonymous guest, sign out first to ensure a pristine new account
      if (auth.currentUser && auth.currentUser.isAnonymous) {
        try {
          await signOut(auth);
        } catch {
          // continue
        }
      }

      // 1. Criar novo utilizador
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const newUser = userCredential.user;

      // 2. Atualizar perfil de exibição
      try {
        await updateProfile(newUser, { displayName: nome.trim() });
      } catch {
        // Ignora falha cosmética de displayName
      }

      // 3. Estruturar perfil inicial
      const initialProfile: UserProfile = {
        uid: newUser.uid,
        nome: nome.trim(),
        email: email.trim(),
        idade: Number(idade),
        provincia: provincia || 'Maputo Cidade',
        saldoVirtual: 1000.0,
        patrimonioTotal: 1000.0
      };

      // Guardar na cache local para resposta ultra-rápida
      saveCachedProfile(initialProfile);
      setUser(newUser);
      setUserProfile(initialProfile);

      // 4. Gravar na base de dados (com timeout não bloqueante para o utilizador nunca ficar retido)
      const userRef = doc(db, 'users', newUser.uid);
      setDoc(userRef, {
        ...initialProfile,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      }).catch((e) => console.warn('Registo na nuvem em fila:', e));

      setLoading(false);
      return { success: true };
    } catch (err: unknown) {
      setLoading(false);
      let message = 'Ocorreu um erro ao processar o registo da conta. Tente novamente.';
      if (err instanceof Error) {
        if (err.message.includes('auth/email-already-in-use')) {
          message = 'Este e-mail já se encontra registado na plataforma. Por favor, inicie sessão.';
        } else if (err.message.includes('auth/invalid-email')) {
          message = 'O formato do e-mail introduzido é inválido.';
        } else if (err.message.includes('auth/weak-password')) {
          message = 'A palavra-passe deve conter pelo menos 6 caracteres.';
        } else if (err.message.includes('auth/network-request-failed')) {
          message = 'Falha de ligação à rede. Verifique o seu acesso à internet.';
        } else {
          message = err.message;
        }
      }
      return { success: false, error: message };
    }
  };

  // LOGIN
  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Por favor, insira o seu e-mail.' };
    }
    if (!pass) {
      return { success: false, error: 'Por favor, insira a sua palavra-passe.' };
    }

    try {
      setLoading(true);

      // If user was anonymous guest, clean sign out first
      if (auth.currentUser && auth.currentUser.isAnonymous) {
        try {
          await signOut(auth);
        } catch {
          // continue
        }
      }

      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const currentUser = userCredential.user;

      // Buscar perfil
      const profile = await fetchUserProfile(
        currentUser.uid,
        currentUser.email || '',
        currentUser.displayName || ''
      );

      saveCachedProfile(profile);
      setUser(currentUser);
      setUserProfile(profile);
      setLoading(false);
      return { success: true };
    } catch (err: unknown) {
      setLoading(false);
      let message = 'E-mail ou palavra-passe incorretos.';
      if (err instanceof Error) {
        if (
          err.message.includes('auth/user-not-found') ||
          err.message.includes('auth/wrong-password') ||
          err.message.includes('auth/invalid-credential')
        ) {
          message = 'Credenciais de acesso inválidas. Verifique o seu e-mail e palavra-passe.';
        } else if (err.message.includes('auth/too-many-requests')) {
          message = 'Muitas tentativas falhadas por segurança. Aguarde alguns instantes.';
        } else if (err.message.includes('auth/network-request-failed')) {
          message = 'Erro de rede. Verifique a sua ligação à internet.';
        } else {
          message = err.message;
        }
      }
      return { success: false, error: message };
    }
  };

  // ENTRAR COMO VISITANTE CONVIDADO
  const loginGuest = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const userCredential = await signInAnonymously(auth);
      const currentUser = userCredential.user;

      const profile = await fetchUserProfile(
        currentUser.uid,
        'convidado@mztrade.co.mz',
        'Investidor Convidado'
      );

      saveCachedProfile(profile);
      setUser(currentUser);
      setUserProfile(profile);
      setLoading(false);
      return { success: true };
    } catch (err: unknown) {
      setLoading(false);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Falha ao aceder como visitante.'
      };
    }
  };

  // LOGOUT
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err) {
      console.error('Erro ao terminar sessão:', err);
    }
  };

  // ATUALIZAR SALDO E PATRIMÓNIO
  const updateBalance = async (saldo: number, patrimonio?: number) => {
    if (!user) return;

    setUserProfile((prev) => {
      if (!prev) return null;
      const updated: UserProfile = {
        ...prev,
        saldoVirtual: Number(saldo.toFixed(2)),
        patrimonioTotal: typeof patrimonio === 'number' ? Number(patrimonio.toFixed(2)) : prev.patrimonioTotal
      };
      saveCachedProfile(updated);
      return updated;
    });

    try {
      const userRef = doc(db, 'users', user.uid);
      const updateData: Record<string, unknown> = {
        saldoVirtual: Number(saldo.toFixed(2)),
        atualizadoEm: serverTimestamp()
      };
      if (typeof patrimonio === 'number') {
        updateData.patrimonioTotal = Number(patrimonio.toFixed(2));
      }
      setDoc(userRef, updateData, { merge: true }).catch(() => {});
    } catch (e) {
      console.warn('Sincronização de saldo em espera:', e);
    }
  };

  // RECARREGAR PERFIL
  const refreshProfile = async () => {
    if (!user) return;
    const p = await fetchUserProfile(user.uid, user.email || '', user.displayName || '');
    setUserProfile(p);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        register,
        login,
        loginGuest,
        logout,
        updateBalance,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
