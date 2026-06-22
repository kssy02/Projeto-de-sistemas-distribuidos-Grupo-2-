const express = require('express');
const app = express();
const fs = require('fs');
app.use(express.json());

const PORT = 3000;
const reservas = {};
const ARQUIVO = './reservas.json';

if (fs.existsSync(ARQUIVO)) {
    Object.assign(reservas, JSON.parse(fs.readFileSync(ARQUIVO)));
}

function salvar() {
    fs.writeFileSync(ARQUIVO, JSON.stringify(reservas));
}

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.get('/check', (req, res) => {
    const data = req.query.data;
    const salas = ['Sala101', 'Sala102', 'Sala103', 'Lab204', 'Auditorio'];
    const resultado = salas.map(sala => {
        const ocupado = Object.keys(reservas).some(key => 
            key.startsWith(sala) && key.includes(data)
        );
        return { sala, status: ocupado ? 'OCUPADA' : 'LIVRE' };
    });
    res.json({ data, salas: resultado });
});

app.post('/reserve', (req, res) => {
    const { sala, hora, cliente } = req.body;
    if (!sala || !hora || !cliente) {
        return res.status(400).json({ erro: 'Faltam campos' });
    }
    const key = `${sala}_${hora}`;
    if (reservas[key]) {
        return res.status(409).json({ erro: 'Sala ocupada' });
    }
    reservas[key] = { sala, hora, cliente };
    salvar();
    res.json({ mensagem: 'Reserva confirmada', id: key });
});

app.get('/reservas', (req, res) => {
    const lista = Object.entries(reservas).map(([id, dados]) => ({ id, ...dados }));
    res.json(lista);
});

app.delete('/cancel/:id', (req, res) => {
    const id = req.params.id;
    if (reservas[id]) {
        delete reservas[id];
        salvar();
        res.json({ mensagem: 'Reserva cancelada' });
    } else {
        res.status(404).json({ erro: 'Reserva não encontrada' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor HTTP rodando na porta ${PORT}`);
});
