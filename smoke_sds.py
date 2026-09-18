_CHROME_PATH = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
# -*- coding: utf-8 -*-
"""SDS 主线专项自检：6 步向导 + 清单 + 基础数据 + 法规库"""
import os, pathlib
from playwright.sync_api import sync_playwright

URL = 'file://' + str(pathlib.Path('PLM3.0全系统演示原型.html').resolve())
SS = pathlib.Path('/tmp')

PAGES = [
    ('sds:wizard',   'SDS 文档生成向导', 'sds_wizard'),
    ('sds:list',     'SDS 文档列表',     'sds_list'),
    ('bd:comp',      '组分基础数据',     'bd_comp'),
    ('bd:comp-auto', 'PubChem',          'bd_comp_auto'),
    ('bd:ghs',       'GHS 与受限属性',   'bd_ghs'),
    ('law:zdhc',     'ZDHC',             'law_zdhc'),
    ('law:rohs',     'RoHS 限用物质',    'law_rohs'),
]
errors = []

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=_CHROME_PATH, )
    ctx = b.new_context(viewport={'width': 1600, 'height': 1000})
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append('[pageerror] %s' % e))
    page.on('console', lambda m: errors.append('[console] %s' % m.text) if m.type == 'error' else None)
    page.goto(URL, wait_until='load')
    page.wait_for_timeout(700)

    print('--- 侧栏入口 ---')
    page.click('#navScroll [data-go="sds:wizard"]')
    page.wait_for_timeout(350)
    print('  侧栏高亮锁定 SDS 管理: %s' % (page.locator('#navScroll [data-go="sds:wizard"].active').count() == 1))
    print('  [诊断] data-go 节点数=%d, active 数=%d, curPage=%s' % (
        page.locator('#navScroll [data-go="sds:wizard"]').count(),
        page.locator('#navScroll .nav-item.active').count(),
        page.evaluate('curPage')))
    page.screenshot(path=str(SS / '_ss_sds_wizard.png'))

    print('\n--- 步骤 1：创建 SDS 项目 ---')
    r = page.evaluate("""() => {
      renderSdsWizard(); pickMarket('EU');
      $('f_product').value='水性聚氨酯涂饰树脂 WPU-320'; wzValidate1();
      $('f_state').value='德国 Germany'; $('f_oflang').value='德语 Deutsch'; wzValidate1();
      $('f_lang').value='德语（DE） + 英语（EN）'; wzValidate1();
      return {market:wz.project.market, lang:wz.project.lang, ok:wzCheck(1).ok};
    }""")
    print('  市场=%s 语言=%s 校验通过=%s' % (r['market'], r['lang'], r['ok']))

    print('\n--- 关联物料（应只带物质形态、不带出配方）---')
    r = page.evaluate("""() => {
      wzLoadMaterial('MAT-00127');
      return {code:wz.materialCode, formulaLen:wz.formula.length, type:wz.formType};
    }""")
    print('  物料=%s 物质形态=%s 带出组分数=%s（期望 0）' % (r['code'], r['type'], r['formulaLen']))
    if r['formulaLen'] != 0:
        errors.append('[逻辑] 关联物料仍然带出了配方')

    print('\n--- 步骤 2：从组分库选择 + 冻结配方 ---')
    page.evaluate('wzGo(2)'); page.wait_for_timeout(250)
    page.evaluate('fmPickComp()'); page.wait_for_timeout(250)
    print('  组分库弹窗 .sds-scope=%d 可选项=%d' % (
        page.locator('#modal.sds-scope').count(), page.locator('#pckList .pick-row').count()))
    page.screenshot(path=str(SS / '_ss_sds_pick_comp.png'))
    r = page.evaluate("""() => {
      ['7732-18-5','111-76-2','64-17-5','79-10-7','50-00-0','9009-54-5'].forEach(c=>_pickCompSel[c]=1);
      fmPickApply();
      ['45.00','8.50','5.00','2.50','0.35','38.65'].forEach((v,i)=>wz.formula[i].conc=v);
      wz.formula[3].secret=true; wz.formula[5].secret=true;
      renderStep2();
      return {n:wz.formula.length, total:+wz.formula.reduce((a,b)=>a+(parseFloat(b.conc)||0),0).toFixed(2)};
    }""")
    print('  配方组分=%d 浓度合计=%s%%' % (r['n'], r['total']))
    page.evaluate("() => { wz.frozen=true; wz.frozenAt=nowStr(); renderStep2(); wzUpdateFoot(); }")
    page.wait_for_timeout(200)
    print('  冻结标记出现: %s' % ('已冻结' in page.locator('#pageHost').inner_html()))
    page.screenshot(path=str(SS / '_ss_sds_step2.png'))

    print('\n--- 步骤 3~6 走通 ---')
    for s in range(3, 7):
        page.evaluate('wzGo(%d)' % s); page.wait_for_timeout(300)
        h = page.locator('#pageHost').inner_html()
        kw = {3: '数据项完整度', 4: '分类建议', 5: '化学品及企业标识', 6: '审核与发布操作'}[s]
        print('  步骤 %d 长度 %d 含"%s":%s' % (s, len(h), kw, kw in h))
        page.screenshot(path=str(SS / ('_ss_sds_step%d.png' % s)))
    page.evaluate("() => { wz.submitted=true; wz.published=true; wz.publishedAt=nowStr(); renderStep6(); }")
    page.wait_for_timeout(250)
    print('  已发布状态: %s' % ('已正式发布' in page.locator('#pageHost').inner_html()))
    page.screenshot(path=str(SS / '_ss_sds_step6_pub.png'))

    print('\n--- 逐页内容检查 ---')
    for pid, kw, ss in PAGES:
        before = len(errors)
        page.evaluate('showPage("%s")' % pid); page.wait_for_timeout(320)
        h = page.locator('#pageHost').inner_html()
        ne = errors[before:]
        ok = (kw in h) and not ne and len(h.strip()) > 200
        print('%s %-15s 长度 %6d  含"%s":%s %s' % (
            'OK  ' if ok else 'FAIL', pid, len(h.strip()), kw, kw in h, ne[0] if ne else ''))
        page.screenshot(path=str(SS / ('_ss_%s.png' % ss)))

    print('\n--- 法规库 3 步上传 modal ---')
    page.evaluate('showPage("law:cn")'); page.wait_for_timeout(300)
    page.evaluate('lawUpload(null)'); page.wait_for_timeout(250)
    print('  第 1 步 mini-steps=%d（期望 3）' % page.locator('#modal .mini-step').count())
    page.evaluate("""() => {
      $('lwName').value='REACH Annex XVII（限制物质清单）';
      $('lwOrg').value='ECHA 欧洲化学品管理局';
      $('lwVer').value='V2026.3'; $('lwEff').value='2026-09-01';
      lawPickDemo();
    }""")
    page.wait_for_timeout(200)
    page.evaluate('lawStep2()'); page.wait_for_timeout(1500)
    print('  第 2 步解析预览: %s' % ('解析结果预览' in page.locator('#modal').inner_html()))
    page.screenshot(path=str(SS / '_ss_law_upload2.png'))
    page.evaluate('lawStep3()'); page.wait_for_timeout(250)
    page.evaluate("() => { $('lwOk').checked=true; lawFinish(); }"); page.wait_for_timeout(350)
    print('  入库后法规条数=%d（期望 14，含新增 C&L / 国内危化品库）' % page.evaluate('lawRows.length'))

    print('\n--- 影响分析 ---')
    page.evaluate('showPage("law:cn")'); page.wait_for_timeout(300)
    page.evaluate('lawImpact(lawRows[0]._id)'); page.wait_for_timeout(300)
    mh = page.locator('#modal').inner_html()
    print('  影响分析弹窗: %s / 受影响 SDS %d 行' % ('影响分析' in mh, page.locator('#modal tbody tr').count()))
    page.screenshot(path=str(SS / '_ss_law_impact.png'))
    page.evaluate('closeModal()')

    print('\n--- SDS 清单交互 ---')
    page.evaluate('showPage("sds:list")'); page.wait_for_timeout(300)
    print('  清单行数=%d' % page.locator('#lpHost tbody tr').count())
    page.evaluate('sdsView("SDS-2026-0158")'); page.wait_for_timeout(300)
    print('  详情弹窗: %s' % ('水性聚氨酯涂饰树脂' in page.locator('#modal').inner_html()))
    page.evaluate('closeModal()')

    print('\n--- 总错误数: %d ---' % len(errors))
    for e in errors[:12]:
        print('  ' + e)
    b.close()


# --- 统一退出码：存在失败断言时返回非零，避免 run_smoke.sh 误判为通过 ---
if errors:
    raise SystemExit(1)
