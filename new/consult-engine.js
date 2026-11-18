// 2026-11-18: v0.9 상담 엔진 v3 — 칸에는 요약·정규화된 값만 저장(원문 통째 저장 금지), 고객 질문은 문의사항으로 분리, 상대 날짜 계산, 한글 수량, 단위 없는 규격 표시.
(function(root){
'use strict';
const fields={deadline:'필요 날짜',place:'사용 장소',size:'규격',quantity:'수량',assets:'자료 준비',scope:'작업 범위'};
const ORDER=['deadline','place','size','quantity','assets','scope'];
const labels=['백월','포토월','포토존','전시월','가벽','현수막','배너','사이니지','전광판','LED','등신대','스카시','굿즈','판촉물','바닥','로고','포스터','키비주얼','명함','리플렛','스티커','엑스배너','X배너','타이틀','티셔츠','머그','에코백'];
const DAYS=['일','월','화','수','목','금','토'];
const UNDECIDED=/미정|모르|몰라|아직\s*(안|못)?\s*정|정해지지|상관\s*없|아무\s*때나|글쎄/;

function make(opts){const now=(opts&&opts.now)?new Date(opts.now):new Date();
  return {version:3,items:[],history:[],inquiries:[],active:0,now:now.getTime(),requestId:'JPHIC-'+now.getTime().toString(36)+Math.random().toString(36).slice(2,6)}}
function item(name){return {name,deadline:'',place:'',size:'',quantity:'',assets:'',scope:'',changes:[]}}
function clip(v,n){return String(v).trim().slice(0,n)}

/* 짧은 답만 그대로 쓰고, 긴 문장은 칸에 넣지 않는다 */
function shortPhrase(text){let t=String(text).replace(/[\r\n]+/g,' ').replace(/[.!~…]+$/,'').trim();
  t=t.replace(/\s*(이에요|예요|이요|입니다|이구요|이고요|고요|이요\.|요|에서\s*쓸\s*거?예요|에서\s*써요|에\s*쓸\s*거?예요|할\s*거?예요|하려고요|정도)$/,'').trim();
  return t&&t.length<=15?t:''}

/* ── 날짜 ── */
function fmtDate(d,now){const y=d.getFullYear();return (y!==now.getFullYear()?y+'년 ':'')+(d.getMonth()+1)+'/'+d.getDate()+'('+DAYS[d.getDay()]+')'}
function addDays(d,n){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()+n);return x}
function parseDeadline(text,nowMs){const now=new Date(nowMs),t=String(text);
  if(UNDECIDED.test(t))return '미정';
  if(/최대한\s*빨리|급해|급하|asap|빠를수록|빨리\s*요/i.test(t))return '최대한 빨리';
  let m=t.match(/(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
  if(m)return fmtDate(new Date(+m[1],+m[2]-1,+m[3]),now);
  m=t.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/)||t.match(/(?<![\d.])(\d{1,2})\s*[./]\s*(\d{1,2})(?![\d.]|\s*(?:mm|cm|m\b|미터|센))/);
  if(m){const mo=+m[1],da=+m[2];if(mo>=1&&mo<=12&&da>=1&&da<=31){let d=new Date(now.getFullYear(),mo-1,da);if(d<addDays(now,0))d=new Date(now.getFullYear()+1,mo-1,da);return fmtDate(d,now)}}
  if(/오늘/.test(t))return fmtDate(addDays(now,0),now);
  if(/내일/.test(t))return fmtDate(addDays(now,1),now);
  if(/모레/.test(t))return fmtDate(addDays(now,2),now);
  if(/글피/.test(t))return fmtDate(addDays(now,3),now);
  m=t.match(/(\d{1,2})\s*일\s*(?:뒤|후|안에|이내|내로)/);if(m)return fmtDate(addDays(now,+m[1]),now)+'까지';
  const monIdx=(now.getDay()+6)%7,monday=addDays(now,-monIdx);
  m=t.match(/(이번|다음|담|다다음)\s*주\s*([월화수목금토일])/);
  if(m){const w=m[1]==='이번'?0:m[1]==='다다음'?2:1;const di=(DAYS.indexOf(m[2])+6)%7;return fmtDate(addDays(monday,w*7+di),now)}
  m=t.match(/(이번|다음|담|다다음)\s*주/);
  if(m){const w=m[1]==='이번'?0:m[1]==='다다음'?2:1;const a=addDays(monday,w*7),b=addDays(a,6);return fmtDate(a,now)+'~'+fmtDate(b,now)+' 중'}
  m=t.match(/(?:^|\s)([월화수목금토일])요일/);
  if(m){const target=DAYS.indexOf(m[1]);let diff=(target-now.getDay()+7)%7;return fmtDate(addDays(now,diff),now)}
  if(/(이번\s*)?(달|월)\s*말|월말/.test(t))return (now.getMonth()+1)+'월 말';
  if(/다음\s*달/.test(t))return (now.getMonth()+2>12?1:now.getMonth()+2)+'월 중';
  return null}

/* ── 규격 ── */
const UNIT={mm:'mm',cm:'cm',m:'m','밀리':'mm','미리':'mm','센치':'cm','센티':'cm','미터':'m','메타':'m'};
function unitOf(u){return u?UNIT[u.toLowerCase()]||u:''}
function parseSize(text){const t=String(text);
  if(UNDECIDED.test(t)&&!/\d/.test(t))return '미정';
  let m=t.match(/(\d+(?:\.\d+)?)\s*(mm|cm|m|밀리|미리|센치|센티|미터)?\s*[x×*X]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|밀리|미리|센치|센티|미터)?/i);
  if(m){const u=unitOf(m[4]||m[2]);return m[1]+'×'+m[3]+(u?u:' (단위 확인)')}
  m=t.match(/가로\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|밀리|미리|센치|센티|미터)?[\s,·및]*(?:세로|높이)\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|밀리|미리|센치|센티|미터)?/i);
  if(m){const u1=unitOf(m[2]||m[4]),u2=unitOf(m[4]||m[2]);return m[1]+(u1!==u2?u1:'')+'×'+m[3]+(u2||' (단위 확인)')}
  m=t.match(/\b([AB][0-6])\b/i);if(m&&/사이즈|용지|규격|크기|\b[AB][0-6]\b/i.test(t))return m[1].toUpperCase();
  return null}

