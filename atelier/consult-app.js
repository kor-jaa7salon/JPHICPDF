// 2026-11-20: /atelier 디자인 의뢰서(상담창) — /new/app.js(v0.9)와 같은 흐름·같은 구글시트 저장 형식. 엔진은 /new/consult-engine.js, 설정은 /new/config.js를 그대로 씀.
// 흐름: ① 이름(닉네임)·연락처·동의 → ② 품목 선택 → ③ 단계별 질문(칸에는 요약값만) → ④ '의뢰 접수하기'
// 저장: 이름·연락처를 남긴 경우에만 구글시트에. source:'/atelier'를 붙여 어디서 들어온 의뢰인지 구분.
// 파일 보내기: 카카오톡 오픈채팅 · 이메일(jphic_cloud@naver.com) · 구글드라이브 공유 링크
(function(){
'use strict';
const E=window.JphicConsult,C=window.JPHIC_CONFIG||{},$=id=>document.getElementById(id);const FILE_EMAIL='jphic_cloud@naver.com';
if(!E)return;
let state=E.make();
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 오픈채팅: 주소가 있을 때만 버튼 */
document.querySelectorAll('[data-openchat]').forEach(a=>{if(C.openChatUrl){a.href=C.openChatUrl;a.hidden=false}});
if(C.retention)$('retentionLine').textContent='보관 기간: '+C.retention;
const lineHint=()=>'카카오톡 오픈채팅';
/* ファイルの送り方: LINE・メール・Googleドライブ共有リンク。メールの件名に受付番号を入れる */
const fileHint=()=>'카카오톡 오픈채팅·이메일('+FILE_EMAIL+')·구글드라이브 공유 링크 중 편한 방법';
function refreshFileWays(){const no=officialNo||'';document.querySelectorAll('[data-mail]').forEach(a=>{a.textContent=FILE_EMAIL;a.href='mailto:'+FILE_EMAIL+'?subject='+encodeURIComponent('[JPHIC] 파일 전달'+(no?' '+no:''))});
  document.querySelectorAll('[data-reqno]').forEach(p=>{p.querySelector('b').textContent=no;p.hidden=!no})}

const chat=document.querySelector('.chat'),messages=$('messages'),input=$('input'),toLatest=$('toLatest'),choices=$('choices'),chatForm=$('chatForm');
const confirmBar=$('confirmBar'),syncNote=$('syncNote');
let UI=null;
let contact=null,mode='none',submitted=false,seq=0,dirty=false,timer=null,retry=0,inflight=false,awaitingContactForSubmit=false,done=false;
const nearBottom=()=>messages.scrollHeight-messages.scrollTop-messages.clientHeight<80;
const toBottom=()=>{messages.scrollTop=messages.scrollHeight;toLatest.hidden=true};
messages.addEventListener('scroll',()=>{if(nearBottom())toLatest.hidden=true});
toLatest.addEventListener('click',toBottom);
function startChat(){chat.classList.add('started');chatForm.hidden=false;requestAnimationFrame(()=>chat.scrollIntoView({block:'start',behavior:RM?'auto':'smooth'}));UI&&UI.enter()}
function bubble(text,user=false){const follow=user||nearBottom();const el=document.createElement('div');el.className='bubble'+(user?' user':'');el.textContent=text;messages.append(el);if(follow)toBottom();else toLatest.hidden=false}
function say(text){state.history.push({role:'assistant',text});bubble(text)}
function changed(){render();queueSave()}
function send(text){text=text.trim();if(!text)return;bubble(text,true);input.value='';
  if(submitted){say('접수는 끝났어요. 추가로 전하실 내용이나 파일은 '+fileHint()+'으로 보내주세요.'+(officialNo?' (의뢰번호 '+officialNo+')':''));return}
  const wasDone=E.complete(state);const r=E.ingest(state,text);
  bubble(wasDone&&r.field===null?'그 부분은 담당자가 직접 확인해 드릴게요. 준비되면 아래에서 의뢰를 접수해 주세요.':r.text);changed()}
chatForm.addEventListener('submit',e=>{e.preventDefault();send(input.value)});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();send(input.value)}});
choices.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const name=b.textContent.trim();bubble(name,true);state.history.push({role:'user',text:name});E.add(state,name);say(E.ask(state).text);changed();input.focus({preventScroll:true})}));

