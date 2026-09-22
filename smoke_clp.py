# -*- coding: utf-8 -*-
"""[23z6 / 23z6a] CLP 法规库统一页面专项自检
   覆盖：
   · 顶部主信息（证据灯 / CLP-REACH 分工）、5 Tab、模块版本信息条（ATP 22 口径）
   · Tab1 15 列（含 EUH / 象形图 / 信号词）、数据驱动的生效版本下拉、详情抽屉
   · Annex VI → 分类规则 → 标签字典 跳转链
   · Tab2 8 列业务视图（技术编号 / 引擎方法收进详情）、自动化状态筛选
   · Tab3 Annex V 象形图只读块（9 个图式 + 适用危害类别）、组合码、字段适用性口径
   · Tab4 PCN/UFI 静态占位、Tab5 版本变更（含来源模块）
   · 五步导入向导：三模块切换（字段/条数/校验/变更/落点同步变化）、文件门禁、
     阻断项门禁、第 4 步子 Tab、规则测试（未通过不进发布清单）、三项人工确认门禁、
     发布后模块版本与三张表落库、变更记录带来源模块
   · 表述红线：页面不出现「自动解析 / 系统解析」
"""
import os
from playwright.sync_api import sync_playwright

CHROME = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
URL = 'file://' + os.path.abspath('PLM3.0全系统演示原型.html')
passed = failed = 0


def ok(value, message):
    global passed, failed
    if value:
        passed += 1
        print('  ✔ ' + message)
    else:
        failed += 1
        print('  ✘ ' + message)


def reupload_fixed(page):
    """上传修正版示例并重新校验；阻断项只能通过该路径清零。"""
    page.evaluate('()=>clpImpReupload()')
    page.wait_for_timeout(160)
    return page.evaluate('()=>clpImpBlkN()') == 0


def back_to_wizard(page):
    page.get_by_role('button', name='返回向导').first.click()
    page.wait_for_timeout(220)


def fill_and_upload(page, mod):
    page.evaluate("()=>clpLImport()")
    page.wait_for_timeout(200)
    page.select_option('#cipMod', mod)
    page.wait_for_timeout(200)
    page.evaluate("()=>clpLImpNext(2)")
    page.wait_for_timeout(140)
    page.evaluate("()=>clpLImpNext(3)")
    page.wait_for_timeout(140)
    page.evaluate("()=>clpImpPickDemo()")
    page.wait_for_timeout(140)
    page.evaluate("()=>clpLImpNext(4)")
    page.wait_for_timeout(220)


