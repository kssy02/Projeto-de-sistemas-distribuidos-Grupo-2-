'use client';

import React from 'react';
import { useRouter } from 'next/navigation'; // Importação para navegação nativa no client

interface ReservationControlsProps {
  dataSelecionada: string;
  setDataSelecionada: (data: string) => void;
  idCancelamento: string;
  setIdCancelamento: (id: string) => void;
  handleCancelar: () => void;
}

const ReservationControls: React.FC<ReservationControlsProps> = ({
  dataSelecionada,
  setDataSelecionada,
}) => {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      {/* Bloco de Seleção de Data */}
      <div>
        <label className="block font-semibold text-xs text-slate-500 uppercase tracking-wider mb-2">
          Selecione a Data:
        </label>
        <input 
          type="date" 
          value={dataSelecionada} 
          onChange={(e) => setDataSelecionada(e.target.value)}
          className="w-full border border-slate-300 rounded-lg p-2.5 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 text-sm"
        />
      </div>

      {/* Bloco de Gerenciamento Pessoal */}
      <div>
        <label className="block font-semibold text-xs text-slate-500 uppercase tracking-wider mb-2">
          Gerenciar:
        </label>
        <button
          onClick={() => router.push('/minhas-reservas')}
          className="w-full hover:bg-slate-100 text-slate-700 font-semibold text-sm p-2.5 rounded-lg border border-slate-300 transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2"
        >Ver Minhas Reservas
        </button>
      </div>
    </div>
  );
};

export default ReservationControls;