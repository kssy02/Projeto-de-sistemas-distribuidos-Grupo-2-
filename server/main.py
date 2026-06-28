from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
import asyncpg
import json
import os
import uuid
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
    Esta função faz o SELECT + JOIN completo para garantir que o 
    'historico_neon.json' tenha sempre os dados ricos (com nomes de salas e utilizadores)
    assim que o servidor sofrer alterações.
    """
    try:
        conn = await get_db()
        query_select = """
            SELECT 
                r.id AS reserva_id,
                r.data_reserva,
                r.hora_reserva,
                r.titulo_evento,
                s.id AS sala_id,
                s.nome_exibicao AS sala_nome,
                u.id AS usuario_id,
                u.nome AS usuario_nome,
                u.email AS usuario_email
            FROM reservas r
            JOIN salas s ON r.sala_id = s.id
            JOIN usuarios u ON r.usuario_id = u.id
            ORDER BY r.criado_em DESC;
        """
        rows = await conn.fetch(query_select)
        await conn.close()
        
        lista_reservas = []
        for row in rows:
            lista_reservas.append({
                "reserva_id": row["reserva_id"],
                "data": row["data_reserva"],
                "horario": row["hora_reserva"],
                "titulo": row["titulo_evento"],
                "sala": {
                    "id": row["sala_id"],
                    "nome": row["sala_nome"]
                },
                "usuario": {
                    "id": row["usuario_id"],
                    "nome": row["usuario_nome"] if row["usuario_nome"] else "Sem Nome",
                    "email": row["usuario_email"]
                }
            })

        with open(ARQUIVO_JSON, 'w', encoding='utf-8') as f:
            json.dump(lista_reservas, f, indent=4, ensure_ascii=False, default=str)
        print(f" [OK] {ARQUIVO_JSON} atualizado com {len(lista_reservas)} reservas integradas.")
    except Exception as e:
        print(f" Erro ao salvar JSON: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 50)
    print(" SERVIDOR DE RESERVAS DE SALAS")
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
        await salvar_json()
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
    return {
        "mensagem": "Sistema de Reservas de Salas",
        "documentacao": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health():
    return {"status": "online", "servico": "reservas-salas"}

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
        await salvar_json()
        
        return {
            "mensagem": "Reserva criada com sucesso",
            "reserva_id": reserva_id,
            "sala": request.sala,
            "data": request.data,
            "horario": request.horario
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reservas")
async def listar_reservas():
    try:
        conn = await get_db()
        rows = await conn.fetch('SELECT * FROM reservas ORDER BY criado_em DESC')
        await conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/cancel/{reserva_id}")
async def cancel(reserva_id: str):
    try:
        conn = await get_db()
        
        existing = await conn.fetch('SELECT id FROM reservas WHERE id = $1', reserva_id)
        if not existing:
            await conn.close()
            raise HTTPException(status_code=404, detail="Reserva não encontrada")
        
        await conn.execute('DELETE FROM reservas WHERE id = $1', reserva_id)
        await conn.close()
        await salvar_json()
        
        return {"mensagem": f"Reserva {reserva_id} cancelada com sucesso"}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/limpar")
async def limpar():
    try:
        conn = await get_db()
        await conn.execute('DELETE FROM reservas')
        await conn.close()
        await salvar_json()
        return {"mensagem": "Todas as reservas removidas"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =========================================================================
# GATILHO DE ATUALIZAÇÃO EM TEMPO REAL (Chamado pelo Express)
# =========================================================================
@app.post("/api/notificar-mutacao", tags=["Sincronização"])
async def notificar_mutacao():
    try:
        await salvar_json()
        return {"status": "sincronizado", "mensagem": "Arquivo historico_neon.json atualizado em tempo real."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ROTA DE ADMINISTRAÇÃO: LEITURA VIVA DO FICHEIRO HISTORICO_NEON.JSON
@app.get("/ver-json", tags=["Administração"])
async def ver_banco_json():
    if not os.path.exists(ARQUIVO_JSON):
        raise HTTPException(
            status_code=404, 
            detail=f"O arquivo {ARQUIVO_JSON} ainda não foi gerado pelo Python."
        )
    
    try:
        with open(ARQUIVO_JSON, 'r', encoding='utf-8') as f:
            dados = json.load(f)
        
        return {
            "status": "online",
            "arquivo_lido": ARQUIVO_JSON,
            "total_registros": len(dados),
            "dados": dados
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao ler o arquivo JSON: {str(e)}")