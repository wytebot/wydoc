import React,{useEffect,useRef,useState} from 'react';
import {NavLink,useNavigate} from 'react-router-dom';
import {LayoutDashboard,ShieldCheck,Globe2,Bell,BookOpen,ChevronDown,CreditCard,HelpCircle,Settings,LogOut,Menu,X,Info,LockKeyhole} from 'lucide-react';
import {signOut,auth} from '../lib/firebase';
const links=[['/','Dashboard',LayoutDashboard],['/issues','Issues',ShieldCheck],['/sites','Sites',Globe2],['/notifications','Notifications',Bell],['/how-it-works','How it works',BookOpen],['/billing','Billing',CreditCard]];
export default function Layout({children,user,site,setSite,sites}){
  const [mobile,setMobile]=useState(false); const nav=useNavigate(); const asideRef=useRef(null);
  useEffect(()=>{ if(!mobile) return; const close=()=>setMobile(false); window.addEventListener('resize',close); document.body.style.overflow='hidden'; return()=>{window.removeEventListener('resize',close);document.body.style.overflow='';}; },[mobile]);
  useEffect(()=>{ const onKey=e=>e.key==='Escape'&&setMobile(false); document.addEventListener('keydown',onKey); return()=>document.removeEventListener('keydown',onKey); },[]);
  const closeAnd=(path)=>{setMobile(false);nav(path)};
  const doSignOut=async()=>{setMobile(false);try{await signOut(auth);nav('/')}catch(e){console.error('Sign out failed',e)}};
  return <div className="shell">
    {mobile&&<button className="menuBackdrop" aria-label="Close menu" onClick={()=>setMobile(false)} onTouchStart={()=>setMobile(false)}/>} 
    <aside ref={asideRef} className={'sidebar '+(mobile?'mobileOpen':'')}>
      <div className="brand"><img src="/icon-192.png" alt="" className="brandMark"/>Wy<span>Doc</span></div>
      <div className="siteBox"><div className="muted">ACTIVE SITE</div><div className="siteSelectWrap"><button onClick={()=>closeAnd('/sites')} className="siteSelect">{site?.name||'Add your first site'} <ChevronDown size={16}/></button>{site&&<button className="siteChangeBtn" onClick={()=>closeAnd('/sites')} title="Change connected site">Change site</button>}</div></div>
      <nav>{links.map(([p,l,I])=><NavLink key={p} to={p} end={p==='/' } onClick={()=>setMobile(false)}><I size={18}/><span>{l}</span></NavLink>)}</nav>
      <div className="navBottom">
        <NavLink to="/settings" onClick={()=>setMobile(false)}><Settings size={18}/>Settings</NavLink>
        <NavLink to="/about" onClick={()=>setMobile(false)}><Info size={18}/>About</NavLink>
        <NavLink to="/privacy" onClick={()=>setMobile(false)}><LockKeyhole size={18}/>Privacy</NavLink>
        <NavLink to="/terms" onClick={()=>setMobile(false)}><HelpCircle size={18}/>Terms</NavLink>
        <button className="signOutBtn" onClick={doSignOut}><LogOut size={18}/>Sign out</button>
      </div>
    </aside>
    <main className="main" onTouchStart={()=>mobile&&setMobile(false)}>
      <header className="topbar"><button className="iconBtn mobileOnly" onTouchStart={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();setMobile(v=>!v)}} aria-label={mobile?'Close menu':'Open menu'}>{mobile?<X/>:<Menu/>}</button><div className="crumb">{site?.name||'Workspace'}</div><div className="topActions"><button className="bell" onClick={()=>nav('/notifications')} aria-label="Notifications"><Bell size={19}/>{site?.unread?<i/>:null}</button><div className="avatar">{user?.displayName?.[0]||user?.email?.[0]||'U'}</div></div></header>
      <section className="content">{children}</section><nav className="bottomNav">{links.slice(0,4).map(([p,l,I])=><NavLink key={p} to={p} end={p==='/' }><I size={19}/><small>{l}</small></NavLink>)}</nav>
    </main>
  </div>
}
