/* ==================================================================
   [24z1] 实验管理 · 三页重构（菜单：实验列表 / DOE实验设计 / 实验分析）
     exp:list     实验列表 —— 统一执行层：普通实验 + DOE 方案下发后的各组运行
     exp:doe      DOE 实验设计 —— 方案层：1 条 = 1 套完整设计方案
     exp:analysis 实验分析 —— 先选可分析对象，再进入分析报告
   数据关系：
     普通实验 → 1 条实验记录 → 录入数据 → 实验分析
     DOE方案 → 试验矩阵 → 确认下发 → N 条实验记录 → 各组录入 → 回到方案统一分析
   注：旧 24-js-doe.js 中的 exp:list 已迁移至此；原 exp:analysis 报告页改名 exp:report
   ================================================================== */

/* ---------- 列表筛选状态 ---------- */
var expListState={kw:'',fStatus:'',fDept:'',fProj:'',fSource:'',fOwner:''};
var doeListState={kw:'',fProj:'',fType:'',fStatus:'',fCreator:''};
var anaListState={kw:'',fProj:'',fKind:'',fAna:''};

/* ---------- 统一跳转入口（旧页面中引用，统一在此定义） ---------- */
/* 新建 DOE 方案：走 4 步设计向导，产出「待下发」方案 */
function openWizardNew(){ showPage('exp:wizard',{mode:'new',target:'scheme'}); }
/* 编辑：优先按 DOE 方案处理，回落旧的单条实验记录 */
function openWizardEdit(id){
  if(findScheme(id)){ showPage('exp:wizard',{mode:'edit',id:id,target:'scheme'}); return; }
  if(findExp(id)){ showPage('exp:wizard',{mode:'edit',id:id,target:'exp'}); return; }
  toast('未找到可编辑对象：'+id,'warn');
}
/* 普通实验在实验设计内录入；DOE 运行保留独立结果录入流程 */
function openEntry(id){
  var e=findExp(id);
  if(e&&e.source==='普通'){
    showPage('exp:detail',{id:id,tab:'design'});
    setTimeout(function(){editNormalExp(id);scrollNormalSection('process-test');},0);
    return;
  }
  showPage('exp:detail',{id:id,tab:'entry'});
}
/* 查看分析报告：DOE 运行记录统一回到所属方案分析；普通实验走自身报告 */
function startAnalysis(id){
  var e=findExp(id); if(!e){toast('未找到实验记录','warn');return;}
  if(e.schemeId&&findScheme(e.schemeId)){
    toast('DOE 运行记录不单独出报告，已跳转所属方案统一分析','info');
    showPage('exp:report',{id:e.schemeId,kind:'doe'});
    return;
  }
  showPage('exp:report',{id:id,kind:'exp'});
}

/* ==================================================================
   exp:list · 实验列表（统一执行层）
   ================================================================== */
regPage('exp:list',{
  title:'实验列表',
  crumb:['实验管理','实验列表'],
  render:function(){
    var h='';
    h+='<div class="page-hd"><div class="t"><h1>实验列表</h1>'+
       '<div class="page-sub">统一展示所有需要实际执行的实验记录：手动创建的普通实验，以及 DOE 方案下发后生成的各组运行</div></div>'+
       '<div class="page-acts">'+
         '<button class="btn btn-primary" onclick="openNewNormalExp()">＋ 新增普通实验</button>'+
         '<button class="btn" onclick="showPage(\'exp:doe\')">DOE 实验设计 →</button>'+
       '</div></div>';
    h+='<div class="exp-layout">'+
         '<aside class="exp-tree" id="expTree">'+expTreeHtml()+'</aside>'+
         '<div class="exp-main">'+
           '<div class="toolbar">'+
             '<div class="search-box"><span class="si">🔍</span>'+
               '<input class="input" id="expKw" placeholder="搜索实验目的 / 编号 / 结论 / 实验变量" value="'+esc(expListState.kw)+'"></div>'+
             '<select class="ctrl" id="expFProj"><option value="">'+(expListState.fDept?'所属项目：本部门全部':'所属项目：全部')+'</option>'+
               expProjOptions()+'</select>'+
             '<select class="ctrl" id="expFSource"><option value="">实验来源：全部</option>'+
               EXP_SOURCE.map(function(s){return '<option value="'+esc(s)+'"'+(expListState.fSource===s?' selected':'')+'>'+esc(s)+'</option>';}).join('')+
             '</select>'+
             '<select class="ctrl" id="expFSta"><option value="">执行状态：全部</option>'+
               RUN_STATUS.map(function(s){return '<option value="'+esc(s)+'"'+(expListState.fStatus===s?' selected':'')+'>'+esc(s)+'</option>';}).join('')+
             '</select>'+
             '<select class="ctrl" id="expFOwner"><option value="">负责人：全部</option>'+
               expOwnerOptions()+'</select>'+
           '</div>';
    h+='<div class="card"><div class="card-b tight"><div class="tbl-wrap"><table class="tbl exp-list-table">'+
       '<thead><tr><th style="width:56px">行号</th><th style="width:280px">实验目的</th>'+
       '<th style="width:180px">实验编号</th><th style="width:82px">总结</th><th style="width:110px">实验日期</th>'+
       '<th style="width:90px">实验员</th><th style="width:160px">实验类型</th><th style="width:300px">结论</th>'+
       '<th style="width:260px">实验变量</th><th style="width:90px">创建人</th><th style="width:145px">创建时间</th>'+
       '<th style="width:95px">实验来源</th><th style="width:200px">DOE 方案 / 试验组</th>'+
       '<th style="width:180px">操作</th></tr></thead>'+
       '<tbody id="expTbody"></tbody></table></div></div></div>'+
         '</div>'+
       '</div>';
    $('pageHost').innerHTML=h;
    var kwEl=$('expKw');
    if(kwEl)kwEl.oninput=function(){ expListState.kw=this.value.trim().toLowerCase(); renderExpRows(); };
    [['expFProj','fProj'],['expFSource','fSource'],['expFSta','fStatus'],['expFOwner','fOwner']].forEach(function(pair){
      var s=$(pair[0]);
      if(s)s.onchange=function(){
        expListState[pair[1]]=this.value;
        if(pair[0]==='expFProj'){
          /* 与左侧部门树二级联动 */
          expListState.fDept = this.value ? (findProj(this.value)?findProj(this.value).dept:'') : '';
          var tv=$('expTree'); if(tv)tv.innerHTML=expTreeHtml();
        }
        renderExpRows();
      };
    });
    renderExpRows();
  }
});

