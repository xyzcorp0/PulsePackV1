/* PulsePack V55 — logos officiels fournis par le propriétaire.
   Affichage UNIQUEMENT dans le bandeau supérieur et l’icône du navigateur.
   Thème global synchronisé par auth.js/Supabase. */
(()=>{'use strict';
const logos={normal:'pulse-logo-normal.png',halloween:'pulse-logo-halloween.png',christmas:'pulse-logo-christmas.png',newyear:'pulse-logo-newyear.png',birthday:'pulse-logo-birthday.png',easter:'pulse-logo-easter.png'};
let previous='';
function sync(){
 const root=document.documentElement, body=document.body;
 const theme=[...Object.keys(logos)].find(t=>t!=='normal'&&(root.dataset.theme===t||body.classList.contains(t)||body.dataset.season===t))||'normal';
 if(theme===previous && document.querySelector('header .pulsepack-brand-icon')?.getAttribute('src')===logos[theme]+'?v=55')return;previous=theme;
 const url=logos[theme]+'?v=55';
 const brand=document.querySelector('header .pulsepack-brand-icon');if(brand)brand.src=url;
 for(const rel of ['icon','apple-touch-icon']){const el=document.querySelector('link[rel="'+rel+'"]');if(el)el.href=url;}
}
const observer=new MutationObserver(sync);
observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
observer.observe(document.body,{attributes:true,attributeFilter:['class','data-season']});
sync();
})();
