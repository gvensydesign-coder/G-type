/* ===== VOLT: таблица символов, сборка глифа, запись TTF ===== */
const GL = {};
function def(chars,shape,w,kind,opt){
  for(const ch of chars){GL[ch]={shape,w,k:kind||'cap',opt:opt||{}};}
}
const sE=p=>p.stem*(p.stemScale?p.wdth/100:1);
const SW=(m,add)=>(p)=>sE(p)*m+(add||0);       // ширина от толщины стойки (не масштабируется)
/* латиница, прописные */
def('A',SH.A,730);def('B',SH.B,600);def('C',g=>SH.C(g),600);def('D',SH.D,640);def('E',SH.E,540);def('F',SH.F,520);
def('G',SH.G,640);def('H',SH.H,660);def('I',SH.I,SW(1));def('J',SH.J,500);def('K',SH.K,620);def('L',SH.L,500);
def('M',SH.M,840);def('N',SH.N,660);def('O',SH.O,660);def('P',SH.P,600);def('Q',SH.Q,660);def('R',SH.R,620);
def('S',g=>SH.S(g),600);def('T',SH.T,600);def('U',SH.U,640);def('V',SH.V,660);def('W',SH.W,920);def('X',SH.X,710);
def('Y',SH.Y,700);def('Z',SH.Z,580);
/* кириллица, прописные */
def('А',SH.A,730);def('Б',SH.Be,580);def('В',SH.B,600);def('Г',SH.Ge,500);def('Д',SH.De,740);def('Е',SH.E,540);
def('Ё',SH.Yo,540);def('Ж',SH.Zhe,1040);def('З',SH.Ze,580);def('И',SH.Ii,660);def('Й',SH.Ish,660);def('К',SH.K,620);
def('Л',SH.El,640);def('М',SH.M,840);def('Н',SH.H,660);def('О',SH.O,660);def('П',SH.Pe,640);def('Р',SH.P,600);
def('С',g=>SH.C(g),600);def('Т',SH.T,600);def('У',g=>SH.yy(g,0),620);def('Ф',g=>SH.Ef(g),780);def('Х',SH.X,710);
def('Ц',SH.Tse,680);def('Ч',SH.Che,620);def('Ш',SH.Sha,920);def('Щ',SH.Shcha,980);def('Ъ',SH.Hard,720);
def('Ы',SH.Yeru,860);def('Ь',SH.Soft,580);def('Э',SH.Ee,670);def('Ю',SH.Yu,880);def('Я',SH.Ya,620);
def('І',SH.Ukr_I,SW(1));def('Ї',SH.Yi,SW(1));def('Є',SH.Ye,600);def('Ґ',SH.Ghe,500);
/* латиница, строчные */
def('a',SH.a,560,'xh');def('b',SH.b,560,'xh');def('c',g=>SH.C(g),540,'xh');def('d',SH.d,560,'xh');def('e',SH.e,560,'xh');
def('f',SH.f,430,'xh');def('g',SH.g,560,'xh');def('h',SH.h,560,'xh');def('i',SH.i,SW(1),'xh');def('j',SH.j,SW(1,270),'xh');
def('k',SH.k,560,'xh');def('l',SH.l,SW(1),'xh');def('m',SH.m,(p)=>(3*sE(p)+270)*p.wdth/100,'xh');def('n',SH.n,560,'xh');
def('o',SH.O,600,'xh');def('p',SH.p,560,'xh');def('q',SH.q,560,'xh');def('r',SH.r,440,'xh');def('s',g=>SH.S(g),540,'xh');
def('t',SH.t,450,'xh');def('u',SH.U,570,'xh');def('v',SH.V,580,'xh');def('w',SH.W,840,'xh');def('x',SH.X,560,'xh');
def('y',g=>SH.yy(g,g.desc),580,'xh');def('z',SH.Z,520,'xh');
/* кириллица, строчные */
def('а',SH.a,560,'xh');def('б',g=>[...SH.b(g),R(g,0,g.asc-g.H,g.w*0.84,g.asc),R(g,g.w*0.84-g.sw,g.asc-g.H-g.sp*0.7,g.w*0.84,g.asc)],560,'xh');
def('в',SH.B,560,'xh');def('г',SH.Ge,450,'xh');def('д',SH.De,680,'xh');def('е',SH.e,560,'xh');def('ё',g=>[...SH.e(g),R(g,g.w*0.14,g.h+60,g.w*0.14+g.S*0.62,g.h+60+g.S*0.62,g.RS),R(g,g.w*0.86-g.S*0.62,g.h+60,g.w*0.86,g.h+60+g.S*0.62,g.RS)],560,'xh');
def('ж',SH.Zhe,820,'xh');def('з',SH.Ze,520,'xh');def('и',SH.Ii,600,'xh');def('й',SH.Ish,600,'xh');def('к',SH.K,560,'xh');
def('л',SH.El,590,'xh');def('м',SH.M,730,'xh');def('н',SH.H,600,'xh');def('о',SH.O,620,'xh');def('п',SH.Pe,590,'xh');
def('р',SH.p,560,'xh');def('с',g=>SH.C(g),540,'xh');def('т',SH.T,540,'xh');def('у',g=>SH.yy(g,g.desc),580,'xh');
def('ф',g=>SH.Ef(g,-g.desc,g.asc),860,'xh');def('х',SH.X,560,'xh');def('ц',SH.Tse,620,'xh');def('ч',SH.Che,570,'xh');
def('ш',SH.Sha,860,'xh');def('щ',SH.Shcha,920,'xh');def('ъ',SH.Hard,680,'xh');def('ы',SH.Yeru,800,'xh');
def('ь',SH.Soft,540,'xh');def('э',SH.Ee,520,'xh');def('ю',SH.Yu,850,'xh');def('я',SH.Ya,570,'xh');
def('і',SH.i,SW(1),'xh');def('ї',g=>[R(g,0,0,g.S,g.h),R(g,0,g.h+80,g.S*0.46,g.h+80+g.S*0.46,g.RS),R(g,g.S*0.54,g.h+80,g.S,g.h+80+g.S*0.46,g.RS)],SW(1),'xh');
def('є',SH.Ye,520,'xh');def('ґ',g=>[...SH.Ge(g),R(g,g.w-g.S*0.55,g.h,g.w,g.h+80)],450,'xh');
/* цифры */
def('0',SH.n0,600);def('1',SH.n1,SW(1,190));def('2',SH.n2,580);def('3',SH.n3,580);def('4',SH.n4,640);
def('5',SH.n5,580);def('6',SH.n6,600);def('7',SH.n7,580);def('8',SH.n8,620);def('9',SH.n9,600);
/* знаки */
const F={fixed:true};
def('.',SH.pPeriod,SW(1));def(',',SH.pComma,SW(1));def(':',SH.pColon,SW(1),'xh');def(';',SH.pSemi,SW(1),'xh');
def('!',SH.pExcl,SW(1));def('?',SH.pQuest,540);def('"',SH.pQuoteD,SW(2.55));def("'",SH.pQuoteS,SW(1));
def('-',SH.pHyphen,300,'cap',F);def('–',SH.pHyphen,520,'cap',F);def('—',SH.pHyphen,880,'cap',F);
def('(',SH.pParenL,300,'cap',F);def(')',SH.pParenR,300,'cap',F);def('[',SH.pBrL,290,'cap',F);def(']',SH.pBrR,290,'cap',F);
def('{',SH.pBraceL,340,'cap',F);def('}',SH.pBraceR,340,'cap',F);
def('/',SH.pSlash,520,'cap',F);def('\\',SH.pBslash,520,'cap',F);def('|',SH.pBar,SW(1));
def('@',SH.pAt,800,'cap',F);def('#',SH.pHash,660,'cap',F);def('$',SH.pDollar,600,'cap',F);def('%',SH.pPercent,800,'cap',F);
def('&',SH.pAmp,760,'cap',F);def('*',SH.pStar,520,'cap',F);def('+',SH.pPlus,520,'cap',F);def('=',SH.pEq,520,'cap',F);
def('<',g=>SH.pLt(g,true),460,'cap',F);def('>',g=>SH.pLt(g,false),460,'cap',F);def('_',SH.pUnder,640,'cap',F);
def('~',SH.pTilde,560,'cap',F);def('^',SH.pCaret,520,'cap',F);def('`',SH.pGrave,SW(1.2),'cap');
def('°',SH.pDeg,SW(1.5));def('•',SH.pBullet,SW(1));def('×',SH.pTimes,520,'cap',F);
def('₽',SH.pRuble,620);def('€',SH.pEuro,640);def('№',SH.pNum,1020);
def('«',g=>SH.pGuil(g,true),520,'xh',F);def('»',g=>SH.pGuil(g,false),520,'xh',F);
def('‘',g=>SH.pQSingle(g,false,true),SW(1));def('’',g=>SH.pQSingle(g,false,false),SW(1));
def('‚',g=>SH.pQSingle(g,true,false),SW(1));
def('“',g=>SH.pQDouble(g,false,true),SW(2.55));def('”',g=>SH.pQDouble(g,false,false),SW(2.55));
def('„',g=>SH.pQDouble(g,true,false),SW(2.55));
def('…',SH.pEllipsis,SW(3,0.45*0+0)); GL['…'].w=(p)=>p.stem*3+p.stem*0.9;
def(' ',SH.pSpace,(p)=>p.space);def(' ',SH.pSpace,(p)=>p.space);

const CHARSET = Object.keys(GL);
const GROUPS = [
  ['Латиница · прописные',  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
  ['Латиница · строчные',  'abcdefghijklmnopqrstuvwxyz'],
  ['Кириллица · прописные', 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯІЇЄҐ'],
  ['Кириллица · строчные', 'абвгдеёжзийклмнопрстуфхцчшщъыьэюяіїєґ'],
  ['Цифры',     '0123456789'],
  ['Знаки',     '.,:;!?"\'-–—()[]{}/\\|@#$%&*+=<>_~^`°•×₽€№«»‘’‚“”„…'],
];

