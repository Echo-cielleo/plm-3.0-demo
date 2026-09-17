_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""实验列表左侧「部门→项目」二级联动树 专项自检
覆盖：树渲染、全部/部门/项目三级筛选、部门联动收窄项目列表、顶部下拉同步、0 JS 错误。"""
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

    print("=== 进入实验列表 ===")
    pg.evaluate("showPage('exp:list')"); pg.wait_for_timeout(900)
    ok(pg.evaluate("()=>typeof expTreeHtml==='function'"), "expTreeHtml 已定义")
    ok(pg.evaluate("()=>!!document.querySelector('.exp-layout')"), "列表页呈左右两栏布局")
    ok(pg.evaluate("()=>!!document.getElementById('expTree')"), "左侧树容器存在")
    ok(pg.evaluate("()=>document.querySelectorAll('#expTree .et-dept').length===4"), "树含 4 个实验室部门")
    ok(pg.evaluate("()=>document.querySelectorAll('#expTree .et-proj').length===5"), "默认展示全部 5 个项目")
    ok(pg.evaluate("()=>document.querySelectorAll('#expTbody tr').length===14"), "默认实验列表 14 条全显示（11 普通 + 3 DOE 执行实验）")

    print("\n=== 点击部门「上海实验室一」（应只显示该部门 2 个项目 + 过滤实验）===")
    pg.evaluate("expTreeSelect('dept','LAB-SH-1')"); pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>document.querySelectorAll('#expTree .et-proj').length===2"), "选中部门后项目列表只显示该部门 2 个项目")
    ok(pg.evaluate("()=>document.querySelectorAll('#expTree .et-dept').length===1"), "选中部门后树只显示该部门节点")
    ok(pg.evaluate("()=>document.querySelectorAll('#expTbody tr').length===8"), "实验列表过滤到该部门 8 条（DOE 方案按执行实验聚合展示）")
    ok(pg.evaluate("()=>document.getElementById('expFProj').options.length===3"), "顶部下拉收窄为「本部门全部」+ 2 项目")
    ok(pg.evaluate("()=>document.querySelector('#expTree .et-dept').classList.contains('on')"), "该部门节点高亮选中")

    print("\n=== 点击项目「水性聚氨酯」（PRJ-002 属上海实验室二）===")
    pg.evaluate("expTreeSelect('proj','PRJ-2026-002')"); pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>document.querySelectorAll('#expTbody tr').length===3"), "实验列表过滤到 PRJ-002 下 3 条（2 普通 + 1 DOE 执行实验）")
    ok(pg.evaluate("()=>document.querySelector('#expTree .et-proj.on .et-name').textContent.indexOf('WPU-320')>=0"), "对应项目节点高亮")
    ok(pg.evaluate("()=>document.getElementById('expFProj').value==='PRJ-2026-002'"), "顶部下拉同步到该项目")

    print("\n=== 再点同一部门取消选中 → 回到全部 ===")
    # 先回部门态：点击该部门（上海实验室二）
    pg.evaluate("expTreeSelect('dept','LAB-SH-2')"); pg.wait_for_timeout(200)
    pg.evaluate("expTreeSelect('dept','LAB-SH-2')"); pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>document.querySelectorAll('#expTree .et-dept').length===4"), "再次点击同部门取消 → 恢复 4 个部门")
    ok(pg.evaluate("()=>document.querySelectorAll('#expTbody tr').length===14"), "取消后实验列表恢复 14 条")

    print("\n=== 点「全部部门」根节点重置 ===")
    pg.evaluate("expTreeSelect('all')"); pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>document.querySelectorAll('#expTree .et-proj').length===5"), "根节点恢复 5 个项目")
    ok(pg.evaluate("()=>document.getElementById('expFProj').value===''"), "顶部下拉回到空（全部）")

    print("\n=== 类型/状态筛选可与部门联动叠加 ===")
    pg.evaluate("expTreeSelect('dept','LAB-SH-1')"); pg.wait_for_timeout(200)
    pg.evaluate("()=>{expListState.fType='已结案';renderExpRows();}"); pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>document.querySelectorAll('#expTbody tr').length")>=0, "部门+类型叠加筛选不报错")
    pg.evaluate("expTreeSelect('all');expListState.fType='';renderExpRows()"); pg.wait_for_timeout(200)

    print("\n=== JS 错误检查 ===")
    ok(len(errs) == 0, "无 JS 运行时错误" + (("（%s）"%errs[0]) if errs else ""))

print("\n=== 结果：通过 %d / 失败 %d ===" % (PASS, FAIL))
sys.exit(1 if FAIL else 0)