/* ① 이름·연락처 */
const PHONE=/^0\d{1,2}[- ]?\d{3,4}[- ]?\d{4}$/,MAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/* 휴대폰 번호는 010-1234-5678 형식으로 맞춰서 저장(구글시트에서 앞자리 0이 사라지지 않게) */
function fmtPhone(v){const d=v.replace(/\D/g,'');if(/^02/.test(d))return d.length===9?d.replace(/^(02)(\d{3})(\d{4})$/,'$1-$2-$3'):d.replace(/^(02)(\d{4})(\d{4})$/,'$1-$2-$3');return d.length===10?d.replace(/^(\d{3})(\d{3})(\d{4})$/,'$1-$2-$3'):d.replace(/^(\d{3})(\d{4})(\d{4})$/,'$1-$2-$3')}
function normContact(v){v=v.trim();if(MAIL.test(v))return v;if(PHONE.test(v))return fmtPhone(v);return null}
/* 연락처 칸: 기본은 숫자 키패드, '이메일로 남길게요'를 누르면 이메일 자판 */
(function(){const i=$('cContact'),t=$('cMailToggle'),hint=$('cContactHint');if(!t)return;let mail=false;
  t.addEventListener('click',()=>{mail=!mail;i.type=mail?'email':'tel';i.inputMode=mail?'email':'tel';i.autocomplete=mail?'email':'tel';i.placeholder=mail?'name@example.com':'010-1234-5678';hint.textContent=mail?'이메일':'휴대폰 번호';t.textContent=mail?'휴대폰 번호로 남길게요':'이메일로 남길게요';i.value='';i.focus()})})();
function formMsg(id,text,kind){const m=$(id);m.textContent=text;m.className='form-msg'+(kind?' '+kind:'')}
$('startForm').addEventListener('submit',e=>{e.preventDefault();
  const name=$('cName').value.trim(),raw=$('cContact').value.trim(),company=$('cCompany').value.trim();
  if(!name)return formMsg('startMsg','이름이나 닉네임을 적어주세요.','warn');
  const value=normContact(raw);
  if(!value)return formMsg('startMsg','휴대폰 번호(010-0000-0000)나 이메일을 확인해 주세요.','warn');
  if(!$('cConsent').checked)return formMsg('startMsg','개인정보 수집·이용에 동의해 주세요.','warn');
  contact={name,contact:value,company,website:$('cWebsite').value};mode='named';formMsg('startMsg','','');
  if(awaitingContactForSubmit){awaitingContactForSubmit=false;chat.classList.remove('asking');say(name+'님, 고마워요. 바로 접수할게요.');submitOrder();return}
  startChat();say(name+'님, 반가워요! 로그인 없이 이대로 진행돼요. 창이 닫혀도 남겨주신 연락처로 이어서 연락드릴게요.');
  say('어떤 걸 만들까요? 아래에서 고르거나 편하게 적어주세요.');choices.hidden=false;queueSave()});
$('browseOnly').addEventListener('click',()=>{mode='anon';startChat();say('둘러보기로 시작했어요. 이 경우 창을 닫으면 내용이 사라지고, 접수할 때 이름·연락처가 필요해요.');say('어떤 걸 만들까요? 아래에서 고르거나 편하게 적어주세요.');choices.hidden=false});

