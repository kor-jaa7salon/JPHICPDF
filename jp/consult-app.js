// 2026-11-20: /jp 日本語版 デザイン依頼書の画面動作 — /new/app.js (v0.9) と同じ流れ・同じシート保存形式。
// 流れ: ① お名前・連絡先・同意 → ② 品目を選ぶ → ③ 質問に答える(欄には要約だけ) → ④「依頼を送信する」
// 保存: 名前・連絡先を入れた場合だけ Googleスプレッドシートへ。答えが変わるたびに「작성중」で更新(0.8秒まとめて)、閉じるときにもう一度送信。
//       「依頼を送信する」で「접수완료」(このときだけシート側からテレグラム通知)。連絡先なしの「見てみる」は何も保存・送信しない。
//       シートで分かるよう lang:'ja', source:'/jp' を付け、受付番号は JPHIC-JP-… で始まる。ステータス名は /new と同じ韓国語のまま。
(function(){
'use strict';
const E=window.JphicConsultJa,C=window.JPHIC_JP_CONFIG||{},$=id=>document.getElementById(id);
if(!E)return;
let state=E.make();
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* LINE: リンクがあればボタン、なければ ID とコピーボタン */
document.querySelectorAll('[data-line]').forEach(a=>{if(C.lineUrl){a.href=C.lineUrl;a.hidden=false}});
document.querySelectorAll('[data-line-id]').forEach(p=>{if(!C.lineUrl&&C.lineId){p.querySelector('b').textContent=C.lineId;p.hidden=false}});
document.querySelectorAll('[data-copy-id]').forEach(b=>b.addEventListener('click',async()=>{const ok=await copy(C.lineId||'');b.textContent=ok?'コピーしました':'コピーできませんでした';setTimeout(()=>b.textContent='IDをコピー',1600)}));
if(C.retention)$('retentionLine').textContent='保管期間：'+C.retention;
const lineHint=()=>C.lineUrl?'LINE':(C.lineId?'LINE（ID：'+C.lineId+'）':'LINE');
/* ファイルの送り方: LINE・メール・Googleドライブ共有リンク。メールの件名に受付番号を入れる */
const fileHint=()=>'LINE・メール（'+(C.fileEmail||'')+'）・Googleドライブの共有リンクのいずれか';
function refreshFileWays(){const no=state.requestId;document.querySelectorAll('[data-mail]').forEach(a=>{if(!C.fileEmail)return;a.textContent=C.fileEmail;a.href='mailto:'+C.fileEmail+'?subject='+encodeURIComponent('[JPHIC] ファイル送付 '+no)});
  document.querySelectorAll('[data-reqno]').forEach(p=>{p.querySelector('b').textContent=no;p.hidden=!(contact&&state.items.length)})}

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
  if(submitted){say('受付は完了しています。追加の内容やファイルは'+fileHint()+'で送ってください（受付番号 '+state.requestId+'）。');return}
  const wasDone=E.complete(state);const r=E.ingest(state,text);
  bubble(wasDone&&r.field===null?'その件は担当者が直接確認してご案内します。準備ができたら、下から依頼を送信してください。':r.text);changed()}
chatForm.addEventListener('submit',e=>{e.preventDefault();send(input.value)});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();send(input.value)}});
choices.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const name=b.textContent.trim();bubble(name,true);state.history.push({role:'user',text:name});E.add(state,name,b.dataset.ko||'');say(E.ask(state).text);changed();input.focus({preventScroll:true})}));

/* ① お名前・連絡先 (電話・メール・LINE ID) */
const PHONE=/^(\+?\d{1,3}[- ]?)?0?\d{1,4}[- ]?\d{1,4}[- ]?\d{3,4}$/,MAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/,LINEID=/^@?[A-Za-z0-9._-]{4,20}$/;
function normContact(v){v=v.replace(/[０-９Ａ-Ｚａ-ｚ＠－]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).replace(/^line\s*(id)?\s*[:：]?\s*/i,'').trim();
  if(MAIL.test(v))return v;
  if(PHONE.test(v)&&v.replace(/\D/g,'').length>=9)return v;
  if(LINEID.test(v))return 'LINE: '+v;
  return null}
function formMsg(id,text,kind){const m=$(id);m.textContent=text;m.className='form-msg'+(kind?' '+kind:'')}
$('startForm').addEventListener('submit',e=>{e.preventDefault();
  const name=$('cName').value.trim(),raw=$('cContact').value.trim(),company=$('cCompany').value.trim();
  if(!name)return formMsg('startMsg','お名前かニックネームを入力してください。','warn');
  const value=normContact(raw);
  if(!value)return formMsg('startMsg','LINE ID・メールアドレス・電話番号のいずれかを確認してください。','warn');
  if(!$('cConsent').checked)return formMsg('startMsg','個人情報の収集・利用への同意にチェックしてください。','warn');
  contact={name,contact:value,company,website:$('cWebsite').value};mode='named';formMsg('startMsg','','');
  if(awaitingContactForSubmit){awaitingContactForSubmit=false;chat.classList.remove('asking');say(name+'さん、ありがとうございます。このまま送信します。');submitOrder();return}
  startChat();say(name+'さん、こんにちは！ログインなしでこのまま進められます。ウィンドウを閉じても、いただいた連絡先から続けてご連絡します。');
  say('何を作りましょうか？下から選ぶか、自由に書いてください。');choices.hidden=false;queueSave()});
