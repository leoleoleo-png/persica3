require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'persica3';
const DATA_FILE     = path.join(__dirname, 'data', 'entries.json');
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');
const UPLOADS_DIR   = path.join(__dirname, 'data', 'uploads'); // inside data/ for easy deployment volume

// Ensure required dirs exist
[path.join(__dirname, 'data'), UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]');
}

const DEFAULT_SETTINGS = {
  siteTitle:    'PERSICA 3',
  instagramUrl: '',
  bandcampUrl:  '',
  spotifyUrl:   ''
};

if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
}

// Multer – disk storage with uuid filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 } // 200 MB
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve uploads from data/uploads/ at the /uploads path
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'persica3secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
}));

// Serve admin panel at /admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// ── Data helpers ──────────────────────────────────────────────────────────────
function readEntries() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeEntries(entries) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2));
}

function readSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ── Public API ────────────────────────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  res.json(readSettings());
});

app.get('/api/entries', (req, res) => {
  // Return in array order — admin controls order via drag-and-drop
  const entries = readEntries().filter(e => e.published !== false);
  res.json(entries);
});

app.get('/api/entries/:id', (req, res) => {
  const entry = readEntries().find(e => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  res.json(entry);
});

// ── Admin auth ────────────────────────────────────────────────────────────────
app.get('/api/admin/check', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// ── Admin settings ────────────────────────────────────────────────────────────
app.get('/api/admin/settings', requireAuth, (req, res) => {
  res.json(readSettings());
});

app.put('/api/admin/settings', requireAuth, (req, res) => {
  const current = readSettings();
  const updated = {
    siteTitle:    String(req.body.siteTitle    ?? current.siteTitle),
    instagramUrl: String(req.body.instagramUrl ?? current.instagramUrl),
    bandcampUrl:  String(req.body.bandcampUrl  ?? current.bandcampUrl),
    spotifyUrl:   String(req.body.spotifyUrl   ?? current.spotifyUrl)
  };
  writeSettings(updated);
  res.json(updated);
});

// ── Admin CRUD ────────────────────────────────────────────────────────────────
app.get('/api/admin/entries', requireAuth, (req, res) => {
  // Return in array order so sidebar reflects the custom display order
  res.json(readEntries());
});

// Reorder — must be before /:id so Express doesn't swallow "reorder" as an id
app.put('/api/admin/entries/reorder', requireAuth, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
  const entries = readEntries();
  const reordered = ids.map(id => entries.find(e => e.id === id)).filter(Boolean);
  // Keep any entries missing from the list at the end (safety net)
  const missing = entries.filter(e => !ids.includes(e.id));
  writeEntries([...reordered, ...missing]);
  res.json({ success: true });
});

app.post('/api/admin/entries', requireAuth, upload.single('file'), (req, res) => {
  const entries = readEntries();
  const now = new Date().toISOString();
  const entry = {
    id: uuidv4(),
    title: req.body.title || '',
    body: req.body.body || '',
    credits: req.body.credits || '',
    mediaType: req.body.mediaType || 'none',
    mediaUrl: req.body.mediaUrl || '',
    mediaFile: req.file ? `/uploads/${req.file.filename}` : '',
    createdAt: now,
    updatedAt: now,
    published: true
  };
  entries.unshift(entry); // newest at top
  writeEntries(entries);
  res.json(entry);
});

app.put('/api/admin/entries/:id', requireAuth, upload.single('file'), (req, res) => {
  const entries = readEntries();
  const idx = entries.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const existing = entries[idx];
  let mediaFile = existing.mediaFile;

  if (req.file) {
    // New file uploaded – replace
    mediaFile = `/uploads/${req.file.filename}`;
  } else if (req.body.clearFile === 'true') {
    // Artist cleared the existing file
    mediaFile = '';
  }

  entries[idx] = {
    ...existing,
    title: req.body.title ?? existing.title,
    body: req.body.body ?? existing.body,
    credits: req.body.credits ?? existing.credits,
    mediaType: req.body.mediaType ?? existing.mediaType,
    mediaUrl: req.body.mediaUrl ?? existing.mediaUrl,
    mediaFile,
    updatedAt: new Date().toISOString()
  };
  writeEntries(entries);
  res.json(entries[idx]);
});

app.delete('/api/admin/entries/:id', requireAuth, (req, res) => {
  let entries = readEntries();
  const entry = entries.find(e => e.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  entries = entries.filter(e => e.id !== req.params.id);
  writeEntries(entries);
  res.json({ success: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\nPERSICA 3 running at http://localhost:${PORT}`);
  console.log(`Admin panel:          http://localhost:${PORT}/admin`);
  console.log(`Admin password:       ${ADMIN_PASSWORD}\n`);
});