/* 依頼書・要約 */
function summaryText(){const sm=E.summary(state);return ['JPHIC 디자인 의뢰 요약'+(officialNo?' ('+officialNo+')':''),...(contact?['접수자: '+contact.name+' · '+contact.contact+(contact.company?' · '+contact.company:'')]:[]),...state.items.map(p=>['■ '+p.name,...E.ORDER.map(k=>E.fields[k]+': '+(p[k]||'미입력'))].join('\n')),...(sm.inquiries.length?['문의: '+sm.inquiries.join(', ')]:[])].join('\n\n')}
const sheetFields=$('sheetFields'),sheetNo=$('sheetNo');
/* 의뢰번호: 접수 서버(구글시트)가 정식 번호(예: E636C0)를 돌려주면 그걸 표시. 그 전에는 숨김 */
let officialNo='';
function sheetNumber(){sheetNo.textContent=officialNo?'No. '+officialNo:'';sheetNo.hidden=!officialNo}
function renderSheet(){sheetFields.replaceChildren();const p=state.items[state.active];sheetFields.hidden=!p;if(!p)return;
  const cell=(label,value,cls)=>{const d=document.createElement('div');if(cls)d.className=cls;const t=document.createElement('dt');t.textContent=label;const v=document.createElement('dd');
    if(value){v.textContent=value;v.className='done';v.title=value}else{v.textContent='확인 중';v.className='todo'}d.append(t,v);sheetFields.append(d)};
  cell(state.items.length>1?'품목 '+(state.active+1)+'/'+state.items.length:'품목',p.name,'item');{const n=E.ORDER.filter(k=>p[k]).length,pr=document.createElement('span');pr.className='prog';pr.textContent=n+' / '+E.ORDER.length;sheetFields.firstChild.append(pr)}
  for(const key of E.ORDER)cell(E.fields[key],p[key])}
function render(){renderSheet();UI&&UI.refresh();refreshFileWays();const host=$('summary');host.replaceChildren();const has=!!state.items.length;$('summarySection').hidden=!has;choices.hidden=!(chat.classList.contains('started')&&!has);
  const complete=E.complete(state);confirmBar.hidden=!(complete&&!submitted);$('confirmBtn').textContent=mode==='named'?'이대로 의뢰 접수하기':'이름·연락처 남기고 접수하기';
  const sb=$('submitOrder');sb.disabled=submitted||!has;sb.textContent=submitted?'접수 완료':(mode==='named'?'의뢰 접수하기':'이름·연락처 남기고 접수하기');
  const who=$('who');who.hidden=!contact;if(contact)who.textContent='접수자: '+contact.name+' · '+contact.contact+(contact.company?' · '+contact.company:'');
  const iq=$('inquiries'),sm=E.summary(state);iq.hidden=!sm.inquiries.length;iq.textContent='담당자 확인 필요: '+sm.inquiries.join(', ')+' 문의';
  if(!has)return;
  state.items.forEach((p,i)=>{const box=document.createElement('details');box.open=i===state.active;const t=document.createElement('summary');t.textContent=p.name+(i===state.active&&!complete?' · 확인 중':'');box.append(t);
    if(i!==state.active&&!submitted){const b=document.createElement('button');b.type='button';b.textContent='이 품목 이어서 상담';b.addEventListener('click',()=>{state.active=i;render();say(p.name+'에 대해 확인할게요. '+E.ask(state).text)});box.append(b)}
    for(const key of E.ORDER){const row=document.createElement('label');row.textContent=E.fields[key];const f=document.createElement('input');f.value=p[key];f.placeholder='미입력';f.maxLength=60;f.addEventListener('change',()=>{E.set(state,i,key,f.value);changed()});row.append(f);box.append(row)}
    if(p.changes.length){const w=document.createElement('p');w.className='changed';w.textContent='바뀐 조건은 금액과 일정을 다시 확인해요.';box.append(w)}
    host.append(box)})}
