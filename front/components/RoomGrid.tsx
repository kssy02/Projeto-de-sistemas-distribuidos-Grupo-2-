import React from 'react';
import RoomCard from './RoomCard';

// Ajustando a interface para refletir o formato real de array de salas que vem do Express
interface SalaData {
  sala_id: string;
  nome: string;
  horarios: { [horario: string]: string | null };
}

interface RoomGridProps {
  // Mudamos aqui para aceitar o array direto do banco ou o objeto anterior envelopado
  salasStatus: any; 
  handleReservar: (sala: string, horario: string) => void;
  idUsuario?: string; // 🎯 Mantido e agora utilizado
}

const RoomGrid: React.FC<RoomGridProps> = ({ salasStatus, handleReservar, idUsuario }) => {
  if (!salasStatus) {
    return (
      <div className="text-center text-slate-400 py-12 animate-pulse text-sm">
        Escaneando disponibilidade dos servidores...
      </div>
    );
  }

  // Se o backend enviar como objeto `{ data, salas: [...] }`, extraímos o array.
  // Se enviar o array direto, usamos ele.
  const listaSalas: SalaData[] = Array.isArray(salasStatus) 
    ? salasStatus 
    : (salasStatus.salas || []);

  if (listaSalas.length === 0) {
    return (
      <div className="text-center text-slate-400 py-12 text-sm">
        Nenhuma sala cadastrada no banco de dados. Acesse o painel de administração.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {listaSalas.map((salaItem) => (
        <RoomCard
          key={salaItem.sala_id}
          salaName={salaItem.nome} // Passa o nome bonito (ex: "Sala E112")
          salaId={salaItem.sala_id} // Passa o ID real para a reserva ("SALA_E112")
          horariosStatus={salaItem.horarios} // Passa o objeto {"07:00": null, "08:00": "uuid"...}
          handleReservar={handleReservar}
          idUsuario={idUsuario} // 🚀 Repassando o ID logado para dentro do card tratar a lógica de cores/botões
        />
      ))}
    </div>
  );
};

export default RoomGrid;