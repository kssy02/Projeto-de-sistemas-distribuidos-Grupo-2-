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
  const [salasStatus, setSalasStatus] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState('');
  const [usuario, setUsuario] = useState("Estudante CIn");
  const [usuarioId, setUsuarioId] = useState("estudante_cin_id"); 
  const [avatar, setAvatar] = useState("");
  const [idCancelamento, setIdCancelamento] = useState<string>("");

  // Carrega dados do usuário do localStorage
  useEffect(() => {
    const nomeSalvo = localStorage.getItem('user_name');
    const fotoSalva = localStorage.getItem('user_picture');
    const idSalvo = localStorage.getItem('user_id'); 
    
    if (nomeSalvo) setUsuario(nomeSalvo);
    if (fotoSalva) setAvatar(fotoSalva);
    if (idSalvo) setUsuarioId(idSalvo);
  }, []);

  // 🔄 Função adaptativa corrigida para ler o Array de registros retornado pelo Express
  const carregarDados = useCallback(async (data: string) => {
    try {
      const timestamp = new Date().getTime();

      // Busca diretamente via proxy quebrando qualquer cache do Next.js/Browser
      const [resSalas, resCheck] = await Promise.all([
        fetch(`/api-proxy/salas?_t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api-proxy/check?data=${data}&_t=${timestamp}`, { cache: 'no-store' })
      ]);

      if (!resSalas.ok) throw new Error("Erro ao buscar salas do servidor.");
      
      const salasCadastradas = await resSalas.json();
      // Garante que se o /check falhar ou vier nulo, assumirá um array vazio []
      const ocupacaoDia = resCheck.ok ? await resCheck.json() : [];

      // Normaliza a lista de salas vindas do Express
      const listaSalasCruas = Array.isArray(salasCadastradas) ? salasCadastradas : (salasCadastradas.salas || []);
      
      // Lista de horários operacionais exibidos nos botões
      const horariosPadrao = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00","15:00", "16:00","17:00", "18:00"];

      // Monta o Array estruturado SalaData[] exatamente como o RoomGrid e RoomCard precisam
      const listaMapeada = listaSalasCruas.map((sala: any) => {
        // O backend Express usa 'id' para a tabela de salas
        const idSala = String(sala.id || sala.sala_id);
        const horariosSala: { [horario: string]: string | null } = {};

        horariosPadrao.forEach(hora => {
          // Procura no array de reservas do banco se existe um registro para ESTA sala e ESTE horário
          const reservaEncontrada = Array.isArray(ocupacaoDia) ? ocupacaoDia.find((reserva: any) => {
            const mSala = String(reserva.sala_id) === idSala;
            // Corta os segundos do banco ("08:00:00" -> "08:00") para comparar estritamente com o Front
            const mHora = reserva.hora_reserva ? reserva.hora_reserva.substring(0, 5) : "";
            return mSala && mHora === hora;
          }) : null;

          // Se achou uma linha no banco, associa ao ID do cliente (dono do agendamento)
          // Caso contrário, define como null (Livre / Cor Verde)
          horariosSala[hora] = reservaEncontrada ? String(reservaEncontrada.cliente) : null;
        });

        return {
          sala_id: idSala,
          nome: sala.nome_exibicao || sala.nome || `Sala ${idSala}`,
          horarios: horariosSala
        };
      });

      // Atualiza o estado do React disparando a renderização na tela imediatamente
      setSalasStatus(listaMapeada);
      setErro(null);

    } catch (err: any) {
      console.error("Erro no polling de atualização:", err);
      setErro(err.message || "Erro de conexão com o servidor.");
    }
  }, []);
  // Polling ativo a cada 3 segundos
  useEffect(() => {
    carregarDados(dataSelecionada);
    const interval = setInterval(() => carregarDados(dataSelecionada), 3000);
    return () => clearInterval(interval);
  }, [dataSelecionada, carregarDados]);

  const handleReservar = async (sala: string, horario: string) => {
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

      const res = await SalaController.fazerReserva(payload);
      
      setSucesso(`Reservado com sucesso! ID para cancelamento: ${res.reserva_id || res.id}`);
      if (res.reserva_id || res.id) {
        setIdCancelamento(res.reserva_id || res.id);
      }
      
      // Atualiza os dados imediatamente após a inserção bem-sucedida
      await carregarDados(dataSelecionada);
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
      await carregarDados(dataSelecionada);
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