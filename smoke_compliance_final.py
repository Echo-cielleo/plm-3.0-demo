#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""阶段 6：真实构建页面的 EU/CN、OEL、运输与发布冻结验收。"""
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = Path('PLM3.0全系统演示原型.html').resolve().as_uri()
CHROME = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
passed = failed = 0

def check(value, label):
    global passed, failed
    if value:
        passed += 1
        print('  ✔ ' + label)
    else:
        failed += 1
        print('  ✘ ' + label)

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1600, 'height': 1000})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='load')

    print('=== OEL 数据集、原值与第 8 章 ===')
    oel = page.evaluate('''() => {
      wzInitState();wz.project.market='EU';var s=complianceEvaluationEnsure();
      var eu=oelSdsEvaluate([{cas:'50-00-0',name:'甲醛',concentration:0.35},
        {cas:'999-99-9',name:'未维护组分',concentration:1}], 'EU','2026-10-01');
      var cn=oelSdsEvaluate([{cas:'50-00-0',name:'甲醛',concentration:0.35}], 'CN','2026-10-01');
      return {eu,cn,early:oelSdsResolveSet('EU','2025-12-31'),
        snapshot:s,html:oelTableHtml(),oldData:typeof OEL_DATA};
    }''')
    check(oel['eu']['dataset']['id']=='DS-EU-2601' and oel['eu']['dataset']['version']=='V2026.1', '欧盟选择已发布且已生效的 IOELV 数据集')
    check(oel['cn']['dataset']['id']=='DS-CN-1901' and oel['cn']['dataset']['version']=='2019 版', '中国选择 GBZ 2.1 已发布数据集')
    check(oel['early'] is None, '未来版本及已失效版本不提前参与')
    check(len(oel['eu']['rows'])==1 and oel['eu']['rows'][0]['component']['cas']=='50-00-0', '只查询当前配方 CAS')
    limit=oel['eu']['rows'][0]['limit']; cn_limit=oel['cn']['rows'][0]['limit']
    check(limit['type']=='TWA + STEL' and limit['twa']=='0.37' and limit['stel']=='0.74' and limit['ceiling']=='—', '欧盟原始类型及长期短期数值保留')
    check(cn_limit['type']=='MAC' and cn_limit['ceiling']=='0.5' and cn_limit['twa']=='—', '中国 MAC 原值进入上限槽位')
    check(limit['unit']=='mg/m³' and limit['skin']=='是' and limit['sensitization']=='是', '单位、皮肤与致敏标记不换算')
    check(oel['eu']['missingComponents'][0]['cas']=='999-99-9' and oel['eu']['status']=='AVAILABLE', '部分未维护组分作为警告而非阻断')
    check(oel['oldData']=='undefined' and '当前有效 OEL 数据集未维护该组分限值' in oel['html'], '第 8 章不读取旧 OEL_DATA，不把未维护写成不适用')
    check('德国' not in oel['html'] and '波兰' not in oel['html'] and 'V2026.1' in oel['html'], '第 8 章只显示当前 EU 数据集与版本')
    check(oel['snapshot']['versions']['data']['oel']['datasetId']=='DS-EU-2601' and len(oel['snapshot']['evidence']['oel'])>0, '评估快照保存 OEL 版本与证据')
    check(oel['snapshot']['readiness']['oelMissingRecordCount']>0 and oel['snapshot']['readiness']['oelDatasetAvailable'], 'OEL 准备状态记录缺失数量')
    lifecycle=page.evaluate('''() => {
      var base=Object.assign({},OEL_SETS[0]),samples=[
        {id:'TEST-DRAFT',st:'草稿',eff:'2026-09-01'},
        {id:'TEST-REVIEW',st:'待审核',eff:'2026-09-01'},
        {id:'TEST-EXPIRED',st:'已发布',eff:'2026-07-01',exp:'2026-09-30'},
        {id:'TEST-FUTURE',st:'已发布',eff:'2026-11-01'},
        {id:'TEST-VALID',st:'已发布',eff:'2026-09-01',exp:'—'}];
      samples.forEach(x=>OEL_SETS.push(Object.assign({},base,x)));
      var selected=oelSdsResolveSet('EU','2026-10-01').id;
      OEL_SETS.splice(OEL_SETS.length-samples.length,samples.length);
      return selected;
    }''')
    check(lifecycle=='TEST-VALID', '忽略草稿、待审核、过期及未来版本，选择生效日期最新的已发布版本')
    no_set=page.evaluate("() => oelSdsEvaluate(wz.formula,'EU','2019-01-01')")
    check(no_set['status']=='DATASET_UNAVAILABLE' and no_set['rows']==[], '无有效数据集时明确不可用')

    print('=== EU CLP 与 CN_GHS 分流 ===')
    split=page.evaluate('''() => {
      wzInitState();wz.project.market='EU';var original=clpEvaluateMixture,calls=0;
      clpEvaluateMixture=function(){calls++;return original.apply(this,arguments);};
      try{
        var eu=complianceEvaluationEnsure(),euCalls=calls;
        wzInitState();wz.project.market='CN';var cn=complianceEvaluationEnsure();
        return {euCalls,cnCalls:calls-euCalls,eu:eu.results.classification,cn:cn.results.classification,
          cnRules:cn.versions.rules,cnMethods:cn.versions.methods,cnOel:cn.versions.data.oel,
          cnLists:cn.results.lists,cnWarnings:cn.warnings};
      }finally{clpEvaluateMixture=original;}
    }''')
    check(split['euCalls']==1 and split['eu']['framework']['code']=='EU_CLP' and bool(split['eu']['pack']), '欧盟保持单次 EU CLP 自动执行')
    check(split['cnCalls']==0 and split['cn']['framework']['code']=='CN_GHS' and split['cn']['framework']['mode']=='manual-required', '中国不调用 CLP 引擎，采用人工分类模式')
    check(split['cn']['pack'] is None and split['cn']['executions']==[] and split['cn']['labels']['hCodes']==[], '中国没有欧盟规则包、执行过程或 H 码建议')
    check('clpRulePack' not in split['cnRules'] and split['cnRules']['classification']['rulePack'] is None, '中国快照不冒充 CLP 规则版本')
    check(list(split['cnMethods'])==['M-LIST'] and split['cnOel']['datasetId']=='DS-CN-1901', '中国保留名单方法与中国 OEL 版本')
    check(all(x['status']=='pending' and x['need']=='judge' and x['sug'] is None for x in split['cn']['items']), '中国分类项目全为无系统建议的人工待判定')
    check(any(x['code']=='CN_GHS_RULE_PACK_UNAVAILABLE' for x in split['cn']['warnings']), '中国规则包未配置说明进入评估结果')
    check(any(x['datasetKey']=='cn-danger' for x in split['cnLists']['entryResults']), '国内危化品目录继续走 M-LIST')
    check(len(split['cnLists']['coverage']['unavailable'])==2, '两个未建立的国内名单仍标不可用')
    page.evaluate("() => {showPage('sds:wizard');wzGo(4)}")
    text4=page.locator('#wzBody').inner_text()
    check('中国 GHS' in text4 and '尚未配置中国 GHS 自动规则包' in text4 and '系统自动判定' not in text4, '第 4 步明确人工范围且无伪自动状态')
    check(page.locator('#complianceScope').count()==1 and page.locator('#evbd0').evaluate('(el)=>getComputedStyle(el).display')=='none', '范围说明只出现一次，技术证据默认折叠')
    page.evaluate('adjClass(0)')
    check(page.locator('#adjRes').count()==1 and '无系统分类建议' in page.locator('#modal').inner_text(), '中国沿用人工判定弹窗，无欧盟阈值建议')
    page.evaluate("() => {document.getElementById('adjRes').value='不分类（无需分类）';document.getElementById('adjNote').value='依据 GB 30000 和受控资料核对';adjSave(0)}")
    check(page.evaluate("() => wz.classItems[0].status==='manual' && wz.classItems[0].code==='—' && !!wz.classItems[0].noteAt"), '中国人工判定保存结果、理由与时间')
    cn_prep=page.evaluate("() => {wzGo(3);var before=wzMissCount();wzFillDemo(1);return {before,after:wzMissCount(),check:wzCheck(3).ok}}")
    check(cn_prep['before']>0 and cn_prep['after']==0 and cn_prep['check'], '中国补齐非分类数据后可越过第 3 步进入人工分类')

    print('=== 运输四态、表格与发布门禁 ===')
    transport=page.evaluate('''() => {
      wzInitState();wz.project.market='EU';showPage('sds:wizard');wzGo(4);
      wz.classItems.forEach(c=>{if(c.status==='pending'){
        c.status='manual';c.result='不分类（无需分类）';c.code='—';c.note='人工核对';c.noteAt=nowStr();
      }});wz.submitted=true;
      var initial=transportAssessmentStatus(),body=transportTableHtml(),blocked='';
      try{sdsReleaseCreate({name:'EHS 负责人'});}catch(e){blocked=e.message;}
      transportAssessmentSave({status:'NOT_REGULATED',basis:'运输资料人工核对',assessedBy:'EHS 负责人'});
      var unregulated=transportTableHtml(),time=wz.transportAssessment.assessedAt;
      wz.formula[0].conc='46.00';var stale=transportAssessmentStatus(),retained=wz.transportAssessment.basis,staleBody=transportTableHtml(),staleBlocked='';
      complianceEvaluationEnsure();wz.classItems.forEach(c=>{if(c.status==='pending'){
        c.status='manual';c.result='不分类（无需分类）';c.code='—';c.note='人工复核';c.noteAt=nowStr();
      }});
      try{sdsReleaseCreate({name:'EHS 负责人'});}catch(e){staleBlocked=e.message;}
      wz.formula[0].conc='45.00';complianceEvaluationEnsure();wz.classItems.forEach(c=>{if(c.status==='pending'){
        c.status='manual';c.result='不分类（无需分类）';c.code='—';c.note='人工复核';c.noteAt=nowStr();
      }});transportAssessmentSave({status:'NOT_REGULATED',basis:'重新核对',assessedBy:'EHS 负责人'});
      return {initial,body,blocked,unregulated,time,stale,retained,staleBody,staleBlocked};
    }''')
    check(transport['initial']=='NOT_ASSESSED' and '运输分类尚未评估' in transport['body'] and '非危险货物' not in transport['body'], '默认未评估且不伪造非危险货物结论')
    check('第 14 章运输结论尚未确认' in transport['blocked'], '未评估阻断发布')
    check(transport['unregulated'].count('经人工确认：非危险货物 / 不受管制')==5 and bool(transport['time']), '人工非危险货物结论显示五种方式、依据、人员和时间')
    check(transport['stale']=='STALE' and transport['retained']=='运输资料人工核对' and '重新确认' in transport['staleBody'], '配方变化使结论失效但保留旧内容')
    check('第 14 章运输结论尚未确认' in transport['staleBlocked'], '失效结论阻断发布')
    regulated=page.evaluate('''() => {
      var invalid='';try{transportAssessmentSave({status:'REGULATED',basis:'人工核对',assessedBy:'EHS'});}catch(e){invalid=e.message;}
      transportAssessmentSave({status:'REGULATED',unNumber:'UN TEST',properShippingName:'测试运输名称',
        hazardClass:'3',packingGroup:'III',marinePollutant:'否',basis:'人工核对原始资料',
        assessedBy:'EHS',applicableModes:['ADR','RID','ADN','IMDG','IATA']});
      var html=transportTableHtml(),first=sdsReleaseCreate({name:'EHS 负责人'});
      window._stage6Release=first;window._stage6Body=first.document.bodyHtml;
      window.downloadFile=function(name,html){window._word={name,html};};exportSdsWord();
      return {invalid,html,release:first,word:window._word};
    }''')
    check('UN 编号' in regulated['invalid'] and '正确运输名称' in regulated['invalid'], '危险货物必填字段校验')
    check('UN TEST' in regulated['html'] and regulated['html'].count('UN TEST')==5 and '统一运输结论' in regulated['html'], '人工危险货物信息按五种方式展示并说明范围')
    check(regulated['release']['review']['transportAssessment']['status']=='REGULATED' and 'UN TEST' in regulated['release']['document']['bodyHtml'], '发布快照冻结完整运输结论与第 14 章正文')
    check('V2026.1' in regulated['release']['document']['bodyHtml'] and regulated['release']['evaluation']['results']['oel']['rows'], '发布快照冻结 OEL 结果与第 8 章正文')
    check('UN TEST' in regulated['word']['html'] and regulated['word']['name'].endswith('.doc'), '正式 Word 使用冻结发布正文')
    frozen=page.evaluate('''() => {
      var before=JSON.stringify(window._stage6Release),html=window._stage6Body;
      OEL_LIMITS.find(x=>x.id==='L03').twa='9999';
      wz.transportAssessment.unNumber='UN CHANGED';wz.formula[4].conc='9.9';
      wz.project.market='CN';wz.draftEdits[13]='新的运输草稿';
      var old=sdsDocBodyHtml();exportSdsWord();
      var same=JSON.stringify(window._stage6Release)===before&&old===html&&window._word.html.includes(html);
      OEL_LIMITS.find(x=>x.id==='L03').twa='0.37';return same;
    }''')
    check(frozen, 'OEL、运输、配方、市场与草稿变化不改写正式预览、Word 和快照')
    market_stale=page.evaluate("() => {wzInitState();wz.project.market='EU';showPage('sds:wizard');transportAssessmentSave({status:'NOT_REGULATED',basis:'人工核对',assessedBy:'EHS'});pickMarket('CN');return transportAssessmentStatus()==='STALE'&&wz.transportAssessment.basis==='人工核对';}")
    check(market_stale, '市场变化主动使人工运输结论失效并保留旧依据')
    page.evaluate("""() => {wzInitState();wz.project.market='CN';showPage('sds:wizard');wzGo(4);
      wz.classItems.forEach(c=>{c.status='manual';c.result='不分类（无需分类）';c.code='—';c.note='人工审核';c.noteAt=nowStr()});
      transportAssessmentSave({status:'NOT_REGULATED',basis:'运输资料复核',assessedBy:'EHS'});wz.submitted=true;window._cnRelease=sdsReleaseCreate({name:'EHS 负责人'});
    }""")
    cn_release=page.evaluate("() => ({framework:_cnRelease.evaluation.results.classification.framework.code,pack:_cnRelease.evaluation.results.classification.pack,oel:_cnRelease.evaluation.versions.data.oel,manual:_cnRelease.review.classificationDecisions.every(x=>x.decisionType==='manual'),transport:_cnRelease.review.transportAssessment.status,body:_cnRelease.document.bodyHtml,lists:_cnRelease.evaluation.results.lists})")
    check(cn_release['framework']=='CN_GHS' and cn_release['pack'] is None and cn_release['manual'], '中国发布保留原始空白基线与最终人工决定')
    check(cn_release['oel']['datasetId']=='DS-CN-1901' and '2019 版' in cn_release['body'], '中国发布正文与快照保留 GBZ 2.1 版本')
    check(any(x['datasetKey']=='cn-danger' for x in cn_release['lists']['entryResults']) and cn_release['transport']=='NOT_REGULATED', '中国发布保留国内名单与人工运输结论')
    check('CLP Annex IV' not in cn_release['body'] and '中国 GHS 标签要素需法规人员' in cn_release['body'], '中国正文不冒充欧盟 CLP 自动标签规则')
    page.evaluate("() => showPage('law:trans')")
    check('运输自动规则数据源仍待建立' in page.locator('#pageHost').inner_text(), '运输法规库仍为占位')
    check(page.evaluate('WZ_STEPS.length')==6 and not errors, '向导仍为六步且页面 JavaScript 错误为 0')
    browser.close()

print('=== 阶段 6 最终验收：通过 %d / 失败 %d ===' % (passed, failed))
if failed:
    raise SystemExit(1)
