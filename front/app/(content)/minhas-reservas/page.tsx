'use client';

import { useState, useEffect, useCallback } from 'react';
import { SalaController } from '@/controllers/salaController';
import ReservasHeader from '@/components/ReservasHeader';
import Alerts from '@/components/Alerts';
import Link from 'next/link';

interface MinhaReserva {
  id: string;
  sala_id: string;
  data_reserva: string;
  hora_reserva: string;
  cliente: string;
}

export default function MinhasReservasPage() {
  const [dataSelecionada, setDataSelecionada] = useState<string>("2026-07-20");
  const [minhasReservas, setMinhasReservas] = useState<MinhaReserva[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState('');
  const [usuario, setUsuario] = useState("Estudante CIn");
  const [usuarioId, setUsuarioId] = useState("estudante_cin_id");
  const [avatar, setAvatar] = useState("");
  const [carregando, setCarregando] = useState(false);

  // 1. Carrega os dados da sessão do usuário logado
  useEffect(() => {
    const nomeSalvo = localStorage.getItem('user_name');
    const fotoSalva = localStorage.getItem('user_picture');
    const idSalvo = localStorage.getItem('user_id');

    if (nomeSalvo) setUsuario(nomeSalvo);
    if (fotoSalva) setAvatar(fotoSalva);
    if (idSalvo) setUsuarioId(idSalvo);
  }, []);

  // 2. Busca e filtra as reservas do usuário para a data selecionada
  const carregarMinhasReservas = useCallback(async (data: string, currentUserId: string) => {
    setCarregando(true);
    try {
      const timestamp = new Date().getTime();
      const resCheck = await fetch(`/api-proxy/check?data=${data}&_t=${timestamp}`, { 
        cache: 'no-store' 
      });

      if (!resCheck.ok) throw new Error("Não foi possível carregar o histórico de ocupações.");

      const todasAsReservas = await resCheck.json();

      // Filtra o Array plano vindo do Express trazendo apenas o que pertence ao usuário ativo
      const filtradas = Array.isArray(todasAsReservas) 
        ? todasAsReservas.filter((res: any) => String(res.cliente) === String(currentUserId))
        : [];

      setMinhasReservas(filtradas);
      setErro(null);
    } catch (err: any) {
      console.error(err);
      setErro(err.message || "Erro de conexão ao buscar suas reservas.");
    } finally {
      setCarregando(false);
    }
  }, []);

  // Polling ativo a cada 4 segundos para atualizar o painel pessoal
  useEffect(() => {
    if (usuarioId) {
      carregarMinhasReservas(dataSelecionada, usuarioId);
      const interval = setInterval(() => carregarMinhasReservas(dataSelecionada, usuarioId), 4000);
      return () => clearInterval(interval);
    }
  }, [dataSelecionada, usuarioId, carregarMinhasReservas]);

  // 3. Executa o cancelamento individual disparando o DELETE nativo
  const handleCancelarReserva = async (reservaId: string) => {
    if (!confirm("Tem certeza que deseja remover este agendamento?")) return;

    try {
      setErro(null);
      setSucesso('');

      await SalaController.cancelarReserva(reservaId);

      setSucesso("Agendamento cancelado e horário liberado com sucesso!");
      
      // Atualiza o estado da tela imediatamente
      await carregarMinhasReservas(dataSelecionada, usuarioId);
    } catch (err: any) {
      setErro(err.message || "Falha ao processar o cancelamento.");
    }
  };

  return (
    <main className="min-h-screen p-8 bg-slate-50 text-slate-900">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Reutilizado do Painel */}
        <ReservasHeader usuario={usuario} avatar={avatar} />

        {/* Barra de Navegação e Filtros */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/reservas" 
              className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors border border-slate-200"
            >
              ← Voltar ao Painel Geral
            </Link>
            <h2 className="text-base font-bold text-slate-800">Minhas Alocações</h2>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Data:</label>
            <input 
              type="date" 
              value={dataSelecionada} 
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="border border-slate-300 rounded-lg p-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 w-full sm:w-auto"
            />
          </div>
        </div>

        {/* Mensagens de Feedback */}
        <Alerts erro={erro} sucesso={sucesso} />

        {/* Lista de Reservas Ativas do Usuário */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-100 border-b border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Listagem de Agendamentos para o dia selecionado
            </p>
          </div>

          {carregando && minhasReservas.length === 0 ? (
            <div className="text-center text-slate-400 py-12 text-sm animate-pulse">
              Buscando suas reservas nos servidores...
            </div>
          ) : minhasReservas.length === 0 ? (
            <div className="text-center text-slate-400 py-12 text-sm space-y-2">
              <p>Você não possui nenhuma reserva nesta data.</p>
              <Link href="/reservas" className="text-xs text-red-700 font-semibold hover:underline">
                Clique aqui para reservar uma sala agora
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {minhasReservas.map((reserva) => (
                <div key={reserva.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-red-50 text-red-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-red-100">
                        Sala ID: {reserva.sala_id}
                      </span>
                      <span className="text-slate-800 font-bold text-sm">
                        ⏱️ {reserva.hora_reserva.substring(0, 5)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      ID de gerenciamento externo: <code className="bg-slate-100 px-1 rounded text-slate-600 text-[11px]">{reserva.id}</code>
                    </p>
                  </div>

                  <button
                    onClick={() => handleCancelarReserva(reserva.id)}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs px-4 py-2 rounded-lg transition-colors shadow-sm active:scale-95"
                  >
                    Remover Agendamento
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </main>
  );
}