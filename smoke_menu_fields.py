# -*- coding: utf-8 -*-
"""菜单字段核对批 A：产品展示、生产厂商联动、批次规格数量和附件。"""
from pathlib import Path
from playwright.sync_api import sync_playwright

CHROME = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
passed, failed = [], []


def ok(value, message):
    (passed if value else failed).append(message)
    print(('PASS ' if value else 'FAIL ') + message)


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(Path('PLM3.0全系统演示原型.html').resolve().as_uri())
    page.wait_for_function('MAT_LINKED')

    def card(title):
        return page.locator('#pageHost .card').filter(has=page.locator('h3', has_text=title)).first

    page.evaluate("showPage('prod:list')")
    headers = page.locator('#pageHost th').all_text_contents()
    ok('系列' not in headers and '最近同步时间' in headers, '产品列表移除系列并显示最近同步时间')
    ok(page.evaluate("!prodListCfg().kwKeys.includes('series')"), '产品搜索不再匹配系列')
    page.evaluate("prodOpen('PRD-2026-001')")
    body = page.locator('#pageHost').inner_text()
    ok('产品系列' not in body and '最近同步时间' in body, '产品详情字段同步调整')
    ok(page.evaluate("!document.querySelector('.page-sub').textContent.includes(PRODUCTS[0].series)"), '产品副标题移除系列')
    ok('手动编辑仅作补录' in card('理化性质').inner_text() and '外部同步会覆盖手工值' in body, '理化区展示 NCC 优先口径')

    page.evaluate("showPage('bd:rawmat')")
    ok('生产厂商' in page.locator('#dbTable th').all_text_contents(), '原料列表增加生产厂商列')
    ok(page.evaluate("matRows().every(m=>!!m.manufacturer) && DB_CFG.material.sample.every(m=>!!m.manufacturer)"), '全部演示原料及导入示例的厂商非空')
    ok(page.evaluate("matRows().every(m=>{const x=matMainSup(m.code),s=x&&supByCode(x.sup);return !s||s.type!=='生产商'||m.manufacturer===s.name})"), '生产商供货的厂商名称全部自动一致')
    ok(page.evaluate("MAT_BATCH.every(b=>!!b.spec&&!!b.qty)"), '全部演示批次均有规格和数量')

    page.evaluate("matOpen('MAT-00127')")
    ok('生产厂商' in card('基本信息').inner_text(), '原料详情基本信息展示生产厂商')
    headers = card('供应商与货号').locator('th').all_text_contents()
    ok('供货周期' not in headers and '参考价' not in headers and '供应商货号' in headers, '原料供应商表仅保留所需供货字段')
    batch_headers = card('批次测试记录').locator('th').all_text_contents()
    ok('规格' in batch_headers and '数量' in batch_headers and '到货量 kg' not in batch_headers, '原料批次表拆分规格数量')
    page.locator('#pageHost .acts').first.get_by_role('button', name='编辑', exact=True).click()
    ok(page.locator('#fx_manufacturer').input_value() == '万华化学集团股份有限公司' and page.locator('#fx_manufacturer').get_attribute('readonly') is not None, '生产商名称自动带出且只读')
    page.locator('#fx__supCode').select_option('SUP-2026-007')
    ok(page.locator('#fx_manufacturer').input_value() == '' and page.locator('#fx_manufacturer').get_attribute('readonly') is None, '切换经销商后厂商可填写')
    ok(page.locator('#fx_manufacturer').get_attribute('list') == 'matManufacturerDict' and page.locator('#matManufacturerDict option').count() >= 10, '厂商输入关联非空联想字典')
    page.locator('#fx__supNo').fill('KY-WPU-320')
    page.locator('#mFoot').get_by_role('button', name='保存', exact=True).click()
    ok(page.locator('#mask').evaluate("e=>e.classList.contains('on')"), '经销商缺生产厂商时阻止保存')
    page.locator('#fx_manufacturer').fill('巴斯夫（中国）有限公司')
    page.screenshot(path='/private/tmp/plm-batch-a-manufacturer.png')
    page.locator('#mFoot').get_by_role('button', name='保存', exact=True).click()
    ok('巴斯夫（中国）有限公司' in card('基本信息').inner_text() and 'KY-WPU-320' in card('供应商与货号').inner_text(), '从详情编辑后正确回显厂商及供方货号')
    page.evaluate("mdOpenSupplier('SUP-2026-007')")
    ok('WPU-320' in card('供货物料').inner_text(), '变更主供后供应商详情同步关联原料')

    page.evaluate("showPage('bd:rawmat');dbEdit(null)")
    page.locator('#fx_code').fill('MAT-A-NEW')
    page.locator('#fx_name').fill('批 A 新增原料')
    page.locator('#fx_type').select_option('原料')
    page.locator('#fx_form').select_option('混合物（混合料）')
    page.locator('#fx_status').select_option('正常')
    page.locator('#fx__supCode').select_option('SUP-2026-001')
    page.locator('#fx__supNo').fill('WH-A-NEW')
    page.locator('#matRecipeBox').get_by_role('button', name='＋ 添加组分').click()
    page.locator('#mr_cas_0').fill('7732-18-5')
    page.locator('#mr_conc_0').fill('100')
    page.locator('#mFoot').get_by_role('button', name='保存', exact=True).click()
    ok(page.evaluate("matByCode('MAT-A-NEW').manufacturer===supByCode('SUP-2026-001').name"), '新增原料保存自动带出的生产厂商')
    page.evaluate("dbSearch('万华化学')")
    ok('批 A 新增原料' in page.locator('#dbTable').inner_text(), '新增原料在列表中可检索')

    page.evaluate("matOpen('MAT-00127');matTestAdd('MAT-00127')")
    page.locator('#mt_no').fill('BATCH-A-ATTACH')
    page.locator('#mt_spec').fill('200 kg/桶')
    page.locator('#mt_qty').fill('10 桶')
    page.locator('#mt_expiry').fill('2027-09-28')
    page.locator('#mt_result').select_option('合格')
    page.locator('#mt_items').fill('外观 / pH')
    attachment = {'name': '批A检测报告.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.4\n%%EOF'}
    page.locator('#mt_reportFile').set_input_files(attachment)
    ok(page.locator('#mt_report').input_value() == attachment['name'] and page.locator('#mt_report').get_attribute('readonly') is not None, '选择文件自动填写文件名且不可手打')
    page.screenshot(path='/private/tmp/plm-batch-a-attachment.png')
    page.locator('#mFoot').get_by_role('button', name='保存', exact=True).click()
    row = card('批次测试记录').locator('tr', has_text='BATCH-A-ATTACH')
    ok(all(s in row.inner_text() for s in ['200 kg/桶', '10 桶', attachment['name']]), '新增批次回显独立规格数量及附件名')
    replacement = dict(attachment, name='批A检测报告_修订.pdf')
    row.locator('input[type=file]').set_input_files(replacement)
    ok(replacement['name'] in card('批次测试记录').inner_text(), '现有批次支持替换附件')
    # 同时验证内置演示批次的附件替换能够保存。
    seeded = card('批次测试记录').locator('tr', has_text='WPU-D-2608B')
    seeded.locator('input[type=file]').set_input_files(attachment)
    page.reload()
    page.wait_for_function('MAT_LINKED')
    page.evaluate("matOpen('MAT-00127')")
    ok(replacement['name'] in card('批次测试记录').inner_text(), '刷新恢复新增批次和替换后的附件名')
    ok(page.evaluate("matBatch('WPU-D-2608B').report==='批A检测报告.pdf'"), '刷新恢复内置批次的新附件名')
    page.evaluate("mdOpenSupplier('SUP-2026-007')")
    body = page.locator('#pageHost').inner_text()
    ok('发起评审' not in body and '供货周期' not in body and '参考价' not in body, '供应商详情移除评审入口及采购字段')
    headers = card('到货批次').locator('th').all_text_contents()
    ok('规格' in headers and '数量' in headers and '数量 (kg)' not in headers, '供应商批次表拆分规格和数量')
    row = card('到货批次').locator('tr', has_text='BATCH-A-ATTACH')
    ok(all(s in row.inner_text() for s in ['200 kg/桶', '10 桶', replacement['name']]), '供应商批次与原料批次的数据一致')
    ok(not errors, '页面无运行时错误：' + str(errors))
    browser.close()

print('批 A：%d 通过，%d 失败' % (len(passed), len(failed)))
raise SystemExit(bool(failed))
