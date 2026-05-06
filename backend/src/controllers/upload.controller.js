'use strict';

const { parseIcsBuffer } = require('../services/icsParser.service');

const ALLOWED_MIMETYPES = new Set([
  'text/calendar',
  'application/ics',
  'text/ics',
  'application/octet-stream', // some browsers send this for .ics
]);

/**
 * POST /api/upload-ics
 *
 * Expects multipart/form-data with a single field named "file".
 * Returns parsed events JSON for May 2026.
 */
async function uploadIcs(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Aucun fichier reçu.',
        detail: 'Veuillez envoyer un fichier .ics valide dans le champ "file".',
      });
    }

    const { originalname, mimetype, buffer } = req.file;

    // Validate extension
    const ext = originalname.split('.').pop().toLowerCase();
    if (ext !== 'ics') {
      return res.status(400).json({
        error: 'Extension de fichier invalide.',
        detail: `Le fichier doit avoir l'extension .ics (reçu : .${ext}).`,
      });
    }

    // Validate mime type (allow octet-stream since some OS report it for .ics)
    if (!ALLOWED_MIMETYPES.has(mimetype) && !mimetype.includes('calendar')) {
      return res.status(400).json({
        error: 'Type MIME invalide.',
        detail: `Type MIME non reconnu : "${mimetype}". Attendu : text/calendar.`,
      });
    }

    // Validate non-empty
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({
        error: 'Fichier vide.',
        detail: 'Le fichier .ics envoyé ne contient aucune donnée.',
      });
    }

    // Parse
    const result = parseIcsBuffer(buffer);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('[upload.controller] Error:', err);
    return res.status(500).json({
      error: 'Erreur lors de l\'analyse du fichier ICS.',
      detail: err.message || 'Erreur interne du serveur.',
    });
  }
}

module.exports = { uploadIcs };
