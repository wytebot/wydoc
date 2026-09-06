import crypto from 'crypto';
import { bearerUser, adminDb } from './_firebase-admin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { cleanUrl, fetchSiteHtml, discoverArticles, findVerificationTag } from './_site-fetch.js';
import { verificationToken } from './_verification.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const user = await bearerUser(req);
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const url = cleanUrl(String(body.url || ''));

    const own = await adminDb.collection('sites').where('ownerId', '==', user.uid).get();
    const isPro = own.docs.some(d => d.data().plan === 'pro') || ((await adminDb.collection('users').doc(user.uid).get()).data()?.plan === 'pro');
    const replaceSiteId = String(body.replaceSiteId || '');
    if (own.docs.some(d => d.data().url === url)) return res.status(409).json({ error: 'That site is already connected.' });
    if (own.size >= 1 && !isPro && !replaceSiteId) return res.status(403).json({ error: 'Free includes one site. Choose Replace existing site or upgrade to Pro.' });
    if (replaceSiteId) {
      if (isPro) return res.status(400).json({ error: 'Site replacement is intended for Free accounts. Pro accounts can keep multiple sites.' });
      const replaceDoc = own.docs.find(d => d.id === replaceSiteId);
      if (!replaceDoc) return res.status(404).json({ error: 'The site you want to replace could not be found.' });
    }

    // Re-fetch and re-verify ownership server-side. Never trust the client's
    // claim that a site was verified — someone could call this endpoint
    // directly with any URL, so the tag check has to happen again right here.
    const { final, finalUrl, html } = await fetchSiteHtml(url);
    const expected = verificationToken(user.uid, finalUrl);
    const found = findVerificationTag(html);
    if (!found || found !== expected) {
      return res.status(403).json({ error: "We couldn't find your verification tag in that site's <head>. Add it and try again." });
    }

    // Pull fresh name/article data from our own fetch rather than trusting the
    // client-supplied values, so a spoofed request can't fake this metadata.
    const { name, articleCount, discovered } = await discoverArticles(final, html);

    const siteData = {
      ownerId: user.uid,
      url: finalUrl,
      name,
      articleCount,
      discovered,
      score: null,
      plan: isPro ? 'pro' : 'free',
      createdAt: FieldValue.serverTimestamp(),
      verifiedAt: FieldValue.serverTimestamp(),
      integrationToken: crypto.randomBytes(24).toString('hex')
    };

    if (replaceSiteId) {
      const newRef = adminDb.collection('sites').doc();
      const oldRef = adminDb.collection('sites').doc(replaceSiteId);
      await adminDb.runTransaction(async tx => {
        const oldSnap = await tx.get(oldRef);
        if (!oldSnap.exists || oldSnap.data().ownerId !== user.uid) throw new Error('The site you want to replace could not be found.');
        tx.delete(oldRef);
        tx.set(newRef, siteData);
      });
      const snap = await newRef.get();
      return res.status(201).json({ ok: true, replaced: replaceSiteId, site: { id: newRef.id, ...snap.data() } });
    }

    const ref = await adminDb.collection('sites').add(siteData);
    const snap = await ref.get();
    return res.status(201).json({ ok: true, site: { id: ref.id, ...snap.data() } });
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Could not create site' });
  }
}