$('browseOnly').addEventListener('click',()=>{mode='anon';startChat();say('「見てみる」で始めました。この場合、閉じると内容は消えます。送信するときにお名前と連絡先が必要です。');say('何を作りましょうか？下から選ぶか、自由に書いてください。');choices.hidden=false});

/* 依頼書・要約 */
function summaryText(){const sm=E.summary(state);return ['JPHIC デザイン依頼の要約 ('+state.requestId+')',...(contact?['依頼者: '+contact.name+' · '+contact.contact+(contact.company?' · '+contact.company:'')]:[]),...state.items.map(p=>['■ '+p.name,...E.ORDER.map(k=>E.fields[k]+': '+(p[k]||'未入力'))].join('\n')),...(sm.inquiries.length?['お問い合わせ: '+sm.inquiries.join('、')]:[])].join('\n\n')}
const sheetFields=$('sheetFields'),sheetNo=$('sheetNo');
function sheetNumber(){sheetNo.textContent='No. '+state.requestId.replace('JPHIC-JP-','').slice(-6).toUpperCase()}
function renderSheet(){sheetFields.replaceChildren();const p=state.items[state.active];sheetFields.hidden=!p;if(!p)return;
  const cell=(label,value,cls)=>{const d=document.createElement('div');if(cls)d.className=cls;const t=document.createElement('dt');t.textContent=label;const v=document.createElement('dd');
    if(value){v.textContent=value;v.className='done';v.title=value}else{v.textContent='確認中';v.className='todo'}d.append(t,v);sheetFields.append(d)};
  cell(state.items.length>1?'品目 '+(state.active+1)+'/'+state.items.length:'品目',p.name,'item');
  for(const key of E.ORDER)cell(E.fields[key],p[key])}
function render(){renderSheet();UI&&UI.refresh();refreshFileWays();const host=$('summary');host.replaceChildren();const has=!!state.items.length;$('summarySection').hidden=!has;choices.hidden=!(chat.classList.contains('started')&&!has);
  const complete=E.complete(state);confirmBar.hidden=!(complete&&!submitted);$('confirmBtn').textContent=mode==='named'?'この内容で依頼する':'お名前・連絡先を入れて依頼する';
  const sb=$('submitOrder');sb.disabled=submitted||!has;sb.textContent=submitted?'送信済み':(mode==='named'?'依頼を送信する':'お名前・連絡先を入れて送信する');
  const who=$('who');who.hidden=!contact;if(contact)who.textContent='依頼者：'+contact.name+' · '+contact.contact+(contact.company?' · '+contact.company:'');
  const iq=$('inquiries'),sm=E.summary(state);iq.hidden=!sm.inquiries.length;iq.textContent='担当者の確認が必要：'+sm.inquiries.join('、')+'についてのお問い合わせ';
  if(!has)return;
  state.items.forEach((p,i)=>{const box=document.createElement('details');box.open=i===state.active;const t=document.createElement('summary');t.textContent=p.name+(i===state.active&&!complete?' · 確認中':'');box.append(t);
    if(i!==state.active&&!submitted){const b=document.createElement('button');b.type='button';b.textContent='この品目の相談を続ける';b.addEventListener('click',()=>{state.active=i;render();say(p.name+'について確認します。'+E.ask(state).text)});box.append(b)}
    for(const key of E.ORDER){const row=document.createElement('label');row.textContent=E.fields[key];const f=document.createElement('input');f.value=p[key];f.placeholder='未入力';f.maxLength=60;f.addEventListener('change',()=>{E.set(state,i,key,f.value);changed()});row.append(f);box.append(row)}
    if(p.changes.length){const w=document.createElement('p');w.className='changed';w.textContent='変わった条件は、金額と日程をあらためて確認します。';box.append(w)}
    host.append(box)})}
