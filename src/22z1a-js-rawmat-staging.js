/* ==================================================================
   [22z1a] 原料信息 · 暂存区 Tab（2026-09-29，第三版模型）
   ------------------------------------------------------------------
   业务背景（2026-09-29 业务确认的真实流程）：

   ① 业务发起 OA《新增原材料库存》流程 → 领导审批 → 采购部去 NCC 建档
      → NCC 产生物料编码 → 编码回填到 OA 流程的「存货编码」字段。
   ② 流程归档后 PLM 做双源拼合：OA 出 CAS 号与 MSDS 附件，NCC 出编码、
      名称、分类、规格，两边以流程里的「存货编码」为连接键。
   ③ 信息齐全的直接建成原料档案，**不进暂存区**；只有缺了某项的才落到
      暂存区等人工补一手。

   四种待办状态（按缺口，非按来源）：
     · 待匹配编码 —— 采购还没在 NCC 建档，流程「存货编码」空着
     · 待补 CAS   —— CAS 缺失且物质形态未判定，补录时可填 CAS 或标为混合物
     · 待补 MSDS  —— 流程里没附 MSDS；可上传后建档，确认商家确实没有的
                     也可直接手动建档
     · 待建档     —— 信息已齐，等待转正式建档

   bd:rawmat 由「单页台账」改为两个 Tab：原料台账（renderDbPage 原样）
   + 暂存区（本分片）。只加展示与演示数据，不碰任何计算逻辑。
   ================================================================== */

var RAWMAT_TABS=[{key:'ledger',label:'原料台账'},{key:'staging',label:'暂存区'}];
var rmTab='ledger';

/* CAS 类型：CAS 号只颁给单一化学物质。
   · 单一物质 —— CAS 精确到分子结构（如三乙醇胺 102-71-6）
   · UVCB    —— 聚合物 / 同系物，CAS 代表一类物质而非单一分子（如 9006-65-9 硅油）
   · 混合物  —— 多组分复配，没有自身 CAS，身份靠 MSDS 第 3 节的组分清单描述
   · 未判定  —— 流程里没给 CAS 也没说明形态，等人工补录时判定 */
var CAS_TYPE_NOTE={'单一物质':'单一化学物质，CAS 精确到分子结构',
                   'UVCB':'聚合物或同系物，CAS 代表一类物质而非单一分子',
                   '混合物':'多组分复配，没有自身 CAS，组分见 MSDS 第 3 节',
                   '未判定':'流程未提供 CAS，也未说明物质形态，待人工判定'};
var CAS_TYPE_TAG={'单一物质':'green','UVCB':'blue','混合物':'grey','未判定':'purple'};
var STG_STATUS_TAG={'待匹配编码':'blue','待补 CAS':'purple','待补 MSDS':'orange','待建档':'grey','已关联':'green'};
var STG_STATUS=['待匹配编码','待补 CAS','待补 MSDS','待建档','已关联'];

/* 暂存区演示数据：5 条覆盖全部 5 种状态与 4 种 CAS 类型 */
var MAT_STAGING=[
  {id:'TMP-2026-001',name:'水性消泡剂 DF-90',cas:'9006-65-9',casType:'UVCB',
   msds:'MSDS_DF-90_有机硅消泡剂.pdf',code:'MAT-00912',
   src:'OA-MAT-2026-0812',at:'2026-09-12 10:24',status:'待建档',mat:''},
  {id:'TMP-2026-002',name:'非离子乳化剂 AEO-9',cas:'68439-46-3',casType:'UVCB',
   msds:'MSDS_AEO-9_脂肪醇聚氧乙烯醚.pdf',code:'',
   src:'OA-MAT-2026-0825',at:'2026-09-18 15:07',status:'待匹配编码',mat:''},
  {id:'TMP-2026-003',name:'三乙醇胺 TEA-99',cas:'102-71-6',casType:'单一物质',
   msds:'',code:'MAT-00915',
   src:'OA-MAT-2026-0901',at:'2026-09-20 09:12',status:'待补 MSDS',mat:''},
  {id:'TMP-2026-004',name:'水性增稠剂 TT-935',cas:'',casType:'未判定',
   msds:'MSDS_TT-935_碱溶胀增稠剂.pdf',code:'MAT-00918',
   src:'OA-MAT-2026-0908',at:'2026-09-24 16:40',status:'待补 CAS',mat:''},
  {id:'TMP-2026-005',name:'手感剂 HF-5',cas:'',casType:'混合物',
   msds:'MSDS_HF-5_有机硅手感剂.pdf',code:'MAT-00631',
   src:'OA-MAT-2026-0728',at:'2026-08-03 11:35',status:'已关联',mat:'MAT-00631'}
];
/* 演示用：待匹配编码的记录，「同步编码」时能取到的存货编码 */
var STG_PENDING_CODE={'TMP-2026-002':'MAT-00933'};

