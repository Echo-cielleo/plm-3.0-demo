/* ==================================================================
   合规管理 · 保证函管理（G16 · 领导评审 2026-09-10，P4 规划中）
   业务场景：客户要求出具产品保证函，声明产品是否含有某类受限物质。
   数据来源：产品外检记录（质量/检测管理）+ 法规库命中状态（合规管理）。
   ================================================================== */
var GUARANTEES=[
  {no:'GR-2026-006',product:'皮革涂饰光亮剂 GL-9',cat:'不含 REACH SVHC 233 项',date:'2026-09-02',status:'已出具'},
  {no:'GR-2026-005',product:'水性聚氨酯涂饰树脂 WPU-320',cat:'不含 APEO（ZDHC MRSL）',date:'2026-08-18',status:'已出具'},
  {no:'GR-2026-007',product:'加脂剂 L-27',cat:'甲醛 ≤ 300 mg/kg（OEKO-TEX 限量）',date:'—',status:'起草中'}
];
var GUARANTEE_ST={'已出具':'tag-green','起草中':'tag-orange','已作废':'tag-grey'};

regPage('comp:guarantee',{
  title:'保证函管理',crumb:['合规管理','<b>保证函管理</b>'],
  render:function(){
    $('pageHost').innerHTML=
      '<div class="page-hd"><div class="t"><h1>保证函管理</h1>'+
      '<div class="page-sub">本模块在本期原型中标记为「规划中」</div></div></div>'+
      '<div class="card"><div class="card-b">'+
      placeholder('🛡','保证函管理 · 规划中',
        '客户在订单或验厂环节常要求供应商出具<b>产品保证函</b>，正式声明产品中是否含有某类受限物质（如 REACH SVHC、APEO、甲醛、富马酸二甲酯等）。<br><br>'+
        '本模块规划要点：<br><br>'+
        '① <b>数据来源</b>——保证函内容自动取自<b>产品外检记录</b>（质量/检测管理 · 第三方检测结论）与<b>法规库命中状态</b>（合规管理 · 受限物质清单比对），避免人工二次誊抄；<br>'+
        '② <b>声明范围</b>——按客户要求选择声明物质类别与限量口径，生成中英文对照版本；<br>'+
        '③ <b>留痕追溯</b>——每份保证函记录出具依据的外检报告编号与法规版本，法规更新时自动提示受影响的已出具函件。<br><br>'+
        '示意数据如下（正式功能本期不实现）')+
      '<div style="margin-top:18px"><div class="muted" style="font-size:12.5px;margin-bottom:8px">示意台账</div>'+
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>'+
      '<th style="width:130px">保证函编号</th><th>产品</th><th>声明物质类别</th>'+
      '<th style="width:110px">出具日期</th><th style="width:90px">状态</th></tr></thead><tbody>'+
      GUARANTEES.map(function(g){
        return '<tr><td class="mono">'+esc(g.no)+'</td><td>'+esc(g.product)+'</td>'+
               '<td>'+esc(g.cat)+'</td>'+
               '<td>'+(g.date==='—'?'<span class="muted">—</span>':esc(g.date))+'</td>'+
               '<td><span class="tag '+(GUARANTEE_ST[g.status]||'tag-grey')+'">'+esc(g.status)+'</span></td></tr>';
      }).join('')+
      '</tbody></table></div></div>'+
      '</div></div>';
  }
});
