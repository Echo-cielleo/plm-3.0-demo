/* ==================================================================
   [27z7] 报表管理（一级菜单页）
   — 分片名须 < 28-js-boot.js：否则用 #rpt:home 直接打开时页面尚未注册
   — 2026-09-29：由「BI 接入前空态」改为最小可用报表中心
     口径：所有数字都从各业务模块的真实数据实时统计，不编造；
           报表条目点击后跳到对应业务页面看明细。
     BI 对接完成后，在此挂载 BI 报表（或改为 children 展开多个入口）。
   ================================================================== */
/* 安全计数：任一数据源结构变化都不至于让整页白屏 */
function rptCount(arr,fn){
  try{return (Array.isArray(arr)?arr:[]).filter(fn).length;}catch(e){return 0;}
}
function rptPage(){
  var inProgress=rptCount(PROJECTS,function(p){
    return ['交付','推广'].indexOf(p.stage)<0;
  });
  var sdsTodo=rptCount(SDS_ROWS,function(s){
    return ['编制中','审核中','待改版'].indexOf(s.status)>=0;
  });
  var stgTodo=rptCount(MAT_STAGING,function(r){return r.status!=='已关联';});
  var matCnt=(function(){try{return Object.keys(DB_CFG.material||{}).length;}catch(e){return 0;}})();
  var expCnt=(function(){try{return Array.isArray(experiments)?experiments.length:0;}catch(e){return 0;}})();

  var h='';
  h+='<div class="page-hd"><div class="t">'+
     '<h1>报表管理</h1>'+
     '<div class="page-sub">各业务模块的实时统计汇总 · 数据截止 '+esc(demoYmd())+'</div>'+
     '</div></div>';

  h+='<div class="notice notice-info"><i class="ni">ℹ</i><div>'+
     '本页统计口径取自 PLM 内各业务模块的当前数据，点报表名称可直接进入对应页面查看明细。'+
     'BI 系统对接后，企业级报表与订阅推送将在此统一挂载。'+
     '</div></div>';

  /* ---- 概览四卡 ---- */
  var kpis=[
    [inProgress,'在研项目','个','阶段处于预研 / 小试 / 中试的项目'],
    [expCnt,'实验记录','条','实验管理模块已登记的实验'],
    [sdsTodo,'SDS 待办','份','编制中 / 审核中 / 待改版'],
    [stgTodo,'暂存区待处理','条','原料暂存区未完成的记录']
  ];
  h+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">';
  kpis.forEach(function(k){
    h+='<div class="card" style="margin:0"><div class="card-b">'+
       '<div style="font-size:26px;font-weight:700;line-height:1.1">'+k[0]+
       '<span style="font-size:13px;font-weight:400;color:var(--muted);margin-left:3px">'+k[2]+'</span></div>'+
       '<div style="font-size:13px;font-weight:600;margin-top:4px">'+esc(k[1])+'</div>'+
       '<div class="muted" style="font-size:11.5px;margin-top:2px">'+esc(k[3])+'</div>'+
       '</div></div>';
  });
  h+='</div>';

  /* ---- 报表清单 ---- */
  var rows=[
    ['研发项目进度','按阶段 / 负责人统计在研项目与节点完成情况',
      '项目 '+PROJECTS.length+' 个','proj:list'],
    ['实验台账','按项目、模板与状态统计实验记录与结论',
      '实验 '+expCnt+' 条','exp:list'],
    ['SDS 合规台账','按状态、目标市场、法规版本统计 SDS 文档',
      'SDS '+SDS_ROWS.length+' 份（待办 '+sdsTodo+'）','sds:list'],
    ['原料与暂存区','原料台账 + OA / NCC 同步暂存区待处理项',
      '原料 '+matCnt+' 项（暂存待处理 '+stgTodo+' 条）','bd:rawmat'],
    ['受限物质符合性','受限物质清单与产品配方的符合性结论',
      '按受限物质清单页当前数据','subst:list'],
    ['法规版本跟踪','各法规库当前生效版本与导入批次',
      'CLP / REACH / OEL / 国内 / ZDHC','law:reach']
  ];
  h+='<div class="card"><div class="card-hd">'+
     '<h3>常用报表</h3><span class="sub">点击「查看」进入对应页面看明细</span></div>'+
     '<div class="card-b"><div class="tbl-wrap"><table class="tbl">'+
     '<thead><tr><th style="width:160px">报表</th><th>统计口径</th>'+
     '<th style="width:220px">当前覆盖数据</th><th style="width:80px">操作</th></tr></thead><tbody>';
  rows.forEach(function(r){
    h+='<tr><td><b>'+esc(r[0])+'</b></td><td class="muted">'+esc(r[1])+'</td>'+
       '<td style="font-size:12px">'+esc(r[2])+'</td>'+
       '<td><button class="btn btn-sm" onclick="showPage(\''+r[3]+'\')">查看</button></td></tr>';
  });
  h+='</tbody></table></div></div></div>';

  /* ---- BI 接入后的能力（说明性，非排期承诺） ---- */
  h+='<div class="card"><div class="card-hd">'+
     '<h3>BI 对接后的扩展能力</h3><span class="sub">随对接进度开放</span></div>'+
     '<div class="card-b"><div class="tbl-wrap"><table class="tbl">'+
     '<thead><tr><th style="width:180px">能力</th><th>说明</th><th style="width:90px">状态</th></tr></thead><tbody>'+
     [
       ['报表查看','在 PLM 内直接打开 BI 报表，免二次登录','待接入'],
       ['维度下钻','按项目 / 实验 / 产品 / 时间段下钻到明细','待接入'],
       ['订阅推送','按角色订阅，定期推送至站内与邮件','待接入']
     ].map(function(r){
       return '<tr><td><b>'+esc(r[0])+'</b></td><td class="muted">'+esc(r[1])+'</td>'+
              '<td><span class="tag">'+esc(r[2])+'</span></td></tr>';
     }).join('')+
     '</tbody></table></div></div></div>';

  $('pageHost').innerHTML=h;
}
regPage('rpt:home',{
  title:'报表管理',crumb:['报表管理'],
  render:rptPage
});
