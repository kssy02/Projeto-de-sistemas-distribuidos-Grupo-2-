import { APIResponseCheck } from "@/models/reserva";

// Usando o prefixo do proxy configurado no next.config.ts.
// O próprio Next.js intercepta e joga para o Express local (porta 5000).
const BASE_URL = "/api-proxy";

export const SalaController = {
  // GET /check
  async checarDisponibilidade(data: string): Promise<APIResponseCheck> {
    const res = await fetch(`${BASE_URL}/check?data=${data}`, {
      cache: 'no-store' // Garante dados sempre vindo direto do banco
    });
    if (!res.ok) throw new Error("Erro ao buscar a disponibilidade das salas.");
    return res.json();
  },

  // POST /reserve (Ajustado para garantir a nomenclatura do Express)
  async fazerReserva(payload: any) {
    const res = await fetch(`${BASE_URL}/reserve`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      // Força o mapeamento exato dos campos que o Express desestrutura no req.body
      body: JSON.stringify({
        sala: payload.sala,
        data: payload.data,
        hora: payload.hora || payload.horario, // Aceita 'hora' ou o fallback 'horario'
        usuario_id: payload.usuario_id || payload.usuario, // Aceita 'usuario_id' ou o fallback 'usuario'
        titulo_evento: payload.titulo_evento || 'Reserva de Sala'
      }),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.erro || errorData.detail || "Erro ao efetuar reserva.");
    }
    return res.json();
  },

  // DELETE /cancel/{id}
  async cancelarReserva(reservaId: string) {
    const res = await fetch(`${BASE_URL}/cancel/${reservaId}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.erro || errorData.detail || "Erro ao cancelar reserva.");
    }
    return res.json();
  }
};