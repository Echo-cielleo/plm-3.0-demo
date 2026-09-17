_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""第 5 步交付预览 · 模拟文档流 + 无交互导出 Word 自检"""
from playwright.sync_api import sync_playwright

F = "/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
P, Fail = 0, 0


def ok(c, m):
    global P, Fail
    if c:
        P += 1; print("  ✅ " + m)
    else:
        Fail += 1; print("  ❌ " + m)


def goto_wizard(pg):
    pg.evaluate("showPage('sds:wizard')"); pg.wait_for_timeout(400)
    pg.evaluate("wzGo(1)"); pg.wait_for_timeout(300)
    pg.evaluate("()=>{wz.project.product='水性聚氨酯涂饰树脂 WPU-320';}")
    pg.evaluate("pickMarket('EU')"); pg.wait_for_timeout(400)
    pg.evaluate("wzGo(4)"); pg.wait_for_timeout(400)
    pg.evaluate("wzGo(5)"); pg.wait_for_timeout(700)


with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1680, "height": 1050})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console:" + m.text) if m.type == "error" else None)
    pg.goto("file://" + F); pg.wait_for_timeout(1200)

    goto_wizard(pg)

    print("=== 切到交付预览（dv）===")
    pg.evaluate("setWzView('deliver')"); pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>wz.view==='deliver'"), "已进入交付预览视图")
    ok(pg.evaluate("()=>!!document.querySelector('.doc-page')"), "渲染出文档纸张（.doc-page）")
    ok(pg.evaluate("()=>!!document.querySelector('.doc-cover')"), "文档含封面（.doc-cover）")
    ok(pg.evaluate("()=>!!document.querySelector('.cover-title')"), "封面含 SAFETY DATA SHEET 标题")
    nsec = pg.evaluate("()=>document.querySelectorAll('.doc-sec').length")
    ok(nsec == 16, "连续渲染全部 16 章（实际 %d 章）" % nsec)
    ok(pg.evaluate("()=>!!document.querySelector('.doc-sec-no')"), "章节带连续编号（01/02…）")
    # 第 3 / 8 章表格在文档流内
    ok(pg.evaluate("()=>{var t=document.querySelectorAll('.doc-tbl table');return t.length>=2;}"),
       "第 3 / 8 章表格出现在文档流内（≥2 张）")
    # 交付预览不再显示编制态手风琴与编辑工具
    ok(pg.evaluate("()=>document.querySelectorAll('.acc-item').length") == 0, "交付预览无编制态手风琴")
    ok(pg.evaluate("()=>document.querySelectorAll('[onclick^=\"secEdit\"]').length") == 0, "交付预览无临时编辑入口")

    print("\n=== 顶部工具条导出按钮 ===")
    ok(pg.evaluate("()=>{var bs=[...document.querySelectorAll('button')];return bs.some(x=>x.textContent.indexOf('导出 Word')>=0 && x.offsetParent!==null);}"),
       "交付预览工具条出现「导出 Word」按钮")
    # 编制视图不应有该按钮
    pg.evaluate("setWzView('edit')"); pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>{var bs=[...document.querySelectorAll('button')];return !bs.some(x=>x.textContent.trim()==='⤓ 导出 Word');}"),
       "编制视图不出现导出 Word 按钮（仍走原流程）")

    print("\n=== 无交互导出 Word（点一下即下载，不弹窗）===")
    pg.evaluate("setWzView('deliver')"); pg.wait_for_timeout(500)
    # 监听下载
    with pg.expect_download() as dl:
        pg.evaluate("exportSdsWord()")
        pg.wait_for_timeout(400)
    d = dl.value
    fname = d.suggested_filename
    print("  下载文件名：", fname)
    ok(fname.endswith('.doc'), "下载为 .doc 文件（%s）" % fname)
    ok('草案' in fname, "草案态文件名带「草案」标记（%s）" % fname)
    ok(pg.evaluate("()=>!document.querySelector('.modal-mask')"), "导出过程无弹窗（无交互）")
    # 读取内容确认是 Word 兼容 HTML
    import pathlib, tempfile, os
    path = os.path.join(tempfile.gettempdir(), fname)
    d.save_as(path)
    content = pathlib.Path(path).read_text(encoding='utf-8', errors='ignore')
    ok('SAFETY DATA SHEET' in content, "导出的 .doc 含 SAFETY DATA SHEET 正文")
    ok('application/msword' in content or 'xmlns:o' in content or '<style>' in content, "导出的 .doc 带 Word 兼容标记/内联样式")
    os.remove(path)

    print("\nJS 错误：", errs)
    ok(len(errs) == 0, "无 JS 错误")

    print("\n" + "=" * 56)
    print("断言通过 %d / %d" % (P, P + Fail))


# --- 统一退出码：存在失败断言时返回非零，避免 run_smoke.sh 误判为通过 ---
if Fail:
    raise SystemExit(1)
