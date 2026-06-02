const { createHash } = require('crypto');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

// Meta requires: lowercase, trimmed, then SHA-256
function hashEmail(email) {
  if (!email) return null;
  return sha256(email.toLowerCase().trim());
}

// Meta requires: digits only (E.164 without +), then SHA-256
// +998901234567 → 998901234567
function hashPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return sha256(digits);
}

module.exports = { hashEmail, hashPhone };
