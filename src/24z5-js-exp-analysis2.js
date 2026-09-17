/* ==================================================================
   [24z5] 实验分析与总结 · 两步选择 + 可选统计工具（2026-09-17）
   ------------------------------------------------------------------
   会上要求：
     ① AI 分析前先选参数，避免全量无差别分析
     ② 内置统计工具供手动选择分析维度（图表类型 / 统计项）
     ③ 图表用现有 echarts 风格渲染

   改造点（相对 24z4）：
     · 左栏由「只读分析范围」升级为**两步选择器**
         ① 勾选参与分析的实验（默认全选报告引用的实验，保留勾选能力）
         ② 勾选分析参数（从实验记录里已有的参数 / 指标中提取，可多选）
     · 右栏新增「分析方式」：交给 AI 分析 / 手动选择统计工具
     · AI 结论**只围绕用户所选参数**给出对比结论
     · 统计工具：
         图表类型 柱状图 / 折线图 / 散点图（已实现）；
                 箱线图 / 雷达图（规划中占位）
         统计项   均值 / 中位数 / 方差 / 标准差 / 极差 / 线性拟合（含 R²）/ 相关系数
     · 覆盖 24z4 的 openSumAI / openSumReport（后加载覆盖前者，属已知有意）

   收敛原则：24z4 停止膨胀，新逻辑全在本分片；只复用 24z4 的取数函数
             （aiCtxData / aiStepsFor / aiNum / aiParseStd / aiUnitOf / aiSumExpIds）
   ================================================================== */

/* ---------- 0. 常量 ---------- */
var ANA_CHART_TYPES = [
  {k: 'bar',    n: '柱状图',   d: '多组实验同一参数横向对比',            ok: true},
  {k: 'line',   n: '折线图',   d: '参数随批次 / 时间的趋势',             ok: true},
  {k: 'scatter',n: '散点图',   d: '两个参数的相互关系（可叠加拟合线）',   ok: true},
  {k: 'box',    n: '箱线图',   d: '同参数多组数据的分布对比',            ok: false},
  {k: 'radar',  n: '雷达图',   d: '多参数综合对比',                      ok: false}
];
var ANA_STAT_ITEMS = [
  {k: 'mean',   n: '均值',     d: '集中趋势'},
  {k: 'median', n: '中位数',   d: '集中趋势'},
  {k: 'var',    n: '方差',     d: '数据波动程度'},
  {k: 'std',    n: '标准差',   d: '数据波动程度'},
  {k: 'range',  n: '极差',     d: '最大值 − 最小值'},
  {k: 'fit',    n: '线性拟合', d: '参数间线性相关程度（含 R²）'},
  {k: 'corr',   n: '相关系数', d: '两参数相关性强度'}
];
var ANA_PARAM_GROUPS = ['工序参数', '配比', '过程检测', '成品检测'];

/* ---------- 1. 会话内状态（切换报告时按 sumId 缓存选择） ---------- */
var _anaSum = null, _anaAllIds = [], _anaSelIds = [], _anaParams = [], _anaSelKeys = [];
var _anaEntry = 'report';                 /* 'ai'=问问AI 入口 | 'report'=智能分析报表入口 */
var _anaMode = 'ai';                      /* 'ai' | 'stat' */
var _anaChart = 'bar';
var _anaStats = ['mean', 'std', 'range'];
var _anaResult = null;                    /* null | 'ai' | 'stat'（已生成的结果类型） */
var _anaAnswer = '';
var _anaCache = {};                       /* sumId -> {ids:[],keys:[]} */

/* ---------- 2. 小工具 ---------- */
function f2(n){
  if(n == null || isNaN(n)) return '—';
  return String(Math.round(n * 100) / 100);
}
function anaSelParams(){
  return _anaParams.filter(function(p){ return _anaSelKeys.indexOf(p.key) >= 0; });
}

/* ---------- 3. 统计函数（纯数值，空值自动跳过） ---------- */
function stClean(a){ return (a || []).filter(function(v){ return v != null && !isNaN(v); }); }
function stMean(a){ var c = stClean(a); if(!c.length) return null;
  var s = 0; c.forEach(function(v){ s += v; }); return s / c.length; }
