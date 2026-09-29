# -*- coding: utf-8 -*-
"""菜单字段核对批 B：原料暂存区 Tab、供应商双源表单与联系人。"""
from pathlib import Path
from playwright.sync_api import sync_playwright

CHROME = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
passed, failed = [], []


def ok(value, message):
    (passed if value else failed).append(message)
    print(('PASS ' if value else 'FAIL ') + message)


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1600, 'height': 1100})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(Path('PLM3.0全系统演示原型.html').resolve().as_uri())
    page.wait_for_function('MAT_STAGING && SUP_CONTACTS')

    def card(title):
        return page.locator('#pageHost .card').filter(has=page.locator('h3', has_text=title)).first

    # ---------- B-① / E 组：原料信息 · 暂存区 ----------
    page.evaluate("showPage('bd:rawmat')")
    page.wait_for_timeout(400)
    tabs = page.locator('#rmTabs button').all_text_contents()
    ok(tabs == ['原料台账', '暂存区'], '原料信息页为「原料台账 / 暂存区」两个 Tab')
    ok(page.locator('#dbTable').count() > 0, '默认停在原料台账，原内容照常渲染')

    page.locator('#rmTabs button', has_text='暂存区').click()
    page.wait_for_timeout(300)
    heads = page.locator('#stgTable th').all_text_contents()
    ok(heads == ['暂存编号', '物料名称', 'CAS', 'MSDS 附件', '存货编码', '来源', '进入时间', '状态', '操作'],
       '暂存区列头含「存货编码」，共 9 列')
    ok(page.locator('#stgTable tbody tr').count() == 5, '暂存区演示数据 5 条')

    st = page.evaluate("()=>MAT_STAGING.map(r=>r.status)")
    ok(sorted(st) == sorted(['待匹配编码', '待补 CAS', '待补 MSDS', '待建档', '已关联']),
       '5 条记录覆盖全部 5 种状态：%s' % st)
    ok(page.evaluate("()=>MAT_STAGING.every(r=>r.status==='已关联'||r.status===stgNextStatus(r))"),
       '每条记录的状态与字段齐备情况自洽')

    # E-① 说明收起在右上角「说明」按钮
    ok(page.locator('#nb-rmstg').count() == 1, '页头右上角出现「说明」按钮')
    page.locator('#nb-rmstg').click()
    page.wait_for_timeout(250)
    np = page.locator('#np-rmstg').inner_text()
    ok('存货编码' in np and 'NCC' in np and 'OA' in np, '说明写明 OA 与 NCC 双源拼合、以存货编码为连接键')
    ok('不经过这里' in np, '说明点明信息齐全的原料不进暂存区')
    ok('待匹配编码' in np and '待补 CAS' in np and '待补 MSDS' in np, '说明写明四种待办状态')
    ok(page.locator('#pageHost .notice.grey').count() == 0, '说明收起后不再平铺灰 notice')
    page.locator('#nb-rmstg').click()
    page.wait_for_timeout(200)

    # E-② CAS 类型标注
    ct = sorted(set(page.evaluate("()=>MAT_STAGING.map(r=>r.casType)")))
    ok(ct == ['UVCB', '单一物质', '未判定', '混合物'],
       '演示数据覆盖单一物质 / UVCB / 混合物 / 未判定四种 CAS 类型：%s' % ct)
    ok('—（多组分，见 MSDS）' in page.locator('#stgTable').inner_text(),
       '混合物行的 CAS 格显示为多组分、见 MSDS')
    ok('— 待回填' in page.locator('#stgTable').inner_text(), '缺存货编码的行显示「— 待回填」')

    # E-③ 待匹配编码：必须先同步编码才能建档
    ok(page.evaluate("()=>{stgToFormal('TMP-2026-002');return stgById('TMP-2026-002').status}") == '待匹配编码',
       '缺存货编码时转正式建档被拦下')
    page.evaluate("stgSyncCode('TMP-2026-002')")
    page.wait_for_timeout(300)
    ok(page.evaluate("()=>stgById('TMP-2026-002').code==='MAT-00933'"), '同步后写入存货编码')
    ok(page.evaluate("()=>stgById('TMP-2026-002').status==='待建档'"), '补齐后状态推进到待建档')

    # E-④ 待补 CAS：补录时可判定为混合物
    page.evaluate("stgFillCas('TMP-2026-004')")
    page.wait_for_timeout(300)
    ok('补录 CAS' in page.locator('#modal .modal-hd h3').inner_text(), '补录 CAS 弹窗标题正确')
    page.locator('#stg_ct').select_option('混合物')
    page.wait_for_timeout(150)
    ok(page.locator('#stg_cas_wrap').is_hidden(), '选混合物后 CAS 输入框隐藏')
    page.locator('#mFoot').get_by_role('button', name='保存').click()
    page.wait_for_timeout(300)
    ok(page.evaluate("()=>stgById('TMP-2026-004').casType==='混合物'"), '补录时可判定为混合物')
    ok(page.evaluate("()=>stgById('TMP-2026-004').status==='待建档'"), '判定后状态推进到待建档')

    # E-⑤ 待补 MSDS：不拦建档，可直接手动建档
    page.evaluate("stgToFormal('TMP-2026-003')")
    page.wait_for_timeout(500)
    ok('缺失' in page.locator('#fx_remark').input_value(), '无 MSDS 也能建档，备注标注附件缺失')
    page.evaluate("closeModal()")

    # E-⑥ 待补 MSDS：也可先上传再建档
    page.evaluate("stgUploadMsds('TMP-2026-003')")
    page.wait_for_timeout(300)
    page.locator('#stg_msds').fill('MSDS_TEA-99_供应商补传.pdf')
    page.locator('#mFoot').get_by_role('button', name='确认上传').click()
    page.wait_for_timeout(300)
    ok(page.evaluate("()=>stgById('TMP-2026-003').msds==='MSDS_TEA-99_供应商补传.pdf'"), '上传后写入附件名')
    ok(page.evaluate("()=>stgById('TMP-2026-003').status==='待建档'"), '上传后状态推进到待建档')

    # E-⑦ 转正式建档带入存货编码
    page.evaluate("stgToFormal('TMP-2026-001')")
    page.wait_for_timeout(500)
    ok(page.locator('#fx_code').input_value() == 'MAT-00912', '存货编码带入「物料编码」字段')
    ok(page.locator('#fx_name').input_value() == '水性消泡剂 DF-90', '暂存名称带入新增表单')
    ok(page.locator('#mr_cas_0').input_value() == '9006-65-9', '暂存 CAS 带入配方行')
    ok('MSDS_DF-90' in page.locator('#fx_remark').input_value(), 'MSDS 附件信息带入备注')
    ok(page.locator('#fx_form').input_value() == '纯物质（单物料）', 'UVCB 转建档按单一物质带出形态')
    page.evaluate("closeModal()")

    # E-⑧ 混合物转建档不塞 100% 单组分
    page.evaluate("stgToFormal('TMP-2026-004')")
    page.wait_for_timeout(500)
    ok(page.locator('#fx_form').input_value() == '混合物（混合料）', '混合物转建档形态带出为混合物（混合料）')
    ok(page.evaluate("()=>_edRecipe.length===0"), '混合物不再塞 100% 单组分，配方留空')
    ok('按 MSDS 第 3 节补录组分' in page.locator('#fx_remark').input_value(),
       '混合物备注提示按 MSDS 第 3 节补录组分')
    page.evaluate("closeModal()")

    # ---------- B-② 供应商维护 ----------
    page.evaluate("showPage('bd:supplier')")
    page.wait_for_timeout(400)
    heads = page.locator('#pageHost th').all_text_contents()
    ok('来源' in heads and '上次采购日期' in heads and '合作起始' not in heads,
       '供应商列表加「来源」「上次采购日期」，移除「合作起始」')
    ok('＋ 新增供应商' in page.locator('.page-acts').inner_text(), '列表右上出现「＋ 新增供应商」')
    row0 = page.locator('#pageHost tbody tr').first.inner_text()
    ok('查看' in row0 and '编辑' in row0, '行操作同时提供查看与编辑')
    ok(page.evaluate("()=>SUPPLIERS.every(s=>s._src==='NCC 同步')"), '现有演示供应商全部标为 NCC 同步')

    last = page.evaluate("()=>supLastBuy('SUP-2026-001')")
    expect = page.evaluate("()=>MAT_BATCH.filter(b=>b.sup==='SUP-2026-001').map(b=>b.arrive).sort().pop()")
    ok(last == expect and bool(last), '上次采购日期取该供应商最近到货批次日期')

    # 编辑：档案层只读
    page.evaluate("supForm('SUP-2026-001')")
    page.wait_for_timeout(400)
    ok('NCC 同步' in page.locator('.sup-arch-hd').first.inner_text(), '档案层标注 NCC 同步')
    ok(page.locator('#sf_code').get_attribute('disabled') is not None
       and page.locator('#sf_name').get_attribute('disabled') is not None, 'NCC 同步时档案层字段只读')
    ok(page.locator('#sf_en').input_value().startswith('Wanhua'), '编辑表单带出英文名称')
    ok(page.locator('#sf_grade').get_attribute('disabled') is None
       and page.locator('#sf_status').get_attribute('disabled') is None, '质量域评级与状态可编辑')
    ok(page.locator('#sfQualBox tbody tr').count() >= 1, '编辑表单带出已有资质证照')
    page.evaluate("closeModal()")

    # 新增：手工建档
    page.evaluate("supForm('')")
    page.wait_for_timeout(400)
    tip = page.locator('#sfSrcTip').inner_text()
    ok('手工建档（待 NCC 同步接管）' in tip, '新增时标题行标注手工建档待接管')
    ok(page.locator('#sf_code').get_attribute('disabled') is None, '手工建档时档案层可填')
    page.locator('#sf_code').fill('SUP-B-NEW')
    page.locator('#sf_name').fill('批 B 新增供应商')
    page.locator('#sf_type').select_option('经销商')
    page.locator('#sf_region').fill('江苏 苏州')
    page.locator('#sf_cat').fill('包装辅材')
    page.locator('#sf_grade').select_option('B')
    page.locator('#sf_status').select_option('观察')
    page.get_by_role('button', name='＋ 添加证照').click()
    page.wait_for_timeout(200)
    page.locator('#sq_n_0').fill('ISO 9001:2015 质量管理体系')
    page.locator('#sq_i_0').fill('2026-01-10')
    page.locator('#sq_v_0').fill('2026-10-20')
    page.locator('#mFoot').get_by_role('button', name='保存').click()
    page.wait_for_timeout(500)
    ok(page.evaluate("()=>{var s=supByCode('SUP-B-NEW');return !!s&&s._src==='手工建档'&&s.cat==='包装辅材'}"),
       '新增保存成功且来源标记为手工建档')
    quals = page.evaluate("()=>mdSupQuals('SUP-B-NEW')")
    ok(len(quals) == 1 and quals[0][0].startswith('ISO 9001'), '资质证照写入并可按多条维护')
    ok(quals[0][3] == '待更新', '证照状态按演示日期锚点推算（90 天内为待更新）')
    ok('批 B 新增供应商' in page.locator('#pageHost tbody').first.inner_text(), '新增供应商出现在列表中')

    # 详情：联系人与新增字段
    page.evaluate("showPage('bd:supplier-detail',{key:'SUP-2026-001'})")
    page.wait_for_timeout(500)
    basic = card('基本信息').inner_text()
    ok('Wanhua Chemical' in basic, '详情基本信息补充英文名称')
    ok('NCC 同步' in basic, '详情基本信息补充来源')
    ok('上次采购日期' in basic, '详情基本信息补充上次采购日期')
    contacts = card('联系人')
    ok(contacts.locator('tbody tr').count() == 2, '联系人子表展示该供应商的 2 个联系人')
    ok('默认' in contacts.inner_text(), '联系人区分默认联系人')
    ok(page.evaluate("()=>Object.keys(SUP_PROFILE).every(c=>mdSupContacts(c).length>=1)"),
       '每家 NCC 同步供应商至少 1 个联系人')
    ok(page.evaluate("()=>mdSupContacts('SUP-B-NEW').length===0"),
       '手工建档的新供应商联系人为空，不伪造演示数据')

    # ---------- C-④ 原料详情基本信息两列 ----------
    page.evaluate("showPage('bd:rawmat-detail',{code:'MAT-00127'})")
    page.wait_for_timeout(500)
    ok(page.locator('#pageHost .desc-list.desc-2col').count() == 1, '原料详情基本信息改用两列布局')
    tracks = page.evaluate("()=>getComputedStyle(document.querySelector('#pageHost .desc-list.desc-2col')).gridTemplateColumns")
    ok(len(tracks.split()) == 4, '两列布局为 4 条栅格轨道（标签+值 ×2）：%s' % tracks)
    basic = page.locator('#pageHost .desc-list.desc-2col')
    ok('物料编码' in basic.inner_text() and '停用时间' in basic.inner_text(), '两列后字段仍完整')
    box = basic.bounding_box()
    ok(box['height'] < 380, '基本信息栏竖向高度收敛到 %dpx（单列约 600px）' % int(box['height']))

    page.screenshot(path='/private/tmp/plm-batch-b.png', full_page=False)
    ok(not errors, '页面无运行时错误：%s' % errors)

    print('\n批 B：%d 通过，%d 失败' % (len(passed), len(failed)))
    browser.close()
