/* ==================================================================
   [27z5b] 供应商维护 · 双源口径表单与联系人（2026-09-29）
   ------------------------------------------------------------------
   供应商双源口径（9-28 定）：
     · 档案层（编码 / 名称 / 英文名称 / 类型 / 所在地）—— NCC 快照同步，只读
     · 质量域（评级 / 状态 / 资质证照 / 主供产品）—— PLM 维护，可编辑

   本分片只补展示与演示数据：字段回填、新增/编辑表单、联系人子表、
   「上次采购日期」计算。不注册任何 regPage，不碰合规与判定逻辑。
   ================================================================== */

/* ---------- 1. 档案层字段回填（零侵入补进 SUPPLIERS） ---------- */
var SUP_PROFILE={
  'SUP-2026-001':{en:'Wanhua Chemical Group Co., Ltd.',src:'NCC 同步'},
  'SUP-2026-002':{en:'BASF (China) Co., Ltd.',src:'NCC 同步'},
  'SUP-2026-003':{en:'Zhejiang Runtu Co., Ltd.',src:'NCC 同步'},
  'SUP-2026-004':{en:'Jiangsu Sanmu Group Co., Ltd.',src:'NCC 同步'},
  'SUP-2026-005':{en:'Shandong Langhui Petrochemical Co., Ltd.',src:'NCC 同步'},
  'SUP-2026-006':{en:'Guangzhou Tinci Advanced Materials Co., Ltd.',src:'NCC 同步'},
  'SUP-2026-007':{en:'Shanghai Kaiyin Chemical Co., Ltd.',src:'NCC 同步'},
  'SUP-2026-008':{en:'Changzhou Shanfeng Chemical Co., Ltd.',src:'NCC 同步'},
  'SUP-2026-009':{en:'Anhui Jinhe Industrial Co., Ltd.',src:'NCC 同步'},
  'SUP-2026-010':{en:'Dow Chemical (Zhangjiagang) Co., Ltd.',src:'NCC 同步'},
  'SUP-2025-004':{en:'Hebei Chengxin Group Co., Ltd.',src:'NCC 同步'},
  'SUP-2025-001':{en:'Zhangjiagang Free Trade Zone Huachang Chemical Co., Ltd.',src:'NCC 同步'}
};
(function(){
  (typeof SUPPLIERS!=='undefined'?SUPPLIERS:[]).forEach(function(s){
    var p=SUP_PROFILE[s.code]||{};
    s.en=s.en||p.en||'';
    s._src=s._src||p.src||'NCC 同步';
  });
})();
var SUP_SRC_TAG={'NCC 同步':'tag-blue','手工建档':'tag-orange'};

/* ---------- 2. 联系人演示数据（每家 1-2 个） ---------- */
var SUP_CONTACTS=[
  {sup:'SUP-2026-001',name:'张工',tel:'0535-6388666',def:true},
  {sup:'SUP-2026-001',name:'李工',tel:'0535-6388677',def:false},
  {sup:'SUP-2026-002',name:'王工',tel:'021-38668800',def:true},
  {sup:'SUP-2026-003',name:'陈工',tel:'0575-82046666',def:true},
  {sup:'SUP-2026-003',name:'周工',tel:'0575-82046688',def:false},
  {sup:'SUP-2026-004',name:'吴工',tel:'0510-87558888',def:true},
  {sup:'SUP-2026-005',name:'孙工',tel:'0533-7580666',def:true},
  {sup:'SUP-2026-006',name:'郑工',tel:'020-32221888',def:true},
  {sup:'SUP-2026-006',name:'何工',tel:'020-32221899',def:false},
  {sup:'SUP-2026-007',name:'冯工',tel:'021-62198800',def:true},
  {sup:'SUP-2026-008',name:'许工',tel:'0519-83216666',def:true},
  {sup:'SUP-2026-009',name:'钱工',tel:'0550-5628666',def:true},
  {sup:'SUP-2026-009',name:'蒋工',tel:'0550-5628677',def:false},
  {sup:'SUP-2026-010',name:'沈工',tel:'0512-58326666',def:true},
  {sup:'SUP-2025-004',name:'韩工',tel:'0311-85326666',def:true},
  {sup:'SUP-2025-001',name:'杨工',tel:'0512-58398800',def:true}
];
function mdSupContacts(code){
  return SUP_CONTACTS.filter(function(c){return c.sup===code;})
    .sort(function(a,b){return (b.def?1:0)-(a.def?1:0);});
}

