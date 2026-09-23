/* ==================================================================
   [23z6c] CLP Annex I 规则版本生命周期（2026-09-22 阶段 2）
   ------------------------------------------------------------------
   本分片只做四件事：规则版本化 / 增量 Diff / 发布门禁 / 单一法规专员审核发布。

   加载位置：23-js-sds.js → 23z6-js-clp.js → 23z6a-js-clp-import.js
             → 23z6b-js-clp-engine.js → 23z6c（本文件）→ 23z7-js-reach.js
   依赖：CLP_RULES / CLP_MODULES / CLP_LABELS（23z6）、
         合规方法注册表 COMPLIANCE_METHOD_REGISTRY 与 complianceBuildContext /
         complianceExecuteMethod（23z6b）、demoYmd()（20-js-core）。

   铁律（本阶段）：
     · 只有一条审核流程 —— 法规专员「审核通过并发布」，没有第二审核人，
       没有内部分流，没有多级审批，业务步骤仍是原来的五步；
     · 引擎支持状态 / 测试是否通过 / 是否可发布**全部由系统计算**，
       法规专员不得手工填写，上传文件里带的同名列一律忽略；
     · 未通过门禁的**修改规则保留旧版**、**新增规则不进活动规则集**（进 deferred）；
     · 候选停用必须法规专员统一确认，未确认则旧规则继续有效；
     · 已发布快照不可编辑，再改必须复制为新草稿版本；
     · 不修改任何法规阈值与分类结论，不实现 M-LIST / ED / PBT / Bridging /
       中国 GHS / 运输法规 / 法规原文自动解析，不使用 eval 或 new Function；
     · 日期基准一律走 DEMO_TODAY（demoYmd()），不依赖真实系统日期。

   ⚠️ 法规正确性边界：本文件只管理版本与门禁，**不评价法规内容本身**。
      发现的法规疑点记录到 续接指南.md「待专业核验项」，不在本阶段改结论。
   ================================================================== */

/* ---------- 1. 状态口径与业务字段字典 ---------- */
var CLP_RULE_VERSION_STORE = [];
/* 版本状态（中文口径，单一审核流程） */
var CLP_VERSION_STATUS = ['草稿', '校验失败', '待补充', '待研发实现', '测试失败', '待审核', '待生效', '已生效', '已失效', '已撤回'];
/* 规则级处理状态（由系统计算，法规专员不得手工填写） */
var CLP_RULE_GATE_STATUS = ['未变化', '可发布', '待补充', '待研发实现', '测试失败', '待确认停用', '不进入本次发布'];
/* 引擎支持状态（由系统根据方法注册表自动生成） */
var CLP_ENGINE_SUPPORT_STATUS = ['已支持', '需要配置参数', '需要研发实现'];
/* Diff 变化类型 */
var CLP_CHANGE_TYPES = ['新增规则', '未变化', '文案或来源变更', '计算参数变更', '适用条件变更',
  '例外条件变更', '方法映射变更', '输出分类变更', 'H 码或标签要素变更', '规则优先级变更', '生效日期变更', '候选停用'];

/* 内部字段路径 → 业务字段名（页面只许出现右列，不许出现左列） */
var CLP_RULE_FIELD_LABELS = {
  name: '规则名称', cat: '危害类别', target: '适用对象', method: '计算方法', h: '对应 H 码',
  ref: '来源条款位置', eff: '规则生效日期',
  'run.thresholds': '急性毒性分类阈值区间', 'run.skinCorr': '皮肤腐蚀阈值', 'run.skinIrrit': '皮肤刺激阈值',
  'run.eyeDamage': '眼损伤阈值', 'run.eyeIrrit': '眼刺激阈值', 'run.weight': '加和权重',
  'run.sclOverridesGcl': 'SCL 优先开关', 'run.skinSensGcl': '皮肤致敏通用浓度限值',
  'run.limit': '慢性求和阈值', 'run.chronic2Weight': '慢性 2 折算权重', 'run.chronic3Weight': '慢性 3 折算权重',
  'det.inputs': '所需输入', 'det.cond': '前置条件', 'det.formula': '法规公式说明', 'det.except': '例外条件',
  'det.prio': '规则优先级', 'det.output': '输出分类', 'det.label': '标签要素', 'det.src': '来源条款'
};
/* 参与计算、变化即必须重新测试的字段（§13.2） */
var CLP_EXEC_FIELDS = ['method', 'run', 'target', 'h', 'det.cond', 'det.except', 'det.prio', 'det.output', 'det.label'];
/* 生命周期 / 审核字段：变化不算业务变化（§13.1） */
var CLP_AUDIT_FIELDS = ['id', 'ver', 'status', 'engine', 'test', 'checker', 'checkDate'];
/* 各计算方法必须提供的运行参数（缺一项即「需要配置参数」） */
var CLP_METHOD_PARAM_REQUIREMENTS = {
  'CLP-M-ATE-SUM': [['thresholds', '急性毒性分类阈值区间']],
  'CLP-M-GCL-SUM': [['skinCorr', '皮肤腐蚀阈值'], ['skinIrrit', '皮肤刺激阈值'],
    ['eyeDamage', '眼损伤阈值'], ['eyeIrrit', '眼刺激阈值'], ['weight', '加和权重']],
  'CLP-M-SCL': [['skinSensGcl', '皮肤致敏通用浓度限值']],
  'CLP-M-MFACTOR': [['limit', '慢性求和阈值'], ['chronic2Weight', '慢性 2 折算权重'], ['chronic3Weight', '慢性 3 折算权重']]
};
/* 结构化上传表里若出现这些列，一律忽略并重新由系统计算（§十一） */
var CLP_UPLOAD_SYSTEM_FIELDS = ['engine', 'engineSupport', 'test', 'testResult', 'methodVersion', 'publishable'];

