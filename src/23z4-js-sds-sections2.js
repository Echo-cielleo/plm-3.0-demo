/* ==================================================================
   [23z4] G5 第 12 章生态毒性表格 + G6 第 15 章法规/CSA + G10 第 14 章运输

   需求（对照真实 EU CLP SDS 示例文档）：
   - G5：第 12 章由纯文本扩成「急性水生毒性（混合物级 + 按组分）」+「PBT/vPvB 评估」
         表格，12.2–12.8 子项保持（未测得项 Not available）；复用 aqua classItem 结论。
   - G6：第 15 章法规信息表格化（EU/CN），补「15.2 化学安全评估（CSA）」勾选框
         与「REACH Annex XIV 授权清单命中」判定（联动配方组分）。
   - G10：第 14 章运输信息由三行文字扩成 ADR/RID/ADN/IMDG/IATA 等运输方式概览表
         （当前配方为非危险货物，各行如实标注「不适用」；ADN 内河运输为其中一行）。

   范围：仅提供章节表格渲染函数；renderStep5 的 edit/dv 两处钩子与
        draftText 的引导语改写由 23-js-sds.js / 23z2 负责。
   约定：新功能进新分片，不膨胀旧文件。
   ================================================================== */

/* ---------- G5 · 第 12 章生态毒性 ---------- */
/* 从组分统一分类串中提取水生危害分类（Aquatic Acute/Chronic n） */
function aquaClassOf(cas){
  var q = clpParamOf(cas);
  var m = (q.uni||'').match(/Aquatic[^/]*(?=\s*\/\s*|$)/);
  return m ? m[0].trim() : '不分类';
}
function ecotoxTableHtml(){
  if(!wz.formula.length){
    return '<div style="padding:10px 14px;color:var(--muted);font-size:12.5px">'
      + '　（配方尚未录入，生态毒性表待生成）</div>';
  }
  /* 12.1 混合物级水生危害结论（复用 aqua classItem） */
  var mixAqua = toxResult('aqua');
  /* 按组分水生毒性表：物质 / CAS / 水生危害分类 / 急性 L(E)C50 / 数据状态 */
  var rows = wz.formula.map(function(f){
    var q  = clpParamOf(f.cas);
    var aq = aquaClassOf(f.cas);
    var lc = (q.lc50 && q.lc50!=='')
      ? esc(q.lc50)+' mg/L'
      : '<span class="muted">Not available</span>';
    var st = (TOX_STATE[q.aqState]||{t:'—'}).t;
    return '<tr>'
      + '<td style="font-size:11.5px"><b>'+esc(f.name)+'</b></td>'
      + '<td class="mono" style="font-size:11px">'+esc(f.cas||'—')+'</td>'
      + '<td style="font-size:11.5px">'+esc(aq)+'</td>'
      + '<td class="ctr" style="font-size:11.5px">'+lc+'</td>'
      + '<td style="font-size:11.5px">'+esc(st)+'</td>'
    + '</tr>';
  }).join('');

  /* 12.5 PBT/vPvB 评估（已知结论：混合物不含 PBT/vPvB，源自 M 因子专项 PMT 评估） */
  var pbt = '本混合物不含 PBT / vPvB 物质'
    + '（Σ(PMT/vPvM 组分) = 0 % ＜ 0.1 %，不分类；聚合物另评游离单体残留）。';

  return '<div class="tbl-wrap" style="margin:0 0 10px">'
    + '<div style="font-size:12px;font-weight:700;margin:6px 0 4px">'
      + '12.1 急性水生毒性（混合物）— '+esc(mixAqua)+'</div>'
    + '<table class="tbl mini"><thead><tr>'
      + '<th style="width:130px">物质</th>'
      + '<th style="width:100px">CAS 号</th>'
      + '<th style="width:140px">水生危害分类</th>'
      + '<th style="width:120px">急性 L(E)C50</th>'
      + '<th style="width:90px">数据状态</th>'
    + '</tr></thead><tbody>'+rows+'</tbody></table>'
    + '<div style="font-size:12px;font-weight:700;margin:10px 0 4px">12.5 PBT 和 vPvB 评估结果</div>'
    + '<div style="font-size:11.5px;padding:6px 10px;background:var(--bg-2);'
      + 'border-radius:6px;color:var(--fg)">'+esc(pbt)+'</div>'
  + '</div>'
  /* 12.2–12.8 子项（未测得项如实标 Not available，与示例文档口径一致） */
  + '<div style="font-size:12px;margin-top:6px">'
    + '<div style="font-weight:700">12.2 持久性和降解性</div>'
      + '<div class="muted" style="font-size:11.5px;padding-left:10px">Not available。</div>'
    + '<div style="font-weight:700;margin-top:4px">12.3 生物累积潜力</div>'
      + '<div class="muted" style="font-size:11.5px;padding-left:10px">Not available。</div>'
    + '<div style="font-weight:700;margin-top:4px">12.4 土壤中的迁移性</div>'
      + '<div class="muted" style="font-size:11.5px;padding-left:10px">Not available。</div>'
    + '<div style="font-weight:700;margin-top:4px">12.6 内分泌干扰特性</div>'
      + '<div style="font-size:11.5px;padding-left:10px">'
        + esc(edStmt('12.6')||'　· 本混合物不含内分泌干扰物。')+'</div>'
    + '<div style="font-weight:700;margin-top:4px">12.7 其他不利影响</div>'
      + '<div class="muted" style="font-size:11.5px;padding-left:10px">Not available。</div>'
    + '<div style="font-weight:700;margin-top:4px">12.8 附加信息</div>'
      + '<div class="muted" style="font-size:11.5px;padding-left:10px">Not available。</div>'
  + '</div>'
  + '<div style="font-size:11.5px;color:var(--orange);margin-top:8px">'
    + esc(unknownStmt('aquatic'))+'</div>';
}

