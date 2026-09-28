/* ==================================================================
   [22z3] 原料详情 · 批次测试记录录入（新增检测结果）
   ------------------------------------------------------------------
   背景：2026-09-10 领导评审意见——「批次测试记录」用于存储批次的
   原料测试结果数据（一批次一次检测），需体现合格 / 不合格，
   不合格必须说明备注原因；详情页提供「新增检测结果」入口。

   设计约束（零侵入）：
   - 渲染改动在 22z1 的详情页内完成（表头 + 按钮 + 列）；
     本分片只提供：录入 modal、保存校验、持久化、重置钩子。
   - 持久化：沿用 23z1 的思路，独立 localStorage 键存「新增」的
     记录（按批次号去重合并），一键重置时同步清除（wzReset 挂钩）。
   ================================================================== */

var _MB_KEY='plm3_matbatch_v1';   /* localStorage 键（含 schema 语义） */

/* 新增记录或替换附件后，按批次号保存到本地缓存。 */
function _mbPersistAdd(rec){
  try{
    var a=JSON.parse(localStorage.getItem(_MB_KEY)||'[]');
    a=a.filter(function(b){return b.no!==rec.no;});
    a.push(rec);
    localStorage.setItem(_MB_KEY,JSON.stringify(a));
  }catch(e){}
}

/* 启动合并：恢复新增记录及附件文件名；旧记录的到货量保留 kg 口径。 */
(function(){
  try{
    var a=JSON.parse(localStorage.getItem(_MB_KEY)||'[]');
    a.forEach(function(b){
      if(!b.spec){b.spec='散装（kg）';b.qty=b.qty&&b.qty!=='—'?b.qty+' kg':'未填写';}
      var old=matBatch(b.no);
      if(old)Object.assign(old,b);else MAT_BATCH.push(b);
    });
  }catch(e){}
})();

/* 一键重置钩子：清空批次测试记录的用户新增数据（由 wzReset 调用） */
function _mbReset(){ try{ localStorage.removeItem(_MB_KEY); }catch(e){} }

/* 今天（本地时区，YYYY-MM-DD，不用 toISOString 防时区偏移） */
function _mbToday(){
  var d=demoNow();
  return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
}

/* 测试结果切换：不合格时备注必填提醒（label 标红） */
function matTestResultChg(v){
  var lb=$('mt_note_lb');
  if(lb)lb.innerHTML=(v==='不合格')
    ?'备注<span style="color:#b42318">（不合格必填，请说明原因与处置）</span>'
    :'备注';
}

/* 附件选择演示：保留文件名，文件内容由正式系统上传存储。 */
function matTestReportPick(input){
  if(input.files&&input.files[0])$('mt_report').value=input.files[0].name;
}
function matBatchReportHtml(b){
  return '<div style="overflow-wrap:anywhere;margin-bottom:6px">'+esc(b.report&&b.report!=='—'?b.report:'未上传附件')+'</div>'
    +'<label class="btn sm" style="cursor:pointer">附件上传<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"'
    +' style="display:none" onchange="matBatchReportPick(\''+esc(b.no)+'\',this)"></label>';
}
function matBatchReportPick(no,input){
  var b=matBatch(no),file=input.files&&input.files[0];
  if(!b||!file)return;
  b.report=file.name;
  _mbPersistAdd(b);
  matOpen(b.mat);
  toast('已选择附件：'+file.name+'（演示保存文件名）','ok');
}

