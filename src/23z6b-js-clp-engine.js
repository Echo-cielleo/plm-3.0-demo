/* ==================================================================
   [23z6b] 合规计算引擎内核 · 最小真实计算引擎（2026-09-22 阶段 1）
   ------------------------------------------------------------------
   定位：把 23z6-js-clp.js 中 clpEvaluateMixture() 里**已经存在、已经在演示中
   真实运行**的四类计算，抽成「方法注册表 + 执行器 + 统一返回结构 + 兼容适配器」。
   clpEvaluateMixture() 由此从「计算函数」变成「规则包调度器」。

   本阶段是**行为保持型重构**：
     · 不改法规阈值、不改分类区间、不改默认演示结果；
     · 不根据外部知识纠正法规内容；
     · 不实现 M-LIST / ED / PBT / vPvB / PMT / vPvM / Bridging / 中国 GHS / 运输。

   ⚠️ 法规正确性边界（重要）：
     本引擎输出的是「演示原型中已配置的计算基线」，
     **不代表已完成全部法规专业核验**。发现疑点一律记录到
     续接指南「待专业核验项」，不在本阶段改结论。

   加载位置：23-js-sds.js → 23z6-js-clp.js → 23z6a-js-clp-import.js → 23z6b（本文件）
   依赖的既有全局量：CLP_RULES / CLP_METHODS / CLP_MODULES / CLP_LABELS / P_BY_H
   复用的既有纯函数：clpCalcNum() / clpCalcInput()（23z6 提供，保证展示文案 1:1 不变）

   执行器约束（本文件所有 clpEngine* 函数）：
     · 不读 DOM、不改 DOM、不弹 toast、不开 modal、不跳页；
     · 不修改 wz / COMP_CLP / CLP_RULES / 传入的配方数组与上下文对象；
     · 相同输入必须得到相同输出；
     · 不解析表达式字符串，不使用动态求值（无表达式 DSL、无用户可编辑公式）；
     · 缺输入时返回 NEED_INPUT，**不允许默认输出「不分类」**。
   ================================================================== */

/* ---------- 1. 状态常量与注册表 ---------- */
/* 方法实现状态：只有 implemented 才可能进入活动规则包 */
var COMPLIANCE_METHOD_STATUS = ['implemented', 'not_implemented', 'disabled'];
/* 引擎内部状态：UI 不得直接解析，一律经 complianceUiStatus() 映射 */
var COMPLIANCE_ENGINE_STATUS = ['AUTO', 'NO_MATCH', 'NEED_INPUT', 'UNSUPPORTED_METHOD', 'BLOCKED', 'ERROR'];
/* 计算方法注册表：key = 方法代码 */
var COMPLIANCE_METHOD_REGISTRY = {};
/* 兼容顺序表：重构前 clpEvaluateMixture() 的 items 顺序。
   调度器按规则顺序执行（GCL 一次产出 skin + eye），收集后的自然顺序会变成
   acuteOral / skin / eye / sens / aqua；为保持 SDS 第 4 步与标签要素的既有展示顺序，
   由适配器按此表做一次稳定排序（未知 id 追加在末尾）。 */
var COMPLIANCE_ITEM_ORDER = ['acuteOral', 'skin', 'sens', 'eye', 'aqua'];

/* ---------- 2. 注册与查找 ---------- */
function complianceMethodList(){
  return Object.keys(COMPLIANCE_METHOD_REGISTRY).map(function(k){return COMPLIANCE_METHOD_REGISTRY[k];});
}
function complianceGetMethod(code){return COMPLIANCE_METHOD_REGISTRY[code] || null;}
function complianceHasMethod(code){return !!COMPLIANCE_METHOD_REGISTRY[code];}
function complianceMethodImplemented(code){
  var m = complianceGetMethod(code);
  return !!m && m.implementationStatus === 'implemented' && typeof m.execute === 'function';
}
/* 注册：重复注册、缺版本、缺执行函数、状态非法一律**明确报错**，不静默覆盖 */
function complianceRegisterMethod(def){
  if(!def || typeof def !== 'object')throw new Error('[合规引擎] 方法定义无效');
  var code = def.code;
  if(!code || typeof code !== 'string')throw new Error('[合规引擎] 方法代码不能为空');
  if(COMPLIANCE_METHOD_REGISTRY[code])throw new Error('[合规引擎] 方法重复注册：' + code);
  if(!def.version)throw new Error('[合规引擎] 方法版本不能为空：' + code);
  if(COMPLIANCE_METHOD_STATUS.indexOf(def.implementationStatus) < 0)
    throw new Error('[合规引擎] 方法实现状态不在允许值内：' + code + ' / ' + def.implementationStatus);
  if(typeof def.execute !== 'function')throw new Error('[合规引擎] 方法缺少可执行函数：' + code);
  COMPLIANCE_METHOD_REGISTRY[code] = def;
  return def;
}

