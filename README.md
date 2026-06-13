# Projeto-de-sistemas-distribuidos-Grupo-2
Sistema distribuído para reserva de salas de estudo - Projeto CIN0143
Equipe 2
Alunos: Fabio Filho
        Keroly dos Santos


Descrição

Sistema cliente-servidor para gerenciamento de reservas de salas de estudo. O servidor mantém em memória o estado de todas as salas (Livre/Ocupado) e permite que múltiplos clientes consultem e reservem espaços simultaneamente, com travas (locks) para evitar conflitos de reserva.

**Arquitetura**

Tecnologias Escolhidas

| Tecnologia | Justificativa |
|---|---|
| Python 3.11+ | Linguagem principal |
| FastAPI | Assíncrono por padrão; suporte nativo a concorrência com `asyncio`; documentação automática via Swagger |
| Uvicorn | Servidor ASGI leve para rodar o FastAPI |
| asyncio.Lock | Exclusão mútua nas operações de reserva |

 Estrutura de Pastas

reservas-salas/
├── server/
│   ├── main.py          # Ponto de entrada — app FastAPI e rotas
│   ├── state.py         # Estado global em memória
│   └── schemas.py       # Validações com Pydantic
├── client/
│   └── client.py        # Cliente HTTP de exemplo
├── requirements.txt
└── README.md



Estado em Memória

Dicionário tridimensional indexado por `sala → data → horário`:

estado_salas[sala][data][horario] → None (Livre) | Reserva (Ocupado)

**Salas:** SALA_A, SALA_B, SALA_C  
**Horários:** 07h às 21h, blocos de 1 hora


 Protocolo de Comunicação (Rotas HTTP — porta 8000)

| Método | Rota | Comando equivalente | Descrição |
|---|---|---|---|
| GET | `/health` | — | Verifica se o servidor está online |
| GET | `/check?data=YYYY-MM-DD` | `CHECK\|data` | Lista estado de todas as salas na data |
| POST | `/reserve` | `RESERVE\|sala\|hora` | Cria uma reserva (com lock) |
| DELETE | `/cancel/{reserva_id}` | `CANCEL\|id` | Cancela uma reserva existente |

**Payload do POST /reserve:**
json
{ "sala": "SALA_A", "data": "2026-06-16", "horario": "09:00", "usuario": "joao.silva" }