/* 负责人下拉：取数据中实际出现过的负责人 */
function expOwnerOptions(){
  var set=[];
  experiments.forEach(function(e){ if(e.owner&&set.indexOf(e.owner)<0)set.push(e.owner); });
  return set.map(function(o){
    return '<option value="'+esc(o)+'"'+(expListState.fOwner===o?' selected':'')+'>'+esc(o)+'</option>';
  }).join('');
}

function renderExpRows(){
  var tb=$('expTbody'); if(!tb)return;
  var rows=experiments.filter(function(e){
    if(expListState.fDept){
      var dp=deptProjects(expListState.fDept).map(function(p){return p.id;});
      if(!e.projectIds.some(function(pid){return dp.indexOf(pid)>=0;}))return false;
    }
    if(expListState.fProj && e.projectIds.indexOf(expListState.fProj)<0)return false;
    if(expListState.fSource){
      var src=(e.source==='DOE')?'DOE实验':'普通实验';
      if(src!==expListState.fSource)return false;
    }
    if(expListState.fStatus && e.status!==expListState.fStatus)return false;
    if(expListState.fOwner && e.owner!==expListState.fOwner)return false;
    if(expListState.kw && [expPurpose(e),e.id,expConclusion(e),expVariables(e)].join(' ').toLowerCase().indexOf(expListState.kw)<0)return false;
    return true;
  });
  if(!rows.length){
    tb.innerHTML='<tr><td colspan="14"><div class="empty"><span class="ei">🧪</span>未找到匹配的实验记录</div></td></tr>';
    return;
  }
  tb.innerHTML=rows.map(function(e,i){
    var isDOE=(e.source==='DOE');
    var done=(e.status==='已完成'||e.status==='已分析');
    var ops='';
    ops+='<button class="btn-link" onclick="showPage(\'exp:detail\',{id:\''+e.id+'\'})">查看详情</button>';
    ops+=' <button class="btn-link" onclick="openEntry(\''+e.id+'\')">录入数据</button>';
    if(done)ops+=' <button class="btn-link" onclick="openResult(\''+e.id+'\')">查看结果</button>';
    /* 所属 DOE 方案：列表中的 DOE 实验是一整套执行任务，不再逐组拆行 */
    var schemeCell = isDOE
      ? '<a class="btn-link" onclick="event.stopPropagation();showPage(\'exp:doe\')">'+esc(e.schemeId)+'</a>'
        +' <span class="muted">/ 共 '+(e.runs?e.runs.length:0)+' 组</span>'
      : '<span class="muted">—</span>';
    var srcTag = isDOE
      ? '<span class="tag tag-purple">DOE实验</span>'
      : '<span class="tag tag-grey">普通实验</span>';
    return '<tr style="cursor:pointer" onclick="showPage(\'exp:detail\',{id:\''+e.id+'\'})">'+
      '<td class="muted ctr">'+(i+1)+'</td>'+
      '<td><div class="exp-purpose">'+esc(expPurpose(e))+'</div>'+(expPurpose(e)!==e.name?'<div class="muted exp-name">'+esc(e.name)+'</div>':'')+'</td>'+
      '<td><b class="mono">'+esc(e.id)+'</b></td>'+
      '<td><span class="tag '+(expSummaryRef(e.id)?'tag-green':'tag-grey')+'">'+(expSummaryRef(e.id)?'已总结':'未总结')+'</span></td>'+
      '<td>'+esc(expDate(e))+'</td><td>'+esc(e.owner||'—')+'</td><td>'+esc(e.type||'—')+'</td>'+
      '<td><div class="exp-conclusion">'+esc(expConclusion(e))+'</div></td>'+
      '<td><div class="exp-variables">'+esc(expVariables(e))+'</div></td>'+
      '<td>'+esc(e.creator||'—')+'</td><td>'+esc(e.createTime||'—')+'</td>'+
      '<td>'+srcTag+'</td><td>'+schemeCell+'</td>'+
      '<td class="op" onclick="event.stopPropagation()">'+ops+'</td>'+
    '</tr>';
  }).join('');
}

