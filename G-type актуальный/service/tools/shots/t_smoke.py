from shots_lib import *
with sync_playwright() as p:
    s=Sess(p)
    s.tab('library'); s.pg.evaluate("document.getElementById('view-library').scrollTop=330"); s.pg.wait_for_timeout(500)
    s.pg.screenshot(path='/tmp/s1.png')
    s.pg.evaluate("SK70.setText('Привет, мир')"); s.pg.wait_for_timeout(700); s.pg.screenshot(path='/tmp/s2.png')
    print(s.errs); s.close()
