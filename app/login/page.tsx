'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loginGuest, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only redirect if already logged in with a real (non-anonymous) account
  useEffect(() => {
    if (user && !user.isAnonymous && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Por favor, preencha todos os campos.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Falha ao autenticar.');
    } else {
      router.push('/');
    }
  };

  const handleGuestLogin = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);
    const result = await loginGuest();
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Falha ao aceder como visitante.');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Container Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <Link href="/" prefetch={true} className="inline-flex items-center space-x-3 group">
            <div className="w-12 h-12 bg-blue-600 group-hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center font-black tracking-widest text-lg shadow-lg shadow-blue-200 transition">
              TR
            </div>
            <div className="text-left">
              <span className="text-2xl font-black text-slate-900 tracking-tight block">TapRise</span>
              <span className="text-xs text-blue-600 font-bold uppercase tracking-wider block">
                Bolsa e Mercadorias
              </span>
            </div>
          </Link>
          <h2 className="mt-6 text-xl sm:text-2xl font-black text-slate-900">
            Aceda à sua Carteira
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Entre para negociar matérias-primas e acompanhar os seus investimentos em Meticais (MT).
          </p>
        </div>

        {/* Form Box */}
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-100 sm:px-10">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-800 text-xs font-semibold">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* E-mail */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Endereço de E-mail
              </label>
              <div className="relative rounded-2xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@taprise.co.mz"
                  className="block w-full pl-10 pr-3 py-3 text-xs bg-white text-slate-900 border border-slate-200 rounded-2xl placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password with Show/Hide toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Palavra-passe
                </label>
              </div>
              <div className="relative rounded-2xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="block w-full pl-10 pr-10 py-3 text-xs bg-white text-slate-900 border border-slate-200 rounded-2xl placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  title={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 border border-transparent rounded-2xl shadow-md text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50 cursor-pointer"
              >
                <span>{isSubmitting ? 'A verificar credenciais...' : 'Entrar na Plataforma'}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  Ou experimente em modo de demonstração
                </span>
              </div>
            </div>

            {/* Quick Demo Access */}
            <div className="mt-4">
              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Entrar como Visitante Convidado</span>
              </button>
            </div>
          </div>

          {/* Registration Promo */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Não tem uma conta registada?{' '}
              <Link
                href="/register"
                prefetch={true}
                className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                Criar Conta Gratuita
              </Link>
            </p>
            <div className="mt-3 inline-flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px] font-bold border border-blue-200">
              <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>Abertura de conta oficial supervisionada pela mesa</span>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="mt-6 text-center text-[11px] text-slate-400 space-y-1">
          <p className="flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Ambiente Seguro e Protegido • Encriptação de Alta Segurança 256-bit
          </p>
          <p>TapRise • Bolsa de Mercadorias de Moçambique</p>
        </div>

      </div>
    </div>
  );
}