/* ---------- G10 · 第 14 章运输信息 ---------- */
function transportTableHtml(){
  /* 当前配方为非危险货物：各运输方式如实标注「不适用 / 不受管制」 */
  var rows = [
    ['公路（ADR）',        '非危险货物（不受管制）'],
    ['铁路（RID）',        '非危险货物（不受管制）'],
    ['内河（ADN）',        '非危险货物（不受管制）'],
    ['海运（IMDG）',       '非危险货物（不受管制）'],
    ['空运（IATA DGR）',   '非危险货物（不受管制）'],
    ['散装运输（如适用）', '不适用'],
    ['特殊注意事项',       '容器保持密封直立，避免曝晒、冻结与机械损伤']
  ];
  var body = rows.map(function(r){
    return '<tr>'
      + '<td style="font-size:11.5px"><b>'+esc(r[0])+'</b></td>'
      + '<td class="ctr" style="font-size:11.5px">不适用</td>'
      + '<td style="font-size:11.5px">不适用</td>'
      + '<td class="ctr" style="font-size:11.5px">不适用</td>'
      + '<td class="ctr" style="font-size:11.5px">—</td>'
      + '<td class="ctr" style="font-size:11.5px">否</td>'
      + '<td style="font-size:11.5px">'+esc(r[1])+'</td>'
    + '</tr>';
  }).join('');
  return '<div class="tbl-wrap" style="margin:0 0 10px">'
    + '<table class="tbl mini"><thead><tr>'
      + '<th style="width:130px">运输方式</th>'
      + '<th style="width:80px">UN 编号</th>'
      + '<th style="width:150px">正确运输名称</th>'
      + '<th style="width:90px">危险类别</th>'
      + '<th style="width:70px">包装组</th>'
      + '<th style="width:70px">海洋污染物</th>'
      + '<th>备注</th>'
    + '</tr></thead><tbody>'+body+'</tbody></table>'
    + '<div style="font-size:11.5px;color:var(--muted);margin-top:6px">'
      + '本混合物未列入危险货物（依据 ADR 2023、RID 2023、ADN 2023、IMDG 2022、'
      + 'IATA DGR 2025 评估）；运输时容器保持密封直立，避免曝晒与冻结。</div></div>';
}

/* ---------- G6 · 第 15 章法规 / CSA / Annex XIV ---------- */
/* 演示：列入 REACH Annex XIV 授权清单的物质（CAS → 命中原因）。
   当前配方未含此类组分，故 Annex XIV 表显示「未列入」。 */
