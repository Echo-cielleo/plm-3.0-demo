_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""全系统冒烟：遍历所有菜单项 + 已注册子页，检查 JS 错误与内容渲染"""
import pathlib
from playwright.sync_api import sync_playwright

URL = 'file://' + str(pathlib.Path('PLM3.0全系统演示原型.html').resolve())
errors = []

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=_CHROME_PATH, )
    page = b.new_context(viewport={'width': 1600, 'height': 1000}).new_page()
    page.on('pageerror', lambda e: errors.append('[pageerror] %s' % e))
    page.on('console', lambda m: errors.append('[console] %s' % m.text) if m.type == 'error' else None)
    page.goto(URL, wait_until='load')
    page.wait_for_timeout(700)

    ids = page.evaluate("""() => {
      var out=[];
      MENU.forEach(g=>{
        if(g.page) out.push(g.page);
        (g.children||[]).forEach(c=>{
          if(c.id&&!c.children) out.push(c.id);
          (c.children||[]).forEach(cc=>out.push(cc.id));
        });
      });
      return out;
    }""")
    print('--- 菜单项 %d 个 ---' % len(ids))

    implemented, missing, empty = [], [], []
    for pid in ids:
        before = len(errors)
        try:
            page.evaluate('showPage("%s")' % pid)
            page.wait_for_timeout(180)
            h = page.locator('#pageHost').inner_html()
        except Exception as ex:
            errors.append('[%s] %s' % (pid, str(ex).splitlines()[0]))
            missing.append(pid); continue
        ne = errors[before:]
        if '页面未实现' in h:
            missing.append(pid)
        elif len(h.strip()) < 300 or ne:
            empty.append((pid, len(h.strip()), ne[0] if ne else ''))
        else:
            implemented.append(pid)
        # 侧栏高亮检查
        act = page.locator('#navScroll .nav-item.active').count()
        if act != 1:
            print('  ⚠ %s 侧栏高亮数=%d（期望 1）' % (pid, act))

    print('\n--- 已实现 %d / 未注册 %d / 异常 %d ---' % (len(implemented), len(missing), len(empty)))
    print('已实现: ' + ' '.join(implemented))
    print('未注册: ' + ' '.join(missing))
    for pid, ln, e in empty:
        print('  异常 %-16s 长度 %d  %s' % (pid, ln, e))

    print('\n--- 总错误数: %d ---' % len(errors))
    for e in errors[:15]:
        print('  ' + e)
    b.close()


# --- 统一退出码：存在失败断言时返回非零，避免 run_smoke.sh 误判为通过 ---
if errors:
    raise SystemExit(1)