function expSummaryRef(eid){
  for(var i=0;i<expSummaries.length;i++){
    var s=expSummaries[i];
    for(var j=0;j<(s.items||[]).length;j++){
      if(s.items[j].expId===eid)return {summary:s,item:s.items[j]};
    }
  }
  return null;
}
function expPurpose(e){
  if(e.source==='DOE'&&e.purpose)return e.purpose;
  var ref=expSummaryRef(e.id);
  return ref?ref.summary.purpose:(e.name||'—');
}
function expDate(e){
  if(e.source==='DOE'&&e.experimentDate)return e.experimentDate;
  var ref=expSummaryRef(e.id);
  if(ref&&ref.item.basic&&ref.item.basic.date)return ref.item.basic.date;
  if(e.analyzedAt)return String(e.analyzedAt).slice(0,10);
  if(e.status==='已完成'||e.status==='已分析')return e.dueDate||'—';
  return '—';
}
function expConclusion(e){
  if(e.source==='DOE'&&e.runs){
    var st=schemeDataStat(e.schemeId);
    return st.done===st.total?'全部 '+st.total+' 组已完成，可进入 DOE 分析':'已完成 '+st.done+' / '+st.total+' 组';
  }
  var ref=expSummaryRef(e.id);
  if(ref&&ref.item.summary)return ref.item.summary;
  if(e.status==='已完成'||e.status==='已分析')return '实验已完成，待生成实验总结';
  return '—';
}
function expVariables(e){
  if(e.source==='DOE'&&e.runs)return '因素：'+e.factors.map(function(f){return f.name;}).join('、')+'；响应：'+e.responses.join('、');
  if(e.source==='DOE'&&e.plan&&e.plan[0]&&e.plan[0].combo){
    return e.factors.map(function(f,i){
      return f.name+'='+e.plan[0].combo[i]+(f.unit||'');
    }).join('；');
  }
  return (e.responses||[]).join('、')||'—';
}

function openResult(id){
  var e=findExp(id);
  if(e&&e.source==='DOE'&&e.runs){showPage('exp:detail',{id:id,tab:'entry'});return;}
  if(e&&e.source==='普通'){
    showPage('exp:detail',{id:id,tab:'design'});
    setTimeout(function(){scrollNormalSection('conclusion');},0);
    return;
  }
  showPage('exp:detail',{id:id,tab:'summary'});
}

