/* ==================================================================
   [22] 路由 · 侧边栏菜单树 · 页面注册表
   ================================================================== */

/* ---------- 侧边栏菜单树（严格对应 Prompt 菜单结构，不得擅自增删） ---------- */
var MENU=[
  {id:'req',name:'需求管理',icon:'inbox',prio:'P1',children:[
    {id:'req:customer',name:'客户需求'},
    {id:'req:internal',name:'自研需求'}
  ]},
  {id:'proj',name:'项目管理',icon:'clipboard',prio:'P1',children:[
    {id:'proj:guide',name:'流程引导'},
    {id:'proj:list',name:'研发项目管理'},
    /* 临时任务：管理层发布的非系统性计划任务，指定执行人并跟踪反馈（27z6） */
    {id:'proj:task',name:'临时任务',prio:'P2'},
    {id:'proj:app',name:'应用项目管理',prio:'P4'}
  ]},
  {id:'exp',name:'实验管理',icon:'flask',prio:'P0',children:[
    {id:'exp:guide',name:'流程引导'},
    {id:'exp:list',name:'实验列表'},
    {id:'exp:doe',name:'DOE 实验设计'},
    {id:'exp:analysis',name:'DOE实验分析'},
    {id:'exp:sum',name:'实验分析与总结'}
  ]},
  {id:'comp',name:'合规管理',icon:'shield',children:[
    {id:'comp:guide',name:'流程引导'},
    /* A1：SDS 管理改为父菜单，默认落「SDS 文档列表」；新建才进 6 步向导 */
    {id:'sds',name:'SDS 管理',icon:'file',prio:'P1',children:[
      {id:'sds:list',name:'SDS 文档列表',prio:'P1'},
      {id:'sds:wizard',name:'SDS 生成向导',prio:'P1'}
    ]},
    {id:'law:query',name:'法规统一查询',prio:'P1'},
    {id:'law',name:'法规库维护',children:[
      {id:'law:clp',name:'CLP 附录 VI',prio:'P1'},
      {id:'law:reach',name:'REACH / RoHS',prio:'P1'},
      {id:'law:cl',name:'C&L Inventory',prio:'P1'},
      {id:'law:cn',name:'国内危化品分类',prio:'P1'},
      {id:'law:zdhc',name:'ZDHC MRSL',prio:'P1'}
    ]},
    {id:'subst:list',name:'受限物质管理',prio:'P1'},
    {id:'export:reg',name:'出口注册管理',prio:'plan'},
    {id:'comp:guarantee',name:'保证函管理',prio:'plan'}
  ]},
  {id:'qc',name:'质量/检测管理',icon:'search',prio:'P4',children:[
    {id:'qc:submit',name:'送检记录'},
    {id:'qc:report',name:'检测结果报告'}
  ]},
  {id:'doc',name:'文档管理',icon:'folder',prio:'P2',children:[
    {id:'doc:public',name:'公共文档'},
    {id:'doc:mine',name:'我的文档'}
  ]},
  {id:'eq',name:'设备资源',icon:'tool',prio:'P3',children:[
    {id:'eq:list',name:'设备列表'},
    {id:'eq:cap',name:'设备能力'},
    {id:'eq:maint',name:'保养维护'},
    {id:'eq:spare',name:'零备件管理'}
  ]},
  /* 报表管理：BI 报表接入前的占位入口（无子菜单，直接进空态页） */
  {id:'rpt',name:'报表管理',icon:'chart',page:'rpt:home',prio:'plan'},
  {id:'bd',name:'基础数据',icon:'database',prio:'P2',children:[
    {id:'bd:mat',name:'原料管理',icon:'package',children:[
      {id:'bd:rawmat',name:'原料信息',prio:'P2'},
      {id:'bd:inv',name:'原料库存',prio:'todo'}
    ]},
    {id:'bd:sup',name:'供应商管理',icon:'folder',children:[
      {id:'bd:supplier',name:'原料供应商管理',prio:'P2'},
      {id:'bd:sup-data',name:'供应商原料数据',prio:'P2'}
    ]},
    {id:'bd:cas',name:'组分与合规',icon:'shield',children:[
      {id:'bd:comp',name:'组分基础信息',prio:'P1'},
      {id:'bd:comp-auto',name:'组分数据自动补全',prio:'P2'},
      {id:'bd:ghs',name:'GHS与受限属性',prio:'P2'}
    ]},
    {id:'bd:techcat',name:'关键技术分类',prio:'P2'},
    {id:'bd:formula',name:'内置计算公式',prio:'P2'},
    {id:'bd:exptpl',name:'实验模板',prio:'P2'},
    /* 理化性质配置：指标库（指标定义）+ 类别模板（按产品类别启用），产品详情页据此渲染 */
    {id:'bd:phys',name:'理化性质配置',icon:'flask',children:[
      {id:'bd:phys-lib',name:'指标库',prio:'P2'},
      {id:'bd:phys-tpl',name:'类别模板',prio:'P2'}
    ]}
  ]},
  {id:'prod',name:'产品管理',icon:'package',prio:'P2',children:[
    {id:'prod:list',name:'产品基础信息'}
  ]},
  {id:'ip',name:'知识产权',icon:'bulb',prio:'P3',children:[
    {id:'ip:km',name:'知识管理'},
    {id:'ip:right',name:'产权管理'}
  ]}
];

