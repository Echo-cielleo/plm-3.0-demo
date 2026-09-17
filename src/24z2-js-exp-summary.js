/* ==================================================================
   [24z2] 实验管理 · 实验分析与总结（菜单 exp:sum）
     exp:sum        列表页：组织结构树 + 项目树 + 7 搜索条件 + 数据列表
     exp:sum-detail 子页面：标题栏（实验目的 / 实验工艺）
                           正文 = 对比区，竖向展示每个实验的
                           基本信息 / 原料添加情况 / 过程测试结果 / 成品检测结果 / 总结
   数据：expSummaries[]（1 条 = 1 份对比总结报告，引用 experiments[]）
   ================================================================== */

/* ---------- 列表筛选状态 ---------- */
var sumListState={kwPurpose:'',kwExpId:'',kwOperator:'',kwCraft:'',kwSummary:'',kwLeader:'',kwCreator:'',
                  fDept:'',fProj:''};

/* ==================================================================
   exp:sum · 实验分析与总结（列表页）
   ================================================================== */
regPage('exp:sum',{
  title:'实验分析与总结',
  crumb:['实验管理','实验分析与总结'],
  render:function(){
    var h='';
    h+='<div class="page-hd"><div class="t"><h1>实验分析与总结</h1>'+
       '<div class="page-sub">1 条记录 = 1 份对比总结报告：引用多组已完成实验，横向对比其原料、过程与成品数据，并沉淀结论</div></div>'+
       '<div class="page-acts">'+
         '<button class="btn btn-primary" onclick="openNewSummary()">＋ 新建总结报告</button>'+
       '</div></div>';
    h+='<div class="exp-layout">'+
         '<aside class="exp-tree" id="sumTree">'+sumTreeHtml()+'</aside>'+
         '<div class="exp-main">'+
           '<div class="toolbar">'+
             '<div class="search-box"><span class="si">🔍</span>'+
               '<input class="input" id="sumKwPurpose" placeholder="实验目的" value="'+esc(sumListState.kwPurpose)+'"></div>'+
             '<div class="search-box"><span class="si">🔍</span>'+
               '<input class="input" id="sumKwExpId" placeholder="实验编号" value="'+esc(sumListState.kwExpId)+'"></div>'+
             '<div class="search-box"><span class="si">🔍</span>'+
               '<input class="input" id="sumKwOperator" placeholder="实验员" value="'+esc(sumListState.kwOperator)+'"></div>'+
             '<div class="search-box"><span class="si">🔍</span>'+
               '<input class="input" id="sumKwCraft" placeholder="实验工艺" value="'+esc(sumListState.kwCraft)+'"></div>'+
           '</div>'+
           '<div class="toolbar" style="margin-top:-6px">'+
             '<div class="search-box"><span class="si">🔍</span>'+
               '<input class="input" id="sumKwSummary" placeholder="实验总结" value="'+esc(sumListState.kwSummary)+'"></div>'+
             '<select class="ctrl" id="sumFLeader"><option value="">项目负责人：全部</option>'+
               sumLeaderOptions()+'</select>'+
             '<select class="ctrl" id="sumFCreator"><option value="">创建人：全部</option>'+
               sumCreatorOptions()+'</select>'+
             '<button class="btn" onclick="resetSumFilter()">重置筛选</button>'+
           '</div>';
    h+='<div class="card"><div class="card-b tight"><div class="tbl-wrap"><table class="tbl">'+
       '<thead><tr><th style="width:56px">行号</th><th style="width:210px">实验编号（实验员）</th>'+
       '<th style="width:260px;min-width:200px">实验工艺</th><th style="width:26%">实验总结</th>'+
       '<th style="width:88px">创建人</th><th style="width:136px">创建时间</th>'+
       '<th style="width:1%">操作</th></tr></thead>'+
       '<tbody id="sumTbody"></tbody></table></div></div></div>'+
         '</div>'+
       '</div>';
    $('pageHost').innerHTML=h;
    [['sumKwPurpose','kwPurpose'],['sumKwExpId','kwExpId'],['sumKwOperator','kwOperator'],
     ['sumKwCraft','kwCraft'],['sumKwSummary','kwSummary']].forEach(function(pair){
      var el=$(pair[0]);
      if(el)el.oninput=function(){ sumListState[pair[1]]=this.value.trim().toLowerCase(); renderSumRows(); };
    });
    [['sumFLeader','kwLeader'],['sumFCreator','kwCreator']].forEach(function(pair){
      var s=$(pair[0]);
      if(s)s.onchange=function(){ sumListState[pair[1]]=this.value; renderSumRows(); };
    });
    renderSumRows();
  }
});

