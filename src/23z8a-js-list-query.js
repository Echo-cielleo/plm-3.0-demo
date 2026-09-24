/* [23z8a] 其余名单适配及统一查询投影；不接 SDS 或产品级条件判断。 */
function listReachXivEntries(){
  return REACH_XIV.map(function(r){
    var one=/^(\d{2,7}-\d{2}-\d) \/ (\d{3}-\d{3}-\d)$/.exec(r.ids);
    return {id:'REACH-XIV-'+r.no,datasetKey:'reach-xiv',entryCode:r.no,name:r.name,
      identity:{casNumbers:one?[one[1]]:[],ecNumbers:one?[one[2]]:[],aliases:[]},
      mode:'listed-only',applicability:{markets:['EU'],objectTypes:[],useClasses:[]},conditions:[],
      source:{datasetVersion:REACH_MODULES.xiv.ver,effectiveFrom:REACH_MODULES.xiv.eff,
        reference:REACH_MODULES.xiv.srcFile+' · '+r.no},
      originalText:{summary:r.reason,threshold:'',use:r.use,exemption:'',
        latestApplicationDate:r.apply,sunsetDate:r.sunset,status:r.status}};
  });
}
function listRohsEntries(){
  var law=lawRows.find(function(r){return r.key==='rohs2';});
  return ROHS_ITEMS.map(function(r){
    var cas=/^\d{2,7}-\d{2}-\d$/.test(r.cas)?r.cas:'';
    var ec=/^\d{3}-\d{3}-\d$/.test(r.ec)?r.ec:'';
    return {id:'ROHS-ANNEX-II-'+(cas||r.en),datasetKey:'eu-rohs-annex-ii',
      entryCode:cas||r.en,name:r.cn,
      identity:{casNumbers:cas?[cas]:[],ecNumbers:ec?[ec]:[],aliases:[r.en]},
      mode:'listed-only',applicability:{markets:['EU'],objectTypes:[],useClasses:[]},conditions:[],
      source:{datasetVersion:ROHS_VER,effectiveFrom:law.eff,reference:ROHS_SRC},
      originalText:{summary:r.note,threshold:r.limit,use:r.app,exemption:'',
        englishName:r.en,category:r.grp,limitNote:ROHS_LIMIT_NOTE}};
  });
}
function listDetailColumnIndex(detail,candidateNames){
  return detail.cols.findIndex(function(col){return candidateNames.indexOf(String(col).trim())>=0;});
}
function listDetailCell(row,index){return index<0 ? '' : (row[index]||'');}
function listDetailEntries(lawKey,datasetKey){
  var detail=LAW_DETAIL[lawKey], law=lawRows.find(function(r){return r.key===lawKey;});
  if(!detail || !law)return [];
  var col={
    id:listDetailColumnIndex(detail,['序号','编号','条目号']),
    name:listDetailColumnIndex(detail,['物质名称','名称','品名']),
    cas:listDetailColumnIndex(detail,['CAS 号','CAS']),
    ec:listDetailColumnIndex(detail,['EC 号','EC']),
    threshold:listDetailColumnIndex(detail,['限值','浓度限值']),
    use:listDetailColumnIndex(detail,['用途','适用范围']),
    note:listDetailColumnIndex(detail,['备注','说明']),
    hazard:listDetailColumnIndex(detail,['危险性类别'])
  };
  return detail.rows.map(function(row){
    var name=listDetailCell(row,col.name),cas=listDetailCell(row,col.cas),ec=listDetailCell(row,col.ec);
    var code=listDetailCell(row,col.id)||cas||name;
    cas=/^\d{2,7}-\d{2}-\d$/.test(cas)?cas:'';
    ec=/^\d{3}-\d{3}-\d$/.test(ec)?ec:'';
    return {id:datasetKey+'-'+code,datasetKey:datasetKey,entryCode:code,name:name,
      identity:{casNumbers:cas?[cas]:[],ecNumbers:ec?[ec]:[],aliases:[]},
      mode:'listed-only',applicability:{markets:[lawKey==='cn-danger'?'CN':'industry'],objectTypes:[],useClasses:[]},
      conditions:[],source:{datasetVersion:law.ver,effectiveFrom:law.eff,reference:law.name},
      originalText:{summary:listDetailCell(row,col.hazard),threshold:listDetailCell(row,col.threshold),
        use:listDetailCell(row,col.use),exemption:'',notes:listDetailCell(row,col.note)}};
  });
}
function listZdhcEntries(){return listDetailEntries('zdhc-mrsl','zdhc-mrsl');}
function listCnDangerEntries(){return listDetailEntries('cn-danger','cn-danger');}

