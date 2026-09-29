/* [23z9b] 编辑视图章节标题上的「待人工操作」动态标记。
   与静态的「需人工审核/系统自动生成」是两层：静态表示这章天然要人看，
   动态表示此刻有没做完的事。挂在标题 tag 区最前（在「系统覆盖度」之前）。 */
function secTodoTag(i){
  /* 第 14 章：运输结论 */
  if(i===13){
    var st=transportAssessmentStatus();
    if(st==='NOT_ASSESSED')return '<span class="tag red dot-tag">待人工维护</span>';
    if(st==='STALE')return '<span class="tag orange dot-tag">运输结论需重新确认</span>';
    return '';
  }
  /* 第 11 章：毒理端点（TOX_ENDPOINTS）里待人工判定的项 */
  if(i===10){
    var nTox=secPendingToxEndpoints().length;
    if(nTox)return '<span class="tag orange dot-tag">含待人工判定项</span>';
    return '';
  }
  /* 第 12 章：危害水生环境分类项（判定入口同在第 4 步，不在本章） */
  if(i===11){
    var c=(wz.classItems||[]).filter(function(x){return x.id==='aqua';})[0];
    if(c&&c.status==='pending')return '<span class="tag orange dot-tag">含待人工判定项</span>';
    return '';
  }
  return '';
}
/* 第 11 章消费的毒理端点中，处于「待人工判定」的那些 */
function secPendingToxEndpoints(){
  if(typeof TOX_ENDPOINTS==='undefined')return [];
  return TOX_ENDPOINTS.filter(function(e){
    var c=(wz.classItems||[]).filter(function(x){return x.id===e[1];})[0];
    return !!(c&&c.status==='pending');
  });
}
/* 章节内「去第 4 步完成人工判定」的引导条；正式交付口径不输出操作入口 */
function secJudgeGuide(names,formal){
  if(!names.length||wz.view==='deliver'||formal)return '';
  return '<div style="margin:5px 0 8px">'
    +'<button class="btn sm warn" onclick="wzGo(4)">⚠ 去第 4 步完成人工判定（'+names.length+' 项）</button>'
    +'<span class="muted" style="font-size:11.5px;margin-left:8px">'
    +esc(names.join('、'))+' 缺少可靠来源依据，系统不产出结论；判定入口在第 4 步分类评估。</span></div>';
}
