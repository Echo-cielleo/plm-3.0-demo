/* [23z7a] M-LIST 名单匹配内核。只读 REACH 已有演示数据，不接页面或 SDS。 */
var REGULATORY_LIST_DATASETS = {};

function listRegisterDataset(definition){
  if(!definition || typeof definition.key !== 'string' || !definition.key.trim())throw new Error('[M-LIST] 数据集 key 不能为空');
  if(Object.prototype.hasOwnProperty.call(REGULATORY_LIST_DATASETS,definition.key))
    throw new Error('[M-LIST] 数据集重复注册：'+definition.key);
  if(!definition.version || !definition.source || !definition.market ||
    !String(definition.version).trim() || !String(definition.source).trim() || !String(definition.market).trim())
    throw new Error('[M-LIST] 数据集缺少版本、来源或市场');
  if(!Array.isArray(definition.entries))throw new Error('[M-LIST] 数据集条目必须是数组');
  var ids=Object.create(null);
  definition.entries.forEach(function(entry){
    if(!entry.id || ids[entry.id])throw new Error('[M-LIST] 条目 ID 为空或重复：'+entry.id);
    if(['listed-only','simple-condition'].indexOf(entry.mode)<0 || !Array.isArray(entry.conditions))
      throw new Error('[M-LIST] 条目模式或条件无效：'+entry.id);
    ids[entry.id]=true;
  });
  REGULATORY_LIST_DATASETS[definition.key]=definition;
  return definition;
}
function listGetDataset(key){
  return Object.prototype.hasOwnProperty.call(REGULATORY_LIST_DATASETS,key) ? REGULATORY_LIST_DATASETS[key] : null;
}
function listGetDatasets(){return Object.keys(REGULATORY_LIST_DATASETS).map(function(k){return REGULATORY_LIST_DATASETS[k];});}
function listResolveDataset(key,asOfDate){
  var ds=listGetDataset(key);
  return ds && ds.available!==false && asOfDate && (!ds.effectiveFrom || ds.effectiveFrom<=asOfDate) &&
    (!ds.effectiveTo || asOfDate<ds.effectiveTo) ? ds : null;
}
function listDatasetAvailable(key,asOfDate){return !!listResolveDataset(key,asOfDate);}

