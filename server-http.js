const express = require('express');
const app = express();
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const PORT = process.env.PORT || 3000;

// CONECTAR AO NEON (PostgreSQL)


const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});


// CRIAR TABELA


async function criarTabela() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reservas (
                id TEXT PRIMARY KEY,
                sala TEXT NOT NULL,
                data TEXT NOT NULL,
                hora TEXT NOT NULL,
                cliente TEXT NOT NULL,
                criado_em TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Tabela "reservas" pronta no Neon (PostgreSQL)');
    } catch (err) {
        console.error('❌ Erro ao criar tabela:', err.message);
    }
}
// LOGS

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});


// ROTA: CHECK


app.get('/check', async (req, res) => {
    const data = req.query.data;
    const salas = ['Sala101', 'Sala102', 'Sala103', 'Lab204', 'Auditorio'];

    try {
        const result = await pool.query(
            'SELECT sala, hora FROM reservas WHERE data = $1',
            [data]
        );

        const ocupadas = result.rows.map(row => `${row.sala}_${row.hora}`);
        const resultado = salas.map(sala => ({
            sala,
            status: ocupadas.some(key => key.startsWith(sala)) ? 'OCUPADA' : 'LIVRE'
        }));

        res.json({ data, salas: resultado });
    } catch (err) {
        console.error('Erro no CHECK:', err);
        res.status(500).json({ erro: 'Erro no banco' });
    }
});

// ROTA: RESERVE

app.post('/reserve', async (req, res) => {
    const { sala, data, hora, cliente } = req.body;

    if (!sala || !data || !hora || !cliente) {
        return res.status(400).json({ erro: 'Faltam campos' });
    }

    const id = `${sala}_${data}_${hora}`;

    try {
        const existing = await pool.query(
            'SELECT id FROM reservas WHERE id = $1',
            [id]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ erro: 'Sala ocupada' });
        }

        await pool.query(
            'INSERT INTO reservas (id, sala, data, hora, cliente) VALUES ($1, $2, $3, $4, $5)',
            [id, sala, data, hora, cliente]
        );

        console.log(`✅ RESERVE - ${cliente} reservou ${sala} em ${data} às ${hora}`);
        res.json({ mensagem: 'Reserva confirmada', id });
    } catch (err) {
        console.error('Erro no RESERVE:', err);
        res.status(500).json({ erro: 'Erro ao salvar' });
    }
});

// ROTA: LISTAR RESERVAS

app.get('/reservas', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, sala, data, hora, cliente FROM reservas ORDER BY criado_em DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Erro no RESERVAS:', err);
        res.status(500).json({ erro: 'Erro no banco' });
    }
});


// ROTA: CANCELAR


app.delete('/cancel/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const result = await pool.query(
            'DELETE FROM reservas WHERE id = $1',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ erro: 'Reserva não encontrada' });
        }

        console.log(`✅ CANCEL - ${id}`);
        res.json({ mensagem: 'Reserva cancelada' });
    } catch (err) {
        console.error('Erro no CANCEL:', err);
        res.status(500).json({ erro: 'Erro ao cancelar' });
    }
});


// ROTA: LIMPAR TUDO

app.delete('/limpar', async (req, res) => {
    try {
        await pool.query('DELETE FROM reservas');
        console.log('🧹 Todas as reservas foram removidas');
        res.json({ mensagem: 'Todas as reservas removidas' });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao limpar' });
    }
});


// INICIAR O SERVIDOR


criarTabela().then(() => {
    app.listen(PORT, () => {
        console.log(` Servidor HTTP rodando na porta ${PORT}`);
    });
});