/* ---------- 3. 统一执行上下文 ----------
   调度器调用；执行器只读。测试夹具可传 compData，实际配方读取统一 profile。 */
function complianceBuildContext(formula, rule, pack, compData){
  var day=(pack&&pack.asOfDate)||demoYmd();
  var comps = (formula || []).map(function(f){
    var profile=compData?null:clpSubstanceProfile(f.cas,day);
    var e=profile&&profile.effective;
    var p=compData?(compData[f.cas]||{}):{
      name:profile.name,haz:e.hazardMap,ateState:e.ateState,ateO:e.ateValues.oral,ateD:e.ateValues.dermal,
      ateI:e.ateValues.inhalation,mM:e.mFactors.acute,mC:e.mFactors.chronic,aqState:e.aquaticState
    };
    return {
      cas: f.cas,
      name: f.name || p.name || f.cas,
      concentration: parseFloat(f.conc) || 0,
      dataVersion:profile?profile.dataVersion:{},
      provenance:profile?profile.provenance:{},
      conflicts:profile?profile.conflicts:[],
      parameters: {
        classifications: p.haz || {},
        ateState: p.ateState || 'unknown',
        ateOral: p.ateO == null ? null : p.ateO,
        ateDermal: p.ateD == null ? null : p.ateD,
        ateInhalation: p.ateI == null ? null : p.ateI,
        mAcute: p.mM == null ? null : p.mM,
        mChronic: p.mC == null ? null : p.mC,
        aquaticState: p.aqState || 'unknown'
      }
    };
  });
  return {
    market: (pack && pack.market) || 'EU',
    asOfDate: day,
    rule: {
      id: rule.id,
      version: rule.ver || '',
      method: rule.method || '',
      parameters: rule.run || {}
    },
    pack: {
      id: pack ? pack.id : '',
      market: pack ? pack.market : 'EU',
      ruleIds: pack ? (pack.ruleIds || []) : [],
      methodVersions: pack ? (pack.methodVersions || {}) : {}
    },
    components: comps
  };
}

/* ---------- 4. 执行入口（统一捕获异常，不向业务用户抛堆栈） ---------- */
function complianceExecuteMethod(code, context){
  var def = complianceGetMethod(code);
  var rule = (context && context.rule) || {};
  var shell = {
    method: {code: code, version: def ? def.version : ''},
    rule: {id: rule.id || '', version: rule.version || ''},
    status: 'BLOCKED',
    items: [],
    inputs: [],
    intermediates: {},
    evidence: [],
    messages: []
  };
  if(!def){
    shell.status = 'UNSUPPORTED_METHOD';
    shell.messages.push('规则引用的计算方法尚未登记（' + code + '），无法执行，已转为人工判断。');
    return shell;
  }
  if(def.implementationStatus !== 'implemented' || typeof def.execute !== 'function'){
    shell.status = 'BLOCKED';
    shell.messages.push('计算方法「' + def.name + '」当前不可调用，需要研发实现或配置后启用。');
    return shell;
  }
  var fieldPrefix={'CLP-M-ATE-SUM':['ateValues.'],'CLP-M-GCL-SUM':['classifications.','specificLimits.'],
    'CLP-M-SCL':['specificLimits.','classifications.'],'CLP-M-MFACTOR':['mFactors.','classifications.']}[code]||[];
  var unresolved=(context.components||[]).reduce(function(a,c){return a.concat((c.conflicts||[]).filter(function(x){
    return x.affectsCalculation!==false&&x.effectiveSource!=='legacy-engine-baseline'&&fieldPrefix.some(function(p){return x.field.indexOf(p)===0;});
  }));},[]);
  if(unresolved.length){
    shell.status='BLOCKED';shell.messages.push('组分分类参数存在待专业核验冲突，当前方法暂不能自动计算。');
    return shell;
  }
  var out;
  try{
    out = def.execute(context) || {};
  }catch(e){
    shell.status = 'ERROR';
    shell.messages.push('当前分类方法执行失败，请联系系统管理员检查规则配置。');
    /* 开发调试用：只保留错误摘要，不含堆栈、不含组分之外的敏感数据 */
    shell.debug = {methodCode: code, ruleId: rule.id || '', reason: String((e && e.message) || e || '')};
    return shell;
  }
  shell.status = out.status || 'AUTO';
  shell.items = out.items || [];
  shell.inputs = out.inputs || [];
  shell.intermediates = out.intermediates || {};
  shell.evidence = out.evidence || [];
  shell.messages = out.messages || [];
  /* 名单方法的条目结果独立于 CLP 分类 items；只透传该方法明确返回的字段。 */
  if(code === 'M-LIST'){
    shell.datasetVersions = out.datasetVersions || {};
    shell.entryResults = out.entryResults || [];
    shell.summary = out.summary || {};
    shell.coverage = out.coverage || {};
  }
  return shell;
}