/* ---------- 新增普通实验 ---------- */
function openNewNormalExp(){
  var projOpts=PROJECTS.map(function(p){
    return '<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>';
  }).join('');
  var userOpts=USERS.map(function(u){
    return '<option value="'+esc(u.id)+'"'+(u.id==='李工'?' selected':'')+'>'+esc(u.name)+'（'+esc(u.role)+'）</option>';
  }).join('');
  openModal({
    title:'新增普通实验',
    width:640,
    body:'<div class="flex mb"><div class="muted">维护实验主数据并选择创建方式</div><div class="spacer"></div></div><div class="form-grid">'+
      '<div class="field"><label>创建方式</label><select class="ctrl" id="neMode" onchange="toggleNormalTemplate()"><option value="blank">创建空白实验</option><option value="template">引用模板</option></select></div>'+
      '<div class="field"><label>实验模板</label><select class="ctrl" id="neTemplate" disabled><option value="polycondensation">缩聚反应模板</option><option value="ringOpening">开环反应模板</option><option value="aqueousPu">水性聚氨酯模板</option></select></div>'+
      '<div class="field span2"><label class="req">实验名称</label>'+
        '<input class="ctrl" id="neName" placeholder="例如：WPU-320 乳液稳定性平行验证"></div>'+
      '<div class="field span2"><label>实验目的</label><textarea class="ctrl" id="nePurpose" rows="2" placeholder="说明本次实验要验证的问题"></textarea></div>'+
      '<div class="field"><label>所属项目</label><select class="ctrl" id="neProj">'+
        '<option value="">不挂项目</option>'+projOpts+'</select></div>'+
      '<div class="field"><label>负责人</label><select class="ctrl" id="neOwner">'+userOpts+'</select></div>'+
      '<div class="field"><label>计划完成日期</label>'+
        '<input class="ctrl" type="date" id="neDue" value="'+esc(daysFromNow(14))+'"></div>'+
      '<div class="field"><label>平行样组数</label>'+
        '<select class="ctrl" id="neRuns"><option value="2">2 组</option><option value="3" selected>3 组</option>'+
        '<option value="4">4 组</option><option value="5">5 组</option></select></div>'+
      '<div class="field span2"><label>响应变量</label>'+
        '<input class="ctrl" id="neResp" placeholder="多个用、分隔，例如：稳定性评分、粘度 mPa·s"></div>'+
      '<div class="field"><label>温度建议</label><input class="ctrl" id="neAiTemp" placeholder="可由 AI 建议填入"></div>'+
      '<div class="field"><label>交联剂用量建议</label><input class="ctrl" id="neAiCross" placeholder="可由 AI 建议填入"></div>'+
      '<div class="field span2"><label>固化时间建议</label><input class="ctrl" id="neAiCure" placeholder="可由 AI 建议填入"></div>'+
    '</div>'+
    '<div class="notice notice-info mt"><i class="ni">i</i><div>空白实验从零维护工序；引用模板会带入预设工序、计算项和检测项，创建后仍可调整。</div></div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
           '<button class="btn btn-primary" onclick="saveNewNormalExp()">创建</button>'
  });
}
function toggleNormalTemplate(){if($('neTemplate'))$('neTemplate').disabled=($('neMode').value!=='template');}
function saveNewNormalExp(){
  var name=($('neName')&&$('neName').value||'').trim();
  if(!name){ toast('实验名称必填','warn'); return; }
  var runs=parseInt(($('neRuns')&&$('neRuns').value)||'3',10)||3;
  var respRaw=($('neResp')&&$('neResp').value||'').trim();
  var responses=respRaw?respRaw.split(/[、,，]/).map(function(s){return s.trim();}).filter(Boolean):['响应值'];
  var levels=[]; for(var i=1;i<=runs;i++)levels.push('批次'+i);
  var newId='EXP-2026-'+String(Math.floor(Math.random()*9000)+1000);
  var proj=($('neProj')&&$('neProj').value)||'';
  var templateKey=($('neMode')&&$('neMode').value)==='template'?(($('neTemplate')&&$('neTemplate').value)||'polycondensation'):'blank';
  var e={
    id:newId,name:name,source:'普通',schemeId:null,runSeq:null,
    projectIds:proj?[proj]:[],
    type:'单因子平行实验',
    factors:[{name:'平行批次',type:'categorical',unit:'',levels:levels,desc:'同一配方的 '+runs+' 次平行样'}],
    responses:responses,
    centerPoints:0,randomize:false,
    owner:($('neOwner')&&$('neOwner').value)||'',
    dueDate:($('neDue')&&$('neDue').value)||'',
    status:'待执行',templateKey:templateKey,experimentDate:nowStr().split(' ')[0],
    purpose:(($('nePurpose')&&$('nePurpose').value||'').trim()||('验证'+name+'的工艺可行性与关键性能。')),keyTechnology:'',experimentVariable:responses.join('、'),
    creator:'王研究员',createTime:nowStr(),analyzedAt:''
  };
  e.plan=generatePlan(e.factors,0,false,e.id);
  e.entered=e.plan.map(function(){var o={};e.responses.forEach(function(r){o[r]='';});return o;});
  var t=cloneObj(NORMAL_EXP_TEMPLATES[templateKey]||NORMAL_EXP_TEMPLATES.blank);
  var aiParams=[['温度',($('neAiTemp')&&$('neAiTemp').value||'').trim()],['交联剂用量',($('neAiCross')&&$('neAiCross').value||'').trim()],['固化时间',($('neAiCure')&&$('neAiCure').value||'').trim()]].filter(function(x){return x[1];});
  aiParams.forEach(function(x){t.calculations.push({name:x[0]+'建议水平',type:'AI 建议',value:x[1]});});
  e.keyTechnology=t.processes.map(function(p){return p.name;}).join('、');
  e.normalDetail={processes:t.processes,calculations:t.calculations,processTests:t.processTests,productTests:t.productTests,conclusion:'',attachments:[]};
  experiments.unshift(e);
  syncNormalRecipe(e);
  closeModal();
  toast('已创建普通实验 '+newId,'ok');
  showPage('exp:detail',{id:newId,tab:'design'});
}

/* ==================================================================
   exp:doe · DOE 实验设计（方案层）
   ================================================================== */
regPage('exp:doe',{
  title:'DOE 实验设计',
  crumb:['实验管理','DOE 实验设计'],
  render:function(){
    var h='';
    h+='<div class="page-hd"><div class="t"><h1>DOE 实验设计</h1>'+
       '<div class="page-sub">一条记录代表一套完整的实验设计方案，不代表单次实验；'+
       '方案「确认下发」后才会按试验矩阵生成 N 条实验记录</div></div>'+
       '<div class="page-acts">'+
         '<button class="btn btn-primary" onclick="openWizardNew()">＋ 新建 DOE 方案</button>'+
       '</div></div>';
    h+='<div class="toolbar">'+
         '<div class="search-box"><span class="si">🔍</span>'+
           '<input class="input" id="doeKw" placeholder="搜索方案名称 / 编号" value="'+esc(doeListState.kw)+'"></div>'+
         '<select class="ctrl" id="doeFProj"><option value="">所属项目：全部</option>'+
           PROJECTS.map(function(p){return '<option value="'+esc(p.id)+'"'+(doeListState.fProj===p.id?' selected':'')+'>'+esc(p.name)+'</option>';}).join('')+
         '</select>'+
         '<select class="ctrl" id="doeFType"><option value="">设计类型：全部</option>'+
           TYPE_DEFS.map(function(t){return '<option value="'+esc(t.key)+'"'+(doeListState.fType===t.key?' selected':'')+'>'+esc(t.key)+'</option>';}).join('')+
         '</select>'+
         '<select class="ctrl" id="doeFSta"><option value="">方案状态：全部</option>'+
           SCHEME_STATUS.map(function(s){return '<option value="'+esc(s)+'"'+(doeListState.fStatus===s?' selected':'')+'>'+esc(s)+'</option>';}).join('')+
         '</select>'+
         '<select class="ctrl" id="doeFCreator"><option value="">创建人：全部</option>'+
           schemeCreatorOptions()+'</select>'+
       '</div>';
    h+='<div class="card"><div class="card-b tight"><div class="tbl-wrap"><table class="tbl">'+
       '<thead><tr><th>DOE 编号</th><th>方案名称</th><th>所属项目</th><th>设计类型</th>'+
       '<th style="text-align:right">因素数</th><th style="text-align:right">运行数</th>'+
       '<th style="width:150px">完成进度</th><th>状态</th><th>创建人</th>'+
       '<th style="width:1%">操作</th></tr></thead>'+
       '<tbody id="doeTbody"></tbody></table></div></div></div>';
    $('pageHost').innerHTML=h;
    var kwEl=$('doeKw');
    if(kwEl)kwEl.oninput=function(){ doeListState.kw=this.value.trim().toLowerCase(); renderDoeRows(); };
    [['doeFProj','fProj'],['doeFType','fType'],['doeFSta','fStatus'],['doeFCreator','fCreator']].forEach(function(pair){
      var s=$(pair[0]);
      if(s)s.onchange=function(){ doeListState[pair[1]]=this.value; renderDoeRows(); };
    });
    renderDoeRows();
  }
});