$('addItem').addEventListener('click',()=>{const el=$('itemName'),name=el.value.trim();if(!name)return;E.add(state,name);el.value='';if(!chat.classList.contains('started')){mode=mode==='none'?'anon':mode;startChat()}say(name+'도 함께 확인할게요. '+E.ask(state).text);changed()});
async function copy(text){try{await navigator.clipboard.writeText(text);return true}catch{const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.append(t);t.select();let ok=false;try{ok=document.execCommand('copy')}catch{}t.remove();return ok}}
$('copySummary').addEventListener('click',async e=>{const b=e.currentTarget,ok=await copy(summaryText());b.textContent=ok?'복사했어요':'복사 실패';setTimeout(()=>b.textContent='요약 복사',1600)});
document.querySelectorAll('.line-row [data-openchat]').forEach(a=>a.addEventListener('click',()=>{if(state.items.length)copy(summaryText())}));
$('reset').addEventListener('click',()=>{if(!confirm('지금 내용을 지우고 새 의뢰를 시작할까요?'))return;flush();state=E.make();submitted=false;done=false;seq=0;dirty=false;sheetNumber();messages.replaceChildren();toLatest.hidden=true;
  if(mode==='named'){say(contact.name+'님, 새 의뢰를 시작할게요. 어떤 걸 만들까요?')}else{chat.classList.remove('started');chatForm.hidden=true;mode='none'}render()});

/* ④ 送信 */
function submitOrder(){if(submitted)return;
  if(mode!=='named'){awaitingContactForSubmit=true;chat.classList.add('asking');$('welcomeTitle').textContent='접수할 연락처를 남겨주세요';$('welcomeNote').textContent='로그인은 필요 없어요. 이름(닉네임)과 연락처만 있으면 돼요.';$('browseOnly').hidden=true;$('startBtn').textContent='연락처 남기고 접수하기';chat.scrollIntoView({block:'start'});$('cName').focus({preventScroll:true});return}
  if(!C.intakeEndpoint){formMsg('orderMsg','접수 연결 준비 중이에요. 요약을 복사해 '+lineHint()+'으로 보내주세요.','warn');say('지금은 접수 연결을 준비하고 있어요. 아래 요약 복사 후 '+lineHint()+'으로 보내주시면 바로 확인할게요.');return}
  submitted=true;render();formMsg('orderMsg','접수하는 중이에요…','');syncNow('접수완료')}
$('confirmBtn').addEventListener('click',submitOrder);$('submitOrder').addEventListener('click',submitOrder);

/* スプレッドシート保存: 順番(seq)で古い保存が新しい保存を上書きしないようにし、失敗したら 2・5・10・30秒後に再送 */
function payload(status){const sm=E.summary(state);return {requestId:state.requestId,seq:++seq,status,source:'/atelier',contact:{name:contact.name,contact:contact.contact,company:contact.company},consent:true,website:contact.website||'',items:sm.items,inquiries:sm.inquiries,missing:sm.missing}}
function queueSave(){if(mode!=='named'||!C.intakeEndpoint)return;dirty=true;clearTimeout(timer);timer=setTimeout(()=>syncNow(submitted?'접수완료':'작성중'),800)}
function note(text,kind){syncNote.hidden=!text;syncNote.textContent=text;syncNote.className='sync-note'+(kind?' '+kind:'')}
async function syncNow(status){if(mode!=='named'||!C.intakeEndpoint)return;if(inflight){dirty=true;return}inflight=true;dirty=false;clearTimeout(timer);
  const body=JSON.stringify(payload(status));
  try{const r=await fetch(C.intakeEndpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body});const j=await r.json().catch(()=>({}));
    if(!(r.ok&&j.ok===true))throw new Error('fail');retry=0;note('','');if(j.no&&j.no!==officialNo){officialNo=String(j.no);sheetNumber();refreshFileWays()}
    if(status==='접수완료'&&!done){done=true;formMsg('orderMsg','접수됐어요. 확인 후 남겨주신 연락처로 연락드릴게요.','ok');say('접수됐어요! 확인 후 '+contact.contact+'로 연락드릴게요. 참고 파일은 '+fileHint()+'으로 보내주세요.'+(officialNo?' 의뢰번호는 '+officialNo+'예요.':''));render()}}
  catch{dirty=true;const wait=[2,5,10,30][Math.min(retry,3)];retry++;note('연결이 잠깐 불안정해요. '+wait+'초 뒤 자동으로 다시 저장할게요.','warn');setTimeout(()=>{if(dirty)syncNow(submitted?'접수완료':'작성중')},wait*1000)}
  finally{inflight=false;if(dirty&&retry===0)queueSave()}}
