'use client';

import { useState, useEffect, useCallback } from 'react';
import { SalaController } from '@/controllers/salaController';  
import { StatusSalas } from '@/models/reserva';  
import ReservasHeader from '@/components/ReservasHeader';
import Alerts from '@/components/Alerts';
import ReservationControls from '@/components/ReservationControls';
import RoomGrid from '@/components/RoomGrid';

export default function ReservasPage() {
  const [dataSelecionada, setDataSelecionada] = useState<string>("2026-07-20");
  const [salasStatus, setSalasStatus] = useState<StatusSalas | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState('');
  const [usuario, setUsuario] = useState("Estudante CIn");
  const [usuarioId, setUsuarioId] = useState("estudante_cin_id"); // Força um ID padrão inicial válido para o Postgres
  const [avatar, setAvatar] = useState("");
  const [idCancelamento, setIdCancelamento] = useState<string>("");

  useEffect(() => {
    const nomeSalvo = localStorage.getItem('user_name');
    const fotoSalva = localStorage.getItem('user_picture');
    const idSalvo = localStorage.getItem('user_id'); // Tenta recuperar o ID real do login se houver
    
    if (nomeSalvo) setUsuario(nomeSalvo);
    if (fotoSalva) setAvatar(fotoSalva);
    if (idSalvo) setUsuarioId(idSalvo);
  }, []);

  const carregarDados = useCallback(async (data: string) => {
    try {
      const dados = await SalaController.checarDisponibilidade(data);
      // Garante que salve exatamente a lista ou objeto mapeado vindo do controller
      setSalasStatus(dados as unknown as StatusSalas);
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
    // LOGS DE VERIFICAÇÃO NO FRONT
    console.log("=== DEBUG RESERVA (FRONT) ===");
    console.log("ID no estado 'usuarioId':", usuarioId);
    console.log("ID direto no localStorage:", localStorage.getItem('user_id'));

    if (!usuarioId.trim()) {
      setErro("Sessão inválida. Por favor, faça login novamente.");
      return;
    }
    
    try {
      setErro(null);
      setSucesso('');

      const payload = {
        sala: sala,
        data: dataSelecionada,
        hora: horario,
        usuario_id: usuarioId, 
        titulo_evento: `Reserva por ${usuario}`
      };

      console.log("Payload enviado para o SalaController:", payload);

      const res = await SalaController.fazerReserva(payload);
      
      setSucesso(`Reservado com sucesso! ID para cancelamento: ${res.reserva_id || res.id}`);
      if (res.reserva_id || res.id) {
        setIdCancelamento(res.reserva_id || res.id);
      }
      carregarDados(dataSelecionada);
    } catch (err: any) {
      setErro(err.message || "Erro ao processar reserva.");
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
        <ReservasHeader usuario={usuario} avatar={avatar} />

        {/* Alertas de Erro/Sucesso */}
        <Alerts erro={erro} sucesso={sucesso} />

        {/* Controles Principais */}
        <ReservationControls
          dataSelecionada={dataSelecionada}
          setDataSelecionada={setDataSelecionada}
          idCancelamento={idCancelamento}
          setIdCancelamento={setIdCancelamento}
          handleCancelar={handleCancelar}
        />

        {/* Grade Horária Interativa das Salas */}
        <RoomGrid 
          salasStatus={salasStatus} 
          handleReservar={handleReservar} 
          idUsuario={usuarioId} 
        />
      </div>
    </main>
  );
}