/* ==================================================================
   [23b] SDS · 章节内容增强（G2 / G3 / G4 / G13 …）

   本分片承载 SDS 各章节内容的后续增强代码。
   原因：23-js-sds.js 已达 3485 行 / 196 个函数，继续往里堆会失控。
   约定：新增章节内容一律写在这里，23-js-sds.js 只保留必要的调用钩子。
   ================================================================== */

/* ==================================================================
   G2 · 第 3 章组分表（真表格）

   真实 SDS 第 3 章是表格而非文本行。列对齐示例文档：
     Chemical Name / Registration No. / CAS No. / EC No.
     / Concentration / Classification / SCL·M-Factors·ATE

   身份字段来自组分库 DB_CFG.component；分类参数经 clpParamOf() 读取统一物质画像，
   SDS 内只读引用 —— 与 M 因子专项的口径一致，不在编制 SDS 时就地改。
   ================================================================== */
function compTableHtml(){
  var dv=wz.view==='deliver';
  if(!wz.formula.length){
    return '<div style="padding:10px 14px;color:var(--muted);font-size:12.5px">'
      +'　（配方尚未录入，组分表待生成）</div>';
  }
  var tr=wz.formula.map(function(f){
    var r=DB_CFG.component.rows.filter(function(x){return x.cas===f.cas;})[0]||{};
    var q=clpParamOf(f.cas);
    /* 保密组分按区间披露浓度，且不暴露精确值 */
    var conc=f.secret?concRange(f.conc):(f.conc+' %');
    var extra=[];
    if(q.scl&&q.scl!=='—')extra.push('SCL：'+q.scl);
    if(q.m&&q.m!=='—')extra.push('M 因子：'+q.m+'（'+q.mSrcTxt+'）');
    if(q.ate&&q.ate!=='—')extra.push('ATE：'+q.ate);
    var noCls=(q.uni==='未维护统一分类'||q.uni==='—');
    return '<tr>'
      +'<td><b>'+esc(f.name)+'</b>'
        +(f.secret&&!dv?' <span class="tag purple">保密</span>':'')+'</td>'
      +'<td class="mono">'+esc(f.cas||'—')+'</td>'
      +'<td class="mono">'+esc(r.ec||'—')+'</td>'
      +'<td class="mono" style="font-size:11.5px">'+esc(r.reachNo||'N/A')+'</td>'
      +'<td class="ctr">'+esc(conc)
        /* 「区间披露」是内部系统口径提示，真实 SDS 交付件只给区间数值本身 */
        +(f.secret&&!dv?'<br><small style="color:var(--muted)">区间披露</small>':'')+'</td>'
      +'<td style="font-size:11.5px">'
        +(wz.project.market==='CN'?'<span class="muted">中国 GHS 分类需人工核对</span>':noCls?'<span class="muted">Not available</span>':esc(q.uni))+'</td>'
      +'<td style="font-size:11.5px">'
        +(wz.project.market==='CN'?'<span class="muted">不引用欧盟 CLP 参数</span>':extra.length?extra.map(esc).join('<br>'):'<span class="muted">N/A</span>')+'</td>'
      +'</tr>';
  }).join('');
  return '<div class="tbl-wrap" style="margin:0 0 10px">'
    +'<table class="tbl mini"><thead><tr>'
      +'<th style="width:140px">物质名称</th>'
      +'<th style="width:96px">CAS 号</th>'
      +'<th style="width:96px">EC 号</th>'
      +'<th style="width:150px">REACH 注册号</th>'
      +'<th style="width:86px">浓度</th>'
      +'<th style="width:160px">分类</th>'
      +'<th>SCL / M 因子 / ATE</th>'
    +'</tr></thead><tbody>'+tr+'</tbody></table></div>';
}

/* ==================================================================
   G3 · 第 8 章职业接触限值（OEL）表 + 8.2 暴露控制补全

   修复前：第 8 章只有两行硬编码文本，写的是「乙二醇单丁醚 20 ppm / 甲醛 0.3 ppm」，
   与当前配方无关 —— 是别的产品的数据，演示时会被懂行的当场看穿。

   阶段 6：按市场与投放日期从 OEL_SETS / OEL_LIMITS 读取，
   保留原始类型、单位和长期/短期/上限槽位，不推导缺失值。
   8.1.2 附加限值、8.1.3 DNEL/PNEC 按法规要求留位；8.2 补齐热危害与环境暴露控制。
   ================================================================== */
function oelTableHtml(){
  if(!wz.formula.length){
    return '<div style="padding:10px 14px;color:var(--muted);font-size:12.5px">'
      +'　（配方尚未录入，接触限值表待生成）</div>';
  }
  var p=wz.project||{},result=complianceEvaluationCurrent().results.oel;
  var tr=(result.rows||[]).map(function(r){
    var l=r.limit,c=r.component;
    return '<tr><td>'+esc(result.region)+'</td><td><b>'+esc(c.name)+'</b></td>'+
      '<td class="mono">'+esc(c.ec||'—')+'</td><td class="mono">'+esc(c.cas)+'</td>'+
      '<td>'+esc(l.type||'—')+'</td><td>'+esc(l.twa||'—')+'</td><td>'+esc(l.stel||'—')+'</td>'+
      '<td>'+esc(l.ceiling||'—')+'</td><td>'+esc(l.unit||'—')+'</td>'+
      '<td>'+esc([l.skin==='是'?'皮肤':'',l.sensitization==='是'?'致敏':''].filter(Boolean).join(' / ')||'—')+'</td>'+
      '<td>'+esc([l.biologicalMonitoring,l.other,l.scope,l.note].filter(function(x){return x&&x!=='—';}).join('；')||'—')+'</td>'+
      '<td>'+esc(r.source.version)+'</td></tr>';
  });
  (result.missingComponents||[]).forEach(function(c){
    tr.push('<tr><td>'+esc(result.region||'—')+'</td><td>'+esc(c.name)+'</td><td>'+esc(c.ec||'—')+'</td>'+
      '<td>'+esc(c.cas)+'</td><td colspan="8">当前有效 OEL 数据集未维护该组分限值</td></tr>');
  });
  if(result.status==='DATASET_UNAVAILABLE')tr=['<tr><td colspan="12">目标市场暂无已发布且已生效的 OEL 数据集</td></tr>'];
  return '<div class="tbl-wrap" style="margin:0 0 10px">'
    +'<table class="tbl mini"><thead><tr>'
      +'<th>国家 / 地区</th><th>物质</th><th>EC</th><th>CAS</th><th>原始限值类型</th>'+
      '<th>长期限值</th><th>短期限值</th><th>上限值</th><th>单位</th><th>皮肤 / 致敏</th><th>备注</th><th>数据版本</th>'+
    '</tr></thead><tbody>'+tr.join('')+'</tbody></table>'+
    '<div class="muted" style="font-size:11.5px;margin-top:6px">'+
    (result.dataset?'数据集：'+esc(result.dataset.source)+' · '+esc(result.dataset.version)+' · 生效 '+esc(result.dataset.effectiveFrom):
      '目标市场暂无已发布且已生效的 OEL 数据集')+'</div></div>';
}
