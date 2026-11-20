// 2026-11-20: /jp 日本語版 Atelier — /atelier/atelier.js をもとに文言だけ日本語化。元: JPHIC Atelier 동작 — 등장 효과, 01 비율 변환(스크롤 고정)·실제 크기 줄세우기, 02 칼선→실물 자동 전환, 03 블라인드 박스 자동 열림, 04 블라인드·모니터 켜짐. 누르지 않아도 스크롤만으로 끝까지 보이게.
(function(){
'use strict';
const $=id=>document.getElementById(id);
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const A='/atelier/assets/';

/* ── 写真・作品リスト (実際のポートフォリオに差し替える場所) ── */
const J='/jp/assets/';
const MORPH=[ // 同じキービジュアルのサイズ別展開
  {name:'キービジュアル原本',size:'1080×1080px',w:1,h:1,src:A+'kv_square.webp'},
  {name:'Xバナー',size:'600×1800mm',w:1,h:3,src:A+'kv_square.webp'},
  {name:'横断幕',size:'5000×1000mm',w:5,h:1,src:A+'kv_square.webp'},
  {name:'フォトウォール',size:'3000×2400mm',w:5,h:4,src:A+'kv_square.webp'},
  {name:'ゲート',size:'6000×3000mm',w:2,h:1,src:A+'kv_square.webp'},
  {name:'サイネージ',size:'1080×1920px',w:9,h:16,src:A+'kv_square.webp'}];
const LINEUP=[
  {name:'人',mw:500,mh:1700,person:true},
  {name:'Xバナー',mw:600,mh:1800,src:A+'kv_square.webp'},
  {name:'フォトウォール',mw:3000,mh:2400,src:A+'kv_square.webp'},
  {name:'ゲート',mw:6000,mh:3000,src:A+'kv_square.webp'}];
const CUTS=[ // 背景なしPNG/WebPがあれば、カットライン(M100)面は自動で作られる
  {src:J+'st_wordmark.webp',cap:'ファブリックステッカー · JPHIC'},
  {src:A+'cut_cake.webp',cap:'アクリルスタンド'},
  {src:J+'st_tag.webp',cap:'ファブリックステッカー · 搭乗券'},
  {src:A+'cut_star.webp',cap:'ステッカー'},
  {src:J+'st_badge.webp',cap:'ファブリックステッカー · バッジ'},
  {src:A+'cut_tag.webp',cap:'アクリルキーホルダー'},
  {src:J+'st_toast.webp',cap:'ファブリックステッカー · 食パン'},
  {src:A+'cut_cloud.webp',cap:'ハニカムボード'},
  {src:J+'st_cookie.webp',cap:'ファブリックステッカー · クッキー'}];
const GOODS=['box_cake','box_macaron','box_star','box_badge','box_heart','box_bread','box_donut','cut_tag','cut_ticket','cut_cloud'].map(n=>A+n+'.webp');

/* ── 등장 효과 ── */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.15});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

/* ── 확대 보기 (대표작) ── */
const lb=$('lightbox');
function zoom(src){lb.querySelector('img').src=src;lb.hidden=false}
lb.addEventListener('click',()=>{lb.hidden=true});
document.querySelector('.hero-work img').addEventListener('click',e=>zoom(e.target.src));

/* ── 01 비율 변환 ── */
const morph=$('morph'),frame=$('frame'),fimg=frame.querySelector('img'),box=frame.parentElement;
const dots=$('mDots');MORPH.forEach(()=>dots.append(document.createElement('li')));
let step=-1;
function fit(s){const bw=box.clientWidth*.86,bh=box.clientHeight*.92;const k=Math.min(bw/s.w,bh/s.h);return [s.w*k,s.h*k]}
function setStep(i){if(i===step)return;step=i;const s=MORPH[i];const [w,h]=fit(s);frame.style.width=w+'px';frame.style.height=h+'px';
  if(fimg.getAttribute('src')!==s.src)fimg.src=s.src;
  $('mName').textContent=s.name;$('mSize').textContent=s.size;$('mRatio').textContent=s.w+':'+s.h;
  [...dots.children].forEach((d,k)=>d.classList.toggle('on',k<=i))}
function morphScroll(){const r=morph.getBoundingClientRect(),total=morph.offsetHeight-innerHeight;const p=Math.min(1,Math.max(0,-r.top/Math.max(total,1)));
  setStep(Math.min(MORPH.length-1,Math.floor(p*MORPH.length*0.999)))}

/* ── 01 실제 크기 줄세우기 ── */
const floor=$('floor');
function buildLineup(){floor.replaceChildren();const gap=14,avail=floor.clientWidth-8-gap*(LINEUP.length-1);const k=avail/LINEUP.reduce((a,x)=>a+x.mw,0);
  LINEUP.forEach((x,idx)=>{const d=document.createElement('div');d.style.setProperty('--row',idx%2);d.className='lu'+(x.person?' person':'');d.style.width=x.mw*k+'px';d.style.height=x.mh*k+'px';
    if(x.person){d.innerHTML='<svg viewBox="0 0 50 170" aria-hidden="true"><circle cx="25" cy="14" r="11" fill="none" stroke="#1B1B1B"/><path d="M25 26v62M25 40l-18 34M25 40l18 34M25 88l-14 80M25 88l14 80" fill="none" stroke="#1B1B1B"/></svg>'}
    else{const a=document.createElement('div');a.className='art';a.style.backgroundImage='url('+x.src+')';d.append(a);['tl','tr','bl','br'].forEach(c=>{const i=document.createElement('i');i.className='crop '+c;d.append(i)})}
    const s=document.createElement('small');s.textContent=x.name+(x.person?' 170cm':' '+x.mw/1000+'×'+x.mh/1000+'m');d.append(s);floor.append(d)})}

