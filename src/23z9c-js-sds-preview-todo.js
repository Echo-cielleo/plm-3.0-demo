/* ==================================================================
   [23z9c] 第 5 步两处「防错过」提示

   1) 交付预览的版本来源条
      交付预览（dv）展示的是「已发布快照」还是「最新草案」，此前没有任何标识：
      发布过一次之后，快照被冻结在本地存档里，之后怎么改草案、怎么强刷浏览器，
      预览页都还是发布那一刻的老正文 —— 看起来像「改了没生效 / 缓存问题」。
      这里在文档纸张之外（不进 Word 导出、不属于 SDS 正文）加一条来源说明：
      明确写出当前看的是哪个版本、快照之后草案有没有再动过，并可一键切换。

   2) 编制视图顶部的人工待办清单
      第 11 / 12 / 14 章的缺口此前只在各自章节标题上有一个小标签，
      章节收起时完全看不见，编制人员很容易漏掉（尤其第 14 章必须人工维护）。
      这里在编制视图顶部汇总「必须动手」的红项，并给出直达处理入口。

   范围：新分片，零侵入 —— 全部通过包装既有函数实现，不改旧文件渲染逻辑。
   ================================================================== */

/* ---------- 1. 交付预览：版本来源 ---------- */

/* 当前是否展示发布快照（previewSource='draft' 时强制看草案） */
function sdsPreviewIsRelease(){
  return !!(wz.published && sdsActiveRelease() && wz.previewSource !== 'draft');
}
/* 发布快照之后，草案正文是否又变过（每次渲染多算一次，原型可接受） */
function sdsPreviewDraftChanged(){
  var r = wz.published && sdsActiveRelease();
  if(!r) return false;
  try{ return sdsDraftBodyHtml() !== r.document.bodyHtml; }catch(e){ return false; }
}
function sdsPreviewShowDraft(){ wz.previewSource = 'draft'; renderStep5(); toast('已切换到最新草案','ok'); }
function sdsPreviewShowRelease(){ wz.previewSource = ''; renderStep5(); toast('已切换到已发布版本','ok'); }

/* 来源条：位于白纸之外的灰底区，属工作台提示，不进 SDS 正文、不进 Word 导出 */
function sdsPreviewBanner(){
  var r = wz.published && sdsActiveRelease();
  var h = '<div class="notice ' + (sdsPreviewDraftChanged() ? 'warn' : (r && !sdsPreviewIsRelease() ? 'warn' : 'info')) + '"'
        + ' style="margin:0 0 10px"><div class="ni">' + (sdsPreviewDraftChanged() ? '!' : 'i') + '</div><div>';
  if(sdsPreviewIsRelease()){
    h += '<b>当前展示：' + esc(r.documentVersion) + ' 发布版本</b>'
       + '<span class="muted" style="font-size:11.5px;margin-left:6px">'
       + '（发布于 ' + esc(r.publishedAt || '—') + '，审核人 ' + esc((r.reviewer && r.reviewer.name) || '—') + '）</span>';
    if(sdsPreviewDraftChanged())
      h += '<br>发布之后草案又有改动，本页按法规口径仍以发布版为准，不体现这些改动；'
         + '如需在正式文档中体现，请回到编制视图发布新版本号。'
         + '<div style="margin-top:6px"><button class="btn sm" onclick="sdsPreviewShowDraft()">查看最新草案</button></div>';
    else
      h += '<br>当前草案与发布版本内容一致。';
  }else{
    h += '<b>当前展示：最新草案（未发布' + (r ? '，已发布版本为 ' + esc(r.documentVersion) : '') + '）</b>'
       + '<br>内容随编制实时变化。';
    if(r)
      h += '<div style="margin-top:6px"><button class="btn sm" onclick="sdsPreviewShowRelease()">回到 ' + esc(r.documentVersion) + ' 发布版本</button></div>';
  }
  return h + '</div></div>';
}

/* 让「当前预览的是哪一份」真正生效：包一层，不改动旧函数的既有分支 */
(function(){
  var _eff = sdsEffectiveBodyHtml;
  sdsEffectiveBodyHtml = function(){
    var r = wz.published && sdsActiveRelease();
    if(wz.previewSource === 'draft' || !r) return sdsDraftBodyHtml();
    return r.document.bodyHtml;
  };
  var _pv = sdsDocPreviewHtml;
  sdsDocPreviewHtml = function(){ return sdsPreviewBanner() + _pv(); };
  /* 发布成功即回到「看发布版」，避免刚发布完还停在草案视图 */
  var _cr = sdsReleaseCreate;
  sdsReleaseCreate = function(v){ var rel = _cr(v); wz.previewSource = ''; return rel; };
})();

