/* ==================================================================
   [24z] 实验管理 · 实验列表左侧「部门 → 项目」二级联动树
   设计：左树筛选；选部门→项目列表只显示该部门项目、实验按部门过滤；
        选项目→实验列表只显示该项目。新增实验非功能演示，纯前端筛选。
   约定：本分片承接 exp:list 的树逻辑，旧 24-js-doe.js 仅加最小钩子。
   ================================================================== */

/* 部门（实验室）定义 */
var DEPTS=[
  {id:'LAB-SH-1',name:'上海实验室一'},
  {id:'LAB-SH-2',name:'上海实验室二'},
  {id:'LAB-SC-1',name:'四川实验室一'},
  {id:'LAB-SC-2',name:'四川实验室二'}
];

/* 取某部门下的项目 */
function deptProjects(did){ return PROJECTS.filter(function(p){return p.dept===did;}); }

/* 部门下实验数（任一 projectId 命中该部门项目即计） */
function expCountInDept(did){
  var pids=deptProjects(did).map(function(p){return p.id;});
  return experiments.filter(function(e){
    return e.projectIds.some(function(pid){return pids.indexOf(pid)>=0;});
  }).length;
}

/* 顶部「所属项目」下拉选项：受部门过滤（二级联动） */
function expProjOptions(){
  var list = expListState.fDept ? deptProjects(expListState.fDept) : PROJECTS;
  return list.map(function(p){
    return '<option value="'+esc(p.id)+'"'+(expListState.fProj===p.id?' selected':'')+'>'+esc(p.name)+'</option>';
  }).join('');
}

/* 左树 HTML */
function expTreeHtml(){
  var sel=expListState.fDept, selProj=expListState.fProj;
  var h='<div class="et-head">部门/项目</div>';
  /* 根：全部部门 */
  h+='<div class="et-node et-root'+(!sel&&!selProj?' on':'')+'" onclick="expTreeSelect(\'all\')">'
     +'<span class="et-ico">🗂</span><span class="et-name">全部部门</span>'
     +'<span class="et-badge">'+experiments.length+'</span></div>';
  /* 选中部门时只显示该部门（满足「项目列表只展示该部门下项目」）；否则列出全部部门 */
  var depts = sel ? DEPTS.filter(function(d){return d.id===sel;}) : DEPTS;
  depts.forEach(function(d){
    var deptOn = (sel===d.id);
    h+='<div class="et-node et-dept'+(deptOn?' on':'')+'" onclick="expTreeSelect(\'dept\',\''+d.id+'\')">'
       +'<span class="et-name">'+esc(d.name)+'</span>'
       +'<span class="et-badge">'+expCountInDept(d.id)+'</span></div>';
    deptProjects(d.id).forEach(function(p){
      h+='<div class="et-node et-proj'+(selProj===p.id?' on':'')+'" onclick="expTreeSelect(\'proj\',\''+p.id+'\')">'
         +'<span class="et-ico">📁</span><span class="et-name">'+esc(p.name)+'</span>'
         +'<span class="et-badge">'+expOfProject(p.id).length+'</span></div>';
    });
  });
  return h;
}

/* 树节点点击：更新筛选状态 + 同步右侧下拉 + 重渲染 */
function expTreeSelect(type,id){
  if(type==='all'){
    expListState.fDept=''; expListState.fProj='';
  } else if(type==='dept'){
    /* 再次点击已选部门则取消，回到全部 */
    if(expListState.fDept===id && !expListState.fProj){ expListState.fDept=''; }
    else { expListState.fDept=id; expListState.fProj=''; }
  } else if(type==='proj'){
    expListState.fProj=id;
    var p=findProj(id); expListState.fDept = p?p.dept:'';
  }
  var tv=$('expTree'); if(tv)tv.innerHTML=expTreeHtml();
  var fd=$('expFProj');
  if(fd){
    fd.innerHTML='<option value="">'+(expListState.fDept?'所属项目：本部门全部':'所属项目：全部')+'</option>'+expProjOptions();
    fd.value=expListState.fProj;
  }
  renderExpRows();
}
