# -*- coding: utf-8 -*-
"""流程引导专项：菜单首位、三页内容、节点路由与主操作。"""
import os
from playwright.sync_api import sync_playwright

CHROME = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
URL = 'file://' + os.path.abspath('PLM3.0全系统演示原型.html')
passed = failed = 0

def ok(cond, message):
    global passed, failed
    if cond:
        passed += 1; print('  ✔ ' + message)
    else:
        failed += 1; print('  ✘ ' + message)

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    page = browser.new_context(viewport={'width': 1600, 'height': 1000}).new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.goto(URL, wait_until='load'); page.wait_for_timeout(700)

    print('=== 菜单位置 ===')
    for group, route in [('proj','proj:guide'),('exp','exp:guide'),('comp','comp:guide')]:
        first = page.evaluate("([g])=>MENU.find(x=>x.id===g).children[0].id", [group])
        ok(first == route, '%s 模块第一项为流程引导' % group)
    ok(page.locator('[data-go="proj:guide"]').count() == 1, '项目管理流程引导入口可见')
    ok(page.locator('[data-go="exp:guide"]').count() == 1, '实验管理流程引导入口可见')
    ok(page.locator('[data-go="comp:guide"]').count() == 1, '合规管理流程引导入口可见')
    inactive_color = page.locator('[data-go="proj:guide"] .nav-label').evaluate("e=>getComputedStyle(e).color")
    ok(inactive_color == 'rgb(105, 177, 255)', '未选中的流程引导菜单使用统一亮蓝强调色')

    def click_node(guide, title, expected, modal=False):
        page.evaluate("r=>showPage(r)", guide); page.wait_for_timeout(120)
        node = page.locator('button.flow-node').filter(has_text=title).first
        ok(node.count() == 1, '节点“%s”存在且可点击' % title)
        if node.count():
            node.click(); page.wait_for_timeout(180)
            ok(page.evaluate('curPage') == expected, '“%s”跳转到 %s' % (title, expected))
            if modal: page.evaluate('closeModal()')

    print('\n=== 实验管理 ===')
    page.evaluate("showPage('exp:guide')"); page.wait_for_timeout(200)
    active_color = page.locator('[data-go="exp:guide"] .nav-label').evaluate("e=>getComputedStyle(e).color")
    ok(active_color == 'rgb(255, 255, 255)', '选中流程引导后文字保持白色，选中态清晰')
    text = page.locator('#pageHost').inner_text()
    ok(all(x in text for x in ['普通实验','DOE 实验','多组实验总结']), '三条实验流程完整')
    ok(page.locator('.flow-guide-card').count() == 3, '实验管理包含 3 张流程卡片')
    ok(page.locator('.flow-node.is-note').count() == 2, '线下执行和向导内部步骤为灰色说明节点')
    page.screenshot(path='/private/tmp/flow-guide-experiment.png', full_page=True)
    for title, route, modal in [
        ('新建实验','exp:list',True),('录入数据','exp:detail',False),('查看分析报告','exp:analysis',False),
        ('新建方案','exp:wizard',False),('确认下发','exp:doe',True),('各组执行录入','exp:list',False),
        ('DOE 分析报告','exp:analysis',False),('选择多组已完成实验','exp:sum',False),('生成对比总结报告','exp:sum-detail',False)]:
        click_node('exp:guide', title, route, modal)

    print('\n=== 项目管理 ===')
    page.evaluate("showPage('proj:guide')"); page.wait_for_timeout(160)
    ok(page.locator('.flow-guide-card').count() == 1, '项目管理为一行轻量流程')
    ok(page.locator('.flow-node.is-note').count() == 2, '需求和验收归档为灰色说明节点')
    click_node('proj:guide','新增项目','proj:new')
    click_node('proj:guide','项目执行','proj:list')
    page.evaluate("closeModal();showPage('proj:guide')"); page.wait_for_timeout(120); page.screenshot(path='/private/tmp/flow-guide-project.png', full_page=True)

    print('\n=== 合规管理 ===')
    page.evaluate("closeModal();showPage('comp:guide')"); page.wait_for_timeout(180)
    text = page.locator('#pageHost').inner_text()
    ok(page.locator('.flow-guide-card').count() == 3, '合规管理共 3 张流程卡：SDS 编写 / 法规统一查询 / 法规库维护')
    ok(all(x in text for x in ['SDS 编写','法规统一查询','法规库维护','专员定期下载维护','不支持自动联网更新']), '三条主线及维护边界完整')
    ok(all(x in text for x in ['加和法','人工补充未匹配内容']), 'SDS 链路写清：系统自动匹配法规库并按加和法计算，缺数据由人工补齐')
    sds_card = page.locator('.flow-guide-card').first
    sds_text = sds_card.inner_text()
    ok(sds_card.locator('.flow-node').count() == 5, 'SDS 编写共 5 步')
    ok(sds_card.locator('button.flow-node').count() == 2, 'SDS 卡片仅录入配方与审核发布可点击，中间 3 步为系统自动执行')
    ok('统一查询' not in sds_text, 'SDS 编写卡片不再出现统一查询入口，避免读成人工去查法规')
    ok('选择组分并录入浓度' in sds_text, '组分选择、浓度录入与冻结合并为同一步（同属生成向导第 2 步）')
    ok('由组分基础数据自动带入' in sds_text, 'CAS 号与物质名称写明由组分基础数据自动带入')
    ok('维护组分与 CAS' not in sds_text, '不再单列“维护组分与 CAS”节点，避免误导需先去基础数据手填 CAS')
    for source in ['ECHA 官网','mem.gov.cn','ZDHC 官网','RoHS','GBZ 2.1']:
        ok(source in text, '法规来源包含 %s' % source)
    ok(page.locator('.flow-reg-card').count() == 7, '展示 7 类法规库维护方式')

    lq_card = page.locator('.flow-guide-card').nth(1)
    lq_text = lq_card.inner_text()
    ok('法规统一查询' in lq_text, '第 2 张卡为法规统一查询')
    ok('不参与 SDS 生成' not in lq_text, '查询卡不带撇清 SDS 的描述性文字')
    ok(lq_card.locator('.flow-node').count() == 0, '查询卡不画编号步骤条（单页一次性操作，无线性流程）')
    ok('一次检索全部已接入法规库' in lq_text, '检索入口写明一次跨库检索')
    ok(lq_card.locator('.flow-dim-card').count() == 3, '展示 3 个查询维度')
    for dim in ['GHS 分类','名录清单','职业接触限值 OEL']:
        ok(dim in lq_text, '查询维度包含 %s' % dim)
    maint_card = page.locator('.flow-guide-card').nth(2)
    ok(maint_card.locator('.flow-node').count() == 3, '法规库维护卡去掉重复的查询入口后为 3 步')
    ok('查询已接入记录' not in text, '维护卡不再重复提供统一查询入口')

    for title, route in [('选择组分并录入浓度','sds:wizard'),('审核发布','sds:list'),('导入向导演示','law:reach')]:
        click_node('comp:guide', title, route)
    page.evaluate("showPage('comp:guide')"); page.wait_for_timeout(160)
    page.locator('.flow-guide-card').nth(1).locator('button.btn-primary').click()
    page.wait_for_timeout(200)
    ok(page.evaluate('curPage') == 'law:query', '查询卡主按钮“打开统一查询”跳转到 law:query')
    page.evaluate("showPage('comp:guide')"); page.screenshot(path='/private/tmp/flow-guide-compliance.png', full_page=True)

    print('\n=== 运行时 ===')
    ok(not errors, '逐节点点击后 JavaScript 错误为 0' + (('：'+errors[0]) if errors else ''))
    browser.close()

print('=== 结果：通过 %d / 失败 %d ===' % (passed, failed))
raise SystemExit(1 if failed else 0)
