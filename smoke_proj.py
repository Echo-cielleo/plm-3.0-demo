_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""S3 专项冒烟：首页 / 需求 / 项目 / 应用项目 / 受限物质
重点验证：① 真实工作台是否生效（不再被 S0 自检页覆盖）
          ② 项目 ↔ 实验多对多挂载/移除语义
"""
import pathlib
from playwright.sync_api import sync_playwright

URL = 'file://' + str(pathlib.Path('PLM3.0全系统演示原型.html').resolve())

errors, checks = [], []


def ck(name, cond, detail=''):
    checks.append((bool(cond), name, detail))
    print(('  ✅ ' if cond else '  ❌ ') + name + (('  → ' + detail) if detail else ''))


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=_CHROME_PATH, )
    page = b.new_context(viewport={'width': 1600, 'height': 1000}).new_page()
    page.on('pageerror', lambda e: errors.append('[pageerror] %s' % e))
    page.on('console', lambda m: errors.append('[console] %s' % m.text) if m.type == 'error' else None)
    page.goto(URL, wait_until='load')
    page.wait_for_timeout(700)

    print('\n=== 1. 首页 · 真实工作台（回归：不得再显示 S0 自检页）===')
    page.evaluate('showPage("home")')
    page.wait_for_timeout(400)
    html = page.locator('#pageHost').inner_html()
    ck('不显示 S0 自检面板', '组件自检' not in html, '检出「组件自检」文字' if '组件自检' in html else '')
    ck('KPI 卡 4 张', page.locator('#pageHost .stat-box').count() >= 4,
       '实际 %d 张' % page.locator('#pageHost .stat-box').count())
    for kw in ['接下来要做', '风险预警', '项目阶段进展', '最近实验']:
        ck('含区块「%s」' % kw, kw in html)
    ck('阶段进度条渲染', page.locator('#pageHost .stage-bar').count() >= 5,
       '实际 %d 条' % page.locator('#pageHost .stage-bar').count())
    ck('项目阶段表有行', page.locator('#pageHost table.tbl tbody tr').count() >= 5)

    print('\n=== 2. 需求管理 ===')
    for pid, label in [('req:customer', '客户需求'), ('req:internal', '自研需求')]:
        page.evaluate('showPage("%s")' % pid)
        page.wait_for_timeout(300)
        rows = page.locator('#lpHost table.tbl tbody tr').count()
        ck('%s 列表有行' % label, rows >= 3, '%d 行' % rows)
        ck('%s 侧栏高亮=1' % label,
           page.locator('#navScroll .nav-item.active').count() == 1)

    # 需求详情弹窗
    page.evaluate("demandView('CR-2026-018')")
    page.wait_for_timeout(300)
    ck('需求详情弹窗打开', page.locator('#mask.on').count() == 1)
    ck('弹窗含「验收标准」', '验收标准' in page.locator('#mBody').inner_html())
    page.evaluate('closeModal()')
    page.wait_for_timeout(200)

    # 需求转立项（IR-2026-012 尚未立项）
    n0 = page.evaluate('PROJECTS.length')
    page.evaluate("demandToPrj('IR-2026-012')")
    page.wait_for_timeout(300)
    page.locator('#_cfmOk').click()
    page.wait_for_timeout(500)
    n1 = page.evaluate('PROJECTS.length')
    ck('需求转立项：项目数 +1', n1 == n0 + 1, '%d → %d' % (n0, n1))
    ck('需求已绑定项目', page.evaluate("DEMANDS.filter(function(d){return d.id==='IR-2026-012';})[0].prj") != '')
    ck('跳转到项目详情', 'proj:detail' in page.evaluate('curPage'), page.evaluate('curPage'))

    print('\n=== 3. 项目列表 → 详情 6 Tab（项目信息在 Tab 外）===')
    page.evaluate('showPage("proj:list")')
    page.wait_for_timeout(300)
    ck('项目列表有行', page.locator('#lpHost table.tbl tbody tr').count() >= 5)

    print('\n--- 2b. 新增研发项目子页面 ---')
    page.locator('.page-acts button', has_text='添加').click()
    page.wait_for_timeout(250)
    ck('添加按钮进入子页面', page.evaluate('curPage') == 'proj:new', page.evaluate('curPage'))
    ck('新增页侧栏仍高亮项目管理',
       page.locator('#navScroll .nav-item.active[data-go="proj:list"]').count() == 1)
    new_labels = page.evaluate("Array.from(document.querySelectorAll('.proj-create-form>.field>label')).map(x=>x.childNodes[0].textContent.trim())")
    ck('新增页包含全部项目信息字段', new_labels == [
        '项目负责人', '归属部门', '项目名称', '产品名称', '产品类别', '应用行业',
        '项目来源', '项目类别', '合计（系数）', '是否重点', '项目计划完成时间', '备注'
    ], ' / '.join(new_labels))
    page.locator('#pnLeader').select_option(label='李工（实验员）')
    page.locator('#pnDept').select_option('LAB-SC-1')
    page.locator('#pnName').fill('无溶剂合成革中试验证')
    page.locator('#pnProduct').fill('无溶剂合成革中间体')
    page.locator('#pnProductCategory').fill('合成革材料')
    page.locator('#pnIndustry').fill('合成革')
    page.locator('#pnSource').fill('技术预研')
    page.locator('#pnCategory').select_option(label='中间体')
    page.locator('#pnCoefficient').fill('1')
    page.locator('#pnImportant').select_option('true')
    page.locator('#pnDueDate').fill('2027-06-30')
    page.locator('#pnRemark').fill('验证中试放大稳定性')
    n_before = page.evaluate('PROJECTS.length')
    page.get_by_role('button', name='保存项目', exact=True).click()
    ck('系数等于 1 时禁止保存', page.evaluate('PROJECTS.length') == n_before and page.evaluate('curPage') == 'proj:new')
    page.locator('#pnCoefficient').fill('0.72')
    page.get_by_role('button', name='保存项目', exact=True).click()
    page.wait_for_timeout(300)
    new_id = page.evaluate('PROJECTS[PROJECTS.length-1].id')
    ck('保存后新增项目并进入详情', page.evaluate('PROJECTS.length') == n_before + 1 and page.evaluate('curPage') == 'proj:detail', new_id)
    ck('新增项目保存全部字段', page.evaluate("""()=>{
      var p=PROJECTS[PROJECTS.length-1];
      return p.leader==='李工'&&p.dept==='LAB-SC-1'&&p.name==='无溶剂合成革中试验证'&&
        p.product==='无溶剂合成革中间体'&&p.productCategory==='合成革材料'&&p.industry==='合成革'&&
        p.source==='技术预研'&&p.category==='中间体'&&p.coefficient===0.72&&p.important===true&&
        p.dueDate==='2027-06-30'&&p.remark==='验证中试放大稳定性';
    }"""))
    ck('新增项目初始化七阶段（含推广）', page.evaluate('(PROJ_STAGES[PROJECTS[PROJECTS.length-1].id]||[]).length') == 7)

    page.evaluate("showPage('proj:detail',{id:'PRJ-2026-002'})")
    page.wait_for_timeout(400)
    ck('项目详情渲染', 'PRJ-2026-002' in page.locator('#pageHost').inner_html())
    ck('侧栏高亮锁回项目列表',
       page.locator('#navScroll .nav-item.active[data-go="proj:list"]').count() == 1)
    ck('Tab 数=6', page.locator('#projTabBar .tabs button').count() == 6,
       '%d 个' % page.locator('#projTabBar .tabs button').count())

    TABS = ['项目表单', '变更记录', '审核历史', '实验记录', '实验总结', '文档']
    labels = page.evaluate(
        "Array.from(document.querySelectorAll('#projTabBar .tabs button')).map(b=>b.textContent)")
    for want in TABS:
        ck('含 Tab「%s」' % want, any(want in l for l in labels))
    ck('已删除「需求」Tab', not any('需求' in l for l in labels))

    # 项目信息必须在 Tab 容器之外
    order = page.evaluate("""()=>{
      var kids=[].slice.call(document.getElementById('pageHost').children);
      return {info:kids.findIndex(k=>k.textContent.indexOf('项目信息')>=0),
              bar :kids.findIndex(k=>k.id==='projTabBar')};
    }""")
    ck('项目信息区块在 Tab 容器之前', order['info'] >= 0 and order['info'] < order['bar'])
    info_labels = page.evaluate("Array.from(document.querySelectorAll('#pageHost>.card th')).map(x=>x.textContent.trim())")
    ck('项目信息字段顺序正确', info_labels == [
        '项目负责人', '归属部门', '项目名称', '产品名称', '产品类别', '应用行业',
        '项目来源', '项目类别', '合计（系数）', '是否重点', '项目计划完成时间', '备注'
    ], ' / '.join(info_labels))

    # 四个操作按钮
    btns = page.evaluate("Array.from(document.querySelectorAll('.page-acts .btn')).map(b=>b.textContent)")
    for want in ['返回', '更换负责人', '修改项目名称', '调整部门']:
        ck('含按钮「%s」' % want, want in btns)

    # Tab 标签行与内容区间距（曾经 margin-bottom:0 导致完全贴合）
    gap = page.evaluate("""()=>{
      var t=document.querySelector('#projTabBar .tabs').getBoundingClientRect();
      var b=document.getElementById('projTabBody').getBoundingClientRect();
      return Math.round(b.top - t.bottom);
    }""")
    ck('标签行与内容有间距', gap >= 10, '%d px' % gap)

    SHORT = ['form', 'change', 'audit', 'exp', 'sum', 'doc']
    for idx, label in enumerate(TABS):
        page.locator('#projTabBar .tabs button').nth(idx).click()
        page.wait_for_timeout(250)
        body = page.locator('#projTabBody').inner_html()
        ck('Tab「%s」有内容' % label, len(body.strip()) > 200, '%d 字符' % len(body.strip()))

    print('\n--- 3b. 右侧竖向阶段导航（仅项目表单 Tab）---')
    page.locator('#projTabBar .tabs button').nth(0).click()
    page.wait_for_timeout(300)
    ck('项目表单 Tab 有阶段导航', page.locator('#projTabBody .stage-nav').count() == 1)
    ck('阶段项 = 7', page.locator('#projTabBody .sn-item').count() == 7,
       '%d 个' % page.locator('#projTabBody .sn-item').count())
    stage_names = page.evaluate("Array.from(document.querySelectorAll('#projTabBody .sn-item .snn')).map(x=>x.textContent)")
    ck('阶段顺序正确', stage_names == ['评审', '预研', '小试', '中试', '试生产', '交付', '推广'], ' → '.join(stage_names))
    ck('导航位于内容右侧', page.evaluate("""()=>{
      var f=document.querySelector('.proj-form-wrap>.card').getBoundingClientRect();
      var n=document.querySelector('.stage-nav').getBoundingClientRect();
      return n.left > f.left;
    }"""))
    t0 = page.locator('#projTabBody .card-hd h3').first.inner_text()
    page.locator('#projTabBody .sn-item').nth(0).click()
    page.wait_for_timeout(300)
    t1 = page.locator('#projTabBody .card-hd h3').first.inner_text()
    ck('切换阶段内容变化', t0 != t1, '%s → %s' % (t0, t1))
    body = page.locator('#projTabBody').inner_text()
    for f in ['需求及创新评审计划完成时间', '需求及创新评审实际完成时间', '评审是否通过']:
        ck('评审阶段含「%s」' % f, f in body)

    page.locator('#projTabBody .sn-item').nth(1).click()
    pre = page.locator('#projTabBody').inner_text()
    ck('预研阶段仅保留时间与状态', all(x in pre for x in ['开始时间', '完成时间', '阶段状态']))
    ck('预研阶段已删除旧评审字段', all(x not in pre for x in ['所属项目', '评审结果', '评审人', '阶段目标', '阶段成果', '阶段附件']))

    page.locator('#projTabBody .sn-item').nth(2).click()
    pilot = page.locator('#projTabBody').inner_text()
    for f in ['稳定性考察是否完成', '压力测试是否完成', '小试总结计划完成时间', '小试总结实际完成时间', '小试总结完成附件']:
        ck('小试阶段含「%s」' % f, f in pilot)

    page.locator('#projTabBody .sn-item').nth(3).click()
    middle = page.locator('#projTabBody').inner_text()
    for f in ['中试申请是否完成', '第一批合格计划完成时间', '第一批合格实际完成时间', '中试产品应用评价报告']:
        ck('中试阶段含「%s」' % f, f in middle)

    for i, name in [(1, '变更记录'), (2, '审核历史'), (3, '实验记录'), (4, '实验总结'), (5, '文档')]:
        page.locator('#projTabBar .tabs button').nth(i).click()
        page.wait_for_timeout(220)
        ck('%s Tab 不显示阶段导航' % name,
           page.locator('#projTabBody .stage-nav').count() == 0)

    print('\n--- 3c. 实验总结可穿透到实验 ---')
    page.locator('#projTabBar .tabs button').nth(4).click()
    page.wait_for_timeout(300)
    rows = page.locator('#projTabBody table.tbl tbody tr').count()
    ck('展示实验分析与总结数据列表', rows == page.evaluate("projectExpSummaries('PRJ-2026-002').length"), '%d 行' % rows)
    ck('使用统一总结数据源', page.evaluate("projectExpSummaries('PRJ-2026-002')[0].id") == 'SUM-2026-0006')
    page.get_by_role('button', name='详情', exact=True).first.click()
    page.wait_for_timeout(450)
    ck('穿透到总结详情', page.evaluate('curPage') == 'exp:sum-detail', page.evaluate('curPage'))

    print('\n=== 4. 项目 ↔ 实验 多对多（核心）===')
    # 基线
    total_exp = page.evaluate('experiments.length')
    base_002 = page.evaluate("expOfProject('PRJ-2026-002').length")
    # 用一条「普通实验」做关联实验：DOE-2026-xxxx 现在是方案层，不再是实验记录
    base_x = page.evaluate("findExp('EXP-2026-0402').projectIds.slice()")
    ck('基线 PRJ-2026-002 有实验', base_002 >= 1, str(base_002))
    ck('基线 EXP-2026-0402 只属 005', base_x == ['PRJ-2026-005'], str(base_x))

    # 挂载：把 EXP-2026-0402 挂到 PRJ-2026-002
    # 注意：3c 穿透后已跳到 exp:detail，必须先回到项目详情页
    page.evaluate("showPage('proj:detail',{id:'PRJ-2026-002'})")
    page.wait_for_timeout(400)
    page.locator('#projTabBar .tabs button').nth(3).click()   # 回到「实验记录」Tab
    page.wait_for_timeout(250)
    page.evaluate("projAttachExp('PRJ-2026-002')")
    page.wait_for_timeout(350)
    ck('挂载弹窗打开', page.locator('#mask.on').count() == 1)
    cand = page.locator('#modal input.chk')
    ck('候选实验列表非空', cand.count() >= 1, '%d 个候选' % cand.count())
    page.evaluate("""() => {
        var boxes = Array.prototype.slice.call(document.querySelectorAll('#modal input.chk'));
        boxes.forEach(function(b){
            if (b.value === 'EXP-2026-0402') { b.checked = true; }
        });
    }""")
    page.evaluate("projAttachSave('PRJ-2026-002')")
    page.wait_for_timeout(450)

    after_002 = page.evaluate("expOfProject('PRJ-2026-002').length")
    after_x = page.evaluate("findExp('EXP-2026-0402').projectIds.slice()")
    ck('挂载后 PRJ-2026-002 实验数 +1', after_002 == base_002 + 1, '%d → %d' % (base_002, after_002))
    ck('挂载后 EXP-2026-0402 属 2 个项目', len(after_x) == 2, str(after_x))
    ck('另一项目 005 仍持有该实验',
       page.evaluate("expOfProject('PRJ-2026-005').length") >= 2)
    ck('实验总数不变（仅加关联）', page.evaluate('experiments.length') == total_exp,
       str(page.evaluate('experiments.length')))

    # 跨项目可见性：切到 005 看该实验的「其他关联项目」标记
    page.evaluate("showPage('proj:detail',{id:'PRJ-2026-005'})")
    page.wait_for_timeout(350)
    page.locator('#projTabBar .tabs button').nth(3).click()
    page.wait_for_timeout(250)
    ck('005 侧显示「+N 个项目」标记', 'proj-more' in page.locator('#projTabBody').inner_html())

    # 移除：从 002 摘掉 EXP-2026-0402
    page.evaluate("showPage('proj:detail',{id:'PRJ-2026-002'})")
    page.wait_for_timeout(350)
    page.locator('#projTabBar .tabs button').nth(3).click()
    page.wait_for_timeout(250)
    page.evaluate("projDetachExp('PRJ-2026-002','EXP-2026-0402')")
    page.wait_for_timeout(350)
    ck('移除确认框弹出', page.locator('#_cfmOk').count() == 1)
    page.locator('#_cfmOk').click()
    page.wait_for_timeout(450)
    ck('移除后 002 实验数复原',
       page.evaluate("expOfProject('PRJ-2026-002').length") == base_002)
    ck('移除后实验本体仍在', page.evaluate("!!findExp('EXP-2026-0402')"))
    ck('移除后 EXP-2026-0402 projectIds 复原',
       page.evaluate("findExp('EXP-2026-0402').projectIds.slice()") == ['PRJ-2026-005'])

    print('\n=== 5. 应用项目 ===')
    page.evaluate('showPage("proj:app")')
    page.wait_for_timeout(300)
    ck('应用项目列表有行', page.locator('#lpHost table.tbl tbody tr').count() >= 3)
    page.evaluate("showPage('proj:app-detail',{id:'APP-2026-006'})")
    page.wait_for_timeout(350)
    ck('应用项目详情渲染', 'APP-2026-006' in page.locator('#pageHost').inner_html())
    ck('详情含「应用验证结果」', '应用验证结果' in page.locator('#pageHost').inner_html())
    ck('侧栏高亮锁回应用项目',
       page.locator('#navScroll .nav-item.active[data-go="proj:app"]').count() == 1)

    print('\n=== 6. 受限物质管理 ===')
    page.evaluate('showPage("subst:list")')
    page.wait_for_timeout(300)
    ck('受限物质列表有行', page.locator('#lpHost table.tbl tbody tr').count() >= 8)
    page.evaluate("substCheck('甲醛')")
    page.wait_for_timeout(350)
    ck('配方命中检查弹窗打开', page.locator('#mask.on').count() == 1)
    mbody = page.locator('#mBody').inner_html()
    ck('弹窗含限值要求', '限值要求' in mbody)
    ck('弹窗给出命中或未检出结论', ('命中' in mbody) or ('未检出' in mbody))
    page.evaluate('closeModal()')

    print('\n=== 7. 推广阶段 8 字段（真实系统口径）===')
    page.evaluate('showPage("proj:list")')
    page.wait_for_timeout(400)
    mh = page.inner_text('#pageHost')
    ck('矩阵推广阶段 6 个子阶段列名对齐',
       all(k in mh for k in ['产品验证', '产品性能评审', '技术与成本评审', '产品试推广', '放大生产', '产品正式推广']))
    g5 = page.evaluate("()=>{var c=PROJ_GATE_DATA['PRJ-2026-005'];return c.slice(10,16).map(function(x){return x.value+'/'+x.state}).join('|')}")
    ck('005 推广 6 格 = 是|是|是|2026-09-16(待完成)|否|否',
       g5 == '是/on-time|是/on-time|是/on-time|2026-09-16/pending|否/pending|否/pending', g5)
    ck('推广字段定义：5 个是/否 + 1 附件 + 2 时间',
       page.evaluate("()=>PROMO_FIELDS.filter(function(f){return f.type==='yn'}).length") == 5 and
       page.evaluate("()=>PROMO_FIELDS.filter(function(f){return f.type==='file'}).length") == 1 and
       page.evaluate("()=>PROMO_FIELDS.filter(function(f){return f.type==='date'}).length") == 2)
    page.evaluate("()=>showPage('proj:detail',{id:'PRJ-2026-005'})")
    page.wait_for_timeout(500)
    dt = page.inner_text('#pageHost')
    ck('推广详情 8 字段齐全',
       all(k in dt for k in ['产品验证是否完成', '产品性能评审是否完成', '技术与成本评审是否完成',
                             '技术及成本评审附件', '产品试推广计划完成时间', '产品试推广实际完成时间',
                             '放大生产是否合格', '产品正式推广是否发起']),
       [k for k in ['产品验证是否完成', '产品性能评审是否完成', '技术与成本评审是否完成',
                    '技术及成本评审附件', '产品试推广计划完成时间', '产品试推广实际完成时间',
                    '放大生产是否合格', '产品正式推广是否发起'] if k not in dt])
    pg5 = page.evaluate("()=>PROJ_STAGES['PRJ-2026-005'].filter(function(s){return s.name==='推广'})[0].promoGates")
    ck('005 promoGates = 是/是/是/2026-09-16/空/否/否',
       pg5 == ['是', '是', '是', '2026-09-16', '', '否', '否'], str(pg5))
    ck('评审附件渲染文件名', 'GL-9 技术与成本评审纪要' in dt)

    print('\n=== 8. dev:kit 调试页（不占侧栏）===')
    page.evaluate('showPage("dev:kit")')
    page.wait_for_timeout(400)
    ck('调试页可访问', '组件调试台' in page.locator('#pageHost').inner_html())
    ck('调试页侧栏无高亮', page.locator('#navScroll .nav-item.active').count() == 0,
       '实际 %d' % page.locator('#navScroll .nav-item.active').count())
    ck('调试页列出全部已注册页面',
       page.locator('#pageHost .btn-sm').count() == page.evaluate('Object.keys(PAGES).length'))

    b.close()

ok = sum(1 for c in checks if c[0])
bad = [c for c in checks if not c[0]]
print('\n' + '=' * 60)
print('断言通过 %d / %d' % (ok, len(checks)))
if bad:
    print('\n失败项：')
    for _, n, d in bad:
        print('  ❌ %s  %s' % (n, d))
print('JS 错误数：%d' % len(errors))
for e in errors[:15]:
    print('  ' + e)
print('=' * 60)


# --- 统一退出码：存在失败断言时返回非零，避免 run_smoke.sh 误判为通过 ---
if bad:
    raise SystemExit(1)
