const G=require('./gen_limits.js');const [,,res,serif,...pws]=process.argv;
G.setMX((h,s)=>3);
for(const pw of pws){const b=G.altBad(+res,+pw,+serif);console.log('res',res,'pw',pw,'s',serif,b.length,b.slice(0,40).join(' '));}
