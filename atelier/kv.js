// 2026-11-20: 키비주얼 재배치(/atelier·/jp 공용) — キービジュアル再配置 — 同じキービジュアルを要素(背景・皿・食パン・リング文字・見出し・ロゴ・サービス・URL)に分け、
// サイズ(比率)ごとに配置を組み直す。画像をトリミングするだけにしない。位置は枠に対する%、文字サイズは枠の短辺に対する比率。
(function(root){
'use strict';
const ASSET='/atelier/assets/kv_toast.webp';
// 문구는 페이지마다 다르게: create(host,{head1,head2,url})
const SVC=['Promotion Goods','Marketing AD Design','Back-wall','Photo-zone','POP','Digital Signage','Branding Graphic Asset'];
const RING='Promotion Goods ✦ Marketing AD Design ✦ Back-wall ✦ Photo-zone ✦ POP ✦ Digital Signage ✦ Branding Graphic Asset ✦ ';

/* 配置表: [cx%, cy%, サイズ(短辺に対する比率)] / plate:[cx,cy,直径,リング有無] / head:[cx,cy,文字,行数] / svc:[cx,cy,文字,'list'|'flow',幅%] */
const L={
  sq:{plate:[50,50,.70,1]},                                                       // 1:1 原本
  xb:{logo:[50,7,.15],head:[50,19,.088,2],plate:[50,44,.66,1],svc:[50,73,.06,'list',90],url:[50,94,.055]}, // Xバナー 1:3
  bn:{plate:[10,50,.86,0],head:[48,50,.19,1],logo:[87,40,.19],url:[87,73,.085]},  // 横断幕 5:1
  pw:{rep:1,head:[50,11,.068,1],plate:[50,52,.52,1],logo:[50,93,.07]},            // フォトウォール 5:4 (ステップ&リピート)
  gt:{head:[50,13,.095,1],plate:[50,55,.56,0],logo:[17,58,.12],svc:[83,58,.042,'list',30],url:[50,93,.05]}, // ゲート 2:1
  sg:{head:[50,9,.085,2],plate:[50,42,.64,1],logo:[50,72,.12],svc:[50,86,.045,'flow',88],url:[50,96,.038]} // サイネージ 9:16
};

function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
let uid=0;
function create(host,opt){
  opt=opt||{};const HEAD1=opt.head1||'',HEAD2=opt.head2||HEAD1,URL=opt.url||'jphic.co.kr';
  const id='kvring'+(++uid);
  const kv=el('div','kv');
  const bg=el('div','kv-bg'),rep=el('div','kv-rep');
  const plate=el('div','kv-plate'),toast=el('img','kv-toast');toast.src=ASSET;toast.alt='';toast.decoding='async';
  const ring=el('div','kv-ring','<svg viewBox="0 0 100 100" aria-hidden="true"><defs><path id="'+id+'" d="M50,50 m0,-40.5 a40.5,40.5 0 1,1 0,81 a40.5,40.5 0 1,1 0,-81"/></defs><text><textPath href="#'+id+'" textLength="252" lengthAdjust="spacing">'+RING+'</textPath></text></svg>');
  plate.append(ring,toast);
  const head=el('p','kv-head',HEAD1),logo=el('p','kv-logo','JPHIC'),url=el('p','kv-url',URL);
  const svc=el('p','kv-svc',SVC.map(s=>'<span>'+s+'</span>').join(' <i>✦</i> '));
  kv.append(bg,rep,plate,head,logo,svc,url);host.append(kv);
  let cur=null;
  function put(e,spec,W,H,m,anim){
    if(!spec){e.style.opacity=0;return}
    e.style.opacity=1;e.style.left=spec[0]+'%';e.style.top=spec[1]+'%';
  }
  function apply(key,W,H,anim){
    const s=L[key]||L.sq,m=Math.min(W,H);
    kv.classList.toggle('still',anim===false);
    bg.style.backgroundSize=(m*.12)+'px '+(m*.12)+'px';
    rep.style.opacity=s.rep?1:0;rep.style.backgroundSize=(m*.30)+'px '+(m*.15)+'px';
    // 皿
    const p=s.plate;plate.style.left=p[0]+'%';plate.style.top=p[1]+'%';plate.style.width=plate.style.height=(p[2]*m)+'px';ring.style.opacity=p[3]?1:0;
    // 見出し
    put(head,s.head,W,H,m,anim);if(s.head){head.style.fontSize=(s.head[2]*m)+'px';const want=s.head[3]===2?HEAD2:HEAD1;if(head.innerHTML!==want)head.innerHTML=want}
    put(logo,s.logo,W,H,m,anim);if(s.logo)logo.style.fontSize=(s.logo[2]*m)+'px';
    put(url,s.url,W,H,m,anim);if(s.url)url.style.fontSize=(s.url[2]*m)+'px';
    // サービス: 並べ方が変わるときは一度消してから
    if(s.svc){const mode=s.svc[3];const set=()=>{svc.className='kv-svc '+mode;svc.style.width=s.svc[4]+'%';svc.style.fontSize=(s.svc[2]*m)+'px';svc.style.left=s.svc[0]+'%';svc.style.top=s.svc[1]+'%';svc.style.opacity=1};
      if(anim!==false&&cur&&svc.style.opacity!=='0'&&!svc.classList.contains(mode)){svc.style.opacity=0;clearTimeout(svc._t);svc._t=setTimeout(set,260)}else set()}
    else svc.style.opacity=0;
    cur=key}
  return {el:kv,apply};
}
const api={create,layouts:L};
root.JphicKV=api;
})(window);