/* ── 02 살롱 벽: 사진 원래 비율로 자리 계산, 화면에 들어오면 칼선 → 실물 ── */
const salon=$('salon');
const cutIO=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const t=e.target;setTimeout(()=>t.classList.add('cut'),RM?0:250);cutIO.unobserve(t)}}),{threshold:.55});
CUTS.forEach((c,i)=>{const f=document.createElement('figure');f.className='tile'+(i%2===0?' white':'');f.style.setProperty('--src','url('+c.src+')');
  f.innerHTML='<div class="art"><div class="pic"><img alt="'+c.cap+'" loading="lazy" decoding="async"><span class="shape"></span><i class="blade"></i></div></div><figcaption></figcaption>';
  const img=f.querySelector('img');img.src=c.src;f.querySelector('figcaption').textContent=c.cap;
  img.addEventListener('load',layoutSalon);f.addEventListener('click',()=>f.classList.toggle('cut'));salon.append(f);cutIO.observe(f)});
function layoutSalon(){const row=6;[...salon.children].forEach(t=>{t.style.gridRowEnd='auto';t.style.gridRowEnd='span '+Math.ceil(t.getBoundingClientRect().height/row);t.style.setProperty('--travel',t.querySelector('.pic').clientHeight+'px')})}

/* ── 03 블라인드 박스: 화면에 들어오면 무작위 순서로 하나씩 열림 ── */
const boxes=$('boxes');let pool=[];
function draw(){if(!pool.length)pool=GOODS.slice().sort(()=>Math.random()-.5);return pool.pop()}
for(let i=1;i<=9;i++){const b=document.createElement('button');b.type='button';b.className='box';b.setAttribute('aria-label','ボックス '+String(i).padStart(2,'0'));
  b.innerHTML='<span class="lid"></span><span class="num">'+String(i).padStart(2,'0')+'</span><img alt="制作例のグッズ" decoding="async">';
  b.addEventListener('click',()=>{if(!b.classList.contains('open'))openBox(b);else{b.classList.remove('open');setTimeout(()=>openBox(b),260)}});boxes.append(b)}
function openBox(b){const img=b.querySelector('img');img.src=draw();b.classList.add('open')}
function openAll(){const list=[...boxes.children].sort(()=>Math.random()-.5);list.forEach((b,k)=>setTimeout(()=>openBox(b),RM?0:420+k*230))}
const boxIO=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){openAll();boxIO.disconnect()}}),{threshold:.45});boxIO.observe(boxes);
$('reshuffle').addEventListener('click',()=>{[...boxes.children].forEach(b=>b.classList.remove('open'));pool=[];setTimeout(openAll,300)});

/* ── 04 상영관: 스크롤에 맞춰 블라인드가 내려오고, 다 내려오면 모니터가 켜짐 ── */
const room4=$('room4'),scr=$('screenScroll'),blind=$('blind');let loaded=false,motionTimer=null;
function loadScreens(){if(loaded)return;loaded=true;room4.querySelectorAll('[data-src]').forEach(m=>{m.src=m.dataset.src})}
function screenScroll(){const r=scr.getBoundingClientRect(),total=scr.offsetHeight-innerHeight;const p=Math.min(1,Math.max(0,-r.top/Math.max(total,1)));
  if(r.top<innerHeight*1.5)loadScreens();
  let b=RM?1:Math.min(1,p/0.32);if(!RM&&p>0.86)b=1-Math.min(1,(p-0.86)/0.14);
  blind.style.setProperty('--b',b.toFixed(3));
  const dark=b>0.6,on=b>=0.999&&p>0.33;room4.classList.toggle('dark',dark);
  if(on&&!room4.classList.contains('on')){room4.classList.add('on');room4.querySelectorAll('video').forEach(v=>v.play().catch(()=>{}));clearTimeout(motionTimer);motionTimer=setTimeout(()=>room4.classList.add('motion'),1600)}
  if(!on&&room4.classList.contains('on')){room4.classList.remove('on','motion');clearTimeout(motionTimer);room4.querySelectorAll('video').forEach(v=>v.pause())}}

/* ── 스크롤·크기 변경 ── */
let ticking=false;
function onScroll(){if(ticking)return;ticking=true;requestAnimationFrame(()=>{ticking=false;if(!RM)morphScroll();screenScroll()})}
addEventListener('scroll',onScroll,{passive:true});
addEventListener('resize',()=>{step=-1;morphScroll();buildLineup();layoutSalon()});
buildLineup();setStep(0);if(!RM)morphScroll();screenScroll();
if(RM){/* 움직임 줄이기: 변환 장면 대신 원본 비율 하나와 줄세우기만 */}
})();
