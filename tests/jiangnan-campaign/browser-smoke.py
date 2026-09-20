"""Real WebGL smoke test for a full repository checkout. Not executed in the artifact environment.
Start: python -m http.server 8765 --directory public
Run:   python tests/jiangnan-campaign/browser-smoke.py http://localhost:8765/games/jiangnan/
Requires: pip install playwright; playwright install chromium
"""
import sys
from playwright.sync_api import sync_playwright
url=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8765/games/jiangnan/'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1280,'height':800})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(url,wait_until='domcontentloaded')
    page.wait_for_function('window.jiangnan?.state().ready === true',timeout=120000)
    page.locator('#mode').select_option('tour')
    page.locator('#start').click()
    page.wait_for_function('window.jiangnan.state().started === true')
    before=page.evaluate('window.jiangnan.state()')
    page.keyboard.down('w');page.wait_for_timeout(1000);page.keyboard.up('w')
    after=page.evaluate('window.jiangnan.state()')
    assert abs(after['player']['x']-before['player']['x'])+abs(after['player']['z']-before['player']['z'])>.1,'Keyboard drive did not move tank'
    page.keyboard.down('Space');page.wait_for_timeout(400);page.keyboard.up('Space')
    assert page.evaluate('window.jiangnan.state().shotCount')>0,'Space did not fire'
    page.keyboard.press('Escape')
    assert page.evaluate('window.jiangnan.state().paused'),'Pause did not activate'
    page.locator('#start').click()
    assert not page.evaluate('window.jiangnan.state().paused'),'Resume did not work'
    assert not errors,errors
    page.screenshot(path='jiangnan-webgl-smoke.png')
    print('WebGL smoke passed: model load, keyboard drive, fire, pause and resume.')
    print(page.evaluate('window.jiangnan.state()'))
    browser.close()