/* 页面说明（收起在右上角「说明」按钮里） */
var STG_NOTE_TXT='<p><b>暂存区只承接信息不完整的原料。</b>OA 流程归档时若 CAS 号、存货编码、MSDS 附件齐全，会直接建成原料档案，不经过这里；只有缺了某项才落到暂存区，等人工补一手。</p>'
  +'<p><b>物料信息来自双源拼合</b>　OA 流程提供 CAS 号与 MSDS 附件；NCC 物料档案提供编码、名称、分类与规格。两边以流程里的<b>存货编码</b>为连接键——采购部在 NCC 建档后把编码回填到流程，PLM 用这个编码去 NCC 取数。</p>'
  +'<p><b>四种待办状态</b>　<b>待匹配编码</b> = 采购部还没在 NCC 建档，流程「存货编码」空着；<b>待补 CAS</b> = CAS 缺失且物质形态未判定，补录时可以填 CAS，也可以直接标记为混合物；<b>待补 MSDS</b> = 流程里没附 MSDS，可上传后再建档，确认商家确实没有 MSDS 的也可以直接手动建档；<b>待建档</b> = 信息已齐，等待转正式建档。</p>'
  +'<p><b>CAS 类型</b>　<b>单一物质</b>：CAS 精确到分子结构；<b>UVCB</b>：聚合物或同系物，CAS 代表一类物质而非单一分子；<b>混合物</b>：多组分复配，没有自身 CAS，组分见 MSDS 第 3 节。</p>';

function stgById(id){ return MAT_STAGING.filter(function(r){return r.id===id;})[0]||null; }
function stgCountBy(st){ return MAT_STAGING.filter(function(r){return r.status===st;}).length; }
/* 按字段齐备情况推算下一条状态 */
function stgNextStatus(r){
  if(!r.code)return '待匹配编码';
  if(r.casType!=='混合物'&&!r.cas)return '待补 CAS';
  if(!r.msds)return '待补 MSDS';
  return '待建档';
}

/* ---------- 页面入口：bd:rawmat ---------- */
function renderRawmatPage(){
  var host=$('pageHost'); if(!host)return;
  if(rmTab==='ledger'){
    /* 台账 Tab：完全复用 renderDbPage，只在标题下方补插 Tab 条 */
    renderDbPage('material','原料信息',
      '企业采购与自产原料的身份档案，含物质形态、规格型号与配方组成，是 SDS 编制与法规匹配的基础。');
    var anchor=$('dbKpi');
    if(anchor&&!$('rmTabs')){
      var d=document.createElement('div'); d.id='rmTabs';
      anchor.parentNode.insertBefore(d,anchor);
    }
    stgMountTabs();
    return;
  }
  renderStagingTab();
}
function stgMountTabs(){
  var box=$('rmTabs'); if(!box)return;
  box.innerHTML='';
  box.appendChild(tabs(RAWMAT_TABS,rmTab,function(k){ rmTab=k; renderRawmatPage(); }));
}

