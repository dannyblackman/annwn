#!/usr/bin/env node
/**
 * Generates a PDF from deck.html using Puppeteer.
 * Run BEFORE build.js (encryption) so the deck is readable without a password.
 *
 * Usage:
 *   node generate-pdf.js
 */

const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Set a wide desktop viewport so mobile styles don't apply
  await page.setViewport({ width: 1440, height: 900 });

  const filePath = 'file://' + path.resolve(__dirname, 'deck.html');
  await page.goto(filePath, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for any animations/fonts to settle
  await new Promise(r => setTimeout(r, 2000));

  // Set count-up elements to their final values (same as beforeprint handler)
  await page.evaluate(() => {
    document.querySelectorAll('.count-up').forEach(el => {
      const t = parseInt(el.dataset.target);
      const p = el.dataset.prefix || '';
      const s = el.dataset.suffix || '';
      el.textContent = p + t + s;
    });
  });

  await page.pdf({
    path: path.resolve(__dirname, 'annwn-deck.pdf'),
    landscape: true,
    printBackground: true,
    format: 'A4',
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  console.log('Generated annwn-deck.pdf');
  await browser.close();
})();
