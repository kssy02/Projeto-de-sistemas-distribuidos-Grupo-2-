'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // MOCK: Validação temporária para aceitar apenas o domínio do CIn
    setTimeout(() => {
      if (!email.endsWith('@cin.ufpe.br')) {
        setError('Por favor, utilize seu e-mail institucional (@cin.ufpe.br).');
        setLoading(false);
        return;
      }

      if (password.length < 4) {
        setError('A senha deve ter pelo menos 4 caracteres (Ambiente Mock).');
        setLoading(false);
        return;
      }

      // Se passar no mock, redireciona para a nova tela de reservas remodelada
      router.push('/reservas');
    }, 1000); // Simula um delay de rede de 1 segundo
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      
      {/* METADE ESQUERDA: Formulário de Login */}
      <div className="flex w-full flex-col justify-center px-8 py-12 md:w-1/2 lg:px-24 xl:px-32 bg-white">
        <div className="mx-auto w-full max-w-md">
          
          {/* Cabeçalho */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Reserva de Salas
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Acesse usando sua conta institucional do <span className="font-semibold text-red-700">CIn / UFPE</span>.
            </p>
          </div>

          {/* Alerta de Erro Mock */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg font-medium">
              {error}
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                E-mail Institucional
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="usuario@cin.ufpe.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 sm:text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Senha
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 sm:text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-lg bg-red-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Autenticando...' : 'Entrar'}
              </button>
            </div>
          </form>

          {/* Rodapé do Form */}
          <p className="mt-8 text-center text-xs text-slate-400">
            Ambiente de Testes (Mock) • Sistemas Distribuídos Grupo 2
          </p>
        </div>
      </div>

      {/* METADE DIREITA: Imagem do CIn */}
      <div className="relative hidden w-1/2 md:block bg-red-950">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-overlay"
          style={{ 
            backgroundImage: `url('https://www.ufpe.br/documents/38953/0/cin_divulgacao_0.jpg/f7bfcd84-b0a6-4298-8ec1-bc66e133c948?t=1506522300000')` 
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-end p-12 text-white bg-gradient-to-t from-red-950 via-transparent to-transparent">
          <h2 className="text-2xl font-bold">Centro de Informática - UFPE</h2>
          <p className="mt-2 text-sm text-red-200 max-w-md">
            Infraestrutura moderna e conectada para o gerenciamento e reserva de salas acadêmicas.
          </p>
        </div>
      </div>

    </div>
  );
}