function stMedian(a){
  var c = stClean(a).slice().sort(function(x, y){ return x - y; });
  if(!c.length) return null;
  var m = Math.floor(c.length / 2);
  return c.length % 2 ? c[m] : (c[m - 1] + c[m]) / 2;
}
function stVar(a){                        /* 样本方差（n−1） */
  var c = stClean(a); if(c.length < 2) return null;
  var m = stMean(c), s = 0;
  c.forEach(function(v){ s += (v - m) * (v - m); });
  return s / (c.length - 1);
}
function stStd(a){ var v = stVar(a); return v == null ? null : Math.sqrt(v); }
function stRange(a){
  var c = stClean(a); if(!c.length) return null;
  return Math.max.apply(null, c) - Math.min.apply(null, c);
}
/* 配对清洗：只保留 x / y 都有效的点 */
function stPairs(x, y){
  var out = [];
  for(var i = 0; i < x.length && i < y.length; i++){
    if(x[i] == null || y[i] == null || isNaN(x[i]) || isNaN(y[i])) continue;
    out.push([x[i], y[i]]);
  }
  return out;
}
function stCorr(x, y){
  var p = stPairs(x, y); if(p.length < 2) return null;
  var xs = p.map(function(v){ return v[0]; }), ys = p.map(function(v){ return v[1]; });
  var mx = stMean(xs), my = stMean(ys), sxy = 0, sxx = 0, syy = 0;
  for(var i = 0; i < p.length; i++){
    var dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  if(sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}
function stLinfit(x, y){                  /* 最小二乘 y = a·x + b，返回 a / b / R² */
  var p = stPairs(x, y); if(p.length < 2) return null;
  var xs = p.map(function(v){ return v[0]; }), ys = p.map(function(v){ return v[1]; });
  var mx = stMean(xs), my = stMean(ys), sxy = 0, sxx = 0, syy = 0;
  for(var i = 0; i < p.length; i++){
    var dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  if(sxx === 0) return null;
  var a = sxy / sxx, b = my - a * mx;
  var r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
  return {a: a, b: b, r2: r2, n: p.length};
}

/* ---------- 4. 参数提取：从实验记录里已有的参数 / 指标 ---------- */
/* 返回 [{key,label,unit,group,values:{expId:number},stds:{expId:number}|null}]
   —— 至少 2 组实验有数值的参数才会进入列表（否则画不出对比） */
function anaParamList(sum, ids){
  var out = [];
  function push(label, unit, group, values, stds){
    var n = 0;
    ids.forEach(function(id){ if(values[id] != null) n++; });
    if(n < 2) return;
    var vals = ids.map(function(id){ return values[id]; }).filter(function(v){ return v != null; });
    /* 全组取值完全相同的参数（如统一工艺的停留时间）仍保留，但标记 flat */
    var flat = (Math.max.apply(null, vals) === Math.min.apply(null, vals));
    out.push({key: group + '|' + label, label: label, unit: unit || '', group: group,
              values: values, stds: stds || null, flat: flat, n: n});
  }
  /* ① 工序参数：温度 / 时间（骨架取自第一组有真实工序的实验） */
  var stepsAll = aiStepsFor(sum, ids);
  if(stepsAll.length && stepsAll[0].steps.length){
    stepsAll[0].steps.forEach(function(ref, i){
      var tv = {}, mv = {};
      stepsAll.forEach(function(g){
        var s = g.steps[i] || {};
        tv[g.expId] = (s.temp == null ? null : s.temp);
        mv[g.expId] = (s.min == null ? null : s.min);
      });
      push('温度 · ' + ref.name, '℃', '工序参数', tv, null);
      push('时间 · ' + ref.name, 'min', '工序参数', mv, null);
    });
  }
  /* ② 配比：原料用量 */
  var mats = {}, mOrder = [], mUnit = {};
  ids.forEach(function(id){
    var d = aiCtxData(sum, id);
    (d.materials || []).forEach(function(m){
      if(mOrder.indexOf(m.name) < 0) mOrder.push(m.name);
      mats[m.name] = mats[m.name] || {};
      mats[m.name][id] = (mats[m.name][id] || 0) + (aiNum(m.qty) || 0);
      if(m.unit) mUnit[m.name] = m.unit;
    });
  });
  mOrder.forEach(function(nm){ push('配比 · ' + nm, mUnit[nm] || '', '配比', mats[nm], null); });
  /* ③ 过程检测 */
  var pt = {}, pOrder = [], pUnit = {};
  ids.forEach(function(id){
    var d = aiCtxData(sum, id);
    (d.processTests || []).forEach(function(t){
      if(pOrder.indexOf(t.item) < 0) pOrder.push(t.item);
      pt[t.item] = pt[t.item] || {};
      pt[t.item][id] = aiNum(t.value);
      if(t.unit && t.unit !== '—') pUnit[t.item] = t.unit;
    });
  });
  pOrder.forEach(function(nm){ push('过程检测 · ' + nm, pUnit[nm] || '', '过程检测', pt[nm], null); });
  /* ④ 成品检测（带标准值，供达标率判断） */
  var ft = {}, fOrder = [], fUnit = {}, fStd = {};
  ids.forEach(function(id){
    var d = aiCtxData(sum, id);
    (d.productTests || []).forEach(function(t){
      if(fOrder.indexOf(t.item) < 0) fOrder.push(t.item);
      ft[t.item] = ft[t.item] || {};
      ft[t.item][id] = aiNum(t.value);
      fStd[t.item] = fStd[t.item] || {};
      fStd[t.item][id] = aiParseStd(t.std);
      var u = aiUnitOf(t.std || ''); if(u) fUnit[t.item] = u;
    });
  });
  fOrder.forEach(function(nm){ push('成品检测 · ' + nm, fUnit[nm] || '', '成品检测', ft[nm], fStd[nm]); });
  return out;
}
/* 默认勾选：每个非空分组取第 1 个非 flat 参数，最多 4 个 */
function anaDefaultKeys(params){
  var out = [];
  ANA_PARAM_GROUPS.forEach(function(g){
    if(out.length >= 4) return;
    var hit = params.filter(function(p){ return p.group === g && !p.flat; })[0] ||
              params.filter(function(p){ return p.group === g; })[0];
    if(hit) out.push(hit.key);
  });
  if(!out.length) out = params.slice(0, 2).map(function(p){ return p.key; });
  return out;
}

/* ---------- 5. 弹窗：组装与渲染 ---------- */
function openSumAnalysis(sumId, entry){
  var sum = aiSumById(sumId);
  if(!sum){ toast('未找到总结报告 ' + sumId, 'warn'); return; }
  var ids = aiSumExpIds(sum);
  if(!ids.length){ toast('该报告尚未选择实验，请先编辑报告添加实验', 'warn'); return; }
  _anaSum = sum; _anaAllIds = ids.slice();
  _anaEntry = (entry === 'ai') ? 'ai' : 'report';
  if(_anaEntry === 'ai') _anaMode = 'ai';

  var c = _anaCache[sumId];
  if(c && c.ids && c.ids.length){
    _anaSelIds = c.ids.filter(function(id){ return ids.indexOf(id) >= 0; });
  }else{
    _anaSelIds = ids.slice(0, 8);
  }
  if(_anaSelIds.length < 2) _anaSelIds = ids.slice(0, 8);
  _anaParams = anaParamList(sum, _anaSelIds);
  if(c && c.keys && c.keys.length){
    _anaSelKeys = c.keys.filter(function(k){
      return _anaParams.some(function(p){ return p.key === k; });
    });
  }else{
    _anaSelKeys = [];
  }
  if(!_anaSelKeys.length) _anaSelKeys = anaDefaultKeys(_anaParams);

  /* 24z4 的下游（aiReportHtml / aiCtxList / aiSaveReport）依赖这两个全局，打开即对齐 */
  _aiSum = _anaSum; _aiIds = _anaSelIds.slice();
  _anaResult = null; _anaAnswer = '';
  anaRenderModal();
}
function anaSaveCache(){
  if(!_anaSum) return;
  _anaCache[_anaSum.id] = {ids: _anaSelIds.slice(), keys: _anaSelKeys.slice()};
}
function anaRenderModal(){
  if(!_anaSum) return;
  var title = (_anaEntry === 'ai')
    ? ('问问 AI · 实验分析（' + _anaSum.id + '）')
    : ('智能分析报表（' + _anaSum.id + '）');
  var footer = '<div class="muted" style="font-size:12px">分析范围 = 左栏勾选的实验 × 勾选的参数，不做全量分析</div>' +
               '<div class="spacer"></div>' +
               (_anaEntry === 'report'
                 ? '<button class="btn" onclick="anaSaveDoc()">保存到文档</button>' : '') +
               '<button class="btn" onclick="anaCloseModal()">关闭</button>';
  openModal({title: title, width: 1120, body: anaBodyHtml(), footer: footer});
}
function anaBodyHtml(){
  return '<div class="ai-two an-two">' + anaPickHtml() +
         '<div class="ai-main">' + anaMainHtml() + '</div></div>';
}

/* ---------- 6. 左栏：两步选择 ---------- */
function anaPickHtml(){
  var ids = _anaAllIds, sel = _anaSelIds;
  var h = '<div class="ai-pick an-pick">';
  /* 步骤 ① */
  h += '<div class="an-step"><span class="an-no">1</span><b>选择参与分析的实验</b>' +
       '<span class="muted">已选 ' + sel.length + ' / ' + ids.length + ' 组</span></div>' +
       '<div class="ai-pick-list">';
  ids.forEach(function(id){
    var on = sel.indexOf(id) >= 0;
    var it = null;
    ((_anaSum && _anaSum.items) || []).forEach(function(x){ if(x.expId === id) it = x; });
    h += '<label class="ai-pick-item' + (on ? ' on' : '') + '">' +
         '<input type="checkbox"' + (on ? ' checked' : '') +
         ' onchange="anaToggleExp(\'' + esc(id) + '\')">' +
         '<span class="mono">' + esc(id) + '</span>' +
         '<span class="an-pick-nm">' + esc(aiExpName(id)) + '</span></label>';
  });
  h += '</div>';
  /* 步骤 ② */
  h += '<div class="an-step"><span class="an-no">2</span><b>选择分析参数</b>' +
       '<span class="muted">已选 ' + _anaSelKeys.length + ' / ' + _anaParams.length + ' 个</span></div>';
  if(!_anaParams.length){
    h += '<div class="muted" style="padding:8px 10px;font-size:12px">' +
         '所选实验没有可对比的数值型参数，请调整实验勾选。</div>';
  }else{
    h += '<div class="an-pg-list">';
    ANA_PARAM_GROUPS.forEach(function(g){
      var ps = _anaParams.filter(function(p){ return p.group === g; });
      if(!ps.length) return;
      h += '<div class="an-pg"><div class="an-pg-t">' + esc(g) + '</div>';
      ps.forEach(function(p){
        var i = _anaParams.indexOf(p);
        var on = _anaSelKeys.indexOf(p.key) >= 0;
        h += '<label class="an-p' + (on ? ' on' : '') + '">' +
             '<input type="checkbox"' + (on ? ' checked' : '') +
             ' onchange="anaToggleParam(' + i + ')">' +
             '<span class="an-p-nm">' + esc(p.label) + '</span>' +
             (p.unit ? ('<span class="an-p-u">' + esc(p.unit) + '</span>') : '') +
             (p.flat ? '<span class="an-p-flat" title="各组取值相同">各组一致</span>' : '') +
             '</label>';
      });
      h += '</div>';
    });
    h += '</div>';
  }
  h += '<div class="ai-pick-ft"><span class="muted" style="font-size:11.5px">' +
       '参数取自实验记录中的工序、配比与检测项；对比分析至少需 2 组实验</span></div></div>';
  return h;
}

/* ---------- 7. 右栏：分析方式 + 结果 ---------- */
function anaMainHtml(){
  var ps = anaSelParams();
  var h = '<div class="ai-scope">分析范围：<b>' + _anaSelIds.length + '</b> 组实验 × <b>' +
          ps.length + '</b> 个参数　<span class="muted">' +
          (ps.length ? ps.map(function(p){ return esc(p.label); }).join('、') : '未选参数') +
          '</span></div>';
  /* 分析方式（仅报表入口可切；问问 AI 入口固定 AI） */
  if(_anaEntry === 'report'){
    h += '<div class="an-mode">' +
      '<label class="an-mode-i' + (_anaMode === 'ai' ? ' on' : '') + '">' +
        '<input type="radio" name="anMode"' + (_anaMode === 'ai' ? ' checked' : '') +
        ' onchange="anaSetMode(\'ai\')"><div><b>' + aiSparkIcon() + ' 交给 AI 分析</b>' +
        '<span>围绕所选参数自动给出对比结论与推荐组</span></div></label>' +
      '<label class="an-mode-i' + (_anaMode === 'stat' ? ' on' : '') + '">' +
        '<input type="radio" name="anMode"' + (_anaMode === 'stat' ? ' checked' : '') +
        ' onchange="anaSetMode(\'stat\')"><div><b>📊 手动选择统计工具</b>' +
        '<span>自选图表类型与统计项，只算你关心的维度</span></div></label>' +
    '</div>';
  }
  if(_anaMode === 'ai') h += anaAiHtml();
  else h += anaStatHtml();
  return h;
}
function anaAiHtml(){
  var ps = anaSelParams();
  var h = '<div class="an-box">';
  if(!ps.length){
    h += '<div class="muted" style="padding:10px 0">请先在左栏勾选至少 1 个分析参数。</div></div>';
    return h;
  }
  if(_anaEntry === 'report'){
    h += '<div class="flex" style="gap:8px;margin-bottom:10px">' +
         '<button class="btn btn-primary" onclick="anaGen()">' + aiSparkIcon() + ' 生成 AI 分析结论</button>' +
         '<span class="muted" style="font-size:12px;align-self:center">只分析左栏勾选的 ' + ps.length + ' 个参数</span></div>';
  }else{
    h += '<div class="ai-question"><span>预置演示问题（点击直接分析）</span>' +
         '<div class="ai-preset" onclick="anaAskPreset(0)">所选参数（' +
         esc(ps.map(function(p){ return p.label; }).join('、')) + '）在各组实验间的差异如何？</div>' +
         '<div class="ai-preset" onclick="anaAskPreset(1)">基于所选参数，哪一组最适合作为主推方案？</div></div>' +
         '<div class="flex" style="gap:8px">' +
         '<input class="input" id="anQuestion" placeholder="围绕所选参数提问，例如：温度对耐干擦的影响大吗？">' +
         '<button class="btn btn-primary" onclick="anaAskFree()">' + aiSparkIcon() + ' 提问</button></div>';
  }
  /* 沿用 24z4 的 #aiAnswerBox，使既有问答样式与自检选择器保持一致 */
  h += '<div id="aiAnswerBox" class="ai-answer-box">' + (_anaAnswer || '') + '</div></div>';
  return h;
}
function anaStatHtml(){
  var ps = anaSelParams();
  var h = '<div class="an-box">';
  /* 图表类型 */
  h += '<div class="an-cfg"><div class="an-cfg-t">图表类型</div><div class="an-cfg-b">' +
       '<select class="ctrl" id="anChartSel" onchange="anaSetChart(this.value)">' +
       ANA_CHART_TYPES.map(function(t){
         return '<option value="' + t.k + '"' + (_anaChart === t.k ? ' selected' : '') + '>' +
                esc(t.n) + (t.ok ? '' : '（规划中）') + ' — ' + esc(t.d) + '</option>';
       }).join('') + '</select></div></div>';
  /* 统计项 */
  h += '<div class="an-cfg"><div class="an-cfg-t">统计项（可多选）</div><div class="an-cfg-b an-chk">' +
       ANA_STAT_ITEMS.map(function(s){
         var on = _anaStats.indexOf(s.k) >= 0;
         return '<label class="an-ck' + (on ? ' on' : '') + '">' +
                '<input type="checkbox"' + (on ? ' checked' : '') +
                ' onchange="anaToggleStat(\'' + s.k + '\')">' +
                '<b>' + esc(s.n) + '</b><span class="muted">' + esc(s.d) + '</span></label>';
       }).join('') + '</div></div>';
  h += '<div class="flex" style="gap:8px;margin:10px 0 12px">' +
       '<button class="btn btn-primary" onclick="anaGen()">生成分析</button>' +
       '<span class="muted" style="font-size:12px;align-self:center">' +
       '当前：' + _anaSelIds.length + ' 组 × ' + ps.length + ' 个参数</span></div>';
  h += '<div id="anResult"></div></div>';
  return h;
}

/* ---------- 8. 选择变更 ---------- */
function anaToggleExp(id){
  var i = _anaSelIds.indexOf(id);
  if(i >= 0){
    if(_anaSelIds.length <= 2){ toast('对比分析至少需保留 2 组实验', 'warn'); anaRenderModal(); return; }
    _anaSelIds.splice(i, 1);
  }else{
    if(_anaSelIds.length >= 8){ toast('一次最多分析 8 组实验', 'warn'); anaRenderModal(); return; }
    _anaSelIds.push(id);
    /* 保持与报告内顺序一致 */
    _anaSelIds.sort(function(a, b){ return _anaAllIds.indexOf(a) - _anaAllIds.indexOf(b); });
  }
  _anaParams = anaParamList(_anaSum, _anaSelIds);
  _anaSelKeys = _anaSelKeys.filter(function(k){
    return _anaParams.some(function(p){ return p.key === k; });
  });
  if(!_anaSelKeys.length) _anaSelKeys = anaDefaultKeys(_anaParams);
  _anaResult = null; _anaAnswer = '';
  anaSaveCache(); anaRenderModal();
}
function anaToggleParam(i){
  var p = _anaParams[i]; if(!p) return;
  var j = _anaSelKeys.indexOf(p.key);
  if(j >= 0) _anaSelKeys.splice(j, 1);
  else _anaSelKeys.push(p.key);
  _anaResult = null; _anaAnswer = '';
  anaSaveCache(); anaRenderModal();
}
function anaSetMode(m){ _anaMode = m; _anaResult = null; _anaAnswer = ''; anaRenderModal(); }
function anaSetChart(v){ _anaChart = v; }
function anaToggleStat(k){
  var i = _anaStats.indexOf(k);
  if(i >= 0) _anaStats.splice(i, 1); else _anaStats.push(k);
}

/* ---------- 9. 生成 ---------- */
function anaGen(){
  var ps = anaSelParams();
  if(_anaSelIds.length < 2){ toast('对比分析至少需 2 组实验', 'warn'); return; }
  if(!ps.length){ toast('请至少勾选 1 个分析参数', 'warn'); return; }
  if(_anaMode === 'ai'){
    _anaResult = 'ai';
    _aiSum = _anaSum; _aiIds = _anaSelIds.slice();      /* 供 aiSaveReport / aiCtxList 使用 */
    _aiReportDraft = {sumId: _anaSum.id, expIds: _anaSelIds.slice(), createdAt: nowStr()};
    /* AI 结论只围绕所选参数；报表入口额外附 24z4 的投料 / 工艺步骤 / 结果三段作为数据支撑 */
    var concl = '<div class="ai-answer"><div class="ai-avatar">AI</div><div><p>' +
                 anaAiText() + '</p>' +
                 '<p class="ai-source">数据来源：' + _anaSelIds.map(esc).join('、') +
                 ' · 总结报告 ' + esc(_anaSum.id) + ' · 所选参数 ' +
                 ps.map(function(p){ return esc(p.label); }).join('、') + '</p></div></div>' +
                 '<div class="ai-disclaimer">结论只基于所选参数给出，未做全量数据分析；仅供参考。</div>';
    _anaAnswer = (_anaEntry === 'report') ? (concl + aiReportHtml(_aiSum, _aiIds)) : concl;
    var b = $('aiAnswerBox'); if(b) b.innerHTML = _anaAnswer;
    if(_anaEntry === 'report') setTimeout(aiRenderCharts, 30);
    toast(_anaEntry === 'report'
            ? ('已生成智能分析报表（' + ps.length + ' 个参数 + 投料/工艺/结果三段）')
            : ('已生成 AI 分析结论（' + ps.length + ' 个参数）'), 'ok');
  }else{
    _anaResult = 'stat';
    _aiSum = _anaSum; _aiIds = _anaSelIds.slice();
    _aiReportDraft = {sumId: _anaSum.id, expIds: _anaSelIds.slice(), createdAt: nowStr()};
    var box = $('anResult'); if(box) box.innerHTML = anaStatResultHtml();
    setTimeout(anaRenderStatCharts, 30);
    toast('已生成统计分析', 'ok');
  }
  anaSaveCache();
}
function anaAskPreset(i){
  var ps = anaSelParams();
  var q = i === 0
    ? ('所选参数（' + ps.map(function(p){ return p.label; }).join('、') + '）在各组实验间的差异如何？')
    : '基于所选参数，哪一组最适合作为主推方案？';
  _anaResult = 'ai';
  _aiSum = _anaSum; _aiIds = _anaSelIds.slice();
  _aiReportDraft = {sumId: _anaSum.id, expIds: _anaSelIds.slice(), createdAt: nowStr()};
  var a = (i === 0) ? anaAiText() : anaAiRankText();
  _anaAnswer = '<div class="ai-question" style="margin-top:12px"><span>问题</span><b>' + esc(q) + '</b></div>' +
               '<div class="ai-answer"><div class="ai-avatar">AI</div><div><p>' + a + '</p>' +
               '<p class="ai-source">数据来源：' + _anaSelIds.map(esc).join('、') +
               ' · 总结报告 ' + esc(_anaSum.id) + '</p></div></div>' +
               '<div class="ai-disclaimer">结论只基于所选参数给出，未做全量数据分析；仅供参考。</div>';
  var b = $('aiAnswerBox'); if(b) b.innerHTML = _anaAnswer;
  anaSaveCache();
}
function anaAskFree(){
  var q = ($('anQuestion') && $('anQuestion').value || '').trim();
  if(!q){ toast('请输入问题', 'warn'); return; }
  var ps = anaSelParams();
  if(!ps.length){ toast('请先勾选分析参数', 'warn'); return; }
  _anaResult = 'ai';
  _aiSum = _anaSum; _aiIds = _anaSelIds.slice();
  _aiReportDraft = {sumId: _anaSum.id, expIds: _anaSelIds.slice(), createdAt: nowStr()};
  var a = '针对你勾选的 <b>' + ps.length + '</b> 个参数（' +
          ps.map(function(p){ return esc(p.label); }).join('、') + '），系统给出以下分析：<br>' +
          anaAiText();
  _anaAnswer = '<div class="ai-question" style="margin-top:12px"><span>问题</span><b>' + esc(q) + '</b></div>' +
               '<div class="ai-answer"><div class="ai-avatar">AI</div><div><p>' + a + '</p>' +
               '<p class="ai-source">数据来源：' + _anaSelIds.map(esc).join('、') +
               ' · 总结报告 ' + esc(_anaSum.id) + '</p></div></div>' +
               '<div class="ai-disclaimer">结论只基于所选参数给出，未做全量数据分析；如需更聚焦的结论，' +
               '可在左栏收窄参数范围后重新分析。</div>';
  var b = $('aiAnswerBox'); if(b) b.innerHTML = _anaAnswer;
  anaSaveCache();
}

/* ---------- 10. AI 结论文本（只围绕所选参数） ---------- */
function anaAiText(){
  var ps = anaSelParams(), ids = _anaSelIds;
  if(!ps.length) return '未选择分析参数。';
  var segs = ps.map(function(p){
    var vals = ids.map(function(id){ return p.values[id]; });
    var ok = stClean(vals);
    var mean = stMean(ok), sd = stStd(ok), rg = stRange(ok);
    var best = anaBestOfParam(p, ids);
    return '<b>' + esc(p.label) + '</b>（' + ok.length + '/' + ids.length + ' 组有值）：' +
      ids.map(function(id){
        var v = p.values[id];
        var s = (p.stds && p.stds[id] != null) ? p.stds[id] : null;
        var t = esc(id) + ' ' + (v == null ? '—' : (f2(v) + (p.unit ? (' ' + p.unit) : '')));
        if(v != null && s) t += '（标准 ' + f2(s) + ' → 达标率 ' + f2(v / s * 100) + '%）';
        return t;
      }).join(' ／ ') +
      '<br>　均值 ' + f2(mean) + '、标准差 ' + f2(sd) + '、极差 ' + f2(rg) +
      (p.unit ? (' ' + p.unit) : '') +
      /* 有标准值 → 达标率最高（可称「最优」）；无标准 → 只说取值最高，避免暗示越大越好 */
      (best ? ('，' + (p.stds
        ? ('其中 <b>' + esc(best) + '</b> 表现最优')
        : ('<b>' + esc(best) + '</b> 取值最高'))) : '') +
      (p.flat ? '（各组取值一致，无区分度）' : '');
  });
  return '本次分析共 <b>' + ids.length + '</b> 组实验、<b>' + ps.length + '</b> 个参数。<br><br>' +
    segs.join('<br><br>') + '<br><br>' + anaAiRankText();
}
/* 单参数最优组：有标准按达标率，否则按原始值 */
function anaBestOfParam(p, ids){
  var best = null, bv = null;
  ids.forEach(function(id){
    var v = p.values[id]; if(v == null) return;
    var s = (p.stds && p.stds[id] != null) ? p.stds[id] : null;
    var sc = s ? (v / s) : v;
    if(bv == null || sc > bv){ bv = sc; best = id; }
  });
  return best;
}
/* 综合排序：各参数 min-max 归一化后求和（越大越好，反向指标需人工判断） */
function anaRank(){
  var ps = anaSelParams(), ids = _anaSelIds, score = {};
  ids.forEach(function(id){ score[id] = 0; });
  ps.forEach(function(p){
    var vals = stClean(ids.map(function(id){ return p.values[id]; }));
    if(vals.length < 2) return;
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    if(mx === mn) return;
    ids.forEach(function(id){
      var v = p.values[id]; if(v == null) return;
      score[id] += (v - mn) / (mx - mn);
    });
  });
  return ids.map(function(id){ return {id: id, s: score[id]}; })
            .sort(function(a, b){ return b.s - a.s; });
}
function anaAiRankText(){
  var ps = anaSelParams();
  var rank = anaRank();
  if(!rank.length) return '';
  var tot = ps.length || 1;
  var list = rank.map(function(r){ return esc(r.id) + ' ' + f2(r.s / tot * 100) + '%'; }).join('、');
  return '按所选参数的综合表现排序（各参数归一化后求平均，100% = 各参数均取到最优）：' + list + '。' +
    '<br>综合判断：推荐 <b>' + esc(rank[0].id) + '</b> 作为主推方案；' +
    (rank.length > 1 ? (esc(rank[rank.length - 1].id) + ' 在所选参数上相对靠后，可作为风险备选继续跟踪。') : '') +
    '<br><span class="muted">说明：归一化默认「数值越大越好」，若所选参数中存在反向指标（如色差越小越好），' +
    '请以单参数结论为准。</span>';
}

/* ---------- 11. 统计工具结果 ---------- */
function anaStatResultHtml(){
  var ps = anaSelParams(), ids = _anaSelIds;
  var ct = ANA_CHART_TYPES.filter(function(t){ return t.k === _anaChart; })[0] || ANA_CHART_TYPES[0];
  var h = '<div class="rpt-wrap">';
  /* 图表 */
  h += '<h4 class="rpt-t">一、' + esc(ct.n) + '（' + esc(ct.d) + '）</h4>';
  if(!ct.ok){
    h += '<div class="notice notice-info"><i class="ni">ℹ</i><div>' +
         '<b>' + esc(ct.n) + '</b> 在本次原型中列为规划功能，暂未实现渲染。' +
         '如需多参数对比，可改用<b>柱状图</b>（逐参数分图）或<b>散点图</b>（两参数关系）。' +
         '</div></div>';
  }else if(_anaChart === 'scatter'){
    if(ps.length < 2){
      h += '<div class="notice notice-warn"><i class="ni">!</i><div>' +
           '散点图需要<b>至少 2 个参数</b>：请在左栏再勾选一个参数作为 Y 轴。</div></div>';
    }else{
      h += '<div class="rpt-chart" id="anChart0" style="height:290px"></div>' +
           '<div class="muted" style="font-size:12px;margin-top:4px">X 轴：' + esc(ps[0].label) +
           '　Y 轴：' + esc(ps[1].label) +
           (_anaStats.indexOf('fit') >= 0 ? '　（已叠加最小二乘拟合线与 R²）' : '') + '</div>';
    }
  }else{
    ps.forEach(function(p, i){
      h += '<div class="rpt-chart" id="anChart' + i + '" style="height:240px"></div>' +
           '<div class="muted" style="font-size:12px;margin:2px 0 12px">' + esc(p.label) +
           (p.unit ? ('（' + esc(p.unit) + '）') : '') + ' · 各组横向对比</div>';
    });
  }
  /* 统计表 */
  var cols = ANA_STAT_ITEMS.filter(function(s){
    return ['mean', 'median', 'var', 'std', 'range'].indexOf(s.k) >= 0 && _anaStats.indexOf(s.k) >= 0;
  });
  if(cols.length){
    h += '<h4 class="rpt-t">二、统计量（按参数）</h4><div class="tbl-wrap"><table class="tbl tbl-sm">' +
         '<thead><tr><th style="width:220px">参数</th><th style="width:70px">样本数</th>' +
         cols.map(function(c){ return '<th>' + esc(c.n) + '</th>'; }).join('') +
         '</tr></thead><tbody>';
    ps.forEach(function(p){
      var vals = ids.map(function(id){ return p.values[id]; });
      var ok = stClean(vals);
      h += '<tr><td>' + esc(p.label) + (p.unit ? ('<span class="muted"> ' + esc(p.unit) + '</span>') : '') + '</td>' +
           '<td class="num">' + ok.length + '</td>';
      cols.forEach(function(c){
        var v = c.k === 'mean' ? stMean(vals)
              : c.k === 'median' ? stMedian(vals)
              : c.k === 'var' ? stVar(vals)
              : c.k === 'std' ? stStd(vals)
              : stRange(vals);
        h += '<td class="num">' + f2(v) + '</td>';
      });
      h += '</tr>';
    });
    h += '</tbody></table></div>';
  }
  /* 关系表：线性拟合 / 相关系数 */
  var rel = ANA_STAT_ITEMS.filter(function(s){
    return ['corr', 'fit'].indexOf(s.k) >= 0 && _anaStats.indexOf(s.k) >= 0;
  });
  if(rel.length && ps.length >= 2){
    var used = ps.slice(0, 6);
    h += '<h4 class="rpt-t">三、参数间关系（' + (rel.map(function(r){ return r.n; }).join(' / ')) + '）</h4>' +
         '<div class="tbl-wrap"><table class="tbl tbl-sm"><thead><tr>' +
         '<th style="width:200px">参数 A</th><th style="width:200px">参数 B</th><th style="width:70px">样本数</th>' +
         (rel.some(function(r){ return r.k === 'corr'; }) ? '<th>相关系数 r</th>' : '') +
         (rel.some(function(r){ return r.k === 'fit'; }) ? '<th>拟合斜率</th><th>截距</th><th>R²</th>' : '') +
         '</tr></thead><tbody>';
    for(var i = 0; i < used.length; i++){
      for(var j = i + 1; j < used.length; j++){
        var A = used[i], B = used[j];
        var xs = ids.map(function(id){ return A.values[id]; });
        var ys = ids.map(function(id){ return B.values[id]; });
        var r = stCorr(xs, ys), fit = stLinfit(xs, ys);
        h += '<tr><td>' + esc(A.label) + '</td><td>' + esc(B.label) + '</td>' +
             '<td class="num">' + (fit ? fit.n : 0) + '</td>' +
             (rel.some(function(x){ return x.k === 'corr'; })
               ? ('<td class="num">' + (r == null ? '—' : f2(r)) +
                  (r == null ? '' : ('<span class="muted"> （' + anaCorrWord(r) + '）</span>')) + '</td>') : '') +
             (rel.some(function(x){ return x.k === 'fit'; })
               ? ('<td class="num">' + (fit ? f2(fit.a) : '—') + '</td>' +
                  '<td class="num">' + (fit ? f2(fit.b) : '—') + '</td>' +
                  '<td class="num">' + (fit ? f2(fit.r2) : '—') + '</td>') : '') +
             '</tr>';
      }
    }
    h += '</tbody></table></div>';
  }
  h += '<div class="notice notice-info" style="margin-top:12px"><i class="ni">ℹ</i><div>' +
       '统计结果只覆盖左栏勾选的 <b>' + ids.length + '</b> 组实验 × <b>' + ps.length + '</b> 个参数，' +
       '未做全量数据分析；样本数不足 2 的参数不参与方差与相关系数计算。</div></div>';
  h += '</div>';
  return h;
}
function anaCorrWord(r){
  var a = Math.abs(r);
  var lv = a >= 0.8 ? '强相关' : (a >= 0.5 ? '中等相关' : (a >= 0.3 ? '弱相关' : '基本无关'));
  return (r > 0 ? '正相关 · ' : '负相关 · ') + lv;
}
function anaRenderStatCharts(){
  var ps = anaSelParams(), ids = _anaSelIds;
  if(_anaChart === 'scatter'){
    if(ps.length >= 2 && $('anChart0')) chart('anChart0', anaScatterOption(ps[0], ps[1], ids));
    return;
  }
  if(_anaChart === 'line'){
    ps.forEach(function(p, i){ if($('anChart' + i)) chart('anChart' + i, anaLineOption(p, ids)); });
    return;
  }
  ps.forEach(function(p, i){ if($('anChart' + i)) chart('anChart' + i, anaBarOption(p, ids)); });
}
function anaBarOption(p, ids){
  var data = ids.map(function(id){ return p.values[id]; });
  var opt = {
    tooltip: {trigger: 'axis', axisPointer: {type: 'shadow'},
      formatter: function(a){
        return '<b>' + esc(a[0].axisValue) + '</b><br>' + esc(p.label) + '：' +
               (a[0].value == null ? '—' : (f2(a[0].value) + (p.unit ? (' ' + p.unit) : '')));
      }},
    grid: {left: 64, right: 22, top: 30, bottom: 46},
    xAxis: {type: 'category', data: ids,
      axisLabel: {fontSize: 11, interval: 0, rotate: ids.length > 5 ? 22 : 0}},
    yAxis: {type: 'value', name: p.unit || '', nameTextStyle: {fontSize: 11},
      axisLabel: {fontSize: 11}, scale: true},
    series: [{name: p.label, type: 'bar', barMaxWidth: 52, data: data,
      itemStyle: {color: '#1677ff', borderRadius: [3, 3, 0, 0]}}]
  };
  if(_anaStats.indexOf('mean') >= 0){
    var m = stMean(data);
    if(m != null){
      opt.series[0].markLine = {silent: true, symbol: 'none',
        lineStyle: {type: 'dashed', color: '#fa8c16', width: 1},
        label: {formatter: '均值 ' + f2(m), fontSize: 11, color: '#fa8c16', position: 'insideEndTop'},
        data: [{yAxis: m}]};
    }
  }
  return opt;
}
function anaLineOption(p, ids){
  var data = ids.map(function(id){ return p.values[id]; });
  var opt = {
    tooltip: {trigger: 'axis',
      formatter: function(a){
        return '<b>' + esc(a[0].axisValue) + '</b><br>' + esc(p.label) + '：' +
               (a[0].value == null ? '—' : (f2(a[0].value) + (p.unit ? (' ' + p.unit) : '')));
      }},
    grid: {left: 64, right: 22, top: 30, bottom: 46},
    xAxis: {type: 'category', data: ids, boundaryGap: false,
      axisLabel: {fontSize: 11, interval: 0, rotate: ids.length > 5 ? 22 : 0}},
    yAxis: {type: 'value', name: p.unit || '', nameTextStyle: {fontSize: 11},
      axisLabel: {fontSize: 11}, scale: true},
    series: [{name: p.label, type: 'line', symbol: 'circle', symbolSize: 7,
      lineStyle: {width: 2, color: '#1677ff'}, itemStyle: {color: '#1677ff'},
      connectNulls: true, data: data}]
  };
  if(_anaStats.indexOf('mean') >= 0){
    var m = stMean(data);
    if(m != null){
      opt.series[0].markLine = {silent: true, symbol: 'none',
        lineStyle: {type: 'dashed', color: '#fa8c16', width: 1},
        label: {formatter: '均值 ' + f2(m), fontSize: 11, color: '#fa8c16', position: 'insideEndTop'},
        data: [{yAxis: m}]};
    }
  }
  return opt;
}
function anaScatterOption(A, B, ids){
  var pts = [], xs = [], ys = [];
  ids.forEach(function(id){
    var x = A.values[id], y = B.values[id];
    if(x == null || y == null) return;
    pts.push({value: [x, y], name: id}); xs.push(x); ys.push(y);
  });
  var series = [{name: '实验组', type: 'scatter', symbolSize: 12, data: pts,
    itemStyle: {color: '#1677ff'},
    tooltip: {formatter: function(a){
      return '<b>' + esc(a.data.name) + '</b><br>' + esc(A.label) + '：' + f2(a.value[0]) +
             (A.unit ? (' ' + A.unit) : '') + '<br>' + esc(B.label) + '：' + f2(a.value[1]) +
             (B.unit ? (' ' + B.unit) : '');
    }}}];
  if(_anaStats.indexOf('fit') >= 0){
    var fit = stLinfit(xs, ys);
    if(fit && xs.length >= 2){
      var mn = Math.min.apply(null, xs), mx = Math.max.apply(null, xs);
      series.push({name: '线性拟合', type: 'line', showSymbol: false, silent: true,
        lineStyle: {type: 'dashed', color: '#fa8c16', width: 2},
        data: [[mn, fit.a * mn + fit.b], [mx, fit.a * mx + fit.b]],
        markPoint: {symbol: 'none',
          label: {formatter: 'R² = ' + f2(fit.r2), fontSize: 11, color: '#fa8c16'},
          data: [{coord: [mx, fit.a * mx + fit.b]}]}});
    }
  }
  return {
    tooltip: {trigger: 'item'},
    grid: {left: 64, right: 30, top: 26, bottom: 52},
    xAxis: {type: 'value', name: A.label + (A.unit ? ('（' + A.unit + '）') : ''),
      nameLocation: 'middle', nameGap: 28, nameTextStyle: {fontSize: 11},
      axisLabel: {fontSize: 11}, scale: true},
    yAxis: {type: 'value', name: B.label + (B.unit ? ('（' + B.unit + '）') : ''),
      nameTextStyle: {fontSize: 11}, axisLabel: {fontSize: 11}, scale: true},
    series: series
  };
}

/* ---------- 12. 保存 / 关闭 ---------- */
function anaSaveDoc(){
  if(!_anaResult){
    toast(_anaMode === 'ai' ? '请先生成 AI 分析结论' : '请先生成统计分析', 'warn');
    return;
  }
  aiSaveReport();
}
function anaCloseModal(){
  /* 释放本分片渲染的图表实例（anChart*），再走 24z4 的关闭逻辑 */
  if(typeof _charts !== 'undefined'){
    Object.keys(_charts).forEach(function(k){
      if(k.indexOf('anChart') === 0){
        try{ _charts[k].dispose(); delete _charts[k]; }catch(e){}
      }
    });
  }
  _anaResult = null;
  aiCloseModal();
}

/* ---------- 13. 覆盖 24z4 的两个入口（后加载覆盖前者，属已知有意） ---------- */
function openSumAI(sumId){ openSumAnalysis(sumId, 'ai'); }
function openSumReport(sumId){ openSumAnalysis(sumId, 'report'); }
