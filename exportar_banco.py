import asyncio
import json
import os
from datetime import datetime
import asyncpg
from dotenv import load_dotenv

# 1. Carregar a String de Conexão do seu arquivo .env
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')
ARQUIVO_SAIDA = "historico_neon.json"

# Função para evitar erros caso o banco tenha campos do tipo Data/Hora nativos
def datetime_serializer(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Tipo {type(obj)} não suportado no JSON")

async def extrair_dados_neon():
    if not DATABASE_URL:
        print(" Erro: DATABASE_URL não encontrada no .env")
        return

    try:
        print(" Conectando ao banco de dados Neon...")
        conn = await asyncpg.connect(DATABASE_URL)
        
        # 2. O SELECT que junta tudo (Reservas + Sala + Usuário)
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
        
        print(" Buscando dados no Neon com SELECT + JOIN...")
        linhas = await conn.fetch(query_select)
        
        if not linhas:
            print(" O banco está conectado, mas nenhuma reserva foi encontrada para exportar.")
            await conn.close()
            return

        # 3. Estruturar os dados em um formato JSON limpo e legível
        lista_reservas = []
        for linha in linhas:
            lista_reservas.append({
                "reserva_id": linha["reserva_id"],
                "data": linha["data_reserva"],
                "horario": linha["hora_reserva"],
                "titulo": linha["titulo_evento"],
                "sala": {
                    "id": linha["sala_id"],
                    "nome": linha["sala_nome"]
                },
                "usuario": {
                    "id": linha["usuario_id"],
                    "nome": alias_nome if (alias_nome := linha["usuario_nome"]) else "Sem Nome",
                    "email": linha["usuario_email"]
                }
            })
            
            
        await conn.close()

        # 4. Gravar o arquivo JSON no computador
        print(f" Salvando {len(lista_reservas)} registros em '{ARQUIVO_SAIDA}'...")
        with open(ARQUIVO_SAIDA, 'w', encoding='utf-8') as f:
            json.dump(lista_reservas, f, indent=4, ensure_ascii=False, default=datetime_serializer)
            
        print("[SUCESSO] O arquivo JSON foi gerado com sucesso!")

    except Exception as e:
        print(f" Erro ao extrair dados: {e}")

if __name__ == "__main__":
    asyncio.run(extrair_dados_neon())