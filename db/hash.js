// lib/hash.js
// Substitui a função hashSHA256() do Google Apps Script (Utilities.computeDigest).
// Gera exatamente o mesmo resultado: SHA-256 em hexadecimal minúsculo.

const crypto = require('crypto');

function hashSHA256(texto) {
  return crypto.createHash('sha256').update(texto, 'utf8').digest('hex');
}

module.exports = { hashSHA256 };
