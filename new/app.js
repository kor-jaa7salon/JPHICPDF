// 2026-11-18: v0.9 이름·연락처 먼저 받기, 진행 중 구글시트 자동 저장(재전송·순번), 접수 확인, 둘러보기 모드. v0.8.2 모바일도 3:4 배너. v0.8.1 배너 재생 버튼 삭제. v0.8 색만 변경. v0.7 배너 영상 자리(파일 있을 때만 재생 버튼)·디자인 의뢰서 칸 표시 추가. v0.6 화면 동작 — 영상, 상담(고정 높이 대화·새 메시지 따라가기·요약 이동), 요약 편집·복사, 기명 접수, 오픈채팅 안내, 제작 범위 슬라이드·포트폴리오, 사업자 정보.
(function(){
'use strict';
const E=window.JphicConsult,C=window.JPHIC_CONFIG||{},PF=window.JPHIC_PORTFOLIO||[],$=id=>document.getElementById(id);
let state=E.make();

/* 배너 영상: 모바일·PC 모두 3:4. 재생 버튼 없이 소리 없이 자동 반복 재생만.
   움직임 줄이기 설정이거나 자동재생이 막힌 기기에서는 포스터(완성 장면)만 보임. */
const video=$('heroVideo');
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){video.autoplay=true;video.play().catch(()=>{})}

/* 오픈채팅: 주소가 있을 때만 버튼·링크 활성 */
document.querySelectorAll('[data-openchat]').forEach(a=>{if(C.openChatUrl){a.href=C.openChatUrl;a.hidden=false}});
document.querySelectorAll('[data-openchat-text]').forEach(a=>{if(C.openChatUrl)a.href=C.openChatUrl});

/* 사업자 정보: 설정된 값만 표시 */
(function footer(){const co=C.company||{},dl=$('companyInfo');
  [['상호',co.name],['대표',co.ceo],['사업자등록번호',co.bizNo],['통신판매업',co.salesNo],['주소',co.address],['전화',co.phone],['이메일',co.email]]
  .filter(([,v])=>v).forEach(([k,v])=>{const d=document.createElement('div'),t=document.createElement('dt'),x=document.createElement('dd');t.textContent=k;x.textContent=v;d.append(t,x);dl.append(d)});
  if(co.privacyUrl){const a=document.createElement('a');a.href=co.privacyUrl;a.textContent='개인정보처리방침';$('footLinks').append(a)}
  if(C.retention)$('retentionLine').textContent='보관 기간: '+C.retention;
})();

/* 상담 대화 + 접수
   흐름: ① 첫 화면에서 이름(닉네임)·연락처·동의 → ② 품목 선택 → ③ 단계별 질문(칸에는 요약값만) → ④ '의뢰 접수하기'
   저장: 이름·연락처를 남긴 경우에만 구글시트에 저장. 답이 바뀔 때마다 '작성중'으로 갱신(0.8초 모아서), 창을 닫을 때 한 번 더 전송.
         '의뢰 접수하기'를 눌러야 '접수완료'(이때만 텔레그램 알림은 시트 쪽에서 보냄). 둘러보기(연락처 없음)는 아무것도 저장·전송하지 않음.
   높이: 시작 후 의뢰서 높이 고정(최대 680px), 대화는 창 안에서만 스크롤, 위로 읽는 중이면 '새 메시지' 버튼. */
const chat=document.querySelector('.chat'),messages=$('messages'),input=$('input'),toLatest=$('toLatest'),choices=$('choices'),chatForm=$('chatForm');
const confirmBar=$('confirmBar'),syncNote=$('syncNote'),welcome=$('welcome');
let contact=null,mode='none',submitted=false,seq=0,dirty=false,timer=null,retry=0,inflight=false,awaitingContactForSubmit=false;
const nearBottom=()=>messages.scrollHeight-messages.scrollTop-messages.clientHeight<80;
const toBottom=()=>{messages.scrollTop=messages.scrollHeight;toLatest.hidden=true};
messages.addEventListener('scroll',()=>{if(nearBottom())toLatest.hidden=true});
toLatest.addEventListener('click',toBottom);
function startChat(){chat.classList.add('started');chatForm.hidden=false;requestAnimationFrame(()=>chat.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}))}
function bubble(text,user=false){const follow=user||nearBottom();const el=document.createElement('div');el.className='bubble'+(user?' user':'');el.textContent=text;messages.append(el);if(follow)toBottom();else toLatest.hidden=false}
function say(text){state.history.push({role:'assistant',text});bubble(text)}
function changed(){render();queueSave()}
function send(text){text=text.trim();if(!text)return;bubble(text,true);input.value='';
  if(submitted){say('접수는 끝났어요. 추가로 전하실 내용이나 파일은 카카오톡 오픈채팅으로 보내주세요.');return}
  const wasDone=E.complete(state);const r=E.ingest(state,text);
  bubble(wasDone&&r.field===null?'그 부분은 담당자가 직접 확인해 드릴게요. 준비되면 아래에서 의뢰를 접수해 주세요.':r.text);changed()}