/* ── 수량 ── */
const KNUM={'한':1,'하나':1,'두':2,'둘':2,'세':3,'셋':3,'석':3,'네':4,'넷':4,'다섯':5,'여섯':6,'일곱':7,'여덟':8,'아홉':9,'열':10,'스무':20,'스물':20};
function parseQuantity(text,forced){const t=String(text);
  if(forced&&UNDECIDED.test(t))return '미정';
  let m=t.match(/(\d{1,6})\s*(개|장|세트|부|매|ea|pcs|set|종|벌|권)(?![가-힣])/i);if(m)return m[1]+(m[2]==='종'?'종':'');
  m=t.match(/(하나|한|두|둘|세|셋|석|네|넷|다섯|여섯|일곱|여덟|아홉|열|스무|스물)\s*(개|장|세트|부|매|종|벌|권)/);if(m)return String(KNUM[m[1]])+(m[2]==='종'?'종':'');
  if(forced){m=t.match(/^\s*(\d{1,6})\s*(개|장)?\s*(이요|요|입니다)?\s*$/);if(m)return m[1];
    m=t.match(/^\s*(하나|둘|셋|넷|다섯|여섯|일곱|여덟|아홉|열)\s*(이요|요)?\s*$/);if(m)return String(KNUM[m[1]])}
  return null}

/* ── 사용 장소: 장소 낱말만 모아 요약 ── */
const PLACES=['행사장','전시장','박람회','컨벤션','코엑스','킨텍스','벡스코','매장','팝업','카페','식당','사무실','로비','학교','강당','체육관','호텔','연회장','무대','야외','실외','실내','입구','벽면','기둥','창문','엘리베이터','회의실','병원','교회','공연장','온라인','SNS','인스타','홈페이지','유튜브','현장'];
function parsePlace(text,forced){const t=String(text);if(forced&&UNDECIDED.test(t))return '미정';
  const found=PLACES.filter(p=>t.includes(p));if(found.length)return found.join(' ');
  if(forced){const s=shortPhrase(t);return s||'원문 확인'}return null}

