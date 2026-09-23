/* CLP 物质数据：官方 Annex VI 快照、企业补充数据与计算取用值。 */
var CLP_SUBSTANCE_STORE={schemaVersion:'clp-substance-v1',officialDatasets:[],supplementalByCas:{},legacyResolutions:{},initialized:false};

function clpDataCopy(v){return JSON.parse(JSON.stringify(v));}
function clpDataFreeze(v){
  if(v&&typeof v==='object'&&!Object.isFrozen(v)){
    Object.keys(v).forEach(function(k){clpDataFreeze(v[k]);});Object.freeze(v);
  }
  return v;
}
function clpDataClass(hazardClass,category,hCode,route){
  return {hazardClass:hazardClass,category:category,route:route||'',hCodes:hCode?[hCode]:[]};
}
function clpDataLimit(hazardClass,category,hCode,value,note){
  return {hazardClass:hazardClass,category:category,hCode:hCode||'',operator:'>=',value:value,unit:'%',note:note||''};
}
function clpDataLimitText(x){
  return x.hazardClass+' '+x.category+(x.hCode?'; '+x.hCode+': C':'')+' ≥ '+x.value+'%'+(x.note?'（'+x.note+'）':'');
}
function clpDataLimitShortText(x){return x.hazardClass+' '+x.category+' ≥ '+x.value+'%'+(x.note?'（'+x.note+'）':'');}
function clpDataClassText(rows){return (rows||[]).map(function(x){return x.hazardClass+' '+x.category+(x.note?'（'+x.note+'）':'');}).join(' / ')||'不分类';}
function clpDataCodes(rows){
  var out=[];(rows||[]).forEach(function(x){(x.hCodes||[]).forEach(function(h){if(out.indexOf(h)<0)out.push(h);});});
  return out;
}
function clpDataSourceLabel(src){
  if(!src)return '来源未维护';
  if(src.sourceType==='annex-vi')return 'Annex VI · '+src.sourceVersion;
  if(src.sourceType==='legacy-engine-baseline')return '旧演示基线 · 待专业核验';
  if(src.sourceType==='supplier-sds')return '供应商 SDS · '+(src.sourceRef||'来源未维护');
  if(src.sourceType==='unresolved')return '待专业核验，暂停自动取用';
  return '企业补充 · '+(src.sourceRef||src.sourceVersion||'来源未维护');
}
function clpDataFieldLabel(field){
  if(field.indexOf('classifications.')===0)return '危害分类';
  if(field.indexOf('specificLimits.')===0)return 'SCL';
  if(field.indexOf('ateValues.')===0)return 'ATE';
  if(field.indexOf('mFactors.')===0)return 'M 因子';
  return '分类参数';
}

/* 演示子集，来源与数值沿用阶段二基线；未做法规专业核验。 */
var CLP_VI_ATP22_SEED=[
  {indexNo:'605-001-00-5',cas:'50-00-0',ec:'200-001-8',name:'甲醛',
    classifications:[clpDataClass('Carc.','1B','H350'),clpDataClass('Muta.','2','H341'),clpDataClass('Acute Tox.','3','H301','oral')],
    euhCodes:[],pictograms:['GHS06','GHS08'],signalWord:'危险',
    specificLimits:[clpDataLimit('Skin Sens.','1','H317',0.2)],mFactors:{acute:null,chronic:10},
    ateValues:{oral:{value:100,unit:'mg/kg'},dermal:null,inhalation:null},notes:['B','D'],rule:'CLP-R-0001'},
  {indexNo:'607-061-00-8',cas:'79-10-7',ec:'201-177-9',name:'丙烯酸',
    classifications:[clpDataClass('Skin Corr.','1A','H314'),clpDataClass('Acute Tox.','4','H302','oral')],
    euhCodes:[],pictograms:['GHS05','GHS07'],signalWord:'危险',specificLimits:[],mFactors:{acute:null,chronic:null},
    ateValues:{oral:null,dermal:null,inhalation:null},notes:[],rule:'CLP-R-0002'},
  {indexNo:'603-014-00-0',cas:'111-76-2',ec:'203-905-0',name:'乙二醇单丁醚',
    classifications:[clpDataClass('Acute Tox.','4','H302','oral'),clpDataClass('Eye Irrit.','2','H319')],
    euhCodes:[],pictograms:['GHS07'],signalWord:'警告',specificLimits:[],mFactors:{acute:null,chronic:null},
    ateValues:{oral:null,dermal:null,inhalation:null},notes:[],rule:'CLP-R-0003'},
  {indexNo:'603-002-00-5',cas:'64-17-5',ec:'200-578-6',name:'乙醇',
    classifications:[clpDataClass('Flam. Liq.','2','H225'),clpDataClass('Eye Irrit.','2','H319')],
    euhCodes:[],pictograms:['GHS02','GHS07'],signalWord:'危险',specificLimits:[],mFactors:{acute:null,chronic:null},
    ateValues:{oral:null,dermal:null,inhalation:null},notes:[],rule:'CLP-R-0005'},
  {indexNo:'601-021-00-3',cas:'108-88-3',ec:'203-625-9',name:'甲苯',
    classifications:[clpDataClass('Flam. Liq.','2','H225'),clpDataClass('Repr.','2','H361d'),clpDataClass('STOT RE','2','H373')],
    euhCodes:[],pictograms:['GHS02','GHS07','GHS08'],signalWord:'危险',specificLimits:[],mFactors:{acute:null,chronic:null},
    ateValues:{oral:null,dermal:null,inhalation:null},notes:['C'],rule:'CLP-R-0004'}
];