/* ---------- 暂存区 Tab ---------- */
function renderStagingTab(){
  var host=$('pageHost'); if(!host)return;
  var rows=MAT_STAGING;
  host.innerHTML='<div class="sds-scope">'
    +sdsHead('rmStgTitle','原料信息',STG_NOTE_TXT,'','','rmstg')
    +'<div id="rmTabs"></div>'
    +'<div class="kpi-row" id="rmStgKpi"></div>'
    +'<div class="card"><div class="toolbar">'
      +'<span style="font-size:12.5px;color:var(--muted)">共 <b>'+rows.length+'</b> 条暂存记录'
      +STG_STATUS.map(function(s){return ' · '+s+' '+stgCountBy(s);}).join('')+'</span>'
      +'<div class="grow"></div></div>'
      +'<div class="tbl-wrap"><table class="tbl" id="stgTable"></table></div></div>'
    +'</div>';
  stgMountTabs();
  stgRenderKpi();
  stgRenderTable();
}
function stgRenderKpi(){
  var box=$('rmStgKpi'); if(!box)return;
  var items=[['待匹配编码',stgCountBy('待匹配编码'),'var(--brand)'],
             ['待补 CAS',stgCountBy('待补 CAS'),'var(--purple)'],
             ['待补 MSDS',stgCountBy('待补 MSDS'),'var(--orange)'],
             ['待建档',stgCountBy('待建档'),'var(--ink2)']];
  box.innerHTML=items.map(function(it){
    return '<div class="kpi"><div class="k">'+it[0]+'</div><div class="v" style="color:'+it[2]+'">'+it[1]+'</div></div>';
  }).join('');
}
/* CAS 单元格：混合物没有自身 CAS，未判定的待人工补录 */
function stgCasCell(r){
  var t=r.casType||'未判定';
  var tip=esc(CAS_TYPE_NOTE[t]||'');
  if(t==='混合物'){
    return '<span class="muted">—（多组分，见 MSDS）</span>'
      +'<br><span class="tag '+CAS_TYPE_TAG[t]+'" style="margin-top:3px" title="'+tip+'">混合物</span>';
  }
  if(!r.cas){
    return '<span class="muted">—（待补录）</span>'
      +'<br><span class="tag '+CAS_TYPE_TAG[t]+'" style="margin-top:3px" title="'+tip+'">'+esc(t)+'</span>';
  }
  return '<span class="mono">'+esc(r.cas)+'</span>'
    +'<br><span class="tag '+CAS_TYPE_TAG[t]+'" style="margin-top:3px" title="'+tip+'">'+esc(t)+'</span>';
}
function stgRenderTable(){
  var t=$('stgTable'); if(!t)return;
  var head=['暂存编号','物料名称','CAS','MSDS 附件','存货编码','来源','进入时间','状态','操作'];
  var h='<thead><tr>'+head.map(function(x,i){
    return '<th'+([0,1,4,5].indexOf(i)>=0?'':' class="c"')+'>'+x+'</th>';
  }).join('')+'</tr></thead><tbody>';
  h+=MAT_STAGING.map(function(r){
    return '<tr>'
      +'<td class="mono">'+esc(r.id)+'</td>'
      +'<td><b>'+esc(r.name)+'</b>'+(r.mat?'<br><small class="muted">已关联 '+mono(r.mat)+'</small>':'')+'</td>'
      +'<td class="c">'+stgCasCell(r)+'</td>'
      +'<td>'+(r.msds?'<span class="mono">'+esc(r.msds)+'</span>':'<span class="muted">—</span>')+'</td>'
      +'<td class="mono">'+(r.code?esc(r.code):'<span class="muted">— 待回填</span>')+'</td>'
      +'<td class="mono">'+esc(r.src)+'</td>'
      +'<td>'+esc(r.at)+'</td>'
      +'<td class="c"><span class="tag '+STG_STATUS_TAG[r.status]+' dot-tag">'+esc(r.status)+'</span></td>'
      +'<td class="acts">'+stgActs(r)+'</td>'
      +'</tr>';
  }).join('');
  h+='</tbody>';
  t.innerHTML=h;
}
function stgActs(r){
  if(r.status==='已关联'){
    return '<button class="btn btn-link" onclick="matOpen(\''+esc(r.mat)+'\')">查看原料</button>'
      +'<button class="btn btn-link" onclick="stgUnlink(\''+esc(r.id)+'\')">解除关联</button>';
  }
  var a='';
  if(r.status==='待匹配编码'){
    return '<button class="btn btn-link" onclick="stgSyncCode(\''+esc(r.id)+'\')">同步编码</button>'
      +'<span class="muted" style="font-size:12px">编码到位后可建档</span>';
  }
  if(r.status==='待补 CAS')a+='<button class="btn btn-link" onclick="stgFillCas(\''+esc(r.id)+'\')">补录 CAS</button>';
  if(r.status==='待补 MSDS')a+='<button class="btn btn-link" onclick="stgUploadMsds(\''+esc(r.id)+'\')">上传 MSDS</button>';
  a+='<button class="btn btn-link" onclick="stgLinkMat(\''+esc(r.id)+'\')">关联物料</button>';
  a+='<button class="btn btn-link" onclick="stgToFormal(\''+esc(r.id)+'\')">转正式建档</button>';
  return a;
}
function stgUnlink(id){
  var r=stgById(id); if(!r)return;
  r.mat=''; r.status=stgNextStatus(r);
  toast('已解除关联，回到'+r.status,'info'); renderStagingTab();
}