function resetSumFilter(){
  sumListState={kwPurpose:'',kwExpId:'',kwOperator:'',kwCraft:'',kwSummary:'',kwLeader:'',kwCreator:'',
                fDept:'',fProj:''};
  if(curPage==='exp:sum')showPage('exp:sum');
}

/* ---------- 左侧双树：组织结构树 + 项目树 ---------- */
function sumCountInDept(did){
  var pids=deptProjects(did).map(function(p){return p.id;});
  return expSummaries.filter(function(s){
    return s.projectIds.some(function(pid){return pids.indexOf(pid)>=0;});
  }).length;
}
function sumCountInProj(pid){
  return expSummaries.filter(function(s){return s.projectIds.indexOf(pid)>=0;}).length;
}
function sumTreeHtml(){
  var sel=sumListState.fDept, selProj=sumListState.fProj;
  var h='';
  /* ① 组织结构树 */
  h+='<div class="et-head">组织结构</div>';
  h+='<div class="et-node et-root'+(!sel&&!selProj?' on':'')+'" onclick="sumTreeSelect(\'all\')">'
     +'<span class="et-ico">🏢</span><span class="et-name">全部实验室</span>'
     +'<span class="et-badge">'+expSummaries.length+'</span></div>';
  var depts = sel ? DEPTS.filter(function(d){return d.id===sel;}) : DEPTS;
  depts.forEach(function(d){
    h+='<div class="et-node et-dept'+(sel===d.id?' on':'')+'" onclick="sumTreeSelect(\'dept\',\''+d.id+'\')">'
       +'<span class="et-ico">🏭</span><span class="et-name">'+esc(d.name)+'</span>'
       +'<span class="et-badge">'+sumCountInDept(d.id)+'</span></div>';
  });
  /* ② 项目树（受部门联动收窄） */
  var plist = sel ? deptProjects(sel) : PROJECTS;
  h+='<div class="et-head" style="margin-top:10px">所属项目</div>';
  h+='<div class="et-node et-root'+(!selProj?' on':'')+'" onclick="sumTreeSelect(\'dept\',\''+(sel||'')+'\')">'
     +'<span class="et-ico">📁</span><span class="et-name">'+(sel?'本实验室全部':'全部项目')+'</span>'
     +'<span class="et-badge">'+plist.reduce(function(a,p){return a+sumCountInProj(p.id);},0)+'</span></div>';
  plist.forEach(function(p){
    h+='<div class="et-node et-proj'+(selProj===p.id?' on':'')+'" onclick="sumTreeSelect(\'proj\',\''+p.id+'\')">'
       +'<span class="et-ico">📄</span><span class="et-name">'+esc(p.name)+'</span>'
       +'<span class="et-badge">'+sumCountInProj(p.id)+'</span></div>';
  });
  return h;
}
function sumTreeSelect(type,id){
  if(type==='all'){ sumListState.fDept=''; sumListState.fProj=''; }
  else if(type==='dept'){
    if(sumListState.fDept===id&&!sumListState.fProj)sumListState.fDept='';
    else { sumListState.fDept=id||''; sumListState.fProj=''; }
  }
  else if(type==='proj'){
    sumListState.fProj=id;
    var p=findProj(id); sumListState.fDept=p?p.dept:'';
  }
  var tv=$('sumTree'); if(tv)tv.innerHTML=sumTreeHtml();
  renderSumRows();
}

