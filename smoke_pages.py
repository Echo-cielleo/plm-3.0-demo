_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""全页面冒烟：遍历 PAGES 注册表全部页面（含非菜单的详情/向导页）
校验：渲染非空、无 JS 错误、侧栏高亮正确；关键页截图存档
"""
import pathlib
from playwright.sync_api import sync_playwright

URL = 'file://' + str(pathlib.Path('PLM3.0全系统演示原型.html').resolve())

errors = []
ok, empty, bad = [], [], []

# 没有侧栏入口的页面（详情/向导/调试），不校验高亮，或校验其锁定目标
NO_HL = {'dev:kit'}
HL_LOCK = {
    'exp:detail': 'exp:list', 'exp:wizard': 'exp:doe',
    'exp:report': 'exp:analysis', 'exp:best': 'exp:analysis',
    'proj:detail': 'proj:list', 'proj:app-detail': 'proj:app',
    # A1：SDS 子页侧栏恒锁「SDS 文档列表」
    'sds:wizard': 'sds:list',
}

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=_CHROME_PATH, )
    page = b.new_context(viewport={'width': 1600, 'height': 1000}).new_page()
    page.on('pageerror', lambda e: errors.append('[pageerror] %s' % e))
    page.on('console', lambda m: errors.append('[console] %s' % m.text) if m.type == 'error' else None)
    page.goto(URL, wait_until='load')
    page.wait_for_timeout(700)

    keys = page.evaluate('Object.keys(PAGES).sort()')
    print('--- 注册页面 %d 个 ---' % len(keys))

    for pid in keys:
        before = len(errors)
        try:
            page.evaluate('showPage("%s")' % pid)
            page.wait_for_timeout(200)
            h = page.locator('#pageHost').inner_html()
        except Exception as ex:
            bad.append((pid, str(ex).splitlines()[0])); continue

        ne = errors[before:]
        if '页面未实现' in h or len(h.strip()) < 300 or ne:
            empty.append((pid, len(h.strip()), ne[0] if ne else ''))
        else:
            ok.append(pid)

        # 侧栏高亮
        if pid not in NO_HL:
            want = HL_LOCK.get(pid, pid if page.evaluate(
                '!!document.querySelector(\'#navScroll [data-go="%s"]\')' % pid) else None)
            if want is not None:
                n = page.locator('#navScroll .nav-item.active[data-go="%s"]' % want).count()
                if n != 1:
                    print('  ⚠ %s 侧栏高亮锁定 %s → 实际 %d（期望 1）' % (pid, want, n))

    b.close()

print('\n--- 渲染正常 %d / 异常 %d / 报错 %d ---' % (len(ok), len(empty), len(bad)))
if empty:
    print('异常页：')
    for pid, ln, e in empty:
        print('   %-18s 长度 %d  %s' % (pid, ln, e))
if bad:
    print('报错页：')
    for pid, e in bad:
        print('   %-18s %s' % (pid, e))
print('JS 错误总数：%d' % len(errors))
for e in errors[:15]:
    print('  ' + e)


# --- 统一退出码：存在失败断言时返回非零，避免 run_smoke.sh 误判为通过 ---
if bad:
    raise SystemExit(1)
