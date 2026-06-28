const express = require('express');
const app = express();
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const PORT = 3000;
const DB_FILE = './reservas.db';


// CONECTAR AO BANCO DE DADOS

const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar ao banco:', err.message);
    } else {
        console.log('✅ Conectado ao SQLite');
        criarTabela();
    }
});


// CRIAR TABELA (se não existir)


function criarTabela() {
    db.run(`
        CREATE TABLE IF NOT EXISTS reservas (
            id TEXT PRIMARY KEY,
            sala TEXT NOT NULL,
            data TEXT NOT NULL,
            hora TEXT NOT NULL,
            cliente TEXT NOT NULL
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela:', err.message);
        } else {
            console.log('✅ Tabela "reservas" pronta');
        }
    });
}

// LOGS


app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 
// ROTA: CHECK (GET /check)


app.get('/check', (req, res) => {
    const data = req.query.data;
    const salas = ['Sala101', 'Sala102', 'Sala103', 'Lab204', 'Auditorio'];

    db.all(`SELECT sala, hora FROM reservas WHERE data = ?`, [data], (err, rows) => {
        if (err) {
            return res.status(500).json({ erro: 'Erro no banco' });
        }

        const ocupadas = rows.map(row => `${row.sala}_${row.hora}`);

        const resultado = salas.map(sala => {
            const ocupado = ocupadas.some(key => key.startsWith(sala));
            return { sala, status: ocupado ? 'OCUPADA' : 'LIVRE' };
        });

        res.json({ data, salas: resultado });
    });
});


// ROTA: RESERVE (POST /reserve)


app.post('/reserve', (req, res) => {
    const { sala, data, hora, cliente } = req.body;

    if (!sala || !data || !hora || !cliente) {
        return res.status(400).json({ erro: 'Faltam campos' });
    }

    const id = `${sala}_${data}_${hora}`;

    // Verifica se já existe
    db.get(`SELECT id FROM reservas WHERE id = ?`, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ erro: 'Erro no banco' });
        }

        if (row) {
            return res.status(409).json({ erro: 'Sala ocupada' });
        }

        // Insere a reserva
        db.run(
            `INSERT INTO reservas (id, sala, data, hora, cliente) VALUES (?, ?, ?, ?, ?)`,
            [id, sala, data, hora, cliente],
            function(err) {
                if (err) {
                    return res.status(500).json({ erro: 'Erro ao salvar' });
                }
                console.log(`✅ RESERVE - ${cliente} reservou ${sala} em ${data} às ${hora}`);
                res.json({ mensagem: 'Reserva confirmada', id });
            }
        );
    });
});

// ROTA: LISTAR RESERVAS (GET /reservas)

app.get('/reservas', (req, res) => {
    db.all(`SELECT id, sala, data, hora, cliente FROM reservas`, (err, rows) => {
        if (err) {
            return res.status(500).json({ erro: 'Erro no banco' });
        }
        res.json(rows);
    });
});


// ROTA: CANCELAR (DELETE /cancel/:id)


app.delete('/cancel/:id', (req, res) => {
    const id = req.params.id;

    db.run(`DELETE FROM reservas WHERE id = ?`, [id], function(err) {
        if (err) {
            return res.status(500).json({ erro: 'Erro ao cancelar' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ erro: 'Reserva não encontrada' });
        }

        console.log(`✅ CANCEL - ${id}`);
        res.json({ mensagem: 'Reserva cancelada' });
    });
});

// ROTA: LIMPAR TODAS AS RESERVAS


app.delete('/limpar', (req, res) => {
    db.run(`DELETE FROM reservas`, function(err) {
        if (err) {
            return res.status(500).json({ erro: 'Erro ao limpar' });
        }
        console.log(`🧹 Todas as reservas foram removidas`);
        res.json({ mensagem: 'Todas as reservas removidas' });
    });
});

// INICIAR O SERVIDOR


app.listen(PORT, () => {
    console.log(`🚀 Servidor HTTP rodando na porta ${PORT}`);
});