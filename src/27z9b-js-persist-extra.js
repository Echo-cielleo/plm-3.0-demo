/* ==================================================================
   [27z9b] 原料暂存区 + 供应商 的持久化（照 27z6 临时任务的模式扩展）

   为什么需要：业务人员试用时会在暂存区做同步编码 / 补录 CAS / 上传 MSDS /
   转建档，在供应商里新增与编辑——这两块此前不落盘，刷新即丢。

   设计（与既有持久化模块保持一致）：
   - **按主键合并**（暂存区按 id、供应商按 code），不整表替换。
     这样出厂数据后续升级字段时，旧缓存仍能 patch 上去，不会把新字段抹掉。
   - 带 SCHEMA 版本号，结构升级自动弃旧缓存，绝不污染新版。
   - **零侵入**：不改旧分片，用「包装写函数」的方式在写操作后自动落盘，
     因此不会出现漏挂某个入口的情况。
   - 挂进「重置演示数据」：包装 wzReset，一键回到出厂状态。

   分片位置：须在 22z1a（MAT_STAGING）/ 27-js-pages-b（SUPPLIERS）/
   27z4（MD_SUP_QUAL）/ 23z1（wzReset）之后、28-js-boot 之前。
   ================================================================== */

var STG_P_KEY = 'plm3_staging_v1',  STG_P_SCHEMA = 'v1';
var SUP_P_KEY = 'plm3_supplier_v1', SUP_P_SCHEMA = 'v1';

function _peCopy(o){ try{ return JSON.parse(JSON.stringify(o)); }catch(e){ return o; } }

/* ---------- 出厂快照（重置用，加载时抓一次） ---------- */
var _STG_FACTORY = _peCopy(typeof MAT_STAGING !== 'undefined' ? MAT_STAGING : []);
var _SUP_FACTORY = _peCopy(typeof SUPPLIERS  !== 'undefined' ? SUPPLIERS  : []);
var _SUPQ_FACTORY= _peCopy(typeof MD_SUP_QUAL!== 'undefined' ? MD_SUP_QUAL: {});

/* ---------- 原料暂存区 ---------- */
function stgPersistSave(){
  try{
    localStorage.setItem(STG_P_KEY,
      JSON.stringify({ s: STG_P_SCHEMA, rows: _peCopy(MAT_STAGING || []) }));
  }catch(e){}
}
function stgPersistLoad(){
  try{
    if(typeof MAT_STAGING === 'undefined') return;
    var o = JSON.parse(localStorage.getItem(STG_P_KEY) || 'null');
    if(!o || o.s !== STG_P_SCHEMA || !Array.isArray(o.rows)) return;
    var byId = {};
    MAT_STAGING.forEach(function(r){ if(r && r.id) byId[r.id] = r; });
    o.rows.forEach(function(r){
      if(!r || !r.id) return;
      if(byId[r.id]) Object.assign(byId[r.id], r);   /* 出厂已有：用存档覆盖改动 */
      else MAT_STAGING.push(r);                      /* 用户新增的：补进来 */
    });
  }catch(e){}
}
function _stgPersistReset(){
  try{ localStorage.removeItem(STG_P_KEY); }catch(e){}
  if(typeof MAT_STAGING === 'undefined' || !Array.isArray(_STG_FACTORY)) return;
  MAT_STAGING.length = 0;
  _STG_FACTORY.forEach(function(r){ MAT_STAGING.push(_peCopy(r)); });
}

/* ---------- 供应商（档案 + 资质证照） ---------- */
function supPersistSave(){
  try{
    localStorage.setItem(SUP_P_KEY, JSON.stringify({
      s: SUP_P_SCHEMA,
      rows:  _peCopy(typeof SUPPLIERS   !== 'undefined' ? SUPPLIERS   : []),
      quals: _peCopy(typeof MD_SUP_QUAL !== 'undefined' ? MD_SUP_QUAL : {})
    }));
  }catch(e){}
}
function supPersistLoad(){
  try{
    var o = JSON.parse(localStorage.getItem(SUP_P_KEY) || 'null');
    if(!o || o.s !== SUP_P_SCHEMA) return;
    if(typeof SUPPLIERS !== 'undefined' && Array.isArray(o.rows)){
      var byCode = {};
      SUPPLIERS.forEach(function(s){ if(s && s.code) byCode[s.code] = s; });
      o.rows.forEach(function(r){
        if(!r || !r.code) return;
        if(byCode[r.code]) Object.assign(byCode[r.code], r);
        else SUPPLIERS.unshift(r);
      });
    }
    if(typeof MD_SUP_QUAL !== 'undefined' && o.quals){
      Object.keys(o.quals).forEach(function(k){ MD_SUP_QUAL[k] = o.quals[k]; });
    }
  }catch(e){}
}
function _supPersistReset(){
  try{ localStorage.removeItem(SUP_P_KEY); }catch(e){}
  if(typeof SUPPLIERS !== 'undefined' && Array.isArray(_SUP_FACTORY)){
    SUPPLIERS.length = 0;
    _SUP_FACTORY.forEach(function(r){ SUPPLIERS.push(_peCopy(r)); });
  }
  if(typeof MD_SUP_QUAL !== 'undefined'){
    Object.keys(MD_SUP_QUAL).forEach(function(k){ delete MD_SUP_QUAL[k]; });
    Object.keys(_SUPQ_FACTORY).forEach(function(k){ MD_SUP_QUAL[k] = _peCopy(_SUPQ_FACTORY[k]); });
  }
}

/* ---------- 零侵入落盘：包装写函数，执行后自动保存 ---------- */
(function(){
  ['stgUnlink','stgSyncCode','stgFillCasSave','stgUploadMsdsSave','stgLinkSave','stgToFormal']
  .forEach(function(n){
    if(typeof window[n] !== 'function') return;
    var _o = window[n];
    window[n] = function(){ var r = _o.apply(this, arguments); stgPersistSave(); return r; };
  });
  /* supSave 内部已会调 supSetQuals，包 supSave 一个即可覆盖新增 / 编辑两条路径 */
  ['supSave'].forEach(function(n){
    if(typeof window[n] !== 'function') return;
    var _o = window[n];
    window[n] = function(){ var r = _o.apply(this, arguments); supPersistSave(); return r; };
  });
})();

/* ---------- 挂进「重置演示数据」 ---------- */
(function(){
  if(typeof window.wzReset !== 'function') return;
  var _r = window.wzReset;
  window.wzReset = function(){
    _r();
    _stgPersistReset();
    _supPersistReset();
  };
})();

/* ---------- 启动时恢复 ---------- */
(function(){
  stgPersistLoad();
  supPersistLoad();
})();
