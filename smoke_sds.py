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
        if s == 4:
            # ---- 本轮新增：三态口径（原则 7/8：不得把写死结论伪装成自动计算）----
            tri = page.evaluate("""() => {
              var m={}; wz.classItems.forEach(function(c){ m[c.id]={s:c.status,n:c.need||'',r:c.result}; });
              return {m:m, ok4:wzCheck(4).ok,
                      conf:wz.classItems.filter(function(c){return c.status==='pending'&&c.need==='confirm';}).length,
                      judge:wz.classItems.filter(function(c){return c.status==='pending'&&c.need!=='confirm';}).length};
            }""")
            auto = ['acuteOral', 'skin', 'sens', 'eye']
            bad = [k for k in auto if tri['m'][k]['s'] == 'pending']
            if bad:
                errors.append('[结论诚实性] 规则引擎可算的类别被置为待判定：%s' % ' / '.join(bad))
            # ---------- 输入可靠性门禁（第三十八轮）----------
            # aqua 依赖组分的水生慢性分类来源依据：存在 aqState!=known 的组分时必须转「待人工判断」
            # （兑现 SDS 第 3 步的承诺），补录依据后又必须能恢复自动计算 —— 两端都要验
            aq = tri['m']['aqua']
            if aq['s'] != 'pending' or aq['n'] == 'confirm' or aq['r'] != u'—':
                errors.append('[输入可靠性] aqua 在存在 aqState!=known 组分时应为「待人工判断」，'
                              '实际 %s / %s / %s' % (aq['s'], aq['n'], aq['r']))
            recov = page.evaluate("""() => {
              var tgt=['50-00-0','111-76-2'],bak={};
              tgt.forEach(function(c){bak[c]=clpSupplementalGet(c).aquaticState;clpSupplementalUpsert(c,{aquaticState:'known'},{sourceRef:'测试补录'});});
              var it=clpEvaluateMixture(wz.formula).items.filter(function(x){return x.id==='aqua';})[0];
              var got={s:it.status,r:String(it.result),f:String(it.formula||'')};
              tgt.forEach(function(c){clpSupplementalUpsert(c,{aquaticState:bak[c]},{sourceRef:'测试复位'});});
              return got;
            }""")
            if recov['s'] != 'auto' or recov['r'] == u'—':
                errors.append('[输入可靠性] 补录水生毒性来源依据后 aqua 应恢复自动计算，实际 %s / %s'
                              % (recov['s'], recov['r']))
            if u'加和法未执行' in recov['f']:
                errors.append('[输入可靠性] 补录后 aqua 的计算过程仍停留在「加和法未执行」')
            print('  aqua 门禁：补录前 待人工判断 / 补录后 %s（%s）' % (recov['s'], recov['r']))
            for k in ['ed', 'pmt', 'resp', 'repr']:
                if tri['m'][k]['s'] != 'pending' or tri['m'][k]['n'] == 'confirm':
                    errors.append('[结论诚实性] %s 应标「待人工判断」，实际 %s / %s' % (k, tri['m'][k]['s'], tri['m'][k]['n']))
            for k in ['stot', 'carc']:
                if tri['m'][k]['s'] != 'pending' or tri['m'][k]['n'] != 'confirm':
                    errors.append('[结论诚实性] %s 应标「系统建议·待人工确认」，实际 %s / %s' % (k, tri['m'][k]['s'], tri['m'][k]['n']))
            sug = page.evaluate("""() => {
              var i=wz.classItems.findIndex(function(c){return c.id==='carc';});
              adjClass(i);
              var txt=$('modal').innerText;
              closeModal();
              return {value:wz.classItems[i].sug, text:txt};
            }""")
            if sug['value'] != u'类别 1B' or u'系统建议：类别 1B' not in sug['text'] \
                    or u'系统无法自动判定' in sug['text']:
                errors.append('[待确认] 致癌性逐条确认弹窗丢失系统建议：%s' % sug)
            print('  三态：引擎自动 %d 项 / 待人工确认 %d 项 / 待人工判断 %d 项' % (len(auto), tri['conf'], tri['judge']))
            if tri['ok4']:
                errors.append('[阻断] 存在待判定项时 wzCheck(4) 仍放行')
            run = page.evaluate("""() => {
              var live=clpEvaluateMixture(wz.formula),items={};
              live.items.forEach(x=>items[x.id]={result:x.result,method:x.method,rules:x.ruleIds,formula:x.formula});
              var frozen=wz.classPack.id;
              /* 发布未来 Annex VI 快照后，已生成 SDS 的包编号仍保持原值。 */
              clpViDatasetPublish(clpViDemoDraft('ATP 23','2027-02-01','2026-09-10',
                {regulation:'测试',sourceFile:'演示整理稿',sourceVersion:'ATP 23',sourceDate:'2026-09-10'}),{reviewer:'法规专员'});
              var next=clpActivePack('2027-02-01').id;
              return {pack:wz.classPack,items:items,labels:live.labels,frozen:frozen,next:next,
                body:$('wzBody').innerText};
            }""")
            print('  规则包=%s 方法=%s' % (run['pack']['id'], ' / '.join(run['pack']['methods'])))
            print('  计算结果=%s' % ', '.join('%s:%s' % (k, v['result']) for k, v in run['items'].items()))
            if run['pack']['id'] != 'CLP-EU-ATP22-R2026.2-L2026.3':
                errors.append('[规则包] 生效包编号不正确：%s' % run['pack']['id'])
            if run['pack']['methods'] != ['CLP-M-ATE-SUM', 'CLP-M-GCL-SUM', 'CLP-M-SCL', 'CLP-M-MFACTOR']:
                errors.append('[规则包] 四种计算方法未完整启用')
            expected = {'acuteOral': 'CLP-M-ATE-SUM', 'skin': 'CLP-M-GCL-SUM', 'sens': 'CLP-M-SCL',
                        'eye': 'CLP-M-GCL-SUM', 'aqua': 'CLP-M-MFACTOR'}
            if any(run['items'].get(k, {}).get('method') != v for k, v in expected.items()):
                errors.append('[规则包] SDS 分类项没有按预期调用规则方法')
            if run['items']['skin']['result'] != '类别 2' or run['items']['sens']['result'] != '类别 1' \
                    or run['items']['eye']['result'] != '类别 2':
                errors.append('[规则包] 示例配方的动态分类结果不正确')
            # 规则编号 / 方法编号属审计信息：默认必须收起，展开后才可见
            if 'CLP-R-0001' in run['body']:
                errors.append('[规则包] 规则编号/方法编号未默认收起，占用了主界面')
            exp = page.evaluate("""() => {
              for(var i=0;i<wz.classItems.length;i++) evToggle(i);
              return {body:$('wzBody').innerText, btn:$('evbtn0')?$('evbtn0').textContent:''};
            }""")
            if '计算依据' not in exp['btn']:
                errors.append('[规则包] 缺少「查看计算依据」展开入口')
            if not all(x in exp['body'] for x in ['本次调用的 CLP 规则包', 'CLP-R-0001', 'CLP-R-0002',
                                                  'CLP-M-ATE-SUM', 'CLP-M-GCL-SUM', 'CLP-M-SCL', 'CLP-M-MFACTOR']):
                errors.append('[规则包] 展开「查看计算依据」后仍未展示规则包、规则编号与方法代码')
            print('  审计信息默认收起：%s / 展开后可见：%s'
                  % ('CLP-R-0001' not in run['body'], all(x in exp['body'] for x in ['CLP-R-0001', 'CLP-M-ATE-SUM'])))
            if run['frozen'] == run['next'] or run['frozen'] != run['pack']['id']:
                errors.append('[规则包] SDS 未保留生成时的规则包版本快照')
            if not run['labels']['hCodes'] or not run['labels']['pCodes']:
                errors.append('[规则包] 规则包没有返回 H 码与 P 码候选')
            # ---- 第三十八轮：第 3 步「一键补充演示数据」真实点击 → 第 4 步恢复自动计算 ----
            page.evaluate('wzGo(3)'); page.wait_for_timeout(250)
            row_fill = page.locator('#wzBody button:has-text("去组分库补录")')
            if row_fill.count() == 0:
                errors.append('[演示补录] 区块④缺少逐条「去组分库补录」入口')
            else:
                row_fill.first.click(); page.wait_for_timeout(800)
                if page.evaluate('() => curPage') != 'bd:comp' or page.locator('#modal').count() != 1:
                    errors.append('[演示补录] 逐条补录没有跳到组分基础数据并打开维护弹窗')
                page.evaluate("() => {closeModal();showPage('sds:wizard');wzGo(3);}")
                page.wait_for_timeout(300)
            btn_txt = page.evaluate("""() => {
              var r=[]; [].slice.call(document.querySelectorAll('#wzBody button')).forEach(function(b){
                if(b.textContent.indexOf('一键')>=0) r.push(b.textContent.trim()); });
              return r.join(','); }""")
            miss_n = page.evaluate('() => wzMissCount()')
            fillable_n = page.evaluate("() => Object.keys(wz.collect).reduce((n,c)=>n+wz.collect[c].filter(i=>i.miss&&!clpCollectControlled(DATA_ITEMS.indexOf(i.k))&&DEMO_FILL.collect[i.k]).length,0)")
            if fillable_n and u'一键填充非 CLP 演示数据' not in btn_txt:
                errors.append('[演示补录] 存在 %d 项可补充的非 CLP 数据，但区块①缺少演示补录按钮' % fillable_n)
            if u'一键补充演示数据' not in btn_txt:
                errors.append('[演示补录] 第 3 步区块④未找到「一键补充演示数据」按钮')
            else:
                # 区块①只填充非 CLP 演示数据；CLP 缺失仍须走统一来源维护。
                if fillable_n:
                    page.click('#wzBody button:has-text("一键填充非 CLP 演示数据")')
                    page.wait_for_timeout(300)
                    if page.evaluate("() => Object.keys(wz.collect).reduce((n,c)=>n+wz.collect[c].filter(i=>i.miss&&!clpCollectControlled(DATA_ITEMS.indexOf(i.k))&&DEMO_FILL.collect[i.k]).length,0)") != 0:
                        errors.append('[演示补录] 非 CLP 演示数据未补齐')
                # 区块④：一键补充 → 阻止项归零，且第 4 步 aqua 恢复自动计算
                page.click('#wzBody button:has-text("一键补充演示数据")')
                page.wait_for_timeout(300)
                if page.evaluate('() => wzBlockers().length') != 0:
                    errors.append('[演示补录] 点击后第 3 步阻止项未归零')
                page.evaluate('wzGo(4)'); page.wait_for_timeout(300)
                aq2 = page.evaluate("""() => {
                  var c=wz.classItems.filter(function(x){return x.id==='aqua';})[0];
                  return {s:c.status,r:String(c.result)}; }""")
                if aq2['s'] != 'auto' or aq2['r'] == u'—':
                    errors.append('[演示补录] 补录后 aqua 未恢复自动计算：%s / %s' % (aq2['s'], aq2['r']))
                if page.evaluate("() => Object.keys(wz.collect).reduce((n,c)=>n+wz.collect[c].filter(i=>i.miss&&!clpCollectControlled(DATA_ITEMS.indexOf(i.k))&&DEMO_FILL.collect[i.k]).length,0)") != 0:
                    errors.append('[演示补录] 非 CLP 演示数据仍有未补齐项')
                # 复位：保证后续第 5/6 步与「未补录」的初始条件一致
                page.evaluate("""() => {
                  ['50-00-0','111-76-2'].forEach(function(c){clpSupplementalUpsert(c,{aquaticState:'unknown',aqRef:''},{sourceRef:'测试复位'});});
                  wz.classItems=null;wz.classPack=null; }""")
                page.evaluate('wzGo(4)'); page.wait_for_timeout(250)
                print('  演示补录：一键补充 → 阻止项归零且 aqua 恢复自动（随后复位）')
        page.screenshot(path=str(SS / ('_ss_sds_step%d.png' % s)))
    # ---- 本轮新增：一键采纳系统建议 → H 码落到标签要素；缺输入的项仍阻断 ----
    print('\n--- 采纳全部系统建议 / 阻断放行 ---')
    page.evaluate('wzGo(4)'); page.wait_for_timeout(250)
    before = page.evaluate("() => wz.classItems.filter(function(c){return c.status==='pending'&&c.need==='confirm';}).length")
    page.evaluate('adoptAllSug()'); page.wait_for_timeout(250)
    aft = page.evaluate("""() => ({
      conf: wz.classItems.filter(function(c){return c.status==='pending'&&c.need==='confirm';}).length,
      adopted: wz.classItems.filter(function(c){return c.status==='confirmed';}).length,
      judge: wz.classItems.filter(function(c){return c.status==='pending'&&c.need!=='confirm';}).length,
      manual: wz.classItems.filter(function(c){return c.status==='manual';}).length,
      h: hCodesMix(), ok4: wzCheck(4).ok, nextDisabled: $('wzNext').disabled
    })""")
    print('  待确认 %d → %d（confirmed=%d / manual=%d）' % (before, aft['conf'], aft['adopted'], aft['manual']))
    if aft['conf'] != 0 or aft['adopted'] == 0:
        errors.append('[采纳] 「采纳全部系统建议」未把待确认项流转为已确认')
    if aft['manual'] != 0:
        errors.append('[采纳] 采纳不应被记为人工改判（manual=%d）' % aft['manual'])
    if 'H350' not in ' '.join(aft['h']):
        errors.append('[采纳] 采纳后致癌性结论仍未进入标签要素：%s' % ' / '.join(aft['h']))
    if aft['ok4'] or not aft['nextDisabled']:
        errors.append('[阻断] 仍有 %d 项待人工判断，却已放行进入第 5 步' % aft['judge'])
    print('  仍有待人工判断 %d 项 → 第 5 步阻断：%s' % (aft['judge'], aft['nextDisabled']))

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
