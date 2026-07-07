'use client';

import Link from 'next/link';
import React from 'react';

interface MyReservationsControlsProps {
  dataSelecionada: string;
  setDataSelecionada: (data: string) => void;
}

const MyReservationsControls: React.FC<MyReservationsControlsProps> = ({ dataSelecionada, setDataSelecionada }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
      <div className="flex items-center gap-4">
        <Link href="/reservas" className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors border border-slate-200">
          ← Voltar ao Painel Geral
        </Link>
        <h2 className="text-base font-bold text-slate-800">Minhas Alocações</h2>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Data:</label>
        <input type="date" value={dataSelecionada} onChange={(e) => setDataSelecionada(e.target.value)} className="border border-slate-300 rounded-lg p-2 text-sm focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 w-full sm:w-auto" />
      </div>
    </div>
  );
};

export default MyReservationsControls;