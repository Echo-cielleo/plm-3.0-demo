_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""[27z5] 产品目录树专项自检
   数据源：产品目录树.xlsx → 3 大类 / 28 一级 / 145 二级
   口径：目录树只读字典，挂在产品基础信息列表页左侧（方案 A）；产品挂「能确定的最深一级」，
        蒙囿剂等在树中无对应的产品留空、进「未归类」等开会确认。"""
import pathlib
from playwright.sync_api import sync_playwright

F = str(pathlib.Path('PLM3.0全系统演示原型.html').resolve())
PASS, FAIL = [], []


def ok(cond, msg):
    (PASS if cond else FAIL).append(msg)
    print(("  [OK] " if cond else "  [FAIL] ") + msg)


with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=_CHROME_PATH, args=["--no-sandbox"])
    pg = b.new_page(viewport={'width': 1440, 'height': 1000})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("file://" + F)
    pg.wait_for_timeout(1600)

    print("\n== 1. 目录数据完整性 ==")
    stat = pg.evaluate("""()=>({
        cat:PROD_CATALOG.length,
        l1:PROD_CATALOG.reduce((n,c)=>n+(c.c||[]).length,0),
        l2:PROD_CATALOG.reduce((n,c)=>n+(c.c||[]).reduce((m,x)=>m+(x.c?x.c.length:0),0),0),
        names:PROD_CATALOG.map(c=>c.n)})""")
    ok(stat['cat'] == 3 and stat['l1'] == 28 and stat['l2'] == 144,
       "3 大类 / 28 一级 / 144 二级（实际 %d/%d/%d）" % (stat['cat'], stat['l1'], stat['l2']))
    ok(stat['names'] == ['水场产品', '涂饰产品', '颜料膏'], "大类名称：%s" % "、".join(stat['names']))

    print("\n== 2. 列表页左树渲染 ==")
    pg.evaluate("()=>showPage('prod:list')")
    pg.wait_for_timeout(700)
    ok(pg.eval_on_selector_all('.pc-side', 'els=>els.length') == 1, "左侧目录树容器存在")
    ok(pg.eval_on_selector_all('#lpHost', 'els=>els.length') == 1, "右侧列表容器存在")
    lines = pg.eval_on_selector_all('.pc-line', 'els=>els.map(e=>e.innerText.replace(/\\n/g," ").trim())')
    ok(any('全部产品' in t for t in lines), "树的首行为「全部产品」")
    ok(any('未归类' in t for t in lines), "存在「未归类」分组")
    l1_lines = pg.eval_on_selector_all('.pc-lv1', 'els=>els.length')
    ok(l1_lines == 28, "大类默认展开且只露出一级目录 %d 条" % l1_lines)
    ok(pg.eval_on_selector_all('.pc-lv2', 'els=>els.length') == 0, "二级目录默认收起")
    zero = pg.eval_on_selector_all('.pc-line.zero', 'els=>els.length')
    ok(zero > 0, "无产品的目录节点弱化显示（%d 条）" % zero)

    print("\n== 3. 点击筛选 ==")
    rows_n = "()=>document.querySelectorAll('#lpHost tbody tr').length"
    ok(pg.evaluate("()=>prodCatRows().length") == 13, "未筛选时数据源为全部 13 个产品")
    ok(pg.evaluate(rows_n) == 10, "列表按分页每页渲染 10 行（实际 %d）" % pg.evaluate(rows_n))

    def click_node(text, level):
        return pg.evaluate("""(arg)=>{var hit=[...document.querySelectorAll('.pc-lv%d')]
            .filter(e=>e.innerText.indexOf(arg)===0)[0]; if(!hit)return false; hit.click(); return true;}""" % level, text)

    ok(click_node('水场产品', 0), "点击大类「水场产品」")
    pg.wait_for_timeout(500)
    ok(pg.evaluate(rows_n) == 5, "水场产品下 5 个产品（实际 %d）" % pg.evaluate(rows_n))
    ok(pg.evaluate("()=>prodCatState.sel") == '水场产品', "选中态记录为大类")

    ok(click_node('加脂剂', 1), "点击一级「加脂剂」")
    pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>prodCatRows().length") == 2, "加脂剂下 2 个产品（L-27 / BIO-30）")
    ok(pg.eval_on_selector_all('.pc-lv2', 'els=>els.length') > 0, "选中一级后自动展开二级目录")

    ok(click_node('加脂剂', 2), "点击二级「加脂剂」")
    pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>prodCatRows().length") == 2, "二级目录同样过滤出 2 个产品")
    ok(pg.evaluate("()=>prodCatState.sel") == '水场产品/加脂剂/加脂剂', "选中态为三级路径")

    print("\n== 4. 未归类与取消选中 ==")
    pg.evaluate("()=>prodCatPick('__uncat__')")
    pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>prodCatRows().length") == 1, "未归类 1 个产品（蒙囿剂 MK-2）")
    txt = pg.inner_text('#lpHost')
    ok('待归类' in txt, "列表「所属目录」列给出待归类提示")
    pg.evaluate("()=>prodCatPick('__uncat__')")
    pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>prodCatState.sel") == '', "再次点击已选节点 → 取消选中")
    ok(pg.evaluate("()=>prodCatRows().length") == 13, "取消后回到全部 13 个产品")

    print("\n== 5. 列表内容与详情联动 ==")
    pg.evaluate("()=>prodCatPick('涂饰产品/手感剂')")
    pg.wait_for_timeout(500)
    names = pg.eval_on_selector_all('#lpHost tbody tr td:nth-child(2)', 'els=>els.map(e=>e.innerText.trim())')
    ok(names == ['手感剂 HF-5'], "按目录筛出手感剂 HF-5（%s）" % names)
    cat_cell = pg.eval_on_selector_all('#lpHost tbody tr td:nth-child(3)',
                                       'els=>els.map(e=>e.innerText.trim())')
    ok(cat_cell == ['涂饰产品/手感剂'], "「所属目录」列显示完整路径（%s）" % cat_cell)
    pg.eval_on_selector('#lpHost tbody tr', 'e=>e.click()')
    pg.wait_for_timeout(900)
    ok(pg.evaluate("()=>curPage") == 'prod:detail', "点行仍可进入产品详情")
    ok('所属目录' in pg.inner_text('#pageHost'), "详情页基本信息含「所属目录」")

    print("\n== 6. 理化性质区分组表格（第二十七轮 · 方案A） ==")
    pg.evaluate("()=>showPage('prod:detail',{code:'PRD-2026-001'})")
    pg.wait_for_timeout(800)
    ok(pg.eval_on_selector_all('.ph-table tbody tr.ph-item', 'els=>els.length') >= 20,
       "指标渲染为分组表格（%d 行）" % pg.eval_on_selector_all('.ph-table tbody tr.ph-item', 'e=>e.length'))
    ok(pg.eval_on_selector_all('table.ph-tbl', 'els=>els.length') == 0, "旧三列表格仍已移除")
    ths = pg.eval_on_selector_all('.ph-table thead th', 'els=>els.map(e=>e.innerText.trim()).slice(0,5)')
    ok(ths == ['指标', '标准值', '实测值', '来源', '操作'], "表头五列（标准/实测同列对齐）")
    ok(pg.eval_on_selector_all('.src-chip', 'els=>els.length') == 0, "来源不再用彩色色块")
    ok(pg.eval_on_selector_all('.ph-src', 'els=>els.length') > 0,
       "来源以浅色小字留痕（%d 条）" % pg.eval_on_selector_all('.ph-src', 'e=>e.length'))

    print("\n== 7. JS 运行时错误 ==")
    ok(not errs, "无 JS 错误" if not errs else "JS 错误 %d 条：%s" % (len(errs), errs[:3]))

    b.close()

print('\n' + '=' * 60)
print('产品目录树专项：PASS %d / FAIL %d' % (len(PASS), len(FAIL)))
if FAIL:
    print('\n失败项：')
    for m in FAIL:
        print('  x ' + m)
print('=' * 60)
if FAIL:
    raise SystemExit(1)
