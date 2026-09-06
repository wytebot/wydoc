import { bearerUser, adminDb } from './_firebase-admin.js';
import { runSiteScan } from './scan-site.js';
import { runAiScan } from './ai-scan.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const user = await bearerUser(req);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const siteId = String(body.siteId || '');
    if (!siteId) return res.status(400).json({ error: 'siteId is required' });

    const s = await adminDb.collection('sites').doc(siteId).get();
    if (!s.exists || s.data().ownerId !== user.uid) return res.status(404).json({ error: 'Site not found' });

    // Structural checks and AI research are independent. Do not throw away a
    // successful structural report just because the optional AI provider is
    // unavailable or misconfigured.
    const [structuralResult, aiResult] = await Promise.allSettled([
      runSiteScan(siteId),
      runAiScan(siteId)
    ]);

    const structural = structuralResult.status === 'fulfilled'
      ? structuralResult.value
      : { scanned: 0, issuesCreated: 0, structuralError: structuralResult.reason?.message || 'Structural scan failed' };
    const ai = aiResult.status === 'fulfilled'
      ? aiResult.value
      : { claimsChecked: 0, issuesCreated: 0, score: null, pagesScanned: 0, deadCitations: 0, stalePages: 0, aiError: aiResult.reason?.message || 'AI scan failed' };

    return res.status(200).json({
      ok: true,
      ...structural,
      ...ai,
      issuesCreated: (structural.issuesCreated || 0) + (ai.issuesCreated || 0)
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Initial scan failed' });
  }
}