/* ---------- 5. 执行器：CLP-M-ATE-SUM（经口急性毒性 ATE 加和法） ----------
   迁移自原 clpEvaluateMixture() 的 ATE 段；阈值区间来自 rule.parameters.thresholds，
   执行器内不写死任何数值。 */
function clpEngineAte(ctx){
  var prm = ctx.rule.parameters, ths = prm.thresholds || [], packId = ctx.pack.id;
  var rows = ctx.components.filter(function(c){return !!c.parameters.classifications.acuteOral;});
  var missing = rows.filter(function(c){return c.parameters.ateState !== 'known' || !(c.parameters.ateOral > 0);});
  var inv = 0;
  rows.forEach(function(c){if(c.parameters.ateOral > 0)inv += c.concentration / c.parameters.ateOral;});
  var ateMix = inv > 0 ? 100 / inv : 0, hit = null;
  if(ateMix)ths.some(function(t){if(ateMix <= t.max){hit = t;return true;}return false;});

  /* 展示串由 clpCalcInput() 拼接；它只回传元素本身，故标签预置在行对象 tag 上 */
  var rowsView = rows.map(function(c){
    return {name: c.name, conc: c.concentration, tag: 'ATE ' + clpCalcNum(c.parameters.ateOral, 0) + ' mg/kg'};
  });
  var input = clpCalcInput(rowsView, function(r){return r.tag;});
  var formula = missing.length
    ? '缺少可用 ATE：' + missing.map(function(c){return c.name;}).join('、') + ' → 转人工判定'
    : 'ATE_mix = 100 / Σ(Ci / ATEi) = ' + clpCalcNum(ateMix, 0) + ' mg/kg → ' + (hit ? hit.cat : '未达到类别 4');
  var opts = ths.map(function(t){
    return {o: t.cat, d: 'ATE_mix ≤ ' + t.max + ' mg/kg', hit: (hit && hit.cat === t.cat) ? '✓ 系统建议' : '未命中'};
  }).concat([{o: '不分类（无需分类）', d: 'ATE_mix > 2 000 mg/kg', hit: (!hit && !missing.length) ? '✓ 当前结果' : '未命中'}]);

  var item = {
    id: 'acuteOral', name: '急性毒性（经口）',
    result: missing.length ? '—' : (hit ? hit.cat : '不分类'),
    code: missing.length ? '待人工判定'
      : (hit ? (hit.h + ' ' + (hit.h === 'H301' ? '吞咽中毒' : (hit.h === 'H302' ? '吞咽有害' : '吞咽致命')))
        : ('ATE_mix ' + clpCalcNum(ateMix, 0) + ' mg/kg')),
    rule: 'CLP Annex I 3.1.3.6 · ATE 加和法',
    display: {input: input, formula: formula},
    opts: opts,
    src: [['reg', 'CLP 规则包 ' + packId], ['sup', '组分基础数据 · ATE']]
  };
  return {
    status: missing.length ? 'NEED_INPUT' : (hit ? 'AUTO' : 'NO_MATCH'),
    items: [item],
    inputs: rows.map(function(c){
      return {cas: c.cas, name: c.name, concentration: c.concentration,
        ate: c.parameters.ateOral, ateState: c.parameters.ateState,
        usable: c.parameters.ateState === 'known' && c.parameters.ateOral > 0};
    }),
    intermediates: {
      usableComponents: rows.filter(function(c){return c.parameters.ateOral > 0;}).map(function(c){return c.name + ' ' + clpCalcNum(c.concentration) + '%';}),
      missingAteComponents: missing.map(function(c){return c.name;}),
      inverseSum: inv,
      ateMix: ateMix,
      hitCategory: hit ? hit.cat : '',
      thresholds: ths.map(function(t){return t.cat + ' ≤ ' + t.max;})
    },
    evidence: item.src,
    messages: missing.length ? ['缺少可用 ATE 数据，该项不产出自动结论。'] : []
  };
}

/* ---------- 6. 执行器：CLP-M-GCL-SUM（通用浓度限值加和法：皮肤 + 眼） ----------
   一个方法返回两个分类项（skin / eye）；阈值与权重全部来自 rule.parameters。 */