function schemeCreatorOptions(){
  var set=[];
  doeSchemes.forEach(function(s){ if(s.creator&&set.indexOf(s.creator)<0)set.push(s.creator); });
  return set.map(function(o){
    return '<option value="'+esc(o)+'"'+(doeListState.fCreator===o?' selected':'')+'>'+esc(o)+'</option>';
  }).join('');
}

function renderDoeRows(){
  var tb=$('doeTbody'); if(!tb)return;
  var rows=doeSchemes.filter(function(s){
    if(doeListState.fProj && s.projectIds.indexOf(doeListState.fProj)<0)return false;
    if(doeListState.fType && s.type!==doeListState.fType)return false;
    if(doeListState.fStatus && s.status!==doeListState.fStatus)return false;
    if(doeListState.fCreator && s.creator!==doeListState.fCreator)return false;
    if(doeListState.kw && (s.id+s.name).toLowerCase().indexOf(doeListState.kw)<0)return false;
    return true;
  });
  if(!rows.length){
    tb.innerHTML='<tr><td colspan="10"><div class="empty"><span class="ei">🧮</span>未找到匹配的 DOE 方案</div></td></tr>';
    return;
  }
  tb.innerHTML=rows.map(function(s){
    var st=schemeDataStat(s.id);
    var hasRec=(s.status==='执行中'||s.status==='已完成');
    var ops=[];
    if(s.status==='草稿'){
      ops.push('<button class="btn-link" onclick="openWizardEdit(\''+s.id+'\')">编辑</button>');
      ops.push('<button class="btn-link" onclick="genSchemePlan(\''+s.id+'\')">生成实验计划</button>');
      ops.push('<button class="btn-link danger" onclick="deleteScheme(\''+s.id+'\')">删除</button>');
    }else if(s.status==='待下发'){
      ops.push('<button class="btn-link" onclick="viewSchemePlan(\''+s.id+'\')">查看计划</button>');
      ops.push('<button class="btn-link" onclick="dispatchScheme(\''+s.id+'\')">确认下发</button>');
    }else if(s.status==='执行中'){
      ops.push('<button class="btn-link" onclick="viewSchemeProgress(\''+s.id+'\')">查看进度</button>');
    }else if(s.status==='已完成'){
      ops.push('<button class="btn-link" onclick="openSchemeAnalysis(\''+s.id+'\')">查看分析</button>');
    }
    ops.push('<button class="btn-link" onclick="copyScheme(\''+s.id+'\')">复制方案</button>');
    var bar=hasRec
      ? '<div class="pbar ok" style="height:8px"><div class="pf" style="width:'+st.pct+'%"></div></div>'+
        '<div class="muted" style="font-size:11px;margin-top:3px">'+st.done+' / '+st.total+' 组已录入（'+st.pct+'%）</div>'
      : '<span class="muted" style="font-size:11.5px">未下发 · 共 '+s.plan.length+' 组</span>';
    return '<tr>'+
      '<td><b>'+esc(s.id)+'</b></td>'+
      '<td>'+esc(s.name)+'</td>'+
      '<td>'+(s.projectIds.length?projSummary(s):'<span class="muted">未挂项目</span>')+'</td>'+
      '<td>'+esc(s.type)+'</td>'+
      '<td class="num">'+s.factors.length+'</td>'+
      '<td class="num">'+s.plan.length+'</td>'+
      '<td>'+bar+'</td>'+
      '<td><span class="tag '+(SCHEME_STATUS_TAG[s.status]||'tag-grey')+' tag-dot">'+esc(s.status)+'</span></td>'+
      '<td>'+esc(s.creator||'—')+'</td>'+
      '<td class="op" onclick="event.stopPropagation()">'+ops.join(' · ')+'</td>'+
    '</tr>';
  }).join('');
}

