/* ==================================================================
   [24z6] 实验管理 · 新建实验表单校验（2026-09-17）
   ------------------------------------------------------------------
   会上要求：新建实验时「实验目的」必填，少于 5 个字提示不可提交。

   实现口径：
     · 只做前端演示级校验（toast 提示 + 中断提交），不做后端拦截
     · 零侵入：包装 24z1 的 openNewNormalExp / saveNewNormalExp，
       不改原函数体；24z1 停止膨胀

   可覆盖点：
     · 24z1 openNewNormalExp  → #nePurpose 加必填标记与占位提示
     · 24z1 saveNewNormalExp  → 提交前校验字数
     · 24-js-doe editNormalExp → #nedPurpose（编辑基本信息）本次未纳入，
       需求只点名「新建实验表单」
   ================================================================== */

var EXP_PURPOSE_MIN = 5;   /* 实验目的最少字数 */

(function(){
  /* ---------- ① 打开表单时：标记必填 + 写明字数要求 ---------- */
  var _open = window.openNewNormalExp;
  if(typeof _open === 'function'){
    window.openNewNormalExp = function(){
      _open.apply(this, arguments);
      var p = $('nePurpose');
      if(!p) return;
      p.placeholder = '至少 ' + EXP_PURPOSE_MIN + ' 个字：说明本次实验要验证的问题';
      var box = p.parentNode;
      var lb = box ? box.querySelector('label') : null;
      if(lb){ lb.className = 'req'; }
    };
  }

  /* ---------- ② 提交时：字数不足即中断 ---------- */
  var _save = window.saveNewNormalExp;
  if(typeof _save !== 'function') return;
  window.saveNewNormalExp = function(){
    var el = $('nePurpose');
    if(el){
      var v = (el.value || '').trim();
      if(v.length < EXP_PURPOSE_MIN){
        toast('实验目的不得少于 ' + EXP_PURPOSE_MIN + ' 个字（当前 ' + v.length + ' 字）', 'warn');
        try{ el.focus(); }catch(e){}
        return;
      }
    }
    return _save.apply(this, arguments);
  };
})();

/* 供自检脚本直接断言（不依赖 DOM） */
function expPurposeValid(v){
  return String(v == null ? '' : v).trim().length >= EXP_PURPOSE_MIN;
}
