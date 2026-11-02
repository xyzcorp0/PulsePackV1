/* PULSEPACK V10 — portraits des 140 joueurs de démonstration.
   Images libres via miniatures Wikipedia quand elles existent, sans garantie de disponibilité.
   Les photos fournies localement dans assets/players/<id>.webp ont toujours priorité.
   Les images Wikipédia ne sont pas recadrées ni détourées automatiquement.
*/
(() => {
 'use strict';
 const PHOTO_OVERRIDES = {
  'kylian-mbappe': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Kylian_Mbappe_France_v_Norway_26_June_26-041.jpg?width=640',
  'xavi': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Xavi_Hern%C3%A1ndez_-_002_(cropped).jpg?width=500'
 };
 const OVERRIDES = {
  'lev-yachine':'Lev Yashin', 'ronaldo-nazario':'Ronaldo (Brazilian footballer)',
  'xavi':'Xavi', 'pele':'Pelé', 'kaka':'Kaká', 'cafu':'Cafu',
  'roberto-carlos':'Roberto Carlos (footballer)', 'gavi':'Gavi (footballer)',
  'rodri':'Rodri (footballer, born 1996)', 'pedri':'Pedri',
  'alisson':'Alisson Becker', 'endrick':'Endrick (footballer)',
  'raphinha':'Raphinha', 'joao-neves':'João Neves (footballer, born 2004)',
  'vitinha':'Vitinha (footballer, born 2000)',
  'ronaldinho':'Ronaldinho', 'marquinhos':'Marquinhos (footballer, born 1994)',
  'ronaldo':'Cristiano Ronaldo'
 };
 const cache = new Map();
 const queue = [];
 let running = 0;
 const maxParallel = 3;
 const norm = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const normalizeTitle = t => String(t||'').replace(/\s*\([^)]*\)/g,'');
 function fetchPortrait(id, name) {
   const key = String(id);
   if (cache.has(key)) return cache.get(key);
   const job = new Promise(resolve => { queue.push({id:key,name,resolve}); pump(); });
   cache.set(key,job);
   return job;
 }
 async function request(id,name) {
   const title = OVERRIDES[id] || name;
   try {
     const endpoint = 'https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title.replaceAll(' ','_'));
     const res = await fetch(endpoint, {headers:{Accept:'application/json'}});
     if (!res.ok) return null;
     const data = await res.json();
     const original = norm(name), result = norm(normalizeTitle(data.title));
     const explicit = Boolean(OVERRIDES[id]);
     // Never show a portrait from a loosely matched search result.
     if (!explicit && original !== result && !original.includes(result) && !result.includes(original)) return null;
     const url = data.thumbnail?.source;
     if (!url || !/^https:\/\//.test(url)) return null;
     return {url, page: data.content_urls?.desktop?.page || '', title: data.title || name};
   } catch { return null; }
 }
 function pump(){
   while(running < maxParallel && queue.length){
     const job = queue.shift(); running++;
     request(job.id,job.name).then(job.resolve).finally(()=>{running--;pump();});
   }
 }
 function load(el) {
   if (el.dataset.photoStarted) return;
   el.dataset.photoStarted='1';
   const id=el.dataset.playerId, name=el.dataset.playerName;
   const tmPhoto = window.KP?.BYID?.[id]?.photo;
   const img = document.createElement('img');
   img.className='kp-player-photo'; img.alt='Portrait de '+name;
   img.loading='lazy'; img.decoding='async';
   const fallback=()=>{ img.remove(); el.classList.remove('has-player-photo'); };
   img.onerror=fallback;
   img.onload=()=>el.classList.add('has-player-photo');
   el.appendChild(img);
   // Priority for user-supplied local photos; if missing, try Wikipedia.
   img.onerror=async()=>{
     const remote=await fetchPortrait(id,name);
     if(!el.isConnected || !remote){fallback();return;}
     img.onerror=fallback;
     img.src=remote.url;
     if(remote.page) { img.title='Source : Wikipédia — '+remote.title; el.dataset.photoSource=remote.page; }
   };
   img.src=tmPhoto || PHOTO_OVERRIDES[id] || 'assets/players/'+encodeURIComponent(id)+'.webp';
 }
 const observer=('IntersectionObserver' in window) ? new IntersectionObserver(entries=>{
   for(const entry of entries) if(entry.isIntersecting){observer.unobserve(entry.target);load(entry.target);}
 },{rootMargin:'320px'}) : null;
 function scan(root=document){
   const nodes=root.querySelectorAll?.('.art[data-player-id]')||[];
   nodes.forEach(el=>{if(!el.dataset.photoObserved){el.dataset.photoObserved='1';if(observer)observer.observe(el);else load(el);}});
 }
 let pending=false;
 const schedule=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;scan();});};
 document.addEventListener('DOMContentLoaded',()=>{
   scan(); const host=document.body;
   new MutationObserver(schedule).observe(host,{childList:true,subtree:true});
 });
 window.KP_PORTRAITS={scan,fetchPortrait};
})();