/* ---------- 3. 上次采购日期：取该供应商最近到货批次 ---------- */
function supLastBuy(code){
  var ds=(typeof MAT_BATCH!=='undefined'?MAT_BATCH:[])
    .filter(function(b){return b.sup===code&&b.arrive;})
    .map(function(b){return b.arrive;}).sort();
  return ds.length?ds[ds.length-1]:'';
}

/* ---------- 4. 新增 / 编辑表单 ---------- */
var _supQuals=[];
function supForm(code){
  var s=code?(typeof supByCode==='function'?supByCode(code):null):null;
  var isNew=!s;
  var src=isNew?'手工建档':(s._src||'NCC 同步');
  /* NCC 同步的档案层只读；手工建档可填，但标注待 NCC 接管 */
  var ro=(!isNew&&src==='NCC 同步')?' disabled':'';
  var roCls=ro?' style="background:#f5f6f8;color:#5f6b7a"':'';
  var q=isNew?[]:(typeof mdSupQuals==='function'?mdSupQuals(code):[]);
  _supQuals=q.map(function(x){return {name:x[0],issue:x[1],valid:x[2]};});
  var archives=[
    ['供应商编码','sf_code',isNew?'':esc(s.code),isNew?'placeholder="SUP-2026-0xx"':'',true],
    ['供应商名称','sf_name',isNew?'':esc(s.name),'',true],
    ['英文名称','sf_en',isNew?'':esc(s.en||''),'placeholder="可空，NCC 同步后回填"',false],
    ['类型','sf_type',isNew?'':esc(s.type),'',true],
    ['所在地','sf_region',isNew?'':esc(s.region),'',true]
  ];
  var archHtml=archives.map(function(a){
    var ctrl;
    if(a[1]==='sf_type'){
      ctrl='<select class="ctrl" id="sf_type"'+ro+roCls+'>'
        +['生产商','经销商'].map(function(t){
            return '<option'+((!isNew&&s.type===t)?' selected':'')+'>'+t+'</option>';}).join('')
        +'</select>';
    } else {
      ctrl='<input class="ctrl" id="'+a[1]+'" value="'+a[2]+'"'+a[3]+ro+roCls+'>';
    }
    return '<div class="field"><label'+(a[5]?' class="req"':'')+'>'+a[0]+'</label>'+ctrl+'</div>';
  }).join('');

  openModal({
    title:(isNew?'新增':'编辑')+'供应商',width:680,
    body:'<div id="sfSrcTip"></div>'
      +'<div class="sup-arch"><div class="sup-arch-hd">档案层'
        +'<span class="tag '+(src==='NCC 同步'?'blue':'orange')+'">'+esc(src)
        +(src==='NCC 同步'?' · 只读':'（待 NCC 同步接管）')+'</span></div>'
        +'<div class="form-grid">'+archHtml+'</div>'
        +'<div class="sup-arch-note">档案层由 NCC 快照同步维护，PLM 不直接改写；'
        +'手工建档的条目在 NCC 产生编码后由快照接管。</div></div>'
      +'<div class="form-grid" style="margin-top:14px">'
        +'<div class="field"><label class="req">评级</label><select class="ctrl" id="sf_grade">'
          +['A','B','C'].map(function(g){return '<option'+((!isNew&&s.grade===g)?' selected':'')+'>'+g+'</option>';}).join('')
          +'</select></div>'
        +'<div class="field"><label class="req">状态</label><select class="ctrl" id="sf_status">'
          +['合格','观察','停用'].map(function(v){return '<option'+((!isNew&&s.status===v)?' selected':'')+'>'+v+'</option>';}).join('')
          +'</select></div>'
        +'<div class="field span2"><label class="req">主供产品</label>'
          +'<input class="ctrl" id="sf_cat" value="'+esc(isNew?'':(s.cat||''))+'" placeholder="如：聚氨酯树脂·预聚体"></div>'
      +'</div>'
      +'<div class="sup-qual"><div class="sup-arch-hd">资质证照'
        +'<span class="muted" style="font-weight:400;margin-left:auto">非必填 · 可多条</span></div>'
        +'<div id="sfQualBox"></div>'
        +'<button class="btn sm" style="margin-top:8px" onclick="supQualAdd()">＋ 添加证照</button></div>',
    footer:'<div class="left">带 * 为必填项</div>'
      +'<button class="btn" onclick="closeModal()">取消</button>'
      +'<button class="btn primary" onclick="supSave('+(isNew?'null':"'"+esc(code)+"'")+')">保存</button>',
    onOpen:function(){ supQualRender(); }
  });
  var tip=$('sfSrcTip');
  if(tip)tip.innerHTML=(isNew
    ? '<div class="notice warn" style="margin-bottom:12px"><div class="ni">!</div><div><b>手工建档（待 NCC 同步接管）</b>'
      +'编码与名称先由 PLM 录入，NCC 建档产生正式编码后由快照接管档案层。</div></div>'
    : '');
}
function supQualAdd(){ _supQuals.push({name:'',issue:'',valid:''}); supQualRender(); }
function supQualDel(i){ _supQuals.splice(i,1); supQualRender(); }
function supQualRender(){
  var box=$('sfQualBox'); if(!box)return;
  if(!_supQuals.length){
    box.innerHTML='<div class="muted" style="font-size:12.5px">暂无资质证照记录</div>';
    return;
  }
  box.innerHTML='<table class="tbl mini"><thead><tr><th>证书名称</th><th style="width:150px">发证日期</th>'
    +'<th style="width:150px">有效期至</th><th style="width:70px"></th></tr></thead><tbody>'
    +_supQuals.map(function(q,i){
      return '<tr>'
        +'<td><input class="ctrl" id="sq_n_'+i+'" value="'+esc(q.name)+'" placeholder="如：ISO 9001 质量管理体系认证"></td>'
        +'<td><input class="ctrl" type="date" id="sq_i_'+i+'" value="'+esc(q.issue)+'"></td>'
        +'<td><input class="ctrl" type="date" id="sq_v_'+i+'" value="'+esc(q.valid)+'"></td>'
        +'<td class="acts"><button class="btn-link del" onclick="supQualDel('+i+')">删除</button></td>'
        +'</tr>';
    }).join('')+'</tbody></table>';
}
function supQualRead(){
  for(var i=0;i<_supQuals.length;i++){
    var n=$('sq_n_'+i),a=$('sq_i_'+i),b=$('sq_v_'+i);
    if(n)_supQuals[i].name=n.value;
    if(a)_supQuals[i].issue=a.value;
    if(b)_supQuals[i].valid=b.value;
  }
  return _supQuals;
}
function supSave(code){
  var get=function(id){var e=$(id);return e?e.value.trim():'';};
  if(!get('sf_name')){toast('供应商名称必填','warn');return;}
  if(!get('sf_code')){toast('供应商编码必填','warn');return;}
  var quals=supQualRead().filter(function(q){return q.name;});
  var patch={name:get('sf_name'),en:get('sf_en'),type:get('sf_type'),region:get('sf_region'),
    cat:get('sf_cat'),grade:get('sf_grade'),status:get('sf_status')};
  if(code){
    var s=(typeof supByCode==='function')?supByCode(code):null;
    if(!s){toast('未找到该供应商','warn');return;}
    Object.keys(patch).forEach(function(k){s[k]=patch[k];});
    if(typeof supSetQuals==='function')supSetQuals(code,quals);
    toast('已保存供应商 '+code,'ok');
  } else {
    var n=typeof SUPPLIERS!=='undefined'?SUPPLIERS:[];
    var row=Object.assign({code:get('sf_code'),_src:'手工建档',since:''},patch);
    n.unshift(row);
    if(typeof supSetQuals==='function')supSetQuals(row.code,quals);
    toast('已新增供应商 '+row.code+'（手工建档）','ok');
  }
  closeModal();
  var cur=(typeof curPage!=='undefined')?curPage:'';
  if(cur==='bd:supplier-detail'&&code){ showPage('bd:supplier-detail',{key:code}); }
  else if(cur==='bd:supplier'||cur==='bd:supplier-detail'){ showPage('bd:supplier'); }
}
/* 资质证照写回：状态按演示日期锚点推算，不写死 */
function supQualState(valid){
  if(!valid)return '有效';
  var today=(typeof demoYmd==='function')?demoYmd():'';
  if(!today)return '有效';
  if(valid<today)return '已过期';
  var d=Date.parse(valid)-Date.parse(today);
  if(d<=90*86400000)return '待更新';
  return '有效';
}
function supSetQuals(code,quals){
  if(typeof MD_SUP_QUAL==='undefined')return;
  MD_SUP_QUAL[code]=quals.map(function(q){
    return [q.name,q.issue,q.valid,supQualState(q.valid)];
  });
}
