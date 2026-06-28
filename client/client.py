import httpx
import asyncio
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

class ClienteReservas:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
    
    async def health(self):
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.base_url}/health")
            return resp.json()
    
    async def check(self, data):
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.base_url}/check", params={"data": data})
            return resp.json()
    
    async def reservar(self, sala, data, horario, usuario):
        async with httpx.AsyncClient() as client:
            payload = {
                "sala": sala,
                "data": data,
                "horario": horario,
                "usuario": usuario
            }
            resp = await client.post(f"{self.base_url}/reserve", json=payload)
            return resp.json(), resp.status_code
    
    async def cancelar(self, reserva_id):
        async with httpx.AsyncClient() as client:
            resp = await client.delete(f"{self.base_url}/cancel/{reserva_id}")
            return resp.json(), resp.status_code

async def testar_reserva_simples():
    print("\n" + "="*50)
    print("🧪 TESTE SIMPLES")
    print("="*50)
    
    cliente = ClienteReservas()
    data = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
    
    print("1️⃣ Verificando saúde do servidor...")
    health = await cliente.health()
    print(f"    {health}")
    
    print(f"\n2️⃣ Consultando disponibilidade para {data}...")
    check = await cliente.check(data)
    print(f"   📊 SALA_A - 09:00: {check['salas']['SALA_A']['09:00']}")
    print(f"   📊 SALA_A - 10:00: {check['salas']['SALA_A']['10:00']}")
    
    print(f"\n3️⃣ Fazendo reserva para {data} às 10:00...")
    resultado, status = await cliente.reservar(
        sala="SALA_A",
        data=data,
        horario="10:00",
        usuario="fabio.filho"
    )
    print(f"    Status {status}: {resultado}")
    reserva_id = resultado.get('reserva_id')
    
    print(f"\n4️⃣ Verificando disponibilidade após reserva...")
    check = await cliente.check(data)
    print(f"   📊 SALA_A - 10:00: {check['salas']['SALA_A']['10:00']}")
    
    print(f"\n5️⃣ Cancelando reserva {reserva_id}...")
    resultado, status = await cliente.cancelar(reserva_id)
    print(f"    {resultado}")
    
    print(f"\n6️⃣ Verificando disponibilidade após cancelamento...")
    check = await cliente.check(data)
    print(f"   📊 SALA_A - 10:00: {check['salas']['SALA_A']['10:00']}")

async def main():
    try:
        await testar_reserva_simples()
    except httpx.ConnectError:
        print("\n ERRO: Servidor não está rodando!")
        print("Execute: cd server && uvicorn main:app --reload")

if __name__ == "__main__":
    asyncio.run(main())