function clpEngineGcl(ctx){
  var g = ctx.rule.parameters, packId = ctx.pack.id;
  var skinCorr = ctx.components.filter(function(c){return !!c.parameters.classifications.skinCorr;});
  var skinIrr = ctx.components.filter(function(c){return !!c.parameters.classifications.skinIrrit;});
  var corrSum = skinCorr.reduce(function(n, c){return n + c.concentration;}, 0);
  var irrSum = skinIrr.reduce(function(n, c){return n + c.concentration;}, 0);
  var skinWeighted = g.weight * corrSum + irrSum;
  var skinResult = corrSum >= g.skinCorr ? '腐蚀 类别 1A/1B/1C' : (skinWeighted >= g.skinIrrit ? '类别 2' : '不分类');

  var eyeDam = ctx.components.filter(function(c){return !!c.parameters.classifications.eyeDamage;});
  var eyeIrr = ctx.components.filter(function(c){return !!c.parameters.classifications.eyeIrrit;});
  var damSum = eyeDam.reduce(function(n, c){return n + c.concentration;}, 0);
  var eyeIrrSum = eyeIrr.reduce(function(n, c){return n + c.concentration;}, 0);
  var eyeWeighted = g.weight * damSum + eyeIrrSum;
  var eyeResult = damSum >= g.eyeDamage ? '类别 1' : (eyeWeighted >= g.eyeIrrit ? '类别 2' : '不分类');

  var skinView = skinCorr.concat(skinIrr).map(function(c){
    return {name: c.name, conc: c.concentration,
      tag: c.parameters.classifications.skinCorr ? 'Skin Corr. ' + c.parameters.classifications.skinCorr : 'Skin Irrit. 2'};
  });
  var skinInput = clpCalcInput(skinView, function(r){return r.tag;});
  var eyeView = eyeDam.concat(eyeIrr).map(function(c){
    return {name: c.name, conc: c.concentration,
      tag: c.parameters.classifications.eyeDamage ? 'Eye Dam. 1' : 'Eye Irrit. 2'};
  });
  var eyeInput = clpCalcInput(eyeView, function(r){return r.tag;});

  var skin = {
    id: 'skin', name: '皮肤腐蚀/刺激', result: skinResult,
    code: skinResult.indexOf('腐蚀 类别 1') === 0 ? 'H314 造成严重皮肤灼伤和眼损伤'
      : (skinResult === '类别 2' ? 'H315 造成皮肤刺激' : '未达到分类阈值'),
    rule: 'CLP Annex I 3.2.3 · 通用浓度限值加和法',
    display: {
      input: skinInput,
      formula: 'Σ(Skin Corr. 1) = ' + clpCalcNum(corrSum) + '%；10×Σ(Cat.1) + Σ(Cat.2) = ' + clpCalcNum(skinWeighted) + '% → ' + skinResult
    },
    opts: [
      {o: '腐蚀 类别 1A/1B/1C', d: 'Σ(Skin Corr. 1) ≥ ' + g.skinCorr + '%', hit: corrSum >= g.skinCorr ? '✓ 系统建议' : '当前 ' + clpCalcNum(corrSum) + '%'},
      {o: '类别 2', d: g.weight + '×Σ(Cat.1) + Σ(Cat.2) ≥ ' + g.skinIrrit + '%', hit: skinResult === '类别 2' ? '✓ 系统建议' : '当前 ' + clpCalcNum(skinWeighted) + '%'},
      {o: '不分类（无需分类）', d: '低于上述阈值', hit: skinResult === '不分类' ? '✓ 当前结果' : '未命中'}
    ],
    src: [['reg', 'CLP 规则包 ' + packId], ['reg', 'Annex VI / 物质分类数据']]
  };
  var eye = {
    id: 'eye', name: '严重眼损伤/眼刺激', result: eyeResult,
    code: eyeResult === '类别 1' ? 'H318 造成严重眼损伤' : (eyeResult === '类别 2' ? 'H319 造成严重眼刺激' : '未达到分类阈值'),
    rule: 'CLP Annex I 3.3.3.3 · 通用浓度限值加和法',
    display: {
      input: eyeInput,
      formula: 'Σ(Eye Dam. 1) = ' + clpCalcNum(damSum) + '%；10×Σ(Cat.1) + Σ(Cat.2) = ' + clpCalcNum(eyeWeighted) + '% → ' + eyeResult
    },
    opts: [
      {o: '类别 1', d: 'Σ(Eye Dam. 1) ≥ ' + g.eyeDamage + '%', hit: eyeResult === '类别 1' ? '✓ 系统建议' : '当前 ' + clpCalcNum(damSum) + '%'},
      {o: '类别 2', d: g.weight + '×Σ(Cat.1) + Σ(Cat.2) ≥ ' + g.eyeIrrit + '%', hit: eyeResult === '类别 2' ? '✓ 系统建议' : '当前 ' + clpCalcNum(eyeWeighted) + '%'},
      {o: '不分类（无需分类）', d: '低于上述阈值', hit: eyeResult === '不分类' ? '✓ 当前结果' : '未命中'}
    ],
    src: [['reg', 'CLP 规则包 ' + packId], ['reg', 'Annex VI / 物质分类数据']]
  };

  var classified = [skin, eye].filter(function(it){return it.result !== '不分类' && it.result !== '—';}).length > 0;
  return {
    status: classified ? 'AUTO' : 'NO_MATCH',
    items: [skin, eye],
    inputs: ctx.components.filter(function(c){
      var h = c.parameters.classifications;
      return !!(h.skinCorr || h.skinIrrit || h.eyeDamage || h.eyeIrrit);
    }).map(function(c){
      var h = c.parameters.classifications;
      return {cas: c.cas, name: c.name, concentration: c.concentration,
        skinCorr: h.skinCorr || '', skinIrrit: h.skinIrrit || '',
        eyeDamage: h.eyeDamage || '', eyeIrrit: h.eyeIrrit || ''};
    }),
    intermediates: {
      skinCorrSum: corrSum, skinIrritSum: irrSum, skinWeightedSum: skinWeighted,
      skinCorrThreshold: g.skinCorr, skinIrritThreshold: g.skinIrrit, skinResult: skinResult,
      eyeDamageSum: damSum, eyeIrritSum: eyeIrrSum, eyeWeightedSum: eyeWeighted,
      eyeDamageThreshold: g.eyeDamage, eyeIrritThreshold: g.eyeIrrit, eyeResult: eyeResult,
      weight: g.weight
    },
    evidence: skin.src,
    messages: []
  };
}

