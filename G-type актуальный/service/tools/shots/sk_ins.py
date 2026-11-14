import re
t=open('template.html',encoding='utf-8').read()
c=open('sk70.css',encoding='utf-8').read().rstrip('\n')
if '/* == SKETCH70 ==' in t:
    t=re.sub(r'/\* == SKETCH70 ==.*?/\* == end SKETCH70 == \*/',lambda m:c,t,flags=re.S)
else:
    i=t.rindex('</style>'); t=t[:i]+c+'\n'+t[i:]
open('template.html','w',encoding='utf-8').write(t)
