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
    console.log('📦 Banco de dados local SQLite conectado com sucesso.');
}

async function criarTabelas(): Promise<void> {
    try {
        // --- CONFIGURAÇÃO NO POSTGRESQL (NUVEM - NEON) ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tipos_sala (
                id SERIAL PRIMARY KEY,
                nome TEXT UNIQUE NOT NULL
            );
        `).catch(e => console.log("Aviso Postgres (Tipos):", e.message));

        await pool.query(`
            CREATE TABLE IF NOT EXISTS recursos (
                id SERIAL PRIMARY KEY,
                nome TEXT UNIQUE NOT NULL
            );
        `).catch(e => console.log("Aviso Postgres (Recursos):", e.message));

        await pool.query(`
            CREATE TABLE IF NOT EXISTS salas (
                id TEXT PRIMARY KEY,
                nome_exibicao TEXT NOT NULL,
                tipo_id INTEGER REFERENCES tipos_sala(id),
                capacidade INTEGER
            );
        `).catch(e => console.log("Aviso Postgres (Salas):", e.message));

        await pool.query(`
            CREATE TABLE IF NOT EXISTS sala_recursos (
                sala_id TEXT REFERENCES salas(id) ON DELETE CASCADE,
                recurso_id INTEGER REFERENCES recursos(id) ON DELETE CASCADE,
                PRIMARY KEY (sala_id, recurso_id)
            );
        `).catch(e => console.log("Aviso Postgres (sala_recursos):", e.message));

        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                avatar_url TEXT
            );
        `).catch(e => console.log("Aviso Postgres (Usuários):", e.message));

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

        // --- CONFIGURAÇÃO NO SQLITE (LOCAL - BACKUP) ---
        await dbLocal.exec(`
            CREATE TABLE IF NOT EXISTS tipos_sala (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT UNIQUE NOT NULL
            );
        `);

        await dbLocal.exec(`
            CREATE TABLE IF NOT EXISTS recursos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT UNIQUE NOT NULL
            );
        `);

        await dbLocal.exec(`
            CREATE TABLE IF NOT EXISTS salas (
                id TEXT PRIMARY KEY,
                nome_exibicao TEXT NOT NULL,
                tipo_id INTEGER,
                capacidade INTEGER,
                FOREIGN KEY (tipo_id) REFERENCES tipos_sala(id)
            );
        `);

        await dbLocal.exec(`
            CREATE TABLE IF NOT EXISTS sala_recursos (
                sala_id TEXT,
                recurso_id INTEGER,
                PRIMARY KEY (sala_id, recurso_id),
                FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE CASCADE,
                FOREIGN KEY (recurso_id) REFERENCES recursos(id) ON DELETE CASCADE
            );
        `);

        await dbLocal.exec(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id TEXT PRIMARY KEY,
                nome TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                avatar_url TEXT
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

        // Seed de Categorias de Salas padrão
        const tiposPadrao = ["Estudo Individual", "Estudo em Grupo", "Auditório/Grad"];
        for (const tipo of tiposPadrao) {
            await pool.query('INSERT INTO tipos_sala (nome) VALUES ($1) ON CONFLICT (nome) DO NOTHING', [tipo]).catch(() => {});
            await dbLocal.run('INSERT OR IGNORE INTO tipos_sala (nome) VALUES (?)', [tipo]).catch(() => {});
        }

        // Seed de Recursos padrão
        const recursosPadrao = ["Ar Condicionado", "Projetor", "Quadro Branco", "Computadores"];
        for (const recurso of recursosPadrao) {
            await pool.query('INSERT INTO recursos (nome) VALUES ($1) ON CONFLICT (nome) DO NOTHING', [recurso]).catch(() => {});
            await dbLocal.run('INSERT OR IGNORE INTO recursos (nome) VALUES (?)', [recurso]).catch(() => {});
        }

        // Seed de Salas reais
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

        console.log('✅ Estrutura híbrida e dependências atualizadas com sucesso.');
    } catch (err) {
        console.error('❌ Erro crítico ao criar tabelas:', err);
    }
}

// =========================================================================
// ROTAS DE GERENCIAMENTO (CADASTRADOR ADMIN)
// =========================================================================

app.get('/tipos-sala', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT id, nome FROM tipos_sala ORDER BY nome ASC');
        res.json(result.rows);
    } catch (err) {
        try {
            const linhasLocais = await dbLocal.all('SELECT id, nome FROM tipos_sala ORDER BY nome ASC');
            res.json(linhasLocais);
        } catch (e) {
            res.status(500).json({ erro: 'Não foi possível buscar os tipos de sala.' });
        }
    }
});