/* ---------- 2. 编制视图：人工待办清单 ---------- */

/* 必须动手的缺口（红）；配方变化导致的需重新确认（橙）
   act: 'step4' = 判定入口在第 4 步；'chapter' = 处理入口就在本章内 */
function secTodoList(){
  var out = [];
  var nTox = secPendingToxEndpoints().length;
  if(nTox) out.push({i:10, level:'red', act:'step4',
    text:'第 11 章 毒理学信息 · ' + nTox + ' 个毒理端点待人工判定'});
  var aq = (wz.classItems || []).filter(function(x){ return x.id === 'aqua'; })[0];
  if(aq && aq.status === 'pending') out.push({i:11, level:'red', act:'step4',
    text:'第 12 章 生态学信息 · 危害水生环境（长期）待人工判定'});
  var st = transportAssessmentStatus();
  if(st === 'NOT_ASSESSED') out.push({i:13, level:'red', act:'chapter',
    text:'第 14 章 运输信息 · 运输结论尚未维护'});
  else if(st === 'STALE') out.push({i:13, level:'orange', act:'chapter',
    text:'第 14 章 运输信息 · 配方已变化，运输结论需重新确认'});
  return out;
}
function secTodoJump(i, act){
  if(act === 'step4'){ wzGo(4); return; }
  if(wz.view !== 'edit'){ wz.view = 'edit'; }
  renderStep5();
  var el = $('acc' + i);
  if(el){ el.classList.add('open'); el.scrollIntoView({block:'center'}); }
}
/* 顶部汇总条：只列「必须动手」的红项，模板文案类不逐章刷屏 */
function secTodoBarHtml(){
  if(wz.view === 'deliver') return '';
  var all = secTodoList();
  var red = all.filter(function(x){ return x.level === 'red'; });
  var orange = all.filter(function(x){ return x.level === 'orange'; });
  var h = '<div class="notice ' + (red.length ? 'warn' : (orange.length ? 'warn' : 'ok')) + '"'
        + ' style="margin:0 0 10px"><div class="ni">' + (red.length || orange.length ? '!' : '✓')
        + '</div><div>';
  if(red.length){
    h += '<b>还有 ' + red.length + ' 项人工待办未完成</b>'
       + '<span class="muted" style="font-size:11.5px;margin-left:6">未处理完不能提交 / 发布</span>'
       + '<div style="margin:6px 0 0;display:flex;flex-direction:column;gap:5px;align-items:flex-start">';
    red.forEach(function(x){
      h += '<button class="btn sm warn" onclick="secTodoJump(' + x.i + ',\'' + x.act + '\')">'
         + esc(x.text) + '　›</button>';
    });
    h += '</div>';
  }else if(orange.length){
    h += '<b>有 ' + orange.length + ' 项结论需重新确认</b>'
       + '<div style="margin:6px 0 0;display:flex;flex-direction:column;gap:5px;align-items:flex-start">';
    orange.forEach(function(x){
      h += '<button class="btn sm warn" onclick="secTodoJump(' + x.i + ',\'' + x.act + '\')">'
         + esc(x.text) + '　›</button>';
    });
    h += '</div>';
  }else{
    h += '<b>16 章人工待办均已处理</b><br>可提交审核并发布。';
  }
  /* 模板文案类：一句话带过，不逐章列 */
  var nM = 0;
  SDS_16.forEach(function(s, i){
    if(s.auto) return;
    if(all.some(function(x){ return x.i === i; })) return;
    nM++;
  });
  if(nM) h += '<div class="muted" style="font-size:11.5px;margin-top:6px">另有 ' + nM
    + ' 章为模板候选文案，须由 EHS 逐条审核确认（章节标题旁标「需人工审核」）。</div>';
  return h + '</div></div>';
}
/* 挂在切换栏下方：原 renderStep5 不动，渲染后插入 */
(function(){
  var _r5 = renderStep5;
  renderStep5 = function(){
    _r5();
    var host = $('wzBody');
    if(!host) return;
    var bar = secTodoBarHtml();
    if(!bar) return;
    var tb = host.querySelector('.toolbar');
    if(tb) tb.insertAdjacentHTML('afterend', bar);
    else host.insertAdjacentHTML('afterbegin', bar);
  };
})();