def confirm_and_publish(page):
    for i in (1, 2, 3):
        page.evaluate("(i)=>{$('cipOk'+i).checked=true}", i)
    page.evaluate("()=>clpLImpPublish()")
    page.wait_for_timeout(350)


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    page = browser.new_context(viewport={'width': 1680, 'height': 1000}).new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.goto(URL, wait_until='load')
    page.wait_for_timeout(800)

    print('=== 菜单与入口 ===')
    law_m = next(x for x in page.evaluate("()=>MENU.find(x=>x.id==='comp').children") if x['id'] == 'law')
    ok(next(x for x in law_m['children'] if x['id'] == 'law:clp')['name'] == 'CLP 法规库', '菜单项为「CLP 法规库」')
    page.evaluate("showPage('law:clp')")
    page.wait_for_timeout(400)
    ok(page.evaluate('curPage') == 'law:clp', 'law:clp 可正常进入')

    print('\n=== 顶部主信息 ===')
    text = page.locator('#pageHost').inner_text()
    ok('CLP 法规库' in text and 'Regulation (EC) No 1272/2008' in text, '展示法规名称与编号')
    ok('欧盟' in text and '已发布' in text, '展示适用市场与当前状态')
    ok(page.locator('#pageHost .ev').count() > 0 and '复审预警' in text, '顶部展示证据灯')
    ok('CLP 主版本' in text and '2024/2865 修订版' in text, '展示 CLP 主版本')
    ok('最近审核时间' in text and '最近更新时间' in text and '数据截止日期' in text, '展示审核/更新/数据截止日期')
    ok('质管-杨工' in text and '附录 VI 随 ATP 发布导入' in text, '展示维护责任人与更新频率')
    pack = page.evaluate('()=>clpActivePack()')
    ok('生效规则包' in text and pack['id'] in text, '顶部展示当前生效规则包')
    ok(pack['id'] == 'CLP-EU-ATP22-R2026.2-L2026.3', '规则包编号由三个生效模块版本组成')
    ok(pack['tested'] and pack['ruleIds'] == ['CLP-R-0001', 'CLP-R-0002', 'CLP-R-0003', 'CLP-R-0004'],
       '规则包只纳入已支持、测试通过、已审核的 4 条规则')
    ok(pack['methods'] == ['CLP-M-ATE-SUM', 'CLP-M-GCL-SUM', 'CLP-M-SCL', 'CLP-M-MFACTOR'],
       '规则包登记 4 种已支持计算方法')
    for f in ['物质查询', '混合物分类', '标签生成', 'SDS编制']:
        ok(f in text, '影响功能包含「%s」' % f)
    ok(page.get_by_role('button', name='页面说明').count() == 1, '顶部提供折叠的「页面说明」入口')
    ok('open' not in (page.locator('#np-law-clp').get_attribute('class') or ''), '提示文本框默认收起')
    page.get_by_role('button', name='页面说明').click()
    page.wait_for_timeout(120)
    hint_text = page.locator('#np-law-clp').inner_text()
    ok('open' in (page.locator('#np-law-clp').get_attribute('class') or ''), '点击后展开提示文本框')
    ok('CLP 管分类与标签' in hint_text and 'REACH 管注册、授权与限制' in hint_text, '提示文本框保留 CLP / REACH 分工说明')
    ok('C&L Inventory' in hint_text and '独立菜单维护' in hint_text and 'REACH 独立清单' in hint_text, '提示文本框保留来源与维护位置说明')
    ok('法规专员只需核对规则内容' in hint_text and '内部编号和引擎方法' in hint_text, '提示文本框收纳 Annex I 维护说明')
    page.get_by_role('button', name='页面说明').click()
    ok('open' not in (page.locator('#np-law-clp').get_attribute('class') or ''), '提示文本框可再次收起')
    ok(page.get_by_role('button', name='下载导入模板').count() == 1, '顶部提供导入模板下载入口')
    page.evaluate('()=>clpTemplateCenter()')
    page.wait_for_timeout(120)
    ok(page.locator('#mBody tbody tr').count() == 3, '模板中心提供 Annex VI / Annex I / 标签字典 3 个模板')
    with page.expect_download() as dl:
        page.locator('#mBody').get_by_role('button', name='下载 CSV').first.click()
    ok(dl.value.suggested_filename.endswith('.csv'), 'CLP 模板可真实下载为 CSV 文件')
    page.evaluate('closeModal()')

    print('\n=== Tab 切换 ===')
    ok(page.locator('#clpTabs button').count() == 5, '共 5 个 Tab')
    for k, label in [('vi', 'Annex VI'), ('rules', 'Annex I'), ('labels', 'Annex III/IV/V'),
                     ('pcn', 'Annex VIII'), ('chg', '版本变更与影响')]:
        page.evaluate(
            "(k)=>{var b=document.querySelectorAll('#clpTabs button');for(var x of b){if(x.getAttribute('data-key')===k)x.click();}}", k)
        page.wait_for_timeout(140)
        ok(page.evaluate('()=>_clpTab') == k, '切到 %s' % label)
    ok('影响功能' in page.locator('#pageHost').inner_text(), '切 Tab 后顶部主信息仍在')
    page.evaluate("()=>clpLGoTab('vi')")
    page.wait_for_timeout(200)

    print('\n=== Tab1 Annex VI：15 列 + ATP 22 口径 ===')
    ok(page.evaluate('()=>CLP_VI_ROWS.length') == 5, '保留 5 条物质示例数据')
    head = page.locator('#clpTable thead').inner_text()
    for c in ['Index No', 'CAS 号', 'EC 号', '危害分类', 'H 码', '补充危险说明 EUH', '象形图代码',
              '信号词代码', 'SCL', 'M 因子', 'ATE', '生效版本', '来源与条款位置']:
        ok(c in head, '列表含「%s」列' % c)
    ok(page.evaluate("()=>CLP_VI_ROWS.every(r=>r.ver==='ATP 22')"), '全部条目生效版本为 ATP 22')
    strip = page.locator('.clp-strip').first.inner_text()
    ok('ATP 22' in strip and '2026-05-01' in strip, '模块信息条：ATP 22 / 2026-05-01 生效')
    ok('整理数据' in strip and 'ECHA CHEM' in strip and '法律效力以 OJ 公布为准' in strip,
       '模块信息条区分整理数据与法律效力依据')
    ok('ATP 21' not in strip, '信息条不再出现已过时的 ATP 21')
    vers = page.evaluate("()=>[].map.call($('clpViVer').options,x=>x.text)")
    ok('全部生效版本' in vers and 'ATP 22' in vers, '生效版本下拉改为数据驱动：%s' % ' / '.join(vers))
    page.fill('#clpViKw', '50-00-0')
    page.wait_for_timeout(140)
    ok(page.locator('#clpTable tbody tr').count() == 1 and '甲醛' in page.locator('#clpTable tbody').inner_text(), '按 CAS 搜索')
    page.fill('#clpViKw', 'GHS08')
    page.wait_for_timeout(140)
    ok(page.locator('#clpTable tbody tr').count() == 2, '象形图代码参与检索（GHS08 命中 2 条）')
    page.fill('#clpViKw', '')
    page.wait_for_timeout(140)
    page.evaluate("()=>clpLViDrawer('605-001-00-5')")
    page.wait_for_timeout(200)
    dw = page.locator('#clpDw').inner_text()
    ok('M=10' in dw and '口服 ATE = 100 mg/kg' in dw and 'C ≥ 0.2%' in dw, '抽屉展示 SCL / M 因子 / ATE')
    ok('补充危险说明（EUH）' in dw and '象形图代码' in dw and '信号词代码' in dw, '抽屉补齐 EUH / 象形图 / 信号词字段')
    ok('法规原文' in dw and '整理数据' in dw and '以 OJ 为准' in dw, '抽屉区分法规原文与整理数据两种来源')
    ok('查看相关分类规则' in page.locator('#clpDw').inner_text(), '抽屉提供跳转分类规则入口')

    print('\n=== 跳转链：Annex VI → 分类规则 → 标签字典 ===')
    page.evaluate("()=>clpLViToRule('605-001-00-5')")
    page.wait_for_timeout(250)
    ok(page.evaluate('()=>_clpTab') == 'rules', '跳转到 Annex I 规则 Tab')
    ok('急性毒性—口服—混合物 ATE' in page.locator('#clpDw .modal-hd h3').inner_text(), '抽屉打开对应分类规则')
    page.locator('#clpDw details').evaluate('(d)=>d.open=true')
    dw = page.locator('#clpDw').inner_text()
    ok('技术信息（研发 / 追溯）' in dw and 'CLP-R-0001' in dw and 'CLP-M-ATE-SUM' in dw and 'ATE 加和法' in dw,
       '技术编号与规则引擎方法收进可折叠技术信息')
    ok('已支持' in dw and '通过' in dw, '抽屉展示引擎支持状态与规则测试状态')
    ok('ATE_mix = 100 / Σ( Ci / ATEi )' in dw, '展示 ATE 计算公式')
    ok('结构化规则表' in dw and '法规专员核对规则内容' in dw, '标注数据来源类型与法规专员核对职责')
    ok('自动解析' not in dw and '系统解析' not in dw, '规则抽屉无「自动解析」表述')
    ok(page.locator('#clpTable tbody tr').count() == 1, '列表按跳转过滤到目标规则')
    page.evaluate("()=>clpLRuleToLabel('CLP-R-0001')")
    page.wait_for_timeout(250)
    ok(page.evaluate('()=>_clpTab') == 'labels', '跳转到标签字典 Tab')
    ok('H301' in page.locator('#clpDw .modal-hd h3').inner_text(), '抽屉打开 H301 字典条目')
    ok('仅 H 行适用' in page.locator('#clpDw').inner_text(), '字典抽屉标注字段适用性')
    page.evaluate("()=>clpLDrawerClose()")

    print('\n=== Tab2 Annex I：8 列业务视图 + 自动化状态筛选 ===')
    page.evaluate("()=>{_clpF.rules={kw:'',tgt:'',st:'',eng:''};clpLGoTab('rules');}")
    page.wait_for_timeout(200)
    ok(page.evaluate('()=>CLP_RULES.length') == 5,
       '当前生效规则集 5 条（R-0006 / R-0007 已归 R2027.1 候选草稿版本）')
    rules_text = page.locator('#clpTabBody').inner_text()
    ok('法规专员只需核对规则内容' not in rules_text and page.locator('#clpTabBody .notice.info').count() == 0,
       'Annex I 不再平铺维护提示文本框')
    ok(page.evaluate('()=>clpNextRuleId()') == 'CLP-R-0008',
       '新规则编号扫描所有版本取最大序号（含候选草稿的 R-0007），不会撞号')
    head = page.locator('#clpTable thead').inner_text()
    for c in ['规则名称', '适用危害类别', '适用对象', '主要判断条件', '自动化状态', '规则校验', '规则版本', '发布状态']:
        ok(c in head, '规则列表含「%s」列' % c)
    ok('内部规则编号' not in head and '规则引擎方法' not in head, '技术编号与引擎方法不占用主列表')
    ok('可自动计算' in page.locator('#clpTable tbody').inner_text(), '主列表以业务语言展示自动化状态')
    page.select_option('#clpRuTgt', '混合物')
    page.wait_for_timeout(140)
    ok(page.locator('#clpTable tbody tr').count() == 3, '按适用对象（混合物）筛选出 3 条')
    page.select_option('#clpRuTgt', '')
    page.select_option('#clpRuEng', '需要研发实现')
    page.wait_for_timeout(140)
    ok(page.locator('#clpTable tbody tr').count() == 1 and '分层与优先级' in page.locator('#clpTable tbody').inner_text(),
       '按「需技术处理」筛出方法未实现的规则（CLP-R-0005 / CLP-M-LAYER）')
    page.select_option('#clpRuEng', '需要配置参数')
    page.wait_for_timeout(140)
    ok('没有匹配的记录' in page.locator('#clpTable tbody').inner_text(),
       '当前生效规则集无「待配置」规则（BRIDGE 实为方法未实现 → 归「需技术处理」；'
       '「已实现但缺参数」的场景由导入向导 R-0009 覆盖）')
    page.select_option('#clpRuEng', '')
    page.select_option('#clpRuSt', '待审核')
    page.wait_for_timeout(140)
    ok('没有匹配的记录' in page.locator('#clpTable tbody').inner_text(),
       '生效规则集无待审核规则（R-0006 / R-0007 已移入候选草稿版本）')
    page.select_option('#clpRuSt', '')
    page.wait_for_timeout(120)
    # 切到候选草稿版本，可查看「下一版准备纳入什么」
    cand_id = page.evaluate("()=>{var v=clpRuleVersionCandidate();return v?v.id:'';}")
    ok(cand_id != '', '存在独立的 R2027.1 候选草稿版本')
    page.select_option('#clpRuVer', cand_id)
    page.wait_for_timeout(200)
    cand_txt = page.locator('#clpTable tbody').inner_text()
    ok(page.locator('#clpTable tbody tr').count() == 2 and '桥接原则' in cand_txt and '内分泌干扰物' in cand_txt,
       '切到候选草稿版本可看到 2 条下一版候选规则（ED/PBT 与桥接原则）')
    ok('需技术处理' in cand_txt, '候选规则同样按注册表真实状态标为「需技术处理」')
    page.select_option('#clpRuVer', '')
    page.wait_for_timeout(160)

    print('\n=== Tab3 Annex III/IV/V：Annex V 象形图素材管理 + 字段适用性 ===')
    page.evaluate("()=>{_clpF.labels={kw:'',tp:'',st:''};clpLGoTab('labels');}")
    page.wait_for_timeout(220)
    body = page.locator('#clpTabBody').inner_text()
    ok('Annex V｜危险象形图' in body and '管理象形图素材' in body, 'Tab3 顶部展示 Annex V 素材管理入口')
    ok(page.locator('#clpTabBody .picto-item').count() == 9, '图式块含 9 个（GHS01–GHS09）')
    pcode = page.locator('#clpTabBody .picto-grid').inner_text()
    ok(all(('GHS0%d' % i) in pcode for i in range(1, 10)), '图式编号 GHS01–GHS09 齐全')
    ok('急性毒性（经口 / 经皮 / 吸入）1 / 2 / 3' in pcode and '危害水生环境' in pcode, '每个图式列出适用危害类别')
    page.locator('.clp-picto button', has_text='管理象形图素材').click()
    page.wait_for_timeout(120)
    manage = page.locator('#mBody').inner_text()
    ok('管理象形图素材 · Annex V' in page.locator('#modal .modal-hd').inner_text(), '打开 Annex V 象形图素材管理弹窗')
    ok(page.locator('#mBody .clp-picto-manage tbody tr').count() == 9, '素材管理表含 9 个固定编号')
    ok('GHS01' in manage and 'GHS09' in manage and '编号固定，不可新增或删除' in manage, '弹窗明确固定编号与不可新增删除')
    ok(page.locator('#mBody input[type=file]').count() == 9, '每个象形图提供独立上传 / 替换入口')
    page.locator('#mBody input[type=file]#clpPicFile-GHS01').set_input_files({
        'name': 'GHS01-replacement.svg', 'mimeType': 'image/svg+xml',
        'buffer': b'<svg xmlns="http://www.w3.org/2000/svg"/>'
    })
    page.wait_for_timeout(120)
    ok('GHS01-replacement.svg' in page.locator('#mBody').inner_text() and '已替换（演示）' in page.locator('#mBody').inner_text(),
       '选择 SVG 后更新素材文件名与状态（演示）')
    page.evaluate('()=>closeModal()')
    ok('不参与 Annex III' in manage and 'Annex IV' in manage, 'Annex V 素材维护与 H / EUH / P 字典导入分离')
    ok(page.evaluate('()=>CLP_LABELS.length') == 22, '字典 22 条（补齐规则包可能输出的 H 码，含 3 条官方组合码）')
    codes = page.evaluate("()=>CLP_LABELS.map(x=>x.code).join(' | ')")
    ok('H300+H310' in codes and 'H301+H311+H331' in codes and 'P305+P351+P338' in codes, '含 H / P 官方组合码')
    ok(page.evaluate("()=>CLP_LABELS.filter(x=>x.tp==='EUH 码').every(x=>x.combo.indexOf('EUH 无官方组合码')>=0)"),
       'EUH 行明确「无官方组合码」')
    ok('H 12 条 / P 31 条' in body, '标注官方组合码数量口径（H 12 / P 31）')
    ok('仅 H 行适用' in body and 'EUH 行不适用' in body, '标注字段适用性矩阵')
    ok('象形图与信号词属「危害类别 + 分类」的属性' in body, '标注象形图 / 信号词归属口径（非 H 码属性）')
    page.select_option('#clpLbTp', 'EUH 码')
    page.wait_for_timeout(140)
    ok(page.locator('#clpTable tbody tr').count() == 1, '按 EUH 码筛选 1 条')
    page.select_option('#clpLbTp', '')
    page.select_option('#clpLbSt', '现行')
    page.wait_for_timeout(140)
    ok(page.locator('#clpTable tbody tr').count() == 8, '按数据状态「现行」筛选（每页 8 条）')
    page.select_option('#clpLbSt', '')
    page.wait_for_timeout(120)

    print('\n=== Tab4 Annex VIII PCN / UFI 占位 ===')
    page.evaluate("()=>clpLGoTab('pcn')")
    page.wait_for_timeout(200)
    body = page.locator('#clpTabBody').inner_text()
    ok('静态占位' in body and '不实现 PCN 文件生成或提交通报' in body, '明确静态占位口径')
    ok('有危害分类的混合物' in body and '成员国毒物中心' in body, '展示 PCN 适用范围与触发条件')
    ok('16 位唯一配方标识符' in body and '急救' in body, 'UFI 说明（16 位标识符 + 急救定位）')

    print('\n=== Tab5 版本变更与影响（含来源模块） ===')
    page.evaluate("()=>{_clpF.chg={kw:'',tp:''};clpLGoTab('chg');}")
    page.wait_for_timeout(200)
    body = page.locator('#clpTabBody').inner_text()
    ok('新增' in body and '修改' in body and '废止' in body, '覆盖新增 / 修改 / 废止三类变更')
    ok('示例数据' in body and '影响分析能力' in body, '显式标注配方 / SDS 数量为示例数据')
    ok('来源模块' in page.locator('#clpTable thead').inner_text(), '变更表新增「来源模块」列')
    ok('Annex VI 物质统一分类' in body and 'Annex I 分类规则' in body and 'Annex III/IV/V 标签字典' in body,
       '来源模块取值可读（三模块名）')

    # ------------------------------------------------------------------
    print('\n=== 导入向导 · 第 1 步：三模块与 7 个来源字段 ===')
    page.evaluate("()=>clpLImport()")
    page.wait_for_timeout(220)
    ok(page.locator('#mBody .mini-step').count() == 5, '五步步骤条（5 个节点）')
    steps = page.locator('#mBody .mini-step').all_text_contents()
    want = ['登记来源', '创建版本', '上传结构化数据', '数据校验与版本比较', '审核发布']
    ok(all(any(w in x for x in steps) for w in want), '五步命名与口径一致：%s' % ' / '.join(steps))
    ok(page.locator('#mBody .field').count() == 7, '第 1 步 7 个来源字段（含原始法规附件）')
    mods = page.evaluate("()=>[].map.call($('cipMod').options,x=>x.text)")
    ok(len(mods) == 3 and not any('PCN' in m for m in mods), '模块下拉 3 项且不含 Annex VIII/PCN：%s' % ' / '.join(mods))
    ok('ATP 23' in page.input_value('#cipCode'), '第 1 步默认 ATP 编号为 ATP 23（导入目标）')
    ok('第 1 步 / 共 5 步' in page.locator('#mFoot').inner_text(), '页脚显示步骤进度')

    print('\n=== 导入向导 · 模块切换（字段/条数/校验同步变化）===')
    sig = {}
    for k in ['vi', 'rules', 'labels']:
        page.select_option('#cipMod', k)
        page.wait_for_timeout(200)
        sig[k] = (page.evaluate('()=>clpImpMod().label'), page.evaluate('()=>clpImpMod().ver'),
                  page.evaluate('()=>clpImpMod().rows'), page.evaluate('()=>clpImpMod().fields.length'),
                  page.evaluate('()=>clpImpMod().checks.length'))
    ok(len({v[0] for v in sig.values()}) == 3, '三个模块的名称各不相同')
    ok((sig['vi'][1], sig['rules'][1], sig['labels'][1]) == ('ATP 23', 'R2027.1', 'L2026.4'),
       '三个模块的默认版本号各自独立：%s / %s / %s' % (sig['vi'][1], sig['rules'][1], sig['labels'][1]))
    ok(len({v[2] for v in sig.values()}) == 3, '三个模块的数据条数互不相同：%s' % [v[2] for v in sig.values()])
    ok([v[3] for v in sig.values()] == [15, 20, 11], '模板列数按模块区分：15 / 20 / 11')
    ok([v[4] for v in sig.values()] == [8, 8, 10], '校验项数按模块区分：8 / 8 / 10')
    ok(page.evaluate("()=>CLP_IMP_MODS.vi.diffTypes.length") == 6 and
       page.evaluate("()=>CLP_IMP_MODS.rules.diffTypes.length") == 10 and
       page.evaluate("()=>CLP_IMP_MODS.labels.diffTypes.length") == 6,
       '变更类型覆盖面按模块区分：6 / 10 / 6')

    print('\n=== 导入向导 · 第 3 步：文件门禁 + 模板弹窗可返回 ===')
    page.select_option('#cipMod', 'vi')
    page.wait_for_timeout(180)
    page.evaluate("()=>clpLImpNext(2)")
    page.wait_for_timeout(160)
    ok(page.locator('#mBody .field').count() == 5, '第 2 步 5 个版本字段')
    page.evaluate("()=>clpLImpNext(3)")
    page.wait_for_timeout(160)
    ok(page.evaluate("()=>$('cipNext3').disabled") is True, '未上传文件时「下一步」禁用')
    page.evaluate("()=>clpLImpNext(4)")
    page.wait_for_timeout(160)
    ok(page.evaluate('()=>_clpImp.step') == 3, '未上传文件时无法越过第 3 步')
    page.evaluate("()=>clpLImpTmpl()")
    page.wait_for_timeout(220)
    ok('列数：15 列' in page.locator('#mBody').inner_text()
       and '对照法规原文确认后再上传' in page.locator('#mBody').inner_text(),
       '模板弹窗展示字段契约与列数')
    ok(page.locator('#mBody tbody tr').count() == 15, '模板弹窗列出 15 个模板列')
    with page.expect_download() as dl:
        page.locator('#mFoot').get_by_role('button', name='下载 CSV 模板').click()
    ok(dl.value.suggested_filename == 'CLP_AnnexVI_导入模板_ATP23.csv', '向导内可下载当前模块的真实 CSV 模板')
    back_to_wizard(page)
    ok(page.evaluate('()=>_clpImp.step') == 3 and page.locator('#mBody .drop').count() == 1,
       '二级弹窗可返回向导第 3 步（向导不再丢失）')
    page.evaluate("()=>clpImpPickDemo()")
    page.wait_for_timeout(160)
    ok(page.evaluate("()=>$('cipNext3').disabled") is False, '上传示例文件后「下一步」解禁')
    ok('4,182 条' in page.locator('#mBody').inner_text(), '第 3 步展示该模块的数据条数')
    ok('4 项' in page.locator('#mBody').inner_text() or '上传时间' in page.locator('#mBody').inner_text(),
       '第 3 步文件元信息条展示上传人与上传时间')

    print('\n=== 导入向导 · 第 4 步：子 Tab + 阻断项门禁 ===')
    page.evaluate("()=>clpLImpNext(4)")
    page.wait_for_timeout(220)
    segs = page.locator('#mBody .clpimp-seg button').all_text_contents()
    ok(len(segs) == 2 and '数据校验' in segs[0] and '版本比较' in segs[1],
       'Annex VI 第 4 步 2 个子 Tab（无「规则测试」）：%s' % ' / '.join(segs))
    ok('数据校验' in page.locator('#mBody .clpimp-seg button.on').inner_text(), '第 4 步默认选中「数据校验」')
    ok(page.locator('#mBody .stat').count() == 4, '校验概览 4 个统计块')
    ok(page.locator('#mBody .cip-check-table tbody tr').count() == 7, 'Annex VI 的 7 类问题以二维表格逐行展示')
    heads = page.locator('#mBody .cip-check-table thead').inner_text()
    ok(all(x in heads for x in ['级别', '检查项', '数量', '问题明细', '处理方式', '当前状态']), '校验二维表格 6 列齐全')
    ok('阻断' in page.locator('#mBody .cip-check-table tbody tr').first.inner_text(), '校验问题按阻断/告警/提示分级')
    ok(page.evaluate('()=>clpImpBlkN()') == 2 and page.evaluate("()=>clpImpSum('block')") == 5,
       'Annex VI 明确展示 5 处 / 2 类阻断问题')
    ok('标记已处理' not in page.locator('#mBody').inner_text(), '阻断项不再提供「标记已处理」快捷放行')
    with page.expect_download() as dl:
        page.get_by_role('button', name='下载问题明细').click()
    ok(dl.value.suggested_filename == 'CLP_vi_校验问题明细.csv', '可下载逐条校验问题明细 CSV')
    ok(page.evaluate("()=>$('cipNext4').disabled") is True, '存在未处理阻断项时「提交审核」禁用')
    page.evaluate("()=>clpLImpNext(5)")
    page.wait_for_timeout(180)
    ok(page.evaluate('()=>_clpImp.step') == 4, '有阻断项时无法进入第 5 步')
    ok(reupload_fixed(page), '上传修正版并重新校验后才清空阻断项')
    page.wait_for_timeout(160)
    ok('修正版复检通过' in page.locator('#mBody').inner_text() and '修正版' in page.evaluate('()=>_clpImp.file'),
       '复检通过状态与修正版文件名均有留痕')
    ok(page.evaluate("()=>$('cipNext4').disabled") is False, '阻断项清空后「提交审核」解禁')
    page.locator('#mBody .clpimp-seg button').get_by_text('版本比较').click()
    page.wait_for_timeout(200)
    df = page.locator('#mBody').inner_text()
    ok('版本比较' in page.locator('#mBody .clpimp-seg button.on').inner_text(), '点击后选中态切换到「版本比较」')
    ok('新增物质' in df and '修改物质' in df and '删除物质' in df, '版本比较覆盖新增/修改/删除')
    ok('变更类型覆盖面' in df and 'SCL / M 因子 / ATE 变化' in df, '版本比较展示该模块的变更类型覆盖面')
    ok('必须经人工逐条核对确认后' in df, '预览强调人工逐条核对')
    ok('原文件差异' in df, '区分「本次发布数」与「原文件差异」')
    page.evaluate("()=>clpLImpImpact()")
    page.wait_for_timeout(220)
    ok('示例数据' in page.locator('#mBody').inner_text(), '向导内影响范围同样标注示例')
    back_to_wizard(page)
    ok(page.evaluate('()=>_clpImp.step') == 4 and page.locator('#mBody .clpimp-seg').count() == 1,
       '影响范围弹窗可返回向导第 4 步')

    print('\n=== 导入向导 · 第 5 步：三项确认门禁 + 发布（Annex VI）===')
    page.evaluate("()=>clpLImpNext(5)")
    page.wait_for_timeout(200)
    ok(page.evaluate('()=>_clpImp.step') == 5, '进入第 5 步审核发布')
    ok(page.locator('#mBody .chk').count() == 3, '三项人工确认复选框')
    ok('发布落点' in page.locator('#mBody').inner_text(), '第 5 步给出发布落点')
    page.evaluate("()=>clpLImpPublish()")
    page.wait_for_timeout(220)
    ok(page.evaluate('()=>CLP_MODULES.vi.ver') == 'ATP 22', '未勾选确认时发布被拦截（模块版本未变）')
    n_chg = page.evaluate('()=>CLP_CHANGES.length')
    n_vi = page.evaluate('()=>CLP_VI_ROWS.length')
    confirm_and_publish(page)
    ok(page.evaluate('()=>CLP_MODULES.vi.ver') == 'ATP 23' and page.evaluate('()=>CLP_MODULES.vi.eff') == '2027-02-01',
       '发布后 Annex VI 模块版本 → ATP 23 / 2027-02-01')
    ok(page.evaluate('()=>CLP_MODULES.vi.cutoff') == '2026-09-10', '发布后写入数据截止日期')
    ok(page.evaluate('()=>CLP_VI_ROWS.length') == n_vi + 1, 'Tab1 新增 1 条统一分类条目（5 → 6）')
    ok(page.evaluate("()=>CLP_VI_ROWS.some(r=>r.name==='2-乙基己酸锆'&&r.ver==='ATP 23')"), '新增条目带本次版本号')
    ok(page.evaluate("()=>CLP_VI_ROWS.filter(r=>r.ver==='ATP 23').length") == 6, '原有 5 条生效版本同步更新为 ATP 23')
    ok(page.evaluate('()=>_clpTab') == 'vi', '发布后定位回目标模块 Tab')
    ok(page.evaluate('()=>CLP_CHANGES.length') == n_chg + 1 and page.evaluate("()=>CLP_CHANGES[0].mod") == 'vi',
       '变更记录 +1 且来源模块为 Annex VI')

    print('\n=== 导入向导 · Annex I 分支：系统实时 Diff 与发布门禁 ===')
    fill_and_upload(page, 'rules')
    ok(page.locator('#mBody .cip-check-table tbody tr').count() == 7, 'Annex I 的 7 类问题使用二维表格（内容与 VI 不同）')
    chk = page.locator('#mBody').inner_text()
    ok('规则引擎方法未匹配' in chk and '规则测试未通过' in chk, 'Annex I 规则专属校验项出现')
    ok('引擎支持状态' in chk and '由系统自动判断' in chk and '已忽略' in chk,
       '数据校验页展示系统自动判断的引擎支持状态，并提示上传文件中的该列已忽略')
    ok(page.evaluate('()=>clpImpBlkN()') == 2, 'Annex I 同样 2 项阻断（引擎未匹配 / 测试未通过）')
    segs = page.locator('#mBody .clpimp-seg button').all_text_contents()
    ok(len(segs) == 3 and '规则测试' in segs[1], 'Annex I 才有子 Tab：%s' % ' / '.join(segs))
    gs = page.evaluate("()=>clpImpGates().summary")
    ok(gs['publishable'] == 3 and gs['testFailed'] == 1 and gs['needDev'] == 2 and gs['needInput'] == 1,
       '系统实时统计：可发布 %d / 测试失败 %d / 待研发 %d / 待补充 %d' % (gs['publishable'], gs['testFailed'], gs['needDev'], gs['needInput']))
    page.locator('#mBody .clpimp-seg button').get_by_text('规则测试').click()
    page.wait_for_timeout(220)
    tt = page.locator('#mBody').inner_text()
    ok('规则测试' in page.locator('#mBody .clpimp-seg button.on').inner_text(), 'Annex I 点击后选中态切换到「规则测试」')
    ok('沿用上版测试结果' in tt, '未变化规则沿用上版测试结果（不重复执行计算测试）')
    ok('CLP-R-0002' in tt and '未通过' in tt, '测试失败的规则点名 CLP-R-0002 并标注未通过')
    ok(page.locator('#mBody tr.cip-row-bad').count() >= 1, '未通过的用例行单独标色')
    page.locator('#mBody .clpimp-seg button').get_by_text('版本比较').click()
    page.wait_for_timeout(220)
    d = page.locator('#mBody').inner_text()
    ok('版本比较' in page.locator('#mBody .clpimp-seg button.on').inner_text(), 'Annex I 点击后选中态切换到「版本比较」')
    ok('字段级差异' in d and '皮肤腐蚀阈值' in d, '版本比较给出字段级差异并使用业务字段名')
    ok('发布清单' in d and '暂不发布清单' in d, '版本比较给出发布清单与暂不发布清单')
    man = page.evaluate("()=>clpImpManifest()")
    ok(man['publishableRules'] == ['CLP-R-0001', 'CLP-R-0003', 'CLP-R-0004'],
       '可发布规则 = %s' % '/'.join(man['publishableRules']))
    ok('CLP-R-0002' in man['retainedOldRules'],
       '未通过门禁的已有规则记为旧版继续生效：%s' % '/'.join(man['retainedOldRules']))
    ok(man['pendingDeactivationRules'] == ['CLP-R-0005'] and man['deactivatedRules'] == [],
       '未确认的候选停用规则不进入停用清单（旧规则继续有效）')
    ok(sorted([x['ruleId'] for x in man['deferredRules']]) == ['CLP-R-0002', 'CLP-R-0006', 'CLP-R-0008', 'CLP-R-0009'],
       '延后清单含测试失败与计算方法未实现的规则，不静默丢弃')
    ok(reupload_fixed(page), 'Annex I 上传修正版并复检后清空 2 类阻断')
    page.wait_for_timeout(160)
    page.evaluate("()=>clpLImpNext(5)")
    page.wait_for_timeout(220)
    body5 = page.locator('#mBody').inner_text()
    ok('可发布规则' in body5 and '旧版继续生效' in body5 and '候选停用' in body5,
       '第 5 步展示可发布 / 旧版继续生效 / 候选停用')
    ok(page.locator('#mBody .chk').count() == 2, '第 5 步只有审核确认与停用统一确认两项（单一审核）')
    ok('内部审核' not in body5 and '外部审核' not in body5 and '专业复核' not in body5,
       '第 5 步不出现多级审核类表述')
    n_chg = page.evaluate('()=>CLP_CHANGES.length')
    page.evaluate("()=>clpLImpPublish()")
    page.wait_for_timeout(220)
    st27 = page.evaluate("()=>CLP_RULE_VERSION_STORE.filter(v=>v.version==='R2027.1')[0].status")
    ok(st27 in ('草稿', '待审核'),
       '未勾选审核确认时发布被拦截（版本仍为「%s」，未进入待生效/已生效）' % st27)
    page.evaluate("()=>{$('cipDecl').checked=true;}")
    page.evaluate("()=>clpLImpPublish()")
    page.wait_for_timeout(260)
    v27 = page.evaluate("()=>{var v=CLP_RULE_VERSION_STORE.filter(x=>x.version==='R2027.1')[0];return {st:v.status,by:v.reviewedBy,frozen:v.frozen,def:v.deferredRules.length,decl:v.declarationAccepted};}")
    ok(v27['st'] == '待生效' and v27['frozen'] and v27['by'] == '质管-杨工',
       '生效日期 2027-01-01 晚于当前日期 → 版本「待生效」且已冻结、留痕审核人')
    ok(v27['def'] == 4, '发布快照保存延后规则 %d 条' % v27['def'])
    ok(page.evaluate("()=>clpRuleVersionResolve(clpRuleAsOfDate()).version") == 'R2026.2',
       '待生效版本不改变当前活动规则版本（仍 R2026.2）')
    ok(page.evaluate('()=>CLP_MODULES.rules.ver') == 'R2026.2', '待生效版本的模块版本号暂不更新')
    ok(page.evaluate('()=>CLP_CHANGES.length') == n_chg + 1 and page.evaluate("()=>CLP_CHANGES[0].mod") == 'rules',
       '变更记录 +1 且来源模块为 Annex I 分类规则')
    ok(page.evaluate("()=>CLP_RULE_VERSION_STORE.filter(v=>v.version==='R2026.2')[0].status") == '已生效',
       '基线版本仍为已生效（未被待生效版本挤掉）')

    print('\n=== 导入向导 · Annex III/IV/V 分支 ===')
    fill_and_upload(page, 'labels')
    ok(page.locator('#mBody .cip-check-table tbody tr').count() == 9, '标签字典的 9 类问题使用二维表格')
    segs = page.locator('#mBody .clpimp-seg button').all_text_contents()
    ok(len(segs) == 2, '标签字典无「规则测试」子 Tab（仅 2 个子 Tab）：%s' % ' / '.join(segs))
    ok(reupload_fixed(page), '标签字典上传修正版并复检后清空 2 类阻断')
    page.wait_for_timeout(160)
    page.evaluate("()=>clpLImpNext(5)")
    page.wait_for_timeout(220)
    body5 = page.locator('#mBody').inner_text()
    ok('测试结果' not in body5, '非规则模块不显示测试结果行')
    ok('Annex V 象形图不参与本次导入' in body5, '发布落点说明 Annex V 不参与导入')
    n_lb = page.evaluate('()=>CLP_LABELS.length')
    confirm_and_publish(page)
    ok(page.evaluate('()=>CLP_MODULES.labels.ver') == 'L2026.4', '发布后标签字典版本 → L2026.4')
    ok(page.evaluate('()=>CLP_LABELS.length') == n_lb + 1, 'Tab3 新增 1 条字典条目（22 → 23）')
    ok(page.evaluate("()=>CLP_LABELS.some(r=>r.code==='H360Df'&&r.st==='新增')"), '新增条目 H360Df 数据状态为「新增」')

    print('\n=== 发布结果复核：三张表 + 变更记录 ===')
    page.evaluate("()=>{_clpF.vi={kw:'',ver:''};clpLGoTab('vi');}")
    page.wait_for_timeout(220)
    ok(page.locator('#clpTable tbody tr').count() == 6, 'Tab1 现为 6 条')
    vs = page.evaluate("()=>[].map.call($('clpViVer').options,x=>x.text)")
    ok('ATP 23' in vs and 'ATP 22' not in vs, '生效版本下拉自动出现 ATP 23 且不再含 ATP 22：%s' % ' / '.join(vs))
    ok('ATP 23' in page.locator('.clp-strip').first.inner_text() and '2027-02-01' in page.locator('.clp-strip').first.inner_text(),
       'Tab1 信息条随发布更新')
    page.evaluate("()=>{_clpF.rules={kw:'',tgt:'',st:'',eng:''};clpLGoTab('rules');}")
    page.wait_for_timeout(220)
    page.select_option('#clpRuSt', '已发布')
    page.wait_for_timeout(160)
    ok('没有匹配的记录' in page.locator('#clpTable tbody').inner_text(),
       'R2027.1 为待生效，当前规则表（活动版本 R2026.2 快照）尚无「已发布」规则')
    page.select_option('#clpRuSt', '待审核')
    page.wait_for_timeout(160)
    ok('没有匹配的记录' in page.locator('#clpTable tbody').inner_text(),
       '当前生效规则集（R2026.2 快照）无待审核规则')
    def6 = page.evaluate("""() => {
      var v = CLP_RULE_VERSION_STORE.filter(function(x){ return x.version === 'R2027.1'; })[0];
      var d = null; (v.deferredRules || []).forEach(function(x){ if(x.ruleId === 'CLP-R-0006') d = x; });
      return d ? d.gateStatus : 'missing';
    }""")
    ok(def6 == '待研发实现',
       '未通过门禁的规则留在待生效版本的延后清单（R-0006 门禁状态「%s」，不被待生效版本改写为已发布）' % def6)
    page.select_option('#clpRuSt', '')
    page.evaluate("()=>clpLGoTab('chg')")
    page.wait_for_timeout(220)
    first = page.locator('#clpTable tbody tr').first.inner_text()
    ok('Annex III/IV/V 标签字典' in first, '变更记录首行来自最近一次发布：%s' % first.replace('\n', ' ')[:70])

    print('\n=== 表述红线 ===')
    alltxt = page.locator('#pageHost').inner_text() + page.locator('#clpDw').inner_text()
    ok('自动解析' not in alltxt and '系统解析' not in alltxt, '页面无「自动解析法规」类表述')
    ok(page.evaluate("()=>CLP_IMP_MODS.rules.gather.indexOf('法规专员在系统外')>=0"), '规则模块口径：法规专员在系统外整理')
    ok(page.evaluate("()=>CLP_IMP_MODS.labels.gather.indexOf('官方没有结构化 Excel')>=0"), '字典模块口径：官方无结构化 Excel')
    ok(page.evaluate("()=>CLP_IMP_MODS.vi.gather.indexOf('以 OJ 为准')>=0"), '分类模块口径：法律效力以 OJ 为准')

    print('\n=== 运行时 ===')
    ok(not errors, 'CLP 法规库全流程 JavaScript 错误为 0' + (('：' + errors[0]) if errors else ''))
    browser.close()

print('\n=== 结果：通过 %d / 失败 %d ===' % (passed, failed))
raise SystemExit(1 if failed else 0)
