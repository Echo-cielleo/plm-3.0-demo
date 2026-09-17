# -*- coding: utf-8 -*-
"""流程引导专项：菜单首位、三页内容、节点路由与主操作。"""
import os
from playwright.sync_api import sync_playwright

CHROME = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
URL = 'file://' + os.path.abspath('PLM3.0全系统演示原型.html')
passed = failed = 0

def ok(cond, message):
    global passed, failed
    if cond:
        passed += 1; print('  ✔ ' + message)
    else:
        failed += 1; print('  ✘ ' + message)

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    page = browser.new_context(viewport={'width': 1600, 'height': 1000}).new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.goto(URL, wait_until='load'); page.wait_for_timeout(700)

    print('=== 菜单位置 ===')
    for group, route in [('proj','proj:guide'),('exp','exp:guide'),('comp','comp:guide')]:
        first = page.evaluate("([g])=>MENU.find(x=>x.id===g).children[0].id", [group])
        ok(first == route, '%s 模块第一项为流程引导' % group)
    ok(page.locator('[data-go="proj:guide"]').count() == 1, '项目管理流程引导入口可见')
    ok(page.locator('[data-go="exp:guide"]').count() == 1, '实验管理流程引导入口可见')
    ok(page.locator('[data-go="comp:guide"]').count() == 1, '合规管理流程引导入口可见')
    inactive_color = page.locator('[data-go="proj:guide"] .nav-label').evaluate("e=>getComputedStyle(e).color")
    ok(inactive_color == 'rgb(105, 177, 255)', '未选中的流程引导菜单使用统一亮蓝强调色')

    def click_node(guide, title, expected, modal=False):
        page.evaluate("r=>showPage(r)", guide); page.wait_for_timeout(120)
        node = page.locator('button.flow-node').filter(has_text=title).first
        ok(node.count() == 1, '节点“%s”存在且可点击' % title)
        if node.count():
            node.click(); page.wait_for_timeout(180)
            ok(page.evaluate('curPage') == expected, '“%s”跳转到 %s' % (title, expected))
            if modal: page.evaluate('closeModal()')

    print('\n=== 实验管理 ===')
    page.evaluate("showPage('exp:guide')"); page.wait_for_timeout(200)
    active_color = page.locator('[data-go="exp:guide"] .nav-label').evaluate("e=>getComputedStyle(e).color")
    ok(active_color == 'rgb(255, 255, 255)', '选中流程引导后文字保持白色，选中态清晰')
    text = page.locator('#pageHost').inner_text()
    ok(all(x in text for x in ['普通实验','DOE 实验','多组实验总结']), '三条实验流程完整')
    ok(page.locator('.flow-guide-card').count() == 3, '实验管理包含 3 张流程卡片')
    ok(page.locator('.flow-node.is-note').count() == 2, '线下执行和向导内部步骤为灰色说明节点')
    page.screenshot(path='/private/tmp/flow-guide-experiment.png', full_page=True)
    for title, route, modal in [
        ('新建实验','exp:list',True),('录入数据','exp:detail',False),('查看分析报告','exp:analysis',False),
        ('新建方案','exp:wizard',False),('确认下发','exp:doe',True),('各组执行录入','exp:list',False),
        ('DOE 分析报告','exp:analysis',False),('选择多组已完成实验','exp:sum',False),('生成对比总结报告','exp:sum-detail',False)]:
        click_node('exp:guide', title, route, modal)

    print('\n=== 项目管理 ===')
    page.evaluate("showPage('proj:guide')"); page.wait_for_timeout(160)
    ok(page.locator('.flow-guide-card').count() == 1, '项目管理为一行轻量流程')
    ok(page.locator('.flow-node.is-note').count() == 2, '需求和验收归档为灰色说明节点')
    click_node('proj:guide','新增项目','proj:new')
    click_node('proj:guide','项目执行','proj:list')
    page.evaluate("closeModal();showPage('proj:guide')"); page.wait_for_timeout(120); page.screenshot(path='/private/tmp/flow-guide-project.png', full_page=True)

    print('\n=== 合规管理 ===')
    page.evaluate("closeModal();showPage('comp:guide')"); page.wait_for_timeout(180)
    text = page.locator('#pageHost').inner_text()
    ok(all(x in text for x in ['SDS 编写','法规库维护','专员定期下载维护','不支持自动联网更新']), '两条流程及维护边界完整')
    for source in ['ECHA 官网','mem.gov.cn','ZDHC 官网']:
        ok(source in text, '法规来源包含 %s' % source)
    ok(page.locator('.flow-reg-card').count() == 5, '展示 5 类法规库维护方式')
    for title, route in [('查询法规','law:query'),('生成 SDS 草稿','sds:wizard'),('审核发布','sds:list'),('上传导入','law:reach'),('影响分析','law:query')]:
        click_node('comp:guide', title, route)
    page.evaluate("showPage('comp:guide')"); page.screenshot(path='/private/tmp/flow-guide-compliance.png', full_page=True)

    print('\n=== 运行时 ===')
    ok(not errors, '逐节点点击后 JavaScript 错误为 0' + (('：'+errors[0]) if errors else ''))
    browser.close()

print('=== 结果：通过 %d / 失败 %d ===' % (passed, failed))
raise SystemExit(1 if failed else 0)
