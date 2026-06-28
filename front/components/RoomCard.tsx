'use client';

import React from 'react';

interface RoomCardProps {
  salaName: string;
  salaId: string;
  horariosStatus: { [horario: string]: string | null };
  handleReservar: (sala: string, horario: string) => void;
  idUsuario?: string; //  Recebendo o ID do usuário logado vindo do RoomGrid
}

const RoomCard: React.FC<RoomCardProps> = ({
  salaName,
  salaId,
  horariosStatus,
  handleReservar,
  idUsuario,
}) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      {/* Cabeçalho do Card da Sala */}
      <div className="border-b border-slate-100 pb-2">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Sala</h3>
        <p className="text-xl font-bold text-slate-800">{salaName}</p>
      </div>

      {/* Grade de Horários */}
      <div>
        <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Horários Disponíveis</p>
        <div className="grid grid-cols-3 gap-2">
          {horariosStatus && Object.entries(horariosStatus).map(([horario, donoReservaId]) => {
            const isOcupado = donoReservaId !== null;
            // 👥 Verifica se o horário foi reservado especificamente por VOCÊ
            const isMinhaReserva = isOcupado && idUsuario && String(donoReservaId) === String(idUsuario);
            
            // Define o estilo dinâmico baseado no status do slot
            let buttonStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 active:scale-95';
            let statusText = 'Livre';

            if (isOcupado) {
              if (isMinhaReserva) {
                // 🔹 Estilo amigável e destacado para reservas do próprio usuário
                buttonStyles = 'bg-blue-50 text-blue-700 border-blue-200 cursor-not-allowed opacity-90 font-bold';
                statusText = 'Sua Reserva';
              } else {
                // 🛑 Estilo para salas ocupadas por outras pessoas
                buttonStyles = 'bg-red-50 text-red-700 border-red-200 cursor-not-allowed opacity-70';
                statusText = 'Ocupado';
              }
            }

            return (
              <button
                key={horario}
                disabled={isOcupado} // Mantém desabilitado se já estiver ocupado (seja seu ou de outro)
                onClick={() => handleReservar(salaId, horario)}
                className={`p-2 rounded-lg text-xs font-semibold border transition-all ${buttonStyles}`}
              >
                {horario}
                <span className="block text-[10px] opacity-75 font-normal">
                  {statusText}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RoomCard;