/* 同步存货编码：从 OA 流程再取一次「存货编码」字段 */
function stgSyncCode(id){
  var r=stgById(id); if(!r)return;
  var c=STG_PENDING_CODE[id]||'';
  if(!c){ toast('流程「存货编码」尚未回填，请等采购部在 NCC 建档','warn'); return; }
  r.code=c; r.status=stgNextStatus(r);
  toast('已从 OA 流程取到存货编码 '+c+'，并用它从 NCC 取回物料信息','ok');
  renderStagingTab();
}

/* 补录 CAS：可填精确 CAS，也可直接判定为混合物（无自身 CAS） */
function stgFillCas(id){
  var r=stgById(id); if(!r)return;
  var opts=['单一物质','UVCB','混合物'].map(function(t){
    return '<option value="'+t+'"'+(r.casType===t?' selected':'')+'>'+t
      +(t==='混合物'?'（无自身 CAS）':'')+'</option>';
  }).join('');
  openModal({title:'补录 CAS · '+r.id,width:580,
    body:'<div class="form-grid">'
      +'<div class="field span2"><label>物料</label><input class="ctrl" value="'+esc(r.name)+' · '+esc(r.code||'—')+'" disabled></div>'
      +'<div class="field span2"><label>物质类型<span style="color:#b42318">*</span></label>'
      +'<select class="ctrl" id="stg_ct" onchange="stgCasTypeSwitch()">'+opts+'</select></div>'
      +'<div class="field span2" id="stg_cas_wrap"><label>CAS 号<span style="color:#b42318">*</span></label>'
      +'<input class="ctrl" id="stg_cas" placeholder="如 102-71-6"></div>'
      +'<div class="field span2"><small class="muted" id="stg_cas_tip">'+esc(CAS_TYPE_NOTE[r.casType]||'')+'</small></div>'
      +'</div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button>'
      +'<button class="btn primary" onclick="stgFillCasSave(\''+esc(r.id)+'\')">保存</button>'});
}
function stgCasTypeSwitch(){
  var t=$('stg_ct').value,w=$('stg_cas_wrap'),tip=$('stg_cas_tip');
  if(w)w.style.display=(t==='混合物')?'none':'';
  if(tip)tip.textContent=CAS_TYPE_NOTE[t]||'';
}
function stgFillCasSave(id){
  var r=stgById(id); if(!r)return;
  var t=$('stg_ct').value;
  var c=t==='混合物'?'':(($('stg_cas')||{}).value||'').trim();
  if(t!=='混合物'&&!c){ toast('请填写 CAS 号，或把类型改为混合物','warn'); return; }
  r.casType=t; r.cas=c; r.status=stgNextStatus(r);
  closeModal();
  toast(t==='混合物'?'已判定为混合物，无自身 CAS':'已补录 CAS '+c+'（'+t+'）','ok');
  renderStagingTab();
}

