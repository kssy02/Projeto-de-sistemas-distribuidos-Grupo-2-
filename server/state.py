from asyncio import Lock
from typing import Dict, Optional
from datetime import datetime
import uuid
import json
import os
import httpx  # Importado para integração síncrona distribuída com Express

# ============ VARIÁVEIS GLOBAIS & CONFIGS ============

arquivo_reservas = "banco_reservas.json"
EXPRESS_API_URL = "http://localhost:5000/api"

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

# ============ FUNÇÕES DE PERSISTÊNCIA LOCAL (JSON) ============

def salvar_em_disco():
    """Grava o estado atual da memória RAM no ficheiro JSON local."""
    dados = {
        "estado_salas": estado_salas,
        "reservas": reservas
    }
    with open(arquivo_reservas, "w", encoding="utf-8") as f:
        json.dump(dados, f, indent=4, ensure_ascii=False)

def inicializar_data(data: str):
    """Garante que as estruturas de horários existem para a data selecionada."""
    for sala in estado_salas:
        if data not in estado_salas[sala]:
            estado_salas[sala][data] = {}
            for hora in range(7, 22):
                horario = f"{hora:02d}:00"
                estado_salas[sala][data][horario] = None

# ============ FUNÇÕES DE NEGÓCIO (COMANDOS DO PROFESSOR) ============

def check_disponibilidade(data: str) -> dict:
    """Implementa o comando CHECK|data."""
    inicializar_data(data)
    resultado = {}
    for sala in estado_salas:
        resultado[sala] = {}
        for horario, reserva_id in estado_salas[sala][data].items():
            resultado[sala][horario] = 'OCUPADO' if reserva_id else 'LIVRE'
    return resultado

async def reservar_sala(sala: str, data: str, horario: str, usuario: str) -> str:
    """
    Implementa o comando RESERVE|sala|hora.
    Utiliza locks de concorrência e persiste no JSON local além de propagar para o PostgreSQL.
    """
    inicializar_data(data)
    
    # 1. Validações básicas na memória RAM
    if sala not in estado_salas:
        raise ValueError(f"Sala {sala} não existe no sistema.")
        
    if estado_salas[sala][data][horario] is not None:
        raise ValueError(f"Sala {sala} ocupada em {data} às {horario}")
    
    reserva_id = str(uuid.uuid4())
    
    # 2. Grava na memória RAM e persiste localmente no JSON (Requisito)
    estado_salas[sala][data][horario] = reserva_id
    reservas[reserva_id] = {
        'sala': sala,
        'data': data,
        'horario': horario,
        'usuario': usuario,
        'criado_em': datetime.now().isoformat()
    }
    salvar_em_disco()
    
    # 3. Propagação e Sincronização Síncrona distribuída para o Express/Postgres
    payload = {
        "id": reserva_id,
        "sala": sala,
        "data": data,
        "hora": horario,
        "usuario_id": usuario
    }
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(f"{EXPRESS_API_URL}/reserve", json=payload, timeout=5.0)
            if res.status_code not in (200, 201):
                # Caso a base de dados distribuída falhe, o sistema local cancela e desfaz
                print(" Falha ao salvar no Express. Desfazendo reserva local.")
                estado_salas[sala][data][horario] = None
                if reserva_id in reservas:
                    del reservas[reserva_id]
                salvar_em_disco()
                raise ValueError("Erro ao salvar na base de dados relacional distribuída.")
    except Exception as e:
        print(f" Erro de rede ao conectar com a base de dados PostgreSQL (Express): {e}")
        # Decisão de arquitetura: Mantém guardado localmente no JSON como fallback de sobrevivência
        
    return reserva_id

async def cancelar_reserva(reserva_id: str):
    """
    Implementa o comando CANCEL|id.
    Remove tanto da persistência em memória/JSON local como da base de dados PostgreSQL remota.
    """
    if reserva_id not in reservas:
        raise ValueError("Reserva não encontrada.")
    
    reserva = reservas[reserva_id]
    sala = reserva['sala']
    data = reserva['data']
    horario = reserva['horario']
    
    # 1. Remove da base de dados remota distribuída (Express/PostgreSQL)
    try:
        async with httpx.AsyncClient() as client:
            res = await client.delete(f"{EXPRESS_API_URL}/cancel/{reserva_id}", timeout=5.0)
            if res.status_code not in (200, 204):
                raise ValueError("Erro ao eliminar da base de dados remota.")
    except Exception as e:
        print(f" Erro ao sincronizar remoção na base de dados remota: {e}")

    # 2. Remove da memória RAM e do ficheiro JSON local (Requisito)
    if estado_salas[sala][data][horario] == reserva_id:
        estado_salas[sala][data][horario] = None    
    if reserva_id in reservas:
        del reservas[reserva_id]    
    salvar_em_disco()

def obter_reserva(reserva_id: str) -> dict:
    if reserva_id not in reservas:
        raise ValueError("Reserva não encontrada")
    return reservas[reserva_id]

def limpar_estado():
    """Limpa o estado mantendo as referências originais de memória intactas."""
    estado_salas.clear()
    estado_salas.update({
        'SALA_A': {},
        'SALA_B': {},
        'SALA_C': {}
    })
    reservas.clear()
    salvar_em_disco()

# ============ CARREGAR INICIALIZAÇÃO LOCAL DO JSON ============

if os.path.exists(arquivo_reservas):
    try:
        with open(arquivo_reservas, "r", encoding="utf-8") as f:
            dados_carregados = json.load(f)
            
            #  CORREÇÃO: Limpar e atualizar mantém a mesma referência de memória RAM ativa
            estado_salas.clear()
            estado_salas.update(dados_carregados.get("estado_salas", {}))
            
            reservas.clear()
            reservas.update(dados_carregados.get("reservas", {}))
            
            # Garante que as salas padrão existem na memória mesmo se o JSON estiver incompleto
            for sala_padrao in ['SALA_A', 'SALA_B', 'SALA_C']:
                if sala_padrao not in estado_salas:
                    estado_salas[sala_padrao] = {}
                    
        print("💾 Dados de reservas carregados com sucesso do disco local!")
    except Exception as e:
        print(f" Erro ao carregar base de dados local (JSON): {e}")