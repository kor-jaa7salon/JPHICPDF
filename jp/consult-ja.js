// 2026-11-20: /jp 日本語版 相談エンジン — /new の consult-engine(v3) と同じ構造(項目・順番・シート保存形式)で、日本語の入力を読み取る版。
// シートの欄には要約・正規化した値だけを保存(原文はそのまま入れない)。品目名はシートで分かるよう韓国語名を併記。
(function(root){
'use strict';
const fields={deadline:'必要な日付',place:'使用場所',size:'サイズ',quantity:'数量',assets:'お手持ちの資料',scope:'作業内容'};
const ORDER=['deadline','place','size','quantity','assets','scope'];
// 文中から品目を見つけるための語。[日本語, 韓国語(シート用)]
const LABELS=[['バックパネル','백월'],['フォトスポット','포토존'],['フォトウォール','포토월'],['フォトブース','포토존'],['展示壁','전시월'],
  ['横断幕','현수막'],['懸垂幕','현수막'],['タペストリー','현수막'],['Xバナー','X배너'],['バナー','배너'],['のぼり','배너'],['サイネージ','사이니지'],['LED','LED'],['モーション','모션'],
  ['等身大パネル','등신대'],['等身大','등신대'],['アクリルスタンド','아크릴스탠드'],['アクスタ','아크릴스탠드'],['アクリルキーホルダー','아크릴키링'],['アクキー','아크릴키링'],
  ['ステッカー','스티커'],['シール','스티커'],['ノベルティ','판촉물'],['販促','판촉물'],['グッズ','굿즈'],['ロゴ','로고'],['ポスター','포스터'],['キービジュアル','키비주얼'],
  ['メインビジュアル','키비주얼'],['名刺','명함'],['チラシ','리플렛'],['フライヤー','리플렛'],['パンフレット','리플렛'],['メニュー','메뉴판'],['Tシャツ','티셔츠'],['マグカップ','머그'],
  ['トートバッグ','에코백'],['エコバッグ','에코백'],['看板','간판']];
const DAYS=['日','月','火','水','木','金','土'];
const UNDECIDED=/未定|まだ(決|わか|分か)|決まって(い)?ない|わから|分から|未確定|どちらでも|いつでも/;

function make(opts){const now=(opts&&opts.now)?new Date(opts.now):new Date();
  return {version:3,lang:'ja',items:[],history:[],inquiries:[],active:0,now:now.getTime(),requestId:'JPHIC-JP-'+now.getTime().toString(36)+Math.random().toString(36).slice(2,6)}}
function item(name,ko){return {name,ko:ko||'',deadline:'',place:'',size:'',quantity:'',assets:'',scope:'',changes:[]}}
function clip(v,n){return String(v).trim().slice(0,n)}
const z2h=s=>String(s).replace(/[０-９Ａ-Ｚａ-ｚ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0)).replace(/[×✕＊]/g,'×').replace(/．/g,'.').replace(/／/g,'/').replace(/　/g,' ');

/* 短い答えだけそのまま使い、長い文は欄に入れない */
function shortPhrase(text){let t=z2h(text).replace(/[\r\n]+/g,' ').replace(/[。.!！~〜…]+$/,'').trim();
  t=t.replace(/\s*(です|でございます|になります|の予定です|予定です|予定|くらい|ぐらい|程度|で使います|で使う予定|に使います|です。)$/,'').trim();
  return t&&t.length<=20?t:''}

/* ── 日付 ── */
function fmtDate(d,now){const y=d.getFullYear();return (y!==now.getFullYear()?y+'年':'')+(d.getMonth()+1)+'/'+d.getDate()+'('+DAYS[d.getDay()]+')'}
function addDays(d,n){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()+n);return x}
function parseDeadline(text,nowMs){const now=new Date(nowMs),t=z2h(text);
  if(UNDECIDED.test(t))return '未定';
  if(/至急|大至急|できるだけ早|なるべく早|急ぎ|ASAP|早めに|早ければ早い/i.test(t))return 'できるだけ早く';
  let m=t.match(/(20\d{2})\s*[.\-/年]\s*(\d{1,2})\s*[.\-/月]\s*(\d{1,2})/);
  if(m)return fmtDate(new Date(+m[1],+m[2]-1,+m[3]),now);
  m=t.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/)||t.match(/(?<![\d.])(\d{1,2})\s*\/\s*(\d{1,2})(?![\d.]|\s*(?:mm|cm|m\b))/);
  if(m){const mo=+m[1],da=+m[2];if(mo>=1&&mo<=12&&da>=1&&da<=31){let d=new Date(now.getFullYear(),mo-1,da);if(d<addDays(now,0))d=new Date(now.getFullYear()+1,mo-1,da);return fmtDate(d,now)}}
  if(/今日|本日/.test(t))return fmtDate(addDays(now,0),now);
  if(/明後日|あさって/.test(t))return fmtDate(addDays(now,2),now);
  if(/明日|あした/.test(t))return fmtDate(addDays(now,1),now);
  m=t.match(/(\d{1,3})\s*日\s*(?:後|以内|以内に|まで)/);if(m)return fmtDate(addDays(now,+m[1]),now)+'まで';
  const monIdx=(now.getDay()+6)%7,monday=addDays(now,-monIdx);
  m=t.match(/(今週|来週|再来週)\s*の?\s*([月火水木金土日])曜/);
  if(m){const w=m[1]==='今週'?0:m[1]==='再来週'?2:1;const di=(DAYS.indexOf(m[2])+6)%7;return fmtDate(addDays(monday,w*7+di),now)}
  m=t.match(/(今週|来週|再来週)/);
  if(m){const w=m[1]==='今週'?0:m[1]==='再来週'?2:1;const a=addDays(monday,w*7),b=addDays(a,6);return fmtDate(a,now)+'〜'+fmtDate(b,now)+'中'}
  m=t.match(/([月火水木金土日])曜/);
  if(m){const target=DAYS.indexOf(m[1]);const diff=(target-now.getDay()+7)%7;return fmtDate(addDays(now,diff),now)}
  if(/今月末|月末/.test(t))return (now.getMonth()+1)+'月末';
  if(/来月/.test(t))return (now.getMonth()+2>12?1:now.getMonth()+2)+'月中';
  m=t.match(/(\d{1,2})\s*月\s*(上旬|中旬|下旬|末|中|頃|ごろ)?/);if(m&&+m[1]>=1&&+m[1]<=12)return m[1]+'月'+(m[2]&&m[2]!=='ごろ'&&m[2]!=='頃'?m[2]:'中');
  return null}

