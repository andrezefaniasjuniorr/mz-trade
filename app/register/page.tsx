'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  User,
  Calendar,
  MapPin,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  ShieldCheck,
  UserPlus,
  LogOut
} from 'lucide-react';
import { useAuth, MOZAMBIQUE_PROVINCES } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { user, userProfile, register, logout, loading } = useAuth();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [idade, setIdade] = useState<number | ''>('');
  const [provincia, setProvincia] = useState<string>('Maputo Cidade');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // If already logged in with a real registered account (not a guest/anonymous user)
  const isAlreadyRegistered = user && !user.isAnonymous;

  const handleSwitchAccount = async () => {
    try {
      await logout();
      setNome('');
      setEmail('');
      setPassword('');
      setIdade('');
      setErrorMessage(null);
    } catch (e) {
      console.warn('Erro ao alternar conta:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validação de Idade (Mínimo 18 anos)
    const idadeNum = Number(idade);
    if (!idade || isNaN(idadeNum) || idadeNum < 18) {
      setErrorMessage('Apenas maiores de 18 anos podem usar a Bolsa Virtual de Moçambique');
      return;
    }

    if (!nome.trim()) {
      setErrorMessage('Por favor, indique o seu nome completo.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor, indique um endereço de e-mail válido.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('A palavra-passe deve conter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    const result = await register(email, password, nome, idadeNum, provincia);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Falha ao processar o registo da conta.');
    } else {
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 1200);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4">
        
        {/* Header Branding */}
        <div className="text-center mb-6">
          <Link href="/" prefetch={true} className="inline-flex items-center space-x-3 group">
            <div className="w-12 h-12 bg-blue-600 group-hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center font-black tracking-widest text-xl shadow-lg shadow-blue-200 transition">
              TR
            </div>
            <div className="text-left">
              <span className="text-2xl font-black text-slate-900 tracking-tight block">TapRise</span>
              <span className="text-xs text-blue-600 font-bold uppercase tracking-wider block">
                Bolsa e Mercadorias
              </span>
            </div>
          </Link>
          <h2 className="mt-4 text-xl sm:text-2xl font-black text-slate-900">
            Registe a sua Conta de Investidor
          </h2>
        </div>

        {/* Existing Logged-in Alert Card if non-anonymous user visits /register */}
        {isAlreadyRegistered && !isSuccess && (
          <div className="mb-6 bg-white p-5 rounded-3xl border border-blue-200 shadow-md">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 text-xs">
                <p className="font-bold text-slate-900">Sessão Ativa Detetada</p>
                <p className="text-slate-600 mt-0.5">
                  Está conectado como <strong className="text-blue-700">{userProfile?.nome || user.email}</strong>.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push('/')}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-xs text-xs cursor-pointer"
                  >
                    Ir para o Terminal TapRise
                  </button>
                  <button
                    onClick={handleSwitchAccount}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Criar Outra Conta (Desconectar)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Banner */}
        {isSuccess && (
          <div className="mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="text-base font-black text-emerald-900">Conta Criada com Sucesso!</h3>
            <p className="text-xs text-emerald-700 font-medium">
              Conta registada (0,00 MT iniciais). O Administrador foi notificado para creditar o seu saldo. A redirecionar para a plataforma...
            </p>
          </div>
        )}

        {/* Form Card */}
        {!isAlreadyRegistered && !isSuccess && (
          <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-100 sm:px-10">
            
            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-3 text-rose-800 text-xs font-semibold">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nome Completo
                </label>
                <div className="relative rounded-2xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Armando Cossa"
                    className="block w-full pl-10 pr-3 py-3 text-xs bg-white text-slate-900 border border-slate-200 rounded-2xl placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  />
                </div>
              </div>

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
                    placeholder="seu-email@dominio.mz"
                    className="block w-full pl-10 pr-3 py-3 text-xs bg-white text-slate-900 border border-slate-200 rounded-2xl placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Palavra-passe with toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Palavra-passe (mínimo 6 caracteres)
                </label>
                <div className="relative rounded-2xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres seguros"
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

              {/* Grid: Idade + Província */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Idade (Validação 18+) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Idade (Mínimo 18)
                  </label>
                  <div className="relative rounded-2xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      required
                      value={idade}
                      onChange={(e) => setIdade(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                      placeholder="Ex: 24"
                      className="block w-full pl-10 pr-3 py-3 text-xs bg-white text-slate-900 border border-slate-200 rounded-2xl placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                    />
                  </div>
                </div>

                {/* Província de Moçambique */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Província
                  </label>
                  <div className="relative rounded-2xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <select
                      value={provincia}
                      onChange={(e) => setProvincia(e.target.value)}
                      className="block w-full pl-10 pr-8 py-3 text-xs bg-white text-slate-900 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition cursor-pointer appearance-none"
                    >
                      {MOZAMBIQUE_PROVINCES.map((prov) => (
                        <option key={prov} value={prov}>
                          {prov}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400 text-xs">
                      ▼
                    </div>
                  </div>
                </div>
              </div>

              {/* Legal compliance check notice */}
              <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100 text-[11px] text-blue-900 flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Ao registar-se, confirma que tem 18 anos ou mais e aceita os termos operacionais da plataforma TapRise.
                </span>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 border border-transparent rounded-2xl shadow-md text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? 'A processar abertura de conta...' : 'Criar Conta de Investidor'}</span>
                  {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>

            {/* Login Link */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-600">
                Já tem uma conta registada?{' '}
                <Link href="/login" prefetch={true} className="font-bold text-blue-600 hover:underline">
                  Iniciar Sessão
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Security Footer */}
        <div className="mt-6 text-center text-[11px] text-slate-400 space-y-1">
          <p className="flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Ambiente Seguro • Encriptação Institucional 256-bit
          </p>
          <p>TapRise • Bolsa de Mercadorias de Moçambique</p>
        </div>

      </div>
    </div>
  );
}
