'use strict';

const { generatePdf, generatePng, generateBoth } = require('../services/render.service');

/**
 * POST /api/generate
 *
 * Body (JSON):
 *   {
 *     byDay: { 'yyyy-MM-dd': [ eventObj, … ] },   // from upload step
 *     format: 'pdf' | 'png' | 'both'
 *   }
 *
 * Returns:
 *   - format=pdf  → application/pdf
 *   - format=png  → image/png
 *   - format=both → application/json with base64 fields { pdf, png }
 */
async function generateCalendar(req, res) {
  try {
    const { byDay, format = 'pdf' } = req.body;

    if (!byDay || typeof byDay !== 'object') {
      return res.status(400).json({
        error: 'Données manquantes.',
        detail: 'Le champ "byDay" est requis et doit être un objet JSON.',
      });
    }

    const validFormats = ['pdf', 'png', 'both'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({
        error: 'Format invalide.',
        detail: `Le format doit être l'un de : ${validFormats.join(', ')}.`,
      });
    }

    console.log(`[generate.controller] Generating ${format.toUpperCase()} for ${Object.keys(byDay).length} days…`);

    if (format === 'pdf') {
      const buffer = await generatePdf(byDay);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="agenda-ejp-mai-2026.pdf"',
        'Content-Length': buffer.length,
      });
      return res.send(buffer);
    }

    if (format === 'png') {
      const buffer = await generatePng(byDay);
      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="agenda-ejp-mai-2026.png"',
        'Content-Length': buffer.length,
      });
      return res.send(buffer);
    }

    // format === 'both'
    const { pdf, png } = await generateBoth(byDay);
    return res.status(200).json({
      success: true,
      pdf: pdf.toString('base64'),
      png: png.toString('base64'),
    });
  } catch (err) {
    console.error('[generate.controller] Error:', err);
    return res.status(500).json({
      error: 'Erreur lors de la génération du calendrier.',
      detail: err.message || 'Erreur interne du serveur.',
    });
  }
}

module.exports = { generateCalendar };
