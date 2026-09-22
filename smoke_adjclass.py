_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""人工判定弹窗 ·「系统建议」标签修复验证"""
from playwright.sync_api import sync_playwright
F = "/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
P, Fail = 0, 0
def ok(c, m):
    global P, Fail
    if c: P += 1; print("  ✅ " + m)
    else: Fail += 1; print("  ❌ " + m)

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1680, "height": 1050})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console:" + m.text) if m.type == "error" else None)
    pg.goto("file://" + F); pg.wait_for_timeout(2200)
    pg.evaluate("showPage('sds:wizard')"); pg.wait_for_timeout(600)
    pg.evaluate("()=>{wz.frozen=true;wz.collected=true;wz.classItems=null;}")
    pg.evaluate("wzGo(4)"); pg.wait_for_timeout(800)

    def open_modal(cid):
        i = pg.evaluate("()=>wz.classItems.findIndex(function(c){return c.id==='%s';})" % cid)
        pg.evaluate("adjClass(%d)" % i); pg.wait_for_timeout(450)
        return pg.evaluate("""()=>{
          var rows=Array.from(document.querySelectorAll('#mBody table.tbl tbody tr')).map(function(tr){
            return {opt:tr.children[0].textContent.trim(),
                    tag:(tr.children[0].querySelector('.tag')||{}).textContent||'',
                    green:/green-bg/.test(tr.getAttribute('style')||'')};});
          return {head:document.querySelector('#mBody .notice').textContent,
                  sub:document.querySelector('#mBody .card-hd .sub').textContent,
                  rows:rows};}""")
    def save(val, code, note):
        pg.evaluate("()=>{var s=document.getElementById('adjRes');"
                    "var o=Array.from(s.options).filter(function(x){return x.textContent.indexOf('%s')>=0;})[0];"
                    "if(o)s.value=o.value;}" % val)
        pg.fill("#adjCode", code); pg.fill("#adjNote", note)
        pg.evaluate("()=>document.getElementById('mFoot').querySelector('.btn.primary').click()")
        pg.wait_for_timeout(500)

    print("\n=== ① pending 项（无系统建议）首次打开 ===")
    r = open_modal('resp')
    ok(r['head'].count("系统建议") >= 1 and "系统无法自动判定" in r['head'], "头部：系统建议 = 无法自动判定")
    ok(all(x['tag'] == '' for x in r['rows']), "表格内无任何「系统建议」标签（%d 行全空）" % len(r['rows']))
    ok(all(not x['green'] for x in r['rows']), "无绿色高亮行（本次无建议）")
    ok("本次无建议" in r['sub'], "表头注明「本次无建议」")
    print("     表头：", r['sub'].strip())

    print("\n=== ② 判定保存后再次打开（原来会误标「系统建议」） ===")
    save('类别 1（呼吸道致敏）', 'H334 吸入可能导致过敏或哮喘症状', '已取得吸入致敏实测报告，按 Cat.1 判定')
    ok(pg.evaluate("()=>wz.classItems.filter(function(c){return c.id==='resp';})[0].result") == '类别 1（呼吸道致敏）', "判定已保存")
    ok(pg.evaluate("()=>wz.classItems.filter(function(c){return c.id==='resp';})[0].sug") is None, "sug 仍为 null（系统从未给过建议）")
    r = open_modal('resp')
    sys_tags = [x for x in r['rows'] if x['tag'] == '系统建议']
    ok(len(sys_tags) == 0, "再次打开后不再冒出「系统建议」标签")
    cur = [x for x in r['rows'] if x['tag'] == '当前判定']
    ok(len(cur) == 1 and cur[0]['opt'].startswith('类别 1（'), "所选行标橙色「当前判定」：%s" % (cur[0]['opt'][:14] if cur else '无'))
    ok("系统无法自动判定" in r['head'], "头部仍如实显示系统无建议（未被改写）")

    print("\n=== ③ auto 项（有系统建议）首次打开 ===")
    r = open_modal('skin')
    sug = pg.evaluate("()=>wz.classItems.filter(function(c){return c.id==='skin';})[0].sug")
    print("     系统建议：", sug)
    ok(all(x['tag'] == '' for x in r['rows']), "首次打开无行内标签（已按要求删除冗余标签）")
    g = [x for x in r['rows'] if x['green']]
    ok(len(g) == 1 and g[0]['opt'] == sug, "绿色高亮唯一且 = 系统建议行「%s」" % sug)
    ok(("系统建议：" + sug) in r['head'], "头部色块显示系统建议：%s" % sug)
    ok("绿色高亮 = 系统建议" in r['sub'], "表头说明绿色高亮含义")

    print("\n=== ④ 改判后再次打开：建议不动，改判可辨 ===")
    save('腐蚀 类别 1A/1B/1C', 'H314 造成严重皮肤灼伤和眼损伤', '取得游离酸实测报告 pH<2，按从严口径改判')
    r = open_modal('skin')
    g = [x for x in r['rows'] if x['green']]
    ok(len(g) == 1 and g[0]['opt'] == sug, "系统建议行仍是「%s」，未跟着改判走" % sug)
    cur = [x for x in r['rows'] if x['tag'] == '当前判定']
    ok(len(cur) == 1 and cur[0]['opt'].startswith('腐蚀 类别 1A'), "改判行标橙色「当前判定」：%s" % (cur[0]['opt'][:14] if cur else '无'))
    ok(("系统建议：" + sug) in r['head'], "头部仍显示原始系统建议")
    ok("已改判" in r['head'] and "当前判定：腐蚀 类别 1A/1B/1C" in r['head'], "头部追加「当前判定：…（已改判）」")

    print("\n=== ⑤ 采纳系统建议时不报改判 ===")
    save(sug, 'H315 造成皮肤刺激', '复核后采纳系统建议')
    r = open_modal('skin')
    ok("已改判" not in r['head'], "采纳建议后头部无「已改判」提示")
    cur = [x for x in r['rows'] if x['tag'] == '当前判定']
    ok(len(cur) == 0, "采纳建议时不额外标「当前判定」（避免与系统建议重复）")

    print("\n=== ⑥ 数据完整性 ===")
    ok(pg.evaluate("()=>wz.classItems.every(function(c){return 'sug' in c;})"), "所有分类项均已固化 sug 字段")
    # 注：第三十六轮起 pending 分两类——need='confirm' 的项是「系统建议·待人工确认」，
    # 必须保留建议值（否则弹窗里就没法显示「系统建议：xxx」）；只有缺算式/缺输入的
    # judge 型 pending 项才 sug=null。此处按当前设计分两类断言（同步过时断言，未降标）。
    ok(pg.evaluate("()=>wz.classItems.filter(function(c){return c.status==='pending'&&c.need!=='confirm';}).every(function(c){return c.sug===null;})"),
       "judge 型 pending 项 sug = null（系统从未给过建议）")
    ok(pg.evaluate("()=>wz.classItems.filter(function(c){return c.need==='confirm';}).every(function(c){return !!c.sug&&c.sug===c.result;})"),
       "confirm 型 pending 项保留系统建议值（第三十六轮设计）")
    ok(pg.evaluate("()=>wz.classItems.filter(function(c){return c.status!=='pending';}).every(function(c){return c.sug===c.result||c.status==='manual';})"), "auto 项 sug = 原始 result")

    print("\nJS 错误：", errs)
    ok(len(errs) == 0, "无 JS 错误")
    b.close()

print("\n" + "=" * 56)
print("断言通过 %d / %d" % (P, P + Fail))
print("=" * 56)


# --- 统一退出码：存在失败断言时返回非零，避免 run_smoke.sh 误判为通过 ---
if Fail:
    raise SystemExit(1)