var PRIO_TXT={P0:'P0',P1:'P1',P2:'P2',P3:'P3',P4:'P4',plan:'规划中',todo:'暂不做'};

/* ---------- 侧栏线框图标 ---------- */
var NAV_ICON_PATHS={
  database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  package:'<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4.5 7.8 7.5 4.3 7.5-4.3M12 21v-8.9"/>',
  inbox:'<path d="M4 4h16v16H4z"/><path d="M4 14h4l2 3h4l2-3h4"/>',
  clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M8 9h8M8 13h8M8 17h5"/>',
  flask:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M8 15h8"/>',
  shield:'<path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  tool:'<path d="M14 6a4 4 0 0 0-5.2 5.2L3 17l4 4 5.8-5.8A4 4 0 0 0 18 10l-3 3-4-4z"/>',
  folder:'<path d="M3 6h7l2 2h9v11H3z"/>',
  bulb:'<path d="M9 18h6M10 22h4"/><path d="M8.2 15.5A7 7 0 1 1 15.8 15.5c-.9.7-.8 1.5-.8 2.5H9c0-1 .1-1.8-.8-2.5z"/>',
  file:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  chart:'<path d="M3 3v18h18"/><path d="M8 16v-5M13 16V7M18 16v-8"/>',
  circle:'<circle cx="12" cy="12" r="6"/>'
};
function navIcon(name){
  return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(NAV_ICON_PATHS[name]||NAV_ICON_PATHS.circle)+'</svg>';
}

/* ---------- 侧栏高亮锁定（详情/向导/子页不占侧栏） ---------- */
var HL_MAP={
  'exp:detail':'exp:list','exp:wizard':'exp:doe','exp:report':'exp:analysis','exp:best':'exp:analysis',
  'exp:sum-detail':'exp:sum','exp:sum-edit':'exp:sum',
  'proj:new':'proj:list','proj:detail':'proj:list','proj:app-detail':'proj:app',
  'bd:rawmat-detail':'bd:rawmat','doc':'doc:public',
  'prod:detail':'prod:list'
};
function baseOf(pageId){
  if(HL_MAP[pageId])return HL_MAP[pageId];
  if(pageId.indexOf('sds:')===0)return 'sds:list';      // A1：SDS 子页恒锁「SDS 文档列表」
  return pageId;
}

/* ---------- 页面注册表 ---------- */
var PAGES={};
function regPage(pageId,def){ PAGES[pageId]=def; }

/* ---------- 侧栏渲染 ---------- */
function renderSidebar(){
  var host=$('navScroll'); if(!host)return;
  var openSet={};
  try{ openSet=JSON.parse(localStorage.getItem('plm3_menu_open')||'{}'); }catch(e){ openSet={}; }
  var h='';
  MENU.forEach(function(g){
    if(g.page){
      h+='<button type="button" class="nav-item nav-root" data-go="'+esc(g.page)+'">'+
         '<i class="ico">'+navIcon(g.icon)+'</i><span class="nav-label">'+esc(g.name)+'</span></button>';
      return;
    }
    var rootKey='root_'+g.id;
    var rootOpen=openSet[rootKey]!==false;
    h+='<button type="button" class="nav-item nav-group nav-root'+(rootOpen?' open':'')+'" data-grp="'+rootKey+'">'+
       '<i class="ico">'+navIcon(g.icon)+'</i><span class="nav-label">'+esc(g.name)+'</span>'+
       '<i class="nav-arrow">›</i></button>';
    h+='<div class="nav-sub nav-root-sub'+(rootOpen?' open':'')+'" data-sub="'+rootKey+'">';
    (g.children||[]).forEach(function(c){
      var key=rootKey+'_'+c.id;
      if(c.children){
        var subOpen=openSet[key]!==false;
        h+='<button type="button" class="nav-item nav-group'+(subOpen?' open':'')+'" data-grp="'+key+'">'+
           '<i class="ico">'+navIcon(c.icon||'folder')+'</i><span class="nav-label">'+esc(c.name)+'</span>'+
           '<i class="nav-arrow">›</i></button>';
        h+='<div class="nav-sub'+(subOpen?' open':'')+'" data-sub="'+key+'">';
        c.children.forEach(function(cc){
          h+='<button type="button" class="nav-item" data-go="'+esc(cc.id)+'">'+
             '<i class="ico">'+navIcon(cc.icon||'circle')+'</i><span class="nav-label">'+esc(cc.name)+'</span></button>';
        });
        h+='</div>';
      }else{
        h+='<button type="button" class="nav-item" data-go="'+esc(c.id)+'">'+
           '<i class="ico">'+navIcon(c.icon||'circle')+'</i><span class="nav-label">'+esc(c.name)+'</span></button>';
      }
    });
    h+='</div>';
  });
  host.innerHTML=h;
  $$('[data-go]',host).forEach(function(b){
    b.onclick=function(){ showPage(this.getAttribute('data-go')); };
  });
  $$('[data-grp]',host).forEach(function(b){
    b.onclick=function(){
      var key=this.getAttribute('data-grp');
      var sub=host.querySelector('[data-sub="'+key+'"]');
      var nowOpen=this.classList.toggle('open');
      if(sub)sub.classList.toggle('open',nowOpen);
      try{
        var s=JSON.parse(localStorage.getItem('plm3_menu_open')||'{}');
        s[key]=nowOpen; localStorage.setItem('plm3_menu_open',JSON.stringify(s));
      }catch(e){}
    };
  });
}

