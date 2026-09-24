_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""SDS 章节增强专项自检：G2 第 3 章组分表 / G3 第 8 章 OEL 表 / G14 8.2 补全"""
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
    pg.evaluate("wzGo(1)"); pg.wait_for_timeout(500)
    pg.evaluate("()=>{wz.project.product='水性聚氨酯涂饰树脂 WPU-320';}")
    pg.evaluate("pickMarket('EU')"); pg.wait_for_timeout(600)
    pg.evaluate("wzGo(4)"); pg.wait_for_timeout(600)
    pg.evaluate("wzGo(5)"); pg.wait_for_timeout(900)

    HEADS = """(i)=>{var t=document.querySelector('#acc'+i+' table');
        if(!t)return '';
        return [].slice.call(t.querySelectorAll('thead th')).map(function(x){return x.textContent.trim();}).join('|');}"""
    ROWS = """(i)=>{var t=document.querySelector('#acc'+i+' table');
        return t?[].slice.call(t.querySelectorAll('tbody tr')).map(function(r){
          return [].slice.call(r.cells).map(function(c){return c.textContent.trim();}).join('|');
        }):[];}"""

    print("\n=== G2 · 第 3 章组分表 ===")
    ok(pg.evaluate("()=>document.querySelectorAll('#acc2 table').length===1"),
       "第 3 章渲染出 1 张表格")
    ok(pg.evaluate("(%s)(2)" % HEADS) ==
       "物质名称|CAS 号|EC 号|REACH 注册号|浓度|分类|SCL / M 因子 / ATE",
       "7 列对齐真实 SDS（含 EC 号 / REACH 注册号 / SCL·M·ATE）")
    ok(pg.evaluate("()=>document.querySelectorAll('#acc2 tbody tr').length===wz.formula.length"),
       "行数 == 配方组分数")
    r2 = pg.evaluate("(%s)(2)" % ROWS)
    ok(any("231-791-2" in r for r in r2), "EC 号从组分库带出（水 231-791-2）")
    ok(any("01-2119456816-27-xxxx" in r for r in r2), "REACH 注册号带出（甲醛）")
    ok(any("聚合物豁免（Art.2(9)）" in r for r in r2), "聚合物显示豁免而非 N/A")
    ok(any("区间披露" in r for r in r2), "保密组分按区间披露浓度")
    ok(any("保密" in r for r in r2), "编制视图中标出保密组分")
    ok(any("Skin Sens. 1 ≥ 0.2%" in r for r in r2), "SCL 已进入第 3 章")
    ok(pg.evaluate("()=>document.getElementById('sec2').textContent.indexOf('|')<0"),
       "文本块不再内嵌竖线分隔的组分行（已改由表格承载）")
    ok(pg.evaluate("()=>document.getElementById('sec2').textContent.indexOf('见本节组分表')>=0"),
       "文本块指向表格，两处不重复")

    print("\n=== G2 · 编辑与交付视图 ===")
    pg.evaluate("secEdit(2)"); pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>document.querySelectorAll('#acc2 table').length===1"),
       "临时编辑第 3 章时表格仍在（编辑的是文本块，不是表格）")
    ok(pg.evaluate("()=>!!document.querySelector('#acc2 textarea')"), "文本块已切为 textarea")
    pg.evaluate("secReset(2)"); pg.wait_for_timeout(500)
    pg.evaluate("setWzView('deliver')"); pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>{var d=document.querySelector('.doc-page');return !!d && d.querySelectorAll('table').length>=1;}"),
       "交付视图同样有组分表（文档流内）")
    ok(pg.evaluate("()=>{var d=document.querySelector('.doc-page');return d && d.textContent.indexOf('保密')<0;}"),
       "交付视图不出现「保密」内部标记")
    ok(pg.evaluate("()=>{var d=document.querySelector('.doc-page');return d && d.textContent.indexOf('区间披露')<0;}"),
       "交付视图不出现「区间披露」内部标记")
    pg.evaluate("setWzView('edit')"); pg.wait_for_timeout(600)

    print("\n=== G3 · 第 8 章职业接触限值表 ===")
    ok(pg.evaluate("()=>document.querySelectorAll('#acc7 table').length===1"),
       "第 8 章渲染出 1 张表格")
    ok(pg.evaluate("(%s)(7)" % HEADS) ==
       "国家 / 地区|物质|EC|CAS|原始限值类型|长期限值|短期限值|上限值|单位|皮肤 / 致敏|备注|数据版本",
       "第 8 章 12 列保留原始限值类型、单位和语义槽位")
    r7 = pg.evaluate("(%s)(7)" % ROWS)
    ok(not any("乙二醇单丁醚：20 ppm（8h TWA，EU IOELV）" in r for r in r7),
       "旧的硬编码文本已移除")
    ok(all(any(f["cas"] in r for r in r7) for f in pg.evaluate("()=>wz.formula")),
       "表里每一行都对应当前配方的组分")
    ok(any("欧盟（EU）" in r and "0.37" in r for r in r7), "欧盟甲醛限值读取 IOELV")
    ok(not any("德国" in r or "波兰" in r for r in r7), "不合并成员国限值")
    ok(any("当前有效 OEL 数据集未维护该组分限值" in r for r in r7), "未维护记录不写成不适用")
    ok("V2026.1" in pg.evaluate("()=>document.querySelector('#acc7').textContent"), "第 8 章显示有效数据集版本")

    print("\n=== G3 · 随目标市场联动 ===")
    pg.evaluate("pickMarket('CN')"); pg.wait_for_timeout(600)
    pg.evaluate("wzGo(5)"); pg.wait_for_timeout(800)
    r7cn = pg.evaluate("(%s)(7)" % ROWS)
    ok(any("中国" in r and "0.5" in r and "MAC" in r for r in r7cn), "中国甲醛使用 GBZ 2.1 MAC 上限值")
    ok(not any("欧盟（EU）" in r for r in r7cn), "不合并欧盟限值")
    ok("2019 版" in pg.evaluate("()=>document.querySelector('#acc7').textContent"), "中国数据版本显示 2019 版")
    pg.evaluate("pickMarket('EU')"); pg.wait_for_timeout(600)
    pg.evaluate("wzGo(5)"); pg.wait_for_timeout(800)

    print("\n=== G14 · 第 8 章 8.1 / 8.2 结构 ===")
    t7 = pg.evaluate("()=>document.getElementById('sec7').textContent")
    for s in ['8.1.1 职业接触限值', '8.1.2 附加职业接触限值', '8.1.3 DNEL / DMEL 与 PNEC',
              '8.2.1 工程控制', '8.2.2 个人防护装备', '热危害', '8.2.3 环境暴露控制']:
        ok(s in t7, "含 %s" % s)
    ok("未维护本配方组分的生物监测指标记录" in t7 and "Not available" in t7,
       "生物监测记录缺失按当前 OEL 数据集说明，不编造不存在")

    print("\n=== 回归 ===")
    ok(pg.evaluate("()=>document.querySelectorAll('#acc2 table,#acc7 table').length===2"),
       "只有第 3 / 8 章有表格，其余章节仍是纯文本")
    ok(pg.evaluate("()=>typeof compTableHtml==='function'&&typeof oelTableHtml==='function'"),
       "两个渲染函数都在 23z 分片里可用")
    ok(pg.evaluate("()=>{wz.formula=[];var a=compTableHtml(),b=oelTableHtml();return a.indexOf('待生成')>=0&&b.indexOf('待生成')>=0;}"),
       "空配方时两表都有兜底文案")
    ok(pg.evaluate("()=>!!document.body&&typeof wz==='object'&&!!document.getElementById('sec2')"),
       "页面存活")

    print("\nJS 错误：", errs)
    ok(len(errs) == 0, "无 JS 错误")

    print("\n" + "=" * 56)
    print("断言通过 %d / %d" % (P, P + Fail))
    print("=" * 56)


# --- 统一退出码：存在失败断言时返回非零，避免 run_smoke.sh 误判为通过 ---
if Fail:
    raise SystemExit(1)