$('addItem').addEventListener('click',()=>{const el=$('itemName'),name=el.value.trim();if(!name)return;E.add(state,name);el.value='';if(!chat.classList.contains('started')){mode=mode==='none'?'anon':mode;startChat()}say(name+'も一緒に確認します。'+E.ask(state).text);changed()});
async function copy(text){try{await navigator.clipboard.writeText(text);return true}catch{const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.append(t);t.select();let ok=false;try{ok=document.execCommand('copy')}catch{}t.remove();return ok}}
$('copySummary').addEventListener('click',async e=>{const b=e.currentTarget,ok=await copy(summaryText());b.textContent=ok?'コピーしました':'コピーできませんでした';setTimeout(()=>b.textContent='要約をコピー',1600)});
document.querySelectorAll('.line-row [data-line]').forEach(a=>a.addEventListener('click',()=>{if(state.items.length)copy(summaryText())}));
$('reset').addEventListener('click',()=>{if(!confirm('今の内容を消して、新しい依頼をはじめますか？'))return;flush();state=E.make();submitted=false;done=false;seq=0;dirty=false;sheetNumber();messages.replaceChildren();toLatest.hidden=true;
  if(mode==='named'){say(contact.name+'さん、新しい依頼をはじめます。何を作りましょうか？')}else{chat.classList.remove('started');chatForm.hidden=true;mode='none'}render()});

/* ④ 送信 */
function submitOrder(){if(submitted)return;
  if(mode!=='named'){awaitingContactForSubmit=true;chat.classList.add('asking');$('welcomeTitle').textContent='送信先の連絡先を教えてください';$('welcomeNote').textContent='ログインは不要です。お名前（ニックネーム）と連絡先だけで大丈夫です。';$('browseOnly').hidden=true;$('startBtn').textContent='連絡先を入れて送信する';chat.scrollIntoView({block:'start'});$('cName').focus({preventScroll:true});return}
  if(!C.intakeEndpoint){formMsg('orderMsg','受付の接続を準備中です。要約をコピーして'+lineHint()+'で送ってください。','warn');say('ただいま受付の接続を準備しています。下の「要約をコピー」のあと、'+lineHint()+'で送っていただければすぐに確認します。');return}
  submitted=true;render();formMsg('orderMsg','送信しています…','');syncNow('접수완료')}
$('confirmBtn').addEventListener('click',submitOrder);$('submitOrder').addEventListener('click',submitOrder);

/* スプレッドシート保存: 順番(seq)で古い保存が新しい保存を上書きしないようにし、失敗したら 2・5・10・30秒後に再送 */
function payload(status){const sm=E.summary(state);return {requestId:state.requestId,seq:++seq,status,lang:'ja',source:'/jp',contact:{name:contact.name,contact:contact.contact,company:contact.company},consent:true,website:contact.website||'',items:sm.items,inquiries:sm.inquiries,missing:sm.missing}}
function queueSave(){if(mode!=='named'||!C.intakeEndpoint)return;dirty=true;clearTimeout(timer);timer=setTimeout(()=>syncNow(submitted?'접수완료':'작성중'),800)}
function note(text,kind){syncNote.hidden=!text;syncNote.textContent=text;syncNote.className='sync-note'+(kind?' '+kind:'')}
async function syncNow(status){if(mode!=='named'||!C.intakeEndpoint)return;if(inflight){dirty=true;return}inflight=true;dirty=false;clearTimeout(timer);
  const body=JSON.stringify(payload(status));
  try{const r=await fetch(C.intakeEndpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body});const j=await r.json().catch(()=>({}));
    if(!(r.ok&&j.ok===true))throw new Error('fail');retry=0;note('','');
    if(status==='접수완료'&&!done){done=true;formMsg('orderMsg','送信しました。確認後、いただいた連絡先にご連絡します。','ok');say('受け付けました！確認後、'+contact.contact+' にご連絡します。参考ファイルは'+fileHint()+'で送ってください。受付番号は '+state.requestId+' です。');render()}}
  catch{dirty=true;const wait=[2,5,10,30][Math.min(retry,3)];retry++;note('接続が少し不安定です。'+wait+'秒後に自動で保存し直します。','warn');setTimeout(()=>{if(dirty)syncNow(submitted?'접수완료':'작성중')},wait*1000)}
  finally{inflight=false;if(dirty&&retry===0)queueSave()}}
function flush(){if(mode!=='named'||!C.intakeEndpoint||!dirty)return;try{navigator.sendBeacon(C.intakeEndpoint,new Blob([JSON.stringify(payload(submitted?'접수완료':'작성중'))],{type:'text/plain;charset=utf-8'}));dirty=false}catch{}}
addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});

/* 2026-11-20: 휴대폰 전체 화면 대화 + 빠른 답 버튼(자료 있음/없음) — /atelier/consult-ui.js */
if(window.JphicChatUI)UI=window.JphicChatUI({chat,chatForm,messages,texts:{close:'閉じる ✕',resume:'相談を続ける'},quick:{assets:[['はい、あります','資料あり'],['いいえ、ありません','資料なし']]},
  currentField:()=>{if(submitted||chat.classList.contains('asking'))return null;const p=state.items[state.active];return p?(E.ORDER.find(k=>!p[k])||null):null},
  onQuick:(f,label,value)=>{bubble(label,true);state.history.push({role:'user',text:label});E.set(state,state.active,f,value);say(E.ask(state).text);changed()}});
sheetNumber();render();
})();
