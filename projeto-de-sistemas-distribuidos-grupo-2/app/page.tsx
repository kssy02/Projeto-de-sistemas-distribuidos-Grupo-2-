'use client';

import { useState, useEffect, useCallback } from 'react';
import { SalaController } from '@/controllers/salaController';
import { StatusSalas } from '@/models/reserva';

export default function Home() {
  const [dataSelecionada, setDataSelecionada] = useState<string>("2026-07-20");
  const [salasStatus, setSalasStatus] = useState<StatusSalas | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<string>("");
  
  // Cache de IDs de reserva para simular o cancelamento local
  const [idCancelamento, setIdCancelamento] = useState<string>("");

  // Carregar dados (Memorizado para evitar loops no useEffect)
  const carregarDados = useCallback(async (data: string) => {
    try {
      const dados = await SalaController.checarDisponibilidade(data);
      setSalasStatus(dados.salas);
      setErro(null);
    } catch (err: any) {
      setErro(err.message || "Erro de conexão com o servidor.");
    }
  }, []);

  // Polling em Tempo Real (Atualiza a cada 3 segundos)
  useEffect(() => {
    carregarDados(dataSelecionada);
    const interval = setInterval(() => carregarDados(dataSelecionada), 3000);
    return () => clearInterval(interval);
  }, [dataSelecionada, carregarDados]);

  // Ação de Reservar
  const handleReservar = async (sala: string, horario: string) => {
    if (!usuario.trim()) {
      setErro("Por favor, digite seu nome de usuário antes de reservar.");
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
      // Salva o id no input de cancelamento para facilitar o teste do usuário
      setIdCancelamento(res.reserva_id); 
      carregarDados(dataSelecionada);
    } catch (err: any) {
      setErro(err.message);
    }
  };

  // Ação de Cancelar
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
    <main className="min-h-screen p-8 bg-gray-50 text-gray-900">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center text-blue-600">
          Sistema de Reservas de Salas de Estudo
        </h1>

        {/* Notificações e Tratamento de Erros Visual */}
        {erro && <div className="p-4 bg-red-100 text-red-700 border border-red-300 rounded-md shadow-sm">{erro}</div>}
        {sucesso && <div className="p-4 bg-green-100 text-green-700 border border-green-300 rounded-md shadow-sm">{sucesso}</div>}

        {/* Controles Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-xl shadow">
          <div>
            <label className="block font-medium text-sm text-gray-600 mb-1">Selecione a Data:</label>
            <input 
              type="date" 
              value={dataSelecionada} 
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="w-full border rounded-md p-2"
            />
          </div>
          <div>
            <label className="block font-medium text-sm text-gray-600 mb-1">Nome do Usuário:</label>
            <input 
              type="text" 
              placeholder="Ex: Gabriel" 
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full border rounded-md p-2"
            />
          </div>
          <div>
            <label className="block font-medium text-sm text-gray-600 mb-1">Cancelar por ID:</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Cole o ID da reserva" 
                value={idCancelamento}
                onChange={(e) => setIdCancelamento(e.target.value)}
                className="w-full border rounded-md p-2 text-xs"
              />
              <button onClick={handleCancelar} className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 rounded-md transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>

        {/* Grade Horária Interativa das Salas */}
        {salasStatus ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.keys(salasStatus).map((sala) => (
              <div key={sala} className="bg-white p-4 rounded-xl shadow-md border">
                <h3 className="text-lg font-bold text-gray-700 border-b pb-2 mb-4 text-center">{sala.replace('_', ' ')}</h3>
                <div className="space-y-2">
                  {Object.entries(salasStatus[sala]).map(([horario, status]) => (
                    <button
                      key={horario}
                      onClick={() => status === 'LIVRE' && handleReservar(sala, horario)}
                      disabled={status === 'OCUPADO'}
                      className={`w-full flex justify-between items-center px-4 py-2 rounded-lg font-medium transition-transform active:scale-[0.98] ${
                        status === 'LIVRE' 
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer' 
                          : 'bg-rose-100 text-rose-700 border border-rose-300 line-through cursor-not-allowed'
                      }`}
                    >
                      <span>{horario}</span>
                      <span className="text-xs uppercase px-2 py-0.5 rounded bg-black/10">{status}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">Carregando painel de salas...</p>
        )}
      </div>
    </main>
  );
}