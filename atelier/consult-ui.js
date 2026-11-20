// 2026-11-20: 상담창 화면 도우미(/atelier·/jp 공용)
// ① 휴대폰: 대화를 시작하면 의뢰서가 화면 전체를 덮는 '새 화면'이 되고, 높이는 키보드에 맞춰 고정 · 대화만 안쪽에서 스크롤.
//    '닫기'로 원래 페이지로 돌아오고 '대화 이어서 하기'로 다시 들어감. '내용 확인·수정'을 누르면 전체 화면을 닫고 요약으로 이동(요약은 고정 안 함).
// ② 빠른 답 버튼: 지금 질문의 예시 답을 버튼으로. single(누르면 바로 보냄) / multi(여러 개 고른 뒤 '선택 완료') /
//    날짜(달력 + 오늘 기준 mm-dd 칸에 바로 입력) / 크기(품목별 자주 쓰는 규격 + 가로·세로·단위 직접 입력) / 기타(입력칸으로 이동).
//    버튼 줄이 생기거나 바뀌면 대화를 맨 아래로 당겨 질문이 가려지지 않게 함.
(function(){
'use strict';
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
const pad=n=>String(n).padStart(2,'0');
window.JphicChatUI=function(o){
  const chat=o.chat,mq=matchMedia('(max-width: 759px)'),root=document.documentElement,msgs=o.messages,input=o.input;
  const head=chat.querySelector('.sheet-head');
  const close=el('button','chat-close',o.texts.close);close.type='button';head.append(close);
  const resume=el('button','chip resume-btn',o.texts.resume);resume.type='button';resume.hidden=true;chat.after(resume);
  const toEnd=()=>requestAnimationFrame(()=>{msgs.scrollTop=msgs.scrollHeight});
  function fit(){if(!chat.classList.contains('full'))return;const vv=window.visualViewport;
    chat.style.height=(vv?vv.height:innerHeight)+'px';chat.style.top=(vv?vv.offsetTop:0)+'px';
    if(msgs.scrollHeight-msgs.scrollTop-msgs.clientHeight<160)toEnd()}
  function enter(){if(!mq.matches||!chat.classList.contains('started'))return;chat.classList.add('full');root.classList.add('chat-lock');resume.hidden=true;fit()}
  function exit(){chat.classList.remove('full');chat.style.height='';chat.style.top='';root.classList.remove('chat-lock');resume.hidden=!(mq.matches&&chat.classList.contains('started'))}
  close.addEventListener('click',()=>{exit();chat.scrollIntoView({block:'start'})});
  resume.addEventListener('click',enter);
  if(window.visualViewport){visualViewport.addEventListener('resize',fit);visualViewport.addEventListener('scroll',fit)}
  addEventListener('resize',fit);
  (mq.addEventListener?mq.addEventListener('change',()=>{if(!mq.matches)exit()}):mq.addListener(()=>{if(!mq.matches)exit()}));
  chat.querySelectorAll('a[href="#summarySection"]').forEach(a=>a.addEventListener('click',e=>{if(!chat.classList.contains('full'))return;e.preventDefault();exit();
    setTimeout(()=>{const s=document.getElementById('summarySection');if(s)s.scrollIntoView({block:'start'})},60)}));

  /* ── 빠른 답 버튼 ── */
  const quick=el('div','quick');quick.hidden=true;o.chatForm.before(quick);
  const T=o.texts;let shownFor='';
  const defaultPh=input.placeholder;
  function chip(label,fn,cls){const b=el('button','chip'+(cls?' '+cls:''),label);b.type='button';b.addEventListener('click',fn);return b}
  function other(spec){return chip(spec.label,()=>{input.placeholder=spec.placeholder;input.inputMode=spec.numeric?'numeric':'text';input.focus()},'ghost')}
  function dateChip(spec){
    const box=el('span','chip-date');const now=new Date();
    const cal=el('button','chip cal','📅');cal.type='button';cal.setAttribute('aria-label',T.calendar);
    const pick=document.createElement('input');pick.type='date';pick.className='date-pick';pick.tabIndex=-1;pick.setAttribute('aria-hidden','true');
    pick.min=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());
    const mmdd=document.createElement('input');mmdd.className='mmdd';mmdd.inputMode='numeric';mmdd.maxLength=5;mmdd.value=pad(now.getMonth()+1)+'-'+pad(now.getDate());
    mmdd.setAttribute('aria-label',T.mmdd);mmdd.title=T.mmdd;
    const ok=el('button','chip ok',T.ok);ok.type='button';
    const send=(m,d)=>{if(m>=1&&m<=12&&d>=1&&d<=31)o.send(spec.fmt(m,d))};
    cal.addEventListener('click',()=>{try{pick.showPicker()}catch(e){pick.classList.add('show');pick.focus()}});
    pick.addEventListener('change',()=>{if(!pick.value)return;const [,m,d]=pick.value.split('-').map(Number);send(m,d)});
    const fromText=()=>{const v=mmdd.value.replace(/[^\d]/g,'');let m,d;if(v.length===4){m=+v.slice(0,2);d=+v.slice(2)}else if(v.length===3){m=+v.slice(0,1);d=+v.slice(1)}else{const p=mmdd.value.split(/[-./ ]/).map(Number);m=p[0];d=p[1]}send(m,d)};
    mmdd.addEventListener('focus',()=>mmdd.select());mmdd.addEventListener('mouseenter',()=>{if(document.activeElement!==mmdd){mmdd.focus();mmdd.select()}});
    mmdd.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();fromText()}});
    ok.addEventListener('click',fromText);
    box.append(cal,mmdd,ok,pick);return box}
  function sizeForm(spec){
    const f=el('span','size-form');f.hidden=true;
    const w=document.createElement('input'),h=document.createElement('input');[w,h].forEach((x,i)=>{x.inputMode='decimal';x.className='num';x.placeholder=i?spec.h:spec.w;x.setAttribute('aria-label',i?spec.h:spec.w)});
    let unit=spec.units[0];const units=el('span','units');
    spec.units.forEach(u=>{const b=chip(u,()=>{unit=u;[...units.children].forEach(c=>c.classList.toggle('on',c===b))},'unit'+(u===unit?' on':''));units.append(b)});
    const ok=chip(spec.ok,()=>{const a=w.value.trim(),b=h.value.trim();if(!a||!b){(a?h:w).focus();return}o.send(a+'×'+b+unit)});
    [w,h].forEach(x=>x.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();ok.click()}}));
    f.append(w,el('span','x','×'),h,units,ok);return f}
  function render(field){
    const spec=field&&o.options[field];quick.replaceChildren();input.placeholder=defaultPh;input.inputMode='text';
    if(!spec||!chat.classList.contains('started')){quick.hidden=true;shownFor='';return}
    if(spec.date)quick.append(dateChip(spec.date));
    let chips=spec.chips||[];
    if(spec.type==='size'){const item=o.currentItem()||'';chips=(spec.presets(item)).concat(chips)}
    if(spec.type==='multi'){
      const picked=new Set();const done=chip(spec.done,()=>{if(picked.size)o.send([...picked].join(', '))},'done');done.hidden=true;
      chips.forEach(c=>{const b=chip(c,()=>{picked.has(c)?picked.delete(c):picked.add(c);b.classList.toggle('on',picked.has(c));b.setAttribute('aria-pressed',picked.has(c));done.hidden=!picked.size;toEnd()},'pick');b.setAttribute('aria-pressed','false');quick.append(b)});
      if(spec.none)quick.append(chip(spec.none,()=>o.send(spec.none)));
      if(spec.other)quick.append(other(spec.other));
      quick.append(done);
    }else{
      chips.forEach(c=>quick.append(chip(c,()=>o.send(c))));
      if(spec.type==='size'&&spec.form){const f=sizeForm(spec.form);quick.append(chip(spec.form.label,()=>{f.hidden=!f.hidden;if(!f.hidden)f.querySelector('input').focus();toEnd()},'ghost'),f)}
      if(spec.other)quick.append(other(spec.other));
    }
    quick.hidden=false;shownFor=field;toEnd()}
  function refresh(){const f=o.currentField();if(f===shownFor&&!quick.hidden&&f)return;render(f)}
  return {enter,exit,refresh};
};
})();
