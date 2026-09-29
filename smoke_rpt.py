# -*- coding: utf-8 -*-
"""报表管理页（rpt:home）专项自检
覆盖：页面可打开、四个 KPI 取自真实数据、六条报表清单、查看按钮能跳到目标页、
      不再出现「暂无已接入的报表」空态、0 JS 错误。"""
import io, re, sys

F = "/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
fails = []


def ok(cond, msg):
    print(("✔ " if cond else "❌ ") + msg)
    if not cond:
        fails.append(msg)


_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'

with __import__('playwright.sync_api', fromlist=['sync_playwright']).sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto("file://" + F)
    pg.wait_for_timeout(1500)
    pg.evaluate("showPage('rpt:home')")
    pg.wait_for_timeout(500)

    body = pg.evaluate("()=>document.querySelector('#pageHost')?.innerText||''")
    ok('页面未实现' not in body, "报表管理页可正常打开（不再是「页面未实现」）")
    ok('暂无已接入的报表' not in body, "不再是「暂无已接入的报表」空态")

    # KPI 数与真实数据一致
    kpi = pg.evaluate("""()=>{
      return {
        proj: PROJECTS.filter(function(p){return ['交付','推广'].indexOf(p.stage)<0;}).length,
        projTotal: PROJECTS.length,
        exp: Array.isArray(experiments)?experiments.length:0,
        sdsTodo: SDS_ROWS.filter(function(s){return ['编制中','审核中','待改版'].indexOf(s.status)>=0;}).length,
        stgTodo: MAT_STAGING.filter(function(r){return r.status!=='已关联';}).length,
        sds: SDS_ROWS.length,
        mat: Object.keys(DB_CFG.material||{}).length
      };
    }""")
    for key, label in [('proj', '在研项目'), ('exp', '实验记录'),
                       ('sdsTodo', 'SDS 待办'), ('stgTodo', '暂存区待处理')]:
        ok(('%d' % kpi[key]) in body, "KPI「%s」显示 %d，与真实数据一致" % (label, kpi[key]))
    ok(('项目 %d 个' % kpi['projTotal']) in body, "报表清单覆盖数据写明项目 %d 个（总数）" % kpi['projTotal'])
    ok(('SDS %d 份' % kpi['sds']) in body, "报表清单写明 SDS 共 %d 份" % kpi['sds'])
    ok(('原料 %d 项' % kpi['mat']) in body, "报表清单写明原料 %d 项" % kpi['mat'])

    # 六条报表 + 查看按钮
    btns = pg.evaluate("""()=>Array.from(document.querySelectorAll('#pageHost .tbl button'))
      .map(function(b){return b.getAttribute('onclick');})""")
    ok(len(btns) == 6, "报表清单有 6 条，每条带「查看」按钮")
    targets = [re.search(r"showPage\('([^']+)'\)", s).group(1) for s in btns if s and 'showPage' in s]
    ok(len(targets) == 6, "六个查看按钮都指向具体页面")
    ok(all(t in ['proj:list', 'exp:list', 'sds:list', 'bd:rawmat', 'subst:list', 'law:reach']
           for t in targets), "跳转目标都是已注册的业务页面")

    # 逐个点击确认能打开
    opened = 0
    for t in targets:
        pg.evaluate("(id)=>showPage(id)", t)
        pg.wait_for_timeout(240)
        if '页面未实现' not in pg.evaluate("()=>document.querySelector('#pageHost')?.innerText||''"):
            opened += 1
    ok(opened == 6, "六个跳转目标全部可正常打开（%d/6）" % opened)

    ok(len(errs) == 0, "运行期 0 JS 错误" + ("" if not errs else " -> " + str(errs[:2])))
    b.close()

print("\n失败项：%d" % len(fails))
if fails:
    for f in fails:
        print("  - " + f)
    sys.exit(1)
print("全部通过 ✅")