/* 上传 MSDS：暂时没有的可以补传，确认商家没有的也可直接手动建档 */
function stgUploadMsds(id){
  var r=stgById(id); if(!r)return;
  openModal({title:'上传 MSDS · '+r.id,width:580,
    body:'<div class="form-grid">'
      +'<div class="field span2"><label>物料</label><input class="ctrl" value="'+esc(r.name)+' · '+esc(r.code||'—')+'" disabled></div>'
      +'<div class="field span2"><label>MSDS 附件</label>'
      +'<input class="ctrl" id="stg_msds" placeholder="选择商家提供的 MSDS 文件…"></div>'
      +'<div class="field span2"><small class="muted">确认商家确实没有 MSDS 的，不必上传，直接在暂存区点「转正式建档」即可，建档后原料档案会标注 MSDS 缺失。</small></div>'
      +'</div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button>'
      +'<button class="btn primary" onclick="stgUploadMsdsSave(\''+esc(r.id)+'\')">确认上传</button>'});
}
function stgUploadMsdsSave(id){
  var r=stgById(id); if(!r)return;
  var v=(($('stg_msds')||{}).value||'').trim();
  if(!v){ toast('请选择 MSDS 文件','warn'); return; }
  r.msds=v; r.status=stgNextStatus(r);
  closeModal(); toast('MSDS 已上传，可转正式建档','ok'); renderStagingTab();
}

/* 关联物料：弹窗选现有原料编码，选完该行状态变「已关联」 */
function stgLinkMat(id){
  var r=stgById(id); if(!r)return;
  var mats=(typeof matRows==='function')?matRows():[];
  var opts=mats.map(function(m){
    return '<option value="'+esc(m.code)+'"'+(r.mat===m.code?' selected':'')+'>'
      +esc(m.name)+'（'+esc(m.code)+'）</option>';
  }).join('');
  openModal({title:'关联物料 · '+r.id,width:560,
    body:'<div class="form-grid">'
      +'<div class="field span2"><label>暂存物料</label><input class="ctrl" value="'+esc(r.name)+' · '
      +(r.casType==='混合物'?'混合物（无自身 CAS）':(r.cas?'CAS '+esc(r.cas):'CAS 待补录'))+'" disabled></div>'
      +'<div class="field span2"><label>关联到现有原料<span style="color:#b42318">*</span></label>'
      +'<select class="ctrl" id="stg_mat">'+opts+'</select>'
      +'<small class="muted">PLM 里已有该原料档案时选这个，避免重复建档</small></div>'
      +'</div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button>'
      +'<button class="btn primary" onclick="stgLinkSave(\''+esc(r.id)+'\')">确认关联</button>'});
}
function stgLinkSave(id){
  var r=stgById(id); if(!r)return;
  var sel=$('stg_mat'); if(!sel||!sel.value){toast('请选择要关联的原料','warn');return;}
  r.mat=sel.value; r.status='已关联';
  closeModal();
  toast(r.id+' 已关联至 '+r.mat,'ok');
  renderStagingTab();
}

/* 转正式建档：跳原料新增表单，带存货编码 / 名称 / 形态 / CAS / MSDS。
   形态按 CAS 类型分支：混合物不带 100% 单组分，配方留空待按 MSDS 补录 */
function stgToFormal(id){
  var r=stgById(id); if(!r)return;
  if(!r.code){ toast('该记录还没有存货编码，请先同步 OA 流程的存货编码','warn'); return; }
  var mix=(r.casType==='混合物');
  rmTab='ledger';
  renderRawmatPage();
  if(typeof dbEdit!=='function')return;
  dbEdit(null);
  if($('fx_code'))$('fx_code').value=r.code;
  if($('fx_name'))$('fx_name').value=r.name;
  if($('fx_type'))$('fx_type').value='原料';
  if($('fx_status'))$('fx_status').value='正常';
  _edForm=mix?'混合物（混合料）':'纯物质（单物料）';
  if($('fx_form'))$('fx_form').value=_edForm;
  _edRecipe=mix?[]:[{cas:r.cas,name:r.name,conc:'100.00',secret:false}];
  if(typeof matRecipeRender==='function')matRecipeRender();
  if($('fx_remark')){
    var mk=r.msds?('MSDS 附件：'+r.msds):'MSDS 附件：缺失（商家未提供，建档后请补传）';
    $('fx_remark').value=mk+'（由暂存区 '+r.id+' 转入，OA 流程 '+r.src+'）'
      +(mix?'；混合物无自身 CAS，请按 MSDS 第 3 节补录组分':'');
  }
  toast(mix?'已带入存货编码与名称；形态为混合物，配方留空，请按 MSDS 补录组分'
           :'已带入存货编码 / 名称 / CAS / MSDS，确认后保存','info');
}
