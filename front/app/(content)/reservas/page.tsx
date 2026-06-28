'use client';

import { useState, useEffect, useCallback } from 'react';
import { SalaController } from '@/controllers/salaController';
import { StatusSalas } from '@/models/reserva';

export default function ReservasPage() {
  const [dataSelecionada, setDataSelecionada] = useState<string>("2026-07-20");
  const [salasStatus, setSalasStatus] = useState<StatusSalas | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<string>("Fabinho Farias"); // Inicia preenchido pelo mock do login
  const [idCancelamento, setIdCancelamento] = useState<string>(" ");

  const carregarDados = useCallback(async (data: string) => {
    try {
      const dados = await SalaController.checarDisponibilidade(data);
      setSalasStatus(dados.salas);
      setErro(null);
    } catch (err: any) {
      setErro(err.message || "Erro de conexão com o servidor.");
    }
  }, []);

  useEffect(() => {
    carregarDados(dataSelecionada);
    const interval = setInterval(() => carregarDados(dataSelecionada), 3000);
    return () => clearInterval(interval);
  }, [dataSelecionada, carregarDados]);

  const handleReservar = async (sala: string, horario: string) => {
    if (!usuario.trim()) {
      setErro("Sessão inválida. Por favor, faça login novamente.");
      return;
    }
    try {
      const res = await SalaController.fazerReserva({
        sala,
        data: dataSelecionada,
        horario,
        usuario
      });
      setSucesso(`Reservado com sucesso! ID para cancelamento: ${res.reserva_id}`);
      setIdCancelamento(res.reserva_id); 
      carregarDados(dataSelecionada);
    } catch (err: any) {
      setErro(err.message);
    }
  };

  const handleCancelar = async () => {
    if (!idCancelamento.trim()) return;
    try {
      await SalaController.cancelarReserva(idCancelamento);
      setSucesso("Reserva cancelada com sucesso!");
      setIdCancelamento("");
      carregarDados(dataSelecionada);
    } catch (err: any) {
      setErro(err.message);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-slate-50 text-slate-900">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Topbar Informativa da Sessão */}
        <div className="flex justify-between items-center bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-sm">
          <h1 className="text-xl font-bold text-red-700">Painel CIn Reservas</h1>
          <div className="text-sm text-slate-600 flex items-center gap-2">
            Status: <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> 
            Conectado como <strong className="text-slate-800">{usuario}</strong>
          </div>
        </div>

        {erro && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl shadow-sm font-medium">{erro}</div>}
        {sucesso && <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl shadow-sm font-medium">{sucesso}</div>}

        {/* Controles Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <label className="block font-semibold text-xs text-slate-500 uppercase tracking-wider mb-2">Selecione a Data:</label>
            <input 
              type="date" 
              value={dataSelecionada} 
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-xs text-slate-500 uppercase tracking-wider mb-2">Gerenciar / Cancelar por ID:</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Cole o ID gerado pelo sistema" 
                value={idCancelamento}
                onChange={(e) => setIdCancelamento(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
              <button onClick={handleCancelar} className="bg-red-700 hover:bg-red-800 text-white font-medium px-5 rounded-lg transition-colors shadow-sm">
                Remover
              </button>
            </div>
          </div>
        </div>

        {/* Grade Horária Interativa das Salas */}
        {salasStatus ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.keys(salasStatus).map((sala) => (
              <div key={sala} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 text-center uppercase tracking-wide">
                  {sala.replace('_', ' ')}
                </h3>
                <div className="space-y-2.5">
                  {Object.entries(salasStatus[sala]).map(([horario, status]) => (
                    <button
                      key={horario}
                      onClick={() => status === 'LIVRE' && handleReservar(sala, horario)}
                      disabled={status === 'OCUPADO'}
                      className={`w-full flex justify-between items-center px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${
                        status === 'LIVRE' 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer' 
                          : 'bg-slate-100 text-slate-400 border border-slate-200 line-through cursor-not-allowed'
                      }`}
                    >
                      <span>{horario}</span>
                      <span className={`text-2xs uppercase px-2 py-0.5 rounded-md ${status === 'LIVRE' ? 'bg-emerald-700/40 text-emerald-100' : 'bg-slate-200 text-slate-500'}`}>{status}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-400 py-12 animate-pulse text-sm">Escaneando disponibilidade dos servidores...</div>
        )}
      </div>
    </main>
  );
}