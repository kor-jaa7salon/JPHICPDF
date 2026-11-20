// 2026-11-20: 상담창 화면 도우미(/atelier·/jp 공용)
// ① 휴대폰: 대화를 시작하면 의뢰서가 화면 전체를 덮는 '새 화면'이 되고, 높이는 키보드에 맞춰 고정 · 대화만 안쪽에서 스크롤.
//    '닫기'로 원래 페이지로 돌아오고 '대화 이어서 하기'로 다시 들어감. '내용 확인·수정'을 누르면 전체 화면을 닫고 요약으로 이동(요약은 고정 안 함).
// ② 빠른 답 버튼: 지금 질문에 맞는 답(예: 자료 있음/없음)을 버튼으로 보여줌.
(function(){
'use strict';
window.JphicChatUI=function(o){
  const chat=o.chat,mq=matchMedia('(max-width: 759px)'),root=document.documentElement;
  const head=chat.querySelector('.sheet-head');
  const close=document.createElement('button');close.type='button';close.className='chat-close';close.textContent=o.texts.close;head.append(close);
  const resume=document.createElement('button');resume.type='button';resume.className='chip resume-btn';resume.textContent=o.texts.resume;resume.hidden=true;chat.after(resume);
  function fit(){if(!chat.classList.contains('full'))return;const vv=window.visualViewport;
    chat.style.height=(vv?vv.height:innerHeight)+'px';chat.style.top=(vv?vv.offsetTop:0)+'px';
    const m=o.messages;if(m.scrollHeight-m.scrollTop-m.clientHeight<140)m.scrollTop=m.scrollHeight}
  function enter(){if(!mq.matches||!chat.classList.contains('started'))return;chat.classList.add('full');root.classList.add('chat-lock');resume.hidden=true;fit()}
  function exit(){chat.classList.remove('full');chat.style.height='';chat.style.top='';root.classList.remove('chat-lock');resume.hidden=!(mq.matches&&chat.classList.contains('started'))}
  close.addEventListener('click',()=>{exit();chat.scrollIntoView({block:'start'})});
  resume.addEventListener('click',enter);
  if(window.visualViewport){visualViewport.addEventListener('resize',fit);visualViewport.addEventListener('scroll',fit)}
  addEventListener('resize',fit);
  (mq.addEventListener?mq.addEventListener('change',()=>{if(!mq.matches)exit()}):mq.addListener(()=>{if(!mq.matches)exit()}));
  chat.querySelectorAll('a[href="#summarySection"]').forEach(a=>a.addEventListener('click',e=>{if(!chat.classList.contains('full'))return;e.preventDefault();exit();
    setTimeout(()=>{const s=document.getElementById('summarySection');if(s)s.scrollIntoView({block:'start'})},60)}));
  // 빠른 답 버튼
  const quick=document.createElement('div');quick.className='quick';quick.hidden=true;o.chatForm.before(quick);
  function refresh(){const f=o.currentField();const q=f&&o.quick[f];quick.replaceChildren();
    if(!q||!chat.classList.contains('started')){quick.hidden=true;return}
    q.forEach(([label,value])=>{const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=label;b.addEventListener('click',()=>o.onQuick(f,label,value));quick.append(b)});
    quick.hidden=false}
  return {enter,exit,refresh};
};
})();