/* ---------- 下拉选项 ---------- */
function sumLeaderOptions(){
  var set=[];
  expSummaries.forEach(function(s){ if(s.leader&&set.indexOf(s.leader)<0)set.push(s.leader); });
  return set.map(function(o){
    return '<option value="'+esc(o)+'"'+(sumListState.kwLeader===o?' selected':'')+'>'+esc(o)+'</option>';
  }).join('');
}
function sumCreatorOptions(){
  var set=[];
  expSummaries.forEach(function(s){ if(s.creator&&set.indexOf(s.creator)<0)set.push(s.creator); });
  return set.map(function(o){
    return '<option value="'+esc(o)+'"'+(sumListState.kwCreator===o?' selected':'')+'>'+esc(o)+'</option>';
  }).join('');
}

/* 工艺命中判定：工艺路线 + 受控差异说明 + 组内各实验的实际参数取值 */
function sumCraftHit(s,kw){
  var k=String(kw||'').toLowerCase();
  if(!k)return true;
  if((s.craft||'').toLowerCase().indexOf(k)>=0)return true;
  if((s.diffNote||'').toLowerCase().indexOf(k)>=0)return true;
  return (s.items||[]).some(function(it){
    return (it.craftParams||'').toLowerCase().indexOf(k)>=0 ||
           (it.diff||'').toLowerCase().indexOf(k)>=0;
  });
}
/* 组内受控变量数量（按 diff 去重） */
function sumDiffCount(s){
  var set=[];
  (s.items||[]).forEach(function(it){ var d=it.diff||'';
    if(d && set.indexOf(d)<0)set.push(d); });
  return set.length;
}

/* ---------- 列表渲染 ---------- */
function renderSumRows(){
  var tb=$('sumTbody'); if(!tb)return;
  var rows=expSummaries.filter(function(s){
    /* 组织结构 / 项目树 */
    if(sumListState.fDept){
      var dp=deptProjects(sumListState.fDept).map(function(p){return p.id;});
      if(!s.projectIds.some(function(pid){return dp.indexOf(pid)>=0;}))return false;
    }
    if(sumListState.fProj && s.projectIds.indexOf(sumListState.fProj)<0)return false;
    /* 项目负责人 / 创建人 */
    if(sumListState.kwLeader && s.leader!==sumListState.kwLeader)return false;
    if(sumListState.kwCreator && s.creator!==sumListState.kwCreator)return false;
    /* 实验目的 */
    if(sumListState.kwPurpose && (s.purpose||'').toLowerCase().indexOf(sumListState.kwPurpose)<0)return false;
    /* 实验工艺：工艺路线 / 受控差异说明 / 各实验的实际参数取值，任一命中 */
    if(sumListState.kwCraft && !sumCraftHit(s,sumListState.kwCraft))return false;
    /* 实验编号：任一条被引实验命中 */
    if(sumListState.kwExpId &&
       !sumMatchExp(s,function(e){return (e.id||'').toLowerCase().indexOf(sumListState.kwExpId)>=0;}))return false;
    /* 实验员：任一条被引实验的操作人命中 */
    if(sumListState.kwOperator &&
       !sumMatchExp(s,function(e){return (e.owner||'').toLowerCase().indexOf(sumListState.kwOperator)>=0;}))return false;
    /* 实验总结：报告总结或任一组总结命中 */
    if(sumListState.kwSummary){
      var inSum=(s.items||[]).some(function(it){
        return (it.summary||'').toLowerCase().indexOf(sumListState.kwSummary)>=0;
      });
      if(!inSum)return false;
    }
    return true;
  });
  if(!rows.length){
    tb.innerHTML='<tr><td colspan="7"><div class="empty"><span class="ei">📝</span>未找到匹配的总结报告</div></td></tr>';
    return;
  }
  tb.innerHTML=rows.map(function(s,i){
    var exps=(s.expIds||[]).map(function(id){
      var e=findExp(id);
      return '<div class="sum-exp-line"><a class="btn-link" onclick="event.stopPropagation();showPage(\'exp:detail\',{id:\''+id+'\'})">'
             +esc(id)+'</a><span class="muted">（'+esc(e?(e.owner||'—'):'—')+'）</span></div>';
    }).join('');
    var firstSum=(s.items&&s.items.length)?s.items[s.items.length-1].summary:'';
    var dn=sumDiffCount(s);
    return '<tr style="cursor:pointer" onclick="openSummary(\''+s.id+'\')">'+
      '<td class="muted">'+(i+1)+'</td>'+
      '<td class="sum-exp-cell" onclick="event.stopPropagation()">'+exps+'</td>'+
      '<td class="sum-craft">'+esc(s.craft)+
          (dn>0?'<div class="sum-diff">'+dn+' 组受控差异</div>':'')+'</td>'+
      '<td><div class="sum-purpose" title="'+esc(s.purpose)+'">'+esc(s.purpose)+'</div>'+
          '<div class="muted sum-brief">'+esc(firstSum)+'</div></td>'+
      '<td>'+esc(s.creator||'—')+'</td>'+
      '<td>'+esc(s.createTime||'—')+'</td>'+
      '<td class="op" onclick="event.stopPropagation()">'+
        '<button class="btn-link" onclick="openSummary(\''+s.id+'\')">详情</button>'+
        ' <button class="btn-link" onclick="editSummary(\''+s.id+'\')">编辑</button>'+
        ' <button class="btn-link danger" onclick="deleteSummary(\''+s.id+'\')">删除</button>'+
      '</td>'+
    '</tr>';
  }).join('');
}

