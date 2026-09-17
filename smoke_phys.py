_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""[27z1/27z2/27z3] 产品理化性质专项自检
   三层模型：指标库（58 项定义）→ 类别模板（按类别启用）→ 产品实例（单值 + 来源留痕，明细区两列卡片）。
   入口：基础数据 → 理化性质配置 → 指标库 / 类别模板；产品管理 → 产品基础信息 → 产品详情。
   范围口径：与 SDS 第 9 章**不联动**（PHYS_PROPS 保持硬编码不动），本脚本同时守住这条线。"""
import pathlib
from playwright.sync_api import sync_playwright

F = str(pathlib.Path('PLM3.0全系统演示原型.html').resolve())
P1 = 'PRD-2026-001'   # 涂饰树脂
P2 = 'PRD-2026-013'   # 酶制剂类（本轮新增）
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

    print("\n== 1. 页面注册与菜单落位 ==")
    for pid in ('bd:phys-lib', 'bd:phys-tpl', 'prod:detail'):
        ok(pg.evaluate("()=>!!PAGES['%s']" % pid), "页面已注册：%s" % pid)
    menu = pg.eval_on_selector_all('#navScroll .nav-item', 'els=>els.map(e=>e.innerText.trim())')
    ok(any('理化性质配置' in t for t in menu), "侧栏「基础数据」下出现二级菜单「理化性质配置」")
    ok(any('指标库' in t for t in menu) and any('类别模板' in t for t in menu),
       "三级菜单含「指标库」「类别模板」")
    ok(pg.evaluate("()=>HL_MAP['prod:detail']") == 'prod:list', "prod:detail 侧栏高亮锁定到产品基础信息")

    print("\n== 2. 指标库：58 项、分组口径、标准值推导 ==")
    pg.evaluate("()=>showPage('bd:phys-lib')")
    pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>PHYS_LIB.length") == 58, "指标库共 58 项")
    dist = pg.evaluate("""()=>{var d={};PHYS_LIB.forEach(function(x){d[x.group]=(d[x.group]||0)+1;});return d;}""")
    ok(dist == {'sense': 2, 'phys': 12, 'compo': 18, 'apply': 16, 'enzyme': 3, 'stab': 7},
       "分组分布 2/12/18/16/3/7（实际 %s）" % dist)
    ph = pg.evaluate("()=>PHYS_LIB.filter(x=>x.name.indexOf('pH 值')===0).map(x=>x.name)")
    ok(len(ph) == 3, "pH 值占 3 列 → 拆为 3 条独立指标（%s）" % "、".join(ph))
    std = pg.evaluate("""()=>({
        'IND-0006':physStdText(physLibById('IND-0006')),
        'IND-0007':physStdText(physLibById('IND-0007')),
        'IND-0054':physStdText(physLibById('IND-0054')),
        'IND-0005':physStdText(physLibById('IND-0005')),
        'IND-0001':physStdText(physLibById('IND-0001'))})""")
    ok(std['IND-0006'] == '≤0.5 %', "上限类字段表达为 ≤0.5 %%（%s）" % std['IND-0006'])
    ok(std['IND-0007'] == '48 ～ 52 %', "区间类字段表达为 48 ～ 52 %%（%s）" % std['IND-0007'])
    ok(std['IND-0054'] == '≥30 d', "下限类字段表达为 ≥30 d（%s）" % std['IND-0054'])
    ok(std['IND-0005'] == '7.5 ～ 8.5', "pH 值（100%% 原液）范围为 7.5 ～ 8.5")
    ok(std['IND-0001'] == '—', "无数值字段（外观）无标准值表达")
    rows = pg.eval_on_selector_all('table.tbl tbody tr', 'els=>els.length')
    ok(rows == 12, "列表页按 pageSize=12 分页（首页 %d 行）" % rows)
    cols = pg.eval_on_selector_all('table.tbl thead th', 'els=>els.map(e=>e.innerText.trim())')
    ok('被模板引用' in cols, "列表含「被模板引用」列（%s）" % " / ".join(cols))

    print("\n== 3. 类别模板：9 类、按类别启用 ==")
    pg.evaluate("()=>showPage('bd:phys-tpl')")
    pg.wait_for_timeout(700)
    cats = pg.evaluate("()=>PHYS_CATS.slice()")
    ok(len(cats) == 9 and '酶制剂类' in cats, "覆盖 9 个产品类别（含新增「酶制剂类」）")
    ok(pg.evaluate("()=>physTplOf('涂饰树脂').length") == 23, "「涂饰树脂」默认 23 项指标")
    ok(pg.evaluate("()=>physTplOf('酶制剂类').length") == 12, "「酶制剂类」默认 12 项指标")
    ok(pg.evaluate("()=>physTplHas('酶制剂类','IND-0049')") is True,
       "酶活力指标挂在「酶制剂类」")
    ok(pg.evaluate("()=>physTplHas('涂饰树脂','IND-0049')") is False,
       "「涂饰树脂」不含酶活力指标（不适用分组不出现的前提）")
    pills = pg.eval_on_selector_all('.ph-tpl-btn', 'els=>els.map(e=>e.innerText.trim())')
    ok(len(pills) == 9 and pills[0].startswith('涂饰树脂'), "类别切换胶囊 9 个（首项 %s）" % pills[0])
    ok('已选' in pg.inner_text('#phTplCount'), "页头显示「已选 N / 共 58」：%s" % pg.inner_text('#phTplCount'))
    secs = pg.eval_on_selector_all('.ph-tpl-sec', 'els=>els.map(e=>e.innerText.trim())')
    ok(len(secs) == 6, "勾选清单按 6 个分组分节（%d）" % len(secs))

    print("\n== 4. 产品详情：按类别带出、分组渲染、不适用分组不出现 ==")
    pg.evaluate("()=>showPage('prod:detail',{code:'%s'})" % P1)
    pg.wait_for_timeout(700)
    g1 = pg.eval_on_selector_all('.ph-group h4', 'els=>els.map(e=>e.innerText.trim())')
    ok(len(g1) == 5, "涂饰树脂产品渲染 5 个分组（%s）" % "、".join(g1))
    ok('特征成分含量' in g1 and '酶活力' not in g1,
       "涂饰树脂：有「特征成分含量」、无「酶活力」")
    ids1 = pg.evaluate("()=>prodPhysIndIds('%s').length" % P1)
    ok(ids1 == 23, "本产品生效指标 23 项（= 类别模板）")
    pg.evaluate("()=>showPage('prod:detail',{code:'%s'})" % P2)
    pg.wait_for_timeout(700)
    g2 = pg.eval_on_selector_all('.ph-group h4', 'els=>els.map(e=>e.innerText.trim())')
    ok('酶活力' in g2 and '特征成分含量' not in g2,
       "酶制剂类：有「酶活力」、无「特征成分含量」（%s）" % "、".join(g2))
    e1 = pg.eval_on_selector_all('.ph-table tbody tr.ph-item', 'els=>els.length')
    ok(e1 == 12, "酶制剂类产品渲染 12 行指标（实际 %d）" % e1)
    ok(pg.eval_on_selector_all('.ph-table table', 'els=>els.length') >= 1, "指标区为分组表格（方案A）")
    ok(pg.eval_on_selector_all('table.ph-tbl', 'els=>els.length') == 0, "已不再使用旧三列表格")
    ths = pg.eval_on_selector_all('.ph-table thead th', 'els=>els.map(e=>e.innerText.trim()).slice(0,5)')
    ok(ths == ['指标', '标准值', '实测值', '来源', '操作'], "表头五列：%s" % " / ".join(ths))
    ok(pg.eval_on_selector_all('.ph-item .ph-item-v', 'els=>els.length') == 12,
       "每行只承载一个指标值")
    ok(pg.eval_on_selector_all('.ph-item-v.wait', 'els=>els.length') == 1,
       "未填值的指标渲染为「待填」（不显示 N/A 空行）")
    ok(pg.eval_on_selector_all('.ph-row-wait', 'els=>els.length') == 1,
       "待填项整行置灰（.ph-row-wait）")
    failtxt = pg.eval_on_selector_all('.ph-table', 'els=>els.map(e=>e.innerText)')
    ok('Not available' not in ''.join(failtxt) and 'N/A' not in ''.join(failtxt),
       "详情页无 N/A / Not available 字样")

    print("\n== 5. 数据来源留痕（纯文字，无彩色色块） ==")
    pg.evaluate("()=>showPage('prod:detail',{code:'%s'})" % P1)
    pg.wait_for_timeout(700)
    chips = pg.evaluate("""()=>({
        ncc:[...document.querySelectorAll('.ph-item-nm')].filter(e=>e.parentNode.parentNode
            .querySelector('.ph-src')&&e.parentNode.parentNode.querySelector('.ph-src')
            .innerText.indexOf('NCC 同步')===0).length,
        imp:[...document.querySelectorAll('.ph-src')].filter(e=>e.innerText.indexOf('导入')===0).length,
        man:[...document.querySelectorAll('.ph-src')].filter(e=>e.innerText.indexOf('手动')===0).length})""")
    ok(chips['imp'] > 0, "导入来源留痕 %d 条" % chips['imp'])
    ok(chips['man'] > 0, "手动来源留痕 %d 条" % chips['man'])
    ok(pg.eval_on_selector_all('.src-chip', 'els=>els.length') == 0, "已无彩色来源色块")
    txt = pg.eval_on_selector_all('.ph-src', 'els=>els.map(e=>e.innerText)')
    ok(any(t.startswith('NCC 同步 · 2026-') for t in txt), "NCC 标签带同步日期（%s）" % txt[0])
    ok(any(('手动 · 王研究员' in t) or ('手动 · 陈工' in t) or ('手动 · 李工' in t) for t in txt),
       "手动标签带操作人姓名")

    print("\n== 6. 产品级增删覆盖（不影响类别模板） ==")
    tpl_before = pg.evaluate("()=>physTplOf('涂饰树脂').length")
    pg.evaluate("()=>physAddIndOpen('%s')" % P1)
    pg.wait_for_timeout(600)
    picked = pg.eval_on_selector_all('#phPick input', 'els=>els.map(e=>e.getAttribute("data-ind"))')
    ok(len(picked) == 58 - 23, "添加指标弹窗列出未启用的 %d 项（58 − 23）" % len(picked))
    pg.check('#phPick input[data-ind="IND-0027"]')
    pg.click('#phPickOk')
    pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>prodPhysIndIds('%s').length" % P1) == 24, "添加后本产品生效 24 项")
    ok(pg.evaluate("()=>physTplOf('涂饰树脂').length") == tpl_before,
       "类别模板保持 23 项不变（单条增删只作用于产品）")
    ok(pg.evaluate("()=>physProdVal('%s','IND-0027').act===undefined" % P1),
       "新增指标无值 → 渲染为待填")

    pg.evaluate("()=>physDelInd('%s','IND-0002')" % P1)
    pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>!!document.querySelector('#_cfmOk')"), "移除指标走二次确认弹窗")
    pg.click('#_cfmOk')
    pg.wait_for_timeout(700)
    ok(pg.evaluate("()=>prodPhysIndIds('%s').indexOf('IND-0002')<0" % P1), "已从本产品移除「气味」")
    ok(pg.evaluate("()=>physTplHas('涂饰树脂','IND-0002')") is True, "「气味」仍在类别模板中")

    print("\n== 7. 手动编辑指标值 ==")
    pg.evaluate("()=>physEditIndOpen('%s','IND-0004')" % P1)
    pg.wait_for_timeout(600)
    pg.fill('#phE-act', '7.4')
    pg.click('#phE-ok')
    pg.wait_for_timeout(700)
    v = pg.evaluate("()=>physProdVal('%s','IND-0004')" % P1)
    ok(v.get('act') == '7.4' and v.get('src') == 'man', "实测值已更新且来源转为手动（%s）" % v)
    ok(v.get('by') == '王研究员', "手动来源记录操作人：%s" % v.get('by'))
    page_txt = pg.inner_text('#pageHost')
    ok('7.4' in page_txt and '手动 · 王研究员' in page_txt, "详情页即时反映新值与小标签")

    print("\n== 8. Excel 导入（示意流程） ==")
    pg.evaluate("()=>physImportOpen('%s')" % P1)
    pg.wait_for_timeout(600)
    imp_txt = pg.inner_text('.modal-bd')
    ok('涂饰树脂' in imp_txt and '列指标' in imp_txt, "导入弹窗按类别列出将生成的列数")
    body_rows = pg.eval_on_selector_all('.modal-bd table.tbl tbody tr', 'els=>els.length')
    ok(body_rows >= 4, "按分组列出导入列明细（%d 行）" % body_rows)
    before = pg.evaluate("()=>prodPhysIndIds('%s').filter(id=>physProdVal('%s',id).act).length" % (P1, P1))
    pg.click('#phImpOk')
    pg.wait_for_timeout(800)
    after = pg.evaluate("()=>prodPhysIndIds('%s').filter(id=>physProdVal('%s',id).act).length" % (P1, P1))
    ok(after >= before, "模拟上传后已填实测值 %d → %d 项" % (before, after))
    pg.evaluate("()=>physImportOpen('%s')" % P1)
    pg.wait_for_timeout(500)
    ok(pg.evaluate("()=>typeof physImportTemplate==='function'"), "提供「下载导入模板」能力")
    pg.evaluate("()=>closeModal()")

    print("\n== 9. 演示闭环：新增指标 → 模板勾选 → 详情页出现 ==")
    pg.evaluate("()=>showPage('bd:phys-lib')")
    pg.wait_for_timeout(600)
    pg.evaluate("()=>physLibAdd()")
    pg.wait_for_timeout(500)
    pg.fill('#plF-name', '耐汗渍色牢度')
    pg.select_option('#plF-group', 'apply')
    pg.fill('#plF-unit', '级')
    pg.fill('#plF-lo', '4')
    pg.fill('#plF-hi', '5')
    pg.click('#plF-ok')
    pg.wait_for_timeout(700)
    newid = pg.evaluate("()=>PHYS_LIB[PHYS_LIB.length-1].id")
    ok(pg.evaluate("()=>PHYS_LIB.length") == 59, "指标库新增第 59 项（%s）" % newid)
    ok(pg.evaluate("()=>physTplUseCount('%s')" % newid) == 0, "新指标初始未被任何模板引用")
    ok(pg.evaluate("()=>prodPhysIndIds('%s').indexOf('%s')<0" % (P1, newid)), "详情页暂不出现该指标")

    pg.evaluate("()=>showPage('bd:phys-tpl')")
    pg.wait_for_timeout(600)
    pg.evaluate("()=>physTplSetCat('涂饰树脂')")
    pg.wait_for_timeout(300)
    pg.check('input[data-ind="%s"]' % newid)
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>physTplOf('涂饰树脂').length") == 24, "模板勾选后「涂饰树脂」24 项")
    ok('已选' in pg.inner_text('#phTplCount'), "统计实时刷新：%s" % pg.inner_text('#phTplCount'))

    pg.evaluate("()=>showPage('prod:detail',{code:'%s'})" % P1)
    pg.wait_for_timeout(700)
    ok(newid in pg.inner_text('#pageHost'), "回产品详情页，新指标已出现（%s）" % newid)
    ok(pg.evaluate("()=>prodPhysIndIds('%s').length" % P1) == 24,
       "本产品生效指标 23 → 24（模板 +1、单独添加 +1、单独移除 −1）")

    print("\n== 10. 持久化与重置钩子 ==")
    ok(pg.evaluate("()=>typeof _physReset==='function'"), "暴露 _physReset() 供 wzReset 链调用")
    snap = pg.evaluate("()=>localStorage.getItem('plm3_phys_v1')")
    ok(snap is not None and '"s":"v1"' in snap, "理化性质数据已落 localStorage（plm3_phys_v1）")
    pg.reload()
    pg.wait_for_timeout(1800)
    ok(pg.evaluate("()=>PHYS_LIB.length") == 59, "刷新后指标库仍为 59 项（持久化生效）")
    ok(pg.evaluate("()=>physTplOf('涂饰树脂').length") == 24, "刷新后模板勾选仍为 24 项")
    ok(pg.evaluate("()=>physProdVal('%s','IND-0004').act" % P1) == '7.4', "刷新后实测值仍为 7.4")

    pg.evaluate("()=>_physReset()")
    pg.wait_for_timeout(400)
    ok(pg.evaluate("()=>PHYS_LIB.length") == 58, "重置后指标库回到 58 项")
    ok(pg.evaluate("()=>physTplOf('涂饰树脂').length") == 23, "重置后模板回到 23 项")
    ok(pg.evaluate("()=>physProdVal('%s','IND-0004').act" % P1) == '7.8', "重置后实测值回出厂值 7.8")
    ok(pg.evaluate("()=>localStorage.getItem('plm3_phys_v1')") is None, "重置后清理 localStorage 键")
    ok(pg.evaluate("()=>physTplHas('涂饰树脂','IND-0027')") is False, "重置后模板不含产品级单独添加的指标")
    ok(pg.evaluate("()=>prodPhysIndIds('%s').indexOf('IND-0002')>=0" % P1),
       "重置后「气味」回到本产品（单独移除被还原）")

    print("\n== 11. 范围守线：与 SDS 第 9 章不联动 ==")
    pp = pg.evaluate("()=>PHYS_PROPS.length")
    ok(pp == 25, "SDS 第 9 章仍为 25 项（%d）" % pp)
    v0 = pg.evaluate("()=>PHYS_PROPS[0].v")
    ok(v0 == '淡黄色半透明粘稠液体', "外观仍为硬编码字符串（%s）" % v0)
    v3 = pg.evaluate("()=>PHYS_PROPS[3].v")
    ok(v3 == '7.5 ～ 8.5', "pH 值仍为硬编码字符串（%s）" % v3)
    sr0 = pg.evaluate("()=>PHYS_PROPS[0].src")
    ok(sr0 == '检测报告（SGS-2026-A0414）', "来源列未被来源小标签替换（%s）" % sr0)
    ok(pg.evaluate("()=>typeof physSdsMap==='undefined'"), "未引入 SDS 映射层（无 physSdsMap）")
    # 渲染层回归：physTableHtml() 必须仍由 23z3 自己的 physVal 驱动
    sds_html = pg.evaluate("()=>physTableHtml()")
    ok('淡黄色半透明粘稠液体' in sds_html, "第 9 章渲染结果含出厂外观值（数据→渲染链路未被覆盖）")
    ok('Not available' in sds_html, "第 9 章未测得项仍渲染 Not available")
    ok('62 ℃' in sds_html and '1.04' in sds_html, "第 9 章闪点 / 相对密度等已知项正常渲染")
    ok('[object Object]' not in sds_html, "第 9 章单元格无 [object Object]（无全局函数覆盖）")
    ok(pg.evaluate("()=>physVal.length") == 1,
       "23z3 的 physVal(p) 未被同名函数覆盖（形参 1 个，实际 %d）" % pg.evaluate("()=>physVal.length"))

    print("\n== 12. 一键重置不报错 ==")
    pg.evaluate("()=>showPage('home')")
    pg.wait_for_timeout(500)
    pg.evaluate("()=>wzReset()")
    pg.wait_for_timeout(600)
    ok(pg.evaluate("()=>PHYS_LIB.length") == 58, "wzReset() 已串起 _physReset，指标库回 58 项")
    ok(not errs, "全程无 JS 运行时错误（%s）" % ("；".join(errs[:3]) if errs else "无"))

    b.close()

print("\n===== 汇总：PASS %d / FAIL %d =====" % (len(PASS), len(FAIL)))
for m in FAIL:
    print("  FAIL: " + m)
raise SystemExit(1 if FAIL else 0)
