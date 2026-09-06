import * as cheerio from 'cheerio';
import {bearerUser,adminDb} from './_firebase-admin.js';
import {FieldValue} from 'firebase-admin/firestore';

export const config={maxDuration:30};

const MAX_PAGES=4;          // discovered pages scanned per call, keeps this inside serverless time limits
const MAX_LINKS_PER_PAGE=5; // outbound links checked per page
const FETCH_TIMEOUT_MS=4500;
const CURRENT_YEAR=new Date().getFullYear();
const STALE_AFTER=2;        // flag content whose newest mentioned year is this many years behind

function blockedHost(host){const h=host.toLowerCase();return h==='localhost'||h==='127.0.0.1'||h==='0.0.0.0'||h==='::1'||h.endsWith('.localhost')||/^10\./.test(h)||/^192\.168\./.test(h)||/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)}

async function fetchWithTimeout(url,opts={}){
  const ctrl=new AbortController();
  const t=setTimeout(()=>ctrl.abort(),FETCH_TIMEOUT_MS);
  try{return await fetch(url,{...opts,signal:ctrl.signal})}finally{clearTimeout(t)}
}

async function checkLink(url){
  try{
    const u=new URL(url);
    if(!['http:','https:'].includes(u.protocol)||blockedHost(u.hostname))return {url,status:null,broken:false,skipped:true};
    let r=await fetchWithTimeout(url,{method:'HEAD',redirect:'follow',headers:{'user-agent':'WyDocBot/1.0 (+link check)'}});
    if(r.status===405||r.status===403)r=await fetchWithTimeout(url,{method:'GET',redirect:'follow',headers:{'user-agent':'WyDocBot/1.0 (+link check)'}});
    return {url,status:r.status,broken:r.status>=400};
  }catch{return {url,status:null,broken:true}}
}

function findStaleYear(text){
  const years=[...text.matchAll(/\b(19|20)\d{2}\b/g)].map(m=>Number(m[0])).filter(y=>y>=1995&&y<=CURRENT_YEAR);
  const contextHit=/\b(as of|currently|this year|latest|up to date|so far)\b/i.test(text);
  if(!years.length||!contextHit)return null;
  const newest=Math.max(...years);
  if(CURRENT_YEAR-newest>=STALE_AFTER)return newest;
  return null;
}

async function issueExists(siteId,url,type,extra){
  let q=adminDb.collection('issues').where('siteId','==',siteId).where('url','==',url).where('type','==',type).where('resolved','==',false);
  const snap=await q.get();
  if(!extra)return !snap.empty;
  return snap.docs.some(d=>d.data().sourceUrl===extra);
}

async function scanPage(siteId,pageUrl){
  const created=[];
  let html;
  try{
    const r=await fetchWithTimeout(pageUrl,{redirect:'follow',headers:{'user-agent':'WyDocBot/1.0 (+content verification)','accept':'text/html'}});
    if(!r.ok)return created;
    html=await r.text();
  }catch{return created}
  const $=cheerio.load(html);
  const pageOrigin=new URL(pageUrl).origin;
  const links=new Set();
  $('a[href]').each((_,el)=>{
    try{const href=$(el).attr('href');const u=new URL(href,pageUrl);if(u.origin!==pageOrigin&&/^https?:$/.test(u.protocol))links.add(u.toString())}catch{}
  });
  const toCheck=Array.from(links).slice(0,MAX_LINKS_PER_PAGE);
  const results=await Promise.allSettled(toCheck.map(checkLink));
  for(const r of results){
    if(r.status!=='fulfilled')continue;
    const {url,status,broken,skipped}=r.value;
    if(skipped||!broken)continue;
    if(await issueExists(siteId,pageUrl,'citation',url))continue;
    await adminDb.collection('issues').add({
      siteId,url:pageUrl,type:'citation',severity:status&&status<500?'warning':'critical',
      title:'Broken outbound source link',
      summary:`This page links to a source that no longer responds correctly (${status?`HTTP ${status}`:'no response'}). Readers following this citation will hit a dead link.`,
      sourceUrl:url,evidence:`Checked ${new Date().toISOString()} — ${status?`server returned HTTP ${status}`:'request failed or timed out'}.`,
      resolved:false,createdAt:FieldValue.serverTimestamp()
    });
    created.push('citation');
  }
  const text=$('body').text().replace(/\s+/g,' ').slice(0,20000);
  const staleYear=findStaleYear(text);
  if(staleYear&&!(await issueExists(siteId,pageUrl,'outdated'))){
    await adminDb.collection('issues').add({
      siteId,url:pageUrl,type:'outdated',severity:CURRENT_YEAR-staleYear>=4?'warning':'info',
      title:'Content may be describing an outdated "current" state',
      summary:`This page frames ${staleYear} as current or recent ("as of", "currently", "latest"...), but that's ${CURRENT_YEAR-staleYear} year(s) ago. Worth a freshness pass.`,
      evidence:`Detected reference to ${staleYear} alongside recency language; current year is ${CURRENT_YEAR}.`,
      resolved:false,createdAt:FieldValue.serverTimestamp()
    });
    created.push('outdated');
  }
  return created;
}

export default async function handler(req,res){
  try{
    if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
    const user=await bearerUser(req);
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    const siteId=String(body.siteId||'');
    if(!siteId)return res.status(400).json({error:'siteId is required'});
    const siteRef=adminDb.collection('sites').doc(siteId);
    const siteSnap=await siteRef.get();
    if(!siteSnap.exists||siteSnap.data().ownerId!==user.uid)return res.status(404).json({error:'Site not found'});
    const discovered=Array.isArray(siteSnap.data().discovered)?siteSnap.data().discovered:[];
    const pages=discovered.slice(0,MAX_PAGES);
    if(!pages.length)return res.status(200).json({ok:true,scanned:0,issuesCreated:0,note:'No discovered pages to scan yet. Re-verify the site on the Sites page.'});
    const results=await Promise.allSettled(pages.map(p=>scanPage(siteId,p)));
    const issuesCreated=results.reduce((n,r)=>n+(r.status==='fulfilled'?r.value.length:0),0);
    await siteRef.update({lastScanAt:FieldValue.serverTimestamp()});
    return res.status(200).json({ok:true,scanned:pages.length,issuesCreated});
  }catch(e){
    return res.status(500).json({error:e.message||'Scan failed'});
  }
}
