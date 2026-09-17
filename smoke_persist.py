_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""持久化 + 一键重置 自检：保存 / 刷新恢复 / 重置回到初始"""
from playwright.sync_api import sync_playwright

F = "/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
P, Fail = 0, 0


def ok(c, m):
    global P, Fail
    if c:
        P += 1; print("  ✅ " + m)
    else:
        Fail += 1; print("  ❌ " + m)


def seed(pg):
    """造一份 SDS 草稿并等待落入 localStorage"""
    pg.evaluate("showPage('sds:wizard')"); pg.wait_for_timeout(500)
    pg.evaluate("wzGo(1)"); pg.wait_for_timeout(300)
    pg.evaluate("()=>{wz.project.product='水性聚氨酯涂饰树脂 WPU-320';}")
    pg.evaluate("pickMarket('EU')"); pg.wait_for_timeout(400)
    pg.evaluate("wzGo(4)"); pg.wait_for_timeout(400)
    pg.evaluate("wzGo(5)"); pg.wait_for_timeout(600)


with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1680, "height": 1050})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console:" + m.text) if m.type == "error" else None)
    pg.goto("file://" + F); pg.wait_for_timeout(1500)

    print("=== 造数 + 侧栏重置按钮 ===")
    seed(pg)
    n1 = pg.evaluate("()=>wz.formula.length")
    ok(n1 > 0, "草稿已生成（formula 行数=%d）" % n1)
    ok(pg.evaluate("()=>!!document.getElementById('navResetBtn')"),
       "侧栏底部出现「重置演示数据」按钮")
    ok(pg.evaluate("()=>typeof wzResetConfirm==='function'"),
       "重置确认函数已挂载")

    print("\n=== 刷新后恢复（默认初始 ≠ 自动恢复他人草稿，但应恢复本人本机草稿）===")
    pg.reload(); pg.wait_for_timeout(1500)
    n2 = pg.evaluate("()=>wz.formula.length")
    prod2 = pg.evaluate("()=>wz.project.product")
    ok(n2 == n1, "刷新后 formula 行数一致（%d == %d）" % (n2, n1))
    ok(prod2 == '水性聚氨酯涂饰树脂 WPU-320', "刷新后产品名恢复：%s" % prod2)

    print("\n=== 一键重置回到初始（出厂默认，含 6 行示例组分，非清零）===")
    pg.evaluate("wzReset()"); pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>wz.formula.length") == 6, "重置后回到出厂示例组分（6 行）")
    ok(pg.evaluate("()=>wz.project.product") == '', "重置后 product 回到空")
    ok(pg.evaluate("()=>wz.step") == 1, "重置后回到向导第 1 步")

    print("\n=== 重置后再次刷新应保持初始（不回弹脏数据）===")
    pg.reload(); pg.wait_for_timeout(1500)
    ok(pg.evaluate("()=>wz.formula.length") == 6, "重置+刷新后仍为初始（无脏数据残留）")

    print("\n=== 版本失效保护：旧缓存不污染 ===")
    pg.evaluate("()=>localStorage.setItem('plm3_wz_v1', JSON.stringify({s:'v0-OLD',w:{project:{product:'x'},formula:[{cas:'1',conc:'1'}]}}))")
    pg.reload(); pg.wait_for_timeout(1500)
    prod3 = pg.evaluate("()=>wz.project.product")
    ok(prod3 != 'x', "版本不符的旧缓存被丢弃（product=%r）" % prod3)

    print("\nJS 错误：", errs)
    ok(len(errs) == 0, "无 JS 错误")

    print("\n" + "=" * 56)
    print("断言通过 %d / %d" % (P, P + Fail))


# --- 统一退出码：存在失败断言时返回非零，避免 run_smoke.sh 误判为通过 ---
if Fail:
    raise SystemExit(1)
