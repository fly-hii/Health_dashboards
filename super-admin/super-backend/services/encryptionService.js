/**
 * encryptionService.js  (AES-256-CBC)
 * Copy of shared service for use in super-admin backend.
 * ENCRYPTION_KEY must be 64 hex chars (32 bytes).
 */
'use strict';
const crypto = require('crypto');
const ALGO = 'aes-256-cbc';

function getKey() {
  const k = process.env.ENCRYPTION_KEY || '';
  if (k.length < 64) throw new Error('ENCRYPTION_KEY must be 64 hex chars');
  return Buffer.from(k, 'hex');
}

function encrypt(plainText) {
  const iv  = crypto.randomBytes(16);
  const c   = crypto.createCipheriv(ALGO, getKey(), iv);
  let enc   = c.update(String(plainText), 'utf8', 'hex');
  enc += c.final('hex');
  return JSON.stringify({ iv: iv.toString('hex'), data: enc });
}

function decrypt(json) {
  const { iv, data } = JSON.parse(json);
  const d = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(iv, 'hex'));
  let out = d.update(data, 'hex', 'utf8');
  out += d.final('utf8');
  return out;
}

module.exports = { encrypt, decrypt };
