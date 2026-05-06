'use strict';

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const { uploadIcs } = require('./controllers/upload.controller');
const { generateCalendar } = require('./controllers/generate.controller');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── Multer (file upload) ─────────────────────────────────────────────────────

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.ics') {
      return cb(new Error('Seuls les fichiers .ics sont acceptés.'));
    }
    cb(null, true);
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Upload + parse ICS
app.post(
  '/api/upload-ics',
  upload.single('file'),
  (err, req, res, next) => {
    // Multer error handler
    if (err) {
      return res.status(400).json({
        error: 'Erreur lors du téléversement.',
        detail: err.message,
      });
    }
    next();
  },
  uploadIcs
);

// Generate PDF/PNG
app.post('/api/generate', generateCalendar);

// ─── Global error handler ─────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({
    error: 'Erreur interne du serveur.',
    detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Route introuvable : ${req.method} ${req.path}` });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ Agenda Generator backend running on http://localhost:${PORT}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
