/* ==================================================================
   [24z3] 周报（研发人员 / 研究室经理 两套模板）
   模板依据：《研发人员周总结报告》《研究室经理周总结报告》两份 Word 文件
   · 研发人员版：表头 → 一、研究工作总结及计划 → 二、其他工作（含文献资料学习）
                 → 三、工作量统计 → 四、周计划调整说明
   · 研究室经理版：表头 → 部门管理工作（按项目负责人归集，经理独有）
                 → 一、研究工作总结及计划 → 其他工作 → 四、周计划调整说明
   两版共用「项目 → 实验目的 → 四个子小节（1.x.1~1.x.4）」骨架，
   内容由系统从实验数据自动汇总，可直接修改。
   ================================================================== */

var WEEKLY_REPORTS=[
  {id:'WR-2026-0904',reportType:'周报',period:'2026-08-31 ~ 2026-09-06',submitter:'王研究员',submitTime:'2026-09-06 17:42',status:'已提交'},
  {id:'WR-2026-0835',reportType:'周报',period:'2026-08-24 ~ 2026-08-30',submitter:'王研究员',submitTime:'2026-08-30 18:06',status:'已提交'},
  {id:'WR-2026-0826',reportType:'周报',period:'2026-08-17 ~ 2026-08-23',submitter:'王研究员',submitTime:'2026-08-23 17:35',status:'已提交'},
  {id:'MR-2026-008',reportType:'月报',period:'2026-08',submitter:'王研究员',submitTime:'2026-08-31 18:20',status:'已提交'}
];
/* pid：任务归属项目，供周报「下一步计划」按项目 + 下周区间过滤（不再整表罗列） */
var WEEKLY_TASKS=[
  {name:'完成 WPU-320 乳液稳定性平行验证',pid:'PRJ-2026-002',due:'2026-09-08',done:true},
  {name:'整理鞋面革柔软度 DOE 分析结论',pid:'PRJ-2026-001',due:'2026-09-09',done:true},
  {name:'更新 WPU-320 中试阶段资料',pid:'PRJ-2026-002',due:'2026-09-11',done:true},
  {name:'录入 DOE-2026-0225 第 7~12 组实验结果',pid:'PRJ-2026-001',due:'2026-09-12',done:false},
  {name:'补齐 HF-5 手感剂复配筛选的检测记录',pid:'PRJ-2026-004',due:'2026-09-19',done:false},
  {name:'提交 WPU-320 中试放大方案评审材料',pid:'PRJ-2026-002',due:'2026-09-22',done:false}
];

/* ---------------- 周报草稿（字段对齐真实模板） ---------------- */
var weeklyDraft={
  status:'草稿',
  role:'staff',
  periodOffset:0,       /* 0 = 上一个完整自然周（周报标准口径） */
  notes:{},             /* {expId:{subKey:'人工修订后的文本'}} */
  otherWork:'',         /* 其他工作 */
  refStudy:[],          /* 文献资料学习：[{name,tip}] */
  workload:{},          /* 工作量统计：{pid:{dev,app,ana,lit,note}} */
  deptReview:{},        /* 部门管理工作（经理版）：{pid:{content,done,eval,next}} */
  planAdjust:'',        /* 周计划调整说明 */
  refReport:''          /* 引用分析报表（保留原 AI 联动） */
};

/* 兼容保留：文档归档页用它取「当前周」区间，判断是否是本周草稿 */
function weeklyDateRange(){
  var now=new Date(),day=now.getDay()||7,start=new Date(now);
  start.setDate(now.getDate()-day+1);
  var end=new Date(start);end.setDate(start.getDate()+6);
  return {start:wkFmt(start),today:wkFmt(now),end:wkFmt(end)};
}

/* ---------------- 角色与周期 ---------------- */
var WK_ROLE={
  staff:{key:'staff',label:'研发人员',name:'王研究员',lab:'上海研究室 · 涂饰组',reportTo:'孙工',scope:'self'},
  manager:{key:'manager',label:'研究室经理',name:'孙工',lab:'上海研究室',reportTo:'研发总监',scope:'all'}
};
function wkRoleNow(){ return WK_ROLE[weeklyDraft.role]||WK_ROLE.staff; }

