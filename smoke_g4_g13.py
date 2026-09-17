_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""G4（第11章毒理端点）+ G13（第9章理化特性 25 项）专项自检
覆盖：edit / dv 双视图渲染、25 项理化表、9 个毒理端点、按组分实测 ATE 表、
      纳米形态联动、Not available 口径、无 JS 错误。"""
import sys
from playwright.sync_api import sync_playwright

F = "/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
fails = 0
def ok(c, msg):
    global fails
    print(("✅ " + msg) if c else ("❌ " + msg))
    if not c: fails += 1

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("file://" + F); pg.wait_for_timeout(1500)

    # 导航到 SDS 向导第 5 步
    pg.evaluate("showPage('sds:wizard')"); pg.wait_for_timeout(400)
    pg.evaluate("wzGo(5)"); pg.wait_for_timeout(900)

    # ---------- edit 视图（默认） ----------
    ok(pg.evaluate("()=>!!document.getElementById('acc8')"), "edit：第9章 acc-item 存在")
    ok(pg.evaluate("()=>!!document.getElementById('acc10')"), "edit：第11章 acc-item 存在")

    phys_rows = pg.evaluate("()=>{var a=document.getElementById('acc8');"
                            +"return a?a.querySelectorAll('table.tbl.mini tbody tr').length:0;}")
    ok(phys_rows == 25, "edit：第9章理化表 25 行（实际 %d）" % phys_rows)

    phys_na = pg.evaluate("()=>{var a=document.getElementById('acc8');"
                          +"return a?a.querySelectorAll('.muted').length:0;}")
    ok(phys_na >= 12, "edit：第9章未测得项标注 Not available（muted 单元 %d）" % phys_na)

    # 第9章已知项已填值（外观 / 闪点 / 相对密度 / 运动粘度 / VOC）
    phys_text = pg.evaluate("()=>{var a=document.getElementById('acc8');return a?a.textContent:'';}")
    for kw in ['淡黄色半透明粘稠液体', '62 ℃', '1.04', '120', '14 %']:
        ok(kw in phys_text, "edit：第9章已知项含「%s」" % kw)

    # 第9章颗粒特性联动纳米形态（默认未设 → Not applicable）
    ok('Not applicable' in phys_text, "edit：第9章颗粒特性随纳米形态判定（默认 Not applicable）")

    # ---------- 第11章毒理端点 ----------
    tox_text = pg.evaluate("()=>{var a=document.getElementById('acc10');return a?a.textContent:'';}")
    for kw in ['皮肤腐蚀 / 刺激', '严重眼损伤 / 眼刺激', '呼吸道或皮肤致敏',
               '生殖细胞突变性', '致癌性', '生殖毒性',
               '特异性靶器官毒性（一次接触）', '特异性靶器官毒性（反复接触）', '吸入危害']:
        ok(kw in tox_text, "edit：第11章 9 端点含「%s」" % kw)

    ok('Summary of evaluation of the CMR properties' in tox_text, "edit：第11章 CMR 评估总结存在")

    # 按组分实测 ATE 表
    sample_rows = pg.evaluate("()=>{var a=document.getElementById('acc10');"
                              +"return a?a.querySelectorAll('table.tbl.mini tbody tr').length:0;}")
    ok(sample_rows >= 6, "edit：第11章含表格（ATE 估算 + 端点 + 组分实测，总行数 %d）" % sample_rows)
    ok('经口' in tox_text or 'Not available' in tox_text, "edit：第11章组分实测 ATE 含实测值或如实留空")

    # ---------- 删除草稿脏数据，切 dv 视图复查 ----------
    pg.evaluate("setWzView('deliver')"); pg.wait_for_timeout(900)
    secs = pg.evaluate("()=>document.querySelectorAll('.doc-sec-wrap').length")
    ok(secs == 16, "dv：文档流 16 章齐套（实际 %d）" % secs)

    # dv 第9章（index 8）
    dv9 = pg.evaluate("()=>{var s=document.querySelectorAll('.doc-sec-wrap')[8];"
                      +"return {n:s.querySelector('.doc-sec').textContent, "
                      +"rows:s.querySelectorAll('table.tbl.mini tbody tr').length, "
                      +"txt:s.textContent};}")
    ok('理化特性' in dv9['n'], "dv：第9章标题正确")
    ok(dv9['rows'] == 25, "dv：第9章理化表 25 行（实际 %d）" % dv9['rows'])
    ok('Not available' in dv9['txt'], "dv：第9章 Not available 口径保留")

    # dv 第11章（index 10）
    dv11 = pg.evaluate("()=>{var s=document.querySelectorAll('.doc-sec-wrap')[10];"
                       +"return {n:s.querySelector('.doc-sec').textContent, txt:s.textContent};}")
    ok('毒理' in dv11['n'] or '11' in dv11['n'], "dv：第11章标题正确")
    for kw in ['皮肤腐蚀 / 刺激', '致癌性', '吸入危害', 'Summary of evaluation of the CMR']:
        ok(kw in dv11['txt'], "dv：第11章含「%s」" % kw)

    ok(len(errs) == 0, "无 JS 运行错误（捕获 %d 条）" % len(errs))
    if errs:
        for e in errs[:5]: print("   [err]", e)

    pg.close(); b.close()

print("\n=== G4 + G13 自检：%s ===" % ("全部通过 ✅" if fails == 0 else ("%d 项失败 ❌" % fails)))
sys.exit(1 if fails else 0)
