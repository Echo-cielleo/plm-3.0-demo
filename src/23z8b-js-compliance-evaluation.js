/* [23z8b] SDS 草稿合规评估合同：同一次 CLP 执行 + M-LIST，按输入与版本重建快照。 */
var COMPLIANCE_EVALUATION_SCHEMA='compliance-evaluation-v2';
var _complianceEvaluationSerial=0;
var CLASSIFICATION_ITEM_CATALOG=[
  ['ed','内分泌干扰（ED）'],['pmt','PMT / vPvM（持久·迁移·毒性）'],
  ['acuteOral','急性毒性（经口）'],['skin','皮肤腐蚀/刺激'],['sens','皮肤致敏'],
  ['eye','严重眼损伤/眼刺激'],['stot','特异性靶器官毒性（一次接触）'],
  ['carc','致癌性'],['aqua','危害水生环境（长期）'],['resp','呼吸道致敏'],['repr','生殖毒性']
].map(function(x,i){return {id:x[0],name:x[1],order:i+1,appliesTo:['substance','mixture']};});
function complianceClassificationFramework(market){
  return market==='CN'
    ?{code:'CN_GHS',label:'中国 GHS（GB 30000）',mode:'manual-required',status:'rule-pack-unavailable',
      reason:'本原型尚未配置经法规专员审核发布的中国 GHS 规则包'}
    :{code:'EU_CLP',label:'欧盟 CLP',mode:'automatic',status:'available'};
}
function complianceManualClassificationItems(){
  return CLASSIFICATION_ITEM_CATALOG.map(function(x){return {id:x.id,name:x.name,result:'—',code:'—',
    status:'pending',need:'judge',rule:'中国 GHS 规则包尚未配置',input:'需法规人员核对现有资料',
    formula:'需法规人员依据 GB 30000 系列人工判定',src:[['reg','中国 GHS · 人工判定']],sug:null};});
}
function complianceEvaluationCopy(value){return JSON.parse(JSON.stringify(value));}
function complianceEvaluationFreeze(value){
  if(value && typeof value==='object' && !Object.isFrozen(value)){
    Object.keys(value).forEach(function(key){complianceEvaluationFreeze(value[key]);});
    Object.freeze(value);
  }
  return value;
}
function complianceListDatasetKeysForMarket(market){
  return market==='EU'?['reach-svhc','reach-xiv','reach-xvii','eu-rohs-annex-ii','zdhc-mrsl']:
    market==='CN'?['cn-danger','zdhc-mrsl','cn-prohibited-import-export','cn-toxic-chemicals']:[];
}
function sdsTemplateVersion(){
  var versions=REACH_SDS_CH.map(function(ch){return ch.det&&ch.det.tpl;});
  if(!versions.length || versions.some(function(v){return !v || v!==versions[0];}))
    throw new Error('SDS 章节模板版本不一致，请先核对模板配置。');
  return versions[0];
}
function complianceEvaluationInputFromWz(){
  var p=wz.project||{},day=p.date||clpSystemToday(),ctx=wz.listContext||{};
  return complianceEvaluationCopy({asOfDate:day,
    product:{name:p.product||'',materialCode:wz.materialCode||'',formType:wz.formType||'mix',
      targetMarket:p.market||'',targetState:p.state||'',language:p.lang||''},
    formula:(wz.formula||[]).map(function(f){
      var row=DB_CFG.component.rows.find(function(r){return r.cas===f.cas;})||{};
      var profile=p.market==='EU'?clpSubstanceProfile(f.cas,day):{};
      return {cas:f.cas||'',ec:f.ec||profile.ec||row.ec||'',name:f.name||'',
        concentration:f.conc===''?null:Number(f.conc),concentrationUnit:'%',
        concentrationBasis:'formula-w/w',secret:!!f.secret};
    }),
    context:{objectType:ctx.objectType||'mixture',useClass:ctx.useClass||'',
      productCategory:ctx.productCategory||'',materialType:ctx.materialType||''},
    datasetKeys:complianceListDatasetKeysForMarket(p.market)});
}
function complianceEvaluationNormalize(input){
  var copy=complianceEvaluationCopy(input||{}),p=copy.product||{},c=copy.context||{};
  var market=p.targetMarket||'';
  return {asOfDate:copy.asOfDate||clpSystemToday(),
    product:{name:p.name||'',materialCode:p.materialCode||'',formType:p.formType||'mix',
      targetMarket:market,targetState:p.targetState||'',language:p.language||''},
    formula:(copy.formula||[]).map(function(f){
      var n=f.concentration==null||f.concentration===''?null:Number(f.concentration);
      return {cas:f.cas||'',ec:f.ec||'',name:f.name||'',concentration:Number.isFinite(n)?n:null,
        concentrationUnit:f.concentrationUnit||'%',concentrationBasis:f.concentrationBasis||'formula-w/w',
        secret:!!f.secret};
    }),
    context:{objectType:c.objectType||'mixture',useClass:c.useClass||'',
      productCategory:c.productCategory||'',materialType:c.materialType||''},
    datasetKeys:Array.isArray(copy.datasetKeys)?copy.datasetKeys.slice():complianceListDatasetKeysForMarket(market)};
}
function complianceEvaluationVersions(input){
  var eu=input.product.targetMarket!=='CN',pack=eu?clpActivePack(input.asOfDate):null,
    vi=eu?clpViDatasetResolve(input.asOfDate):null,lists={};
  input.datasetKeys.forEach(function(key){
    var d=listGetDataset(key),available=!!listResolveDataset(key,input.asOfDate);
    lists[key]={version:d?d.version:'',available:available,
      unavailableReason:available?'':d&&d.available===false?d.unavailableReason||'数据集尚不可执行。':'数据集不存在或查询日期无可用版本。'};
  });
  var profiles=eu?input.formula.map(function(f){
    var p=clpSubstanceProfile(f.cas,input.asOfDate),s=p.supplemental;
    return {cas:f.cas,dataVersion:p.dataVersion,supplementalUpdatedAt:s&&s.updatedAt||'',
      effectiveData:complianceEvaluationCopy(p.effective)};
  }):[];
  var methods=eu?Object.assign({},pack.methodVersions):{};
  var listMethod=complianceGetMethod('M-LIST');
  if(listMethod)methods['M-LIST']=listMethod.version;
  var set=oelSdsResolveSet(input.product.targetMarket,input.asOfDate);
  return {data:{clpAnnexVi:vi?{id:vi.id,version:vi.version,effectiveFrom:vi.effectiveFrom}:null,
      componentProfiles:profiles,listDatasets:lists,
      oel:{datasetId:set?set.id:'',version:set?set.ver:'',effectiveFrom:set?set.eff:'',
        region:oelSdsRegionForMarket(input.product.targetMarket),status:set?'AVAILABLE':'DATASET_UNAVAILABLE'}},
    rules:eu?{clpRulePack:pack.id,ruleSetVersion:pack.ruleSetVersion||pack.modules.rules,
      ruleIds:pack.ruleIds.slice(),ruleVersions:pack.rules.map(function(r){return {id:r.id,version:r.ver||''};}),
      classification:{framework:'EU_CLP',status:'automatic',rulePack:pack.id}}
      :{classification:{framework:'CN_GHS',status:'manual-required',rulePack:null,
        reason:'中国 GHS 规则包尚未配置'}},
    methods:methods,labels:eu?pack.modules.labels:null,template:sdsTemplateVersion()};
}
function complianceEvaluationFingerprint(input){
  var normalized=complianceEvaluationNormalize(input);
  return JSON.stringify({input:normalized,versions:complianceEvaluationVersions(normalized)});
}
function complianceEvaluateDraft(input){
  var normalized=complianceEvaluationNormalize(input),versions=complianceEvaluationVersions(normalized);
  var formula=normalized.formula.map(function(f){return {cas:f.cas,name:f.name,conc:f.concentration};});
  var framework=complianceClassificationFramework(normalized.product.targetMarket);
  var run=framework.code==='EU_CLP'?clpEvaluateMixture(formula,normalized.asOfDate):null;
  var displayItems=run?buildClassItems(run):complianceManualClassificationItems();
  var oel=oelSdsEvaluate(normalized.formula,normalized.product.targetMarket,normalized.asOfDate);
  var list=complianceExecuteMethod('M-LIST',{asOfDate:normalized.asOfDate,
    datasetKeys:normalized.datasetKeys,components:normalized.formula,
    context:{targetMarket:normalized.product.targetMarket,objectType:normalized.context.objectType,
      useClass:normalized.context.useClass,productCategory:normalized.context.productCategory,
      materialType:normalized.context.materialType}});
  var classWarnings=run?run.warnings:[{code:'CN_GHS_RULE_PACK_UNAVAILABLE',
    message:'中国 GHS 自动规则包尚未建立，本次分类需法规人员人工判定。'}];
  var warnings=classWarnings.map(function(w){return w.message;}).concat(list.messages||[],oel.messages);
  var result={schemaVersion:COMPLIANCE_EVALUATION_SCHEMA,
    id:'CE-'+Date.now()+'-'+(++_complianceEvaluationSerial),status:'draft',
    evaluatedAt:new Date().toISOString(),asOfDate:normalized.asOfDate,
    inputFingerprint:JSON.stringify({input:normalized,versions:versions}),
    inputSnapshot:normalized,versions:versions,
    results:{classification:{framework:framework,items:displayItems,engineItems:run?run.items:[],pack:run?run.pack:null,
      executions:run?run.executions:[],labels:run?run.labels:{hCodes:[],pCodes:[],pictograms:[],signalWord:''},warnings:classWarnings},
      lists:{status:list.status,entryResults:list.entryResults,summary:list.summary,
        coverage:list.coverage,datasetVersions:list.datasetVersions,messages:list.messages},
      oel:{status:oel.status,market:oel.market,region:oel.region,asOfDate:oel.asOfDate,
        dataset:oel.dataset,rows:oel.rows,missingComponents:oel.missingComponents,messages:oel.messages}},
    evidence:{classification:run?run.executions.reduce(function(all,x){return all.concat(x.evidence||[]);},[]):[],
      lists:list.evidence||[],oel:oel.evidence},warnings:warnings,
    readiness:{classificationReady:!displayItems.some(function(x){return x.status==='pending';})&&!(run&&run.warnings.length),
      listCoverageComplete:!!(list.coverage&&list.coverage.complete),
      listNeedsContext:(list.summary&&list.summary.needContext||0)>0,
      hasUnavailableDatasets:!!(list.coverage&&list.coverage.unavailable.length),
      oelDatasetAvailable:oel.status!=='DATASET_UNAVAILABLE',oelMissingRecordCount:oel.missingComponents.length,
      hasExecutionError:list.status==='ERROR'||list.status==='UNSUPPORTED_METHOD'||!!(run&&run.executions.some(function(x){return x.status==='ERROR'||x.status==='UNSUPPORTED_METHOD';}))}};
  return complianceEvaluationFreeze(complianceEvaluationCopy(result));
}
function complianceEvaluationInvalidate(reason){
  wz.evaluationDirty=true;
  wz.evaluationInvalidReason=reason||'评估输入已变化';
  if(typeof transportAssessmentInvalidate==='function'&&
    /目标市场|产品信息|产品类型|物料变化|组分数据|组分 CAS|添加组分|删除组分|引入实验配方|载入示例配方/.test(reason||''))
    transportAssessmentInvalidate(reason);
}
function complianceEvaluationSetListContext(patch){
  wz.listContext=Object.assign({},wz.listContext||{},complianceEvaluationCopy(patch||{}));
  complianceEvaluationInvalidate('名单评估上下文变化');
}
function complianceEvaluationCurrent(){return complianceEvaluationEnsure();}
function complianceEvaluationEnsure(){
  var input=complianceEvaluationInputFromWz(),fingerprint=complianceEvaluationFingerprint(input);
  var old=wz.evaluationSnapshot;
  if(old&&old.schemaVersion===COMPLIANCE_EVALUATION_SCHEMA&&!wz.evaluationDirty&&
    old.inputFingerprint===fingerprint){
    complianceEvaluationFreeze(old);
    if(!wz.classItems)wz.classItems=complianceEvaluationCopy(old.results.classification.items);
    if(!wz.classPack)wz.classPack=complianceEvaluationCopy(old.results.classification.pack);
    return old;
  }
  var snapshot=complianceEvaluateDraft(input);
  wz.evaluationSnapshot=snapshot;
  wz.evaluationDirty=false;wz.evaluationInvalidReason='';wz.evaluationAt=snapshot.evaluatedAt;
  wz.classItems=complianceEvaluationCopy(snapshot.results.classification.items);
  wz.classPack=complianceEvaluationCopy(snapshot.results.classification.pack);
  return snapshot;
}
function complianceEvaluationListStatus(status){
  return {LISTED_ONLY:'已列入；当前数据只支持确认名单列入，尚未形成产品级限制判断。',
    TRIGGERED:'当前输入满足已配置的简单条件。',
    NOT_TRIGGERED:'当前输入未满足已配置的简单条件。',
    NEED_CONTEXT:'已列入；仍需补充上下文。',
    NOT_APPLICABLE:'当前市场或对象不适用。',
    DATASET_UNAVAILABLE:'数据集尚未建立，未形成自动判断。'}[status]||'执行异常，请核对评估数据。';
}
function complianceEvaluationChapter15Status(status){
  return {LISTED_ONLY:'已列入；尚未形成产品级条件判断',
    TRIGGERED:'当前输入满足已配置的简单条件',
    NOT_TRIGGERED:'当前输入未满足已配置的简单条件',
    NEED_CONTEXT:'已列入；缺少必要上下文，尚未完成条件判断',
    NOT_APPLICABLE:'当前市场或对象不适用',
    DATASET_UNAVAILABLE:'本期未建立可执行数据集，未形成自动判断'}[status]||'执行异常，需人工核对';
}
function complianceEvaluationListName(key){
  var cfg=LIST_QUERY_CONFIG[key],dataset=listGetDataset(key);
  return cfg?cfg.source:dataset?dataset.source:key;
}
function complianceEvaluationNeedText(requiredInputs){
  var names={'context.useClass':'产品用途','context.objectType':'对象类型',
    concentrationUnit:'浓度单位',concentrationBasis:'计量基础'};
  return (requiredInputs||[]).map(function(x){return '需要'+(names[x]||x);}).join('、');
}
function complianceEvaluationStep3Html(snapshot){
  var list=snapshot.results.lists,cov=list.coverage||{},rows=list.entryResults||[];
  function metric(label,value,note){return '<div class="kpi"><span>'+esc(label)+'</span><b>'+value+'</b><small>'+esc(note)+'</small></div>';}
  var hits=rows.filter(function(r){return r.assessmentStatus!=='DATASET_UNAVAILABLE';});
  var needs=rows.filter(function(r){return r.assessmentStatus==='NEED_CONTEXT';});
  var required=needs.map(function(r){return complianceEvaluationNeedText(r.requiredInputs);}).filter(Boolean);
  return '<div class="card" id="wzListPrep" style="margin-top:16px"><div class="card-hd"><h3>法规名单数据准备</h3>'+
    '<span class="sub">按计划投放日期 '+esc(snapshot.asOfDate)+' 检查</span></div><div class="card-bd">'+
    '<div class="kpi-row">'+metric('已完成检查的数据集',(cov.evaluated||[]).length,'按目标市场选择')+
      metric('名单命中条目',hits.length,'仅表示名单列入')+
      metric('待补充上下文',needs.length,required.join('；')||'当前无')+
      metric('暂不可用数据集',(cov.unavailable||[]).length,'不能判定未列入')+'</div>'+
    (!cov.complete?'<div class="notice warn"><div class="ni">!</div><div>部分名单数据集尚不可用，本次结果不是完整覆盖。</div></div>':'')+
    (required.length?'<div class="notice info"><div class="ni">i</div><div>'+esc(required.join('；'))+'</div></div>':'')+
    '</div></div>';
}
function complianceEvaluationListEvidenceHtml(snapshot,row){
  var original=row.evidence&&row.evidence[0]&&row.evidence[0].originalText||{};
  return '<details style="margin-top:8px"><summary style="cursor:pointer;color:var(--brand)">查看匹配证据</summary>'+
    '<dl class="desc-list" style="grid-template-columns:140px 1fr;margin-top:8px">'+
    '<dt>方法与版本</dt><dd>M-LIST · '+esc(snapshot.versions.methods['M-LIST']||'—')+'</dd>'+
    '<dt>数据集版本</dt><dd>'+esc(row.datasetVersion||'—')+'</dd>'+
    '<dt>匹配方式</dt><dd>'+esc(row.matchedBy||'—')+'</dd>'+
    '<dt>输入组分</dt><dd>'+esc((row.matchedComponents||[]).map(function(x){return (x.name||x.cas||x.ec||'—')+' / '+x.cas+' / '+(x.concentration==null?'—':x.concentration+' '+(x.concentrationUnit||''));}).join('；')||'—')+'</dd>'+
    '<dt>上下文</dt><dd>'+esc(JSON.stringify(snapshot.inputSnapshot.context))+'</dd>'+
    '<dt>条目原文</dt><dd>'+esc(JSON.stringify(original))+'</dd>'+
    '<dt>覆盖信息</dt><dd>'+esc(JSON.stringify(snapshot.results.lists.coverage))+'</dd>'+
    '<dt>最终状态</dt><dd>'+esc(row.assessmentStatus)+'</dd></dl></details>';
}
function complianceEvaluationStep4Html(snapshot){
  var rows=snapshot.results.lists.entryResults||[];
  return '<div class="card" id="wzListAssessment" style="margin-top:16px"><div class="card-hd"><h3>法规列入情况</h3>'+
    '<span class="sub">名单列入与 CLP 危害分类分别展示</span></div><div class="card-bd">'+
    '<div class="notice info"><div class="ni">i</div><div>名单列入不等同于当前产品已触发限制；用途、材质、浓度基础和豁免仍需核对。</div></div>'+
    (rows.length?rows.map(function(r){
      var original=r.evidence&&r.evidence[0]&&r.evidence[0].originalText||{};
      var names=(r.matchedComponents||[]).map(function(c){return c.name||c.cas||c.ec;}).join('、')||'—';
      return '<div class="ev-card"><div class="ev-hd"><b>'+esc(complianceEvaluationListName(r.datasetKey))+'</b>'+
        '<span class="tag blue">'+esc(r.assessmentStatus)+'</span><span class="right">'+esc(r.datasetVersion||'—')+'</span></div>'+
        '<div class="ev-bd"><div class="ev-f"><span class="k">条目编号</span><span class="v">'+esc(r.entryCode||'—')+'</span></div>'+
        '<div class="ev-f"><span class="k">命中组分</span><span class="v">'+esc(names)+'</span></div>'+
        '<div class="ev-f"><span class="k">名单列入</span><span class="v">'+(r.assessmentStatus==='DATASET_UNAVAILABLE'?'待数据集可用':'已列入')+'</span></div>'+
        '<div class="ev-f"><span class="k">当前判断</span><span class="v">'+esc(complianceEvaluationListStatus(r.assessmentStatus))+'</span></div>'+
        '<div class="ev-f"><span class="k">阈值原文</span><span class="v">'+esc(original.threshold||'—')+'</span></div>'+
        '<div class="ev-f"><span class="k">用途原文</span><span class="v">'+esc(original.use||'—')+'</span></div>'+
        '<div class="ev-f"><span class="k">豁免原文</span><span class="v">'+esc(original.exemption||'—')+'</span></div>'+
        (r.requiredInputs&&r.requiredInputs.length?'<div class="ev-f"><span class="k">待补充</span><span class="v">'+esc(complianceEvaluationNeedText(r.requiredInputs))+'</span></div>':'')+
        complianceEvaluationListEvidenceHtml(snapshot,r)+'</div></div>';
    }).join(''):'<div class="muted">已检查可用名单，当前配方未发现身份命中。</div>')+
    '</div></div>';
}
function complianceEvaluationLegalTableHtml(){
  var snapshot=complianceEvaluationCurrent(),list=snapshot.results.lists,rows=list.entryResults||[];
  var body=rows.map(function(r){
    var original=r.evidence&&r.evidence[0]&&r.evidence[0].originalText||{};
    var names=(r.matchedComponents||[]).map(function(c){return c.name||c.cas||c.ec;}).join('、')||'—';
    return '<tr><td>'+esc(complianceEvaluationListName(r.datasetKey))+'</td><td>'+esc(names)+'</td>'+
      '<td>'+esc(r.entryCode||'—')+'</td><td>'+esc(complianceEvaluationChapter15Status(r.assessmentStatus))+'</td>'+
      '<td>'+esc(r.reason||r.unavailableReason||'—')+
      (original.threshold?' 阈值原文：'+esc(original.threshold):'')+
      (original.use?' 用途原文：'+esc(original.use):'')+
      (original.exemption?' 豁免原文：'+esc(original.exemption):'')+'</td>'+
      '<td>'+esc(r.datasetVersion||'—')+'</td></tr>';
  }).join('')||'<tr><td colspan="6">已检查可用名单，当前配方未发现身份命中。</td></tr>';
  var csa=snapshot.inputSnapshot.product.targetMarket==='EU'
    ?'<div style="font-size:12px;font-weight:700;margin:10px 0 4px">15.2 化学安全评估（CSA）</div>'+
      '<div style="font-size:12px;padding:8px 10px;background:var(--bg-2);border-radius:6px">☐ 本混合物已依据 REACH Art. 14 进行化学品安全评估（CSA）　<span class="muted">状态：尚未完成</span></div>'
    :'<div style="font-size:12px;font-weight:700;margin:10px 0 4px">15.2 化学安全评估（CSA）</div>'+
      '<div class="muted">CSA 为欧盟 REACH 框架要求，中国法规体系下不适用本项。</div>';
  return '<div style="font-size:12px;font-weight:700;margin:8px 0 4px">15.1 '+
    (snapshot.inputSnapshot.product.targetMarket==='EU'?'欧盟':'中国')+'法规名单列入情况</div>'+
    '<div class="tbl-wrap"><table class="tbl mini"><thead><tr><th>法规或清单</th><th>组分</th><th>条目</th><th>状态</th><th>说明</th><th>版本</th></tr></thead><tbody>'+
    body+'</tbody></table></div>'+
    '<div class="notice grey"><div class="ni">§</div><div>名单列入不等同于当前产品已触发限制。</div></div>'+csa;
}
/* 旧 schema 草稿由 wzInitState 的默认字段补齐；恢复的 JSON 对象重新冻结。 */
if(wz.evaluationSnapshot&&wz.evaluationSnapshot.schemaVersion===COMPLIANCE_EVALUATION_SCHEMA)
  complianceEvaluationFreeze(wz.evaluationSnapshot);
