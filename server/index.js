import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory data store for heroes
let heroes = [
  { id: 11, name: 'Dr Nice' },
  { id: 12, name: 'Narco' },
  { id: 13, name: 'Bombasto' },
  { id: 14, name: 'Celeritas' },
  { id: 15, name: 'Magneta' },
  { id: 16, name: 'RubberMan' },
  { id: 17, name: 'Dynama' },
  { id: 18, name: 'Dr IQ' },
  { id: 19, name: 'Magma' },
  { id: 20, name: 'Tornado' }
];

// Helper to log with timestamp
const log = (msg) => console.log(`[HeroService API] ${new Date().toISOString()} - ${msg}`);

// GET /api/heroes (optionally filter by name query param similar to Angular tutorial)
app.get('/api/heroes', (req, res) => {
  const { name } = req.query;
  if (typeof name === 'string' && name.trim() !== '') {
    const term = name.trim().toLowerCase();
    const found = heroes.filter(h => h.name.toLowerCase().includes(term));
    log(`search heroes term="${name}" -> ${found.length} hit(s)`);
    return res.json(found);
  }
  log(`fetched ${heroes.length} heroes`);
  res.json(heroes);
});

// GET /api/heroes/:id
app.get('/api/heroes/:id', (req, res) => {
  const id = Number(req.params.id);
  const hero = heroes.find(h => h.id === id);
  if (!hero) return res.status(404).json({ message: `Hero id=${id} not found` });
  log(`fetched hero id=${id}`);
  res.json(hero);
});

// POST /api/heroes
app.post('/api/heroes', (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ message: 'Name is required' });
  }
  const clean = name.trim();
  const id = heroes.length ? Math.max(...heroes.map(h => h.id)) + 1 : 11;
  const newHero = { id, name: clean };
  heroes.push(newHero);
  log(`added hero w/ id=${id}`);
  res.status(201).json(newHero);
});

// PUT /api/heroes (Angular sample sends whole hero)
app.put('/api/heroes', (req, res) => {
  const { id, name } = req.body || {};
  if (typeof id !== 'number') return res.status(400).json({ message: 'id (number) is required' });
  const idx = heroes.findIndex(h => h.id === id);
  if (idx === -1) return res.status(404).json({ message: `Hero id=${id} not found` });
  if (typeof name === 'string' && name.trim() !== '') {
    heroes[idx].name = name.trim();
  }
  log(`updated hero id=${id}`);
  res.json(heroes[idx]);
});

// DELETE /api/heroes/:id
app.delete('/api/heroes/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = heroes.findIndex(h => h.id === id);
  if (idx === -1) return res.status(404).json({ message: `Hero id=${id} not found` });
  const [deleted] = heroes.splice(idx, 1);
  log(`deleted hero id=${id}`);
  res.json(deleted);
});

// Health endpoint and simple welcome
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'HeroService API', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  log(`Server listening on http://0.0.0.0:${PORT}`);
});
