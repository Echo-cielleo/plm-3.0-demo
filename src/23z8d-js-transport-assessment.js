/* [23z8d] 第 14 章人工运输结论；不推断 UN 编号或运输类别。 */
var TRANSPORT_MODES=[['ADR','公路（ADR）'],['RID','铁路（RID）'],['ADN','内河（ADN）'],
  ['IMDG','海运（IMDG）'],['IATA','空运（IATA DGR）']];
function transportAssessmentFingerprint(){
  var p=wz.project||{};
  return JSON.stringify({market:p.market||'',product:p.product||'',formType:wz.formType||'',
    asOfDate:p.date||'',formula:(wz.formula||[]).map(function(f){return [f.cas||'',f.conc==null?'':String(f.conc)];}),
    evaluationInput:JSON.stringify(complianceEvaluationNormalize(complianceEvaluationInputFromWz()))});
}
function transportAssessmentStatus(){
  var a=wz.transportAssessment||(wz.transportAssessment=transportAssessmentDefault());
  if(['NOT_ASSESSED','NOT_REGULATED','REGULATED','STALE'].indexOf(a.status)<0)a.status='NOT_ASSESSED';
  if(a.status==='NOT_ASSESSED'||a.status==='STALE')return a.status;
  if(a.inputFingerprint!==transportAssessmentFingerprint())a.status='STALE';
  return a.status;
}
function transportAssessmentInvalidate(reason){
  var a=wz.transportAssessment||(wz.transportAssessment=transportAssessmentDefault());
  if(a.status==='NOT_REGULATED'||a.status==='REGULATED'){
    a.status='STALE';a.invalidReason=reason||'配方或产品信息已变化';
  }
}
function transportAssessmentSave(values){
  var status=values.status;
  if(['NOT_ASSESSED','NOT_REGULATED','REGULATED'].indexOf(status)<0)throw new Error('请选择运输结论。');
  var a=Object.assign(transportAssessmentDefault(),values);
  ['unNumber','properShippingName','hazardClass','packingGroup','marinePollutant',
    'specialPrecautions','basis','assessedBy'].forEach(function(key){a[key]=String(a[key]||'').trim();});
  if(status!=='NOT_ASSESSED'){
    if(!a.basis||!a.assessedBy)throw new Error('请填写判断依据和确认人。');
    if(status==='REGULATED'&&(!a.unNumber||!a.properShippingName||!a.hazardClass))
      throw new Error('危险货物需填写 UN 编号、正确运输名称和危险类别。');
    a.assessedAt=nowStr();a.inputFingerprint=transportAssessmentFingerprint();
  }
  if(status!=='REGULATED'){
    a.unNumber='';a.properShippingName='';a.hazardClass='';a.packingGroup='';a.marinePollutant='';
  }
  if(status==='NOT_ASSESSED'){a.assessedAt='';a.inputFingerprint='';}
  a.conclusion=status==='NOT_ASSESSED'?'':status==='NOT_REGULATED'?'非危险货物（人工确认）':'危险货物（人工录入）';
  a.applicableModes=Array.isArray(a.applicableModes)?a.applicableModes.filter(function(m){return TRANSPORT_MODES.some(function(x){return x[0]===m;});}):[];
  if(status==='REGULATED'&&!a.applicableModes.length)throw new Error('请至少选择一种适用运输方式。');
  wz.transportAssessment=a;
  return a;
}
function transportAssessmentOpen(){
  var a=wz.transportAssessment||transportAssessmentDefault(),status=transportAssessmentStatus();
  var choice=status==='STALE'?(a.conclusion.indexOf('危险货物（人工录入）')===0?'REGULATED':'NOT_REGULATED'):status;
  function field(id,label,value){return '<div class="field"><label>'+label+'</label><input class="ctrl" id="'+id+'" value="'+esc(value||'')+'"></div>';}
  openModal({title:'维护运输结论',width:720,
    body:'<div class="notice info"><div class="ni">i</div><div>本原型未配置自动运输分类规则，运输结论由法规 / EHS 人员人工确认。</div></div>'+
      (status==='STALE'?'<div class="notice warn"><div class="ni">!</div><div>配方或产品信息已变化，原运输结论需要重新确认。旧内容保留供参考。</div></div>':'')+
      '<div class="field"><label>结论</label><select class="ctrl" id="taStatus">'+
      [['NOT_ASSESSED','尚未评估'],['NOT_REGULATED','非危险货物（人工确认）'],['REGULATED','危险货物（人工录入）']].map(function(x){
        return '<option value="'+x[0]+'"'+(choice===x[0]?' selected':'')+'>'+x[1]+'</option>';
      }).join('')+'</select></div><div class="form-grid">'+
      field('taUn','UN 编号',a.unNumber)+field('taName','正确运输名称',a.properShippingName)+
      field('taClass','危险类别',a.hazardClass)+field('taGroup','包装组',a.packingGroup)+
      field('taMarine','海洋污染物',a.marinePollutant)+field('taBy','确认人',a.assessedBy)+
      '</div><div class="field"><label>适用运输方式</label><div style="display:flex;gap:12px;flex-wrap:wrap">'+
      TRANSPORT_MODES.map(function(x){return '<label><input type="checkbox" name="taMode" value="'+x[0]+'"'+
        ((a.applicableModes||[]).indexOf(x[0])>=0?' checked':'')+'> '+x[1]+'</label>';}).join('')+'</div></div>'+
      '<div class="field"><label>判断依据或来源说明</label><textarea class="ctrl" id="taBasis">'+esc(a.basis||'')+'</textarea></div>'+
      '<div class="field"><label>特殊注意事项</label><textarea class="ctrl" id="taPrecautions">'+esc(a.specialPrecautions||'')+'</textarea></div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="transportAssessmentSaveFromModal()">保存人工结论</button>'});
}
function transportAssessmentSaveFromModal(){
  try{
    transportAssessmentSave({status:$('taStatus').value,unNumber:$('taUn').value,
      properShippingName:$('taName').value,hazardClass:$('taClass').value,
      packingGroup:$('taGroup').value,marinePollutant:$('taMarine').value,
      applicableModes:Array.from(document.querySelectorAll('[name="taMode"]:checked')).map(function(x){return x.value;}),
      basis:$('taBasis').value,assessedBy:$('taBy').value,specialPrecautions:$('taPrecautions').value});
    closeModal();renderStep5();toast('运输结论已保存','ok');
  }catch(e){toast(e.message,'warn');}
}
function transportAssessmentTableHtml(){
  var a=wz.transportAssessment||transportAssessmentDefault(),status=transportAssessmentStatus();
  if(status==='NOT_ASSESSED')return '<div class="notice warn">运输分类尚未评估。当前原型未配置自动运输规则，请由法规 / EHS 人员确认。</div>';
  if(status==='STALE')return '<div class="notice warn">配方或产品信息已变化，原运输结论需要重新确认。</div>';
  var rows=TRANSPORT_MODES.filter(function(x){return status==='NOT_REGULATED'||a.applicableModes.indexOf(x[0])>=0;})
    .map(function(x){return '<tr><td>'+esc(x[1])+'</td><td>'+esc(status==='REGULATED'?a.unNumber:'—')+'</td>'+
      '<td>'+esc(status==='REGULATED'?a.properShippingName:'—')+'</td><td>'+esc(status==='REGULATED'?a.hazardClass:'—')+'</td>'+
      '<td>'+esc(status==='REGULATED'?a.packingGroup||'—':'—')+'</td><td>'+esc(status==='REGULATED'?a.marinePollutant||'—':'—')+'</td>'+
      '<td>'+esc(status==='NOT_REGULATED'?'经人工确认：非危险货物 / 不受管制':a.specialPrecautions||'—')+'</td></tr>';}).join('');
  return '<div class="tbl-wrap"><table class="tbl mini"><thead><tr><th>运输方式</th><th>UN 编号</th><th>正确运输名称</th>'+
    '<th>危险类别</th><th>包装组</th><th>海洋污染物</th><th>备注</th></tr></thead><tbody>'+rows+'</tbody></table>'+
    '<div class="muted" style="font-size:11.5px;margin-top:6px">人工确认：'+esc(a.assessedBy)+' · '+esc(a.assessedAt)+
    '；判断依据：'+esc(a.basis)+'；特殊注意事项：'+esc(a.specialPrecautions||'—')+
    (status==='REGULATED'?'。本原型使用人工录入的统一运输结论；正式版需按各运输方式法规分别核对。':'')+'</div></div>';
}
