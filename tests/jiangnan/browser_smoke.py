"""Real-asset game checks in Chromium software WebGL; not an iPad hardware test."""
import json, os, subprocess, sys, time, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'test-results/jiangnan'
OUT.mkdir(parents=True, exist_ok=True)
server = subprocess.Popen([sys.executable, '-m', 'http.server', '4173', '--bind', '127.0.0.1'], cwd=ROOT / 'public', stdout=subprocess.DEVNULL)
errors, report = [], {'allPassed': False, 'checks': {}, 'environment': 'Chromium + SwiftShader; no hardware FPS claim'}

def configure(page):
    page.set_default_timeout(90000)
    page.set_default_navigation_timeout(180000)
    page.on('pageerror', lambda e: errors.append(str(e)))

def boot(page):
    page.goto('http://127.0.0.1:4173/games/jiangnan/campaign.html?test=1', wait_until='domcontentloaded')
    page.wait_for_function('window.jiangnan?.state().ready', timeout=180000)
    page.locator('#quality').select_option('low')

def screenshot(page, name):
    # Capturing a software-rendered frame is not a frame-rate benchmark.
    page.screenshot(path=str(OUT / name), timeout=120000, animations='disabled')

try:
    time.sleep(.7)
    with sync_playwright() as p:
        launch = {'headless': True, 'args': ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']}
        if os.environ.get('CHROMIUM_PATH'):
            launch['executable_path'] = os.environ['CHROMIUM_PATH']
        browser = p.chromium.launch(**launch)
        page = browser.new_page(viewport={'width':1152, 'height':768}, device_scale_factor=1)
        configure(page)
        boot(page)
        screenshot(page, '01-menu.png')
        report['navigation'] = page.evaluate('jiangnan.test.navigation()')
        assert all(n['path'] > 0 for n in report['navigation'])
        page.evaluate('document.activeElement.blur();jiangnan.test.select(0)')
        page.wait_for_timeout(900)
        screenshot(page, '02-battle.png')
        page.evaluate('jiangnan.test.place(-64,-30)')
        hp = page.evaluate('jiangnan.state().enemies[0].hp')
        page.evaluate('jiangnan.test.shootAt(0);jiangnan.test.advance(.5)')
        assert page.evaluate('jiangnan.state().enemies[0].hp') < hp, 'Actual projectile failed to damage tank'
        report['projectileHit'] = page.evaluate('jiangnan.state().hits')
        report['checks']['projectileDamage'] = True
        page.evaluate('jiangnan.test.setHP(35)')
        page.keyboard.press('q')
        assert page.evaluate('jiangnan.state().player.hp') == 77
        page.keyboard.press('e')
        assert page.evaluate('jiangnan.state().smokes') == 1
        report['checks']['repairAndSmoke'] = True
        page.keyboard.press('p')
        before = page.evaluate('jiangnan.state().time')
        page.wait_for_timeout(250)
        assert page.evaluate('jiangnan.state().time') == before
        page.keyboard.press('p')
        page.keyboard.press('m')
        assert page.locator('#atlas').is_visible()
        page.keyboard.press('m')
        assert not page.locator('#atlas').is_visible()
        report['checks']['pauseAndMap'] = True
        for chapter in [0,1,2,4]:
            page.evaluate('(i)=>jiangnan.test.select(i)', chapter)
            page.evaluate('jiangnan.test.clearEnemies()')
            page.evaluate('(p)=>jiangnan.test.place(p.x,p.z)', report['navigation'][chapter]['target'])
            page.evaluate('jiangnan.test.advance(10)')
            assert page.evaluate('jiangnan.state().won'), f'Chapter {chapter+1} did not complete'
        page.evaluate('jiangnan.test.select(3);jiangnan.test.clearEnemies()')
        escort = page.evaluate('jiangnan.test.convoyStep(160)')
        assert escort['won'], f'Escort stalled: {escort["convoy"]}'
        report['escort'] = escort['convoy']
        page.evaluate('jiangnan.test.select(5);jiangnan.test.place(-8,-78);jiangnan.test.advance(.1);jiangnan.test.clearEnemies();jiangnan.test.advance(20);jiangnan.test.clearEnemies();jiangnan.test.advance(25)')
        assert page.evaluate('jiangnan.state().won'), 'Defence chapter did not complete'
        report['checks']['sixChapterTransitions'] = True
        report['complete'] = page.evaluate('jiangnan.state()')
        screenshot(page, '03-complete.png')
        page.reload(wait_until='domcontentloaded')
        page.wait_for_function('window.jiangnan?.state().ready', timeout=180000)
        assert page.evaluate('jiangnan.state().save.unlocked') == 5, 'Checkpoint did not persist'
        report['checks']['saveAfterReload'] = True
        # Release the desktop WebGL context before opening the tablet context.
        # Two simultaneous GPU-heavy pages starve the shared software GPU in CI.
        browser.close()
        browser = p.chromium.launch(**launch)
        tablet = browser.new_context(viewport={'width':1024, 'height':768}, has_touch=True, device_scale_factor=1)
        t = tablet.new_page()
        configure(t)
        boot(t)
        t.evaluate('document.activeElement.blur();jiangnan.test.select(0)')
        t.wait_for_timeout(700)
        assert t.locator('#fire').is_visible()
        boxes = [t.locator(s).bounding_box() for s in ['#move-stick','#aim-stick','#fire']]
        points = [{'id':i+1,'x':b['x']+b['width']/2,'y':b['y']+b['height']/2-(20 if i<2 else 0)} for i,b in enumerate(boxes)]
        session = tablet.new_cdp_session(t)
        session.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':points})
        t.wait_for_function('jiangnan.state().shots>=1', timeout=60000)
        session.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
        assert t.evaluate('jiangnan.state().shots') >= 1, 'Multi-touch fire button did not shoot'
        report['tablet'] = t.evaluate('jiangnan.state()')
        n = report['tablet']['shots']
        t.evaluate('jiangnan.test.advance(2)')
        assert t.evaluate('jiangnan.state().shots') == n, 'Fire did not stop after touch release'
        report['checks']['threeFingerFireAndRelease'] = True
        screenshot(t, '04-touch.png')
        assert not errors, errors
        report['allPassed'] = True
        browser.close()
except Exception as error:
    report['failure'] = str(error)
    report['traceback'] = traceback.format_exc()
    raise
finally:
    report['pageErrors'] = errors
    (OUT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf8')
    print('JIANGNAN_TEST_SUMMARY', json.dumps({'allPassed': report['allPassed'], 'checks': report['checks'], 'errors': errors, 'failure': report.get('failure')}, ensure_ascii=False), flush=True)
    server.terminate()