/* ---------- 行操作 ---------- */
function openSummary(id){ showPage('exp:sum-detail',{id:id}); }
function deleteSummary(id){
  var s=findSummary(id); if(!s)return;
  confirmBox('删除总结报告',
    '确定删除报告 <b>'+esc(s.id)+'</b>？<br><span class="muted">仅删除总结文档，被引用的实验记录及其数据不受影响。</span>',
    function(){
      expSummaries=expSummaries.filter(function(x){return x.id!==id;});
      toast('已删除总结报告 '+id,'ok');
      if(curPage==='exp:sum'){ var tv=$('sumTree'); if(tv)tv.innerHTML=sumTreeHtml(); renderSumRows(); }
      else showPage('exp:sum');
    },{okText:'确认删除',danger:true});
}

/* ==================================================================
   exp:sum-detail · 对比区详情
   ================================================================== */
regPage('exp:sum-detail',{
  title:'实验分析与总结详情',
  crumb:['实验管理','实验分析与总结','详情'],
  render:function(params){
    var s=findSummary((params&&params.id)||'');
    if(!s){$('pageHost').innerHTML=placeholder('🚧','未选择总结报告','请从列表中选择一份报告查看详情');return;}
    var h='';
    h+='<div class="page-hd"><div class="t"><h1>实验分析与总结 · '+esc(s.id)+'</h1>'+
       '<div class="page-sub">所属项目 '+(s.projectIds.length?projSummary(s):'<span class="muted">未挂项目</span>')+
       ' ｜ 项目负责人 '+esc(s.leader||'—')+' ｜ 创建人 '+esc(s.creator)+' ｜ 创建时间 '+esc(s.createTime)+'</div></div>'+
       '<div class="page-acts">'+
         /* AI 能力（24z4）以「当前报告引用的实验」为分析范围，故入口放在详情页 */
         '<button class="btn" onclick="openSumAI(\''+s.id+'\')">'+aiSparkIcon()+' 问问 AI</button>'+
         '<button class="btn" onclick="openSumReport(\''+s.id+'\')">'+aiSparkIcon()+' 生成智能分析报表</button>'+
         '<button class="btn" onclick="showPage(\'exp:sum\')">← 返回列表</button>'+
         '<button class="btn btn-primary" onclick="editSummary(\''+s.id+'\')">编辑</button>'+
       '</div></div>';
    /* 标题栏：实验目的 + 实验工艺（工艺路线）+ 受控差异 */
    h+='<div class="sum-hero">'+
         '<div class="sh-row"><div class="sh-l">实验目的</div><div class="sh-v">'+esc(s.purpose)+'</div></div>'+
         '<div class="sh-row"><div class="sh-l">实验工艺</div><div class="sh-v">'+esc(s.craft)+
           '<span class="sum-route-tag">工艺路线 / 模板</span></div></div>'+
         (s.diffNote?'<div class="sh-row"><div class="sh-l">受控差异</div><div class="sh-v sum-diffnote">'+esc(s.diffNote)+'</div></div>':'')+
       '</div>';
    var items=(s.items||[]).slice();
    var N=items.length;
    h+='<div class="notice notice-info mb"><i class="ni">ℹ</i><div>以下为<b>实验对比区</b>：'+
       '<b>'+N+' 组</b>实验采用同一工艺路线，横向并列以便同屏横评；'+
       (N>3?'当前 '+(N-3)+' 列超出可视区，可左右滑动对比。':'')+
       '参数差异见上表「受控差异」，可逐组比对基本信息、原料添加、过程与成品检测数据。</div></div>';

    /* 横向并列对比表：左侧固定「字段名」+ 右侧 N 个实验列 */
    h+=sumCompareGrid(s);

    /* 底部：整体总结（贯穿整页） */
    h+='<div class="card mt">'+
         '<div class="card-hd"><h3>整体总结 · '+esc(s.id)+'</h3>'+
         '<span class="sub">针对本报告 '+N+' 组实验的结论与建议</span></div>'+
         '<div class="card-b"><div class="sum-overall">'+esc(s.summaryOverall||'—')+'</div>'+
         '<div class="sum-overall-foot muted">— '+esc(s.creator||'—')+' · '+esc(s.createTime||'—')+'</div></div>'+
       '</div>';
    $('pageHost').innerHTML=h;
  }
});

