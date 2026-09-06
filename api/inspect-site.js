import { fetchSiteHtml, discoverArticles } from './_site-fetch.js';

export default async function handler(req, res) {
  try {
    if (req.method && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const raw = req.query?.url;
    if (!raw) return res.status(400).json({ error: 'URL is required' });
    const { final, html } = await fetchSiteHtml(raw);
    const { name, articleCount, discovered } = await discoverArticles(final, html);
    return res.status(200).json({ ok: true, url: final.toString().replace(/\/$/, ''), name, articleCount, discovered });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Inspection failed' });
  }
}