/* 企业补充与旧演示基线：只记录结构化输入，不伪称 Annex VI 官方值。 */
var CLP_SUPPLEMENTAL_SEED={
  '50-00-0':{name:'甲醛',classifications:[clpDataClass('Skin Corr.','1B','H314'),clpDataClass('Eye Dam.','1','H318'),clpDataClass('Skin Sens.','1','H317'),clpDataClass('Aquatic Chronic','2','H411')],
    hazardMap:{acuteOral:true,skinCorr:'1B',eyeDamage:'1',skinSens:{cat:'1',scl:0.2},aquaticChronic:'2'},
    specificLimits:[clpDataLimit('STOT SE','3','',5),clpDataLimit('Skin Corr.','1B','',25),clpDataLimit('Eye Dam.','1','',25),clpDataLimit('Skin Sens.','1','',0.2)],
    mFactors:{acute:0,chronic:0},mSource:'',ateValues:{oral:100,dermal:300,inhalation:3},ateState:'known',aquaticState:'unknown',lc50:'',noec:''},
  '79-10-7':{name:'丙烯酸',classifications:[clpDataClass('Aquatic Chronic','3','H412'),clpDataClass('Eye Dam.','1','H318')],
    hazardMap:{acuteOral:true,skinCorr:'1A',eyeDamage:'1',aquaticChronic:'3'},
    specificLimits:[clpDataLimit('Skin Irrit.','2','',1),clpDataLimit('Eye Irrit.','2','',1,'低于则免分类')],
    mFactors:{acute:0,chronic:0},mSource:'',ateValues:{oral:500,dermal:1100,inhalation:0},ateState:'known',aquaticState:'known',lc50:'',noec:''},
  '111-76-2':{name:'乙二醇单丁醚',classifications:[clpDataClass('Skin Irrit.','2','H315'),clpDataClass('Aquatic Chronic','3','H412'),
      Object.assign(clpDataClass('Eye Irrit.','2A','H319'),{sourceType:'supplier-sds',sourceRef:'阶段二 SDS 汇集演示值',usedForCalculation:false})],
    hazardMap:{acuteOral:true,skinIrrit:'2',eyeIrrit:'2',aquaticChronic:'3'},specificLimits:[],specificLimitNote:'统一分类无 SCL，按通用浓度限值执行',
    mFactors:{acute:0,chronic:0},mSource:'',ateValues:{oral:500,dermal:1100,inhalation:11},ateState:'known',aquaticState:'unknown',lc50:'',noec:''},
  '64-17-5':{name:'乙醇',classifications:[],hazardMap:{eyeIrrit:'2'},specificLimits:[clpDataLimit('Eye Irrit.','2','',10)],
    mFactors:{acute:0,chronic:0},mSource:'',ateValues:{oral:10470,dermal:0,inhalation:0},ateNote:'远高于分类阈值',ateState:'known',aquaticState:'known',lc50:'',noec:''},
  '9009-54-5':{name:'聚氨酯预聚体',classifications:[Object.assign(clpDataClass('Skin Irrit.','2','H315'),{note:'聚合物'})],hazardMap:{skinIrrit:'2'},specificLimits:[],
    mFactors:{acute:0,chronic:0},mSource:'',ateValues:{oral:0,dermal:0,inhalation:0},ateState:'na',aquaticState:'unknown',lc50:'',noec:''},
  '7732-18-5':{name:'水',classifications:[],hazardMap:{},specificLimits:[],mFactors:{acute:0,chronic:0},mSource:'',
    ateValues:{oral:90000,dermal:0,inhalation:0},ateOralQualifier:'> ',ateNote:'远高于分类阈值，不分类',ateState:'known',aquaticState:'known',lc50:'',noec:''},
  '13463-41-7':{name:'吡硫翁锌',classifications:[clpDataClass('Acute Tox.','3','H301','oral'),clpDataClass('Eye Dam.','1','H318'),clpDataClass('Aquatic Acute','1','H400'),clpDataClass('Aquatic Chronic','1','H410')],
    hazardMap:{},specificLimits:[clpDataLimit('Eye Dam.','1','',0.05)],mFactors:{acute:100,chronic:100},mSource:'calc',
    ateValues:{oral:100,dermal:200,inhalation:0.5},ateState:'known',aquaticState:'known',lc50:'0.0026',noec:'0.0008'},
  '8001-54-5':{name:'苯扎氯铵',classifications:[clpDataClass('Acute Tox.','4','H302','oral'),clpDataClass('Skin Corr.','1B','H314'),clpDataClass('Aquatic Acute','1','H400'),clpDataClass('Aquatic Chronic','1','H410')],
    hazardMap:{},specificLimits:[clpDataLimit('Skin Corr.','1B','',5)],mFactors:{acute:10,chronic:1},mSource:'sup',
    ateValues:{oral:300,dermal:1000,inhalation:0},ateState:'known',aquaticState:'known',lc50:'0.05',noec:'0.03'}
};

