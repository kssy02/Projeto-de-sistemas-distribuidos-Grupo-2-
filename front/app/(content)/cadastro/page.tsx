'use client';

import { useState, useEffect } from 'react';

export default function CadastroAdminPage() {
  // Estados para os Formulários
  const [novoTipo, setNovoTipo] = useState('');
  const [novoRecurso, setNovoRecurso] = useState('');
  
  const [salaId, setSalaId] = useState('');
  const [salaNome, setSalaNome] = useState('');
  const [salaCapacidade, setSalaCapacidade] = useState(4);
  const [salaTipoId, setSalaTipoId] = useState('');

  const [vinculoSalaId, setVinculoSalaId] = useState('');
  const [vinculoRecursoId, setVinculoRecursoId] = useState('');

  // Estados para Listagens Dinâmicas nos <select>
  const [tipos, setTipos]       = useState<{ id: number; nome: string }[]>([]);
  const [recursos, setRecursos] = useState<{ id: number; nome: string }[]>([]);
  const [salas, setSalas]       = useState<{ id: string; nome_exibicao: string }[]>([]);

  // Estados de feedback
  const [status, setStatus] = useState({ tipo: '', msg: '' });

  // Carregar dados iniciais do banco usando o Proxy configurado no next.config.ts
  const carregarDadosDoBanco = async () => {
    try {
      const resTipos = await fetch('/api-proxy/tipos-sala');
      const resRecursos = await fetch('/api-proxy/recursos');
      const resSalas = await fetch('/api-proxy/salas');

      if (resTipos.ok) setTipos(await resTipos.json());
      if (resRecursos.ok) setRecursos(await resRecursos.json());
      if (resSalas.ok) setSalas(await resSalas.json());
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
    }
  };

  useEffect(() => {
    carregarDadosDoBanco();
  }, []);

  const mostrarFeedback = (msg: string, erro = false) => {
    setStatus({ tipo: erro ? 'erro' : 'sucesso', msg });
    setTimeout(() => setStatus({ tipo: '', msg: '' }), 4000);
  };

  // 1. Enviar Categoria
  const cadastrarTipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTipo.trim()) return;
    try {
      const res = await fetch('/api-proxy/tipos-sala', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoTipo })
      });
      if (res.ok) {
        mostrarFeedback('Categoria cadastrada!');
        setNovoTipo('');
        carregarDadosDoBanco();
      } else {
        mostrarFeedback('Erro ao cadastrar categoria', true);
      }
    } catch { mostrarFeedback('Erro de conexão', true); }
  };

  // 2. Enviar Recurso
  const cadastrarRecurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoRecurso.trim()) return;
    try {
      const res = await fetch('/api-proxy/recursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoRecurso })
      });
      if (res.ok) {
        mostrarFeedback('Recurso cadastrado!');
        setNovoRecurso('');
        carregarDadosDoBanco();
      } else {
        mostrarFeedback('Erro ao cadastrar recurso', true);
      }
    } catch { mostrarFeedback('Erro de conexão', true); }
  };

  // 3. Enviar Sala
  const cadastrarSala = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaId || !salaNome || !salaTipoId) return;
    try {
      const res = await fetch('/api-proxy/salas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: salaId, 
          nome_exibicao: salaNome, 
          tipo_id: Number(salaTipoId), 
          capacidade: salaCapacidade 
        })
      });
      if (res.ok) {
        mostrarFeedback('Sala cadastrada com sucesso!');
        setSalaId(''); setSalaNome(''); setSalaTipoId('');
        carregarDadosDoBanco();
      } else {
        mostrarFeedback('Erro ao cadastrar sala', true);
      }
    } catch { mostrarFeedback('Erro de conexão', true); }
  };

  // 4. Vincular Recurso à Sala
  const vincularRecurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vinculoSalaId || !vinculoRecursoId) return;
    try {
      const res = await fetch('/api-proxy/salas/vincular-recurso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sala_id: vinculoSalaId, recurso_id: Number(vinculoRecursoId) })
      });
      if (res.ok) {
        mostrarFeedback('Recurso vinculado com sucesso à sala!');
        setVinculoSalaId(''); setVinculoRecursoId('');
        carregarDadosDoBanco();
      } else {
        mostrarFeedback('Erro ao vincular recurso', true);
      }
    } catch { mostrarFeedback('Erro de conexão', true); }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-800">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header da Página */}
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">Painel de Gerenciamento da Infraestrutura</h1>
          <p className="text-sm text-slate-500">Cadastre categorias, recursos adicionais e gerencie os espaços físicos do CIn.</p>
        </div>

        {/* Notificação Toast Flutuante */}
        {status.msg && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-sm font-semibold transition-all duration-300 ${
            status.tipo === 'erro' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {status.msg}
          </div>
        )}

        {/* Grade de Formulários */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* CARD 1: CATEGORIAS */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-red-700">1. Cadastrar Categoria de Sala</h2>
            <form onSubmit={cadastrarTipo} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ex: Laboratórios, Salas de Reunião" 
                value={novoTipo}
                onChange={(e) => setNovoTipo(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg p-2 text-sm focus:border-red-600 focus:outline-none"
              />
              <button type="submit" className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Adicionar
              </button>
            </form>
          </div>

          {/* CARD 2: RECURSOS */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-red-700">2. Cadastrar Novo Recurso</h2>
            <form onSubmit={cadastrarRecurso} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ex: Projetor 4K, Quadro Branco, Monitor HDMI" 
                value={novoRecurso}
                onChange={(e) => setNovoRecurso(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg p-2 text-sm focus:border-red-600 focus:outline-none"
              />
              <button type="submit" className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Adicionar
              </button>
            </form>
          </div>

          {/* CARD 3: SALAS */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 md:col-span-2">
            <h2 className="text-lg font-bold text-red-700">3. Cadastrar Nova Sala</h2>
            <form onSubmit={cadastrarSala} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ID DA SALA (Python)</label>
                <input 
                  type="text" 
                  placeholder="Ex: SALA_E112" 
                  value={salaId}
                  onChange={(e) => setSalaId(e.target.value.toUpperCase())}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-red-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">NOME DE EXIBIÇÃO</label>
                <input 
                  type="text" 
                  placeholder="Ex: Sala E112" 
                  value={salaNome}
                  onChange={(e) => setSalaNome(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-red-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">CAPACIDADE</label>
                <input 
                  type="number" 
                  value={salaCapacidade}
                  onChange={(e) => setSalaCapacidade(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-red-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">CATEGORIA</label>
                <select 
                  value={salaTipoId} 
                  onChange={(e) => setSalaTipoId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white focus:border-red-600 focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <button type="submit" className="bg-red-700 hover:bg-red-800 text-white p-2 rounded-lg text-sm font-medium transition-colors h-[38px]">
                Criar Sala
              </button>
            </form>
          </div>

          {/* CARD 4: VÍNCULO SALA X RECURSO */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 md:col-span-2">
            <h2 className="text-lg font-bold text-red-700">4. Atribuir Recursos às Salas</h2>
            <form onSubmit={vincularRecurso} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">SELECIONE A SALA</label>
                <select 
                  value={vinculoSalaId} 
                  onChange={(e) => setVinculoSalaId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white focus:border-red-600 focus:outline-none"
                >
                  <option value="">Escolha a sala...</option>
                  {salas.map(s => <option key={s.id} value={s.id}>{s.nome_exibicao}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">RECURSO DISPONÍVEL NELA</label>
                <select 
                  value={vinculoRecursoId} 
                  onChange={(e) => setVinculoRecursoId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white focus:border-red-600 focus:outline-none"
                >
                  <option value="">Escolha o recurso...</option>
                  {recursos.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>
              <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white p-2 rounded-lg text-sm font-medium transition-colors h-[38px]">
                Vincular Infraestrutura
              </button>
            </form>
          </div>

        </div>
      </div>
    </main>
  );
}