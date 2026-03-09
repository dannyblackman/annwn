#!/usr/bin/env node
/**
 * Encrypts the protected content in deck.html using AES-256-GCM.
 * The password is passed via DECK_PASSWORD env var.
 *
 * Usage:
 *   DECK_PASSWORD=annwn2026 node build.js
 *
 * The encrypted deck.html will have the slide content replaced with
 * an encrypted blob that only decrypts with the correct password.
 * The source deck.html in git remains readable for editing.
 * This script is run during CI deployment.
 */

const crypto = require('crypto');
const fs = require('fs');

const password = process.env.DECK_PASSWORD;
if (!password) {
  console.error('Error: DECK_PASSWORD environment variable is required');
  process.exit(1);
}

const START = '<!--PROTECTED_START-->';
const END = '<!--PROTECTED_END-->';

const source = fs.readFileSync('deck.html', 'utf8');

const startIdx = source.indexOf(START);
const endIdx = source.indexOf(END);

if (startIdx === -1 || endIdx === -1) {
  console.error('Error: Could not find PROTECTED markers in deck.html');
  process.exit(1);
}

const protectedContent = source.substring(startIdx + START.length, endIdx);

// Encrypt with AES-256-GCM
const salt = crypto.randomBytes(16);
const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
let encrypted = cipher.update(protectedContent, 'utf8', 'base64');
encrypted += cipher.final('base64');
const tag = cipher.getAuthTag();

const blob = JSON.stringify({
  s: salt.toString('base64'),
  i: iv.toString('base64'),
  t: tag.toString('base64'),
  d: encrypted
});

// Replace the protected content with the encrypted blob
const before = source.substring(0, startIdx);
const after = source.substring(endIdx + END.length);
const replacement = `<script>const ENCRYPTED_DECK=${blob};</script>`;

const output = before + replacement + after;
fs.writeFileSync('deck.html', output);

console.log(`Encrypted ${protectedContent.length} chars of deck content`);