function clpSubstanceStoreInit(){
  if(CLP_SUBSTANCE_STORE.initialized)return CLP_SUBSTANCE_STORE;
  var m=CLP_MODULES.vi;
  var ds={id:'CLP-VI-ATP22',module:'vi',version:'ATP 22',status:'已生效',publishedAt:'2026-05-01',
    effectiveFrom:m.eff,effectiveTo:'',cutoff:m.cutoff,
    source:{regulation:CLP_TOP.code,annex:'Annex VI Part 3',sourceFile:'ECHA CHEM 演示结构化子集',sourceVersion:'ATP 22',sourceDate:m.eff,note:'ECHA CHEM 整理数据；法律效力以 OJ 公布为准'},
    createdBy:m.owner,reviewedBy:m.owner,records:clpDataCopy(CLP_VI_ATP22_SEED)};
  ds.records.forEach(function(r){r.id=ds.id+':'+r.indexNo;r.source={datasetId:ds.id,version:ds.version,clause:'Annex VI Part 3 · Table 3'};});
  CLP_SUBSTANCE_STORE.officialDatasets.push(clpDataFreeze(ds));
  CLP_SUBSTANCE_STORE.supplementalByCas=clpDataCopy(CLP_SUPPLEMENTAL_SEED);
  Object.keys(CLP_SUBSTANCE_STORE.supplementalByCas).forEach(function(cas){
    var s=CLP_SUBSTANCE_STORE.supplementalByCas[cas];s.cas=cas;s.revision='SUP-2026.1';s.sourceType='legacy-engine-baseline';s.sourceRef='阶段二组分基础数据演示值';
  });
  CLP_SUBSTANCE_STORE.legacyResolutions['50-00-0']={
    'mFactors.chronic':{datasetId:ds.id,value:0,sourceType:'legacy-engine-baseline',note:'Annex VI 示例为 10，旧 SDS 计算使用 0；待专业核验'}
  };
  CLP_SUBSTANCE_STORE.initialized=true;
  clpRefreshCompatibilityProjections(clpSystemToday());
  return CLP_SUBSTANCE_STORE;
}
function clpViDatasetList(){clpSubstanceStoreInit();return CLP_SUBSTANCE_STORE.officialDatasets.slice();}
function clpViDatasetGet(id){return clpViDatasetList().filter(function(d){return d.id===id;})[0]||null;}
function clpViDatasetResolve(asOfDate){
  var day=asOfDate||clpSystemToday();
  var a=clpViDatasetList().filter(function(d){return d.status!=='已撤回'&&d.publishedAt&&d.effectiveFrom<=day;});
  a.sort(function(x,y){return x.effectiveFrom.localeCompare(y.effectiveFrom);});
  return a[a.length-1]||null;
}
function clpViDatasetPublish(draft,reviewInfo){
  clpSubstanceStoreInit();
  if(!draft||!draft.version||!/^\d{4}-\d{2}-\d{2}$/.test(draft.effectiveFrom||'')||!draft.source||!draft.source.sourceFile||!draft.source.sourceVersion||!reviewInfo||!reviewInfo.reviewer)throw Error('请补齐版本、生效日期、来源文件及法规专员审核信息');
  if(clpViDatasetList().some(function(d){return d.version===draft.version;}))throw Error('该 Annex VI 版本已发布');
  var id='CLP-VI-'+draft.version.replace(/[^A-Za-z0-9]/g,'');
  var ds={id:id,module:'vi',version:draft.version,status:draft.effectiveFrom>clpSystemToday()?'待生效':'已生效',
    publishedAt:clpSystemToday(),effectiveFrom:draft.effectiveFrom,effectiveTo:'',cutoff:draft.cutoff||'',
    source:clpDataCopy(draft.source),createdBy:draft.createdBy||reviewInfo.reviewer,reviewedBy:reviewInfo.reviewer,
    records:clpDataCopy(draft.records||[])};
  var seen={};ds.records.forEach(function(r){
    if(!r.indexNo||seen[r.indexNo])throw Error('Annex VI 条目 Index No. 缺失或重复');
    seen[r.indexNo]=true;r.id=id+':'+r.indexNo;r.source={datasetId:id,version:ds.version,clause:'Annex VI Part 3 · Table 3'};
  });
  CLP_SUBSTANCE_STORE.officialDatasets.push(clpDataFreeze(ds));
  clpRefreshCompatibilityProjections(clpSystemToday());
  return ds;
}
/* 导入向导的结构化演示稿。原型不解析 XLSX；下面的改动只存在于候选内存对象。 */
function clpViDemoDraft(version,effectiveFrom,cutoff,source){
  var base=clpViDatasetResolve(clpSystemToday()),rows=clpDataCopy(base.records);
  var byIndex={};rows.forEach(function(r){byIndex[r.indexNo]=r;});
  byIndex['605-001-00-5'].specificLimits[0].value=0.1;
  byIndex['607-061-00-8'].euhCodes=['EUH071'];
  byIndex['603-014-00-0'].classifications[0]=clpDataClass('Acute Tox.','3','H301','oral');
  byIndex['601-021-00-3'].classifications[1]=clpDataClass('Repr.','2','H361fd');
  rows.push({indexNo:'029-022-00-4',cas:'1304-63-2',ec:'215-132-3',name:'2-乙基己酸锆',
    classifications:[clpDataClass('Repr.','1B','H360Df')],euhCodes:[],pictograms:['GHS08'],signalWord:'危险',
    specificLimits:[],mFactors:{acute:null,chronic:null},ateValues:{oral:null,dermal:null,inhalation:null},notes:[],rule:'CLP-R-0006'});
  return {version:version,effectiveFrom:effectiveFrom,cutoff:cutoff,source:source,createdBy:CLP_TOP.owner,records:rows};
}
function clpViDraftDiff(draft){
  var base=clpViDatasetResolve(clpSystemToday()),old={};base.records.forEach(function(r){old[r.indexNo]=r;});
  var next={},items=[];(draft.records||[]).forEach(function(r){
    next[r.indexNo]=r;var was=old[r.indexNo];
    if(!was)items.push({tp:'新增',k:r.indexNo,n:r.name,a:'—',b:clpDataClassText(r.classifications)});
    else{
      var keys=['classifications','euhCodes','pictograms','signalWord','specificLimits','mFactors','ateValues','notes'];
      keys.forEach(function(k){if(JSON.stringify(r[k])!==JSON.stringify(was[k]))items.push({tp:'修改',k:r.indexNo,n:r.name,field:k,
        a:clpViDiffValue(was[k]),b:clpViDiffValue(r[k])});});
    }
  });
  Object.keys(old).forEach(function(k){if(!next[k])items.push({tp:'废止',k:k,n:old[k].name,a:clpDataClassText(old[k].classifications),b:'—'});});
  return {add:items.filter(function(x){return x.tp==='新增';}).length,mod:items.filter(function(x){return x.tp==='修改';}).length,
    del:items.filter(function(x){return x.tp==='废止';}).length,items:items};
}
function clpViDiffValue(v){
  if(Array.isArray(v))return v.map(function(x){return typeof x==='object'?(x.hazardClass?x.hazardClass+' '+x.category+(x.value!=null?' ≥ '+x.value+x.unit:''):JSON.stringify(x)):x;}).join(' / ')||'—';
  return typeof v==='object'?JSON.stringify(v):String(v);
}
function clpViRecords(asOfDate){var d=clpViDatasetGet(asOfDate)||clpViDatasetResolve(asOfDate);return d?d.records.slice():[];}
function clpViRecordByIndex(indexNo,asOfDate){return clpViRecords(asOfDate).filter(function(r){return r.indexNo===indexNo;})[0]||null;}
function clpViRecordsByCas(cas,asOfDate){return clpViRecords(asOfDate).filter(function(r){return r.cas===cas;});}
function clpSupplementalGet(cas){clpSubstanceStoreInit();var s=CLP_SUBSTANCE_STORE.supplementalByCas[cas];return s?clpDataCopy(s):null;}
function clpSupplementalUpsert(cas,patch,auditInfo){
  clpSubstanceStoreInit();if(!cas)throw Error('请先填写 CAS 号');
  var old=CLP_SUBSTANCE_STORE.supplementalByCas[cas]||{cas:cas,classifications:[],hazardMap:{},specificLimits:[],mFactors:{acute:null,chronic:null},ateValues:{oral:null,dermal:null,inhalation:null},ateState:'unknown',aquaticState:'unknown'};
  var next=Object.assign(clpDataCopy(old),clpDataCopy(patch||{}));next.cas=cas;
  if(patch&&patch.ateValues&&['oral','dermal','inhalation'].some(function(k){return Object.prototype.hasOwnProperty.call(patch.ateValues,k)&&patch.ateValues[k]!==old.ateValues[k];})){
    next.ateOralQualifier='';next.ateNote='';
  }
  if((next.classifications||[]).some(function(x){return !x.hazardClass||!x.category||!Array.isArray(x.hCodes)||(x.hazardClass==='Acute Tox.'&&!x.route);}))throw Error('企业补充分类需填写危害类别、级别、H 码数组与急性毒性途径');
  if((next.specificLimits||[]).some(function(x){return !x.hazardClass||!x.category||!isFinite(x.value)||x.value<0||x.unit!=='%';}))throw Error('SCL 需填写结构化类别、有效阈值与百分比单位');
  if(['acute','chronic'].some(function(k){var v=next.mFactors&&next.mFactors[k];return v!=null&&(!isFinite(v)||v<0);})||
     ['oral','dermal','inhalation'].some(function(k){var v=next.ateValues&&next.ateValues[k];return v!=null&&(!isFinite(v)||v<0);})){throw Error('ATE 与 M 因子必须为非负数或未知');}
  if(['known','unknown','na'].indexOf(next.ateState)<0||['known','unknown','na'].indexOf(next.aquaticState)<0)throw Error('数据状态取值无效');
  next.revision='SUP-'+clpSystemToday();next.updatedBy=(auditInfo&&auditInfo.by)||'当前用户';next.updatedAt=clpRuleNowStamp();
  next.sourceType=(auditInfo&&auditInfo.sourceType)||'enterprise-supplement';next.sourceRef=(auditInfo&&auditInfo.sourceRef)||'组分基础信息人工维护';
  var resolutions=CLP_SUBSTANCE_STORE.legacyResolutions[cas];
  if(patch&&patch.mFactors&&resolutions){
    ['acute','chronic'].forEach(function(k){
      if(Object.prototype.hasOwnProperty.call(patch.mFactors,k)&&patch.mFactors[k]!==old.mFactors[k])delete resolutions['mFactors.'+k];
    });
    if(!Object.keys(resolutions).length)delete CLP_SUBSTANCE_STORE.legacyResolutions[cas];
  }
  CLP_SUBSTANCE_STORE.supplementalByCas[cas]=next;
  clpRefreshCompatibilityProjections(clpSystemToday());
  return clpDataCopy(next);
}

