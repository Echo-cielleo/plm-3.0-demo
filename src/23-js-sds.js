/* ==================================================================
   [23] SDS 模块 · 公共数据与 6 步向导
   ================================================================== */
var CAS_LIB={
  '7732-18-5':{cn:'水',en:'Water',formula:'H₂O'},
  '64-17-5':{cn:'乙醇',en:'Ethanol',formula:'C₂H₆O'},
  '108-88-3':{cn:'甲苯',en:'Toluene',formula:'C₇H₈'},
  '67-64-1':{cn:'丙酮',en:'Acetone',formula:'C₃H₆O'},
  '75-09-2':{cn:'二氯甲烷',en:'Dichloromethane',formula:'CH₂Cl₂'},
  '1310-73-2':{cn:'氢氧化钠',en:'Sodium hydroxide',formula:'NaOH'},
  '7664-93-9':{cn:'硫酸',en:'Sulfuric acid',formula:'H₂SO₄'},
  '7647-01-0':{cn:'盐酸',en:'Hydrochloric acid',formula:'HCl'},
  '7722-84-1':{cn:'过氧化氢',en:'Hydrogen peroxide',formula:'H₂O₂'},
  '50-00-0':{cn:'甲醛',en:'Formaldehyde',formula:'CH₂O'},
  '108-95-2':{cn:'苯酚',en:'Phenol',formula:'C₆H₆O'},
  '79-01-6':{cn:'三氯乙烯',en:'Trichloroethylene',formula:'C₂HCl₃'},
  '79-10-7':{cn:'丙烯酸',en:'Acrylic acid',formula:'C₃H₄O₂'},
  '111-76-2':{cn:'乙二醇单丁醚',en:'2-Butoxyethanol',formula:'C₆H₁₄O₂'},
  '107-21-1':{cn:'乙二醇',en:'Ethylene glycol',formula:'C₂H₆O₂'},
  '112-34-5':{cn:'二乙二醇单丁醚',en:'Diethylene glycol monobutyl ether',formula:'C₈H₁₈O₃'},
  '1330-20-7':{cn:'二甲苯',en:'Xylene',formula:'C₈H₁₀'},
  '141-78-6':{cn:'乙酸乙酯',en:'Ethyl acetate',formula:'C₄H₈O₂'},
  '10043-01-3':{cn:'硫酸铝',en:'Aluminium sulfate',formula:'Al₂(SO₄)₃'},
  '7789-09-5':{cn:'重铬酸铵',en:'Ammonium dichromate',formula:'(NH₄)₂Cr₂O₇'},
  '9009-54-5':{cn:'聚氨酯预聚体',en:'Polyurethane prepolymer',formula:'—'}
};

/* ==================================================================
   ==================  模块 1：SDS 生成分步向导  ===================
   ================================================================== */
var WZ_STEPS=[
  {t:'创建SDS项目',s:'产品与目标市场'},
  {t:'输入配方',s:'组分与浓度冻结'},
  {t:'汇集受控数据',s:'按优先级取数'},
  {t:'分类建议与证据',s:'GHS判定可追溯'},
  {t:'生成SDS草案',s:'16章节结构'},
  {t:'审核与发布',s:'人工批准导出'}
];

/* 向导全局状态 */

/* 向导全局状态 */
var wz={};
function wzInitState(){
  wz={
    step:1,
    formType:'mix',
    materialCode:'',
    project:{product:'',market:'',state:'',oflang:'',lang:'',date:'2026-10-01',
             /* B3：纳米形态与 UFI（仅欧盟，非必填） */
             nano:'0',nanoForm:'',ufi:'',
             /* G9：1.1 产品标识补充项（非必填，默认 See section 3） */
             idxNo:'',reachNo:'',
             /* G12：应急电话服务时段与非工作时间可用性 */
             emergHours:'',emerg24:'0',
             /* G1：补充危害说明 EUH（人工勾选；ED / PMT 结论自动带出） */
             euh:[],
             /* B2：行政联系信息（公司档案带出，可覆盖） */
             emerg:'',orName:'',orTel:'',pcn:'',_admMk:''},
    formula:[
      {cas:'7732-18-5',name:'水',conc:'45.00',secret:false,chk:true},
      {cas:'111-76-2',name:'乙二醇单丁醚',conc:'8.50',secret:false,chk:true},
      {cas:'64-17-5',name:'乙醇',conc:'5.00',secret:false,chk:true},
      {cas:'79-10-7',name:'丙烯酸',conc:'2.50',secret:true,chk:true},
      {cas:'50-00-0',name:'甲醛',conc:'0.35',secret:false,chk:true},
      {cas:'9009-54-5',name:'聚氨酯预聚体',conc:'38.65',secret:true,chk:true}
    ],
    frozen:false,
    frozenAt:'',
    collected:false,
    collect:{},        /* cas -> {items:[{k,v,src,miss}]} */
    classAdjust:{},    /* 分类人工调整记录 */
    classItems:null,
    classPack:null,    /* 生成分类结论时冻结的 CLP 规则包版本快照 */
    listContext:{objectType:'mixture',useClass:'',productCategory:'',materialType:''},
    evaluationSnapshot:null,
    evaluationDirty:true,
    evaluationInvalidReason:'',
    evaluationAt:'',
    draftEdits:{},     /* 章节临时编辑 */
    draftAt:'',
    view:'edit',       /* 步骤 5 视图：edit 编制态 / deliver 交付预览 */
    docVer:'V1.0',     /* 文档版本号（第 16.1 修订说明） */
    submitted:false,
    published:false,
    publishedAt:''
  };
}
wzInitState();

/* ---------- 步骤条 ---------- */
function wzRenderSteps(){
  var h='';
  WZ_STEPS.forEach(function(s,i){
    var n=i+1,cls=n<wz.step?'done':(n===wz.step?'active':'');
    var can=n<wz.step?' clickable':'';
    h+='<div class="step '+cls+can+'" '+(n<wz.step?'onclick="wzGo('+n+')"':'')+'>'
      +'<span class="num">'+(n<wz.step?'✓':n)+'</span>'
      +'<span class="txt"><b>'+n+'. '+s.t+'</b><small>'+s.s+'</small></span></div>';
    if(n<WZ_STEPS.length)h+='<div class="step-line '+(n<wz.step?'done':'')+'"></div>';
  });
  $('wzSteps').innerHTML=h;
}

/* ---------- 步骤切换 ---------- */
function wzGo(n){
  if(n<1||n>6)return;
  wz.step=n;
  if(n===1)renderStep1();
  if(n===2)renderStep2();
  if(n===3)renderStep3();
  if(n===4)renderStep4();
  if(n===5)renderStep5();
  if(n===6)renderStep6();
  wzRenderSteps();
  wzUpdateFoot();
  window.scrollTo(0,0);
}
function wzNext(){
  var c=wzCheck(wz.step);
  if(!c.ok){toast(c.msg,'warn');return;}
  if(wz.step===2&&!wz.collected){wzCollectData();}
  if(wz.step===4&&!wz.draftAt){wz.draftAt=nowStr();}
  if(wz.step<6)wzGo(wz.step+1);
}
function wzCancel(){
  sdsConfirm('取消 SDS 编制','确认取消当前 SDS 项目的编制？<br><span style="color:var(--muted)">已填写的配方、汇集数据与草案内容将全部丢弃。</span>',function(){
    resetWizard();toast('已取消编制，向导已重置','info');
  },'确认取消',true);
}
function resetWizard(){wzInitState();wzSyncForm1();wzGo(1);}

/* 每步的完成校验 */
function wzCheck(n){
  if(n===1){
    var p=wz.project;
    if(!p.product.trim())return{ok:false,msg:'请填写产品名称'};
    if(!p.market)return{ok:false,msg:'请选择目标市场'};
    if(p.market==='EU'&&(!p.state||!p.oflang))return{ok:false,msg:'欧盟市场需选择目标成员国与官方语言'};
    if(!p.lang)return{ok:false,msg:'请选择投放语言'};
    if(!p.date)return{ok:false,msg:'请选择计划投放日期'};
    /* B3：UFI 非必填，但填了必须合规 */
    var ue=ufiErr(p.ufi);
    if(ue)return{ok:false,msg:ue};
    if(p.nano==='1'&&!p.nanoForm)return{ok:false,msg:'已声明含纳米形态，请选择具体纳米形态'};
    return{ok:true};
  }
  if(n===2){
    if(wz.formula.length===0)return{ok:false,msg:'请至少添加一条配方组分'};
    /* B1：实验配方带入的组分需逐行核对（研发投料比 ≠ 实际销售成分） */
    var pend=wz.formula.filter(function(r){return r.chk===false;}).length;
    if(pend)return{ok:false,msg:'仍有 '+pend+' 个组分待核对，请确认与实际销售成分一致'};
    if(!wz.frozen)return{ok:false,msg:'配方尚未冻结，请先点击「冻结配方」'};
    return{ok:true};
  }
  if(n===3){
    var miss=wzMissCount();
    if(miss>0)return{ok:false,msg:'仍有 '+miss+' 项受控数据待补充，请先完成补充'};
    return{ok:true};
  }
  if(n===4){
    var pend=(wz.classItems||[]).filter(function(c){return c.status==='pending';});
    var judge=pend.filter(function(c){return c.need!=='confirm';}).length;
    var conf=pend.filter(function(c){return c.need==='confirm';}).length;
    if(judge>0)return{ok:false,msg:'仍有 '+judge+' 项缺算式/缺输入的结论待人工判断'+(conf?'（另有 '+conf+' 项系统建议待确认）':'')+'，请先处理'};
    if(conf>0)return{ok:false,msg:'仍有 '+conf+' 项系统建议待人工确认，可点「采纳全部系统建议」或逐条确认'};
    return{ok:true};
  }
  return{ok:true};
}

/* 底部操作栏状态 */
function wzUpdateFoot(){
  var c=wzCheck(wz.step);
  var next=$('wzNext'),prev=$('wzPrev');
  prev.style.display=wz.step===1?'none':'inline-flex';
  next.style.display=wz.step===6?'none':'inline-flex';
  $('wzCancel').style.display=wz.step===6?'none':'inline-flex';
  next.disabled=!c.ok;
  next.classList.toggle('disabled',!c.ok);
  next.textContent=wz.step===5?'进入审核发布':'下一步';
  var hints={
    1:'完成必填项后可进入下一步',
    2:'配方冻结后方可继续，冻结即形成不可变更的配方快照',
    3:'所有受控数据项补齐后方可进入分类判定',
    4:'待人工判定项处理完毕后方可生成草案',
    5:'草案可逐章节临时编辑，确认后进入审核发布',
    6:'流程已到最后一步'
  };
  $('wzHint').innerHTML=(c.ok?'<span class="tag green dot-tag">本步已完成</span>':'<span class="tag orange dot-tag">本步未完成</span>')
    +'<span>'+hints[wz.step]+'</span>';
}

/* ------------------------------------------------------------------
   步骤 1：创建 SDS 项目
   ------------------------------------------------------------------ */
var LANG_EU={'德语 Deutsch':'德语（DE）','法语 Français':'法语（FR）','意大利语 Italiano':'意大利语（IT）',
  '西班牙语 Español':'西班牙语（ES）','荷兰语 Nederlands':'荷兰语（NL）','波兰语 Polski':'波兰语（PL）'};
/* ---------- 步骤 1：表单为动态渲染（不再依赖常驻 DOM） ---------- */
function pickMarket(m){
  if(wz.project.market===m)return;
  wz.project.market=m;
  if(typeof complianceEvaluationInvalidate==='function')complianceEvaluationInvalidate('目标市场变化');
  wz.project.state='';wz.project.oflang='';
  wz.project.lang=(m==='CN')?'简体中文（zh-CN）':'';
  renderStep1();wzUpdateFoot();
}
/* ---------- B2：行政联系信息（公司档案一次维护，按市场联动带出） ---------- */
function admDefaults(market){
  var or=OR_BY_MARKET[market];
  return {
    emerg:(market==='EU')?COMPANY.emergencyEu:COMPANY.emergencyCn,
    orName:or?or.name:'',
    orTel:or?or.tel:'',
    pcn:or?or.pcn:''
  };
}
/* 市场未变则保留人工覆盖值；市场切换则重新带出 */
function admSync(){
  var p=wz.project;
  if(p._admMk===p.market)return;
  if(!p.market){p.emerg='';p.orName='';p.orTel='';p.pcn='';p._admMk='';return;}
  var d=admDefaults(p.market);
  p.emerg=d.emerg;p.orName=d.orName;p.orTel=d.orTel;p.pcn=d.pcn;
  p._admMk=p.market;
}
function admDirty(){
  var p=wz.project;if(!p.market)return false;
  var d=admDefaults(p.market);
  return p.emerg!==d.emerg||p.orName!==d.orName||p.orTel!==d.orTel||p.pcn!==d.pcn;
}
/* 覆盖标记：单独刷新，避免 wzValidate1 重绘整个表单导致输入框失焦 */
function admBadge(){
  if(!admDirty())return '';
  return '<span class="tag orange">已覆盖默认值</span>'
    +'<button class="btn sm" onclick="admReset()">↺ 还原公司档案</button>';
}
function admRefreshBadge(){
  var box=$('admBadgeBox');
  if(!box)return;
  var next=admBadge();
  if(box.innerHTML!==next)box.innerHTML=next;
}
function admReset(){
  var p=wz.project,d=admDefaults(p.market);
  p.emerg=d.emerg;p.orName=d.orName;p.orTel=d.orTel;p.pcn=d.pcn;
  renderStep1();toast('已还原为公司档案默认值','ok');
}
/* ---------- B3：纳米形态与 UFI ---------- */
var NANO_FORMS=['球形纳米颗粒（spherical nanoparticles）','纳米纤维 / 纳米管（nanofibres / nanotubes）',
  '纳米片 / 层状纳米材料（nanoplates）','纳米分散体（nanodispersion）','其他（需在第 1 章补充说明）'];
function pickNano(v){wz.project.nano=v;if(v==='0')wz.project.nanoForm='';renderStep1();wzUpdateFoot();}
/* G12：非工作时间可用性 */
function pickEmerg24(v){wz.project.emerg24=v;renderStep1();wzUpdateFoot();}
function ufiErr(u){
  u=(u||'').trim();
  if(!u)return '';
  var bare=u.replace(/-/g,'').toUpperCase();
  if(bare.length!==16)return 'UFI 应为 16 位字符（当前 '+bare.length+' 位，连字符不计）';
  if(!/^[0-9A-Z]{16}$/.test(bare))return 'UFI 只能包含数字与字母 A–Z（不含字母 O、I 等易混字符）';
  return '';
}
function wzValidate1(){
  var p=wz.project;
  var oldSignature=[p.product,p.date,p.state,p.lang].join('|');
  if($('f_product'))p.product=$('f_product').value;
  if($('f_date'))p.date=$('f_date').value;
  if($('f_emerg'))p.emerg=$('f_emerg').value;
  if($('f_orName'))p.orName=$('f_orName').value;
  if($('f_orTel'))p.orTel=$('f_orTel').value;
  if($('f_pcn'))p.pcn=$('f_pcn').value;
  if($('f_ufi'))p.ufi=$('f_ufi').value;
  if($('f_nanoForm'))p.nanoForm=$('f_nanoForm').value;
  /* G9 / G12 新增字段 */
  if($('f_idxNo'))p.idxNo=$('f_idxNo').value;
  if($('f_reachNo'))p.reachNo=$('f_reachNo').value;
  if($('f_emergHours'))p.emergHours=$('f_emergHours').value;
  admRefreshBadge();
  if(p.market==='EU'){
    if($('f_state'))p.state=$('f_state').value;
    if($('f_oflang')){
      var nv=$('f_oflang').value;
      if(nv!==p.oflang){p.oflang=nv;p.lang='';if(typeof complianceEvaluationInvalidate==='function')complianceEvaluationInvalidate('产品信息变化');renderStep1();wzUpdateFoot();return;}
    }
    if($('f_lang')&&!$('f_lang').disabled)p.lang=$('f_lang').value;
  }else if(p.market==='CN'){
    p.lang='简体中文（zh-CN）';
  }
  if(oldSignature!==[p.product,p.date,p.state,p.lang].join('|')&&typeof complianceEvaluationInvalidate==='function')
    complianceEvaluationInvalidate('产品信息或投放日期变化');
  wzUpdateFoot();
}
function wzSyncForm1(){ renderStep1(); }
function renderStep1(){
  var p=wz.project,eu=p.market==='EU';
  admSync();                      /* B2：目标市场变化时重新带出境外责任主体 */
  var ue=ufiErr(p.ufi);           /* B3：UFI 非必填，填了才校验 */
  var langHtml;
  if(!p.market)        langHtml='<option value="">请先选择目标市场</option>';
  else if(p.market==='CN') langHtml='<option>简体中文（zh-CN）</option>';
  else if(!p.oflang)   langHtml='<option value="">请先选择官方语言</option>';
  else{
    var want=[LANG_EU[p.oflang],LANG_EU[p.oflang]+' + 英语（EN）'];
    langHtml='<option value="">请选择投放语言</option>'+want.map(function(w){
      return '<option'+(w===p.lang?' selected':'')+'>'+esc(w)+'</option>';}).join('');
  }
  var helpTxt=!p.market?'语言随目标市场自动联动'
    :(p.market==='CN'?'中国市场默认使用简体中文，无需选择成员国'
    :'欧盟市场投放语言需覆盖目标成员国官方语言，可附加英语');
  var stOpts=['德国 Germany','法国 France','意大利 Italy','西班牙 Spain','荷兰 Netherlands','波兰 Poland'];
  var ofOpts=Object.keys(LANG_EU);
  $('wzBody').innerHTML='<div class="fade-in">'
    +'<div class="notice info"><div class="ni">i</div><div><b>第 1 步 · 创建 SDS 项目</b>目标市场决定后续适用的法规规则包、章节结构与语言要求，创建后不可随意变更。</div></div>'
    +'<div class="card"><div class="card-hd"><h3>项目基本信息</h3><span class="sub">带 * 为必填项</span></div>'
    +'<div class="card-bd"><div class="form-grid">'
      +'<div class="field"><label class="req">产品名称</label>'
        +'<div style="display:flex;gap:8px">'
        +'<input class="ctrl" id="f_product" style="flex:1" value="'+esc(p.product)+'" placeholder="例如：水性聚氨酯涂饰树脂 WPU-320" oninput="wzValidate1()">'
        +'<button class="btn" type="button" onclick="wzPickMaterial()">从物料库选择</button></div>'
        +'<span class="help">可手动输入，或点击「从物料库选择」关联物料档案</span>'
        +'<div id="matPickInfo" style="margin-top:7px">'+wzMatInfo()+'</div></div>'
      +'<div class="field"><label class="req">计划投放日期</label>'
        +'<input class="ctrl" type="date" id="f_date" value="'+esc(p.date)+'" onchange="wzValidate1()">'
        +'<span class="help">系统按投放日期匹配当时生效的法规版本</span></div>'
      +'<div class="field span2"><label class="req">目标市场</label><div class="radio-row">'
        +'<div class="radio-card'+(p.market==='EU'?' on':'')+'" id="mk_eu" onclick="pickMarket(\'EU\')"><span class="rd"></span><div><b>欧盟（EU）</b><small>适用 REACH Annex II / CLP，需指定成员国与官方语言</small></div></div>'
        +'<div class="radio-card'+(p.market==='CN'?' on':'')+'" id="mk_cn" onclick="pickMarket(\'CN\')"><span class="rd"></span><div><b>中国（CN）</b><small>适用 GB/T 16483、GB 30000 系列，默认简体中文</small></div></div>'
        +'</div></div>'
      +(eu?'<div class="field" id="fw_state"><label class="req">目标成员国</label>'
        +'<select class="ctrl" id="f_state" onchange="wzValidate1()"><option value="">请选择成员国</option>'
        +stOpts.map(function(o){return '<option'+(o===p.state?' selected':'')+'>'+o+'</option>';}).join('')+'</select>'
        +'<span class="help">成员国决定紧急联系电话、毒物中心（PCN）与本地补充要求</span></div>'
      +'<div class="field" id="fw_oflang"><label class="req">官方语言</label>'
        +'<select class="ctrl" id="f_oflang" onchange="wzValidate1()"><option value="">请选择官方语言</option>'
        +ofOpts.map(function(o){return '<option'+(o===p.oflang?' selected':'')+'>'+esc(o)+'</option>';}).join('')+'</select>'
        +'<span class="help">欧盟要求 SDS 使用投放成员国的官方语言</span></div>':'')
      +'<div class="field"><label class="req">投放语言</label>'
        +'<select class="ctrl" id="f_lang" onchange="wzValidate1()" '+(p.market==='CN'?'disabled':'')+'>'+langHtml+'</select>'
        +'<span class="help" id="langHelp">'+helpTxt+'</span></div>'
      +'<div class="field"><label>责任主体 / 编制人</label>'
        +'<input class="ctrl" value="华东新材料有限公司 · EHS 合规部 王工" readonly></div>'
      /* B3：纳米形态 + 16 位 UFI —— 仅欧盟市场需要，且非必填 */
      +(eu?'<div class="field span2"><label>产品是否纳米形态<span style="color:var(--muted);font-weight:400"> · 非必填</span></label>'
          +'<div class="radio-row">'
            +[['0','否','常规物质，不含纳米形态'],['1','是','含纳米形态物质，须在第 1 章声明']].map(function(o){
              return '<div class="radio-card'+(p.nano===o[0]?' on':'')+'" onclick="pickNano(\''+o[0]+'\')">'
                +'<span class="rd"></span><div><b>'+o[1]+'</b><small>'+o[2]+'</small></div></div>';}).join('')
          +'</div></div>':'')
      +(eu&&p.nano==='1'?'<div class="field"><label class="req">纳米形态描述</label>'
          +'<select class="ctrl" id="f_nanoForm" onchange="wzValidate1()"><option value="">请选择具体形态</option>'
          +NANO_FORMS.map(function(o){return '<option'+(o===p.nanoForm?' selected':'')+'>'+esc(o)+'</option>';}).join('')
          +'</select><span class="help">欧盟 2018/1881 纳米材料定义，形态须与 PCN 通报一致</span></div>':'')
      +(eu?'<div class="field"><label>16 位 UFI<span style="color:var(--muted);font-weight:400"> · 非必填</span></label>'
          +'<input class="ctrl" id="f_ufi" value="'+esc(p.ufi)+'" placeholder="例如：G2V4-80H3-100K-5QP7" oninput="wzValidate1()">'
          +'<span class="help"'+(ue?' style="color:var(--red)"':'')+'>'
          +(ue?esc(ue):'完成 PCN 通报后生成的唯一配方标识，格式 XXXX-XXXX-XXXX-XXXX；未填不影响后续步骤')+'</span></div>'
        /* G9：1.1 产品标识补充 —— Index Number 与 REACH 注册号（纯物质填写，混合物输出 See section 3） */
        +'<div class="field"><label>索引号 Index Number<span style="color:var(--muted);font-weight:400"> · 非必填</span></label>'
          +'<input class="ctrl" id="f_idxNo" value="'+esc(p.idxNo)+'" placeholder="例如：605-001-00-5" oninput="wzValidate1()">'
          +'<span class="help">CLP Annex VI 统一分类索引号；混合物留空则第 1.1 输出「See section 3」</span></div>'
        +'<div class="field"><label>REACH 注册号<span style="color:var(--muted);font-weight:400"> · 非必填</span></label>'
          +'<input class="ctrl" id="f_reachNo" value="'+esc(p.reachNo)+'" placeholder="例如：01-2119488953-20-XXXX" oninput="wzValidate1()">'
          +'<span class="help">纯物质填写本物质注册号；混合物留空则第 1.1 输出「See section 3」</span></div>':'')
    +'</div></div></div></div>'
    /* B2：行政联系信息（公司级，一次维护多次复用） */
    +'<div class="card" style="margin-top:14px"><div class="card-hd">'
      +'<h3>行政联系信息<span class="tag green" style="margin-left:7px">公司级 · 一次维护多次复用</span></h3>'
      +'<span class="sub">写入 SDS 第 1.3 节 · 随目标市场自动带出对应责任主体</span>'
      +'<div class="right" id="admBadgeBox">'+admBadge()+'</div></div>'
      +'<div class="card-bd">'
      +'<div class="notice info" style="margin-bottom:12px"><div class="ni">i</div><div>'
        +'公司中英文名 / 地址 / 邮编 / 电话 / 传真 / 邮箱 <b style="display:inline">来自公司档案，全公司所有 SDS 共用一套</b>；'
        +'应急咨询电话与境外责任主体 <b style="display:inline">由系统按目标市场自动带出</b>，可按需覆盖。'
        +'<br><span style="color:var(--muted);font-size:11.8px">'
        +(eu?'欧盟市场须列明 OR（唯一代表）与毒理中心应急电话（如已完成 PCN 通报）；'
            :(p.market==='CN'?'中国市场只需列明境内 24 小时应急咨询电话；':'请先选择目标市场，系统将带出对应责任主体。'))
        +'英国 OR、土耳其进口商同属该机制，当前未投放该市场，故不显示。</span></div></div>'
      +'<div class="form-grid">'
        +'<div class="field"><label>公司中文名称</label><input class="ctrl" value="'+esc(COMPANY.cn)+'" readonly></div>'
        +'<div class="field"><label>公司英文名称</label><input class="ctrl" value="'+esc(COMPANY.en)+'" readonly></div>'
        +'<div class="field span2"><label>中文地址</label><input class="ctrl" value="'+esc(COMPANY.addrCn)+'" readonly></div>'
        +'<div class="field span2"><label>英文地址</label><input class="ctrl" value="'+esc(COMPANY.addrEn)+'" readonly></div>'
        +'<div class="field"><label>邮编</label><input class="ctrl" value="'+esc(COMPANY.zip)+'" readonly></div>'
        +'<div class="field"><label>电话</label><input class="ctrl" value="'+esc(COMPANY.tel)+'" readonly></div>'
        +'<div class="field"><label>传真</label><input class="ctrl" value="'+esc(COMPANY.fax)+'" readonly></div>'
        +'<div class="field"><label>邮箱</label><input class="ctrl" value="'+esc(COMPANY.mail)+'" readonly></div>'
        +'<div class="field span2"><label class="req">应急咨询电话</label>'
          +'<input class="ctrl" id="f_emerg" value="'+esc(p.emerg)+'" oninput="wzValidate1()">'
          +'<span class="help">'+(eu?'欧盟要求提供 7×24 可接通的应急电话，并注明服务时段':'中国要求提供境内 24 小时应急咨询电话')+'</span></div>'
        /* G12：服务时段 + 非工作时间可用性（真实 SDS 1.4 必备） */
        +'<div class="field"><label>服务时段</label>'
          +'<input class="ctrl" id="f_emergHours" value="'+esc(p.emergHours)+'" placeholder="例如：9:00–17:30（工作日）" oninput="wzValidate1()">'
          +'<span class="help">写入第 1.4 节；全天候可填「24 小时」</span></div>'
        +'<div class="field"><label>非工作时间可用（Available outside office hours）</label>'
          +'<div class="radio-row">'
            +[['1','YES 是','第 1.4 输出：Available outside office hours — YES'],
              ['0','NO 否','第 1.4 输出：Available outside office hours — NO']].map(function(o){
              return '<div class="radio-card'+(p.emerg24===o[0]?' on':'')+'" onclick="pickEmerg24(\''+o[0]+'\')">'
                +'<span class="rd"></span><div><b>'+o[1]+'</b><small>'+o[2]+'</small></div></div>';}).join('')
          +'</div></div>'
        +(eu&&OR_BY_MARKET.EU
          ?'<div class="field"><label>'+esc(OR_BY_MARKET.EU.tag)+'</label>'
            +'<input class="ctrl" id="f_orName" value="'+esc(p.orName)+'" oninput="wzValidate1()">'
            +'<span class="help">'+esc(OR_BY_MARKET.EU.rule)+'</span></div>'
           +'<div class="field"><label>OR 联系电话</label>'
            +'<input class="ctrl" id="f_orTel" value="'+esc(p.orTel)+'" oninput="wzValidate1()"></div>'
           +'<div class="field span2"><label>PCN 毒理中心应急电话</label>'
            +'<input class="ctrl" id="f_pcn" value="'+esc(p.pcn)+'" oninput="wzValidate1()">'
            +'<span class="help">未完成 PCN 通报则留空，第 1 章将不输出该条目</span></div>'
          :(p.market==='CN'?'<div class="field span2"><label>境内应急咨询电话</label>'
            +'<input class="ctrl" value="'+esc(COMPANY.emergencyCn)+'" readonly>'
            +'<span class="help">中国市场无需委托境外代表，仅列明境内应急电话即可</span></div>':''))
      +'</div></div></div>';
  wzGuide('');          /* 第 1 步无独立步骤说明，清空其他步残留 */
  wzUpdateFoot();
}
function wzMatInfo(){
  if(!wz.materialCode)return '';
  var r=DB_CFG.material.rows.filter(function(x){return x.code===wz.materialCode;})[0];
  var pure=r&&(r.form||'').indexOf('纯')===0;
  return '<span class="tag '+(pure?'green':'purple')+'">'+esc(r?r.form:'混合物（混合料）')+'</span> '
    +'<span style="font-size:12.5px;color:var(--muted)">已关联物料 '+esc(wz.materialCode)
    +' · 仅用于标识与归档，<b style="color:var(--orange)">不带出配方</b>，请在第 2 步手动录入</span>';
}
/* 从物料主数据关联：仅带出物质形态，不带出配方（产品决策：配方改为手动录入） */
function wzPickMaterial(){
  var list=DB_CFG.material.rows.map(function(r){
    var pure=(r.form||'').indexOf('纯')===0;
    return '<div class="pick-row" onclick="wzLoadMaterial(\''+r.code+'\')"><div><b>'+esc(r.name)+'</b>'
      +'<small>'+esc(r.code)+' · '+esc(r.type)+' · '+esc(r.form||'—')+'</small></div>'
      +'<div class="right"><span class="tag '+(pure?'green':'purple')+'">'+esc(pure?'纯物质':'混合物')+'</span></div></div>';
  }).join('');
  sdsModal({title:'关联物料主数据',width:620,
    body:'<div class="notice warn" style="margin-bottom:12px"><div class="ni">!</div><div>'
      +'关联物料仅用于<b>标识与归档</b>，系统会带出其<b>物质形态</b>（纯物质 / 混合物）以决定第 2 步的录入方式，'
      +'<b style="display:inline">不会自动带出配方组成</b>。配方请在第 2 步手动录入或「从组分库选择」。</div></div>'
      +'<div class="pick-list">'+list+'</div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button>'});
}
function wzLoadMaterial(code){
  var r=DB_CFG.material.rows.filter(function(x){return x.code===code;})[0];
  if(!r)return;
  var pure=(r.form||'').indexOf('纯')===0;
  wz.materialCode=code;
  wz.project.product=r.name;
  wz.formType=pure?'pure':'mix';
  if(typeof complianceEvaluationInvalidate==='function')complianceEvaluationInvalidate('产品类型或物料变化');
  /* R8 产品决策：不再带出配方，仅保留物质形态判定 */
  wz.formula=[];
  wz.frozen=false;wz.collected=false;wz.collect={};wz.classItems=null;wz.classPack=null;wz.draftAt='';
  closeModal();renderStep1();wzUpdateFoot();
  toast('已关联物料：'+r.name+'（配方请在第 2 步手动录入）','ok');
}

/* ---------- 步骤 2 新增：从组分库选择（替代原「自动带出配方」） ---------- */
var _pickCompSel={};
function fmPickComp(){
  _pickCompSel={};
  var rows=DB_CFG.component.rows;
  var body='<div class="notice info" style="margin-bottom:12px"><div class="ni">i</div><div>'
    +'从组分基础库勾选物质，系统将自动带出 <b>CAS 号</b> 与 <b>受控物质名称</b>，你只需补充<b>浓度</b>即可。</div></div>'
    +'<div class="search" style="margin-bottom:10px"><span class="si">🔍</span>'
    +'<input class="ctrl" id="pckKw" placeholder="搜索 CAS / 中英文名称 / 分子式" oninput="fmPickFilter(this.value)"></div>'
    +'<div id="pckList" class="pick-list">'+fmPickListHTML('')+'</div>'
    +'<div style="margin-top:10px;font-size:12.5px;color:var(--muted)">已选 <b id="pckCnt" style="color:var(--brand)">0</b> 项</div>';
  sdsModal({title:'从组分库选择',width:680,body:body,
    footer:'<button class="btn" onclick="closeModal()">取消</button>'
          +'<button class="btn primary" onclick="fmPickApply()">加入配方</button>'});
}
function fmPickFilter(kw){
  $('pckList').innerHTML=fmPickListHTML(kw);
}
function fmPickListHTML(kw){
  kw=(kw||'').trim().toLowerCase();
  var rows=DB_CFG.component.rows.filter(function(r){
    if(!kw)return true;
    return [r.cas,r.cn,r.en,r.formula].join(' ').toLowerCase().indexOf(kw)>=0;
  });
  if(!rows.length)return '<div class="tbl-empty"><span class="big">▤</span>未匹配到组分</div>';
  return rows.map(function(r){
    return '<div class="pick-row" onclick="fmPickToggle(\''+esc(r.cas)+'\',this)">'
      +'<input type="checkbox" class="chk" '+( _pickCompSel[r.cas]?'checked':'')+' onclick="event.stopPropagation();this.parentNode.click()">'
      +'<div><b>'+esc(r.cn)+' <span style="color:var(--muted);font-weight:400">'+esc(r.en)+'</span></b>'
      +'<small>CAS '+esc(r.cas)+' · '+esc(r.formula)+' · EC '+esc(r.ec||'—')+'</small></div>'
      +'<div class="right"><span class="tag '+(r.status==='已验证'?'green':(r.status==='已停用'?'red':'orange'))+'">'+esc(r.status)+'</span></div></div>';
  }).join('');
}
function fmPickToggle(cas,el){
  if(_pickCompSel[cas])delete _pickCompSel[cas]; else _pickCompSel[cas]=1;
  var box=el.querySelector('input'); if(box)box.checked=!!_pickCompSel[cas];
  var c=$('pckCnt'); if(c)c.textContent=Object.keys(_pickCompSel).length;
}
function fmPickApply(){
  var casList=Object.keys(_pickCompSel);
  if(!casList.length){toast('请至少勾选一个组分','warn');return;}
  if(wz.frozen){toast('配方已冻结，请先解除冻结','warn');return;}
  var added=0;
  casList.forEach(function(cas){
    if(wz.formula.some(function(f){return f.cas===cas;}))return;
    var r=DB_CFG.component.rows.filter(function(x){return x.cas===cas;})[0];
    wz.formula.push({cas:cas,name:r?r.cn:'',conc:'',secret:false});
    added++;
  });
  if(added&&typeof complianceEvaluationInvalidate==='function')complianceEvaluationInvalidate('添加组分');
  closeModal();renderStep2();wzUpdateFoot();
  toast(added?('已加入 '+added+' 个组分，请补充浓度'):'所选组分已存在于配方中',added?'ok':'warn');
}

/* ------------------------------------------------------------------
   步骤 2：输入配方（可编辑表格 + 冻结）
   ------------------------------------------------------------------ */
function renderStep2(){
  var ro=wz.frozen, pure=wz.formType==='pure';
  if(pure&&wz.formula.length===0)wz.formula=[{cas:'',name:'',conc:'100.00',secret:false}];
  var total=wz.formula.reduce(function(a,b){return a+(parseFloat(b.conc)||0);},0);
  /* B1：带入来源是「实验配方」的行默认待核对（chk=false）；人工录入的行视为已核对 */
  var pending=wz.formula.filter(function(r){return r.chk===false;}).length;
  var rows=wz.formula.map(function(r,i){
    var lock=pure;
    return '<tr'+(r.chk===false?' class="row-chk"':'')+'>'
      +'<td style="width:52px;color:var(--muted)">'+(i+1)+'</td>'
      +'<td style="width:170px"><input class="ctrl" style="height:30px" value="'+esc(r.cas)+'" '+(ro?'readonly':'')+' placeholder="输入 CAS 号自动带出" oninput="fmCas('+i+',this.value)"></td>'
      +'<td><input class="ctrl" style="height:30px" value="'+esc(r.name)+'" '+(ro?'readonly':'')+' placeholder="物质名称" oninput="fmSet('+i+',\'name\',this.value)">'
        +(r.chk===false?' <span class="tag orange" title="由实验配方带入，需人工核对与实际销售成分是否一致">待核对</span>':'')+'</td>'
      +'<td style="width:130px"><input class="ctrl" style="height:30px" value="'+esc(r.conc)+'" '+(ro||lock?'readonly':'')+' type="number" step="0.01" oninput="fmSet('+i+',\'conc\',this.value)"></td>'
      +'<td style="width:120px"><label class="inline-chk"><input type="checkbox" class="chk" '+(r.secret?'checked':'')+' '+(ro?'disabled':'')+' onchange="fmSet('+i+',\'secret\',this.checked)"> '+(r.secret?'<span class="tag purple">是</span>':'<span style="color:var(--muted)">否</span>')+'</label></td>'
      +(pure?'<td style="width:80px;color:var(--muted);font-size:12px">锁定 100%</td>'
           :'<td style="width:130px" class="acts">'
             +(r.chk===false
               ? '<button class="btn-link" onclick="fmCheck('+i+')">✓ 已核对</button>'
               : '<span style="color:var(--muted);font-size:12px">已核对</span>')
             +(ro?'':'<button class="btn-link del" onclick="fmDel('+i+')">删除</button>')+'</td>')
      +'</tr>';
  }).join('');
  var headNotice=pure
    ? '<div class="notice info"><div class="ni">i</div><div><b>第 2 步 · 输入配方（纯物质）</b>该物料为<b style="display:inline">纯物质（单物料）</b>，配方即其自身 100% 物质，浓度锁定不可调整；第 4 步将直接采用该物质的 GHS 统一分类（CLP Annex VI 查表），不进行混合物浓度加和。</div></div>'
    : '<div class="notice warn"><div class="ni">!</div><div><b>第 2 步 · 输入配方</b>保密组分需按目标市场规则控制披露方式（如浓度区间化、替代名称申请），<b style="display:inline">不可直接隐藏物质身份</b>；'
      +'配方有<b style="display:inline">两条录入路径</b>：① 手填 CAS 号自动匹配 / 「从组分库选择」批量勾选；'
      +'② <b style="display:inline">从实验配方引入</b>（仅省去重复录入，<b style="display:inline;color:var(--orange)">研发试制投料比 ≠ 实际销售成分，带入的组分默认「待核对」，全部核对完毕才可冻结</b>）。'
      +'配方冻结后形成不可变更快照，作为后续分类与草案的唯一输入。</div></div>';
  var badge='<span class="tag '+(pure?'green':'purple')+'">'+(pure?'纯物质 · 单一 100%':'混合物 · 多组分')+'</span>'
    +(pending?'<span class="tag orange" style="margin-left:6px">'+pending+' 项待核对</span>':'');
  wzGuide(headNotice);
  $('wzBody').innerHTML=
    '<div class="card"><div class="card-hd"><h3>配方组分明细 '+badge+'</h3><span class="sub">输入 CAS 号后自动匹配物质名称</span>'
      +'<div class="right">'+(wz.frozen?'<span class="tag green dot-tag">已冻结 '+esc(wz.frozenAt)+'</span>':(pure?'':'<button class="btn sm" onclick="fmAdd()">＋ 添加行</button><button class="btn sm" onclick="fmPickComp()">▤ 从组分库选择</button><button class="btn sm" onclick="fmPickExp()">🧪 从实验配方引入</button><button class="btn sm" onclick="fmDemo()">载入示例配方</button>'))+'</div></div>'
    +'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>序号</th><th>CAS 号</th><th>物质名称</th><th>浓度(%)</th><th>是否保密组分</th><th>操作</th></tr></thead><tbody>'
    +(rows||'<tr><td colspan="6" class="tbl-empty"><span class="big">▤</span>暂无配方组分，请点击「添加行」「从组分库选择」或「从实验配方引入」</td></tr>')
    +'</tbody></table></div>'
    +'<div class="toolbar" style="border-top:1px solid var(--line2);border-bottom:none">'
      +'<span style="font-size:12.8px">浓度合计：<b style="color:'+(Math.abs(total-100)<0.01?'var(--green)':'var(--orange)')+';font-size:14px">'+total.toFixed(2)+'%</b></span>'
      +'<span class="tag '+(Math.abs(total-100)<0.01?'green':'orange')+'">'+(pure?'纯物质固定 100%':(Math.abs(total-100)<0.01?'配比校验通过':'合计不足/超出 100%，冻结时将提示'))+'</span>'
      +'<span style="font-size:12.5px;color:var(--muted)">保密组分 '+wz.formula.filter(function(f){return f.secret;}).length+' 项</span>'
      +(pending?'<button class="btn sm" onclick="fmCheckAll()">✓ 全部标记已核对</button>':'')
      +'<div class="grow"></div>'
      +(wz.frozen
        ? '<button class="btn danger" onclick="fmUnfreeze()">解除冻结（演示）</button>'
        : '<button class="btn primary lg" onclick="fmFreeze()">🔒 冻结配方</button>')
    +'</div></div>'
    +(wz.frozen?'<div class="notice ok"><div class="ni">✓</div><div><b>配方已冻结 · 快照版本 FORM-'+(wz.materialCode||'0001')+'-V1.0</b>冻结时间 '+wz.frozenAt+'，配方内容不可再编辑。如需修改请解除冻结并重新走数据汇集流程。</div></div>':'');
}
function fmSet(i,k,v){
  wz.formula[i][k]=v;
  if(typeof complianceEvaluationInvalidate==='function')complianceEvaluationInvalidate(k==='secret'?'组分保密标记变化':'组分数据变化');
  if(k==='secret')renderStep2();          /* 保密标记变化需重绘标签 */
  else if(k==='conc')renderStep2Soft();   /* 仅刷新合计，避免输入框失焦 */
}
function renderStep2Soft(){/* 轻量刷新合计，不重绘输入框，避免焦点丢失 */
  var total=wz.formula.reduce(function(a,b){return a+(parseFloat(b.conc)||0);},0);
  var box=$('wzBody').querySelector('.toolbar b');
  if(box){box.textContent=total.toFixed(2)+'%';box.style.color=Math.abs(total-100)<0.01?'var(--green)':'var(--orange)';}
}
function fmCas(i,v){
  wz.formula[i].cas=v;
  if(typeof complianceEvaluationInvalidate==='function')complianceEvaluationInvalidate('组分 CAS 变化');
  var hit=CAS_LIB[v.trim()];
  if(hit){
    wz.formula[i].name=hit.cn;
    var tr=$('wzBody').querySelectorAll('tbody tr')[i];
    if(tr){tr.querySelectorAll('input')[1].value=hit.cn;}
    toast('已自动匹配物质：'+hit.cn+'（'+hit.en+'）','info');
  }
}
function fmAdd(){wz.formula.push({cas:'',name:'',conc:'',secret:false,chk:true});if(typeof complianceEvaluationInvalidate==='function')complianceEvaluationInvalidate('添加组分');renderStep2();toast('已添加配方行','ok');}
function fmDel(i){
  var n=wz.formula[i].name||('第 '+(i+1)+' 行');
  sdsConfirm('删除配方组分','确认删除组分 <b>'+esc(n)+'</b>？',function(){
    wz.formula.splice(i,1);renderStep2();wzUpdateFoot();toast('已删除组分：'+n,'ok');
    if(typeof complianceEvaluationInvalidate==='function')complianceEvaluationInvalidate('删除组分');
  },'删除',true);
}
/* B1 · 路径 A：从实验配方引入
   保密口径：实验配方只是研发试制投料比，不等于实际销售成分；
   因此带入的组分一律标记「待核对」，全部核对完才允许冻结。 */
function fmPickExp(){
  /* 配方来源 = DOE 方案（设计层）+ 普通实验；DOE 运行记录不单独持有配方，继承所属方案 */
  var list=(typeof doeSchemes!=='undefined'?doeSchemes:[]).filter(function(s){return EXP_RECIPE[s.id];})
    .map(function(s){return {id:s.id,name:s.name,type:s.type};});
  experiments.filter(function(e){return e.source!=='DOE'&&EXP_RECIPE[e.id];})
    .forEach(function(e){ list.push({id:e.id,name:e.name,type:e.type}); });
  if(!list.length){toast('暂无可引入的实验配方','warn');return;}
  var rows=list.map(function(e){
    var rec=EXP_RECIPE[e.id];
    var sum=rec.rows.reduce(function(a,b){return a+(parseFloat(b.pct)||0);},0);
    return '<div class="pick-row" onclick="fmExpConfirm(\''+e.id+'\')"><div><b>'+esc(e.name)+'</b>'
      +'<small>'+esc(e.id)+' · '+esc(e.type)+' · '+esc(rec.product)+'</small></div>'
      +'<div class="right"><span class="tag purple">'+esc(rec.code)+' '+esc(rec.ver)+'</span>'
      +'<span class="tag grey">'+rec.rows.length+' 组分 · 合计 '+sum.toFixed(2)+'%</span></div></div>';
  }).join('');
  sdsModal({title:'从实验配方引入',width:680,
    body:'<div class="notice warn" style="margin-bottom:12px"><div class="ni">!</div><div>'
      +'这里引入的是<b>研发阶段的实验配方（试制投料比）</b>，<b style="display:inline;color:var(--orange)">不等于实际销售成分</b>。'
      +'系统只能省去重复录入的工作量，<b style="display:inline">不能代替人工核对</b>：带入的每一行都会标记为「待核对」，'
      +'需逐行确认与实际销售成分一致（允许新增 / 删除 / 修改）后，才可冻结配方。</div></div>'
      +'<div class="pick-list">'+rows+'</div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button>'});
}
function fmExpConfirm(eid){
  var e=findExp(eid)||findScheme(eid),rec=EXP_RECIPE[eid]; if(!e||!rec)return;
  var rowsHtml=rec.rows.map(function(r){
    return '<tr><td class="mono">'+esc(r.code)+'</td><td>'+esc(r.name)+'</td>'
      +'<td class="mono">'+esc(r.cas)+'</td><td class="num">'+esc(r.pct)+'%</td></tr>';}).join('');
  sdsConfirm('确认引入实验配方',
    '<div style="margin-bottom:10px">即将引入 <b>'+esc(e.name)+'</b>（'+esc(e.id)+'）的配方 '
    +'<b>'+esc(rec.code)+' '+esc(rec.ver)+'</b>，共 '+rec.rows.length+' 个组分。</div>'
    +'<div class="tbl-wrap" style="max-height:210px;overflow:auto"><table class="tbl mini"><thead><tr>'
    +'<th>组分代码</th><th>物质名称</th><th>CAS</th><th style="text-align:right">含量</th></tr></thead><tbody>'
    +rowsHtml+'</tbody></table></div>'
    +'<div class="notice warn" style="margin-top:12px"><div class="ni">!</div><div>'
    +'<b>请确认该配方与实际销售成分一致。</b>若中试到量产之间做过调整，引入后请手动修改对应组分与浓度；'
    +'所有带入的组分将标记为「待核对」。</div></div>',
    function(){
      wz.formula=rec.rows.map(function(r){
        return {cas:r.cas,name:r.name,conc:r.pct,secret:false,chk:false};   /* chk:false = 待核对 */
      });
      if(typeof complianceEvaluationInvalidate==='function')complianceEvaluationInvalidate('引入实验配方');
      wz.frozen=false;wz.collected=false;wz.collect={};wz.classItems=null;wz.classPack=null;wz.draftAt='';
      renderStep2();wzUpdateFoot();
      toast('已引入 '+rec.rows.length+' 个组分，请逐行核对后冻结','ok');
    },'确认引入');
}
/* 单行核对：确认该组分与实际销售成分一致 */
function fmCheck(i){
  var r=wz.formula[i]; if(!r)return;
  if(!r.cas.trim()||!r.name.trim()||!r.conc){toast('请先补全该组分的 CAS、名称与浓度','warn');return;}
  r.chk=true;renderStep2();wzUpdateFoot();
  toast('已确认：'+r.name+' 与实际销售成分一致','ok');
}
function fmCheckAll(){
  var bad=wz.formula.filter(function(r){return r.chk===false&&(!r.cas.trim()||!r.name.trim()||!r.conc);});
  if(bad.length){toast('有 '+bad.length+' 行信息不完整，无法批量核对','warn');return;}
  var n=0;
  wz.formula.forEach(function(r){ if(r.chk===false){r.chk=true;n++;} });
  renderStep2();wzUpdateFoot();
  toast('已批量确认 '+n+' 个组分','ok');
}
function fmDemo(){
  wz.formula=[
    {cas:'7732-18-5',name:'水',conc:'45.00',secret:false,chk:true},
    {cas:'111-76-2',name:'乙二醇单丁醚',conc:'8.50',secret:false,chk:true},
    {cas:'64-17-5',name:'乙醇',conc:'5.00',secret:false,chk:true},
    {cas:'79-10-7',name:'丙烯酸',conc:'2.50',secret:true,chk:true},
    {cas:'50-00-0',name:'甲醛',conc:'0.35',secret:false,chk:true},
    {cas:'9009-54-5',name:'聚氨酯预聚体',conc:'38.65',secret:true,chk:true}
  ];
  if(typeof complianceEvaluationInvalidate==='function')complianceEvaluationInvalidate('载入示例配方');
  renderStep2();toast('已载入示例配方（6 个组分）','ok');
}
function fmFreeze(){
  var bad=wz.formula.filter(function(r){return !r.cas.trim()||!r.name.trim()||!r.conc;});
  if(bad.length){toast('存在 '+bad.length+' 行未填写完整，无法冻结','err');return;}
  /* B1 保密口径：实验配方带入的行必须逐行核对完才能冻结 */
  var pend=wz.formula.filter(function(r){return r.chk===false;});
  if(pend.length){
    toast('仍有 '+pend.length+' 个组分待核对，请逐行确认与实际销售成分一致后再冻结','err');
    return;
  }
  var total=wz.formula.reduce(function(a,b){return a+(parseFloat(b.conc)||0);},0);
  var warnHtml=Math.abs(total-100)<0.01?'':'<div style="color:var(--orange);margin-top:6px">注意：当前浓度合计为 '+total.toFixed(2)+'%，与 100% 不符。</div>';
  sdsConfirm('冻结配方','冻结后配方将<b>不可再编辑</b>，并作为数据汇集、分类判定与 SDS 草案的唯一输入快照。<br><span style="color:var(--muted)">共 '+wz.formula.length+' 个组分，其中保密组分 '+wz.formula.filter(function(f){return f.secret;}).length+' 项。</span>'+warnHtml,
  function(){
    wz.frozen=true;wz.frozenAt=nowStr();wz.collected=false;
    if(typeof complianceEvaluationInvalidate==='function')complianceEvaluationInvalidate('冻结配方');
    renderStep2();wzUpdateFoot();
    toast('配方已冻结，可进入数据汇集','ok');
  },'确认冻结');
}
function fmUnfreeze(){
  sdsConfirm('解除配方冻结','解除冻结后，<b>后面步骤已维护内容全部失效</b>——已汇集的受控数据、分类结论与 SDS 草案均需重新生成。',function(){
    wz.frozen=false;wz.collected=false;wz.collect={};wz.classItems=null;wz.classPack=null;wz.draftAt='';
    if(typeof complianceEvaluationInvalidate==='function')complianceEvaluationInvalidate('解除配方冻结');
    renderStep2();wzUpdateFoot();toast('已解除冻结，后面步骤已维护内容全部失效','warn');
  },'解除冻结',true);
}

/* ------------------------------------------------------------------
   步骤 3：系统汇集受控数据（按数据优先级）
   ------------------------------------------------------------------ */
/* 数据来源优先级：实测报告 > 供应商SDS > 法规库数据 > PubChem辅助资料 */
var SRC_META={
  lab:{t:'实测报告',cls:'green',p:1},
  sup:{t:'供应商SDS',cls:'blue',p:2},
  reg:{t:'法规库数据',cls:'purple',p:3},
  pub:{t:'PubChem辅助',cls:'grey',p:4},
  man:{t:'人工补充',cls:'orange',p:2}
};
var DATA_ITEMS=['物理状态/外观','闪点 / 沸点','急性毒性 LD50','皮肤腐蚀/刺激','严重眼损伤/刺激','致癌性分类','水生急性毒性','职业接触限值 OEL','法规清单命中','CLP 特定浓度限值 SCL','CLP 急性毒性估计值 ATE','CLP M 因子','CLP 物质分类（当前取用）','CLP H 码'];
function clpCollectControlled(i){return [3,4,5,8,9,10,11,12,13].indexOf(i)>=0;}
/* 各组分 Mock 汇集结果，miss=true 表示缺失待补充 */
var COLLECT_MOCK={
  '7732-18-5':[['无色透明液体','lab'],['沸点 100 ℃ / 无闪点','lab'],['LD50 > 90000 mg/kg (大鼠经口)','pub'],null,null,null,[null,'pub'],['不适用','reg'],['未命中其他演示管控清单','reg']],
  '111-76-2':[['无色液体，微醚味','sup'],['闪点 62 ℃ / 沸点 171 ℃','lab'],['LD50 1480 mg/kg (大鼠经口)','sup'],null,null,null,['LC50 1474 mg/L (96h 鱼)','pub'],['20 ppm (8h TWA, EU IOELV)','reg'],null],
  '64-17-5':[['无色液体，酒精味','sup'],['闪点 13 ℃ / 沸点 78.4 ℃','lab'],['LD50 7060 mg/kg (大鼠经口)','pub'],null,null,null,['LC50 > 100 mg/L','pub'],['1000 ppm (8h TWA)','reg'],null],
  '79-10-7':[['无色液体，强刺激气味','sup'],[null,'lab'],['LD50 340 mg/kg (大鼠经口)','sup'],null,null,null,['EC50 95 mg/L (48h 溞)','pub'],[null,'reg'],null],
  '50-00-0':[['无色液体，强刺激气味','sup'],['闪点 59 ℃ (37%水溶液)','sup'],['LD50 100 mg/kg (大鼠经口)','reg'],null,null,null,['LC50 24 mg/L (96h 鱼)','pub'],['0.3 ppm (上限值)','reg'],['SVHC 候选清单','reg']],
  '9009-54-5':[['淡黄色粘稠液体','lab'],['闪点 > 200 ℃','lab'],[null,'sup'],null,null,null,[null,'pub'],['不适用','reg'],['聚合物豁免注册 (REACH Art.2(9))','reg']]
};
function clpCollectItems(cas,asOfDate){
  var p=clpSubstanceProfile(cas,asOfDate),e=p.effective,h=e.hazardMap||{},v={};
  var records=p.officialRecords,known=!!(records.length||p.supplemental),carc=e.classifications.filter(function(c){return c.hazardClass==='Carc.';})[0];
  var noClass=known?'当前画像未记录该类别':null;
  v[3]=h.skinCorr?'腐蚀 类别'+h.skinCorr:(h.skinIrrit?'刺激 类别'+h.skinIrrit:noClass);
  v[4]=h.eyeDamage?'严重损伤 类别'+h.eyeDamage:(h.eyeIrrit?'刺激 类别'+h.eyeIrrit:noClass);
  v[5]=carc?'致癌 类别'+carc.category+' ('+clpDataCodes([carc]).join(' / ')+')':noClass;
  v[8]=records.length?'CLP Annex VI '+records.map(function(r){return r.indexNo;}).join(' / '):null;
  v[9]=e.specificLimits.length?e.specificLimits.map(clpDataLimitText).join('｜'):(known?'当前画像未记录 SCL':null);
  v[10]=e.ateState==='known'&&e.ateValues.oral>0?'经口 '+fmtNum(e.ateValues.oral)+' mg/kg':(e.ateState==='na'?'经评估不适用':null);
  var mRequired=e.classifications.some(function(c){return (c.hazardClass==='Aquatic Acute'||c.hazardClass==='Aquatic Chronic')&&c.category==='1';});
  v[11]=e.mFactors.acute>0||e.mFactors.chronic>0?'急性 '+e.mFactors.acute+' / 慢性 '+e.mFactors.chronic:(known&&!mRequired?'不适用（无水生类别 1 分类）':null);
  v[12]=e.classifications.length?clpDataClassText(e.classifications):(known?'当前画像未记录分类':null);
  v[13]=clpDataCodes(e.classifications).join(' / ')||(known&&!e.classifications.length?'当前画像未记录 H 码':null);
  return v;
}
function clpCollectSource(p,i){
  if(i>=12)return p.officialRecords.length&&!p.supplemental?'reg':'man';
  if(i===9){
    var official=p.effective.specificLimits.some(function(x){var src=p.provenance['specificLimits.'+x.hazardClass+'|'+x.category];return src&&src.sourceType==='annex-vi';});
    return official?'reg':'man';
  }
  var h=p.effective.hazardMap||{},key=i===3?'hazardMap.'+(h.skinCorr?'skinCorr':'skinIrrit'):
    i===4?'hazardMap.'+(h.eyeDamage?'eyeDamage':'eyeIrrit'):
    i===5?'classifications.Carc.|':i===8?'official':
    i===10?'ateValues.oral':'mFactors.'+(p.effective.mFactors.chronic>0?'chronic':'acute');
  var source=i===8?'annex-vi':((p.provenance[key]||p.provenance.classifications||{}).sourceType);
  return source==='annex-vi'?'reg':source==='enterprise-supplement'?'man':source==='legacy-engine-baseline'?'man':'reg';
}
function wzCollectData(){
  wz.collect={};
  wz.formula.forEach(function(f){
    var mock=COLLECT_MOCK[f.cas]||DATA_ITEMS.map(function(){return [null,'pub'];});
    var day=(wz.project&&wz.project.date)||clpSystemToday(),clp=clpCollectItems(f.cas,day),profile=clpSubstanceProfile(f.cas,day);
    wz.collect[f.cas]=DATA_ITEMS.map(function(k,i){
      var m=mock[i]||[null,'pub'];
      if(Object.prototype.hasOwnProperty.call(clp,i)&&(i!==8||clp[i]!==null))m=[clp[i],clpCollectSource(profile,i)];
      if(i===8&&clp[8]&&mock[8]&&mock[8][0])m=[clp[8]+' / '+mock[8][0],'reg'];
      return {k:k,v:m[0],src:m[1],miss:m[0]===null};
    });
  });
  wz.collected=true;
}
function wzMissCount(){
  var n=0;
  Object.keys(wz.collect).forEach(function(c){wz.collect[c].forEach(function(i){if(i.miss)n++;});});
  return n;
}
/* 第 3 步辅助：证据引用（每条数据的依据来源，便于人工核对） */
var EVID_META={
  lab:{f:'内部检测报告',n:'JL-2026-'},
  sup:{f:'供应商 SDS 原件',n:'SDS-'},
  reg:{f:'本机法规库 / 组分基础数据',n:'REG-'},
  pub:{f:'PubChem 公开数据',n:'PUB-'},
  man:{f:'人工补充登记',n:'MAN-'}
};
/* 第 3 步辅助：多来源冲突示例（演示用，定义在数据层而非渲染层） */
var CONFLICT_MOCK=[
  {cas:'111-76-2',k:'急性毒性 LD50',a:['LD50 1480 mg/kg（大鼠经口）','sup'],b:['LD50 1200 mg/kg（大鼠经口）','pub'],
   note:'两份来源数值不一致 → 按优先级采用供应商 SDS（1480 mg/kg），PubChem 值仅供参考，需人工复核'},
  {cas:'79-10-7',k:'职业接触限值 OEL',a:['未提供 OEL','sup'],b:['2 ppm（建议值，非法规限值）','pub'],
   note:'辅助来源为「建议值」而非法规限值 → 不得作为第 8 章暴露控制依据，需人工按官方来源补录'}
];
/* 第 3 步「一键补录」演示数据源（第 38 轮）——
   模拟法规专员按来源优先级（实测报告 > 供应商 SDS > 法规库 > 辅助资料）把数据补齐。
   值统一写在数据层；渲染函数只负责展示，不在页面里现场编造结论。 */
var DEMO_FILL={
  /* ① 缺失数据：key 为数据项名称，值为 [内容, 来源, 依据编号] */
  collect:{
    '闪点 / 沸点':      ['闪点 50 ℃（闭杯）/ 沸点 141 ℃','lab','JL-2026-0417'],
    '职业接触限值 OEL': ['10 ppm（8h TWA，德国 AGW）','reg','AGW-79-10-7'],
    '急性毒性 LD50':    ['LD50 > 5000 mg/kg（大鼠经口，OECD 423）','lab','JL-2026-0418'],
    '严重眼损伤/刺激':  ['轻度刺激，不达分类阈值（OECD 405）','lab','JL-2026-0418'],
    '水生急性毒性':     ['不适用（低溶解度，OECD 202 未检出）','lab','JL-2026-0418']
  },
  /* ④ 会导致危害类别算不动的数据：补足「水生慢性分类的来源依据」，使加和法输入变为可靠 */
  aqua:{
    '50-00-0':  {lc50:'LC50 24 mg/L（96h 鱼，OECD 203）',noec:'NOEC 1 mg/L（21d 溞，OECD 211）',ref:'JL-2026-0419'},
    '111-76-2': {lc50:'LC50 1474 mg/L（96h 鱼，OECD 203）',noec:'NOEC 100 mg/L（21d 溞，OECD 211）',ref:'JL-2026-0420'}
  }
};
function wzEvidence(cas,src){
  var srcKey=cas.replace(/[^0-9]/g,'').slice(0,4)||'0000';
  var m=EVID_META[src]||EVID_META.pub;
  return m.f+' · '+m.n+srcKey;
}
/* 第 3 步辅助：会导致危害类别算不动的数据（从组分基础数据推导，不写死） */
function wzBlockers(){
  var out=[];
  wz.formula.forEach(function(f){
    var p=clpSubstanceProfile(f.cas,(wz.project&&wz.project.date)||clpSystemToday()),e=p.effective,h=e.hazardMap||{};
    if(h.acuteOral&&(e.ateState!=='known'||!(e.ateValues.oral>0)))
      out.push({cas:f.cas,name:f.name||p.name||f.cas,k:'急性毒性 LD50 / ATE',v:'缺少可用 ATE',
        eff:'急性毒性（经口）无法执行 ATE 加和，该项转人工判定'});
    if(h.aquaticChronic&&e.aquaticState==='unknown')
      out.push({cas:f.cas,name:f.name||p.name||f.cas,k:'水生慢性分类依据',v:'未归档急性毒性 / NOEC 实测依据',
        eff:'危害水生环境（长期）加和法输入依据不足 → 第 4 步转「待人工判断」'
            +'（本品为 Chronic '+h.aquaticChronic+'，按 Annex I 表 4.1.3 不适用 M 因子）'});
  });
  return out;
}
function wzToggleAll(){
  var box=$('wzAllData'),btn=$('wzAllBtn');
  if(!box)return;
  var on=box.style.display!=='none';
  box.style.display=on?'none':'';
  if(btn)btn.textContent=on?'查看全部汇集数据 ▾':'收起全部汇集数据 ▴';
}
function renderStep3(){
  if(!wz.collected)wzCollectData();
  var evaluation=complianceEvaluationEnsure();
  var total=0,miss=wzMissCount(),bySrc={lab:0,sup:0,reg:0,pub:0,man:0};
  Object.keys(wz.collect).forEach(function(c){wz.collect[c].forEach(function(i){total++;if(!i.miss)bySrc[i.src]++;});});
  var pct=total?Math.round((total-miss)/total*100):0;
  /* 低可信度：仅由 PubChem 辅助来源提供，不能单独作为合规依据 */
  var pubOnly=[];
  Object.keys(wz.collect).forEach(function(c){
    wz.collect[c].forEach(function(i){if(!i.miss&&i.src==='pub')pubOnly.push({cas:c,k:i.k,v:i.v});});
  });
  var missList=[];
  Object.keys(wz.collect).forEach(function(c){
    wz.collect[c].forEach(function(i){if(i.miss)missList.push({cas:c,k:i.k});});
  });
  var blockers=wzBlockers();
  var conflicts=CONFLICT_MOCK.filter(function(x){
    return wz.formula.some(function(f){return f.cas===x.cas;});
  });
  var pending=miss+pubOnly.length+conflicts.length+blockers.length;

  function casName(cas){
    var f=wz.formula.filter(function(x){return x.cas===cas;})[0];
    return (f&&f.name)||clpSubstanceProfile(cas,(wz.project&&wz.project.date)||clpSystemToday()).name||cas;
  }
  function row(cols,cls){
    return '<tr'+(cls?' class="'+cls+'"':'')+'>'+cols.map(function(c){return '<td>'+c+'</td>';}).join('')+'</tr>';
  }
  function kpi(label,val,sub,color){
    return '<div class="kpi"><span>'+label+'</span><b'+(color?' style="color:'+color+'"':'')+'>'+val+'</b><small>'+sub+'</small></div>';
  }
  /* ---------- 区块 1：缺失数据 ---------- */
  var missHtml=missList.length
    ? '<div class="tbl-wrap"><table class="tbl mini"><thead><tr>'
      +'<th style="width:150px">组分</th><th style="width:170px">数据项</th><th>当前值</th>'
      +'<th style="width:110px">状态</th><th style="width:96px">操作</th></tr></thead><tbody>'
      +missList.map(function(m){
        var idx=DATA_ITEMS.indexOf(m.k);
        return row([esc(casName(m.cas))+'<br><small class="muted">CAS '+esc(m.cas)+'</small>',
          kTerm(m.k),'<span style="color:var(--red)">未获取到数据</span>',
          '<span class="tag orange dot-tag">待补充</span>',
          clpCollectControlled(idx)
            ?'<button class="btn sm" onclick="'+(idx===8?'showPage(\'law:clp\')':'gotoCompFill(\''+esc(m.cas)+'\')')+'">'+(idx===8?'查看 CLP':'去组分库')+'</button>'
            :'<button class="btn sm" onclick="fillData(\''+esc(m.cas)+'\','+idx+')">补充</button>']);
      }).join('')
      +'</tbody></table></div>'
    : '<div class="notice ok" style="margin-bottom:10px"><div class="ni">✓</div><div>无缺失数据项。</div></div>';
  /* ---------- 区块 2：仅辅助来源 ---------- */
  var pubHtml=pubOnly.length
    ? '<div class="tbl-wrap"><table class="tbl mini"><thead><tr>'
      +'<th style="width:150px">组分</th><th style="width:170px">数据项</th><th>当前值</th>'
      +'<th style="width:120px">来源类型</th><th style="width:190px">依据</th><th style="width:96px">操作</th></tr></thead><tbody>'
      +pubOnly.map(function(p){
        var idx=DATA_ITEMS.indexOf(p.k);
        return row([esc(casName(p.cas)),kTerm(p.k),esc(p.v),
          '<span class="tag grey">PubChem 辅助</span>',
          '<span class="muted">'+esc(wzEvidence(p.cas,'pub'))+'</span>',
          '<button class="btn sm" onclick="fillData(\''+p.cas+'\','+idx+')">核对</button>']);
      }).join('')
      +'</tbody></table></div>'
      +'<div class="src-note"><span class="tag grey">提示</span>辅助来源仅可用于交叉核对，不能作为第 2 / 11 章的合规依据；存在更高优先级来源时不得采用。</div>'
    : '<div class="notice ok" style="margin-bottom:10px"><div class="ni">✓</div><div>没有仅依赖辅助来源的数据项。</div></div>';
  /* ---------- 区块 3：多来源冲突 ---------- */
  var confHtml=conflicts.length
    ? '<div class="tbl-wrap"><table class="tbl mini"><thead><tr>'
      +'<th style="width:150px">组分</th><th style="width:170px">数据项</th><th>来源 A（采用）</th><th>来源 B（未采用）</th><th style="width:96px">操作</th></tr></thead><tbody>'
      +conflicts.map(function(x){
        var idx=DATA_ITEMS.indexOf(x.k);
        return row([esc(casName(x.cas)),kTerm(x.k),
          '<b>'+esc(x.a[0])+'</b><br><span class="tag '+SRC_META[x.a[1]].cls+'">'+SRC_META[x.a[1]].t+'</span>',
          esc(x.b[0])+'<br><span class="tag '+SRC_META[x.b[1]].cls+'">'+SRC_META[x.b[1]].t+'</span>',
          '<button class="btn sm" onclick="fillData(\''+x.cas+'\','+idx+')">复核</button>'])
          +'<tr><td><small class="muted">处理口径</small></td><td colspan="4" style="color:var(--ink2)">'+esc(x.note)+'</td></tr>';
      }).join('')
      +'</tbody></table></div>'
    : '<div class="notice ok" style="margin-bottom:10px"><div class="ni">✓</div><div>未发现多来源冲突。</div></div>';
  /* ---------- 区块 4：影响分类计算 ---------- */
  var blkHtml=blockers.length
    ? '<div class="tbl-wrap"><table class="tbl mini"><thead><tr>'
      +'<th style="width:150px">组分</th><th style="width:170px">缺失数据项</th><th>当前情况</th>'
      +'<th>影响的危害类别</th><th style="width:96px">操作</th></tr></thead><tbody>'
      +blockers.map(function(b){
        return row([esc(b.name),kTerm(b.k),'<span style="color:var(--orange)">'+esc(b.v)+'</span>',
          esc(b.eff),'<button class="btn sm" onclick="gotoCompFill(\''+b.cas+'\')">去组分库补录</button>']);
      }).join('')
      +'</tbody></table></div>'
      +'<div class="src-note"><span class="tag orange">说明</span>这类缺失不会由系统臆测填值 —— 对应危害类别在第 4 步会落到「待人工判断」。</div>'
    : '<div class="notice ok" style="margin-bottom:10px"><div class="ni">✓</div><div>所有危害类别所需的参数均已具备，可直接进行分类计算。</div></div>';
  /* ---------- 全部汇总数据（默认收起） ---------- */
  var allCards=wz.formula.map(function(f){
    var items=wz.collect[f.cas]||[];
    var rows=items.map(function(it,idx){
      var meta=SRC_META[it.src];
      return '<div class="dl-row"><span class="k">'+kTerm(it.k)+'</span>'
        +'<span class="v'+(it.miss?' miss':'')+'">'+(it.miss?'待补充':esc(it.v))+'</span>'
        +'<span class="muted" style="font-size:11.5px">'+esc(wzEvidence(f.cas,it.src))+'</span>'
        +(it.miss
          ? '<button class="btn sm" onclick="fillData(\''+f.cas+'\','+idx+')">补充</button>'
          : '<span class="tag '+meta.cls+'">'+meta.t+'</span><button class="btn-link" style="margin-left:2px" onclick="fillData(\''+f.cas+'\','+idx+')">修改</button>')
        +'</div>';
    }).join('');
    var mn=items.filter(function(i){return i.miss;}).length;
    return '<div class="comp-card"><div class="comp-hd"><b>'+esc(f.name)+'</b><span class="cas">CAS '+esc(f.cas)+'</span>'
      +(f.secret?'<span class="tag purple">保密组分</span>':'')
      +'<span class="right"><button class="btn sm '+(mn?'warn':'')+'" onclick="fillBatch(\''+f.cas+'\')">▤ 批量补充'+(mn?'（'+mn+'）':'')+'</button>'
      +(mn?'':'<span class="tag green dot-tag">数据齐套</span>')+'</span></div>'
      +'<div class="dl">'+rows+'</div></div>';
  }).join('');

  wzGuide('<div class="notice info"><div class="ni">i</div><div><b>第 3 步 · 数据准备检查</b>'
    +'系统按数据优先级取数：<b style="display:inline">实测报告 &gt; 供应商 SDS &gt; 法规库数据 &gt; PubChem 辅助资料</b>。'
    +'高优先级来源存在时不会被低优先级静默覆盖；缺失数据不会由系统编造。'
    +'<br>此处<b style="display:inline">默认只显示需要处理的项目</b>（缺失 / 仅辅助来源 / 多来源冲突 / 会导致危害类别算不动），完整数据在下方「查看全部汇集数据」中展开。</div></div>');

  $('wzBody').innerHTML=
    '<div class="kpi-row">'
      +kpi('配方组分数量',wz.formula.length,'来自冻结配方快照')
      +kpi('已自动获取数据项',total-miss,'共 '+total+' 项')
      +kpi('待补充项',miss,miss?'需人工补充':'已全部补齐',miss?'var(--orange)':'var(--green)')
      +kpi('待确认 / 低可信度项',pubOnly.length+conflicts.length,'仅辅助来源 '+pubOnly.length+' · 来源冲突 '+conflicts.length,(pubOnly.length+conflicts.length)?'var(--orange)':'')
      +kpi('是否满足分类计算条件',blockers.length?'不满足':'满足',blockers.length?(blockers.length+' 项参数缺失'):'所需参数齐全',blockers.length?'var(--red)':'var(--green)')
    +'</div>'
    +'<div class="card"><div class="card-hd"><h3>数据准备检查 · 异常优先</h3>'
      +'<span class="sub">默认只展示需要处理的项目，共 '+pending+' 项</span>'
      +'<div class="right">'
        +'<button class="btn sm" onclick="supSdsImport()">⬆ 导入供应商 SDS</button>'
        +'<button class="btn sm" onclick="reCollect()">重新汇集</button>'
      +'</div></div>'
      +'<div class="card-bd">'
        +'<div class="sub-hd">① 缺失数据<span class="tag '+(missList.length?'red':'green')+'">'+missList.length+' 项</span>'
      +(missList.some(function(x){var i=DATA_ITEMS.indexOf(x.k);return !clpCollectControlled(i)&&DEMO_FILL.collect[x.k];})
        ?'<button class="btn sm" style="margin-left:8px" onclick="wzFillDemo(1)">'
          +(missList.some(function(x){return clpCollectControlled(DATA_ITEMS.indexOf(x.k));})?'一键填充非 CLP 演示数据':'一键填充演示数据')+'</button>':'')+'</div>'+missHtml
        +'<div class="sub-hd">② 仅辅助来源的数据<span class="tag '+(pubOnly.length?'orange':'green')+'">'+pubOnly.length+' 项</span></div>'+pubHtml
        +'<div class="sub-hd">③ 多来源冲突<span class="tag '+(conflicts.length?'orange':'green')+'">'+conflicts.length+' 项</span></div>'+confHtml
        +'<div class="sub-hd">④ 会导致危害类别无法计算的数据<span class="tag '+(blockers.length?'red':'green')+'">'+blockers.length+' 项</span>'
      +(blockers.length?'<button class="btn sm" style="margin-left:8px" onclick="wzFillDemo(4)">一键补充演示数据</button>':'')+'</div>'+blkHtml
      +'</div></div>'
    +'<div class="card"><div class="card-hd"><h3>全部汇集数据</h3>'
      +'<span class="sub">按组分维度展示，标签颜色代表数据来源优先级</span>'
      +'<div class="right"><button class="btn sm" id="wzAllBtn" onclick="wzToggleAll()">查看全部汇集数据 ▾</button></div></div>'
      +'<div class="card-bd"><div id="wzAllData" style="display:none"><div class="comp-grid">'+allCards+'</div></div></div></div>'
    +complianceEvaluationStep3Html(evaluation);
}
/* 「一键补录」—— 按 DEMO_FILL 模拟人工补齐，之后第 4 步结论必须重算 */
function wzFillDemo(kind){
  var n=0,why=[];
  if(kind===1){
    Object.keys(wz.collect||{}).forEach(function(cas){
      (wz.collect[cas]||[]).forEach(function(it){
        if(!it.miss||clpCollectControlled(DATA_ITEMS.indexOf(it.k)))return;
        var d=DEMO_FILL.collect[it.k]; if(!d)return;
        it.v=d[0];it.src=d[1];it.ref=d[2];it.miss=false;n++;
        var ff=wz.formula.filter(function(x){return x.cas===cas;})[0];
        why.push(((ff&&ff.name)||clpSubstanceProfile(cas,(wz.project&&wz.project.date)||clpSystemToday()).name||cas)+' · '+it.k);
      });
    });
  } else if(kind===4){
    (wzBlockers()||[]).forEach(function(b){
      if(b.k!=='水生慢性分类依据')return;
      var d=DEMO_FILL.aqua[b.cas],p=clpSupplementalGet(b.cas);
      if(!d||!p)return;
      clpSupplementalUpsert(b.cas,{lc50:d.lc50,noec:d.noec,aquaticState:'known',aqRef:d.ref},
        {sourceType:'enterprise-supplement',sourceRef:d.ref,by:'演示补录'});n++;
      why.push((b.name||b.cas)+' · 水生毒性来源依据');
    });
  }
  if(!n){toast('当前没有可补录的项目','info');return;}
  /* 基础数据变了 → 第 4 步结论必须重算，否则拿的还是旧快照 */
  wz.classItems=null;wz.classPack=null;
  renderStep3();wzUpdateFoot();
  toast('已按演示数据源补录 '+n+' 项'+(why.length?'：'+why.slice(0,2).join('；')+(why.length>2?' 等':''):''),'ok');
}
function reCollect(){
  wz.collected=false;wz.collect={};
  toast('正在重新汇集受控数据…','info');
  setTimeout(function(){renderStep3();wzUpdateFoot();toast('数据汇集完成','ok');},700);
}
/* 手动补充缺失数据 */
var SUGGEST={
  '闪点 / 沸点':'闪点 51 ℃（闭杯法 ISO 2719）/ 沸点 141 ℃',
  '急性毒性 LD50':'LD50 2100 mg/kg（大鼠经口，OECD 423）',
  '严重眼损伤/刺激':'刺激 类别2（OECD 405 体内试验）',
  '水生急性毒性':'EC50 48h 溞类 78 mg/L（OECD 202）',
  '职业接触限值 OEL':'2 mg/m³（8h TWA，供应商推荐值）'
};
function fillData(cas,idx){
  if(clpCollectControlled(idx)){if(idx===8)showPage('law:clp');else gotoCompFill(cas);return;}
  var it=wz.collect[cas][idx];
  var f=wz.formula.filter(function(x){return x.cas===cas;})[0]||{name:''};
  var g=FIELD_GUIDE[it.k];
  openModal({title:(it.miss?'补充':'修改')+'数据项 · '+it.k,width:520,
    body:'<div class="notice grey" style="margin-bottom:14px"><div class="ni">i</div><div>组分 <b>'+esc(f.name)+'</b>（CAS '+esc(cas)+'）· 数据项 <b>'+esc(it.k)+'</b></div></div>'
      +(g?'<div class="notice '+(g.g==='green'?'ok':'warn')+'" style="margin-bottom:14px"><div class="ni">ⓘ</div><div><b>填写指引</b>'+esc(g.t)+'。数据源优先级：实测报告 &gt; 供应商 SDS &gt; 法规库 &gt; 估算（估算需注明）。</div></div>':'')
      +'<div class="form-grid one">'
      +'<div class="field"><label class="req">数据内容</label><textarea class="ctrl" id="fdVal" placeholder="请输入数据内容">'+esc(it.miss?(SUGGEST[it.k]||''):it.v)+'</textarea><span class="help">建议引用测试方法/标准编号，便于后续追溯；允许重复修改</span></div>'
      +'<div class="field"><label class="req">数据来源</label><select class="ctrl" id="fdSrc"><option value="lab" '+(it.src==='lab'?'selected':'')+'>实测报告（最高优先级）</option><option value="sup" '+(it.src==='sup'?'selected':'')+'>供应商 SDS</option><option value="reg" '+(it.src==='reg'?'selected':'')+'>法规库数据</option><option value="man" '+((it.miss||it.src==='man')?'selected':'')+'>人工补充</option></select></div>'
      +'<div class="field"><label>报告 / 依据编号</label><input class="ctrl" id="fdRef" value="'+esc(it.ref||('TR-2026-'+(1000+idx)))+'"></div>'
      +'</div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="fillDataSave(\''+cas+'\','+idx+')">确认保存</button>'});
}
/* [反馈#3/#5] 批量补充：表格形式集中填写缺失项，已填项可一并修改 */
function fillBatch(cas){
  var f=wz.formula.filter(function(x){return x.cas===cas;})[0]||{name:''};
  var items=wz.collect[cas]||[];
  var rows=items.map(function(it,idx){
    var g=FIELD_GUIDE[it.k];
    return '<tr'+(it.miss?' style="background:var(--red-bg)"':'')+'>'
      +'<td class="it-name">'+esc(it.k)+' '+(g?'<span class="tag '+g.g+'" title="'+esc(g.t)+'" style="cursor:help">ⓘ</span>':'')+'</td>'
      +'<td style="max-width:200px">'+(it.miss?'<span style="color:var(--red);font-weight:600">待补充</span>':esc(it.v)+((it.ref&&!it.miss)?'<br><small style="color:var(--muted)">编号 '+esc(it.ref)+'</small>':'')+'<br><span class="tag '+SRC_META[it.src].cls+'">'+SRC_META[it.src].t+'</span>')+'</td>'
      +'<td>'+(clpCollectControlled(idx)?'<span class="muted">CLP 数据请到法规库或组分库维护</span>':'<input class="ctrl" style="height:30px;width:100%" id="bt_'+idx+'" placeholder="'+(it.miss?esc(SUGGEST[it.k]||'填写数据内容'):'留空则不修改')+'">')+'</td></tr>';
  }).join('');
  openModal({title:'批量补充 / 修改数据 · '+f.name,width:760,
    body:'<div class="notice info" style="margin-bottom:12px"><div class="ni">i</div><div>组分 <b>'+esc(f.name)+'</b>（CAS '+esc(cas)+'）· 红色行为缺失项。填写指引见每行 ⓘ 悬停说明；<b style="display:inline">已补充的数据可反复修改</b>，留空的行保持原值不变。数据源默认记为「人工补充」。</div></div>'
      +'<div class="tbl-wrap batch-tbl"><table class="tbl"><thead><tr><th style="width:150px">数据项</th><th style="width:220px">当前内容</th><th>填写 / 修改（留空不改）</th></tr></thead><tbody>'+rows+'</tbody></table></div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="fillBatchSave(\''+cas+'\')">保存全部填写项</button>'});
}
function fillBatchSave(cas){
  var n=0;
  (wz.collect[cas]||[]).forEach(function(it,idx){
    var el=$('bt_'+idx);if(!el)return;
    var v=el.value.trim();
    if(v){it.v=v;it.src='man';it.miss=false;it.ref=it.ref||('TR-'+todayStr().replace(/-/g,''));n++;}
  });
  closeModal();
  if(!n){toast('未填写任何内容，数据未变化','info');return;}
  renderStep3();wzUpdateFoot();
  toast('已保存 '+n+' 项数据，可随时再次调整','ok');
}
function fillDataSave(cas,idx){
  if(clpCollectControlled(idx)){toast('CLP 分类参数请到法规库或组分库维护','warn');return;}
  var v=$('fdVal').value.trim();
  if(!v){toast('请填写数据内容','warn');return;}
  var it=wz.collect[cas][idx];
  it.v=v;it.ref=$('fdRef').value.trim();it.src=$('fdSrc').value;it.miss=false;
  closeModal();renderStep3();wzUpdateFoot();
  toast('已保存「'+it.k+'」数据，可随时再次修改','ok');
}

/* ------------------------------------------------------------------
   [反馈#1] 术语解释：静态术语表 + 悬停气泡 + 问 AI 入口
   ------------------------------------------------------------------ */
var GLOSSARY={
  'GHS':'全球化学品统一分类和标签制度（Globally Harmonized System）。联合国制定的统一标准，把化学品的危险分成物理危险、健康危害、环境危害三大类，SDS 第 2 章的分类和标签都按它编写。',
  'CLP':'欧盟《化学品分类、标签和包装法规》(EC) No 1272/2008，是 GHS 在欧盟的落地版本。附件 VI 收录了欧盟统一分类的物质清单，是欧盟市场 SDS 分类的权威依据。',
  'H 短语':'危险说明（Hazard Statement)，以 H 开头的标准短语（如 H315 造成皮肤刺激），描述化学品的危险性质。每种危险类别对应固定的 H 短语，不能自创。',
  '防范说明':'P 语句（Precautionary Statement），以 P 开头的标准短语（如 P280 戴防护手套），说明储存、使用、应急处置时的防范措施。',
  '警示词':'SDS 标签上的信号词，只有两个：「危险」(Danger) 和「警告」(Warning)。程度更重的类别用「危险」，较轻的用「警告」。',
  '象形图':'GHS 规定的菱形红色边框图形（如腐蚀、感叹号、火焰），直观提示危险类型，会同时印在标签和 SDS 第 2 章。',
  'LD50':'半数致死量（Lethal Dose 50%），一次性摄入后导致 50% 实验动物死亡的剂量，数值越小毒性越强。是判断急性毒性类别的核心数据。',
  'LC50':'半数致死浓度（Lethal Concentration 50%），吸入途径下导致 50% 实验动物死亡的浓度，用于吸入急性毒性分类。',
  '闪点':'可燃液体蒸气遇明火发生闪燃的最低温度。闪点越低越易燃：<23℃ 为易燃类别 1/2，23~60℃ 为类别 3。是运输和储存分级的依据。',
  '沸点':'液体沸腾时的温度。与闪点一起判断易燃类别（如闪点<23℃ 且沸点≤35℃ 为类别 1）。',
  '加和法':'混合物分类的常用计算方法：把各组分的浓度按类别加权求和（如 10×Σ(类别1)+Σ(类别2)），与法规限值比较后得出混合物类别。适用于皮肤/眼刺激、水生毒性等。',
  '统一分类':'欧盟 CLP 附件 VI 收录的官方分类结论。已收录物质必须直接采用，企业不得自行改判，纯物质分类直接查表即可。',
  '浓度限值':'法规规定的触发分类的最低浓度（如致癌 1B ≥ 0.1%、生殖毒性 Cat.2 ≥ 3%）。组分浓度达到限值，混合物即判为该类别。',
  'STOT':'特异性靶器官毒性（Specific Target Organ Toxicity），指反复或单次接触后对特定器官（如呼吸道、肝脏）造成的伤害，分 SE 一次接触 / RE 反复接触。',
  'SVHC':'高关注度物质候选清单（REACH 候选清单）。组分含量 > 0.1% 时企业须履行信息传递义务，可能最终列入授权清单。',
  'M 因子':'乘数因子（Multiplying factor）。只适用于已分类为 Aquatic Acute 1 或 Aquatic Chronic 1 的物质，用于放大高毒性水生组分在加和法中的权重（M=10 时 1% 按 10% 计算）。急性与慢性各有一个值，通常按实测 L(E)C50 / NOEC 换算得出，或直接采用 CLP 附件 VI 表 3.1 的法定值。',
  'SCL':'特定浓度限值（Specific Concentration Limit）。法规为某些物质单独设定的分类触发浓度，优先于通用浓度限值：低于 SCL 即可免于分类。未设定 SCL 的物质按通用浓度限值执行。',
  'EUH':'欧盟补充危害说明（EU Hazard Statement），以 EUH 开头的短语，是欧盟在 GHS 之外额外要求的危害说明，与 H 语句并列印在标签上。例如 EUH066 重复接触导致皮肤干裂、EUH380 可能干扰内分泌、EUH450 可长期广泛污染水资源。',
  '搭桥原则':'混合物无整体数据时，用类似已测混合物的数据推导分类的简化方法（bridging principles），可替代加和法计算。',
  'ATE':'急性毒性估计值（Acute Toxicity Estimate），混合物按组分浓度加权计算出的等效 LD50/LC50，用于混合物急性毒性分类。',
  'OEL':'职业接触限值（Occupational Exposure Limit），工人在工作场所允许接触的浓度上限（8 小时时间加权平均值），写进 SDS 第 8 章。',
  'REACH':'欧盟《化学品注册、评估、授权和限制法规》(EC) No 1907/2006。规定 SDS 格式（附件 II）、SVHC 义务、限制清单等，是欧盟市场最核心的化学品法规。',
  '致敏':'接触后引发过敏反应的性质，分呼吸道致敏（吸入过敏）和皮肤致敏（接触过敏）。混合物无统一浓度限值，需个案评估，故常标注待人工判定。',
  'PCN':'毒物中心通告（Poison Centres Notification），欧盟市场消费品需向成员国毒物中心提交通告，成员国选择影响本地要求。'
};
function term(t){
  var g=GLOSSARY[t];
  if(!g)return esc(t);
  return '<span class="term">'+esc(t)+'<i class="q">?</i>'
    +'<span class="tp"><span class="tt">'+esc(t)+'</span>'+esc(g)
    +'<div class="ai-link"><button class="btn sm" onclick="event.stopPropagation();aiAsk(\''+esc(t).replace(/'/g,'')+'\')">🤖 问 AI 助手</button></div>'
    +'</span></span>';
}
/* 数据项名称 → 术语包装（第 3 步卡片标签） */
var K_TERMS={'闪点 / 沸点':'闪点','急性毒性 LD50':'LD50','职业接触限值 OEL':'OEL','水生急性毒性':'LC50','致癌性分类':'STOT'};
function kTerm(k){
  var t=K_TERMS[k];
  return t?term(t):esc(k);
}
/* 问 AI：演示版智能助手（正式版接入大模型，对应升级需求 P1-⑨） */
function aiAsk(t){
  openModal({title:'智能助手 · 术语问答',width:520,
    body:'<div style="display:flex;gap:10px;margin-bottom:12px">'
      +'<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#4d9bf0,#1a5fb4);color:#fff;display:grid;place-items:center;font-size:13px;flex-shrink:0">🤖</div>'
      +'<div style="background:var(--brand-l);border:1px solid var(--brand-b);border-radius:8px;padding:9px 12px;font-size:13px">业务人员提问：请解释一下「'+esc(t)+'」是什么意思？</div></div>'
      +'<div style="display:flex;gap:10px"><div style="width:28px;height:28px;border-radius:50%;background:var(--grey-bg);border:1px solid var(--grey-b);color:var(--brand);display:grid;place-items:center;font-size:13px;flex-shrink:0">AI</div>'
      +'<div id="aiAns" style="flex:1;border:1px solid var(--line);border-radius:8px;padding:10px 12px;font-size:12.8px;line-height:1.8;color:var(--ink2)">正在思考…</div></div>'
      +'<div class="notice grey" style="margin-top:12px"><div class="ni">i</div><div>演示环境为预置应答；正式版将接入大模型（升级需求 P1-⑨ AI 自然语言问答），可就当前 SDS 上下文连续追问。</div></div>',
    footer:'<button class="btn" onclick="closeModal()">关闭</button>'});
  setTimeout(function(){
    var el=$('aiAns');if(!el)return;
    el.innerHTML='<b style="color:var(--brand)">'+esc(t)+'</b><br>'+esc(GLOSSARY[t]||'该术语暂未收录，正式版可实时检索法规库回答。');
  },900);
}

/* ------------------------------------------------------------------
   [反馈#4] 人工补充数据填写指引：必填性 / 无数据合法性 / 数据源优先级
   ------------------------------------------------------------------ */
var FIELD_GUIDE={
  '物理状态/外观':{g:'green',t:'必填 · 可按实测观察填写，不可填「无数据」'},
  '闪点 / 沸点':{g:'orange',t:'优先实测；无实测时可用供应商值或估算值（需注明「估算」）'},
  '急性毒性 LD50':{g:'orange',t:'可引用供应商 SDS / 权威数据库；确无数据可填「无数据」，但需 EHS 确认'},
  '皮肤腐蚀/刺激':{g:'green',t:'建议实测或供应商 SDS；填「无数据」需 EHS 确认并留痕'},
  '严重眼损伤/刺激':{g:'green',t:'建议实测或供应商 SDS；填「无数据」需 EHS 确认并留痕'},
  '致癌性分类':{g:'green',t:'以法规库统一分类为准，一般无需人工填写'},
  '水生急性毒性':{g:'orange',t:'可引用文献/PubChem 数据；填「无数据」时草案第 12 章需说明'},
  '职业接触限值 OEL':{g:'orange',t:'按目标市场法规值填写；确无限值可填「未设立」，不建议填「无数据」'},
  '法规清单命中':{g:'green',t:'以法规库自动比对结果为准，一般无需人工填写'}
};
function guideTag(k){
  var g=FIELD_GUIDE[k];if(!g)return '';
  return '<span class="tag '+g.g+'" title="'+esc(g.t)+'" style="cursor:help">ⓘ 指引</span>';
}

/* ------------------------------------------------------------------
   [反馈#9] 配方 Excel 导入（占位演示：不做真实解析）
   ------------------------------------------------------------------ */
function fmImportExcel(){
  openModal({title:'Excel 批量导入配方',width:560,
    body:'<div class="notice info" style="margin-bottom:12px"><div class="ni">i</div><div>适用于<b>色浆等多组分产品线</b>：先下载固定模板，在 Excel 中维护组分、比例与 CAS 号后一次性导入，替代逐行手工录入。</div></div>'
      +'<div class="card" style="box-shadow:none;margin-bottom:12px"><div class="card-hd"><h3>导入模板字段（固定列，不可改动顺序）</h3></div><div class="card-bd tight"><table class="tbl"><thead><tr><th>列序</th><th>字段</th><th>说明</th></tr></thead><tbody>'
      +'<tr><td>1</td><td>组分名称</td><td>必填，与物料库标准名称一致时自动关联</td></tr>'
      +'<tr><td>2</td><td>CAS 号</td><td>必填，导入时自动带出物质信息</td></tr>'
      +'<tr><td>3</td><td>浓度(%)</td><td>必填，数字，合计须为 100</td></tr>'
      +'<tr><td>4</td><td>是否保密组分</td><td>填「是/否」，默认「否」</td></tr>'
      +'</tbody></table></div></div>'
      +'<div class="notice grey"><div class="ni">i</div><div><b>演示环境提示</b>本原型暂未开放真实文件解析；正式版支持 .xlsx 上传、逐行校验（CAS 合法性 / 合计校验 / 重复组分）后批量写入配方表。</div></div>',
    footer:'<button class="btn" onclick="toast(\'模板下载将在正式版提供（演示）\',\'info\')">下载空白模板</button><button class="btn primary" onclick="closeModal();toast(\'演示环境暂未开放真实导入，正式版支持模板解析\',\'warn\')">选择文件并导入</button>'});
}
/* [反馈#10] 供应商 SDS 导入（占位演示） */
function supSdsImport(){
  toast('演示提示：正式版支持上传供应商 SDS 文件，解析后自动关联 CAS 组分入库','info');
}

/* ------------------------------------------------------------------
   步骤 4：查看分类建议与证据（可追溯 / 待人工判定 / 手动调整）
   ------------------------------------------------------------------ */
/* ---------- B4 + M 因子专项：CLP 加和法三参数（组分库可维护） ----------
   这三个参数是混合物分类计算的必要输入，缺任何一项加和法都算不动。
      SCL  特定浓度限值：低于该浓度不按该危害类别分类
      M    乘数因子：放大高水生毒性组分的权重（M=10 时 1% 按 10% 参与加和）
      ATE  急性毒性估计值：按浓度加权算混合物等效 LD50 / LC50

   数据的唯一维护入口是组分基础数据（bd:comp）的「分类参数」分区。
   SDS 向导里只读引用，缺值时引导回组分库补录 —— 不允许在编制 SDS 时就地手填：
   这三个值直接决定分类结论，随手填会把法规依据覆盖掉。

   毒性数据状态四态（ateState / aqState）：
      known        有可用数据，可参与加和法
      unknown      无数据（未做过试验 / 供应商未提供）→ 计入第 3 / 11 章未知声明
      na           经评估不适用（已确认不达分类阈值）→ 不计入未知声明
      unmaintained 组分库里没有这个物质 → 计入未知声明 + 报错引导补录
   na 与 unknown 的差别很关键：前者是「已确认没有危害」，后者是「不知道有没有危害」，
   两者法规声明口径完全不同，合并成一个布尔值会让声明虚高。

   ate 是可读展示串，ateO / ateD / ateI 是参与加和法计算的数值，
   两者由同一个表单写入（自检校验它们互相一致，见 smoke_mfactor.py）。 */
var COMP_CLP={}; /* 仅由 clpCompProjection() 刷新 */
/* ---------- M 因子推导器 ----------
   急性：以 L(E)C50（mg/L）计，≤ 1 起算，每降低 10 倍 M ×10
   慢性：以 NOEC（mg/L）计，≤ 0.1 起算，每降低 10 倍 M ×10
   返回 0 = 不适用（未达 Acute 1 / Chronic 1 阈值，该组分不使用 M 因子） */
function mAcute(v){
  v=parseFloat(v);
  if(!(v>0)||v>1)return 0;
  var k=0;
  while(v<=Math.pow(10,-(k+1))&&k<6)k++;
  return Math.pow(10,k);
}
function mChronic(v){
  v=parseFloat(v);
  if(!(v>0)||v>0.1)return 0;
  var k=0;
  while(v<=Math.pow(10,-(k+2))&&k<6)k++;
  return Math.pow(10,k);
}
/* M 因子来源（悬停展示用） */
var M_SRC={'':'未指定','annex6':'CLP Annex VI 表 3.1 法定值','sup':'供应商 SDS 第 3 章',
  'calc':'企业自测数据换算','exp':'专家判定'};
/* 毒性数据四态：标签文案 + 配色 + 是否计入未知声明 */
var TOX_STATE={
  known:        {t:'有数据',  c:'green',  unk:false},
  unknown:      {t:'数据未知',c:'orange', unk:true},
  na:           {t:'不适用',  c:'grey',   unk:false},
  unmaintained: {t:'未维护',  c:'red',    unk:true}
};
/* 千分位用窄空格，与法规文档排版一致 */
function fmtNum(n){
  var s=String(n),i=s.indexOf('.'),h=i<0?s:s.slice(0,i),t=i<0?'':s.slice(i);
  return h.replace(/\B(?=(\d{3})+(?!\d))/g,' ')+t;
}
/* 由三个数值拼 ATE 展示串（与手写 ate 串互为校验） */
function ateTxt(p){
  var a=[];
  if(p.ateO>0)a.push('经口 '+(p.ateOralQualifier||'')+fmtNum(p.ateO)+' mg/kg');
  if(p.ateD>0)a.push('经皮 '+fmtNum(p.ateD)+' mg/kg');
  if(p.ateI>0)a.push('吸入 '+fmtNum(p.ateI)+' mg/L');
  return a.length?a.join('｜')+(p.ateNote?'（'+p.ateNote+'）':''):'—';
}
/* 取某组分的分类参数视图（SDS 侧只读入口）
   组分库里没有该物质 → 全部返回 unmaintained，由调用方引导去补录 */
function clpParamOf(cas){
  var profile=clpSubstanceProfile(cas,(wz.project&&wz.project.date)||clpSystemToday());
  var e=profile.effective,s=profile.supplemental;
  var p=profile.officialRecords.length||s?{
    name:profile.name,uni:clpDataClassText(e.classifications),scl:e.specificLimits.map(clpDataLimitShortText).join('｜')||(e.specificLimitNote?'—（'+e.specificLimitNote+'）':'—'),
    mM:e.mFactors.acute,mC:e.mFactors.chronic,mSrc:e.mSource||'',lc50:e.lc50,noec:e.noec,
    ateO:e.ateValues.oral,ateD:e.ateValues.dermal,ateI:e.ateValues.inhalation,
    ateOralQualifier:e.ateOralQualifier,ateNote:e.ateNote,ateState:e.ateState,aqState:e.aquaticState
  }:null;
  if(!p)return{name:'—',uni:'未维护统一分类',scl:'—',m:'—',mM:0,mC:0,mSrc:'',mSrcTxt:'未指定',
    lc50:'',noec:'',ate:'—',ateO:0,ateD:0,ateI:0,
    ateState:'unmaintained',aqState:'unmaintained',ateKnown:false,aqKnown:false,raw:null};
  var mt=(p.mM>0?'急性 '+p.mM:'')+((p.mM>0&&p.mC>0)?' / ':'')+(p.mC>0?'慢性 '+p.mC:'');
  return{name:p.name,uni:p.uni||'—',scl:p.scl||'—',
    m:mt||'—',mM:p.mM||0,mC:p.mC||0,mSrc:p.mSrc||'',mSrcTxt:M_SRC[p.mSrc||'']||'未指定',
    lc50:p.lc50||'',noec:p.noec||'',
    ate:p.ateState==='na'?'—（经评估不适用急性毒性估算）':ateTxt(p),
    ateO:p.ateO,ateD:p.ateD,ateI:p.ateI,
    ateState:p.ateState||'unknown',aqState:p.aqState||'unknown',
    ateKnown:p.ateState==='known',aqKnown:p.aqState==='known',raw:p,dataVersion:profile.dataVersion,
    provenance:profile.provenance,conflicts:profile.conflicts};
}
/* 组分库列表：M 因子与毒性数据状态的可视化标签
   红色「未维护」= 该物质还没补录分类参数，SDS 里相关危害类别只能转人工判定 */
function clpMTag(cas){
  var q=clpParamOf(cas);
  if(!q.mM&&!q.mC)return '<span class="muted">—</span>';
  return '<span class="tag blue" title="来源：'+esc(q.mSrcTxt)+'">'+esc(q.m)+'</span>';
}
function toxTag(cas,kind){
  var q=clpParamOf(cas);
  var st=(kind==='aqState')?q.aqState:q.ateState;
  var d=TOX_STATE[st]||TOX_STATE.unknown;
  return '<span class="tag '+d.c+'">'+d.t+'</span>';
}
/* ---------- B5：未知毒性占比声明（法规强制的固定声明） ----------
   统计「无可用毒性数据」的组分浓度占比：
     acute   —— 急性毒性（经口 / 经皮 / 吸入）
     aquatic —— 水生环境危害
   注意：这声明的是「数据缺失」，不是「有危害」。

   只统计 unknown 与 unmaintained 两态：
     na 表示已经确认不适用（不达分类阈值），是「已知安全」而不是「未知」，
     计入会让声明虚高 —— 聚合物类组分多属此类。 */
function toxUnknown(q,kind){
  var st=(kind==='acute')?q.ateState:q.aqState;
  return !!(TOX_STATE[st]&&TOX_STATE[st].unk);
}
function unknownPct(kind){
  var sum=0;
  wz.formula.forEach(function(f){
    if(toxUnknown(clpParamOf(f.cas),kind))sum+=(parseFloat(f.conc)||0);
  });
  return sum;
}
function unknownNames(kind){
  return wz.formula.filter(function(f){
    return toxUnknown(clpParamOf(f.cas),kind);
  }).map(function(f){return f.name||f.cas;});
}
/* 生成法规要求的固定声明文本（中英对照） */
function unknownStmt(kind){
  var pct=unknownPct(kind),n=pct.toFixed(2).replace(/\.?0+$/,'');
  var ns=unknownNames(kind);
  if(kind==='acute'){
    return '未知急性毒性声明（REACH Annex II 强制固定声明）：\n'
      +'　· 本混合物中 '+n+' % 的组分急性毒性未知（经口 / 经皮 / 吸入）\n'
      +'　· "'+n+' % of the mixture consists of component(s) of unknown acute toxicity."\n'
      +(ns.length?'　· 涉及组分：'+ns.join('、'):'　· 全部组分均已维护急性毒性数据');
  }
  return '未知水生危害声明（REACH Annex II 强制固定声明）：\n'
    +'　· 本混合物中 '+n+' % 的组分对水生环境的危害未知\n'
    +'　· "'+n+' % of the mixture consists of component(s) of unknown hazards to the aquatic environment."\n'
    +(ns.length?'　· 涉及组分：'+ns.join('、'):'　· 全部组分均已维护水生毒性数据');
}
/* ---------- B6 收尾：ED / PMT 声明（CLP (EU) 2024/2865 强制） ----------
   法规要求该声明出现在 2.3 / 11.2 / 12.6 三处；即使判为不分类也不可省略。 */
function edStmt(where){
  var items=wz.classItems||[];
  var g=function(id){return items.filter(function(c){return c.id===id;})[0];};
  var ed=g('ed'),pmt=g('pmt');
  if(!ed&&!pmt)return '';
  var line=function(c){return c?(c.result+(c.code&&c.code!=='—'?'（'+c.code+'）':'')):'—';};
  return '内分泌干扰（ED）与 PMT/vPvM 声明（CLP (EU) 2024/2865 新增危害类别，强制）'
    +(where?' — 本节位置：'+where:'')+'：\n'
    +'　· 内分泌干扰（ED）：'+line(ed)+'\n'
    +'　· PMT / vPvM（持久·迁移·毒性）：'+line(pmt)+'\n'
    +'　· 依据：CLP (EU) 2024/2865；即使判为不分类，本声明亦不可省略';
}
/* ---------- B7：第 16 章 —— 分类推导方法与数据来源声明 ---------- */
function deriveMethod(c){
  var r=c.rule||'';
  if(c.status==='manual')return '专家判断（Expert judgement）';
  if(r.indexOf('加和法')>=0)return '加和法（Calculation method）';
  if(r.indexOf('通用浓度限值')>=0)return '加和法（Calculation method · 通用浓度限值）';
  if(r.indexOf('Annex VI')>=0)return '统一分类查表（Annex VI harmonised classification）';
  return '按法规判据推导';
}
function deriveTable(){
  var items=(wz.classItems||[]).filter(function(c){return c.status!=='pending';});
  if(!items.length)return '　（尚未生成分类结论）';
  return items.map(function(c){
    var srcs=(c.src||[]).map(function(s){return s[1];}).join(' + ')||'—';
    return '　· '+c.name+' —— '+c.result+'（'+c.code+'）\n'
      +'　　推导方法：'+deriveMethod(c)+'\n'
      +'　　判定依据：'+c.rule+'\n'
      +'　　数据来源：'+srcs
      +(c.status==='manual'&&c.note?'\n　　判定理由：'+c.note+'（'+c.noteAt+' · 张工）':'');
  }).join('\n');
}
/* ==================================================================
   G1 标签元素自动推导 + G7 第 16 章子条目 + G8 法规依据
   对照真实 SDS（CLP (EU) 2024/2865）补齐
   ================================================================== */
/* H 语句与 EUH 全文（CLP Annex III；EUH380/381/450/451 为 2024/2865 新增） */
var H_STMT={
  'H225':'Highly flammable liquid and vapour. / 高度易燃液体和蒸气。',
  'H300':'Fatal if swallowed. / 吞咽致命。',
  'H301':'Toxic if swallowed. / 吞咽会中毒。',
  'H302':'Harmful if swallowed. / 吞咽有害。',
  'H311':'Toxic in contact with skin. / 皮肤接触会中毒。',
  'H314':'Causes severe skin burns and eye damage. / 造成严重皮肤灼伤和眼损伤。',
  'H315':'Causes skin irritation. / 造成皮肤刺激。',
  'H317':'May cause an allergic skin reaction. / 可能导致皮肤过敏反应。',
  'H318':'Causes serious eye damage. / 造成严重眼损伤。',
  'H319':'Causes serious eye irritation. / 造成严重眼刺激。',
  'H330':'Fatal if inhaled. / 吸入致命。',
  'H335':'May cause respiratory irritation. / 可能引起呼吸道刺激。',
  'H336':'May cause drowsiness or dizziness. / 可能引起昏昏欲睡或眩晕。',
  'H340':'May cause genetic defects. / 可能导致遗传性缺陷。',
  'H341':'Suspected of causing genetic defects. / 怀疑会导致遗传性缺陷。',
  'H350':'May cause cancer. / 可能致癌。',
  'H351':'Suspected of causing cancer. / 怀疑会致癌。',
  'H360':'May damage fertility or the unborn child. / 可能对生育能力或胎儿造成伤害。',
  'H361':'Suspected of causing damaging fertility or the unborn child. / 怀疑对生育能力或胎儿造成伤害。',
  'H372':'Causes damage to organs through prolonged or repeated exposure. / 长期或重复接触会对器官造成伤害。',
  'H373':'May cause damage to organs through prolonged or repeated exposure. / 长期或重复接触可能对器官造成伤害。',
  'H400':'Very toxic to aquatic life. / 对水生生物毒性极大。',
  'H410':'Very toxic to aquatic life with long lasting effects. / 对水生生物毒性极大并具有长期持续影响。',
  'H411':'Toxic to aquatic life with long lasting effects. / 对水生生物有毒并具有长期持续影响。',
  'H412':'Harmful to aquatic life with long lasting effects. / 对水生生物有害并具有长期持续影响。',
  'H413':'May cause long lasting harmful effects to aquatic life. / 可能对水生生物造成长期持续的有害影响。',
  'EUH066':'Repeated exposure may cause skin dryness or cracking. / 重复接触可能导致皮肤干燥或开裂。',
  'EUH071':'Corrosive to the respiratory tract. / 对呼吸道有腐蚀性。',
  'EUH380':'May cause endocrine disruption in humans. / 可能对人体造成内分泌干扰。',
  'EUH381':'Suspected of causing endocrine disruption in humans. / 怀疑对人体造成内分泌干扰。',
  'EUH450':'Can cause long-lasting and diffuse contamination of water resources. / 可对水资源造成长期、广泛的污染。',
  'EUH451':'Can cause very long-lasting and diffuse contamination of water resources. / 可对水资源造成非常长期、广泛的污染。'
};
/* P 语句全文（CLP Annex IV） */
var P_STMT={
  'P201':'Obtain special instructions before use. / 使用前取得专用说明。',
  'P202':'Do not handle until all safety precautions have been read and understood. / 在阅读并明了所有安全防范措施之前切勿操作。',
  'P210':'Keep away from heat, hot surfaces, sparks, open flames and other ignition sources. No smoking. / 远离热源、热表面、火花、明火及其他点火源。禁止吸烟。',
  'P233':'Keep container tightly closed. / 保持容器密闭。',
  'P240':'Ground and bond container and receiving equipment. / 容器和接收设备接地/等势联接。',
  'P241':'Use explosion-proof electrical/ventilating/lighting equipment. / 使用防爆的电气/通风/照明设备。',
  'P242':'Use non-sparking tools. / 使用不产生火花的工具。',
  'P243':'Take action to prevent static discharges. / 采取措施防止静电放电。',
  'P260':'Do not breathe dust/fume/gas/mist/vapours/spray. / 不要吸入粉尘/烟/气体/烟雾/蒸气/喷雾。',
  'P261':'Avoid breathing dust/fume/gas/mist/vapours/spray. / 避免吸入粉尘/烟/气体/烟雾/蒸气/喷雾。',
  'P264':'Wash skin thoroughly after handling. / 作业后彻底清洗皮肤。',
  'P270':'Do not eat, drink or smoke when using this product. / 使用本产品时不要进食、饮水或吸烟。',
  'P271':'Use only outdoors or in a well-ventilated area. / 只能在室外或通风良好处使用。',
  'P272':'Contaminated work clothing should not be allowed out of the workplace. / 受沾染的工作服不得带出工作场所。',
  'P273':'Avoid release to the environment. / 避免释放到环境中。',
  'P280':'Wear protective gloves/protective clothing/eye protection/face protection. / 戴防护手套/穿防护服/戴防护眼罩/戴防护面具。',
  'P284':'In case of inadequate ventilation, wear respiratory protection. / 通风不足时，戴呼吸防护装置。',
  'P301+P310':'IF SWALLOWED: Immediately call a POISON CENTER/doctor. / 如误吞咽：立即呼叫中毒急救中心/医生。',
  'P301+P312':'IF SWALLOWED: Call a POISON CENTER/doctor if you feel unwell. / 如误吞咽：如感觉不适，呼叫中毒急救中心/医生。',
  'P301+P330+P331':'IF SWALLOWED: Rinse mouth. Do NOT induce vomiting. / 如误吞咽：漱口。不要诱导呕吐。',
  'P302+P352':'IF ON SKIN: Wash with plenty of water. / 如皮肤沾染：用大量水清洗。',
  'P303+P361+P353':'IF ON SKIN (or hair): Take off immediately all contaminated clothing. Rinse skin with water. / 如皮肤（或头发）沾染：立即脱掉所有沾染的衣服。用水清洗皮肤。',
  'P304+P340':'IF INHALED: Remove person to fresh air and keep comfortable for breathing. / 如误吸入：将人转移到空气新鲜处，保持呼吸舒适的体位。',
  'P305+P351+P338':'IF IN EYES: Rinse cautiously with water for several minutes. Remove contact lenses, if present and easy to do. Continue rinsing. / 如进入眼睛：用水小心冲洗几分钟。如戴隐形眼镜并可方便地取出，取出隐形眼镜。继续冲洗。',
  'P308+P313':'IF exposed or concerned: Get medical advice/attention. / 如接触到或有疑虑：求医/就诊。',
  'P310':'Immediately call a POISON CENTER/doctor. / 立即呼叫中毒急救中心/医生。',
  'P312':'Call a POISON CENTER/doctor if you feel unwell. / 如感觉不适，呼叫中毒急救中心/医生。',
  'P314':'Get medical advice/attention if you feel unwell. / 如感觉不适，求医/就诊。',
  'P320':'Specific treatment is urgent (see supplemental first aid instruction on this label). / 紧急具体治疗（见本标签上的补充急救指示）。',
  'P321':'Specific treatment (see supplemental first aid instruction on this label). / 具体治疗（见本标签上的补充急救指示）。',
  'P330':'Rinse mouth. / 漱口。',
  'P332+P313':'If skin irritation occurs: Get medical advice/attention. / 如发生皮肤刺激：求医/就诊。',
  'P333+P313':'If skin irritation or rash occurs: Get medical advice/attention. / 如发生皮肤刺激或皮疹：求医/就诊。',
  'P337+P313':'If eye irritation persists: Get medical advice/attention. / 如仍觉眼刺激：求医/就诊。',
  'P361+P364':'Take off immediately all contaminated clothing and wash it before reuse. / 立即脱掉所有沾染的衣服，清洗后方可重新使用。',
  'P362+P364':'Take off contaminated clothing and wash it before reuse. / 脱掉沾染的衣服，清洗后方可重新使用。',
  'P363':'Wash contaminated clothing before reuse. / 沾染的衣服清洗后方可重新使用。',
  'P370+P378':'In case of fire: Use dry sand, dry chemical or alcohol-resistant foam to extinguish. / 如起火：用干砂、干粉或抗溶性泡沫灭火。',
  'P391':'Collect spillage. / 收集溢出物。',
  'P403+P233':'Store in a well-ventilated place. Keep container tightly closed. / 存放在通风良好的地方。保持容器密闭。',
  'P403+P235':'Store in a well-ventilated place. Keep cool. / 存放在通风良好的地方。保持低温。',
  'P405':'Store locked up. / 存放处须加锁。',
  'P501':'Dispose of contents/container in accordance with local/regional/national regulations. / 按照地方/区域/国家规章处置内装物/容器。'
};
/* H 语句 → 应选 P 语句组合（CLP Annex IV 选择表） */
var P_BY_H={
  'H225':['P210','P233','P240','P241','P242','P243','P280','P303+P361+P353','P370+P378','P403+P235','P501'],
  'H300':['P264','P270','P301+P310','P321','P330','P405','P501'],
  'H301':['P264','P270','P301+P310','P321','P330','P405','P501'],
  'H302':['P264','P270','P301+P312','P330','P501'],
  'H311':['P280','P302+P352','P312','P321','P361+P364','P405','P501'],
  'H314':['P260','P264','P280','P301+P330+P331','P303+P361+P353','P304+P340','P305+P351+P338','P310','P321','P363','P405','P501'],
  'H315':['P264','P280','P302+P352','P321','P332+P313','P362+P364'],
  'H317':['P261','P272','P280','P302+P352','P333+P313','P362+P364','P501'],
  'H318':['P280','P305+P351+P338','P310'],
  'H319':['P264','P280','P305+P351+P338','P337+P313'],
  'H330':['P260','P271','P284','P304+P340','P310','P320','P403+P233','P405','P501'],
  'H335':['P261','P271','P304+P340','P312','P403+P233','P405','P501'],
  'H336':['P261','P271','P304+P340','P312','P403+P233','P405','P501'],
  'H340':['P201','P202','P280','P308+P313','P405','P501'],
  'H341':['P201','P202','P280','P308+P313','P405','P501'],
  'H350':['P201','P202','P280','P308+P313','P405','P501'],
  'H351':['P201','P202','P280','P308+P313','P405','P501'],
  'H360':['P201','P202','P280','P308+P313','P405','P501'],
  'H361':['P201','P202','P280','P308+P313','P405','P501'],
  'H372':['P260','P264','P270','P314','P501'],
  'H373':['P260','P314','P501'],
  'H400':['P273','P391','P501'],
  'H410':['P273','P391','P501'],
  'H411':['P273','P391','P501'],
  'H412':['P273','P501'],
  'H413':['P273','P501']
};
/* H 语句 → 象形图 / 信号词 */
var PIC_BY_H={
  'H225':'GHS02（火焰）','H300':'GHS06（骷髅和交叉骨）','H301':'GHS06（骷髅和交叉骨）','H311':'GHS06（骷髅和交叉骨）','H330':'GHS06（骷髅和交叉骨）',
  'H314':'GHS05（腐蚀性）','H318':'GHS05（腐蚀性）',
  'H302':'GHS07（感叹号）','H315':'GHS07（感叹号）','H317':'GHS07（感叹号）','H319':'GHS07（感叹号）',
  'H335':'GHS07（感叹号）','H336':'GHS07（感叹号）',
  'H340':'GHS08（健康危害）','H341':'GHS08（健康危害）','H350':'GHS08（健康危害）','H351':'GHS08（健康危害）',
  'H360':'GHS08（健康危害）','H361':'GHS08（健康危害）','H372':'GHS08（健康危害）','H373':'GHS08（健康危害）',
  'H400':'GHS09（环境）','H410':'GHS09（环境）','H411':'GHS09（环境）','H412':'—','H413':'—'
};
var SIG_BY_H={
  'H225':'danger','H300':'danger','H301':'danger','H311':'danger','H330':'danger','H314':'danger','H318':'danger',
  'H340':'danger','H350':'danger','H360':'danger','H372':'danger',
  'H302':'warning','H315':'warning','H317':'warning','H319':'warning','H335':'warning','H336':'warning',
  'H341':'warning','H351':'warning','H361':'warning','H373':'warning',
  'H400':'warning','H410':'warning','H411':'warning','H412':'—','H413':'—'
};
/* 第 16.2 缩略语表 */
var ABBR_TABLE=[
  ['ADR','European Agreement concerning the International Carriage of Dangerous Goods by Road · 国际公路运输危险货物协定'],
  ['RID','Regulations concerning the International Carriage of Dangerous Goods by Rail · 国际铁路运输危险货物规则'],
  ['ADN','European Agreement concerning the International Carriage of Dangerous Goods by Inland Waterways · 内河运输危险货物协定'],
  ['IMDG','International Maritime Dangerous Goods Code · 国际海运危险货物规则'],
  ['ICAO','International Civil Aviation Organization · 国际民用航空组织'],
  ['IATA','International Air Transport Association · 国际航空运输协会'],
  ['UFI','Unique Formula Identifier · 唯一配方标识'],
  ['LC50','Median lethal concentration · 半数致死浓度'],
  ['LD50','Median lethal dose · 半数致死剂量'],
  ['EC50','Effective concentration causing 50% of maximum response · 半数效应浓度'],
  ['NOEC','No Observed Effect Concentration · 无可见效应浓度'],
  ['DNEL','Derived No-Effect Level · 推导无效应水平'],
  ['DMEL','Derived Minimal Effect Level · 推导最低效应水平'],
  ['PNEC','Predicted No-Effect Concentration · 预测无效应浓度'],
  ['ATE','Acute Toxicity Estimate · 急性毒性估计值'],
  ['SCL','Specific Concentration Limit · 特定浓度限值'],
  ['CMR','Carcinogenic, Mutagenic or toxic to Reproduction · 致癌、致突变或生殖毒性'],
  ['PBT','Persistent, Bioaccumulative and Toxic · 持久性、生物累积性和毒性'],
  ['vPvB','very Persistent and very Bioaccumulative · 高持久性和高生物累积性'],
  ['PMT','Persistent, Mobile and Toxic · 持久性、迁移性和毒性'],
  ['vPvM','very Persistent and very Mobile · 高持久性和高迁移性'],
  ['SVHC','Substance of Very High Concern · 高度关注物质'],
  ['OEL','Occupational Exposure Limit · 职业接触限值'],
  ['CSA','Chemical Safety Assessment · 化学品安全评估'],
  ['PCN','Poison Centre Notification · 毒物中心通报'],
  ['OR','Only Representative · 唯一代表']
];
/* 第 16.1 法规依据 —— G8：必须点名 CLP 1272/2008 及其 2024/2865 修订 */
function legalBasis(mk){
  return mk==='EU'
    ? 'REGULATION (EC) No 1907/2006 (REACH) as amended by Commission Regulation (EU) 2020/878\n'
      +'　· REGULATION (EC) No 1272/2008 (CLP) as amended by Regulation (EU) 2024/2865'
    : 'GB/T 16483-2008《化学品安全技术说明书 内容和项目顺序》\n'
      +'　· GB/T 17519-2013《化学品安全技术说明书编写指南》\n'
      +'　· GB 30000 系列《化学品分类和标签规范》';
}
/* 混合物分类结论中的 H 代码（已判定的项） */
function hCodesMix(){
  var out=[];
  (wz.classItems||[]).forEach(function(c){
    if(c.status==='pending')return;
    var m=(c.code||'').match(/H\d{3}/g)||[];
    m.forEach(function(h){if(out.indexOf(h)<0&&c.result!=='不分类')out.push(h);});
  });
  return out;
}
/* 第 3 章组分表中出现的 H 代码（用于 16.5 全文汇总） */
function hCodesComp(){
  var out=[];
  wz.formula.forEach(function(f){
    var q=clpParamOf(f.cas);
    var m=(q.uni||'').match(/H\d{3}/g)||[];
    m.forEach(function(h){if(out.indexOf(h)<0)out.push(h);});
  });
  return out;
}
/* 已选 EUH 补充危害说明 */
function euhList(){
  var out=(wz.project.euh||[]).slice();
  euhAuto().forEach(function(e){if(out.indexOf(e)<0)out.push(e);});
  return out;
}
/* G1：第 2.2 标签元素 —— 由分类结论自动推导，替代原硬编码 */
function labelElements(){
  var hs=hCodesMix(),eu=wz.project.market==='EU';
  if(!hs.length)return '（尚未生成分类结论，标签元素待定）';
  var pics=[],sig='warning';
  hs.forEach(function(h){
    var p=PIC_BY_H[h];
    if(p&&p!=='—'&&pics.indexOf(p)<0)pics.push(p);
    if(SIG_BY_H[h]==='danger')sig='danger';
  });
  var ps=[];
  hs.forEach(function(h){
    (P_BY_H[h]||[]).forEach(function(p){if(ps.indexOf(p)<0)ps.push(p);});
  });
  ps.sort(function(a,b){return a.replace(/\D/g,'')-b.replace(/\D/g,'');});
  var euhs=euhList();
  return '2.2 标签元素\n'
    +'象形图（Hazard pictogram）：'+(pics.length?pics.join('、'):'无（无需象形图）')+'\n'
    +'信号词（Signal word）：'+(sig==='danger'?'Danger 危险':'Warning 警告')+'\n'
    +'危害说明（Hazard statement）：\n'
      +hs.map(function(h){return '　· '+h+'：'+(H_STMT[h]||'—');}).join('\n')+'\n'
    +'防范说明（Precautionary statement）：\n'
      +(ps.length?ps.map(function(p){return '　· '+p+'：'+(P_STMT[p]||'—');}).join('\n'):'　· —')+'\n'
    +(eu?('补充危害说明（EUH）：\n'
      +(euhs.length?euhs.map(function(e){return '　· '+e+'：'+(H_STMT[e]||'—');}).join('\n'):'　· 无'))+'\n':'')
    +'注：防范说明按 CLP Annex IV 选择表由危害类别自动推导；'
    +'P 语句最多不超过 6 条（另有例外规定），本表为全量候选，需在标签排版时按优先级裁剪。';
}
/* G7：第 16.2 缩略语表 */
function abbrTable(){
  return ABBR_TABLE.map(function(a){return '　· '+a[0]+'：'+a[1];}).join('\n');
}
/* G7：第 16.5 相关 H 语句全文 */
function hStmtTable(){
  var mix=hCodesMix(),comp=hCodesComp(),euhs=euhList();
  var all=[];
  mix.concat(comp).forEach(function(h){if(all.indexOf(h)<0)all.push(h);});
  if(!all.length&&!euhs.length)return '　（尚未生成分类结论）';
  var s=all.sort().map(function(h){
    return '　· '+h+'：'+(H_STMT[h]||'—')+(mix.indexOf(h)>=0?'　[混合物分类]':'　[组分分类]');
  }).join('\n');
  if(euhs.length)s+='\n'+euhs.map(function(e){
    return '　· '+e+'：'+(H_STMT[e]||'—')+'　[补充危害说明 EUH]';}).join('\n');
  return s;
}
/* B4：步骤④ 顶部的「组分分类参数」表 —— 加和法的输入，可追溯 */
function clpParamTable(){
  var rows=wz.formula.map(function(f){
    var q=clpParamOf(f.cas);
    /* 高亮口径与 B5 未知毒性声明严格一致：只有 unknown / unmaintained 计入未知声明，
       na（经评估不适用，如聚合物）是「已知安全」，不标橙 */
    var miss=toxUnknown(q,'acute');
    var ts=TOX_STATE[q.ateState]||TOX_STATE.unknown;
    var mCell=(q.mM||q.mC)
      ? '<b>'+esc(q.m)+'</b><br><small style="color:var(--muted)">'+esc(q.mSrcTxt)+'</small>'
      : '<span class="muted">—</span>';
    var aCell=esc(q.ate)+'<br><span class="tag '+ts.c+'">'+ts.t+'</span>'
      +(q.ateState==='unmaintained'||(q.ateState==='unknown'&&q.dataVersion&&!q.dataVersion.supplementalRevision)
        ? ' <button class="btn-link" onclick="gotoCompFill(\''+esc(f.cas)+'\')">去补录</button>':'');
    return '<tr'+(miss?' class="row-chk" title="该组分没有可用的急性毒性数据，相关危害类别须转人工判定，并将计入第 3 / 11 章未知毒性声明"':'')+'><td class="mono">'+esc(f.cas)+'</td>'
      +'<td>'+esc(q.name)+'<br><small style="color:var(--muted)">'+esc(f.conc)+'%</small></td>'
      +'<td style="font-size:12px">'+esc(q.uni)+'</td>'
      +'<td style="font-size:12px">'+esc(q.scl)+'</td>'
      +'<td class="ctr" style="font-size:12px">'+mCell+'</td>'
      +'<td style="font-size:12px">'+aCell+'</td></tr>';
  }).join('');
  return '<div class="card" style="margin-bottom:14px"><div class="card-hd">'
    +'<h3>组分分类参数 · CLP 加和法输入</h3>'
    +'<span class="sub">SCL 特定浓度限值 / M 乘数因子 / ATE 急性毒性估计值</span></div>'
    +'<div class="tbl-wrap"><table class="tbl mini"><thead><tr>'
    +'<th style="width:100px">CAS</th><th style="width:150px">物质（浓度）</th><th>统一分类</th>'
    +'<th style="width:160px">'+term('SCL')+'</th><th style="width:120px">'+term('M 因子')+'</th>'
    +'<th style="width:210px">'+term('ATE')+'</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
    +'<div class="notice grey" style="margin:0 14px 14px"><div class="ni">ⓘ</div><div>'
    +'表头带下划线的三项释义可悬停查看。它们都是'+term('加和法')+'的<b style="display:inline">必要输入</b>：'
    +'<b style="display:inline">任一参数缺失，对应危害类别的加和法就算不动</b>，只能转人工判定。'
    +'<br>这三项的维护入口在<b style="display:inline">组分基础数据</b>，此处只读引用 —— 编制 SDS 时'
    +'不允许就地修改，否则等于让人随口覆盖掉法规依据。'
    +'<br><span style="color:var(--orange)">橙底行</span>表示该组分没有可用的 ATE 数据，'
    +'会计入第 3 / 11 章的<b style="display:inline">未知急性毒性声明</b>；'
    +'标「不适用」的是已确认不达分类阈值的组分，属已知安全，不计入。</div></div></div>';
}
function buildClassItems(precomputedRun){
  /* 阶段 2：按 SDS 投放日期解析活动规则版本（未来生效的规则不会提前参与计算） */
  var run=precomputedRun||clpEvaluateMixture(wz.formula,(wz.project&&wz.project.date)||''),byId={};
  run.items.forEach(function(item){byId[item.id]=precomputedRun?JSON.parse(JSON.stringify(item)):item;});
  function blocked(id,name,method){
    if(byId[id])return byId[id];
    var w=run.warnings.filter(function(x){return x.method===method;})[0];
    return {id:id,name:name,result:'—',code:'待人工判断',status:'pending',need:'judge',
      rule:'CLP 规则包 '+run.pack.id+' · '+method,
      input:w?w.message:'当前方法缺少可用分类结果',
      formula:'统一物质数据存在待核验冲突或缺少可调用结果 → 暂停自动分类，请核对来源后人工判断',
      src:[['reg','CLP 物质画像 · 来源与冲突待核验']],
      opts:[{o:'暂不自动分类',d:'核对物质数据来源与字段级冲突后重新计算',hit:'当前状态'}]};
  }
  if(!precomputedRun)wz.classPack=run.pack;
  return [
    /* B6：2024/2865 新增危害类别，结论须在 2.3 / 11.2 / 12.6 三处声明 */
    {id:'ed',name:'内分泌干扰（ED）',result:'—',code:'待人工判断',status:'pending',need:'judge',
      rule:'CLP (EU) 2024/2865 新增危害类别 · Annex I Part 5 · 判定方法 CLP-M-ED-PBT 尚未由研发实现',
      input:'组分基础数据未维护 ED 认定字段，本次汇集结果中也没有可引用的 ED 评估清单数据 —— 系统缺少判定输入',
      formula:'判定方法未上线且无输入数据 → 不计算；不得默认输出「不分类」，须由法规人员核对 ED 评估清单后人工给出结论',
      src:[['reg','CLP Annex I Part 5（2024/2865）']],
      opts:[
        {o:'ED 类别 1（已知/推定内分泌干扰）',d:'Σ(ED Cat.1 组分) ≥ 0.1% → 判 ED Cat.1，需 EUH380 声明',hit:'需人工核对 ED 评估清单'},
        {o:'ED 类别 2（疑似内分泌干扰）',d:'Σ(ED Cat.2 组分) ≥ 0.1% → 判 ED Cat.2，需 EUH381 声明',hit:'需人工核对 ED 评估清单'},
        {o:'不分类（无需分类）',d:'人工核对后确认无 ED 组分超限；2.3 / 11.2 / 12.6 的声明仍不可省略',hit:'需人工核对后再确认'}]},
    {id:'pmt',name:'PMT / vPvM（持久·迁移·毒性）',result:'—',code:'待人工判断',status:'pending',need:'judge',
      rule:'CLP (EU) 2024/2865 新增危害类别 · 通用浓度限值 ≥ 0.1%',
      input:'组分基础数据未维护 P / B / T / M 判定要素，本次汇集结果中无可引用的持久性认定数据 —— 系统缺少判定输入',
      formula:'判定方法未上线且无输入数据 → 不计算；需人工按 Annex XIII / Annex I Part 5 要素评估（含聚合物游离单体残留）后给出结论',
      src:[['reg','CLP Annex XIII 判据'],['reg','CLP Annex VI（2024/2865）']],
      opts:[
        {o:'PMT / vPvM 类别 1',d:'含 PMT 或 vPvM 组分 ≥ 0.1% → 判 PMT/vPvM，需 EUH450/EUH451 声明',hit:'需人工评估 Annex XIII 要素'},
        {o:'不分类（无需分类）',d:'人工评估后确认无符合 PMT / vPvM 要素的组分',hit:'需人工评估后再确认'}]},
    blocked('acuteOral','急性毒性（经口）','CLP-M-ATE-SUM'),
    blocked('skin','皮肤腐蚀/刺激','CLP-M-GCL-SUM'),
    blocked('sens','皮肤致敏','CLP-M-SCL'),
    blocked('eye','严重眼损伤/眼刺激','CLP-M-GCL-SUM'),
    {id:'stot',name:'特异性靶器官毒性（一次接触）',result:'类别 3（呼吸道刺激）',code:'H335 可能引起呼吸道刺激',status:'pending',need:'confirm',
      rule:'CLP 附件 I 3.8.3.4.5 · 通用浓度限值 20% · STOT 加和方法尚未接入规则引擎，以下为按从严实践给出的建议值',
      input:'甲醛 0.35%（STOT SE 3）、丙烯酸 2.50%（STOT SE 3）、乙二醇单丁醚 8.50%（STOT SE 3）',
      formula:'Σ(Ci STOT SE 3) = 11.35% ≥ 20%? 否 → 未达 Cat.3 阈值；系统按成员国从严实践保留 Cat.3 建议值，须人工确认或改判',
      src:[['reg','CLP Annex VI'],['pub','PubChem 辅助核对']],
      opts:[
        {o:'类别 3（呼吸道刺激）',d:'Σ(STOT SE 3 组分) ≥ 20% → 判 Cat.3',hit:'当前 11.35% ＜ 20%，仅为从严实践建议，需人工确认'},
        {o:'不分类（无需分类）',d:'Σ(STOT SE 3 组分) ＜ 20% 且无刺激性证据',hit:'未达限值，可据实改判'}]},
    {id:'carc',name:'致癌性',result:'类别 1B',code:'H350 可能致癌',status:'pending',need:'confirm',
      rule:'CLP 附件 I 3.6.3.1 · 通用浓度限值 Cat.1B ≥ 0.1% · 致癌性加和方法尚未接入规则引擎，以下为依据统一分类给出的建议值',
      input:'甲醛 0.35%（Carc. 1B，CLP Annex VI Index 605-001-00-5）',
      formula:'C(甲醛) = 0.35% ≥ 0.1% → 建议判定为 Carc. 1B；因加和方法未接入引擎，须人工确认后方可写入 SDS',
      src:[['reg','CLP Annex VI 统一分类'],['reg','SVHC 候选清单']],
      opts:[
        {o:'类别 1A / 1B',d:'Σ(致癌 Cat.1A/1B 组分) ≥ 0.1% → 判 Cat.1（按最强组分）',hit:'甲醛 0.35% ≥ 0.1% ✓ 系统建议'},
        {o:'类别 2',d:'Σ(致癌 Cat.2 组分) ≥ 1%（或 1A/1B 在 0.1%~1% 区间从严）',hit:'甲醛为 1B 且已超 0.1%，应判 1B'},
        {o:'不分类（无需分类）',d:'所有致癌组分均低于各自限值',hit:'不适用'}]},
    blocked('aqua','危害水生环境（长期）','CLP-M-MFACTOR'),
    {id:'resp',name:'呼吸道致敏',result:'—',code:'待人工判定',status:'pending',
      rule:'CLP 附件 I 3.4.3 · 需个案评估',
      input:'聚氨酯预聚体 38.65%：供应商未提供致敏性数据；游离异氰酸酯含量未实测',
      formula:'无法执行加和法（关键输入缺失）→ 系统不默认判定为「无危害」',
      src:[['sup','供应商 SDS（数据缺失）']],
      opts:[
        {o:'类别 1（呼吸道致敏）',d:'含致敏性组分 ≥ 1%（固体/液体）或专家判断存在致敏证据',hit:'供应商数据缺失，需人工判定'},
        {o:'不分类（无需分类）',d:'无致敏性组分超限，且有证据支持无致敏性',hit:'需补充证据后方可选择'}]},
    {id:'repr',name:'生殖毒性',result:'—',code:'待人工判定',status:'pending',
      rule:'CLP 附件 I 3.7.3 · 通用浓度限值 Cat.2 ≥ 3%',
      input:'乙二醇单丁醚 8.50%：部分成员国按 Repr. 2 从严管理，欧盟统一分类中未收录',
      formula:'成员国差异化要求，需法规人员按目标成员国确认',
      src:[['reg','CLP Annex VI（未收录）'],['pub','PubChem 文献提示']],
      opts:[
        {o:'类别 1A / 1B',d:'Σ(生殖毒性 Cat.1 组分) ≥ 0.3% → 判 Cat.1',hit:'统一分类未收录 Cat.1 组分'},
        {o:'类别 2',d:'Σ(生殖毒性 Cat.2 组分) ≥ 3% → 判 Cat.2',hit:'乙二醇单丁醚 8.50% ≥ 3%（成员国从严口径）'},
        {o:'不分类（无需分类）',d:'无生殖毒性组分超限，且目标成员国无从严要求',hit:'取决于目标成员国口径'}]}
  ].map(function(c){
    /* 固化系统原始建议：need=confirm 有建议值，need=judge 才是真的无法建议。 */
    c.sug=(c.status==='pending'&&c.need!=='confirm')?null:c.result;
    return c;
  });
}
/* G1：象形图图标 */
function picIcon(p){
  if(p.indexOf('02')>0)return '🔥';
  if(p.indexOf('05')>0)return '⚗';
  if(p.indexOf('06')>0)return '☠';
  if(p.indexOf('07')>0)return '!';
  if(p.indexOf('08')>0)return '☣';
  if(p.indexOf('09')>0)return '🌊';
  return '!';
}
/* G1：由分类结论导出标签三要素（象形图 / 信号词 / P 语句） */
function labelParts(){
  var pics=[],ps=[],sig='warning';
  hCodesMix().forEach(function(h){
    var p=PIC_BY_H[h];
    if(p&&p!=='—'&&pics.indexOf(p)<0)pics.push(p);
    if(SIG_BY_H[h]==='danger')sig='danger';
    (P_BY_H[h]||[]).forEach(function(x){if(ps.indexOf(x)<0)ps.push(x);});
  });
  ps.sort(function(a,b){return (parseInt(a.replace(/\D/g,''),10)||0)-(parseInt(b.replace(/\D/g,''),10)||0);});
  return {pics:pics,ps:ps,sig:sig};
}
/* G1：由 ED / PMT 分类结论自动带出的 EUH（不可手工取消） */
function euhAuto(){
  var out=[];
  (wz.classItems||[]).forEach(function(c){
    if(c.status==='pending'||!c.result)return;
    if(c.id==='ed'&&c.result.indexOf('类别 1')>=0&&c.result.indexOf('类别 2')<0)out.push('EUH380');
    if(c.id==='ed'&&c.result.indexOf('类别 2')>=0)out.push('EUH381');
    if(c.id==='pmt'&&c.result!=='不分类')out.push('EUH450');
  });
  return out;
}
var EUH_OPTS=[
  ['EUH066','重复接触可能导致皮肤干燥或开裂','含特定有机溶剂的混合物常见，由编制人员据实勾选'],
  ['EUH071','对呼吸道有腐蚀性','仅在判为皮肤腐蚀类别 1 且无吸入毒性数据时适用'],
  ['EUH380','可能对人体造成内分泌干扰','ED 判为类别 1 时随之带出且锁定；当前 ED 为「待人工判断」，本项随之一并处理'],
  ['EUH381','怀疑对人体造成内分泌干扰','ED 判为类别 2 时随之带出且锁定；当前 ED 为「待人工判断」，本项随之一并处理'],
  ['EUH450','可对水资源造成长期、广泛的污染','PMT / vPvM 判定时随之带出且锁定；当前 PMT 为「待人工判断」，本项随之一并处理']
];
function euhCard(){
  var sel=wz.project.euh||[],auto=euhAuto();
  var rows=EUH_OPTS.map(function(o){
    var on=sel.indexOf(o[0])>=0,isAuto=auto.indexOf(o[0])>=0;
    return '<label class="inline-chk" style="display:flex;gap:8px;align-items:flex-start;padding:7px 0;cursor:'+(isAuto?'default':'pointer')+'">'
      +'<input type="checkbox" class="chk" '+((on||isAuto)?'checked':'')+' '+(isAuto?'disabled':'')+' onchange="toggleEuh(\''+o[0]+'\',this.checked)">'
      +'<span><b class="mono">'+o[0]+'</b> '+esc(o[1])
      +(isAuto?' <span class="tag blue">由分类结论自动带出</span>':'')
      +'<br><small style="color:var(--muted)">'+esc(o[2])+'</small></span></label>';
  }).join('');
  return '<div class="card" style="margin-bottom:14px"><div class="card-hd">'
    +'<h3>补充危害说明（'+term('EUH')+'）</h3>'
    +'<span class="sub">写入第 2.2 标签元素与第 16.5 · 悬停标题可查看 EUH 释义</span></div>'
    +'<div class="card-bd">'+rows+'</div></div>';
}
function toggleEuh(code,on){
  var e=wz.project.euh||[],i=e.indexOf(code);
  if(on&&i<0)e.push(code);
  if(!on&&i>=0)e.splice(i,1);
  wz.project.euh=e;wzUpdateFoot();
}
function clpPackCallCard(){
  var p=wz.classPack;
  if(!p)return '';
  return '<div class="card" style="margin-bottom:14px"><div class="card-hd">'
    +'<h3>本次调用的 CLP 规则包</h3><span class="tag green dot-tag">已调用并冻结快照</span></div>'
    +'<div class="card-bd"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
      +'<b class="mono" style="font-size:14px">'+esc(p.id)+'</b>'
      +'<span class="tag blue">Annex VI '+esc(p.modules.vi)+'</span>'
      +'<span class="tag blue">Annex I '+esc(p.modules.rules)+'</span>'
      +'<span class="tag blue">标签字典 '+esc(p.modules.labels)+'</span>'
      +'<span class="tag grey">'+p.methods.length+' 种计算方法</span></div>'
      +'<div style="margin-top:9px;font-size:12.3px;color:var(--muted)">方法：'+esc(p.methods.join(' / '))
      +'。本次分类结论已绑定该版本快照；法规库后续发布新版本不会改写本次结果。</div></div></div>';
}
function renderStep4(){
  var evaluation=complianceEvaluationEnsure();
  var items=wz.classItems;
  var pend=items.filter(function(c){return c.status==='pending';});
  var hs=items.filter(function(c){return c.status!=='pending'&&c.code.indexOf('H')===0;});
  /* G1：标签要素由分类结论自动推导 */
  var lb=labelParts();

  var evs=items.map(function(c,i){
    var st=c.status==='pending'
      ?(c.need==='confirm'?'<span class="tag blue dot-tag">待人工确认</span>':'<span class="tag orange dot-tag">待人工判断</span>')
      :(c.status==='manual'?'<span class="tag blue dot-tag">已人工调整</span>'
        :(c.status==='confirmed'?'<span class="tag green dot-tag">已采纳系统建议</span>':'<span class="tag green dot-tag">系统自动判定</span>'));
    var srcs=c.src.map(function(s){return '<span class="tag '+SRC_META[s[0]].cls+'">'+s[1]+'</span>';}).join(' ');
    return '<div class="ev-card" id="evc'+i+'"><div class="ev-hd">'
      +'<b>'+c.name+'</b>'
      +'<span class="tag '+(c.status==='pending'?'grey':'blue')+'">'+esc(c.result)+'</span>'
      +'<span style="font-size:12.3px;color:var(--muted)">'+esc(c.code)+'</span>'
      +'<span class="right">'+st+(c.status==='pending'
        ?'<button class="btn sm warn" onclick="adjClass('+i+')">⚠ 人工判定</button>'
        :'<button class="btn sm" onclick="adjClass('+i+')">手动调整</button>')
        +'<button class="btn sm" id="evbtn'+i+'" onclick="evToggle('+i+')">查看计算依据 ▾</button></span></div>'
      +'<div class="ev-bd" id="evbd'+i+'" style="display:none">'
        +(c.packId?'<div class="ev-f"><span class="k">规则包调用</span><span class="v"><b class="mono">'+esc(c.packId)+'</b><br><span class="tag blue">'+esc(c.ruleIds.join(' / '))+'</span> <span class="tag grey">'+esc(c.method)+'</span>'+(c.methodVersion?' <span class="tag grey">'+esc(c.methodVersion)+'</span>':'')+'</span></div>':'')
        +(c.engineStatus&&c.engineStatus!=='AUTO'&&c.engineStatus!=='NO_MATCH'
          ?'<div class="ev-f"><span class="k">执行状态</span><span class="v"><span class="tag orange">'+esc(c.engineStatus)+'</span> '+esc(c.engineMessage||'')+'</span></div>':'')
        +'<div class="ev-f"><span class="k">计算规则版本</span><span class="v">'+c.rule+'</span></div>'
        +'<div class="ev-f"><span class="k">数据来源</span><span class="v">'+srcs+'</span></div>'
        +'<div class="ev-f span2" style="grid-column:span 2"><span class="k">输入参数</span><span class="v">'+esc(c.input)+'</span></div>'
        +'<div class="ev-f" style="grid-column:span 2"><span class="k">计算公式与判定过程</span><span class="v"><span class="formula">'+esc(c.formula)+'</span></span></div>'
        +(c.note?'<div class="ev-f" style="grid-column:span 2"><span class="k">人工调整备注</span><span class="v" style="color:var(--brand)">'+esc(c.note)+'（'+c.noteAt+' · 张工）</span></div>':'')
      +'</div></div>';
  }).join('');

  var pureNote=wz.formType==='pure'
    ? '<div class="notice info"><div class="ni">i</div><div><b>纯物质（单物料）分类</b>直接采用该物质在 CLP Annex VI / GHS 中的<b style="display:inline">统一分类</b>，无需执行混合物浓度加和推导；以下结论即该物质本身的 GHS 分类。</div></div>'
    : '';
  /* B4：混合物才需要加和法输入参数表；纯物质走统一分类，不展示 */
  var paramTbl=wz.formType==='pure'?'':clpParamTable();
  /* 步骤说明统一渲染在步骤导航下方 */
  wzGuide('<div class="notice warn"><div class="ni">!</div><div><b>第 4 步 · 分类建议与证据追溯</b>'
    +'系统无法自动判定的项目一律标注「待人工判定」，<b style="display:inline">不会默认显示「无危害」</b>；'
    +'每条结论均可追溯到规则版本、输入参数、计算公式与数据来源。'
    +'带虚线下划线的'+term('GHS')+'术语可悬停查看解释，不确定时可点「问 AI 助手」。</div></div>');
  $('wzBody').innerHTML=
    pureNote
    +clpPackCallCard()
    +paramTbl
    +'<div class="concl" style="margin-bottom:16px">'
      +'<div class="ghs-box"><h4>混合物 '+term('GHS')+' 危险分类结论</h4><div class="hz-list">'
        +items.filter(function(c){return c.status!=='pending';}).map(function(c){
          return '<div class="hz-item"><span class="code">'+c.code.split(' ')[0]+'</span><span>'+esc(c.name)+' · <b>'+esc(c.result)+'</b></span><span style="margin-left:auto" class="tag '+(c.status==='manual'?'blue':'green')+'">'+(c.status==='manual'?'人工改判':(c.status==='confirmed'?'人工采纳':'自动'))+'</span></div>';
        }).join('')
        +pend.map(function(c){var conf=c.need==='confirm';
          return '<div class="hz-item" style="background:'+(conf?'var(--blue-bg)':'var(--orange-bg)')+';border-color:'+(conf?'var(--blue-b)':'var(--orange-b)')+'">'
            +'<span class="code" style="color:'+(conf?'var(--blue)':'var(--orange)')+'">?</span><span>'+esc(c.name)+'</span>'
            +'<span style="margin-left:auto" class="tag '+(conf?'blue':'orange')+' dot-tag">'+(conf?'待人工确认':'待人工判断')+'</span></div>';}).join('')
      +'</div></div>'
      +'<div class="ghs-box"><h4>标签要素<span class="tag green" style="margin-left:7px">由分类结论自动推导</span></h4>'
        +'<div style="display:flex;gap:14px;align-items:center;margin-bottom:12px"><div><div style="font-size:11.5px;color:var(--muted);margin-bottom:5px">'+term('警示词')+'</div>'
          +'<span class="signal-word '+(lb.sig==='danger'?'danger':'warning')+'">'+(lb.sig==='danger'?'危险':'警告')+'</span></div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
          +(lb.pics.length?lb.pics.map(function(p){
            return '<div style="width:56px;text-align:center"><div style="width:46px;height:46px;margin:0 auto;border:2px solid var(--red);transform:rotate(45deg);display:grid;place-items:center;background:#fff"><span style="transform:rotate(-45deg);font-size:17px">'+picIcon(p)+'</span></div><small style="font-size:10px;color:var(--muted);display:block;margin-top:4px">'+p.split('（')[0]+'</small></div>';
          }).join(''):'<span style="font-size:12.3px;color:var(--muted)">无需象形图</span>')
        +'</div></div>'
        +'<div style="font-size:12.4px;line-height:1.8"><b style="font-size:12px;color:var(--ink2)">'+term('H 短语')+'（危险说明）</b><br>'
          +(hs.length?hs.map(function(c){return esc(c.code);}).join('<br>'):'<span style="color:var(--muted)">尚无分类结论</span>')+'</div>'
        +'<div style="font-size:12.4px;line-height:1.8;margin-top:9px"><b style="font-size:12px;color:var(--ink2)">'+term('防范说明')+'（P 语句）</b><br>'
          +(lb.ps.length?lb.ps.map(function(p){
            return esc(p+'：'+((P_STMT[p]||'').split(' / ')[1]||P_STMT[p]||''));}).join('<br>')
            :'<span style="color:var(--muted)">尚无分类结论</span>')+'</div>'
        +'<div style="font-size:11.5px;color:var(--muted);margin-top:9px">P 语句由危害类别按 CLP Annex IV 选择表自动推导；'
          +'标签实体排版时最多保留 6 条（另有例外规定），此处为全量候选。</div>'
      +'</div>'
    +'</div>'
    +euhCard()
    +'<div class="card"><div class="card-hd"><h3>分类证据追溯</h3>'
      +'<span class="sub">共 '+items.length+' 条分类结论 · 逐条可审计</span>'
      +(pend.filter(function(c){return c.need==='confirm';}).length
        ? '<button class="btn sm primary" onclick="adoptAllSug()" title="仅采纳有建议值的待确认项；缺算式/缺输入的结论仍须逐条判断">✓ 采纳全部系统建议</button> '
        : '')
      +(pend.length
        ? '<span class="tag orange dot-tag" style="cursor:pointer" title="由 EHS / 法规人员判定后方可生成草案 · 点击跳转到第一个待判定项" onclick="jumpPend()">'
            +pend.length+' 项待人工处理（'+pend.filter(function(c){return c.need==='confirm';}).length+' 确认 / '
            +pend.filter(function(c){return c.need!=='confirm';}).length+' 判断）›</span>'
        : '<span class="tag green dot-tag">全部已判定</span>')
      +'</div>'
      +'<div class="card-bd">'+evs+'</div></div>'
    +complianceEvaluationStep4Html(evaluation);
}
/* 从标题旁的待判定标签跳转到第一个待判定证据卡并短暂高亮 */
function jumpPend(){
  var idx=-1;
  (wz.classItems||[]).forEach(function(c,i){if(idx<0&&c.status==='pending')idx=i;});
  if(idx<0)return;
  var el=$('evc'+idx);
  if(!el)return;
  el.scrollIntoView({behavior:'smooth',block:'center'});
  el.style.outline='3px solid var(--orange)';
  el.style.outlineOffset='3px';
  setTimeout(function(){el.style.outline='';el.style.outlineOffset='';},1800);
}
/* 展开/收起某条分类结论的计算依据（规则编号、方法编号属审计信息，默认收起） */
function evToggle(i){
  var bd=$('evbd'+i),btn=$('evbtn'+i);
  if(!bd)return;
  var on=bd.style.display!=='none';
  bd.style.display=on?'none':'';
  if(btn)btn.textContent=on?'查看计算依据 ▾':'收起计算依据 ▴';
}
var CLASS_OPTS=['类别 1','类别 1A','类别 1B','类别 2','类别 2A','类别 3','类别 4','不分类（无需分类）'];
/* 一键采纳全部「系统建议 · 待人工确认」项：仅用于有建议值的条款；
   need==='judge'（缺算式或缺输入）的项没有建议值，必须逐条人工判断，不在此列。
   采纳后状态流转为 confirmed —— 既区别于「系统自动判定 auto」，也区别于「已改判 manual」，
   审计时可还原「人是否真的看过这条建议」。 */
function adoptAllSug(){
  var n=0,cnt=0;
  (wz.classItems||[]).forEach(function(c){
    if(c.status!=='pending'||c.need!=='confirm')return;
    if(!c.result||c.result==='—')return;
    c.status='confirmed';c.note='已采纳系统建议，未改判';c.noteAt=nowStr();
    if(c.code&&c.code.indexOf('H')===0)cnt++;
    n++;
  });
  if(!n){toast('当前没有可采纳的系统建议项','warn');return;}
  renderStep4();wzUpdateFoot();
  toast('已采纳 '+n+' 项系统建议，'+cnt+' 条 H 短语写入标签要素','ok');
}
function adjClass(i){
  var c=wz.classItems[i];
  var opts=c.opts||CLASS_OPTS.map(function(o){return {o:o,d:'参见 '+c.rule,hit:''};});
  /* 系统建议 = 生成时固化的 c.sug，人工判定后不再变化；c.result 是当前生效值 */
  var sug=(c.sug===undefined)?(c.status==='pending'?null:c.result):c.sug;
  var sugg=sug?sug:'—（系统无法自动判定，需人工给出结论）';
  var changed=(c.status==='manual'&&sug&&c.result!==sug);
  /* 判定依据表：绿色高亮 = 系统建议行；橙色标签 = 当前人工判定值 */
  var critRows=opts.map(function(o){
    var isSug=(sug&&o.o===sug);
    var isNow=(c.status==='manual'&&o.o===c.result);
    return '<tr'+(isSug?' style="background:var(--green-bg)"':'')+'>'
      +'<td style="white-space:nowrap;font-weight:'+((isSug||isNow)?'700':'400')+'">'+esc(o.o)
      +(isNow?'<br><span class="tag '+(isSug?'green':'orange')+'" style="margin-top:3px">'+(isSug?'系统建议':'当前判定')+'</span>':'')
      +'</td>'
      +'<td>'+esc(o.d)+'</td>'
      +'<td style="color:'+(o.hit.indexOf('✓')>=0?'var(--green)':'var(--ink2)')+'">'+esc(o.hit||'—')+'</td></tr>';
  }).join('');
  /* 下拉选项 = 判定依据表中的类别，保持一一对应 */
  var selOpts=(c.status==='pending'?'<option value="" selected disabled>请选择判定结果</option>':'')
    +opts.map(function(o){
      return '<option '+(o.o===c.result?'selected':'')+'>'+esc(o.o)+'</option>';
    }).join('');
  openModal({title:(c.status==='pending'?'人工判定':'手动调整')+'分类结果 · '+c.name,width:760,
    body:'<div class="notice '+(c.status==='pending'?'warn':'info')+'" style="margin-bottom:12px"><div class="ni">'+(c.status==='pending'?'!':'i')+'</div><div><b>系统建议：'+esc(sugg)+'</b>　规则依据：'+esc(c.rule)
      +(changed?'<br><b style="display:inline;color:var(--orange)">当前判定：'+esc(c.result)+'（已改判）</b>':'')
      +'<br><span class="formula">'+esc(c.formula)+'</span><br><span style="color:var(--muted);font-size:11.8px">正常情况下直接采纳系统建议即可；仅当存在专家判断依据（组分协同效应、实测新数据、成员国从严要求等）时才需要改判，改判原因将写入审计记录。</span></div></div>'
      +'<div class="card" style="box-shadow:none;margin-bottom:12px"><div class="card-hd"><h3>各类别判定依据与当前证据</h3><span class="sub">依据 '+esc(c.rule.split('·')[0])+' 浓度限值 / 加和法 · 绿色高亮 = 系统建议'+(sug?'':'（本次无建议）')+'</span></div>'
      +'<div class="card-bd tight"><div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:150px">类别选项</th><th>判定依据（标准摘要）</th><th style="width:230px">本配方当前证据</th></tr></thead><tbody>'+critRows+'</tbody></table></div></div></div>'
      +'<div class="form-grid">'
      +'<div class="field"><label class="req">'+(c.status==='pending'?'判定结果':'调整后分类结果')+'</label><select class="ctrl" id="adjRes">'+selOpts+'</select><span class="help">选项与上方判定依据表一一对应，绿色高亮行为系统建议'+(sug?'，系统建议已在上方色块中给出，无需在表格里重复标注':'；本次系统无法自动判定，请依据下表证据人工选择')+'</span></div>'
      +'<div class="field"><label class="req">对应危险说明（H 短语）</label><input class="ctrl" id="adjCode" value="'+esc(c.status==='pending'?'':c.code)+'" placeholder="例如：H317 可能导致皮肤过敏反应"></div>'
      +'<div class="field span2"><label class="req">'+(c.status==='pending'?'判定理由（必填）':'调整理由备注（必填）')+'</label><textarea class="ctrl" id="adjNote" placeholder="'+(c.status==='pending'?'例如：已取得游离异氰酸酯实测报告 ＜0.5%，依据 …… 判定为 ……':'必须填写调整理由，将写入审计记录')+'"></textarea><span class="help">与系统建议不同的判定须说明依据；记录会附在分类证据中，供审核与追溯</span></div>'
      +'</div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="adjSave('+i+')">'+(c.status==='pending'?'确认判定':'保存调整')+'</button>'});
}
function adjSave(i){
  var note=$('adjNote').value.trim();
  var code=$('adjCode').value.trim();
  if(!$('adjRes').value){toast('请选择判定结果','warn');return;}
  if(!note){toast('请填写判定/调整理由','warn');return;}
  if(!code){toast('请填写对应危险说明','warn');return;}
  var c=wz.classItems[i];
  var was=c.result;
  c.result=$('adjRes').value;c.code=code;c.status='manual';c.note=note;c.noteAt=nowStr();
  closeModal();renderStep4();wzUpdateFoot();
  toast('分类「'+c.name+'」已'+(was==='—'?'完成判定':'调整为 '+c.result)+'，理由已记录','ok');
}

/* ------------------------------------------------------------------
   步骤 5：生成 SDS 草案（16 章节折叠面板）
   ------------------------------------------------------------------ */
var SDS_16=[
  {n:'化学品及企业标识',cov:'高',auto:true},
  {n:'危险性概述',cov:'中高',auto:false},
  {n:'成分/组成信息',cov:'高',auto:true},
  {n:'急救措施',cov:'中',auto:false},
  {n:'消防措施',cov:'中高',auto:false},
  {n:'泄漏应急处理',cov:'中',auto:false},
  {n:'操作处置与储存',cov:'中',auto:false},
  {n:'接触控制/个体防护',cov:'中高',auto:false},
  {n:'理化特性',cov:'高',auto:true},
  {n:'稳定性和反应性',cov:'中',auto:false},
  {n:'毒理学信息',cov:'中高',auto:true},
  {n:'生态学信息',cov:'低',auto:false},
  {n:'废弃处置',cov:'低',auto:false},
  {n:'运输信息',cov:'中高',auto:true},
  {n:'法规信息',cov:'高',auto:true},
  {n:'其他信息',cov:'高',auto:true}
];
/* 取某一危害类别的分类结论（供第 11 章逐端点输出） */
function classOf(id){
  var c=(wz.classItems||[]).filter(function(x){return x.id===id;})[0];
  return (c&&c.status!=='pending'&&c.result!=='不分类')?(c.result+'（'+c.code+'）'):'Not classified / 不分类';
}
/* 混合物经口 ATE 加和法估算：全部组分均有可用 ATE 时才计算，否则如实返回空
   直接用 ateO 数值参与计算，不再从展示串里正则抠数字 */
function ateMix(){
  var ok=wz.formula.length&&wz.formula.every(function(f){return clpParamOf(f.cas).ateState==='known';});
  if(!ok)return '';
  var inv=0;
  wz.formula.forEach(function(f){
    var n=clpParamOf(f.cas).ateO||0;
    var c=parseFloat(f.conc)||0;
    if(n>0&&c>0)inv+=c/100/n;
  });
  return inv>0?('约 '+Math.round(1/inv)+' mg/kg bw（加和法估算）'):'';
}
/* 第 16.4 交付版 —— 只含分类结论与推导方法
   （数据来源、计算公式、判定理由与人名属内部审计信息，留在第 4 步证据追溯页） */
function deriveTable16(){
  var items=(wz.classItems||[]).filter(function(c){return c.status!=='pending';});
  if(!items.length)return '　（尚未生成分类结论）';
  return items.map(function(c){
    return '　· '+c.name+' —— '+c.result+'（'+c.code+'）\n　　推导方法：'+deriveMethod(c);
  }).join('\n');
}
/* 编制态内部批注 —— 仅在「编制视图」展示，绝不进入交付文档 */
function secNotes(i){
  var pend=(wz.classItems||[]).filter(function(c){return c.status==='pending';}).length;
  var secs=wz.formula.filter(function(f){return f.secret;});
  var N={
    0:['内部：物料编码 '+esc(wz.materialCode||'—')+'　配方快照 FORM-'+esc(wz.materialCode||'0001')+'-V1.0'
        +(wz.frozen?('（已冻结 '+esc(wz.frozenAt)+'）'):'（未冻结）')+'，仅用于归档，交付版已隐去。',
       '内部：公司行政档案由管理员统一维护，本项目已随目标市场带出对应责任主体，可在第 1 步覆盖。'],
    1:pend?['内部：尚有 '+pend+' 项危害类别待人工判定，判定结论确认前不得对外发布。']
          :['内部：象形图 / 信号词 / P 语句由分类结论自动推导；CLP 要求标签上的 P 语句不超过 6 条，'
            +'本章为全量候选，排版时需按优先级裁剪。'],
    2:['内部：'+secs.length+' 项保密组分采用浓度区间披露（'
        +(secs.map(function(f){return esc(f.name);}).join('、')||'—')
        +'），物质身份未被隐藏，符合目标市场规则；替代名称申请状态见「保密组分管理」页。'],
    3:['内部：急救措施为规则库标准文案，需结合最终分类结论由 EHS 复核。'],
    5:['内部：需结合厂区应急预案补充现场处置流程。'],
    8:['内部：本章字段应取自物料检测报告，当前为模板值，须由实验室补录后确认。'],
    10:['内部：呼吸道致敏、生殖毒性等端点数据缺失，不得默认判定为无危害；未知毒性占比随配方数据补录自动下降。'],
    11:['内部：生物累积性与土壤迁移性数据待补充，不得留空发布。'],
    12:['内部：废物代码需按目标成员国体系确认。'],
    15:['内部：分类证据链（规则版本 / 输入参数 / 计算公式 / 数据来源 / 判定理由）见第 4 步证据追溯页；'
       +'本交付版仅输出分类结论与推导方法，不含内部审计信息。']
  };
  return N[i]||[];
}
/* 交付前自检：扫描交付文本是否残留内部标记（结构上已分离，此为最后一道保险） */
var DELIVER_DIRTY=['【需人工审核】','系统覆盖度','公司档案','数据来源优先级','待人工判定','张工','快照版本','规则库模板'];
function deliverScan(){
  var bad=[];
  for(var i=0;i<16;i++){
    var txt=wz.draftEdits[i]!==undefined?wz.draftEdits[i]:draftText(i);
    DELIVER_DIRTY.forEach(function(w){
      if(txt.indexOf(w)>=0)bad.push({sec:i+1,name:SDS_16[i].n,w:w});
    });
  }
  return bad;
}
/* 交付态正文 —— 只含对客户/监管的内容，不含任何内部标记
   （内部批注见 secNotes()，仅在编制视图展示） */
function draftText(i){
  var p=wz.project,mk=p.market==='EU'?('欧盟 · '+(p.state||'—')):'中国',eu=p.market==='EU';
  var cls=(wz.classItems||[]).filter(function(c){return c.status!=='pending'&&c.result!=='不分类';})
    .map(function(c){return '　· '+c.name+'：'+c.result+'（'+c.code+'）';}).join('\n')
    ||'　· 本混合物按现有数据判定为无需分类。';
  var T={
    /* 第 1 章 —— G9：1.1 补 Index Number / REACH 注册号，UFI 与纳米形态归位；G12：1.4 服务时段与非工作时间可用性 */
    0:'1.1 产品标识\n'
      +'标签名称 / 商品名（Identification on the label / Trade name）：'+(p.product||'—')+'\n'
      +'其他标识（Additional identification）：'
        +(p.nano==='1'?('含纳米形态 —— '+(p.nanoForm||'—')):'Nanoform is NOT covered by this SDS. / 本 SDS 不涉及纳米形态。')+'\n'
      +'UFI：'+(p.ufi||'N/A')+'\n'
      +'产品标识（Identification of the product）：'+(wz.formType==='pure'?(p.product||'—'):'See section 3 / 见第 3 章')+'\n'
      +'索引号（Index Number）：'+(p.idxNo||'See section 3 / 见第 3 章')+'\n'
      +'REACH 注册号（REACH registration No.）：'+(p.reachNo||'See section 3 / 见第 3 章')+'\n'
      +'\n1.2 物质或混合物的相关确定用途和建议不用的用途\n'
      +'1.2.1 确定用途：皮革表面涂饰用水性树脂，仅限工业用途\n'
      +'1.2.2 建议不用的用途：不得用于消费品与食品接触场景\n'
      +'\n1.3 安全数据表供应商的详细信息\n'
      +'供应商（制造商）：'+COMPANY.cn+' / '+COMPANY.en+'\n'
      +'地址：'+COMPANY.addrCn+'（邮编 '+COMPANY.zip+'）\n'
      +'　　'+COMPANY.addrEn+'\n'
      +'电话：'+COMPANY.tel+'　传真：'+COMPANY.fax+'\n'
      +'联系人（邮箱）：'+COMPANY.mail+'\n'
      +(eu&&p.orName?('供应商（唯一代表 OR）：'+p.orName+'　电话：'+(p.orTel||'—')+'\n'):'')
      +'\n1.4 紧急电话号码\n'
      +'　'+(p.emerg||'—')+(p.emergHours?('（服务时段：'+p.emergHours+'）'):'')+'\n'
      +'　非工作时间可用（Available outside office hours）：'+(p.emerg24==='1'?'YES / 是':'NO / 否')+'\n'
      +(eu&&p.pcn?('　毒理中心应急电话（PCN）：'+p.pcn+'\n'):''),
    /* 第 2 章 —— G1：2.2 标签元素由分类结论自动推导，替换原硬编码 */
    1:'2.1 物质或混合物的分类\n'+cls
      +'\n\nFor full text of H-phrases: see section 16.5. / H 语句全文见第 16.5 节。\n'
      +'\n'+labelElements()+'\n'
      +'\n2.3 其他危害\n'+(edStmt('2.3')||'　· 本混合物不含 PBT / vPvB 物质，不含内分泌干扰物。'),
    2:'物质 / 混合物：'+(wz.formType==='pure'?'纯物质 Substance':'混合物 Mixture')+'\n'
      +'组分（Ingredients）：见本节组分表 / See the ingredient table below。\n'
      +'\n'+unknownStmt('acute')+'\n'+unknownStmt('aquatic'),
    3:'4.1 急救措施描述\n'
      +'总则：如有任何疑虑或症状持续，请就医。\n'
      +'4.1.1 吸入：将患者移至新鲜空气处，保持呼吸道通畅；呼吸困难时给氧，使患者保持复原卧位、覆盖保暖并立即就医。\n'
      +'4.1.2 皮肤接触：立即脱去受污染的衣物和鞋，用大量流动清水冲洗至少 15 分钟；污染的衣物清洗后方可重新使用。\n'
      +'4.1.3 眼睛接触：立即用大量清水冲洗，包括眼睑下方，至少 15 分钟，并立即就医。\n'
      +'4.1.4 食入：立即呼叫中毒急救中心 / 医生；如误吞咽，漱口（仅在患者清醒时）；不要诱导呕吐。\n'
      +'4.2 最重要的症状和健康影响（急性与迟发）：可能导致皮肤过敏反应。\n'
      +'4.3 需要立即就医和特殊治疗的指示：如发生皮肤刺激或皮疹，求医 / 就诊。',
    4:'适用灭火剂：抗溶性泡沫、干粉、二氧化碳、水雾。\n禁用灭火剂：高压直流水（可能造成飞溅扩散）。\n特殊危害：受热分解可产生一氧化碳、氮氧化物、甲醛蒸气。\n消防人员防护：佩戴正压式空气呼吸器，穿全身防化服。',
    5:'6.1 人员防护措施、防护装备和应急程序\n'
      +'6.1.1 非应急人员：在安全的前提下防止进一步泄漏或溢出，远离不相容产品。\n'
      +'6.1.2 应急响应人员：将人员疏散至安全区域，使人员远离并处于泄漏 / 溢出物的上风向，通风该区域，穿戴合适的防护服。\n'
      +'6.2 环境防护措施：不应释放到环境中。不得冲入地表水或生活污水系统。如产品污染河流、湖泊或下水道，应通知相关主管部门。\n'
      +'6.3 泄漏化学品的收容、清除方法及所使用的处置材料：小量泄漏：用砂土或其他惰性材料吸收溢出的产品；大量泄漏：筑堤或挖坑收容，用泵转移至专用收集器。\n'
      +'6.4 参考其他章节：个体防护装备见第 8 章，处置见第 13 章。',
    6:'操作注意事项：密闭操作，加强通风；操作人员须经培训并持证；避免蒸气吸入与皮肤接触。\n储存注意事项：储存于阴凉通风库房，温度 5～35 ℃，远离火种、热源与氧化剂；容器密闭并加锁保管；与酸碱类分开存放。',
    /* 第 8 章 —— G3：接触限值改由 oelTableHtml() 按配方 + 目标市场带出；
       G14：8.2.2 补热危害、8.2.3 补环境暴露控制 */
    7:'8.1 控制参数\n'
      +'8.1.1 职业接触限值（OEL）：见本节限值表 / See the occupational exposure limit table below。\n'
      +'8.1.2 附加职业接触限值：本节不适用（Not applicable）—— 本产品不含设有限值的生物监测指标组分。\n'
      +'8.1.3 DNEL / DMEL 与 PNEC：尚未推导（Not available）。\n'
      +'\n8.2 暴露控制\n'
      +'8.2.1 工程控制：局部排风 + 全面通风，作业区风速 ≥ 0.5 m/s；配置洗眼器与应急淋浴。\n'
      +'8.2.2 个人防护装备（PPE）\n'
      +'　· 眼 / 面部：化学护目镜（EN 166）；大量操作时加配防护面罩\n'
      +'　· 手部：丁腈手套（穿透时间 ≥ 480 min，EN 374）\n'
      +'　· 身体：防化围裙 + 防静电工作服\n'
      +'　· 呼吸：A 型有机蒸气滤毒盒半面罩；高浓度或缺氧时使用送风式呼吸器\n'
      +'　· 热危害（Thermal hazards）：不适用 —— 本品在常温常压下不自燃、不发热。\n'
      +'8.2.3 环境暴露控制：防止进入下水道与地表水；作业区设围堰与收集沟，泄漏物用惰性吸附材料收集后按第 13 章处置。',
    8:'9.1 理化特性见下表 / See the physical and chemical properties table below。\n未获得检测数据的项目如实标注 Not available（与示例文档口径一致）。',
    9:'稳定性：常温常压下稳定。\n应避免的条件：高温、明火、阳光直射、冻结。\n禁配物：强氧化剂、强酸、强碱、异氰酸酯类。\n危险分解产物：一氧化碳、二氧化碳、氮氧化物、甲醛。',
    10:'11.1 危害类别信息、急性毒性（混合物 ATE）与按组分毒性数据见本节表格 / See the toxicological information tables below。\n\n'
      + unknownStmt('acute')
      + '\n\n11.2 其他危害信息\n'+(edStmt('11.2')||'　· 无其他需说明的危害。'),
    11:'12.1 急性水生毒性见下表 / See the acute aquatic toxicity table below。\n12.2–12.8 子项与 PBT/vPvB 评估随表一并列出。',
    12:'13.1 废物处理方法：\n'
      +'按所有适用的地方和国家法规处置。在可行的情况下采用回收 / 再生，否则建议采用焚烧法处置。\n'
      +'空容器可能含有危险残留物。不得在容器上或附近切割、穿孔或焊接。容器清洗前不得去除标签。\n'
      +'受污染的容器不得作为生活垃圾处理；容器应采用适当方法清洗后回用，或视情况填埋 / 焚烧处置。不得焚烧密闭容器。\n'
      +'建议废物代码：08 01 11*（含有机溶剂的涂料和清漆废物污泥，欧洲废物目录）。',
    13:'14 运输信息见下表 / See the transport information table below。',
    14:'15.1 安全、健康和环境法规见下表 / See the regulatory information table below。',
    15:'16.1 修订说明（Indication of changes）\n'
      +'版本：'+(wz.docVer||'V1.0')+'　编制日期：'+todayStr()+'　状态：'+(wz.published?'已发布':'草案 Draft')+'\n'
      +'编制语言：'+(p.lang||'—')+'　目标市场：'+mk+'\n'
      +'编制依据（G8：须点名 CLP 1272/2008 及其 2024/2865 修订）：\n'+legalBasis(p.market)+'\n'
      +'\n16.2 缩略语和首字母缩写（Abbreviations and acronyms）\n'+abbrTable()+'\n'
      +'\n16.3 重要文献参考和数据来源（Key literature references and sources for data）\n'
      +'　· ECHA Registered substances data（ECHA 已注册物质数据库）\n'
      +'　· 供应商安全数据表与实测报告（企业内部受控数据）\n'
      +'\n16.4 混合物分类及其推导程序（Classification and procedure used to derive the classification）\n'
        +deriveTable16()+'\n'
      +'\n16.5 相关 H 语句全文（Relevant H-statements）\n'+hStmtTable()+'\n'
      +'\n16.6 培训说明（Training instructions）\n　· 不适用。\n'
      +'\n16.7 进一步信息（Further information）\n'
      +'\n16.8 读者须知（Notice to reader）\n'
      +'　· 雇主应将本信息作为其所掌握其他信息的补充，并独立判断本信息对确保正确使用、保护员工健康与安全的适用性。\n'
      +'　· 本信息不附带任何保证；不按本 SDS 使用本产品，或将其与任何其他产品 / 工艺组合使用，由使用者自行负责。'
  };
  return T[i]||'（本章节内容由规则库模板生成，需人工补充具体信息。）';
}
function concRange(c){
  var v=parseFloat(c);
  if(v<1)return '< 1 %';
  if(v<5)return '1 – 5 %';
  if(v<10)return '5 – 10 %';
  if(v<25)return '10 – 25 %';
  if(v<50)return '25 – 50 %';
  return '≥ 50 %';
}
var COV_CLS={'高':'green','中高':'blue','中':'orange','低':'red'};
function setWzView(v){wz.view=v;renderStep5();window.scrollTo(0,0);}
function deliverBadge(dirty){
  if(!dirty.length)return '<span class="tag green dot-tag">✓ 交付自检通过 · 未发现内部信息残留</span>';
  return '<span class="tag red dot-tag">✕ 交付自检发现 '+dirty.length+' 处内部信息残留</span>'
    +'<div style="margin-top:6px;font-size:11.8px;color:var(--orange)">'
    +dirty.map(function(d){return '第 '+d.sec+' 章「'+esc(d.name)+'」含敏感词「'+esc(d.w)+'」';}).join('<br>')+'</div>';
}
function renderStep5(){
  if(!wz.draftAt)wz.draftAt=nowStr();
  if(wz.view!=='deliver')wz.view='edit';
  var dv=wz.view==='deliver',p=wz.project;
  var stat={'高':0,'中高':0,'中':0,'低':0};
  SDS_16.forEach(function(s){stat[s.cov]++;});
  var notes=0;for(var k=0;k<16;k++)if(secNotes(k).length)notes++;
  var dirty=deliverScan();
  var acc=SDS_16.map(function(s,i){
    var txt=wz.draftEdits[i]!==undefined?wz.draftEdits[i]:draftText(i);
    var nt=secNotes(i),manual=nt.length>0||!s.auto;
    var head='<button class="acc-hd" onclick="accToggle('+i+')">'
      +'<span class="no">'+String(i+1).padStart(2,'0')+'</span><b>'+s.n+'</b>'
      +'<span class="right">'
        +(dv?''
          :'<span class="tag '+COV_CLS[s.cov]+'">系统覆盖度：'+s.cov+'</span>'
          +(manual?'<span class="tag orange dot-tag">需人工审核</span>':'<span class="tag green dot-tag">系统自动生成</span>')
          +(wz.draftEdits[i]!==undefined?'<span class="tag blue">已编辑</span>':''))
        +'<i class="caret">›</i></span></button>';
    var noteHtml=(!dv&&nt.length)
      ? '<div class="notice warn" style="margin:12px 14px 0"><div class="ni">!</div><div>'
        +'<b style="display:inline">内部批注 · 不会进入交付文档</b><br>'
        +nt.map(function(t){return '　· '+t;}).join('<br>')+'</div></div>'
      : '';
    var tools=dv?''
      : '<div class="act-'+i+' acc-tools"><button class="btn sm" onclick="secEdit('+i+')">✎ 临时编辑</button>'
        +(wz.draftEdits[i]!==undefined?'<button class="btn sm" onclick="secReset('+i+')">还原系统生成内容</button>':'')
        +'<span style="font-size:11.5px;color:var(--muted);margin-left:4px">'
        +(s.auto?'内容由规则库 + 汇集数据自动生成':'内容为模板候选文案，须由 EHS 审核确认')+'</span></div>';
    return '<div class="acc-item" id="acc'+i+'">'+head
      +'<div class="acc-bd">'+noteHtml
      +(i===2?compTableHtml():'')   /* G2：第 3 章组分表改真表格，渲染在文本块之上 */
      +(i===7?oelTableHtml():'')   /* G3：第 8 章职业接触限值表 */
      +(i===8?physTableHtml():'')  /* G13：第 9 章理化特性 25 项表 */
      +(i===10?toxTableHtml():'')  /* G4：第 11 章毒理信息表 */
      +(i===11?ecotoxTableHtml():'')  /* G5：第 12 章生态毒性表 */
      +(i===13?transportTableHtml():'')  /* G10：第 14 章运输信息表 */
      +(i===14?legalTableHtml():'')  /* G6：第 15 章法规 / CSA / Annex XIV */
      +'<div class="sds-text" id="sec'+i+'">'+esc(txt)+'</div>'+tools+'</div></div>';
  }).join('');
  var switchBar='<div class="toolbar" style="margin-bottom:12px;border-bottom:none">'
      +'<button class="btn sm'+(dv?'':' primary')+'" onclick="setWzView(\'edit\')">编制视图（内部工作台）</button>'
      +'<button class="btn sm'+(dv?' primary':'')+'" onclick="setWzView(\'deliver\')">交付预览（客户 / 监管）</button>'
      +'<div class="grow"></div>'
      +(dv
        ? '<button class="btn sm primary" onclick="exportSdsWord()">⤓ 导出 Word</button>'
        : '<button class="btn sm" onclick="accAll(true)">展开全部</button>'
          +'<button class="btn sm" onclick="accAll(false)">收起全部</button>')
    +'</div>';
  var headCard=dv
    ? '<div class="card" style="margin-bottom:12px"><div class="card-hd">'
        +'<h3>SAFETY DATA SHEET · '+esc(p.product||'未命名产品')+'</h3>'
        +'<span class="sub">版本 '+esc(wz.docVer||'V1.0')+' · 编制日期 '+todayStr()+'</span>'
        +'<div class="right"><span class="tag '+(wz.published?'green':'grey')+'">'
        +(wz.published?'已发布':'草案 Draft')+'</span></div></div>'
      +'<div class="card-bd" style="font-size:12.8px;color:var(--muted)">'
        +'目标市场：'+(p.market==='EU'?('欧盟 · '+esc(p.state||'—')):'中国')
        +'　编制语言：'+esc(p.lang||'—')+'<br>'
        +'编制依据：<br>'+esc(legalBasis(p.market)).replace(/\n/g,'<br>')
        +'<div style="margin-top:10px">'+deliverBadge(dirty)+'</div></div></div>'
    : '';
  wzGuide('<div class="notice '+(dv?'ok':'info')+'"><div class="ni">'+(dv?'✓':'i')+'</div><div>'
    +(dv
      ? '<b>第 5 步 · 交付预览</b>此为对客户与监管的正式文档视图：已剥离全部内部标记、批注与编辑工具。'
        +'切换回编制视图可查看覆盖度、审核状态与编辑入口。'
      : '<b>第 5 步 · 生成 SDS 草案</b>按标准 16 章节结构生成，章节标题旁标注系统覆盖度；'
        +'橙色「内部批注」块仅供编制人员参考，<b style="display:inline">不会进入交付文档</b>。')
    +'</div></div>');
  $('wzBody').innerHTML=
    switchBar
    +(dv?sdsDocPreviewHtml()
    :'<div class="kpi-row">'
      +'<div class="kpi"><span>草案章节</span><b>16</b><small>标准 SDS 结构齐套</small></div>'
      +'<div class="kpi"><span>覆盖度「高」</span><b style="color:var(--green)">'+stat['高']+'</b><small>可直接进入审核</small></div>'
      +'<div class="kpi"><span>覆盖度「中/中高」</span><b style="color:var(--orange)">'+(stat['中高']+stat['中'])+'</b><small>需人工补充确认</small></div>'
      +'<div class="kpi"><span>覆盖度「低」</span><b style="color:var(--red)">'+stat['低']+'</b><small>依赖人工编写</small></div>'
      +'<div class="kpi"><span>内部批注</span><b style="color:var(--orange)">'+notes+'</b><small>章节待人工确认</small></div>'
    +'</div>'
    +'<div class="card"><div class="card-hd"><h3>SDS 草案 · '+esc(wz.project.product||'未命名产品')+'</h3>'
      +'<span class="sub">生成时间 '+wz.draftAt+'</span></div>'
      +'<div class="card-bd tight"><div class="acc" style="border:none;border-radius:0">'+acc+'</div></div></div>');
  var first=$('acc0');if(first)first.classList.add('open');
}
function accToggle(i){$('acc'+i).classList.toggle('open');}
function accAll(open){for(var i=0;i<16;i++)$('acc'+i).classList.toggle('open',open);}
function secEdit(i){
  var cur=wz.draftEdits[i]!==undefined?wz.draftEdits[i]:draftText(i);
  var box=$('sec'+i);
  box.outerHTML='<textarea class="ctrl" id="sec'+i+'" style="min-height:180px;font-size:12.8px;line-height:1.8">'+esc(cur)+'</textarea>';
  var tools=$('acc'+i).querySelector('.acc-tools');
  tools.innerHTML='<button class="btn sm primary" onclick="secSave('+i+')">保存修改</button><button class="btn sm" onclick="renderStep5();$(\'acc'+i+'\').classList.add(\'open\')">取消</button><span style="font-size:11.5px;color:var(--orange);margin-left:4px">临时编辑仅作用于当前草案，不回写基础数据库</span>';
}
function secSave(i){
  wz.draftEdits[i]=$('sec'+i).value;
  renderStep5();$('acc'+i).classList.add('open');
  toast('第 '+(i+1)+' 章「'+SDS_16[i].n+'」已保存修改','ok');
}
function secReset(i){
  delete wz.draftEdits[i];
  renderStep5();$('acc'+i).classList.add('open');
  toast('已还原为系统生成内容','info');
}

/* ------------------------------------------------------------------
   步骤 6：人工审核与批准发布
   ------------------------------------------------------------------ */
function renderStep6(){
  var p=wz.project;
  var pend=(wz.classItems||[]).filter(function(c){return c.status==='pending';}).length;
  var miss=wzMissCount();
  var checks=[
    ['项目基础信息完整','ok','产品名称、目标市场、语言、投放日期均已填写'],
    ['配方已冻结','ok','快照 FORM-WPU320-V1.0 · '+wz.frozenAt],
    ['受控数据齐套',miss?'err':'ok',miss?(miss+' 项待补充'):'全部数据项已具备来源'],
    ['分类结论已判定',pend?'err':'ok',pend?(pend+' 项待人工判定'):'含 '+(wz.classItems||[]).filter(function(c){return c.status==='manual';}).length+' 项人工调整'],
    ['16 章节结构齐套','ok','已生成 16 章，其中 '+Object.keys(wz.draftEdits).length+' 章经人工编辑'],
    ['保密组分披露方式合规','warn','2 项保密组分采用浓度区间披露，替代名称申请待提交'],
    ['EHS 与法规人员签署',wz.published?'ok':'warn',wz.published?'已由 EHS 负责人批准':'尚未完成人工签署']
  ];
  var st=wz.published?['已正式发布','green']:(wz.submitted?['审核中','orange']:['草案 Draft','grey']);

  wzGuide('<div class="notice '+(wz.published?'ok':'info')+'"><div class="ni">'+(wz.published?'✓':'i')+'</div><div><b>第 6 步 · 人工审核与批准发布</b>'
      +(wz.published?'文档已完成批准发布，可执行导出。':'提交审核后由 EHS 与法规人员进行人工复核，批准后方可导出正式文件。')+'</div></div>');
  $('wzBody').innerHTML=
    '<div class="kpi-row">'
      +'<div class="kpi"><span>草案状态</span><b style="font-size:18px;color:var(--'+(st[1]==='grey'?'muted':st[1])+')">'+st[0]+'</b><small>'+(wz.publishedAt||'—')+'</small></div>'
      +'<div class="kpi"><span>生成时间</span><b style="font-size:16px">'+(wz.draftAt||'—').slice(5)+'</b><small>草案版本 V1.0</small></div>'
      +'<div class="kpi"><span>数据完整性</span><b style="color:'+((miss||pend)?'var(--orange)':'var(--green)')+'">'+(miss||pend?'存在提示项':'通过')+'</b><small>'+checks.filter(function(c){return c[1]==='ok';}).length+'/'+checks.length+' 项校验通过</small></div>'
      +'<div class="kpi"><span>目标市场</span><b style="font-size:16px">'+(p.market==='EU'?('欧盟·'+(p.state||'').split(' ')[0]):'中国')+'</b><small>'+esc(p.lang||'—')+'</small></div>'
    +'</div>'
    +'<div class="card"><div class="card-hd"><h3>数据完整性校验结果</h3><span class="sub">发布前系统自动核查</span></div>'
      +'<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:34px"></th><th style="width:230px">校验项</th><th>结果说明</th><th style="width:110px">状态</th></tr></thead><tbody>'
      +checks.map(function(c,i){
        var m={ok:['green','✓','通过'],warn:['orange','!','提示'],err:['red','✕','未通过']}[c[1]];
        return '<tr><td style="color:var(--muted)">'+(i+1)+'</td><td><b>'+c[0]+'</b></td><td style="color:var(--ink2)">'+c[2]+'</td><td><span class="tag '+m[0]+' dot-tag">'+m[2]+'</span></td></tr>';
      }).join('')
      +'</tbody></table></div></div>'
    +'<div class="card"><div class="card-hd"><h3>审核与发布操作</h3><span class="sub">系统不替代人工合规责任</span></div><div class="card-bd">'
      +'<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">'
        +'<button class="btn lg '+(wz.submitted?'disabled':'primary')+'" '+(wz.submitted?'disabled':'')+' onclick="wzSubmit()">提交审核</button>'
        +'<button class="btn lg '+(wz.published?'disabled':(wz.submitted?'ok':'disabled'))+'" '+((!wz.submitted||wz.published)?'disabled':'')+' onclick="wzPublish()">模拟批准发布</button>'
        +'<span style="width:1px;height:26px;background:var(--line)"></span>'
        +'<button class="btn lg '+(wz.published?'':'disabled')+'" '+(wz.published?'':'disabled')+' onclick="wzExport(\'PDF\')">⤓ 导出 PDF</button>'
        +'<button class="btn lg '+(wz.published?'':'disabled')+'" '+(wz.published?'':'disabled')+' onclick="wzExport(\'Word\')">⤓ 导出 Word</button>'
        +'<span style="font-size:12.3px;color:var(--muted)">'+(wz.published?'导出功能已解锁':'导出功能在批准发布后解锁')+'</span>'
      +'</div>'
      +'<div style="margin-top:16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">'
        +'<span class="tag '+(wz.submitted?'green':'grey')+' dot-tag">① 提交审核</span><span style="color:var(--muted)">→</span>'
        +'<span class="tag '+(wz.published?'green':'grey')+' dot-tag">② EHS/法规批准</span><span style="color:var(--muted)">→</span>'
        +'<span class="tag '+(wz.published?'green':'grey')+' dot-tag">③ 正式发布并归档</span>'
      +'</div>'
      +'</div></div>'
    +'<div class="notice warn"><div class="ni">!</div><div><b>合规责任提示</b>正式发布版本需通过 EHS 与法规人员审核，<b style="display:inline">系统不替代人工合规责任</b>。系统生成内容仅作为编制辅助，最终文本的准确性由发布责任人承担。</div></div>';
}
function wzSubmit(){
  sdsConfirm('提交审核','确认将当前 SDS 草案提交至 <b>EHS 合规部 + 法规事务</b> 审核？<br><span style="color:var(--muted)">提交后草案进入审核流程，编辑将被锁定。</span>',function(){
    wz.submitted=true;renderStep6();
    toast('已提交审核，审批单号 AP-2026-0871','ok');
  },'提交审核');
}
function wzPublish(){
  sdsConfirm('模拟批准发布','确认以 <b>EHS 负责人</b> 身份批准发布？<br><span style="color:var(--muted)">发布后状态变更为「已正式发布」，并解锁 PDF / Word 导出。</span>',function(){
    wz.published=true;wz.publishedAt=nowStr();renderStep6();
    toast('SDS 已正式发布（版本 V1.0）','ok');
  },'批准发布');
}
function wzExport(type){
  openModal({title:'导出 '+type+' 文件',width:460,
    body:'<div style="text-align:center;padding:8px 0 4px"><div style="font-size:13px;margin-bottom:12px">正在生成 <b>'+esc(wz.project.product||'SDS')+'_'+(wz.project.market==='EU'?'EU':'CN')+'_V1.0.'+(type==='PDF'?'pdf':'docx')+'</b></div>'
      +'<div class="bar" id="expBar"><i></i></div><div style="margin-top:8px;color:var(--muted);font-size:12.5px" id="expTxt">0%</div></div>',
    footer:''});
  progress('expBar','expTxt',function(){
    closeModal();
    toast(type+' 文件已生成并下载（演示）','ok');
  },20);
}

/* ==================================================================
   ==================  模块 2：基础数据库管理  =====================
   通用能力：分页 / 搜索 / 筛选 / 查看 / 编辑 / 删除 / 批量导入 / 批量删除
   ================================================================== */
var _sdsUidN=0;
function sdsUid(){return 'R'+(++_sdsUidN);}
function sdsMk(arr){return arr.map(function(o){o._id=sdsUid();return o;});}

var DB_CFG={
  material:{
    title:'物料主数据',
    desc:'企业内部物料的唯一身份档案，是配方、SDS 与法规匹配的基础。',
    cols:[{k:'code',t:'物料编码',w:'130px',mono:true},{k:'name',t:'物料名称'},{k:'type',t:'物料类型',w:'92px'},
          {k:'form',t:'物质形态',w:'140px',tag:true},{k:'_comp',t:'组分数',w:'72px'},{k:'spec',t:'规格 / 型号',w:'150px'},{k:'_sup',t:'主供应商',w:'160px'},
          {k:'substType',t:'替代类型',w:'96px',fmt:function(r){ if(!r.substType)return '<span class="muted">—</span>'; return '<span class="tag '+(r.substType==='等值替代'?'green':'orange')+'">'+esc(r.substType)+'</span>'; }},
          {k:'owner',t:'责任人',w:'90px'},
          {k:'status',t:'状态',w:'80px',tag:true},
          {k:'stopDate',t:'停用时间',w:'100px',fmt:function(r){ return r.stopDate?esc(r.stopDate):'<span class="muted">—</span>'; }},
          {k:'created',t:'创建时间',w:'150px'}],
    fields:[{k:'code',t:'物料编码',req:true,ph:'MAT-00xxx'},{k:'name',t:'物料名称',req:true},
            {k:'type',t:'物料类型',type:'select',opts:['原料','中间体','成品','助剂','包装材料'],req:true},
            {k:'form',t:'物质形态',type:'select',opts:['纯物质（单物料）','混合物（混合料）'],req:true},
            {k:'status',t:'状态',type:'select',opts:['正常','停用'],req:true},
            {k:'substType',t:'替代类型',type:'select',opts:['等值替代','降级替代']},
            {k:'substTo',t:'替代料编码',ph:'如 MAT-00904，停用后由哪只物料接替'},
            {k:'stopDate',t:'停用时间',type:'date'},
            {k:'spec',t:'规格 / 型号'},{k:'owner',t:'责任人'},{k:'remark',t:'备注',type:'textarea',span:true}],
    filter:{k:'type',label:'全部物料类型',opts:['原料','中间体','成品','助剂','包装材料']},
    kwKeys:['code','name','spec','_sup'],
    sample:[{code:'MAT-00901',name:'水性丙烯酸乳液 AC-55',type:'原料',spec:'55% 固含',owner:'李工',status:'正常'},
            {code:'MAT-00902',name:'流平剂 LV-08',type:'助剂',spec:'工业级',owner:'李工',status:'正常'},
            {code:'MAT-00903',name:'消泡剂 DF-12',type:'助剂',spec:'有机硅型',owner:'王工',status:'正常'}],
    rows:sdsMk([
      {code:'MAT-00127',name:'水性聚氨酯涂饰树脂 WPU-320',type:'成品',form:'混合物（混合料）',spec:'35% 固含 / 200kg 桶',owner:'张工',status:'正常',created:'2025-11-03 09:22',remark:'皮革表面涂饰主料',
        recipe:[{cas:'9009-54-5',name:'聚氨酯预聚体',conc:'40.00',range:'30–50%',secret:false},{cas:'7732-18-5',name:'水',conc:'58.00',range:'48–68%',secret:false},{cas:'111-76-2',name:'成膜助剂（乙二醇单丁醚等）',conc:'2.00',range:'1–5%',secret:true},{cas:'124-68-5',name:'pH 调节剂（AMP-95）',conc:'0.50',range:'0.5–3%',secret:true}]},
      {code:'MAT-00128',name:'水性聚氨酯预聚体',type:'中间体',form:'纯物质（单物料）',spec:'—',owner:'张工',status:'正常',created:'2025-11-03 09:40',remark:'内部合成中间体',
        recipe:[{cas:'9009-54-5',name:'聚氨酯预聚体',conc:'100.00',secret:false}]},
      {code:'MAT-00210',name:'加脂剂 L-27',type:'成品',form:'混合物（混合料）',spec:'50% 固含',owner:'李工',status:'正常',created:'2025-12-18 14:05',remark:'',
        recipe:[{cas:'7732-18-5',name:'水',conc:'60.00',secret:false},{cas:'107-21-1',name:'乙二醇',conc:'25.00',secret:false},{cas:'64-17-5',name:'乙醇',conc:'15.00',secret:false}]},
      {code:'MAT-00211',name:'合成加脂剂基础油',type:'原料',form:'混合物（混合料）',spec:'工业级',owner:'李工',status:'正常',created:'2025-12-18 14:20',remark:'',recipe:[]},
      {code:'MAT-00305',name:'铬鞣剂 CR-33',type:'原料',form:'混合物（混合料）',spec:'碱度 33%',owner:'王工',status:'正常',created:'2026-01-09 10:11',remark:'含 Cr(III)，需重点关注法规',recipe:[]},
      {code:'MAT-00306',name:'蒙囿剂 MK-2',type:'助剂',form:'混合物（混合料）',spec:'液体',owner:'王工',status:'正常',created:'2026-01-09 10:35',remark:'',recipe:[]},
      {code:'MAT-00412',name:'乙二醇单丁醚',type:'原料',form:'纯物质（单物料）',spec:'≥99.5%',owner:'赵工',status:'正常',created:'2026-02-02 08:50',remark:'溶剂',recipe:[{cas:'111-76-2',name:'乙二醇单丁醚',conc:'100.00',secret:false}]},
      {code:'MAT-00413',name:'工业乙醇',type:'原料',form:'纯物质（单物料）',spec:'95%',owner:'赵工',status:'正常',created:'2026-02-02 09:02',remark:'',recipe:[{cas:'64-17-5',name:'乙醇',conc:'100.00',secret:false}]},
      {code:'MAT-00520',name:'丙烯酸单体',type:'原料',form:'纯物质（单物料）',spec:'≥99%',owner:'赵工',status:'正常',created:'2026-02-20 16:41',remark:'保密组分来源',recipe:[{cas:'79-10-7',name:'丙烯酸',conc:'100.00',secret:false}]},
      {code:'MAT-00521',name:'甲醛水溶液',type:'原料',form:'混合物（混合料）',spec:'37%',owner:'张工',status:'停用',substType:'降级替代',substTo:'MAT-00904',stopDate:'2026-07-10',created:'2026-02-20 16:55',remark:'SVHC 组分，逐步替代中',
        recipe:[{cas:'50-00-0',name:'甲醛',conc:'37.00',secret:false},{cas:'7732-18-5',name:'水',conc:'63.00',secret:false}]},
      {code:'MAT-00522',name:'BIT 防霉剂 20',type:'助剂',form:'混合物（混合料）',spec:'20% 有效成分',owner:'王工',status:'正常',created:'2026-06-20 10:30',remark:'异噻唑啉酮类，接替 AM-7',
        recipe:[{cas:'2634-33-5',name:'1,2-苯并异噻唑啉-3-酮（BIT）',conc:'20.00',secret:false},{cas:'7732-18-5',name:'水',conc:'80.00',secret:false}]},
      {code:'MAT-00630',name:'皮革涂饰光亮剂 GL-9',type:'成品',form:'混合物（混合料）',spec:'—',owner:'李工',status:'正常',created:'2026-03-11 11:20',remark:'',recipe:[]},
      {code:'MAT-00631',name:'手感剂 HF-5',type:'助剂',form:'混合物（混合料）',spec:'液体',owner:'李工',status:'正常',created:'2026-03-11 11:28',remark:'',recipe:[]},
      {code:'MAT-00702',name:'25kg HDPE 塑料桶',type:'包装材料',form:'混合物（混合料）',spec:'25L',owner:'仓储部',status:'正常',created:'2026-04-06 13:00',remark:'',recipe:[]},
      {code:'MAT-00703',name:'200kg 镀锌铁桶',type:'包装材料',form:'混合物（混合料）',spec:'200L',owner:'仓储部',status:'正常',created:'2026-04-06 13:06',remark:'',recipe:[]},
      {code:'MAT-00810',name:'水性封底树脂 SB-11',type:'成品',form:'混合物（混合料）',spec:'30% 固含',owner:'张工',status:'正常',created:'2026-05-19 15:33',remark:'新品，SDS 编制中',recipe:[]},
      {code:'MAT-00811',name:'交联剂 XL-3',type:'助剂',form:'混合物（混合料）',spec:'工业级',owner:'王工',status:'正常',created:'2026-05-19 15:47',remark:'',recipe:[]},
      {code:'MAT-00812',name:'防霉剂 AM-7',type:'助剂',form:'混合物（混合料）',spec:'—',owner:'王工',status:'停用',substType:'等值替代',substTo:'MAT-00522',stopDate:'2026-08-01',created:'2026-06-01 09:15',remark:'配方替换',recipe:[]},
      {code:'MAT-00901',name:'去离子水',type:'原料',form:'纯物质（单物料）',spec:'电导率<10μS/cm',owner:'赵工',status:'正常',created:'2026-06-15 10:02',remark:'',recipe:[{cas:'7732-18-5',name:'水',conc:'100.00',secret:false}]},
      {code:'MAT-00904',name:'无醛固色剂 FS-20',type:'助剂',form:'混合物（混合料）',spec:'—',owner:'张工',status:'正常',created:'2026-07-01 14:20',remark:'接替甲醛水溶液的固色工序',recipe:[]},
    ])
  },
  component:{
    title:'组分基础数据',
    desc:'按 CAS 号维护的物质身份档案，供配方录入自动带出与分类计算引用。',
    cols:[{k:'cas',t:'CAS 号',w:'120px',mono:true},{k:'cn',t:'中文名称',w:'130px'},{k:'en',t:'英文名称',w:'150px'},
          {k:'formula',t:'分子式',w:'100px'},{k:'ec',t:'EC 号',w:'100px',mono:true},
          {k:'_m',t:'M 因子',w:'110px',fmt:function(r){return clpMTag(r.cas);}},
          {k:'_ate',t:'急性毒性数据',w:'130px',fmt:function(r){return toxTag(r.cas,'ateState');}},
          {k:'status',t:'状态',w:'96px',tag:true}],
    fields:[{k:'cas',t:'CAS 号',req:true,ph:'例如 108-88-3'},{k:'cn',t:'中文名称',req:true},{k:'en',t:'英文名称',req:true},
            {k:'formula',t:'分子式'},{k:'ec',t:'EC 号'},
            {k:'reachNo',t:'REACH 注册号',span:true,ph:'未注册或适用豁免时留空'},
            {k:'status',t:'状态',type:'select',opts:['已验证','待验证','已停用'],req:true},
            {k:'remark',t:'备注',type:'textarea',span:true}],
    filter:{k:'status',label:'全部状态',opts:['已验证','待验证','已停用']},
    kwKeys:['cas','cn','en','formula'],
    sample:[{cas:'110-54-3',cn:'正己烷',en:'n-Hexane',formula:'C₆H₁₄',ec:'203-777-6',status:'待验证'},
            {cas:'71-36-3',cn:'正丁醇',en:'1-Butanol',formula:'C₄H₁₀O',ec:'200-751-6',status:'待验证'},
            {cas:'123-86-4',cn:'乙酸丁酯',en:'Butyl acetate',formula:'C₆H₁₂O₂',ec:'204-658-1',status:'已验证'}],
    rows:sdsMk([
      {cas:'7732-18-5',cn:'水',en:'Water',formula:'H₂O',ec:'231-791-2',status:'已验证',remark:''},
      {cas:'64-17-5',cn:'乙醇',en:'Ethanol',formula:'C₂H₆O',ec:'200-578-6',reachNo:'01-2119457610-43-xxxx',status:'已验证',remark:'易燃液体 Cat.2'},
      {cas:'111-76-2',cn:'乙二醇单丁醚',en:'2-Butoxyethanol',formula:'C₆H₁₄O₂',ec:'203-905-0',reachNo:'01-2119475108-36-xxxx',status:'已验证',remark:'CLP Annex VI 收录'},
      {cas:'79-10-7',cn:'丙烯酸',en:'Acrylic acid',formula:'C₃H₄O₂',ec:'201-177-9',reachNo:'01-2119459201-49-xxxx',status:'已验证',remark:'腐蚀 Cat.1A'},
      {cas:'50-00-0',cn:'甲醛',en:'Formaldehyde',formula:'CH₂O',ec:'200-001-8',reachNo:'01-2119456816-27-xxxx',status:'已验证',remark:'SVHC / Carc.1B'},
      {cas:'9009-54-5',cn:'聚氨酯预聚体',en:'Polyurethane prepolymer',formula:'—',ec:'—',reachNo:'聚合物豁免（Art.2(9)）',status:'待验证',remark:'聚合物豁免，需确认游离 NCO'},
      {cas:'13463-41-7',cn:'吡硫翁锌',en:'Zinc pyrithione',formula:'C₁₀H₈N₂O₂S₂Zn',ec:'236-671-3',reachNo:'01-2120769821-45-xxxx',status:'已验证',remark:'杀菌防霉剂，已维护 M 因子'},
      {cas:'8001-54-5',cn:'苯扎氯铵',en:'Benzalkonium chloride',formula:'C₁₇H₃₀ClN',ec:'264-151-6',reachNo:'01-2119954063-42-xxxx',status:'已验证',remark:'阳离子杀菌剂，已维护 M 因子'},
      {cas:'108-88-3',cn:'甲苯',en:'Toluene',formula:'C₇H₈',ec:'203-625-9',status:'已验证',remark:''},
      {cas:'67-64-1',cn:'丙酮',en:'Acetone',formula:'C₃H₆O',ec:'200-662-2',status:'已验证',remark:''},
      {cas:'75-09-2',cn:'二氯甲烷',en:'Dichloromethane',formula:'CH₂Cl₂',ec:'200-838-9',status:'已停用',remark:'工艺已淘汰'},
      {cas:'1310-73-2',cn:'氢氧化钠',en:'Sodium hydroxide',formula:'NaOH',ec:'215-185-5',status:'已验证',remark:''},
      {cas:'7664-93-9',cn:'硫酸',en:'Sulfuric acid',formula:'H₂SO₄',ec:'231-639-5',status:'已验证',remark:''},
      {cas:'7647-01-0',cn:'盐酸',en:'Hydrochloric acid',formula:'HCl',ec:'231-595-7',status:'已验证',remark:''},
      {cas:'7722-84-1',cn:'过氧化氢',en:'Hydrogen peroxide',formula:'H₂O₂',ec:'231-765-0',status:'已验证',remark:''},
      {cas:'108-95-2',cn:'苯酚',en:'Phenol',formula:'C₆H₆O',ec:'203-632-7',status:'待验证',remark:'毒理数据待补'},
      {cas:'107-21-1',cn:'乙二醇',en:'Ethylene glycol',formula:'C₂H₆O₂',ec:'203-473-3',status:'已验证',remark:''},
      {cas:'1330-20-7',cn:'二甲苯',en:'Xylene',formula:'C₈H₁₀',ec:'215-535-7',status:'已验证',remark:''},
      {cas:'10043-01-3',cn:'硫酸铝',en:'Aluminium sulfate',formula:'Al₂(SO₄)₃',ec:'233-135-0',status:'已验证',remark:'鞣制助剂'},
      {cas:'7789-09-5',cn:'重铬酸铵',en:'Ammonium dichromate',formula:'(NH₄)₂Cr₂O₇',ec:'232-143-1',status:'已停用',remark:'Cr(VI) 禁用'}
    ])
  },
  measure:{
    title:'实测与供应商数据',
    desc:'来自第三方检测报告与供应商 SDS 的原始数据，是分类判定的最高优先级依据。',
    cols:[{k:'no',t:'数据编号',w:'130px',mono:true},{k:'cas',t:'对应 CAS 号',w:'120px',mono:true},{k:'item',t:'检测项目',w:'150px'},
          {k:'value',t:'数值',w:'120px'},{k:'unit',t:'单位',w:'90px'},{k:'source',t:'数据来源',w:'120px',tag:true},{k:'report',t:'报告编号',w:'150px',mono:true},{k:'date',t:'报告日期',w:'110px'}],
    fields:[{k:'no',t:'数据编号',req:true,ph:'TR-2026-xxxx'},{k:'cas',t:'对应 CAS 号',req:true},
            {k:'item',t:'检测项目',type:'select',opts:['闪点','沸点','pH 值','密度','急性经口毒性 LD50','皮肤刺激性','眼刺激性','水生急性毒性 LC50','VOC 含量','游离甲醛'],req:true},
            {k:'value',t:'数值',req:true},{k:'unit',t:'单位',type:'select',opts:['℃','mg/kg','mg/L','g/cm³','%','ppm','无量纲']},
            {k:'source',t:'数据来源',type:'select',opts:['实测报告','供应商SDS'],req:true},
            {k:'report',t:'报告编号',req:true},{k:'date',t:'报告日期',type:'date'},
            {k:'method',t:'测试方法 / 标准',span:true,ph:'例如 OECD 423 / ISO 2719'}],
    filter:{k:'source',label:'全部数据来源',opts:['实测报告','供应商SDS']},
    kwKeys:['no','cas','item','report'],
    sample:[{no:'TR-2026-0501',cas:'64-17-5',item:'闪点',value:'13',unit:'℃',source:'实测报告',report:'SGS-2026-A0501',date:'2026-05-08',method:'ISO 2719'},
            {no:'TR-2026-0502',cas:'111-76-2',item:'VOC 含量',value:'99.2',unit:'%',source:'实测报告',report:'SGS-2026-A0502',date:'2026-05-08',method:'GB/T 23985'},
            {no:'SP-2026-0140',cas:'9009-54-5',item:'密度',value:'1.09',unit:'g/cm³',source:'供应商SDS',report:'SUP-A-2026-14',date:'2026-04-30',method:'供应商提供'}],
    rows:sdsMk([
      {no:'TR-2026-0413',cas:'79-10-7',item:'眼刺激性',value:'刺激 Cat.2',unit:'无量纲',source:'实测报告',report:'SGS-2026-A0413',date:'2026-04-13',method:'OECD 405'},
      {no:'TR-2026-0414',cas:'111-76-2',item:'闪点',value:'62',unit:'℃',source:'实测报告',report:'SGS-2026-A0414',date:'2026-04-13',method:'ISO 2719 闭杯法'},
      {no:'TR-2026-0415',cas:'7732-18-5',item:'pH 值',value:'7.2',unit:'无量纲',source:'实测报告',report:'SGS-2026-A0415',date:'2026-04-14',method:'GB/T 6920'},
      {no:'TR-2026-0416',cas:'9009-54-5',item:'闪点',value:'>200',unit:'℃',source:'实测报告',report:'SGS-2026-A0416',date:'2026-04-14',method:'ISO 2719'},
      {no:'TR-2026-0417',cas:'9009-54-5',item:'密度',value:'1.06',unit:'g/cm³',source:'实测报告',report:'SGS-2026-A0417',date:'2026-04-15',method:'GB/T 4472'},
      {no:'TR-2026-0418',cas:'50-00-0',item:'游离甲醛',value:'0.35',unit:'%',source:'实测报告',report:'CTI-2026-F118',date:'2026-04-20',method:'GB/T 19941'},
      {no:'TR-2026-0419',cas:'79-10-7',item:'急性经口毒性 LD50',value:'340',unit:'mg/kg',source:'实测报告',report:'CTI-2026-T221',date:'2026-04-22',method:'OECD 423'},
      {no:'TR-2026-0420',cas:'111-76-2',item:'水生急性毒性 LC50',value:'1474',unit:'mg/L',source:'实测报告',report:'CTI-2026-E077',date:'2026-04-25',method:'OECD 203'},
      {no:'SP-2026-0101',cas:'9009-54-5',item:'皮肤刺激性',value:'刺激 Cat.2',unit:'无量纲',source:'供应商SDS',report:'SUP-A-2026-01',date:'2026-03-02',method:'供应商 SDS 第 11 章'},
      {no:'SP-2026-0102',cas:'111-76-2',item:'急性经口毒性 LD50',value:'1480',unit:'mg/kg',source:'供应商SDS',report:'SUP-B-2026-07',date:'2026-03-05',method:'供应商 SDS 第 11 章'},
      {no:'SP-2026-0103',cas:'64-17-5',item:'沸点',value:'78.4',unit:'℃',source:'供应商SDS',report:'SUP-C-2026-11',date:'2026-03-11',method:'供应商 SDS 第 9 章'},
      {no:'SP-2026-0104',cas:'50-00-0',item:'闪点',value:'59',unit:'℃',source:'供应商SDS',report:'SUP-D-2026-03',date:'2026-03-18',method:'37% 水溶液'},
      {no:'TR-2026-0421',cas:'1310-73-2',item:'pH 值',value:'13.8',unit:'无量纲',source:'实测报告',report:'SGS-2026-A0421',date:'2026-05-02',method:'GB/T 6920'},
      {no:'TR-2026-0422',cas:'10043-01-3',item:'水生急性毒性 LC50',value:'>100',unit:'mg/L',source:'实测报告',report:'CTI-2026-E081',date:'2026-05-06',method:'OECD 203'},
      {no:'SP-2026-0105',cas:'108-88-3',item:'闪点',value:'4',unit:'℃',source:'供应商SDS',report:'SUP-E-2026-09',date:'2026-05-12',method:'供应商 SDS 第 9 章'},
      {no:'TR-2026-0423',cas:'7789-09-5',item:'急性经口毒性 LD50',value:'54',unit:'mg/kg',source:'实测报告',report:'CTI-2026-T235',date:'2026-05-20',method:'OECD 423'}
    ])
  }
};
var dbKey='material',dbPage=1,dbKw='',dbFilterV='',dbSel={};
var _edRecipe=[],_edForm='';  /* 物料编辑态：配方组成临时缓冲 */
Object.keys(DB_CFG).forEach(function(k){dbSel[k]=[];});
var PAGE_SIZE=8;

function TAG_CLS(v){
  if(v==='纯物质（单物料）')return 'green';
  if(v==='混合物（混合料）')return 'purple';
  if(['正常','启用','已验证','已生效','实测报告','有效'].indexOf(v)>=0)return 'green';
  if(['审核中','待验证','待复核','供应商SDS','同步中','待更新'].indexOf(v)>=0)return 'orange';
  if(['停用','已停用','已归档','未匹配'].indexOf(v)>=0)return 'grey';
  return 'blue';
}
function dbCur(){return DB_CFG[dbKey];}
function dbFiltered(){
  var c=dbCur(),kw=dbKw.trim().toLowerCase();
  return c.rows.filter(function(r){
    if(dbFilterV&&r[c.filter.k]!==dbFilterV)return false;
    if(!kw)return true;
    return c.kwKeys.some(function(k){return String(r[k]||'').toLowerCase().indexOf(kw)>=0;});
  });
}
function dbRender(){
  var c=dbCur();
  $('dbTitle').textContent=c.title;
  $('dbDesc').textContent=c.desc;
  /* 筛选下拉 */
  var fs=$('dbFilter');
  if(fs.dataset.for!==dbKey){
    fs.innerHTML='<option value="">'+c.filter.label+'</option>'+c.filter.opts.map(function(o){return '<option>'+o+'</option>';}).join('');
    fs.dataset.for=dbKey;fs.value=dbFilterV;
  }
  $('dbKw').value=dbKw;
  /* KPI */
  var all=c.rows.length,f=dbFiltered();
  var gd={material:['status','正常'],component:['status','已验证'],measure:['source','实测报告']}[dbKey];
  var g1=c.rows.filter(function(r){return r[gd[0]]===gd[1];}).length;
  $('dbKpi').innerHTML=
    '<div class="kpi"><span>数据总量</span><b>'+all+'</b><small>'+c.title+'</small></div>'
    +'<div class="kpi"><span>当前筛选结果</span><b style="color:var(--brand)">'+f.length+'</b><small>关键词 + 条件筛选后</small></div>'
    +'<div class="kpi"><span>有效 / 高优先级</span><b style="color:var(--green)">'+g1+'</b><small>可用于 SDS 生成</small></div>'
    +'<div class="kpi"><span>已勾选</span><b style="color:'+(dbSel[dbKey].length?'var(--orange)':'var(--ink)')+'">'+dbSel[dbKey].length+'</b><small>支持批量删除</small></div>';
  /* 表格 */
  var totalPage=Math.max(1,Math.ceil(f.length/PAGE_SIZE));
  if(dbPage>totalPage)dbPage=totalPage;
  var pageRows=f.slice((dbPage-1)*PAGE_SIZE,dbPage*PAGE_SIZE);
  pageRows.forEach(function(r){r._comp=(r.recipe&&r.recipe.length)?r.recipe.length:'—';});
  var allChecked=pageRows.length&&pageRows.every(function(r){return dbSel[dbKey].indexOf(r._id)>=0;});
  var head='<thead><tr><th style="width:36px"><input type="checkbox" class="chk" '+(allChecked?'checked':'')+' onchange="dbSelPage(this.checked)"></th>'
    +c.cols.map(function(col){return '<th'+(col.w?' style="width:'+col.w+'"':'')+'>'+col.t+'</th>';}).join('')
    +'<th style="width:150px">操作</th></tr></thead>';
  var body=pageRows.length?pageRows.map(function(r){
    var on=dbSel[dbKey].indexOf(r._id)>=0;
    return '<tr class="'+(on?'sel':'')+'"><td><input type="checkbox" class="chk" '+(on?'checked':'')+' onchange="dbSelRow(\''+r._id+'\',this.checked)"></td>'
      +c.cols.map(function(col){
        if(col.fmt)return '<td>'+col.fmt(r)+'</td>';   /* fmt 返回 HTML，不再转义 */
        var v=r[col.k]==null?'—':r[col.k];
        if(col.tag)return '<td><span class="tag '+TAG_CLS(v)+' dot-tag">'+esc(v)+'</span></td>';
        return '<td'+(col.mono?' class="mono"':'')+'>'+esc(v)+'</td>';
      }).join('')
      +'<td class="acts">'+(dbKey==='material'?'<button class="btn-link" onclick="matOpen(\''+esc(r.code)+'\')">详情</button>':'')
      +'<button class="btn-link" onclick="dbView(\''+r._id+'\')">查看</button>'
      +'<button class="btn-link" onclick="dbEdit(\''+r._id+'\')">编辑</button>'
      +'<button class="btn-link del" onclick="dbDel(\''+r._id+'\')">删除</button></td></tr>';
  }).join(''):'<tr><td colspan="'+(c.cols.length+2)+'" class="tbl-empty"><span class="big">▤</span>没有符合条件的数据，请调整搜索或筛选条件</td></tr>';
  $('dbTable').innerHTML=head+'<tbody>'+body+'</tbody>';
  /* 分页 */
  $('dbPager').innerHTML=pagerHtml(f.length,dbPage,totalPage,'dbPageGo');
  $('dbSelInfo').textContent=dbSel[dbKey].length?('已选择 '+dbSel[dbKey].length+' 条'):'';
  $('dbBatchDel').classList.toggle('disabled',dbSel[dbKey].length===0);
  $('dbBatchDel').disabled=dbSel[dbKey].length===0;
}
function pagerHtml(total,page,totalPage,fn){
  var h='<span class="info">共 '+total+' 条记录 · 第 '+page+' / '+totalPage+' 页</span>';
  h+='<button class="pg-btn" '+(page===1?'disabled':'')+' onclick="'+fn+'('+(page-1)+')">‹</button>';
  for(var i=1;i<=totalPage;i++){
    if(totalPage>7&&i>2&&i<totalPage-1&&Math.abs(i-page)>1){if(i===3)h+='<span style="color:var(--muted)">…</span>';continue;}
    h+='<button class="pg-btn '+(i===page?'on':'')+'" onclick="'+fn+'('+i+')">'+i+'</button>';
  }
  h+='<button class="pg-btn" '+(page===totalPage?'disabled':'')+' onclick="'+fn+'('+(page+1)+')">›</button>';
  return h;
}
function dbPageGo(p){dbPage=p;dbRender();}
function dbSearch(v){dbKw=v;dbPage=1;dbRender();}
function dbSetFilter(v){dbFilterV=v;dbPage=1;dbRender();toast(v?('已按「'+v+'」筛选'):'已清除筛选条件','info');}
function dbClearFilter(){dbKw='';dbFilterV='';dbPage=1;$('dbFilter').value='';dbRender();toast('筛选条件已重置','info');}
function dbSelRow(id,on){
  var a=dbSel[dbKey],i=a.indexOf(id);
  if(on&&i<0)a.push(id); if(!on&&i>=0)a.splice(i,1);
  dbRender();
}
function dbSelPage(on){
  var f=dbFiltered().slice((dbPage-1)*PAGE_SIZE,dbPage*PAGE_SIZE);
  f.forEach(function(r){
    var i=dbSel[dbKey].indexOf(r._id);
    if(on&&i<0)dbSel[dbKey].push(r._id);
    if(!on&&i>=0)dbSel[dbKey].splice(i,1);
  });
  dbRender();
}
/* ---- 查看 ---- */
function dbView(id){
  var c=dbCur(),r=c.rows.filter(function(x){return x._id===id;})[0];
  if(!r)return;
  var html='<dl class="desc-list">'+c.fields.map(function(fd){
    var v=r[fd.k];
    return '<dt>'+fd.t+'</dt><dd>'+(v?esc(v):'<span style="color:var(--muted)">—</span>')+'</dd>';
  }).join('')+(r.created?'<dt>创建时间</dt><dd>'+esc(r.created)+'</dd>':'')+'</dl>';
  if(dbKey==='material'&&r.recipe&&r.recipe.length){
    html+='<div style="margin-top:14px"><div style="font-size:13px;font-weight:600;margin-bottom:8px">配方组成（'+r.recipe.length+' 个组分）</div>'
      +'<div class="tbl-wrap"><table class="tbl"><thead><tr><th>CAS 号</th><th>物质名称</th><th>浓度(%)</th><th>保密</th></tr></thead><tbody>'
      +r.recipe.map(function(x){return '<tr><td class="mono">'+esc(x.cas)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.conc)+'</td><td>'+(x.secret?'<span class="tag purple">保密</span>':'否')+'</td></tr>';}).join('')
      +'</tbody></table></div></div>';
  }
  if(dbKey==='component'){
    var q=clpParamOf(r.cas),has=!!q.raw;
    var dv=function(t,v){return '<dt>'+t+'</dt><dd>'+(v||'<span style="color:var(--muted)">未维护</span>')+'</dd>';};
    html+='<div style="margin-top:14px"><div style="font-size:13px;font-weight:600;margin-bottom:8px">'
      +'分类参数 · CLP 加和法输入</div><dl class="desc-list">'
      +dv('统一分类',has?esc(q.uni):'')
      +dv('特定浓度限值 SCL',has&&q.scl!=='—'?esc(q.scl):'')
      +dv('M 因子',has&&q.m!=='—'?esc(q.m)+'　<span style="color:var(--muted)">来源：'+esc(q.mSrcTxt)+'</span>':'')
      +dv('实测值 L(E)C50 / NOEC',has&&(q.lc50||q.noec)?esc((q.lc50||'—')+' / '+(q.noec||'—'))+' mg/L':'')
      +dv('ATE 急性毒性估计值',has&&q.ate!=='—'?esc(q.ate):'')
      +'<dt>急性毒性数据</dt><dd>'+toxTag(r.cas,'ateState')+'</dd>'
      +'<dt>水生毒性数据</dt><dd>'+toxTag(r.cas,'aqState')+'</dd>'
      +'</dl></div>';
  }
  openModal({title:'查看详情 · '+c.title,width:560,body:html,
    footer:'<button class="btn" onclick="closeModal()">关闭</button><button class="btn primary" onclick="closeModal();dbEdit(\''+id+'\')">编辑此条</button>'});
}
/* ---- 新增 / 编辑 ---- */
/* ---------- 组分库：分类参数（CLP 加和法输入）编辑子表 ----------
   SCL / M 因子 / ATE 这三项决定混合物分类结论，维护入口只有组分库这一处。
   SDS 向导内只读引用，缺值时引导回这里补录 —— 在编制 SDS 时就地改，
   等于让人随口覆盖掉法规依据。 */
var _edClp=null;
function compClpLoad(cas){
  var p=clpSupplementalGet(cas);
  _edClp=p||{name:'',classifications:[],hazardMap:{},specificLimits:[],mFactors:{acute:null,chronic:null},mSource:'',
    lc50:'',noec:'',ateValues:{oral:null,dermal:null,inhalation:null},ateState:'unknown',aquaticState:'unknown'};
}
function clpMsg(html,kind){
  var m=$('clpMsg'); if(!m)return;
  m.style.display=html?'block':'none';
  m.className='notice '+(kind||'grey');
  m.innerHTML=html?'<div class="ni">'+(kind==='warn'?'⚠':'ⓘ')+'</div><div>'+html+'</div>':'';
}
/* 由实测毒性值推算 M 因子并回填（结果 0 = 未达阈值，不适用 M 因子） */
function compClpCalc(){
  var lcEl=$('clp_lc50'),ncEl=$('clp_noec');
  var lc=lcEl?lcEl.value.trim():'',nc=ncEl?ncEl.value.trim():'';
  if(!lc&&!nc){clpMsg('请先填写至少一个实测值：急性 L(E)C50 或慢性 NOEC。','warn');return;}
  var out=[];
  if(lc){
    var a=mAcute(lc);
    $('clp_mM').value=a;
    out.push('急性 L(E)C50 = '+esc(lc)+' mg/L → <b style="display:inline">M = '+a+'</b>'
      +(a?'':'（未达 Aquatic Acute 1 阈值，不适用 M 因子）'));
  }
  if(nc){
    var c=mChronic(nc);
    $('clp_mC').value=c;
    out.push('慢性 NOEC = '+esc(nc)+' mg/L → <b style="display:inline">M = '+c+'</b>'
      +(c?'':'（未达 Aquatic Chronic 1 阈值，不适用 M 因子）'));
  }
  clpMsg(out.join('<br>')
    +'<br><span style="color:var(--muted)">换算依据：急性 ≤ 1 mg/L、慢性 ≤ 0.1 mg/L 起算，'
    +'每降低 10 倍 M ×10。已回填企业补充输入框；Annex VI 官方值请在 CLP 法规库维护。</span>','ok');
}
/* 收集子表单当前值（ate 展示串由数值派生，保证单一数据源） */
function compClpCollect(){
  compClpRowsRead();
  if((_edClp.classifications||[]).some(function(x){return !x.hazardClass||!x.category;}))throw Error('请补齐企业补充分类的危害类别与级别');
  if((_edClp.specificLimits||[]).some(function(x){return !x.hazardClass||!x.category||!isFinite(x.value);}))throw Error('请补齐 SCL 的危害类别、级别与阈值');
  var g=function(id){var e=$(id);return e?e.value.trim():'';};
  var n=function(id){var raw=g(id);return raw===''?null:parseFloat(raw);};
  var haz={};(_edClp.classifications||[]).forEach(function(c){var x=clpDataHazardKey(c);if(x)haz[x[0]]=x[1];});
  (_edClp.specificLimits||[]).forEach(function(x){if(x.hazardClass==='Skin Sens.'&&haz.skinSens)haz.skinSens.scl=x.value;});
  var o={name:_edClp.name||'',classifications:clpDataCopy(_edClp.classifications||[]),
    specificLimits:clpDataCopy(_edClp.specificLimits||[]),hazardMap:haz,
    lc50:g('clp_lc50'),noec:g('clp_noec'),
    mFactors:{acute:n('clp_mM'),chronic:n('clp_mC')},mSource:g('clp_mSrc'),
    ateValues:{oral:n('clp_ateO'),dermal:n('clp_ateD'),inhalation:n('clp_ateI')},
    ateState:g('clp_ateState')||'unknown',aquaticState:g('clp_aqState')||'unknown'};
  return o;
}
function compClpRowsRead(){
  if(!$('clpClassRows'))return;
  _edClp.classifications=(_edClp.classifications||[]).map(function(old,i){
    var row={hazardClass:($('clp_class_h_'+i)||{}).value||'',category:($('clp_class_cat_'+i)||{}).value||'',
      route:($('clp_class_route_'+i)||{}).value||'',hCodes:(($('clp_class_codes_'+i)||{}).value||'').split(/[\s,/]+/).filter(Boolean),note:old.note||''};
    if(old.sourceType&&old.hazardClass===row.hazardClass&&old.category===row.category&&old.route===row.route&&
       JSON.stringify(old.hCodes)===JSON.stringify(row.hCodes)){
      row.sourceType=old.sourceType;row.sourceRef=old.sourceRef;row.usedForCalculation=old.usedForCalculation;
    }
    return row;
  });
  _edClp.specificLimits=(_edClp.specificLimits||[]).map(function(old,i){
    return {hazardClass:($('clp_limit_h_'+i)||{}).value||'',category:($('clp_limit_cat_'+i)||{}).value||'',
      hCode:($('clp_limit_code_'+i)||{}).value||'',operator:'>=',value:parseFloat(($('clp_limit_val_'+i)||{}).value),unit:'%',note:old.note||''};
  });
}
function compClpSummary(){
  compClpRowsRead();
  if($('clp_uni'))$('clp_uni').value=clpDataClassText(_edClp.classifications);
  if($('clp_scl'))$('clp_scl').value=(_edClp.specificLimits||[]).map(clpDataLimitText).join('｜')||(_edClp.specificLimitNote?'—（'+_edClp.specificLimitNote+'）':'—');
}
function compClpClassAdd(){compClpRowsRead();_edClp.classifications.push(clpDataClass('','',null));compClpRender();}
function compClpClassDel(i){compClpRowsRead();_edClp.classifications.splice(i,1);compClpRender();}
function compClpLimitAdd(){compClpRowsRead();_edClp.specificLimits.push(clpDataLimit('','','',0));compClpRender();}
function compClpLimitDel(i){compClpRowsRead();_edClp.specificLimits.splice(i,1);compClpRender();}
function compClpStructuredRows(){
  var classes=(_edClp.classifications||[]).map(function(c,i){return '<tr><td><input class="ctrl" id="clp_class_h_'+i+'" value="'+esc(c.hazardClass)+'" oninput="compClpSummary()" placeholder="Skin Irrit."></td>'+
    '<td><input class="ctrl" id="clp_class_cat_'+i+'" value="'+esc(c.category)+'" oninput="compClpSummary()" placeholder="2"></td>'+
    '<td><input class="ctrl" id="clp_class_codes_'+i+'" value="'+esc((c.hCodes||[]).join(' / '))+'" oninput="compClpSummary()" placeholder="H315"></td>'+
    '<td><input class="ctrl" id="clp_class_route_'+i+'" value="'+esc(c.route||'')+'" oninput="compClpSummary()" placeholder="oral"></td>'+
    '<td><button class="btn-link del" onclick="compClpClassDel('+i+')">删除</button></td></tr>';}).join('');
  var limits=(_edClp.specificLimits||[]).map(function(x,i){return '<tr><td><input class="ctrl" id="clp_limit_h_'+i+'" value="'+esc(x.hazardClass)+'" oninput="compClpSummary()"></td>'+
    '<td><input class="ctrl" id="clp_limit_cat_'+i+'" value="'+esc(x.category)+'" oninput="compClpSummary()"></td>'+
    '<td><input class="ctrl" id="clp_limit_code_'+i+'" value="'+esc(x.hCode||'')+'" oninput="compClpSummary()"></td>'+
    '<td><input class="ctrl" type="number" min="0" step="0.0001" id="clp_limit_val_'+i+'" value="'+esc(x.value)+'" oninput="compClpSummary()"></td>'+
    '<td><button class="btn-link del" onclick="compClpLimitDel('+i+')">删除</button></td></tr>';}).join('');
  return '<div id="clpClassRows"><div class="toolbar" style="border-top:1px solid var(--line2)"><b>企业补充分类</b><div class="grow"></div><button class="btn sm" onclick="compClpClassAdd()">＋ 分类</button></div>'+
    '<div class="tbl-wrap"><table class="tbl tbl-sm"><thead><tr><th>危害类别</th><th>级别</th><th>H 码</th><th>途径</th><th>操作</th></tr></thead><tbody>'+classes+'</tbody></table></div>'+
    '<div class="toolbar" style="border-top:1px solid var(--line2)"><b>企业补充 SCL</b><div class="grow"></div><button class="btn sm" onclick="compClpLimitAdd()">＋ SCL</button></div>'+
    '<div class="tbl-wrap"><table class="tbl tbl-sm"><thead><tr><th>危害类别</th><th>级别</th><th>H 码</th><th>阈值 (%)</th><th>操作</th></tr></thead><tbody>'+limits+'</tbody></table></div></div>';
}
function clpEditBox(){
  return '<div class="recipe-box"><div class="recipe-hd"><h3>分类参数 · CLP 加和法输入</h3>'
    +'<span class="tag blue">唯一维护入口</span>'
    +'<span class="sub" style="margin-left:auto">SDS 向导内只读引用，缺值会引导回这里补录</span></div>'
    +'<div id="compClpBox"></div></div>';
}
function compClpRender(){
  var box=$('compClpBox'); if(!box)return;
  var p=_edClp||{},v=clpSubstanceProfile(p.cas||(($('fx_cas')||{}).value)||'');
  var official=v.officialRecords.map(function(r){return r.indexNo+' · '+clpDataClassText(r.classifications)+' · '+r.source.version;}).join('；');
  var conflict=v.conflicts.map(function(c){return clpDataFieldLabel(c.field)+'：'+clpDataSourceLabel(c.officialSource)+' '+c.officialValue+' / '+clpDataSourceLabel(c.supplementalSource)+' '+c.supplementalValue+'；当前取用 '+c.effectiveValue+'（'+clpDataSourceLabel({sourceType:c.effectiveSource,sourceVersion:v.dataVersion.annexViVersion})+'）'+(c.note?'；'+c.note:'');}).join('；');
  var classSrc=(v.officialRecords.length?'Annex VI · '+v.dataVersion.annexViVersion:'')+(v.supplemental?(v.officialRecords.length?' + ':'')+clpDataSourceLabel({sourceType:v.supplemental.sourceType,sourceRef:v.supplemental.sourceRef,sourceVersion:v.supplemental.revision}):'');
  var fieldSrc='分类：'+(classSrc||'来源未维护')+'；SCL：'+clpDataSourceLabel(v.provenance['specificLimits.Skin Sens.|1']||v.provenance.specificLimits)+'；ATE：'+clpDataSourceLabel(v.provenance['ateValues.oral'])+'；M 因子：'+clpDataSourceLabel(v.provenance['mFactors.chronic']);
  var sel=function(v,arr){return arr.map(function(o){
    return '<option value="'+o[0]+'"'+(String(o[0])===String(v==null?'':v)?' selected':'')+'>'+o[1]+'</option>';
  }).join('');};
  var toxOpts=[['known','有数据（可参与加和法）'],['unknown','数据未知（计入未知声明）'],
               ['na','经评估不适用（不计入未知声明）']];
  var sec=function(t){return '<div style="padding:11px 14px 7px;font-size:12.5px;font-weight:650;'
    +'color:var(--muted);border-top:1px solid var(--line2)">'+t+'</div>';};
  var num=function(id,lab,ph,v){return '<div class="field"><label>'+lab+'</label>'
    +'<input class="ctrl" id="'+id+'" type="number" step="0.0001" min="0" value="'+esc(v==null?'':v)+'" placeholder="'+ph+'"></div>';};
  box.innerHTML='<div class="form-grid">'
    +'<div class="field span2"><label>官方 Annex VI（只读 · 请到 CLP 法规库维护）</label><div class="notice grey">'+esc(official||'当前数据集未列入；不代表该物质不分类')+'</div></div>'
    +'<div class="field span2"><label>企业补充分类（结构化摘要）</label>'
      +'<input class="ctrl" id="clp_uni" readonly value="'+esc(clpDataClassText(p.classifications||[]))+'"></div>'
    +'<div class="field span2"><label>企业补充 SCL（结构化摘要）</label>'
      +'<input class="ctrl" id="clp_scl" readonly value="'+esc((p.specificLimits||[]).map(clpDataLimitText).join('｜')||(p.specificLimitNote?'—（'+p.specificLimitNote+'）':'—'))+'"></div>'
    +'<div class="field span2"><label>当前计算取用 / 来源</label><div class="notice grey">'+esc(v.dataVersion.annexViVersion||'未列入 Annex VI')+' · '+esc(v.dataVersion.supplementalRevision||'无企业补充')+'<br>'+esc(fieldSrc)+'</div></div>'
    +(conflict?'<div class="field span2"><div class="notice warn">待专业核验冲突：'+esc(conflict)+'</div></div>':'')
    +'</div>'
    +compClpStructuredRows()
    +sec('M 因子（乘数因子）')
    +'<div class="form-grid">'
      +num('clp_lc50','急性 L(E)C50（mg/L）','0.0026',p.lc50)
      +num('clp_noec','慢性 NOEC（mg/L）','0.0008',p.noec)
      +num('clp_mM','急性 M 因子','100',p.mFactors&&p.mFactors.acute)
      +num('clp_mC','慢性 M 因子','100',p.mFactors&&p.mFactors.chronic)
      +'<div class="field span2"><label>来源</label><select class="ctrl" id="clp_mSrc">'
        +sel(p.mSource,[['','未指定'],
          ['sup','供应商 SDS 第 3 章'],['calc','企业自测数据换算'],['exp','专家判定']])
        +'</select></div>'
    +'</div>'
    +'<div class="toolbar" style="border-top:1px solid var(--line2)">'
      +'<button class="btn sm" onclick="compClpCalc()">⚙ 按实测值计算 M 因子</button>'
      +'<span style="font-size:12.5px;color:var(--muted)">急性 ≤ 1 mg/L、慢性 ≤ 0.1 mg/L 起算，每降低 10 倍 M ×10</span></div>'
    +'<div class="notice grey" id="clpMsg" style="display:none;margin:0 14px 14px"></div>'
    +sec('ATE 急性毒性估计值')
    +'<div class="form-grid">'
      +num('clp_ateO','经口 LD50（mg/kg）','100',p.ateValues&&p.ateValues.oral)
      +num('clp_ateD','经皮 LD50（mg/kg）','300',p.ateValues&&p.ateValues.dermal)
      +num('clp_ateI','吸入 LC50（mg/L）','0.5',p.ateValues&&p.ateValues.inhalation)
      +'<div class="field"><label>急性毒性数据状态</label><select class="ctrl" id="clp_ateState">'
        +sel(p.ateState,toxOpts)+'</select></div>'
      +'<div class="field"><label>水生毒性数据状态</label><select class="ctrl" id="clp_aqState">'
        +sel(p.aquaticState,toxOpts)+'</select></div>'
    +'</div>';
}
/* 缺值引导：跳到组分库，定位到该 CAS 并直接打开编辑弹窗补录 */
function gotoCompFill(cas){
  showPage('bd:comp');
  setTimeout(function(){
    var kw=$('dbKw');
    if(kw){kw.value=cas;dbSearch(cas);}
    var row=DB_CFG.component.rows.filter(function(x){return x.cas===cas;})[0];
    if(row)setTimeout(function(){dbEdit(row._id);},300);
    else toast('组分库里还没有 CAS '+cas+'，请先新增该物质再补录分类参数','warn');
  },340);
}
function dbEdit(id){
  var c=dbCur(),r=id?c.rows.filter(function(x){return x._id===id;})[0]:{};
  var body='<div class="form-grid">'+c.fields.map(function(fd){
    var v=r[fd.k]||'';
    var ctrl;
    if(fd.type==='select')ctrl='<select class="ctrl" id="fx_'+fd.k+'"><option value="">请选择</option>'+fd.opts.map(function(o){return '<option '+(o===v?'selected':'')+'>'+o+'</option>';}).join('')+'</select>';
    else if(fd.type==='textarea')ctrl='<textarea class="ctrl" id="fx_'+fd.k+'" style="min-height:64px" placeholder="'+(fd.ph||'')+'">'+esc(v)+'</textarea>';
    else if(fd.type==='date')ctrl='<input class="ctrl" type="date" id="fx_'+fd.k+'" value="'+esc(v)+'">';
    else ctrl='<input class="ctrl" id="fx_'+fd.k+'" value="'+esc(v)+'" placeholder="'+(fd.ph||'')+'">';
    return '<div class="field'+(fd.span?' span2':'')+'"><label class="'+(fd.req?'req':'')+'">'+fd.t+'</label>'+ctrl+'</div>';
  }).join('')+'</div>';
  if(dbKey==='material'){
    _edForm=r.form||'混合物（混合料）';
    _edRecipe=(r.recipe&&r.recipe.length)?JSON.parse(JSON.stringify(r.recipe))
      :(_edForm==='纯物质（单物料）'?[{cas:'',name:'',conc:'100.00',secret:false}]:[]);
    body+='<div class="recipe-box"><div class="recipe-hd"><h3>配方组成（BOM）</h3>'
      +'<span class="tag '+( _edForm==='纯物质（单物料）'?'green':'purple')+'">'+( _edForm==='纯物质（单物料）'?'纯物质 · 单一 100% 物质':'混合物 · 多组分')+'</span>'
      +'<span class="sub" style="margin-left:auto">维护该物料引用的组分，向导第 2 步将自动带出</span></div>'
      +'<div id="matRecipeBox"></div></div>';
  }
  if(dbKey==='component'){
    compClpLoad(r.cas||'');
    body+=clpEditBox();
  }
  openModal({title:(id?'编辑':'新增')+' · '+c.title,width:600,body:body,
    footer:'<div class="left">带 * 为必填项</div><button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="dbSave('+(id?"'"+id+"'":'null')+')">保存</button>'});
  if(dbKey==='material')matRecipeRender();
  if(dbKey==='component')compClpRender();
}
/* 物料编辑：配方组成可编辑子表 */
function matRecipeRender(){
  var box=$('matRecipeBox'); if(!box)return;
  var pure=_edForm==='纯物质（单物料）';
  if(pure&&_edRecipe.length===0)_edRecipe=[{cas:'',name:'',conc:'100.00',secret:false}];
  var rows=_edRecipe.map(function(r,i){
    return '<tr>'
      +'<td style="width:48px;color:var(--muted)">'+(i+1)+'</td>'
      +'<td style="width:158px"><input class="ctrl" id="mr_cas_'+i+'" style="height:30px" value="'+esc(r.cas)+'" placeholder="CAS 号" oninput="matRecipeCas('+i+',this.value)"></td>'
      +'<td><input class="ctrl" id="mr_name_'+i+'" style="height:30px" value="'+esc(r.name)+'" placeholder="物质名称" oninput="matRecipeSet('+i+',\'name\',this.value)"></td>'
      +'<td style="width:118px"><input class="ctrl" id="mr_conc_'+i+'" style="height:30px" value="'+esc(r.conc)+'" '+(pure?'readonly':'')+' type="number" step="0.01" oninput="matRecipeSet('+i+',\'conc\',this.value)"></td>'
      +'<td style="width:104px"><label class="inline-chk"><input type="checkbox" '+(r.secret?'checked':'')+' onchange="matRecipeSet('+i+',\'secret\',this.checked)"> '+(r.secret?'<span class="tag purple">保密</span>':'否')+'</label></td>'
      +(pure?'<td style="width:78px;color:var(--muted);font-size:12px">锁定 100%</td>'
           :'<td style="width:78px" class="acts"><button class="btn-link del" onclick="matRecipeDel('+i+')">删除</button></td>')
      +'</tr>';
  }).join('');
  var total=_edRecipe.reduce(function(a,b){return a+(parseFloat(b.conc)||0);},0);
  box.innerHTML='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>序号</th><th>CAS 号</th><th>物质名称</th><th>浓度(%)</th><th>保密</th><th>操作</th></tr></thead><tbody>'
    +(rows||'<tr><td colspan="6" class="tbl-empty">暂无组分</td></tr>')+'</tbody></table></div>'
    +(pure
      ? '<div class="toolbar" style="border-top:1px solid var(--line2)"><span style="font-size:12.5px;color:var(--muted)">纯物质浓度固定为 100%，不可调整</span></div>'
      : '<div class="toolbar" style="border-top:1px solid var(--line2)"><span style="font-size:12.5px">浓度合计：<b style="color:'+(Math.abs(total-100)<0.01?'var(--green)':'var(--orange)')+'">'+total.toFixed(2)+'%</b></span><span class="tag '+(Math.abs(total-100)<0.01?'green':'orange')+'">'+(Math.abs(total-100)<0.01?'配比校验通过':'合计需接近 100%')+'</span><div class="grow"></div><button class="btn sm" onclick="matRecipeAdd()">＋ 添加组分</button></div>');
}
function matRecipeAdd(){_edRecipe.push({cas:'',name:'',conc:'',secret:false});matRecipeRender();}
function matRecipeDel(i){_edRecipe.splice(i,1);matRecipeRender();}
function matRecipeSet(i,k,v){_edRecipe[i][k]=v;if(k==='secret')matRecipeRender();}
function matRecipeCas(i,v){
  _edRecipe[i].cas=v;var hit=CAS_LIB[v.trim()];
  if(hit){_edRecipe[i].name=hit.cn;var el=$('mr_name_'+i);if(el)el.value=hit.cn;toast('已自动匹配物质：'+hit.cn,'info');}
}
function dbSave(id){
  var c=dbCur(),data={},bad=null;
  c.fields.forEach(function(fd){
    var v=$('fx_'+fd.k).value.trim();
    if(fd.req&&!v&&!bad)bad=fd.t;
    data[fd.k]=v;
  });
  if(bad){toast('请填写必填项：'+bad,'warn');return;}
  if(dbKey==='material'){
    data.form=_edForm;
    var pure=_edForm==='纯物质（单物料）';
    if(pure){
      if(!_edRecipe.length||!_edRecipe[0].cas.trim()||!_edRecipe[0].name.trim()){toast('纯物质需指定唯一的 100% 组分（CAS / 名称）','warn');return;}
      _edRecipe[0].conc='100.00';
      data.recipe=JSON.parse(JSON.stringify(_edRecipe));
    }else{
      if(_edRecipe.length===0){toast('混合物需至少包含一个配方组分','warn');return;}
      var badR=_edRecipe.filter(function(r){return !r.cas.trim()||!r.name.trim()||!r.conc;});
      if(badR.length){toast('存在 '+badR.length+' 个未填写完整的组分','warn');return;}
      data.recipe=JSON.parse(JSON.stringify(_edRecipe));
    }
  }
  if(dbKey==='component'){
    var cas=(data.cas||'').trim();
    if(!cas){toast('请先填写 CAS 号，分类参数按 CAS 号归档','warn');return;}
    try{
      var p=compClpCollect();p.name=data.cn||p.name||cas;
      clpSupplementalUpsert(cas,p,{sourceType:'enterprise-supplement',sourceRef:'组分基础信息',by:'当前用户'});
    }catch(e){toast(e.message,'warn');return;}
  }
  if(id){
    var r=c.rows.filter(function(x){return x._id===id;})[0];
    Object.keys(data).forEach(function(k){r[k]=data[k];});
    toast('已保存修改','ok');
  }else{
    data._id=sdsUid();data.created=nowStr();
    c.rows.unshift(data);dbPage=1;
    toast('新增成功，已加入列表首行','ok');
  }
  closeModal();dbRender();
}
/* ---- 删除 / 批量删除 ---- */
function dbDel(id){
  var c=dbCur(),r=c.rows.filter(function(x){return x._id===id;})[0];
  var name=r[c.cols[1].k]||r[c.cols[0].k];
  sdsConfirm('删除确认','确认删除 <b>'+esc(name)+'</b>？<br><span style="color:var(--muted)">删除后该记录将不再参与 SDS 数据匹配，此操作在演示环境中不可撤销。</span>',function(){
    c.rows=c.rows.filter(function(x){return x._id!==id;});
    dbSel[dbKey]=dbSel[dbKey].filter(function(x){return x!==id;});
    dbRender();toast('已删除：'+name,'ok');
  },'确认删除',true);
}
function dbBatchDelete(){
  var n=dbSel[dbKey].length;
  if(!n){toast('请先勾选要删除的数据','warn');return;}
  sdsConfirm('批量删除确认','即将删除已勾选的 <b>'+n+'</b> 条记录，确认继续？',function(){
    var c=dbCur();
    c.rows=c.rows.filter(function(x){return dbSel[dbKey].indexOf(x._id)<0;});
    dbSel[dbKey]=[];dbRender();toast('已批量删除 '+n+' 条记录','ok');
  },'删除 '+n+' 条',true);
}
/* ---- 批量导入（选择文件 → 上传进度 → 结果） ---- */
var _impFile='';
function dbImport(){
  _impFile='';
  var c=dbCur();
  openModal({title:'批量导入 · '+c.title,width:560,cls:'sds-scope',
    body:'<div class="mini-steps"><div class="mini-step on"><span class="n">1</span>选择文件</div><div class="mini-line"></div>'
      +'<div class="mini-step"><span class="n">2</span>上传解析</div><div class="mini-line"></div>'
      +'<div class="mini-step"><span class="n">3</span>导入结果</div></div>'
      +'<div id="impBody">'
      +'<div class="drop" onclick="document.getElementById(\'impFile\').click()"><div class="ic">⇪</div><p>点击选择文件，或将文件拖拽到此处</p><small>支持 .xlsx / .csv 格式，单次最多 500 条</small></div>'
      +'<input type="file" id="impFile" accept=".xlsx,.xls,.csv" style="display:none" onchange="impPick(this)">'
      +'<div id="impFileRow" style="margin-top:12px"></div>'
      +'<div style="margin-top:12px;font-size:12.5px;color:var(--muted)">没有文件？<a onclick="impPickDemo()" style="cursor:pointer">使用系统示例文件</a> · <a onclick="toast(\'模板已下载（演示）\',\'ok\')" style="cursor:pointer">下载导入模板</a></div>'
      +'</div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button><button class="btn primary disabled" id="impBtn" disabled onclick="impRun()">开始导入</button>'});
}
function impPick(el){
  if(!el.files.length)return;
  _impFile=el.files[0].name;impShowFile();
}
function impPickDemo(){_impFile=dbCur().title+'_导入模板_示例.xlsx';impShowFile();}
function impShowFile(){
  $('impFileRow').innerHTML='<div class="file-row"><span style="font-size:16px">▤</span><div><b>'+esc(_impFile)+'</b><div style="color:var(--muted);font-size:11.5px">待导入 '+dbCur().sample.length+' 条记录 · 128 KB</div></div><button class="btn sm" style="margin-left:auto" onclick="_impFile=\'\';document.getElementById(\'impFileRow\').innerHTML=\'\';document.getElementById(\'impBtn\').classList.add(\'disabled\');document.getElementById(\'impBtn\').disabled=true">移除</button></div>';
  $('impBtn').classList.remove('disabled');$('impBtn').disabled=false;
}
function impRun(){
  var steps=document.querySelectorAll('.mini-step'),lines=document.querySelectorAll('.mini-line');
  steps[0].classList.add('fin');steps[0].classList.remove('on');lines[0].classList.add('fin');steps[1].classList.add('on');
  $('impBody').innerHTML='<div style="padding:16px 0"><div style="font-size:13px;margin-bottom:10px">正在上传并解析 <b>'+esc(_impFile)+'</b>…</div>'
    +'<div class="bar" id="impBar"><i></i></div><div style="margin-top:8px;color:var(--muted);font-size:12.5px" id="impTxt">0%</div></div>';
  $('impBtn').classList.add('disabled');$('impBtn').disabled=true;
  progress('impBar','impTxt',impDone,14);
}
function impDone(){
  var c=dbCur(),ok=c.sample.length,fail=1;
  var steps=document.querySelectorAll('.mini-step'),lines=document.querySelectorAll('.mini-line');
  steps[1].classList.add('fin');steps[1].classList.remove('on');lines[1].classList.add('fin');steps[2].classList.add('on');
  $('impBody').innerHTML='<div class="stat-row">'
    +'<div class="stat"><b>'+(ok+fail)+'</b><span>解析总数</span></div>'
    +'<div class="stat" style="border-color:var(--green-b);background:var(--green-bg)"><b style="color:var(--green)">'+ok+'</b><span>导入成功</span></div>'
    +'<div class="stat" style="border-color:var(--red-b);background:var(--red-bg)"><b style="color:var(--red)">'+fail+'</b><span>导入失败</span></div></div>'
    +'<div style="font-size:12.5px;font-weight:600;margin:12px 0 7px">失败明细</div>'
    +'<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px"><table class="tbl"><thead><tr><th style="width:70px">行号</th><th>失败原因</th><th style="width:110px">处理建议</th></tr></thead>'
    +'<tbody><tr><td>第 5 行</td><td style="color:var(--red)">主键重复：该编号在系统中已存在</td><td>改为更新或修改编号</td></tr></tbody></table></div>'
    +'<div style="margin-top:12px;font-size:12.5px;color:var(--muted)">成功数据已写入列表，可在列表首部查看。</div>';
  $('mFoot').innerHTML='<button class="btn" onclick="toast(\'失败明细已导出（演示）\',\'ok\')">导出失败明细</button><button class="btn primary" onclick="closeModal()">完成</button>';
  c.sample.forEach(function(s){
    var o={};Object.keys(s).forEach(function(k){o[k]=s[k];});
    o._id=sdsUid();o.created=nowStr();c.rows.unshift(o);
  });
  dbPage=1;dbRender();
  toast('批量导入完成：成功 '+ok+' 条，失败 '+fail+' 条','ok');
}

/* ==================================================================
   ==================  模块 3：法规库管理  ==========================
   3-1 系统接入数据源（PubChem，只读辅助来源）
   3-2 人工维护法规库（官方渠道导入 + 人工验证）
   ================================================================== */
var pcRows=sdsMk([
  {cas:'7732-18-5',name:'水 / Water',sync:'2026-08-01 03:12',status:'已同步',cid:'962'},
  {cas:'64-17-5',name:'乙醇 / Ethanol',sync:'2026-08-01 03:12',status:'已同步',cid:'702'},
  {cas:'111-76-2',name:'乙二醇单丁醚 / 2-Butoxyethanol',sync:'2026-08-01 03:13',status:'已同步',cid:'8133'},
  {cas:'79-10-7',name:'丙烯酸 / Acrylic acid',sync:'2026-08-01 03:13',status:'已同步',cid:'6581'},
  {cas:'50-00-0',name:'甲醛 / Formaldehyde',sync:'2026-08-01 03:14',status:'待更新',cid:'712'},
  {cas:'108-88-3',name:'甲苯 / Toluene',sync:'2026-07-25 02:40',status:'已同步',cid:'1140'},
  {cas:'67-64-1',name:'丙酮 / Acetone',sync:'2026-07-25 02:40',status:'已同步',cid:'180'},
  {cas:'75-09-2',name:'二氯甲烷 / Dichloromethane',sync:'2026-07-25 02:41',status:'已同步',cid:'6344'},
  {cas:'1310-73-2',name:'氢氧化钠 / Sodium hydroxide',sync:'2026-07-25 02:41',status:'已同步',cid:'14798'},
  {cas:'7664-93-9',name:'硫酸 / Sulfuric acid',sync:'2026-07-25 02:42',status:'已同步',cid:'1118'},
  {cas:'9009-54-5',name:'聚氨酯预聚体 / PU prepolymer',sync:'—',status:'未匹配',cid:'—'},
  {cas:'108-95-2',name:'苯酚 / Phenol',sync:'2026-07-25 02:43',status:'已同步',cid:'996'},
  {cas:'107-21-1',name:'乙二醇 / Ethylene glycol',sync:'2026-07-25 02:43',status:'已同步',cid:'174'},
  {cas:'10043-01-3',name:'硫酸铝 / Aluminium sulfate',sync:'2026-07-25 02:44',status:'待更新',cid:'24850'},
  {cas:'7789-09-5',name:'重铬酸铵 / Ammonium dichromate',sync:'2026-07-25 02:44',status:'已同步',cid:'24500'}
]);
var pcPage=1;
function pcRender(){
  var kw=($('pcKw').value||'').trim().toLowerCase(),st=$('pcStatus').value;
  var f=pcRows.filter(function(r){
    if(st&&r.status!==st)return false;
    if(!kw)return true;
    return (r.cas+r.name).toLowerCase().indexOf(kw)>=0;
  });
  $('pcKpi').innerHTML=
    '<div class="kpi"><span>已接入物质</span><b>'+pcRows.length+'</b><small>PubChem 公开数据库</small></div>'
    +'<div class="kpi"><span>已同步</span><b style="color:var(--green)">'+pcRows.filter(function(r){return r.status==='已同步';}).length+'</b><small>候选数据可用</small></div>'
    +'<div class="kpi"><span>待更新 / 未匹配</span><b style="color:var(--orange)">'+pcRows.filter(function(r){return r.status!=='已同步';}).length+'</b><small>需手动触发同步</small></div>'
    +'<div class="kpi"><span>数据定位</span><b style="font-size:15px;color:var(--muted)">辅助参考</b><small>不可作为合规依据</small></div>';
  var tp=Math.max(1,Math.ceil(f.length/PAGE_SIZE));
  if(pcPage>tp)pcPage=tp;
  var rows=f.slice((pcPage-1)*PAGE_SIZE,pcPage*PAGE_SIZE);
  $('pcTable').innerHTML='<thead><tr><th style="width:130px">CAS 号</th><th>物质名称</th><th style="width:110px">PubChem CID</th>'
    +'<th style="width:160px">同步时间</th><th style="width:100px">数据状态</th><th style="width:150px">来源标识</th><th style="width:170px">操作</th></tr></thead><tbody>'
    +(rows.length?rows.map(function(r){
      return '<tr><td class="mono">'+esc(r.cas)+'</td><td>'+esc(r.name)+'</td><td class="mono">'+esc(r.cid)+'</td>'
        +'<td>'+esc(r.sync)+'</td><td><span class="tag '+TAG_CLS(r.status)+' dot-tag">'+r.status+'</span></td>'
        +'<td><span class="tag green dot-tag">系统接入·辅助来源</span></td>'
        +'<td class="acts"><button class="btn-link" onclick="pcView(\''+r._id+'\')">查看详情</button>'
        +'<button class="btn-link" onclick="pcSync(\''+r._id+'\')">手动同步</button>'
        +'<span style="color:#c8d2de;font-size:12px" title="接入源不可编辑核心法规字段">编辑</span></td></tr>';
    }).join(''):'<tr><td colspan="7" class="tbl-empty"><span class="big">◎</span>没有符合条件的同步记录</td></tr>')
    +'</tbody>';
  $('pcPager').innerHTML=pagerHtml(f.length,pcPage,tp,'pcPageGo');
}
function pcPageGo(p){pcPage=p;pcRender();}
function pcView(id){
  var r=pcRows.filter(function(x){return x._id===id;})[0];
  var lib=CAS_LIB[r.cas]||{};
  openModal({title:'PubChem 物质详情 · '+r.cas,width:600,
    body:'<div class="notice warn" style="margin-bottom:14px"><div class="ni">!</div><div><b>辅助来源，不可作为最终合规依据</b>以下内容来自 PubChem 公开数据库自动查询结果，仅供候选参考与交叉核对。</div></div>'
      +'<dl class="desc-list">'
      +'<dt>CAS 号</dt><dd class="mono">'+esc(r.cas)+'</dd>'
      +'<dt>物质名称</dt><dd>'+esc(r.name)+'</dd>'
      +'<dt>分子式</dt><dd>'+esc(lib.formula||'—')+'</dd>'
      +'<dt>PubChem CID</dt><dd>'+esc(r.cid)+'</dd>'
      +'<dt>GHS 候选分类</dt><dd>'+(r.cas==='50-00-0'?'Carc. 1B / Acute Tox. 3 / Skin Corr. 1B <span class="tag grey">候选</span>':'Skin Irrit. 2 / Eye Irrit. 2 <span class="tag grey">候选</span>')+'</dd>'
      +'<dt>物性数据</dt><dd>沸点、密度、蒸气压等 12 项（自动抓取）</dd>'
      +'<dt>数据状态</dt><dd><span class="tag '+TAG_CLS(r.status)+' dot-tag">'+r.status+'</span></dd>'
      +'<dt>最近同步</dt><dd>'+esc(r.sync)+'</dd>'
      +'<dt>权限说明</dt><dd style="color:var(--muted)">只读接入源：可查看、可触发同步，<b>不可编辑核心法规字段</b></dd>'
      +'</dl>',
    footer:'<button class="btn" onclick="closeModal()">关闭</button><button class="btn primary" onclick="closeModal();pcSync(\''+id+'\')">手动同步此物质</button>'});
}
function pcSync(id){
  var r=pcRows.filter(function(x){return x._id===id;})[0];
  r.status='同步中';pcRender();
  toast('正在从 PubChem 拉取 '+r.cas+' 的公开数据…','info');
  setTimeout(function(){
    r.status='已同步';r.sync=nowStr();
    if(r.cid==='—')r.cid='—（公开库无收录）';
    pcRender();toast('同步完成：'+r.cas,'ok');
  },1500);
}
function pcSyncAll(){
  sdsConfirm('全量重新同步','将对 <b>'+pcRows.length+'</b> 个物质重新调用 PubChem 公开 API 拉取候选数据。<br><span style="color:var(--muted)">同步结果仅更新辅助数据，不影响人工维护法规库。</span>',function(){
    openModal({title:'全量同步进行中',width:460,
      body:'<div style="padding:8px 0"><div style="font-size:13px;margin-bottom:10px">正在同步 '+pcRows.length+' 个物质…</div><div class="bar" id="pcBar"><i></i></div><div style="margin-top:8px;color:var(--muted);font-size:12.5px" id="pcTxt">0%</div></div>',footer:''});
    progress('pcBar','pcTxt',function(){
      pcRows.forEach(function(r){if(r.status!=='未匹配'){r.status='已同步';r.sync=nowStr();}});
      closeModal();pcRender();toast('全量同步完成，1 个物质公开库无收录','ok');
    },11);
  },'开始同步');
}
function pcAdd(){
  openModal({title:'添加同步物质',width:500,
    body:'<div class="notice grey" style="margin-bottom:14px"><div class="ni">i</div><div>输入 CAS 号后，系统将调用 PubChem 免费 API 查询公开数据作为候选参考。</div></div>'
      +'<div class="form-grid one"><div class="field"><label class="req">CAS 号</label><input class="ctrl" id="pcCas" placeholder="例如 108-88-3"><span class="help">可从组分基础数据中复制</span></div></div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="pcAddSave()">查询并添加</button>'});
}
function pcAddSave(){
  var cas=$('pcCas').value.trim();
  if(!cas){toast('请输入 CAS 号','warn');return;}
  if(pcRows.some(function(r){return r.cas===cas;})){toast('该 CAS 号已在接入列表中','warn');return;}
  var lib=CAS_LIB[cas];
  var row={_id:sdsUid(),cas:cas,name:lib?(lib.cn+' / '+lib.en):'（公开库未匹配到名称）',sync:'—',status:'同步中',cid:lib?String(1000+Math.floor(Math.random()*9000)):'—'};
  pcRows.unshift(row);closeModal();pcPage=1;pcRender();
  toast('已加入同步队列：'+cas,'info');
  setTimeout(function(){
    row.status=lib?'已同步':'未匹配';row.sync=lib?nowStr():'—';
    pcRender();toast(lib?('同步完成：'+lib.cn):'PubChem 未收录该 CAS 号',lib?'ok':'warn');
  },1600);
}

/* ---------- 3-0 数据源与更新机制说明面板（反馈#11，浓缩自 SDS数据源说明.md） ---------- */
function lawMechContent(){
  return '<div class="mech-grid">'
    +'<div class="mech-col"><div class="mech-t"><span class="tag blue">① 系统自动获取</span></div>'
      +'<ul class="mech-list">'
      +'<li><b>来源</b>：PubChem / ECHA 公开数据库，输入 CAS 号自动查询</li>'
      +'<li><b>内容</b>：基本信息、理化性质、GHS 候选分类、毒理数据、混合物分类推导</li>'
      +'<li><b>更新频率</b>：系统定期自动同步（默认每月 + 法规变更时触发）</li>'
      +'<li><span class="warn-t">只读辅助来源，不可作为最终合规依据</span></li>'
      +'</ul></div>'
    +'<div class="mech-col"><div class="mech-t"><span class="tag purple">② 人工维护</span></div>'
      +'<ul class="mech-list">'
      +'<li><b>维护内容</b>：法规模板、操作指南、供应商库；及每次填写的产品/配方/目标市场/保密标记</li>'
      +'<li><b>更新频率</b>：法规变更时更新，由合规人员负责</li>'
      +'<li><span class="warn-t">未完成人工确认的版本不会被 SDS 生成流程引用</span></li>'
      +'</ul></div>'
    +'<div class="mech-col"><div class="mech-t"><span class="tag orange">③ 可能需实测补充</span></div>'
      +'<ul class="mech-list">'
      +'<li><b>混合物闪点</b>：无实测时可估算，但须标注「估算」字样</li>'
      +'<li><b>运动粘度等</b>：涉及吸入危害分类时必须实测，不可估算</li>'
      +'<li><b>优先级</b>：实测报告 &gt; 供应商 SDS &gt; 法规库 &gt; 估算（估算需注明）</li>'
      +'</ul></div>'
    +'</div>'
    +'<div class="notice grey" style="margin-top:10px"><div class="ni">§</div><div><b>数据质量责任</b>：最终用于对外发布的 SDS 分类与法规结论，均须以人工维护法规库、实测报告或供应商 SDS 为准，并经 EHS 与法规人员审核。</div></div>';
}
function lawMechHtml(suf){
  return '<div class="card"><div class="card-hd clickable" onclick="toggleMech(\''+suf+'\',this)">'
    +'<h3>数据源与更新机制说明</h3><span class="sub">系统自动获取 · 人工维护 · 可能需实测补充</span>'
    +'<i class="arrow">›</i></div>'
    +'<div class="card-bd mech-bd" id="mechBd'+suf+'" style="display:none">'+lawMechContent()+'</div></div>';
}
function renderLawMech(){
  if($('lawMechPub'))$('lawMechPub').innerHTML=lawMechHtml('Pub');
  if($('lawMechMan'))$('lawMechMan').innerHTML=lawMechHtml('Man');
}
function toggleMech(suf,hd){
  var b=$('mechBd'+suf);if(!b)return;
  var open=b.style.display!=='none';
  b.style.display=open?'none':'block';
  var ar=hd?hd.querySelector('.arrow'):null;
  if(ar)ar.style.transform=open?'':'rotate(90deg)';
}
/* ---------- 3-2 人工维护法规库 ---------- */
var lawRows=sdsMk([
  {key:'xiv',name:'REACH Annex XIV（SVHC 授权清单）',org:'ECHA 欧洲化学品管理局',eff:'2026-05-20',ver:'V2026.1',upd:'2026-05-22 10:14',status:'已生效',items:59,verifier:'法规专员 · 陈工'},
  {key:'xvii',name:'REACH Annex XVII（限制物质清单）',org:'ECHA 欧洲化学品管理局',eff:'2026-06-01',ver:'V2026.2',upd:'2026-06-03 09:30',status:'已生效',items:78,verifier:'法规专员 · 陈工'},
  {key:'clp6',name:'CLP Annex VI（统一分类清单）',org:'ECHA / 欧盟委员会',eff:'2026-09-01',ver:'ATP 21',upd:'2026-07-18 16:05',status:'待复核',items:4512,verifier:'待指派'},
  {key:'gb16483',name:'GB/T 16483-2008 化学品安全技术说明书 内容和项目顺序',org:'国家标准化管理委员会',eff:'2009-02-01',ver:'V2008',upd:'2026-01-12 11:00',status:'已生效',items:16,verifier:'法规专员 · 刘工'},
  {key:'gb30000',name:'GB 30000 系列 化学品分类和标签规范',org:'国家标准化管理委员会',eff:'2014-11-01',ver:'V2013（28 部分）',upd:'2026-02-08 14:22',status:'已生效',items:28,verifier:'法规专员 · 刘工'},
  {key:'svhc',name:'SVHC 候选清单（第 33 批）',org:'ECHA 欧洲化学品管理局',eff:'2026-06-25',ver:'第 33 批',upd:'2026-06-26 08:40',status:'已生效',items:250,verifier:'法规专员 · 陈工'},
  {key:'gb13690',name:'GB 13690-2009 化学品分类和危险性公示 通则',org:'国家标准化管理委员会',eff:'2010-05-01',ver:'V2009',upd:'2025-09-30 17:10',status:'已归档',items:1,verifier:'法规专员 · 刘工'}
]);
var LAW_DETAIL={
  xiv:{cols:['序号','物质名称','CAS 号','SVHC 属性','日落日期'],rows:[
    ['1','邻苯二甲酸二(2-乙基己基)酯 DEHP','117-81-7','生殖毒性 1B','2015-02-21'],
    ['2','铬酸铅','7758-97-6','致癌 1B / 生殖毒性 1A','2019-05-04'],
    ['3','三氧化二砷','1327-53-3','致癌 1A','2019-05-31'],
    ['4','重铬酸钠','10588-01-9','致癌 1B / 致突变 1B','2017-09-21'],
    ['5','2-甲氧基乙醇','109-86-4','生殖毒性 1B','2020-01-06']]},
  xvii:{cols:['条目号','限制物质','CAS 号','限制内容','适用范围'],rows:[
    ['Entry 47','六价铬化合物 Cr(VI)','—','皮革制品中 Cr(VI) < 3 mg/kg','与皮肤接触的皮革制品'],
    ['Entry 77','甲醛','50-00-0','制品释放量限值管控','消费品 / 纺织与皮革'],
    ['Entry 51','邻苯二甲酸酯类','—','含量 < 0.1%（w/w）','玩具与儿童护理用品'],
    ['Entry 28-30','CMR 物质','—','禁止向公众销售','1A/1B 类 CMR 物质'],
    ['Entry 72','偶氮染料','—','芳香胺释放 < 30 mg/kg','纺织与皮革制品']]},
  gb16483:{cols:['章节','章节名称','必填','要点'],rows:[
    ['第 1 部分','化学品及企业标识','是','产品标识、供应商、应急电话'],
    ['第 2 部分','危险性概述','是','GHS 分类、标签要素、其他危害'],
    ['第 3 部分','成分/组成信息','是','组分、CAS 号、浓度或浓度范围'],
    ['第 14 部分','运输信息','是','UN 编号、运输名称、危险类别'],
    ['第 16 部分','其他信息','是','编制依据、修订说明、免责声明']]},
  gb30000:{cols:['标准号','标准名称','危险类别','对应 GHS'],rows:[
    ['GB 30000.7-2013','易燃液体','Flam. Liq. 1-4','第 2.6 章'],
    ['GB 30000.18-2013','皮肤腐蚀/刺激','Skin Corr./Irrit.','第 3.2 章'],
    ['GB 30000.19-2013','严重眼损伤/眼刺激','Eye Dam./Irrit.','第 3.3 章'],
    ['GB 30000.22-2013','致癌性','Carc. 1A/1B/2','第 3.6 章'],
    ['GB 30000.28-2013','危害水生环境','Aquatic Acute/Chronic','第 4.1 章']]},
  svhc:{cols:['序号','物质名称','CAS 号','列入原因','列入日期'],rows:[
    ['248','甲醛','50-00-0','致癌性 1B','2026-06-25'],
    ['249','双酚 S','80-09-1','内分泌干扰','2026-06-25'],
    ['250','三聚氰胺','108-78-1','其他等同关注','2026-06-25'],
    ['221','短链氯化石蜡','85535-84-8','PBT / vPvB','2021-01-19']]},
  gb13690:{cols:['条款','要求','说明'],rows:[
    ['4.1','化学品分类','按 GB 30000 系列执行'],
    ['5.2','安全标签','象形图、警示词、危险说明'],
    ['6.1','安全技术说明书','按 GB/T 16483 编制']]}
};
var lawPage=1;
var lawTypeFilter=null;   /* null=全部；'zdhc' / ['reach','cn'] 用于菜单派生页 */
function lawRender(){
  var kw=($('lawKw').value||'').trim().toLowerCase(),st=$('lawStatus').value;
  var scope=lawTypeFilter?(lawTypeFilter.slice?lawTypeFilter:[lawTypeFilter]):null;
  var f=lawRows.filter(function(r){
    if(scope&&scope.indexOf(r.listType)<0)return false;
    if(st&&r.status!==st)return false;
    if(!kw)return true;
    return (r.name+r.org+r.ver).toLowerCase().indexOf(kw)>=0;
  });
  $('lawKpi').innerHTML=
    '<div class="kpi"><span>法规清单总数</span><b>'+lawRows.length+'</b><small>人工导入并验证</small></div>'
    +'<div class="kpi"><span>已生效</span><b style="color:var(--green)">'+lawRows.filter(function(r){return r.status==='已生效';}).length+'</b><small>可被 SDS 引用</small></div>'
    +'<div class="kpi"><span>待复核</span><b style="color:var(--orange)">'+lawRows.filter(function(r){return r.status==='待复核';}).length+'</b><small>未确认入库不可引用</small></div>'
    +'<div class="kpi"><span>受影响已发布 SDS</span><b style="color:var(--red)">6</b><small>需执行影响分析</small></div>';
  var tp=Math.max(1,Math.ceil(f.length/PAGE_SIZE));
  if(lawPage>tp)lawPage=tp;
  var rows=f.slice((lawPage-1)*PAGE_SIZE,lawPage*PAGE_SIZE);
  $('lawTable').innerHTML='<thead><tr><th>法规名称</th><th style="width:200px">发布机构</th><th style="width:110px">生效日期</th>'
    +'<th style="width:120px">当前版本</th><th style="width:150px">更新时间</th><th style="width:100px">数据状态</th><th style="width:110px">来源标识</th><th style="width:210px">操作</th></tr></thead><tbody>'
    +(rows.length?rows.map(function(r){
      return '<tr><td><b>'+esc(r.name)+'</b><span class="sub">清单条目 '+r.items+' 条 · 验证人：'+esc(r.verifier)+'</span></td>'
        +'<td>'+esc(r.org)+'</td><td>'+esc(r.eff)+'</td><td class="mono">'+esc(r.ver)+'</td><td>'+esc(r.upd)+'</td>'
        +'<td><span class="tag '+TAG_CLS(r.status)+' dot-tag">'+r.status+'</span></td>'
        +'<td><span class="tag orange dot-tag">人工维护</span></td>'
        +'<td class="acts"><button class="btn-link" onclick="lawView(\''+r._id+'\')">查看详情</button>'
        +'<button class="btn-link" onclick="lawUpload(\''+r._id+'\')">上传新版本</button>'
        +'<button class="btn-link" onclick="lawImpact(\''+r._id+'\')">影响分析</button></td></tr>';
    }).join(''):'<tr><td colspan="8" class="tbl-empty"><span class="big">§</span>没有符合条件的法规清单</td></tr>')
    +'</tbody>';
  $('lawPager').innerHTML=pagerHtml(f.length,lawPage,tp,'lawPageGo');
}
function lawPageGo(p){lawPage=p;lawRender();}
function lawView(id){
  var r=lawRows.filter(function(x){return x._id===id;})[0];
  var d=LAW_DETAIL[r.key]||{cols:['说明'],rows:[['暂无明细']]};
  openModal({title:'法规清单明细 · '+r.name,width:760,
    body:'<dl class="desc-list" style="grid-template-columns:110px 1fr 110px 1fr;margin-bottom:14px">'
      +'<dt>发布机构</dt><dd>'+esc(r.org)+'</dd><dt>当前版本</dt><dd>'+esc(r.ver)+'</dd>'
      +'<dt>生效日期</dt><dd>'+esc(r.eff)+'</dd><dt>数据状态</dt><dd><span class="tag '+TAG_CLS(r.status)+' dot-tag">'+r.status+'</span></dd>'
      +'<dt>清单条目</dt><dd>'+r.items+' 条</dd><dt>人工验证人</dt><dd>'+esc(r.verifier)+'</dd></dl>'
      +'<div style="font-size:12.5px;font-weight:600;margin-bottom:7px">清单明细（节选）</div>'
      +'<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px"><table class="tbl"><thead><tr>'
      +d.cols.map(function(c){return '<th>'+c+'</th>';}).join('')+'</tr></thead><tbody>'
      +d.rows.map(function(row){return '<tr>'+row.map(function(c){return '<td>'+esc(c)+'</td>';}).join('')+'</tr>';}).join('')
      +'</tbody></table></div>'
      +'<div class="notice grey" style="margin:14px 0 0"><div class="ni">§</div><div>本清单由合规人员从官方渠道下载后导入并逐条验证，合规人员对数据质量负责。</div></div>',
    footer:'<button class="btn" onclick="toast(\'清单已导出 Excel（演示）\',\'ok\')">导出清单</button><button class="btn primary" onclick="closeModal()">关闭</button>'});
}
/* 上传新版本：3 步 —— 上传文件 → 系统解析预览 → 人工确认入库 */
var _lawCur=null,_lawFile='';
function lawUpload(id){
  _lawCur=id?lawRows.filter(function(x){return x._id===id;})[0]:null;
  _lawFile='';window._lawTmp=null;
  openModal({title:_lawCur?('上传新版本 · '+_lawCur.name):'新增法规清单',width:640,cls:'sds-scope',body:lawStep1Html(),footer:lawFoot1()});
}
function lawFoot1(){
  return '<div class="left">第 1 步 / 共 3 步</div><button class="btn" onclick="closeModal()">取消</button>'
    +'<button class="btn primary '+(_lawFile?'':'disabled')+'" id="lawNext" '+(_lawFile?'':'disabled')+' onclick="lawStep2()">下一步：系统解析</button>';
}
/* 从第 2 步返回第 1 步，保留已填写内容 */
function lawBack1(){
  $('mBody').innerHTML=lawStep1Html();
  $('mFoot').innerHTML=lawFoot1();
  if(_lawFile)lawShowFile();
}
function lawMini(n){
  var t=['上传文件','系统解析预览','人工确认入库'];
  return '<div class="mini-steps">'+t.map(function(x,i){
    var cls=i+1<n?'fin':(i+1===n?'on':'');
    return '<div class="mini-step '+cls+'"><span class="n">'+(i+1<n?'✓':(i+1))+'</span>'+x+'</div>'+(i<2?'<div class="mini-line '+(i+1<n?'fin':'')+'"></div>':'');
  }).join('')+'</div>';
}
function lawStep1Html(){
  var t=window._lawTmp||{};
  return lawMini(1)
    +'<div class="form-grid">'
    +'<div class="field"><label class="req">法规名称</label><input class="ctrl" id="lwName" value="'+esc(t.name||(_lawCur?_lawCur.name:''))+'" '+(_lawCur?'readonly':'')+' placeholder="例如：REACH Annex XVII（限制物质清单）"></div>'
    +'<div class="field"><label class="req">发布机构</label><input class="ctrl" id="lwOrg" value="'+esc(t.org||(_lawCur?_lawCur.org:''))+'" placeholder="例如：ECHA 欧洲化学品管理局"></div>'
    +'<div class="field"><label class="req">新版本号</label><input class="ctrl" id="lwVer" value="'+esc(t.ver||'')+'" placeholder="例如：V2026.3 / ATP 22"></div>'
    +'<div class="field"><label class="req">生效日期</label><input class="ctrl" type="date" id="lwEff" value="'+esc(t.eff||'2026-09-01')+'"></div>'
    +'</div>'
    +'<div style="margin-top:14px"><div class="drop" onclick="document.getElementById(\'lwFile\').click()"><div class="ic">⇪</div><p>上传官方渠道下载的法规清单文件</p><small>支持 .xlsx / .csv / .pdf，务必来自官方发布页面</small></div>'
    +'<input type="file" id="lwFile" accept=".xlsx,.csv,.pdf" style="display:none" onchange="lawPick(this)">'
    +'<div id="lwFileRow" style="margin-top:12px"></div>'
    +'<div style="margin-top:10px;font-size:12.5px;color:var(--muted)">没有文件？<a onclick="lawPickDemo()" style="cursor:pointer">使用官方示例清单</a></div></div>';
}
function lawPick(el){if(!el.files.length)return;_lawFile=el.files[0].name;lawShowFile();}
function lawPickDemo(){_lawFile='ECHA_official_list_2026_v3.xlsx';lawShowFile();}
function lawShowFile(){
  $('lwFileRow').innerHTML='<div class="file-row"><span style="font-size:16px">▤</span><div><b>'+esc(_lawFile)+'</b><div style="color:var(--muted);font-size:11.5px">官方渠道文件 · 待解析</div></div><span class="tag orange" style="margin-left:auto">待人工验证</span></div>';
  $('lawNext').classList.remove('disabled');$('lawNext').disabled=false;
}
function lawStep2(){
  var name=$('lwName').value.trim(),org=$('lwOrg').value.trim(),ver=$('lwVer').value.trim(),eff=$('lwEff').value;
  if(!name||!org||!ver||!eff){toast('请填写法规名称、发布机构、版本号与生效日期','warn');return;}
  window._lawTmp={name:name,org:org,ver:ver,eff:eff};
  $('mBody').innerHTML=lawMini(2)+'<div style="padding:10px 0"><div style="font-size:13px;margin-bottom:10px">正在解析 <b>'+esc(_lawFile)+'</b>…</div><div class="bar" id="lwBar"><i></i></div><div style="margin-top:8px;color:var(--muted);font-size:12.5px" id="lwTxt">0%</div></div>';
  $('mFoot').innerHTML='<div class="left">第 2 步 / 共 3 步</div><button class="btn disabled" disabled>解析中…</button>';
  progress('lwBar','lwTxt',lawStep2Done,15);
}
function lawStep2Done(){
  var d=LAW_DETAIL[_lawCur?_lawCur.key:'xvii'];
  $('mBody').innerHTML=lawMini(2)
    +'<div class="stat-row"><div class="stat"><b>128</b><span>解析条目总数</span></div>'
    +'<div class="stat" style="border-color:var(--green-b);background:var(--green-bg)"><b style="color:var(--green)">12</b><span>新增条目</span></div>'
    +'<div class="stat" style="border-color:var(--orange-b);background:var(--orange-bg)"><b style="color:var(--orange)">5</b><span>变更条目</span></div></div>'
    +'<div style="font-size:12.5px;font-weight:600;margin:6px 0 7px">解析结果预览（节选）</div>'
    +'<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px;max-height:220px;overflow:auto"><table class="tbl"><thead><tr><th style="width:70px">变更</th>'
    +d.cols.map(function(c){return '<th>'+c+'</th>';}).join('')+'</tr></thead><tbody>'
    +d.rows.map(function(row,i){
      var t=i===0?'<span class="tag orange">变更</span>':(i===1?'<span class="tag green">新增</span>':'<span class="tag grey">无变化</span>');
      return '<tr><td>'+t+'</td>'+row.map(function(c){return '<td>'+esc(c)+'</td>';}).join('')+'</tr>';
    }).join('')+'</tbody></table></div>'
    +'<div class="notice warn" style="margin:14px 0 0"><div class="ni">!</div><div>解析结果尚未入库。<b>必须经人工逐条核对确认后</b>方可生效并被 SDS 生成流程引用。</div></div>';
  $('mFoot').innerHTML='<div class="left">第 2 步 / 共 3 步</div><button class="btn" onclick="lawBack1()">上一步</button><button class="btn primary" onclick="lawStep3()">下一步：人工确认</button>';
}
function lawStep3(){
  $('mBody').innerHTML=lawMini(3)
    +'<div class="notice grey" style="margin-bottom:14px"><div class="ni">§</div><div>合规人员需确认已核对全部解析条目，确认后清单版本将正式入库并对 SDS 生效。</div></div>'
    +'<dl class="desc-list" style="margin-bottom:14px"><dt>法规名称</dt><dd>'+esc(_lawTmp.name)+'</dd>'
    +'<dt>发布机构</dt><dd>'+esc(_lawTmp.org)+'</dd><dt>新版本号</dt><dd>'+esc(_lawTmp.ver)+'</dd>'
    +'<dt>生效日期</dt><dd>'+esc(_lawTmp.eff)+'</dd><dt>来源文件</dt><dd>'+esc(_lawFile)+'</dd></dl>'
    +'<div class="form-grid one">'
    +'<div class="field"><label class="req">人工验证人</label><input class="ctrl" id="lwVerifier" value="法规专员 · 陈工"></div>'
    +'<div class="field"><label>核对说明</label><textarea class="ctrl" id="lwNote" placeholder="记录核对范围、差异处理方式等">已逐条比对官方发布版本，差异条目 5 项已确认。</textarea></div>'
    +'<div class="field"><label class="inline-chk"><input type="checkbox" class="chk" id="lwOk"> 我确认已完成人工核对，并对本次入库数据质量负责</label></div>'
    +'</div>';
  $('mFoot').innerHTML='<div class="left">第 3 步 / 共 3 步</div><button class="btn" onclick="lawStep2Done()">上一步</button><button class="btn primary" onclick="lawFinish()">确认入库</button>';
}
function lawFinish(){
  if(!$('lwOk').checked){toast('请先勾选人工核对确认项','warn');return;}
  var v=$('lwVerifier').value.trim();
  if(!v){toast('请填写人工验证人','warn');return;}
  if(_lawCur){
    _lawCur.ver=_lawTmp.ver;_lawCur.eff=_lawTmp.eff;_lawCur.upd=nowStr();_lawCur.status='已生效';_lawCur.verifier=v;_lawCur.items+=12;
  }else{
    lawRows.unshift({_id:sdsUid(),key:'xvii',name:_lawTmp.name,org:_lawTmp.org,eff:_lawTmp.eff,ver:_lawTmp.ver,upd:nowStr(),status:'已生效',items:128,verifier:v});
  }
  closeModal();lawPage=1;lawRender();
  toast('新版本已人工确认入库并生效','ok');
}
/* 影响分析 */
var IMPACT=[
  ['SDS-2026-0102','水性聚氨酯涂饰树脂 WPU-320','欧盟·德国','2026-05-12','第 2、3、15 章：甲醛条目变更','需重新分类并改版'],
  ['SDS-2026-0088','皮革涂饰光亮剂 GL-9','欧盟·意大利','2026-04-02','第 15 章：SVHC 信息传递义务','补充 Art.33 声明'],
  ['SDS-2026-0075','加脂剂 L-27','中国','2026-03-18','第 15 章：法规引用版本过期','更新法规引用'],
  ['SDS-2025-0431','铬鞣剂 CR-33','欧盟·西班牙','2025-12-20','第 2、15 章：Cr(VI) 限值收紧','需实测复核 + 改版'],
  ['SDS-2025-0402','手感剂 HF-5','欧盟·法国','2025-11-08','第 15 章：清单引用','仅更新引用版本'],
  ['SDS-2025-0377','水性封底树脂 SB-11','中国','2025-10-15','第 3 章：浓度披露要求','评估后确认']
];
function lawImpact(id){
  var r=lawRows.filter(function(x){return x._id===id;})[0];
  openModal({title:'法规更新影响分析 · '+r.name,width:820,
    body:'<div class="stat-row"><div class="stat"><b>'+IMPACT.length+'</b><span>受影响已发布 SDS</span></div>'
      +'<div class="stat" style="border-color:var(--red-b);background:var(--red-bg)"><b style="color:var(--red)">2</b><span>需重新分类改版</span></div>'
      +'<div class="stat" style="border-color:var(--orange-b);background:var(--orange-bg)"><b style="color:var(--orange)">4</b><span>需更新法规章节</span></div></div>'
      +'<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px"><table class="tbl"><thead><tr><th style="width:140px">SDS 编号</th><th>产品名称</th><th style="width:110px">目标市场</th><th style="width:110px">发布日期</th><th>影响项</th><th style="width:150px">建议动作</th></tr></thead><tbody>'
      +IMPACT.map(function(x){
        return '<tr><td class="mono">'+x[0]+'</td><td>'+x[1]+'</td><td>'+x[2]+'</td><td>'+x[3]+'</td><td style="color:var(--ink2)">'+x[4]+'</td>'
          +'<td><span class="tag '+(x[5].indexOf('改版')>=0?'red':'orange')+'">'+x[5]+'</span></td></tr>';
      }).join('')+'</tbody></table></div>'
      +'<div class="notice info" style="margin:14px 0 0"><div class="ni">i</div><div>影响分析基于「法规清单条目 ↔ 组分 ↔ 已发布 SDS」的关联关系计算，可一键生成改版任务派发给编制人。</div></div>',
    footer:'<button class="btn" onclick="toast(\'影响清单已导出（演示）\',\'ok\')">导出清单</button><button class="btn primary" onclick="closeModal();toast(\'已生成 6 个 SDS 改版任务并派发\',\'ok\')">一键生成改版任务</button>'});
}

/* ==================================================================
   [9] 初始化
   ================================================================== */
function resetAll(){
  sdsConfirm('重置演示数据','将把向导流程、基础数据库与法规库全部恢复到初始演示状态，确认继续？',function(){
    wzInitState();SDS_ROWS.length=0;seedSdsRows();
    toast('演示数据已重置','ok');showPage('sds:wizard');
  },'重置');
}


/* ==================================================================
   [23-B] SDS 模块 · 弹窗适配层
   ------------------------------------------------------------------
   sdsModal  ：body 置于 .sds-scope 作用域内，复用原 SDS 子原型类名
   sdsConfirm：兼容原 confirmBox(title,html,cb,okText,danger) 签名
   ================================================================== */
function sdsModal(o){
  o=o||{};
  openModal({
    title:o.title,width:o.width||560,cls:'sds-scope',
    body:o.body||'',footer:o.footer,onOpen:o.onOpen
  });
}
function sdsConfirm(title,html,cb,okText,danger){
  confirmBox(title,html,cb,{okText:okText||'确定',danger:!!danger,cls:'sds-scope'});
}

/* 法规库：补充 listType 与 ZDHC 行业清单（供菜单 ZDHC / RoHS·REACH 两页派生） */
(function(){
  var MAP={xiv:'reach',xvii:'reach',clp6:'reach',svhc:'reach',
           gb16483:'cn',gb30000:'cn',gb13690:'cn'};
  lawRows.forEach(function(r){ r.listType=MAP[r.key]||'reach'; });
  [
    {key:'zdhc-mrsl',name:'ZDHC MRSL 生产限用物质清单 V3.1',org:'ZDHC 有害化学物质零排放基金会',
     eff:'2025-12-01',ver:'V3.1',upd:'2026-01-20 09:15',status:'已生效',items:412,verifier:'法规专员 · 陈工',listType:'zdhc'},
    {key:'zdhc-waste',name:'ZDHC 废水排放限值（Foundry 基础级）',org:'ZDHC 有害化学物质零排放基金会',
     eff:'2026-03-01',ver:'V2.0',upd:'2026-03-05 14:40',status:'已生效',items:38,verifier:'法规专员 · 刘工',listType:'zdhc'},
    {key:'zdhc-inflow',name:'ZDHC 输入流清单（InCheck 报告要求）',org:'ZDHC 有害化学物质零排放基金会',
     eff:'2026-07-01',ver:'V1.2',upd:'2026-07-10 11:20',status:'待复核',items:96,verifier:'待指派',listType:'zdhc'},
    {key:'rohs2',name:'RoHS 2.0（EU 2015/863 附篇 II 修订）',org:'欧盟委员会',
     eff:'2019-07-22',ver:'2015/863',upd:'2026-02-14 10:05',status:'已生效',items:10,verifier:'法规专员 · 陈工',listType:'reach'}
  ].forEach(function(o){
    o._id=sdsUid();lawRows.push(o);
    LAW_DETAIL[o.key]=LAW_DETAIL[o.key]||{cols:['序号','物质名称','CAS 号','限值','适用范围'],rows:[
      ['1','全氟化合物 PFOS / PFOA','—','< 1 μg/m²','皮革与纺织防水整理'],
      ['2','烷基酚聚氧乙烯醚 APEO','—','< 100 mg/kg','表面活性剂与助剂'],
      ['3','偶氮/芳香胺','—','< 30 mg/kg','染料与颜料'],
      ['4','有机锡化合物','—','< 1 mg/kg','催化剂与稳定剂']]};
  });
})();

/* ==================================================================
   [23-C] SDS 模块 · 页面注册
   ================================================================== */

/* ---------- 通用外壳：SDS 作用域 + 页头 ---------- */
function sdsWrap(inner){
  return '<div class="sds-scope"><div class="page-hd" style="display:flex;align-items:flex-start;gap:16px;margin-bottom:16px">'
    +inner+'</div>';
}
/* noteKey 有值时：desc 不再平铺在标题下，改为标题右侧「说明」按钮 + 可展开面板 */
function sdsHead(id,title,desc,acts,descId,noteKey){
  var n=noteKey?noteBlock(noteKey,desc):null;
  /* 折叠说明模式下标题与面板间距收紧（面板自带 16px 下边距） */
  var mb=n?'10px':'16px';
  return '<div class="page-hd" style="display:flex;align-items:flex-start;gap:16px;margin-bottom:'+mb+'">'
    +'<div><h2 style="font-size:19px;font-weight:650;margin:0" id="'+id+'">'+title+'</h2>'
    +(n?'':'<p style="color:var(--muted);font-size:12.5px;margin:3px 0 0;max-width:820px"'
    +(descId?' id="'+descId+'"':'')+'>'+desc+'</p>')
    +'</div>'
    +'<div class="page-acts" style="margin-left:auto;display:flex;gap:8px;align-items:center;flex-shrink:0">'
    +(n?n.btn:'')+acts+'</div></div>'
    +(n?n.panel:'');
}

/* ---------- 基础数据库页（物料主数据 / 组分基础数据） ---------- */
function renderDbPage(key,title,desc){
  var host=$('pageHost');
  dbKey=key;dbPage=1;dbKw='';dbFilterV='';
  Object.keys(DB_CFG).forEach(function(k){dbSel[k]=[];});
  host.innerHTML='<div class="sds-scope">'
    +sdsHead('dbTitle',esc(title||DB_CFG[key].title),esc(desc||DB_CFG[key].desc),
      '<button class="btn" onclick="dbImport()">批量导入</button>'
      +'<button class="btn danger" id="dbBatchDel" onclick="dbBatchDelete()">批量删除</button>'
      +'<button class="btn primary" onclick="dbEdit(null)">＋ 新增</button>','dbDesc')
    +'<div class="kpi-row" id="dbKpi"></div>'
    +'<div class="card"><div class="toolbar">'
      +'<div class="search"><i class="si">⌕</i><input id="dbKw" placeholder="搜索关键词…" oninput="dbSearch(this.value)"></div>'
      +'<select class="ctrl" id="dbFilter" style="width:170px" onchange="dbSetFilter(this.value)"></select>'
      +'<button class="btn sm" onclick="dbClearFilter()">重置筛选</button>'
      +'<div class="grow"></div>'
      +'<span id="dbSelInfo" style="font-size:12.5px;color:var(--muted)"></span></div>'
      +'<div class="tbl-wrap"><table class="tbl" id="dbTable"></table></div>'
      +'<div class="pager" id="dbPager"></div></div></div>';
  dbRender();
}

/* ---------- PubChem 组分数据自动补全 ---------- */
function renderPubChem(){
  var host=$('pageHost');
  host.innerHTML='<div class="sds-scope">'
    +sdsHead('','系统接入数据源 · PubChem 公开数据库',
      '通过免费公开 API 自动查询的物质候选数据，用于辅助填充与交叉核对。',
      '<button class="btn" onclick="pcSyncAll()">全量重新同步</button>'
      +'<button class="btn primary" onclick="pcAdd()">＋ 添加同步物质</button>')
    +'<div class="notice warn"><div class="ni">!</div><div><b>公开辅助资料来源 · 免费 API 自动查询</b>'
      +'PubChem 数据仅作为候选数据参考，<b style="display:inline">不可作为最终合规依据</b>；'
      +'正式 SDS 的分类与法规结论必须以实测报告、供应商 SDS 或人工维护法规库为准。</div></div>'
    +'<div id="lawMechPub"></div>'
    +'<div class="kpi-row" id="pcKpi"></div>'
    +'<div class="card"><div class="toolbar">'
      +'<div class="search"><i class="si">⌕</i><input id="pcKw" placeholder="搜索 CAS 号 / 物质名称…" oninput="pcRender()"></div>'
      +'<select class="ctrl" id="pcStatus" style="width:160px" onchange="pcRender()">'
      +'<option value="">全部数据状态</option><option>已同步</option><option>同步中</option><option>未匹配</option><option>待更新</option></select>'
      +'<div class="grow"></div><span class="tag grey">只读接入源 · 不可编辑核心法规字段</span></div>'
      +'<div class="tbl-wrap"><table class="tbl" id="pcTable"></table></div>'
      +'<div class="pager" id="pcPager"></div></div></div>';
  renderLawMech();pcRender();
}

/* ---------- 法规库页（ZDHC / RoHS·REACH 由 listType 派生） ---------- */
/* noteKey：说明文本（标题下的 desc + 原横幅提示）收进标题右侧的「说明」折叠面板 */
function renderLawPage(types,title,desc,noteKey){
  var host=$('pageHost');
  lawTypeFilter=types;lawPage=1;
  var noteTxt=esc(desc)
    +'<div class="np-n"><b>清单维护与生效</b>本库所有法规清单均为官方渠道下载后人工导入验证，'
    +'合规人员对数据质量负责；未完成人工确认入库的版本不会被 SDS 生成流程引用。</div>';
  host.innerHTML='<div class="sds-scope">'
    +sdsHead('',esc(title),noteTxt,
      '<button class="btn" onclick="toast(\'已导出法规台账（演示）\',\'ok\')">导出台账</button>'
      +'<button class="btn primary" onclick="lawUpload(null)">＋ 新增法规清单</button>','',noteKey)
    +'<div id="lawMechMan"></div>'
    +'<div class="kpi-row" id="lawKpi"></div>'
    +'<div class="card"><div class="toolbar">'
      +'<div class="search"><i class="si">⌕</i><input id="lawKw" placeholder="搜索法规名称 / 发布机构…" oninput="lawRender()"></div>'
      +'<select class="ctrl" id="lawStatus" style="width:160px" onchange="lawRender()">'
      +'<option value="">全部数据状态</option><option>已生效</option><option>待复核</option><option>已归档</option></select>'
      +'<div class="grow"></div><span class="tag orange dot-tag">人工维护 · 合规人员负责</span></div>'
      +'<div class="tbl-wrap"><table class="tbl" id="lawTable"></table></div>'
      +'<div class="pager" id="lawPager"></div></div></div>';
  renderLawMech();lawRender();
}

/* ---------- GHS 与受限属性 ---------- */
var GHS_ROWS=[
  {cas:'50-00-0',cn:'甲醛',ghs:'Carc. 1B / Muta. 2 / Acute Tox. 3',h:'H350 / H341 / H301',svhc:'是',reach:'Annex XVII Entry 77',zdhc:'MRSL V3.1',src:'法规库数据'},
  {cas:'79-10-7',cn:'丙烯酸',ghs:'Skin Corr. 1A / Acute Tox. 4',h:'H314 / H302',svhc:'否',reach:'Annex VI 607-061-00-8',zdhc:'—',src:'法规库数据'},
  {cas:'111-76-2',cn:'乙二醇单丁醚',ghs:'Acute Tox. 4 / Eye Irrit. 2',h:'H302 / H319',svhc:'否',reach:'Annex VI 603-014-00-0',zdhc:'—',src:'法规库数据'},
  {cas:'64-17-5',cn:'乙醇',ghs:'Flam. Liq. 2 / Eye Irrit. 2',h:'H225 / H319',svhc:'否',reach:'Annex VI 603-002-00-5',zdhc:'—',src:'法规库数据'},
  {cas:'108-88-3',cn:'甲苯',ghs:'Flam. Liq. 2 / Repr. 2 / STOT RE 2',h:'H225 / H361d / H373',svhc:'否',reach:'Annex XVII Entry 48',zdhc:'MRSL V3.1',src:'法规库数据'},
  {cas:'7789-09-5',cn:'重铬酸铵',ghs:'Carc. 1B / Muta. 1B / Acute Tox. 3',h:'H350 / H340 / H301',svhc:'是',reach:'Annex XIV / Annex XVII Entry 47',zdhc:'MRSL V3.1',src:'实测报告'},
  {cas:'1330-20-7',cn:'二甲苯',ghs:'Flam. Liq. 3 / Acute Tox. 4',h:'H226 / H312',svhc:'否',reach:'Annex VI 601-022-00-9',zdhc:'MRSL V3.1',src:'法规库数据'},
  {cas:'10043-01-3',cn:'硫酸铝',ghs:'Eye Dam. 1',h:'H318',svhc:'否',reach:'—',zdhc:'—',src:'供应商SDS'},
  {cas:'9009-54-5',cn:'聚氨酯预聚体',ghs:'Skin Irrit. 2',h:'H315',svhc:'否',reach:'聚合物豁免（Art.2(9)）',zdhc:'—',src:'供应商SDS'},
  {cas:'1310-73-2',cn:'氢氧化钠',ghs:'Skin Corr. 1A',h:'H314',svhc:'否',reach:'Annex VI 011-002-00-6',zdhc:'—',src:'实测报告'}
];
function renderGhs(){
  $('pageHost').innerHTML='<div id="lpHost"></div>';
  renderListPage({
    title:'GHS 与受限属性',
    sub:'按 CAS 号维护物质的 GHS 分类、危险说明与受限属性命中情况，是分类判定与法规章节的引用基础。',
    cols:[
      {k:'cas',t:'CAS 号',w:'110px'},
      {k:'cn',t:'物质名称',w:'140px'},
      {k:'ghs',t:'GHS 分类'},
      {k:'h',t:'危险说明 H 码',w:'180px'},
      {k:'svhc',t:'SVHC',w:'80px',fmt:function(r){return '<span class="tag '+(r.svhc==='是'?'red':'grey')+'">'+(r.svhc==='是'?'是':'否')+'</span>';}},
      {k:'reach',t:'REACH 命中'},
      {k:'zdhc',t:'ZDHC 命中',w:'110px'},
      {k:'src',t:'数据来源',w:'110px',fmt:function(r){
        var m={'法规库数据':'purple','实测报告':'green','供应商SDS':'blue'};
        return '<span class="tag '+(m[r.src]||'grey')+'">'+esc(r.src)+'</span>';}}
    ],
    rows:GHS_ROWS,kwKeys:['cas','cn','ghs','h','reach'],pageSize:10,
    acts:function(r){ return '<button class="btn btn-link" onclick="mdOpenGhs(\''+esc(r.cas)+'\')">查看</button>'; },
    onRowClick:function(r){ mdOpenGhs(r.cas); }
  });
}

/* ---------- SDS 生成向导（6 步） ---------- */
/* 步骤级操作说明：统一渲染在步骤导航下方，与内容区分离（避免整屏宽横幅插在内容中间） */
function wzGuide(html){
  var g=$('wzGuide');
  if(g)g.innerHTML=html||'';
}
function renderSdsWizard(){
  var host=$('pageHost');
  host.innerHTML='<div class="sds-scope">'
    +sdsHead('','SDS 文档生成向导',
      '按 6 步标准流程完成一份 SDS 的创建、配方冻结、数据汇集、分类判定、草案生成与审核发布。',
      '<span class="tag blue" id="wzProjNo">项目号：SDS-2026-0158</span>'
      +'<button class="btn" onclick="resetWizard()">重新开始</button>')
    +'<div class="steps" id="wzSteps"></div>'
    +'<div id="wzGuide"></div>'
    +'<div id="wzBody"></div>'
    +'<div class="wz-foot">'
      +'<div class="hint" id="wzHint"></div>'
      +'<button class="btn" id="wzCancel" onclick="wzCancel()">取消</button>'
      +'<button class="btn" id="wzPrev" onclick="wzGo(wz.step-1)">上一步</button>'
      +'<button class="btn primary" id="wzNext" onclick="wzNext()">下一步</button>'
    +'</div></div>';
  wzRenderSteps();
  wzGo(wz.step);
}

/* ---------- SDS 文档清单 ---------- */
var SDS_ROWS=[];
/* 证据状态灯判定（A2）
   四档 + 归档熄灯：
     红   需改版  → 库内已有新版法规未跟进
     橙   待复审  → 超复审周期 / 来源 pub / data_gap
     黄   临期    → 距复审日 ≤ 30 天（提前预警，留出准备时间）
     绿   正常    → 引用最新版 + 复审日 > 30 天
     —    （已归档产品不参与评估） */
var SDS_EV_ORD={red:0,overdue:1,due:2,green:3,none:4};
var SDS_EV_TXT={red:'需改版',overdue:'待复审',due:'临期',green:'正常',none:'—'};
function sdsEv(r){
  /* 已归档（产品停产）不参与证据评估 */
  if(r.status==='已归档')return {lv:'none',tip:'产品已停产归档，不参与证据状态评估'};
  if(r.lawVer!==r.lawLatest)
    return {lv:'red',tip:'库内已有新版 '+esc(r.lawLatest)+'，当前引用 '+esc(r.lawVer)+'，需改版'};
  var d=daysTo(r.reviewDue);
  if(d<0)return {lv:'overdue',tip:'已超复审期 '+(-d)+' 天（应于 '+esc(r.reviewDue)+' 复审）'};
  if(r.pubCnt>0)
    return {lv:'overdue',tip:r.pubCnt+' 项数据来自 PubChem，仅供参考，不可作为合规依据'};
  if(r.gapCnt>0)
    return {lv:'overdue',tip:'存在 '+r.gapCnt+' 项数据缺失（data_gap），需补录'};
  if(d<=30)return {lv:'due',tip:'距复审日 '+esc(r.reviewDue)+' 仅剩 '+d+' 天，建议提前安排复审'};
  return {lv:'green',tip:'引用 '+esc(r.lawVer)+' 最新版，下次复审 '+esc(r.reviewDue)+'（'+d+' 天后）'};
}
function seedSdsRows(){
  /* no, product, market, lang, ver, status, date, owner,
     rulePack, lawName, lawVer, lawLatest, reviewDue, pubCnt, gapCnt */
  [
    ['SDS-2026-0158','水性聚氨酯涂饰树脂 WPU-320','欧盟·德国','德语（DE）+ 英语（EN）','V1.0','已发布','2026-07-28','王工',
     'CLP ATP21','REACH Annex II','2020/878','2020/878','2027-07-28',0,0],
    ['SDS-2026-0151','无铬鞣剂 TC-08','欧盟·荷兰','荷兰语（NL）+ 英语（EN）','V1.3','待改版','2026-07-10','陈工',
     'CLP ATP21','REACH Annex II','2015/830','2020/878','2027-01-10',0,0],
    ['SDS-2026-0142','皮革涂饰光亮剂 GL-9','欧盟·意大利','意大利语（IT）','V2.1','已发布','2026-06-15','李工',
     'CLP ATP21','REACH Annex II','2020/878','2020/878','2026-09-20',0,0],
    ['SDS-2026-0131','加脂剂 L-27','中国','简体中文（zh-CN）','V1.2','已发布','2026-05-30','李工',
     'GB 30000','GB/T 16483','GB/T 16483-2008','GB/T 16483-2008','2026-08-25',0,0],
    ['SDS-2026-0126','水性消泡剂 DF-6','中国','简体中文（zh-CN）','V1.0','待改版','2026-05-20','王工',
     'GB 30000','GB 30000.1','GB 30000.1-2013','GB 30000.1-2024','2027-05-20',0,0],
    ['SDS-2026-0120','铬鞣剂 CR-33','欧盟·西班牙','西班牙语（ES）','V1.0','审核中','2026-05-12','王工',
     'CLP ATP21','REACH Annex II','2020/878','2020/878','2027-05-12',2,0],
    ['SDS-2026-0108','水性封底树脂 SB-11','中国','简体中文（zh-CN）','V0.9','编制中','2026-04-26','王工',
     'GB 30000','GB/T 16483','GB/T 16483-2008','GB/T 16483-2008','—',0,3],
    ['SDS-2026-0096','手感剂 HF-5','欧盟·法国','法语（FR）','V1.1','已发布','2026-04-08','李工',
     'CLP ATP21','REACH Annex II','2020/878','2020/878','2026-09-30',0,0],
    ['SDS-2026-0081','交联剂 XL-3','欧盟·荷兰','荷兰语（NL）','V1.0','已归档','2026-03-19','陈工',
     'CLP ATP21','REACH Annex II','2015/830','2020/878','2026-03-19',0,0],
    ['SDS-2026-0074','防霉剂 AM-7','中国','简体中文（zh-CN）','V1.0','已归档','2026-03-02','陈工',
     'GB 30000','GB/T 16483','GB/T 16483-2008','GB/T 16483-2008','2026-03-02',0,0]
  ].forEach(function(r){
    SDS_ROWS.push({no:r[0],product:r[1],market:r[2],lang:r[3],ver:r[4],status:r[5],date:r[6],owner:r[7],
      rulePack:r[8],lawName:r[9],lawVer:r[10],lawLatest:r[11],reviewDue:r[12],pubCnt:r[13],gapCnt:r[14],
      versions:null});
  });
  /* 版本历史（A6）：真实记录，非弹窗写死 */
  var V={
    'SDS-2026-0158':[['V1.0','首次编制并发布','王工','2026-07-28'],['V0.9','草案：补充第 3 章组分信息','王工','2026-07-20'],['V0.8','草案：完成分类判定','法规专员 · 陈工','2026-07-15']],
    'SDS-2026-0151':[['V1.3','更新第 2 章危险性概述','陈工','2026-07-10'],['V1.2','修订第 3 章组分浓度区间','陈工','2026-03-18'],['V1.1','首次发布（引用 2015/830）','陈工','2025-11-05']],
    'SDS-2026-0142':[['V2.1','复审：更新供应商证据','李工','2026-06-15'],['V2.0','改版：配方调整后重算分类','李工','2026-02-22'],['V1.0','首次编制并发布','李工','2025-06-11']],
    'SDS-2026-0131':[['V1.2','补录第 11 章毒理数据','李工','2026-05-30'],['V1.1','修订储存条件','李工','2025-12-03'],['V1.0','首次编制并发布','李工','2025-05-19']],
    'SDS-2026-0126':[['V1.0','首次编制并发布','王工','2026-05-20'],['V0.9','草案：完成 16 章结构','王工','2026-05-08']],
    'SDS-2026-0120':[['V1.0','提交审核（待 EHS 批准）','王工','2026-05-12'],['V0.9','草案：数据汇集完成','王工','2026-05-06']],
    'SDS-2026-0108':[['V0.9','草案：待补录 3 项数据','王工','2026-04-26'],['V0.8','草案：配方已冻结','王工','2026-04-19']],
    'SDS-2026-0096':[['V1.1','复审：更新第 14 章运输信息','李工','2026-04-08'],['V1.0','首次编制并发布','李工','2025-09-14']],
    'SDS-2026-0081':[['V1.0','已归档（产品停产）','陈工','2026-03-19'],['V0.9','草案','陈工','2026-02-20']],
    'SDS-2026-0074':[['V1.0','已归档（产品停产）','陈工','2026-03-02']]
  };
  SDS_ROWS.forEach(function(r){ r.versions=V[r.no]||[[r.ver,'当前版本',r.owner,r.date]]; });
  /* A10：证据异常行置顶（红 → 黄 → 绿），同色按更新时间倒序 */
  SDS_ROWS.sort(function(a,b){
    var d=SDS_EV_ORD[sdsEv(a).lv]-SDS_EV_ORD[sdsEv(b).lv];
    return d?d:(a.date<b.date?1:(a.date>b.date?-1:0));
  });
}
var SDS_ST={'已发布':'green','审核中':'orange','编制中':'blue','待改版':'purple','已归档':'grey'};
function sdsRulePack(r){
  var isEu=r.market.indexOf('欧盟')===0;
  return '<span class="tag '+(isEu?'blue':'green')+'" title="'+esc(r.lawName+' '+r.lawVer)+'">'+esc(r.rulePack)+'</span>';
}
function sdsEvLamp(r){
  var e=sdsEv(r);
  if(e.lv==='none')return '<span class="ev ev-none" title="'+e.tip+'"><i></i>—</span>';
  return '<span class="ev ev-'+e.lv+'" title="'+e.tip+'"><i></i>'+SDS_EV_TXT[e.lv]+'</span>';
}
/* A7：操作按状态区分；A8：仅已发布可导出 */
function sdsActs(r){
  var a='<button class="btn btn-link" onclick="sdsView(\''+r.no+'\')">查看</button>';
  if(r.status==='编制中')
    a+='<button class="btn btn-link" onclick="sdsEdit(\''+r.no+'\')">编辑</button>'
     + '<button class="btn btn-link" onclick="sdsSubmit(\''+r.no+'\')">提交审核</button>';
  else if(r.status==='审核中')
    a+='<span class="muted" style="font-size:12.5px">审核中</span>';
  else if(r.status==='已发布')
    a+='<button class="btn btn-link" onclick="sdsExport(\''+r.no+'\',\'PDF\')">导出 PDF</button>'
     + '<button class="btn btn-link" onclick="sdsExport(\''+r.no+'\',\'Word\')">导出 Word</button>'
     + '<button class="btn btn-link" onclick="sdsRevise(\''+r.no+'\')">申请改版</button>';
  else if(r.status==='待改版')
    a+='<button class="btn btn-link" onclick="sdsStartRevise(\''+r.no+'\')">开始改版</button>';
  else if(r.status==='已归档')
    a+='<span class="muted" style="font-size:12.5px">已归档</span>';
  return a;
}
/* A6：版本历史行内展开 */
function sdsVerHtml(r){
  return '<div class="ver-box"><div class="ver-t">版本历史 · '+esc(r.no)+'</div>'
    +'<table class="tbl mini"><thead><tr><th style="width:70px">版本</th><th>变更说明</th>'
    +'<th style="width:140px">操作人</th><th style="width:110px">日期</th></tr></thead><tbody>'
    +r.versions.map(function(v,i){
        return '<tr'+(i===0?' class="on"':'')+'><td class="mono">'+esc(v[0])+(i===0?' <span class="tag green">当前</span>':'')+'</td>'
          +'<td>'+esc(v[1])+'</td><td>'+esc(v[2])+'</td><td>'+esc(v[3])+'</td></tr>';
      }).join('')
    +'</tbody></table><div class="ver-f">历史版本只读可查，用于审计追溯。</div></div>';
}
var SDS_FOCUS='';    /* A10：从首页预警跳转时高亮的文档编号 */
function sdsFocus(no){ showPage('sds:list',{focus:no}); }
function renderSdsList(){
  var host=$('pageHost');
  host.innerHTML='<div id="lpHost"></div>';
  renderListPage({
    title:'SDS 文档列表',
    sub:'SDS 文档的统一查询入口，按「证据状态灯」排序：需改版（红）→ 待复审（黄）→ 正常（绿）。点击行首 ▸ 展开版本历史。',
    cols:[
      {k:'no',t:'文档编号',w:'140px',fmt:function(r){return '<span class="mono">'+esc(r.no)+'</span>';}},
      {k:'product',t:'产品名称'},
      {k:'market',t:'目标市场 / 语言',w:'190px',fmt:function(r){
        return esc(r.market)+'<br><small style="color:var(--muted)">'+esc(r.lang)+'</small>';}},
      {k:'rulePack',t:'规则包',w:'110px',fmt:sdsRulePack},
      {k:'ver',t:'版本',w:'80px',align:'c',fmt:function(r){return '<span class="mono">'+esc(r.ver)+'</span>';}},
      {k:'status',t:'状态',w:'100px',fmt:function(r){
        return '<span class="tag '+(SDS_ST[r.status]||'grey')+' dot-tag">'+esc(r.status)+'</span>';}},
      {k:'ev',t:'证据状态',w:'110px',fmt:sdsEvLamp},
      {k:'date',t:'更新时间',w:'110px'},
      {k:'owner',t:'编制人',w:'80px'}
    ],
    rows:SDS_ROWS,kwKeys:['no','product','market','lang'],
    /* A5：状态 + 目标市场双筛选 */
    filters:[
      {k:'status',t:'状态',all:'全部',opts:[['已发布','已发布'],['审核中','审核中'],['编制中','编制中'],['待改版','待改版'],['已归档','已归档']]},
      {k:'rulePack',t:'规则包',all:'全部',opts:[['CLP ATP21','CLP ATP21'],['GB 30000','GB 30000']]}
    ],
    pageSize:10,
    headActs:'<button class="btn btn-primary" onclick="showPage(\'sds:wizard\')">＋ 新增 SDS 文档</button>',
    /* A10：证据异常行标底色 + 首页预警跳转高亮 */
    rowCls:function(r){
      var lv=sdsEv(r).lv;
      var c=lv==='red'?'row-red':(lv==='overdue'?'row-overdue':(lv==='due'?'row-due':''));
      if(SDS_FOCUS&&r.no===SDS_FOCUS)c+=' row-focus';
      return c;
    },
    rowExpand:function(r){ return sdsVerHtml(r); },
    acts:sdsActs,
    onRowClick:function(r){ sdsView(r.no); }
  });
}
function sdsView(no){
  var r=SDS_ROWS.filter(function(x){return x.no===no;})[0]; if(!r)return;
  var e=sdsEv(r);
  openModal({title:'SDS 文档详情 · '+no,width:720,
    body:'<div class="page-hd" style="margin-bottom:14px"><div class="t"><h1 style="font-size:17px">'+esc(r.product)+'</h1>'
      +'<div class="page-sub">'+esc(r.market)+' · '+esc(r.lang)+'</div></div>'
      +'<div class="page-acts"><span class="tag '+(SDS_ST[r.status]||'grey')+'">'+esc(r.status)+'</span>'
      +sdsEvLamp(r)+'</div></div>'
      +'<div class="notice '+({red:'err',overdue:'warn',due:'warn',green:'ok',none:'grey'}[e.lv]||'info')
      +'"><div class="ni">'+({red:'!',overdue:'!',due:'!',green:'✓',none:'—'}[e.lv]||'i')+'</div>'
      +'<div><b>证据状态：'+SDS_EV_TXT[e.lv]+'</b>'+e.tip+'</div></div>'
      +'<table class="tbl"><tbody>'
      +'<tr><th style="width:120px;text-align:left">文档编号</th><td class="mono">'+esc(r.no)+'</td>'
      +'<th style="width:120px;text-align:left">当前版本</th><td>'+esc(r.ver)+'</td></tr>'
      +'<tr><th style="text-align:left">目标市场</th><td>'+esc(r.market)+'</td>'
      +'<th style="text-align:left">投放语言</th><td>'+esc(r.lang)+'</td></tr>'
      +'<tr><th style="text-align:left">适用规则包</th><td>'+esc(r.rulePack)+' · '+esc(r.lawName)+' '+esc(r.lawVer)+'</td>'
      +'<th style="text-align:left">下次复审</th><td>'+esc(r.reviewDue)+'</td></tr>'
      +'<tr><th style="text-align:left">编制人</th><td>'+esc(r.owner)+'</td>'
      +'<th style="text-align:left">更新时间</th><td>'+esc(r.date)+'</td></tr>'
      +'</tbody></table>'
      +'<table class="tbl" style="margin-top:16px"><thead><tr><th style="width:70px">版本</th><th>变更说明</th><th style="width:140px">操作人</th><th style="width:110px">日期</th></tr></thead><tbody>'
      +r.versions.map(function(v,i){
          return '<tr'+(i===0?' class="on"':'')+'><td class="mono">'+esc(v[0])+'</td><td>'+esc(v[1])+'</td>'
            +'<td>'+esc(v[2])+'</td><td>'+esc(v[3])+'</td></tr>';}).join('')
      +'</tbody></table>',
    footer:'<button class="btn" onclick="closeModal()">关闭</button>'
          +(r.status==='已发布'
            ?'<button class="btn btn-primary" onclick="closeModal();sdsExport(\''+no+'\',\'PDF\')">导出 PDF</button>'
            :'<button class="btn disabled" title="仅「已发布」状态可导出">导出 PDF</button>')});
}
function sdsEdit(no){ toast('已打开 '+no+' 草案编辑（演示环境为只读原型）','info'); }
function sdsSubmit(no){
  SDS_ROWS.forEach(function(r){ if(r.no===no){r.status='审核中';r.date=todayStr();} });
  toast('已提交审核，审批单号 AP-2026-0871','ok');
  setTimeout(function(){ showPage('sds:list'); },300);
}
function sdsStartRevise(no){
  var r=SDS_ROWS.filter(function(x){return x.no===no;})[0];
  toast('已进入改版流程：'+no+'（'+r.lawVer+' → '+r.lawLatest+'）','ok');
  showPage('sds:wizard');
}
function sdsRevise(no){
  SDS_ROWS.forEach(function(r){ if(r.no===no){r.status='审核中';r.date=todayStr();} });
  toast('已基于 '+no+' 创建改版任务，可在「SDS 文档列表」跟踪','ok');
  setTimeout(function(){ showPage('sds:list'); },300);
}
function sdsExport(no,fmt){
  var r=SDS_ROWS.filter(function(x){return x.no===no;})[0];
  /* A8：仅已发布可导出 */
  if(!r||r.status!=='已发布'){ toast('仅「已发布」状态的 SDS 可导出','warn'); return; }
  fmt=fmt||'PDF';
  downloadFile(no+'_SDS_摘要.txt',
    'SDS 文档摘要\n文档编号：'+no+'\n产品：'+r.product+'\n目标市场：'+r.market+' / '+r.lang
    +'\n适用规则包：'+r.rulePack+'（'+r.lawName+' '+r.lawVer+'）\n导出格式：'+fmt
    +'\n导出时间：'+nowStr()+'\n（演示原型，正式版将输出完整 16 章 PDF / Word）\n');
  toast('已导出 '+no+' 摘要文件（'+fmt+'）','ok');
}
seedSdsRows();

/* ==================================================================
   [23-D] 页面注册
   ================================================================== */
regPage('sds:list',{
  title:'SDS 文档列表',crumb:['合规管理','SDS 管理','SDS 文档列表'],
  render:function(params){ SDS_FOCUS=(params&&params.focus)||''; renderSdsList(); }
});
regPage('sds:wizard',{
  title:'SDS 生成向导',crumb:['合规管理','SDS 管理','SDS 生成向导'],
  render:function(){ renderSdsWizard(); }
});
regPage('bd:comp',{
  title:'组分基础信息',crumb:['基础数据','组分基础信息'],
  render:function(){ renderDbPage('component'); }
});
regPage('bd:rawmat',{
  title:'原料信息',crumb:['基础数据','原料信息'],
  render:function(){
    renderDbPage('material','原料信息',
      '企业采购与自产原料的身份档案，含物质形态、规格型号与配方组成，是 SDS 编制与法规匹配的基础。');
  }
});
regPage('bd:sup-data',{
  title:'供应商原料数据',crumb:['基础数据','供应商原料数据'],
  render:function(){
    renderDbPage('measure','供应商原料数据',
      '来自第三方检测报告与供应商 SDS 的原始数据，是分类判定的最高优先级依据（实测报告 > 供应商 SDS）。');
  }
});
regPage('bd:comp-auto',{
  title:'组分数据自动补全',crumb:['基础数据','组分数据自动补全'],
  render:function(){ renderPubChem(); }
});
regPage('bd:ghs',{
  title:'GHS 与受限属性',crumb:['基础数据','GHS 与受限属性'],
  render:function(){ renderGhs(); }
});
/* law:zdhc 由 23y-js-law-query.js 的 regLawMaintenance 统一注册，避免旧分库页重复注册。 */
/* law:rohs（RoHS · REACH 法规库，已被法库维护页取代的隐藏旧页）于 2026-09-18
   由「受限物质管理 · RoHS 限用物质」新页面接管，注册移交 23z8-js-law-misc.js */
