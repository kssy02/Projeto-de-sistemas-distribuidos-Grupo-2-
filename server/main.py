from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
import asyncpg
import json
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv
from schemas import ReservaRequest
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
ARQUIVO_JSON = "historico_neon.json"

async def get_db():
    return await asyncpg.connect(DATABASE_URL)

async def salvar_json():
    """
    Mantida para compatibilidade interna do FastAPI se necessário.
    """
    try:
        conn = await get_db()
        query_select = """
            SELECT r.id, r.data_reserva, r.hora_reserva, r.titulo_evento, s.nome_exibicao, u.nome, u.email
            FROM reservas r
            JOIN salas s ON r.sala_id = s.id
            JOIN usuarios u ON r.usuario_id = u.id
            ORDER BY r.criado_em DESC;
        """
        await conn.fetch(query_select)
        await conn.close()
    except Exception as e:
        print(f" Erro ao processar dados: {e}")

def registrar_evento_no_json(tipo_evento: str, dados_reserva: dict):
    """
    Adiciona uma nova linha de evento no topo ou fim do histórico JSON,
    preservando tudo o que já aconteceu antes (Real-time Logs).
    """
    try:
        historico = []
        if os.path.exists(ARQUIVO_JSON):
            with open(ARQUIVO_JSON, 'r', encoding='utf-8') as f:
                try:
                    historico = json.load(f)
                    if not isinstance(historico, list):
                        historico = []
                except json.JSONDecodeError:
                    historico = []

        # Monta a estrutura do evento que acabou de acontecer
        novo_evento = {
            "evento_id": str(uuid.uuid4()),
            "tipo_acao": tipo_evento, # "RESERVA" ou "CANCELAMENTO"
            "data_registro": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "dados": dados_reserva
        }

        # Adiciona o evento ao histórico (os mais recentes ficam no final)
        historico.append(novo_evento)

        with open(ARQUIVO_JSON, 'w', encoding='utf-8') as f:
            json.dump(historico, f, indent=4, ensure_ascii=False, default=str)
            
        print(f" [LOG] Evento de {tipo_evento} registrado com sucesso no {ARQUIVO_JSON}!")
    except Exception as e:
        print(f" Erro ao registrar evento no JSON: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 50)
    print(" SERVIDOR DE RESERVAS DE SALAS (COM HISTÓRICO VIVO)")
    print("=" * 50)
    try:
        conn = await get_db()
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS reservas (
                id TEXT PRIMARY KEY,
                sala_id TEXT NOT NULL,
                usuario_id TEXT NOT NULL,
                data_reserva TEXT NOT NULL,
                hora_reserva TEXT NOT NULL,
                titulo_evento TEXT DEFAULT 'Reserva de Sala',
                criado_em TIMESTAMP DEFAULT NOW()
            )
        ''')
        await conn.close()
        print(" Tabela 'reservas' pronta no Neon")
    except Exception as e:
        print(f" Erro ao criar tabela: {e}")
    print("=" * 50)
    yield
    print(" Servidor encerrado")

app = FastAPI(
    title="Sistema de Reservas de Salas de Estudo",
    description="API para gerenciamento de reservas de salas de estudo",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"mensagem": "Sistema de Reservas de Salas", "documentacao": "/docs"}

@app.get("/check")
async def check(data: str):
    try:
        conn = await get_db()
        rows = await conn.fetch('SELECT sala_id, hora_reserva FROM reservas WHERE data_reserva = $1', data)
        await conn.close()
        salas = ['SALA_A', 'SALA_B', 'SALA_C']
        ocupadas = [f"{row['sala_id']}_{row['hora_reserva']}" for row in rows]
        resultado = {}
        for sala in salas:
            resultado[sala] = {}
            for hora in range(7, 22):
                horario = f"{hora:02d}:00"
                key = f"{sala}_{horario}"
                resultado[sala][horario] = 'OCUPADO' if key in ocupadas else 'LIVRE'
        return {"data": data, "salas": resultado}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/reserve")
async def reserve(request: ReservaRequest):
    try:
        conn = await get_db()
        existing = await conn.fetch(
            'SELECT id FROM reservas WHERE sala_id = $1 AND data_reserva = $2 AND hora_reserva = $3',
            request.sala, request.data, request.horario
        )
        if existing:
            await conn.close()
            raise HTTPException(status_code=409, detail="Sala ocupada")
        
        reserva_id = str(uuid.uuid4())
        await conn.execute(
            'INSERT INTO reservas (id, sala_id, usuario_id, data_reserva, hora_reserva) VALUES ($1, $2, $3, $4, $5)',
            reserva_id, request.sala, request.data, request.horario, request.usuario
        )
        await conn.close()
        
        # Registra localmente se a requisição veio direto por aqui
        registrar_evento_no_json("RESERVA", {"reserva_id": reserva_id, "sala_id": request.sala, "usuario_id": request.usuario, "data": request.data, "horario": request.horario})
        
        return {"mensagem": "Reserva criada", "reserva_id": reserva_id}
    except HTTPException as e: raise e
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

# =========================================================================
# GATILHO EM TEMPO REAL: REGISTRA RESERVAS E CANCELAMENTOS VINDO DO EXPRESS
# =========================================================================
@app.post("/api/notificar-mutacao", tags=["Sincronização"])
async def notificar_mutacao(payload: dict):
    try:
        tipo = payload.get("tipo", "ACAO_DESCONHECIDA")
        dados = payload.get("dados", {})
        
        print("\n" + "=" * 50)
        print(f" [SINAL REAL-TIME] O Express notificou uma ação de: {tipo}")
        
        # Salva o evento sem apagar o histórico anterior
        registrar_evento_no_json(tipo, dados)
        
        print("=" * 50 + "\n")
        return {"status": "sincronizado", "mensagem": "Evento adicionado ao histórico com sucesso."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ver-json", tags=["Administração"])
async def ver_banco_json():
    if not os.path.exists(ARQUIVO_JSON):
        return {"status": "vazio", "dados": []}
    with open(ARQUIVO_JSON, 'r', encoding='utf-8') as f:
        return {"status": "online", "dados": json.load(f)}