app.post('/tipos-sala', async (req: Request, res: Response): Promise<any> => {
    const { nome } = req.body;
    if (!nome || nome.trim() === '') return res.status(400).json({ erro: 'Nome é obrigatório.' });

    try {
        const result = await pool.query('INSERT INTO tipos_sala (nome) VALUES ($1) RETURNING *', [nome.trim()]);
        await dbLocal.run('INSERT OR IGNORE INTO tipos_sala (nome) VALUES (?)', [nome.trim()]);
        res.json(result.rows[0]);
    } catch (err: any) {
        if (err.code === '23505') return res.status(409).json({ erro: 'Este tipo de sala já existe.' });
        try {
            const r = await dbLocal.run('INSERT INTO tipos_sala (nome) VALUES (?)', [nome.trim()]);
            res.json({ id: r.lastID, nome: nome.trim() });
        } catch (e) {
            res.status(500).json({ erro: 'Erro ao cadastrar tipo de sala.' });
        }
    }
});

app.get('/recursos', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT id, nome FROM recursos ORDER BY nome ASC');
        res.json(result.rows);
    } catch (err) {
        try {
            const linhasLocais = await dbLocal.all('SELECT id, nome FROM recursos ORDER BY nome ASC');
            res.json(linhasLocais);
        } catch (e) {
            res.status(500).json({ erro: 'Não foi possível buscar recursos.' });
        }
    }
});

app.post('/recursos', async (req: Request, res: Response): Promise<any> => {
    const { nome } = req.body;
    if (!nome || nome.trim() === '') return res.status(400).json({ erro: 'O nome do recurso é obrigatório.' });

    try {
        const result = await pool.query('INSERT INTO recursos (nome) VALUES ($1) RETURNING *', [nome.trim()]);
        await dbLocal.run('INSERT OR IGNORE INTO recursos (nome) VALUES (?)', [nome.trim()]);
        res.json(result.rows[0]);
    } catch (err: any) {
        if (err.code === '23505') return res.status(409).json({ erro: 'Este recurso já está cadastrado.' });
        try {
            const r = await dbLocal.run('INSERT INTO recursos (nome) VALUES (?)', [nome.trim()]);
            res.json({ id: r.lastID, nome: nome.trim() });
        } catch (e) {
            res.status(500).json({ erro: 'Erro ao cadastrar recurso.' });
        }
    }
});

app.get('/salas', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM salas ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        try {
            const linhasLocais = await dbLocal.all('SELECT * FROM salas ORDER BY id ASC');
            res.json(linhasLocais);
        } catch (errLocal) {
            res.status(500).json({ erro: 'Não foi possível carregar as salas.' });
        }
    }
});

app.post('/salas', async (req: Request, res: Response): Promise<any> => {
    const { id, nome_exibicao, tipo_id, capacidade } = req.body;

    if (!id || !nome_exibicao || !tipo_id) {
        return res.status(400).json({ erro: 'ID, Nome de exibição e Categoria são obrigatórios.' });
    }

    const idLimpo = id.trim().toUpperCase();
    const nomeLimpo = nome_exibicao.trim();
    const capLimpa = capacidade ? Number(capacidade) : 4;
    const tipoLimpo = Number(tipo_id);

    try {
        // Tenta salvar primeiro no banco principal (Postgres)
        await pool.query(
            `INSERT INTO salas (id, nome_exibicao, tipo_id, capacidade) 
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (id) 
             DO UPDATE SET nome_exibicao = EXCLUDED.nome_exibicao, tipo_id = EXCLUDED.tipo_id, capacidade = EXCLUDED.capacidade`,
            [idLimpo, nomeLimpo, tipoLimpo, capLimpa]
        );

        // Se o Postgres funcionar, espelha no SQLite usando a sintaxe nativa 'REPLACE'
        await dbLocal.run(
            `INSERT OR REPLACE INTO salas (id, nome_exibicao, tipo_id, capacidade) 
             VALUES (?, ?, ?, ?)`,
            [idLimpo, nomeLimpo, tipoLimpo, capLimpa]
        );

        return res.json({ OK: true });

    } catch (err: any) {
        console.error("❌ Erro na operação do Postgres/Salas:", err.message);
        
        // se o Postgres falhar/estiver offline, tenta salvar no SQLite isoladamente
        try {
            console.warn("⚠️ Tentando salvar sala apenas no banco local (Modo de Contingência)...");
            await dbLocal.run(
                `INSERT OR REPLACE INTO salas (id, nome_exibicao, tipo_id, capacidade) 
                 VALUES (?, ?, ?, ?)`,
                [idLimpo, nomeLimpo, tipoLimpo, capLimpa]
            );
            return res.json({ OK: true, aviso: 'Salvo apenas localmente.' });
        } catch (errLocal: any) {
            console.error("❌ Erro crítico no SQLite/Salas:", errLocal.message);
            return res.status(500).json({ erro: 'Falha crítica em ambos os bancos de dados ao salvar a sala.' });
        }
    }
});

