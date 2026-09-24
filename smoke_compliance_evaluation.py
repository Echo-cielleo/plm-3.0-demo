# -*- coding: utf-8 -*-
"""阶段 5A：在构建产物中验证统一评估、草稿快照、失效与 SDS 接入。"""
import os
from playwright.sync_api import sync_playwright

URL = 'file://' + os.path.abspath('PLM3.0全系统演示原型.html')
CHROME = '/Users/dowell/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
passed = failed = 0

def ok(value, message):
    global passed, failed
    if value:
        passed += 1; print('  ✔ ' + message)
    else:
        failed += 1; print('  ✘ ' + message)

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1600, 'height': 1000})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL, wait_until='load')
    page.evaluate("() => {wzInitState();wz.project.market='EU';}")

    print('=== 输入合同与草稿快照 ===')
    ok(page.evaluate("() => {var x=complianceEvaluationInputFromWz();return x.product.targetMarket==='EU'&&x.product.formType==='mix'&&x.asOfDate===wz.project.date&&x.formula.length===wz.formula.length&&x.formula[4].concentration===0.35;}"),
       '从 wz 生成组分、市场、产品类型和投放日期')
    ok(page.evaluate("() => {var x=complianceEvaluationInputFromWz();x.formula[0].cas='TEST';return wz.formula[0].cas==='7732-18-5';}"),
       '输入与 wz.formula 深度隔离')
    ok(page.evaluate("() => {var before=JSON.stringify(wz.formula);window.ceDirect=complianceEvaluateDraft(complianceEvaluationInputFromWz());return JSON.stringify(wz.formula)===before;}"),
       '统一评估不修改 wz.formula')
    ok(page.evaluate("() => ceDirect.schemaVersion==='compliance-evaluation-v2'&&!!ceDirect.id&&ceDirect.status==='draft'&&ceDirect.asOfDate===wz.project.date&&!!ceDirect.evaluatedAt&&!!ceDirect.inputFingerprint"),
       '快照标识、schema、草稿状态、日期和指纹齐全')
    ok(page.evaluate("() => {var x=JSON.parse(JSON.stringify(ceDirect));return x.results.classification.items.length>0&&x.results.lists.coverage.requested.length===5&&!!x.inputSnapshot.formula.length;}"),
       '快照可完整 JSON 序列化，没有函数或循环引用')
    ok(page.evaluate("() => {var x=complianceEvaluationInputFromWz(),s=complianceEvaluateDraft(x),old=s.inputSnapshot.formula[0].cas;x.formula[0].cas='TEST';return s.inputSnapshot.formula[0].cas===old;}"),
       '原输入后续修改不影响既有快照')
    ok(page.evaluate("() => {var old=ceDirect.inputSnapshot.formula[0].cas;try{ceDirect.inputSnapshot.formula[0].cas='TEST';}catch(e){}return Object.isFrozen(ceDirect)&&Object.isFrozen(ceDirect.inputSnapshot.formula[0])&&ceDirect.inputSnapshot.formula[0].cas===old;}"),
       '运行时快照及嵌套对象不可直接修改')
    ok(page.evaluate("() => ceDirect.results.classification.items.length===buildClassItems(ceDirect.results.classification).length&&ceDirect.results.classification.executions.length===clpActivePack(wz.project.date).rules.length"),
       '分类展示项与执行证据来自同一次 CLP run')

    print('=== 版本与证据 ===')
    ok(page.evaluate("() => ceDirect.versions.data.clpAnnexVi.version===clpViDatasetResolve(wz.project.date).version"),
       'Annex VI 数据版本按 SDS 投放日期解析')
    ok(page.evaluate("() => ceDirect.versions.data.componentProfiles.length===wz.formula.length&&ceDirect.versions.data.componentProfiles.some(x=>x.dataVersion.supplementalRevision)"),
       '每个组分的补充数据 revision 可追溯')
    ok(page.evaluate("() => ceDirect.versions.rules.clpRulePack===ceDirect.results.classification.pack.id&&!!ceDirect.versions.rules.ruleSetVersion&&ceDirect.versions.rules.ruleIds.length>0"),
       '规则包 ID、版本和执行规则编号齐全')
    ok(page.evaluate("() => ceDirect.versions.labels===ceDirect.results.classification.pack.modules.labels&&ceDirect.versions.labels"),
       '标签版本取自本次规则包')
    ok(page.evaluate("() => ceDirect.versions.template===sdsTemplateVersion()&&REACH_SDS_CH.every(x=>x.det.tpl===ceDirect.versions.template)"),
       '模板版本来自当前 16 章配置且一致')
    ok(page.evaluate("() => ceDirect.results.classification.executions.every(x=>ceDirect.versions.methods[x.methodCode]===x.methodVersion)&&ceDirect.versions.methods['M-LIST']===complianceGetMethod('M-LIST').version"),
       '实际调用的四种 CLP 方法和 M-LIST 版本齐全')
    ok(page.evaluate("() => Object.keys(ceDirect.versions.data.listDatasets).join()==='reach-svhc,reach-xiv,reach-xvii,eu-rohs-annex-ii,zdhc-mrsl'"),
       '只保存欧盟市场实际请求的名单版本')
    ok(page.evaluate("() => Array.isArray(ceDirect.evidence.classification)&&Array.isArray(ceDirect.evidence.lists)&&ceDirect.evidence.lists.length>0"),
       '计算与名单匹配证据进入快照')
    ok(page.evaluate("() => ceDirect.results.classification.pack.asOfDate===ceDirect.asOfDate&&clpViDatasetResolve(ceDirect.asOfDate).version===ceDirect.versions.data.clpAnnexVi.version"),
       'CLP 规则包与 Annex VI 使用同一 asOfDate')

    print('=== 市场选择与名单语义 ===')
    ok(page.evaluate("() => complianceListDatasetKeysForMarket('EU').join()==='reach-svhc,reach-xiv,reach-xvii,eu-rohs-annex-ii,zdhc-mrsl'"),
       '欧盟选择 REACH、RoHS、ZDHC，不含国内目录')
    ok(page.evaluate("() => complianceListDatasetKeysForMarket('CN').join()==='cn-danger,zdhc-mrsl,cn-prohibited-import-export,cn-toxic-chemicals'"),
       '中国选择国内目录、ZDHC、两个待建目录，不含 REACH / RoHS')
    ok(page.evaluate("() => {var r=ceDirect.results.lists;return r.entryResults.some(x=>x.datasetKey==='reach-svhc'&&x.assessmentStatus==='LISTED_ONLY')&&r.entryResults.some(x=>x.datasetKey==='reach-xvii'&&x.assessmentStatus==='LISTED_ONLY')&&r.coverage.complete;}"),
       '默认欧盟配方有有效名单命中，真实条目仅为 LISTED_ONLY')
    ok(page.evaluate("() => ceDirect.results.lists.entryResults.filter(x=>x.assessmentStatus!=='DATASET_UNAVAILABLE').every(x=>x.conditionResults.length===0)"),
       '原始阈值文本没有自动升格为可执行产品条件')
    ok(page.evaluate("() => {var x=complianceEvaluationInputFromWz();x.formula=[{cas:'',ec:'200-001-8',name:'测试',concentration:0.35}];return complianceEvaluateDraft(x).results.lists.entryResults.some(r=>r.matchedBy==='EC');}"),
       '产品评估仍支持 EC 精确匹配')
    ok(page.evaluate("() => {var x=complianceEvaluationInputFromWz();x.formula=[{cas:'',name:'甲醛',concentration:0.35}];return complianceEvaluateDraft(x).results.lists.entryResults.length===0;}"),
       '查询页名称搜索不会参与产品评估')
    ok(page.evaluate("() => {var x=complianceEvaluationInputFromWz();x.formula=[{cas:'',name:'多溴联苯',concentration:0.35}];return complianceEvaluateDraft(x).results.lists.entryResults.length===0;}"),
       '无 CAS / EC 的 RoHS 物质组不通过名称匹配配方')
    page.evaluate("() => {wzInitState();wz.project.market='CN';window.ceCn=complianceEvaluationEnsure();}")
    ok(page.evaluate("() => ceCn.results.lists.coverage.unavailable.join()==='cn-prohibited-import-export,cn-toxic-chemicals'&&!ceCn.results.lists.coverage.complete&&ceCn.results.lists.status==='AUTO'"),
       '中国两个待建目录保留局部不可用，不覆盖可用库结果')
    ok(page.evaluate("() => Object.keys(ceCn.versions.data.listDatasets).length===4&&ceCn.versions.data.listDatasets['cn-toxic-chemicals'].available===false&&!!ceCn.versions.data.listDatasets['cn-toxic-chemicals'].unavailableReason"),
       '不可用状态和原因进入版本快照，未请求欧盟库不进入')
    ok(page.evaluate("() => ceCn.readiness.hasUnavailableDatasets&&!ceCn.readiness.listCoverageComplete&&ceCn.results.lists.entryResults.filter(x=>x.assessmentStatus==='DATASET_UNAVAILABLE').length===2"),
       '部分覆盖进入 readiness，待建目录不被解释为未列入')

    print('=== 失效、指纹与旧快照 ===')
    page.evaluate("() => {wzInitState();wz.project.market='EU';window.ceFirst=complianceEvaluationEnsure();}")
    ok(page.evaluate("() => complianceEvaluationEnsure()===ceFirst"), '相同输入复用当前快照对象')
    mutations = [
      ('CAS', "wz.formula[0].cas='64-17-5'"),
      ('浓度', "wz.formula[0].conc='44.00'"),
      ('组分顺序', "wz.formula.reverse()"),
      ('保密标记', "wz.formula[0].secret=!wz.formula[0].secret"),
      ('市场', "wz.project.market='CN'"),
      ('投放日期', "wz.project.date='2027-03-01'"),
      ('产品类型', "wz.formType='pure'"),
      ('产品名称', "wz.project.product='另一个产品'"),
      ('物料编码', "wz.materialCode='MAT-TEST'"),
      ('目标国家', "wz.project.state='法国'"),
      ('名单上下文', "wz.listContext.useClass='industrial'"),
      ('数据版本', "listGetDataset('reach-svhc').version='TEST-VERSION'"),
      ('规则版本', "clpRuleVersionResolve(wz.project.date).version='TEST-RULE'"),
      ('方法版本', "complianceGetMethod('M-LIST').version='TEST-METHOD'"),
      ('模板版本', "REACH_SDS_CH.forEach(x=>x.det.tpl='TEST-TEMPLATE')"),
    ]
    for label, mutation in mutations:
        # 表达式只来自本测试文件的固定夹具，不执行用户输入。
        page.evaluate("() => {wzInitState();wz.project.market='EU';window.ceOld=complianceEvaluationEnsure();}")
        page.evaluate('() => {' + mutation + ';}')
        ok(page.evaluate("() => {var old=ceOld,newer=complianceEvaluationEnsure();return newer!==old&&newer.id!==old.id&&old.status==='draft'&&Object.isFrozen(old);}"),
           label + ' 变化后指纹兜底创建新快照，旧快照保持不可变')
        if label == '数据版本': page.evaluate("() => {listGetDataset('reach-svhc').version=REACH_MODULES.svhc.ver;}")
        if label == '规则版本': page.evaluate("() => {clpRuleVersionResolve(wz.project.date).version=CLP_MODULES.rules.ver;}")
        if label == '方法版本': page.evaluate("() => {complianceGetMethod('M-LIST').version='1.0.0-demo';}")
        if label == '模板版本': page.evaluate("() => {REACH_SDS_CH.forEach(x=>x.det.tpl='SDS-TPL-2026.1');}")
    page.evaluate("() => {wzInitState();wz.project.market='EU';window.ceOld=complianceEvaluationEnsure();complianceEvaluationInvalidate('测试主动失效');}")
    ok(page.evaluate("() => wz.evaluationDirty&&wz.evaluationInvalidReason==='测试主动失效'&&complianceEvaluationEnsure().id!==ceOld.id"),
       '主动失效原因留痕且触发重算')
    page.evaluate("() => {wzInitState();wz.project.market='EU';complianceEvaluationEnsure();wzSave();wzInitState();wzLoad();}")
    ok(page.evaluate("() => wz.evaluationSnapshot&&wz.evaluationSnapshot.schemaVersion==='compliance-evaluation-v2'&&complianceEvaluationCurrent().id===wz.evaluationSnapshot.id&&Object.isFrozen(wz.evaluationSnapshot)"),
       '草稿持久化与恢复后继续复用不可变快照')
    page.evaluate('wzSave()')
    page.reload(wait_until='load')
    ok(page.evaluate("() => wz.evaluationSnapshot&&Object.isFrozen(wz.evaluationSnapshot)&&Object.isFrozen(wz.evaluationSnapshot.inputSnapshot.formula[0])"),
       '浏览器重新加载后恢复的快照仍被递归冻结')
    page.evaluate("() => {localStorage.removeItem(PERSIST_KEY);wzInitState();wz.project.market='EU';}")
    ok(page.evaluate("() => {var x=complianceEvaluationEnsure();return x&&x.status==='draft'&&wz.evaluationDirty===false;}"),
       '旧草稿缺少评估快照时可按现有 schema 自动重建')
    ok(page.evaluate("""() => {
      wzInitState();wz.project.market='EU';showPage('sds:wizard');
      var original=clpEvaluateMixture,calls=0;
      clpEvaluateMixture=function(){calls++;return original.apply(this,arguments);};
      try{wzGo(4);return calls===1&&wz.evaluationSnapshot.results.classification.pack.id===wz.classPack.id;}
      finally{clpEvaluateMixture=original;}
    }"""), '第 4 步页面与快照共用同一次 CLP 计算')
    ok(page.evaluate("""() => {
      wzInitState();wz.project.market='EU';showPage('sds:wizard');wzGo(2);
      complianceEvaluationEnsure();fmSet(0,'conc','44.00');
      return wz.evaluationDirty&&wz.evaluationInvalidReason==='组分数据变化';
    }"""), '实际配方编辑入口主动标记评估失效')
    ok(page.evaluate("""() => {
      wzInitState();wz.project.market='EU';complianceEvaluationEnsure();
      complianceEvaluationSetListContext({useClass:'industrial'});
      return wz.evaluationDirty&&wz.listContext.useClass==='industrial';
    }"""), '名单上下文维护入口主动标记失效')
    ok(page.evaluate("""() => {
      wzInitState();wz.project.market='EU';complianceEvaluationEnsure();
      var before=clpDataCopy(clpSupplementalGet('50-00-0'));
      clpSupplementalUpsert('50-00-0',{lc50:before.lc50},{sourceRef:'测试补录'});
      var invalidated=wz.evaluationDirty&&wz.evaluationInvalidReason==='组分补充分类数据变化';
      CLP_SUBSTANCE_STORE.supplementalByCas['50-00-0']=before;
      clpRefreshCompatibilityProjections(clpSystemToday());
      return invalidated;
    }"""), '组分补充数据维护后主动标记评估失效')

    print('=== SDS 第 3、4、15 章及边界 ===')
    page.evaluate("() => {wzInitState();wz.project.market='EU';showPage('sds:wizard');wzGo(3);}")
    text3=page.locator('#wzBody').inner_text()
    ok(page.evaluate('WZ_STEPS.length')==6, 'SDS 向导仍为六步')
    ok('法规名单数据准备' in text3 and '已完成检查的数据集' in text3 and '名单命中条目' in text3, '第 3 步展示名单准备、已检查数据集和命中数')
    ok('暂不可用数据集' in text3 and '待补充上下文' in text3, '第 3 步展示不可用和待补上下文计数')
    ok(page.evaluate("() => wzCheck(3).ok===false"), '名单警告不改变原第 3 步受控数据门禁')
    page.evaluate('wzGo(4)')
    text4=page.locator('#wzBody').inner_text()
    ok('法规列入情况' in text4 and 'CLP 危险分类结论' not in page.locator('#wzListAssessment').inner_text(),
       '第 4 步名单独立于 CLP 分类卡片')
    ok(page.locator('#wzListAssessment details').count()>0 and page.locator('#wzListAssessment details[open]').count()==0,
       '名单证据默认折叠')
    page.locator('#wzListAssessment details').first.locator('summary').click()
    detail=page.locator('#wzListAssessment details').first.inner_text()
    ok('M-LIST' in detail and '数据集版本' in detail and '匹配方式' in detail and '覆盖信息' in detail,
       '证据展开后包含方法版本、数据集版本、匹配和覆盖信息')
    ok('已列入；当前数据只支持确认名单列入' in text4 and '名单列入不等同于当前产品已触发限制' in text4,
       '第 4 步明确列入与产品条件判断的区别')
    ok(not any(x in page.locator('#wzListAssessment').inner_text() for x in ['不合规','禁止销售','允许销售','已通过']),
       '名单区块不输出整体产品结论')
    ok(page.evaluate("() => wzCheck(4).ok===false"), '名单结果不新增第 4 步阻断门禁')
    body15=page.evaluate('legalTableHtml()')
    ok(all(x in body15 for x in ['法规或清单','组分','条目','状态','说明','版本','名单列入不等同于当前产品已触发限制']),
       '第 15 章动态表格含六列与列入声明')
    ok('reach-svhc' not in body15 and 'SVHC 候选清单' in body15 and 'Entry 77' in body15 and '甲醛' in body15,
       '第 15 章使用快照展示来源、条目号和命中组分')
    ok('已列入；尚未形成产品级条件判断' in body15, 'LISTED_ONLY 文案说明条件未判定')
    ok('缺少必要上下文' in page.evaluate("complianceEvaluationChapter15Status('NEED_CONTEXT')") and
       '本期未建立可执行数据集' in page.evaluate("complianceEvaluationChapter15Status('DATASET_UNAVAILABLE')"),
       'NEED_CONTEXT 与 DATASET_UNAVAILABLE 文案正确')
    ok(page.evaluate("""() => {
      var ds=listGetDataset('reach-svhc'),entry=JSON.parse(JSON.stringify(ds.entries[0]));
      entry.id='TEST-CONTEXT';entry.entryCode='TEST-CONTEXT';entry.mode='simple-condition';
      entry.conditions=[{field:'useClass',operator:'in',value:['industrial']}];
      ds.entries.push(entry);
      try{
        wzInitState();wz.project.market='EU';
        var s=complianceEvaluationEnsure(),r=s.results.lists.entryResults.find(x=>x.entryId==='TEST-CONTEXT');
        return r&&r.assessmentStatus==='NEED_CONTEXT'&&r.requiredInputs.includes('context.useClass')&&
          legalTableHtml().includes('已列入；缺少必要上下文，尚未完成条件判断')&&
          complianceEvaluationStep3Html(s).includes('需要产品用途');
      }finally{ds.entries.pop();complianceEvaluationInvalidate('测试夹具移除');}
    }"""), '测试夹具产生 NEED_CONTEXT 后第 3 步和第 15 章显示缺少的产品用途')
    page.evaluate("() => {wz.project.market='CN';complianceEvaluationInvalidate('市场变化');}")
    cn15=page.evaluate('legalTableHtml()')
    ok('禁止进出口目录' in cn15 and '有毒化学品名录' in cn15 and '本期未建立可执行数据集' in cn15,
       '第 15 章中国市场展示两个不可用目录，未形成自动判断')
    ok(not any(x in cn15 for x in ['不合规','禁止销售','允许销售']), '第 15 章没有整体产品合规结论')
    ok(page.evaluate("() => typeof exportSdsWord==='function'&&typeof sdsDocBodyHtml()==='string'&&sdsDocBodyHtml().includes('法规或清单')"),
       'Word 草案导出调用链仍可生成第 15 章正文')
    page.evaluate("() => {wz.project.market='EU';complianceEvaluationInvalidate('恢复市场');showPage('law:query');}")
    ok(page.locator('#lqTable tbody tr').count()==47, '法规统一查询保持阶段 4B-1 的 47 行')
    page.evaluate("showPage('law:clp')")
    ok('CLP 法规库' in page.locator('#pageHost').inner_text(), 'CLP 页面正常')
    page.evaluate("showPage('law:reach')")
    ok('REACH 法规库' in page.locator('#pageHost').inner_text(), 'REACH 页面正常')
    page.evaluate("showPage('law:rohs')")
    ok('RoHS 限用物质' in page.locator('#pageHost').inner_text(), 'RoHS 页面正常')
    ok(not errors, '页面 JavaScript 错误为 0：'+('; '.join(errors[:2]) if errors else ''))
    browser.close()

print('=== 统一评估：通过 %d / 失败 %d ===' % (passed, failed))
if failed: raise SystemExit(1)