chatForm.addEventListener('submit',e=>{e.preventDefault();send(input.value)});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();send(input.value)}});
choices.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const name=b.textContent.trim();bubble(name,true);state.history.push({role:'user',text:name});E.add(state,name);say(E.ask(state).text);changed();input.focus({preventScroll:true})}));

/* ① 이름·연락처 */
const PHONE=/^0\d{1,2}[- ]?\d{3,4}[- ]?\d{4}$/,MAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function formMsg(id,text,kind){const m=$(id);m.textContent=text;m.className='form-msg'+(kind?' '+kind:'')}
$('startForm').addEventListener('submit',e=>{e.preventDefault();
  const name=$('cName').value.trim(),value=$('cContact').value.trim(),company=$('cCompany').value.trim();
  if(!name)return formMsg('startMsg','이름이나 닉네임을 적어주세요.','warn');
  if(!PHONE.test(value)&&!MAIL.test(value))return formMsg('startMsg','휴대폰 번호(010-0000-0000)나 이메일을 확인해 주세요.','warn');
  if(!$('cConsent').checked)return formMsg('startMsg','개인정보 수집·이용에 동의해 주세요.','warn');
  contact={name,contact:value,company,website:$('cWebsite').value};mode='named';formMsg('startMsg','','');
  if(awaitingContactForSubmit){awaitingContactForSubmit=false;chat.classList.remove('asking');say(name+'님, 고마워요. 바로 접수할게요.');submitOrder();return}
  startChat();say(name+'님, 반가워요! 로그인 없이 이대로 진행돼요. 창이 닫혀도 남겨주신 연락처로 이어서 연락드릴게요.');
  say('어떤 걸 만들까요? 아래에서 고르거나 편하게 적어주세요.');choices.hidden=false;queueSave()});
$('browseOnly').addEventListener('click',()=>{mode='anon';startChat();say('둘러보기로 시작했어요. 이 경우 창을 닫으면 내용이 사라지고, 접수할 때 이름·연락처가 필요해요.');say('어떤 걸 만들까요? 아래에서 고르거나 편하게 적어주세요.');choices.hidden=false});

/* 의뢰서·요약 화면 */
function summaryText(){const sm=E.summary(state);return ['JPHIC 디자인 의뢰 요약 ('+state.requestId+')',...(contact?['접수자: '+contact.name+' · '+contact.contact+(contact.company?' · '+contact.company:'')]:[]),...sm.items.map(p=>['■ '+p.name,...E.ORDER.map(k=>E.fields[k]+': '+(p[k]||'미입력'))].join('\n')),...(sm.inquiries.length?['문의: '+sm.inquiries.join(', ')]:[])].join('\n\n')}
const sheetFields=$('sheetFields'),sheetNo=$('sheetNo');
function sheetNumber(){sheetNo.textContent='No. '+state.requestId.replace('JPHIC-','').slice(-6).toUpperCase()}
function renderSheet(){sheetFields.replaceChildren();const p=state.items[state.active];sheetFields.hidden=!p;if(!p)return;
  const cell=(label,value,cls)=>{const d=document.createElement('div');if(cls)d.className=cls;const t=document.createElement('dt');t.textContent=label;const v=document.createElement('dd');
    if(value){v.textContent=value;v.className='done';v.title=value}else{v.textContent='확인 중';v.className='todo'}d.append(t,v);sheetFields.append(d)};
  cell(state.items.length>1?'품목 '+(state.active+1)+'/'+state.items.length:'품목',p.name,'item');
  for(const key of E.ORDER)cell(E.fields[key],p[key])}
