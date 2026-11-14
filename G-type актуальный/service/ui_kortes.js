/* ===== «Кортес»: росчерки R и Я в образце текста (превью) =====
   Образец и тестер рисуются из контуров, а не системным шрифтом, поэтому GSUB не применяется. Те же подстановки, что пишутся в экспорт
   (calt = ss01; ^ + знак -> верхний знак), выполняет KTS.apply по ТОЙ ЖЕ таблице правил KTS.rules (core_kortes.js), из которой собран GSUB:
   знак заменяется служебным символом U+F8xx, ctxName (обёртка ui_ot_o1.js) отдаёт для него имя варианта 'uni0052.sw'. */
(function(){
if(typeof layout!=='function'||typeof OTU==='undefined')return;
const on=()=>typeof CUR_FONT==='string'&&CUR_FONT==='kortes'&&typeof KTS!=='undefined';
KTS.pre=function(text){
  if(typeof text!=='string'||!on())return text;
  text=text.replace(/[\uF800-\uF8FF]/g,'\uFFFD');
  return text.split('\n').map(line=>KTS.apply(line).map(t=>t.n?OTU.ch(t.n):t.c).join('')).join('\n');};
const _l=layout;
layout=function(text){const a=Array.prototype.slice.call(arguments);a[0]=KTS.pre(text);return _l.apply(this,a);};
if(typeof layoutG==='function'){const _g=layoutG;layoutG=function(text){const a=Array.prototype.slice.call(arguments);a[0]=KTS.pre(text);return _g.apply(this,a);};}
if(typeof ttLayout==='function'){const _t=ttLayout;ttLayout=function(text){const a=Array.prototype.slice.call(arguments);a[0]=KTS.pre(text);return _t.apply(this,a);};}
/* список знаков: широкие знаки (М Ш Щ), скобки и знаки с выносными вписываются в ячейку с полями (нигде нет обрезки по краю) */
const _tf=window.thumbFit;
window.thumbFit=function(g,w,h){
  if(!on()||!g||!g.cs||!g.cs.length)return _tf?_tf(g,w,h):null;
  const pad=Math.max(4,Math.min(w,h)*0.1);
  let a=1e9,b=-1e9,y0=1e9,y1=-1e9;for(const c of g.cs)for(const n of c.nodes)for(const z of [n,n.a,n.b]){if(!z)continue;if(z.x<a)a=z.x;if(z.x>b)b=z.x;if(z.y<y0)y0=z.y;if(z.y>y1)y1=z.y;}
  let sc=Math.min(h/1150,(w-2*pad)/Math.max(1,b-a),(h-2*pad)/Math.max(1,y1-y0));
  let oy=h*0.8;const bot=oy-y0*sc;if(bot>h-pad)oy-=bot-(h-pad);if(oy-y1*sc<pad)oy=pad+y1*sc;
  let ox=(w-g.adv*sc)/2;ox=Math.max(pad-a*sc,Math.min(ox,w-pad-b*sc));
  return {sc,ox,oy};};
})();
