'use client';

import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800">
      {/* Barra Superior / Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <span className="font-bold text-lg tracking-tight text-slate-900">
            CIn <span className="text-red-700">UFPE</span>
          </span>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full font-mono">
            Sistemas Distribuidos
          </span>
        </div>
      </header>

      {/* Bloco Central de Boas-vindas */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 text-red-700 rounded-full flex items-center justify-center mx-auto text-2xl font-bold border border-red-100">
            {`</>`}
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Portal de Reservas
            </h1>
            <p className="text-sm text-slate-500">
              Gerenciamento dinâmico e concorrente de salas de estudo do Centro de Informática.
            </p>
          </div>

          <hr className="border-slate-100" />

          <button
            onClick={() => router.push('/login')}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-semibold py-3 px-4 shadow-md transition-all active:scale-[0.98]"
          >
            Acessar com E-mail Institucional
          </button>
        </div>
      </div>

      {/* Rodapé */}
      <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-100 bg-white">
        Grupo 2 • Alocação de Recursos em Tempo Real © 2026
      </footer>
    </main>
  );
}