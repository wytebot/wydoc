import crypto from 'crypto';

// Derived from the Firebase service account secret (already required server config),
// so no extra env var has to be set up for this feature to work.
function secret() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Server is not configured for site verification.');
  return crypto.createHash('sha256').update(raw).digest();
}

// Deterministic: same user + same URL always gets the same token, so the tag a
// user is shown doesn't change between visits and nothing needs to be stored.
export function verificationToken(uid, url) {
  return crypto.createHmac('sha256', secret()).update(`${uid}:${url}`).digest('hex').slice(0, 32);
}

export function verificationMetaTag(token) {
  return `<meta name="wydoc-site-verification" content="${token}" />`;
}
