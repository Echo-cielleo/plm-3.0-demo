_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""第二十六轮冒烟（2026-09-17）
覆盖：① 临时任务（菜单 / 列表 / 新建 / 接收 / 反馈 / 首页联动）
      ② 实验分析两步选择 + 统计工具（参数提取 / 图表 / 统计项 / AI 只围绕所选参数）
      ③ 新建实验「实验目的」≥5 字校验
      ④ 产品理化指标范围值展示 + 超范围标红
"""
import pathlib
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

    # ==================== ① 临时任务 ====================
    print('=== 一、临时任务 ===')
    ok(pg.evaluate("()=>MENU.filter(function(g){return g.id==='proj';})[0].children.some(function(c){return c.id==='proj:task';})"),
       '菜单「项目管理 → 临时任务」已注册')
    pg.evaluate("()=>showPage('proj:task')"); pg.wait_for_timeout(400)
    head = pg.eval_on_selector_all("#lpHost table thead th", "els=>els.map(e=>e.textContent.trim())")
    for t in ['任务标题', '发布人', '执行人', '发布时间', '要求完成时间', '状态', '操作']:
        ok(t in head, '列表含列「%s」' % t)
    ok(pg.eval_on_selector_all("#lpHost tbody tr", "e=>e.length") == 3, 'mock 3 条数据')
    ok(pg.evaluate("()=>TMP_TASKS.every(function(t){return TMP_STATUS.indexOf(t.status)>=0;})"),
       '状态取值均在 待接收 / 进行中 / 已反馈 内')
    ok(pg.evaluate("()=>TMP_TASKS.filter(function(t){return t.publisher==='严总';}).length===2"),
       '2 条由管理层（严总）发布')

    # 新建：必填校验 + 发布
    n0 = pg.evaluate("()=>TMP_TASKS.length")
    pg.evaluate("()=>tmpTaskNew()"); pg.wait_for_timeout(300)
    pg.click("#mFoot button:has-text('发布')"); pg.wait_for_timeout(250)
    ok(pg.evaluate("()=>TMP_TASKS.length") == n0, '标题为空时拒绝发布')
    pg.fill("#ttTitle", '整理本周涂饰层耐干擦异常批次清单')
    pg.fill("#ttContent", '把本周耐干擦不合格的批次编号、工序参数与初步原因列成一张表，周五前给到严总。')
    pg.select_option("#ttExecutor", '李工')
    pg.fill("#ttDue", pg.evaluate("()=>daysFromNow(4)"))
    pg.click("#mFoot button:has-text('发布')"); pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>TMP_TASKS.length") == n0 + 1, '发布成功，记录数 +1')
    ok(pg.evaluate("()=>TMP_TASKS[0].publisher==='王研究员' && TMP_TASKS[0].status==='待接收'"),
       '发布人 = 当前登录用户，初始状态「待接收」')
    ok(pg.evaluate("()=>/^TMP-\\d{4}-\\d{3}$/.test(TMP_TASKS[0].id)"), '编号自动生成为 TMP-YYYY-NNN：%s'
       % pg.evaluate("()=>TMP_TASKS[0].id"))

    # 接收 → 进行中
    tid = pg.evaluate("()=>TMP_TASKS[0].id")
    pg.evaluate("(i)=>tmpTaskAccept(i)", tid); pg.wait_for_timeout(300)
    ok(pg.evaluate("(i)=>tmpById(i).status", tid) == '进行中', '点「接收」后状态 → 进行中')

    # 反馈 → 已反馈
    pg.evaluate("(i)=>tmpTaskFeedback(i)", tid); pg.wait_for_timeout(300)
    pg.click("#mFoot button:has-text('提交反馈')"); pg.wait_for_timeout(250)
    ok(pg.evaluate("(i)=>tmpById(i).status", tid) == '进行中', '反馈内容为空时拒绝提交')
    pg.fill("#fbText", '已整理完毕，共 3 个批次，初步判断与乳化分散温度偏低有关。')
    pg.click("#mFoot button:has-text('提交反馈')"); pg.wait_for_timeout(400)
    ok(pg.evaluate("(i)=>tmpById(i).status", tid) == '已反馈', '提交反馈后状态 → 已反馈')
    ok(bool(pg.evaluate("(i)=>tmpById(i).fbAt", tid)), '反馈时间已记录')

    # 首页行动区（分页后临时任务不一定在第 1 页，先翻到含临时任务的页）
    pg.evaluate("()=>showPage('home')"); pg.wait_for_timeout(400)
    tp = pg.evaluate("()=>{var L=homeActList();for(var i=0;i<L.length;i++){if(L[i].source==='临时任务')return Math.floor(i/HOME_ACT_PS)+1;}return 1;}")
    if tp > 1:
        pg.evaluate("(p)=>homeActPage(p)", tp); pg.wait_for_timeout(300)
    tags = pg.eval_on_selector_all(".act-item .tag", "e=>e.map(x=>x.textContent.trim())")
    ok('临时任务' in tags, '首页行动区出现「临时任务」标签（当前标签：%s）' % tags)
    ok(pg.evaluate("()=>taskTodos().every(function(t){return t.executor===TMP_ME;})"),
       '行动区只出现指派给当前用户的临时任务')
    ok(pg.evaluate("()=>taskTodos().every(function(t){return t.status!=='已反馈';})"),
       '行动区按状态过滤（已反馈不再出现）')
    ok(pg.evaluate("()=>typeof homeActGo({fn:\"x()\"})==='string' && homeActGo({fn:\"x()\"})==='x()'"),
       '行动区按钮支持 fn（直接开反馈弹窗）')

    # 持久化
    pg.evaluate("()=>tmpSave()")
    pg.reload(wait_until='load'); pg.wait_for_timeout(800)
    ok(pg.evaluate("()=>TMP_TASKS.length") == n0 + 1, '刷新后临时任务仍在（localStorage 持久化）')
    ok(pg.evaluate("(i)=>tmpById(i)&&tmpById(i).status==='已反馈'", tid), '刷新后反馈状态保持')

    # ==================== ② 实验分析两步选择 ====================
    print('=== 二、实验分析：两步选择 + 统计工具 ===')
    sid = pg.evaluate("()=>{var s=expSummaries.filter(function(x){return aiSumExpIds(x).length>=3;})[0];return s?s.id:expSummaries[0].id;}")
    pg.evaluate("(i)=>openSumAnalysis(i,'report')", sid); pg.wait_for_timeout(500)
    ok(pg.eval_on_selector_all(".an-step", "e=>e.length") == 2, '左栏两步：① 选择实验 ② 选择参数')
    ok(pg.eval_on_selector_all(".an-pick .ai-pick-item input", "e=>e.length") >= 2, '第 1 步实验可勾选')
    ok(pg.eval_on_selector_all(".an-p", "e=>e.length") > 0, '第 2 步参数可勾选（可用 %d 个）'
       % pg.eval_on_selector_all(".an-p", "e=>e.length"))
    groups = pg.eval_on_selector_all(".an-pg-t", "e=>e.map(x=>x.textContent)")
    ok(any(g in groups for g in ['工序参数', '配比', '过程检测', '成品检测']),
       '参数按来源分组：%s' % groups)
    ok(pg.evaluate("()=>_anaSelKeys.length>0"), '默认已预选参数（%d 个）' % pg.evaluate("()=>_anaSelKeys.length"))

    # 取消勾选一个实验 → 参数与结果重算
    nsel = pg.evaluate("()=>_anaSelIds.length")
    if nsel > 2:
        pg.evaluate("()=>anaToggleExp(_anaSelIds[0])"); pg.wait_for_timeout(400)
        ok(pg.evaluate("()=>_anaSelIds.length") == nsel - 1, '取消勾选实验后选中的实验数 -1')
    else:
        ok(True, '实验数 = 2，跳过取消勾选（至少保留 2 组）')

    # 统计工具
    pg.evaluate("()=>anaSetMode('stat')"); pg.wait_for_timeout(350)
    opts = pg.eval_on_selector_all("#anChartSel option", "e=>e.map(x=>x.textContent)")
    ok(len(opts) == 5, '图表类型 5 项：%s' % len(opts))
    ok(opts[3].find('规划中') > 0 and opts[4].find('规划中') > 0, '箱线图 / 雷达图标记为规划中占位')
    ok(pg.eval_on_selector_all(".an-ck", "e=>e.length") == 7, '统计项 7 项（均值/中位数/方差/标准差/极差/线性拟合/相关系数）')

    pg.evaluate("()=>{_anaChart='bar';_anaStats=['mean','median','var','std','range'];anaGen();}")
    pg.wait_for_timeout(900)
    ok(pg.eval_on_selector_all("#anResult div[id^='anChart']", "e=>e.length") >= 1, '柱状图已渲染（每个参数一张）')
    th = pg.eval_on_selector_all("#anResult thead th", "e=>e.map(x=>x.textContent.trim())")
    ok('均值' in th and '中位数' in th and '方差' in th and '标准差' in th and '极差' in th,
       '统计表含所选统计项列：%s' % th)

    pg.evaluate("()=>{_anaChart='line';anaGen();}"); pg.wait_for_timeout(800)
    ok(pg.eval_on_selector_all("#anResult div[id^='anChart']", "e=>e.length") >= 1, '折线图已渲染')
    pg.evaluate("()=>{_anaChart='scatter';_anaStats=['mean','std','range','fit','corr'];anaGen();}")
    pg.wait_for_timeout(900)
    th2 = pg.eval_on_selector_all("#anResult thead th", "e=>e.map(x=>x.textContent.trim())")
    ok('相关系数 r' in th2 and 'R²' in th2, '散点模式输出相关系数与 R² 表：%s' % th2)
    pg.evaluate("()=>{_anaChart='box';anaGen();}"); pg.wait_for_timeout(500)
    ok('规划' in pg.eval_on_selector("#anResult", "e=>e.textContent"), '箱线图走占位提示（不渲染图表）')
    ok(pg.eval_on_selector_all("#anResult div[id^='anChart']", "e=>e.length") == 0,
       '占位图表类型不产出 anChart 容器')

    # AI 只围绕所选参数
    pg.evaluate("()=>{_anaChart='bar';anaSetMode('ai');anaGen();}"); pg.wait_for_timeout(600)
    txt = pg.eval_on_selector("#aiAnswerBox", "e=>e.textContent")
    ok(len(txt) > 200, 'AI 已产出结论（%d 字）' % len(txt))
    labels = pg.evaluate("()=>anaSelParams().map(function(p){return p.label;})")
    ok(all(l in txt for l in labels), 'AI 结论覆盖全部所选参数：%s' % labels)
    ok('全量' not in txt.replace('未做全量数据分析', ''), 'AI 结论不做全量分析（带范围声明）')

    # 问问 AI 入口：锁定 AI，无分析方式切换
    pg.evaluate("()=>anaCloseModal()"); pg.wait_for_timeout(250)
    pg.evaluate("(i)=>openSumAI(i)", sid); pg.wait_for_timeout(450)
    ok(pg.eval_on_selector_all(".an-mode", "e=>e.length") == 0, '「问问 AI」入口锁定 AI，不出现统计工具切换')
    ok(pg.eval_on_selector_all(".ai-preset", "e=>e.length") == 2, '预置 2 条演示问题')
    pg.evaluate("()=>anaAskPreset(1)"); pg.wait_for_timeout(400)
    ok(len(pg.eval_on_selector("#aiAnswerBox", "e=>e.textContent")) > 100, '预置问题可出结论')
    pg.evaluate("()=>anaCloseModal()"); pg.wait_for_timeout(250)

    # ==================== ③ 实验目的必填校验 ====================
    print('=== 三、新建实验：实验目的 ≥5 字 ===')
    ok(pg.evaluate("()=>expPurposeValid('验证')") is False, '2 字不通过')
    ok(pg.evaluate("()=>expPurposeValid('验证工')") is False, '3 字不通过')
    ok(pg.evaluate("()=>expPurposeValid('验证工艺可行')") is True, '6 字通过')
    n1 = pg.evaluate("()=>experiments.length")
    pg.evaluate("()=>openNewNormalExp()"); pg.wait_for_timeout(350)
    ok(pg.eval_on_selector("#nePurpose", "e=>e.parentNode.querySelector('label').className") == 'req',
       '实验目的标记为必填')
    ok('至少 5 个字' in pg.eval_on_selector("#nePurpose", "e=>e.placeholder"),
       '占位提示写明字数要求')
    pg.fill("#neName", '冒烟用临时实验')
    pg.fill("#nePurpose", '验证')
    pg.click("#mFoot button:has-text('创建')"); pg.wait_for_timeout(350)
    ok(pg.evaluate("()=>experiments.length") == n1, '字数不足时拒绝提交')
    ok('实验目的不得少于 5 个字' in pg.eval_on_selector_all(".toast", "e=>e.map(x=>x.textContent).join('')"),
       '提示文案正确')
    pg.fill("#nePurpose", '验证该工艺在大生产条件下的稳定性与重现性')
    pg.click("#mFoot button:has-text('创建')"); pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>experiments.length") == n1 + 1, '补全后创建成功')

    # ==================== ④ 理化性质范围值 ====================
    print('=== 四、理化性质：范围值展示 + 超范围标红 ===')
    pg.evaluate("()=>showPage('prod:detail',{code:'PRD-2026-001'})"); pg.wait_for_timeout(500)
    n_items = pg.eval_on_selector_all("#pageHost .ph-item", "e=>e.length")
    n_std = pg.eval_on_selector_all("#pageHost .ph-item-std", "e=>e.length")
    ok(n_items > 0 and n_std == n_items, '每项指标均带标准值行（%d/%d）' % (n_std, n_items))
    stds = pg.eval_on_selector_all("#pageHost .ph-item-std", "e=>e.map(x=>x.textContent.trim())")
    ok(any('～' in s for s in stds), '上下限齐全显示为范围值：%s' % [s for s in stds if '～' in s][:2])
    ok(any('≤' in s for s in stds), '只有上限显示为 ≤：%s' % [s for s in stds if '≤' in s][:2])
    ok(any('≥' in s or s.endswith('—') for s in stds), '只有下限显示为 ≥（或指标库未定义时显示 —）')
    ok('不做强制拦截' in pg.eval_on_selector("#pageHost .ph-stat", "e=>e.textContent"),
       '统计条保留「不做强制拦截」口径')

    # 造一个超范围值，验证标红
    pg.evaluate("""()=>{var p=PROD_PHYS['PRD-2026-001'];
      p.vals['IND-0004']={act:'9.4',src:'man',by:'王研究员',date:'2026-09-17'};
      physSave();showPage('prod:detail',{code:'PRD-2026-001'});}""")
    pg.wait_for_timeout(500)
    over = pg.eval_on_selector_all("#pageHost .ph-over-tag", "e=>e.map(x=>x.textContent)")
    ok(len(over) == 1 and '高于上限 8' in over[0], '实测值超上限标红并注明方向：%s' % over)
    ok(pg.eval_on_selector_all("#pageHost .ph-item-v.ph-over-v", "e=>e.length") == 1, '实测值本身标红')
    pg.evaluate("""()=>{var p=PROD_PHYS['PRD-2026-001'];
      p.vals['IND-0004']={act:'7.8',src:'ncc',date:'2026-08-20'};physSave();}""")

    # 实例自带 std 时以实例为准（酶制剂固含量 ≥92%，不应被指标库 48~52% 误判）
    pg.evaluate("()=>showPage('prod:detail',{code:'PRD-2026-013'})"); pg.wait_for_timeout(500)
    ok(pg.eval_on_selector_all("#pageHost .ph-over-tag", "e=>e.length") == 0,
       '产品实例自带标准（≥92%）时不被指标库上下限误判')

    ok(not errs, '无 JS 运行时错误：%s' % errs)
    b.close()

print('\n===== %d 项失败 =====' % len(FAIL))
if FAIL:
    for m in FAIL:
        print('  ❌ ' + m)
    raise SystemExit(1)
print('✅ 第二十六轮冒烟全绿')
