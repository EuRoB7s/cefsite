require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

const app = express();
app.set('trust proxy', true);

const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGIN === '*') return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin) || origin === ALLOWED_ORIGIN) return cb(null, true);
    return cb(new Error('CORS: origem não permitida: ' + origin), false);
  },
  credentials: true
}));
app.options('*', cors());

const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'db.json');
function ensureDirs() {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify({ notas: [], canhotos: [] }, null, 2), 'utf8');
}
ensureDirs();
async function readDB() { try { return JSON.parse(await fsp.readFile(dbFile, 'utf8') || '{"notas":[],"canhotos":[]}'); } catch { return { notas: [], canhotos: [] }; } }
async function writeDB(db) { await fsp.writeFile(dbFile, JSON.stringify(db, null, 2), 'utf8'); }

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${(file.originalname||'arquivo').replace(/\s+/g, '_')}`)
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => cb(null, /pdf|png|jpg|jpeg/i.test((file.mimetype||'')) )
});

function absoluteBase(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

// Health
app.get('/api/health', (req, res) => res.json({ ok:true, ts: new Date().toISOString() }));

// --------- Notas ---------
app.post('/api/notas', upload.single('arquivo'), async (req, res) => {
  try {
    const { numero, data } = req.body || {};
    if (!numero || !data) return res.status(400).json({ ok:false, error:'Campos obrigatórios: numero e data.' });
    if (!req.file) return res.status(400).json({ ok:false, error:'Arquivo (arquivo) é obrigatório.' });

    const fileRelPath = `/uploads/${req.file.filename}`;
    const fileAbsUrl = `${absoluteBase(req)}${fileRelPath}`;

    const db = await readDB();
    const record = {
      id: uuidv4(), tipo: 'nota',
      numero: String(numero).trim(),
      data: String(data).trim(),
      originalname: req.file.originalname, filename: req.file.filename,
      path: fileRelPath, url: fileAbsUrl,
      uploadedAt: new Date().toISOString()
    };
    db.notas.push(record); await writeDB(db);
    res.status(201).json({ ok:true, nota: record });
  } catch (e) {
    console.error('POST /api/notas', e);
    res.status(500).json({ ok:false, error:'Erro interno ao enviar a nota.' });
  }
});

app.get('/api/notas/:numero', async (req, res) => {
  try {
    const numero = String(req.params.numero||'').trim();
    const db = await readDB();
    const matches = db.notas.filter(n => n.numero === numero);
    if (!matches.length) return res.status(404).json({ ok:false, error:'Nota não encontrada.' });
    const nota = matches[matches.length-1];
    res.json({ ok:true, nota });
  } catch (e) {
    console.error('GET /api/notas/:numero', e);
    res.status(500).json({ ok:false, error:'Erro interno na busca.' });
  }
});

// --------- Canhotos ---------
app.post('/api/canhotos', upload.single('arquivo'), async (req, res) => {
  try {
    const { loja, numero } = req.body || {};
    if (!loja || !numero) return res.status(400).json({ ok:false, error:'Campos obrigatórios: loja e numero.' });
    if (!req.file) return res.status(400).json({ ok:false, error:'Arquivo (arquivo) é obrigatório.' });

    const fileRelPath = `/uploads/${req.file.filename}`;
    const fileAbsUrl = `${absoluteBase(req)}${fileRelPath}`;

    const db = await readDB();
    const record = {
      id: uuidv4(), tipo: 'canhoto',
      loja: String(loja).trim(),
      numero: String(numero).trim(),
      originalname: req.file.originalname, filename: req.file.filename,
      path: fileRelPath, url: fileAbsUrl,
      uploadedAt: new Date().toISOString()
    };
    db.canhotos.push(record); await writeDB(db);
    res.status(201).json({ ok:true, canhoto: record });
  } catch (e) {
    console.error('POST /api/canhotos', e);
    res.status(500).json({ ok:false, error:'Erro interno ao enviar o canhoto.' });
  }
});

// Buscar por loja + numero
app.get('/api/canhotos', async (req, res) => {
  try {
    const loja = String(req.query.loja||'').trim();
    const numero = String(req.query.numero||'').trim();
    if (!loja || !numero) return res.status(400).json({ ok:false, error:'Informe loja e numero.' });
    const db = await readDB();
    const matches = db.canhotos.filter(c => c.loja === loja && c.numero === numero);
    if (!matches.length) return res.status(404).json({ ok:false, error:'Canhoto não encontrado.' });
    const last = matches[matches.length-1];
    res.json({ ok:true, total: matches.length, ultimo: last, canhotos: matches.slice().reverse() });
  } catch (e) {
    console.error('GET /api/canhotos', e);
    res.status(500).json({ ok:false, error:'Erro interno na busca de canhotos.' });
  }
});

app.get('/api/canhotos/:id', async (req, res) => {
  try {
    const id = String(req.params.id||'').trim();
    const db = await readDB();
    const c = db.canhotos.find(x => x.id === id);
    if (!c) return res.status(404).json({ ok:false, error:'Não encontrado.' });
    res.json({ ok:true, canhoto: c });
  } catch (e) {
    res.status(500).json({ ok:false, error:'Erro interno.' });
  }
});

app.listen(PORT, () => console.log(`✅ Backend v5 na porta ${PORT}`));