/* ---------- 7. 执行器：CLP-M-SCL（特定浓度限值优先替代法，当前用于皮肤致敏） ----------
   组分自身 SCL 优先，无 SCL 时回落规则参数中的通用限值（skinSensGcl）。
   皮肤致敏限值来自统一 profile 的结构化 hazardMap.skinSens.scl。 */
function clpEngineScl(ctx){
  var prm = ctx.rule.parameters, gcl = prm.skinSensGcl, packId = ctx.pack.id;
  var rows = ctx.components.filter(function(c){return !!c.parameters.classifications.skinSens;});
  var thr = rows.map(function(c){return c.parameters.classifications.skinSens.scl || gcl;});
  var hit = rows.filter(function(c, i){return c.concentration >= thr[i];});

  var rowsView = rows.map(function(c, i){return {name: c.name, conc: c.concentration, tag: 'SCL ' + clpCalcNum(thr[i]) + '%'};});
  var input = clpCalcInput(rowsView, function(r){return r.tag;});
  var formula = (rows.length
    ? rows.map(function(c, i){
        return c.name + ' ' + clpCalcNum(c.concentration) + '% ' + (c.concentration >= thr[i] ? '≥' : '<') + ' ' + clpCalcNum(thr[i]) + '%';
      }).join('；')
    : '无 Skin Sens. 组分') + ' → ' + (hit.length ? '类别 1' : '不分类');

  var item = {
    id: 'sens', name: '皮肤致敏', result: hit.length ? '类别 1' : '不分类',
    code: hit.length ? 'H317 可能导致皮肤过敏反应' : '未达到分类阈值',
    rule: 'CLP Annex VI SCL + Annex I 1.2 · SCL 优先替代法',
    display: {input: input, formula: formula},
    opts: [
      {o: '类别 1', d: '组分浓度达到该物质 SCL；无 SCL 时使用 GCL', hit: hit.length ? '✓ 系统建议' : '未命中'},
      {o: '不分类（无需分类）', d: '所有致敏组分均低于适用限值', hit: hit.length ? '未命中' : '✓ 当前结果'}
    ],
    src: [['reg', 'CLP 规则包 ' + packId], ['reg', 'Annex VI · SCL']]
  };
  return {
    status: hit.length ? 'AUTO' : 'NO_MATCH',
    items: [item],
    inputs: rows.map(function(c, i){
      return {cas: c.cas, name: c.name, concentration: c.concentration,
        threshold: thr[i], thresholdSource: c.parameters.classifications.skinSens.scl ? 'SCL' : 'GCL',
        hit: c.concentration >= thr[i]};
    }),
    intermediates: {
      hitComponents: hit.map(function(c){return c.name + ' ' + clpCalcNum(c.concentration) + '%';}),
      thresholds: rows.map(function(c, i){
        return c.name + '：' + clpCalcNum(thr[i]) + '%（' + (c.parameters.classifications.skinSens.scl ? 'SCL' : 'GCL') + '）';
      }),
      gcl: gcl, result: item.result
    },
    evidence: item.src,
    messages: []
  };
}

