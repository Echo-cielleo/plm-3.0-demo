# -*- coding: utf-8 -*-
"""阶段 4A：对构建产物中的真实 M-LIST JavaScript 做浏览器断言。"""
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
    page.evaluate("""() => {
      window.MLKEY='engine-test-fixture';
      window.mlEntry=function(id,cas,ec,mode,conditions){
        return {id:id,datasetKey:MLKEY,entryCode:id,name:'仅供内核测试',
          identity:{casNumbers:cas,ecNumbers:ec,aliases:[]},mode:mode,
          applicability:{markets:[],objectTypes:[],useClasses:[]},conditions:conditions,
          source:{datasetVersion:'fixture-1',effectiveFrom:'2026-01-01',reference:'engine-test-fixture'},
          originalText:{summary:'合成夹具',threshold:'',use:'',exemption:''}};
      };
      var conc=[{field:'concentration',operator:'>',value:0.1,unit:'%',basis:'formula-w/w'}];
      listRegisterDataset({key:MLKEY,version:'fixture-1',source:'engine-test-fixture',
        market:'EU',effectiveFrom:'2026-01-01',entries:[
          mlEntry('PLAIN',['999-00-1'],['999-000-1'],'listed-only',[]),
          mlEntry('SAME',['999-00-1'],[],'listed-only',[]),
          mlEntry('MULTI',['999-00-1','999-00-2'],[],'listed-only',[]),
          mlEntry('CONC',['999-00-3'],[],'simple-condition',conc),
          mlEntry('MARKET',['999-00-4'],[],'simple-condition',
            [{field:'targetMarket',operator:'in',value:['EU']}]),
          mlEntry('OBJECT',['999-00-5'],[],'simple-condition',
            [{field:'objectType',operator:'in',value:['article']}]),
          mlEntry('USE',['999-00-6'],[],'simple-condition',
            [{field:'useClass',operator:'in',value:['consumer']}]),
          mlEntry('ALL',['999-00-7'],[],'simple-condition',
            [{field:'targetMarket',operator:'in',value:['EU']},
             {field:'objectType',operator:'in',value:['article']},
             {field:'useClass',operator:'in',value:['consumer']}].concat(conc))
        ]});
      listRegisterDataset({key:'engine-test-fixture-unavailable',version:'fixture-1',
        source:'engine-test-fixture',market:'EU',available:false,
        unavailableReason:'本期尚未建立结构化数据集',entries:[]});
      window.mlRun=function(components,context,keys,date){
        return complianceExecuteMethod('M-LIST',{asOfDate:date||'2026-10-01',
          datasetKeys:keys||[MLKEY],components:components,context:context||{}});
      };
      window.mlPick=function(result,id){return result.entryResults.find(function(x){return x.entryId===id;});};
      window.mlCheck=function(op,value,unit,basis){
        var entry=mlEntry('OP',[],[],'simple-condition',
          [{field:'concentration',operator:op,value:0.1,unit:'%',basis:'formula-w/w'}]);
        return listAssessEntry(entry,[{index:0,concentration:value,
          concentrationUnit:unit||'%',concentrationBasis:basis||'formula-w/w'}],{}).status;
      };
    }""")

    print('=== 方法与数据集注册 ===')
    ok(page.evaluate("() => {var m=complianceGetMethod('M-LIST');return m && m.version==='1.0.0-demo' && m.domain==='LIST' && m.implementationStatus==='implemented' && complianceMethodImplemented('M-LIST')}"),
       'M-LIST 登记版本、LIST 领域和 implemented 状态')
    ok(page.evaluate("() => !CLP_RULES.some(r=>r.method==='M-LIST') && !clpActivePack().rules.some(r=>r.method==='M-LIST')"),
       'M-LIST 未进入 CLP 规则与活动包')
    ok(page.evaluate("() => {try{complianceRegisterMethod({code:'M-LIST',version:'2',implementationStatus:'implemented',execute:function(){}});return false}catch(e){return /重复注册/.test(e.message)&&complianceGetMethod('M-LIST').version==='1.0.0-demo'}}"),
       '方法重复注册报错且保留原版本')
    ok(page.evaluate("() => complianceExecuteMethod('M-NOT-REGISTERED',{}).status==='UNSUPPORTED_METHOD'"),
       '未登记方法保留既有错误状态')
    ok(page.evaluate("() => ['CLP-M-ATE-SUM','CLP-M-GCL-SUM','CLP-M-SCL','CLP-M-MFACTOR'].every(complianceMethodImplemented)"),
       '原四个 CLP 方法仍已实现')
    ok(page.evaluate("() => listGetDatasets().length===10 && listGetDataset('reach-svhc') && listGetDataset('reach-xvii')"),
       '八个业务名单库和两个测试夹具已登记')
    ok(page.evaluate("() => {var d=listGetDataset(MLKEY);try{listRegisterDataset(d);return false}catch(e){return /重复注册/.test(e.message)&&listGetDataset(MLKEY)===d}}"),
       '重复数据集注册报错且未覆盖')
    ok(page.evaluate("() => ['', 'version','source','market'].every(function(field){var d={key:'fixture-bad-'+field,version:'1',source:'fixture',market:'EU',entries:[]};if(field)d[field]='';else d.key='';try{listRegisterDataset(d);return false}catch(e){return true}})"),
       'key、版本、来源和市场缺失均拒绝注册')
    ok(page.evaluate("() => {try{listRegisterDataset({key:'fixture-duplicate-id',version:'1',source:'fixture',market:'EU',entries:[mlEntry('D',[],[],'listed-only',[]),mlEntry('D',[],[],'listed-only',[])]});return false}catch(e){return /重复/.test(e.message)}}"),
       '重复条目 ID 拒绝注册')
    ok(page.evaluate("() => {try{listRegisterDataset({key:'fixture-bad-mode',version:'1',source:'fixture',market:'EU',entries:[mlEntry('D',[],[],'unknown-mode',[])]});return false}catch(e){return /模式/.test(e.message)}}"),
       '不支持的条目模式拒绝注册')
    ok(page.evaluate("() => listDatasetAvailable('reach-svhc','2026-10-01') && !listDatasetAvailable('reach-svhc','2026-01-01') && listResolveDataset('missing','2026-10-01')===null"),
       '数据集按日期可用性解析')
    ok(page.evaluate("() => mlRun([{cas:'999-00-1'}],{},[]).status==='NEED_INPUT'"),
       '未选择任何数据集不会误报 NO_MATCH')

    print('=== 身份匹配与真实 REACH 适配 ===')
    ok(page.evaluate("() => {var r=mlRun([{cas:' 999 - 00 - 1 '}],{});return mlPick(r,'PLAIN').matchedBy==='CAS' && r.summary.listedOnly===3}"),
       'CAS 标准化后精确匹配，一个组分命中多个条目')
    ok(page.evaluate("() => {var r=mlRun([{ec:'999-000-1',name:'毫不相关'}],{});return mlPick(r,'PLAIN').matchedBy==='EC'}"),
       'EC 精确匹配且不依赖名称')
    ok(page.evaluate("() => mlRun([{cas:'999-00-10'}],{}).status==='NO_MATCH'"),
       'CAS 子串不会命中')
    ok(page.evaluate("() => mlRun([{name:'仅供内核测试'}],{}).status==='NO_MATCH'"),
       '名称相似不会命中')
    ok(page.evaluate("() => {var r=mlRun([{cas:'999-00-1'},{cas:'999-00-2'}],{});return mlPick(r,'MULTI').matchedComponents.length===2 && r.entryResults.filter(x=>x.entryId==='MULTI').length===1}"),
       '一个条目可命中两个组分，条目结果只出现一次')
    ok(page.evaluate("() => !clpViRecords().some(x=>x.cas==='80-09-1') && mlRun([{cas:'80-09-1'}],{},['reach-svhc']).entryResults.some(x=>x.entryId==='REACH-SVHC-80-09-1')"),
       '没有 Annex VI 记录仍可命中 SVHC')
    ok(page.evaluate("() => {var r=mlRun([{cas:'50-00-0',ec:'200-001-8'}],{},['reach-svhc','reach-xvii']);return r.entryResults.some(x=>x.datasetKey==='reach-svhc') && r.entryResults.some(x=>x.entryId==='REACH-XVII-77') && r.entryResults.every(x=>x.assessmentStatus==='LISTED_ONLY')}"),
       '甲醛可同时列入 SVHC 和 Annex XVII，均不推断触发')
    ok(page.evaluate("() => {var r=mlRun([{ec:'203-625-9'}],{},['reach-xvii']);return mlPick(r,'REACH-XVII-48').matchedBy==='EC'}"),
       'Annex XVII 的 EC 匹配')
    ok(page.evaluate("() => {var r=mlRun([{cas:'50-00-0'}],{},['reach-xvii'],'2026-07-01');return r.status==='NO_MATCH' && !r.entryResults.some(x=>x.entryId==='REACH-XVII-77')}"),
       '条目生效日前不提前命中')
    ok(page.evaluate("() => {var r=mlRun([{cas:'117-81-7'}],{},['reach-xvii']);return r.status==='NO_MATCH' && !r.entryResults.some(x=>x.entryId==='REACH-XVII-51')}"),
       '多 CAS 物质组条目不会被拆作单物质触发')
    ok(page.evaluate("() => {var a=listGetDataset('reach-svhc'),b=listGetDataset('reach-xvii');return a.version===REACH_MODULES.svhc.ver && b.version===REACH_MODULES.xvii.ver && a.source===REACH_MODULES.svhc.src && b.source===REACH_MODULES.xvii.src && a.entries.length===REACH_SVHC.length && b.entries.length===REACH_XVII.length}"),
       '版本、来源和条目数量均来自现有 REACH 模块')
    ok(page.evaluate("() => {var keys=listGetDatasets().filter(d=>d.source!=='engine-test-fixture').map(d=>d.key);return keys.length===8 && !keys.includes('cl-inventory') && !keys.includes('oel')}"),
       'C&L Inventory 和 OEL 未接入 M-LIST')
    ok(page.evaluate("() => {var e=listGetDataset('reach-xvii').entries.find(x=>x.entryCode==='Entry 77');return e.mode==='listed-only' && e.conditions.length===0 && e.originalText.threshold.includes('75 mg/kg') && e.originalText.exemption.includes('工业用途')}"),
       '复杂浓度、材质及豁免文字只留证据，不转成条件')
    ok(page.evaluate("() => {var r=mlRun([{cas:'50-00-0'}],{},['reach-svhc','reach-xvii']);return r.datasetVersions['reach-svhc']===REACH_MODULES.svhc.ver && r.inputs.length>0 && r.intermediates.identityMatches.length===2 && r.evidence.length===2 && r.entryResults.every(x=>x.source.reference && x.evidence.length)}"),
       '结果保存输入、版本、中间命中和来源证据')

    print('=== 条目状态与上下文 ===')
    ok(page.evaluate("() => mlPick(mlRun([{cas:'999-00-1'}],{}),'PLAIN').assessmentStatus==='LISTED_ONLY'"),
       '无结构化条件只返回 LISTED_ONLY')
    ok(page.evaluate("() => mlPick(mlRun([{cas:'999-00-3',concentration:0.2,concentrationUnit:'%',concentrationBasis:'formula-w/w'}],{}),'CONC').assessmentStatus==='TRIGGERED'"),
       '简单浓度条件满足返回 TRIGGERED')
    ok(page.evaluate("() => mlPick(mlRun([{cas:'999-00-3',concentration:0.05,concentrationUnit:'%',concentrationBasis:'formula-w/w'}],{}),'CONC').assessmentStatus==='NOT_TRIGGERED'"),
       '完整执行且浓度未满足返回 NOT_TRIGGERED')
    ok(page.evaluate("() => {var r=mlRun([{cas:'999-00-3'}],{});return r.status==='NEED_INPUT' && mlPick(r,'CONC').assessmentStatus==='NEED_CONTEXT' && mlPick(r,'CONC').requiredInputs.includes('concentration')}"),
       '缺少浓度为 NEED_CONTEXT，方法级为 NEED_INPUT')
    ok(page.evaluate("() => {var r=mlRun([{cas:'999-00-6'}],{});return mlPick(r,'USE').assessmentStatus==='NEED_CONTEXT' && mlPick(r,'USE').requiredInputs.includes('context.useClass')}"),
       '缺少用途返回所需输入')
    ok(page.evaluate("() => {var r=mlRun([{cas:'999-00-5'}],{});return mlPick(r,'OBJECT').assessmentStatus==='NEED_CONTEXT' && mlPick(r,'OBJECT').requiredInputs.includes('context.objectType')}"),
       '缺少对象类型返回所需输入')
    ok(page.evaluate("() => mlPick(mlRun([{cas:'999-00-4'}],{targetMarket:'CN'}),'MARKET').assessmentStatus==='NOT_APPLICABLE'"),
       '市场明确不适用')
    ok(page.evaluate("() => mlPick(mlRun([{cas:'999-00-5'}],{objectType:'mixture'}),'OBJECT').assessmentStatus==='NOT_APPLICABLE'"),
       '对象类型明确不适用')
    ok(page.evaluate("() => mlPick(mlRun([{cas:'999-00-6'}],{useClass:'industrial'}),'USE').assessmentStatus==='NOT_TRIGGERED'"),
       '用途明确不满足则为 NOT_TRIGGERED')
    ok(page.evaluate("() => mlPick(mlRun([{cas:'999-00-7',concentration:0.2,concentrationUnit:'%',concentrationBasis:'formula-w/w'}],{targetMarket:'EU',objectType:'article',useClass:'consumer'}),'ALL').assessmentStatus==='TRIGGERED'"),
       '市场、对象、用途、浓度联合满足')
    ok(page.evaluate("() => {var r=mlRun([{cas:'999-00-3',concentration:0.2,concentrationUnit:'ppm',concentrationBasis:'formula-w/w'}],{});return mlPick(r,'CONC').assessmentStatus==='NEED_CONTEXT' && mlPick(r,'CONC').requiredInputs.includes('concentrationUnit')}"),
       '单位不一致为 NEED_CONTEXT，未隐式换算')
    ok(page.evaluate("() => {var r=mlRun([{cas:'999-00-3',concentration:0.2,concentrationUnit:'%',concentrationBasis:'homogeneous-material'}],{});return mlPick(r,'CONC').assessmentStatus==='NEED_CONTEXT' && mlPick(r,'CONC').requiredInputs.includes('concentrationBasis')}"),
       '浓度基础不一致为 NEED_CONTEXT，未推算配方到材料浓度')
    ok(page.evaluate("() => {var r=mlRun([{cas:'999-00-3',concentration:0.2,concentrationUnit:'%',concentrationBasis:'formula-w/w'}],{},['missing-dataset']);return r.status==='BLOCKED' && r.entryResults[0].assessmentStatus==='DATASET_UNAVAILABLE' && r.summary.datasetUnavailable===1}"),
       '数据集不可用为 BLOCKED，不误判未列入')
    ok(page.evaluate("() => {var r=mlRun([{cas:'999-00-1'}],{},[MLKEY,'missing-dataset']);return r.status==='AUTO' && r.summary.listedOnly>0 && r.summary.datasetUnavailable===1 && !r.coverage.complete}"),
       '部分数据集不可用时保留有效命中，方法为 AUTO')
    ok(page.evaluate("() => {var r=mlRun([{cas:'999-00-1'}],{},[MLKEY,'engine-test-fixture-unavailable']);return r.coverage.evaluated.join()==MLKEY && r.coverage.unavailable.join()==='engine-test-fixture-unavailable' && r.messages.some(x=>x.includes('不是完整覆盖'))}"),
       '部分覆盖的可用与不可用数据集分别留痕')
    ok(page.evaluate("() => {var r=mlRun([{cas:'999-00-3'}],{},[MLKEY,'engine-test-fixture-unavailable']);return r.status==='NEED_INPUT' && mlPick(r,'CONC').assessmentStatus==='NEED_CONTEXT' && !r.coverage.complete}"),
       '局部不可用不能覆盖 NEED_CONTEXT 的方法级状态')
    ok(page.evaluate("() => {var r=mlRun([{cas:'999-00-1'}],{},['missing-dataset','engine-test-fixture-unavailable']);return r.status==='BLOCKED' && r.coverage.evaluated.length===0 && r.entryResults.length===2 && r.entryResults.every(x=>x.assessmentStatus==='DATASET_UNAVAILABLE')}"),
       '全部数据集不可用时 BLOCKED，并保留逐库结果')
    ok(page.evaluate("() => {var r=mlRun([{cas:'999-99-9'}],{},[MLKEY]);return r.status==='NO_MATCH' && r.coverage.complete}"),
       '全部数据集可用且无身份命中时 NO_MATCH')
    ok(page.evaluate("() => {var r=mlRun([{cas:'999-99-9'}],{},[MLKEY,'engine-test-fixture-unavailable']);return r.status==='AUTO' && !r.coverage.complete && r.messages.some(x=>x.includes('不能形成全库'))}"),
       '部分覆盖且无命中不能形成全库 NO_MATCH')
    ok(page.evaluate("() => {var d=listGetDataset('engine-test-fixture-unavailable'),r=mlRun([],{targetMarket:'EU'},[d.key]);return d.available===false && !listDatasetAvailable(d.key,'2026-10-01') && !listResolveDataset(d.key,'2026-10-01') && r.entryResults[0].unavailableReason===d.unavailableReason}"),
       '已注册但不可用的数据集可读元数据且原因进入结果')
    ok(page.evaluate("() => {var ks=['missing-dataset',MLKEY,'missing-dataset','engine-test-fixture-unavailable',MLKEY],before=JSON.stringify(ks),r=mlRun([{cas:'999-00-1'}],{},ks);return JSON.stringify(ks)===before && r.coverage.requested.join()==='missing-dataset,'+MLKEY+',engine-test-fixture-unavailable' && r.coverage.evaluated.join()===MLKEY && r.coverage.unavailable.join()==='missing-dataset,engine-test-fixture-unavailable' && r.inputs[0].datasetKeys.length===5}"),
       '覆盖数组去重保序，原请求及输入快照不变')
    ok(page.evaluate("() => {var r=mlRun([{cas:'999-00-1'}],{},[MLKEY]);return r.status==='AUTO' && r.summary.listedOnly===3 && Object.keys(r.summary).length===6}"),
       '方法级 AUTO 与六种条目状态统计')
    ok(page.evaluate("() => mlRun([{cas:'999-00-3',concentration:0.2,concentrationUnit:'%',concentrationBasis:'formula-w/w'}],{}).entryResults[0].conditionResults[0].actual===0.2"),
       '条件结果保留实际值、中间判定')

    print('=== 比较符边界 ===')
    for operator, expected in [('>', ['NOT_TRIGGERED','NOT_TRIGGERED','TRIGGERED']),
                               ('>=', ['NOT_TRIGGERED','TRIGGERED','TRIGGERED']),
                               ('<', ['TRIGGERED','NOT_TRIGGERED','NOT_TRIGGERED']),
                               ('<=', ['TRIGGERED','TRIGGERED','NOT_TRIGGERED']),
                               ('=', ['NOT_TRIGGERED','TRIGGERED','NOT_TRIGGERED'])]:
        actual = page.evaluate("(op) => [0.09,0.1,0.11].map(v=>mlCheck(op,v))", operator)
        ok(actual == expected, f'{operator} 比较符低于、等于、高于边界：{actual}')
    ok(page.evaluate("() => mlCheck('>',0.2,'ppm','formula-w/w')==='NEED_CONTEXT' && mlCheck('>',0.2,'%','homogeneous-material')==='NEED_CONTEXT'"),
       '直接比较器同样拒绝单位与浓度基础不一致')
    ok(not errors, '页面 JavaScript 错误为 0')
    browser.close()

print(f'=== M-LIST 核心：通过 {passed} / 失败 {failed} ===')
if failed:
    raise SystemExit(1)
