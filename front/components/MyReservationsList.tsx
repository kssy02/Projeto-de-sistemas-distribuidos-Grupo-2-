'use client';

import React from 'react';
import Link from 'next/link';
import MyReservationCard from './MyReservationCard';
import { MinhaReservaComNome } from '@/models/reserva';

interface MyReservationsListProps {
  reservas: MinhaReservaComNome[];
  carregando: boolean;
  onCancelar: (reservaId: string) => void;
}

const MyReservationsList: React.FC<MyReservationsListProps> = ({ reservas, carregando, onCancelar }) => {
  if (carregando && reservas.length === 0) {
    return (
      <div className="text-center text-slate-400 py-12 text-sm animate-pulse">
        Buscando suas reservas nos servidores...
      </div>
    );
  }

  if (reservas.length === 0) {
    return (
      <div className="text-center text-slate-400 py-12 text-sm space-y-2 bg-white rounded-xl border border-slate-200 shadow-sm">
        <p>Você não possui nenhuma reserva para esta data.</p>
        <Link href="/reservas" className="text-xs text-red-700 font-semibold hover:underline">
          Clique aqui para reservar uma sala agora
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reservas.map((reserva) => (
        <MyReservationCard key={reserva.id} reserva={reserva} onCancelar={onCancelar} />
      ))}
    </div>
  );
};

export default MyReservationsList;