/* 中国进出口管控演示子集：只按 CAS 做身份匹配，不入条件下的阈值解析。
   选的四个是各自目录里长期在列的典型条目，用于让"已检查、未命中"成为可验证结论；
   完整目录以官方发布为准，本子集不覆盖全部条目。 */
var CN_TRADE_CONTROL_VER='2023 版';
var CN_TRADE_CONTROL_EFF='2023-01-01';
var CN_TRADE_CONTROL_SEED=[
  ['cn-prohibited-import-export','第一批 第 6 项','多氯联苯（PCB）','1336-36-3',
    '列入《中国禁止进出口货物目录》','全部用途停止进出口'],
  ['cn-prohibited-import-export','第一批 第 9 项','滴滴涕（DDT）','50-29-3',
    '列入《中国禁止进出口货物目录》','全部用途停止进出口'],
  ['cn-toxic-chemicals','2023 版 序号 12','氰化钠','143-33-9',
    '列入《中国严格限制进出口的有毒化学品目录》','进出口须办理有毒化学品放行通知单'],
  ['cn-toxic-chemicals','2023 版 序号 18','三氧化二砷','1327-53-3',
    '列入《中国严格限制进出口的有毒化学品目录》','进出口须办理有毒化学品放行通知单']
];
function listCnTradeControlEntries(datasetKey){
  var ref=datasetKey==='cn-prohibited-import-export'?'中国禁止进出口货物目录':'中国严格限制进出口的有毒化学品目录';
  return CN_TRADE_CONTROL_SEED.filter(function(r){return r[0]===datasetKey;}).map(function(r){
    return {id:datasetKey+'-'+r[3],datasetKey:datasetKey,entryCode:r[1],name:r[2],
      identity:{casNumbers:[r[3]],ecNumbers:[],aliases:[]},
      mode:'listed-only',applicability:{markets:['CN'],objectTypes:[],useClasses:[]},conditions:[],
      source:{datasetVersion:CN_TRADE_CONTROL_VER,effectiveFrom:CN_TRADE_CONTROL_EFF,reference:ref},
      originalText:{summary:r[4],threshold:'—',use:r[5],exemption:'',
        notes:'演示子集，仅按 CAS 做身份匹配；完整目录以官方发布为准'}};
  });
}

var LIST_ZDHC_LAW=lawRows.find(function(r){return r.key==='zdhc-mrsl';});
var LIST_CN_LAW=lawRows.find(function(r){return r.key==='cn-danger';});
var LIST_ROHS_LAW=lawRows.find(function(r){return r.key==='rohs2';});
listRegisterDataset({key:'reach-xiv',version:REACH_MODULES.xiv.ver,source:REACH_MODULES.xiv.src,
  market:'EU',effectiveFrom:REACH_MODULES.xiv.eff,entries:listReachXivEntries()});
listRegisterDataset({key:'eu-rohs-annex-ii',version:ROHS_VER,source:ROHS_SRC,
  market:'EU',effectiveFrom:LIST_ROHS_LAW.eff,entries:listRohsEntries()});
listRegisterDataset({key:'zdhc-mrsl',version:LIST_ZDHC_LAW.ver,source:LIST_ZDHC_LAW.name,
  market:'industry',effectiveFrom:LIST_ZDHC_LAW.eff,entries:listZdhcEntries()});
listRegisterDataset({key:'cn-danger',version:LIST_CN_LAW.ver,source:LIST_CN_LAW.name,
  market:'CN',effectiveFrom:LIST_CN_LAW.eff,entries:listCnDangerEntries()});
listRegisterDataset({key:'cn-prohibited-import-export',version:CN_TRADE_CONTROL_VER,
  source:'中国禁止进出口货物目录',market:'CN',effectiveFrom:CN_TRADE_CONTROL_EFF,
  entries:listCnTradeControlEntries('cn-prohibited-import-export')});
