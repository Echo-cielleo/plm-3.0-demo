/* [23z8d] 第 14 章人工运输结论；不推断 UN 编号或运输类别。 */
var TRANSPORT_MODES=[['ADR','公路（ADR）'],['RID','铁路（RID）'],['ADN','内河（ADN）'],
  ['IMDG','海运（IMDG）'],['IATA','空运（IATA DGR）']];
/* G10 · 第 14 章表格按真实 SDS 排版：行 = 14.1~14.7，列 = 四种运输方式
   （ADR 与 RID 合并为陆运一列，与示例文档一致）。第 4 项非空的只填对应列。 */
var TRANSPORT_COLS=[{label:'陆运 ADR / RID',modes:['ADR','RID']},
  {label:'内河运输 ADN',modes:['ADN']},
  {label:'海运 IMDG',modes:['IMDG']},
  {label:'空运 ICAO / IATA',modes:['IATA']}];
var TRANSPORT_ROWS=[
  ['14.1','UN 编号 / UN number',function(a){return a.unNumber;}],
  ['14.2','UN 正确运输名称 / Proper shipping name',function(a){return a.properShippingName;}],
  ['14.3','运输危险类别 / Transport hazard class',function(a){return a.hazardClass;}],
  ['14.4','包装组 / Packing group',function(a){return a.packingGroup;}],
  ['14.5','环境危害 / Environmental hazards',function(a){return transportMarineCell(a);}],
  ['14.6','用户特殊注意事项 / Special precautions for user',function(a){return a.specialPrecautions;}],
  ['14.7','IMO 散装海运 / Maritime transport in bulk',function(a){return a.bulkTransport;},'IMDG']
];
/* 非危险货物时四列的统一写法：照真实 SDS 写「不受管制」，不写「经人工确认」——
   SDS 是对外的法定声明，不标注结论由谁、以何种方式得出；内部可追溯信息只在编制视图留痕。 */
var TRANSPORT_NR_TXT='不受管制 / Not regulated';
/* ---- 14.5 环境危害：由第 12 章混合物水生危害结论推导，不人工手填 ----
   IMDG Code 2.10.2：GHS Aquatic Acute 1 / Chronic 1 / Chronic 2 判为海洋污染物，
   Chronic 3 / 4 与「不分类」不判。上游未定论时本项不给是 / 否。 */
function transportMarineDerived(){
  var c=(wz.classItems||[]).filter(function(x){return x.id==='aqua';})[0];
  if(!c)return {state:'unknown',text:'未评估',why:'第 12 章尚未生成混合物水生危害结论'};
  if(c.status==='pending'||!c.result||c.result==='—')
    return {state:'pending',text:'待人工判定',
      why:'第 12 章「'+c.name+'」为待人工判定，系统不产出是 / 否。可勾选人工覆盖。'};
  var r=c.result||'',cats=r.match(/Aquatic\s+(?:Acute|Chronic)\s*\d/gi)||[];
  if(!cats.length)return {state:'unknown',text:'未评估',why:'第 12 章水生危害结论无法解析：'+r};
  var isMp=cats.some(function(x){
    return /Acute\s*1/i.test(x)||/Chronic\s*1/i.test(x)||/Chronic\s*2/i.test(x);});
  return {state:isMp?'yes':'no',text:isMp?('是 · '+r):('否 · '+r),
    why:'系统带出 · 依据第 12 章 12.1 混合物水生危害结论「'+r+'」。'+
        'IMDG Code 2.10.2：Aquatic Acute 1 / Chronic 1 / Chronic 2 判为海洋污染物。'};
}
/* 单元格取值：人工覆盖优先，否则用系统带出结论 */
function transportMarineCell(a){
  var ov=String(a.marinePollutant||'').trim();
  if(ov)return ov+'（人工覆盖）';
  return transportMarineDerived().text;
}
function transportAssessmentToggleMarine(){
  var c=$('taMarineOvr'),i=$('taMarine');
  if(i)i.style.display=(c&&c.checked)?'':'none';
}
/* 章节标题的「待人工操作」标记已迁出到新分片 23z9b-js-sds-sec-todo.js
   （它是通用的章节待办标记，不只服务于运输章节）。 */
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
  ['unNumber','properShippingName','hazardClass','packingGroup','marinePollutant','bulkTransport',
    'specialPrecautions','basis','assessedBy'].forEach(function(key){a[key]=String(a[key]||'').trim();});
  if(status!=='NOT_ASSESSED'){
    if(!a.basis||!a.assessedBy)throw new Error('请填写判断依据和确认人。');
    if(status==='REGULATED'&&(!a.unNumber||!a.properShippingName||!a.hazardClass))
      throw new Error('危险货物需填写 UN 编号、正确运输名称和危险类别。');
    a.assessedAt=nowStr();a.inputFingerprint=transportAssessmentFingerprint();
  }
  if(status!=='REGULATED'){
    a.unNumber='';a.properShippingName='';a.hazardClass='';a.packingGroup='';
    a.marinePollutant='';a.bulkTransport='';
  }
  if(status==='NOT_ASSESSED'){a.assessedAt='';a.inputFingerprint='';}
  a.conclusion=status==='NOT_ASSESSED'?'':status==='NOT_REGULATED'?'非危险货物（人工确认）':'危险货物（人工录入）';
  a.applicableModes=Array.isArray(a.applicableModes)?a.applicableModes.filter(function(m){return TRANSPORT_MODES.some(function(x){return x[0]===m;});}):[];
  if(status==='REGULATED'&&!a.applicableModes.length)throw new Error('请至少选择一种适用运输方式。');
  wz.transportAssessment=a;
  return a;
}
/* 弹窗必填标记：星号随「结论」联动显示
   when: 'confirmed' = 结论非「尚未评估」时必填；'danger' = 仅「危险货物」时必填。 */