function render(){renderSheet();const host=$('summary');host.replaceChildren();const has=!!state.items.length;$('summarySection').hidden=!has;choices.hidden=!(chat.classList.contains('started')&&!has);
  const done=E.complete(state);confirmBar.hidden=!(done&&!submitted);$('confirmBtn').textContent=mode==='named'?'이대로 의뢰 접수하기':'이름·연락처 남기고 접수하기';
  const sb=$('submitOrder');sb.disabled=submitted||!has;sb.textContent=submitted?'접수 완료':(mode==='named'?'의뢰 접수하기':'이름·연락처 남기고 접수하기');
  const who=$('who');who.hidden=!contact;if(contact)who.textContent='접수자: '+contact.name+' · '+contact.contact+(contact.company?' · '+contact.company:'');
  const iq=$('inquiries'),sm=E.summary(state);iq.hidden=!sm.inquiries.length;iq.textContent='담당자 확인 필요: '+sm.inquiries.join(', ')+' 문의';
  if(!has)return;
  state.items.forEach((p,i)=>{const box=document.createElement('details');box.open=i===state.active;const t=document.createElement('summary');t.textContent=p.name+(i===state.active&&!done?' · 확인 중':'');box.append(t);
    if(i!==state.active&&!submitted){const b=document.createElement('button');b.type='button';b.textContent='이 품목 이어서 상담';b.addEventListener('click',()=>{state.active=i;render();say(p.name+'에 대해 확인할게요. '+E.ask(state).text)});box.append(b)}
    for(const key of E.ORDER){const row=document.createElement('label');row.textContent=E.fields[key];const f=document.createElement('input');f.value=p[key];f.placeholder='미입력';f.maxLength=60;f.addEventListener('change',()=>{E.set(state,i,key,f.value);changed()});row.append(f);box.append(row)}
    if(p.changes.length){const w=document.createElement('p');w.className='changed';w.textContent='바뀐 조건은 금액과 일정을 다시 확인해요.';box.append(w)}
    host.append(box)})}
$('addItem').addEventListener('click',()=>{const el=$('itemName'),name=el.value.trim();if(!name)return;E.add(state,name);el.value='';if(!chat.classList.contains('started')){mode=mode==='none'?'anon':mode;startChat()}say(name+'도 함께 확인할게요. '+E.ask(state).text);changed()});
async function copy(text){try{await navigator.clipboard.writeText(text);return true}catch{const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.append(t);t.select();let ok=false;try{ok=document.execCommand('copy')}catch{}t.remove();return ok}}
$('copySummary').addEventListener('click',async e=>{const b=e.currentTarget,ok=await copy(summaryText());b.textContent=ok?'복사했어요':'복사 실패';setTimeout(()=>b.textContent='요약 복사',1600)});
document.querySelectorAll('.openchat-row [data-openchat]').forEach(a=>a.addEventListener('click',()=>{if(state.items.length)copy(summaryText())}));
$('reset').addEventListener('click',()=>{if(!confirm('지금 내용을 지우고 새 의뢰를 시작할까요?'))return;flush();state=E.make();submitted=false;seq=0;dirty=false;sheetNumber();messages.replaceChildren();toLatest.hidden=true;
  if(mode==='named'){say(contact.name+'님, 새 의뢰를 시작할게요. 어떤 걸 만들까요?')}else{chat.classList.remove('started');chatForm.hidden=true;mode='none'}render()});

