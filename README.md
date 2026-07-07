# Tutorial de Execução

Este documento descreve todos os passos necessários para configurar e executar o sistema distribuído de reserva de salas de estudo desenvolvido para a disciplina de Sistemas Distribuídos (CIN0143).

---

# Arquitetura do Sistema

O projeto é composto por serviços independentes que se comunicam via HTTP utilizando o padrão REST, adotando uma estratégia de replicação e persistência síncrona híbrida.
<img width="395" height="498" alt="image" src="https://github.com/user-attachments/assets/d9490d45-4ebc-4c54-bd4d-37bb61ca3567" />

 Cada camada possui uma responsabilidade específica:

- **Frontend (Next.js):** Interface utilizada pelos estudantes para consultar, reservar e cancelar horários.
- **Express API Server:** Centraliza as regras de negócio, gerencia o roteamento de requisições e coordena as transações simultâneas.
- **SQLite Local:** Banco de dados relacional em arquivo usado para validação rápida de conflitos, cache local e tolerância a falhas.
- **Neon PostgreSQL:** Infraestrutura de banco de dados na nuvem que mantém o estado oficial e global de persistência do sistema.

---

# Pré-requisitos

Antes de executar o projeto, certifique-se de possuir instalado:

- **Node.js 20 ou superior**
- **npm**

Os bancos de dados relacionais já estão configurados para inicialização automática (SQLite interno e string de conexão com o Neon PostgreSQL injetada).

---

# Estrutura do Projeto

<img width="512" height="175" alt="image" src="https://github.com/user-attachments/assets/9b84d454-5357-422e-aeb1-a981956804f0" />



---

# Instalação

Clone o repositório.

```bash
npm install
npm run dev

http://localhost:3000/reservas





Fluxo de Funcionamento
Cliente (Front)
   │
   │ POST /api-proxy/reserve
   ▼
Express API
   │
   ├── Abre transação síncrona distribuída
   ├── Tenta persistir no SQLite Local (Validação Edge)
   ├── Tenta persistir no Neon PostgreSQL (Nuvem Global)
   │
   ├─► [Sucesso em ambos] ──► Confirma operação (Commit)
   └─► [Falha em algum]  ──► Desfaz operação (Rollback)
   │
   ▼
Bancos de Dados
   │
   └── Registro replicado e gravado com consistência forte
   ▲
Express API
   ▲
Cliente (Front)



Rotas Disponíveis (Express API)
Listar Salas
GET /salas
Retorna o array completo de salas cadastradas diretamente do banco de dados.

Consultar Disponibilidade
GET /check?data=YYYY-MM-DD

Efetuar Nova Reserva
POST /reserve
Payload estruturado enviado pelo SalaController:

JSON
{
    "sala": "1",
    "data": "2026-07-20",
    "hora": "14:00",
    "cliente": "Reserva por Keroly dos Santos Silva"
}
Cancelar Reserva
DELETE /cancel/{reserva_id}
