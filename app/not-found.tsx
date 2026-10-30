import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 text-center text-white">
      <div className="w-16 h-16 bg-[#2563eb] text-white rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-2xl shadow-lg">
        TR
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">404 - Página Não Encontrada</h1>
      <p className="text-slate-400 mb-6 max-w-md text-sm">
        A página que procura não existe ou foi movida na plataforma TapRise.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-[#2563eb] hover:bg-blue-600 text-white rounded-xl font-semibold shadow transition text-sm"
      >
        Voltar à Plataforma TapRise
      </Link>
    </div>
  );
}
