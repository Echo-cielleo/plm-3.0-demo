# -*- coding: utf-8 -*-
"""产品三字段（prodType/trialLaunch/launch）+ 原材料备选供应商 专项自检（2026-11-03）
覆盖：产品列表生产类型列 / 详情三字段 / 状态-日期规则 / 研发中日期为— /
     ≥8 物料有备选 / 备选字段齐全且与主供有差异 / 列表简称+「+N 备选」角标 /
     详情主备分区+「备选」标签 / 0 JS 错误。"""
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

    # ============ 一、产品三字段 ============
    print("=== 一、PRODUCTS 数据规则 ===")
    ok(pg.evaluate("""()=>PRODUCTS.every(p=>p.prodType==='合成'||p.prodType==='复配')"""),
       "13 个产品 prodType 均为 合成/复配 二值")
    ok(pg.evaluate("""()=>{
      var syn=PRODUCTS.filter(p=>p.prodType==='合成').map(p=>p.cat);
      return syn.some(c=>c.indexOf('树脂')>=0||c.indexOf('鞣')>=0);
    }"""), "树脂/鞣剂类为合成（性质合理）")
    ok(pg.evaluate("""()=>{
      var byCode={};PRODUCTS.forEach(p=>byCode[p.code]=p);
      return byCode['PRD-2026-003'].prodType==='复配'   // 加脂剂 L-27
          && byCode['PRD-2026-006'].prodType==='复配'   // 手感剂 HF-5
          && byCode['PRD-2026-002'].prodType==='复配'   // 光亮剂 GL-9
          && byCode['PRD-2026-001'].prodType==='合成'   // 树脂 WPU-320
          && byCode['PRD-2026-004'].prodType==='合成';  // 鞣剂 CR-33
    }"""), "加脂剂/手感剂/光亮剂=复配，树脂/鞣剂=合成（性质合理）")
    ok(pg.evaluate("""()=>PRODUCTS.filter(p=>p.status==='在产').every(p=>/^\\d{4}-\\d{2}-\\d{2}$/.test(p.trialLaunch)&&/^\\d{4}-\\d{2}-\\d{2}$/.test(p.launch))"""),
       "在产产品两个日期齐全（锚点平移格式 YYYY-MM-DD）")
    ok(pg.evaluate("""()=>{var t=PRODUCTS.filter(p=>p.status==='试产');return t.length>0&&t.every(p=>/^\\d{4}-\\d{2}-\\d{2}$/.test(p.trialLaunch)&&p.launch==='');}"""),
       "试产产品仅有试推广时间")
    ok(pg.evaluate("""()=>PRODUCTS.filter(p=>p.status==='研发中').every(p=>p.trialLaunch===''&&p.launch==='')"""),
       "研发中产品两个日期均为空")
    ok(pg.evaluate("""()=>{var t=PRODUCTS.filter(p=>p.status==='停产');return t.length>0&&t.every(p=>/^\\d{4}-\\d{2}-\\d{2}$/.test(p.trialLaunch)&&/^\\d{4}-\\d{2}-\\d{2}$/.test(p.launch));}"""),
       "停产产品两个日期齐全（历史）")
    ok(pg.evaluate("""()=>PRODUCTS.filter(p=>p.status==='在产').every(p=>p.trialLaunch<p.launch)"""),
       "在产产品试推广早于正式推广")

    print("\n=== 产品列表页 ===")
    pg.evaluate("showPage('prod:list')")
    pg.wait_for_timeout(400)
    heads = pg.evaluate("()=>[...document.querySelectorAll('#lpHost thead th')].map(t=>t.textContent.trim())")
    ok("生产类型" in heads, "列表含「生产类型」列（表头：%s）" % heads)
    body = pg.inner_text("#lpHost")
    ok("合成" in body and "复配" in body, "列表同时出现合成/复配标签")
    # 关键词搜索生产类型
    pg.fill("#lpKw", "复配")
    pg.wait_for_timeout(300)
    rows = pg.evaluate("()=>[...document.querySelectorAll('#lpHost tbody tr')].map(t=>t.textContent)")
    ok(len(rows) >= 1 and all("复配" in t for t in rows), "搜索「复配」筛出全部复配产品（%d 行）" % len(rows))
    pg.fill("#lpKw", "")
    pg.wait_for_timeout(250)

    print("\n=== 产品详情页 ===")
    pg.evaluate("showPage('prod:detail',{code:'PRD-2026-001'})")
    pg.wait_for_timeout(400)
    dl = pg.evaluate("""()=>{var out={};var dts=document.querySelectorAll('#pageHost .desc-list dt');
      dts.forEach(function(dt){out[dt.textContent.trim()]=dt.nextElementSibling.textContent.trim();});return out;}""")
    for k in ["生产类型", "试推广时间", "正式推广时间"]:
        ok(k in dl, "详情含「%s」" % k)
    ok(dl.get("生产类型", "").startswith("合成"), "WPU-320 生产类型=合成（实际：%s）" % dl.get("生产类型"))
    import re
    ok(re.match(r"^\d{4}-\d{2}-\d{2}$", dl.get("试推广时间", "")), "试推广日期格式正确（%s）" % dl.get("试推广时间"))
    ok(re.match(r"^\d{4}-\d{2}-\d{2}$", dl.get("正式推广时间", "")), "正式推广日期格式正确（%s）" % dl.get("正式推广时间"))
    # 研发中 → 显示 —
    pg.evaluate("showPage('prod:detail',{code:'PRD-2026-009'})")
    pg.wait_for_timeout(400)
    dl2 = pg.evaluate("""()=>{var out={};var dts=document.querySelectorAll('#pageHost .desc-list dt');
      dts.forEach(function(dt){out[dt.textContent.trim()]=dt.nextElementSibling.textContent.trim();});return out;}""")
    ok(dl2.get("试推广时间", "") == "—", "研发中产品试推广时间显示 —")
    ok(dl2.get("正式推广时间", "") == "—", "研发中产品正式推广时间显示 —")
    ok(dl2.get("生产类型", "").startswith("合成"), "NS-10 生产类型=合成")

    # ============ 二、备选供应商 ============
    print("\n=== 二、MAT_SUP 备选数据 ===")
    r = pg.evaluate("""()=>{
      var withBak=Object.keys(MAT_SUP).filter(k=>MAT_SUP[k].some(x=>!x.main));
      var allBak=[];Object.keys(MAT_SUP).forEach(k=>MAT_SUP[k].forEach(x=>{if(!x.main)allBak.push(Object.assign({code:k},x));}));
      return {n:withBak.length,bakN:allBak.length,
        fieldsOk:allBak.every(x=>x.sup&&x.no&&x.lead&&x.price&&x.note),
        supOk:allBak.every(x=>!!supByCode(x.sup)),
        mainUnique:Object.keys(MAT_SUP).every(k=>MAT_SUP[k].filter(x=>x.main).length===1)};
    }""")
    ok(r["n"] >= 8, "%d 个物料有备选供应商（要求 ≥8）" % r["n"])
    ok(r["bakN"] >= r["n"], "备选条目共 %d 条" % r["bakN"])
    ok(r["fieldsOk"], "备选条目字段齐全（sup/no/lead/price/note）")
    ok(r["supOk"], "备选供应商编码全部真实在册")
    ok(r["mainUnique"], "每物料主供仍唯一")
    # 差异合理性：备选价格与主供不同
    diff = pg.evaluate("""()=>{
      var bad=[];
      Object.keys(MAT_SUP).forEach(function(k){
        var m=MAT_SUP[k].filter(x=>x.main)[0];
        MAT_SUP[k].filter(x=>!x.main).forEach(function(x){
          if(m&&x.price===m.price&&x.lead===m.lead)bad.push(k+' '+x.sup);
        });
      });
      return bad;
    }""")
    ok(len(diff) == 0, "备选价格/交期与主供至少一项有差异" + ("" if not diff else " 异常：" + str(diff)))
    ok(pg.evaluate("()=>matBakCount('MAT-00127')===1 && matBakCount('MAT-00210')===1 && matBakCount('MAT-00128')===0"),
       "matBakCount 计数正确（00127=1 / 00210=1 / 00128=0）")

    print("\n=== 原料列表供应商列 ===")
    pg.evaluate("showPage('bd:rawmat')")
    pg.wait_for_timeout(500)
    head = pg.eval_on_selector_all("#dbTable thead th", "els=>els.map(e=>e.textContent.trim())")
    ok("供应商" in head, "列表含「供应商」列（表头：%s）" % head)
    tbl = pg.inner_text("#dbTable")
    ok("万华化学" in tbl, "供应商列显示简称（万华化学）")
    ok("+1 备选" in tbl, "有备选物料显示「+1 备选」角标")
    badges = pg.evaluate("""()=>{
      var out={};
      [...document.querySelectorAll('#dbTable tbody tr')].forEach(function(tr){
        var tds=[...tr.querySelectorAll('td')];
        var code=tds[1]?tds[1].textContent.trim():'';   /* 首列是展开箭头 */
        var sup=tds.map(t=>t.textContent).join('|');
        var m=sup.match(/\\+(\\d) 备选/);
        if(/^MAT-\\d+$/.test(code))out[code]=m?parseInt(m[1]):0;
      });
      return out;}""")
    bad = [c for c, n in badges.items() if n != pg.evaluate("matBakCount('%s')" % c)]
    ok(len(bad) == 0, "角标数字与 MAT_SUP 备选数逐行一致（校验 %d 行）" % len(badges))
    ok(badges.get("MAT-00127") == 1, "MAT-00127 角标 =1（实际 %s）" % badges.get("MAT-00127"))

    print("\n=== 物料详情供应商单表 ===")
    pg.evaluate("matOpen('MAT-00127')")
    pg.wait_for_timeout(500)
    txt = pg.inner_text("#pageHost")
    ok("巴斯夫" in txt, "备选条目（巴斯夫）在同一表格内")
    ok("主供" in txt and "备选" in txt, "主供/备选彩色标签齐全")
    # 单表校验：供应商表只有一张含「供应商编码」表头，主供行在首行
    tbls = pg.evaluate("""()=>[...document.querySelectorAll('#pageHost table')]
        .filter(t=>t.textContent.indexOf('供应商编码')>=0)""")
    ok(len(tbls) == 1, "供应商合为一张表（实际 %d 张）" % len(tbls))
    first = pg.evaluate("""()=>{var t=[...document.querySelectorAll('#pageHost table')].filter(x=>x.textContent.indexOf('供应商编码')>=0)[0];
      return t?t.querySelector('tbody tr').textContent:'';}""")
    ok("SUP-2026-001" in first and "主供" in first, "主供（万华）在表格第一行")
    ok("断供备份" in txt or "断供" in txt, "备选 note 理由进入表格")
    # 交期价格列存在
    ok("交期" in txt and "价格" in txt, "供应商表含交期与价格列")
    # 无备选物料：表内不出现「备选」标签
    pg.evaluate("matOpen('MAT-00128')")
    pg.wait_for_timeout(400)
    txt2 = pg.inner_text("#pageHost")
    ok("备选" not in txt2, "无备选物料（MAT-00128）表内无「备选」标签")

    print("\n=== 无 JS 错误 ===")
    ok(len(errs) == 0, "运行期 0 JS 错误" + ("" if not errs else " -> " + str(errs[:2])))
    b.close()

print("\n失败项：%d" % len(fails))
if fails:
    for f in fails:
        print("  - " + f)
    sys.exit(1)
print("全部通过 ✅")
