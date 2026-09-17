/* ==================================================================
   [27z7] 产品理化性质 · 分组表格布局（方案 A，2026-09-17 拍板）
   ------------------------------------------------------------------
   背景：原两列卡片网格每项一张小卡（边框 + 每卡一组操作按钮），
        标准值再单独一行追加，视觉分散、密度低、不利「标准 vs 实测」对比。
   方案 A：每个分组一张紧凑表 —— 指标 / 标准值 / 实测值 / 来源 / 操作；
        超范围整行浅红底 + 实测值标红；待填项整行置灰。
   实现口径（零侵入 27z3）：
     · 沿用 27z5 的包装方式再包一层 PAGES['prod:detail'].render：
       原渲染（卡片）→ 27z5 范围值装饰（含统计条口径）→ 本分片把
       每组 .ph-grid 替换为表格（重建 DOM，非改卡片）
     · 类名兼容：表格行复用 .ph-item / .ph-item-nm / .ph-item-v /
       .ph-item-std / .ph-src / .ph-over-tag（smoke 选择器不断），
       卡片专用样式在 06z2 中按 tr 场景重置
     · 超范围 / 限值判定直接复用 27z5 的 physOverRange / physOverHint
   ================================================================== */

/* 一个分组的表格 HTML（数据与 27z3 卡片同源） */
function physGroupTableHtml(code, grp){
  var h='<div class="ph-table"><table class="tbl tbl-sm">'+
    '<thead><tr>'+
      '<th>指标</th>'+
      '<th style="width:132px">标准值</th>'+
      '<th style="width:140px">实测值</th>'+
      '<th style="width:176px">来源</th>'+
      '<th style="width:80px">操作</th>'+
    '</tr></thead><tbody>';
  grp.items.forEach(function(ind){
    var v=physProdVal(code,ind.id);
    var act=v.act;
    var stdTxt=(v&&v.std)?v.std:physStdText(ind);
    var over=physOverRange(ind,act,v);
    h+='<tr class="ph-item'+(over?' ph-row-over':'')+(!act?' ph-row-wait':'')+'">'+
      /* 指标：名称 + 单位 + 编号（沿用卡片的小字样式） */
      '<td class="ph-td-name"><span class="ph-item-nm">'+esc(ind.name)+'</span>'+
        ((ind.unit&&ind.unit!=='—')?'<span class="ph-item-unit"> '+esc(ind.unit)+'</span>':'')+
        '<span class="ph-item-unit"> '+esc(ind.id)+'</span></td>'+
      /* 标准值：范围 / ≥ / ≤（实例 std 优先，同 27z5） */
      '<td class="ph-item-std'+(over?' over':'')+'">'+esc(stdTxt)+'</td>'+
      /* 实测值：超范围标红 + 方向提示；未填显示灰「待填」 */
      '<td class="ph-td-val">'+
        (act
          ?'<span class="ph-item-v'+(over?' ph-over-v':'')+'"'+
            (over?(' title="'+esc(physOverHint(ind,act,v))+'"'):'')+'>'+esc(act)+'</span>'
          :'<span class="ph-item-v wait">待填</span>')+
        (over?'<span class="ph-over-tag">'+esc(physOverHint(ind,act,v))+'</span>':'')+
      '</td>'+
      /* 来源：NCC 同步 / 导入 / 手动 留痕（未填显示 —） */
      '<td>'+(act?physSrcChip(v):'<span class="ph-item-unit">—</span>')+'</td>'+
      /* 操作：编辑 / 移除（同卡片版 onclick） */
      '<td class="ph-td-op">'+
        '<button class="btn-link" onclick="physEditIndOpen(\''+esc(code)+'\',\''+esc(ind.id)+'\')">编辑</button>'+
        '<button class="btn-link danger" onclick="physDelInd(\''+esc(code)+'\',\''+esc(ind.id)+'\')">移除</button>'+
      '</td>'+
    '</tr>';
  });
  return h+'</tbody></table></div>';
}

/* 渲染后转换：每组 .ph-grid → 表格（结构对不上则不动，避免错位） */
function physTableTransform(code){
  var host=$('pageHost');
  if(!host)return;
  var grouped=(typeof prodPhysGrouped==='function')?prodPhysGrouped(code):[];
  if(!grouped.length)return;
  var gs=$$('#pageHost .ph-group');
  if(gs.length!==grouped.length)return;
  gs.forEach(function(g,gi){
    var old=g.querySelector('.ph-grid');
    if(!old)return;
    var d=document.createElement('div');
    d.innerHTML=physGroupTableHtml(code,grouped[gi]);
    if(d.firstChild)old.replaceWith(d.firstChild);
  });
}

/* 包装 prod:detail（链条：27z3 原渲染 → 27z5 范围值装饰 → 本分片表格化） */
(function(){
  var P=(typeof PAGES!=='undefined')?PAGES['prod:detail']:null;
  if(!P)return;
  var orig=P.render;
  PAGES['prod:detail']={
    title:P.title, crumb:P.crumb,
    render:function(params){
      orig.call(this,params);
      try{physTableTransform((params&&params.code)||'');}catch(e){}
    }
  };
})();
