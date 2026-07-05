import { APIResponseCheck } from "@/models/reserva";

// Usando o prefixo do proxy configurado no next.config.ts.
const BASE_URL = "/api-proxy";

export const SalaController = {
  
  // 🔄 GET /check com quebra de cache e cabeçalhos estritos
  async checarDisponibilidade(data: string): Promise<any> {
    try {
      // 💡 Anti-Cache: Geramos um timestamp único para cada requisição. 
      // Isso impede que o navegador ou o Next.js devolvam dados antigos do cache.
      const timestamp = new Date().getTime();

      const [resSalas, resCheck] = await Promise.all([
        fetch(`${BASE_URL}/salas?_t=${timestamp}`, { 
          method: 'GET',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        }),
        fetch(`${BASE_URL}/check?data=${data}&_t=${timestamp}`, { 
          method: 'GET',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        })
      ]);

      if (!resSalas.ok) {
        throw new Error(`Erro ao buscar a lista de salas cadastradas. Status: ${resSalas.status}`);
      }
      
      const salasCadastradas = await resSalas.json();
      const ocupacaoDia = resCheck.ok ? await resCheck.json() : {};

      const listaSalasCruas = Array.isArray(salasCadastradas) ? salasCadastradas : (salasCadastradas.salas || []);

      if (listaSalasCruas.length === 0) {
        return [];
      }

      const horariosPadrao = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00","15:00", "16:00","17:00", "18:00"];

      const listaMapeada = listaSalasCruas.map((sala: any) => {
        const idSala = sala.id || sala.sala_id;
        const horariosSala: { [horario: string]: string | null } = {};

        horariosPadrao.forEach(hora => {
          const dadosDaSalaOcupada = ocupacaoDia[idSala] || ocupacaoDia[sala.id];
          let statusHorario = null;

          if (dadosDaSalaOcupada) {
            if (dadosDaSalaOcupada.horarios && dadosDaSalaOcupada.horarios[hora] !== undefined) {
              statusHorario = dadosDaSalaOcupada.horarios[hora];
            } else if (dadosDaSalaOcupada[hora] !== undefined) {
              statusHorario = dadosDaSalaOcupada[hora];
            }
          }

          if (!statusHorario || statusHorario === "disponivel" || statusHorario === "livre") {
            horariosSala[hora] = null;
          } else {
            horariosSala[hora] = String(statusHorario);
          }
        });

        return {
          sala_id: idSala,
          nome: sala.nome || sala.nome_exibicao || idSala,
          horarios: horariosSala
        };
      });

      return listaMapeada;

    } catch (error: any) {
      console.error("❌ Erro no checarDisponibilidade (SalaController):", error.message);
      throw error;
    }
  },

  // 📝 POST /reserve
  async fazerReserva(payload: any) {
    const res = await fetch(`${BASE_URL}/reserve`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sala: payload.sala,
        data: payload.data,
        hora: payload.hora || payload.horario, 
        usuario_id: payload.usuario_id || payload.usuario, 
        titulo_evento: payload.titulo_evento || 'Reserva de Sala'
      }),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.erro || errorData.detail || "Erro ao efetuar reserva.");
    }
    return res.json();
  },

  // 🗑️ DELETE /cancel/{id}
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