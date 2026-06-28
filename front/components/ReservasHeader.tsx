import React from 'react';

interface ReservasHeaderProps {
  usuario: string;
  avatar: string;
}

const ReservasHeader: React.FC<ReservasHeaderProps> = ({ usuario, avatar }) => {
  return (
    <div className="flex justify-between items-center bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-sm">
      <h1 className="text-xl font-bold text-red-700">Painel CIn Reservas</h1>
      <div className="text-sm text-slate-600 flex items-center gap-3">
        <span className="text-slate-300">|</span>
        <div className="flex items-center gap-2">
          <span className="text-slate-600"><strong className="text-slate-800">{usuario}</strong></span>
          {avatar ? (
            <img 
              src={avatar} 
              alt={`Foto de ${usuario}`} 
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs uppercase tracking-wider border border-red-200">
              {usuario.substring(0, 2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservasHeader;