'use strict';

const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');
const { buildCalendarGrid } = require('./calendarBuilder.service');

const TEMPLATE_PATH = path.join(__dirname, '../templates/calendar.ejs');

/**
 * Resolve Chromium executable path.
 * Priority: env variable → system Chrome (macOS) → bundled Puppeteer → Docker Alpine path.
 */
function getChromiumPath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const fs = require('fs');
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  try {
    return puppeteer.executablePath();
  } catch {
    return '/usr/bin/chromium-browser';
  }
}

/**
 * Launch a Puppeteer browser instance with safe sandbox settings.
 */
async function launchBrowser() {
  return puppeteer.launch({
    executablePath: getChromiumPath(),
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  });
}

/**
 * Render the calendar HTML for a given byDay event map.
 *
 * @param {Object} byDay  Events grouped by date key
 * @returns {string} Rendered HTML string
 */
async function renderHtml(byDay) {
  const grid = buildCalendarGrid(byDay);
  const html = await ejs.renderFile(TEMPLATE_PATH, {
    weeks: grid.weeks,
    daysOfWeek: grid.daysOfWeek,
    daysOfWeekFull: grid.daysOfWeekFull,
    allEventsList: grid.allEventsList,
    meta: grid.meta,
  });
  return html;
}

/**
 * Generate a PDF buffer from the calendar data.
 *
 * @param {Object} byDay
 * @returns {Buffer} PDF buffer
 */
async function generatePdf(byDay) {
  const html = await renderHtml(byDay);
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.fonts.ready, { timeout: 5000 }).catch(() => {});

    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/**
 * Generate a PNG buffer from the calendar data.
 *
 * @param {Object} byDay
 * @returns {Buffer} PNG buffer
 */
async function generatePng(byDay) {
  const html = await renderHtml(byDay);
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();

    // A4 landscape at 96dpi ≈ 1123 x 794, scale up 2x for crisp output
    await page.setViewport({ width: 1587, height: 1123, deviceScaleFactor: 1.5 });

    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.fonts.ready, { timeout: 5000 }).catch(() => {});

    const png = await page.screenshot({
      fullPage: true,
      type: 'png',
      omitBackground: false,
    });

    return Buffer.from(png);
  } finally {
    await browser.close();
  }
}

/**
 * Generate both PDF and PNG.
 *
 * @param {Object} byDay
 * @returns {{ pdf: Buffer, png: Buffer }}
 */
async function generateBoth(byDay) {
  const [pdf, png] = await Promise.all([generatePdf(byDay), generatePng(byDay)]);
  return { pdf, png };
}

module.exports = { renderHtml, generatePdf, generatePng, generateBoth };
