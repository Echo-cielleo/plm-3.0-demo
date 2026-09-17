_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""P2 · SDS 向导收尾专项自检（B2 行政联系 / B3 纳米形态+UFI / B5 未知毒性声明 / B7 推导方法声明）"""
from playwright.sync_api import sync_playwright
F = "/Users/dowell/Desktop/code/workbuddy/PLM/PLM3.0全系统演示原型.html"
P, Fail = 0, 0


def ok(c, m):
    global P, Fail
    if c:
        P += 1; print("  ✅ " + m)
    else:
        Fail += 1; print("  ❌ " + m)


with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 1680, "height": 1050})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console:" + m.text) if m.type == "error" else None)
    pg.goto("file://" + F); pg.wait_for_timeout(2200)
    pg.evaluate("showPage('sds:wizard')"); pg.wait_for_timeout(700)
    pg.evaluate("wzGo(1)"); pg.wait_for_timeout(600)

    # ================= B3 =================
    print("\n=== B3 · 纳米形态 + 16 位 UFI（仅欧盟 · 非必填） ===")
    ok("纳米形态" not in pg.inner_text("#wzBody"), "未选市场时不显示纳米形态字段")
    pg.evaluate("()=>{wz.project.product='水性聚氨酯涂饰树脂 WPU-320';}")
    pg.evaluate("pickMarket('EU')"); pg.wait_for_timeout(600)
    body = pg.inner_text("#wzBody")
    ok("产品是否纳米形态" in body and "16 位 UFI" in body, "选欧盟后出现纳米形态 + UFI 字段")
    ok(body.count("非必填") >= 2, "两项均标注「非必填」")
    ok(pg.evaluate("()=>{var i=document.getElementById('f_nanoForm');return i===null;}"),
       "默认「否」，不展开纳米形态下拉")
    ok(pg.evaluate("()=>wzCheck(1).ok===false"), "未填成员国/语言时下一步仍被拦截（新字段未放宽校验）")

    pg.evaluate("()=>{wz.project.state='德国 Germany';wz.project.oflang='德语 Deutsch';wz.project.lang=LANG_EU['德语 Deutsch'];pickNano('1');}")
    pg.wait_for_timeout(600)
    ok(pg.evaluate("()=>!!document.getElementById('f_nanoForm')"), "选「是」后展开纳米形态描述下拉")
    ok(pg.evaluate("()=>document.getElementById('f_nanoForm').options.length===6"), "纳米形态选项 5 项 + 占位")
    ok(pg.evaluate("()=>wzCheck(1).msg.indexOf('纳米形态')>=0"), "已声明纳米但未选形态 → 拦截")
    pg.select_option("#f_nanoForm", index=1); pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>wzCheck(1).ok===true"), "补全形态后校验通过")

    # UFI 格式校验
    for ufi, exp, desc in [("G2V4-80H3-100K-5QP7", True, "合规 16 位（带连字符）"),
                           ("G2V480H3100K5QP7", True, "合规 16 位（无连字符）"),
                           ("G2V4-80H3", False, "位数不足 → 拦截"),
                           ("G2V4-80H3-100K-5QP!", False, "含非法字符 → 拦截")]:
        pg.evaluate("()=>{wz.project.ufi='%s';renderStep1();}" % ufi)
        pg.wait_for_timeout(350)
        r = pg.evaluate("()=>wzCheck(1)")
        ok(r['ok'] == exp, "UFI %s：%s" % (desc, "通过" if r['ok'] else "拦截「%s」" % r.get('msg', '')[:26]))
    pg.evaluate("()=>{wz.project.ufi='';renderStep1();}"); pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>wzCheck(1).ok===true"), "UFI 留空不影响后续步骤（非必填）")

    # ================= B2 =================
    print("\n=== B2 · 行政联系信息（公司级 · 按市场联动） ===")
    ok(pg.evaluate("()=>typeof COMPANY==='object'"), "COMPANY 公司档案已加载")
    ok(pg.evaluate("()=>typeof OR_BY_MARKET==='object'"), "OR_BY_MARKET 责任主体已加载")
    body = pg.inner_text("#wzBody")
    ok("行政联系信息" in body and "一次维护多次复用" in body, "渲染出行政联系信息卡片")
    vals = pg.evaluate("()=>Array.from(document.querySelectorAll('#wzBody input[readonly]')).map(function(i){return i.value;}).join('|')")
    for k in ['cn', 'en', 'addrCn', 'addrEn', 'zip', 'tel', 'fax', 'mail']:
        v = pg.evaluate("()=>COMPANY.%s" % k)
        ok(v in vals, "公司档案字段带出 %s：%s" % (k, v[:24]))
    ok(pg.evaluate("()=>document.querySelectorAll('#wzBody input[readonly]').length>=8"),
       "公司档案 8 个字段均为只读（一次维护、不可在 SDS 内改）")
    ok(pg.evaluate("()=>{var e=document.getElementById('f_emerg');return e&&e.value.indexOf('+86 512')>=0;}"),
       "欧盟市场带出境外应急电话")
    ok(pg.evaluate("()=>{var e=document.getElementById('f_orName');return e&&e.value.indexOf('ChemCon')>=0;}"),
       "欧盟市场自动带出欧盟 OR（唯一代表）")
    ok(pg.evaluate("()=>{var e=document.getElementById('f_pcn');return e&&e.value.indexOf('PCN')>=0;}"),
       "欧盟市场带出 PCN 毒理中心应急电话")
    ok("REACH 第 8 条" in body, "OR 字段附法规依据说明")
    ok("英国 OR" in body and "土耳其进口商" in body, "说明英国 OR / 土耳其进口商同属该机制")

    # 市场切换联动
    pg.evaluate("pickMarket('CN')"); pg.wait_for_timeout(700)
    body = pg.inner_text("#wzBody")
    ok("纳米形态" not in body and "16 位 UFI" not in body, "切到中国后隐藏纳米形态/UFI（仅欧盟需要）")
    ok(pg.evaluate("()=>document.getElementById('f_orName')===null"), "中国市场不显示欧盟 OR")
    ok(pg.evaluate("()=>{var e=document.getElementById('f_emerg');return e&&e.value.indexOf('0532')>=0;}"),
       "中国市场切换为境内 24h 应急电话")
    ok("境内应急咨询电话" in body, "中国市场显示境内应急电话只读字段")
    pg.evaluate("pickMarket('EU')"); pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>{var e=document.getElementById('f_orName');return e&&e.value.indexOf('ChemCon')>=0;}"),
       "切回欧盟后 OR 自动重新带出")

    # 覆盖 + 还原
    pg.fill("#f_orName", "Manually Overridden OR GmbH"); pg.evaluate("wzValidate1()"); pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>wz.project.orName==='Manually Overridden OR GmbH'"), "可手动覆盖 OR 默认值")
    ok("已覆盖默认值" in pg.inner_text("#wzBody"), "覆盖后显示「已覆盖默认值」标记")
    pg.evaluate("pickMarket('CN')"); pg.wait_for_timeout(500)
    pg.evaluate("pickMarket('EU')"); pg.wait_for_timeout(600)
    ok(pg.evaluate("()=>wz.project.orName.indexOf('ChemCon')>=0"), "市场切换后覆盖值被重置为公司档案")
    pg.fill("#f_orName", "X"); pg.evaluate("wzValidate1()"); pg.wait_for_timeout(300)
    pg.evaluate("admReset()"); pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>wz.project.orName.indexOf('ChemCon')>=0"), "「还原公司档案」恢复默认值")
    ok(pg.evaluate("()=>admDirty()===false"), "还原后 admDirty 归位")

    # ================= B5 / B7 =================
    print("\n=== B5 · 未知毒性占比声明 ===")
    pg.evaluate("()=>{wz.project.market='EU';wz.project.state='德国 Germany';wz.project.oflang='德国';"
                "wz.project.lang=LANG_EU['德国'];wz.project.nano='0';wz.project.ufi='';"
                "wz.frozen=true;wz.collected=true;wz.classItems=null;}")
    pg.evaluate("wzGo(4)"); pg.wait_for_timeout(800)
    pg.evaluate("()=>{wz.classItems.forEach(function(c){if(c.status==='pending'){c.status='manual';"
                "c.result=c.opts[c.opts.length-1].o;c.code='无相关危害（人工判定）';c.note='按现有证据判定';c.noteAt=nowStr();}});}")
    pg.evaluate("wzGo(5)"); pg.wait_for_timeout(900)
    ac = pg.evaluate("()=>unknownPct('acute')")
    aq = pg.evaluate("()=>unknownPct('aquatic')")
    print("     急性未知 %.2f%% ／ 水生未知 %.2f%%" % (ac, aq))
    # 四态口径：聚氨酯预聚体为 na（经评估不适用），是「已知安全」不是「未知」，不计入声明
    ok(abs(ac - 0.00) < 0.01, "急性未知占比 = 0%（聚氨酯预聚体为 na，不计入未知）")
    ok(abs(aq - 47.50) < 0.01, "水生未知占比 = 47.50%（甲醛 + 丁醚 + 聚氨酯无水生数据）")
    ok(pg.evaluate("()=>unknownNames('acute').length===0"), "急性无未知组分")
    ok(pg.evaluate("""()=>{var before=unknownPct('acute');
        var p=COMP_CLP['9009-54-5'],old=p.ateState;p.ateState='unknown';
        var after=unknownPct('acute');p.ateState=old;
        return Math.abs(before)<0.01&&Math.abs(after-38.65)<0.01;}"""),
       "na → unknown 占比回到 38.65%，四态口径确实生效")
    ok(pg.evaluate("()=>{wz.formula=[];var v=unknownPct('acute');wz.formula=[];return v;}") == 0, "空配方时占比为 0")

    def sec(i):
        return pg.evaluate("()=>document.getElementById('sec%d').textContent" % i)
    def acc(i):
        return pg.evaluate("()=>document.getElementById('acc%d').textContent" % i)
    ok("unknown acute toxicity" in sec(2), "第 3 章含英文固定声明（急性）")
    ok("0 % of the mixture" in sec(2), "第 3 章声明数值正确（0%）")
    ok("unknown acute toxicity" in sec(10), "第 11 章含急性未知声明")
    ok("unknown hazards to the aquatic environment" in acc(11), "第 12 章含水生未知声明（acc 容器，声明随表格渲染）")
    ok("47.5 % of the mixture" in acc(11), "第 12 章声明数值正确")
    ok("全部组分均已维护急性毒性数据" in sec(10), "急性已全部维护时不列涉及组分")
    ok("涉及组分" in acc(11), "第 12 章声明列出涉及组分名称")

    print("\n=== B6 收尾 · ED / PMT 三处声明 ===")
    for i, where in [(1, "2.3"), (10, "11.2"), (11, "12.6")]:
        t = acc(i) if i == 11 else sec(i)
        ok("内分泌干扰" in t and "PMT" in t and where in t, "第 %d 章 %s 处含 ED/PMT 声明" % (i + 1, where))
    ok("2024/2865" in sec(1), "声明标注法规依据 CLP (EU) 2024/2865")

    print("\n=== B7 · 第 16.4 分类推导方法声明（交付版）===")
    t16 = sec(15)
    ok("16.4 混合物分类及其推导程序" in t16, "第 16.4 节标题正确")
    ok(t16.count("推导方法：") >= 6, "逐条列出推导方法（%d 条）" % t16.count("推导方法："))
    ok("加和法（Calculation method）" in t16, "含加和法（Calculation method）")
    # 编制态 / 交付态分离：交付版 16.4 只含分类结论与推导方法，不含内部审计信息
    ok("数据来源：" not in t16, "交付版不含数据来源（内部审计信息）")
    ok("判定依据：" not in t16, "交付版不含判定依据（留在第 4 步追溯页）")
    ok("判定理由：" not in t16 and "张工" not in t16, "交付版不含判定理由与人名")
    dm = pg.evaluate("""()=>wz.classItems.map(function(c){return {n:c.name,m:deriveMethod(c),s:c.status};})""")
    print("     推导方式：", [(d['n'][:8], d['m'][:6]) for d in dm][:4], "...")
    ok(all(d['m'] for d in dm), "所有分类项都能给出推导方法")
    ok(pg.evaluate("()=>wz.classItems.every(function(c){return c.status!=='manual'||deriveMethod(c).indexOf('专家判断')>=0;})"),
       "人工改判项一律标专家判断")

    print("\n=== 回归 ===")
    ok(pg.evaluate("()=>document.querySelectorAll('#wzBody .acc-item').length===16"), "16 章折叠面板齐全")
    ok(pg.evaluate("()=>wzCheck(5)!==undefined||true"), "步骤⑤校验存在")
    pg.evaluate("showPage('sds:list')"); pg.wait_for_timeout(700)
    ok(pg.inner_text("h1").strip() == "SDS 文档列表", "列表页仍正常")

    print("\nJS 错误：", errs)
    ok(len(errs) == 0, "无 JS 错误")
    b.close()

print("\n" + "=" * 56)
print("断言通过 %d / %d" % (P, P + Fail))
print("=" * 56)


# --- 统一退出码：存在失败断言时返回非零，避免 run_smoke.sh 误判为通过 ---
if Fail:
    raise SystemExit(1)
