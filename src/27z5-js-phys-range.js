/* ==================================================================
   [27z5] 产品理化性质 · 范围值展示 + 超范围标红（2026-09-17）
   ------------------------------------------------------------------
   会上要求：
     · 产品详情页理化性质区，标准值按「上限 / 下限」范围值展示；
       只有一个限值的显示为「≥55%」「≤0.1%」形式
     · 实测值超出上下限时标红提示（对照指标库上下限判断）
     · 提示文案保留「不做强制拦截」口径

   实现口径（零侵入）：
     · 不改写 27z3 的 prod:detail 渲染函数，改为**渲染后装饰**：
       覆盖 PAGES['prod:detail'].render，先跑原渲染，再按指标顺序逐项注入
     · 指标顺序取 prodPhysGrouped(code) 展开后的扁平序列，与 DOM 中的
       .ph-item 顺序严格一致；数量对不上则不装饰（避免错位）
     · 标准值文本沿用 27z1 的 physStdText()（上下限推导，改限值即全站生效）；
       产品实例自带 std 覆盖时优先用实例值
     · 超范围判定只看数值型指标；文本型（外观 / 气味 / 成膜性…）不参与
   ================================================================== */

/* ---------- 超范围判定：对照指标库上下限 ---------- */
function physNumOf(v){
  if(v == null) return null;
  var n = parseFloat(String(v).replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? null : n;
}
/* 生效限值：产品实例自带 std（如「≥ 92 %」）时以实例为准，否则回落到指标库上下限。
   —— 同一指标在不同产品类别上标准可能不同（如固含量：涂饰树脂 48~52%，酶制剂 ≥92%），
      只看指标库会误判。 */
function physLimitOf(ind, v){
  var s = (v && v.std) ? String(v.std) : '';
  if(s){
    if(/[～~]/.test(s)){
      var m = s.split(/[～~]/);
      return {lo: physNumOf(m[0]), hi: physNumOf(m[1])};
    }
    if(/≥/.test(s)) return {lo: physNumOf(s), hi: null};
    if(/≤/.test(s)) return {lo: null, hi: physNumOf(s)};
  }
  return {lo: physNumOf(ind.lo), hi: physNumOf(ind.hi)};
}
function physOverRange(ind, act, v){
  if(!ind || act == null) return false;
  var n = physNumOf(act);
  if(n == null) return false;                       /* 文本型实测值不参与判定 */
  var lim = physLimitOf(ind, v);
  if(lim.lo !== null && n < lim.lo) return true;    /* 低于下限 */
  if(lim.hi !== null && n > lim.hi) return true;    /* 高于上限 */
  return false;
}
/* 越界方向文案：便于演示时一眼看出超的是上限还是下限 */
function physOverHint(ind, act, v){
  var n = physNumOf(act);
  if(n == null) return '超出标准';
  var lim = physLimitOf(ind, v);
  if(lim.lo !== null && n < lim.lo) return '低于下限 ' + lim.lo;
  if(lim.hi !== null && n > lim.hi) return '高于上限 ' + lim.hi;
  return '超出标准';
}

/* ---------- 渲染后装饰 ---------- */
function physDecorateRange(code){
  var host = $('pageHost');
  if(!host) return;
  var grouped = (typeof prodPhysGrouped === 'function') ? prodPhysGrouped(code) : [];
  var flat = [];
  grouped.forEach(function(g){ g.items.forEach(function(i){ flat.push(i); }); });
  var items = $$('#pageHost .ph-item');
  if(!items.length || flat.length !== items.length) return;   /* 结构变了就不动，避免错位 */

  var overN = 0;
  flat.forEach(function(ind, i){
    var el = items[i];
    var v = physProdVal(code, ind.id);
    var stdTxt = (v && v.std) ? v.std : physStdText(ind);
    var row = el.querySelector('.ph-item-row');
    if(!row) return;

    var over = physOverRange(ind, v && v.act, v);
    if(over) overN++;

    /* 实测值标红 */
    var val = row.querySelector('.ph-item-v');
    if(val && over){ val.className += ' ph-over-v'; val.title = physOverHint(ind, v.act, v); }

    /* 标准值行（范围 / ≥ / ≤） */
    var std = document.createElement('div');
    std.className = 'ph-item-std' + (over ? ' over' : '');
    std.innerHTML = '标准 <b>' + esc(stdTxt) + '</b>' +
      (over ? ('<span class="ph-over-tag">' + esc(physOverHint(ind, v.act, v)) + '</span>') : '');
    if(row.nextSibling) row.parentNode.insertBefore(std, row.nextSibling);
    else row.parentNode.appendChild(std);
  });

  /* 统计条补一句口径说明：标红提示，不做强制拦截 */
  var stat = host.querySelector('.ph-stat');
  if(stat){
    var s = document.createElement('span');
    s.className = 'ph-legend';
    s.innerHTML = '<span class="ph-src">超范围</span><b>' + overN + '</b>' +
                  '<span style="margin-left:6px">超出上下限<b>标红提示</b>，不做强制拦截</span>';
    stat.appendChild(s);
  }
}

/* ---------- 覆盖 prod:detail 的 render（原渲染 + 装饰） ---------- */
(function(){
  var P = (typeof PAGES !== 'undefined') ? PAGES['prod:detail'] : null;
  if(!P) return;
  PAGES['prod:detail'] = {
    title: P.title, crumb: P.crumb,
    render: function(params){
      P.render.call(this, params);
      try{ physDecorateRange((params && params.code) || ''); }catch(e){}
    }
  };
})();
