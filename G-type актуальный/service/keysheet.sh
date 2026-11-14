#!/bin/bash
# usage: keysheet.sh  -> rebuild + qa_KAP/key_all.png (one row per weight)
cd "$(dirname "$0")"
./mk_kaplya.sh && python3 assemble.py >/dev/null && node -r ./fixed_clock.js famk.js >/dev/null 2>&1
python3 - <<'PY'
from PIL import Image,ImageDraw,ImageFont
f=lambda w,s:ImageFont.truetype(f'famk/KaplyaDrop-{w}.ttf',s,layout_engine=ImageFont.Layout.RAQM)
S=190;rows=[('Light','Light'),('Regular','Regular'),('Bold','Bold'),('Black','Black')]
W=2400;H=len(rows)*int(2.75*S)+40
im=Image.new('RGB',(W,H),(236,235,232));d=ImageDraw.Draw(im)
y=20
for w,_ in rows:
    ft=f(w,S)
    d.text((30,y),"Капля ability INDIGO",font=ft,fill=(10,10,10))
    d.text((30,y+S*1.15),"abcdefg АБВГД",font=ft,fill=(10,10,10))
    d.text((W-260,y+10),w,font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',34),fill=(90,90,90))
    y+=int(2.75*S)
im.save('qa_KAP/key_all.png');print(im.size)
PY