function taReqMark(when){
  if(!when)return '';
  return '<span class="req ta-req" data-when="'+when+'">*</span>';
}
function transportAssessmentSyncRequired(){
  var sel=$('taStatus'),st=sel?sel.value:'NOT_ASSESSED';
  var danger=st==='REGULATED',confirmed=st!=='NOT_ASSESSED';
  Array.prototype.forEach.call(document.querySelectorAll('.modal .ta-req'),function(el){
    var w=el.getAttribute('data-when');
    el.style.display=(w==='danger'?danger:confirmed)?'':'none';
  });
}
function transportAssessmentOpen(){
  var a=wz.transportAssessment||transportAssessmentDefault(),status=transportAssessmentStatus();
  var choice=status==='STALE'?(a.conclusion.indexOf('危险货物（人工录入）')===0?'REGULATED':'NOT_REGULATED'):status;
  function field(id,label,value,when){
    return '<div class="field"><label>'+label+taReqMark(when)+'</label>'+
      '<input class="ctrl" id="'+id+'" value="'+esc(value||'')+'"></div>';
  }
  var mp=transportMarineDerived();
  openModal({title:'维护运输结论',width:720,
    body:'<div class="notice info"><div class="ni">i</div><div>本原型未配置自动运输分类规则，运输结论由法规 / EHS 人员人工确认。</div></div>'+
      (status==='STALE'?'<div class="notice warn"><div class="ni">!</div><div>配方或产品信息已变化，原运输结论需要重新确认。旧内容保留供参考。</div></div>':'')+
      '<div class="field"><label>结论</label><select class="ctrl" id="taStatus" onchange="transportAssessmentSyncRequired()">'+
      [['NOT_ASSESSED','尚未评估'],['NOT_REGULATED','非危险货物（人工确认）'],['REGULATED','危险货物（人工录入）']].map(function(x){
        return '<option value="'+x[0]+'"'+(choice===x[0]?' selected':'')+'>'+x[1]+'</option>';
      }).join('')+'</select></div><div class="form-grid">'+
      field('taUn','UN 编号',a.unNumber,'danger')+field('taName','正确运输名称',a.properShippingName,'danger')+
      field('taClass','危险类别',a.hazardClass,'danger')+field('taGroup','包装组',a.packingGroup,'')+
      field('taBulk','散装海运（14.7 IMO）',a.bulkTransport,'')+
      field('taBy','确认人',a.assessedBy,'confirmed')+
      '</div>'+
      '<div class="muted" style="font-size:11.5px;margin:-2px 0 8px;line-height:1.5">'+
        '14.7 由「结论」统控：确认「非危险货物」时四列统一写「不受管制」，此项留空即可；'+
        '选「危险货物」且勾选海运时，这里填的内容才会出现在表格 14.7 行。</div>'+
      /* 14.5 由系统从第 12 章水生危害结论带出，默认不手填 */
      '<div class="field"><label>海洋污染物（14.5 环境危害）</label>'+
        '<div style="padding:7px 10px;background:var(--bg);border:1px solid var(--line-2);border-radius:6px">'+
          '<div style="font-size:12.5px;font-weight:600">'+esc(mp.text)+'</div>'+
          '<div class="muted" style="font-size:11.5px;margin-top:3px;line-height:1.5">'+esc(mp.why)+'</div>'+
        '</div>'+
        '<label style="display:flex;align-items:center;gap:6px;margin:7px 0 0;font-size:12.5px;color:var(--text-2)">'+
          '<input type="checkbox" id="taMarineOvr"'+((a.marinePollutant||'')?' checked':'')+
          ' onchange="transportAssessmentToggleMarine()"> 人工覆盖'+
          '<span class="muted" style="font-size:11.5px">（勾选后可手填；留空即采用系统带出结论）</span></label>'+
        '<input class="ctrl" id="taMarine" style="margin-top:6px;display:'+((a.marinePollutant||'')?'block':'none')+
          '" value="'+esc(a.marinePollutant||'')+'" placeholder="例如：是 · Aquatic Chronic 2（H411）">'+
      '</div><div class="field"><label>适用运输方式'+taReqMark('danger')+'</label>'+
      '<div style="display:flex;gap:12px;flex-wrap:wrap">'+
      TRANSPORT_MODES.map(function(x){return '<label><input type="checkbox" name="taMode" value="'+x[0]+'"'+
        ((a.applicableModes||[]).indexOf(x[0])>=0?' checked':'')+'> '+x[1]+'</label>';}).join('')+
      '</div><div class="muted" style="font-size:11.5px;margin-top:5px">'+
        '公路（ADR）与铁路（RID）共同对应表格「陆运 ADR / RID」一列；勾选的方式出结论，未勾选的标 Not applicable。</div></div>'+
      '<div class="field"><label>判断依据或来源说明'+taReqMark('confirmed')+'</label>'+
      '<textarea class="ctrl" id="taBasis">'+esc(a.basis||'')+'</textarea></div>'+
      '<div class="field"><label>特殊注意事项</label><textarea class="ctrl" id="taPrecautions">'+esc(a.specialPrecautions||'')+'</textarea></div>',
    footer:'<div style="margin-right:auto;font-size:12.3px;color:var(--muted)">带 * 为必填，随「结论」变化</div>'+
      '<button class="btn" onclick="closeModal()">取消</button>'+
      '<button class="btn primary" onclick="transportAssessmentSaveFromModal()">保存人工结论</button>',
    onOpen:function(){transportAssessmentSyncRequired();}});
}
function transportAssessmentSaveFromModal(){
  try{
    transportAssessmentSave({status:$('taStatus').value,unNumber:$('taUn').value,
      properShippingName:$('taName').value,hazardClass:$('taClass').value,
      packingGroup:$('taGroup').value,
      /* 14.5 默认采用系统带出结论；只有勾了「人工覆盖」才存人工值 */
      marinePollutant:($('taMarineOvr')&&$('taMarineOvr').checked)?$('taMarine').value:'',
      bulkTransport:$('taBulk').value,
      applicableModes:Array.from(document.querySelectorAll('[name="taMode"]:checked')).map(function(x){return x.value;}),
      basis:$('taBasis').value,assessedBy:$('taBy').value,specialPrecautions:$('taPrecautions').value});
    closeModal();renderStep5();toast('运输结论已保存','ok');
  }catch(e){toast(e.message,'warn');}
}
/* formal = true 表示正式交付口径（导出 / 交付预览），不带内部留痕 */
function transportAssessmentTableHtml(formal){
  var a=wz.transportAssessment||transportAssessmentDefault(),status=transportAssessmentStatus();
  if(status==='NOT_ASSESSED')return '<div class="notice warn">运输分类尚未评估。当前原型未配置自动运输规则，请由法规 / EHS 人员确认。</div>';
  if(status==='STALE')return '<div class="notice warn">配方或产品信息已变化，原运输结论需要重新确认。</div>';
  var modes=a.applicableModes||[];
  /* 未指定适用运输方式时按全部方式处理（非危险货物允许一个都不勾）；
     一旦勾了，只出结论的是勾中的那些方式，其余列标 Not applicable。 */
  var allModes=!modes.length;
  var h='<div class="tbl-wrap"><table class="tbl mini"><thead><tr><th style="width:190px">项目</th>';
  TRANSPORT_COLS.forEach(function(c){h+='<th>'+esc(c.label)+'</th>';});
  h+='</tr></thead><tbody>';
  TRANSPORT_ROWS.forEach(function(r){
    h+='<tr><td><b class="mono">'+esc(r[0])+'</b><br><span style="font-size:11.5px">'+esc(r[1])+'</span></td>';
    TRANSPORT_COLS.forEach(function(c){
      if(r[3]&&c.modes.indexOf(r[3])<0){h+='<td class="muted">N/A</td>';return;}
      var on=allModes||c.modes.some(function(m){return modes.indexOf(m)>=0;});
      if(!on){h+='<td class="muted">Not applicable</td>';return;}
      if(status==='NOT_REGULATED'){h+='<td>'+TRANSPORT_NR_TXT+'</td>';return;}
      var v=r[2](a);
      h+='<td>'+(v?esc(v):'<span class="muted">—</span>')+'</td>';
    });
    h+='</tr>';
  });
  h+='</tbody></table>';
  /* 适用运输方式是业务信息（勾了哪些方式、其余为何标 Not applicable），两个视图都显示 */
  var modeNames=TRANSPORT_MODES.filter(function(x){return modes.indexOf(x[0])>=0;})
    .map(function(x){return x[1];});
  h+='<div class="muted" style="font-size:11.5px;margin-top:6px">'
    +(modeNames.length
      ?'适用运输方式：'+esc(modeNames.join('、'))+'；未勾选的方式不适用（Not applicable）。'
      :'适用运输方式：未逐一指定，按全部运输方式出具结论。')
    +'</div>';
  /* 内部留痕只在编制视图出现；交付预览是给客户 / 监管的正式文件，不带工作台痕迹 */
  if(wz.view!=='deliver'&&!formal){
    h+='<div class="muted" style="font-size:11.5px;margin-top:6px">人工确认：'+esc(a.assessedBy)+' · '+esc(a.assessedAt)+
      '；判断依据：'+esc(a.basis)+
      (status==='REGULATED'?'。本原型使用人工录入的统一运输结论；正式版需按各运输方式法规分别核对。':'')+'</div>';
  }
  h+='</div>';
  return h;
}
