import React from 'react';

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
  idCancelamento,
  setIdCancelamento,
  handleCancelar,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div>
        <label className="block font-semibold text-xs text-slate-500 uppercase tracking-wider mb-2">Selecione a Data:</label>
        <input 
          type="date" 
          value={dataSelecionada} 
          onChange={(e) => setDataSelecionada(e.target.value)}
          className="w-full border border-slate-300 rounded-lg p-2.5 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
        />
      </div>
      <div>
        <label className="block font-semibold text-xs text-slate-500 uppercase tracking-wider mb-2">Gerenciar / Cancelar por ID:</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Cole o ID gerado pelo sistema" 
            value={idCancelamento}
            onChange={(e) => setIdCancelamento(e.target.value)}
            className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
          />
          <button onClick={handleCancelar} className="bg-red-700 hover:bg-red-800 text-white font-medium px-5 rounded-lg transition-colors shadow-sm">
            Remover
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReservationControls;