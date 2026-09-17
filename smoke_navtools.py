_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""侧栏工具条冒烟：一键收起 / 展开全部菜单（2026-09-15 新增）
校验：按钮存在与文案切换、全部折叠/展开生效、状态持久化、单组折叠后按钮状态同步
"""
import pathlib, sys
from playwright.sync_api import sync_playwright

F = str(pathlib.Path('PLM3.0全系统演示原型.html').resolve())
URL = 'file://' + F

FAIL = []
def ok(cond, msg):
    print(('  ✅ ' if cond else '  ❌ ') + msg)
    if not cond:
        FAIL.append(msg)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=_CHROME_PATH)
    pg = b.new_context(viewport={'width': 1600, 'height': 1000}).new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL, wait_until='load')
    pg.wait_for_timeout(800)

    print('=== 一、按钮存在性与初始态 ===')
    ok(pg.locator('#navToggleAll').count() == 1, '侧栏工具条按钮 #navToggleAll 存在')
    ok(pg.evaluate("()=>{var b=document.getElementById('navToggleAll');"
                   "return !!b && b.closest('#sidebar')!==null;}"),
       '按钮位于侧栏 #sidebar 内')
    txt0 = pg.inner_text('#navToggleAllTxt')
    ok(txt0 == '收起全部菜单', '初始文案为「收起全部菜单」（实际：%s）' % txt0)

    n_grp = pg.evaluate("()=>document.querySelectorAll('#navScroll [data-grp]').length")
    n_open0 = pg.evaluate("()=>document.querySelectorAll('#navScroll [data-grp].open').length")
    ok(n_grp >= 15, '可折叠分组共 %d 个' % n_grp)
    ok(n_open0 > 0, '初始存在展开分组（%d 个）' % n_open0)

    print('\n=== 二、一键收起 ===')
    pg.click('#navToggleAll')
    pg.wait_for_timeout(350)
    n_open1 = pg.evaluate("()=>document.querySelectorAll('#navScroll [data-grp].open').length")
    n_sub1 = pg.evaluate("()=>document.querySelectorAll('#navScroll .nav-sub.open').length")
    ok(n_open1 == 0, '点击后所有分组均无 open（实际 %d）' % n_open1)
    ok(n_sub1 == 0, '点击后所有子菜单容器均无 open（实际 %d）' % n_sub1)
    ok(pg.inner_text('#navToggleAllTxt') == '展开全部菜单',
       '文案切换为「展开全部菜单」（实际：%s）' % pg.inner_text('#navToggleAllTxt'))
    ok(pg.evaluate("()=>document.getElementById('navToggleAll').classList.contains('is-collapsed')"),
       '按钮进入 is-collapsed 态（箭头翻转）')
    stored = pg.evaluate("()=>JSON.parse(localStorage.getItem('plm3_menu_open')||'{}')")
    keys = pg.evaluate("()=>Object.keys(JSON.parse(localStorage.getItem('plm3_menu_open')||'{}'))")
    ok(len(keys) >= n_grp and all(stored[k] is False for k in keys),
       'localStorage 全部 key 写为 false（%d 个）' % len(keys))

    print('\n=== 三、刷新后保持 ===')
    pg.reload(wait_until='load')
    pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>document.querySelectorAll('#navScroll [data-grp].open').length") == 0,
       '刷新后仍全部收起')
    ok(pg.inner_text('#navToggleAllTxt') == '展开全部菜单',
       '刷新后按钮文案仍为「展开全部菜单」（启动补同步生效）')

    print('\n=== 四、一键展开 ===')
    pg.click('#navToggleAll')
    pg.wait_for_timeout(350)
    n_open2 = pg.evaluate("()=>document.querySelectorAll('#navScroll [data-grp].open').length")
    ok(n_open2 == n_grp, '再次点击后全部分组展开（%d/%d）' % (n_open2, n_grp))
    ok(pg.inner_text('#navToggleAllTxt') == '收起全部菜单', '文案回到「收起全部菜单」')

    print('\n=== 五、单组折叠后按钮状态同步 ===')
    pg.click('#navToggleAll')            # 先全部收起
    pg.wait_for_timeout(300)
    grp = pg.locator('#navScroll [data-grp]').first
    grp.click()                           # 手动展开一个分组
    pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>document.querySelectorAll('#navScroll [data-grp].open').length") == 1,
       '手动展开 1 个分组')
    ok(pg.inner_text('#navToggleAllTxt') == '收起全部菜单',
       '非全收起时按钮自动变回「收起全部菜单」')
    grp.click()                           # 再收起
    pg.wait_for_timeout(300)
    ok(pg.inner_text('#navToggleAllTxt') == '展开全部菜单',
       '手动收起最后一个分组后按钮变回「展开全部菜单」')

    print('\n=== 六、跳转页面后自动展开父级不影响判定 ===')
    pg.evaluate("()=>showPage('bd:rawmat')")
    pg.wait_for_timeout(300)
    ok(pg.inner_text('#navToggleAllTxt') == '收起全部菜单',
       '跳转带父级菜单的页面后按钮为「收起全部菜单」')

    print('\n=== 七、侧栏整体收起时只留图标 ===')
    pg.evaluate("()=>document.body.classList.add('nav-collapsed')")
    pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>getComputedStyle(document.getElementById('navToggleAllTxt')).display") == 'none',
       'nav-collapsed 下按钮文字隐藏（只留图标）')
    pg.evaluate("()=>document.body.classList.remove('nav-collapsed')")

    ok(not errs, '无 JS 运行时错误（%s）' % (errs[:2] or '无'))
    b.close()

print('\n=== 结果：%d 项失败 ===' % len(FAIL))
for m in FAIL:
    print('   ❌ ' + m)
sys.exit(1 if FAIL else 0)
