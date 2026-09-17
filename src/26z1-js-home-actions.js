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

/* ---------- 分页（2026-09-17）：5 条/页 ----------
   行动区曾把全部近 7 天待办（静态 + 设备保养 + 临时任务，峰值 15+ 条）堆在一张卡里，
   卡片高度挤占首屏；现按 5 条/页分页，页码存会话变量 _homeActPage。 */
var HOME_ACT_PS = 5;
var _homeActPage = 1;

/* 近 7 天清单（分页取数用）：静态 TODOS + 设备保养 + 临时任务，紧急置顶、其余按截止日升序 */
function homeActList(){
  var limit = daysFromNow(7);
  var dyn = (typeof eqMaintTodos === 'function') ? eqMaintTodos() : [];
  if(typeof taskTodos === 'function') dyn = dyn.concat(taskTodos());
  return TODOS.concat(dyn).filter(function(t){ return t.due && t.due <= limit; })
    .sort(function(a, b){
      if(!!a.urgent !== !!b.urgent) return a.urgent ? -1 : 1;
      return a.due < b.due ? -1 : (a.due > b.due ? 1 : 0);
    });
}

/* 翻页：只重刷行动区卡片本体（homeActBox），不动整页 */
function homeActPage(n){
  var max = Math.max(1, Math.ceil(homeActList().length / HOME_ACT_PS));
  _homeActPage = Math.min(Math.max(1, n), max);
  var box = $('homeActBox');
  if(box){
    var d = document.createElement('div');
    d.innerHTML = homeActionArea();
    if(d.firstChild) box.replaceWith(d.firstChild);
  }
}

function homeActionArea(){
  var list = homeActList();
  var max = Math.max(1, Math.ceil(list.length / HOME_ACT_PS));
  _homeActPage = Math.min(Math.max(1, _homeActPage), max);   /* 清单变短时收页码 */
  var pg = _homeActPage;
  var view = list.slice((pg - 1) * HOME_ACT_PS, pg * HOME_ACT_PS);
  var h='<div class="b-act b-c1" id="homeActBox" style="background:var(--primary-soft);border:1px solid var(--primary-border);'+
        'border-radius:12px;padding:16px 20px 14px;'+
        'box-shadow:0 2px 8px rgba(22,119,255,.08)">'+
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex:0 0 auto">'+
      '<span style="font-size:18px">📌</span>'+
      '<span style="font-size:16px;font-weight:600;color:var(--primary)">接下来要做</span>'+
      '<span style="font-size:12.5px;color:#5b6b82">近 7 天工作清单 · 共 '+list.length+' 条 · 按截止日排序</span>'+
      '<div class="spacer"></div>'+
      (list.length?'<span class="tag tag-red">'+list.filter(function(t){return t.urgent;}).length+' 项紧急</span>':'')+
    '</div>';
  if(!list.length){
    h+='<div style="font-size:13px;color:#5b6b82;padding:6px 0 4px">近 7 天暂无待办事项，保持节奏 🌾</div>';
    return h+'</div>';
  }
  h+='<div class="act-list">';
  view.forEach(function(t){
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
  /* 分页条：只有 1 页时不渲染 */
  if(max > 1){
    h+='<div style="display:flex;align-items:center;gap:6px;margin-top:10px;padding-top:10px;'+
       'border-top:1px dashed var(--line);font-size:12px;color:#5b6b82;flex:0 0 auto">'+
      '<button class="btn btn-sm"'+(pg<=1?' disabled style="opacity:.45"':'')+' onclick="homeActPage('+(pg-1)+')">‹ 上一页</button>';
    for(var i=1;i<=max;i++){
      h+=(i===pg)
        ? '<span style="min-width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;'+
          'border-radius:5px;background:var(--primary);color:#fff;font-weight:600">'+i+'</span>'
        : '<button class="btn btn-sm" style="min-width:22px;height:22px;padding:0 6px" onclick="homeActPage('+i+')">'+i+'</button>';
    }
    h+='<button class="btn btn-sm"'+(pg>=max?' disabled style="opacity:.45"':'')+' onclick="homeActPage('+(pg+1)+')">下一页 ›</button>'+
      '<div class="spacer"></div><span>第 '+pg+' / '+max+' 页</span></div>';
  }
  return h+'</div>';
}
