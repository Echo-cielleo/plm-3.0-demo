/* ==================================================================
   [23z3] G4 第 11 章毒理端点补全 + G13 第 9 章理化特性 25 项

   需求（对照真实 EU CLP SDS 示例文档）：
   - G13：第 9 章理化特性由 8 项纯文本扩到 25 项结构化表格（9.1），
           未测得项如实标注 Not available，与示例文档大量留空口径一致；
           颗粒特性（第 22 项）联动第 1 章纳米形态判定。
   - G4：第 11 章毒理端点由 6 项纯文本扩到 9 个 CLP 标准端点（表格化），
         并补「按组分急性毒性数据（LD50/LC50）」与 CMR 评估总结；
         端点结论直接复用步骤 4 的 classItems（数据现成，成本低）。

   范围：仅提供章节表格渲染函数；renderStep5 的 edit/dv 两处钩子与
        draftText 的引导语改写由 23-js-sds.js / 23z2 负责。
   约定：新功能进新分片，不膨胀旧文件。
   ================================================================== */

/* G13：第 9 章理化特性 25 项（9.1）
   已知值来自物料主数据 / 检测报告；未测得项如实标注 Not available。
   颗粒特性（第 22 项）联动第 1 章纳米形态判定（B3）。 */
var PHYS_PROPS = [
  {cn:'外观（物理状态、颜色）',       en:'Appearance (physical state, colour)', v:'淡黄色半透明粘稠液体', src:'检测报告（SGS-2026-A0414）'},
  {cn:'气味',                         en:'Odour',                            v:'轻微醚味',            src:'—'},
  {cn:'气味阈值',                     en:'Odour threshold',                  v:'',                    na:true},
  {cn:'pH 值（原液）',               en:'pH',                               v:'7.5 ～ 8.5',          src:'检测报告（SGS-2026-A0415）'},
  {cn:'熔点 / 凝固点',               en:'Melting point / freezing point',  v:'',                    na:true},
  {cn:'初沸点及沸程',                en:'Initial boiling point and range',  v:'约 100 ℃',            src:'物料主数据'},
  {cn:'闪点',                        en:'Flash point',                      v:'62 ℃（闭杯，ISO 2719）', src:'检测报告（SGS-2026-A0414）'},
  {cn:'蒸发速率',                    en:'Evaporation rate',                 v:'',                    na:true},
  {cn:'易燃性（固体、气体）',         en:'Flammability (solid, gas)',        v:'',                    na:true},
  {cn:'上下爆炸极限 / 易燃极限',       en:'Upper / lower flammability limits', v:'',                  na:true},
  {cn:'蒸气压',                      en:'Vapour pressure',                  v:'',                    na:true},
  {cn:'蒸气密度（相对蒸气密度）',      en:'Vapour density',                   v:'',                    na:true},
  {cn:'相对密度',                    en:'Relative density',                 v:'1.04 ～ 1.08 g/cm³',  src:'物料主数据'},
  {cn:'水溶性',                      en:'Solubility in water',              v:'可与水混溶',          src:'物料主数据'},
  {cn:'正辛醇 / 水分配系数（log Pow）', en:'Partition coefficient (n-octanol/water)', v:'',          na:true},
  {cn:'自燃温度',                    en:'Auto-ignition temperature',        v:'',                    na:true},
  {cn:'分解温度',                    en:'Decomposition temperature',         v:'',                    na:true},
  {cn:'运动粘度',                    en:'Kinematic viscosity',              v:'120 ～ 260 mPa·s（25 ℃）', src:'物料主数据'},
  {cn:'爆炸特性',                    en:'Explosive properties',             v:'',                    na:true},
  {cn:'氧化性',                      en:'Oxidising properties',             v:'',                    na:true},
  {cn:'堆积密度',                    en:'Bulk density',                     v:'',                    na:true},
  {cn:'颗粒特性（纳米形态）',          en:'Particle characteristics',           v:null,                 na:true}, /* 联动 nano */
  {cn:'其他溶剂中的溶解度',            en:'Solubility in other solvents',     v:'',                    na:true},
  {cn:'引燃温度',                    en:'Ignition temperature',             v:'',                    na:true},
  {cn:'VOC 含量',                   en:'Volatile organic compound (VOC)',   v:'约 14 %',             src:'检测报告（SGS-2026-A0502）'}
];
function physVal(p){
  if(p.v===null){ /* 颗粒特性联动第 1 章纳米形态 */
    var pn = wz.project.nano==='1';
    return pn ? ('含纳米形态 —— '+(wz.project.nanoForm||'—'))
              : 'Not applicable（本产品不涉及纳米形态）';
  }
  if(p.na || !p.v) return '<span class="muted">Not available</span>';
  return esc(p.v);
}
function physTableHtml(){
  var rows = PHYS_PROPS.map(function(p){
    return '<tr>'
      + '<td style="font-size:11.5px"><b>'+esc(p.cn)+'</b><br>'
        + '<small style="color:var(--muted)">'+esc(p.en)+'</small></td>'
      + '<td style="font-size:11.5px">'+physVal(p)+'</td>'
      + '<td style="font-size:11px;color:var(--muted)">'
        + (((p.v && !p.na) && p.v!==null) ? esc(p.src||'—') : '—') + '</td>'
    + '</tr>';
  }).join('');
  return '<div class="tbl-wrap" style="margin:0 0 10px">'
    + '<table class="tbl mini"><thead><tr>'
      + '<th>理化特性（9.1）</th><th>结果</th><th style="width:180px">数据来源</th>'
    + '</tr></thead><tbody>'+rows+'</tbody></table></div>';
}