/* 打开「新增检测结果」modal（一物一供：供应商取该物料唯一主供） */
function matTestAdd(code){
  var m=matByCode(code);
  if(!m){ toast('物料不存在','warn'); return; }
  var sups=matSupRows(code), mainS=matMainSup(code);
  var supOpts;
  if(sups.length){
    supOpts=sups.map(function(x){
      var s=supByCode(x.sup)||{};
      return '<option value="'+esc(x.sup)+'"'+((mainS&&x.sup===mainS.sup)?' selected':'')+'>'+esc(s.name||x.sup)+'（'+esc(x.sup)+'）</option>';
    }).join('');
  }else{
    supOpts='<option value="" selected>厂内自制</option>';
  }
  var body=
    '<div class="form-grid">'+
    '<div class="field span2"><label>物料</label><div class="ctrl" style="background:var(--bg2,#f5f7fa);font-weight:600">'+
      '<span class="mono">'+esc(m.code)+'</span> · '+esc(m.name)+'</div></div>'+
    '<div class="field req"><label>批次号</label><input class="ctrl" id="mt_no" placeholder="如 '+esc(m.code.replace('MAT-',''))+'-2609A"></div>'+
    '<div class="field"><label>供应商</label><select class="ctrl" id="mt_sup">'+supOpts+'</select></div>'+
    '<div class="field"><label>到货日期</label><input class="ctrl" type="date" id="mt_arrive" value="'+_mbToday()+'"></div>'+
    '<div class="field"><label>有效期至</label><input class="ctrl" type="date" id="mt_expiry"></div>'+
    '<div class="field req"><label>规格</label><input class="ctrl" id="mt_spec" placeholder="如 200 kg/桶"></div>'+
    '<div class="field req"><label>数量</label><input class="ctrl" id="mt_qty" placeholder="如 10 桶"></div>'+
    '<div class="field req"><label>测试日期</label><input class="ctrl" type="date" id="mt_testDate" value="'+_mbToday()+'"></div>'+
    '<div class="field req"><label>测试结果</label><select class="ctrl" id="mt_result" onchange="matTestResultChg(this.value)">'+
      '<option value="">请选择</option><option>合格</option><option>不合格</option></select></div>'+
    '<div class="field"><label>测试项目</label><input class="ctrl" id="mt_items" placeholder="如 固含量 / pH / 粘度"></div>'+
    '<div class="field span2"><label>检测报告附件</label><div style="display:flex;gap:8px;align-items:center">'+
      '<input class="ctrl" id="mt_report" readonly placeholder="选择附件后自动显示文件名" style="flex:1">'+
      '<label class="btn" style="cursor:pointer;white-space:nowrap">附件上传<input type="file" id="mt_reportFile" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" style="display:none" onchange="matTestReportPick(this)"></label></div>'+
      '<div class="muted" style="font-size:12px;margin-top:6px">原型仅保存附件文件名，用于演示上传操作。</div></div>'+
    '<div class="field span2"><label id="mt_note_lb">备注</label><textarea class="ctrl" id="mt_note" style="min-height:56px" placeholder="不合格时必须说明原因与处置方式"></textarea></div>'+
    '</div>';
  openModal({
    title:'新增检测结果 · '+m.name, width:640, body:body,
    footer:'<div class="left">带 * 为必填项</div>'+
           '<button class="btn" onclick="closeModal()">取消</button>'+
           '<button class="btn primary" onclick="matTestSave(\''+esc(code)+'\')">保存</button>'
  });
}

/* 保存：校验（批次号唯一 / 日期必填 / 结果必选 / 不合格备注必填）→ 入库 → 持久化 → 回显 */
function matTestSave(code){
  var g=function(id){ var el=$(id); return el?String(el.value).trim():''; };
  var no=g('mt_no'), arrive=g('mt_arrive'), expiry=g('mt_expiry'), spec=g('mt_spec'), qty=g('mt_qty'),
      testDate=g('mt_testDate'), result=g('mt_result'), items=g('mt_items'),
      note=g('mt_note'), report=g('mt_report'),
      supEl=$('mt_sup'), sup=supEl?String(supEl.value).trim():'';
  if(!no){ toast('请填写批次号','warn'); return; }
  if(matBatches(code).some(function(b){ return b.no===no; })){
    toast('批次号 '+no+' 在该物料下已存在（一批次一次检测）','warn'); return;
  }
  if(!testDate){ toast('请选择测试日期','warn'); return; }
  if(!result){ toast('请选择测试结果（合格 / 不合格）','warn'); return; }
  if(result==='不合格'&&!note){
    toast('测试结果为不合格时，备注为必填项，请说明原因与处置方式','warn'); return;
  }
  if(!spec||!qty){toast('请填写规格和数量（含单位）','warn');return;}
  var rec={ no:no, mat:code, sup:sup,
    arrive:arrive||'—', expiry:expiry||'—', spec:spec, qty:qty,
    status:result, report:report||'—',
    testDate:testDate, items:items||'—', note:note };
  MAT_BATCH.push(rec);
  _mbPersistAdd(rec);
  closeModal();
  showPage('bd:rawmat-detail',{code:code});
  toast('已新增批次测试结果：'+no+'（'+result+'）','ok');
}