app.post('/salas/vincular-recurso', async (req: Request, res: Response): Promise<any> => {
    const { sala_id, recurso_id } = req.body;

    if (!sala_id || !recurso_id) {
        return res.status(400).json({ erro: 'ID da Sala e ID do Recurso são obrigatórios.' });
    }

    try {
        await pool.query(
            'INSERT INTO sala_recursos (sala_id, recurso_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [sala_id, Number(recurso_id)]
        );
        await dbLocal.run(
            'INSERT OR IGNORE INTO sala_recursos (sala_id, recurso_id) VALUES (?, ?)',
            [sala_id, Number(recurso_id)]
        );
        res.json({ OK: true, mensagem: 'Recurso associado com sucesso.' });
    } catch (err: any) {
        console.error("Erro ao vincular recurso:", err.message);
        res.status(500).json({ erro: 'Falha interna ao associar infraestrutura.' });
    }
});


// =========================================================================
// ROTAS DE USUÁRIOS E RESERVAS
// =========================================================================

app.post('/usuarios/sync', async (req: Request, res: Response): Promise<any> => {
    const { id, nome, email, avatar_url } = req.body;
    if (!id || !nome || !email) {
        return res.status(400).json({ erro: 'Dados de usuário insuficientes para sincronização.' });
    }
    try {
        const queryText = `
            INSERT INTO usuarios (id, nome, email, avatar_url)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) 
            DO UPDATE SET nome = EXCLUDED.nome, email = EXCLUDED.email, avatar_url = EXCLUDED.avatar_url;
        `;
        await pool.query(queryText, [id, nome, email, avatar_url || null]);
        await dbLocal.run(`
            INSERT INTO usuarios (id, nome, email, avatar_url)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET nome=excluded.nome, email=excluded.email, avatar_url=excluded.avatar_url;
        `, [id, nome, email, avatar_url || null]);
        res.json({ sucesso: true });
    } catch (err) {
        try {
            await dbLocal.run(`
                INSERT INTO usuarios (id, nome, email, avatar_url)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET nome=excluded.nome, email=excluded.email, avatar_url=excluded.avatar_url;
            `, [id, nome, email, avatar_url || null]);
            res.json({ sucesso: true, aviso: 'Modo Offline' });
        } catch (errLocal) {
            res.status(500).json({ erro: 'Não foi possível sincronizar o registro do usuário.' });
        }
    }
});

app.get('/check', async (req: Request, res: Response): Promise<any> => {
    const { data } = req.query;
    if (!data) return res.status(400).json({ erro: 'Data é obrigatória' });

    try {
        const result = await pool.query('SELECT * FROM reservas WHERE data_reserva = $1', [data]);
        res.json(result.rows);
    } catch (err: any) {
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
            res.status(500).json({ erro: 'Ambos os bancos de dados estão inacessíveis.' });
        }
    }
});

app.post('/reserve', async (req: Request, res: Response): Promise<any> => {
    const { sala, data, hora, horario, cliente, usuario_id } = req.body;
    const horaFinal = hora || horario;
    const clienteFinal = cliente || usuario_id;

    if (!sala || !data || !horaFinal || !clienteFinal) {
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
    }

    try {
        await pool.query(
            'INSERT INTO reservas (sala_id, data_reserva, hora_reserva, cliente) VALUES ($1, $2, $3, $4)',
            [sala, data, horaFinal, clienteFinal]
        );
        await dbLocal.run(
            'INSERT OR IGNORE INTO reservas (sala_id, data_reserva, hora_reserva, cliente) VALUES (?, ?, ?, ?)',
            [sala, data, horaFinal, clienteFinal]
        );
        res.json({ OK: true });
    } catch (err: any) {
        if (err.code === '23505') {
            return res.status(409).json({ erro: 'Este horário já foi reservado na nuvem!' });
        }
        try {
            await dbLocal.run(
                'INSERT INTO reservas (sala_id, data_reserva, hora_reserva, cliente) VALUES (?, ?, ?, ?)',
                [sala, data, horaFinal, clienteFinal]
            );
            res.json({ OK: true, aviso: 'Salvo localmente (Modo Offline)' });
        } catch (errLocal: any) {
            if (errLocal.message && errLocal.message.includes('UNIQUE')) {
                return res.status(409).json({ erro: 'Este horário já foi reservado localmente!' });
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
        console.log(`🚀 Servidor Express híbrido rodando na porta ${PORT}`);
    });
}

iniciarServidor();