function flush(){if(mode!=='named'||!C.intakeEndpoint||!dirty)return;try{navigator.sendBeacon(C.intakeEndpoint,new Blob([JSON.stringify(payload(submitted?'접수완료':'작성중'))],{type:'text/plain;charset=utf-8'}));dirty=false}catch{}}
addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});

/* 2026-11-20: 휴대폰 전체 화면 대화 + 질문별 빠른 답 버튼(날짜·장소·크기·수량·자료·작업) — /atelier/consult-ui.js */
/* 품목별 자주 쓰는 규격 (크기 질문의 빠른 버튼) */
function sizePresets(name){name=name||'';
  if(/현수막|대형실사/.test(name))return ['5000×900mm','3000×700mm','6000×900mm'];
  if(/배너/.test(name))return ['600×1800mm','500×1600mm'];
  if(/포토|전시월|백월|가벽/.test(name))return ['3000×2400mm','2400×2400mm','4000×2400mm'];
  if(/LED|영상|사이니지|모션/.test(name))return ['1920×1080px','1080×1920px','3840×2160px'];
  if(/판촉|굿즈|스티커|칼선|아크릴/.test(name))return ['50×50mm','90×50mm','A5'];
  if(/포스터|키비주얼/.test(name))return ['A3','A2','A1','1080×1350px'];
  return ['A4','A3','A1','600×1800mm','3000×2400mm']}
if(window.JphicChatUI)UI=window.JphicChatUI({chat,chatForm,messages,input,send,texts:{close:'닫기 ✕',resume:'대화 이어서 하기',calendar:'달력에서 날짜 고르기',mmdd:'날짜를 바로 입력 (월-일)',ok:'입력'},
  options:{
  deadline:{type:'single',date:{fmt:(m,d)=>m+'월 '+d+'일'},chips:['이번 주','다음 주','이번 달 말','최대한 빨리','미정이에요']},
  place:{type:'single',chips:['행사장 입구','매장 벽면','팝업스토어','전시장','사무실·로비','온라인·SNS'],other:{label:'기타',placeholder:'사용할 곳을 적어주세요'}},
  size:{type:'size',presets:sizePresets,chips:['아직 몰라요'],form:{label:'직접 입력',w:'가로',h:'세로',units:['mm','cm','m','px'],ok:'입력'}},
  quantity:{type:'single',chips:['1개','2개','3개','5개','10개','100개'],other:{label:'직접 입력',placeholder:'수량을 숫자로 적어주세요',numeric:true}},
  assets:{type:'multi',chips:['로고 파일','사진·이미지','PPT·문서','AI로 만든 이미지','원고(문구)'],none:'아직 없어요',done:'선택 완료 →'},
  scope:{type:'multi',chips:['새 디자인','보정','벡터화','리사이징','칼선','출력·제작'],other:{label:'기타',placeholder:'필요한 작업을 적어주세요'},done:'선택 완료 →'}},
  currentItem:()=>{const p=state.items[state.active];return p?p.name:''},
  currentField:()=>{if(submitted||chat.classList.contains('asking'))return null;const p=state.items[state.active];return p?(E.ORDER.find(k=>!p[k])||null):null}});
sheetNumber();render();
})();
