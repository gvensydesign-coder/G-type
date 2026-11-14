from shots_lib import *
import sys

SC="""(a)=>{const e=document.querySelector(a[0]);if(!e)return;e.scrollIntoView({block:'start'});let p=e.parentElement;while(p&&!(p.scrollHeight>p.clientHeight+4&&/auto|scroll/.test(getComputedStyle(p).overflowY)))p=p.parentElement;if(p&&p!==document.body&&p!==document.documentElement)p.scrollTop-=a[1];else window.scrollBy(0,-a[1]);}"""
def lib_states(s,sfx):
    s.tab('library'); s.pg.evaluate(SC,['#lib-search',60]); s.pg.wait_for_timeout(500)
    s.shot('01_library_text_empty'+sfx)
    s.pg.evaluate("SK70.setText('Привет, мир')"); s.pg.wait_for_timeout(700)
    if 'phone' in sfx: s.pg.evaluate(SC,['#libgrid',40]); s.pg.wait_for_timeout(300)
    s.shot('02_library_text_filled'+sfx)
    s.pg.evaluate("SK70.setText('Съешь ещё этих мягких французских булок')"); s.pg.wait_for_timeout(700)
    s.shot('03_library_text_long'+sfx)
    s.pg.evaluate("SK70.setText('Привет, мир')")
def run(theme,w,h,sfx):
    with sync_playwright() as p:
        s=Sess(p,theme,w,h); pg=s.pg
        lib_states(s,sfx)
        # export preview
        pg.evaluate("sessionStorage.clear();SK70.setText('')")
        pg.evaluate("libOpen('renessa')"); pg.wait_for_timeout(3600)
        pg.evaluate("SK70.openExport('ttf')"); pg.wait_for_timeout(500); s.shot('04_export_preview'+sfx)
        pg.evaluate("SK70.openExport('fam',true)"); pg.wait_for_timeout(400); s.shot('05_export_license_pick'+sfx)
        pg.evaluate("SK70.closeExport()")
        # profile
        s.tab('profile',1500)
        v='#view-profile'
        s.shot('06_profile_portfolio'+sfx)
        pg.evaluate(SC,['#sk-hw',90]); pg.wait_for_timeout(500)
        s.shot('07_profile_works'+sfx)
        pg.evaluate("document.querySelector('[data-sk=ord]').click()"); pg.wait_for_timeout(500)
        s.shot('08_profile_reorder'+sfx)
        pg.evaluate("document.querySelector('[data-sk=ord]').click()")
        # collections filled
        pg.evaluate(SC,['#sk-hc',90]); pg.wait_for_timeout(600)
        s.shot('10_collections_filled'+sfx)
        # settings
        pg.evaluate("window.scrollTo(0,0);document.getElementById('view-profile').scrollTop=0")
        pg.evaluate("PROF.openEdit()"); pg.wait_for_timeout(900)
        pg.evaluate("(()=>{const d=document.querySelector('.pf-db');const g=document.querySelector('[data-sk-grp]');d.scrollTop=g.offsetTop-d.offsetTop-16})()"); pg.wait_for_timeout(500)
        s.shot('09_profile_settings'+sfx)
        pg.evaluate("document.querySelector('.pf-db').scrollTop=0")
        pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
        # share
        pg.evaluate("setTab('profile')"); pg.wait_for_timeout(500)
        pg.evaluate("SK70.openShare({kind:'font',fid:'volt'})"); pg.wait_for_timeout(1200); s.shot('12_share_sheet'+sfx)
        if not sfx:
            for th in ('light','dark'):
                pg.evaluate("document.querySelector('[data-th=%s]').click()"%th); pg.wait_for_timeout(900)
                pg.evaluate("document.getElementById('shr-cv').toBlob(b=>{window._b=b},'image/png')")
                data=pg.evaluate("document.getElementById('shr-cv').toDataURL('image/png')")
                import base64; open(OUT+'/13_share_card_%s_%s.png'%(th,theme),'wb').write(base64.b64decode(data.split(',')[1]))
            pg.evaluate("document.querySelector('[data-kind=profile]').click()"); pg.wait_for_timeout(1000)
            data=pg.evaluate("document.getElementById('shr-cv').toDataURL('image/png')")
            open(OUT+'/14_share_card_profile_%s.png'%theme,'wb').write(base64.b64decode(data.split(',')[1]))
        pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
        # add-to menu
        s.tab('library'); pg.evaluate(SC,['#libgrid',40]); pg.wait_for_timeout(500)
        pg.evaluate("document.querySelector('#view-library .lcard[data-font=renessa] .lc-more').scrollIntoView({block:'center'})") if False else None
        pg.click('#view-library .lcard[data-font=stroka] .lc-more'); pg.wait_for_timeout(300)
        s.shot('11a_card_menu'+sfx)
        pg.click('.menu70 [data-m=coll]'); pg.wait_for_timeout(300)
        s.shot('11_collections_add_menu'+sfx)
        pg.click('.menu70 [data-m=new]'); pg.wait_for_timeout(600)
        pg.fill('#sk-cn','Для меню кафе'); pg.fill('#sk-cd','Тёплые и читаемые на бумаге'); pg.wait_for_timeout(200)
        s.shot('11b_collections_new_dialog'+sfx)
        pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
        print(theme,sfx,s.errs); s.close()
    # empty collections
    with sync_playwright() as p:
        s=Sess(p,theme,w,h,colls=False); pg=s.pg; s.tab('profile',1500)
        pg.evaluate(SC,['#sk-hc',90]); pg.wait_for_timeout(600)
        s.shot('10a_collections_empty'+sfx); print('empty',s.errs); s.close()
if __name__=='__main__':
    which=sys.argv[1:] or ['light','dark','phone-light','phone-dark']
    for wch in which:
        if wch=='light': run('light',1440,900,'_light')
        if wch=='dark': run('dark',1440,900,'_dark')
        if wch=='phone-light': run('light',390,844,'_phone_light')
        if wch=='phone-dark': run('dark',390,844,'_phone_dark')