/* ── 자료 준비: 종류로 분류 ── */
function parseAssets(text,forced){const t=String(text),out=[];
  const no=/없(어|음|고|는|습)|아직\s*없|준비\s*안/.test(t);
  if(/원본|\.ai\b|ai\s*파일|일러\s*(스트)?\s*파일|psd|pdf|벡터\s*파일|eps/i.test(t))out.push('원본 파일');
  if(/로고/.test(t))out.push('로고');
  if(/사진|이미지|jpg|jpeg|png|캡처|캡쳐/i.test(t))out.push('이미지');
  if(/ppt|피피티|hwp|한글\s*파일|워드|엑셀/i.test(t))out.push('문서(PPT 등)');
  if(/원고|문구|텍스트|글\s*내용/.test(t))out.push('원고');
  if(/저해상도|깨져|깨지|흐려|화질|작은\s*이미지/.test(t))out.push('저해상도');
  if(/ai\s*로\s*만든|ai\s*생성|생성형|미드저니|챗\s*gpt|chatgpt|달리|나노\s*바나나/i.test(t))out.push('AI 생성');
  if(out.length)return out.map(x=>no&&out.length===1?x+' 없음':x).join(', ');
  if(no)return '자료 없음';
  if(forced){if(UNDECIDED.test(t))return '미정';const s=shortPhrase(t);return s||'원문 확인'}
  return null}

/* ── 작업 범위 ── */
function parseScope(text,forced){const t=String(text),out=[];
  if(/보정|리터치|선명|화질\s*개선|업스케일/.test(t))out.push('보정');
  if(/벡터|트레이싱/.test(t))out.push('벡터화');
  if(/재제작|다시\s*그|새로\s*그/.test(t))out.push('재제작');
  if(/누끼|배경\s*(제거|지워|따)/.test(t))out.push('누끼');
  if(/칼선/.test(t))out.push('칼선');
  if(/새\s*디자인|기획|처음부터|시안|새로\s*만들|디자인\s*(부터|도|해)/.test(t))out.push('새 디자인');
  if(/배치|편집|리사이즈|리사이징|사이즈\s*(변경|조정)|수정/.test(t))out.push('배치·편집');
  if(/인쇄|출력|제작\s*만|제작도/.test(t))out.push('출력·제작');
  if(out.length)return [...new Set(out)].join(', ');
  if(forced){if(UNDECIDED.test(t))return '미정';const s=shortPhrase(t);return s||'원문 확인'}
  return null}

const PARSE={deadline:(t,s,f)=>parseDeadline(t,s.now)||(f?(shortPhrase(t)||'원문 확인'):null),place:(t,s,f)=>parsePlace(t,f),size:(t,s,f)=>parseSize(t)||(f?(UNDECIDED.test(t)?'미정':(shortPhrase(t)||'원문 확인')):null),quantity:(t,s,f)=>parseQuantity(t,f)||(f?(shortPhrase(t)||'원문 확인'):null),assets:(t,s,f)=>parseAssets(t,f),scope:(t,s,f)=>parseScope(t,f)};

/* ── 고객 질문 → 문의사항(주제만) ── */
function inquiryTopics(text){const t=String(text);
  const asks=/\?|？|얼마|가능(한가요|할까요|해요\?|하나요|할지)|되나요|될까요|돼요\?|되요\?|어떻게|할\s*수\s*있(나|을까|어)|해\s*주(시나요|나요|실\s*수)|궁금/.test(t);
  if(!asks)return [];const out=[];
  if(/얼마|가격|비용|견적|단가|금액/.test(t))out.push('가격');
  if(/며칠|기간|언제|일정|빨리|급|납기/.test(t))out.push('일정');
  if(/설치|시공/.test(t))out.push('설치');
  if(/배송|택배|퀵|배달|화물/.test(t))out.push('배송');
  if(/파일|형식|보내|전달|업로드/.test(t))out.push('파일 전달');
  if(/재질|소재|종이|원단/.test(t))out.push('재질');
  if(/수정|시안\s*몇/.test(t))out.push('수정 횟수');
  return out.length?out:['기타 질문']}

function set(s,index,key,value){if(!s.items[index]||!(key in fields)||typeof value!=='string')return;const p=s.items[index];value=clip(value,60);if(p[key]&&p[key]!==value)p.changes.push({field:key,before:p[key],after:value});p[key]=value}

const QUESTIONS={
  deadline:'언제까지 받아야 하세요? 행사일이 있으면 같이 알려주세요. 미정이어도 괜찮아요.',
  place:'어디에 쓰실 예정이에요? (예: 행사장 입구, 매장 벽면, 온라인)',
  size:'가로·세로 크기를 단위와 함께 알려주세요. (예: 300×200cm) 모르면 "미정"이라고 해주세요.',
  quantity:'몇 개 필요하세요?',
  assets:'가지고 계신 자료가 있나요? (예: 로고 파일, 사진, PPT, AI로 만든 이미지)',
  scope:'어떤 작업이 필요하세요? (예: 보정, 벡터화, 새 디자인, 출력만)'};
