# -*- coding: utf-8 -*-
"""DOE 执行实验专项回归：一方案一执行实体、多组运行、执行方案与批量结果录入。"""
import os
from playwright.sync_api import sync_playwright

De = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
URL = 'file://' + os.path.abspath('PLM3.0全系统演示原型.html')
passed = failed = 0

def ok(cond, message):
    global passed, failed
    if cond:
        passed += 1; print('  ✔ ' + message)
    else:
        failed += 1; print('  ✘ ' + message)

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=De, args=['--no-sandbox'])
    page = browser.new_context(viewport={'width': 1600, 'height': 1000}, accept_downloads=True).new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.goto(URL, wait_until='load'); page.wait_for_timeout(700)

    print('=== 三层数据关系 ===')
    counts = page.evaluate("()=>({normal:experiments.filter(e=>e.source==='普通').length,execs:experiments.filter(e=>e.source==='DOE').length,runs:doeRuns.length})")
    ok(counts == {'normal': 11, 'execs': 3, 'runs': 44}, '11 个普通实验 + 3 个 DOE 执行实验 + 44 组运行数据')
    ok(page.evaluate("()=>experiments.filter(e=>e.source==='DOE').every(e=>e.runs.length===findScheme(e.schemeId).plan.length)"), '每条 DOE 执行实验包含所属方案的完整试验矩阵')
    ok(page.evaluate("()=>doeRuns.every(r=>!!r.parentExecutionId&&!!findExp(r.parentExecutionId))"), '每组运行都能回溯到 DOE 执行实验')

    print('=== 实验列表聚合 ===')
    page.evaluate("showPage('exp:list')"); page.wait_for_timeout(250)
    page.select_option('#expFSource', 'DOE实验'); page.wait_for_timeout(200)
    ok(page.locator('#expTbody tr').count() == 3, 'DOE 来源筛选只显示 3 条执行实验，不再显示 44 条运行')
    txt = page.locator('#expTbody').inner_text()
    ok('共 21 组' in txt and '运行01' not in txt, '列表展示试验组总数，不再显示单组运行编号')

    print('=== DOE 实验详情 ===')
    page.evaluate("showPage('exp:detail',{id:'EXP-DOE-2026-0312'})"); page.wait_for_timeout(300)
    tabs = page.locator('#detailTabs button').all_text_contents()
    ok(tabs == ['执行方案','结果录入'], 'DOE 详情仅保留执行方案、结果录入两个 Tab')
    body = page.locator('#pageHost').inner_text()
    for field in ['实验编号','关联项目','实验日期','实验员','实验类型','实验目的','关键技术','实验变量']:
        ok(field in body, 'DOE 实验主数据包含“%s”' % field)
    ok('DOE 方案' in body and '设计类型' in body and '试验组数' in body and '执行进度' in body, 'DOE 来源信息完整')
    ok(page.locator('.doe-run-table tbody > tr:not(.doe-run-detail-row)').count() == 21, '执行方案展示 21 组试验')
    page.get_by_role('button', name='查看方案').first.click(); page.wait_for_timeout(150)
    ok(page.locator('.doe-run-detail-row').count() == 1, '可展开单组因素设定和计划投料')
    ok('计划添加量(g)' in page.locator('.doe-run-detail-row').inner_text(), '计划投料量来自设计快照')
    actions = page.locator('.page-acts button').all_text_contents()
    ok(actions == ['复制','编辑','删除','导出','返回'], '详情操作按钮完整且无 emoji')

    print('=== 批量结果录入 ===')
    page.locator('#detailTabs button').filter(has_text='结果录入').click(); page.wait_for_timeout(200)
    ok(page.locator('.doe-entry-table tbody tr').count() == 21, '一张表连续录入全部 21 组结果')
    ok(page.locator('.doe-entry-table .entry-input').count() == 42, '每组提供全部响应变量输入框')
    ok(page.get_by_role('button', name='下载录入模板').count() == 1 and page.get_by_role('button', name='粘贴表格数据').count() == 1, '支持下载模板与粘贴 Excel 数据')
    page.get_by_role('button', name='完善记录').first.click(); page.wait_for_timeout(150)
    modal = page.locator('#modal').inner_text()
    ok('实际投料' in modal and '计划添加量(g)' in modal and '实际添加量(g)' in modal, '单组可补充计划/实际投料和异常记录')
    page.evaluate('closeModal()')

    print('=== 批量暂存与提交 ===')
    page.evaluate("showPage('exp:detail',{id:'EXP-DOE-2026-0158',tab:'entry'})"); page.wait_for_timeout(200)
    page.get_by_role('button', name='填入示例数据').click(); page.wait_for_timeout(150)
    st = page.evaluate("()=>doeExecStat(findExp('EXP-DOE-2026-0158'))")
    ok(st['done'] == st['total'], '批量填入后全部试验组完整')
    page.get_by_role('button', name='提交全部结果').click(); page.wait_for_timeout(150)
    ok(page.evaluate("()=>findExp('EXP-DOE-2026-0158').status==='已完成'"), '统一提交后 DOE 执行实验状态更新为已完成')

    print('=== 旧单组链接兼容 ===')
    page.evaluate("showPage('exp:detail',{id:'DOE-2026-0312-R05'})"); page.wait_for_timeout(150)
    ok(page.evaluate("()=>curDetailId==='EXP-DOE-2026-0312'"), '旧的单组实验链接自动进入所属 DOE 执行实验')
    ok(len(errors) == 0, 'JavaScript 运行时错误为 0')
    browser.close()

print('=== 结果：通过 %d / 失败 %d ===' % (passed, failed))
raise SystemExit(1 if failed else 0)