listRegisterDataset({key:'cn-toxic-chemicals',version:CN_TRADE_CONTROL_VER,
  source:'中国严格限制进出口的有毒化学品目录',market:'CN',effectiveFrom:CN_TRADE_CONTROL_EFF,
  entries:listCnTradeControlEntries('cn-toxic-chemicals')});

var LIST_QUERY_CONFIG={
  'reach-svhc':{lawKey:'svhc',source:'SVHC 候选清单',sourceType:'reach',region:'欧盟',
    dataType:'高关注物质',result:'已列入候选清单',maintenanceRoute:'law:reach'},
  'reach-xiv':{lawKey:'xiv',source:'REACH Annex XIV',sourceType:'reach',region:'欧盟',
    dataType:'授权',result:'已列入授权清单',maintenanceRoute:'law:reach'},
  'reach-xvii':{lawKey:'xvii',source:'REACH Annex XVII',sourceType:'reach',region:'欧盟',
    dataType:'限制',result:'已列入限制条目',maintenanceRoute:'law:reach'},
  'eu-rohs-annex-ii':{lawKey:'rohs2',source:'RoHS Annex II',sourceType:'rohs',region:'欧盟',
    dataType:'限制',result:'已列入 Annex II',maintenanceRoute:'law:rohs'},
  'zdhc-mrsl':{lawKey:'zdhc-mrsl',source:'ZDHC MRSL',sourceType:'zdhc',region:'行业标准',
    dataType:'制造限用',result:'已列入 MRSL',maintenanceRoute:'law:zdhc'},
  'cn-danger':{lawKey:'cn-danger',source:'国内危险化学品目录',sourceType:'cn',region:'中国',
    dataType:'危化品分类',result:'已列入目录',maintenanceRoute:'law:cn'},
  'cn-prohibited-import-export':{lawKey:'cn-prohibited',source:'禁止进出口货物目录',sourceType:'cn',
    region:'中国',dataType:'进出口禁止',result:'已列入禁止目录',maintenanceRoute:'law:cn'},
  'cn-toxic-chemicals':{lawKey:'cn-toxic',source:'严格限制进出口有毒化学品目录',sourceType:'cn',
    region:'中国',dataType:'有毒化学品',result:'已列入管控名录',maintenanceRoute:'law:cn'}
};
function listQueryPlain(text){return String(text||'').replace(/<[^>]*>/g,'');}
function listQueryId(dataset,entry){
  return 'L-'+[dataset.key,dataset.version,entry.id].map(function(x){
    return encodeURIComponent(x).replace(/'/g,'%27');
  }).join('-');
}
function listLawQueryProjection(asOfDate){
  var rows=[];
  Object.keys(LIST_QUERY_CONFIG).forEach(function(key){
    var dataset=listResolveDataset(key,asOfDate);
    if(!dataset)return;
    var cfg=LIST_QUERY_CONFIG[key],law=lawRows.find(function(r){return r.key===cfg.lawKey;})||{};
    dataset.entries.forEach(function(entry){
      if(entry.source.effectiveFrom && entry.source.effectiveFrom>asOfDate)return;
      var original=entry.originalText||{};
      var value=[entry.entryCode,original.summary,original.threshold,original.use,
        original.exemption,original.notes].map(listQueryPlain).filter(function(x){return x&&x!=='—';}).join(' · ');
      rows.push({id:listQueryId(dataset,entry),cas:entry.identity.casNumbers[0]||'—',
        name:entry.name,ec:entry.identity.ecNumbers[0]||'—',
        source:cfg.source,sourceType:cfg.sourceType,region:cfg.region,dataType:cfg.dataType,
        result:cfg.result,value:value,version:dataset.version,status:law.status||'已生效',
        lawKey:cfg.lawKey,entryCode:entry.entryCode,
        thresholdText:listQueryPlain(original.threshold),useText:listQueryPlain(original.use),
        exemptionText:listQueryPlain(original.exemption),summaryText:listQueryPlain(original.summary),
        maintenanceRoute:cfg.maintenanceRoute,isListProjection:true,
        datasetSource:dataset.source,reviewDue:law.reviewDue||'—',
        latestVersion:law.latestVer&&law.latestVer!==law.ver?law.latestVer:dataset.version});
    });
  });
  return rows;
}
