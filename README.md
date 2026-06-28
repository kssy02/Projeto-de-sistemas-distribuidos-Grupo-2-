# Tutorial de Execução

Este documento descreve todos os passos necessários para configurar e executar o sistema distribuído de reserva de salas de estudo desenvolvido para a disciplina de Sistemas Distribuídos (CIN0143).

---

# Arquitetura do Sistema

O projeto é composto por três serviços independentes que se comunicam via HTTP utilizando o padrão REST.

```
                        Google OAuth 2.0
                               │
                               ▼
                     +-------------------+
                     |  Frontend Next.js |
                     | (Interface Web)   |
                     +-------------------+
                               │
                      HTTP/JSON (REST)
                               │
                               ▼
                   +-----------------------+
                   | FastAPI (Python)      |
                   | Lógica de Negócio     |
                   | Controle Concorrência |
                   | asyncio.Lock          |
                   +-----------------------+
                               │
                      HTTP/JSON (REST)
                               │
                               ▼
                  +--------------------------+
                  | Express + PostgreSQL     |
                  | Persistência dos Dados   |
                  +--------------------------+
```

Cada camada possui uma responsabilidade específica:

- **Frontend (Next.js):** Interface utilizada pelos estudantes para consultar e reservar salas.
- **FastAPI:** Responsável pelas regras de negócio e controle de concorrência utilizando `asyncio.Lock`.
- **Express:** Responsável exclusivamente pela comunicação com o banco PostgreSQL.
- **PostgreSQL:** Armazena permanentemente todas as reservas.

---

# Pré-requisitos

Antes de executar o projeto, certifique-se de possuir instalado:

- **Node.js 20 ou superior**
- **npm**
- **Python 3.12 ou superior**

O banco PostgreSQL utilizado pelo projeto já está configurado através das variáveis de ambiente.

---

# Estrutura do Projeto

```
reservas-salas/
│
├── front/              # Interface Next.js
├── server/             # FastAPI (lógica de negócio)
├── back/               # Express + PostgreSQL
├── package.json
├── .env
└── TUTORIAL.md
```

---

# Instalação

Clone o repositório.

```bash
git clone <url-do-repositorio>
```

Entre na pasta do projeto.

```bash
cd reservas-salas
```

Instale todas as dependências do projeto.

```bash
npm install
```

> **Observação:** Esse comando instala automaticamente todas as dependências dos workspaces do projeto (Frontend e Backend).

---

# Executando o Sistema

Após a instalação das dependências, basta executar:

```bash
npm run dev
```

Esse comando inicializa automaticamente:

- Frontend (Next.js)
- Servidor de lógica (FastAPI)
- Microsserviço de persistência (Express)

Não é necessário iniciar nenhum serviço manualmente.

---

# Serviços Disponíveis

Após a inicialização, os serviços estarão disponíveis em:

| Serviço | Endereço |
|----------|----------|
| Frontend | http://localhost:3000 |
| FastAPI | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |
| Express | http://localhost:5000 |

---

# Fluxo de Funcionamento

Quando um estudante realiza uma reserva, ocorre a seguinte sequência:

```
Cliente
   │
   │ POST /api/reserve
   ▼
FastAPI
   │
   ├── Verifica se existe um Lock
   ├── Cria o Lock (caso necessário)
   ├── Entra na região crítica
   │
   ▼
Express
   │
   ├── Consulta o PostgreSQL
   ├── Persiste a reserva
   │
   ▼
PostgreSQL
   │
   └── Reserva gravada
   ▲
Express
   ▲
FastAPI
   ▲
Cliente
```

Esse fluxo garante que duas requisições simultâneas para a mesma sala e horário não resultem em reservas duplicadas.

---

# Controle de Concorrência

O sistema utiliza uma abordagem híbrida.

## Em Memória

O FastAPI mantém um `asyncio.Lock` para cada combinação de:

- Sala
- Data
- Horário

Enquanto uma reserva está sendo processada, novas requisições para o mesmo recurso permanecem bloqueadas até o término da operação.

---

## Persistência

Após adquirir o lock, o FastAPI encaminha a operação ao microsserviço Express.

O Express realiza a persistência definitiva no PostgreSQL.

Assim:

- Os locks existem apenas durante o processamento da requisição.
- O PostgreSQL representa o estado oficial do sistema.

---

# Rotas Disponíveis

## Verificar servidor

```
GET /health
```

Retorna se o servidor FastAPI está online.

---

## Consultar disponibilidade

```
GET /api/check?data=YYYY-MM-DD
```

Exemplo:

```
GET /api/check?data=2026-07-20
```

---

## Reservar sala

```
POST /api/reserve
```

Payload:

```json
{
    "sala": "SALA_E112",
    "data": "2026-07-20",
    "hora": "09:00",
    "usuario_id": "google_oauth_id",
    "titulo_evento": "Estudo de Sistemas Distribuídos"
}
```

---

## Cancelar reserva

```
DELETE /api/cancel/{reserva_id}
```

Exemplo:

```
DELETE /api/cancel/123
```

---

# Testando o Sistema

1. Execute:

```bash
npm run dev
```

2. Abra o navegador em:

```
http://localhost:3000
```

3. Faça login utilizando sua conta Google.

4. Escolha uma data.

5. Consulte as salas disponíveis.

6. Realize uma reserva.

7. Abra outra aba do navegador e tente reservar exatamente a mesma sala e horário.

Apenas uma das reservas será concluída com sucesso, demonstrando o funcionamento da exclusão mútua implementada pelo servidor FastAPI.

---

# Solução de Problemas

## Erro de conexão com o banco

Verifique se as variáveis de ambiente estão configuradas corretamente.

---

## Porta em uso

Caso alguma porta esteja ocupada, encerre o processo correspondente ou altere a configuração das portas.

---

## Frontend não acessa o backend

Verifique se todos os serviços foram iniciados corretamente através do comando:

```bash
npm run dev
```

---

## Swagger não abre

A documentação da API deve estar disponível em:

```
http://localhost:8000/docs
```

Caso contrário, verifique se o servidor FastAPI foi iniciado corretamente.

---

# Encerrando o Sistema

Para interromper todos os serviços simultaneamente, pressione:

```
CTRL + C
```

no terminal onde foi executado:

```bash
npm run dev
```

---

# Observações

- O sistema utiliza uma arquitetura distribuída em três camadas.
- Toda a comunicação ocorre via HTTP utilizando mensagens JSON.
- O controle de concorrência é realizado pelo FastAPI através de `asyncio.Lock`.
- O Express é responsável exclusivamente pela persistência dos dados.
- O PostgreSQL mantém o estado oficial das reservas.
- Todo o ambiente pode ser iniciado utilizando apenas dois comandos:

```bash
npm install
npm run dev
```