/* ---------- 8. 执行器：CLP-M-MFACTOR（慢性水生危害 M 因子加权求和法） ----------
   输入可靠性门禁：组分的水生慢性分类若缺少可靠来源依据（aquaticState !== 'known'），
   一律返回 NEED_INPUT —— 不把未知数据当 0，也不默认输出「不分类」。 */
function clpEngineMfactor(ctx){
  var mf = ctx.rule.parameters, packId = ctx.pack.id;
  var aqRows = ctx.components.filter(function(c){return !!c.parameters.classifications.aquaticChronic;});
  var aqBad = aqRows.filter(function(c){return c.parameters.aquaticState !== 'known';});
  var aq1 = 0, aq1m = 0, aq2 = 0, aq3 = 0, aq4 = 0;
  aqRows.forEach(function(c){
    var cat = String(c.parameters.classifications.aquaticChronic), m = c.parameters.mChronic || 1;
    if(cat === '1'){aq1 += c.concentration;aq1m += m * c.concentration;}
    else if(cat === '2')aq2 += c.concentration;
    else if(cat === '3')aq3 += c.concentration;
    else if(cat === '4')aq4 += c.concentration;
  });
  var s1 = aq1m;
  var s2 = mf.chronic2Weight * aq1m + aq2;
  var s3 = mf.chronic3Weight * aq1m + mf.chronic2Weight * aq2 + aq3;
  var s4 = aq1 + aq2 + aq3 + aq4;
  var aqResult = '不分类', aqCode = '未达到分类阈值';
  if(s1 >= mf.limit){aqResult = '类别 1';aqCode = 'H410 对水生生物毒性极大并具有长期持续影响';}
  else if(s2 >= mf.limit){aqResult = '类别 2';aqCode = 'H411 对水生生物有毒并具有长期持续影响';}
  else if(s3 >= mf.limit){aqResult = '类别 3';aqCode = 'H412 对水生生物有害并具有长期持续影响';}
  else if(s4 >= mf.limit){aqResult = '类别 4';aqCode = 'H413 可能对水生生物造成长期持续的有害影响';}

  var rowsView = aqRows.map(function(c){
    var cat = String(c.parameters.classifications.aquaticChronic);
    return {name: c.name, conc: c.concentration,
      tag: 'Chronic ' + cat + (cat === '1' ? '，M=' + (c.parameters.mChronic || 1) : '')};
  });
  var badView = aqBad.map(function(c){
    return {name: c.name, conc: c.concentration, tag: 'Chronic ' + c.parameters.classifications.aquaticChronic + ' · 来源依据未归档'};
  });
  var item;
  if(aqBad.length){
    item = {
      id: 'aqua', name: '危害水生环境（长期）', result: '—', code: '待人工判断',
      rule: 'CLP Annex I 4.1.3.5 · M 因子加权求和法',
      display: {
        input: clpCalcInput(badView, function(r){return r.tag;}),
        formula: '加和法未执行 —— ' + aqBad.map(function(c){return c.name;}).join('、')
          + ' 的水生慢性分类缺少可靠来源依据（未归档实测报告 / NOEC），输入不可靠 → 不产出结论，转人工判断'
      },
      opts: [{o: '加和法未执行', d: '补录 ' + aqBad.length + ' 项水生毒性来源依据后，本项可恢复自动计算', hit: '当前状态'}],
      src: [['reg', 'CLP 规则包 ' + packId], ['lab', '待补录实测报告 / NOEC']]
    };
  }else{
    item = {
      id: 'aqua', name: '危害水生环境（长期）', result: aqResult, code: aqCode,
      rule: 'CLP Annex I 4.1.3.5 · M 因子加权求和法',
      display: {
        input: clpCalcInput(rowsView, function(r){return r.tag;}),
        formula: 'Chronic 1=' + clpCalcNum(s1) + '%；Chronic 2 判定和=' + clpCalcNum(s2)
          + '%；Chronic 3 判定和=' + clpCalcNum(s3) + '%；总和=' + clpCalcNum(s4) + '% → ' + aqResult
      },
      opts: [
        {o: '类别 1', d: 'Σ(M×Chronic 1) ≥ ' + mf.limit + '%', hit: aqResult === '类别 1' ? '✓ 系统建议' : '未命中'},
        {o: '类别 2', d: 'Σ(10×M×Chronic 1)+Σ(Chronic 2) ≥ ' + mf.limit + '%', hit: aqResult === '类别 2' ? '✓ 系统建议' : '未命中'},
        {o: '类别 3', d: 'Σ(100×M×Chronic 1)+10×Σ(Chronic 2)+Σ(Chronic 3) ≥ ' + mf.limit + '%', hit: aqResult === '类别 3' ? '✓ 系统建议' : '未命中'},
        {o: '类别 4', d: 'Σ(Chronic 1~4) ≥ ' + mf.limit + '%', hit: aqResult === '类别 4' ? '✓ 系统建议' : '未命中'},
        {o: '不分类（无需分类）', d: '所有逐级判定和均低于 ' + mf.limit + '%', hit: aqResult === '不分类' ? '✓ 当前结果' : '未命中'}
      ],
      src: [['reg', 'CLP 规则包 ' + packId], ['reg', 'Annex VI / 物质分类数据']]
    };
  }

  return {
    status: aqBad.length ? 'NEED_INPUT' : (aqResult === '不分类' ? 'NO_MATCH' : 'AUTO'),
    items: [item],
    inputs: aqRows.map(function(c){
      return {cas: c.cas, name: c.name, concentration: c.concentration,
        chronicCategory: String(c.parameters.classifications.aquaticChronic),
        mChronic: c.parameters.mChronic || 0, aquaticState: c.parameters.aquaticState,
        reliable: c.parameters.aquaticState === 'known'};
    }),
    intermediates: {
      chronic1WeightedSum: s1, chronic2Score: s2, chronic3Score: s3, chronic4Score: s4,
      limit: mf.limit, chronic2Weight: mf.chronic2Weight, chronic3Weight: mf.chronic3Weight,
      missingEvidenceComponents: aqBad.map(function(c){return c.name;}),
      hitCategory: aqBad.length ? '' : aqResult
    },
    evidence: item.src,
    messages: aqBad.length ? ['缺少水生慢性分类的来源依据，加和法未执行。'] : []
  };
}

