from asyncio import Lock
from typing import Dict, Optional
from datetime import datetime
import uuid

# ============ ESTRUTURA DE DADOS ============

estado_salas: Dict[str, Dict[str, Dict[str, Optional[str]]]] = {
    'SALA_A': {},
    'SALA_B': {},
    'SALA_C': {}
}

reservas: Dict[str, dict] = {}

locks_por_sala: Dict[str, Lock] = {
    'SALA_A': Lock(),
    'SALA_B': Lock(),
    'SALA_C': Lock()
}

# ============ FUNÇÕES ============

def inicializar_data(data: str):
    for sala in estado_salas:
        if data not in estado_salas[sala]:
            estado_salas[sala][data] = {}
            for hora in range(7, 22):
                horario = f"{hora:02d}:00"
                estado_salas[sala][data][horario] = None

def check_disponibilidade(data: str) -> dict:
    inicializar_data(data)
    resultado = {}
    for sala in estado_salas:
        resultado[sala] = {}
        for horario, reserva_id in estado_salas[sala][data].items():
            resultado[sala][horario] = 'OCUPADO' if reserva_id else 'LIVRE'
    return resultado

def reservar_sala(sala: str, data: str, horario: str, usuario: str) -> str:
    inicializar_data(data)
    
    if estado_salas[sala][data][horario] is not None:
        raise ValueError(f"Sala {sala} ocupada em {data} às {horario}")
    
    reserva_id = str(uuid.uuid4())
    estado_salas[sala][data][horario] = reserva_id
    reservas[reserva_id] = {
        'sala': sala,
        'data': data,
        'horario': horario,
        'usuario': usuario,
        'criado_em': datetime.now().isoformat()
    }
    return reserva_id

def cancelar_reserva(reserva_id: str):
    if reserva_id not in reservas:
        raise ValueError("Reserva não encontrada")
    
    reserva = reservas[reserva_id]
    sala = reserva['sala']
    data = reserva['data']
    horario = reserva['horario']
    
    if estado_salas[sala][data][horario] == reserva_id:
        estado_salas[sala][data][horario] = None
    
    del reservas[reserva_id]

def obter_reserva(reserva_id: str) -> dict:
    if reserva_id not in reservas:
        raise ValueError("Reserva não encontrada")
    return reservas[reserva_id]

def limpar_estado():
    global estado_salas, reservas
    estado_salas = {
        'SALA_A': {},
        'SALA_B': {},
        'SALA_C': {}
    }
    reservas = {}