function highlightSidebar(pageId){
  $$('#navScroll .nav-item').forEach(function(b){ b.classList.remove('active','active-parent'); });
  /* 注意：$ 是 getElementById，选择器查询必须用 $$ */
  var target=$$('#navScroll [data-go="'+pageId+'"]')[0];
  if(!target)return;
  target.classList.add('active');
  /* 自动展开完整父级路径，并以浅蓝色标出当前页面所属菜单 */
  var sub=target.closest('.nav-sub');
  while(sub){
    sub.classList.add('open');
    var grp=$$('#navScroll [data-grp="'+sub.getAttribute('data-sub')+'"]')[0];
    if(grp)grp.classList.add('open','active-parent');
    sub=sub.parentElement?sub.parentElement.closest('.nav-sub'):null;
  }
}

/* ---------- 面包屑 ---------- */
function setCrumb(pageId){
  var el=$('crumb'); if(!el)return;
  var parts=[];
  var p=PAGES[pageId];
  if(p&&p.crumb){
    parts=typeof p.crumb==='function'?p.crumb():(p.crumb.slice?p.crumb.slice():[p.crumb]);
  }
  else{
    /* 自动推导：模块名 / 页面名 */
    for(var i=0;i<MENU.length;i++){
      var g=MENU[i];
      if(g.page===pageId){ parts=[g.name]; break; }
      var found=null;
      (g.children||[]).forEach(function(c){
        if(c.id===pageId)found=[g.name,c.name];
        (c.children||[]).forEach(function(cc){ if(cc.id===pageId)found=[g.name,c.name,cc.name]; });
      });
      if(found){ parts=found; break; }
    }
  }
  var h='<a onclick="showPage(\'home\')">首页</a>';
  parts.forEach(function(t,i){
    var isHtml=typeof t==='string'&&t.indexOf('onclick=')>=0;
    h+='<span class="sep">/</span>'+(i===parts.length-1?(isHtml?t:'<b>'+esc(t)+'</b>'):t);
  });
  el.innerHTML=h;
}

/* ---------- 路由主函数 ---------- */
var curPage='',curParams={};
function showPage(pageId,params){
  var p=PAGES[pageId];
  if(!p){
    var host=$('pageHost');
    if(host)host.innerHTML=placeholder('🚧','页面未实现','pageId = <code>'+esc(pageId)+'</code> 尚未注册。');
    setCrumb(pageId); highlightSidebar(baseOf(pageId));
    return;
  }
  curPage=pageId; curParams=params||{};
  /* 1) 面包屑 + 标题 */
  setCrumb(pageId);
  document.title=(p.title||'PLM 3.0')+' · PLM 3.0';
  /* 2) 侧栏高亮（用锁定后的 base） */
  highlightSidebar(baseOf(pageId));
  /* 3) 渲染 */
  var host=$('pageHost');
  host.classList.remove('fade-in'); void host.offsetWidth; host.classList.add('fade-in');
  /* 若页面自己不负责容器（无 full 标记），先清空 */
  host.innerHTML='';
  p.render(curParams);
  /* 4) onShow：ECharts resize 等 */
  if(typeof p.onShow==='function')p.onShow(curParams);
  setTimeout(resizeAll,60);
  /* 5) hash + 滚动复位 */
  try{ history.replaceState(null,'','#'+pageId); }catch(e){}
  window.scrollTo(0,0);
}

/* ---------- 侧栏收起 ---------- */
function toggleNav(){
  document.body.classList.toggle('nav-collapsed');
  setTimeout(resizeAll,240);
}
