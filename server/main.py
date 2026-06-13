
from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
import state
from schemas import ReservaRequest

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 50)
    print("🚀 SERVIDOR DE RESERVAS DE SALAS")
    print("=" * 50)
    print("📋 Salas: SALA_A, SALA_B, SALA_C")
    print("🕐 Horários: 07:00 às 21:00")
    print("🌐 Docs: http://localhost:8000/docs")
    print("=" * 50)
    yield
    print("👋 Servidor encerrado")

app = FastAPI(
    title="Sistema de Reservas de Salas de Estudo",
    description="API para gerenciamento de reservas de salas de estudo",
    version="1.0.0",
    lifespan=lifespan
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
        resultado = state.check_disponibilidade(data)
        return {"data": data, "salas": resultado}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/reserve")
async def reserve(request: ReservaRequest):
    sala = request.sala
    async with state.locks_por_sala[sala]:
        try:
            reserva_id = state.reservar_sala(
                sala=request.sala,
                data=request.data,
                horario=request.horario,
                usuario=request.usuario
            )
            return {
                "mensagem": "Reserva criada com sucesso",
                "reserva_id": reserva_id,
                "sala": request.sala,
                "data": request.data,
                "horario": request.horario
            }
        except ValueError as e:
            raise HTTPException(status_code=409, detail=str(e))

@app.delete("/cancel/{reserva_id}")
async def cancel(reserva_id: str):
    try:
        reserva = state.obter_reserva(reserva_id)
        sala = reserva['sala']
        async with state.locks_por_sala[sala]:
            state.cancelar_reserva(reserva_id)
            return {"mensagem": f"Reserva {reserva_id} cancelada com sucesso"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
