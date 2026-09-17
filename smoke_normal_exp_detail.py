# -*- coding: utf-8 -*-
"""普通实验详情专项回归：信息、两 Tab、竖向导航、编辑录入、配方汇总与 DOE 分流。"""
import os
from playwright.sync_api import sync_playwright

CHROME = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
URL = 'file://' + os.path.abspath('PLM3.0全系统演示原型.html')
passed = failed = 0

def ok(cond, message):
    global passed, failed
    if cond:
        passed += 1
        print('  ✔ ' + message)
    else:
        failed += 1
        print('  ✘ ' + message)

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    page = browser.new_context(viewport={'width': 1600, 'height': 1000}, accept_downloads=True).new_page()
    errors = []
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
    page.goto(URL, wait_until='load')
    page.wait_for_timeout(700)

    print('=== 普通实验详情 ===')
    page.evaluate("showPage('exp:detail',{id:'EXP-2026-0418'})")
    page.wait_for_timeout(500)
    text = page.locator('#pageHost').inner_text()
    tabs = page.locator('#detailTabs button').all_text_contents()
    ok(tabs == ['实验设计', '配方记录'], '普通实验仅保留实验设计、配方记录两个 Tab')
    for field in ['实验编号','关联项目','实验日期','实验员','实验类型','实验目的','关键技术','实验变量']:
        ok(field in text, '实验信息包含“%s”' % field)
    nav = page.locator('.exp-section-link').all_text_contents()
    ok(nav == ['实验工序','数据计算','过程测试','成品检测','结论','附件'], '实验设计左侧竖向导航顺序正确')
    actions = page.locator('.page-acts button').all_text_contents()
    ok(actions == ['复制','编辑','删除','导出','返回'], '详情操作按钮完整且顺序正确')
    ok(not any(x in ''.join(actions) for x in ['📄','✏','🗑','⬅','📤']), '详情操作按钮未使用 emoji')
    ok(page.locator('.exp-process').count() >= 2, '模板实验展示多道实验工序')
    ok('操作条件及现象' in text and '原料' in text, '工序包含操作条件和原料区域')

    print('=== 编辑与自动配方汇总 ===')
    page.get_by_role('button', name='编辑', exact=True).click()
    page.wait_for_timeout(250)
    ok(page.locator('#nedPurpose').count() == 1, '编辑状态可维护实验信息')
    before = page.evaluate("EXP_RECIPE['EXP-2026-0418'].rows.length")
    page.locator('.exp-table-title').filter(has_text='原料').first.get_by_role('button', name='新增').click()
    page.fill('#niCat', '助剂')
    page.fill('#niMat', '流平剂 L-10')
    page.fill('#niAmount', '12.5')
    page.fill('#niSolid', '100')
    page.fill('#niPct', '1.25')
    page.fill('#niSolidPct', '100')
    page.get_by_role('button', name='确定', exact=True).click()
    page.wait_for_timeout(250)
    after = page.evaluate("EXP_RECIPE['EXP-2026-0418'].rows.length")
    ok(after == before + 1, '新增原料后配方记录自动汇总')
    page.locator('#detailTabs button').filter(has_text='配方记录').click()
    page.wait_for_timeout(200)
    recipe_text = page.locator('#detailBody').inner_text()
    ok('只读快照' in recipe_text and '流平剂 L-10' in recipe_text, '配方记录展示工序实际投料且明确只读')

    print('=== 新增方式与 DOE 分流 ===')
    page.evaluate("showPage('exp:list')")
    page.wait_for_timeout(250)
    page.get_by_role('button', name='＋ 新增普通实验').click()
    ok(page.locator('#neMode option').all_text_contents() == ['创建空白实验','引用模板'], '新增普通实验可选择空白或引用模板')
    page.select_option('#neMode', 'template')
    page.dispatch_event('#neMode', 'change')
    ok(not page.locator('#neTemplate').is_disabled(), '引用模板时模板选择可用')
    ok(page.locator('#neTemplate option').count() >= 3, '提供缩聚、开环、水性聚氨酯模板')
    page.evaluate('closeModal()')

    page.evaluate("showPage('exp:detail',{id:'DOE-2026-0312-R01'})")
    page.wait_for_timeout(250)
    doe_tabs = page.locator('#detailTabs button').all_text_contents()
    ok(doe_tabs == ['执行方案','结果录入'], 'DOE 实验进入独立的整套执行与批量录入详情')
    ok(len(errors) == 0, 'JavaScript 运行时错误为 0')

    browser.close()

print('=== 结果：通过 %d / 失败 %d ===' % (passed, failed))
raise SystemExit(1 if failed else 0)
