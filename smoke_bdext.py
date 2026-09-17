_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""基础数据 · 三个新增子页 专项自检
覆盖：菜单注册、关键技术分类（树/详情/编辑/添加下级/搜索）、
      内置计算公式（列表/详情弹窗/筛选/新增）、实验模板（列表/详情弹窗/筛选）。
"""
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

    print("=== 一、数据层与菜单注册 ===")
    ok(pg.evaluate("()=>typeof TECH_TREE!=='undefined'&&TECH_TREE.length===1"),
       "TECH_TREE 初始化 1 个根节点（成都合成材料研发部）")
    ok(pg.evaluate("()=>BD_FORMULA.length===10"), "BD_FORMULA 内置计算公式 10 条")
    ok(pg.evaluate("()=>EXP_TPL.length===15"), "EXP_TPL 实验模板 15 条")
    menu_txt = pg.evaluate("()=>document.querySelector('#navScroll').innerText")
    for m in ["关键技术分类", "内置计算公式", "实验模板"]:
        ok(m in menu_txt, "侧栏菜单含「%s」" % m)

    print("\n=== 二、关键技术分类：树 + 详情 ===")
    pg.evaluate("()=>showPage('bd:techcat')"); pg.wait_for_timeout(400)
    txt = pg.inner_text("#pageHost")
    ok("成都合成材料研发部" in txt, "树渲染根节点")
    ok("水场产品" in txt and "通用型加脂剂" in txt, "树默认展开前两级（水场产品/各类别可见）")
    ok("请在左侧选择一个分类节点" in txt, "未选中时右侧为空态提示")
    ok(pg.evaluate("()=>{var n=tcFind('tt-sc-am-cd').node;return n.name==='缩合反应'&&n.order===1;}"),
       "tcFind 可定位深层节点（缩合反应）")
    pg.evaluate("()=>tcSel('tt-sc-am-cd')"); pg.wait_for_timeout(300)
    txt = pg.inner_text("#pageHost")
    ok("查看：缩合反应" in txt, "点节点 → 右侧显示「查看：缩合反应」")
    ok("氨基树脂复鞣剂" in txt, "详情显示所属路径（父级）")
    ok("删除" in txt and "编辑" in txt and "添加下级" in txt, "详情带 删除/编辑/添加下级 按钮")
    pg.evaluate("()=>tcAddChild('tt-sc-am-cd')"); pg.wait_for_timeout(300)
    pg.fill("#tcF-name", "醚化改性测试")
    pg.fill("#tcF-order", "2")
    pg.click("#tcF-ok"); pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>{var n=tcFind('tt-sc-am-cd').node;return n.kids.some(function(c){return c.name==='醚化改性测试';});}"),
       "添加下级：新节点插入树（内存态）")
    pg.fill("#tcKw", "磺酸"); pg.wait_for_timeout(400)
    txt = pg.inner_text("#tcTree") if pg.evaluate("()=>!!document.querySelector('#tcTree')") else pg.inner_text("#pageHost")
    ok("磺酸化" in txt and "环氧化" not in txt, "搜索「磺酸」过滤树（只留匹配分支）")
    pg.fill("#tcKw", ""); pg.wait_for_timeout(300)
    pg.evaluate("()=>tcCollapseAll()"); pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>{var el=document.querySelector('#pageHost');return el.innerText.indexOf('自由基聚合')<0;}"),
       "全部收起后子级不再显示")

    print("\n=== 三、内置计算公式 ===")
    pg.evaluate("()=>showPage('bd:formula')"); pg.wait_for_timeout(400)
    txt = pg.inner_text("#pageHost")
    ok("单一工序固含量计算" in txt and "酸醇摩尔比" in txt, "列表渲染 10 条公式（首尾可见）")
    ok(pg.evaluate("()=>document.querySelectorAll('#lpHost tbody tr').length===10"),
       "分页列表共 10 行")
    ok(pg.evaluate("()=>document.querySelector('#lpHost').innerText.indexOf('查看详情')>=0"),
       "代码列为「查看详情」链接")
    pg.evaluate("()=>bfDetail('BF-003')"); pg.wait_for_timeout(300)
    mtxt = pg.inner_text("#mBody")
    ok("交联度" in mtxt and "氧化锌" in mtxt, "查看详情弹窗显示公式代码全文")
    pg.evaluate("()=>closeModal()"); pg.wait_for_timeout(200)
    pg.select_option("#lpHost select[data-flt='cat']", "数据计算"); pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>document.querySelectorAll('#lpHost tbody tr').length===10"),
       "类型筛选（数据计算）不丢行")
    cnt_before = pg.evaluate("()=>bfList.length")
    pg.evaluate("()=>bfAdd()"); pg.wait_for_timeout(300)
    pg.fill("#bfF-name", "测试公式")
    pg.fill("#bfF-code", "X = Y / Z × 100")
    pg.click("#bfF-ok"); pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>bfList.length") == cnt_before + 1, "新增公式：保存后列表 +1")
    pg.on("dialog", lambda d: d.accept())
    pg.evaluate("()=>bfDel(bfList[bfList.length-1].id)"); pg.wait_for_timeout(400)
    pg.evaluate("()=>{var btns=document.querySelectorAll('#modal .btn');for(var i=0;i<btns.length;i++){if(btns[i].textContent.indexOf('确认删除')>=0)btns[i].click();}}")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>bfList.length") == cnt_before, "删除公式：确认后恢复原条数")

    print("\n=== 四、实验模板 ===")
    pg.evaluate("()=>showPage('bd:exptpl')"); pg.wait_for_timeout(400)
    txt = pg.inner_text("#pageHost")
    ok("端氨基聚氨酯发泡剂-1" in txt and "醚化" in txt, "列表渲染 15 条模板（首尾可见）")
    ok(pg.evaluate("()=>document.querySelectorAll('#lpHost tbody tr').length===15"),
       "分页列表共 15 行")
    pg.evaluate("()=>etDetail('ET-002')"); pg.wait_for_timeout(300)
    mtxt = pg.inner_text("#mBody")
    ok("增稠效果测试-1" in mtxt and "Cps" in mtxt, "模板详情弹窗含名称与参考结论")
    ok("引用此模板新建实验" in pg.inner_text("#modal"), "弹窗带「引用此模板新建实验」入口")
    pg.evaluate("()=>closeModal()"); pg.wait_for_timeout(200)
    pg.select_option("#lpHost select[data-flt='type']", "复配"); pg.wait_for_timeout(300)
    n_fp = pg.evaluate("()=>document.querySelectorAll('#lpHost tbody tr').length")
    ok(0 < n_fp < 15, "实验类型筛选=复配 → 行数收缩（%d 行）" % n_fp)
    pg.select_option("#lpHost select[data-flt='type']", ""); pg.wait_for_timeout(300)

    print("\n=== 五、回归与 JS 错误 ===")
    ok(len(errs) == 0, "全程 0 个 JS 错误 %s" % (errs[:2] if errs else ""))
    for pid in ['bd:techcat', 'bd:formula', 'bd:exptpl']:
        pg.evaluate("(id)=>showPage(id)", pid); pg.wait_for_timeout(250)
        ok(pg.evaluate("()=>document.querySelector('#pageHost').innerText.length>50"),
           "页面 %s 可重复进入渲染" % pid)
    pg.evaluate("()=>showPage('bd:rawmat')"); pg.wait_for_timeout(300)
    ok("原料信息" in pg.inner_text("#pageHost") or "MAT-" in pg.inner_text("#pageHost"),
       "相邻旧页 bd:rawmat 不受影响")

    b.close()

print("\n结果：%d/%d %s" % (PASS, PASS + FAIL, "ALL PASS ✅" if FAIL == 0 else "有 %d 条失败 ❌" % FAIL))
raise SystemExit(0 if FAIL == 0 else 1)
