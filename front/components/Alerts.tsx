import React from 'react';

interface AlertsProps {
  erro: string | null;
  sucesso: string;
}

const Alerts: React.FC<AlertsProps> = ({ erro, sucesso }) => {
  return (
    <>
      {erro && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl shadow-sm font-medium">{erro}</div>}
      {sucesso && <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl shadow-sm font-medium">{sucesso}</div>}
    </>
  );
};

export default Alerts;