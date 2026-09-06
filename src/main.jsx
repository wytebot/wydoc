import React,{useEffect,useState} from 'react'; import {createRoot} from 'react-dom/client'; import {BrowserRouter} from 'react-router-dom'; import {onAuthStateChanged,auth} from './lib/firebase'; import App from './App'; import './styles.css';
const WYDOC_BUILD='2026-09-06-v17';
async function refreshServiceWorker(){
  if(!('serviceWorker' in navigator)) return;
  const marker='wydoc-sw-migrated-v17';
  try{
    const regs=await navigator.serviceWorker.getRegistrations();
    const old=regs.filter(r=>r.scope===location.origin+'/' || r.active?.scriptURL?.includes('/wydoc-sw.js') || r.waiting?.scriptURL?.includes('/wydoc-sw.js') || r.installing?.scriptURL?.includes('/wydoc-sw.js'));
    const migrated=sessionStorage.getItem(marker)==='1';
    if(!migrated && old.length){
      await Promise.all(old.map(r=>r.unregister().catch(()=>false)));
      sessionStorage.setItem(marker,'1');
    }
    const reg=await navigator.serviceWorker.register('/wydoc-sw.js?v='+encodeURIComponent(WYDOC_BUILD),{updateViaCache:'none',scope:'/'});
    await reg.update().catch(()=>{});
    if(!migrated && old.length){
      await new Promise(r=>setTimeout(r,150));
      if(!sessionStorage.getItem('wydoc-sw-reloaded-v17')){
        sessionStorage.setItem('wydoc-sw-reloaded-v17','1');
        location.reload();
      }
    }
  }catch(e){console.warn('Service worker refresh skipped:',e)}
}
function Root(){const [user,setUser]=useState(undefined); useEffect(()=>{onAuthStateChanged(auth,setUser); void refreshServiceWorker();},[]); if(user===undefined)return <div className="splash"><img src="/icon-192.png" alt="" width="56" height="56" style={{borderRadius:14,marginBottom:14}}/>WyDoc</div>; return <App user={user}/>}
createRoot(document.getElementById('root')).render(<BrowserRouter><Root/></BrowserRouter>);
