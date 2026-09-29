# -*- coding: utf-8 -*-
_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
"""第 5 步「防错过」提示专项自检
覆盖：编制视图顶部人工待办清单（红项列举 + 直达入口）、待办处理后消失、
      交付预览版本来源条（草案 / 发布快照 / 快照后有改动 + 一键看最新草案）、
      来源条不进 SDS 正文与 Word 导出、0 JS 错误。"""
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
    pg.evaluate("wzGo(5)"); pg.wait_for_timeout(900)

    print("=== 1. 编制视图顶部人工待办清单 ===")
    bar = pg.evaluate("()=>{var n=document.querySelector('#wzBody .notice');return n?n.textContent:'';}")
    ok('人工待办' in bar, "编制视图顶部出现人工待办汇总条")
    ok('第 14 章' in bar and '运输结论尚未维护' in bar, "待办清单列出第 14 章运输结论未维护")
    ok('第 11 章' in bar or '第 12 章' in bar, "待办清单同时列出第 11 / 12 章待人工判定项")
    ok('另有' in bar and '需人工审核' in bar, "模板文案类章节一句话带过，不逐章刷屏")
    nbtn = pg.evaluate("()=>document.querySelectorAll('#wzBody .notice button').length")
    ok(nbtn >= 2, "每个待办都有直达处理按钮（实际 %d 个）" % nbtn)

    # 跳转：第 14 章 → 展开 acc13；第 11 章 → 到第 4 步
    pg.evaluate("secTodoJump(13,'chapter')"); pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>document.getElementById('acc13').classList.contains('open')"),
       "点第 14 章待办直达该章并展开")
    pg.evaluate("secTodoJump(10,'step4')"); pg.wait_for_timeout(600)
    ok(pg.evaluate("()=>wz.step") == 4, "点第 11 章待办跳到第 4 步判定入口")

    print("\n=== 2. 处理完第 14 章后待办消失 ===")
    pg.evaluate("wzGo(5)"); pg.wait_for_timeout(600)
    pg.evaluate("""()=>{transportAssessmentSave({status:'REGULATED',unNumber:'UN3082',
      properShippingName:'ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.',hazardClass:'9',
      packingGroup:'III',basis:'MSDS 第14章',assessedBy:'李工',applicableModes:['ADR','IMDG']});
      renderStep5();}""")
    bar2 = pg.evaluate("()=>{var n=document.querySelector('#wzBody .notice');return n?n.textContent:'';}")
    ok('运输结论尚未维护' not in bar2, "第 14 章维护后不再出现在待办清单")

    print("\n=== 3. 交付预览版本来源条 ===")
    pg.evaluate("setWzView('deliver')"); pg.wait_for_timeout(700)
    pv = pg.evaluate("()=>{var n=document.querySelector('#wzBody .notice');return n?n.textContent:'';}")
    ok('最新草案' in pv and '未发布' in pv, "未发布时来源条标明「最新草案（未发布）」")
    ok('已发布版本' not in pv, "未发布时不出现发布版本字样")

    # 发布
    pg.evaluate("""()=>{
      wz.docVer='V1.0'; wz.submitted=true;
      wz.classItems.forEach(c=>{if(c.status==='pending'){
        c.status='manual';c.result='不分类（无需分类）';c.code='—';
        c.note='依据人工审核报告判定';c.noteAt=nowStr();}});
      sdsReleaseCreate({name:'EHS 负责人'}); renderStep5();
    }"""); pg.wait_for_timeout(700)
    st = pg.evaluate("()=>({published:wz.published,n:(wz.releaseSnapshots||[]).length})")
    ok(st['published'] and st['n'] == 1, "发布成功生成 1 份快照")
    pv2 = pg.evaluate("()=>{var n=document.querySelector('#wzBody .notice');return n?n.textContent:'';}")
    ok('发布版本' in pv2 and 'V1.0' in pv2, "发布后来源条标明「V1.0 发布版本」")
    ok('内容一致' in pv2, "快照与草案一致时提示一致，不制造假告警")

    print("\n=== 4. 快照后改草案：提示有改动 + 一键看最新 ===")
    pg.evaluate("""()=>{transportAssessmentSave({status:'REGULATED',unNumber:'UN3082',
      properShippingName:'ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.',hazardClass:'9',
      packingGroup:'III',basis:'改后依据',assessedBy:'李工',applicableModes:['ADR']});
      renderStep5();}"""); pg.wait_for_timeout(700)
    pv3 = pg.evaluate("()=>{var n=document.querySelector('#wzBody .notice');return n?n.textContent:'';}")
    ok('又有改动' in pv3, "快照后草案有改动时明确提示")
    ok('查看最新草案' in pv3, "提供「查看最新草案」入口")
    snapped = pg.evaluate("""()=>{
      var s=document.querySelectorAll('section.doc-sec-wrap')[13];
      var r=Array.from(s.querySelectorAll('tbody tr')).map(tr=>Array.from(tr.children).map(td=>td.textContent.trim()));
      return r[0];}""")
    ok(snapped[3] != 'Not applicable', "改动前交付预览仍是发布快照（海运列有值）")
    pg.evaluate("sdsPreviewShowDraft()"); pg.wait_for_timeout(700)
    live = pg.evaluate("""()=>{
      var s=document.querySelectorAll('section.doc-sec-wrap')[13];
      var r=Array.from(s.querySelectorAll('tbody tr')).map(tr=>Array.from(tr.children).map(td=>td.textContent.trim()));
      return r[0];}""")
    ok(live[3] == 'Not applicable', "切到最新草案后海运列变为 Not applicable（说明切换真的生效）")
    pv4 = pg.evaluate("()=>{var n=document.querySelector('#wzBody .notice');return n?n.textContent:'';}")
    ok('回到' in pv4 and '发布版本' in pv4, "草案视图下提供回到发布版本的入口")

    print("\n=== 5. 来源条不进正式正文与 Word 导出 ===")
    ok('当前展示' not in pg.evaluate("()=>sdsDocBodyHtml()"), "来源条不在 SDS 正文内")
    cap = pg.evaluate("""()=>{window._d=null;
      window.downloadFile=function(n,h,t){window._d={n:n,h:h,t:t};};
      exportSdsWord();return window._d.h;}""")
    ok('当前展示' not in cap, "Word 导出不含来源条")

    print("\n=== 6. JS 错误 ===")
    ok(len(errs) == 0, "0 JS 错误（实际 %d：%s）" % (len(errs), errs[:2]))

    print("\n失败项：%d" % len(fails))
    b.close()