/* ---------- 方案操作 ---------- */
function genSchemePlan(id){
  var s=findScheme(id); if(!s)return;
  s.plan=generatePlan(s.factors,s.centerPoints,s.randomize,s.id);
  s.status='待下发';
  toast('已生成实验计划：'+s.plan.length+' 组运行（待下发）','ok');
  renderDoeRows();
}
function viewSchemePlan(id){
  var s=findScheme(id); if(!s)return;
  if(!s.plan||!s.plan.length)s.plan=generatePlan(s.factors,s.centerPoints,s.randomize,s.id);
  var h='<div class="notice notice-info"><i class="ni">ℹ</i><div>试验矩阵共 <b>'+s.plan.length+
        '</b> 组（含 '+s.plan.filter(function(r){return r.center;}).length+' 个中心点）。'+
        '点击「确认下发」后才会生成正式实验记录。</div></div>';
  h+='<div class="tbl-wrap" style="max-height:420px;overflow:auto"><table class="tbl tbl-sm">'+
     '<thead><tr><th>运行序</th><th>标准序</th>'+
     s.factors.map(function(f){return '<th>'+esc(f.name)+(f.unit?' ('+esc(f.unit)+')':'')+'</th>';}).join('')+
     '<th>中心点</th></tr></thead><tbody>';
  s.plan.forEach(function(r){
    h+='<tr'+(r.center?' class="center-row"':'')+'><td>'+r.runOrder+'</td><td class="muted">'+r.stdOrder+'</td>'+
       r.combo.map(function(v){return '<td>'+esc(v)+'</td>';}).join('')+
       '<td>'+(r.center?'<span class="tag tag-orange">中心点</span>':'<span class="muted">—</span>')+'</td></tr>';
  });
  h+='</tbody></table></div>';
  openModal({title:'试验矩阵 · '+s.id,width:860,body:h,
    footer:'<button class="btn" onclick="closeModal()">关闭</button>'+
           '<button class="btn btn-primary" onclick="closeModal();dispatchScheme(\''+s.id+'\')">确认下发</button>'});
}
function dispatchScheme(id){
  var s=findScheme(id); if(!s)return;
  if(!s.plan||!s.plan.length)s.plan=generatePlan(s.factors,s.centerPoints,s.randomize,s.id);
  if(!s.projectIds.length){
    toast('请先为方案关联所属项目再下发','warn');
    return;
  }
  confirmBox('确认下发 DOE 方案',
    '确认下发方案 <b>'+esc(s.name)+'</b>（'+esc(s.id)+'）？<br>'+
    '系统将生成 <b>1 条 DOE 执行实验</b>，其中包含 '+s.plan.length+' 组试验，并进入「实验列表」由实验员批量执行。<br>'+
    '<span class="muted">下发后方案状态转为「执行中」，设计参数将锁定。</span>',
    function(){
      var recs=schemeRunRecords(s);
      doeRuns=doeRuns.concat(recs);
      experiments.push(schemeExecutionRecord(s,recs));
      s.status='执行中';
      toast('已下发：生成 1 条 DOE 实验（含 '+recs.length+' 组试验）','ok');
      showPage('exp:list');
    },{okText:'确认下发'});
}
function viewSchemeProgress(id){
  var s=findScheme(id); if(!s)return;
  var st=schemeDataStat(s.id);
  var rows=schemePlanWithRes(s.id);
  var h='<div class="notice notice-info"><i class="ni">ℹ</i><div>数据完成 <b>'+st.done+' / '+st.total+
        '</b> 组（'+st.pct+'%）。'+(st.done===st.total?'已满足分析条件，可前往「实验分析」。':'尚有 '+(st.total-st.done)+' 组未录入。')+'</div></div>';
  h+='<div class="tbl-wrap" style="max-height:420px;overflow:auto"><table class="tbl tbl-sm">'+
     '<thead><tr><th>运行序</th>'+
     s.factors.map(function(f){return '<th>'+esc(f.name)+'</th>';}).join('')+
     s.responses.map(function(r){return '<th>'+esc(r)+'</th>';}).join('')+
     '<th>状态</th></tr></thead><tbody>';
  rows.forEach(function(r){
    var rec=findRun(s.id,r.runOrder);
    var filled=s.responses.every(function(rn){var v=r.res[rn];return v!==''&&v!==null&&v!==undefined;});
    h+='<tr'+(r.center?' class="center-row"':'')+'><td>'+r.runOrder+'</td>'+
       r.combo.map(function(v){return '<td>'+esc(v)+'</td>';}).join('')+
       s.responses.map(function(rn){return '<td>'+(r.res[rn]!==''?'<b>'+esc(r.res[rn])+'</b>':'<span class="muted">—</span>')+'</td>';}).join('')+
       '<td><span class="tag '+(RUN_STATUS_TAG[rec?rec.status:'待执行']||'tag-grey')+' tag-dot">'+
       esc(rec?rec.status:'待执行')+'</span></td></tr>';
  });
  h+='</tbody></table></div>';
  openModal({title:'执行进度 · '+s.id,width:900,body:h,
    footer:'<button class="btn" onclick="closeModal()">关闭</button>'+
           (st.done===st.total?'<button class="btn btn-primary" onclick="closeModal();openSchemeAnalysis(\''+s.id+'\')">前往分析</button>':'')});
}
function openSchemeAnalysis(id){
  showPage('exp:report',{id:id,kind:'doe'});
}
function deleteScheme(id){
  var s=findScheme(id); if(!s)return;
  confirmBox('删除 DOE 方案','确定删除方案 <b>'+esc(s.name)+'</b>（'+esc(s.id)+'）？此操作不可撤销。',
    function(){
      doeSchemes=doeSchemes.filter(function(x){return x.id!==id;});
      toast('已删除方案 '+id,'ok');
      renderDoeRows();
    },{okText:'确认删除',danger:true});
}
function copyScheme(id){
  var s=findScheme(id); if(!s)return;
  var nid='DOE-2026-'+String(Math.floor(Math.random()*9000)+1000);
  var clone=JSON.parse(JSON.stringify(s));
  clone.id=nid;
  clone.name=s.name+'（副本）';
  clone.status='草稿';
  clone.analyzedAt='';
  clone.creator='王研究员';
  clone.createTime=nowStr();
  doeSchemes.unshift(clone);
  toast('已复制为草稿方案 '+nid,'ok');
  renderDoeRows();
}

