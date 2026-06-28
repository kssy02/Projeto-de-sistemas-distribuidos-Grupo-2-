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