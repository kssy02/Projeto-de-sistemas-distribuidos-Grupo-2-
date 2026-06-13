from pydantic import BaseModel, validator
from datetime import datetime
import re

class ReservaRequest(BaseModel):
    sala: str
    data: str
    horario: str
    usuario: str
    
    @validator('sala')
    def validar_sala(cls, v):
        salas_validas = ['SALA_A', 'SALA_B', 'SALA_C']
        if v not in salas_validas:
            raise ValueError(f'Sala inválida. Use: {", ".join(salas_validas)}')
        return v
    
    @validator('data')
    def validar_data(cls, v):
        try:
            data_obj = datetime.strptime(v, '%Y-%m-%d')
            hoje = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            if data_obj < hoje:
                raise ValueError('Não é permitido reservar em datas passadas')
        except ValueError:
            raise ValueError('Data inválida. Use formato YYYY-MM-DD')
        return v
    
    @validator('horario')
    def validar_horario(cls, v):
        if not re.match(r'^\d{2}:\d{2}$', v):
            raise ValueError('Horário inválido. Use formato HH:MM')
        
        if not v.endswith(':00'):
            raise ValueError('Reservas apenas em horários fechados (ex: 09:00)')
        
        hora = int(v.split(':')[0])
        if not (7 <= hora <= 21):
            raise ValueError('Horário deve estar entre 07:00 e 21:00')
        
        return v
