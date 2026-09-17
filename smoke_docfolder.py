_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""[27z] 文档管理增强专项自检：文件夹（公共/我的）+ 周报月报筛选"""
import pathlib, sys
from playwright.sync_api import sync_playwright

F = str(pathlib.Path('PLM3.0全系统演示原型.html').resolve())
PASS, FAIL = [], []

def ok(cond, msg):
    (PASS if cond else FAIL).append(msg)
    print(("  [OK] " if cond else "  [FAIL] ") + msg)

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("file://" + F)
    pg.wait_for_timeout(1600)

    print("\n== 1. 公共文档 · 文件夹结构 ==")
    pg.evaluate("()=>showPage('doc:public')")
    pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>curPage") == 'doc:public', "进入公共文档页")
    n_f = pg.eval_on_selector_all(".doc-folder", "els=>els.length")
    ok(n_f == 4, "根目录显示 4 个一级文件夹（实际 %d）" % n_f)
    crumb = pg.inner_text(".doc-crumb")
    ok("全部文档" in crumb, "面包屑根节点「全部文档」存在（%s）" % crumb.split("\n")[0])
    txt = pg.inner_text("#lpHost")
    for name in ["合规文档", "技术文档", "项目文档", "作业指导"]:
        ok(name in txt, "一级文件夹卡片：%s" % name)
    ok("份文档" in txt, "文件夹卡片显示文档计数")

    print("\n== 2. 下钻与含子文件夹 ==")
    pg.evaluate("()=>docGo('F-P1')")
    pg.wait_for_timeout(450)
    crumb = pg.inner_text(".doc-crumb")
    ok("合规文档" in crumb, "面包屑进入「合规文档」（%s）" % crumb.replace("\n", " "))
    kids = pg.eval_on_selector_all(".doc-folder", "els=>els.length")
    ok(kids == 3, "合规文档下 3 个子文件夹（实际 %d）" % kids)
    has_chk = pg.eval_on_selector_all(".doc-chk input", "els=>els.length") == 1
    ok(has_chk, "进入文件夹后出现「含子文件夹」开关")
    n_deep = pg.eval_on_selector_all("#lpHost tbody tr", "els=>els.length")
    ok(n_deep > 0, "含子文件夹时列出 %d 行文档" % n_deep)
    # 关闭含子文件夹
    pg.evaluate("()=>{docView.deep=false;docGo(docView.folder);}")
    pg.wait_for_timeout(450)
    n_shallow = pg.eval_on_selector_all("#lpHost tbody tr", "els=>els.length")
    ok(n_shallow <= n_deep, "仅本层时行数不超过含子文件夹（%d ≤ %d）" % (n_shallow, n_deep))
    pg.evaluate("()=>{docView.deep=true;docGo(docView.folder);}")
    pg.wait_for_timeout(400)

    print("\n== 3. 新建 / 重命名 / 删除文件夹 ==")
    n0 = pg.evaluate("()=>DOC_FOLDERS.filter(f=>f.scope==='public').length")
    pg.evaluate("()=>{docNewFolder();}")
    pg.wait_for_timeout(300)
    pg.fill("#dfName", "临时测试目录")
    pg.evaluate("()=>docNewFolderSave()")
    pg.wait_for_timeout(450)
    n1 = pg.evaluate("()=>DOC_FOLDERS.filter(f=>f.scope==='public').length")
    ok(n1 == n0 + 1, "新建文件夹成功（%d → %d）" % (n0, n1))
    ok("临时测试目录" in pg.inner_text("#lpHost"), "新文件夹出现在卡片区")

    new_id = pg.evaluate("()=>DOC_FOLDERS.filter(f=>f.name==='临时测试目录')[0].id")
    pg.evaluate("(id)=>{docRenameFolder(id);}", new_id)
    pg.wait_for_timeout(300)
    pg.fill("#dfName", "客户资料")
    pg.evaluate("(id)=>docRenameFolderSave(id)", new_id)
    pg.wait_for_timeout(450)
    ok(pg.evaluate("()=>DOC_FOLDERS.filter(f=>f.name==='客户资料').length") == 1, "重命名生效")

    # 非空文件夹删除应被拦截（F-P1 内有文档）
    n2 = pg.evaluate("()=>DOC_FOLDERS.length")
    pg.evaluate("()=>docDelFolder('F-P1')")
    pg.wait_for_timeout(350)
    ok(pg.evaluate("()=>DOC_FOLDERS.length") == n2, "含子文件夹时删除被拦截")
    ok("请先删除其下" in pg.inner_text("body"), "给出「先删子文件夹」提示")
    pg.evaluate("()=>docDelFolder('F-P41')")
    pg.wait_for_timeout(350)
    ok("请先移动" in pg.inner_text("body"), "叶子文件夹有文档时提示「先移动文档」")

    pg.evaluate("()=>DOC_FOLDERS.push({id:'F-EMPTY',name:'空目录',parent:'',scope:'public',note:''})")
    pg.evaluate("()=>docDelFolder('F-EMPTY')")
    pg.wait_for_timeout(350)
    ok("确定删除文件夹" in pg.inner_text("body"), "空文件夹弹出删除确认框")
    pg.evaluate("""()=>{var bs=[].slice.call(document.querySelectorAll('button'));
        var b=bs.filter(function(x){return (x.textContent||'').indexOf('确认删除')>=0;})[0];
        if(b)b.click();}""")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>DOC_FOLDERS.filter(f=>f.id==='F-EMPTY').length") == 0, "空文件夹删除成功")

    print("\n== 4. 移动到文件夹 ==")
    pg.evaluate("()=>{docGo('F-P21');}")
    pg.wait_for_timeout(450)
    first_ref = pg.evaluate("""()=>{var r=docRowsInView().filter(function(x){return x.kind==='doc';})[0];return r?r.ref:'';}""")
    ok(bool(first_ref), "取到待移动文档 %s" % first_ref)
    pg.evaluate("(r)=>docMoveDoc(r,'doc')", first_ref)
    pg.wait_for_timeout(300)
    opts = pg.eval_on_selector_all("#dfTarget option", "els=>els.length")
    ok(opts == pg.evaluate("()=>DOC_FOLDERS.filter(f=>f.scope==='public').length"),
       "移动弹窗列出全部公共文件夹（%d 项）" % opts)
    pg.select_option("#dfTarget", "F-P22")
    pg.evaluate("(r)=>docMoveDocSave(r,'doc')", first_ref)
    pg.wait_for_timeout(450)
    moved = pg.evaluate("(r)=>{var d=DOCS.filter(x=>x.id===r)[0];return d?d.pfolder:'';}", first_ref)
    ok(moved == "F-P22", "文档已移动到评估报告（pfolder=%s）" % moved)

    print("\n== 5. 我的文档 ==")
    pg.evaluate("()=>showPage('doc:mine')")
    pg.wait_for_timeout(500)
    t = pg.inner_text("#lpHost")
    for name in ["我的周报月报", "我的技术文档", "草稿箱"]:
        ok(name in t, "我的文档一级文件夹：%s" % name)
    pg.evaluate("()=>{docGo('F-M1');}")
    pg.wait_for_timeout(450)
    t2 = pg.inner_text("#lpHost")
    ok("周报" in t2 and "月报" in t2, "我的周报月报下含周报与月报")
    ok(pg.eval_on_selector_all(".doc-folder", "els=>els.length") == 2, "我的周报月报下 2 个子文件夹")

    print("\n== 6. 周报月报：菜单已删，入口并入我的文档（领导评审 ⑤） ==")
    # doc:weekly 保留为重定向，兼容旧入口
    pg.evaluate("()=>showPage('doc:weekly')")
    pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>curPage") == 'doc:mine', "doc:weekly 重定向到我的文档")
    ok(pg.evaluate("()=>docView.folder") == 'F-M1', "定位到「我的周报月报」文件夹")
    t3 = pg.inner_text("#lpHost")
    ok("我的周报月报" in t3, "面包屑显示我的周报月报")
    flts = pg.eval_on_selector_all("#lpHost select[data-flt]", "els=>els.map(e=>e.getAttribute('data-flt'))")
    ok(set(flts) >= {"type", "status", "month"},
       "归档筛选保留类型/状态/月份：%s" % ",".join(flts))

    def rows_text():
        return pg.eval_on_selector_all("#lpHost tbody tr", "els=>els.map(e=>e.innerText)")

    # 月份筛选可用
    months = pg.eval_on_selector_all("#lpHost select[data-flt='month'] option", "els=>els.map(e=>e.value).filter(v=>v)")
    if months:
        pg.select_option("#lpHost select[data-flt='month']", months[0])
        pg.wait_for_timeout(400)
        rs = rows_text()
        ok(len(rs) > 0 and all(months[0] in r for r in rs), "月份筛选：%d 行全部为 %s" % (len(rs), months[0]))
        pg.select_option("#lpHost select[data-flt='month']", "")
        pg.wait_for_timeout(300)

    print("\n== 7. 报告详情 ==")
    rid = pg.evaluate("()=>WEEKLY_REPORTS.filter(r=>r.submitter==='李工')[0].id")
    pg.evaluate("(id)=>openWeeklyDetailById(id)", rid)
    pg.wait_for_timeout(400)
    ok(pg.eval_on_selector_all(".modal-bd", "els=>els.length") == 1, "他人周报可打开详情弹窗")
    mt = pg.inner_text(".modal-bd")
    ok("一、研究工作总结及计划" in mt and "周总结报告" in mt, "详情按周报模板渲染（研究工作总结及计划 + 周总结报告）")
    pg.evaluate("()=>closeModal()")
    pg.wait_for_timeout(250)

    print("\n== 8. JS 错误 ==")
    ok(len(errs) == 0, "无 JS 运行时错误%s" % ("：" + errs[0] if errs else ""))
    b.close()

print("\n结果：%d/%d" % (len(PASS), len(PASS) + len(FAIL)))
if FAIL:
    print("有 %d 条失败" % len(FAIL))
    sys.exit(1)
print("ALL PASS")