/* ④ 접수 */
function submitOrder(){if(submitted)return;
  if(mode!=='named'){awaitingContactForSubmit=true;chat.classList.add('asking');$('welcomeTitle').textContent='접수할 연락처를 남겨주세요';$('welcomeNote').textContent='로그인은 필요 없어요. 이름(닉네임)과 연락처만 있으면 돼요.';$('browseOnly').hidden=true;$('startBtn').textContent='연락처 남기고 접수하기';chat.scrollIntoView({block:'start'});$('cName').focus({preventScroll:true});return}
  if(!C.intakeEndpoint){formMsg('orderMsg','접수 연결 준비 중이에요. 요약을 복사해 카카오톡 오픈채팅으로 보내주세요.','warn');say('지금은 접수 연결을 준비하고 있어요. 아래 요약 복사 후 카카오톡 오픈채팅으로 보내주시면 바로 확인할게요.');return}
  submitted=true;render();formMsg('orderMsg','접수하는 중이에요…','');syncNow('접수완료')}
$('confirmBtn').addEventListener('click',submitOrder);$('submitOrder').addEventListener('click',submitOrder);

/* 구글시트 저장: 순번(seq)으로 오래된 저장이 새 저장을 덮지 않게 하고, 실패하면 2·5·10·30초 간격으로 다시 보냄 */
function payload(status){const sm=E.summary(state);return {requestId:state.requestId,seq:++seq,status,source:'/new',contact:{name:contact.name,contact:contact.contact,company:contact.company},consent:true,website:contact.website||'',items:sm.items,inquiries:sm.inquiries,missing:sm.missing}}
function queueSave(){if(mode!=='named'||!C.intakeEndpoint)return;dirty=true;clearTimeout(timer);timer=setTimeout(()=>syncNow(submitted?'접수완료':'작성중'),800)}
function note(text,kind){syncNote.hidden=!text;syncNote.textContent=text;syncNote.className='sync-note'+(kind?' '+kind:'')}
async function syncNow(status){if(mode!=='named'||!C.intakeEndpoint)return;if(inflight){dirty=true;return}inflight=true;dirty=false;clearTimeout(timer);
  const body=JSON.stringify(payload(status));
  try{const r=await fetch(C.intakeEndpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body});const j=await r.json().catch(()=>({}));
    if(!(r.ok&&j.ok===true))throw new Error('fail');retry=0;note('','');
    if(status==='접수완료'&&!done){done=true;formMsg('orderMsg','접수됐어요. 확인 후 남겨주신 연락처로 연락드릴게요.','ok');say('접수됐어요! 확인 후 '+contact.contact+'로 연락드릴게요. 참고 파일은 카카오톡 오픈채팅으로 보내주세요.');render()}}
  catch{dirty=true;const wait=[2,5,10,30][Math.min(retry,3)];retry++;note('연결이 잠깐 불안정해요. '+wait+'초 뒤 자동으로 다시 저장할게요.','warn');setTimeout(()=>{if(dirty)syncNow(submitted?'접수완료':'작성중')},wait*1000)}
  finally{inflight=false;if(dirty&&retry===0)queueSave()}}
let done=false;
function flush(){if(mode!=='named'||!C.intakeEndpoint||!dirty)return;try{navigator.sendBeacon(C.intakeEndpoint,new Blob([JSON.stringify(payload(submitted?'접수완료':'작성중'))],{type:'text/plain;charset=utf-8'}));dirty=false}catch{}}
addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});

