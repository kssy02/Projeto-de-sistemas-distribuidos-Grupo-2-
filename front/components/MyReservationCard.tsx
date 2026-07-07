'use client';

import React from 'react';
import { MinhaReservaComNome } from '@/models/reserva';

interface MyReservationCardProps {
  reserva: MinhaReservaComNome;
  onCancelar: (reservaId: string) => void;
}

const MyReservationCard: React.FC<MyReservationCardProps> = ({ reserva, onCancelar }) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
      <div className="space-y-2">
        <div className="border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Sala</h3>
          <p className="text-xl font-bold text-slate-800">{reserva.nome_sala}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Horário Agendado</p>
          <p className="text-2xl font-bold text-blue-600">{reserva.hora_reserva.substring(0, 5)}</p>
        </div>
      </div>
      <button onClick={() => onCancelar(reserva.id)} className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors shadow-sm active:scale-95">
        Cancelar Agendamento
      </button>
    </div>
  );
};

export default MyReservationCard;