/* ---------- 9. 注册四个已实现方法 ----------
   version 会进入规则包快照 pack.methodVersions，供 SDS 结论追溯。 */
complianceRegisterMethod({
  code: 'CLP-M-ATE-SUM', version: '1.0.0-demo', name: 'ATE 加和法', domain: 'CLP',
  implementationStatus: 'implemented',
  inputDescription: '各组分浓度与经口 ATE（数据状态须为 known 且数值 > 0）',
  outputDescription: '混合物经口急性毒性分类（类别 1 / 2 / 3 / 4 或不分类）',
  execute: clpEngineAte
});
complianceRegisterMethod({
  code: 'CLP-M-GCL-SUM', version: '1.0.0-demo', name: '通用浓度限值加和法（皮肤 / 眼）', domain: 'CLP',
  implementationStatus: 'implemented',
  inputDescription: '各组分浓度与皮肤腐蚀 / 刺激、严重眼损伤 / 眼刺激分类',
  outputDescription: '皮肤腐蚀 / 刺激、严重眼损伤 / 眼刺激两个分类项',
  execute: clpEngineGcl
});
complianceRegisterMethod({
  code: 'CLP-M-SCL', version: '1.0.0-demo', name: 'SCL 优先替代法（皮肤致敏）', domain: 'CLP',
  implementationStatus: 'implemented',
  inputDescription: '皮肤致敏组分的浓度与其特定浓度限值 SCL（无 SCL 时用规则通用限值）',
  outputDescription: '皮肤致敏类别 1 或不分类',
  execute: clpEngineScl
});
complianceRegisterMethod({
  code: 'CLP-M-MFACTOR', version: '1.0.0-demo', name: 'M 因子加权求和法（慢性水生危害）', domain: 'CLP',
  implementationStatus: 'implemented',
  inputDescription: '各组分的慢性水生分类、M 因子与来源依据（aquaticState 须为 known）',
  outputDescription: '危害水生环境（长期）类别 1 / 2 / 3 / 4 或不分类',
  execute: clpEngineMfactor
});

/* ---------- 9.2 未实现方法的占位执行器 ----------
   只用于登记「方法存在但尚未由研发实现」。执行入口会在调用前按
   implementationStatus 拦截，本函数实际不会被调用；保留它是为了杜绝
   「未实现方法被当成空实现静默跳过」。 */
