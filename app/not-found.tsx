import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 text-center">
      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
        MZ
      </div>
      <h1 className="text-3xl font-bold text-slate-800 mb-2">404 - Página Não Encontrada</h1>
      <p className="text-slate-600 mb-6 max-w-md">
        A página da Bolsa Virtual de Moçambique que procura não existe ou foi movida.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow hover:bg-blue-700 transition"
      >
        Voltar à Plataforma MZ TRADE
      </Link>
    </div>
  );
}
