/* ==================================================================
   [27z9] 侧栏工具条：一键收起 / 展开全部菜单
   — 分片名须 < 28-js-boot.js（boot 在加载期就会渲染侧栏）
   — 零侵入：不改 22-js-router.js，通过包装 renderSidebar + 事件委托同步状态
   — 状态键沿用 plm3_menu_open（与单组折叠共用，刷新后保持）
   ================================================================== */
(function(){
  /* 所有可折叠分组的 key：一级 root_x + 二级 root_x_y（与 renderSidebar 命名一致） */
  function allMenuKeys(){
    var keys=[];
    (typeof MENU!=='undefined'?MENU:[]).forEach(function(g){
      if(g.page)return;
      var rk='root_'+g.id;
      keys.push(rk);
      (g.children||[]).forEach(function(c){ if(c.children)keys.push(rk+'_'+c.id); });
    });
    return keys;
  }
  function navHost(){ return document.getElementById('navScroll'); }

  /* 全部收起 = 所有分组都没有 open */
  function allMenuCollapsed(){
    var host=navHost(); if(!host)return false;
    var gs=host.querySelectorAll('[data-grp]');
    if(!gs.length)return false;
    for(var i=0;i<gs.length;i++){ if(gs[i].classList.contains('open'))return false; }
    return true;
  }
  /* 按钮文案 / 箭头 / title 跟随实际折叠状态 */
  function syncNavToggleAll(){
    var b=document.getElementById('navToggleAll'); if(!b)return;
    var collapsed=allMenuCollapsed();
    b.classList.toggle('is-collapsed',collapsed);
    var t=document.getElementById('navToggleAllTxt');
    if(t)t.textContent=collapsed?'展开全部菜单':'收起全部菜单';
    b.setAttribute('title',collapsed?'一键展开所有菜单':'一键收起所有菜单');
    b.setAttribute('aria-expanded',collapsed?'false':'true');
  }
  function setAllMenu(open){
    var keys=allMenuKeys(),s={};
    try{ s=JSON.parse(localStorage.getItem('plm3_menu_open')||'{}'); }catch(e){ s={}; }
    keys.forEach(function(k){ s[k]=!!open; });
    try{ localStorage.setItem('plm3_menu_open',JSON.stringify(s)); }catch(e){}
    var host=navHost(); if(!host)return;
    keys.forEach(function(k){
      var g=host.querySelector('[data-grp="'+k+'"]');
      var sub=host.querySelector('[data-sub="'+k+'"]');
      if(g)g.classList.toggle('open',!!open);
      if(sub)sub.classList.toggle('open',!!open);
    });
    syncNavToggleAll();
  }
  /* 全收起 → 展开全部；否则 → 全部收起 */
  function toggleAllMenu(){ setAllMenu(allMenuCollapsed()); }

  window.allMenuCollapsed=allMenuCollapsed;
  window.setAllMenu=setAllMenu;
  window.toggleAllMenu=toggleAllMenu;
  window.syncNavToggleAll=syncNavToggleAll;

  /* 渲染完侧栏后同步按钮文案（包装，不改原函数体） */
  if(typeof window.renderSidebar==='function'){
    var orig=window.renderSidebar;
    window.renderSidebar=function(){
      var r=orig.apply(this,arguments);
      syncNavToggleAll();
      return r;
    };
  }
  /* highlightSidebar 会自动展开当前页父级路径，同样影响整体状态 */
  if(typeof window.highlightSidebar==='function'){
    var origHL=window.highlightSidebar;
    window.highlightSidebar=function(){
      var r=origHL.apply(this,arguments);
      syncNavToggleAll();
      return r;
    };
  }
  /* 单组折叠 / 跳转页面后自动展开父级，都会改变整体状态 —— 统一在点击后同步 */
  document.addEventListener('click',function(ev){
    if(ev.target&&ev.target.closest&&ev.target.closest('#navScroll')){
      setTimeout(syncNavToggleAll,0);
    }
  },true);

  /* 兜底同步：即便分片被挪到 boot 之后加载，首屏文案也不会错 */
  syncNavToggleAll();
})();