function clpEngineNotImplemented(){
  return {
    status: 'UNSUPPORTED_METHOD',
    items: [], inputs: [], intermediates: {}, evidence: [],
    messages: ['该计算方法尚未实现，规则不可调用。']
  };
}
/* 登记当前演示中**尚未实现**的方法：只登记状态，不提供真实执行逻辑。
   目的：① 这些方法引用的规则进不了活动规则包；② 与 CLP_METHODS 展示字典里
   的「已支持」标记形成对照，差异记入「待专业核验项」。 */
complianceRegisterMethod({
  code: 'CLP-M-LAYER', version: '0.0.0-not-implemented', name: '分层与优先级裁决', domain: 'CLP',
  implementationStatus: 'not_implemented',
  inputDescription: '同一健康危害路径下的多个候选分类结果',
  outputDescription: '每个危害路径的最终唯一分类（本阶段未实现）',
  execute: clpEngineNotImplemented
});
complianceRegisterMethod({
  code: 'CLP-M-ED-PBT', version: '0.0.0-not-implemented', name: 'ED / PBT / vPvB / PMT / vPvM 判定法', domain: 'CLP',
  implementationStatus: 'not_implemented',
  inputDescription: '组分的 P / B / T / M 判定要素与内分泌活性证据',
  outputDescription: 'ED / PBT / vPvB / PMT / vPvM 结论（本阶段未实现）',
  execute: clpEngineNotImplemented
});
complianceRegisterMethod({
  code: 'CLP-M-BRIDGE', version: '0.0.0-not-implemented', name: '桥接原则（Bridging）', domain: 'CLP',
  implementationStatus: 'not_implemented',
  inputDescription: '相似混合物的已有分类结论与组分对照表',
  outputDescription: '沿用被桥接混合物的分类结论（本阶段未实现）',
  execute: clpEngineNotImplemented
});

/* ---------- 10. 兼容适配器：引擎内部状态 → 现有 SDS 页面状态 ----------
   AUTO       → auto
   NO_MATCH   → auto（结果为「不分类」）
   NEED_INPUT → pending / judge
   BLOCKED    → pending / judge
   ERROR      → pending / judge
   其余异常状态一律 pending / judge：**任何非成功状态都不得产出「不分类」**。 */
function complianceUiStatus(st){
  return (st === 'AUTO' || st === 'NO_MATCH') ? 'auto' : 'pending';
}
function complianceUiNeed(st){
  return (st === 'AUTO' || st === 'NO_MATCH') ? '' : 'judge';
}
/* 人类可读提示（业务用户可见；堆栈与内部细节不进 UI） */
function complianceUiMessage(st){
  if(st === 'NEED_INPUT')return '缺少必要输入，系统不产出自动结论，需人工判断。';
  if(st === 'UNSUPPORTED_METHOD')return '该规则引用的计算方法尚未登记，需要研发实现。';
  if(st === 'BLOCKED')return '该计算方法当前不可调用，需完成研发实现或参数配置。';
  if(st === 'ERROR')return '当前分类方法执行失败，请联系系统管理员检查规则配置。';
  return '';
}
/* 把一次执行结果转成现有 SDS 页面可直接消费的分类项。
   防线：任何非成功状态都不得把结果写成「不分类」——缺输入一律留白为「—」。 */
function complianceAdaptItem(exec, raw, packId){
  var st = exec.status, ui = complianceUiStatus(st), need = complianceUiNeed(st);
  var result = raw.result;
  if(ui !== 'auto' && (!result || result === '不分类'))result = '—';
  var item = {
    id: raw.id, name: raw.name,
    result: result,
    code: raw.code,
    status: ui,
    packId: packId || '',
    ruleIds: [exec.rule.id],
    method: exec.method.code,
    rule: raw.rule,
    input: raw.display.input,
    formula: raw.display.formula,
    opts: raw.opts,
    src: raw.src,
    methodVersion: exec.method.version,
    engineStatus: st,
    engineMessage: complianceUiMessage(st)
  };
  if(need)item.need = need;
  return item;
}
/* 稳定排序：保持重构前的展示顺序（未知 id 追加末尾） */
function complianceSortItems(items){
  return items.slice().sort(function(a, b){
    var ia = COMPLIANCE_ITEM_ORDER.indexOf(a.id), ib = COMPLIANCE_ITEM_ORDER.indexOf(b.id);
    if(ia < 0)ia = COMPLIANCE_ITEM_ORDER.length;
    if(ib < 0)ib = COMPLIANCE_ITEM_ORDER.length;
    return ia - ib;
  });
}
