/**
 * encryptionService.js
 * AES-256-CBC encryption for external database passwords.
 * Uses Node.js built-in crypto — no extra dependencies.
 *
 * ENCRYPTION_KEY must be 32 bytes (64 hex chars):
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
const crypto = require('crypto');

const ALGO = 'aes-256-cbc';
const KEY_HEX = process.env.ENCRYPTION_KEY || '';

function getKey() {
  if (!KEY_HEX || KEY_HEX.length < 64) {
    throw new Error('ENCRYPTION_KEY env var missing or too short (need 64 hex chars = 32 bytes)');
  }
  return Buffer.from(KEY_HEX, 'hex');
}

/**
 * Encrypt plain text → returns a JSON string: { iv, data }
 */
function encrypt(plainText) {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(String(plainText), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return JSON.stringify({ iv: iv.toString('hex'), data: encrypted });
}

/**
 * Decrypt the JSON string produced by encrypt()
 */
function decrypt(encryptedJson) {
  const key = getKey();
  const { iv, data } = JSON.parse(encryptedJson);
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