function clpDataHazardKey(c){
  var h=c.hazardClass;
  if(h==='Acute Tox.'&&c.route==='oral')return ['acuteOral',true];
  if(h==='Skin Corr.')return ['skinCorr',c.category];
  if(h==='Skin Irrit.')return ['skinIrrit',c.category];
  if(h==='Eye Dam.')return ['eyeDamage',c.category];
  if(h==='Eye Irrit.')return ['eyeIrrit',c.category];
  if(h==='Skin Sens.')return ['skinSens',{cat:c.category}];
  if(h==='Aquatic Chronic')return ['aquaticChronic',c.category];
  return null;
}
function clpSubstanceProfile(cas,asOfDate){
  clpSubstanceStoreInit();
  var dataset=clpViDatasetResolve(asOfDate),official=clpViRecordsByCas(cas,asOfDate),supp=clpSupplementalGet(cas);
  var out={cas:cas,name:(official[0]&&official[0].name)||(supp&&supp.name)||cas,ec:(official[0]&&official[0].ec)||'',
    dataVersion:{datasetId:dataset?dataset.id:'',annexViVersion:dataset?dataset.version:'',effectiveFrom:dataset?dataset.effectiveFrom:'',supplementalRevision:supp?supp.revision:''},
    officialRecords:official,supplemental:supp,effective:{classifications:[],hazardMap:{},specificLimits:[],mFactors:{acute:null,chronic:null},ateValues:{oral:null,dermal:null,inhalation:null},ateState:'unmaintained',aquaticState:'unmaintained',lc50:'',noec:''},provenance:{},conflicts:[]};
  if(!official.length&&!supp)return out;
  if(official.length&&!supp){out.effective.ateState='unknown';out.effective.aquaticState='unknown';}
  var eff=out.effective,prov=out.provenance,srcOfficial=function(r){return {sourceType:'annex-vi',sourceVersion:dataset.version,sourceRef:r.source.clause,
    sourceFile:dataset.source.sourceFile,sourceDate:dataset.source.sourceDate,indexNo:r.indexNo};};
  if(supp){
    eff.classifications=clpDataCopy((supp.classifications||[]).filter(function(c){return c.usedForCalculation!==false;}));
    eff.hazardMap=clpDataCopy(supp.hazardMap||{});
    eff.specificLimits=clpDataCopy(supp.specificLimits||[]);eff.mFactors=clpDataCopy(supp.mFactors||{acute:0,chronic:0});
    eff.ateValues=clpDataCopy(supp.ateValues||{oral:0,dermal:0,inhalation:0});eff.ateState=supp.ateState||'unknown';eff.aquaticState=supp.aquaticState||'unknown';
    eff.lc50=supp.lc50||'';eff.noec=supp.noec||'';eff.mSource=supp.mSource||'';
    eff.specificLimitNote=supp.specificLimitNote||'';eff.ateOralQualifier=supp.ateOralQualifier||'';eff.ateNote=supp.ateNote||'';
    ['classifications','specificLimits','mFactors.acute','mFactors.chronic','ateValues.oral','ateValues.dermal','ateValues.inhalation','ateState','aquaticState','lc50','noec'].forEach(function(k){
      prov[k]={sourceType:supp.sourceType,sourceVersion:supp.revision,sourceRef:supp.sourceRef};
    });
    Object.keys(supp.hazardMap||{}).forEach(function(k){prov['hazardMap.'+k]=prov.classifications;});
    (supp.classifications||[]).forEach(function(c){prov['classifications.'+c.hazardClass+'|'+(c.route||'')]=c.sourceType
      ?{sourceType:c.sourceType,sourceVersion:supp.revision,sourceRef:c.sourceRef}:prov.classifications;});
    (supp.specificLimits||[]).forEach(function(x){prov['specificLimits.'+x.hazardClass+'|'+x.category]=prov.specificLimits;});
  }
  var officialClasses={};
  official.forEach(function(r){
    r.classifications.forEach(function(c){
      var key=c.hazardClass+'|'+(c.route||''),hit=(supp&&supp.classifications||[]).filter(function(x){return x.hazardClass+'|'+(x.route||'')===key;})[0];
      if(officialClasses[key]&&officialClasses[key].category!==c.category){
        out.conflicts.push({id:cas+':official:'+key,cas:cas,field:'classifications.'+key,
          officialValue:[officialClasses[key].category,c.category],supplementalValue:null,effectiveValue:null,effectiveSource:'unresolved',
          status:'待专业核验',officialSource:srcOfficial(r),supplementalSource:officialClasses[key].source});
        delete eff.hazardMap[(clpDataHazardKey(c)||[])[0]];return;
      }
      officialClasses[key]={category:c.category,source:srcOfficial(r)};
      if(hit&&hit.category!==c.category)out.conflicts.push({id:cas+':classifications:'+key,cas:cas,field:'classifications.'+key,
        officialValue:c.category,supplementalValue:hit.category,effectiveValue:c.category,effectiveSource:'annex-vi',
        affectsCalculation:hit.usedForCalculation!==false,status:'待专业核验',officialSource:srcOfficial(r),
        supplementalSource:prov['classifications.'+key]||prov.classifications,
        note:hit.usedForCalculation===false?'旧 SDS 汇集展示值，未参与阶段二混合物计算':''});
      eff.classifications=eff.classifications.filter(function(x){return x.hazardClass+'|'+(x.route||'')!==key;});eff.classifications.push(clpDataCopy(c));
      var h=clpDataHazardKey(c);if(h){eff.hazardMap[h[0]]=h[1];prov['hazardMap.'+h[0]]=srcOfficial(r);}
      prov['classifications.'+key]=srcOfficial(r);
    });
    r.specificLimits.forEach(function(x){
      var key=x.hazardClass+'|'+x.category,hit=eff.specificLimits.filter(function(y){return y.hazardClass+'|'+y.category===key;})[0];
      if(hit&&hit.value!==x.value)out.conflicts.push({id:cas+':specificLimits:'+key,cas:cas,field:'specificLimits.'+key,officialValue:x.value,supplementalValue:hit.value,effectiveValue:x.value,effectiveSource:'annex-vi',status:'待专业核验',officialSource:srcOfficial(r),supplementalSource:prov.specificLimits});
      eff.specificLimits=eff.specificLimits.filter(function(y){return y.hazardClass+'|'+y.category!==key;});eff.specificLimits.push(clpDataCopy(x));
      if(x.hazardClass==='Skin Sens.')eff.hazardMap.skinSens={cat:x.category,scl:x.value};
      prov['specificLimits.'+key]=srcOfficial(r);
    });
    ['acute','chronic'].forEach(function(k){
      var val=r.mFactors[k],old=supp&&supp.mFactors&&supp.mFactors[k];if(val==null)return;
      var field='mFactors.'+k,res=CLP_SUBSTANCE_STORE.legacyResolutions[cas]&&CLP_SUBSTANCE_STORE.legacyResolutions[cas][field];
      if(res&&(res.datasetId!==dataset.id||!supp||old!==res.value))res=null;
      if(old!=null&&old!==val)out.conflicts.push({id:cas+':'+field,cas:cas,field:field,officialValue:val,supplementalValue:old,
        effectiveValue:res?res.value:val,effectiveSource:res?res.sourceType:'annex-vi',status:'待专业核验',officialSource:srcOfficial(r),supplementalSource:prov[field],note:res?res.note:''});
      eff.mFactors[k]=res?res.value:val;prov[field]=res?{sourceType:res.sourceType,sourceVersion:supp.revision,sourceRef:res.note}:srcOfficial(r);
    });
    ['oral','dermal','inhalation'].forEach(function(k){
      var x=r.ateValues[k];if(!x)return;var val=x.value,old=supp&&supp.ateValues&&supp.ateValues[k];
      if(old!=null&&old!==val)out.conflicts.push({id:cas+':ateValues.'+k,cas:cas,field:'ateValues.'+k,officialValue:val,supplementalValue:old,effectiveValue:val,effectiveSource:'annex-vi',status:'待专业核验',officialSource:srcOfficial(r),supplementalSource:prov['ateValues.'+k]});
      eff.ateValues[k]=val;eff.ateState='known';prov['ateValues.'+k]=srcOfficial(r);
    });
  });
  return out;
}
function clpSubstanceProfiles(casList,asOfDate){return (casList||[]).map(function(cas){return clpSubstanceProfile(cas,asOfDate);});}
function clpDataConflictList(){
  clpSubstanceStoreInit();var cas={};Object.keys(CLP_SUBSTANCE_STORE.supplementalByCas).forEach(function(k){cas[k]=true;});
  clpViRecords().forEach(function(r){cas[r.cas]=true;});
  return Object.keys(cas).reduce(function(a,k){return a.concat(clpSubstanceProfile(k).conflicts);},[]);
}
function clpViRowsProjection(asOfDate){
  return clpViRecords(asOfDate).map(function(r){var d=clpViDatasetGet(asOfDate)||clpViDatasetResolve(asOfDate);
    var m=r.mFactors.chronic!=null?'M='+r.mFactors.chronic+'（慢性水生毒性）':(r.mFactors.acute!=null?'M='+r.mFactors.acute+'（急性水生毒性）':'—');
    var ate=r.ateValues.oral?'口服 ATE = '+r.ateValues.oral.value+' '+r.ateValues.oral.unit:'—';
    return {idx:r.indexNo,name:r.name,cas:r.cas,ec:r.ec,cls:clpDataClassText(r.classifications),h:clpDataCodes(r.classifications).join(' / ')||'—',
      euh:r.euhCodes.join(' / ')||'—',picto:r.pictograms.join(' / ')||'—',signal:r.signalWord,scl:r.specificLimits.map(clpDataLimitText).join('｜')||'—',
      m:m,ate:ate,notes:r.notes.join(' / ')||'—',ver:d.version,src:r.source.clause+'（经 '+d.version+' 采纳）',rule:r.rule};
  });
}
function clpCompProjection(asOfDate){
  var out={},cas={};clpViRecords(asOfDate).forEach(function(r){cas[r.cas]=true;});
  Object.keys(CLP_SUBSTANCE_STORE.supplementalByCas).forEach(function(k){cas[k]=true;});
  Object.keys(cas).forEach(function(k){var p=clpSubstanceProfile(k,asOfDate),e=p.effective,s=p.supplemental;
    out[k]={name:p.name,uni:clpDataClassText(e.classifications),scl:e.specificLimits.map(clpDataLimitShortText).join('｜')||(e.specificLimitNote?'—（'+e.specificLimitNote+'）':'—'),
      haz:clpDataCopy(e.hazardMap),mM:e.mFactors.acute||0,mC:e.mFactors.chronic||0,mSrc:e.mSource||'',lc50:e.lc50,noec:e.noec,
      ateO:e.ateValues.oral||0,ateD:e.ateValues.dermal||0,ateI:e.ateValues.inhalation||0,
      ateOralQualifier:e.ateOralQualifier,ateNote:e.ateNote,ateState:e.ateState,aqState:e.aquaticState};
    out[k].ate=ateTxt(out[k]);
    if(s&&s.ateState==='na')out[k].ate='—（经评估不适用急性毒性估算）';
  });return out;
}
function clpLawQueryProjection(asOfDate){
  var d=clpViDatasetResolve(asOfDate);if(!d)return [];
  return clpViRowsProjection(asOfDate).map(function(r){return {id:d.id+':'+r.idx,cas:r.cas,name:r.name,ec:r.ec,source:'CLP 附录 VI',sourceType:'clp',region:'欧盟',
    dataType:'统一分类',result:'已统一分类',value:r.cls,version:d.version,latestVersion:d.version,status:'已生效',reviewDue:CLP_MODULES.vi.due,lawKey:'clp6',
    scl:r.scl,mFactor:r.m,ate:r.ate,sourceClause:r.src};});
}
function clpLawDetailProjection(asOfDate){return {cols:['Index No.','物质名称','EC No.','CAS 号','危害类别与分类','H 代码','标签要素','SCL','M 因子','ATE','Notes'],
  rows:clpViRowsProjection(asOfDate).map(function(r){return [r.idx,r.name,r.ec,r.cas,r.cls,r.h,r.picto+' · '+r.signal,r.scl,r.m,r.ate,r.notes];})};}
function clpRefreshCompatibilityProjections(asOfDate){
  if(!CLP_SUBSTANCE_STORE.initialized)return;
  var d=clpViDatasetResolve(asOfDate||clpSystemToday());if(!d)return;
  CLP_VI_ROWS=clpViRowsProjection(asOfDate);COMP_CLP=clpCompProjection(asOfDate);
  LAW_DETAIL.clp6=clpLawDetailProjection(asOfDate);
  var m=CLP_MODULES.vi;m.ver=d.version;m.eff=d.effectiveFrom;m.status=d.status;m.cutoff=d.cutoff;m.owner=d.reviewedBy;m.src=d.source.note;
  var law=lawRows.filter(function(r){return r.key==='clp6';})[0];
  if(law){law.ver=d.version;law.latestVer=d.version;law.eff=d.effectiveFrom;law.status='已生效';law.items=d.records.length;
    law.verifier=d.reviewedBy;law.reviewDue=m.due;}
}

clpSubstanceStoreInit();
