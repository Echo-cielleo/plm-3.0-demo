/* [23z9a] SDS 只读调用 OEL 数据集；不换算单位、不比较市场限值。 */
function oelSdsRegionForMarket(market){return {EU:'欧盟（EU）',CN:'中国'}[market]||'';}
function oelSdsValidDate(value){
  return /^\d{4}-\d{2}-\d{2}$/.test(value||'')&&!isNaN(Date.parse(value+'T00:00:00Z'));
}
function oelSdsResolveSet(market,asOfDate){
  var region=oelSdsRegionForMarket(market);
  if(!region||!oelSdsValidDate(asOfDate))return null;
  return OEL_SETS.filter(function(set){
    return set.rg===region&&set.st==='已发布'&&oelSdsValidDate(set.eff)&&set.eff<=asOfDate&&
      (!set.exp||set.exp==='—'||(oelSdsValidDate(set.exp)&&set.exp>=asOfDate));
  }).sort(function(a,b){return b.eff.localeCompare(a.eff)||b.id.localeCompare(a.id);})[0]||null;
}
function oelSdsRowStatus(row){return row&&row.limit?'AVAILABLE':'NO_LIMIT_RECORD';}
function oelSdsEvaluate(formula,market,asOfDate){
  var region=oelSdsRegionForMarket(market),set=oelSdsResolveSet(market,asOfDate);
  var result={status:set?'AVAILABLE':'DATASET_UNAVAILABLE',market:market,region:region,
    asOfDate:asOfDate,dataset:null,rows:[],missingComponents:[],evidence:[],messages:[]};
  if(!set){result.messages.push('目标市场暂无已发布且已生效的 OEL 数据集');return result;}
  var source=OEL_SOURCES.find(function(s){return s.rg===region;})||{};
  result.dataset={id:set.id,version:set.ver,effectiveFrom:set.eff,source:set.name||source.list||''};
  (formula||[]).forEach(function(f){
    var component={cas:f.cas||'',ec:f.ec||'',name:f.name||'',
      concentration:f.concentration==null?Number(f.conc)||0:Number(f.concentration)};
    var records=OEL_LIMITS.filter(function(r){return r.set===set.id&&r.cas===component.cas&&r.st==='已发布';});
    if(!records.length){result.missingComponents.push(component);return;}
    records.forEach(function(r){
      var slots=[];
      if(r.twa&&r.twa!=='—')slots.push('长期');
      if(r.stel&&r.stel!=='—')slots.push('短期');
      if(r.ceil&&r.ceil!=='—')slots.push('上限');
      result.rows.push({component:component,limit:{type:r.type,semanticSlots:slots,
        twa:r.twa,stel:r.stel,ceiling:r.ceil,unit:r.unit,skin:r.skin,
        sensitization:r.sens,biologicalMonitoring:r.bio,other:r.other,scope:r.scope,
        note:r.fn||''},source:{datasetId:set.id,version:set.ver,effectiveFrom:set.eff,recordId:r.id}});
      result.evidence.push({cas:r.cas,recordId:r.id,datasetId:set.id,version:set.ver,
        effectiveFrom:set.eff,source:set.name||source.list||'',type:r.type,unit:r.unit});
    });
  });
  if(result.missingComponents.length){
    if(!result.rows.length)result.status='NO_LIMIT_RECORD';
    result.messages.push('当前有效 OEL 数据集未维护该组分限值');
  }
  return result;
}
