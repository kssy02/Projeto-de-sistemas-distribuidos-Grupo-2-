export interface SlotDisponibilidade {
  [horario: string]: 'LIVRE' | 'OCUPADO';
}

export interface StatusSalas {
  [sala: string]: SlotDisponibilidade;
}

export interface APIResponseCheck {
  data: string;
  salas: StatusSalas;
}

export interface ReservaPayload {
  sala: string;
  data: string;
  horario: string;
  usuario: string;
}

export interface MinhaReserva {
  id: string;
  sala_id: string;
  data_reserva: string;
  hora_reserva: string;
  cliente: string;
}

export interface MinhaReservaComNome extends MinhaReserva {
  nome_sala: string;
}