/* G4：第 11 章毒理信息
   9 个 CLP 标准毒理端点（除急性毒性外）从 classItems 取结论；
   组分实测 LD50/LC50 来自组分库 COMP_CLP.ate；CMR 评估总结沿用既有口径。 */
var TOX_ENDPOINTS = [
  ['皮肤腐蚀 / 刺激',            'skin'],
  ['严重眼损伤 / 眼刺激',        'eye'],
  ['呼吸道或皮肤致敏',          'sens'],
  ['生殖细胞突变性',            'muta'],
  ['致癌性',                    'carc'],
  ['生殖毒性',                  'repr'],
  ['特异性靶器官毒性（一次接触）','stot'],
  ['特异性靶器官毒性（反复接触）','stotRE'],
  ['吸入危害',                  'aspi']
];
function toxResult(id){
  var c = (wz.classItems||[]).filter(function(x){return x.id===id;})[0];
  if(!c) return 'Not classified / 不分类（混合物经评估未触发该危害类别）';
  if(c.status==='pending') return '待人工判定（'+c.name+'须在发布前确认）';
  if(c.result==='不分类') return 'Not classified / 不分类';
  return c.result+'（'+c.code+'）';
}
function toxTableHtml(){
  if(!wz.formula.length){
    return '<div style="padding:10px 14px;color:var(--muted);font-size:12.5px">'
      + '　（配方尚未录入，毒理信息表待生成）</div>';
  }
  var ateRows = [
      ['ATEmix（经口）',  ateMix()||'Not available'],
      ['ATEmix（经皮）',  'Not available'],
      ['ATEmix（吸入）',  'Not available']
    ].map(function(r){
      return '<tr><td style="font-size:11.5px"><b>'+esc(r[0])+'</b></td>'
        + '<td style="font-size:11.5px">'+esc(r[1])+'</td></tr>';
    }).join('');

  var epRows = TOX_ENDPOINTS.map(function(e){
    return '<tr><td style="font-size:11.5px"><b>'+esc(e[0])+'</b></td>'
      + '<td style="font-size:11.5px">'+esc(toxResult(e[1]))+'</td></tr>';
  }).join('');

  var sampleRows = wz.formula.map(function(f){
    var q = clpParamOf(f.cas);
    return '<tr><td style="font-size:11.5px"><b>'+esc(f.name)+'</b></td>'
      + '<td class="mono" style="font-size:11px">'+esc(f.cas||'—')+'</td>'
      + '<td style="font-size:11.5px">'
        + ((q.ate && q.ate!=='—') ? esc(q.ate) : '<span class="muted">Not available</span>')
      + '</td></tr>';
  }).join('');

  var cmr = (classOf('carc')==='Not classified / 不分类'
      ? '未列入 REACH Annex XVII 附录 1~6。'
      : '含致癌性组分（'+classOf('carc')+'）；未列入 REACH Annex XVII 附录 1~6。');

  return '<div class="tbl-wrap" style="margin:0 0 10px">'
    + '<div style="font-size:12px;font-weight:700;margin:6px 0 4px">11.1 急性毒性（混合物 ATE 加和法估算）</div>'
    + '<table class="tbl mini"><tbody>'+ateRows+'</tbody></table>'
    + '<div style="font-size:12px;font-weight:700;margin:10px 0 4px">11.1 危害类别信息（依据 (EC) No 1272/2008）</div>'
    + '<table class="tbl mini"><tbody>'+epRows+'</tbody></table>'
    + '<div style="font-size:12px;font-weight:700;margin:10px 0 4px">按组分急性毒性数据（LD50 / LC50）</div>'
    + '<table class="tbl mini"><thead><tr>'
      + '<th style="width:150px">物质</th><th style="width:110px">CAS</th><th>急性毒性估计（ATE）</th>'
    + '</tr></thead><tbody>'+sampleRows+'</tbody></table>'
    + '<div style="font-size:11.5px;color:var(--muted);margin-top:8px">'
      + 'CMR 特性评估总结（Summary of evaluation of the CMR properties）：'+esc(cmr)+'</div>'
    + '</div>';
}
