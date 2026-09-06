import React, { useState } from 'react';
import { db, auth } from '../lib/firebase';
import { Globe2, CheckCircle2, XCircle, Loader2, Copy, ExternalLink, Lock, ShieldCheck, ScanSearch } from 'lucide-react';

async function authedJson(url, opts = {}) {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const r = await fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  let data = {};
  try {
    data = await r.json();
  } catch {
    // The server sent something that wasn't JSON (e.g. a crashed function's HTML
    // error page). Don't let that raw parse error leak to the UI — fall through
    // to the generic message below instead.
  }
  if (!r.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export default function Sites({ sites, site, setSite }) {
  const [url, setUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewErr, setPreviewErr] = useState('');

  const [tag, setTag] = useState(null);
  const [tagLoading, setTagLoading] = useState(false);
  const [tagErr, setTagErr] = useState('');
  const [copied, setCopied] = useState(false);

  const [checking, setChecking] = useState(false);
  const [checkErr, setCheckErr] = useState('');
  const [verified, setVerified] = useState(false);

  const [connecting, setConnecting] = useState(false);
  const [connectErr, setConnectErr] = useState('');

  const canAdd = !sites.length || sites.some(s => s.plan === 'pro');

  function resetVerification() {
    setTag(null); setTagErr(''); setChecking(false); setCheckErr(''); setVerified(false); setConnectErr('');
  }

  async function loadTag(targetUrl) {
    setTagLoading(true); setTagErr('');
    try {
      const data = await authedJson('/api/verification-tag?url=' + encodeURIComponent(targetUrl));
      setTag(data);
    } catch (e) {
      setTagErr(e.message || 'Could not generate a verification tag');
    } finally {
      setTagLoading(false);
    }
  }

  async function previewSite() {
    if (!auth.currentUser) return setPreviewErr('Please sign in again.');
    if (sites.length > 0 && !sites.some(s => s.plan === 'pro')) return setPreviewErr('Free includes one site. Upgrade to Pro to add another site.');
    setPreviewErr(''); setPreview(null); resetVerification();
    try {
      setPreviewLoading(true);
      const data = await authedJson('/api/inspect-site?url=' + encodeURIComponent(url));
      setPreview(data);
      loadTag(data.url);
    } catch (e) {
      setPreviewErr(e.message || 'Could not reach that site');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function checkTag() {
    setChecking(true); setCheckErr(''); setVerified(false);
    try {
      const data = await authedJson('/api/verify-site?url=' + encodeURIComponent(preview.url));
      if (data.verified) setVerified(true);
      else setCheckErr(data.error || "We couldn't find the tag yet.");
    } catch (e) {
      setCheckErr(e.message || 'Could not check verification');
    } finally {
      setChecking(false);
    }
  }

  async function connectSite() {
    setConnecting(true); setConnectErr('');
    try {
      const data = await authedJson('/api/create-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: preview.url })
      });
      setSite(data.site);
      setUrl(''); setPreview(null); resetVerification();
      try {
        const token = await auth.currentUser.getIdToken();
        const scan = await fetch('/api/initial-scan', { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body:JSON.stringify({siteId:data.site.id}) });
        const scanData = await scan.json().catch(()=>({}));
        if (!scan.ok) console.warn('Initial scan failed:', scanData.error);
      } catch (e) { console.warn('Initial scan skipped:', e); }
    } catch (e) {
      setConnectErr(e.message || 'Could not connect site');
      // The tag could have been removed between the check and now — don't
      // leave a stale "verified" button showing if the server just rejected it.
      setVerified(false);
    } finally {
      setConnecting(false);
    }
  }

  return (
    <>
      <div className="pageHead">
        <div>
          <div className="eyebrow">WEBSITES</div>
          <h1>Your sites</h1>
          <p className="muted">Verify a site before connecting it. Free includes one site; Pro unlocks multiple sites and site switching.</p>
        </div>
      </div>

      <div className="card addSite">
        <h3>Add a website</h3>
        <div className="urlRow">
          <input
            value={url}
            onChange={e => { setUrl(e.target.value); setPreview(null); setPreviewErr(''); resetVerification(); }}
            onKeyDown={e => e.key === 'Enter' && previewSite()}
            placeholder="https://example.com"
            inputMode="url"
          />
          <button className="primary" disabled={previewLoading || !url.trim() || !canAdd} onClick={previewSite}>
            {previewLoading ? <Loader2 className="spin" /> : canAdd ? 'Verify site' : <><Lock size={16} />Pro only</>}
          </button>
        </div>
        {!canAdd && <p className="muted">You already have a Free site. <a className="link" href="/billing">Upgrade to Pro</a> to connect more.</p>}
        {previewErr && <div className="error">{previewErr}</div>}
        {preview && (
          <div className="verifyResult">
            <CheckCircle2 />
            <div><b>{preview.name}</b><span>{preview.articleCount} public articles/posts found</span><small>{preview.url}</small></div>
          </div>
        )}

        {preview && (
          <div className="ownershipCheck">
            <h4><ShieldCheck size={16} /> Prove you own this site</h4>
            <p className="muted">Anyone can point WyDoc at a URL, so before we connect it we need to see this tag on the live page. Paste it inside the <code>&lt;head&gt;</code> of <b>{preview.url}</b>, publish, then check below.</p>
            {tagLoading && <Loader2 className="spin" />}
            {tagErr && <div className="error">{tagErr}</div>}
            {tag && (
              <>
                <pre>{tag.metaTag}</pre>
                <button className="secondary" onClick={() => { navigator.clipboard?.writeText(tag.metaTag); setCopied(true); }}>
                  <Copy size={16} />{copied ? 'Copied' : 'Copy tag'}
                </button>
                <div className="checkRow">
                  <button className="secondary" disabled={checking} onClick={checkTag}>
                    {checking ? <Loader2 className="spin" /> : "I've added the tag — Check now"}
                  </button>
                  {verified && <span className="verifiedBadge"><CheckCircle2 size={16} /> Verified</span>}
                </div>
                {checkErr && <div className="error"><XCircle size={14} /> {checkErr}</div>}
              </>
            )}

            {verified && (
              <div className="connectRow">
                <button className="primary wide" disabled={connecting} onClick={connectSite}>
                  {connecting ? <Loader2 className="spin" /> : 'Connect site'}
                </button>
                {connectErr && <div className="error">{connectErr}</div>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="cardTitle">
          <h3>Connected sites</h3>
          <span className="muted">{sites.length}{sites.some(s => s.plan === 'pro') ? ' · Pro' : ' / 1 free'}</span>
        </div>
        {sites.map(s => (
          <div className="siteRow" key={s.id}>
            <Globe2 className="siteRowIcon" />
            <div className="siteRowInfo"><b>{s.name}</b><small>{s.url} · {s.articleCount ?? 0} posts found</small></div>
            <button className="secondary siteOpen" onClick={() => { setSite(s); window.scrollTo({top:0,behavior:"smooth"}); }}>Open</button>
          </div>
        ))}
        {!sites.length && <div className="emptyMini">No sites connected yet.</div>}
      </div>

      {site && (
        <div className="card integration">
          <h3>Integration</h3>
          <p className="muted">Place this once in your site's header. It reports page changes to WyDoc without sending your article body.</p>
          <pre>{`<script src="${window.location.origin}/widget.js" data-site-id="${site.id}" data-token="${site.integrationToken || 'YOUR_SITE_TOKEN'}" async></script>`}</pre>
          <p className="tiny">The site token is used by the public widget to authenticate change events. Treat it as a site integration credential and regenerate it if abused.</p>
          <button className="secondary" onClick={() => { navigator.clipboard?.writeText(`<script src="${window.location.origin}/widget.js" data-site-id="${site.id}" data-token="${site.integrationToken || 'YOUR_SITE_TOKEN'}" async></script>`); setCopied(true); }}>
            <Copy size={16} />{copied ? 'Copied' : 'Copy snippet'}
          </button>
        </div>
      )}
    </>
  );
}