/* 제작 범위: 1열 슬라이드 + 양쪽 화살표. 카드를 누르면 카드 안에서 사례 사진을 넘겨 봄. */
const track=$('catTrack'),prev=document.querySelector('.car-nav.prev'),next=document.querySelector('.car-nav.next'),count=$('carCount');
const SVGNS='http://www.w3.org/2000/svg';
function closeAll(except){track.querySelectorAll('.cat').forEach(c=>{if(c!==except){c.querySelector('.cat-gallery').hidden=true;c.querySelector('.cat-face').setAttribute('aria-expanded','false')}})}
PF.forEach((cat,ci)=>{
  const card=document.createElement('div');card.className='cat';card.setAttribute('role','listitem');
  const face=document.createElement('button');face.type='button';face.className='cat-face';face.setAttribute('aria-expanded','false');
  const num=document.createElement('span');num.className='cat-num';num.textContent=String(ci+1).padStart(2,'0');
  const svg=document.createElementNS(SVGNS,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const path=document.createElementNS(SVGNS,'path');path.setAttribute('d',cat.icon||'');svg.append(path);
  const h=document.createElement('h3');h.textContent=cat.title;const d=document.createElement('p');d.textContent=cat.desc;
  const more=document.createElement('span');more.className='cat-more';more.textContent=cat.items.length?'사례 보기 ('+cat.items.length+') →':'사례 보기 →';
  face.append(num,svg,h,d,more);
  const gal=document.createElement('div');gal.className='cat-gallery';gal.hidden=true;gal.setAttribute('role','group');gal.setAttribute('aria-label',cat.title+' 작업 사례');
  const fig=document.createElement('figure');const cap=document.createElement('figcaption');
  const bar=document.createElement('div');bar.className='cat-bar';
  const ttl=document.createElement('span');ttl.className='ttl';ttl.textContent=cat.title;
  const gp=document.createElement('button');gp.type='button';gp.textContent='‹';gp.setAttribute('aria-label','이전 사례');
  const cnt=document.createElement('span');cnt.className='cnt';
  const gn=document.createElement('button');gn.type='button';gn.textContent='›';gn.setAttribute('aria-label','다음 사례');
  const close=document.createElement('button');close.type='button';close.textContent='닫기';
  bar.append(ttl,gp,cnt,gn,close);gal.append(fig,cap,bar);
  let idx=0;
  function show(){fig.replaceChildren();const items=cat.items;
    if(!items.length){const em=document.createElement('p');em.className='empty';em.textContent='사례 사진을 준비하고 있어요.\n상담에서 비슷한 작업을 안내해 드릴게요.';em.style.whiteSpace='pre-line';fig.append(em);cap.textContent='';cnt.textContent='';gp.hidden=gn.hidden=true;return}
    const it=items[idx];const img=document.createElement('img');img.src=it.src;img.alt=it.alt||cat.title+' 사례';img.loading='lazy';img.decoding='async';fig.append(img);
    cap.textContent=it.caption||'';cnt.textContent=(idx+1)+' / '+items.length;gp.hidden=gn.hidden=items.length<2}
  gp.addEventListener('click',()=>{idx=(idx-1+cat.items.length)%cat.items.length;show()});
  gn.addEventListener('click',()=>{idx=(idx+1)%cat.items.length;show()});
  face.addEventListener('click',()=>{closeAll(card);idx=0;show();gal.hidden=false;face.setAttribute('aria-expanded','true');card.scrollIntoView({inline:'nearest',block:'nearest',behavior:'smooth'});close.focus({preventScroll:true})});
  close.addEventListener('click',()=>{gal.hidden=true;face.setAttribute('aria-expanded','false');face.focus({preventScroll:true})});
  gal.addEventListener('keydown',e=>{if(e.key==='Escape')close.click();else if(e.key==='ArrowLeft'&&!gp.hidden)gp.click();else if(e.key==='ArrowRight'&&!gn.hidden)gn.click()});
  card.append(face,gal);track.append(card)});
const step=()=>{const c=track.querySelector('.cat');return c?c.getBoundingClientRect().width+12:300};
function syncNav(){const max=track.scrollWidth-track.clientWidth-2;prev.disabled=track.scrollLeft<=2;next.disabled=track.scrollLeft>=max;
  const i=track.scrollLeft>=max?PF.length:Math.min(PF.length,Math.round(track.scrollLeft/step())+1);count.textContent=PF.length?i+' / '+PF.length:''}
prev.addEventListener('click',()=>track.scrollBy({left:-step(),behavior:'smooth'}));
next.addEventListener('click',()=>track.scrollBy({left:step(),behavior:'smooth'}));
track.addEventListener('scroll',()=>requestAnimationFrame(syncNav),{passive:true});addEventListener('resize',syncNav);syncNav();

sheetNumber();render();
})();