/* ---------- 2. 规则级代表性测试用例（结构化，不许写代码） ----------
   只填：组分、浓度、分类参数、预期分类、预期 H 码、预期状态。
   执行走真实引擎（complianceBuildContext + complianceExecuteMethod），
   Python 侧不复制任何计算公式。 */
var CLP_RULE_TEST_CASES = {
  'CLP-R-0002': [{
    id: 'GCL-SKIN-CORR-4PCT', name: '皮肤腐蚀组分 4%（阈值 5% → 3%）',
    input: {components: [{cas: 'DEMO-CORR', name: '腐蚀组分（演示）', conc: 4,
      parameters: {classifications: {skinCorr: '1B'}}}]},
    expected: {itemId: 'skin', result: '类别 2', status: 'AUTO'},
    note: '阈值由 5% 调整为 3% 后，本用例的预期结果尚未同步复核（实测已触发腐蚀分类）'
  }],
  'CLP-R-0003': [{
    id: 'SCL-SENS-03PCT', name: '致敏组分 0.3%（该组分 SCL 0.2%）',
    input: {components: [{cas: 'DEMO-SENS', name: '致敏组分（演示）', conc: 0.3,
      parameters: {classifications: {skinSens: {cat: '1', scl: 0.2}}}}]},
    expected: {itemId: 'sens', result: '类别 1', h: 'H317', status: 'AUTO'},
    note: 'SCL 优先于通用浓度限值；例外条件补充后重新执行本用例'
  }]
};

/* ---------- 3. 小工具 ---------- */
function clpRuleDeepClone(o){return JSON.parse(JSON.stringify(o == null ? null : o));}
function clpRuleFieldGet(rule, path){
  var seg = String(path).split('.'), cur = rule;
  for(var i = 0; i < seg.length; i++){if(cur == null)return undefined;cur = cur[seg[i]];}
  return cur;
}
/* 文本归一化：去首尾空格、连续空格折叠；空串与缺失等价（§13.1） */
function clpRuleNormText(v){
  if(v == null)return '';
  return String(v).replace(/\s+/g, ' ').trim();
}
function clpRuleNormValue(v){
  if(v == null)return '';
  if(typeof v === 'string')return clpRuleNormText(v);
  if(typeof v === 'number')return v;
  if(typeof v === 'boolean')return v;
  if(Array.isArray(v))return v.map(clpRuleNormValue);
  if(typeof v === 'object'){
    var out = {}, ks = Object.keys(v).sort();
    ks.forEach(function(k){if(CLP_AUDIT_FIELDS.indexOf(k) >= 0)return;out[k] = clpRuleNormValue(v[k]);});
    return out;
  }
  return String(v);
}
function clpRuleStableStringify(v){
  if(v == null || typeof v !== 'object')return JSON.stringify(v);
  if(Array.isArray(v))return '[' + v.map(clpRuleStableStringify).join(',') + ']';
  var ks = Object.keys(v).sort();
  return '{' + ks.map(function(k){return JSON.stringify(k) + ':' + clpRuleStableStringify(v[k]);}).join(',') + '}';
}
/* 归一化后的规则（不含生命周期 / 审核字段） */
function clpNormalizeRule(rule){return clpRuleNormValue(rule);}
/* 执行指纹：只有影响计算结果的字段参与（方法 / 参数 / 条件 / 输出 / H 码 / 优先级） */
function clpRuleExecutionFingerprint(rule){
  var o = {};
  CLP_EXEC_FIELDS.forEach(function(p){
    var v = clpRuleFieldGet(rule, p);
    if(v !== undefined)o[p] = clpRuleNormValue(v);
  });
  return clpRuleStableStringify(o);
}
/* 完整指纹：含文案与来源，用于判断「是否完全没变」 */
function clpRuleFullFingerprint(rule){return clpRuleStableStringify(clpNormalizeRule(rule));}
/* 差异值 → 页面可读文本 */
function clpRuleDiffText(v){
  if(v == null || v === '')return '（空）';
  if(Array.isArray(v))return v.map(clpRuleDiffText).join('；');
  if(typeof v === 'object'){
    return Object.keys(v).map(function(k){
      return (CLP_RULE_FIELD_LABELS[k] || k) + ' ' + clpRuleDiffText(v[k]);
    }).join('；');
  }
  return String(v);
}
/* 系统「今天」：规则发布、发布门禁、活动规则版本解析等**系统行为**的唯一日期来源。
   只走演示时间锚点（DEMO_TODAY），**永不读取 SDS 的计划投放日期**。
   投放日期是某一份 SDS 的业务上下文日期，只用于回答「这份 SDS 该按哪版法规计算」；
   反过来用它决定规则版本何时生效，就会把演示里的未来投放日变成「提前发布」。
   ⚠️ 需要「按投放日期匹配规则版本」时，请由调用方显式把日期传进
      clpActivePack() / clpEvaluateMixture()，不要在这里取。 */
