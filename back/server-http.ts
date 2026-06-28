import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'bypass-tunnel-reminder']
}));

app.use(express.json());
app.use(express.static('.'));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

let dbLocal: Database;

async function conectarBancoLocal() {
    dbLocal = await open({
        filename: path.join(__dirname, '../reservas.db'),
        driver: sqlite3.Database
    });
    console.log(' Banco de dados local SQLite conectado com sucesso.');
}

async function criarTabelas(): Promise<void> {
    try {
        // --- CONFIGURAÇÃO NO POSTGRESQL (NUVEM - NEON) ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS salas (
                id TEXT PRIMARY KEY,
                nome_exibicao TEXT NOT NULL,
                tipo_id INTEGER,
                capacidade INTEGER
            );
        `).catch(e => console.log("Aviso Postgres (Salas):", e.message));

        await pool.query(`
            CREATE TABLE IF NOT EXISTS reservas (
                id SERIAL PRIMARY KEY,
                sala_id TEXT REFERENCES salas(id),
                data_reserva TEXT NOT NULL,
                hora_reserva TEXT NOT NULL,
                cliente TEXT NOT NULL,
                CONSTRAINT unique_sala_data_hora UNIQUE (sala_id, data_reserva, hora_reserva)
            );
        `).catch(e => console.log("Aviso Postgres (Reservas):", e.message));

        // --- CONFIGURAÇÃO NO SQLITE (LOCAL) ---
        await dbLocal.exec(`
            CREATE TABLE IF NOT EXISTS salas (
                id TEXT PRIMARY KEY,
                nome_exibicao TEXT NOT NULL,
                tipo_id INTEGER,
                capacidade INTEGER
            );
        `);
        await dbLocal.exec(`
            CREATE TABLE IF NOT EXISTS reservas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sala_id TEXT,
                data_reserva TEXT NOT NULL,
                hora_reserva TEXT NOT NULL,
                cliente TEXT NOT NULL,
                UNIQUE (sala_id, data_reserva, hora_reserva)
            );
        `);

        // Sincronização e Carga Inicial com os dados reais do seu Neon
        const salasReaisNeon = [
            { id: "1", nome_exibicao: "Sala E403/404", tipo_id: 1, capacidade: 10 },
            { id: "2", nome_exibicao: "SALA E204", tipo_id: 1, capacidade: 4 },
            { id: "3", nome_exibicao: "E 203", tipo_id: 1, capacidade: 4 },
            { id: "4", nome_exibicao: "E401/402", tipo_id: 1, capacidade: 4 },
            { id: "5", nome_exibicao: "Sala E202", tipo_id: 1, capacidade: 4 },
            { id: "10", nome_exibicao: "GRAD 5", tipo_id: 2, capacidade: 60 }
        ];

        for (const sala of salasReaisNeon) {
            await pool.query(
                'INSERT INTO salas (id, nome_exibicao, tipo_id, capacidade) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING', 
                [sala.id, sala.nome_exibicao, sala.tipo_id, sala.capacidade]
            ).catch(() => {}); 

            await dbLocal.run(
                'INSERT OR IGNORE INTO salas (id, nome_exibicao, tipo_id, capacidade) VALUES (?, ?, ?, ?)', 
                [sala.id, sala.nome_exibicao, sala.tipo_id, sala.capacidade]
            ).catch(() => {});
        }

        console.log(' Estrutura híbrida atualizada e sincronizada com as salas reais.');
    } catch (err) {
        console.error(' Erro crítico ao criar tabelas:', err);
    }
}

// BUSCAR SALAS DINAMICAMENTE
app.get('/salas', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM salas ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.log(' Falha ao buscar salas na nuvem. Buscando do espelho local...');
        try {
            const linhasLocais = await dbLocal.all('SELECT * FROM salas ORDER BY id ASC');
            res.json(linhasLocais);
        } catch (errLocal) {
            res.status(500).json({ erro: 'Não foi possível carregar as salas de nenhum banco.' });
        }
    }
});

app.get('/check', async (req: Request, res: Response) => {
    const { data } = req.query;
    if (!data) {
        res.status(400).json({ erro: 'Data é obrigatória' });
        return;
    }

    try {
        const result = await pool.query('SELECT * FROM reservas WHERE data_reserva = $1', [data]);
        res.json(result.rows);
    } catch (err: any) {
        console.log(' Nuvem indisponível. Ativando Mecanismo de Fallback para o Banco Local...');
        try {
            const linhasLocais = await dbLocal.all('SELECT id, sala_id, data_reserva, hora_reserva, cliente FROM reservas WHERE data_reserva = ?', [data]);
            const resultadoMapeado = linhasLocais.map(row => ({
                id: row.id,
                sala_id: row.sala_id,
                data_reserva: row.data_reserva,
                hora_reserva: row.hora_reserva,
                cliente: row.cliente
            }));
            res.json(resultadoMapeado);
        } catch (errLocal: any) {
            res.status(500).json({ erro: 'Erro crítico: Ambos os bancos estão inacessíveis.' });
        }
    }
});

app.post('/reserve', async (req: Request, res: Response) => {
    const { sala, data, hora, cliente } = req.body;

    if (!sala || !data || !hora || !cliente) {
        res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
        return;
    }

    try {
        await pool.query(
            'INSERT INTO reservas (sala_id, data_reserva, hora_reserva, cliente) VALUES ($1, $2, $3, $4)',
            [sala, data, hora, cliente]
        );
        await dbLocal.run(
            'INSERT OR IGNORE INTO reservas (sala_id, data_reserva, hora_reserva, cliente) VALUES (?, ?, ?, ?)',
            [sala, data, hora, cliente]
        );
        res.json({ OK: true });
    } catch (err: any) {
        if (err.code === '23505') {
            res.status(409).json({ erro: 'Este horário já foi reservado por outro usuário na nuvem!' });
            return;
        }
        console.log(' Conexão com a nuvem falhou durante a inserção. Tentando gravação local offline...');
        try {
            await dbLocal.run(
                'INSERT INTO reservas (sala_id, data_reserva, hora_reserva, cliente) VALUES (?, ?, ?, ?)',
                [sala, data, hora, cliente]
            );
            res.json({ OK: true, aviso: 'Salvo localmente (Modo Offline Ativo)' });
        } catch (errLocal: any) {
            if (errLocal.message && errLocal.message.includes('UNIQUE')) {
                res.status(409).json({ erro: 'Este horário já foi reservado localmente!' });
                return;
            }
            res.status(500).json({ erro: errLocal.message });
        }
    }
});

app.delete('/cancel/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { sala, data, hora } = req.query;

    try {
        await pool.query('DELETE FROM reservas WHERE id = $1', [id]);
        if (sala && data && hora) {
            await dbLocal.run(
                'DELETE FROM reservas WHERE sala_id = ? AND data_reserva = ? AND hora_reserva = ?',
                [sala, data, hora]
            );
        }
        res.json({ OK: true });
    } catch (err: any) {
        try {
            if (sala && data && hora) {
                await dbLocal.run(
                    'DELETE FROM reservas WHERE sala_id = ? AND data_reserva = ? AND hora_reserva = ?',
                    [sala, data, hora]
                );
                res.json({ OK: true, aviso: 'Removido apenas localmente (Modo Offline)' });
                return;
            }
            res.status(500).json({ erro: err.message });
        } catch (e) {
            res.status(500).json({ erro: err.message });
        }
    }
});

async function iniciarServidor() {
    await conectarBancoLocal();
    await criarTabelas();
    app.listen(PORT, () => {
        console.log(` Servidor Express rodando na porta ${PORT}`);
    });
}

iniciarServidor();