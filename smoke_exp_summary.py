_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""实验分析与总结 专项自检
覆盖：菜单改名/新增、双树（组织结构+项目）联动、7 个搜索条件、6 个列表字段、
      3 个行操作、详情子页面标题栏与对比区五段结构、新建/编辑/删除、一键重置。"""
import sys
from playwright.sync_api import sync_playwright

F = "/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
PASS = 0; FAIL = 0
def ok(c, m):
    global PASS, FAIL
    if c: PASS += 1; print("  ✔", m)
    else: FAIL += 1; print("  ❌", m)

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("file://" + F); pg.wait_for_timeout(1500)

    print("=== 一、菜单 ===")
    menu = pg.evaluate("""()=>{var g=MENU.find(function(m){return m.id==='exp';});
        return g?g.children.map(function(c){return c.id+'|'+c.name;}):[];}""")
    ok(menu == ['exp:guide|流程引导', 'exp:list|实验列表', 'exp:doe|DOE 实验设计', 'exp:analysis|DOE实验分析', 'exp:sum|实验分析与总结'],
       "实验管理菜单以流程引导开头，后接实验列表 / DOE 设计与分析 / 实验分析与总结（实际：%s）" % menu)

    print("\n=== 二、数据层 ===")
    ok(pg.evaluate("()=>expSummaries.length===6"), "expSummaries 种子 6 份对比总结报告")
    ok(pg.evaluate("()=>expSummaries.every(function(s){return s.expIds.every(function(id){return !!findExp(id);});})"),
       "每份报告引用的实验编号都存在于 experiments")
    ok(pg.evaluate("()=>expSummaries.every(function(s){return !!s.purpose&&!!s.craft;})"), "每份报告都有实验目的与实验工艺")
    ok(pg.evaluate("()=>expSummaries.every(function(s){return s.items.length===s.expIds.length;})"), "对比区条目数与引用实验数一致")
    ok(pg.evaluate("()=>expSummaries.every(function(s){return !!s.leader;})"), "每份报告都能取到项目负责人")

    print("\n=== 二·补 受控差异（可比性）语义 ===")
    ok(pg.evaluate("()=>expSummaries.every(function(s){return s.expIds.length>=2;})"),
       "每份总结都引用 ≥2 组实验（分析对象是一组可比实验，而非单条记录）")
    ok(pg.evaluate("()=>expSummaries.every(function(s){return !!s.diffNote;})"),
       "每份报告都有「受控差异说明」")
    ok(pg.evaluate("()=>expSummaries.every(function(s){return (s.craft||'').indexOf('·')<0;} )"),
       "工艺字段只写工艺路线/模板（用 → 连接工序），不再塞具体参数取值")
    ok(pg.evaluate("()=>expSummaries.every(function(s){return s.items.every(function(it){return !!it.craftParams&&!!it.diff;});})"),
       "每组实验都有「本组实际参数」与「本组受控差异取值」")
    ok(pg.evaluate("()=>expSummaries.every(function(s){return sumDiffCount(s)>=2;})"),
       "每份报告组内受控变量取值 ≥2 种（确实存在受控差异，而非完全重复）")
    ok(pg.evaluate("()=>expSummaries.every(function(s){return s.items.every(function(it){return (it.craftParams||'').indexOf('→')<0;});})"),
       "各组实际参数用具体取值描述，与工艺路线区分开")

    print("\n=== 三、列表页结构 ===")
    pg.evaluate("showPage('exp:sum')"); pg.wait_for_timeout(800)
    heads = pg.evaluate("()=>Array.from(document.querySelectorAll('.tbl thead th')).map(function(t){return t.textContent.trim();})")
    for k in ['行号', '实验编号（实验员）', '实验工艺', '实验总结', '创建人', '创建时间', '操作']:
        ok(k in heads, "列表含字段「%s」" % k)
    ok(pg.evaluate("()=>!!document.getElementById('sumTree')"), "左侧树容器存在")
    tree = pg.evaluate("()=>document.getElementById('sumTree').textContent")
    ok('组织结构' in tree, "含「组织结构」树")
    ok('项目' in tree, "含「项目」树")
    ok(pg.evaluate("()=>document.getElementById('sumTree').textContent.indexOf('上海实验室一')>=0"), "组织结构树含实验室部门")
    ok(pg.evaluate("()=>document.querySelectorAll('#sumTbody tr').length===6"), "列表 6 行")
    ok(pg.evaluate("()=>document.querySelector('#sumTbody tr td.op').textContent.indexOf('详情')>=0"
                   "&&document.querySelector('#sumTbody tr td.op').textContent.indexOf('编辑')>=0"
                   "&&document.querySelector('#sumTbody tr td.op').textContent.indexOf('删除')>=0"),
       "行操作含 详情 / 编辑 / 删除")

    print("\n=== 四、7 个搜索条件 ===")
    for eid, ph in [('sumKwPurpose', '实验目的'), ('sumKwExpId', '实验编号'), ('sumKwOperator', '实验员'),
                    ('sumKwCraft', '实验工艺'), ('sumKwSummary', '实验总结')]:
        ok(pg.evaluate("(id)=>{var e=document.getElementById(id);return !!e&&e.placeholder.indexOf('%s')>=0;}" % ph, eid),
           "搜索框「%s」存在" % ph)
    ok(pg.evaluate("()=>!!document.getElementById('sumFLeader')"), "筛选项「项目负责人」存在")
    ok(pg.evaluate("()=>!!document.getElementById('sumFCreator')"), "筛选项「创建人」存在")

    # 逐个验证筛选生效
    def cnt(): return pg.evaluate("()=>document.querySelectorAll('#sumTbody tr').length")
    pg.evaluate("()=>{sumListState.kwPurpose='国产';renderSumRows();}"); pg.wait_for_timeout(250)
    ok(cnt() == 1, "按实验目的搜「国产」→ 1 条")
    pg.evaluate("()=>{sumListState.kwPurpose='';renderSumRows();}"); pg.wait_for_timeout(200)

    pg.evaluate("()=>{sumListState.kwExpId='DOE-2026-0312';renderSumRows();}"); pg.wait_for_timeout(250)
    ok(cnt() == 1, "按实验编号搜「DOE-2026-0312」→ 1 条")
    pg.evaluate("()=>{sumListState.kwExpId='';renderSumRows();}"); pg.wait_for_timeout(200)

    pg.evaluate("()=>{sumListState.kwOperator='陈工';renderSumRows();}"); pg.wait_for_timeout(250)
    ok(cnt() == 2, "按实验员搜「陈工」→ 2 条")
    pg.evaluate("()=>{sumListState.kwOperator='';renderSumRows();}"); pg.wait_for_timeout(200)

    pg.evaluate("()=>{sumListState.kwCraft='三辊涂布';renderSumRows();}"); pg.wait_for_timeout(250)
    ok(cnt() == 1, "按实验工艺搜「三辊涂布」→ 1 条")
    pg.evaluate("()=>{sumListState.kwCraft='';renderSumRows();}"); pg.wait_for_timeout(200)

    pg.evaluate("()=>{sumListState.kwSummary='交联剂';renderSumRows();}"); pg.wait_for_timeout(250)
    ok(cnt() == 1, "按实验总结搜「交联剂」→ 1 条")
    pg.evaluate("()=>{sumListState.kwSummary='';renderSumRows();}"); pg.wait_for_timeout(200)

    pg.evaluate("()=>{sumListState.kwLeader='陈工';renderSumRows();}"); pg.wait_for_timeout(250)
    ok(cnt() == 2, "按项目负责人「陈工」→ 2 条")
    pg.evaluate("()=>{sumListState.kwLeader='';renderSumRows();}"); pg.wait_for_timeout(200)

    pg.evaluate("()=>{sumListState.kwCreator='李工';renderSumRows();}"); pg.wait_for_timeout(250)
    ok(cnt() == 3, "按创建人「李工」→ 3 条")
    pg.evaluate("()=>{sumListState.kwCreator='';renderSumRows();}"); pg.wait_for_timeout(200)

    print("\n=== 五、双树联动 ===")
    pg.evaluate("sumTreeSelect('dept','LAB-SH-1')"); pg.wait_for_timeout(350)
    ok(pg.evaluate("()=>document.getElementById('sumTree').textContent.indexOf('组织结构')>=0"), "选中部门后组织结构树仍在")
    ok(cnt() >= 1, "选中「上海实验室一」后仍可过滤出报告")
    pg.evaluate("sumTreeSelect('all')"); pg.wait_for_timeout(300)
    ok(cnt() == 6, "点「全部实验室」恢复 6 条")
    pg.evaluate("sumTreeSelect('proj','PRJ-2026-005')"); pg.wait_for_timeout(350)
    ok(cnt() == 2, "点项目 PRJ-2026-005 → 2 条")
    pg.evaluate("sumTreeSelect('all')"); pg.wait_for_timeout(300)

    print("\n=== 六、详情子页面 ===")
    pg.evaluate("openSummary('SUM-2026-0006')"); pg.wait_for_timeout(800)
    ok(pg.evaluate("()=>curPage==='exp:sum-detail'"), "进入详情子页面")
    hero = pg.evaluate("()=>{var e=document.querySelector('.sum-hero');return e?e.textContent:'';}")
    ok('实验目的' in hero and '实验工艺' in hero, "标题栏含 实验目的 / 实验工艺")
    ok('受控差异' in hero, "标题栏含「受控差异」行")
    ok('工艺路线' in hero, "实验工艺标注为「工艺路线 / 模板」")
    ok('国产 / 进口 WPU-320' in hero, "标题栏显示实验目的内容")
    ok('三辊涂布' in hero, "标题栏显示实验工艺内容")
    ok('树脂来源' in hero, "标题栏显示受控差异说明内容")
    body = pg.evaluate("()=>document.getElementById('pageHost').textContent")
    for k in ['基本信息', '原料添加情况', '过程测试结果', '成品检测结果', '总结']:
        ok(k in body, "对比区含「%s」区块" % k)
    ok('受控差异' in body, "对比区含「受控差异」标签（每组的差异值字段）")
    ok('实际参数' in body, "对比区含「实际参数」标签（每组的工艺参数取值）")
    ok('树脂：国产 WPU-320' in body and '树脂：进口 WPU-320（基准样）' in body,
       "各组显示各自的受控差异取值")
    ok(pg.evaluate("()=>document.querySelectorAll('.cmp-grid-wrap').length===1"), "详情页用横向并列对比表")
    ok(pg.evaluate("()=>document.querySelector('.cmp-grid').getAttribute('data-cols')==='3'"), "对比表 data-cols=3")
    ok(pg.evaluate("()=>document.querySelectorAll('.cmp-col-id').length===3"), "列头展示 3 个实验编号")
    ok(pg.evaluate("()=>document.querySelectorAll('.cmp-row').length>=7"), "对比表 ≥7 行（列头+基本信息6行+本组工艺2行+原料+过程+成品+总结）")
    ok(pg.evaluate("()=>document.querySelectorAll('.cmp-row-multi').length===2"), "基本信息与本组工艺参数共 2 个多行区块")
    ok(pg.evaluate("()=>document.querySelectorAll('.cmp-row-table').length===3"), "原料/过程/成品共 3 个小表区块")
    ok(pg.evaluate("()=>document.querySelector('.cmp-grid-wrap').scrollWidth>0"), "对比表所在容器支持横向滚动")
    ok('整体总结' in pg.evaluate("()=>document.body.textContent"), "详情页含整体总结区块")
    ok(pg.evaluate("()=>!!document.querySelector('.sum-overall')"), "整页贯穿的整体总结区块存在")
    overall=pg.evaluate("()=>document.querySelector('.sum-overall').textContent")
    ok(len(overall)>80, "整体总结内容充实（>80 字）")
    ok(pg.evaluate("()=>document.body.textContent.indexOf('批次号')>=0"), "原料添加情况含批次号字段")
    ok(pg.evaluate("()=>document.body.textContent.indexOf('实际用量')>=0"), "原料添加情况含实际用量字段")
    ok(pg.evaluate("()=>document.body.textContent.indexOf('判定')>=0"), "成品检测结果含判定列")

    print("\n=== 七、新建 / 编辑 / 删除 ===")
    n0 = pg.evaluate("()=>expSummaries.length")
    pg.evaluate("showPage('exp:sum')"); pg.wait_for_timeout(400)
    pg.evaluate("openNewSummary()"); pg.wait_for_timeout(400)
    pg.evaluate("""()=>{document.getElementById('sfPurpose').value='自检用总结报告';
        document.getElementById('sfCraft').value='自检工艺路线 A → B → C';
        document.getElementById('sfDiffNote').value='受控差异：自检变量（X / Y）';
        var ps=document.querySelectorAll('[data-sumproj]'); if(ps[1])ps[1].checked=true;
        var es=document.querySelectorAll('[data-sumexp]'); if(es[0])es[0].checked=true;}""")
    pg.evaluate("saveSummary('')"); pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>expSummaries.length") == n0, "只勾 1 组实验时拒绝保存（对比分析需 ≥2 组）")
    pg.evaluate("""()=>{var es=document.querySelectorAll('[data-sumexp]'); if(es[1])es[1].checked=true;}""")
    pg.evaluate("saveSummary('')"); pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>expSummaries.length") == n0 + 1, "勾满 2 组后新建成功，报告数 +1")
    ok(pg.evaluate("()=>expSummaries[0].items.length===2"), "按勾选实验自动生成 2 组对比明细")
    ok(pg.evaluate("()=>expSummaries[0].diffNote.indexOf('自检变量')>=0"), "受控差异说明已保存")
    ok(pg.evaluate("()=>expSummaries[0].items.every(function(it){return it.craftParams==='自检工艺路线 A → B → C';})"),
       "新增组默认继承工艺路线")
    new_id = pg.evaluate("()=>expSummaries[0].id")
    pg.evaluate("(id)=>editSummary(id)", new_id); pg.wait_for_timeout(400)
    pg.evaluate("()=>{document.getElementById('sfPurpose').value='自检用总结报告（已改）';}")
    pg.evaluate("(id)=>saveSummary(id)", new_id); pg.wait_for_timeout(600)
    ok(pg.evaluate("(id)=>findSummary(id).purpose==='自检用总结报告（已改）'", new_id), "编辑保存后实验目的已更新")
    pg.evaluate("(id)=>deleteSummary(id)", new_id); pg.wait_for_timeout(400)
    pg.evaluate("()=>{var b=document.getElementById('_cfmOk');if(b)b.click();}"); pg.wait_for_timeout(600)
    ok(pg.evaluate("()=>expSummaries.length") == n0, "删除后报告数复原")
    ok(pg.evaluate("(id)=>!findSummary(id)", new_id), "被删报告已不存在")

    print("\n=== 八、一键重置覆盖总结数据 ===")
    pg.evaluate("()=>expSummaries.push({id:'SUM-DIRTY',purpose:'脏',craft:'脏',projectIds:[],expIds:[],items:[],creator:'',createTime:'',leader:''});")
    pg.evaluate("wzResetConfirm()"); pg.wait_for_timeout(400)
    pg.evaluate("()=>{var b=document.getElementById('_cfmOk');if(b)b.click();}"); pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>!findSummary('SUM-DIRTY')"), "重置后脏数据被清除")
    ok(pg.evaluate("()=>expSummaries.length===6"), "重置后回到 6 份种子报告")

    print("\n=== JS 错误检查 ===")
    ok(len(errs) == 0, "无 JS 运行时错误" + (("（%s）" % errs[0]) if errs else ""))

print("\n=== 结果：通过 %d / 失败 %d ===" % (PASS, FAIL))
sys.exit(1 if FAIL else 0)