/* 横向并列对比表：5 个区块（左：字段名 / 右：N 组实验列） */
function sumCompareGrid(s){
  var items=(s.items||[]).slice();
  var N=items.length;
  if(!N)return '';
  var minW=N>3?(N*320):''; /* 超过 3 列才需要最小宽 */
  var styleAttr=minW?' style="min-width:'+minW+'px"':'';
  /* 列头：实验编号 + 受控差异 */
  var headCols=items.map(function(it,i){
    return '<div class="cmp-col">'+
             '<div class="cmp-col-head">'+
               '<div class="cmp-col-num">#'+(i+1)+'</div>'+
               '<div class="cmp-col-id"><a class="btn-link" onclick="showPage(\'exp:detail\',{id:\''+esc(it.expId)+'\'})">'+esc(it.expId)+'</a></div>'+
               (it.diff?'<div class="cmp-col-diff">'+esc(it.diff)+'</div>':'')+
             '</div>'+
           '</div>';
  }).join('');
  var h='<div class="cmp-grid-wrap"><div class="cmp-grid" data-cols="'+N+'"'+styleAttr+'>'+
         '<div class="cmp-row cmp-row-head">'+
           '<div class="cmp-side cmp-side-head">实验对比</div>'+
           headCols+
         '</div>';
  /* 各区块：基本信息 / 本组工艺 / 原料 / 过程 / 成品 */
  h+=cmpRowBasic(s);
  h+=cmpRowCraft(s);
  h+=cmpRowTable(s,'原料添加情况',function(it){return it.materials||[];},
    function(m){
      var b=(typeof matBatch==='function')?matBatch(m.batch):null;
      var sp=b&&b.sup?(typeof supByCode==='function'?supByCode(b.sup):null):null;
      var tip=b?('批次 '+b.no+'｜'+(sp?sp.name:'厂内自制')+'｜到货 '+b.arrive+'｜检测 '+b.status):'';
      var bTxt=esc(m.batch||'—');
      if(b) bTxt='<span class="mat-batch '+(b.status==='合格'?'ok':(b.status==='待检'?'wait':'bad'))+'" title="'+esc(tip)+'">'+bTxt+'</span>';
      return '<tr><td class="muted">'+esc(m.order)+'</td><td><b>'+matLink(m.name)+'</b></td>'+
                       '<td class="mono">'+bTxt+'</td>'+
                       '<td class="num">'+esc(m.qty)+'</td><td class="muted">'+esc(m.unit||'')+'</td></tr>';},
    '<tr><th style="width:36px">顺序</th><th>原料名称</th><th>批次号</th><th style="text-align:right">实际用量</th><th style="width:56px">单位</th></tr>');
  h+=cmpRowTable(s,'过程测试结果',function(it){return it.processTests||[];},
    function(t){return '<tr><td class="mono">'+esc(t.time)+'</td><td>'+esc(t.item)+'</td>'+
                       '<td class="num"><b>'+esc(t.value)+'</b></td><td class="muted">'+esc(t.unit||'—')+'</td></tr>';},
    '<tr><th style="width:84px">记录时间</th><th>检测项</th><th style="text-align:right">实测值</th><th style="width:64px">单位</th></tr>');
  h+=cmpRowTable(s,'成品检测结果',function(it){return it.productTests||[];},
    function(t){
      var cls=(t.result==='合格')?'tag-green':((t.result==='不合格')?'tag-red':'tag-orange');
      return '<tr><td><b>'+esc(t.item)+'</b></td><td class="muted">'+esc(t.std||'—')+'</td>'+
             '<td class="num">'+esc(t.value)+'</td>'+
             '<td><span class="tag '+cls+' tag-dot">'+esc(t.result)+'</span></td></tr>';},
    '<tr><th>检测项</th><th>标准/要求</th><th style="text-align:right">实测值</th><th style="width:78px">判定</th></tr>');
  /* 总结：每个实验一行（每组的总结） */
  h+='<div class="cmp-row"><div class="cmp-side">总结（每组）</div>'+
       items.map(function(it,i){
         return '<div class="cmp-col"><div class="cmp-summary">'+esc(it.summary||'—')+'</div></div>';
       }).join('')+
     '</div>';
  h+='</div></div>';
  return h;
}

