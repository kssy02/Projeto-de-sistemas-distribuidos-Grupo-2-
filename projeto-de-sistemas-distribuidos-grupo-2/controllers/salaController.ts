import { APIResponseCheck, ReservaPayload } from "@/models/reserva";

// Altere para a URL onde seu FastAPI está rodando (local ou produção)
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const SalaController = {
  // GET /check
  async checarDisponibilidade(data: string): Promise<APIResponseCheck> {
    const res = await fetch(`${BASE_URL}/check?data=${data}`, {
      cache: 'no-store' // Garante dados sempre frescos
    });
    if (!res.ok) throw new Error("Erro ao buscar a disponibilidade das salas.");
    return res.json();
  },

  // POST /reserve
  async fazerReserva(payload: ReservaPayload) {
    const res = await fetch(`${BASE_URL}/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Erro ao efetuar reserva.");
    }
    return res.json();
  },

  // DELETE /cancel/{id}
  async cancelarReserva(reservaId: string) {
    const res = await fetch(`${BASE_URL}/cancel/${reservaId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Erro ao cancelar reserva.");
    }
    return res.json();
  }
};