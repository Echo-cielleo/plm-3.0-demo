_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""SDS 收尾专项自检：编制态/交付态分离 + G1 标签元素 + G7 第16章子条目 + G8 法规引用 + G9 产品标识 + G12 应急电话"""
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

    # ============ 步骤 1：G9 / G12 新字段 ============
    print("\n=== G12 · 应急电话服务时段与非工作时间可用性 ===")
    pg.evaluate("()=>{wz.project.product='水性聚氨酯涂饰树脂 WPU-320';}")
    pg.evaluate("pickMarket('EU')"); pg.wait_for_timeout(600)
    body = pg.inner_text("#wzBody")
    ok("服务时段" in body, "出现「服务时段」输入项")
    ok("非工作时间可用" in body, "出现「非工作时间可用 YES/NO」选择")
    ok(pg.evaluate("()=>wz.project.emerg24==='0'"), "默认 NO")
    pg.evaluate("pickEmerg24('1')"); pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>wz.project.emerg24==='1'"), "可切到 YES")
    pg.evaluate("()=>{var e=document.getElementById('f_emergHours');e.value='9:00–17:30（工作日）';e.dispatchEvent(new Event('input'));}")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>wz.project.emergHours.indexOf('9:00')>=0"), "服务时段写入状态")

    print("\n=== G9 · 1.1 产品标识补全 ===")
    ok(pg.evaluate("()=>!!document.getElementById('f_idxNo')"), "欧盟下出现索引号 Index Number")
    ok(pg.evaluate("()=>!!document.getElementById('f_reachNo')"), "欧盟下出现 REACH 注册号")
    pg.evaluate("()=>{wz.project.state='德国 Germany';wz.project.oflang='德语 Deutsch';"
                "wz.project.lang=LANG_EU['德语 Deutsch'];wz.project.ufi='G2V4-80H3-100K-5QP7';"
                "wz.project.idxNo='605-001-00-5';renderStep1();}")
    pg.wait_for_timeout(600)
    ok(pg.evaluate("()=>wzCheck(1).ok===true"), "新字段均为非必填，不影响通过校验")

    # 直接跳到第 4 步（分类）再回第 5 步
    pg.evaluate("()=>{wz.frozen=true;wz.frozenAt='2026-09-01 10:00';wz.collected=true;wzGo(4);}")
    pg.wait_for_timeout(800)

    # ============ 步骤 4：G1 标签元素 ============
    print("\n=== G1 · 标签要素由分类结论自动推导 ===")
    ok("由分类结论自动推导" in pg.inner_text("#wzBody"), "标签要素框标注自动推导")
    lb = pg.evaluate("()=>labelParts()")
    print("     象形图：", lb["pics"], "信号词：", lb["sig"], "P 语句", len(lb["ps"]), "条")
    ok("GHS07（感叹号）" in lb["pics"], "H315/H317/H319 推出 GHS07 感叹号")
    ok("GHS08（健康危害）" in lb["pics"], "H350 推出 GHS08 健康危害")
    ok(lb["sig"] == "danger", "含 H350（致癌）时信号词为 danger 危险")
    ok("P261" in lb["ps"] and "P272" in lb["ps"] and "P280" in lb["ps"], "H317 推出 P261/P272/P280")
    ok("P302+P352" in lb["ps"] and "P333+P313" in lb["ps"], "推出 P302+P352 / P333+P313（与示例 SDS 一致）")
    ok("P201" in lb["ps"] and "P308+P313" in lb["ps"], "H350 推出 P201 / P308+P313")
    ok(pg.evaluate("()=>{var s=document.querySelector('.signal-word');return s.className.indexOf('danger')>=0;}"),
       "信号词渲染为红色 danger 样式")
    # 改判一项，验证标签要素跟着变
    pg.evaluate("()=>{wz.classItems.forEach(function(c){if(c.id==='carc'){c.status='manual';c.result='不分类（无需分类）';c.code='—';}});renderStep4();}")
    pg.wait_for_timeout(600)
    lb2 = pg.evaluate("()=>labelParts()")
    ok("GHS08（健康危害）" not in lb2["pics"], "致癌改判不分类后 GHS08 消失（联动生效）")
    ok(lb2["sig"] == "warning", "无 danger 类危害时信号词降为 warning")
    pg.evaluate("()=>{wz.classItems.forEach(function(c){if(c.id==='carc'){c.status='auto';c.result='类别 1B';c.code='H350 可能致癌';}});renderStep4();}")
    pg.wait_for_timeout(500)

    print("\n=== G1 · EUH 补充危害说明勾选 ===")
    ok("补充危害说明" in pg.inner_text("#wzBody"), "第 4 步出现 EUH 勾选区")
    ok("EUH066" in pg.inner_text("#wzBody") and "EUH071" in pg.inner_text("#wzBody"), "列出 EUH066 / EUH071 供人工勾选")
    pg.evaluate("toggleEuh('EUH066',true)"); pg.wait_for_timeout(400)
    ok("EUH066" in pg.evaluate("()=>euhList()"), "勾选后进入 EUH 清单")
    pg.evaluate("toggleEuh('EUH066',false)"); pg.wait_for_timeout(300)
    ok("EUH066" not in pg.evaluate("()=>euhList()"), "取消勾选后移出清单")
    pg.evaluate("()=>{wz.classItems.forEach(function(c){if(c.id==='ed'){c.result='ED 类别 1（已知/推定内分泌干扰）';c.status='manual';}});renderStep4();}")
    pg.wait_for_timeout(600)
    ok("EUH380" in pg.evaluate("()=>euhAuto()"), "ED 类别 1 自动带出 EUH380")
    pg.evaluate("()=>{wz.classItems.forEach(function(c){if(c.id==='ed'){c.result='不分类';c.code='无 ED 组分，或含量低于 0.1%';c.status='auto';}});renderStep4();}")
    pg.wait_for_timeout(500)

    # ============ 步骤 5：编制态 / 交付态分离 ============
    print("\n=== 编制态 / 交付态分离 ===")
    pg.evaluate("wzGo(5)"); pg.wait_for_timeout(900)
    ok(pg.evaluate("()=>wz.view==='edit'"), "默认进入编制视图")
    et = pg.inner_text("#wzBody")
    ok("系统覆盖度" in et, "编制视图显示系统覆盖度标签")
    ok("内部批注" in et, "编制视图显示内部批注块")
    ok(pg.evaluate("()=>document.querySelectorAll('#wzBody .acc-tools').length===16"), "编制视图每章有编辑工具条")
    ok(pg.evaluate("()=>secNotes(0).length>0"), "第 1 章有内部批注（物料编码/快照版本）")
    ok(pg.evaluate("()=>secNotes(15).length>0"), "第 16 章有内部批注（证据链位置说明）")

    # 交付态正文不得含内部标记
    dirty = pg.evaluate("()=>deliverScan()")
    ok(len(dirty) == 0, "交付自检：16 章正文无内部信息残留%s" % ("" if not dirty else " → " + str(dirty)))
    for i in range(16):
        t = pg.evaluate("()=>draftText(%d)" % i)
        assert "【需人工审核】" not in t, "第 %d 章仍含【需人工审核】" % (i + 1)
    ok(True, "16 章正文均不含【需人工审核】标记")
    t1 = pg.evaluate("()=>draftText(0)")
    ok("MAT-00127" not in t1 and "FORM-WPU320-V1.0" not in t1, "第 1 章已隐去内部物料编码与配方快照版本")
    t3 = pg.evaluate("()=>draftText(2)")
    ok("物质身份未被隐藏" not in t3, "第 3 章已移除保密披露策略说明")
    t16 = pg.evaluate("()=>draftText(15)")
    ok("公司档案" not in t16 and "数据来源优先级" not in t16 and "张工" not in t16,
       "第 16 章已移除系统自述、取数策略与人名")

    print("\n=== 交付预览（客户 / 监管）===")
    pg.evaluate("setWzView('deliver')"); pg.wait_for_timeout(800)
    dt = pg.inner_text("#wzBody")
    ok(pg.evaluate("()=>wz.view==='deliver'"), "切换到交付预览")
    ok("系统覆盖度" not in dt, "交付预览无系统覆盖度标签")
    ok("内部批注" not in dt, "交付预览无内部批注块")
    ok(pg.evaluate("()=>document.querySelectorAll('#wzBody .acc-tools').length===0"), "交付预览无编辑工具条")
    ok("SAFETY DATA SHEET" in dt, "交付预览有文档抬头")
    ok("交付自检通过" in dt, "显示交付自检通过徽标")

    # ============ G7 第 16 章子条目 ============
    print("\n=== G7 · 第 16 章 16.1~16.8 子条目 ===")
    for k in ["16.1 修订说明", "16.2 缩略语", "16.3 重要文献参考", "16.4 混合物分类",
              "16.5 相关 H 语句全文", "16.6 培训说明", "16.7 进一步信息", "16.8 读者须知"]:
        ok(k in t16, "第 16 章含 %s" % k)
    ok("ADR：" in t16 and "UFI：" in t16 and "vPvM：" in t16, "16.2 缩略语表内容齐备")
    ok("H317：" in t16 and "H350：" in t16, "16.5 列出相关 H 语句全文")
    ok("[混合物分类]" in t16, "16.5 标注 H 语句来源（混合物/组分）")

    # ============ G8 法规引用 ============
    print("\n=== G8 · 第 16.1 法规依据引用 ===")
    ok("1907/2006" in t16 and "2020/878" in t16, "点名 REACH 1907/2006 与修订 2020/878")
    ok("1272/2008" in t16 and "2024/2865" in t16, "点名 CLP 1272/2008 与修订 2024/2865（消除 B6 自相矛盾）")
    cn = pg.evaluate("()=>legalBasis('CN')")
    ok("GB/T 16483" in cn and "GB 30000" in cn, "中国市场法规依据正确")

    # ============ G9 / G12 落到第 1 章 ============
    print("\n=== G9 / G12 · 落位到第 1 章 ===")
    ok("1.1 产品标识" in t1, "第 1 章有 1.1 产品标识小节")
    ok("UFI：G2V4-80H3-100K-5QP7" in t1, "UFI 归位到 1.1")
    ok("Nanoform is NOT covered" in t1, "纳米形态声明归位到 1.1 Additional identification")
    ok("索引号（Index Number）：605-001-00-5" in t1, "Index Number 写入 1.1")
    ok("See section 3" in t1, "未填的 REACH 注册号输出 See section 3")
    ok("1.2.1 确定用途" in t1 and "1.2.2 建议不用的用途" in t1, "1.2 分确定用途与建议不用的用途")
    ok("1.3 安全数据表供应商" in t1 and "华东新材料" in t1, "1.3 输出供应商（制造商）信息")
    ok("1.4 紧急电话号码" in t1, "1.4 独立小节")
    ok("服务时段：9:00–17:30" in t1, "1.4 含服务时段声明")
    ok("Available outside office hours）：YES" in t1, "1.4 含非工作时间可用 YES/NO")

    # ============ 步骤 4 UI 归一 ============
    print("\n=== UI 归一 · 步骤说明位置 ===")
    pg.evaluate("wzGo(4)"); pg.wait_for_timeout(800)
    ok(pg.evaluate("()=>!!document.getElementById('wzGuide')"), "存在 #wzGuide 容器")
    ok(pg.evaluate("""()=>{
        var s=document.getElementById('wzSteps'),g=document.getElementById('wzGuide'),b=document.getElementById('wzBody');
        if(!s||!g||!b)return false;
        return !!(s.compareDocumentPosition(g)&Node.DOCUMENT_POSITION_FOLLOWING)
            && !!(g.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);}"""),
       "wzGuide 夹在步骤导航与内容区之间")
    gtxt, btxt = pg.inner_text("#wzGuide"), pg.inner_text("#wzBody")
    ok("第 4 步 · 分类建议与证据追溯" in gtxt, "第 4 步说明已渲染到导航下方")
    ok("第 4 步 · 分类建议与证据追溯" not in btxt, "说明已从内容区移除")
    ok(pg.evaluate("()=>document.querySelectorAll('#wzBody > .notice.warn').length===0"),
       "内容区不再有整屏宽橙色横幅")

    print("\n=== UI 归一 · 三参数说明改悬停 ===")
    ok(pg.evaluate("()=>!!GLOSSARY['SCL']"), "GLOSSARY 含 SCL 词条（新增）")
    ok(pg.evaluate("()=>!!GLOSSARY['EUH']"), "GLOSSARY 含 EUH 词条（新增）")
    ok(pg.evaluate("()=>GLOSSARY['M 因子'].indexOf('Aquatic Acute 1')>=0"),
       "M 因子释义已修正：急性 + 慢性均适用")
    # 注意：.term 的 textContent 含 tooltip 全文，要读内部 .tt 才是术语本身
    ok(pg.evaluate("""()=>{
        var ns=document.querySelectorAll('#wzBody table thead .term .tt'),ts=[];
        ns.forEach(function(n){ts.push(n.textContent.trim());});
        return ts.length===3&&ts.indexOf('SCL')>=0&&ts.indexOf('M 因子')>=0&&ts.indexOf('ATE')>=0;}"""),
       "SCL / M 因子 / ATE 三词在表头上，且均为悬停术语")
    ok(pg.evaluate("""()=>{
        var ns=document.querySelectorAll('#wzBody .notice.grey .term .tt'),ts=[];
        ns.forEach(function(n){ts.push(n.textContent.trim());});
        return ts.indexOf('SCL')<0&&ts.indexOf('M 因子')<0&&ts.indexOf('ATE')<0;}"""),
       "灰色说明框里已不再重复这三个词")
    ok(pg.evaluate("""()=>{
        var g=document.querySelector('#wzBody .notice.grey');
        return !!g&&/表头带下划线.*悬停查看/.test(g.textContent);}"""),
       "说明框改为指向表头悬停")
    ok(pg.evaluate("""()=>{
        var g=document.querySelector('#wzBody .notice.grey');
        return !!g&&/橙底行.*没有可用的 ATE/.test(g.textContent)
              &&g.textContent.indexOf('已知安全')>=0
              &&g.textContent.indexOf('组分基础数据')>=0;}"""),
       "橙底行口径改为四态，并指明维护入口是组分基础数据")
    ok("必要输入" in btxt, "保留「必要输入」提示")

    print("\n=== 悬停气泡排版（表头内） ===")
    ok(pg.evaluate("()=>document.querySelectorAll('#wzBody table thead th .term').length===3"),
       "表头共 3 个悬停术语")
    pg.hover("#wzBody table thead th:nth-child(4) .term"); pg.wait_for_timeout(400)
    ok(pg.evaluate("""()=>{
        var t=document.querySelector('#wzBody table thead th:nth-child(4) .term .tp');
        if(!t)return false;
        var r=getComputedStyle(t);
        return r.display!=='none'&&r.whiteSpace==='normal';}"""),
       "SCL 气泡已显示，且 white-space 为 normal（不再继承 th 的 nowrap）")
    ok(pg.evaluate("""()=>{
        var t=document.querySelector('#wzBody table thead th:nth-child(4) .term .tp');
        if(!t||getComputedStyle(t).display==='none')return false;
        return t.scrollWidth<=t.clientWidth+2&&t.getBoundingClientRect().width<=313;}"""),
       "SCL 气泡正文自动换行，未撑破气泡宽度")
    pg.hover("#wzBody table thead th:nth-child(5) .term"); pg.wait_for_timeout(400)
    ok(pg.evaluate("""()=>{
        var t=document.querySelector('#wzBody table thead th:nth-child(5) .term .tp');
        if(!t||getComputedStyle(t).display==='none')return false;
        return t.scrollWidth<=t.clientWidth+2;}"""),
       "M 因子气泡正文自动换行")
    pg.hover("#wzBody table thead th:nth-child(6) .term"); pg.wait_for_timeout(400)
    ok(pg.evaluate("""()=>{
        var t=document.querySelector('#wzBody table thead th:nth-child(6) .term .tp');
        if(!t||getComputedStyle(t).display==='none')return false;
        var card=t.closest('.card');
        return t.scrollWidth<=t.clientWidth+2
            && t.getBoundingClientRect().right<=card.getBoundingClientRect().right+2;}"""),
       "末列 ATE 气泡换行且右对齐，未越出卡片右边界")

    print("\n=== UI 归一 · EUH 说明改悬停 ===")
    ok(pg.evaluate("""()=>{
        var h=[].slice.call(document.querySelectorAll('#wzBody h3'));
        for(var i=0;i<h.length;i++){if(h[i].textContent.indexOf('补充危害说明')>=0){
            if(h[i].innerHTML.indexOf('class="term"')<0)return false;
            return !h[i].closest('.card').querySelector('.notice.grey');}}
        return false;}"""),
       "EUH 标题带悬停术语，且卡片内说明框已移除")

    print("\n=== UI 归一 · 待判定提示挪到小标题旁 ===")
    pend_n = pg.evaluate("()=>wz.classItems.filter(function(c){return c.status==='pending';}).length")
    ok(pend_n == 2, "当前有 %d 项待人工判定" % pend_n)
    ok(pg.evaluate("""()=>{
        var h=[].slice.call(document.querySelectorAll('#wzBody h3'));
        for(var i=0;i<h.length;i++){if(h[i].textContent.indexOf('分类证据追溯')>=0){
            return h[i].parentNode.textContent.indexOf('项待人工判定')>=0;}}
        return false;}"""),
       "「N 项待人工判定」标签在「分类证据追溯」标题旁")
    ok(pg.evaluate("()=>!!document.getElementById('evc0')"), "证据卡片带 id（供跳转高亮）")
    pg.evaluate("jumpPend()"); pg.wait_for_timeout(600)
    ok(pg.evaluate("""()=>{
        var i=-1;wz.classItems.forEach(function(c,k){if(i<0&&c.status==='pending')i=k;});
        var e=document.getElementById('evc'+i);return !!(e&&e.style.outline);}"""),
       "点击标签可跳转并高亮第一个待判定项")

    print("\n=== UI 归一 · 其他步骤说明同步上移 ===")
    pg.evaluate("wzGo(2)"); pg.wait_for_timeout(700)
    ok("第 2 步 · 输入配方" in pg.inner_text("#wzGuide"), "第 2 步说明移至导航下")
    pg.evaluate("wzGo(3)"); pg.wait_for_timeout(700)
    ok("第 3 步 · 系统汇集受控数据" in pg.inner_text("#wzGuide"), "第 3 步说明移至导航下")
    pg.evaluate("setWzView('edit')"); pg.wait_for_timeout(600)
    pg.evaluate("wzGo(5)"); pg.wait_for_timeout(700)
    ok("第 5 步 · 生成 SDS 草案" in pg.inner_text("#wzGuide"), "第 5 步说明移至导航下")
    pg.evaluate("setWzView('deliver')"); pg.wait_for_timeout(700)
    ok("第 5 步 · 交付预览" in pg.inner_text("#wzGuide"), "切交付视图时说明同步刷新")
    pg.evaluate("setWzView('edit')"); pg.wait_for_timeout(600)
    pg.evaluate("wzGo(6)"); pg.wait_for_timeout(700)
    ok("第 6 步 · 人工审核与批准发布" in pg.inner_text("#wzGuide"), "第 6 步说明移至导航下")
    pg.evaluate("wzGo(1)"); pg.wait_for_timeout(700)
    ok(pg.inner_text("#wzGuide").strip() == "", "回到第 1 步时说明区清空（无残留）")

    # ============ 回归 ============
    print("\n=== 回归 ===")
    pg.evaluate("wzGo(5)"); pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>document.querySelectorAll('#wzBody .acc-item').length===16"), "16 章折叠面板齐全")
    ok(pg.evaluate("()=>{wz.project.market='CN';return legalBasis('CN').indexOf('GB/T 16483')>=0;}"), "切中国市场法规依据联动")
    pg.evaluate("()=>{wz.project.market='EU';}")
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
