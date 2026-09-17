_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""G5（第12章生态毒性）+ G6（第15章法规/CSA/Annex XIV）+ G10（第14章运输）专项自检
覆盖：edit / dv 双视图渲染、生态毒性表（混合物级 + 按组分）、运输概览表（含 ADN）、
      法规表（EU/CN）、CSA 勾选框、Annex XIV 联动、未知水生毒性声明、0 JS 错误。"""
from playwright.sync_api import sync_playwright

F = "/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
fails = []
def ok(cond, msg):
    print(("✔ " if cond else "❌ ") + msg)
    if not cond: fails.append(msg)

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto("file://" + F); pg.wait_for_timeout(1500)
    pg.evaluate("showPage('sds:wizard')"); pg.wait_for_timeout(400)
    pg.evaluate("()=>{wz.project.market='EU';}"); pg.wait_for_timeout(200)
    pg.evaluate("wzGo(5)"); pg.wait_for_timeout(900)

    print("\n=== edit 编制视图：第12/14/15 章表格 ===")
    # 第12章 生态毒性
    ok(pg.evaluate("()=>document.querySelectorAll('#acc11 table.tbl').length>=1"),
       "第12章有生态毒性表")
    ok(pg.evaluate("()=>document.getElementById('sec11')?true:false") or
       pg.evaluate("()=>!!document.querySelector('#acc11')"), "第12章 acc 区块存在")
    body12 = pg.evaluate("()=>document.querySelector('#acc11')?.textContent||''")
    ok('水生危害分类' in body12, "第12章表含「水生危害分类」列")
    ok('PBT' in body12, "第12章含 PBT/vPvB 评估")
    ok('Not available' in body12, "第12章未测得项标 Not available")

    # 第14章 运输
    body14 = pg.evaluate("()=>document.querySelector('#acc13')?.textContent||''")
    ok('ADN' in body14, "第14章运输表含 ADN（内河）")
    ok('IMDG' in body14 and 'IATA' in body14 and 'ADR' in body14,
       "第14章含 ADR/RID/ADN/IMDG/IATA 多模式")
    ok('不适用' in body14, "第14章非危险货物标注「不适用」")

    # 第15章 法规/CSA/Annex XIV
    body15 = pg.evaluate("()=>document.querySelector('#acc14')?.textContent||''")
    ok('REACH Annex XVII' in body15, "第15章含 REACH Annex XVII")
    ok('SVHC' in body15, "第15章含 SVHC 候选清单")
    ok('化学安全评估' in body15 or 'CSA' in body15, "第15章含 CSA 勾选区")
    ok('Annex XIV' in body15, "第15章含 Annex XIV 命中判定")
    ok('未列入' in body15 or '重铬酸铵' not in body15, "第15章当前配方未命中 Annex XIV")

    print("\n=== dv 交付文档流：表格同样渲染 ===")
    pg.evaluate("setWzView('deliver')"); pg.wait_for_timeout(700)
    d12 = pg.evaluate("()=>document.querySelector('.doc-page')?.textContent||''")
    ok('水生危害分类' in d12, "dv 文档流第12章有生态毒性表")
    ok('ADN' in d12, "dv 文档流第14章有运输表（含 ADN）")
    ok('Annex XIV' in d12, "dv 文档流第15章有法规/Annex XIV")
    ok('CSA' in d12 or '化学安全评估' in d12, "dv 文档流第15章有 CSA")
    pg.evaluate("setWzView('edit')"); pg.wait_for_timeout(500)

    print("\n=== 市场联动（法规表随目标市场过滤）===")
    pg.evaluate("()=>{wz.project.market='EU';wzGo(5);}"); pg.wait_for_timeout(700)
    b15 = pg.evaluate("()=>document.getElementById('acc14')?.textContent||''")
    ok('15.1 欧盟法规' in b15, "EU 市场下第15章显示欧盟法规表")
    ok('15.1 中国法规' not in b15, "EU 市场下不混入中国法规表")
    pg.evaluate("()=>{wz.project.market='CN';wzGo(5);}"); pg.wait_for_timeout(700)
    b15c = pg.evaluate("()=>document.getElementById('acc14')?.textContent||''")
    ok('15.1 中国法规' in b15c, "CN 市场下第15章显示中国法规表")
    ok('15.1 欧盟法规' not in b15c, "CN 市场下不混入欧盟法规表")

    print("\n=== 无 JS 错误 ===")
    ok(len(errs) == 0, "运行期 0 JS 错误" + ("" if not errs else " -> "+str(errs[:2])))

    b.close()

print("\n失败项：%d" % len(fails))
if fails:
    for f in fails: print("  - " + f)
    raise SystemExit(1)
print("全部通过 ✅")