/* ── サイズ ── */
const UNIT={mm:'mm',cm:'cm',m:'m','ミリ':'mm','センチ':'cm','メートル':'m','㎜':'mm','㎝':'cm'};
function unitOf(u){return u?UNIT[u.toLowerCase()]||u:''}
const U='(mm|cm|m|ミリ|センチ|メートル|㎜|㎝)';
function parseSize(text){const t=z2h(text);
  if(UNDECIDED.test(t)&&!/\d/.test(t))return '未定';
  let m=t.match(new RegExp('(\\d+(?:\\.\\d+)?)\\s*'+U+'?\\s*[x×*X]\\s*(\\d+(?:\\.\\d+)?)\\s*'+U+'?','i'));
  if(m){const u=unitOf(m[4]||m[2]);return m[1]+'×'+m[3]+(u?u:'(単位確認)')}
  m=t.match(new RegExp('(?:横|幅|W)\\s*(\\d+(?:\\.\\d+)?)\\s*'+U+'?[\\s,、・]*(?:縦|高さ|H)\\s*(\\d+(?:\\.\\d+)?)\\s*'+U+'?','i'));
  if(m){const u1=unitOf(m[2]||m[4]),u2=unitOf(m[4]||m[2]);return m[1]+(u1!==u2?u1:'')+'×'+m[3]+(u2||'(単位確認)')}
  m=t.match(/(?:^|[^A-Za-z])([AB][0-6])(?![0-9])/i);if(m)return m[1].toUpperCase();
  return null}