function wkFmt(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function wkPeriod(off){
  off=(off===undefined||off===null)?(weeklyDraft.periodOffset||0):off;
  var n=new Date(), day=n.getDay()||7;
  var mon=new Date(n); mon.setDate(n.getDate()-day+1);   /* 本周一 */
  mon.setDate(mon.getDate()-(off+1)*7);                  /* off=0 → 上一个完整自然周 */
  var sun=new Date(mon); sun.setDate(mon.getDate()+6);
  return {start:wkFmt(mon),end:wkFmt(sun)};
}
function wkPeriodLabel(off){
  off=(off===undefined)?weeklyDraft.periodOffset:off;
  if(off===-1)return '本周';
  if(off===0)return '上周';
  if(off===1)return '上上周';
  return '往前 '+(off+1)+' 周';
}
var WK_PERIOD_OPTS=[{v:-1,t:'本周'},{v:0,t:'上周'},{v:1,t:'上上周'}];

/* 周期内实验：who 为空 = 全室（经理视角） */
function wkPeriodExps(who,per){
  return experiments.filter(function(e){
    var d=e.experimentDate||(e.createTime||'').split(' ')[0];
    if(!d||d<per.start||d>per.end)return false;
    if(!who)return true;
    return e.owner===who||e.creator===who;
  });
}
/* 按项目归组，保持出现顺序 */
function wkProjGroups(exps){
  var order=[],map={};
  exps.forEach(function(e){
    var ids=(e.projectIds&&e.projectIds.length)?e.projectIds.slice():[''];
    ids.forEach(function(pid){
      if(!map[pid]){map[pid]={pid:pid,exps:[]};order.push(map[pid]);}
      if(map[pid].exps.indexOf(e)<0)map[pid].exps.push(e);
    });
  });
  return order;
}

/* ---------------- 子小节取值 ---------------- */
function wkNote(expId,key){
  var m=weeklyDraft.notes&&weeklyDraft.notes[expId];
  return (m&&m[key]!==undefined)?m[key]:null;
}
function wkExpDetail(e){
  ensureNormalDetail(e);
  var d=e.normalDetail||{};
  var procs=d.processes||[];
  return {
    purpose:e.purpose||'—',
    project:(e.projectIds||[]).map(function(id){var p=findProj(id);return p?p.name:id;}).join('、')||'—',
    principle:(e.keyTechnology||'—')+(e.type?'（实验类型：'+e.type+'）':''),
    variable:e.experimentVariable||(e.factors||[]).map(function(f){return f.name;}).join('、')||'—',
    processes:procs.map(function(p){return p.name;}),
    materials:procs.reduce(function(a,p){return a+(p.materials||[]).length;},0),
    processTests:d.processTests||[],
    productTests:d.productTests||[],
    conclusion:d.conclusion||''
  };
}
/* 1.x.2 实验方案及结果分析：自动生成描述 + 成品检测小表 */
function wkSchemeText(e){
  var x=wkExpDetail(e), bits=[];
  if(x.principle!=='—')bits.push('技术路线：'+x.principle);
  if(x.variable!=='—')bits.push('实验变量：'+x.variable);
  if(x.processes.length)bits.push('按 '+x.processes.length+' 道工序执行（'+x.processes.join(' → ')+'）');
  if(x.materials)bits.push('累计投料 '+x.materials+' 项');
  if(x.processTests.length)bits.push('过程测试 '+x.processTests.length+' 项');
  if(x.productTests.length)bits.push('成品检测 '+x.productTests.length+' 项');
  var h=bits.join('；')+'。';
  if(x.productTests.length){
    h+='\n成品检测结果：'+x.productTests.map(function(r){return r.name+' '+r.value+(r.note?'（'+r.note+'）':'');}).join('；')+'。';
  }
  if(x.processTests.length){
    h+='\n过程测试：'+x.processTests.map(function(r){return r.name+' '+r.result+(r.target?'/目标 '+r.target:'');}).join('；')+'。';
  }
  return h;
}
/* 1.x.3 目标差异性分析 */
function wkDiffText(e,ro){
  var x=wkExpDetail(e), h='';
  var vals=x.productTests.filter(function(r){return r.value&&r.value!=='—';});
  if(vals.length)h+='实测值与目标的偏差：'+vals.map(function(r){return r.name+'='+r.value;}).join('、')+'。';
  if(x.conclusion)h+=(h?'':'')+'结论：'+x.conclusion;
  /* 编辑态：系统无结论就留空由人补；只读态（历史周报）才用兜底句 */
  else if(ro)h+='目标差异：本组实验结果与预期目标总体一致，未发现显著偏离。';
  return h;
}
/* 下周区间（per 之后 7 天），用于「1.x.4 下一步计划」取真到期任务 */
function wkNextRange(per){
  var base=new Date(per.end+'T00:00:00');
  var a=new Date(base); a.setDate(base.getDate()+1);
  var b=new Date(base); b.setDate(base.getDate()+7);
  return {start:wkFmt(a),end:wkFmt(b)};
}
/* 1.x.4 下一步计划 */
function wkNextText(e,per,ro){
  per=per||wkPeriod();
  var nx=wkNextRange(per), ids=e.projectIds||[];
  var t=WEEKLY_TASKS.filter(function(x){
    return !x.done && x.due>=nx.start && x.due<=nx.end && (!x.pid||ids.indexOf(x.pid)>=0);
  });
  var p=findProj(ids[0]), h='';
  if(t.length)h+='下周计划（'+nx.start+' ~ '+nx.end+'）：\n'+t.map(function(x){return x.due+' '+x.name;}).join('\n');
  if(p)h+=(h?'\n':'')+'项目节点：'+p.name+'（当前 '+p.stage+' 阶段）';
  return h;
}

/* ---------------- 通用渲染件 ---------------- */
function wkSub(code,title,def,auto,expId,subKey,rows,ro){
  var val=wkNote(expId,subKey);
  var text=(val!==null&&val!==undefined)?val:def;
  var tag=auto?'<span class="wr-auto-tag">自动带出</span>':'<span class="wr-manual-tag">手工填写</span>';
  var h='<div class="wr-sub"><div class="wr-sub-hd">'+code+' '+title+tag+'</div>';
  if(ro)h+='<div class="wr-sub-bd">'+(text?esc(text).replace(/\n/g,'<br>'):'<span class="muted">—</span>')+'</div>';
  else h+='<div class="wr-sub-bd"><textarea class="ctrl" rows="'+(rows||3)+'" data-wk="'+esc(subKey)+'" data-wkexp="'+esc(expId)+'" placeholder="'+esc(auto?'系统未取到该项数据，请手工补充':'请填写')+'">'+esc(text)+'</textarea></div>';
  return h+'</div>';
}
function wkExpBlock(e,ei,ro,per){
  var n='1.'+(ei+1);
  var h='<div class="wr-exp"><div class="wr-exp-hd">'+n+' 实验目的'+(ei+1)+'：'+esc(e.name)+
        '<span>'+esc(e.id)+' · '+esc(e.status)+' · '+esc(e.experimentDate||(e.createTime||'').split(' ')[0])+'</span></div>';
  h+=wkSub(n+'.1','涉及原理及技术路线',wkExpDetail(e).principle,true,e.id,n+'.1',3,ro);
  h+=wkSub(n+'.2','实验方案及结果分析',wkSchemeText(e),true,e.id,n+'.2',6,ro);
  h+=wkSub(n+'.3','目标差异性分析',wkDiffText(e,ro),true,e.id,n+'.3',3,ro);
  h+=wkSub(n+'.4','下一步计划',wkNextText(e,per,ro),true,e.id,n+'.4',4,ro);
  return h+'</div>';
}
/* R4（2026-09-14）：原「六、引用分析报表」独立章节取消，降级为研究总结章节内的插入入口，
   既贴合真实模板章节，又保留 AI 分析报表联动。 */
function wkRefRow(ro){
  var name=(typeof aiWeeklyRefName==='function')?aiWeeklyRefName():'';
  if(ro){
    return name?'<div class="wr-sub"><div class="wr-sub-hd">引用分析报表</div><div class="wr-sub-bd">已附：'+esc(name)+'</div></div>':'';
  }
  var opts=(typeof aiReportOptions==='function')?aiReportOptions(weeklyDraft.refReport):'';
  return '<div class="wr-sub"><div class="wr-sub-hd">引用分析报表<span class="wr-manual-tag">手工选择</span></div>'+
    '<div class="wr-sub-bd"><select class="ctrl" id="wrRefReport" style="max-width:360px" onchange="aiSetWeeklyRef(this)">'+opts+'</select>'+
    (name?'<div class="wr-auto-note">已附：'+esc(name)+'</div>':'')+'</div></div>';
}

/* 一、研究工作总结及计划（两版共用，范围不同） */
function wkResearchSec(per,who,ro){
  var exps=wkPeriodExps(who,per);
  var groups=wkProjGroups(exps);
  var h='<div class="wr-sec"><h4>一、研究工作总结及计划<span class="sub">本周期 '+
        exps.length+' 组实验 · 覆盖 '+groups.length+' 个项目</span></h4>';
  if(!groups.length){
    h+='<div class="empty" style="padding:18px;text-align:center;color:var(--muted)">本周期暂无实验记录</div>';
  }
  groups.forEach(function(g,gi){
    var p=findProj(g.pid);
    h+='<div class="wr-proj"><div class="wr-proj-hd">项目'+(gi+1)+'、'+esc(p?p.name:(g.pid||'未关联项目'))+
       '<em>'+esc(g.pid||'')+(p?' · 负责人 '+esc(p.leader)+' · '+esc(p.stage)+'阶段':'')+'</em></div><div class="wr-proj-bd">';
    g.exps.forEach(function(e,ei){ h+=wkExpBlock(e,ei,ro,per); });
    h+='</div></div>';
  });
  h+=wkRefRow(ro);
  return h+'</div>';
}

/* ---------------- 研发人员版专属：工作量统计 ---------------- */
function wkWorkloadRows(per,who){
  var groups=wkProjGroups(wkPeriodExps(who,per));
  if(!groups.length){
    /* 本周期无实验：若草稿已有工时记录（含一键填充 / 只读态的示例），按其项目渲染，避免整表 0 */
    groups=Object.keys(weeklyDraft.workload||{}).map(function(pid){return {pid:pid,exps:[]};});
  }
  return groups.map(function(g){
    var p=findProj(g.pid), n=g.exps.length;
    var saved=(weeklyDraft.workload||{})[g.pid]||{};
    /* 编辑态：系统无工时数据源，一律留空由人填；只读态走 wkDemoDraft 的示例工时 */
    return {
      pid:g.pid,
      name:p?p.name:(g.pid||'未关联项目'),
      dev:(saved.dev!==undefined?saved.dev:''),
      app:(saved.app!==undefined?saved.app:''),
      ana:(saved.ana!==undefined?saved.ana:''),
      lit:(saved.lit!==undefined?saved.lit:''),
      note:saved.note||''
    };
  });
}
function wkWorkloadSec(per,who,ro){
  var rows=wkWorkloadRows(per,who);
  var tot={dev:0,app:0,ana:0,lit:0};
  rows.forEach(function(r){ tot.dev+=+r.dev||0; tot.app+=+r.app||0; tot.ana+=+r.ana||0; tot.lit+=+r.lit||0; });
  var sum=tot.dev+tot.app+tot.ana+tot.lit;
  var h='<div class="wr-sec"><h4>三、工作量统计<span class="sub">按实际填写本周实验数量和总时长，系统自动合计并换算标准工作量</span></h4>';
  h+='<div class="tbl-wrap"><table class="tbl wr-inline-tbl"><thead><tr><th>项目</th><th class="num">开发</th><th class="num">应用</th>'+
     '<th class="num">分析</th><th class="num">文献查阅</th><th>备注</th></tr></thead><tbody>';
  if(!rows.length){
    h+='<tr><td colspan="6" class="muted ctr">本周期无项目工时</td></tr>';
  }
  rows.forEach(function(r){
    h+='<tr><td>'+esc(r.name)+'</td>';
    ['dev','app','ana','lit'].forEach(function(k){
      h+='<td class="num">'+(ro?esc(r[k]):'<input class="wr-mini" type="number" step="0.5" min="0" data-wkwl="'+k+'" data-wkpid="'+esc(r.pid)+'" value="'+esc(r[k])+'">')+'</td>';
    });
    h+='<td>'+(ro?esc(r.note||'—'):'<input data-wkwl="note" data-wkpid="'+esc(r.pid)+'" value="'+esc(r.note)+'" placeholder="—">')+'</td></tr>';
  });
  h+='<tr class="wr-sum-row"><td>总时长/h</td><td class="num">'+tot.dev.toFixed(1)+'</td><td class="num">'+tot.app.toFixed(1)+'</td>'+
     '<td class="num">'+tot.ana.toFixed(1)+'</td><td class="num">'+tot.lit.toFixed(1)+'</td><td>合计 '+sum.toFixed(1)+' h</td></tr>';
  h+='</tbody></table></div>';
  h+='<div class="notice notice-info" style="margin-top:10px"><i class="ni">i</i><div>标准工作量 = 总时长 ÷ 8 = <b class="wr-std-num">'+(sum/8).toFixed(1)+'</b> 人天</div></div>';
  return h+'</div>';
}

/* ---------------- 研发人员版专属：其他工作（含文献资料学习） ---------------- */
function wkLitTable(ro){
  var list=weeklyDraft.refStudy||[];
  var h='<div class="tbl-wrap" style="margin-top:8px"><table class="tbl wr-inline-tbl"><thead><tr><th style="width:56px">序号</th>'+
        '<th>名称</th><th>技术心得</th>'+(ro?'':'<th style="width:64px">操作</th>')+'</tr></thead><tbody>';
  if(!list.length){
    h+='<tr><td colspan="'+(ro?3:4)+'" class="muted ctr">本周暂无文献学习记录</td></tr>';
  }
  list.forEach(function(r,i){
    h+='<tr><td>'+(i+1)+'</td>';
    if(ro)h+='<td>'+esc(r.name||'—')+'</td><td>'+esc(r.tip||'—')+'</td>';
    else h+='<td><input data-wklit="name" data-wki="'+i+'" value="'+esc(r.name||'')+'"></td>'+
            '<td><input data-wklit="tip" data-wki="'+i+'" value="'+esc(r.tip||'')+'"></td>'+
            '<td><button class="btn-link danger" onclick="wkLitDel('+i+')">删除</button></td>';
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  if(!ro)h+='<button class="btn btn-sm" style="margin-top:8px" onclick="wkLitAdd()">新增一行</button>';
  return h;
}
function wkLitAdd(){ if(!weeklyDraft.refStudy)weeklyDraft.refStudy=[]; saveWeeklyDraft(); weeklyDraft.refStudy.push({name:'',tip:''}); wkRefresh(); }
function wkLitDel(i){ saveWeeklyDraft(); weeklyDraft.refStudy.splice(i,1); wkRefresh(); }

/* ---------------- 经理版专属：部门管理工作 ---------------- */
function wkDeptGroups(){
  var order=[],map={};
  PROJECTS.forEach(function(p){
    var k=p.leader||'—';
    if(!map[k]){map[k]={leader:k,projs:[]};order.push(map[k]);}
    map[k].projs.push(p);
  });
  return order;
}
function wkDeptSec(per,ro){
  var groups=wkDeptGroups();
  var h='<div class="wr-sec"><h4>部门管理工作<span class="sub">含部门建设与管理、研发工作指导 · 按项目负责人归集</span></h4>';
  groups.forEach(function(g){
    var rows=g.projs.map(function(p){
      var exps=wkPeriodExps(null,per).filter(function(e){return (e.projectIds||[]).indexOf(p.id)>=0;});
      var done=exps.filter(function(e){return ['已完成','已分析','已结案'].indexOf(e.status)>=0;}).length;
      var auto=exps.length?('本周执行 '+exps.length+' 组实验（'+exps.map(function(e){return e.name;}).join('、')+'）'):('处于 '+p.stage+' 阶段，本周无新增实验');
      var st=exps.length?('已完成 '+done+' / '+exps.length+' 组'):(p.stage+' 阶段推进中');
      var saved=(weeklyDraft.deptReview||{})[p.id]||{};
      return {pid:p.id,name:p.name,content:auto,status:st,eval:saved.eval||'',next:saved.next||''};
    });
    h+='<div class="wr-proj"><div class="wr-proj-hd">项目负责人：'+esc(g.leader)+
       '<em>在研项目 '+g.projs.length+' 个</em></div><div class="wr-proj-bd">';
    h+='<div class="tbl-wrap"><table class="tbl wr-inline-tbl"><thead><tr><th style="width:190px">项目</th><th>本周工作内容</th>'+
       '<th style="width:130px">完成情况</th><th style="width:150px">工作评价</th><th style="width:170px">下周工作计划</th></tr></thead><tbody>';
    rows.forEach(function(r){
      h+='<tr><td>'+esc(r.name)+'</td><td>'+esc(r.content)+'</td><td>'+esc(r.status)+'</td>'+
         '<td>'+(ro?(esc(r.eval)||'<span class="muted">—</span>'):'<input data-wkdept="eval" data-wkpid="'+esc(r.pid)+'" value="'+esc(r.eval)+'" placeholder="填写评价">')+'</td>'+
         '<td>'+(ro?(esc(r.next)||'<span class="muted">—</span>'):'<input data-wkdept="next" data-wkpid="'+esc(r.pid)+'" value="'+esc(r.next)+'" placeholder="填写下周计划">')+'</td></tr>';
    });
    h+='</tbody></table></div></div></div>';
  });
  return h+'</div>';
}

/* ---------------- 周报正文（按角色组装） ---------------- */
/* 只读态（历史周报 / 文档归档）渲染：临时换用「完整示例数据」的草稿，
   渲染完立刻还原，不污染用户自己的草稿。 */
function wkReportHTML(ro){
  if(!ro)return wkReportHTMLInner(false);
  var bak=weeklyDraft;
  weeklyDraft=wkDemoDraft(wkPeriod(),bak.role);
  try{ return wkReportHTMLInner(true); }
  finally{ weeklyDraft=bak; }
}
function wkReportHTMLInner(ro,perOverride){
  var per=perOverride||wkPeriod(), r=wkRoleNow(), isMgr=r.key==='manager';
  var who=isMgr?null:r.name;
  var h='<div class="'+(ro?'wr-ro':'')+'">';
  /* 表头信息 */
  h+='<div class="wr-doc-hd"><div class="wr-doc-title">周总结报告</div>'+
     '<div class="wr-doc-period">自 '+per.start+' 至 '+per.end+'（'+wkPeriodLabel()+'）</div>'+
     '<div class="wr-doc-meta"><div><span>姓名</span>'+esc(r.name)+'</div>'+
     '<div><span>研究室</span>'+esc(r.lab)+'</div>'+
     '<div><span>汇报领导</span>'+esc(r.reportTo)+'</div></div></div>';
  /* 经理版：部门管理工作置顶 */
  if(isMgr)h+=wkDeptSec(per,ro);
  /* 一、研究工作总结及计划 */
  h+=wkResearchSec(per,who,ro);
  /* 其他工作 */
  if(isMgr){
    h+='<div class="wr-sec"><h4>其他工作<span class="sub">本周完成的非项目类工作</span></h4>';
    if(ro)h+='<div class="wr-sub-bd" style="margin-left:0">'+(weeklyDraft.otherWork?esc(weeklyDraft.otherWork).replace(/\n/g,'<br>'):'<span class="muted">—</span>')+'</div>';
    else h+='<textarea class="ctrl" rows="3" data-wkother="1" placeholder="说明本周完成工作，如 MSDS 编写、专利撰写、项目申请等，需阐述工作目的及结果">'+esc(weeklyDraft.otherWork)+'</textarea>';
    h+='</div>';
  }else{
    h+='<div class="wr-sec"><h4>二、其他工作<span class="sub">文献资料学习与其他非项目类工作</span></h4>';
    h+='<div class="wr-sub-hd" style="margin:4px 0 0 0">1、文献资料学习</div>'+wkLitTable(ro);
    h+='<div class="wr-sub-hd" style="margin:16px 0 6px 0">2、其他工作</div>';
    if(ro)h+='<div class="wr-sub-bd">'+(weeklyDraft.otherWork?esc(weeklyDraft.otherWork).replace(/\n/g,'<br>'):'<span class="muted">—</span>')+'</div>';
    else h+='<textarea class="ctrl" rows="3" data-wkother="1" placeholder="说明本周完成的非项目类工作，如原材料筛选、MSDS 编写、专利撰写、项目申请等，需阐述工作目的及结果">'+esc(weeklyDraft.otherWork)+'</textarea>';
    h+='</div>';
  }
  /* 研发人员版：工作量统计 */
  if(!isMgr)h+=wkWorkloadSec(per,who,ro);
  /* 四、周计划调整说明 */
  h+='<div class="wr-sec"><h4>四、周计划调整说明</h4>';
  if(ro)h+='<div class="wr-sub-bd">'+(weeklyDraft.planAdjust?esc(weeklyDraft.planAdjust).replace(/\n/g,'<br>'):'<span class="muted">—</span>')+'</div>';
  else h+='<textarea class="ctrl" rows="3" data-wkadjust="1" placeholder="填写本周计划与原计划的调整原因">'+esc(weeklyDraft.planAdjust)+'</textarea>';
  h+='</div>';
  h+='</div>';
  return h;
}

/* ---------------- 示例数据：仅填充「人工维护项」 ----------------
   口径（2026-09-14 Cayla 定）：
   - 编辑态（查看本周完整周报）→ 只展示系统能自动取到的内容，人工项一律留空
   - 点「一键填充示例数据」→ 把下列示例写入草稿
   - 只读态（历史周报 / 归档）→ 直接按下列示例渲染，字段全满
   以下字段系统均无数据源：文献学习、其他工作、工作量工时、经理评价、计划调整说明。   */
var WK_DEMO_LIT=[
  {name:'聚氨酯乳液成膜机理综述（2026）',tip:'乳化剂配比对成膜致密性的影响，可用于解释 WPU-320 平行样差异'},
  {name:'皮革加脂剂复配柔软度评价方法',tip:'对比三种柔软度评价方法的适用性，建议本项目采用弯曲刚度法'}
];
/* 示例工时按「本周期有实验的项目」生成；历史周期可能一条实验都没有，
   此时回退到本人（或全室）参与过的项目，避免历史周报出现整表 0。 */
function wkDemoGroups(who,per){
  var g=wkProjGroups(wkPeriodExps(who,per));
  if(g.length)return g;
  var ids=[],seen={};
  experiments.forEach(function(e){
    if(who&&e.owner!==who&&e.creator!==who)return;
    (e.projectIds||[]).forEach(function(p){ if(!seen[p]){seen[p]=1;ids.push(p);} });
  });
  if(!ids.length){
    PROJECTS.forEach(function(p){ if(!who||p.leader===who){ if(!seen[p.id]){seen[p.id]=1;ids.push(p.id);} } });
  }
  return ids.map(function(pid){return {pid:pid,exps:[]};});
}
function wkDemoDraft(per,role){
  per=per||wkPeriod(); role=role||'staff';
  var who=(role==='manager')?null:(WK_ROLE[role]||WK_ROLE.staff).name;
  var groups=wkDemoGroups(who,per), wl={};
  groups.forEach(function(g){
    var n=g.exps.length||1;
    wl[g.pid]={dev:n*3,app:n*2,ana:n*1.5,lit:n*0.5,
      note:n>1?('含 '+n+' 组平行实验的重复操作工时'):'按单组实验统计'};
  });
  var evals=['推进节奏正常，实验数据完整，继续保持。','进度符合预期，需补齐过程检测记录。','阶段节点临近，请加快资料归档。'];
  var dept={};
  PROJECTS.forEach(function(p,i){
    dept[p.id]={eval:evals[i%3],next:'推进'+p.stage+'阶段节点，组织阶段评审'};
  });
  return {
    status:'草稿', role:role, periodOffset:weeklyDraft.periodOffset,
    notes:{},
    otherWork:'完成 WPU-320 中试物料 MSDS 初稿编写（目的：为欧盟客户送样提供合规文件）；参与 HF-5 手感剂专利交底书撰写，已完成权利要求初稿。',
    refStudy:WK_DEMO_LIT.slice(),
    workload:wl, deptReview:dept,
    planAdjust:'原定第 3 组平行实验因检测设备校准延后 1 天，WPU-320 稳定性验证顺延至下周，其余计划不变。',
    refReport:weeklyDraft.refReport||''
  };
}
function wkDemoFilled(){
  var d=weeklyDraft;
  return !!((d.refStudy&&d.refStudy.length)||d.otherWork||d.planAdjust||
            (d.workload&&Object.keys(d.workload).length)||(d.deptReview&&Object.keys(d.deptReview).length));
}
/* 历史周期很可能查不到实验（原型只 mock 了最近两周），
   只读态临时注入一组示例实验，让归档周报的「研究总结」有内容；渲染完立即移除，不进主数据。 */
var WK_DEMO_EXPS=[
  {name:'WPU-320 乳化工艺稳定性复测',type:'单因子平行实验',status:'已完成',
   keyTechnology:'预聚反应、扩链与中和、乳化分散',purpose:'验证乳化温度波动对粒径分布与储存稳定性的影响',
   experimentVariable:'乳化温度（40 / 50 / 60 ℃）'},
  {name:'HF-5 手感剂与主树脂配伍性验证',type:'单因子平行实验',status:'已分析',
   keyTechnology:'预混与升温、缩聚反应、封端与降温',purpose:'确认 HF-5 与主树脂长期配伍不分层、不返粗',
   experimentVariable:'HF-5 添加量（0.5 / 1.0 / 1.5 %）'}
];
function wkDemoExpsFor(per,who){
  var ids=[];
  experiments.forEach(function(e){
    if(who&&e.owner!==who&&e.creator!==who)return;
    (e.projectIds||[]).forEach(function(p){ if(ids.indexOf(p)<0)ids.push(p); });
  });
  if(!ids.length)PROJECTS.forEach(function(p){ if(!who||p.leader===who)ids.push(p.id); });
  if(!ids.length&&PROJECTS.length)ids=[PROJECTS[0].id];
  var base=new Date(per.start+'T00:00:00'), mmdd=per.start.slice(5).replace('-','');
  return WK_DEMO_EXPS.map(function(t,i){
    var d=new Date(base); d.setDate(base.getDate()+1+i*2);
    var o={};
    for(var k in t)o[k]=t[k];
    o.id='EXP-2026-'+mmdd+String.fromCharCode(65+i);
    o.owner=who||'王研究员'; o.creator=who||'王研究员';
    o.projectIds=[ids[i%ids.length]];
    o.experimentDate=wkFmt(d); o.createTime=wkFmt(d)+' 09:00';
    o.source='demo';
    return o;
  });
}
function wkSyncDemoBtn(){
  var b=$('wrDemoBtn'); if(!b)return;
  var f=wkDemoFilled();
  b.textContent=f?'清除示例数据':'一键填充示例数据';
  b.setAttribute('onclick',f?'wkClearDemo()':'wkFillDemo()');
}
function wkFillDemo(){
  var d=wkDemoDraft(wkPeriod(),weeklyDraft.role);
  weeklyDraft.notes=d.notes; weeklyDraft.otherWork=d.otherWork; weeklyDraft.refStudy=d.refStudy;
  weeklyDraft.workload=d.workload; weeklyDraft.deptReview=d.deptReview; weeklyDraft.planAdjust=d.planAdjust;
  wkRefresh(); wkSyncDemoBtn(); toast('已填充示例数据');
}
function wkClearDemo(){
  weeklyDraft.notes={}; weeklyDraft.otherWork=''; weeklyDraft.refStudy=[];
  weeklyDraft.workload={}; weeklyDraft.deptReview={}; weeklyDraft.planAdjust='';
  wkRefresh(); wkSyncDemoBtn(); toast('已清除示例数据');
}

/* ---------------- 交互 ---------------- */
function wkSwitchRole(k){
  if(weeklyDraft.role===k)return;
  saveWeeklyDraft();
  weeklyDraft.role=k;
  wkRefresh();
}
function wkSwitchPeriod(v){
  saveWeeklyDraft();
  weeklyDraft.periodOffset=parseInt(v,10);
  wkRefresh();
}
function wkRefresh(){
  if(!$('wrBody'))return;
  $('wrBody').innerHTML=wkReportHTML(false);
  if($('wrRoleBar')){
    $$('#wrRoleBar .wr-role-seg button').forEach(function(b){
      b.classList.toggle('on', b.getAttribute('data-role')===weeklyDraft.role);
    });
  }
  wkBindInputs();
}
function wkBindInputs(){
  $$('[data-wk]').forEach(function(el){
    el.oninput=function(){ wkStashOne(el); };
  });
  $$('[data-wkwl]').forEach(function(el){
    el.oninput=function(){
      var pid=el.getAttribute('data-wkpid'), k=el.getAttribute('data-wkwl');
      if(!weeklyDraft.workload[pid])weeklyDraft.workload[pid]={};
      weeklyDraft.workload[pid][k]=el.value;
      wkUpdateTotals();
    };
  });
  $$('[data-wklit]').forEach(function(el){
    el.oninput=function(){
      var i=parseInt(el.getAttribute('data-wki'),10), k=el.getAttribute('data-wklit');
      if(weeklyDraft.refStudy[i])weeklyDraft.refStudy[i][k]=el.value;
    };
  });
  $$('[data-wkdept]').forEach(function(el){
    el.oninput=function(){
      var pid=el.getAttribute('data-wkpid');
      if(!weeklyDraft.deptReview[pid])weeklyDraft.deptReview[pid]={};
      weeklyDraft.deptReview[pid][el.getAttribute('data-wkdept')]=el.value;
    };
  });
  var o=$('wkOther'); if(o)o.oninput=function(){ weeklyDraft.otherWork=o.value; };
  $$('[data-wkother]').forEach(function(el){ el.oninput=function(){ weeklyDraft.otherWork=el.value; }; });
  var a=$('wkAdjust'); if(a)a.oninput=function(){ weeklyDraft.planAdjust=a.value; };
  $$('[data-wkadjust]').forEach(function(el){ el.oninput=function(){ weeklyDraft.planAdjust=el.value; }; });
}
function wkStashOne(el){
  var exp=el.getAttribute('data-wkexp')||'_', key=el.getAttribute('data-wk');
  if(!weeklyDraft.notes[exp])weeklyDraft.notes[exp]={};
  weeklyDraft.notes[exp][key]=el.value;
}
/* 工作量输入即时刷新合计（不重建 DOM，避免丢焦点） */
function wkUpdateTotals(){
  var per=wkPeriod(), who=weeklyDraft.role==='manager'?null:wkRoleNow().name;
  var rows=wkWorkloadRows(per,who);
  var tot={dev:0,app:0,ana:0,lit:0};
  rows.forEach(function(r){ tot.dev+=+r.dev||0; tot.app+=+r.app||0; tot.ana+=+r.ana||0; tot.lit+=+r.lit||0; });
  var sum=tot.dev+tot.app+tot.ana+tot.lit;
  var tr=document.querySelector('.wr-sum-row');
  if(tr){
    var tds=tr.querySelectorAll('td');
    if(tds.length>=6){
      tds[1].textContent=tot.dev.toFixed(1); tds[2].textContent=tot.app.toFixed(1);
      tds[3].textContent=tot.ana.toFixed(1); tds[4].textContent=tot.lit.toFixed(1);
      tds[5].textContent='合计 '+sum.toFixed(1)+' h';
    }
  }
  var dl=document.querySelector('.wr-std-num');
  if(dl)dl.textContent=(sum/8).toFixed(1);
}
function saveWeeklyDraft(){
  $$('[data-wk]').forEach(wkStashOne);
  $$('[data-wkwl]').forEach(function(el){
    var pid=el.getAttribute('data-wkpid'), k=el.getAttribute('data-wkwl');
    if(!weeklyDraft.workload[pid])weeklyDraft.workload[pid]={};
    weeklyDraft.workload[pid][k]=el.value;
  });
  $$('[data-wklit]').forEach(function(el){
    var i=parseInt(el.getAttribute('data-wki'),10), k=el.getAttribute('data-wklit');
    if(weeklyDraft.refStudy[i])weeklyDraft.refStudy[i][k]=el.value;
  });
  $$('[data-wkdept]').forEach(function(el){
    var pid=el.getAttribute('data-wkpid');
    if(!weeklyDraft.deptReview[pid])weeklyDraft.deptReview[pid]={};
    weeklyDraft.deptReview[pid][el.getAttribute('data-wkdept')]=el.value;
  });
  var o=document.querySelector('[data-wkother]'); if(o)weeklyDraft.otherWork=o.value;
  var a=document.querySelector('[data-wkadjust]'); if(a)weeklyDraft.planAdjust=a.value;
}

/* ---------------- 首页卡片（统计口径 = 上一个完整自然周） ---------------- */
function weeklyStats(per){
  var r=per||wkPeriod(), me='王研究员';
  var exps=wkPeriodExps(me,r);
  var regular=exps.filter(function(e){return e.source!=='DOE';}).length;
  var doe=exps.filter(function(e){return e.source==='DOE';}).length;
  var done=exps.filter(function(e){return ['已完成','已分析','已结案'].indexOf(e.status)>=0;}).length;
  var groups=wkProjGroups(exps);
  var tasks=WEEKLY_TASKS.filter(function(t){return t.due>=r.start&&t.due<=r.end;});
  var taskDone=tasks.filter(function(t){return t.done;}).length;
  var overdue=WEEKLY_TASKS.filter(function(t){return !t.done&&t.due<r.end;});
  var red=(typeof sdsEv==='function'?SDS_ROWS.filter(function(x){return sdsEv(x).lv==='red';}):[]);
  return {range:r,experiments:exps,regular:regular,doe:doe,done:done,groups:groups,tasks:tasks,taskDone:taskDone,
    rate:tasks.length?Math.round(taskDone/tasks.length*100):0,overdue:overdue,red:red};
}
function weeklyCardHTML(){
  var s=weeklyStats(),submitted=weeklyDraft.status==='已提交';
  return '<div class="card weekly-card" style="margin-bottom:18px">'+
    '<div class="card-hd"><div><h3>本周周报 '+(submitted?'<span class="tag tag-green">已提交</span>':'<span class="tag tag-grey">草稿</span>')+'</h3>'+
    '<span class="sub">统计周期：'+s.range.start+' ~ '+s.range.end+'（上周）· 王研究员（研发人员）</span></div><div class="spacer"></div>'+
    '<button class="btn btn-link" onclick="gotoWeeklyArchive()">历史周报 →</button></div>'+
    '<div class="card-b"><div class="weekly-preview">'+
      '<div><b>本周执行实验 '+s.experiments.length+' 组</b><span>普通 '+s.regular+' / DOE '+s.doe+'，完成 '+s.done+' 组</span></div>'+
      '<div><b>覆盖项目 '+s.groups.length+' 个</b><span>'+s.groups.slice(0,3).map(function(g){var p=findProj(g.pid);return esc(p?p.name:(g.pid||'未关联项目'));}).join('；')+'</span></div>'+
      '<div><b>计划达成情况</b><span>本周计划任务 '+s.tasks.length+' 项，完成 '+s.taskDone+' 项（达成率 '+s.rate+'%）</span></div>'+
      '<div><b>待办与风险</b><span>逾期任务 '+s.overdue.length+' 项，红灯 SDS 预警 '+s.red.length+' 条</span></div>'+
    '</div><div class="flex mt">'+
      '<select class="ctrl" id="wkRefReport" style="max-width:240px" onchange="aiSetWeeklyRef(this)">'+
        aiReportOptions(weeklyDraft.refReport)+'</select>'+
      '<div class="spacer"></div><button class="btn" onclick="openWeeklyReport()">查看完整周报</button>'+
    '<button class="btn btn-primary" onclick="submitWeeklyReport()"'+(submitted?' disabled':'')+'>'+(submitted?'已提交':'提交周报')+'</button></div></div></div>';
}

/* ---------------- 完整周报弹窗 ---------------- */
function wkRoleBar(){
  var r=wkRoleNow();
  var opts=WK_PERIOD_OPTS.map(function(o){
    return '<option value="'+o.v+'"'+(weeklyDraft.periodOffset===o.v?' selected':'')+'>'+o.t+'（'+wkPeriod(o.v).start+' ~ '+wkPeriod(o.v).end+'）</option>';
  }).join('');
  return '<div class="wr-role-bar" id="wrRoleBar">'+
    '<span class="wr-role-cap">周报模板</span>'+
    '<span class="wr-role-seg">'+
      '<button data-role="staff" class="'+(weeklyDraft.role==='staff'?'on':'')+'" onclick="wkSwitchRole(\'staff\')">研发人员</button>'+
      '<button data-role="manager" class="'+(weeklyDraft.role==='manager'?'on':'')+'" onclick="wkSwitchRole(\'manager\')">研究室经理</button>'+
    '</span>'+
    '<span class="muted" style="font-size:12px">当前：'+esc(r.name)+'（'+esc(r.label)+'）</span>'+
    '<span class="wr-period">周期 <select onchange="wkSwitchPeriod(this.value)">'+opts+'</select></span>'+
  '</div>';
}
function openWeeklyReport(){
  var body=wkRoleBar()+'<div id="wrBody">'+wkReportHTML(false)+'</div>';
  openModal({title:'完整周报预览',width:1120,body:body,
    footer:'<button class="btn btn-link" onclick="saveWeeklyDraft();closeModal();gotoWeeklyArchive()">历史周报</button>'+
      '<div class="spacer"></div>'+
      '<button class="btn" id="wrDemoBtn" onclick="wkFillDemo()">一键填充示例数据</button>'+
      '<button class="btn" onclick="saveWeeklyDraft();closeModal()">保存草稿</button>'+
      '<button class="btn btn-primary" onclick="submitWeeklyReport(true)">提交周报</button>'});
  setTimeout(function(){ wkBindInputs(); wkSyncDemoBtn(); },0);
}
function submitWeeklyReport(fromModal){
  if(fromModal)saveWeeklyDraft();
  weeklyDraft.status='已提交';
  var r=wkPeriod(),period=r.start+' ~ '+r.end;
  var ex=WEEKLY_REPORTS.filter(function(x){return x.period===period&&x.submitter==='王研究员';})[0];
  if(ex){
    /* 该周期已有归档记录（如 seed 生成的）→ 更新提交信息与模板角色 */
    ex.status='已提交';ex.submitTime=nowStr();ex.role=weeklyDraft.role;
    ex.refReport=weeklyDraft.refReport||ex.refReport||'';
  }else{
    WEEKLY_REPORTS.unshift({id:'WR-'+r.end.replace(/-/g,''),reportType:'周报',period:period,
      submitter:'王研究员',submitTime:nowStr(),status:'已提交',role:weeklyDraft.role,refReport:weeklyDraft.refReport||''});
  }
  closeModal();toast('已归档至文档中心 · 周报月报分类','ok');showPage('home');
}

/* ---------------- 历史周报（只读，按新模板渲染） ---------------- */
function weeklyRowsForMine(){
  var range=weeklyDateRange(),period=range.start+' ~ '+range.today;
  var rows=WEEKLY_REPORTS.filter(function(r){return r.submitter==='王研究员';}).slice();
  if(!rows.some(function(r){return r.period===period;})){
    rows.unshift({id:'WR-DRAFT',reportType:'周报',period:period,submitter:'王研究员',submitTime:'',status:weeklyDraft.status});
  }
  return rows;
}
/* 把归档记录的周期字符串转成查询区间 */
function wkPeriodOf(str){
  var m=String(str||'').split('~');
  if(m.length<2)return wkPeriod();
  return {start:m[0].trim(),end:m[1].trim()};
}
function wkArchiveHTML(periodStr,role){
  var keepRole=weeklyDraft.role, keepOff=weeklyDraft.periodOffset, keepNotes=weeklyDraft.notes;
  weeklyDraft.role=role||'staff';
  weeklyDraft.notes={};                 /* 历史周报不套用当前草稿的修订 */
  var per=wkPeriodOf(periodStr);
  var h=wkReportHTML_RO(per,role||'staff');
  weeklyDraft.role=keepRole; weeklyDraft.periodOffset=keepOff; weeklyDraft.notes=keepNotes;
  return h;
}
/* 只读渲染：可指定任意周期（归档用） */
/* 只读渲染（历史周报 / 归档）：同样临时换用完整示例数据，字段全满 */
function wkReportHTML_RO(per,role){
  var bak=weeklyDraft;
  var r=WK_ROLE[role]||WK_ROLE.staff, who=r.key==='manager'?null:r.name;
  var n0=experiments.length, injected=false;
  if(!wkPeriodExps(who,per).length){
    wkDemoExpsFor(per,who).forEach(function(e){ experiments.push(e); });
    injected=true;
  }
  weeklyDraft=wkDemoDraft(per,role||bak.role);
  try{ return wkReportHTML_RO_Inner(per,role); }
  finally{ weeklyDraft=bak; if(injected)experiments.length=n0; }
}
function wkReportHTML_RO_Inner(per,role){
  /* 与编辑态共用同一套模板（含文献学习表、工作量统计），只是 ro=true 全只读 */
  return wkReportHTMLInner(true,per);
}
function openWeeklyFromMine(id){
  var range=weeklyDateRange(),current=range.start+' ~ '+range.today;
  var r=weeklyRowsForMine().filter(function(x){return x.id===id;})[0];if(!r)return;
  if(r.period===current){openWeeklyReport();return;}
  openModal({title:r.reportType+'详情 · '+r.period,width:1040,
    body:'<div class="weekly-report-head" style="margin-bottom:14px"><div><b>'+esc(r.reportType)+' · '+esc(r.period)+'</b>'+
      '<span>'+esc(r.submitter)+' · '+esc(r.submitTime||'未提交')+'</span></div>'+
      '<span class="tag '+(r.status==='已提交'?'tag-green':'tag-grey')+'">'+esc(r.status)+'</span></div>'+
      wkArchiveHTML(r.period, r.role||weeklyDraft.role),
    footer:'<button class="btn" onclick="closeModal()">关闭</button>'});
}

/* ④（2026-09-10 领导评审）：实验设计环节「问问 AI」已取消，入口与专属函数一并移除。
   aiSparkIcon() 保留——周报等仍会复用该图标。 */
function aiSparkIcon(){return '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z"/><path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"/></svg>'}
