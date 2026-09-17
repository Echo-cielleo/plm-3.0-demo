/* ==================================================================
   [28] 启动初始化
   ================================================================== */
/* DOE 方案须先于实验记录：运行记录由「已下发」方案按试验矩阵生成 */
seedDoeSchemes();
seedExperiments();
/* 实验分析与总结：引用已有实验，须在 experiments 之后 */
if(typeof seedExpSummaries==='function')seedExpSummaries();
/* 基础数据打通：补录物料、建立物料 ↔ 供应商 / 批次 / 配方 关联（须在 DB_CFG 与种子数据之后） */
if(typeof matLinkAll==='function')matLinkAll();

/* ==================================================================
   组件调试台（dev:kit）
   — S0 阶段的 home 自检页改造而来
   — 不占侧栏菜单，仅通过 #dev:kit 访问
   — 注意：本分片在 26 之后加载，绝不可再注册 home，
     否则会覆盖 26-js-pages-a.js 中的真实工作台
   ================================================================== */
regPage('dev:kit',{
  title:'组件调试台',
  crumb:['组件调试台'],
  render:function(){
    var h='';
    h+='<div class="page-hd"><div class="t">'+
       '<h1>组件调试台</h1>'+
       '<div class="page-sub">内部调试页 · 不出现在侧栏菜单 · 通过 <code>#dev:kit</code> 访问</div>'+
       '</div></div>';
    h+='<div class="notice notice-info"><i class="ni">ℹ</i><div>'+
       '用于验证地基组件（toast / modal / confirm / tabs / chart）与全页面可达性。'+
       '演示时无需向用户展示本页。</div></div>';

    /* ---- 组件自检 ---- */
    h+='<div class="card" style="margin-bottom:16px"><div class="card-hd">'+
       '<h3>🧩 公共组件自检</h3><span class="sub">toast / modal / confirm / download</span></div>'+
       '<div class="card-b"><div class="flex flex-wrap">'+
       '<button class="btn btn-primary" onclick="toast(\'操作成功\',\'ok\')">toast ok</button>'+
       '<button class="btn" onclick="toast(\'警告提示\',\'warn\')">toast warn</button>'+
       '<button class="btn" onclick="toast(\'发生错误\',\'err\')">toast err</button>'+
       '<button class="btn" onclick="toast(\'普通提示\',\'info\')">toast info</button>'+
       '<button class="btn" onclick="openModal({title:\'Modal 标题\',body:\'<p>正文内容</p>\'})">openModal</button>'+
       '<button class="btn btn-danger" onclick="confirmBox(\'危险操作\',\'确定要删除吗？此操作不可撤销。\',function(){toast(\'已删除\',\'ok\')},{okText:\'确认删除\',danger:true})">confirmBox</button>'+
       '<button class="btn" onclick="downloadFile(\'debug.txt\',\'PLM 3.0 调试导出\n生成时间：\'+nowStr(),\'text/plain\')">downloadFile</button>'+
       '</div></div></div>';

    /* ---- ECharts 自检 ---- */
    h+='<div class="card" style="margin-bottom:16px"><div class="card-hd">'+
       '<h3>📊 ECharts 自检</h3><span class="sub">内联图表引擎</span></div>'+
       '<div class="card-b"><div id="chTest" class="chart-canvas" style="height:220px"></div></div></div>';

    /* ---- 页面注册清单 ---- */
    var keys=Object.keys(PAGES).sort();
    h+='<div class="card"><div class="card-hd">'+
       '<h3>🧭 页面注册清单</h3><span class="sub">共 '+keys.length+' 个已注册页面</span></div>'+
       '<div class="card-b"><div class="flex flex-wrap" style="gap:6px">';
    keys.forEach(function(k){
      h+='<button class="btn btn-sm" onclick="showPage(\''+k+'\')">'+esc(k)+'</button>';
    });
    h+='</div></div></div>';

    $('pageHost').innerHTML=h;
    chart('chTest',{
      tooltip:{trigger:'axis'},
      xAxis:{type:'category',data:['温度80','温度100','温度120']},
      yAxis:{type:'value'},
      series:[{type:'line',data:[78.5,85.1,91.2],smooth:true,symbolSize:8,
               itemStyle:{color:'#1677ff'},areaStyle:{color:'rgba(22,119,255,.12)'}}]
    });
  }
});

/* ---------- 启动 ---------- */
(function boot(){
  renderSidebar();
  var start='home';
  var hash=(location.hash||'').replace(/^#/,'');
  if(hash&&PAGES[hash])start=hash;
  showPage(start);
})();
