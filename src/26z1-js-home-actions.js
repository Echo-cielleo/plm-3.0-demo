/* ==================================================================
   首页置顶行动区（G15 · 领导评审 2026-09-10）
   · 「📌 接下来要做」= 欢迎语下方、KPI 卡上方，全页最显眼卡片
   · 近 7 天工作清单，按截止日升序；每条 = 标题 + 来源标签 + 截止日 + 动作按钮
   · 来源标签：OA 项目计划（蓝）/ 本系统任务（绿）——OA 只读接入，本系统任务系统内闭环
   · 原「我的待办」栏并入此处，首页不再单独罗列
   ================================================================== */

/* 行动区来源标签：OA 项目计划 = 蓝色系；本系统任务 = 绿色系 */
function homeActSourceTag(src){
  if(src==='OA 项目计划')return '<span class="tag" style="background:var(--primary-soft);color:var(--primary);border:1px solid var(--primary-border)">OA 项目计划</span>';
  /* 临时任务：管理层下发、非系统性计划，用紫色与「本系统任务」区分（2026-09-17） */
  if(src==='临时任务')return '<span class="tag tag-purple">临时任务</span>';
  return '<span class="tag tag-green">本系统任务</span>';
}

/* 行动区动作按钮：直达对应页面（SDS 走 sdsFocus 定位异常行） */
function homeActGo(t){
  /* fn 优先：临时任务等需要直接开弹窗的待办（2026-09-17） */
  if(t.fn)return t.fn;
  if(t.go==='sds:list'&&t.goId)return "sdsFocus('"+t.goId+"')";
  return "showPage('"+t.go+"'"+(t.goId?",{id:'"+t.goId+"'}":'')+")";
}

function homeActionArea(){
  var limit=daysFromNow(7);
  /* 2026-09-15：设备保养待办由维护台账动态生成（到期日 - 今天 ≤ 提前提醒天数） */
  var dyn=(typeof eqMaintTodos==='function')?eqMaintTodos():[];
  /* 2026-09-17：临时任务（指派给当前用户且未反馈的）并入行动区，带「临时任务」标签 */
  if(typeof taskTodos==='function')dyn=dyn.concat(taskTodos());
  var list=TODOS.concat(dyn).filter(function(t){return t.due&&t.due<=limit;})
                 /* 紧急任务置顶，其余按截止日升序 */
                 .sort(function(a,b){
                   if(!!a.urgent!==!!b.urgent)return a.urgent?-1:1;
                   return a.due<b.due?-1:(a.due>b.due?1:0);
                 });
  var h='<div class="b-act b-c1" style="background:var(--primary-soft);border:1px solid var(--primary-border);'+
        'border-radius:12px;padding:16px 20px 14px;'+
        'box-shadow:0 2px 8px rgba(22,119,255,.08)">'+
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex:0 0 auto">'+
      '<span style="font-size:18px">📌</span>'+
      '<span style="font-size:16px;font-weight:600;color:var(--primary)">接下来要做</span>'+
      '<span style="font-size:12.5px;color:#5b6b82">近 7 天工作清单 · 按截止日排序</span>'+
      '<div class="spacer"></div>'+
      (list.length?'<span class="tag tag-red">'+list.filter(function(t){return t.urgent;}).length+' 项紧急</span>':'')+
    '</div>';
  if(!list.length){
    h+='<div style="font-size:13px;color:#5b6b82;padding:6px 0 4px">近 7 天暂无待办事项，保持节奏 🌾</div>';
    return h+'</div>';
  }
  h+='<div class="act-list">';
  list.forEach(function(t){
    /* 紧急 = 整行浅红底；状态不再另挂「紧急」标签，避免与来源标签堆砌 */
    h+='<div class="act-item'+(t.urgent?' act-urgent':'')+'">'+
      '<div style="flex:1;min-width:0">'+
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
          '<b style="font-size:13.5px">'+esc(t.t)+'</b>'+
          homeActSourceTag(t.source)+
        '</div>'+
        '<div style="font-size:12px;color:#5b6b82;margin-top:3px">'+
          esc(t.kind)+' · 来自 '+esc(t.from)+' · 截止 '+esc(t.due)+
        '</div>'+
      '</div>'+
      '<button class="btn btn-primary btn-sm" style="white-space:nowrap" onclick="'+homeActGo(t)+'">'+esc(t.act||'去处理')+' →</button>'+
    '</div>';
  });
  h+='</div>';
  return h+'</div>';
}
