/* ==================================================================
   [23z1] 全局持久化 + 一键重置（演示可靠性地基）

   设计约束（来自上一轮对齐）：
   - 只持久化 wz（当前 SDS 草稿：配方 / 项目信息 / 市场等），不碰主数据 DB_*，
     避免脏数据污染组分库等基础数据。
   - 默认初始：刷新后永远是干净出厂数据，不自动恢复他人遗留草稿。
   - 必须配一键重置：演示前可一键清回初始，防止脏数据残留。
   - 带 SCHEMA 版本号：数据结构升级后旧缓存自动失效，绝不污染新版。

   原则：独立分片，零侵入旧文件（SDS 章节代码在 23z-js-sds-sec.js，
   此处全局能力在 23z1，23-js-sds.js 不再膨胀）。
   ================================================================== */

var PERSIST_KEY  = 'plm3_wz_v1';   /* localStorage 键（含版本语义） */
var PERSIST_SCHEMA = 'v1';         /* 数据结构版本：升级即弃旧缓存 */
var _wz_last = '';                 /* 上次落盘快照，用于节流（仅变化才写） */

/* 序列化当前 wz 草稿（纯数据，JSON 安全） */
function wzSnapshot(){
  try{ return JSON.stringify({ s: PERSIST_SCHEMA, w: wz }); }catch(e){ return ''; }
}

/* 节流保存：仅当与上次落盘不一致时才写 localStorage */
function wzSave(){
  var snap = wzSnapshot();
  if(!snap || snap === _wz_last) return;
  try{ localStorage.setItem(PERSIST_KEY, snap); _wz_last = snap; }catch(e){}
}

/* 启动时恢复：版本不符或缺失则丢弃，退回出厂默认 */
function wzLoad(){
  try{
    var raw = localStorage.getItem(PERSIST_KEY);
    if(!raw) return false;
    var o = JSON.parse(raw);
    if(!o || o.s !== PERSIST_SCHEMA || !o.w) return false;
    wzInitState();                        /* 重置为出厂默认（wzInitState 无返回值，直接重置全局 wz） */
    wz = Object.assign(wz, o.w || {});    /* 用户草稿覆盖对应字段 */
    return true;
  }catch(e){ return false; }
}

/* 一键重置：清缓存 + 回出厂（演示起点） */
function wzReset(){
  try{ localStorage.removeItem(PERSIST_KEY); }catch(e){}
  _wz_last = '';
  if(typeof _mbReset === 'function') _mbReset();   /* 22z3：批次测试记录的用户新增数据同步清除 */
  if(typeof _aiReset === 'function') _aiReset();   /* 24z4：AI 分析报表的用户新增数据同步清除 */
  if(typeof _physReset === 'function') _physReset(); /* 27z3：理化性质指标库 / 类别模板 / 产品实例同步回出厂 */
  if(typeof _eqmReset === 'function') _eqmReset();  /* 27z8：设备保养要求 / 保养记录 / 校准记录同步回出厂 */
  if(typeof _tmpReset === 'function') _tmpReset();  /* 27z6：临时任务同步回出厂 */
  /* resetWizard 已含 wzInitState + 表单同步 + 跳第 1 步。
     但向导 DOM（wzBody / wzSteps）只存在于 SDS 编制页，在首页等页面调用会
     因空元素报错——故仅当向导容器在位时才同步表单。 */
  if(typeof resetWizard === 'function' && $('wzBody') && $('wzSteps')) resetWizard();
  else wzInitState();
  toast('演示数据已重置', 'ok');
}

/* 重置前二次确认，防误触 */
function wzResetConfirm(){
  confirmBox('重置演示数据',
    '确定要将演示数据恢复到初始状态吗？当前录入的配方与 SDS 草稿将被清空，且无法撤销。',
    function(){ wzReset(); },
    { okText: '确认重置', danger: true });
}

/* 在侧栏底部注入「重置演示数据」按钮（不修改旧渲染函数，改为包装） */
function _injectResetBtn(){
  var host = $('navScroll'); if(!host) return;
  if(host.querySelector('#navResetBtn')) return;   /* 重渲染时避免重复 */
  var foot = document.createElement('div');
  foot.className = 'nav-foot';
  foot.innerHTML = '<button type="button" class="nav-item nav-reset" id="navResetBtn" ' +
                   'onclick="wzResetConfirm()">' +
                   '<i class="ico">⟲</i><span class="nav-label">重置演示数据</span></button>';
  host.appendChild(foot);
}

/* 样式：侧栏底部固定区，视觉与 .nav-item 一致 */
(function(){
  var st = document.createElement('style');
  st.textContent =
    '.nav-foot{margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb}' +
    '.nav-reset{color:#b42318}' +
    '.nav-reset:hover{background:#fef3f2;color:#b42318}';
  document.head.appendChild(st);
})();

/* 包装 renderSidebar：原逻辑不变，渲染后补重置按钮 */
(function(){
  var _rs = renderSidebar;
  renderSidebar = function(){ _rs(); _injectResetBtn(); };
})();

/* 启动钩子：恢复草稿 + 注册保存机制（build 末尾 boot 之前执行，仅改数据不触渲染） */
(function(){
  wzLoad();
  setInterval(wzSave, 800);                       /* 周期节流保存，防误刷新丢失 */
  window.addEventListener('beforeunload', wzSave); /* 关闭/刷新前兜底保存 */
})();