/* 区块：基本信息 — 每行 1 字段名 + N 值（截图布局） */
function cmpRowBasic(s){
  var items=(s.items||[]).slice();
  var basic=items.map(function(it){return it.basic||{};});
  var rows=[
    {k:'实验温度',fn:function(b){return b.temp;}},
    {k:'实验时长',fn:function(b){return b.duration;}},
    {k:'使用设备',fn:function(b){return b.device;}},
    {k:'操作人',fn:function(b){return b.operator;}},
    {k:'实验日期',fn:function(b){return b.date;}},
    {k:'主要原料',fn:function(b){return b.mat;}}
  ];
  /* 字段名也走 grid-column:1，每行 1 字段名 + N 值 */
  return '<div class="cmp-row cmp-row-multi">'+
         rows.map(function(r){
           return '<div class="cmp-side cmp-side-flat">'+r.k+'</div>'+
                  basic.map(function(b){return '<div class="cmp-cell">'+esc(r.fn(b)||'—')+'</div>';}).join('');
         }).join('')+
       '</div>';
}

/* 区块：本组工艺参数与受控差异 — 每个子行：1 子字段名 + N 值 */
function cmpRowCraft(s){
  var items=(s.items||[]).slice();
  return '<div class="cmp-row cmp-row-multi">'+
         '<div class="cmp-side cmp-side-flat">受控差异</div>'+
           items.map(function(it){return '<div class="cmp-cell"><span class="sum-diffval">'+esc(it.diff||'—')+'</span></div>';}).join('')+
         '<div class="cmp-side cmp-side-flat">实际参数</div>'+
           items.map(function(it){return '<div class="cmp-cell">'+esc(it.craftParams||'—')+'</div>';}).join('')+
       '</div>';
}

/* 区块：原料 / 过程 / 成品 — 每组独立小表 */
function cmpRowTable(s,title,getRows,rowFn,thead){
  var items=(s.items||[]).slice();
  return '<div class="cmp-row cmp-row-table">'+
           '<div class="cmp-side">'+title+'</div>'+
           items.map(function(it){
             var rows=getRows(it);
             return '<div class="cmp-col">'+
                      '<div class="tbl-wrap"><table class="tbl tbl-sm">'+
                        '<thead>'+thead+'</thead>'+
                        '<tbody>'+(rows.length?(rows.map(rowFn).join('')):'<tr><td colspan="5" class="muted center">— 无数据 —</td></tr>')+'</tbody>'+
                      '</table></div>'+
                    '</div>';
           }).join('')+
         '</div>';
}