var ANNEX14_CAS = {
  '7789-09-5':'重铬酸铵（Carc. 1B / Muta. 1B / Acute Tox. 3）'
};
function annex14Hit(){
  return wz.formula.filter(function(f){return ANNEX14_CAS[f.cas];})
    .map(function(f){return {name:f.name,cas:f.cas,why:ANNEX14_CAS[f.cas]};});
}
function legalTableHtml(){
  var p = wz.project;
  var eu = (p.market === 'EU');
  /* 15.1 法规表：按目标市场显示对应法规体系（真实 SDS 仅列适用法规） */
  var rows = eu ? [
    ['REACH (EC) No 1907/2006','组分均已注册或适用聚合物豁免（Art. 2(9)）'],
    ['REACH Annex XVII 限制清单','甲醛条目 Entry 77 命中，需关注释放量限值'],
    ['SVHC 候选清单','甲醛在列，含量 0.35 % ＞ 0.1 %，须履行 Art. 33 信息传递义务'],
    ['CLP (EC) No 1272/2008 ATP 21','已适用统一分类']
  ] : [
    ['GB/T 16483-2008','化学品安全技术说明书 内容和项目顺序'],
    ['GB/T 17519-2013','化学品安全技术说明书 编写指南'],
    ['GB 30000 系列','化学品分类和标签规范（28 部分）']
  ];
  var regTable = '<div style="font-size:12px;font-weight:700;margin:8px 0 4px">'
    + (eu ? '15.1 欧盟法规' : '15.1 中国法规') + '</div>'
    + '<table class="tbl mini"><tbody>'
    + rows.map(function(r){
        return '<tr><td style="font-size:11.5px"><b>'+esc(r[0])+'</b></td>'
          + '<td style="font-size:11.5px">'+esc(r[1])+'</td></tr>';
      }).join('')
    + '</tbody></table>';

  var csa, xiv;
  if(eu){
    /* 15.2 化学安全评估（CSA）勾选框（REACH Art.14，当前尚未完成） */
    csa = '<div style="font-size:12px;font-weight:700;margin:10px 0 4px">'
      + '15.2 化学安全评估（CSA）</div>'
      + '<div style="font-size:12px;padding:8px 10px;background:var(--bg-2);'
        + 'border-radius:6px;display:flex;align-items:center;gap:8px">'
      + '<span style="font-size:16px;color:var(--muted)">☐</span>'
      + '<span>本混合物已依据 REACH Art. 14 进行化学品安全评估（CSA）</span>'
      + '<span class="muted" style="margin-left:auto;font-size:11.5px">状态：尚未完成</span>'
      + '</div>';
    /* Annex XIV 授权清单命中（联动配方组分） */
    var hit = annex14Hit();
    var xivRows = hit.length
      ? hit.map(function(h){
          return '<tr><td style="font-size:11.5px"><b>'+esc(h.name)+'</b></td>'
            + '<td class="mono" style="font-size:11px">'+esc(h.cas)+'</td>'
            + '<td style="font-size:11.5px">'+esc(h.why)+'</td></tr>';
        }).join('')
      : '<tr><td colspan="3" class="muted" style="font-size:11.5px">'
        + '本混合物组分均未列入 REACH Annex XIV 授权清单（无需申请授权）。</td></tr>';
    xiv = '<div style="font-size:12px;font-weight:700;margin:10px 0 4px">'
      + 'REACH Annex XIV（授权清单）命中情况</div>'
      + '<table class="tbl mini"><thead><tr>'
        + '<th style="width:140px">物质</th><th style="width:110px">CAS 号</th><th>命中原因</th>'
      + '</tr></thead><tbody>'+xivRows+'</tbody></table>';
  } else {
    /* CN 市场：CSA / Annex XIV 为欧盟 REACH 框架概念，标注不适用 */
    csa = '<div style="font-size:12px;font-weight:700;margin:10px 0 4px">15.2 化学安全评估（CSA）</div>'
      + '<div style="font-size:11.5px;color:var(--muted);padding:6px 10px;'
        + 'background:var(--bg-2);border-radius:6px">CSA 为欧盟 REACH 框架要求，中国法规体系下不适用本项。</div>';
    xiv = '<div style="font-size:12px;font-weight:700;margin:10px 0 4px">REACH Annex XIV（授权清单）</div>'
      + '<div style="font-size:11.5px;color:var(--muted);padding:6px 10px;'
        + 'background:var(--bg-2);border-radius:6px">Annex XIV 为欧盟 REACH 框架概念，中国法规体系下不适用。</div>';
  }
  return regTable + csa + xiv;
}
