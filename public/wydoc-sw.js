const WYDOC_SW_VERSION = '2026-09-07-v18';

self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });

self.addEventListener('push',event=>{let d={title:'WyDoc alert',body:'A content issue needs your attention.',url:'/issues'};try{d={...d,...event.data.json()}}catch{} event.waitUntil(self.registration.showNotification(d.title,{body:d.body,data:{url:d.url||'/issues'},tag:d.tag||'wydoc'}));});
self.addEventListener('notificationclick',event=>{event.notification.close();const u=event.notification.data?.url||'/';event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('navigate'in c)c.navigate(u).catch(()=>{});if('focus'in c)return c.focus()}return clients.openWindow(u)}));});
