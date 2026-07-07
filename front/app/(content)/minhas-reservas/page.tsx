'use client';

import { useState, useEffect, useCallback } from 'react';
import { MinhaReserva, MinhaReservaComNome } from '@/models/reserva';
import { SalaController } from '@/controllers/salaController';
import ReservasHeader from '@/components/ReservasHeader';
import Alerts from '@/components/Alerts';
import MyReservationsControls from '@/components/MyReservationsControls';
import MyReservationsList from '@/components/MyReservationsList';

export default function MinhasReservasPage() {
  const [dataSelecionada, setDataSelecionada] = useState<string>("2026-07-20");
  const [minhasReservas, setMinhasReservas] = useState<MinhaReservaComNome[]>([]);
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
      const [resCheck, resSalas] = await Promise.all([
        fetch(`/api-proxy/check?data=${data}&_t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api-proxy/salas?_t=${timestamp}`, { cache: 'no-store' })
      ]);

      if (!resCheck.ok) throw new Error("Não foi possível carregar o histórico de ocupações.");
      if (!resSalas.ok) throw new Error("Não foi possível carregar a lista de salas.");

      const todasAsReservas = await resCheck.json();
      const todasAsSalas = await resSalas.json();

      const mapaNomesSalas = new Map(todasAsSalas.map((s: any) => [String(s.id), s.nome_exibicao]));

      // Filtra o Array plano vindo do Express trazendo apenas o que pertence ao usuário ativo
      const filtradas = Array.isArray(todasAsReservas) 
        ? todasAsReservas.filter((res: any) => String(res.cliente) === String(currentUserId))
        : [];

      // Adiciona o nome da sala a cada reserva
      const reservasComNome = filtradas.map((res: MinhaReserva) => ({
        ...res,
        nome_sala: String(mapaNomesSalas.get(String(res.sala_id)) || `Sala ${res.sala_id}`)
      }));

      setMinhasReservas(reservasComNome);
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

        {/* Controles de Navegação e Filtro de Data */}
        <MyReservationsControls 
          dataSelecionada={dataSelecionada}
          setDataSelecionada={setDataSelecionada}
        />

        {/* Mensagens de Feedback */}
        <Alerts erro={erro} sucesso={sucesso} />

        {/* Lista de Reservas Ativas do Usuário */}
        <MyReservationsList reservas={minhasReservas} carregando={carregando} onCancelar={handleCancelarReserva} />
      </div>
    </main>
  );
}