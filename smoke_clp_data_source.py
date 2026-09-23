# -*- coding: utf-8 -*-
"""Stage 3 integration checks for versioned CLP substance data and its consumers."""
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


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1600, 'height': 1000})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL, wait_until='load')

    print('=== 官方版本与统一画像 ===')
    ok(page.evaluate("()=>clpViDatasetList().length===1&&clpViDatasetList()[0].version==='ATP 22'"), 'ATP 22 为初始官方快照')
    ok(page.evaluate("()=>Object.isFrozen(clpViDatasetGet('CLP-VI-ATP22').records[0].classifications)"), '已发布条目深度不可变')
    ok(page.evaluate("()=>clpViDatasetResolve('2026-04-30')===null&&clpViDatasetResolve('2026-05-01').version==='ATP 22'"), '版本按生效日期解析')
    ok(page.evaluate("()=>clpSubstanceProfile('108-88-3').effective.ateState==='unknown'&&clpSubstanceProfile('108-88-3').effective.ateValues.oral===null"), '仅有官方记录时缺失 ATE 保持未知')
    ok(page.evaluate("()=>clpSubstanceProfile('50-00-0').effective.classifications.some(x=>x.hazardClass==='Carc.')&&clpSubstanceProfile('50-00-0').effective.classifications.some(x=>x.hazardClass==='Aquatic Chronic')"), '官方与企业补充分类可共同进入画像')
    ok(page.evaluate("()=>clpSubstanceProfile('50-00-0').provenance['classifications.Carc.|']?.sourceType==='annex-vi'&&clpSubstanceProfile('50-00-0').provenance['classifications.Aquatic Chronic|']?.sourceType==='legacy-engine-baseline'"), '分类保留字段级来源')
    ok(page.evaluate("""()=>clpSubstanceProfile('111-76-2').conflicts.some(x=>
      x.field==='classifications.Eye Irrit.|'&&x.officialValue==='2'&&x.supplementalValue==='2A'&&
      x.effectiveValue==='2'&&x.affectsCalculation===false&&x.supplementalSource.sourceType==='supplier-sds')&&
      !clpSubstanceProfile('111-76-2','2026-04-30').effective.classifications.some(x=>x.hazardClass==='Eye Irrit.'&&x.category==='2A')"""),
       '丁醚旧 SDS 展示值 2A 与 Annex VI 类别 2 的差异留痕，不进入计算画像')
    ok(page.evaluate("()=>clpDataConflictList().some(x=>x.cas==='50-00-0'&&x.field==='mFactors.chronic'&&x.officialValue===10&&x.supplementalValue===0&&x.effectiveValue===0&&x.effectiveSource==='legacy-engine-baseline')"), '迁移冲突明确记录旧计算取用值')
    ok(page.evaluate("()=>clpViRowsProjection()[0].cas===clpViRecords()[0].cas&&clpCompProjection()['50-00-0'].mC===clpSubstanceProfile('50-00-0').effective.mFactors.chronic"), '兼容投影从统一数据生成')
    ok(page.evaluate("""()=>clpParamOf('64-17-5').ate==='经口 10 470 mg/kg（远高于分类阈值）'&&
      clpParamOf('79-10-7').scl.includes('（低于则免分类）')&&
      clpParamOf('9009-54-5').uni==='Skin Irrit. 2（聚合物）'&&
      clpParamOf('111-76-2').scl==='—（统一分类无 SCL，按通用浓度限值执行）'"""), '组分库保留阶段二的分类、SCL 和 ATE 说明文字')
    ok(page.evaluate("""()=>{
      showPage('sds:wizard');wzGo(3);var before=wzMissCount();
      var label=document.querySelector('#wzBody button[onclick="wzFillDemo(1)"]').textContent.trim();
      wzFillDemo(1);var after=wzMissCount();
      wz.collected=false;wz.collect={};return before===5&&after===0&&label==='一键填充演示数据';
    }"""), '默认 SDS 第 3 步为 5 项缺失，原按钮一键填充后归零')

    print('=== 跨入口同步 ===')
    ok(page.evaluate("()=>clpLawQueryProjection().length===clpViRecords().length&&lawQueryAllRows().filter(x=>x.sourceType==='clp').length===clpViRecords().length"), '统一查询的 CLP 行为动态投影')
    ok(page.evaluate("()=>LAW_DETAIL.clp6.rows.length===clpViRecords().length"), 'CLP 来源库明细为动态投影')
    before = page.evaluate("()=>({s:clpSubstanceProfile('9009-54-5').effective.ateValues.oral,q:clpParamOf('9009-54-5').ateO})")
    page.evaluate("()=>clpSupplementalUpsert('9009-54-5',{ateValues:{oral:123,dermal:0,inhalation:0},ateState:'known'},{by:'测试',sourceRef:'集成测试'})")
    ok(page.evaluate("()=>clpSubstanceProfile('9009-54-5').effective.ateValues.oral===123&&clpParamOf('9009-54-5').ateO===123&&COMP_CLP['9009-54-5'].ateO===123"), '补充层保存后画像、SDS 与兼容投影同步')
    ok(page.evaluate("()=>clpSubstanceProfile('9009-54-5').provenance['ateValues.oral'].sourceRef==='集成测试'"), '补充值保留维护来源')
    ok(before['s'] == 0 and before['q'] == 0, '补充前的演示基线可读')
    ok(page.evaluate("""()=>{
      wz.project.date=clpSystemToday();
      wz.formula=[{cas:'9009-54-5',name:'聚氨酯',conc:'40'},
        {cas:'7732-18-5',name:'水',conc:'59'},
        {cas:'50-00-0',name:'甲醛',conc:'1'}];
      wzCollectData();
      var polymer=wz.collect['9009-54-5'][8],water=wz.collect['7732-18-5'][8],official=wz.collect['50-00-0'][8];
      return polymer.v==='聚合物豁免注册 (REACH Art.2(9))'&&polymer.src==='reg'&&!polymer.miss&&
        water.v==='未命中其他演示管控清单'&&!water.miss&&
        official.v.includes('CLP Annex VI')&&official.v.includes('SVHC 候选清单');
    }"""), '无 Annex VI 记录时保留原法规清单内容，有记录时合并其他命中')

    print('=== 组分维护入口 ===')
    page.evaluate("()=>{showPage('bd:comp');var r=DB_CFG.component.rows.find(x=>x.cas==='50-00-0');dbEdit(r._id)}")
    ok(page.locator('#clp_uni').get_attribute('readonly') is not None and '官方 Annex VI（只读' in page.locator('#mBody').inner_text(), '官方记录在组分编辑器只读展示')
    ok('Annex VI · ATP 22' in page.locator('#mBody').inner_text() and '旧演示基线 · 待专业核验' in page.locator('#mBody').inner_text(), '业务页面展示官方与迁移冲突的可读来源')
    ok(page.evaluate("""()=>{
      closeModal();dbEdit(DB_CFG.component.rows.find(x=>x.cas==='9009-54-5')._id);
      compClpRowsRead();var note=_edClp.classifications[0].note;
      closeModal();dbEdit(DB_CFG.component.rows.find(x=>x.cas==='79-10-7')._id);
      compClpRowsRead();var limitNote=_edClp.specificLimits[1].note;
      closeModal();dbEdit(DB_CFG.component.rows.find(x=>x.cas==='111-76-2')._id);
      compClpRowsRead();var eye=_edClp.classifications.find(x=>x.hazardClass==='Eye Irrit.');
      return note==='聚合物'&&limitNote==='低于则免分类'&&eye.sourceType==='supplier-sds'&&eye.usedForCalculation===false;
    }"""), '组分编辑器读取结构化行时保留说明文字')
    ok('供应商 SDS' in page.locator('#mBody').inner_text() and '2A' in page.locator('#mBody').inner_text(), '丁醚分类差异在组分编辑器中可见')
    page.evaluate("()=>{closeModal();var r=DB_CFG.component.rows.find(x=>x.cas==='13463-41-7');dbEdit(r._id);compClpClassAdd();compClpLimitAdd();}")
    page.locator('#clp_class_h_4').fill('Skin Irrit.')
    page.locator('#clp_class_cat_4').fill('2')
    page.locator('#clp_class_codes_4').fill('H315')
    page.locator('#clp_limit_h_1').fill('Skin Irrit.')
    page.locator('#clp_limit_cat_1').fill('2')
    page.locator('#clp_limit_val_1').fill('12.5')
    page.evaluate("()=>{var r=DB_CFG.component.rows.find(x=>x.cas==='13463-41-7');dbSave(r._id)}")
    ok(page.evaluate("()=>clpSupplementalGet('13463-41-7').classifications.some(x=>x.hazardClass==='Skin Irrit.'&&x.hCodes[0]==='H315')"), '结构化补充分类从编辑器写入补充层')
    ok(page.evaluate("()=>clpSubstanceProfile('13463-41-7').effective.specificLimits.some(x=>x.hazardClass==='Skin Irrit.'&&x.value===12.5)"), '结构化 SCL 保存后进入统一画像')
    ok(page.evaluate("()=>clpParamOf('13463-41-7').uni.includes('Skin Irrit. 2')&&COMP_CLP['13463-41-7'].haz.skinIrrit==='2'"), 'SDS 与兼容投影同步读取编辑结果')

    print('=== 发布历史与未来日期 ===')
    page.evaluate("""()=>{var d=clpViDemoDraft('ATP 23','2027-02-01','2026-09-10',
      {regulation:'测试',annex:'Annex VI Part 3',sourceFile:'演示结构化整理稿',sourceVersion:'ATP 23',sourceDate:'2026-09-10'});
      window.stage3DraftDiff=clpViDraftDiff(d);clpViDatasetPublish(d,{reviewer:'法规专员'});}""")
    ok(page.evaluate("()=>stage3DraftDiff.add===1&&stage3DraftDiff.mod>=4"), '发布前 Diff 由真实结构化草稿计算')
    ok(page.evaluate("()=>clpViDatasetList().length===2&&clpViDatasetGet('CLP-VI-ATP22').records.length===5&&clpViDatasetGet('CLP-VI-ATP23').records.length===6"), '新版本发布后历史快照保留')
    ok(page.evaluate("()=>clpViDatasetResolve('2026-12-31').version==='ATP 22'&&clpViDatasetResolve('2027-02-01').version==='ATP 23'"), '发布日期与生效日期分开解析')
    ok(page.evaluate("()=>clpSubstanceProfile('111-76-2','2026-12-31').effective.classifications.find(x=>x.hazardClass==='Acute Tox.').category==='4'&&clpSubstanceProfile('111-76-2','2027-02-01').effective.classifications.find(x=>x.hazardClass==='Acute Tox.').category==='3'"), '同一 CAS 的结构化分类按日期切换')
    ok(page.evaluate("()=>clpActivePack('2026-12-31').dataVersion.annexViVersion==='ATP 22'&&clpActivePack('2027-02-01').dataVersion.annexViVersion==='ATP 23'"), '规则包数据版本按同一日期切换')
    ok(page.evaluate("()=>!clpActivePack('2026-04-30').tested&&clpActivePack('2026-04-30').dataVersion===null"), '没有适用官方数据集的日期不冒用当前版本')
    ok(page.evaluate("()=>CLP_VI_ROWS.length===5&&clpViRowsProjection('2027-02-01').length===6"), '当前兼容投影不提前切换未来数据')
    ok(page.evaluate("()=>clpLawQueryProjection('2027-02-01').length===6&&clpLawDetailProjection('2027-02-01').rows.length===6"), '查询和明细可按未来数据版本生成')
    ok(page.evaluate("()=>{wz.formula=[{cas:'111-76-2',name:'乙二醇单丁醚',conc:'100'}];wz.project.date='2027-02-01';wzCollectData();return wz.collect['111-76-2'][12].v.includes('Acute Tox. 3')&&wz.collect['111-76-2'][13].v.includes('H301')&&wz.collect['111-76-2'][8].v.includes('Annex VI');}"), 'SDS 第 3 步分类、H 码和 Annex VI 命中随投放日期读取统一画像')
    ok(page.evaluate("()=>{try{clpViDatasetPublish(clpViDemoDraft('ATP 23','2027-02-01','',{}),{reviewer:'法规专员'});return false;}catch(e){return clpViDatasetList().length===2;}}"), '重复发布被阻止')
    print('=== 待核验冲突门禁 ===')
    blocked = page.evaluate("""()=>{
      clpSupplementalUpsert('50-00-0',{mFactors:{acute:0,chronic:0}},{sourceRef:'组分编辑器重新维护'});
      wz.project.date=clpSystemToday();wz.formula=[{cas:'50-00-0',name:'甲醛',conc:'0.35'}];
      var conflict=clpSubstanceProfile('50-00-0').conflicts.find(x=>x.field==='mFactors.chronic');
      var item=buildClassItems().find(x=>x.id==='aqua');
      return {source:conflict.effectiveSource,status:item.status,need:item.need,result:item.result};
    }""")
    ok(blocked == {'source': 'annex-vi', 'status': 'pending', 'need': 'judge', 'result': '—'}, '迁移例外失效后相关方法阻断，SDS 页面稳定转人工判断')
    ok(not errors, '页面 JavaScript 错误为 0：' + ' | '.join(errors[:2]))
    browser.close()

print('=== 结果：通过 %d / 失败 %d ===' % (passed, failed))
raise SystemExit(1 if failed else 0)
