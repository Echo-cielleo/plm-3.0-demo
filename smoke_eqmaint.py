_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""设备维护台账冒烟（2026-09-15 新增）
覆盖：设备列表类型/部门两列与筛选 · 保养维护 5 个 Tab · 台账状态灯与排序
      · 保养要求 / 保养记录 / 校准记录 · 异常转维修生成工单 · 持久化 · 首页行动区联动
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
    pg = b.new_context(viewport={'width': 1680, 'height': 1000}).new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL, wait_until='load')
    pg.wait_for_timeout(800)

    print('=== 一、设备列表：类型 / 所属部门 ===')
    pg.evaluate("()=>showPage('eq:list')"); pg.wait_for_timeout(400)
    head = pg.eval_on_selector_all("#lpHost table thead th", "els=>els.map(e=>e.textContent.trim())")
    ok('类型' in head and '所属部门' in head, '设备列表新增「类型」「所属部门」列（表头：%s）' % head)
    ok(pg.evaluate("()=>EQUIPMENTS.length===12 && EQUIPMENTS.every(function(e){return !!e.type&&!!e.dept;})"),
       '12 台设备全部补齐 type / dept 字段')
    ok(pg.evaluate("()=>EQUIPMENTS.filter(function(e){return e.type==='分析仪器';}).length===7"),
       '分析仪器 7 台（检测中心 6 台 + 合成实验室粒度仪）实际：%s'
       % pg.evaluate("()=>EQUIPMENTS.filter(function(e){return e.type==='分析仪器';}).length"))
    ok(pg.evaluate("()=>EQUIPMENTS.filter(function(e){return e.dept==='质管部';}).length===6"),
       '质管部 6 台（检测中心）实际：%s'
       % pg.evaluate("()=>EQUIPMENTS.filter(function(e){return e.dept==='质管部';}).length"))
    # 筛选：分析仪器
    pg.select_option("#dbTable") if False else None
    sel = pg.locator('.toolbar select').nth(1)   # 0=状态 1=类型
    sel.select_option('分析仪器'); pg.wait_for_timeout(300)
    n = pg.eval_on_selector_all("#lpHost table tbody tr", "els=>els.length")
    ok(n == 7, '按「分析仪器」筛选出 7 行（实际 %d）' % n)
    sel2 = pg.locator('.toolbar select').nth(2)  # 所属部门
    sel2.select_option('质管部'); pg.wait_for_timeout(300)
    n2 = pg.eval_on_selector_all("#lpHost table tbody tr", "els=>els.length")
    ok(n2 == 6, '叠加「质管部」后剩 6 行（实际 %d）' % n2)

    print('\n=== 二、保养维护页：5 个 Tab ===')
    pg.evaluate("()=>showPage('eq:maint')"); pg.wait_for_timeout(500)
    labels = pg.eval_on_selector_all("#eqmTabs button", "els=>els.map(e=>e.textContent.trim())")
    ok(labels == ['维护台账', '保养要求', '保养记录', '校准记录', '维保工单'],
       'Tab 顺序正确：%s' % labels)
    ok(pg.evaluate("()=>curPage==='eq:maint'"), '当前页 eq:maint')

    print('\n=== 三、维护台账：字段 / 排序 / 状态灯 ===')
    th = pg.eval_on_selector_all("#lpHost table thead th", "els=>els.map(e=>e.textContent.trim())")
    for want in ['设备名称', '类别', '最近保养日期', '执行人', '结果', '下次到期日', '状态']:
        ok(want in th, '台账含列「%s」' % want)
    rows = pg.evaluate("()=>eqLedgerRows()")
    ok(len(rows) == 12, '台账 12 行（每台设备 1 条保养要求）实际 %d' % len(rows))
    dues = [r['due'] for r in rows]
    ok(dues == sorted(dues), '默认按下次到期日升序（%s … %s）' % (dues[0], dues[-1]))
    # 2026-09-17：状态灯随运行日浮动（临期台数会一天天变多），改为断言「与规则一致」而非硬编码台数
    ok(rows[0]['left'] == min(r['left'] for r in rows),
       '首行为到期日最近的一条（due=%s，剩余 %d 天）' % (rows[0]['due'], rows[0]['left']))
    bad = [r['eq'] + '=' + r['st'] for r in rows
           if r['st'] != ('逾期' if r['left'] < 0 else ('临期' if r['left'] <= r['lead'] else '正常'))]
    ok(not bad, '每行状态灯与规则一致（left<0 逾期 / left≤lead 临期 / 其余正常）'
       + ('，不符：' + '、'.join(bad) if bad else ''))
    n_over = sum(1 for r in rows if r['st'] == '逾期')
    n_soon = sum(1 for r in rows if r['st'] == '临期')
    ok(n_over == sum(1 for r in rows if r['left'] < 0), '逾期台数 = left<0 的台数（%d 台）' % n_over)
    ok(n_over + n_soon + sum(1 for r in rows if r['st'] == '正常') == len(rows),
       '逾期 %d / 临期 %d / 正常 %d，合计 %d 台'
       % (n_over, n_soon, len(rows) - n_over - n_soon, len(rows)))
    txt = pg.inner_text('#pageHost')
    ok('逾期' in txt and '临期' in txt, '台账副标题显示逾期 / 临期统计')
    ok(pg.eval_on_selector_all("#lpHost table tbody tr", "els=>els.length") > 0, '台账表格渲染出数据行')

    print('\n=== 四、保养要求 / 保养记录 / 校准记录 ===')
    pg.evaluate("()=>{eqmTab='plan';eqMaintRender();}"); pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>EQ_PLANS.length===12"), '保养要求 12 条（每台设备一份）')
    pth = pg.eval_on_selector_all("#lpHost table thead th", "els=>els.map(e=>e.textContent.trim())")
    for want in ['保养周期', '保养内容要求', '提前提醒']:
        ok(want in pth, '保养要求含列「%s」' % want)
    pg.evaluate("()=>{eqmTab='log';eqMaintRender();}"); pg.wait_for_timeout(400)
    lth = pg.eval_on_selector_all("#lpHost table thead th", "els=>els.map(e=>e.textContent.trim())")
    for want in ['记录编号', '保养内容', '执行人', '结果', '更换部件/耗材', '附件', '转维修']:
        ok(want in lth, '保养记录含列「%s」' % want)
    ok(pg.evaluate("()=>EQ_LOGS.every(function(l){return /^BY-\\d{4}-\\d{3}$/.test(l.id);})"),
       '保养记录编号均为 BY-YYYY-NNN')
    pg.evaluate("()=>{eqmTab='cal';eqMaintRender();}"); pg.wait_for_timeout(400)
    cth = pg.eval_on_selector_all("#lpHost table thead th", "els=>els.map(e=>e.textContent.trim())")
    for want in ['校准日期', '校准机构', '证书编号', '有效期至', '结果', '证书附件']:
        ok(want in cth, '校准记录含列「%s」' % want)
    ok(pg.evaluate("()=>EQ_CALS.every(function(c){return EQUIPMENTS.filter(function(e){return e.id===c.eq;})[0].type==='分析仪器';})"),
       '校准记录只挂在分析仪器上')

    print('\n=== 五、登记保养记录（正常） + 持久化 ===')
    n0 = pg.evaluate("()=>EQ_LOGS.length")
    pg.evaluate("()=>{eqmTab='ledger';eqMaintRender();}"); pg.wait_for_timeout(400)
    pg.click("text=＋ 登记保养记录"); pg.wait_for_timeout(300)
    pg.select_option("#lg_eq", 'EQ-2026-003')
    pg.fill("#lg_content", '干燥剂更换，能量测试 99%（自检加入）')
    pg.fill("#lg_exec", '陈工')
    pg.check("#lg_repair") if False else None
    pg.click("#mFoot button:has-text('保存')"); pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>EQ_LOGS.length") == n0 + 1, '新增 1 条保养记录（%d → %d）'
       % (n0, pg.evaluate("()=>EQ_LOGS.length")))
    nid = pg.evaluate("()=>EQ_LOGS[EQ_LOGS.length-1].id")
    ok(nid.startswith('BY-2026-'), '记录编号自动生成：%s' % nid)
    due_after = pg.evaluate("()=>{var r=eqLedgerRows().filter(function(x){return x.eq==='EQ-2026-003';})[0];return r.due;}")
    want_due = pg.evaluate("()=>eqAddDays(todayStr(),7)")
    ok(due_after == want_due, 'FTIR 到期日随新记录顺延 7 天 → %s（期望 %s）' % (due_after, want_due))
    pg.reload(wait_until='load'); pg.wait_for_timeout(800)
    ok(pg.evaluate("()=>EQ_LOGS.some(function(l){return l.content.indexOf('自检加入')>=0;})"),
       '刷新后新增记录仍在（localStorage 持久化）')

    print('\n=== 六、异常 + 转维修 → 自动生成维保工单 ===')
    pg.evaluate("()=>showPage('eq:maint')"); pg.wait_for_timeout(400)
    m0 = pg.evaluate("()=>EQMAINTS.length")
    pg.click("text=＋ 登记保养记录"); pg.wait_for_timeout(300)
    pg.select_option("#lg_eq", 'EQ-2026-008')
    pg.select_option("#lg_result", '异常')
    pg.wait_for_timeout(200)
    ok(pg.evaluate("()=>document.getElementById('eqFaultBox').style.display!=='none'"),
       '选「异常」后展开异常说明与转维修勾选')
    pg.fill("#lg_content", '标准油校验偏差 3.1%，超出 ±1%')
    n1 = pg.evaluate("()=>EQ_LOGS.length")
    pg.click("#mFoot button:has-text('保存')"); pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>EQ_LOGS.length") == n1, '异常未填说明时拒绝保存（记录数仍为 %d）' % n1)
    ok(pg.locator("#modal").count() == 1 and pg.evaluate("()=>document.getElementById('mask').className==='on'"),
       '校验失败时弹窗不关闭')
    pg.fill("#lg_fault", '粘度示值偏高，需更换转子并重新标定')
    pg.check("#lg_repair")
    pg.click("#mFoot button:has-text('保存')"); pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>EQMAINTS.length") == m0 + 1, '自动生成 1 条维保工单（%d → %d）'
       % (m0, pg.evaluate("()=>EQMAINTS.length")))
    ok(pg.evaluate("()=>EQMAINTS[0].type==='故障维修' && EQMAINTS[0].status==='待执行'"),
       '新工单类型=故障维修 / 状态=待执行（实际 %s / %s）'
       % (pg.evaluate("()=>EQMAINTS[0].type"), pg.evaluate("()=>EQMAINTS[0].status")))
    pg.evaluate("()=>{eqmTab='wo';eqMaintRender();}"); pg.wait_for_timeout(400)
    ok('故障维修' in pg.inner_text('#pageHost'), '维保工单 Tab 能看到新生成的工单')

    print('\n=== 七、首页行动区联动 ===')
    pg.evaluate("()=>showPage('home')"); pg.wait_for_timeout(600)
    todos = pg.evaluate("()=>eqMaintTodos()")
    ok(len(todos) >= 4, '保养待办 %d 条进入行动区（提前提醒窗口内）' % len(todos))
    ok(any('已超期' in t['t'] and t['urgent'] for t in todos), '超期项标 urgent（红灯）')
    items = pg.eval_on_selector_all(".act-item", "els=>els.map(e=>e.textContent)")
    ok(any('设备保养' in t for t in items), '首页行动区出现「设备保养」条目')
    first = pg.eval_on_selector(".act-item", "e=>e.className")
    ok('act-urgent' in first, '超期保养项置顶且整行标红（class=%s）' % first)
    ok(pg.evaluate("()=>document.querySelectorAll('.act-item').length") == 5,
       '行动区分页：每页固定 5 条')
    ok(pg.evaluate("()=>homeActList().length") >= 6,
       '行动区总条目 ≥ 6（静态 + 保养待办，实际 %d）' % pg.evaluate("()=>homeActList().length"))

    print('\n=== 八、一键重置 ===')
    pg.evaluate("()=>wzReset()"); pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>!localStorage.getItem('plm3_eqmaint_v1')"), '重置后清空保养台账缓存')
    ok(not errs, '无 JS 运行时错误（%s）' % (errs[:2] or '无'))
    b.close()

print('\n=== 结果：%d 项失败 ===' % len(FAIL))
for m in FAIL:
    print('   ❌ ' + m)
sys.exit(1 if FAIL else 0)