function ask(s){const p=s.items[s.active];if(!p)return {field:'name',text:'어떤 걸 만들까요? 아래에서 고르거나 편하게 적어주세요.'};
  for(const key of ORDER)if(!p[key])return {field:key,text:QUESTIONS[key]};
  const next=s.items.findIndex(x=>ORDER.some(k=>!x[k]));
  if(next>=0){s.active=next;return {field:ORDER.find(k=>!s.items[next][k]),text:s.items[next].name+'도 확인할게요. '+QUESTIONS[ORDER.find(k=>!s.items[next][k])]}}
  return {field:null,text:'제작 전에 필요한 정보가 모두 모였어요. 아래 내용을 확인하고 접수해 주세요.'}}

function itemNameFrom(text){const found=labels.filter(x=>text.includes(x));if(found.length)return found;
  if(/이미지|벡터|누끼|칼선|보정|화질/.test(text))return ['이미지 보정·제작파일'];
  const s=shortPhrase(text);return [s||'기타 제작물']}

function ingest(s,text){text=clip(text,2000);if(!text)return ask(s);const prior=ask(s);s.history.push({role:'user',text});
  const topics=inquiryTopics(text);topics.forEach(x=>{if(!s.inquiries.includes(x))s.inquiries.push(x)});
  if(!s.items.length){itemNameFrom(text).forEach(n=>s.items.push(item(n)));s.active=0}
  const multi=labels.filter(x=>text.includes(x)).length>1;const p=s.items[s.active];let got=0;
  const correcting=/바꿔|바꾸|변경|아니(고|라)|말고|정정|수정할게/.test(text);
  if(!multi){for(const key of ORDER){if(p[key]&&key!==prior.field&&!correcting)continue;const v=PARSE[key](text,s,false);if(v){set(s,s.active,key,v);got++}}}
  // 현재 질문에 대한 답인데 위에서 못 뽑았으면, 질문이 아닐 때만 짧게 요약해 채운다
  if(prior.field&&prior.field!=='name'&&!p[prior.field]&&!multi&&!topics.length){const v=PARSE[prior.field](text,s,true);if(v)set(s,s.active,prior.field,v)}
  let next=ask(s);
  if(topics.length&&!got)next={field:next.field,text:'그 부분('+topics.join('·')+')은 담당자가 확인해서 안내드릴게요. '+next.text};
  if(multi)next={field:next.field,text:'먼저 '+p.name+'부터 확인할게요. '+next.text};
  s.history.push({role:'assistant',text:next.text});return next}

function add(s,name){s.items.push(item(clip(name,30)||'추가 품목'));s.active=s.items.length-1}
function missing(s){const out=[];s.items.forEach(p=>ORDER.forEach(k=>{if(!p[k]||p[k]==='원문 확인'||/단위 확인/.test(p[k]))out.push((s.items.length>1?p.name+' ':'')+fields[k])}));return out}
function complete(s){return s.items.length>0&&s.items.every(p=>ORDER.every(k=>p[k]))}
/* 시트 저장용 요약 (원문은 history로만) */
function summary(s){return {requestId:s.requestId,items:s.items.map(p=>{const o={name:p.name};ORDER.forEach(k=>o[k]=p[k]);o.changed=p.changes.map(c=>fields[c.field]).filter((v,i,a)=>a.indexOf(v)===i);return o}),inquiries:s.inquiries.slice(),missing:missing(s)}}
function exportDraft(s){return {schemaVersion:2,requestId:s.requestId,status:complete(s)?'조건확인완료':'조건수집',items:s.items.map(p=>({category:'디자인·제작 상담',detail:p.name,size:p.size,quantity:/^\d+$/.test(p.quantity)?Number(p.quantity):null,unitPrice:null,amount:null,note1:p.scope,note2:[p.place,p.deadline,p.assets].filter(Boolean).join(' / '),missing:ORDER.filter(k=>!p[k]||p[k]==='미정'||p[k]==='원문 확인'),requiresRequote:p.changes.some(c=>['size','quantity','scope'].includes(c.field))})),pricing:{source:'기존 구글시트 기준 확인 필요',productionMultiplier:1.5,vatRate:0.1,shippingTaxable:false,total:null}}}

const api={fields,ORDER,make,set,ask,ingest,add,missing,complete,summary,exportDraft,_parse:{parseDeadline,parseSize,parseQuantity,parsePlace,parseAssets,parseScope,inquiryTopics,shortPhrase}};
if(typeof module!=='undefined')module.exports=api;else root.JphicConsult=api;
})(globalThis);