function listIdentity(value){
  return String(value || '').trim().replace(/\s*[-‐‑‒–—]\s*/g,'-').toUpperCase();
}
function listMatches(entry,components){
  var cas=(entry.identity.casNumbers||[]).map(listIdentity);
  var ec=(entry.identity.ecNumbers||[]).map(listIdentity);
  return components.map(function(c,index){
    var by=cas.indexOf(listIdentity(c.cas))>=0 && !!listIdentity(c.cas) ? 'CAS' :
      ec.indexOf(listIdentity(c.ec))>=0 && !!listIdentity(c.ec) ? 'EC' : '';
    return by ? {index:index,cas:c.cas||'',ec:c.ec||'',name:c.name||'',matchedBy:by,
      concentration:c.concentration,concentrationUnit:c.concentrationUnit,
      concentrationBasis:c.concentrationBasis} : null;
  }).filter(Boolean);
}
function listCheckCondition(condition,component,context){
  var field=condition.field, actual=field==='concentration' ? component.concentration : context[field];
  var path=field==='concentration' ? field : 'context.'+field;
  var result={componentIndex:component.index,field:field,operator:condition.operator,
    expected:condition.value,actual:actual==null?null:actual,status:'MISSING'};
  if(['targetMarket','objectType','useClass','concentration'].indexOf(field)<0)
    throw new Error('[M-LIST] 不支持的条件字段：'+field);
  if(actual==null || actual==='' || (field==='concentration' && (typeof actual!=='number' || !Number.isFinite(actual)))){
    result.requiredInputs=[path];return result;
  }
  if(field==='concentration'){
    var needed=[];
    if(!component.concentrationUnit || component.concentrationUnit!==condition.unit)needed.push('concentrationUnit');
    if(!component.concentrationBasis || component.concentrationBasis!==condition.basis)needed.push('concentrationBasis');
    result.unit={actual:component.concentrationUnit||'',expected:condition.unit};
    result.basis={actual:component.concentrationBasis||'',expected:condition.basis};
    if(needed.length){result.requiredInputs=needed;return result;}
    var op=condition.operator, limit=condition.value;
    if(typeof limit!=='number' || !Number.isFinite(limit))throw new Error('[M-LIST] 浓度条件缺数值');
    if(['>','>=','<','<=','='].indexOf(op)<0)throw new Error('[M-LIST] 不支持的比较符：'+op);
    result.status=({'>':actual>limit,'>=':actual>=limit,'<':actual<limit,'<=':actual<=limit,'=':actual===limit})[op]?'PASS':'FAIL';
  }else{
    if(condition.operator!=='in' || !Array.isArray(condition.value))throw new Error('[M-LIST] 上下文条件须使用 in');
    result.status=condition.value.indexOf(actual)>=0?'PASS':
      (field==='targetMarket'||field==='objectType'?'NOT_APPLICABLE':'FAIL');
  }
  return result;
}
function listAssessEntry(entry,matches,context){
  var conditionResults=[], requiredInputs=[], states=[];
  if(entry.mode!=='listed-only' && entry.mode!=='simple-condition')throw new Error('[M-LIST] 不支持的条目模式：'+entry.mode);
  if(entry.mode==='listed-only' || !entry.conditions.length)
    return {status:'LISTED_ONLY',reason:'已列入名单；没有可执行的完整结构化条件。',requiredInputs:[],conditionResults:[]};
  matches.forEach(function(component){
    var rows=entry.conditions.map(function(c){return listCheckCondition(c,component,context);});
    conditionResults=conditionResults.concat(rows);
    rows.forEach(function(r){(r.requiredInputs||[]).forEach(function(x){if(requiredInputs.indexOf(x)<0)requiredInputs.push(x);});});
    states.push(rows.some(function(r){return r.status==='NOT_APPLICABLE';})?'NOT_APPLICABLE':
      rows.some(function(r){return r.status==='MISSING';})?'NEED_CONTEXT':
      rows.every(function(r){return r.status==='PASS';})?'TRIGGERED':'NOT_TRIGGERED');
  });
  var status=states.indexOf('TRIGGERED')>=0?'TRIGGERED':
    states.indexOf('NEED_CONTEXT')>=0?'NEED_CONTEXT':
    states.indexOf('NOT_TRIGGERED')>=0?'NOT_TRIGGERED':'NOT_APPLICABLE';
  return {status:status,reason:{
    TRIGGERED:'已配置的简单条件全部满足。',
    NOT_TRIGGERED:'已配置的简单条件已执行，当前未满足。',
    NEED_CONTEXT:'缺少条件输入，或浓度单位／基础与条件不一致。',
    NOT_APPLICABLE:'当前市场或对象类型明确不适用。'
  }[status],requiredInputs:status==='NEED_CONTEXT'?requiredInputs:[],conditionResults:conditionResults};
}
function listExecute(context){
  context=context||{};
  var components=context.components||[], keys=context.datasetKeys||[], asOfDate=context.asOfDate;
  var requested=keys.filter(function(key,index){return keys.indexOf(key)===index;});
  var result={status:'NO_MATCH',datasetVersions:{},entryResults:[],
    coverage:{requested:requested,evaluated:[],unavailable:[],complete:true},
    summary:{listedOnly:0,triggered:0,notTriggered:0,needContext:0,notApplicable:0,datasetUnavailable:0},
    inputs:[{asOfDate:asOfDate||'',datasetKeys:keys.slice(),components:components.map(function(c){return Object.assign({},c);}),
      context:Object.assign({},context.context||{})}],
    intermediates:{datasetsChecked:[],identityMatches:[]},evidence:[],messages:[]};
  var counts={LISTED_ONLY:'listedOnly',TRIGGERED:'triggered',NOT_TRIGGERED:'notTriggered',
    NEED_CONTEXT:'needContext',NOT_APPLICABLE:'notApplicable',DATASET_UNAVAILABLE:'datasetUnavailable'};
  if(!requested.length){result.status='NEED_INPUT';result.messages.push('未指定需要匹配的名单数据集。');return result;}
  requested.forEach(function(key){
    var ds=listResolveDataset(key,asOfDate);
    if(!ds){
      var registered=listGetDataset(key), unavailableReason=registered && registered.available===false ?
        (registered.unavailableReason||'数据集尚不可执行。') :
        '数据集不存在或查询日期无可用版本。';
      result.coverage.unavailable.push(key);
      result.entryResults.push({datasetKey:key,datasetVersion:registered?registered.version:'',entryId:'',entryCode:'',matchedBy:'',
        matchedComponents:[],assessmentStatus:'DATASET_UNAVAILABLE',
        reason:unavailableReason+'不能判定未列入。',unavailableReason:unavailableReason,
        requiredInputs:[],conditionResults:[],source:registered?{datasetVersion:registered.version,reference:registered.source}:{},evidence:[]});
      result.summary.datasetUnavailable++;
      result.messages.push(key+'：'+unavailableReason+'不能判定未列入。');
      return;
    }
    result.coverage.evaluated.push(key);
    result.datasetVersions[key]=ds.version;
    result.intermediates.datasetsChecked.push({key:key,version:ds.version,entries:ds.entries.length});
    ds.entries.forEach(function(entry){
      if(entry.source.effectiveFrom && entry.source.effectiveFrom>asOfDate)return;
      var matches=listMatches(entry,components);
      if(!matches.length)return;
      var assessment=listAssessEntry(entry,matches,context.context||{});
      var evidence={datasetKey:key,version:ds.version,source:ds.source,entryId:entry.id,
        reference:entry.source.reference,originalText:entry.originalText};
      result.entryResults.push({datasetKey:key,datasetVersion:ds.version,entryId:entry.id,
        entryCode:entry.entryCode,matchedBy:matches.some(function(m){return m.matchedBy==='CAS';})?'CAS':'EC',
        matchedComponents:matches,assessmentStatus:assessment.status,reason:assessment.reason,
        requiredInputs:assessment.requiredInputs,conditionResults:assessment.conditionResults,
        source:entry.source,evidence:[evidence]});
      result.summary[counts[assessment.status]]++;
      result.intermediates.identityMatches.push({entryId:entry.id,componentIndexes:matches.map(function(m){return m.index;})});
      result.evidence.push(evidence);
    });
  });
  result.coverage.complete=!result.coverage.unavailable.length;
  result.status=!result.coverage.evaluated.length?'BLOCKED':
    result.summary.needContext?'NEED_INPUT':
    !result.coverage.complete?'AUTO':
    result.entryResults.length?'AUTO':'NO_MATCH';
  if(!result.coverage.complete && result.coverage.evaluated.length){
    result.messages.push(result.entryResults.some(function(r){return r.assessmentStatus!=='DATASET_UNAVAILABLE';}) ?
      '部分名单数据集不可用，本次结果不是完整覆盖。' :
      '已完成可用数据集检查，未发现命中；仍有部分数据集不可用，不能形成全库“未列入”结论。');
  }
  return result;
}

