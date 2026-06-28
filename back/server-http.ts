import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';

// Carrega o arquivo .env localizado na raiz do projeto (uma pasta acima de /back)
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Configuração do CORS
app.use(cors({
    origin: '*', // Permite que qualquer origem acesse a API
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'bypass-tunnel-reminder']
}));

app.use(express.json());
app.use(express.static('.'));

// Conexão com o Neon (PostgreSQL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Inicialização de tabelas de forma assíncrona
async function criarTabelas(): Promise<void> {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tipos_sala (
                id SERIAL PRIMARY KEY,
                nome TEXT UNIQUE NOT NULL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS recursos (
                id SERIAL PRIMARY KEY,
                nome TEXT UNIQUE NOT NULL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS salas (
                id TEXT PRIMARY KEY,               
                nome_exibicao TEXT NOT NULL,               
                tipo_id INT NOT NULL,         
                capacidade INT DEFAULT 4,
                CONSTRAINT fk_tipo_sala FOREIGN KEY (tipo_id) REFERENCES tipos_sala(id) ON DELETE CASCADE
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS sala_recursos (
                sala_id TEXT NOT NULL,
                recurso_id INT NOT NULL,
                PRIMARY KEY (sala_id, recurso_id),
                CONSTRAINT fk_sr_sala FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE CASCADE,
                CONSTRAINT fk_sr_recurso FOREIGN KEY (recurso_id) REFERENCES recursos(id) ON DELETE CASCADE
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id TEXT PRIMARY KEY,                    
                nome TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                avatar_url TEXT,
                criado_em TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS reservas (
                id TEXT PRIMARY KEY,                     
                sala_id TEXT NOT NULL,
                usuario_id TEXT NOT NULL,
                data_reserva TEXT NOT NULL,              
                hora_reserva TEXT NOT NULL,             
                titulo_evento TEXT DEFAULT 'Reserva de Sala',
                criado_em TIMESTAMP DEFAULT NOW(),
                CONSTRAINT fk_reserva_sala FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE CASCADE,
                CONSTRAINT fk_reserva_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );
        `);

        console.log('✅ Todas as tabelas prontas e verificadas no Neon (PostgreSQL)');
    } catch (err) {
        console.error('❌ Erro detalhado ao criar tabelas:', err);
    }
}

// Middleware de Logs simples
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ROTA: CHECK 
app.get('/check', async (req: Request, res: Response): Promise<any> => {
    const data = req.query.data as string;
    if (!data) return res.status(400).json({ erro: 'Data é obrigatória' });

    const horariosPadrao = [
        "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", 
        "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
    ];

    try {
        const salasResult = await pool.query('SELECT id, nome_exibicao FROM salas');
        
        const reservasResult = await pool.query(
            'SELECT sala_id, hora_reserva, usuario_id FROM reservas WHERE data_reserva = $1',
            [data]
        );

        const mapaOcupacao: Record<string, string> = {};
        reservasResult.rows.forEach((row: any) => {
            mapaOcupacao[`${row.sala_id}_${row.hora_reserva}`] = row.usuario_id;
        });
        
        const resultado = salasResult.rows.map((s: any) => {
            const gradeHorarios: Record<string, string | null> = {};
            
            horariosPadrao.forEach(hora => {
                const chave = `${s.id}_${hora}`;
                gradeHorarios[hora] = mapaOcupacao[chave] || null;
            });

            return {
                sala_id: s.id,
                nome: s.nome_exibicao,
                horarios: gradeHorarios 
            };
        });

        res.json({ data, salas: resultado });
    } catch (err: any) {
        console.error('❌ Erro no CHECK detalhado:', err);
        res.status(500).json({ erro: 'Erro no banco de dados ao checar horários' });
    }
});

// ROTA: Sincronizar dados do usuário autenticado pelo Google
app.post('/api/usuarios/sync', async (req: Request, res: Response): Promise<any> => {
    const { id, nome, email, avatar_url } = req.body;

    if (!id || !nome || !email) {
        return res.status(400).json({ erro: 'Dados de usuário insuficientes para sincronização.' });
    }

    try {
        const queryText = `
            INSERT INTO usuarios (id, nome, email, avatar_url)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) 
            DO UPDATE SET nome = EXCLUDED.nome, avatar_url = EXCLUDED.avatar_url, email = EXCLUDED.email
            RETURNING *;
        `;
        const values = [id, nome, email, avatar_url || null];
        const result = await pool.query(queryText, values);

        res.json({ sucesso: true, usuario: result.rows[0] });
    } catch (err: any) {
        console.error("❌ Erro ao sincronizar usuário no Postgres:", err.message);
        res.status(500).json({ erro: 'Erro interno ao salvar dados de sessão do usuário.' });
    }
});

// ROTA: RESERVE (Relacionando sala_id e usuario_id com trava de concorrência no FastAPI)
app.post('/reserve', async (req: Request, res: Response): Promise<any> => {
    const { sala, data, hora, usuario_id, titulo_evento } = req.body;

    if (!sala || !data || !hora || !usuario_id) {
        return res.status(400).json({ erro: 'Campos obrigatórios ausentes no corpo da requisição.' });
    }

    try {
        const novaReservaId = `RES-${crypto.randomUUID()}`; 

        const queryText = `
            INSERT INTO reservas (id, sala_id, usuario_id, data_reserva, hora_reserva, titulo_evento)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id;
        `;
        
        const values = [
            novaReservaId, 
            sala, 
            usuario_id, 
            data, 
            hora, 
            titulo_evento || 'Reserva de Sala'
        ];

        const result = await pool.query(queryText, values);

        return res.json({ 
            sucesso: true, 
            reserva_id: result.rows[0].id,
            mensagem: "Reserva efetuada com sucesso!" 
        });

    } catch (err: any) {
        console.error("❌ ERRO REAL DENTRO DO POSTGRES:", err.message);
        
        if (err.code === '23505') {
            return res.status(409).json({ 
                erro: 'Conflito de horário: Esta sala acabou de ser ocupada por outra requisição simultânea!' 
            });
        }

        if (err.code === '23503') {
            return res.status(400).json({ 
                erro: 'Erro de consistência: Verifique se a Sala ou o Usuário existem no banco de dados.' 
            });
        }

        return res.status(500).json({ erro: 'Erro interno no banco de dados', detalhe: err.message });
    }
});

// ROTA: LISTAR TODAS AS RESERVAS 
app.get('/reservas', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT r.id, r.data_reserva, r.hora_reserva, r.titulo_evento, 
                   s.nome_exibicao AS sala, u.nome AS cliente
            FROM reservas r
            JOIN salas s ON r.sala_id = s.id
            JOIN usuarios u ON r.usuario_id = u.id
            ORDER BY r.criado_em DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erro no RESERVAS:', err);
        res.status(500).json({ erro: 'Erro no banco' });
    }
});

// ROTA: CANCELAR
app.delete('/cancel/:id', async (req: Request, res: Response): Promise<any> => {
    const id = req.params.id;
    try {
        const result = await pool.query('DELETE FROM reservas WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ erro: 'Reserva não encontrada' });
        }
        console.log(`CANCEL - ${id}`);
        res.json({ mensagem: 'Reserva cancelada' });
    } catch (err) {
        console.error('❌ Erro no CANCEL:', err);
        res.status(500).json({ erro: 'Erro ao cancelar' });
    }
});

// ROTAS DE CATEGORIAS 
app.get('/tipos-sala', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT id, nome FROM tipos_sala ORDER BY nome ASC');
        res.json(result.rows);
    } catch (err: any) { res.status(500).json({ erro: err.message }); }
});

app.post('/tipos-sala', async (req: Request, res: Response) => {
    const { nome } = req.body;
    try {
        const result = await pool.query('INSERT INTO tipos_sala (nome) VALUES ($1) RETURNING *', [nome]);
        res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ erro: err.message }); }
});

// ROTAS DE RECURSOS
app.get('/recursos', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT id, nome FROM recursos ORDER BY nome ASC');
        res.json(result.rows);
    } catch (err: any) { res.status(500).json({ erro: err.message }); }
});

app.post('/recursos', async (req: Request, res: Response) => {
    const { nome } = req.body;
    try {
        const result = await pool.query('INSERT INTO recursos (nome) VALUES ($1) RETURNING *', [nome]);
        res.json(result.rows[0]);
    } catch (err: any) { res.status(500).json({ erro: err.message }); }
});

// ROTAS DE SALAS
app.get('/salas', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT id, nome_exibicao FROM salas ORDER BY nome_exibicao ASC');
        res.json(result.rows);
    } catch (err: any) { res.status(500).json({ erro: err.message }); }
});

app.post('/salas', async (req: Request, res: Response) => {
    const { id, nome_exibicao, tipo_id, capacidade } = req.body;
    try {
        await pool.query(
            'INSERT INTO salas (id, nome_exibicao, tipo_id, capacidade) VALUES ($1, $2, $3, $4)',
            [id, nome_exibicao, tipo_id, capacidade]
        );
        res.json({ OK: true });
    } catch (err: any) { res.status(500).json({ erro: err.message }); }
});

// ROTA DE VÍNCULO 
app.post('/salas/vincular-recurso', async (req: Request, res: Response) => {
    const { sala_id, recurso_id } = req.body;
    try {
        await pool.query(
            'INSERT INTO sala_recursos (sala_id, recurso_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [sala_id, recurso_id]
        );
        res.json({ OK: true, mensagem: 'Recurso vinculado com sucesso!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao associar recurso à sala.' });
    }
});

// INICIAR O SERVIDOR APÓS AS TABELAS COMPILADAS
criarTabelas().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor HTTP do Proxy rodando na porta ${PORT}`);
    });
});