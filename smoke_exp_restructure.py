_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""实验管理 · 三页重构 专项自检
菜单：实验列表 / DOE 实验设计 / DOE实验分析 / 实验分析与总结
覆盖：菜单结构、三层数据模型、列表字段与筛选、按状态的按钮分支、
      确认下发→生成 1 条 DOE 执行实验及 N 组运行、批量录入、
      分析对象列表三种按钮态、报告页非首页、0 JS 错误。"""
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

    print("=== 一、菜单结构 ===")
    menu = pg.evaluate("""()=>{
      var g=MENU.find(function(m){return m.id==='exp';});
      return g?g.children.map(function(c){return c.id+'|'+c.name;}):[];}""")
    ok(menu[:4] == ['exp:guide|流程引导', 'exp:list|实验列表', 'exp:doe|DOE 实验设计', 'exp:analysis|DOE实验分析'],
       "实验管理前四项为 流程引导 / 实验列表 / DOE 实验设计 / DOE实验分析（实际：%s）" % menu)
    ok(menu == ['exp:guide|流程引导', 'exp:list|实验列表', 'exp:doe|DOE 实验设计', 'exp:analysis|DOE实验分析', 'exp:sum|实验分析与总结'],
       "实验管理下含 5 项菜单，流程引导在首位（实际：%s）" % menu)
    ok(pg.evaluate("()=>!MENU.some(function(g){return (g.children||[]).some(function(c){return c.name==='实验数据分析';});})"),
       "旧菜单「实验数据分析」已移除")

    print("\n=== 二、三层数据模型 ===")
    ok(pg.evaluate("()=>typeof doeSchemes!=='undefined'&&doeSchemes.length===8"), "doeSchemes 方案层 8 条")
    ok(pg.evaluate("()=>experiments.length===14"), "experiments 执行层 14 条（11 普通 + 3 DOE 执行实验）")
    ok(pg.evaluate("()=>experiments.filter(function(e){return e.source==='DOE';}).length===3&&doeRuns.length===44"), "3 条 DOE 执行实验包含 44 组运行")
    ok(pg.evaluate("()=>doeRuns.every(function(e){return !!findScheme(e.schemeId)&&!!findExp(e.parentExecutionId);})"),
       "每组 DOE 运行都能回溯到所属方案与执行实验")
    ok(pg.evaluate("""()=>doeSchemes.filter(function(s){return s.status==='草稿'||s.status==='待下发';})
                        .every(function(s){return runsOfScheme(s.id).length===0;})"""),
       "草稿 / 待下发方案不生成实验记录")
    ok(pg.evaluate("()=>runsOfScheme('DOE-2026-0312').length===21"), "已完成方案 0312 下发 21 条运行记录")
    ok(pg.evaluate("()=>!!findRun('DOE-2026-0312',1)&&findRun('DOE-2026-0312',1).id==='DOE-2026-0312-R01'"),
       "运行记录编号形如 DOE-2026-0312-R01")

    print("\n=== 三、实验列表页 ===")
    pg.evaluate("showPage('exp:list')"); pg.wait_for_timeout(800)
    heads = pg.evaluate("()=>Array.from(document.querySelectorAll('#expTbody')).length?Array.from(document.querySelectorAll('.tbl thead th')).map(function(t){return t.textContent.trim();}):[]")
    expected = ['行号', '实验目的', '实验编号', '总结', '实验日期', '实验员', '实验类型', '结论',
                '实验变量', '创建人', '创建时间', '实验来源', 'DOE 方案 / 试验组', '操作']
    ok(heads == expected, "列表字段名称与顺序正确：%s" % ' / '.join(heads))
    ok(pg.evaluate("()=>!!document.getElementById('expFSource')&&document.getElementById('expFSource').options.length===3"),
       "筛选项「实验来源」含 全部/普通实验/DOE实验")
    ok(pg.evaluate("()=>!!document.getElementById('expFSta')"), "筛选项「执行状态」存在")
    ok(pg.evaluate("()=>!!document.getElementById('expFOwner')"), "筛选项「负责人」存在")
    ok(pg.evaluate("()=>!!document.getElementById('expFProj')"), "筛选项「所属项目」存在")
    ok(pg.evaluate("()=>!!document.getElementById('expKw')"), "实验目的 / 编号 / 结论 / 变量搜索框存在")
    ok(pg.evaluate("()=>!!document.getElementById('expTree')"), "左侧部门-项目树保留")
    ok(pg.evaluate("()=>document.querySelector('#expTree .et-head').textContent.trim()==='部门/项目'"), "树标题改为「部门/项目」")
    ok(pg.evaluate("()=>document.querySelector('#expTree .et-root .et-name').textContent.trim()==='全部部门'"), "树根节点改为「全部部门」")
    ok(pg.evaluate("()=>document.body.textContent.indexOf('新增普通实验')>=0"), "主按钮「＋ 新增普通实验」存在")
    # DOE 执行实验显示所属方案 / 试验组数
    pg.evaluate("()=>{expListState.fSource='DOE实验';renderExpRows();}"); pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>document.querySelector('#expTbody').textContent.indexOf('/ 共 21 组')>=0"),
       "DOE 执行实验显示「所属方案 / 试验组数」")
    ok(pg.evaluate("()=>document.querySelector('#expTbody').textContent.indexOf('因素：')>=0"),
       "DOE 执行实验保留因素与响应变量说明")
    ok(pg.evaluate("()=>document.querySelectorAll('#expTbody tr').length===3"), "来源筛选 DOE实验 → 3 条执行实验")
    pg.evaluate("()=>{expListState.fSource='普通实验';renderExpRows();}"); pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>document.querySelectorAll('#expTbody tr').length===11"), "来源筛选 普通实验 → 11 条")
    pg.evaluate("()=>{expListState.fSource='';renderExpRows();}"); pg.wait_for_timeout(300)
    # 行内按钮
    row = pg.evaluate("()=>document.querySelector('#expTbody tr td.op').textContent")
    ok('查看详情' in row and '录入数据' in row, "行内按钮含 查看详情 / 录入数据")
    ok(pg.evaluate("""()=>{var trs=Array.from(document.querySelectorAll('#expTbody tr'));
        var done=trs.filter(function(t){return t.textContent.indexOf('已完成')>=0||t.textContent.indexOf('已分析')>=0;});
        return done.length>0 && done[0].querySelector('td.op').textContent.indexOf('查看结果')>=0;}"""),
       "已完成实验增加「查看结果」按钮")

    print("\n=== 四、DOE 实验设计页 ===")
    pg.evaluate("showPage('exp:doe')"); pg.wait_for_timeout(800)
    ok(pg.evaluate("()=>document.body.textContent.indexOf('DOE 实验设计')>=0"), "页面标题为 DOE 实验设计")
    dheads = pg.evaluate("()=>Array.from(document.querySelectorAll('.tbl thead th')).map(function(t){return t.textContent.trim();})")
    for k in ['DOE 编号', '方案名称', '所属项目', '设计类型', '因素数', '运行数', '完成进度', '状态', '创建人']:
        ok(k in dheads, "方案列表含字段「%s」" % k)
    ok(pg.evaluate("()=>document.getElementById('doeFType').options.length===5"), "筛选项「设计类型」4 类 + 全部")
    ok(pg.evaluate("()=>document.getElementById('doeFSta').options.length===5"), "筛选项「方案状态」草稿/待下发/执行中/已完成 + 全部")
    ok(pg.evaluate("()=>document.body.textContent.indexOf('新建 DOE 方案')>=0"), "主按钮「＋ 新建 DOE 方案」存在")
    # 按状态的按钮分支
    def ops_of(status):
        return pg.evaluate("""(st)=>{
          var s=doeSchemes.find(function(x){return x.status===st;}); if(!s)return '';
          var tr=Array.from(document.querySelectorAll('#doeTbody tr')).find(function(t){return t.textContent.indexOf(s.id)>=0;});
          return tr?tr.querySelector('td.op').textContent:'';}""", status)
    ok('编辑' in ops_of('草稿') and '生成实验计划' in ops_of('草稿') and '删除' in ops_of('草稿'),
       "草稿方案：编辑 / 生成实验计划 / 删除")
    ok('查看计划' in ops_of('待下发') and '确认下发' in ops_of('待下发'), "待下发方案：查看计划 / 确认下发")
    ok('查看进度' in ops_of('执行中'), "执行中方案：查看进度")
    ok('查看分析' in ops_of('已完成'), "已完成方案：查看分析")
    ok(pg.evaluate("()=>document.querySelectorAll('#doeTbody tr').length===8"), "方案列表 8 条")

    print("\n=== 五、确认下发 → 生成 1 条执行实验 + N 组运行 ===")
    before = pg.evaluate("()=>experiments.length")
    before_runs = pg.evaluate("()=>doeRuns.length")
    planN = pg.evaluate("()=>findScheme('DOE-2026-0098').plan.length")
    pg.evaluate("dispatchScheme('DOE-2026-0098')"); pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>!!document.querySelector('.modal')||!!document.querySelector('#confirmBox')||document.body.textContent.indexOf('确认下发')>=0"),
       "点击确认下发弹出确认框")
    pg.evaluate("""()=>{var btns=Array.from(document.querySelectorAll('button'));
        var b=btns.filter(function(x){return /确认下发/.test(x.textContent);}).pop(); if(b)b.click();}""")
    pg.wait_for_timeout(900)
    ok(pg.evaluate("()=>experiments.length") == before + 1, "实验列表增加 1 条 DOE 执行实验")
    ok(pg.evaluate("()=>doeRuns.length") == before_runs + planN, "执行实验内生成 %d 组运行" % planN)
    ok(pg.evaluate("()=>findScheme('DOE-2026-0098').status==='执行中'"), "方案状态转为「执行中」")
    ok(pg.evaluate("()=>curPage==='exp:list'"), "下发后自动跳转实验列表")
    ok(pg.evaluate("()=>runsOfScheme('DOE-2026-0098').length") == planN, "方案下可查到全部运行记录")

    print("\n=== 六、DOE 执行方案锁定、结果批量录入 ===")
    pg.evaluate("showPage('exp:detail',{id:'DOE-2026-0312-R01'})"); pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>document.body.textContent.indexOf('设计快照已锁定')>=0"), "详情页提示执行方案来自锁定设计快照")
    ok(pg.evaluate("()=>Array.from(document.querySelectorAll('#detailTabs button')).map(function(x){return x.textContent.trim();}).join('/')==='执行方案/结果录入'"), "DOE 详情仅保留执行方案 / 结果录入")
    ok(pg.evaluate("()=>document.body.textContent.indexOf('DOE-2026-0312')>=0"), "详情页展示所属 DOE 方案编号")

    print("\n=== 七、实验分析页：先选对象，非直接报告 ===")
    pg.evaluate("showPage('exp:analysis')"); pg.wait_for_timeout(800)
    ok(pg.evaluate("()=>curPage==='exp:analysis'"), "已进入实验分析页")
    ok(pg.evaluate("()=>document.body.textContent.indexOf('实验分析')>=0"), "页面标题为实验分析")
    ok(pg.evaluate("()=>!!document.getElementById('anaTbody')"), "分析对象列表（非直接报告）")
    ok(pg.evaluate("()=>!document.getElementById('chPareto')"), "分析页默认不渲染 DOE 报告图表（报告未直接当首页）")
    aheads = pg.evaluate("()=>Array.from(document.querySelectorAll('.tbl thead th')).map(function(t){return t.textContent.trim();})")
    for k in ['编号', '分析对象', '所属项目', '分析类型', '数据完成情况', '分析状态', '最近分析时间']:
        ok(k in aheads, "分析对象列表含字段「%s」" % k)
    ok(pg.evaluate("()=>document.getElementById('anaFKind').options.length===3"), "筛选项「分析类型」普通实验/DOE分析 + 全部")
    ok(pg.evaluate("()=>document.getElementById('anaFAna').options.length===3"), "筛选项「分析状态」已分析/未分析 + 全部")
    ok(pg.evaluate("()=>document.querySelectorAll('#anaTbody tr').length===analysisTargets().length"),
       "分析对象行数 == analysisTargets() 数量（普通实验 + DOE 方案）")
    ok(pg.evaluate("()=>analysisTargets().some(function(t){return t.kind==='exp';}) && analysisTargets().some(function(t){return t.kind==='doe';})"),
       "分析对象同时包含普通实验与 DOE 方案两类")
    # 三种按钮态
    ok(pg.evaluate("""()=>{var tr=Array.from(document.querySelectorAll('#anaTbody tr')).find(function(t){return t.textContent.indexOf('DOE-2026-0158')>=0;});
        var b=tr.querySelector('td.op button'); return b.disabled && b.title.indexOf('实验数据未完成')>=0;}"""),
       "数据不完整：按钮置灰并提示「实验数据未完成」")
    ok(pg.evaluate("""()=>{var tr=Array.from(document.querySelectorAll('#anaTbody tr')).find(function(t){return t.textContent.indexOf('DOE-2026-0041')>=0;});
        return tr.querySelector('td.op').textContent.indexOf('开始分析')>=0 && !tr.querySelector('td.op button').disabled;}"""),
       "数据完整未分析：可点「开始分析」")
    ok(pg.evaluate("""()=>{var tr=Array.from(document.querySelectorAll('#anaTbody tr')).find(function(t){return t.textContent.indexOf('DOE-2026-0312')>=0;});
        var t=tr.querySelector('td.op').textContent;
        return t.indexOf('查看分析')>=0 && t.indexOf('重新分析')>=0 && t.indexOf('导出报告')>=0;}"""),
       "已生成结果：查看分析 / 重新分析 / 导出报告")

    print("\n=== 八、查看分析 → 进入现有报告页 ===")
    pg.evaluate("openAnalysisReport('doe','DOE-2026-0312')"); pg.wait_for_timeout(1200)
    ok(pg.evaluate("()=>curPage==='exp:report'"), "跳转到 exp:report 报告页")
    ok(pg.evaluate("()=>document.body.textContent.indexOf('ANOVA')>=0"), "报告含 ANOVA 方差分析")
    ok(pg.evaluate("()=>!!document.getElementById('chPareto')"), "报告含 Pareto 图表")
    ok(pg.evaluate("()=>document.body.textContent.indexOf('所属 DOE 方案')>=0"), "报告页提供回到所属方案的入口")
    ok(pg.evaluate("()=>document.body.textContent.indexOf('分析对象列表')>=0"), "报告页提供返回分析对象列表入口")
    # 普通实验报告
    pg.evaluate("showPage('exp:report',{id:'EXP-2026-0418',kind:'exp'})"); pg.wait_for_timeout(1000)
    ok(pg.evaluate("()=>document.body.textContent.indexOf('实验分析报告')>=0"), "普通实验报告标题为「实验分析报告」")
    ok(pg.evaluate("()=>document.body.textContent.indexOf('普通实验')>=0"), "普通实验报告标注类型「普通实验」")
    pg.evaluate("showPage('exp:report',{id:'DOE-2026-0312',kind:'doe'})"); pg.wait_for_timeout(900)
    ok(pg.evaluate("()=>document.body.textContent.indexOf('DOE 方案分析报告')>=0"), "DOE 报告标题为「DOE 方案分析报告」")

    print("\n=== 九、最佳方案页 ===")
    pg.evaluate("showPage('exp:best',{id:'DOE-2026-0312'})"); pg.wait_for_timeout(900)
    ok(pg.evaluate("()=>document.body.textContent.indexOf('最佳方案推荐')>=0"), "最佳方案页正常渲染")
    ok(pg.evaluate("()=>document.body.textContent.indexOf('返回分析')>=0"), "返回按钮指向分析报告")

    print("\n=== 十、新建 DOE 方案（向导 → 待下发）===")
    n0 = pg.evaluate("()=>doeSchemes.length")
    e0 = pg.evaluate("()=>experiments.length")
    pg.evaluate("showPage('exp:wizard',{mode:'new',target:'scheme'})"); pg.wait_for_timeout(600)
    ok(pg.evaluate("()=>curPage==='exp:wizard'"), "进入 DOE 设计向导")
    pg.evaluate("()=>{wizard.draft.basic.name='自检用临时方案';wizard.draft.projectIds=['PRJ-2026-002'];wizard.step=4;renderWizard();}")
    pg.wait_for_timeout(400)
    pg.evaluate("confirmDispatch()"); pg.wait_for_timeout(900)
    ok(pg.evaluate("()=>doeSchemes.length") == n0 + 1, "向导生成 1 条新 DOE 方案")
    ok(pg.evaluate("()=>doeSchemes[0].status==='待下发'"), "新方案状态为「待下发」，未直接生成实验记录")
    ok(pg.evaluate("()=>experiments.length") == e0, "试算/草稿阶段不生成正式实验记录")
    ok(pg.evaluate("()=>curPage==='exp:doe'"), "生成后回到 DOE 方案列表")

    print("\n=== 十一、新增普通实验 ===")
    n1 = pg.evaluate("()=>experiments.length")
    pg.evaluate("showPage('exp:list')"); pg.wait_for_timeout(500)
    pg.evaluate("openNewNormalExp()"); pg.wait_for_timeout(400)
    # 2026-09-17：24z6 起「实验目的」必填（≥5 字），自检须一并填上，否则会被正常拦截
    pg.evaluate("()=>{document.getElementById('neName').value='自检用普通实验';"
                "document.getElementById('nePurpose').value='验证该工艺在大生产条件下的稳定性与重现性';"
                "document.getElementById('neRuns').value='4';}")
    pg.evaluate("saveNewNormalExp()"); pg.wait_for_timeout(600)
    ok(pg.evaluate("()=>experiments.length") == n1 + 1, "新增 1 条普通实验记录")
    ok(pg.evaluate("()=>experiments[0].source==='普通'"), "新记录来源为「普通」")
    ok(pg.evaluate("()=>experiments[0].plan.length===4"), "按平行样组数生成 4 组运行")

    print("\n=== 十二、一键重置覆盖两层实验数据 ===")
    pg.evaluate("()=>{experiments.unshift({id:'EXP-DIRTY',name:'脏数据',source:'普通',schemeId:null,runSeq:null,projectIds:[],type:'单因子平行实验',factors:[{name:'f',type:'categorical',levels:['1'],unit:''}],responses:['r'],plan:[{runOrder:1,stdOrder:1,combo:['1'],center:false,res:{}}],entered:[{r:''}],status:'待执行',creator:'',createTime:'',analyzedAt:'',owner:'',dueDate:''});}")
    pg.evaluate("()=>{doeSchemes.unshift({id:'DOE-DIRTY',name:'脏方案',type:'全因子/部分因子设计',projectIds:[],owner:'',dueDate:'',status:'草稿',responses:['r'],centerPoints:0,randomize:true,factors:defaultFactors('全因子/部分因子设计'),plan:[],creator:'',createTime:'',analyzedAt:''});}")
    n_dirty = pg.evaluate("()=>experiments.length")
    pg.evaluate("showPage('exp:list')"); pg.wait_for_timeout(300)
    pg.evaluate("wzResetConfirm()"); pg.wait_for_timeout(400)
    pg.evaluate("()=>{var b=document.getElementById('_cfmOk');if(b)b.click();}"); pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>!findExp('EXP-DIRTY')&&!findScheme('DOE-DIRTY')"), "重置后新建的实验 / 方案被清回出厂")
    ok(pg.evaluate("()=>experiments.length") < n_dirty, "实验记录数回到初始")
    ok(pg.evaluate("()=>doeSchemes.length===8"), "DOE 方案回到 8 条")

    print("\n=== JS 错误检查 ===")
    ok(len(errs) == 0, "无 JS 运行时错误" + (("（%s）" % errs[0]) if errs else ""))

print("\n=== 结果：通过 %d / 失败 %d ===" % (PASS, FAIL))
sys.exit(1 if FAIL else 0)
