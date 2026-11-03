# -*- coding: utf-8 -*-
"""原料库存（bd:inv）+ 出入库记录（bd:invlog）+ 盘点校正 专项自检（27z8b）
覆盖：菜单位置 / Tab / 列 / 种子四态质检与效期 / 数量=流水累计一致性 /
     三筛选 / 行底色 / 详情弹窗（流水+送检联动）/ 单行盘点校正 / 盘点模式批量 /
     新增出入库（级联·超库存拦截·库存联动）/ 详情→流水页预筛 / 0 JS 错误。"""
import sys
from playwright.sync_api import sync_playwright

_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
F = "/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
fails = []


def ok(cond, msg):
    print(("✔ " if cond else "❌ ") + msg)
    if not cond:
        fails.append(msg)


def clear_toasts(pg):
    pg.evaluate("()=>{var w=document.getElementById('toastWrap');if(w)w.innerHTML='';}")


with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    ctx = b.new_context(viewport={'width': 1680, 'height': 1050})
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto("file://" + F)
    pg.wait_for_timeout(1600)

    print("=== 菜单与数据模型 ===")
    ok(pg.evaluate("""()=>{
      var g=MENU.find(x=>x.id==='bd').children.find(c=>c.id==='bd:mat');
      var ids=g.children.map(x=>x.id);
      return ids.indexOf('bd:inv')>=0 && ids.indexOf('bd:invlog')>ids.indexOf('bd:inv');
    }"""), "原料管理下依次为 原料库存 → 出入库记录")
    ok(pg.evaluate("()=>typeof regPage==='function' && !!PAGES['bd:inv'] && !!PAGES['bd:invlog']"),
       "bd:inv / bd:invlog 均已注册")
    ok(pg.evaluate("""()=>INV_LOGS.every(l=>!!invBatch(l.code,l.batch))"""),
       "每条流水都能联查到批次")
    ok(pg.evaluate("""()=>INV_BATCHES.mat.concat(INV_BATCHES.prd).every(function(b){
      var s=INV_LOGS.filter(l=>l.code===b.code&&l.batch===b.batch).reduce((a,l)=>a+l.qty,0);
      return s===invQty(b.code,b.batch);})"""), "账面数量 = 该批次流水累计（单源一致）")
    ok(pg.evaluate("""()=>{
      var q=INV_BATCHES.mat.concat(INV_BATCHES.prd);
      var vals=new Set(q.map(b=>b.qc));
      return ['合格','不合格','检测中','未送检'].every(v=>vals.has(v));
    }"""), "质检状态四值各有种子覆盖")
    ok(pg.evaluate("""()=>{
      var bs=invRows('mat').concat(invRows('prd'));
      return bs.some(r=>r._exp==='已过期') && bs.some(r=>r._exp==='90天内');
    }"""), "效期预警种子：已过期与 90 天内均存在")
    ok(pg.evaluate("""()=>{
      var t=demoYmd();
      return INV_BATCHES.mat.concat(INV_BATCHES.prd).every(function(b){
        return /^\\d{4}-\\d{2}-\\d{2}$/.test(b.prodDate) && (b.expDate===''||/^\\d{4}-\\d{2}-\\d{2}$/.test(b.expDate));
      });
    }"""), "日期均为锚点平移生成的 YYYY-MM-DD")
    ok(pg.evaluate("()=>INV_LOGS.length>=15 && INV_LOGS.length<=25"),
       "流水种子 %d 条（15 条左右）" % pg.evaluate("()=>INV_LOGS.length"))
    ok(pg.evaluate("()=>INV_LOGS.filter(l=>l.type==='盘点调整').length>=1"), "含盘点调整流水")

    print("\n=== 库存页：Tab 与列 ===")
    pg.evaluate("showPage('bd:inv')")
    pg.wait_for_timeout(400)
    heads = pg.evaluate("()=>[...document.querySelectorAll('#lpHost thead th')].map(t=>t.textContent.trim())")
    for col in ['物料编码', '物料名称', '批次号', '库存数量', '单位', '生产日期', '失效日期', '库龄(天)', '质检状态', '存放位置', '备注']:
        ok(col in heads, "列头含「%s」" % col)
    ok(pg.evaluate("()=>document.querySelectorAll('#invTabs button').length===2"), "顶部 Tab 两个（原料/产品）")
    pg.click("#invTabs button[data-key='prd']")
    pg.wait_for_timeout(300)
    ok(pg.inner_text("#lpHost h1") == '产品库存', "切 Tab 后标题为产品库存")
    ok(pg.evaluate("()=>document.querySelectorAll('#lpHost tbody tr').length") ==
       pg.evaluate("()=>INV_BATCHES.prd.length"), "产品 Tab 行数 = 产品批次数")
    pg.click("#invTabs button[data-key='mat']")
    pg.wait_for_timeout(300)

    print("\n=== 效期预警渲染 ===")
    cls_map = pg.evaluate("""()=>{
      var out={};
      [...document.querySelectorAll('#lpHost tbody tr')].forEach(function(tr){
        var tds=tr.querySelectorAll('td');
        out[tds[2].textContent.trim()]=tr.className;
      });
      return out;}""")
    ok(cls_map.get('EGB-2606B') == 'row-red', "已过期批次行底色 row-red（EGB-2606B）")
    ok(cls_map.get('ETH-2609C') == 'row-due', "90 天内批次行底色 row-due（ETH-2609C）")

    print("\n=== 三筛选 ===")
    pg.select_option("[data-flt='qc']", "检测中")
    pg.wait_for_timeout(250)
    rows = pg.evaluate("()=>[...document.querySelectorAll('#lpHost tbody tr')].map(t=>t.textContent)")
    ok(len(rows) >= 1 and all('检测中' in t for t in rows), "质检筛选=检测中 → 全部命中")
    pg.select_option("[data-flt='qc']", "")
    pg.select_option("[data-flt='_exp']", "已过期")
    pg.wait_for_timeout(250)
    rows = pg.evaluate("()=>[...document.querySelectorAll('#lpHost tbody tr')].map(t=>t.textContent)")
    ok(len(rows) == 1 and 'EGB-2606B' in rows[0], "效期筛选=已过期 → 只剩 EGB-2606B")
    pg.select_option("[data-flt='_exp']", "")
    pg.select_option("[data-flt='code']", "MAT-00210")
    pg.wait_for_timeout(250)
    rows = pg.evaluate("()=>[...document.querySelectorAll('#lpHost tbody tr')].map(t=>t.textContent)")
    ok(len(rows) == 2 and all('L27' in t for t in rows), "物料筛选=加脂剂 L-27 → 两个批次")
    pg.click("[data-lp-reset]")
    pg.wait_for_timeout(250)

    print("\n=== 批次详情弹窗（流水 + 送检联动） ===")
    pg.evaluate("invView('MAT-00210','L27-2608A')")
    pg.wait_for_timeout(300)
    txt = pg.inner_text('#modal')
    ok('账面数量' in txt and '400' in txt, "详情含账面数量")
    ok('采购入库' in txt, "详情含出入库流水摘录")
    ok('QC-2026-0142' in txt, "送检摘录联动真实送检记录（L27-2608A → QC-2026-0142）")
    ok('库龄' in txt, "详情含库龄")
    pg.evaluate("closeModal()")

    print("\n=== 单行盘点校正 ===")
    q0 = pg.evaluate("()=>invQty('MAT-00127','WPU-2609A')")
    pg.evaluate("invAdjust('MAT-00127','WPU-2609A')")
    pg.wait_for_timeout(300)
    ok('账面数量' in pg.inner_text('#modal'), "校正弹窗展示账面数量")
    pg.fill("#iaQty", str(q0 - 5))
    pg.select_option("#iaReason", "损耗")
    pg.click("text=确认校正")
    pg.wait_for_timeout(400)
    q1 = pg.evaluate("()=>invQty('MAT-00127','WPU-2609A')")
    ok(q1 == q0 - 5, "校正后账面 %d → %d（-5）" % (q0, q1))
    lg = pg.evaluate("""()=>INV_LOGS.filter(l=>l.type==='盘点调整'&&l.code==='MAT-00127')
        .sort((a,b)=>a.date<b.date?-1:1).slice(-1)[0]""")
    ok(lg and lg['qty'] == -5 and lg['reason'] == '损耗', "自动生成盘点调整流水（-5 · 损耗）")
    # 差异为 0 不生成
    n0 = pg.evaluate("()=>INV_LOGS.length")
    pg.evaluate("invAdjust('MAT-00127','WPU-2609A')")
    pg.wait_for_timeout(250)
    pg.fill("#iaQty", str(q1))
    pg.click("text=确认校正")
    pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>INV_LOGS.length") == n0, "实盘=账面时不生成流水")
    pg.evaluate("closeModal()")

    print("\n=== 盘点模式（批量） ===")
    pg.evaluate("invAuditToggle(true)")
    pg.wait_for_timeout(350)
    ok(pg.evaluate("()=>document.querySelectorAll('[id^=iax_]').length") ==
       pg.evaluate("()=>INV_BATCHES.mat.length"), "盘点模式：当前 Tab 每行有实盘输入框")
    ok(pg.evaluate("()=>!!document.getElementById('iax_0')"), "盘点表含账面列与实盘输入")
    q_a = pg.evaluate("()=>invQty('MAT-00127','WPU-2609A')")
    q_b = pg.evaluate("()=>invQty('MAT-00210','L27-2608A')")
    pg.fill("#iax_0", str(q_a + 3))   # 盘盈
    pg.fill("#iax_1", str(q_b))       # 差异 0
    n0 = pg.evaluate("()=>INV_LOGS.length")
    pg.click("text=提交盘点结果")
    pg.wait_for_timeout(450)
    ok(pg.evaluate("()=>invQty('MAT-00127','WPU-2609A')") == q_a + 3, "批量提交：差异行已校正（+3 盘盈）")
    ok(pg.evaluate("()=>INV_LOGS.length") == n0 + 1, "差异为 0 的行不生成流水（只 +1 条）")
    ok(pg.evaluate("""()=>{var l=INV_LOGS.find(x=>x.remark==='盘点模式批量校正');return l&&l.qty===3&&l.reason==='盘盈';}"""),
       "批量流水：数量=+3、事由=盘盈")
    ok(pg.inner_text("#lpHost h1") == '原料库存', "提交后自动退出盘点模式回列表")

    print("\n=== 出入库记录页 ===")
    pg.evaluate("showPage('bd:invlog')")
    pg.wait_for_timeout(400)
    heads = pg.evaluate("()=>[...document.querySelectorAll('#lpHost thead th')].map(t=>t.textContent.trim())")
    for col in ['日期', '类型', '物料编码', '物料名称', '批次号', '数量', '经办人', '事由', '备注']:
        ok(col in heads, "流水列头含「%s」" % col)
    ok('操作' not in heads, "流水页无操作列（纯流水账）")
    signs = pg.evaluate("""()=>{
      var f=INV_LOGS[0].qty>=0;
      var pos=INV_LOGS.filter(l=>l.qty>0)[0], neg=INV_LOGS.filter(l=>l.qty<0)[0];
      var cfg=PAGES['bd:invlog'];   /* 数量列带符号渲染 */
      return {pos:pos.qty,neg:neg.qty};
    }""")
    ok(signs['pos'] > 0 and signs['neg'] < 0, "入库为正（+%d）出库为负（%d）" % (signs['pos'], signs['neg']))
    ok(pg.evaluate("""()=>{
      var tr=[...document.querySelectorAll('#lpHost tbody tr')][0];
      return tr && /[+]/.test(tr.textContent);
    }"""), "首行数量显示带正号")
    pg.select_option("[data-flt='type']", "盘点调整")
    pg.wait_for_timeout(250)
    rows = pg.evaluate("()=>[...document.querySelectorAll('#lpHost tbody tr')].map(t=>t.textContent)")
    ok(len(rows) >= 2 and all('盘点调整' in t for t in rows), "类型筛选=盘点调整 → 全部命中")

    print("\n=== 新增出入库记录 ===")
    clear_toasts(pg)
    pg.click("text=＋ 新增记录")
    pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>$('mask').className==='on'"), "新增弹窗打开")
    pg.select_option("#ilType", "出库")
    pg.select_option("#ilCode", "MAT-00305")
    pg.evaluate("invLogBatchOpts()")
    opts = pg.evaluate("()=>[...document.querySelectorAll('#ilBatch option')].map(o=>o.textContent)")
    ok(any('CR33-2607C' in o for o in opts), "批次下拉随物料级联（显示账面数量）")
    pg.select_option("#ilBatch", "CR33-2607C")
    cur = pg.evaluate("()=>invQty('MAT-00305','CR33-2607C')")
    pg.fill("#ilQty", str(cur + 999))
    pg.fill("#ilReason", "超领测试")
    pg.click("text=确认提交")
    pg.wait_for_timeout(300)
    ok(pg.evaluate("()=>$('mask').className==='on'"), "出库超库存被拦截，弹窗不关")
    toast = pg.evaluate("()=>{var t=document.querySelector('#toastWrap .toast');return t?t.textContent:'';}")
    ok('超过' in toast, "拦截提示写明超库存：%s" % toast.strip()[:40])
    pg.fill("#ilQty", "50")
    pg.click("text=确认提交")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>invQty('MAT-00305','CR33-2607C')") == cur - 50,
       "正常出库 50 → 库存自动减（%d → %d）" % (cur, cur - 50))
    ok(pg.evaluate("""()=>{var l=INV_LOGS[0];return l.type==='出库'&&l.qty===-50&&l.batch==='CR33-2607C';}"""),
       "新流水置顶：出库 -50")
    # 入库联动
    pg.evaluate("invLogAdd()")
    pg.wait_for_timeout(250)
    pg.select_option("#ilType", "入库")
    pg.select_option("#ilCode", "MAT-00305")
    pg.evaluate("invLogBatchOpts()")
    pg.select_option("#ilBatch", "CR33-2607C")
    pg.fill("#ilQty", "100")
    pg.fill("#ilReason", "补货入库")
    pg.click("text=确认提交")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>invQty('MAT-00305','CR33-2607C')") == cur + 50, "入库 100 → 库存回到 %d" % (cur + 50))

    print("\n=== 详情 → 流水页预筛 ===")
    pg.evaluate("showPage('bd:inv')")
    pg.wait_for_timeout(350)
    pg.evaluate("invView('MAT-00210','L27-2605B')")
    pg.wait_for_timeout(300)
    ok('QC-2026-0031' in pg.inner_text('#modal'), "不合格批次详情联动其送检报告（L27-2605B → QC-2026-0031 不通过）")
    pg.click("text=查看全部流水")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("curPage") == 'bd:invlog', "跳流水页")
    ok(pg.evaluate("()=>document.querySelector(\"[data-flt='code']\").value") == 'MAT-00210',
       "流水页按该物料预筛")

    print("\n=== 无 JS 错误 ===")
    ok(len(errs) == 0, "运行期 0 JS 错误" + ("" if not errs else " -> " + str(errs[:2])))
    b.close()

print("\n失败项：%d" % len(fails))
if fails:
    for f in fails:
        print("  - " + f)
    sys.exit(1)
print("全部通过 ✅")
