/* Стресс-тест «пользователь не может сломать шрифт»: случайные и крайние комбинации параметров в пределах ползунков
   (как их выставляет интерфейс; дальше параметры проходят safeP). Для каждого базового знака число частей и дыр
   должно совпадать с настройками по умолчанию, а просветы не уже минимального (утолщение на 1 px не меняет топологию).
   node stress.js [N=300|pres] [fonts=volt,kvadra,stroka,codex] [styles=regular,italic] [seed=1]
   pres — вместо случайных: методы/пресеты шрифта и веса семейства. CORE=путь — другое ядро. */
const fs=require('fs');
const T=require('./topolib.js')(fs.readFileSync(process.env.CORE||__dirname+'/core_all.js','utf8'));
const M=T.M;
const PRES=process.argv[2]==='pres',N=PRES?0:+(process.argv[2]||300);
const FONTS_=(process.argv[3]||'volt,kvadra,stroka,codex').split(','),STY=(process.argv[4]||'regular,italic').split(','),SEED=+(process.argv[5]||1);
let seed=(SEED*2654435761)>>>0||1;const rnd=()=>{seed^=seed<<13;seed>>>=0;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;return seed/4294967296;};
const SKIP=new Set(['slant','icomp','sb','opsp','track','space']); /* не меняют форму знака */
let total=0,totalC=0;
for(const id of FONTS_){M.useFont(id);const f=M.FONTS[id];const R=T.ranges(id).filter(r=>!SKIP.has(r[0]));const big=1e4,small=-1e4;
  for(const sty of STY){
    const D=f.DEFAULTS[sty];const cfgs=[];
    if(PRES){for(const [mn,,opts] of f.methods||[])for(const [on,o] of opts){const nv={};for(const k in o)nv[k]=typeof o[k]==='function'?o[k](D):o[k];cfgs.push([mn+':'+on,nv,1]);}
      for(const [wn] of M.FAM_W)cfgs.push(['fam:'+wn,M.famParams(D,wn),1]);}
    else{
      cfgs.push(['min',Object.fromEntries(R.map(([k,a])=>[k,a]))],['max',Object.fromEntries(R.map(([k,,b])=>[k,b]))]);
      /* крайние сочетания из отчёта QA и их родственники */
      cfgs.push(['heavy',{stem:big,hair:big,wdth:80,aper:8,innerR:0.5,xh:600}],['heavy-wide',{stem:big,hair:big,wdth:140,aper:8,innerR:0.5,xh:440,capH:620}],
        ['heavy-narrow-lowx',{stem:big,hair:big,wdth:80,aper:8,xh:small,capH:small}],['heavy-tallx',{stem:big,hair:big,xh:big,capH:big,bar:big}],
        ['trapX',{trap:big,hair:40,stem:big}],['trapX2',{trap:big,hair:small,stem:big,diag:small,wdth:140}],['Msplit',{stem:big,hair:59,diag:0.85,wdth:121}],['Msplit-trap',{stem:big,hair:59,diag:0.85,wdth:121,trap:big,mv:big}],
        ['thin',{stem:small,hair:small}],['thin-wide',{stem:small,hair:big,wdth:140}],['thin-join',{stem:small,hair:small,join:big,round:big,innerR:big}],
        ['codex-stem-min',{stem:small}],['codex-spur-max',{spur:big}],['codex-spur-max-heavy',{spur:big,stem:big,hair:big,round:big}],['codex-serif',{round:big,stem:big,wdth:small}],
        ['qa3-volt5',{stem:70,hair:70,join:0,trap:0,slant:-4,wdth:115,kappa:0.8,innerR:1.4}],['qa3-volt5b',{stem:small,hair:70,join:0,trap:0,wdth:big,kappa:small,innerR:big}],
        ['qa3-yfork',{wdth:140,stem:big,hair:big,diag:big,trap:20,join:big,kappa:big,innerR:big,mv:big,aper:big}],
        ['qa3-spur200',{spur:200}],['qa3-spur220',{spur:220}],['qa3-spur240',{spur:240}],['qa3-spur240-thin',{spur:240,stem:small,hair:small}],['qa3-spur240-wide',{spur:240,wdth:big,round:big}],
        ['qa-liniya-5',{press:0,nib:28,hair:44,stem:108,wdth:125,xh:591.6,tens:1.15,term:1,capH:740,asc:837,desc:212,ov:9}],['qa-propis-K',{stem:big,hair:40,press:100,wdth:88,xh:504,capH:700,asc:840}],
        ['all-max-narrow',{...Object.fromEntries(R.map(([k,,b])=>[k,b])),wdth:small}]);
      while(cfgs.length<N){const o={};for(const [k,a,b,s] of R){const u=rnd();o[k]=u<0.22?a:u<0.44?b:a+(b-a)*rnd();if(s>=1)o[k]=Math.round(o[k]);}cfgs.push(['r'+cfgs.length,o]);}
    }
    const R0=T.refTopo(id,sty);const refOf=()=>R0;
    let bad=0;const byCh={};const ex=[];
    for(const [nm,o0,raw] of cfgs){
      const o={};if(raw)Object.assign(o,o0);else for(const [k,a,b] of R)if(o0[k]!=null)o[k]=Math.max(a,Math.min(b,o0[k]));
      const errs=T.check(id,sty,o,refOf(o));
      if(errs.length){bad++;for(const e of errs){const c=e.split(':')[0];byCh[c]=(byCh[c]||0)+1;}if(ex.length<(PRES?40:15))ex.push(nm+' '+JSON.stringify(o).slice(0,240)+' :: '+errs.slice(0,16).join(' '));}
    }
    total+=bad;totalC+=cfgs.length;
    console.log(id,sty,'combos',cfgs.length,'bad',bad,JSON.stringify(byCh));ex.forEach(e=>console.log('   ',e));
  }}
console.log('TOTAL combos',totalC,'bad',total);