/* ==================================================================
   exp:analysis · 实验分析（先选对象，再进报告）
   ================================================================== */
regPage('exp:analysis',{
  title:'实验分析',
  crumb:['实验管理','实验分析'],
  render:function(){
    var h='';
    h+='<div class="page-hd"><div class="t"><h1>实验分析</h1>'+
       '<div class="page-sub">可分析对象包含：已完成的普通实验，以及数据已达分析条件的 DOE 方案；'+
       '选择对象后进入分析报告</div></div></div>';
    h+='<div class="toolbar">'+
         '<div class="search-box"><span class="si">🔍</span>'+
           '<input class="input" id="anaKw" placeholder="搜索分析对象名称 / 编号" value="'+esc(anaListState.kw)+'"></div>'+
         '<select class="ctrl" id="anaFProj"><option value="">所属项目：全部</option>'+
           PROJECTS.map(function(p){return '<option value="'+esc(p.id)+'"'+(anaListState.fProj===p.id?' selected':'')+'>'+esc(p.name)+'</option>';}).join('')+
         '</select>'+
         '<select class="ctrl" id="anaFKind"><option value="">分析类型：全部</option>'+
           '<option value="exp"'+(anaListState.fKind==='exp'?' selected':'')+'>普通实验</option>'+
           '<option value="doe"'+(anaListState.fKind==='doe'?' selected':'')+'>DOE分析</option>'+
         '</select>'+
         '<select class="ctrl" id="anaFAna"><option value="">分析状态：全部</option>'+
           '<option value="1"'+(anaListState.fAna==='1'?' selected':'')+'>已分析</option>'+
           '<option value="0"'+(anaListState.fAna==='0'?' selected':'')+'>未分析</option>'+
         '</select>'+
       '</div>';
    h+='<div class="card"><div class="card-b tight"><div class="tbl-wrap"><table class="tbl">'+
       '<thead><tr><th>编号</th><th>分析对象</th><th>所属项目</th><th>分析类型</th>'+
       '<th style="width:150px">数据完成情况</th><th>分析状态</th><th>最近分析时间</th>'+
       '<th style="width:1%">操作</th></tr></thead>'+
       '<tbody id="anaTbody"></tbody></table></div></div></div>';
    $('pageHost').innerHTML=h;
    var kwEl=$('anaKw');
    if(kwEl)kwEl.oninput=function(){ anaListState.kw=this.value.trim().toLowerCase(); renderAnaRows(); };
    [['anaFProj','fProj'],['anaFKind','fKind'],['anaFAna','fAna']].forEach(function(pair){
      var s=$(pair[0]);
      if(s)s.onchange=function(){ anaListState[pair[1]]=this.value; renderAnaRows(); };
    });
    renderAnaRows();
  }
});

function renderAnaRows(){
  var tb=$('anaTbody'); if(!tb)return;
  var rows=analysisTargets().filter(function(t){
    var o=t.obj;
    if(anaListState.fProj && o.projectIds.indexOf(anaListState.fProj)<0)return false;
    if(anaListState.fKind && t.kind!==anaListState.fKind)return false;
    if(anaListState.fAna){
      var done=analysisDone(t)?'1':'0';
      if(done!==anaListState.fAna)return false;
    }
    if(anaListState.kw && (t.id+(o.name||'')).toLowerCase().indexOf(anaListState.kw)<0)return false;
    return true;
  });
  if(!rows.length){
    tb.innerHTML='<tr><td colspan="8"><div class="empty"><span class="ei">📊</span>暂无可分析对象</div></td></tr>';
    return;
  }
  tb.innerHTML=rows.map(function(t){
    var o=t.obj;
    var ready=analysisDataReady(t);
    var done=analysisDone(t);
    var st = t.kind==='doe' ? schemeDataStat(t.id) : dataStatOf(o);
    var ops;
    if(!ready){
      ops='<button class="btn" disabled title="实验数据未完成" style="opacity:.5;cursor:not-allowed">开始分析</button>';
    }else if(!done){
      ops='<button class="btn btn-primary" onclick="startAnalysisOf(\''+t.kind+'\',\''+t.id+'\')">开始分析</button>';
    }else{
      ops='<button class="btn-link" onclick="openAnalysisReport(\''+t.kind+'\',\''+t.id+'\')">查看分析</button>'+
          ' <button class="btn-link" onclick="reAnalysisOf(\''+t.kind+'\',\''+t.id+'\')">重新分析</button>'+
          ' <button class="btn-link" onclick="exportAnalysisReport(\''+t.id+'\')">导出报告</button>';
    }
    var kindTag = t.kind==='doe'
      ? '<span class="tag tag-purple">DOE分析</span>'
      : '<span class="tag tag-grey">普通实验</span>';
    var bar='<div class="pbar '+(st.pct===100?'ok':'')+'" style="height:8px"><div class="pf" style="width:'+st.pct+'%"></div></div>'+
            '<div class="muted" style="font-size:11px;margin-top:3px">'+st.done+' / '+st.total+' 组（'+st.pct+'%）</div>';
    return '<tr>'+
      '<td><b>'+esc(t.id)+'</b></td>'+
      '<td>'+esc(o.name)+'</td>'+
      '<td>'+(o.projectIds.length?projSummary(o):'<span class="muted">未挂项目</span>')+'</td>'+
      '<td>'+kindTag+'</td>'+
      '<td>'+bar+'</td>'+
      '<td>'+(done?'<span class="tag tag-green tag-dot">已分析</span>':'<span class="tag tag-grey tag-dot">未分析</span>')+'</td>'+
      '<td>'+esc(o.analyzedAt||'—')+'</td>'+
      '<td class="op">'+ops+'</td>'+
    '</tr>';
  }).join('');
}

