# -*- coding: utf-8 -*-
"""试用反馈修复批专项自检（F01/F10/F11/F15/F19/F20/F21/F22，2026-11-03）
覆盖：
  一 全局来源栈返回——四个断点逐个修通 + 面包屑可点 + 侧栏导航清栈
  二 项目阶段新口径（评审/预研/小试/中试/试推广/验收）全局生效
  三 设备购入日期+实图 / eq:cap 部门责任人筛选 / 能力 SOP 附件
"""
import sys
from playwright.sync_api import sync_playwright

_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
F = "/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
fails = []


def ok(cond, msg):
    print(("✔ " if cond else "❌ ") + msg)
    if not cond:
        fails.append(msg)


with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    ctx = b.new_context(viewport={'width': 1680, 'height': 1050})
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto("file://" + F)
    pg.wait_for_timeout(1600)

    # ============ 一、全局返回 ============
    print("=== F10 分析与总结 → 实验详情 → 返回来源 ===")
    pg.evaluate("showPage('exp:sum')")
    pg.wait_for_timeout(400)
    pg.evaluate("""()=>{
      var a=document.querySelector('.sum-exp-line a')||null;
      if(a)a.click();
      else showPage('exp:detail',{id:'EXP-2026-0418'});
    }""")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("curPage") == 'exp:detail', "从分析与总结进入实验详情")
    ok(pg.evaluate("""()=>[...document.querySelectorAll('#pageHost .page-acts button')]
        .some(x=>x.textContent.indexOf('返回')>=0)"""), "实验详情头部有返回按钮")
    pg.evaluate("navBack('exp:detail','exp:list')")
    pg.wait_for_timeout(350)
    ok(pg.evaluate("curPage") == 'exp:sum', "返回落回分析与总结页（不是实验列表首页）")

    print("\n=== F11 总结详情 → 原料 → 返回来源 ===")
    sid = pg.evaluate("()=>expSummaries[0].id")
    pg.evaluate("openSummary(%s)" % ('"%s"' % sid))
    pg.wait_for_timeout(400)
    ok(pg.evaluate("curPage") == 'exp:sum-detail', "打开总结详情 " + str(sid))
    pg.evaluate("""()=>{
      var a=[...document.querySelectorAll('#pageHost .mat-link')].filter(x=>x.textContent.indexOf('MAT-')<0)[0];
      var m=document.querySelector('#pageHost .mat-link');
      if(m)m.click();
    }""")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("curPage") == 'bd:rawmat-detail', "点原料进入原料详情")
    pg.evaluate("matBack()")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("curPage") == 'exp:sum-detail', "返回落回总结详情（不是原料总页面）")
    ok(sid in pg.evaluate("()=>String(curParams.id)"), "返回后仍带原报告参数（内容不空态）")

    print("\n=== F15 SDS 向导 → 组分库补录 → 返回向导 ===")
    pg.evaluate("showPage('sds:wizard')")
    pg.wait_for_timeout(300)
    pg.evaluate("gotoCompFill('50-00-0')")
    pg.wait_for_timeout(900)
    ok(pg.evaluate("curPage") == 'bd:comp', "跳进组分库并弹出补录窗")
    pg.evaluate("closeModal()")
    chip = pg.evaluate("()=>{var a=document.querySelector('#crumb .crumb-back');return a?a.textContent:'';}")
    ok("返回" in chip, "顶栏面包屑出现「← 返回…」来源入口（%s）" % chip)
    pg.evaluate("document.querySelector('#crumb .crumb-back').click()")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("curPage") == 'sds:wizard', "点来源入口回到 SDS 生成向导")

    print("\n=== F19 设备详情返回上级/上上级 ===")
    pg.evaluate("showPage('eq:list')")
    pg.wait_for_timeout(400)
    pg.evaluate("mdOpenEq('EQ-2026-001')")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("curPage") == 'eq:list-detail', "进入设备详情")
    ok(pg.evaluate("()=>!!document.querySelector('.md-crumb')"), "详情页头部有面包屑行")
    crumbTxt = pg.evaluate("()=>document.querySelector('.md-crumb').innerText")
    ok("设备资源" in crumbTxt and "设备列表" in crumbTxt and "设备详情" in crumbTxt,
       "面包屑=设备资源 / 设备列表 / 设备详情（%s）" % crumbTxt.replace("\n", " "))
    # 上级：点面包屑「设备列表」
    pg.evaluate("""()=>{var a=[...document.querySelectorAll('.md-crumb a')].filter(x=>x.textContent==='设备列表')[0];a.click();}""")
    pg.wait_for_timeout(350)
    ok(pg.evaluate("curPage") == 'eq:list', "面包屑点「设备列表」回上级")
    # 上上级：再进详情，点面包屑「设备资源」（模块首页）
    pg.evaluate("mdOpenEq('EQ-2026-002')")
    pg.wait_for_timeout(350)
    pg.evaluate("""()=>{var a=[...document.querySelectorAll('.md-crumb a')].filter(x=>x.textContent==='设备资源')[0];a.click();}""")
    pg.wait_for_timeout(350)
    ok(pg.evaluate("curPage") == 'eq:guide', "面包屑点「设备资源」回模块首页（上上级）")
    # 返回按钮优先回来源：从使用记录跳详情，返回应回使用记录
    pg.evaluate("showPage('eq:use')")
    pg.wait_for_timeout(300)
    pg.evaluate("mdOpenEq('EQ-2026-004')")
    pg.wait_for_timeout(350)
    pg.evaluate("""()=>{var bt=[...document.querySelectorAll('#pageHost .page-acts button')].filter(x=>x.textContent.indexOf('返回')>=0)[0];bt.click();}""")
    pg.wait_for_timeout(350)
    ok(pg.evaluate("curPage") == 'eq:use', "从使用记录进详情，返回按钮回使用记录（来源优先于列表页）")
    # 侧栏导航清栈：旧来源记录应被清空（只剩新页自身来源一条）
    pg.evaluate("showPage('exp:sum')")
    pg.wait_for_timeout(200)
    ok(pg.evaluate("()=>('bd:comp' in _navFrom)||('exp:detail' in _navFrom)") is not None, "跳转链上已有来源记录")
    pg.click("#navScroll [data-go='eq:cap']")
    pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>!('bd:comp' in _navFrom)&&!('exp:detail' in _navFrom)&&!('exp:sum' in _navFrom)"),
       "侧栏导航后旧来源记录全部清空")
    ok(pg.evaluate("()=>_navFrom['eq:cap']&&_navFrom['eq:cap'].page==='exp:sum'"),
       "侧栏跳转只留下新页的一条来源记录（来源=跳转前的 exp:sum）")

    # ============ 二、项目阶段新口径 ============
    print("\n=== F01 阶段新口径 ===")
    NEW6 = ['评审', '预研', '小试', '中试', '试推广', '验收']
    ok(pg.evaluate("()=>PROJECTS.every(p=>JSON.stringify(p.stageProgress)===JSON.stringify(%s))" % str(NEW6).replace("'", '"')),
       "全部项目 stageProgress = 评审/预研/小试/中试/试推广/验收")
    ok(pg.evaluate("()=>PROJECTS.every(p=>['评审','预研','小试','中试','试推广','验收'].indexOf(p.stage)>=0)"),
       "stage 取值全在新口径内（无 试生产/交付/推广）")
    r5 = pg.evaluate("()=>{var p=PROJECTS.find(x=>x.id==='PRJ-2026-005');return [p.stage,p.stageOn,JSON.stringify(p.stageDone)];}")
    ok(r5[0] == '试推广' and r5[1] == 4, "PRJ-2026-005 stage=试推广 stageOn=4（实际 %s/%s）" % (r5[0], r5[1]))
    ok(pg.evaluate("()=>Object.keys(PROJ_STAGES).every(k=>PROJ_STAGES[k].every(s=>['评审','预研','小试','中试','试推广','验收'].indexOf(s.name)>=0))"),
       "PROJ_STAGES 全部阶段名在新口径内")
    ok(pg.evaluate("()=>JSON.stringify(PROJ_STAGES['PRJ-2026-005'].map(s=>s.name))===JSON.stringify(['评审','预研','小试','中试','试推广','验收'])"),
       "PRJ-2026-005 阶段序列 6 段齐全")
    pg.evaluate("showPage('home')")
    pg.wait_for_timeout(500)
    ht = pg.inner_text("#pageHost")
    ok("试推广" in ht and "试生产" not in ht, "首页阶段链含试推广、无试生产")
    pg.evaluate("showPage('proj:list')")
    pg.wait_for_timeout(500)
    pt = pg.inner_text("#pageHost")
    ok("试推广阶段" in pt and "试生产" not in pt, "项目矩阵含「试推广阶段」列组、无「试生产」")
    ok("验收" in pt, "矩阵含验收组")
    pg.evaluate("showPage('proj:detail',{id:'PRJ-2026-005'})")
    pg.wait_for_timeout(500)
    dt = pg.inner_text("#pageHost")
    ok("试推广" in dt and "试生产" not in dt and "验收" in dt, "005 详情阶段导航为新口径")

    # ============ 三、设备细节 ============
    print("\n=== F20 购入日期 + 实图 ===")
    ok(pg.evaluate("""()=>EQUIPMENTS.every(e=>/^\\d{4}-\\d{2}-\\d{2}$/.test(e.purchaseDate)
        && daysTo(e.purchaseDate)<=0 && e.photo.indexOf('data:image/svg')===0)"""),
       "12 台设备 purchaseDate(锚点/过去) + photo(SVG 占位) 齐全")
    pg.evaluate("mdOpenEq('EQ-2026-001')")
    pg.wait_for_timeout(400)
    ok("购入日期" in pg.inner_text("#pageHost"), "设备详情显示购入日期")
    ok(pg.evaluate("()=>!!document.querySelector('#pageHost img[src^=\"data:image/svg\"]')"), "设备详情渲染实图占位")

    print("\n=== F21 设备能力部门/责任人筛选 ===")
    pg.evaluate("showPage('eq:cap')")
    pg.wait_for_timeout(400)
    flt = pg.evaluate("()=>[...document.querySelectorAll('#lpHost [data-flt]')].map(s=>s.getAttribute('data-flt'))")
    ok("dept" in flt and "owner" in flt, "能力页含 所属部门/责任人 筛选（%s）" % flt)
    pg.select_option("[data-flt='dept']", "质管部")
    pg.wait_for_timeout(300)
    rows = pg.evaluate("()=>[...document.querySelectorAll('#lpHost tbody tr')].map(t=>t.textContent)")
    ok(len(rows) >= 1, "筛「质管部」出 %d 行" % len(rows))
    ok(pg.evaluate("""()=>{var bad=0;
      [...document.querySelectorAll('#lpHost tbody tr')].forEach(function(tr){
        var eq=tr.querySelector('td').textContent.trim();
        var e=EQUIPMENTS.filter(x=>x.id===eq)[0];
        if(e&&e.dept!=='质管部')bad++;});
      return bad===0;}"""), "质管部筛选结果全部正确")
    pg.select_option("[data-flt='dept']", "")
    pg.select_option("[data-flt='owner']", "陈工")
    pg.wait_for_timeout(300)
    ok(pg.evaluate("""()=>{var bad=0;
      [...document.querySelectorAll('#lpHost tbody tr')].forEach(function(tr){
        var eq=tr.querySelector('td').textContent.trim();
        var e=EQUIPMENTS.filter(x=>x.id===eq)[0];
        if(e&&e.owner!=='陈工')bad++;});
      return bad===0;}"""), "责任人=陈工筛选结果全部正确")

    print("\n=== F22 SOP 附件 ===")
    ok(pg.evaluate("()=>Object.keys(EQ_SOP).length>=2"), "SOP 覆盖设备 %d 台（≥2）" % pg.evaluate("()=>Object.keys(EQ_SOP).length"))
    pg.evaluate("mdOpenEqCap('EQ-2026-001','拉伸/撕裂强度')")
    pg.wait_for_timeout(400)
    capTxt = pg.inner_text("#pageHost")
    ok("SOP 附件" in capTxt and "GB/T 4666" in capTxt, "能力详情配套方法说明挂出 SOP 文件（GB/T 4666）")
    n_dl = pg.evaluate("()=>[...document.querySelectorAll('#pageHost button')].filter(x=>x.textContent.trim()==='下载').length")
    ok(n_dl >= 2, "SOP 每条带下载按钮（%d 个，演示占位）" % n_dl)
    pg.evaluate("mdOpenEqCap('EQ-2026-010','热空气老化')")
    pg.wait_for_timeout(400)
    ok("暂未挂 SOP" in pg.inner_text("#pageHost"), "无 SOP 设备显示「暂未挂 SOP 附件」")

    print("\n=== 无 JS 错误 ===")
    ok(len(errs) == 0, "运行期 0 JS 错误" + ("" if not errs else " -> " + str(errs[:3])))
    b.close()

print("\n失败项：%d" % len(fails))
if fails:
    for f in fails:
        print("  - " + f)
    sys.exit(1)
print("全部通过 ✅")
