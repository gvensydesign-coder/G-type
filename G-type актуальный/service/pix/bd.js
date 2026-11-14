const G=require('./gen_limits.js');const [,,res,serif,...pws]=process.argv;
for(const pw of pws){const b=G.bad(+res,+pw,+serif);console.log('res',res,'pw',pw,'s',serif,b.length,b.join(' '));}
