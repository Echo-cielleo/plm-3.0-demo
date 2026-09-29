# -*- coding: utf-8 -*-
"""原料暂存区 + 供应商 持久化专项自检（27z9b）
覆盖：写操作后落盘 / 刷新后按主键恢复 / 「重置演示数据」回出厂 / 0 JS 错误。"""
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
    ctx = b.new_context()
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto("file://" + F)
    pg.wait_for_timeout(1600)

    print("=== 初始状态 ===")
    keys = pg.evaluate("()=>Object.keys(localStorage)")
    ok('plm3_staging_v1' not in keys and 'plm3_supplier_v1' not in keys,
       "初始无暂存区 / 供应商存档（出厂干净）")
    ok(pg.evaluate("()=>{var r=MAT_STAGING.filter(x=>x.id==='TMP-2026-002')[0];return r?r.status:'-';}")
       == '待匹配编码', "出厂时 002 为「待匹配编码」")
    sup0 = pg.evaluate("()=>SUPPLIERS.length")

    print("\n=== 暂存区：同步存货编码后落盘 ===")
    pg.evaluate("()=>{stgSyncCode('TMP-2026-002');}")
    pg.wait_for_timeout(200)
    ok('plm3_staging_v1' in pg.evaluate("()=>Object.keys(localStorage)"),
       "同步编码后写入 plm3_staging_v1")
    ok(pg.evaluate("()=>{var r=MAT_STAGING.filter(x=>x.id==='TMP-2026-002')[0];return [r.status,r.code];}")
       == ['待建档', 'MAT-00933'], "同步后 002 变「待建档 / MAT-00933」")

    print("\n=== 供应商：新增后落盘 ===")
    pg.evaluate("""()=>{SUPPLIERS.unshift({code:'SUP-TEST-01',name:'测试供应商',type:'经销商',
      region:'华东',cat:'加脂剂',grade:'A',status:'合作中',_src:'手工建档'});supPersistSave();}""")
    ok('plm3_supplier_v1' in pg.evaluate("()=>Object.keys(localStorage)"),
       "新增供应商后写入 plm3_supplier_v1")
    ok(pg.evaluate("()=>SUPPLIERS.length") == sup0 + 1, "供应商条数 +1")

    print("\n=== 刷新后恢复 ===")
    pg.reload()
    pg.wait_for_timeout(1600)
    ok(pg.evaluate("()=>{var r=MAT_STAGING.filter(x=>x.id==='TMP-2026-002')[0];return [r.status,r.code];}")
       == ['待建档', 'MAT-00933'], "刷新后暂存区记录仍是「待建档 / MAT-00933」")
    ok(pg.evaluate("()=>SUPPLIERS.length") == sup0 + 1
       and pg.evaluate("()=>!!SUPPLIERS.filter(s=>s.code==='SUP-TEST-01')[0]"),
       "刷新后新增的供应商仍在")

    print("\n=== 重置演示数据 ===")
    pg.evaluate("()=>wzReset()")
    pg.wait_for_timeout(700)
    keys2 = pg.evaluate("()=>Object.keys(localStorage)")
    ok('plm3_staging_v1' not in keys2 and 'plm3_supplier_v1' not in keys2,
       "重置后两个存档键都已清除")
    ok(pg.evaluate("()=>{var r=MAT_STAGING.filter(x=>x.id==='TMP-2026-002')[0];return [r.status,r.code];}")
       == ['待匹配编码', ''], "重置后 002 回到出厂「待匹配编码 / 空编码」")
    ok(pg.evaluate("()=>SUPPLIERS.length") == sup0
       and not pg.evaluate("()=>!!SUPPLIERS.filter(s=>s.code==='SUP-TEST-01')[0]"),
       "重置后供应商回到出厂 %d 条，测试供应商已清除" % sup0)

    print("\n=== 无 JS 错误 ===")
    ok(len(errs) == 0, "运行期 0 JS 错误" + ("" if not errs else " -> " + str(errs[:2])))
    b.close()

print("\n失败项：%d" % len(fails))
if fails:
    for f in fails:
        print("  - " + f)
    sys.exit(1)
print("全部通过 ✅")
