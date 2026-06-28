from asyncio import Lock
from typing import Dict, Optional
from datetime import datetime
import uuid
import json
import os

# ============ VARIÁVEIS GLOBAIS ============

arquivo_reservas = "banco_reservas.json"

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

def salvar_em_disco():
    """Grava o estado atual da memória RAM no arquivo JSON local."""
    dados = {
        "estado_salas": estado_salas,
        "reservas": reservas
    }
    with open(arquivo_reservas, "w", encoding="utf-8") as f:
        json.dump(dados, f, indent=4, ensure_ascii=False)

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
    
    salvar_em_disco()
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
    salvar_em_disco()

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
    salvar_em_disco()

if os.path.exists(arquivo_reservas):
    try:
        with open(arquivo_reservas, "r", encoding="utf-8") as f:
            dados_carregados = json.load(f)
            estado_salas.update(dados_carregados.get("estado_salas", {}))
            reservas.update(dados_carregados.get("reservas", {}))
        print("💾 Dados de reservas carregados com sucesso do disco!")
    except Exception as e:
        print(f"⚠️ Erro ao carregar banco de dados local: {e}")