function clpSystemToday(){
  return (typeof demoYmd === 'function') ? demoYmd() : '';
}
function clpRuleNowStamp(){
  var d = (typeof demoNow === 'function') ? demoNow() : new Date();
  function p(x){return (x < 10 ? '0' : '') + x;}
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
/* 方法版本快照：从阶段 1 注册表取得，随版本快照一起保存 */
function clpRuleMethodVersions(){
  var out = {};
  if(typeof complianceMethodList === 'function'){
    complianceMethodList().forEach(function(m){out[m.code] = m.version;});
  }
  return out;
}

/* ---------- 4. 版本存储与基线初始化 ---------- */
function clpRuleVersionList(){return CLP_RULE_VERSION_STORE.slice();}
function clpRuleVersionGet(id){
  return CLP_RULE_VERSION_STORE.filter(function(v){return v.id === id;})[0] || null;
}
function clpRuleVersionRules(v){return (v && v.rules) ? v.rules : [];}
/* ---------- 候选草稿版本：下一版准备纳入、但尚未发布的规则 ----------
   R-0006 / R-0007 不属于当前生效版本 R2026.2（二者 ver 本就是 R2027.1）。
   若塞进基线，就会出现「R2026.2 已生效规则集里混着 R2027.1 的待审核规则」，
   让版本快照与历史含义变得模糊。故单独建一个**候选草稿版本**承载它们：
     当前生效有什么（R2026.2，5 条）
     下一版准备加什么（R2027.1 候选，2 条）
     哪些因计算方法未实现而暂不发布（两者的 method 均为 not_implemented）
   注意：本函数只做**数据组织**，不改动任何法规结论或阈值。 */
function clpRuleVersionCandidate(){
  var id = 'CLP-RULESET-R2027.1', hit = null;
  CLP_RULE_VERSION_STORE.forEach(function(v){ if(v.id === id)hit = v; });
  return hit;
}
function clpRuleVersionSeedCandidate(){
  var c = clpRuleVersionCandidate();
  if(c)return c;
  var owner = (CLP_MODULES && CLP_MODULES.rules) ? CLP_MODULES.rules.owner : '';
  c = {
    id: 'CLP-RULESET-R2027.1',
    version: 'R2027.1',
    status: '草稿',
    isCandidate: true,
    frozen: false,
    source: {
      regulation: 'Regulation (EC) No 1272/2008',
      annex: 'Annex I',
      sourceFile: 'CLP_AnnexI_规则表_R2027.1_候选草稿.xlsx',
      sourceVersion: 'R2027.1',
      sourceDate: ''
    },
    createdBy: owner, createdAt: clpRuleNowStamp(),
    reviewedBy: '', reviewedAt: '', publishedAt: '',
    effectiveFrom: '2027-01-01', effectiveTo: '', cutoff: '',
    supersedesVersionId: '',
    rules: clpSyncRuleEngineStatus(clpRuleDeepClone(CLP_RULES_NEXT_CANDIDATE)),
    diffSummary: {}, gateSummary: {}, releaseManifest: {}, deferredRules: [],
    methodVersions: clpRuleMethodVersions()
  };
  CLP_RULE_VERSION_STORE.push(c);
  return c;
}

/* 规则库页面的「规则版本」下拉选项：默认读当前生效规则集（CLP_RULES 投影），
   也可切到任一版本（含候选草稿）查看「下一版准备纳入什么」。 */
function clpRuleVerOptions(sel){
  var h = '<option value="">当前生效规则集</option>';
  CLP_RULE_VERSION_STORE.forEach(function(v){
    h += '<option value="' + esc(v.id) + '"' + (sel === v.id ? ' selected' : '') + '>'
       + esc(v.version + '（' + v.status + '）') + '</option>';
  });
  return h;
}
function clpRuleVersionBaseline(){
  return CLP_RULE_VERSION_STORE.filter(function(v){return v.isBaseline;})[0] || null;
}
/* 基线初始化：把当前 CLP_RULES 冻结为 R2026.2 不可变快照。
   幂等：重复调用不会创建第二个基线版本。 */
function clpRuleVersionSeedBaseline(){
  var base = clpRuleVersionBaseline();
  if(base)return base;
  var ver = (CLP_MODULES && CLP_MODULES.rules) ? CLP_MODULES.rules.ver : 'R2026.2';
  var eff = (CLP_MODULES && CLP_MODULES.rules) ? CLP_MODULES.rules.eff : '';
  var owner = (CLP_MODULES && CLP_MODULES.rules) ? CLP_MODULES.rules.owner : '';
  base = {
    id: 'CLP-RULESET-' + ver,
    version: ver,
    status: '已生效',
    isBaseline: true,
    frozen: true,
    source: {
      regulation: 'Regulation (EC) No 1272/2008',
      annex: 'Annex I',
      sourceFile: 'CLP_AnnexI_规则表_' + ver + '.xlsx',
      sourceVersion: ver,
      sourceDate: (CLP_MODULES && CLP_MODULES.rules) ? CLP_MODULES.rules.cutoff : ''
    },
    createdBy: owner, createdAt: clpRuleNowStamp(),
    reviewedBy: owner, reviewedAt: clpRuleNowStamp(),
    publishedAt: clpRuleNowStamp(),
    effectiveFrom: eff, effectiveTo: '', cutoff: (CLP_MODULES && CLP_MODULES.rules) ? CLP_MODULES.rules.cutoff : '',
    supersedesVersionId: '',
    rules: clpSyncRuleEngineStatus(clpRuleDeepClone(CLP_RULES)),
    diffSummary: {}, gateSummary: {}, releaseManifest: {}, deferredRules: [],
    methodVersions: clpRuleMethodVersions()
  };
  CLP_RULE_VERSION_STORE.push(base);
  return base;
}
/* 已发布 / 已冻结版本不可编辑：再改必须复制为新草稿版本 */
function clpRuleVersionGuardEditable(v){
  if(!v)throw new Error('规则版本不存在');
  if(v.frozen)throw new Error('已发布版本不可编辑，请复制为新草稿版本');
  return v;
}
/* 候选草稿与基线快照**不参与版本号唯一性判定**：
   它们是「下一版规则暂存区」和「历史快照」，都不是一个真实发布的版本。
   若参与判定，导入向导（版本号默认就是 R2027.1）会直接命中候选草稿并把它整个覆盖掉。 */
function clpRuleVersionReserved(v){return !!(v && (v.isCandidate || v.isBaseline));}
/* 创建草稿：同一版本号若已有草稿则复用该草稿（导入向导允许反复重传），
   但已存在非草稿（已发布 / 已撤回）的同号版本时明确报错。 */
function clpRuleVersionCreateDraft(meta){
  meta = meta || {};
  var ver = meta.version || '';
  var clash = CLP_RULE_VERSION_STORE.filter(function(v){
    return !clpRuleVersionReserved(v) && v.version === ver && v.status !== '草稿' && v.status !== '校验失败';
  })[0];
  if(clash)throw new Error('版本 ' + ver + ' 已存在，请修改版本号。');
  var exist = CLP_RULE_VERSION_STORE.filter(function(v){
    return !clpRuleVersionReserved(v) && v.version === ver && (v.status === '草稿' || v.status === '校验失败');
  })[0];
  var v = exist || {id: 'CLP-RULESET-' + (ver || 'DRAFT') + '-DRAFT', createdAt: clpRuleNowStamp(), frozen: false, isBaseline: false};
  var base = clpRuleVersionBaseline();
  var rows = (meta.rows || []).map(clpRuleDeepClone);
  v.version = ver;
  v.status = '草稿';
  v.frozen = false;
  v.source = {
    regulation: (meta.source && meta.source.regulation) || 'Regulation (EC) No 1272/2008',
    annex: (meta.source && meta.source.annex) || 'Annex I',
    sourceFile: (meta.source && meta.source.sourceFile) || (meta.file || ''),
    sourceVersion: (meta.source && meta.source.sourceVersion) || '',
    sourceDate: (meta.source && meta.source.sourceDate) || ''
  };
  v.createdBy = meta.createdBy || (CLP_MODULES.rules && CLP_MODULES.rules.owner) || '';
  v.effectiveFrom = meta.effectiveFrom || '';
  v.effectiveTo = '';
  v.cutoff = meta.cutoff || '';
  v.supersedesVersionId = base ? base.id : '';
  v.rules = rows;
  v.methodVersions = clpRuleMethodVersions();
  v.deferredRules = [];
  v.diffSummary = {}; v.gateSummary = {}; v.releaseManifest = {};
  /* 上传表里若夹带了系统字段，记录并忽略（§十一） */
  v.ignoredUploadFields = [];
  rows.forEach(function(r){
    CLP_UPLOAD_SYSTEM_FIELDS.forEach(function(k){
      if(r && Object.prototype.hasOwnProperty.call(r, k) && v.ignoredUploadFields.indexOf(k) < 0)v.ignoredUploadFields.push(k);
    });
  });
  if(!exist)CLP_RULE_VERSION_STORE.push(v);
  return v;
}
function clpRuleVersionClone(id){
  var src = clpRuleVersionGet(id);
  if(!src)throw new Error('规则版本不存在');
  return clpRuleVersionCreateDraft({
    version: src.version + '-副本',
    source: clpRuleDeepClone(src.source),
    effectiveFrom: '', cutoff: src.cutoff,
    createdBy: src.createdBy, rows: clpRuleDeepClone(src.rules)
  });
}
function clpRuleVersionWithdraw(id){
  var v = clpRuleVersionGet(id);
  if(!v)return {ok: false, errors: ['规则版本不存在。']};
  if(v.status !== '待生效')return {ok: false, errors: ['只有「待生效」的版本可以撤回（当前状态：' + v.status + '）。']};
  v.status = '已撤回';
  clpSyncActiveRulesProjection();
  return {ok: true, version: v};
}

/* ---------- 5. 增量 Diff ---------- */
/* 单字段变化类型 */
function clpRuleFieldChangeType(field){
  if(field === 'method')return '方法映射变更';
  if(field.indexOf('run.') === 0)return '计算参数变更';
  if(field === 'target' || field === 'det.cond')return '适用条件变更';
  if(field === 'det.except')return '例外条件变更';
  if(field === 'det.prio')return '规则优先级变更';
  if(field === 'det.output')return '输出分类变更';
  if(field === 'h' || field === 'det.label')return 'H 码或标签要素变更';
  if(field === 'eff')return '生效日期变更';
  return '文案或来源变更';
}
var CLP_CHANGE_PRIORITY = ['方法映射变更', '计算参数变更', '适用条件变更', '例外条件变更',
  '规则优先级变更', '输出分类变更', 'H 码或标签要素变更', '生效日期变更', '文案或来源变更'];
function clpRulePrimaryChangeType(fields){
  var best = '文案或来源变更';
  fields.forEach(function(f){
    var t = f.changeType;
    if(CLP_CHANGE_PRIORITY.indexOf(t) >= 0 && CLP_CHANGE_PRIORITY.indexOf(t) < CLP_CHANGE_PRIORITY.indexOf(best))best = t;
  });
  return fields.length ? best : '未变化';
}
/* 参与 Diff 的字段：固定字段 + 两侧 run.* 的并集 */
function clpRuleDiffFields(a, b){
  var base = ['name', 'cat', 'target', 'method', 'h', 'eff',
    'det.inputs', 'det.cond', 'det.formula', 'det.except', 'det.prio', 'det.output', 'det.label', 'det.src'];
  var run = {};
  [a, b].forEach(function(r){
    var g = (r && r.run) || {};
    Object.keys(g).forEach(function(k){run[k] = 1;});
  });
  Object.keys(run).sort().forEach(function(k){base.push('run.' + k);});
  return base;
}
/* 候选版本 vs 当前活动版本：按内部规则编号比较 */
function clpRuleVersionCompare(baseVersion, draftVersion){
  var baseRules = clpRuleVersionRules(baseVersion), draftRules = clpRuleVersionRules(draftVersion);
  var baseById = {}, draftById = {};
  baseRules.forEach(function(r){baseById[r.id] = r;});
  draftRules.forEach(function(r){draftById[r.id] = r;});

  var added = [], modified = [], unchanged = [], deactivated = [], fieldDiffs = [];
  draftRules.forEach(function(d){
    var b = baseById[d.id];
    if(!b){
      added.push({ruleId: d.id, name: d.name, changeType: '新增规则', fields: [], affectsExecution: true});
      return;
    }
    var fields = [];
    clpRuleDiffFields(b, d).forEach(function(p){
      var bv = clpRuleNormValue(clpRuleFieldGet(b, p)), dv = clpRuleNormValue(clpRuleFieldGet(d, p));
      if(clpRuleStableStringify(bv) === clpRuleStableStringify(dv))return;
      var ct = clpRuleFieldChangeType(p);
      var affects = (CLP_EXEC_FIELDS.indexOf(p) >= 0) || p.indexOf('run.') === 0;
      var row = {ruleId: d.id, field: p, label: CLP_RULE_FIELD_LABELS[p] || p,
        before: bv, after: dv, changeType: ct, affectsExecution: affects};
      fields.push(row); fieldDiffs.push(row);
    });
    if(!fields.length){unchanged.push({ruleId: d.id, name: d.name, changeType: '未变化', fields: [], affectsExecution: false});return;}
    modified.push({
      ruleId: d.id, name: d.name, changeType: clpRulePrimaryChangeType(fields), fields: fields,
      affectsExecution: clpRuleExecutionFingerprint(b) !== clpRuleExecutionFingerprint(d)
    });
  });
  baseRules.forEach(function(b){
    if(!draftById[b.id])deactivated.push({ruleId: b.id, name: b.name, changeType: '候选停用', fields: [], affectsExecution: false});
  });
  return {
    baseVersion: baseVersion ? baseVersion.version : '',
    draftVersion: draftVersion ? draftVersion.version : '',
    added: added, modified: modified, unchanged: unchanged, deactivated: deactivated,
    fieldDiffs: fieldDiffs,
    summary: {added: added.length, modified: modified.length, unchanged: unchanged.length, deactivated: deactivated.length}
  };
}

/* ---------- 6. 引擎支持状态与规则测试 ---------- */
/* 引擎支持状态：全部由系统根据方法注册表 + 参数完整性生成（§十） */
function clpRuleEngineSupport(rule){
  var code = rule.method;
  if(!code)return {status: '需要研发实现', reason: '规则 ' + rule.id + ' 未填写「计算方法」，请先登记方法后再导入。'};
  if(!complianceHasMethod(code))
    return {status: '需要研发实现', reason: '规则 ' + rule.id + ' 使用的计算方法 ' + code + ' 尚未开发，本次不会发布。'};
  var m = complianceGetMethod(code);
  if(!complianceMethodImplemented(code))
    return {status: '需要研发实现', reason: '规则 ' + rule.id + ' 使用的计算方法「' + m.name + '」尚未实现，本次不会发布。'};
  var need = CLP_METHOD_PARAM_REQUIREMENTS[code] || [];
  var missing = need.filter(function(p){
    var v = clpRuleFieldGet(rule, 'run.' + p[0]);
    return v == null || v === '' || (Array.isArray(v) && !v.length);
  });
  if(missing.length)
    return {status: '需要配置参数', reason: '规则 ' + rule.id + ' 缺少「' + missing.map(function(p){return p[1];}).join('、') + '」，请补充后重新校验。'};
  return {status: '已支持', reason: ''};
}
/* ---------- 10.5 规则「引擎支持状态」的唯一取值入口 ----------
   合同口径：**引擎支持状态由系统生成，非人工填写**。
   因此页面渲染、规则筛选、发布门禁一律只能走本函数，从计算方法注册表实时派生；
   规则对象上的 `engine` 字段只是「上一次同步写回的缓存值」，不是事实源。 */
function clpRuleEngineStatusText(rule){
  if(!rule)return '需要研发实现';
  return clpRuleEngineSupport(rule).status;
}
/* 把派生状态写回规则对象：让 `engine` 字段始终等于注册表真实状态，
   避免「手工填写的已支持」与「引擎实际未实现」长期并存。
   写回时同时留下 systemGenerated 标记，页面可据此提示「该状态由系统生成」。 */
function clpSyncRuleEngineStatus(rules){
  (rules || []).forEach(function(r){
    r.engine = clpRuleEngineStatusText(r);
    r.engineSource = '系统生成';
  });
  return rules;
}

/* 规则测试：走真实引擎，只比对引擎自己给出的结果 */
function clpRuleTestRun(rule, cases){
  var out = [];
  (cases || []).forEach(function(tc){
    var comps = (tc.input && tc.input.components) || [], dict = {};
    comps.forEach(function(c){
      var p = (c.parameters && c.parameters.classifications) || {};
      dict[c.cas] = {
        name: c.name || c.cas, haz: p,
        ateState: (c.parameters && c.parameters.ateState) || 'known',
        ateO: (c.parameters && c.parameters.ateOral) || 0,
        ateD: (c.parameters && c.parameters.ateDermal) || 0,
        ateI: (c.parameters && c.parameters.ateInhalation) || 0,
        mM: (c.parameters && c.parameters.mAcute) || 0,
        mC: (c.parameters && c.parameters.mChronic) || 0,
        aqState: (c.parameters && c.parameters.aquaticState) || 'known'
      };
    });
    var formula = comps.map(function(c){return {cas: c.cas, name: c.name, conc: c.conc};});
    var ctx = complianceBuildContext(formula, rule, {id: 'RULE-TEST', market: 'EU', ruleIds: [], methodVersions: {}}, dict);
    var exec = complianceExecuteMethod(rule.method, ctx);
    var item = null;
    exec.items.forEach(function(it){if(it.id === tc.expected.itemId)item = it;});
    var actualResult = item ? item.result : '（未产出该分类项）';
    var actualH = item ? ((String(item.code || '').match(/H\d{3}/) || [''])[0]) : '';
    var pass = (actualResult === tc.expected.result)
      && (!tc.expected.status || exec.status === tc.expected.status)
      && (!tc.expected.h || actualH === tc.expected.h);
    out.push({
      id: tc.id, name: tc.name, note: tc.note || '',
      expected: tc.expected.result, actual: actualResult,
      expectedStatus: tc.expected.status || '', actualStatus: exec.status,
      h: actualH, pass: pass
    });
  });
  return out;
}
/* 未变化规则能否复用上一已生效版本的测试结果（§13.3） */
function clpRuleTestReusable(baseRule, draftRule, baseVersion){
  if(!baseRule)return false;
  if(baseRule.test !== '通过')return false;
  if(baseRule.method !== draftRule.method)return false;
  if(clpRuleExecutionFingerprint(baseRule) !== clpRuleExecutionFingerprint(draftRule))return false;
  var m = complianceGetMethod(draftRule.method);
  if(baseVersion && baseVersion.methodVersions && baseVersion.methodVersions[draftRule.method] && m
    && baseVersion.methodVersions[draftRule.method] !== m.version)return false;
  return true;
}

/* ---------- 7. 发布门禁 ---------- */
/* 单条规则门禁：返回 {ruleId, changeType, gateStatus, issues, testResult, engineSupport, includedInRelease} */
function clpEvaluateRuleGate(rule, context){
  context = context || {};
  var id = rule.id, issues = [];
  var support = clpRuleEngineSupport(rule);
  if(support.reason)issues.push(support.reason);
  /* 必填字段与来源条款（业务语言） */
  [['name', '规则名称'], ['cat', '危害类别'], ['target', '适用对象'], ['method', '计算方法'], ['ref', '来源条款位置']]
    .forEach(function(p){
      var v = clpRuleFieldGet(rule, p[0]);
      if(!clpRuleNormText(v))issues.push('规则 ' + id + ' 缺少「' + p[1] + '」。');
    });
  if(!clpRuleNormText(clpRuleFieldGet(rule, 'det.src')))issues.push('规则 ' + id + ' 未填写来源章节及条款号。');
  /* H 码字典引用 */
  var h = clpRuleNormText(rule.h);
  if(h && !(typeof CLP_LABELS === 'object' && CLP_LABELS.some(function(r){return r.code === h;})))
    issues.push('规则 ' + id + ' 输出的 ' + h + ' 在标签字典中未找到。');

  var cases = CLP_RULE_TEST_CASES[id] || [];
  var reuse = clpRuleTestReusable(context.baseRule, rule, context.baseVersion);
  var testResult = {reused: false, fromVersion: '', cases: [], pass: false, ran: false};
  var gateStatus, changeType = context.changeType || '未变化';

  if(changeType === '候选停用'){
    gateStatus = '待确认停用';
  }else if(issues.length){
    gateStatus = support.status === '需要配置参数' ? '待补充' : '待研发实现';
  }else if(changeType === '未变化'){
    if(reuse){
      testResult.reused = true;
      testResult.fromVersion = context.baseVersion ? context.baseVersion.version : '';
      testResult.pass = true;
      gateStatus = '未变化';
    }else if(cases.length){
      testResult.cases = clpRuleTestRun(rule, cases);
      testResult.ran = true;
      testResult.pass = testResult.cases.every(function(c){return c.pass;});
      gateStatus = testResult.pass ? '未变化' : '测试失败';
      if(!testResult.pass)issues.push(clpRuleTestFailMessage(id, testResult.cases));
    }else{
      gateStatus = '待补充';
      issues.push('规则 ' + id + ' 缺少代表性测试用例，请补充后重新校验。');
    }
  }else{
    /* 新增或变化：非执行类变化且可复用 → 免重测；否则必须有测试用例且通过 */
    if(context.isNew){
      if(!cases.length){
        gateStatus = '待补充';
        issues.push('规则 ' + id + ' 为新增规则，缺少代表性测试用例，请补充后重新校验。');
      }else{
        testResult.cases = clpRuleTestRun(rule, cases);
        testResult.ran = true;
        testResult.pass = testResult.cases.every(function(c){return c.pass;});
        gateStatus = testResult.pass ? '可发布' : '测试失败';
        if(!testResult.pass)issues.push(clpRuleTestFailMessage(id, testResult.cases));
      }
    }else if(reuse){
      testResult.reused = true;
      testResult.fromVersion = context.baseVersion ? context.baseVersion.version : '';
      testResult.pass = true;
      gateStatus = '可发布';
    }else if(cases.length){
      testResult.cases = clpRuleTestRun(rule, cases);
      testResult.ran = true;
      testResult.pass = testResult.cases.every(function(c){return c.pass;});
      gateStatus = testResult.pass ? '可发布' : '测试失败';
      if(!testResult.pass)issues.push(clpRuleTestFailMessage(id, testResult.cases));
    }else{
      gateStatus = '待补充';
      issues.push('规则 ' + id + ' 已发生变化，缺少代表性测试用例，请补充后重新校验。');
    }
  }
  return {
    ruleId: id, name: rule.name, changeType: changeType, gateStatus: gateStatus,
    issues: issues, testResult: testResult, engineSupport: support.status,
    includedInRelease: gateStatus === '可发布'
  };
}
/* 测试失败的业务语言提示（不暴露堆栈 / 内部状态名） */
function clpRuleTestFailMessage(id, cases){
  var bad = cases.filter(function(c){return !c.pass;})[0];
  if(!bad)return '规则 ' + id + ' 的测试未通过。';
  return '规则 ' + id + ' 的边界测试未通过（实测「' + bad.actual + '」，预期「' + bad.expected + '」），请核对阈值和预期结果。';
}
/* 版本级门禁（§16） */
function clpRuleVersionValidate(draftVersion){
  var errors = [];
  if(!draftVersion)return {ok: false, errors: ['规则版本不存在。']};
  var ver = draftVersion.version;
  if(!clpRuleNormText(ver))errors.push('请填写模块版本号。');
  else if(CLP_RULE_VERSION_STORE.some(function(v){
    return v !== draftVersion && !clpRuleVersionReserved(v)
      && v.version === ver && v.status !== '草稿' && v.status !== '校验失败';
  }))errors.push('版本 ' + ver + ' 已存在，请修改版本号。');
  var s = draftVersion.source || {};
  if(!clpRuleNormText(s.regulation))errors.push('请填写「官方来源名称」。');
  if(!clpRuleNormText(s.annex))errors.push('请填写来源 Annex。');
  if(!clpRuleNormText(s.sourceVersion))errors.push('请填写「法规或 ATP 编号」。');
  if(!clpRuleNormText(s.sourceDate))errors.push('请填写来源发布日期。');
  if(!clpRuleNormText(draftVersion.effectiveFrom))errors.push('请填写生效日期。');
  else if(!/^\d{4}-\d{2}-\d{2}$/.test(draftVersion.effectiveFrom))errors.push('生效日期格式应为 YYYY-MM-DD。');
  else if(draftVersion.cutoff && draftVersion.effectiveFrom < draftVersion.cutoff)
    errors.push('生效日期早于数据截止日期（' + draftVersion.cutoff + '），请核对。');
  if(draftVersion.frozen)errors.push('已发布版本不可编辑，请复制为新草稿版本。');
  return {ok: !errors.length, errors: errors};
}
/* 跑完版本内所有规则门禁 */
function clpRuleVersionRunGates(draftVersion){
  if(!draftVersion)return null;
  var active = clpRuleVersionResolve(clpSystemToday()) || clpRuleVersionBaseline();
  var baseRules = clpRuleVersionRules(active), baseById = {};
  baseRules.forEach(function(r){baseById[r.id] = r;});
  var diff = clpRuleVersionCompare(active, draftVersion);
  var changeById = {};
  diff.added.forEach(function(x){changeById[x.ruleId] = x;});
  diff.modified.forEach(function(x){changeById[x.ruleId] = x;});
  diff.unchanged.forEach(function(x){changeById[x.ruleId] = x;});

  var entries = [];
  draftVersion.rules.forEach(function(rule){
    var ch = changeById[rule.id];
    var changeType = ch ? ch.changeType : '未变化';
    var entry = clpEvaluateRuleGate(rule, {
      baseRule: baseById[rule.id] || null,
      baseVersion: active,
      changeType: changeType,
      isNew: !baseById[rule.id]
    });
    entry.affectsExecution = !!(ch && ch.affectsExecution);
    entries.push(entry);
  });
  diff.deactivated.forEach(function(x){
    var old = baseById[x.ruleId];
    entries.push({
      ruleId: x.ruleId, name: x.name, changeType: '候选停用', gateStatus: '待确认停用',
      issues: ['候选停用须由法规专员统一确认；未确认时旧规则继续有效。'],
      testResult: {reused: false, fromVersion: '', cases: [], pass: false, ran: false},
      engineSupport: old ? clpRuleEngineSupport(old).status : '需要研发实现',
      includedInRelease: false, affectsExecution: false
    });
  });
  var summary = {publishable: 0, deferred: 0, needInput: 0, needDev: 0, testFailed: 0, unchanged: 0, deactivationPending: 0};
  entries.forEach(function(e){
    if(e.gateStatus === '可发布')summary.publishable++;
    else if(e.gateStatus === '测试失败')summary.testFailed++;
    else if(e.gateStatus === '待研发实现')summary.needDev++;
    else if(e.gateStatus === '待补充')summary.needInput++;
    else if(e.gateStatus === '未变化')summary.unchanged++;
    else if(e.gateStatus === '待确认停用')summary.deactivationPending++;
  });
  summary.deferred = summary.testFailed + summary.needDev + summary.needInput;
  draftVersion.diffSummary = diff;
  draftVersion.gateSummary = {entries: entries, summary: summary, baseVersion: active.version};
  /* 版本状态：有可发布变化 → 待审核；否则落到对应的待处理状态 */
  if(!draftVersion.frozen){
    draftVersion.status = summary.publishable > 0 ? '待审核'
      : (summary.needDev > 0 ? '待研发实现' : (summary.needInput > 0 ? '待补充' : (summary.testFailed > 0 ? '测试失败' : '草稿')));
  }
  var val = clpRuleVersionValidate(draftVersion);
  if(!val.ok && draftVersion.status !== '待审核')draftVersion.status = '校验失败';
  draftVersion.gateSummary.validate = val;
  return draftVersion.gateSummary;
}

/* ---------- 8. Release Manifest（§17） ---------- */
function clpRuleVersionBuildReleaseManifest(draftVersion){
  var gates = clpRuleVersionRunGates(draftVersion);
  var active = clpRuleVersionResolve(clpSystemToday()) || clpRuleVersionBaseline();
  var baseById = {};
  clpRuleVersionRules(active).forEach(function(r){baseById[r.id] = r;});
  var publishable = [], unchanged = [], retainedOld = [], deferred = [], deactivated = [];
  gates.entries.forEach(function(e){
    if(e.gateStatus === '可发布'){publishable.push(e.ruleId);return;}
    else if(e.gateStatus === '未变化'){unchanged.push(e.ruleId);return;}
    else if(e.gateStatus === '待确认停用'){deactivated.push(e.ruleId);return;}
    else deferred.push({ruleId: e.ruleId, gateStatus: e.gateStatus, reason: (e.issues[0] || ''), engineSupport: e.engineSupport});
    /* 未通过门禁的**已有规则** → 旧版继续生效（不静默丢弃） */
    if(baseById[e.ruleId])retainedOld.push(e.ruleId);
  });
  /* 候选停用需统一确认：未确认则旧规则继续有效 */
  var confirmed = !!(draftVersion.deactivationConfirmed);
  var man = {
    publishableRules: publishable,
    unchangedRules: unchanged,
    retainedOldRules: retainedOld,
    deactivatedRules: confirmed ? deactivated : [],
    pendingDeactivationRules: deactivated,
    deferredRules: deferred,
    deactivationConfirmed: confirmed,
    summary: {
      publishable: publishable.length, unchanged: unchanged.length, retained: retainedOld.length,
      deactivated: confirmed ? deactivated.length : 0, deferred: deferred.length,
      pendingDeactivation: deactivated.length
    }
  };
  draftVersion.releaseManifest = man;
  return man;
}

/* ---------- 9. 单一审核与发布（§18 / §19） ---------- */
var CLP_REVIEW_DECLARATION = '我已对照法规原文核对本次发布清单、参数变化与停用项。';
function clpRuleVersionPublish(draftVersion, reviewInfo){
  reviewInfo = reviewInfo || {};
  if(!draftVersion)return {ok: false, errors: ['规则版本不存在。']};
  if(draftVersion.frozen)return {ok: false, errors: ['已发布版本不可编辑，请复制为新草稿版本。']};
  var val = clpRuleVersionValidate(draftVersion);
  if(!val.ok)return {ok: false, errors: val.errors};
  var man = clpRuleVersionBuildReleaseManifest(draftVersion);
  if(!man.summary.publishable && !man.summary.deactivated)
    return {ok: false, errors: ['本次没有可发布的规则变化，无法发布。']};
  if(!reviewInfo.declarationAccepted)
    return {ok: false, errors: ['请先勾选审核确认：' + CLP_REVIEW_DECLARATION]};
  if(!clpRuleNormText(reviewInfo.reviewedBy))return {ok: false, errors: ['请填写审核人。']};

  var active = clpRuleVersionResolve(clpSystemToday());
  var merged = clpRuleDeepClone(clpRuleVersionRules(active));
  var idx = {};
  merged.forEach(function(r, i){idx[r.id] = i;});
  var cand = {};
  draftVersion.rules.forEach(function(r){cand[r.id] = r;});
  /* ① 通过门禁的新增 / 修改规则 → 采用候选版本 */
  man.publishableRules.forEach(function(id){
    var r = clpRuleDeepClone(cand[id]);
    r.ver = draftVersion.version;
    r.status = '已发布';
    r.test = '通过';
    r.engine = clpRuleEngineSupport(r).status;
    r.checker = reviewInfo.reviewedBy;
    r.checkDate = String(reviewInfo.reviewedAt || clpRuleNowStamp()).slice(0, 10);
    if(idx[id] === undefined){merged.push(r);idx[id] = merged.length - 1;}
    else merged[idx[id]] = r;
  });
  /* ② 明确确认的停用规则 → 移除
     ⚠️ 必须「先收集、再整体过滤」，不能边遍历边 splice：
        删掉一条后，后面所有元素的下标都会前移，
        第二条起就会删到别的规则头上（该删的没删、不该删的被删）。 */
  var delIds = {};
  man.deactivatedRules.forEach(function(id){delIds[id] = 1;});
  merged = merged.filter(function(r){return !delIds[r.id];});
  draftVersion.rules = merged;
  draftVersion.reviewedBy = reviewInfo.reviewedBy;
  draftVersion.reviewedAt = reviewInfo.reviewedAt || clpRuleNowStamp();
  draftVersion.reviewNote = reviewInfo.reviewNote || '';
  draftVersion.declarationAccepted = true;
  draftVersion.declaration = CLP_REVIEW_DECLARATION;
  draftVersion.publishedAt = clpRuleNowStamp();
  draftVersion.methodVersions = clpRuleMethodVersions();
  draftVersion.deferredRules = man.deferredRules;
  draftVersion.frozen = true;
  /* ③ 生效日期：晚于演示当前日期 → 待生效，当前活动版本不变 */
  var today = clpSystemToday();
  if(draftVersion.effectiveFrom && draftVersion.effectiveFrom > today){
    draftVersion.status = '待生效';
  }else{
    draftVersion.status = '已生效';
    if(active && active !== draftVersion){
      active.status = '已失效';
      active.effectiveTo = draftVersion.effectiveFrom;
    }
  }
  clpSyncActiveRulesProjection();
  return {ok: true, version: draftVersion, manifest: man};
}

/* ---------- 10. 活动版本解析与 CLP_RULES 兼容投影（§7 / §20） ---------- */
/* 按日期解析活动版本：已生效或已发布有效（待生效且已到期）→ 生效日期不晚于
   asOfDate → 未撤回 → 取生效日期最新者。 */
function clpRuleVersionResolve(asOfDate){
  var d = asOfDate || clpSystemToday();
  var cands = CLP_RULE_VERSION_STORE.filter(function(v){
    if(v.status === '已撤回')return false;
    if(v.status !== '已生效' && v.status !== '待生效' && v.status !== '已失效')return false;
    if(!v.effectiveFrom || v.effectiveFrom > d)return false;
    /* 已被后续版本替代（effectiveTo 不晚于查询日）的历史版本不得再被选中，
       但查询日早于 effectiveTo 时它仍是当时的活动版本 —— 历史日期仍能解析到历史规则。 */
    if(v.effectiveTo && v.effectiveTo <= d)return false;
    return true;
  });
  if(!cands.length)return null;
  cands.sort(function(a, b){return a.effectiveFrom < b.effectiveFrom ? -1 : (a.effectiveFrom > b.effectiveFrom ? 1 : 0);});
  return cands[cands.length - 1];
}
/* 给 clpActivePack() 用的规则来源：按日期给出活动版本的规则副本 */
function clpRuleVersionRulesFor(asOfDate){
  var v = clpRuleVersionResolve(asOfDate);
  if(!v)return CLP_RULES;
  return clpRuleDeepClone(v.rules);
}
/* ⚠️ CLP_RULES 已由「版本历史存储」降级为「活动版本兼容投影」：
      发布新版本后由本函数同步；历史版本一律保存在 CLP_RULE_VERSION_STORE。 */
function clpSyncActiveRulesProjection(asOfDate){
  clpRuleVersionSeedBaseline();
  var v = clpRuleVersionResolve(asOfDate || clpSystemToday());
  if(!v)return null;
  CLP_RULES = clpSyncRuleEngineStatus(clpRuleDeepClone(v.rules));
  return v;
}

/* ---------- 11. 启动：种子基线 + 候选草稿 + 同步兼容投影 ---------- */
clpRuleVersionSeedBaseline();
clpRuleVersionSeedCandidate();
clpSyncActiveRulesProjection();