function analysisTargetById(kind,id){
  if(kind==='doe'){ var s=findScheme(id); return s?{kind:'doe',id:id,obj:s}:null; }
  var e=findExp(id); return e?{kind:'exp',id:id,obj:e}:null;
}
function startAnalysisOf(kind,id){
  var t=analysisTargetById(kind,id); if(!t)return;
  if(!analysisDataReady(t)){ toast('实验数据未完成，无法分析','warn'); return; }
  t.obj.analyzedAt=nowStr();
  toast('分析完成，已生成报告','ok');
  openAnalysisReport(kind,id);
}
function reAnalysisOf(kind,id){
  var t=analysisTargetById(kind,id); if(!t)return;
  t.obj.analyzedAt=nowStr();
  toast('已重新拟合模型','ok');
  openAnalysisReport(kind,id);
}
function openAnalysisReport(kind,id){
  showPage('exp:report',{id:id,kind:kind});
}
function exportAnalysisReport(id){
  toast('已导出分析报告：'+id+'_分析报告.pdf（演示）','ok');
}

/* ---------- 一键重置扩展：连同两层实验数据一起回出厂 ----------
   不改旧 wzReset，只覆盖确认入口，避免演示后残留新建的实验 / 方案。 */
function wzResetConfirm(){
  confirmBox('重置演示数据',
    '确定要将演示数据恢复到初始状态吗？<br>'+
    '当前录入的配方、SDS 草稿，以及<b>新建的实验记录与 DOE 方案</b>都将清空，且无法撤销。',
    function(){
      /* SDS 草稿重置依赖向导 DOM，当前不在 SDS 页时跳过，避免误伤 */
      try{ if(typeof wzReset==='function')wzReset(); }catch(e){}
      if(typeof seedBdExt==='function')seedBdExt();   /* 基础数据三新页（技术分类/公式/实验模板） */
      if(typeof seedDocFolders==='function')seedDocFolders();  /* 文档管理：文件夹 / 扩充文档 / 周报月报 */
      if(typeof seedDoeSchemes==='function')seedDoeSchemes();
      if(typeof seedExperiments==='function')seedExperiments();
      if(typeof seedExpSummaries==='function')seedExpSummaries();
      if(typeof sumListState!=='undefined'){
        sumListState={kwPurpose:'',kwExpId:'',kwOperator:'',kwCraft:'',kwSummary:'',kwLeader:'',kwCreator:'',fDept:'',fProj:''};
      }
      window._curReportObj=null; window._curAnalysis=null;
      if(typeof curAnalysisId!=='undefined')curAnalysisId='';
      if(typeof curReportKind!=='undefined')curReportKind='exp';
      if(typeof curAnalysisResp!=='undefined')curAnalysisResp='';
      toast('演示数据已重置（含实验记录与 DOE 方案）','ok');
      var EXP_PAGES=['exp:list','exp:doe','exp:analysis','exp:report','exp:best','exp:detail','exp:wizard'];
      if(typeof curPage!=='undefined'&&EXP_PAGES.indexOf(curPage)>=0)showPage(curPage);
    },
    {okText:'确认重置',danger:true});
}

/* ---------- 分析目标 → 报告页所需的统一视图对象 ---------- */
function analysisViewObj(t){
  if(t.kind==='exp')return t.obj;
  var s=t.obj;
  return {
    id:s.id,name:s.name,type:s.type,
    factors:s.factors,responses:s.responses,
    projectIds:s.projectIds,
    plan:schemePlanWithRes(s.id),
    entered:[],centerPoints:s.centerPoints,randomize:s.randomize,
    status:s.status,creator:s.creator,createTime:s.createTime,
    owner:s.owner,dueDate:s.dueDate,
    source:'DOE',schemeId:s.id,runSeq:null,analyzedAt:s.analyzedAt
  };
}
