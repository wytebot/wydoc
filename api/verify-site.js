import { bearerUser } from './_firebase-admin.js';
import { fetchSiteHtml, findVerificationTag } from './_site-fetch.js';
import { verificationToken } from './_verification.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const user = await bearerUser(req);
    const raw = req.query?.url;
    if (!raw) return res.status(400).json({ error: 'URL is required' });
    const { finalUrl, html } = await fetchSiteHtml(raw);
    const expected = verificationToken(user.uid, finalUrl);
    const found = findVerificationTag(html);
    if (!found || found !== expected) {
      return res.status(200).json({ ok: true, verified: false, error: "We couldn't find the verification tag in that site's <head>. Add it and try again — it can take a minute to appear after you publish." });
    }
    return res.status(200).json({ ok: true, verified: true, url: finalUrl });
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Could not check verification' });
  }
}
