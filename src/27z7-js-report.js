/* ==================================================================
   [27z7] 报表管理（一级菜单占位页）
   — 分片名须 < 28-js-boot.js：否则用 #rpt:home 直接打开时页面尚未注册
   — 2026-09-15：菜单挂在「设备资源」之后，无子菜单，直接进本页
   — 当前为 BI 接入前的空态：不编造报表数据，只说明用途与后续能力
   — 后续 BI 对接后，在此挂载真实报表（或改为 children 展开多个报表入口）
   ================================================================== */
regPage('rpt:home',{
  title:'报表管理',crumb:['报表管理'],
  render:function(){
    var h='';
    h+='<div class="page-hd"><div class="t">'+
       '<h1>报表管理</h1>'+
       '<div class="page-sub">统一承载 BI 报表与统计看板 · 数据源接入中</div>'+
       '</div></div>';

    h+='<div class="notice notice-info"><i class="ni">ℹ</i><div>'+
       '本模块为 BI 报表预留入口。待 BI 系统完成对接后，各类报表在此统一查看与订阅；'+
       '当前尚未接入数据源，暂无可展示的报表。'+
       '</div></div>';

    /* ---- 空态 ---- */
    h+='<div class="card" style="margin-bottom:16px"><div class="card-b">'+
       '<div style="text-align:center;padding:46px 20px">'+
       '<div style="font-size:40px;line-height:1;color:#c2cbd6">▤</div>'+
       '<div style="margin-top:14px;font-size:15px;font-weight:600;color:var(--text)">暂无已接入的报表</div>'+
       '<div class="muted" style="margin-top:6px;font-size:13px">'+
       '报表由 BI 侧统一生产，接入后按角色授权可见'+
       '</div>'+
       '</div></div></div>';

    /* ---- 接入后支持的能力（说明性，非承诺排期） ---- */
    h+='<div class="card"><div class="card-hd">'+
       '<h3>接入后的使用方式</h3><span class="sub">随 BI 对接进度开放</span></div>'+
       '<div class="card-b">'+
       '<div class="tbl-wrap"><table class="tbl">'+
       '<thead><tr><th style="width:180px">能力</th><th>说明</th><th style="width:90px">状态</th></tr></thead><tbody>'+
       [
         ['报表查看','在 PLM 内直接打开 BI 报表，免二次登录','待接入'],
         ['维度下钻','按项目 / 实验 / 产品 / 时间段下钻到明细','待接入'],
         ['订阅推送','按角色订阅，定期推送至站内与邮件','待接入']
       ].map(function(r){
         return '<tr><td><b>'+esc(r[0])+'</b></td><td class="muted">'+esc(r[1])+'</td>'+
                '<td><span class="tag">'+esc(r[2])+'</span></td></tr>';
       }).join('')+
       '</tbody></table></div>'+
       '</div></div>';

    $('pageHost').innerHTML=h;
  }
});
