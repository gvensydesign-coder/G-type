from shots_lib import *
import base64
with sync_playwright() as p:
    s=Sess(p,'light'); pg=s.pg; s.tab('profile',1200)
    pg.evaluate("SK70.openShare({kind:'font',fid:'renessa'})"); pg.wait_for_timeout(1200)
    def grab(n):
        d=pg.evaluate("document.getElementById('shr-cv').toDataURL('image/png')"); open(OUT+'/'+n+'.png','wb').write(base64.b64decode(d.split(',')[1]))
    grab('13_share_card_light')
    pg.click('[data-th=dark]'); pg.wait_for_timeout(1000); grab('13_share_card_dark')
    pg.click('[data-kind=profile]'); pg.wait_for_timeout(1000); grab('14_share_card_profile_dark')
    pg.click('[data-th=light]'); pg.wait_for_timeout(1000); grab('14_share_card_profile_light')
    print(s.errs); s.close()