/* 仅适配已有 REACH 演示行；说明文字原样留作证据，不解析成可执行阈值。 */
function listReachSvhcEntries(){
  return REACH_SVHC.map(function(r){
    return {id:'REACH-SVHC-'+r.cas,datasetKey:'reach-svhc',entryCode:r.cas,name:r.name,
      identity:{casNumbers:[r.cas],ecNumbers:r.ec?[r.ec]:[],aliases:[]},
      mode:'listed-only',applicability:{markets:['EU'],objectTypes:[],useClasses:[]},conditions:[],
      source:{datasetVersion:REACH_MODULES.svhc.ver,effectiveFrom:r.listed,reference:REACH_MODULES.svhc.srcFile},
      originalText:{summary:r.reason,threshold:r.conc,use:'',exemption:''}};
  });
}
function listReachXviiEntries(){
  return REACH_XVII.map(function(r){
    /* 多物质／物质组不拆成单一 CAS；本阶段不会做组聚合。 */
    var one=/^(\d{2,7}-\d{2}-\d) \/ (\d{3}-\d{3}-\d)$/.exec(r.ids);
    return {id:'REACH-XVII-'+r.entry.replace('Entry ',''),datasetKey:'reach-xvii',
      entryCode:r.entry,name:r.name,
      identity:{casNumbers:one?[one[1]]:[],ecNumbers:one?[one[2]]:[],aliases:[]},
      mode:'listed-only',applicability:{markets:['EU'],objectTypes:[],useClasses:[]},conditions:[],
      source:{datasetVersion:REACH_MODULES.xvii.ver,effectiveFrom:r.eff,
        reference:REACH_MODULES.xvii.srcFile+' · '+r.entry},
      originalText:{summary:r.sum,threshold:r.thr,use:r.use,exemption:r.exempt}};
  });
}
listRegisterDataset({key:'reach-svhc',version:REACH_MODULES.svhc.ver,source:REACH_MODULES.svhc.src,
  market:'EU',effectiveFrom:REACH_MODULES.svhc.eff,entries:listReachSvhcEntries()});
listRegisterDataset({key:'reach-xvii',version:REACH_MODULES.xvii.ver,source:REACH_MODULES.xvii.src,
  market:'EU',effectiveFrom:REACH_MODULES.xvii.eff,entries:listReachXviiEntries()});
complianceRegisterMethod({code:'M-LIST',version:'1.0.0-demo',name:'名单命中与条件判断',
  domain:'LIST',implementationStatus:'implemented',
  inputDescription:'组分身份、浓度及必要的产品上下文',
  outputDescription:'名单列入情况与已配置条件判断结果',
  execute:listExecute});