/* ── 数量 ── */
const JNUM={'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'百':100};
function parseQuantity(text,forced){const t=z2h(text);
  if(forced&&UNDECIDED.test(t))return '未定';
  let m=t.match(/(\d{1,6})\s*(個|枚|セット|部|点|本|台|冊|着|種類|種|pcs|set|ea)(?![一-龥ぁ-んァ-ン])/i);if(m)return m[1]+(/種/.test(m[2])?'種':'');
  m=t.match(/([一二三四五六七八九十百]+)\s*(個|枚|セット|部|点|本|台|冊|着|種類|種)/);if(m&&m[1].length===1)return String(JNUM[m[1]])+(/種/.test(m[2])?'種':'');
  if(/ひとつ|一つ|1つ/.test(t))return '1';if(/ふたつ|二つ|2つ/.test(t))return '2';if(/みっつ|三つ|3つ/.test(t))return '3';
  if(forced){m=t.match(/^\s*(\d{1,6})\s*(個|枚)?\s*(です|でお願いします|ほど|くらい)?\s*$/);if(m)return m[1]}
  return null}

/* ── 使用場所 ── */
const PLACES=['イベント会場','会場','展示会','見本市','店舗','店頭','店内','ポップアップ','カフェ','飲食店','レストラン','オフィス','事務所','ロビー','受付','学校','体育館','ホテル','宴会場','ステージ','舞台','屋外','屋内','入口','入り口','壁面','壁','柱','窓','エレベーター','会議室','病院','教会','ライブ','コンサート','オンライン','SNS','インスタ','Instagram','ホームページ','ウェブ','YouTube','X(Twitter)','駅','商業施設','百貨店'];
function parsePlace(text,forced){const t=z2h(text);if(forced&&UNDECIDED.test(t))return '未定';
  const found=PLACES.filter(p=>t.includes(p)).filter((p,i,a)=>!a.some(q=>q!==p&&q.includes(p)));if(found.length)return found.join(' ');
  if(forced){const s=shortPhrase(t);return s||'原文確認'}return null}

/* ── お手持ちの資料 ── */
function parseAssets(text,forced){const t=z2h(text),out=[];
  const no=/(ない|無い|なし|無し|ありません|まだ(ない|無い)|用意していない|持っていない)/.test(t);
  if(/元データ|\.ai\b|aiデータ|AIファイル|イラレ|イラストレーター|psd|pdf|ベクター?データ|eps|入稿データ/i.test(t))out.push('元データ');
  if(/ロゴ/.test(t))out.push('ロゴ');
  if(/写真|画像|jpg|jpeg|png|スクショ|スクリーンショット|キャプチャ/i.test(t))out.push('画像');
  if(/ppt|パワポ|パワーポイント|ワード|word|エクセル|excel/i.test(t))out.push('文書(PPT等)');
  if(/原稿|文章|テキスト|文言|コピー/.test(t))out.push('原稿');
  if(/低解像度|画質|粗い|荒い|ぼやけ|小さい画像|ガタガタ/.test(t))out.push('低解像度');
  if(/AIで(作|生成)|生成AI|AI生成|画像生成|ミッドジャーニー|midjourney|chatgpt|チャットGPT|dall|nano\s*banana/i.test(t))out.push('AI生成');
  if(out.length)return out.map(x=>no&&out.length===1?x+'なし':x).join('、');
  if(no)return '資料なし';
  if(forced){if(UNDECIDED.test(t))return '未定';const s=shortPhrase(t);return s||'原文確認'}
  return null}

/* ── 作業内容 ── */
function parseScope(text,forced){const t=z2h(text),out=[];
  if(/補正|レタッチ|鮮明|高画質化|アップスケール|画質/.test(t))out.push('補正');
  if(/ベクター|ベクトル|トレース|アウトライン化/.test(t))out.push('ベクター化');
  if(/作り直|描き直|再制作|リメイク/.test(t))out.push('再制作');
  if(/切り抜|背景(を)?(消|削除|透過)/.test(t))out.push('切り抜き');
  if(/カットライン|型抜き|ダイカット|抜き型|カット線/.test(t))out.push('カットライン');
  if(/新規|一から|ゼロから|デザインから|企画|提案|案を|デザインして|デザインをお願い|韓国っぽ|韓国風/.test(t))out.push('新規デザイン');
  if(/配置|編集|リサイズ|サイズ変更|サイズ調整|修正|展開/.test(t))out.push('配置・編集');
  if(/印刷|出力|制作のみ|制作も|製作/.test(t))out.push('出力・制作');
  if(out.length)return [...new Set(out)].join('、');
  if(forced){if(UNDECIDED.test(t))return '未定';const s=shortPhrase(t);return s||'原文確認'}
  return null}

const PARSE={deadline:(t,s,f)=>parseDeadline(t,s.now)||(f?(shortPhrase(t)||'原文確認'):null),place:(t,s,f)=>parsePlace(t,f),size:(t,s,f)=>parseSize(t)||(f?(UNDECIDED.test(t)?'未定':(shortPhrase(t)||'原文確認')):null),quantity:(t,s,f)=>parseQuantity(t,f)||(f?(shortPhrase(t)||'原文確認'):null),assets:(t,s,f)=>parseAssets(t,f),scope:(t,s,f)=>parseScope(t,f)};

/* ── お客様の質問 → お問い合わせ(テーマだけ) ── */
function inquiryTopics(text){const t=z2h(text);
  const asks=/\?|？|いくら|可能(です|でしょう)?か|できますか|できるか|でしょうか|ますか|どう(すれば|やって)|どのくらい|知りたい|教えて/.test(t);
  if(!asks)return [];const out=[];
  if(/いくら|値段|価格|料金|費用|見積|単価|金額/.test(t))out.push('価格');
  if(/何日|期間|いつ|日程|納期|急ぎ|どのくらいで/.test(t))out.push('日程');
  if(/設置|施工|取り付け/.test(t))out.push('設置');
  if(/配送|発送|送料|郵送|届け|日本まで|国際/.test(t))out.push('配送');
  if(/ファイル|データ|形式|送る|送れ|アップロード/.test(t))out.push('ファイル送付');
  if(/素材|材質|生地|紙/.test(t))out.push('素材');
  if(/修正|何回/.test(t))out.push('修正回数');
  if(/支払|決済|振込|カード|円|ウォン/.test(t))out.push('支払い');
  if(/言語|日本語|韓国語|英語|翻訳/.test(t))out.push('言語');
  return out.length?out:['その他の質問']}

function set(s,index,key,value){if(!s.items[index]||!(key in fields)||typeof value!=='string')return;const p=s.items[index];value=clip(value,60);if(p[key]&&p[key]!==value)p.changes.push({field:key,before:p[key],after:value});p[key]=value}

const QUESTIONS={
  deadline:'いつまでに必要ですか？イベント日があれば一緒に教えてください。未定でも大丈夫です。',
  place:'どこで使う予定ですか？（例：イベント会場の入口、店舗の壁面、ポップアップ、SNS）',
  size:'横×縦のサイズを単位付きで教えてください。（例：300×200cm）分からなければ「未定」で大丈夫です。',
  quantity:'いくつ必要ですか？',
  assets:'お手持ちの資料はありますか？（例：ロゴデータ、写真、PPT、AIで作った画像）',
  scope:'どんな作業が必要ですか？（例：韓国っぽい新規デザイン、補正、ベクター化、印刷まで）'};
function ask(s){const p=s.items[s.active];if(!p)return {field:'name',text:'何を作りましょうか？下から選ぶか、自由に書いてください。'};
  for(const key of ORDER)if(!p[key])return {field:key,text:QUESTIONS[key]};
  const next=s.items.findIndex(x=>ORDER.some(k=>!x[k]));
  if(next>=0){s.active=next;const k=ORDER.find(k=>!s.items[next][k]);return {field:k,text:s.items[next].name+'についても確認します。'+QUESTIONS[k]}}
  return {field:null,text:'制作前に必要な情報がそろいました。下の内容を確認して、依頼を送信してください。'}}

function labelsIn(text){return LABELS.filter(([j])=>text.includes(j)).filter(([j],i,a)=>!a.some(([q])=>q!==j&&q.includes(j)))}
function itemsFrom(text){const found=labelsIn(text);if(found.length)return found.map(([j,k])=>item(j,k));
  if(/画像|ベクター|切り抜|カットライン|補正|画質/.test(text))return [item('画像補正・制作データ','이미지 보정·제작파일')];
  const s=shortPhrase(text);return [item(s||'その他の制作物','기타 제작물')]}

function ingest(s,text){text=clip(z2h(text),2000);if(!text)return ask(s);const prior=ask(s);s.history.push({role:'user',text});
  const topics=inquiryTopics(text);topics.forEach(x=>{if(!s.inquiries.includes(x))s.inquiries.push(x)});
  if(!s.items.length){itemsFrom(text).forEach(x=>s.items.push(x));s.active=0}
  const multi=labelsIn(text).length>1;const p=s.items[s.active];let got=0;
  const correcting=/変更|変えて|やっぱり|ではなく|じゃなくて|訂正|間違/.test(text);
  if(!multi){for(const key of ORDER){if(p[key]&&key!==prior.field&&!correcting)continue;const v=PARSE[key](text,s,false);if(v){set(s,s.active,key,v);got++}}}
  if(prior.field&&prior.field!=='name'&&!p[prior.field]&&!multi&&!topics.length){const v=PARSE[prior.field](text,s,true);if(v)set(s,s.active,prior.field,v)}
  let next=ask(s);
  if(topics.length&&!got)next={field:next.field,text:'その件（'+topics.join('・')+'）は担当者が確認してご案内します。'+next.text};
  if(multi)next={field:next.field,text:'まず'+p.name+'から確認します。'+next.text};
  s.history.push({role:'assistant',text:next.text});return next}

function add(s,name,ko){s.items.push(item(clip(name,30)||'追加の品目',ko||''));s.active=s.items.length-1}
function missing(s){const out=[];s.items.forEach(p=>ORDER.forEach(k=>{if(!p[k]||p[k]==='原文確認'||/単位確認/.test(p[k]))out.push((s.items.length>1?p.name+' ':'')+fields[k])}));return out}
function complete(s){return s.items.length>0&&s.items.every(p=>ORDER.every(k=>p[k]))}
/* シート保存用の要約: 品目名は「韓国語 / 日本語」で、担当者がすぐ分かるように */
function summary(s){return {requestId:s.requestId,lang:'ja',items:s.items.map(p=>{const o={name:(p.ko?p.ko+' / ':'')+p.name+' [JP]'};ORDER.forEach(k=>o[k]=p[k]);o.changed=p.changes.map(c=>fields[c.field]).filter((v,i,a)=>a.indexOf(v)===i);return o}),inquiries:s.inquiries.slice(),missing:missing(s)}}

const api={fields,ORDER,make,set,ask,ingest,add,missing,complete,summary,_parse:{parseDeadline,parseSize,parseQuantity,parsePlace,parseAssets,parseScope,inquiryTopics,shortPhrase,itemsFrom}};
if(typeof module!=='undefined')module.exports=api;else root.JphicConsultJa=api;
})(globalThis);
