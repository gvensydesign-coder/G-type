#!/bin/bash
# sheets2.sh: grid shapes + serif option + phrases (qa_PX/shapes12.png serif12.png serif20.png words*.png)
cd "$(dirname "$0")/.."
mk(){ node pix/mkttf.js "$1" regular - "$2" >/dev/null; }
for s in 0 1 2 3; do mk qa_PX/sh$s.ttf "{\"res\":12,\"pw\":2,\"pshape\":$s,\"pgap\":$([ $s = 0 ] && echo 0 || echo 8)}" & done; wait
mk qa_PX/shg.ttf '{"res":12,"pw":2,"pshape":0,"pgap":12,"pstag":1}' &
mk qa_PX/shg2.ttf '{"res":12,"pw":2,"pshape":2,"pgap":10,"pstag":2}' & wait
python3 pix/words.py qa_PX/shapes12.png 52 qa_PX/sh0.ttf qa_PX/sh1.ttf qa_PX/sh2.ttf qa_PX/sh3.ttf qa_PX/shg.ttf qa_PX/shg2.ttf
for r in 12 16 20; do for w in Light Regular Bold Black; do node pix/mkttf.js qa_PX/s${r}_$w.ttf regular $w "{\"res\":$r,\"pserif\":1}" >/dev/null & done; wait
 c=$([ $r = 12 ] && echo 3 || echo 2); u=$((700/r)); python3 pix/render_sheet.py qa_PX/serif$r.png $(( (c*1000+u/2)/u )) qa_PX/s${r}_Light.ttf qa_PX/s${r}_Regular.ttf qa_PX/s${r}_Bold.ttf qa_PX/s${r}_Black.ttf; done
python3 - <<'PY'
from PIL import Image, ImageDraw, ImageFont
fs=['sh0','sh1','sh2','sh3','shg','shg2']; lab=['квадрат','точка','скругл.','ромб','зазор+сдвиг 1','скругл.+сдвиг 2']
im=Image.new('RGB',(1800,3*230+20),(250,250,248)); d=ImageDraw.Draw(im)
for i,f in enumerate(fs):
    ft=ImageFont.truetype('qa_PX/%s.ttf'%f,172); x=20+(i%2)*900; y=10+(i//2)*230
    d.text((x,y),'Пиксель Яm',font=ft,fill=(16,16,16))
im.save('qa_PX/shapes_big.png')
PY
