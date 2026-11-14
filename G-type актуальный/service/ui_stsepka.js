/* ===== «Сцепка»: сцепки в образце текста (превью) =====
   Образец и тестер рисуются из контуров, а не системным шрифтом, поэтому GSUB не применяется. Те же подстановки, что пишутся в экспорт
   (calt — обычные, ss02 — все; ss01 — без сцепок), выполняет STS.apply: последовательность букв заменяется служебным символом U+F8xx,
   ctxName (обёртка ui_ot_o1.js) отдаёт для него имя знака 'uni041D_uni041D.liga'. Порядок как у HarfBuzz: сперва ss02, затем calt. */
(function(){
if(typeof layout!=='function'||typeof OTU==='undefined')return;
const on=()=>typeof CUR_FONT==='string'&&CUR_FONT==='stsepka'&&typeof STS!=='undefined';
const modeOf=key=>{try{const s=(S.styles&&S.styles[key])||cur();return Math.round(+safeP(s.p).zlig)||0;}catch(e){return 0;}};
const pOf=key=>{try{const s=(S.styles&&S.styles[key])||cur();return safeP(s.p);}catch(e){return null;}};
STS.pre=function(text,key){
  if(typeof text!=='string'||!on())return text;const p=pOf(key);if(!p)return text;const m=modeOf(key);if(m===2)return text;
  return text.split('\n').map(line=>STS.apply(line,p,m).map(t=>t.n?OTU.ch(t.n):t.c).join('')).join('\n');};
const _l=layout;
layout=function(text,key){const a=Array.prototype.slice.call(arguments);a[0]=STS.pre(text,key);return _l.apply(this,a);};
if(typeof ttLayout==='function'){const _t=ttLayout;ttLayout=function(text,k){const a=Array.prototype.slice.call(arguments);a[0]=STS.pre(text,k);return _t.apply(this,a);};}
})();
