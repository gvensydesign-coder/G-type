import sys;sys.path.insert(0,'tests')
from e2e_rail import *
with sync_playwright() as p:
    print(run('rail-phone',lambda:phone(p)))