/* ==================================================================
   新建 / 编辑总结报告
   ================================================================== */
function summaryFormHtml(s){
  s=s||{id:'',purpose:'',craft:'',diffNote:'',summaryOverall:'',projectIds:[],expIds:[],items:[]};
  var projOpts=PROJECTS.map(function(p){
    var on=(s.projectIds||[]).indexOf(p.id)>=0;
    return '<label class="sum-chk"><input type="checkbox" value="'+esc(p.id)+'"'+(on?' checked':'')+' data-sumproj> '+esc(p.name)+'</label>';
  }).join('');
  /* 候选实验：已完成 / 已分析的记录 */
  var cands=experiments.filter(function(e){
    return e.source==='普通'&&(e.status==='已完成'||e.status==='已分析');
  });
  var expOpts=cands.map(function(e){
    var on=(s.expIds||[]).indexOf(e.id)>=0;
    return '<label class="sum-chk"><input type="checkbox" value="'+esc(e.id)+'"'+(on?' checked':'')+' data-sumexp> '+
           '<span class="mono">'+esc(e.id)+'</span> <span class="muted">'+esc(e.name)+' · '+esc(e.owner||'—')+'</span></label>';
  }).join('');
  return '<div class="form-grid">'+
    '<div class="field span2"><label class="req">实验目的</label>'+
      '<textarea class="ctrl" id="sfPurpose" rows="2" placeholder="例如：对比国产/进口 WPU-320 在涂饰层的手感与耐干擦差异">'+esc(s.purpose)+'</textarea></div>'+
    '<div class="field span2"><label class="req">实验工艺（工艺路线 / 模板）</label>'+
      '<textarea class="ctrl" id="sfCraft" rows="1" placeholder="只描述路线与工序顺序，不含参数取值。例如：三辊涂布 → 热风烘干 → 室温熟化 → 压花">'+esc(s.craft)+'</textarea>'+
      '<div class="sum-hint">同一工艺路线下的实验可做对比分析，具体参数允许存在受控差异。</div></div>'+
    '<div class="field span2"><label>受控差异说明</label>'+
      '<textarea class="ctrl" id="sfDiffNote" rows="2" placeholder="例如：受控差异：树脂来源（国产 / 进口 / 1:1 混拼）。涂布量 18 g/m²、烘干 120 ℃ × 3 min、熟化 24 h 三组保持一致。">'+esc(s.diffNote||'')+'</textarea>'+
      '<div class="sum-hint">写明本组实验之间<b>刻意变化了哪些参数</b>、<b>哪些保持一致</b>——这是判断各组是否具备可比性的依据。</div></div>'+
    '<div class="field span2"><label>整体总结（针对全部 '+esc((s.expIds||[]).length||'≥2')+' 组实验的结论与建议）</label>'+
      '<textarea class="ctrl" id="sfSummaryOverall" rows="4" placeholder="例如：12.5% 用量时柔软度 4.8、崩裂强度 238 N，吸尽率 92% 表现最佳；中心点 10.0% 柔软度 4.6、与 R05 差异 0.2 说明工艺重复性良好；降至 7.5% 后柔软度 4.1 不合格。确认 12.5% 为本配方柔软度与强度的较优平衡点。">'+esc(s.summaryOverall||'')+'</textarea>'+
      '<div class="sum-hint">整体总结会显示在详情页底部，贯穿整页；缺省时自动拼接各组总结。</div></div>'+
    '<div class="field span2"><label>所属项目</label><div class="sum-chk-box">'+projOpts+'</div></div>'+
    '<div class="field span2"><label class="req">引用实验（勾选 2 组及以上，自动生成对比区）</label>'+
      '<div class="sum-chk-box" style="max-height:190px;overflow:auto">'+expOpts+'</div></div>'+
  '</div>'+
  '<div class="notice notice-info mt"><i class="ni">ℹ</i><div>本菜单的分析对象是<b>一组具有可比性的实验</b>，而非单条实验记录：'+
    '各组应<b>采用相同的工艺路线或工艺模板</b>，具体工艺参数可以存在<b>受控差异</b>。保存后会按勾选顺序生成对比区；'+
    '每组实验的<b>原料添加 / 过程检测 / 成品检测 / 总结</b>可在详情页继续补充（本次为演示原型，明细内容由系统预置示例数据）。</div></div>';
}

