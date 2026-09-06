import { bearerUser } from './_firebase-admin.js';
import { cleanUrl } from './_site-fetch.js';
import { verificationToken, verificationMetaTag } from './_verification.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const user = await bearerUser(req);
    const raw = req.query?.url;
    if (!raw) return res.status(400).json({ error: 'URL is required' });
    const url = cleanUrl(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const token = verificationToken(user.uid, url);
    return res.status(200).json({ ok: true, url, token, metaTag: verificationMetaTag(token) });
  } catch (e) {
    return res.status(401).json({ error: e.message || 'Could not generate verification tag' });
  }
}
