const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);

const header=$('.header');
const progress=$('.scroll-progress span');
window.addEventListener('scroll',()=>{
  header.classList.toggle('scrolled',scrollY>40);
  const max=document.documentElement.scrollHeight-innerHeight;
  progress.style.width=max>0?`${scrollY/max*100}%`:'0%';
},{passive:true});

function updateClock(){
  const now=new Date();
  $('#weekday').textContent=new Intl.DateTimeFormat('es-AR',{weekday:'long'}).format(now);
  $('#date').textContent=new Intl.DateTimeFormat('es-AR',{day:'numeric',month:'long'}).format(now);
  $('#time').textContent=new Intl.DateTimeFormat('es-AR',{hour:'2-digit',minute:'2-digit'}).format(now);
}
updateClock();setInterval(updateClock,30000);

const menuButton=$('.menu-button');
const menuPanel=$('.menu-panel');
const menuClose=$('.menu-close');
function setMenu(open){
  menuPanel.classList.toggle('open',open);
  menuPanel.setAttribute('aria-hidden',open?'false':'true');
  menuButton.setAttribute('aria-expanded',open?'true':'false');
  document.body.classList.toggle('menu-open',open);
}
menuButton.addEventListener('click',()=>setMenu(true));
menuClose.addEventListener('click',()=>setMenu(false));
$('.menu-backdrop').addEventListener('click',()=>setMenu(false));
$$('.menu-content nav a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));

const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>entry.isIntersecting&&entry.target.classList.add('visible'));
},{threshold:.1});
$$('.reveal').forEach(el=>observer.observe(el));

const instButtons=[...$$('.institution-tabs button')];
const instPanels=[...$$('.institution-panel')];
let instIndex=0,instTimer;
function setInstitution(index){
  instIndex=(index+instButtons.length)%instButtons.length;
  const target=instButtons[instIndex].dataset.target;
  instButtons.forEach((b,i)=>b.classList.toggle('active',i===instIndex));
  instPanels.forEach(p=>p.classList.toggle('active',p.dataset.panel===target));
  $('#institution-progress').style.width=`${(instIndex+1)/instButtons.length*100}%`;
  clearTimeout(instTimer);
  instTimer=setTimeout(()=>setInstitution(instIndex+1),7000);
}
instButtons.forEach((b,i)=>b.addEventListener('click',()=>setInstitution(i)));
setInstitution(0);

const search=$('#service-search');
search.addEventListener('input',()=>{
  const q=search.value.toLowerCase().trim();
  $$('#service-grid button').forEach(btn=>btn.classList.toggle('hidden',q&&!btn.dataset.name.includes(q)));
});

const dialog=$('#service-dialog');
$$('#service-grid button').forEach(btn=>btn.addEventListener('click',()=>dialog.showModal()));
dialog.querySelector('button').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});

window.addEventListener('scroll',()=>{
  const hero=$('.hero-image');
  if(scrollY<innerHeight*1.15)hero.style.transform=`scale(1.03) translateY(${scrollY*.07}px)`;
},{passive:true});