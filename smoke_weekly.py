_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""[24z3] 周报模板专项自检（研发人员 / 研究室经理）
   模板依据：《研发人员周总结报告》《研究室经理周总结报告》两份 Word 文件。
   结构：表头 → 一、研究工作总结及计划（项目 → 实验目的 → 1.x.1~1.x.4）
        → 二、其他工作（研发版含文献资料学习表）→ 三、工作量统计（研发独有）
     2026-09-14 新口径：编辑态只展示系统能取到的值，人工维护项一律留空，
        由 footer「一键填充示例数据 / 清除示例数据」控制；只读态（历史周报）字段全满。
        → 四、周计划调整说明；经理版另有置顶「部门管理工作」（按项目负责人归集）。
   口径：统计周期 = 上一个完整自然周（周报语义：周一写上周）；周期与角色均可在弹窗内切换。"""
import pathlib
from playwright.sync_api import sync_playwright

F = str(pathlib.Path('PLM3.0全系统演示原型.html').resolve())
PASS, FAIL = [], []

def ok(cond, msg):
    (PASS if cond else FAIL).append(msg)
    print(("  [OK] " if cond else "  [FAIL] ") + msg)

def go(page, p):
    page.evaluate("()=>showPage('%s')" % p)
    page.wait_for_timeout(400)

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page(viewport={'width': 1500, 'height': 1100})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("file://" + F)
    pg.wait_for_timeout(1600)

    print("\n== 1. 首页周报卡片（统计周期 = 上一个完整自然周）")
    go(pg, 'home')
    card = pg.inner_text('#pageHost')
    ok('周报' in card, "首页出现周报卡片")
    ok('2026-09-07 ~ 2026-09-13' in card, "统计周期为上周 2026-09-07 ~ 2026-09-13")
    ok('上周' in card, "周期标注为「上周」")

    print("\n== 2. 打开完整周报：默认研发人员模板")
    pg.evaluate("()=>openWeeklyReport()")
    pg.wait_for_timeout(600)
    t = pg.inner_text('#wrBody')
    ok(pg.evaluate("()=>weeklyDraft.role") == 'staff', "默认角色为研发人员")
    ok('周总结报告' in t, "标题为「周总结报告」")
    ok('自 2026-09-07 至 2026-09-13' in t, "表头周期正确")
    for k in ['姓名', '研究室', '汇报领导']:
        ok(k in t, "表头含「%s」" % k)
    ok('王研究员' in t, "姓名为王研究员（研发人员）")

    print("\n== 3. 一、研究工作总结及计划：项目 → 实验目的 → 四子小节")
    ok('一、研究工作总结及计划' in t, "出现「一、研究工作总结及计划」")
    ok(pg.evaluate("()=>document.querySelectorAll('#wrBody .wr-proj').length") == 3,
       "覆盖 3 个关联项目")
    blocks = pg.evaluate("()=>document.querySelectorAll('#wrBody .wr-exp').length")
    ok(blocks == 4, "本周 4 组实验各展开为一个实验目的块（实际 %d）" % blocks)
    ok('项目1、' in t and '项目2、' in t and '项目3、' in t, "项目按 项目1/2/3 编号")
    ok('1.1 实验目的1' in t and '1.2 实验目的2' in t, "同一项目下多个实验目的按 1.1/1.2 编号")
    for sub in ['涉及原理及技术路线', '实验方案及结果分析', '目标差异性分析', '下一步计划']:
        ok(sub in t, "子小节「%s」存在" % sub)
    ok('1.1.1' in t and '1.2.4' in t, "子小节按 1.x.1 ~ 1.x.4 编号")
    subs = pg.evaluate("()=>document.querySelectorAll('#wrBody .wr-sub').length")
    ok(subs == 17, "4 个实验目的 × 4 子小节 + 引用分析报表行 = 17（实际 %d）" % subs)
    ok('引用分析报表' in t, "研究总结章节内保留「引用分析报表」插入入口（R4 降级）")

    print("\n== 4. 自动带出：内容来自实验数据而非空壳")
    v = pg.evaluate("""()=>{var a=document.querySelectorAll('[data-wk]');
        for(var i=0;i<a.length;i++){ if(a[i].getAttribute('data-wk')==='1.1.1') return a[i].value; } return '';}""")
    ok(len(v) > 4 and v != '—', "1.1.1 自动带出技术路线（%s…）" % v[:26])
    v2 = pg.evaluate("""()=>{var a=document.querySelectorAll('[data-wk]');
        for(var i=0;i<a.length;i++){ if(a[i].getAttribute('data-wk')==='1.1.2') return a[i].value; } return '';}""")
    ok('成品检测' in v2 or '工序' in v2, "1.1.2 自动汇总工序与检测结果")
    ok(pg.evaluate("()=>document.querySelectorAll('#wrBody .wr-auto-tag').length") >= 16,
       "16 个子小节均带「自动带出」标签")

    print("\n== 5. 研发人员版专属章节")
    for k in ['二、其他工作', '1、文献资料学习', '2、其他工作', '三、工作量统计', '四、周计划调整说明']:
        ok(k in t, "研发版含「%s」" % k)
    ok('部门管理工作' not in t, "研发版不含经理独有的「部门管理工作」")

    print("\n== 6. 工作量统计：合计与标准工作量换算")
    ok(pg.evaluate("()=>document.querySelectorAll('.wr-sum-row').length") == 1, "存在总时长合计行")
    print("     合计行：" + pg.evaluate("()=>document.querySelector('.wr-sum-row').innerText.replace(/\\s+/g,' ')"))
    before = pg.evaluate("()=>document.querySelector('.wr-std-num').textContent")
    pg.evaluate("""()=>{var i=document.querySelector('[data-wkwl="dev"]'); i.value='20'; i.dispatchEvent(new Event('input'));}""")
    pg.wait_for_timeout(300)
    after = pg.evaluate("()=>document.querySelector('.wr-std-num').textContent")
    tot = pg.evaluate("()=>document.querySelector('.wr-sum-row td:nth-child(6)').textContent")
    ok(before != after, "改工时后标准工作量即时刷新（%s → %s）" % (before, after))
    h = float(tot.replace('合计', '').replace('h', '').strip())
    ok(abs(float(after) - h / 8) < 0.06, "标准工作量 = 总时长 ÷ 8（%.1f h → %s 人天）" % (h, after))

    print("\n== 7. 文献资料学习表：可增删")
    n0 = pg.evaluate("()=>document.querySelectorAll('[data-wklit=\"name\"]').length")
    pg.evaluate("()=>wkLitAdd()")
    pg.wait_for_timeout(300)
    n1 = pg.evaluate("()=>document.querySelectorAll('[data-wklit=\"name\"]').length")
    ok(n1 == n0 + 1, "新增一行（%d → %d）" % (n0, n1))
    pg.evaluate("()=>wkLitDel(%d)" % n0)
    pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>document.querySelectorAll('[data-wklit=\"name\"]').length") == n0, "删除后回到 %d 行" % n0)

    print("\n== 8. 切换角色：经理版")
    pg.evaluate("()=>wkSwitchRole('manager')")
    pg.wait_for_timeout(600)
    tm = pg.inner_text('#wrBody')
    ok(pg.evaluate("()=>weeklyDraft.role") == 'manager', "角色已切为研究室经理")
    ok('孙工' in tm and '研发总监' in tm, "表头切换为经理身份（孙工 / 汇报研发总监）")
    ok('部门管理工作' in tm, "出现经理独有「部门管理工作」")
    for k in ['项目负责人：', '本周工作内容', '完成情况', '工作评价', '下周工作计划']:
        ok(k in tm, "部门管理表含「%s」列" % k)
    ok(pg.evaluate("()=>document.querySelectorAll('#wrBody .wr-proj-hd').length") >= 3,
       "按项目负责人归集为多个分组")
    for k in ['工作量统计', '文献资料学习']:
        ok(k not in tm, "经理版不含「%s」（严格按模板裁剪）" % k)
    ok('一、研究工作总结及计划' in tm and '四、周计划调整说明' in tm, "经理版保留研究总结与计划调整说明")
    ok(pg.evaluate("()=>document.querySelectorAll('#wrBody .wr-exp').length") == 4,
       "经理版研究总结覆盖全室 4 组实验")

    print("\n== 9. 切换角色不丢已填内容")
    pg.evaluate("""()=>{var t=document.querySelector('#wrBody textarea'); t.value='手工补写的结论'; t.dispatchEvent(new Event('input'));}""")
    pg.wait_for_timeout(200)
    pg.evaluate("()=>wkSwitchRole('staff')")
    pg.wait_for_timeout(600)
    ok(pg.evaluate("()=>document.querySelector('#wrBody textarea').value") == '手工补写的结论',
       "切回研发人员后人工修订保留")
    ok(pg.evaluate("()=>document.querySelector('[data-wkwl=\"dev\"]').value") == '20', "工作量填写保留")

    print("\n== 10. 周期切换")
    pg.evaluate("()=>wkSwitchPeriod('1')")
    pg.wait_for_timeout(600)
    t1 = pg.inner_text('#wrBody')
    ok('自 2026-08-31 至 2026-09-06' in t1, "切到上上周：表头周期正确")
    ok(pg.evaluate("()=>document.querySelectorAll('#wrBody .wr-exp').length") == 0, "上上周无实验，显示空态")
    pg.evaluate("()=>wkSwitchPeriod('-1')")
    pg.wait_for_timeout(600)
    ok('自 2026-09-14 至 2026-09-20' in pg.inner_text('#wrBody'), "切到本周：表头周期正确")
    pg.evaluate("()=>wkSwitchPeriod('0')")
    pg.wait_for_timeout(600)

    print("\n== 11. 历史周报按新模板只读渲染")
    pg.evaluate("()=>closeModal()")
    pg.wait_for_timeout(300)
    hid = pg.evaluate("""()=>{var r=WEEKLY_REPORTS.filter(function(x){
        return x.submitter==='王研究员'&&x.period!==wkPeriod().start+' ~ '+wkPeriod().end;})[0]; return r?r.id:'';}""")
    ok(bool(hid), "找到历史周报记录：%s" % hid)
    pg.evaluate("()=>openWeeklyDetailById('%s')" % hid)
    pg.wait_for_timeout(600)
    th = pg.inner_text('.modal-box') if pg.query_selector('.modal-box') else pg.inner_text('body')
    ok('周总结报告' in th, "历史周报按「周总结报告」模板渲染")
    ok('一、研究工作总结及计划' in th, "历史周报含研究工作总结章节")
    ok(pg.evaluate("()=>document.querySelectorAll('[data-wk]').length") == 0, "历史周报为只读（无输入框）")
    pg.evaluate("()=>closeModal()")
    pg.wait_for_timeout(300)

    print("\n== 12. 提交归档")
    pg.evaluate("()=>showPage('home')")
    pg.wait_for_timeout(500)
    n_before = pg.evaluate("()=>WEEKLY_REPORTS.length")
    pg.evaluate("()=>weeklyDraft.role='manager'")
    pg.evaluate("()=>openWeeklyReport()")
    pg.wait_for_timeout(500)
    pg.evaluate("()=>submitWeeklyReport(true)")
    pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>weeklyDraft.status") == '已提交', "提交后状态为已提交")
    ok(pg.evaluate("()=>WEEKLY_REPORTS.length") >= n_before, "归档记录总数不回退")
    cur = pg.evaluate("()=>WEEKLY_REPORTS.filter(function(x){return x.period===wkPeriod().start+' ~ '+wkPeriod().end&&x.submitter==='王研究员';})")
    ok(len(cur) == 1, "本周期归档记录唯一（重复提交不重复插入）")
    ok(cur[0].get('status') == '已提交' and cur[0].get('role') == 'manager',
       "归档记录带提交状态与模板角色（role=manager）")
    ok('已提交' in pg.inner_text('#pageHost'), "首页卡片显示已提交")

    print("\n== 13. 编辑态：人工维护项一律留空")
    pg.evaluate("()=>closeModal()")
    pg.wait_for_timeout(300)
    # 上一节停在经理版，切回研发人员（文献表 / 工作量统计是研发版专属）
    pg.evaluate("()=>{weeklyDraft.role='staff';}")
    pg.evaluate("()=>openWeeklyReport()")
    pg.wait_for_timeout(500)
    pg.evaluate("()=>wkClearDemo()")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>document.querySelectorAll('[data-wklit=\"name\"]').length") == 0,
       "文献资料学习表为空（系统无文献数据源）")
    ok(pg.evaluate("()=>Array.from(document.querySelectorAll('[data-wkwl=\"dev\"]')).every(function(x){return x.value==='';})"),
       "工作量工时空着（系统无工时数据源）")
    ok(pg.evaluate("()=>document.querySelector('[data-wkother]').value") == '', "「其他工作」为空")
    ok(pg.evaluate("()=>document.querySelector('[data-wkadjust]').value") == '', "「周计划调整说明」为空")
    ok('一键填充示例数据' in pg.inner_text('#wrDemoBtn'), "footer 提供「一键填充示例数据」按钮")
    ok(pg.evaluate("()=>document.querySelectorAll('#wrBody .wr-exp').length") == 4,
       "人工项置空后，自动带出的 4 组实验仍在")
    ok(pg.evaluate("""()=>{var a=document.querySelectorAll('[data-wk]');
        for(var i=0;i<a.length;i++){ if(a[i].getAttribute('data-wk')==='1.1.2') return a[i].value.length>10; }
        return false;}"""), "1.1.2 仍自动带出实验方案与结果分析")

    print("\n== 14. 一键填充 / 清除示例数据")
    pg.evaluate("()=>wkFillDemo()")
    pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>document.querySelectorAll('[data-wklit=\"name\"]').length") == 2, "填充后文献表 2 行")
    ok(pg.evaluate("()=>Array.from(document.querySelectorAll('[data-wkwl=\"dev\"]')).every(function(x){return x.value!=='';})"),
       "填充后各项目工时均有值")
    ok(len(pg.evaluate("()=>document.querySelector('[data-wkother]').value")) > 10, "填充后「其他工作」有内容")
    ok(len(pg.evaluate("()=>document.querySelector('[data-wkadjust]').value")) > 5, "填充后「周计划调整说明」有内容")
    ok('清除示例数据' in pg.inner_text('#wrDemoBtn'), "按钮切换为「清除示例数据」")
    pg.evaluate("()=>wkClearDemo()")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>!wkDemoFilled()"), "清除后回到全空")
    ok('一键填充示例数据' in pg.inner_text('#wrDemoBtn'), "按钮切回「一键填充示例数据」")

    print("\n== 15. 历史周报（只读）展示完整示例数据")
    pg.evaluate("()=>closeModal()")
    pg.wait_for_timeout(300)
    r = pg.evaluate("""()=>{var h=wkReportHTML_RO(wkPeriodOf('2026-08-31 ~ 2026-09-06'),'staff');
        var d=document.createElement('div'); d.innerHTML=h;
        return {lit:d.querySelectorAll('tbody tr').length,
                wl:(d.querySelector('.wr-sum-row td:last-child')||{}).textContent,
                other:h.indexOf('MSDS 初稿')>=0, adj:h.indexOf('校准延后')>=0,
                exps:d.querySelectorAll('.wr-exp').length,
                inputs:d.querySelectorAll('input,textarea').length};}""")
    ok(r['lit'] >= 2, "历史周报文献学习表有内容（%d 行）" % r['lit'])
    ok(r['wl'] and '合计 0.0 h' not in r['wl'], "历史周报工时合计非空（%s）" % r['wl'])
    ok(r['other'], "历史周报「其他工作」有示例内容")
    ok(r['adj'], "历史周报「周计划调整说明」有示例内容")
    ok(r['exps'] == 2, "历史周期无实验时注入示例实验快照（%d 组）" % r['exps'])
    ok(r['inputs'] == 0, "历史周报无输入框（只读）")
    ok(pg.evaluate("()=>!wkDemoFilled()"), "只读渲染不污染用户草稿")
    ok(pg.evaluate("()=>experiments.length") == 14, "只读渲染不往主实验表塞数据（仍 14 条）")

    print("\n== 16. 控制台无异常")
    ok(not errs, "无 JS 运行时错误（%s）" % ('; '.join(errs[:2]) if errs else '无'))

    b.close()

print("\n" + "=" * 56)
print("周报模板专项：PASS %d / FAIL %d" % (len(PASS), len(FAIL)))
if FAIL:
    print("失败项：")
    for x in FAIL:
        print("  - " + x)
print("=" * 56)

if FAIL:
    raise SystemExit(1)
