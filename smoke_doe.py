_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""DOE 主线专项自检（原 smoke_doe.js 的 Python 版）
覆盖：三页入口、DOE 实验详情 2 Tab、4 步设计向导、分析报告（DOE / 普通实验）、
      最佳方案推荐；并存档关键页截图。"""
import os
from playwright.sync_api import sync_playwright

URL = 'file://' + os.path.abspath('PLM3.0全系统演示原型.html')
OUT = '/tmp'

tasks = [
    # (pageId, params, expectKeyword, screenshot)
    ('exp:list', None, '实验列表', 'exp_list'),
    ('exp:doe', None, 'DOE 实验设计', 'exp_doe_list'),
    ('exp:analysis', None, '实验分析', 'exp_analysis_list'),
    ('exp:detail', {'id': 'EXP-DOE-2026-0312', 'tab': 'plan'}, '执行方案', 'exp_detail_plan'),
    ('exp:detail', {'id': 'EXP-DOE-2026-0312', 'tab': 'entry'}, '批量结果录入', 'exp_detail_entry'),
    ('exp:wizard', {'mode': 'new', 'target': 'scheme'}, 'DOE 设计向导', 'exp_wizard_step1'),
    ('exp:report', {'id': 'DOE-2026-0312', 'kind': 'doe'}, 'ANOVA', 'exp_report_doe'),
    ('exp:report', {'id': 'EXP-2026-0418', 'kind': 'exp'}, 'ANOVA', 'exp_report_normal'),
    ('exp:best', {'id': 'DOE-2026-0312'}, '最佳方案', 'exp_best'),
]

errors, fails = [], 0

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=['--no-sandbox'])
    pg = b.new_context(viewport={'width': 1600, 'height': 1000}).new_page()
    pg.on('pageerror', lambda e: errors.append('[pageerror] %s' % e))
    pg.on('console', lambda m: errors.append('[console] %s' % m.text) if m.type == 'error' else None)
    pg.goto(URL, wait_until='load'); pg.wait_for_timeout(900)

    print('--- DOE 向导走通 4 步 ---')
    pg.evaluate("()=>showPage('exp:wizard',{mode:'new',target:'scheme'})"); pg.wait_for_timeout(350)
    for s in (2, 3, 4):
        pg.evaluate("(st)=>{wizard.step=st;renderWizard();}", s); pg.wait_for_timeout(250)
        n = len(pg.locator('#pageHost').inner_html().strip())
        print('  步骤 %d 内容长度 %d' % (s, n))
    # 步骤②：填名称 + 所属项目（下发前置条件）
    pg.evaluate("()=>{wizard.draft.basic.name='自检实验';wizard.draft.projectIds=['PRJ-2026-002'];renderWizard();}")
    pg.wait_for_timeout(250)
    pg.evaluate("()=>{wizard.step=4;renderWizard();}"); pg.wait_for_timeout(250)
    ok4 = '基础信息' in pg.locator('#pageHost').inner_html()
    print('  步骤④ 显示基础信息折叠: %s' % ok4)
    if not ok4: fails += 1

    print('\n--- 逐页内容检查 ---')
    for pid, params, kw, ss in tasks:
        before = len(errors)
        pg.evaluate("([id,p])=>showPage(id,p||{})", [pid, params]); pg.wait_for_timeout(320)
        html = pg.locator('#pageHost').inner_html()
        new = errors[before:]
        has = kw in html
        ln = len(html.strip())
        good = has and not new and ln > 200
        if not good: fails += 1
        print('%s %-22s 长度 %6d  含"%s":%s  %s' % ('OK  ' if good else 'FAIL', pid, ln, kw, has, new[0] if new else ''))
        pg.screenshot(path=os.path.join(OUT, '_ss_%s.png' % ss))

    print('\n--- 报告页 ECharts ---')
    pg.evaluate("()=>showPage('exp:report',{id:'DOE-2026-0312',kind:'doe'})"); pg.wait_for_timeout(1100)
    n = pg.locator('.chart-box canvas').count()
    print('  DOE 分析报告 canvas: %d (期望 4)' % n)
    if n != 4: fails += 1

    print('\n--- 切换响应变量 ---')
    pg.evaluate("""()=>{var e=window._curReportObj;curAnalysisResp=e.responses[1];renderAnalysis(e,e.responses[1]);}""")
    pg.wait_for_timeout(700)
    switch = '成本' in pg.locator('#pageHost').inner_html()
    print('  切换到「成本 元/kg」响应: %s' % switch)
    if not switch: fails += 1

    print('\n--- 最佳方案推荐 ---')
    pg.evaluate("()=>showPage('exp:best',{id:'DOE-2026-0312'})"); pg.wait_for_timeout(800)
    cand = pg.locator('.cand-tbl tbody tr').count()
    cc = pg.locator('#chContrib').count()
    print('  候选方案行数 %d (期望 5)，贡献度图 %d' % (cand, cc))
    if cand != 5 or cc != 1: fails += 1

    print('\n--- 总错误数: %d ---' % len(errors))
    for e in errors[:10]: print('  ' + e)
    b.close()

print('\n=== 结果：失败项 %d ===' % fails)
raise SystemExit(1 if (fails or errors) else 0)