function openNewSummary(){
  openModal({title:'新建总结报告',width:820,
    body:summaryFormHtml(null),
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
           '<button class="btn btn-primary" onclick="saveSummary(\'\')">保存</button>'});
}
function editSummary(id){
  var s=findSummary(id); if(!s){toast('未找到报告','warn');return;}
  openModal({title:'编辑总结报告 · '+id,width:820,
    body:summaryFormHtml(s),
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
           '<button class="btn btn-primary" onclick="saveSummary(\''+id+'\')">保存</button>'});
}
function saveSummary(id){
  var purpose=($('sfPurpose')&&$('sfPurpose').value||'').trim();
  var craft=($('sfCraft')&&$('sfCraft').value||'').trim();
  var diffNote=($('sfDiffNote')&&$('sfDiffNote').value||'').trim();
  var summaryOverall=($('sfSummaryOverall')&&$('sfSummaryOverall').value||'').trim();
  if(!purpose){toast('实验目的必填','warn');return;}
  if(!craft){toast('实验工艺（工艺路线）必填','warn');return;}
  var projs=$$('[data-sumproj]').filter(function(c){return c.checked;}).map(function(c){return c.value;});
  var exps=$$('[data-sumexp]').filter(function(c){return c.checked;}).map(function(c){return c.value;});
  if(exps.length<2){toast('对比分析需勾选 2 组及以上具有可比性的实验','warn');return;}
  var leader=projs.length&&findProj(projs[0])?findProj(projs[0]).leader:'';

  var s=id?findSummary(id):null;
  if(s){
    s.purpose=purpose; s.craft=craft; s.diffNote=diffNote; s.summaryOverall=summaryOverall;
    s.projectIds=projs; s.expIds=exps; s.leader=leader;
    /* 保留已存在的明细，仅为新增的实验补一份示例明细 */
    s.items=syncSummaryItems(s);
    toast('已更新总结报告','ok');
  }else{
    var nid='SUM-2026-'+String(Math.floor(Math.random()*9000)+1000);
    s={id:nid,purpose:purpose,craft:craft,diffNote:diffNote,summaryOverall:summaryOverall,
       projectIds:projs,expIds:exps,
       leader:leader,dept:projs.length&&findProj(projs[0])?findProj(projs[0]).dept:'',
       creator:'王研究员',createTime:nowStr(),items:[]};
    s.items=syncSummaryItems(s);
    expSummaries.unshift(s);
    toast('已创建总结报告 '+nid,'ok');
    id=nid;
  }
  closeModal();
  if(curPage==='exp:sum'){ var tv=$('sumTree'); if(tv)tv.innerHTML=sumTreeHtml(); renderSumRows(); }
  else if(curPage==='exp:sum-detail')showPage('exp:sum-detail',{id:id});
}
/* 按 expIds 同步明细：已有的保留，新增的补示例条目 */
function syncSummaryItems(s){
  var exist={}; (s.items||[]).forEach(function(it){ exist[it.expId]=it; });
  return (s.expIds||[]).map(function(eid){
    if(exist[eid])return exist[eid];
    var e=findExp(eid);
    return {
      expId:eid,
      /* 默认继承工艺路线；受控差异留空待用户在详情页补充 */
      craftParams:s.craft||'',diff:'',
      basic:{temp:'—',duration:'—',device:'—',operator:(e?e.owner:'')||'',date:(e?(e.createTime||'').split(' ')[0]:''),mat:(e?e.name:'')},
      materials:[['（待补充原料）','—','0','kg',1]].map(mkMat),
      processTests:[['—','（待补充检测项）','—','—']].map(mkProc),
      productTests:[['（待补充检测项）','—','—','待补充']].map(mkProd),
      summary:'（待补充本组实验总结）'
    };
  });
}
