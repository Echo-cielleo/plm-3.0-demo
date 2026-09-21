/* ==================================================================
   [23z6] CLP 法规库 · 统一页面（Tab 化 Annex 管理，2026-09-18）
   ------------------------------------------------------------------
   需求口径（王舒 2026-09-18）：
   · law:clp 由「附录 VI 清单维护页」升级为统一 CLP 页面：
     顶部法规主信息（含证据灯）+ 5 个 Tab 管理 Annex 内容
   · Tab1 Annex VI 物质统一分类（保留原有 5 条示例数据）
   · Tab2 Annex I 分类规则（人工审核规则；详情抽屉标注「研发实现用」，
     不做实际计算，仅展示规则/公式/来源）
   · Tab3 Annex III/IV/V 标签字典（官方字典，非企业自行分类结果）
   · Tab4 Annex VIII PCN / UFI（静态占位，不实现通报）
   · Tab5 版本变更与影响（配方/SDS 影响数量显式标注「示例」）
   · 导入新版本走静态演示向导（**已移交 23z6a-js-clp-import.js**）：
     登记来源 → 创建版本 → 上传结构化数据 → 数据校验与版本比较 → 审核发布；
     三模块（Annex VI / Annex I / Annex III·IV·V）各带自己的字段、模板、
     条数、校验、测试与变更预览；**页面不出现「自动解析」类表述**
   · C&L Inventory / SVHC / Annex XIV / XVII 属 REACH 与独立菜单，不入本页

   [第三十一轮 · 2026-09-18 补充]
   · **ATP 版本号更正**：现行 ATP 应为 **ATP 22（2026-05-01 生效）**，
     本次导入目标版本 **ATP 23**。原写「ATP 21 / 生效 2026-09-01」两处皆误
     （ATP 21 实际 2025-09-01 生效）。
   · Annex VI 条目补 **补充危险说明 EUH / 象形图代码 / 信号词代码** 三个字段
     （对齐 Annex VI Table 3.1 的 Labelling 区块）。
   · Annex I 规则补 **规则引擎方法 / 规则引擎支持状态 / 规则测试状态 /
     人工核对人 / 人工核对日期** 五个字段（口径见 十 一 节要求）；
     数据来源文案改为「法规专员对照法规原文确认后导入的结构化规则」。
   · Annex III/IV/V 标签字典补 **语言 / 数据状态 / 适用危害类别** 字段，
     并新增 **Annex V 危险象形图只读块**（GHS01–09 素材建库时一次性导入，
     不随字典导入上传）。
   · 版本变更记录补 **mod 字段**（来源模块），与 REACH 页口径一致。
   · **Tab1 生效版本下拉改为数据驱动**（原为硬编码 <option>ATP 21</option>，
     导致新版本发布后筛不出来）。

   实现约定：本分片接管 law:clp 注册（23y 的旧注册已删除，非覆盖关系）；
   抽屉复用 .exp-ai-mask / .exp-ai-panel 既有样式，仅补一条模块信息条 CSS；
   **导入向导独占 23z6a 分片**（本分片不再保留任何 clpLImp* 代码，
   同路由/同名符号零重复）。
   ================================================================== */

/* ---------- 1. 数据 ---------- */
var CLP_TOP={
  name:'CLP Regulation（化学品分类、标签与包装法规）',
  code:'Regulation (EC) No 1272/2008',
  market:'欧盟',
  status:'已发布',
  ver:'2024/2865 修订版（2024-12-10 生效）',
  lastReview:'2026-07-18',
  lastUpdate:'2026-07-18 16:05',
  cutoff:'2026-07-15',
  owner:'质管-杨工',
  cycle:'附录 VI 随 ATP 发布导入；分类规则与标签字典按季度复核',
  funcs:['物质查询','混合物分类','标签生成','SDS编制'],
  note:'CLP 管分类与标签（怎么分类、怎么贴标）；REACH 管注册、授权与限制（能不能用、要不要申报）。本页面仅涉及 CLP。'
};

/* 各 Annex 模块自己的版本信息（不同模块更新与生效时间可能不同）
   ATP 口径（2026-09-18 核）：ATP 20 = 2025-02-01；ATP 21 = 2025-09-01；
   ATP 22 = 2026-05-01（现行）；本次导入目标 = ATP 23（待发布）。 */
var CLP_MODULES={
  vi:{key:'vi',label:'Annex VI｜物质统一分类',ver:'ATP 22',eff:'2026-05-01',status:'已生效',cutoff:'2026-04-28',owner:'质管-杨工',src:'整理数据：ECHA CHEM 导出 / 开放数据门户（法律效力以 OJ 公布为准）',srcTag:'官方清单 · 强制采用',due:'2026-10-15'},
  rules:{key:'rules',label:'Annex I｜分类规则',ver:'R2026.2',eff:'2026-06-01',status:'已审核',cutoff:'2026-06-20',owner:'质管-杨工',src:'法规专员对照法规原文确认后导入的结构化规则',srcTag:'结构化规则表',due:'2026-12-31'},
  labels:{key:'labels',label:'Annex III/IV/V｜标签字典',ver:'L2026.3（含 2024/2865 同步）',eff:'2024-12-10',status:'已生效',cutoff:'2026-06-30',owner:'质管-杨工',src:'官方标签字典（按版本维护）',srcTag:'官方标签字典',due:'2027-03-31'},
  pcn:{key:'pcn',label:'Annex VIII｜PCN / UFI',ver:'规划中',eff:'—',status:'占位',cutoff:'—',owner:'质管-杨工',src:'官方法规清单（强制采用）',srcTag:'后续模块 · 静态占位',due:''}
};

/* Tab1：Annex VI 物质统一分类（5 条示例数据；euh / picto / signal 对齐 Table 3.1 的 Labelling 区块） */
var CLP_VI_ROWS=[
  {idx:'605-001-00-5',name:'甲醛',cas:'50-00-0',ec:'200-001-8',cls:'Carc. 1B / Muta. 2 / Acute Tox. 3',h:'H350 / H341 / H301',euh:'—',picto:'GHS06 / GHS08',signal:'危险',scl:'Skin Sens. 1; H317: C ≥ 0.2%',m:'M=10（慢性水生毒性）',ate:'口服 ATE = 100 mg/kg',notes:'B / D',ver:'ATP 22',src:'Annex VI Part 3 · Table 3（经 ATP 22 采纳）',rule:'CLP-R-0001'},
  {idx:'607-061-00-8',name:'丙烯酸',cas:'79-10-7',ec:'201-177-9',cls:'Skin Corr. 1A / Acute Tox. 4',h:'H314 / H302',euh:'—',picto:'GHS05 / GHS07',signal:'危险',scl:'—',m:'—',ate:'—',notes:'—',ver:'ATP 22',src:'Annex VI Part 3 · Table 3（经 ATP 22 采纳）',rule:'CLP-R-0002'},
  {idx:'603-014-00-0',name:'乙二醇单丁醚',cas:'111-76-2',ec:'203-905-0',cls:'Acute Tox. 4 / Eye Irrit. 2',h:'H302 / H319',euh:'—',picto:'GHS07',signal:'警告',scl:'—',m:'—',ate:'—',notes:'—',ver:'ATP 22',src:'Annex VI Part 3 · Table 3（经 ATP 22 采纳）',rule:'CLP-R-0003'},
  {idx:'603-002-00-5',name:'乙醇',cas:'64-17-5',ec:'200-578-6',cls:'Flam. Liq. 2 / Eye Irrit. 2',h:'H225 / H319',euh:'—',picto:'GHS02 / GHS07',signal:'危险',scl:'—',m:'—',ate:'—',notes:'—',ver:'ATP 22',src:'Annex VI Part 3 · Table 3（经 ATP 22 采纳）',rule:'CLP-R-0005'},
  {idx:'601-021-00-3',name:'甲苯',cas:'108-88-3',ec:'203-625-9',cls:'Flam. Liq. 2 / Repr. 2 / STOT RE 2',h:'H225 / H361d / H373',euh:'—',picto:'GHS02 / GHS07 / GHS08',signal:'危险',scl:'—',m:'—',ate:'—',notes:'C',ver:'ATP 22',src:'Annex VI Part 3 · Table 3（经 ATP 22 采纳）',rule:'CLP-R-0004'}
];

/* Tab2：Annex I 分类规则（法规专员维护命中条件与参数，计算由已登记的引擎方法执行） */
var CLP_RULES=[
  {id:'CLP-R-0001',name:'急性毒性—口服—混合物 ATE 计算规则',cat:'急性毒性（口服）',target:'混合物',gcl:'按 ATE_mix 落入 Cat.1 / 2 / 3 / 4 区间',add:'是',ref:'Annex I，Part 3，3.1.3.6（口服 ATE 加和公式）',ver:'R2026.2',status:'已审核',method:'CLP-M-ATE-SUM',engine:'已支持',test:'通过',checker:'质管-杨工',checkDate:'2026-06-18',h:'H301',
    run:{route:'oral',thresholds:[{max:5,cat:'类别 1',h:'H300'},{max:50,cat:'类别 2',h:'H300'},{max:300,cat:'类别 3',h:'H301'},{max:2000,cat:'类别 4',h:'H302'}]},
    det:{inputs:'各组分浓度 Ci（%）；各组分口服 ATEi（优先取 Annex VI Table 3 统一值；无统一值时取企业自评估值）',cond:'混合物中含 ≥ 1 个已分类急性毒性（口服）组分',formula:'ATE_mix = 100 / Σ( Ci / ATEi )（Ci 为百分比浓度；ATEi 单位 mg/kg 体重）',except:'组分无可靠 ATE 时按 CLP 的未知急性毒性规则处理并记录数据缺口；推定无急性毒性的组分不进入公式',prio:'高（1）——先识别适用组分及可用 ATE，再执行加和',output:'按 ATE_mix 所落区间输出 Acute Tox. 1 / 2 / 3 / 4（口服）',label:'对应 H300 / H301 / H302 + GHS06（Cat.1/2/3）/ GHS07（Cat.4）· 信号词：危险 / 警告',src:'Regulation (EC) No 1272/2008，Annex I，Part 3，第 3.1.3.6 条（急性毒性—混合物 ATE 计算公式）'}},
  {id:'CLP-R-0002',name:'皮肤腐蚀 / 刺激—通用浓度限值加和规则',cat:'皮肤腐蚀/刺激',target:'混合物',gcl:'Skin Corr. 1：≥ 5%；Skin Irrit. 2：加权和 ≥ 10%',add:'是',ref:'Annex I，Part 3，3.2.3',ver:'R2026.2',status:'已审核',method:'CLP-M-GCL-SUM',engine:'已支持',test:'通过',checker:'质管-杨工',checkDate:'2026-06-18',h:'H314',
    run:{skinCorr:5,skinIrrit:10,eyeDamage:3,eyeIrrit:10,weight:10},
    det:{inputs:'各组分浓度 Ci（%）与皮肤腐蚀/刺激分类；各组分的 SCL（如有）',cond:'混合物含 ≥ 1 个 Skin Corr. / Skin Irrit. 已分类组分',formula:'Σ(Skin Corr. 1) ≥ 5% → Skin Corr. 1；否则 10×Σ(Cat.1)+Σ(Cat.2) ≥ 10% → Skin Irrit. 2',except:'Cat.1 内 1A/1B/1C 按 Annex I 细分；有 SCL 的组分以 SCL 替代通用限值',prio:'中（2）——腐蚀判断先于刺激判断，同浓度区间取更严类别',output:'Skin Corr. 1 / Skin Irrit. 2；眼损伤/刺激使用同类加和框架独立判断',label:'对应 H314 / H315 / H318 / H319 + GHS05（腐蚀）/ GHS07（刺激）· 信号词：危险 / 警告',src:'Regulation (EC) No 1272/2008，Annex I，Part 3，第 3.2.3 条（皮肤腐蚀 / 刺激—混合物分类）'}},
  {id:'CLP-R-0003',name:'SCL（特定浓度限值）优先于通用浓度限值',cat:'全部健康 / 环境危害类别',target:'物质与混合物',gcl:'见 Annex VI Table 3 各条目 SCL 列',add:'否—逐案评估',ref:'Annex I，Part 1，1.2 + Annex VI，Table 3',ver:'R2026.2',status:'已审核',method:'CLP-M-SCL',engine:'已支持',test:'通过',checker:'质管-杨工',checkDate:'2026-06-18',h:'H317',
    run:{sclOverridesGcl:true,skinSensGcl:0.1},
    det:{inputs:'组分对应的 Annex VI 条目及其 SCL 列（例：甲醛 Skin Sens. 1; H317: C ≥ 0.2%）',cond:'组分在 Annex VI Table 3 中挂有 SCL 时触发',formula:'混合物分类时以 SCL 替换同危害类别的通用浓度限值（GCL）参与判断',except:'SCL 高于 GCL 时按 SCL 放宽、低于 GCL 时按 SCL 收紧；同一组分多类别 SCL 分别适用',prio:'高（1）——先于一切通用限值加和规则',output:'按 SCL 门槛得到的混合物分类',label:'以组分各自 SCL 对应的 H 码与标签结果为准',src:'Regulation (EC) No 1272/2008，Annex VI，Table 3 SCL 列；Annex I，Part 1，第 1.2 条（分类与标签一般原则）'}},
  {id:'CLP-R-0004',name:'慢性水生毒性—M 因子加权求和规则',cat:'危害水生环境（慢性）',target:'混合物',gcl:'按 Table 4.1.2 的 M 因子加权和与 25% 阈值逐级判断',add:'是',ref:'Annex I，Part 4，4.1.3.5（求和法）',ver:'R2026.2',status:'已审核',method:'CLP-M-MFACTOR',engine:'已支持',test:'通过',checker:'质管-杨工',checkDate:'2026-06-18',h:'H410',
    run:{limit:25,chronic2Weight:10,chronic3Weight:100},
    det:{inputs:'各组分的慢性水生分类与 M 因子（Annex VI 统一 M 或企业自评估 M）',cond:'混合物含 Aquatic Chronic 1 / 2 / 3 / 4 组分',formula:'按 Table 4.1.2 逐级计算：Σ(M×Chronic 1)；10×前项+Σ(Chronic 2)；100×前项+10×Σ(Chronic 2)+Σ(Chronic 3)；总和，均与 25% 比较',except:'无统一 M 的 Chronic 1 组分须依法设定 M 后参与求和；未分类组分不参与但需记录',prio:'中（2）',output:'Aquatic Chronic 1 / 2 / 3 / 4',label:'对应 H410 / H411 / H412 / H413；类别 1 / 2 使用 GHS09',src:'Regulation (EC) No 1272/2008，Annex I，Part 4，第 4.1.3.5 条（危害水生环境—混合物求和法；长期危害加和见 Table 4.1.2）'}},
  {id:'CLP-R-0005',name:'同一危害类别的分层与优先级原则',cat:'全部危害类别',target:'物质与混合物',gcl:'—',add:'否—逐案评估',ref:'Annex I，Part 1，1.2（分层原则）',ver:'R2026.2',status:'已审核',method:'CLP-M-LAYER',engine:'已支持',test:'通过',checker:'质管-杨工',checkDate:'2026-06-18',h:'',
    det:{inputs:'同一健康危害路径下的多个候选分类结果',cond:'同一路径（如口服急性毒性）出现多个可选类别时',formula:'取证据支持的最严类别；上位类别覆盖下位类别（如 Carc. 1B 与 Carc. 2 并存时输出 1B）',except:'不同路径（口服/皮肤/吸入）互不覆盖，分别输出；物理危害按各 Hazard 类别独立规则执行',prio:'低（3）——在其他规则产出结果后应用',output:'每个危害路径的最终唯一分类',label:'以最终分类对应的 H 码与标签结果为准',src:'Regulation (EC) No 1272/2008，Annex I，Part 1，第 1.2 条（分类与标签一般原则）'}},
  {id:'CLP-R-0006',name:'内分泌干扰物（ED）与 PBT / vPvB / PMT / vPvM 判定规则',cat:'附加危害类别（欧盟特有）',target:'物质与混合物',gcl:'ED（人类健康 / 环境）：≥ 0.1%（按组分）；PBT / vPvB / PMT / vPvM：按 Annex I Part 5 判定要素',add:'否—逐案评估',ref:'Annex I，Part 5（(EU) 2024/2865 引入的附加危害）',ver:'R2027.1',status:'待审核',method:'CLP-M-ED-PBT',engine:'需要研发实现',test:'未执行',checker:'质管-杨工',checkDate:'2026-09-16',h:'',
    det:{inputs:'组分的持久性（P）/ 生物累积性（B）/ 毒性（T）测试与评估数据；内分泌活性证据（人体健康 / 环境）',cond:'组分同时满足 P / B / T 判定要素，或存在内分泌干扰活性证据时触发',formula:'按 Annex I Part 5 要素逐项判定（不适用浓度加和公式）：ED → 分类为 ED（人类健康）/ ED（环境）；PBT / vPvB / PMT / vPvM 分别按各自要素判定',except:'无完整测试数据时按 Annex I Part 5 的「证据权重」途径评估；UVCB 物质与金属化合物另有专门判定要素',prio:'中（2）——在常规危害类别判定完成后附加',output:'ED（人类健康）/ ED（环境）/ PBT / vPvB / PMT / vPvM',label:'对应 EUH380 / EUH381（内分泌干扰）与 EUH430 / EUH431 / EUH440 / EUH441 / EUH450 / EUH451（环境）等补充说明',src:'Regulation (EC) No 1272/2008，Annex I，Part 5（由 (EU) 2024/2865 引入；配套危害类别由 (EU) 2023/707 建立）'}},
  {id:'CLP-R-0007',name:'桥接原则（Bridging）—相似混合物分类沿用规则',cat:'分类与标签一般原则',target:'混合物',gcl:'—',add:'否—逐案评估',ref:'Annex I，Part 1，1.5（桥接原则）',ver:'R2027.1',status:'待审核',method:'CLP-M-BRIDGE',engine:'需要配置参数',test:'通过',checker:'质管-杨工',checkDate:'2026-09-17',h:'',
    det:{inputs:'相似混合物（稀释 / 浓度变化 / 同族组分替换）的已有分类结论与组分对照表',cond:'混合物由已分类混合物经稀释、浓度调整或同族组分替换得到，且危害类别不变时触发',formula:'按桥接场景逐案调用（不适用统一公式）：桥接表与判定参数需在规则引擎中配置后启用',except:'桥接不得用于致癌 / 生殖毒性 / 致突变等无阈值危害；桥接结论须由法规专员确认并留痕',prio:'低（3）——在常规规则之后应用',output:'沿用被桥接混合物的分类结论',label:'以沿用分类对应的 H 码与标签结果为准',src:'Regulation (EC) No 1272/2008，Annex I，Part 1，第 1.5 条（桥接原则）'}}
];


/* 计算方法字典（规则表的「规则引擎方法」在此登记；规则引擎支持状态挂在方法上，规则引用后继承）
   口径：一条规则可调用多个方法，支持状态若逐规则存会出现同方法自相矛盾，故以方法为唯一口径。 */
var CLP_METHODS=[
  {code:'CLP-M-ATE-SUM',name:'ATE 加和法',engine:'已支持',note:'ATE_mix = 100 / Σ( Ci / ATEi )，输出急性毒性类别 1 / 2 / 3'},
  {code:'CLP-M-GCL-SUM',name:'通用浓度限值加和法',engine:'已支持',note:'皮肤：Corr. ≥ 5%；否则 10×Corr. + Irrit. ≥ 10%'},
  {code:'CLP-M-SCL',name:'SCL 优先替代法',engine:'已支持',note:'以 Annex VI Table 3 的 SCL 替换同类别通用限值'},
  {code:'CLP-M-MFACTOR',name:'M 因子加权求和法',engine:'已支持',note:'按长期危害 Table 4.1.2 逐级加权并与 25% 比较'},
  {code:'CLP-M-LAYER',name:'分层与优先级裁决',engine:'已支持',note:'同路径多类别并存时取证据支持的最严类别'},
  {code:'CLP-M-ED-PBT',name:'ED / PBT / vPvB / PMT / vPvM 判定法',engine:'需要研发实现',note:'按 Annex I Part 5 要素逐项判定，不适用浓度加和公式'},
  {code:'CLP-M-BRIDGE',name:'桥接原则（Bridging）',engine:'需要配置参数',note:'按桥接场景逐案调用；桥接表与判定参数需在引擎中配置后启用'}
];

/* 当前生效规则包：三个独立维护模块在发布后组成一个只读调用快照。
   SDS 向导生成分类结论时保存当时的快照；后续法规版本变化不会改写已生成结论。 */
function clpPackToken(v){
  var s=String(v||'NA'),m=s.match(/[A-Za-z]+\s*\d+(?:\.\d+)*/);
  return (m?m[0]:s).replace(/[^A-Za-z0-9.]+/g,'');
}
function clpRuleById(id){return CLP_RULES.filter(function(r){return r.id===id;})[0];}
function clpNextRuleId(){
  var max=CLP_RULES.reduce(function(n,r){var m=String(r.id||'').match(/^CLP-R-(\d{4})$/);return m?Math.max(n,parseInt(m[1],10)):n;},0);
  return 'CLP-R-'+('0000'+(max+1)).slice(-4);
}
function clpActivePack(){
  var ids=['CLP-R-0001','CLP-R-0002','CLP-R-0003','CLP-R-0004'];
  var rules=ids.map(clpRuleById).filter(function(r){
    return r&&r.engine==='已支持'&&r.test==='通过'&&(r.status==='已审核'||r.status==='已发布');
  });
  return {
    id:'CLP-EU-'+clpPackToken(CLP_MODULES.vi.ver)+'-'+clpPackToken(CLP_MODULES.rules.ver)+'-'+clpPackToken(CLP_MODULES.labels.ver),
    market:'EU',status:rules.length===ids.length?'已发布':'不可调用',
    modules:{vi:CLP_MODULES.vi.ver,rules:CLP_MODULES.rules.ver,labels:CLP_MODULES.labels.ver},
    ruleIds:rules.map(function(r){return r.id;}),
    methods:rules.map(function(r){return r.method;}),
    effectiveFrom:CLP_MODULES.rules.eff,
    tested:rules.length===ids.length
  };
}

function clpCalcNum(n,d){
  var s=(+n).toFixed(d==null?2:d);
  return s.replace(/\.0+$|(?:(\.\d*?)0+)$/,'$1');
}
function clpCalcRows(formula){
  return (formula||[]).map(function(f){
    var p=COMP_CLP[f.cas]||{};
    return {cas:f.cas,name:f.name||p.name||f.cas,conc:parseFloat(f.conc)||0,p:p,haz:p.haz||{}};
  });
}
function clpCalcInput(rows,label){
  return rows.map(function(r){return r.name+' '+clpCalcNum(r.conc)+'%'+(label?'（'+label(r)+'）':'');}).join('；')||'无适用组分';
}

/* CLP 规则包运行时：只实现演示闭环所需的四种已支持方法。
   规则参数来自 CLP_RULES.run；物质分类参数来自组分基础数据 COMP_CLP.haz。 */
function clpEvaluateMixture(formula){
  var pack=clpActivePack(),rows=clpCalcRows(formula),items=[];
  if(!pack.tested)throw new Error('当前 CLP 规则包未通过发布门禁');

  /* CLP-M-ATE-SUM · 经口急性毒性 */
  var ateRule=clpRuleById('CLP-R-0001'),ateRows=rows.filter(function(r){return r.haz.acuteOral;});
  var ateMissing=ateRows.filter(function(r){return r.p.ateState!=='known'||!(r.p.ateO>0);});
  var ateInv=0;
  ateRows.forEach(function(r){if(r.p.ateO>0)ateInv+=r.conc/r.p.ateO;});
  var ateMix=ateInv>0?100/ateInv:0,ateHit=null;
  if(ateMix)ateRule.run.thresholds.some(function(t){if(ateMix<=t.max){ateHit=t;return true;}return false;});
  items.push({id:'acuteOral',name:'急性毒性（经口）',
    result:ateMissing.length?'—':(ateHit?ateHit.cat:'不分类'),
    code:ateMissing.length?'待人工判定':(ateHit?(ateHit.h+' '+(ateHit.h==='H301'?'吞咽中毒':(ateHit.h==='H302'?'吞咽有害':'吞咽致命'))):('ATE_mix '+clpCalcNum(ateMix,0)+' mg/kg')),
    status:ateMissing.length?'pending':'auto',packId:pack.id,ruleIds:['CLP-R-0001'],method:'CLP-M-ATE-SUM',
    rule:'CLP Annex I 3.1.3.6 · ATE 加和法',
    input:clpCalcInput(ateRows,function(r){return 'ATE '+clpCalcNum(r.p.ateO,0)+' mg/kg';}),
    formula:ateMissing.length
      ? '缺少可用 ATE：'+ateMissing.map(function(r){return r.name;}).join('、')+' → 转人工判定'
      : 'ATE_mix = 100 / Σ(Ci / ATEi) = '+clpCalcNum(ateMix,0)+' mg/kg → '+(ateHit?ateHit.cat:'未达到类别 4'),
    src:[['reg','CLP 规则包 '+pack.id],['sup','组分基础数据 · ATE']],
    opts:ateRule.run.thresholds.map(function(t){return{o:t.cat,d:'ATE_mix ≤ '+t.max+' mg/kg',hit:ateHit&&ateHit.cat===t.cat?'✓ 系统建议':'未命中'};})
      .concat([{o:'不分类（无需分类）',d:'ATE_mix > 2 000 mg/kg',hit:!ateHit&&!ateMissing.length?'✓ 当前结果':'未命中'}])});

  /* CLP-M-GCL-SUM · 皮肤腐蚀 / 刺激 */
  var gclRule=clpRuleById('CLP-R-0002'),g=gclRule.run;
  var skinCorr=rows.filter(function(r){return !!r.haz.skinCorr;}),skinIrr=rows.filter(function(r){return !!r.haz.skinIrrit;});
  var corrSum=skinCorr.reduce(function(n,r){return n+r.conc;},0),irrSum=skinIrr.reduce(function(n,r){return n+r.conc;},0);
  var skinWeighted=g.weight*corrSum+irrSum;
  var skinResult=corrSum>=g.skinCorr?'腐蚀 类别 1A/1B/1C':(skinWeighted>=g.skinIrrit?'类别 2':'不分类');
  items.push({id:'skin',name:'皮肤腐蚀/刺激',result:skinResult,
    code:skinResult.indexOf('腐蚀 类别 1')===0?'H314 造成严重皮肤灼伤和眼损伤':(skinResult==='类别 2'?'H315 造成皮肤刺激':'未达到分类阈值'),
    status:'auto',packId:pack.id,ruleIds:['CLP-R-0002'],method:'CLP-M-GCL-SUM',rule:'CLP Annex I 3.2.3 · 通用浓度限值加和法',
    input:clpCalcInput(skinCorr.concat(skinIrr),function(r){return r.haz.skinCorr?'Skin Corr. '+r.haz.skinCorr:'Skin Irrit. 2';}),
    formula:'Σ(Skin Corr. 1) = '+clpCalcNum(corrSum)+'%；10×Σ(Cat.1) + Σ(Cat.2) = '+clpCalcNum(skinWeighted)+'% → '+skinResult,
    src:[['reg','CLP 规则包 '+pack.id],['reg','Annex VI / 物质分类数据']],
    opts:[{o:'腐蚀 类别 1A/1B/1C',d:'Σ(Skin Corr. 1) ≥ '+g.skinCorr+'%',hit:corrSum>=g.skinCorr?'✓ 系统建议':'当前 '+clpCalcNum(corrSum)+'%'},
      {o:'类别 2',d:g.weight+'×Σ(Cat.1) + Σ(Cat.2) ≥ '+g.skinIrrit+'%',hit:skinResult==='类别 2'?'✓ 系统建议':'当前 '+clpCalcNum(skinWeighted)+'%'},
      {o:'不分类（无需分类）',d:'低于上述阈值',hit:skinResult==='不分类'?'✓ 当前结果':'未命中'}]});

  /* CLP-M-SCL · 特定浓度限值优先，当前演示用于皮肤致敏 */
  var sclRule=clpRuleById('CLP-R-0003'),sensRows=rows.filter(function(r){return !!r.haz.skinSens;});
  var sensHit=sensRows.filter(function(r){return r.conc>=(r.haz.skinSens.scl||sclRule.run.skinSensGcl);});
  items.push({id:'sens',name:'皮肤致敏',result:sensHit.length?'类别 1':'不分类',
    code:sensHit.length?'H317 可能导致皮肤过敏反应':'未达到分类阈值',status:'auto',packId:pack.id,ruleIds:['CLP-R-0003'],method:'CLP-M-SCL',
    rule:'CLP Annex VI SCL + Annex I 1.2 · SCL 优先替代法',
    input:clpCalcInput(sensRows,function(r){return 'SCL '+clpCalcNum(r.haz.skinSens.scl||sclRule.run.skinSensGcl)+'%';}),
    formula:(sensRows.length?sensRows.map(function(r){var t=r.haz.skinSens.scl||sclRule.run.skinSensGcl;return r.name+' '+clpCalcNum(r.conc)+'% '+(r.conc>=t?'≥':'<')+' '+clpCalcNum(t)+'%';}).join('；'):'无 Skin Sens. 组分')+' → '+(sensHit.length?'类别 1':'不分类'),
    src:[['reg','CLP 规则包 '+pack.id],['reg','Annex VI · SCL']],
    opts:[{o:'类别 1',d:'组分浓度达到该物质 SCL；无 SCL 时使用 GCL',hit:sensHit.length?'✓ 系统建议':'未命中'},
      {o:'不分类（无需分类）',d:'所有致敏组分均低于适用限值',hit:sensHit.length?'未命中':'✓ 当前结果'}]});

  /* CLP-M-GCL-SUM · 严重眼损伤 / 眼刺激 */
  var eyeDam=rows.filter(function(r){return !!r.haz.eyeDamage;}),eyeIrr=rows.filter(function(r){return !!r.haz.eyeIrrit;});
  var damSum=eyeDam.reduce(function(n,r){return n+r.conc;},0),eyeIrrSum=eyeIrr.reduce(function(n,r){return n+r.conc;},0);
  var eyeWeighted=g.weight*damSum+eyeIrrSum;
  var eyeResult=damSum>=g.eyeDamage?'类别 1':(eyeWeighted>=g.eyeIrrit?'类别 2':'不分类');
  items.push({id:'eye',name:'严重眼损伤/眼刺激',result:eyeResult,
    code:eyeResult==='类别 1'?'H318 造成严重眼损伤':(eyeResult==='类别 2'?'H319 造成严重眼刺激':'未达到分类阈值'),
    status:'auto',packId:pack.id,ruleIds:['CLP-R-0002'],method:'CLP-M-GCL-SUM',rule:'CLP Annex I 3.3.3.3 · 通用浓度限值加和法',
    input:clpCalcInput(eyeDam.concat(eyeIrr),function(r){return r.haz.eyeDamage?'Eye Dam. 1':'Eye Irrit. 2';}),
    formula:'Σ(Eye Dam. 1) = '+clpCalcNum(damSum)+'%；10×Σ(Cat.1) + Σ(Cat.2) = '+clpCalcNum(eyeWeighted)+'% → '+eyeResult,
    src:[['reg','CLP 规则包 '+pack.id],['reg','Annex VI / 物质分类数据']],
    opts:[{o:'类别 1',d:'Σ(Eye Dam. 1) ≥ '+g.eyeDamage+'%',hit:eyeResult==='类别 1'?'✓ 系统建议':'当前 '+clpCalcNum(damSum)+'%'},
      {o:'类别 2',d:g.weight+'×Σ(Cat.1) + Σ(Cat.2) ≥ '+g.eyeIrrit+'%',hit:eyeResult==='类别 2'?'✓ 系统建议':'当前 '+clpCalcNum(eyeWeighted)+'%'},
      {o:'不分类（无需分类）',d:'低于上述阈值',hit:eyeResult==='不分类'?'✓ 当前结果':'未命中'}]});

  /* CLP-M-MFACTOR · 水生环境长期危害 */
  var mfRule=clpRuleById('CLP-R-0004'),mf=mfRule.run;
  var aqRows=rows.filter(function(r){return !!r.haz.aquaticChronic;});
  var aq1=0,aq1m=0,aq2=0,aq3=0,aq4=0;
  aqRows.forEach(function(r){var c=String(r.haz.aquaticChronic),m=r.p.mC||1;
    if(c==='1'){aq1+=r.conc;aq1m+=m*r.conc;}else if(c==='2')aq2+=r.conc;else if(c==='3')aq3+=r.conc;else if(c==='4')aq4+=r.conc;});
  var aqScore2=mf.chronic2Weight*aq1m+aq2;
  var aqScore3=mf.chronic3Weight*aq1m+mf.chronic2Weight*aq2+aq3;
  var aqScore4=aq1+aq2+aq3+aq4;
  var aqResult='不分类',aqCode='未达到分类阈值';
  if(aq1m>=mf.limit){aqResult='类别 1';aqCode='H410 对水生生物毒性极大并具有长期持续影响';}
  else if(aqScore2>=mf.limit){aqResult='类别 2';aqCode='H411 对水生生物有毒并具有长期持续影响';}
  else if(aqScore3>=mf.limit){aqResult='类别 3';aqCode='H412 对水生生物有害并具有长期持续影响';}
  else if(aqScore4>=mf.limit){aqResult='类别 4';aqCode='H413 可能对水生生物造成长期持续的有害影响';}
  items.push({id:'aqua',name:'危害水生环境（长期）',result:aqResult,code:aqCode,status:'auto',packId:pack.id,ruleIds:['CLP-R-0004'],method:'CLP-M-MFACTOR',
    rule:'CLP Annex I 4.1.3.5 · M 因子加权求和法',
    input:clpCalcInput(aqRows,function(r){return 'Chronic '+r.haz.aquaticChronic+(String(r.haz.aquaticChronic)==='1'?'，M='+(r.p.mC||1):'');}),
    formula:'Chronic 1='+clpCalcNum(aq1m)+'%；Chronic 2 判定和='+clpCalcNum(aqScore2)+'%；Chronic 3 判定和='+clpCalcNum(aqScore3)+'%；总和='+clpCalcNum(aqScore4)+'% → '+aqResult,
    src:[['reg','CLP 规则包 '+pack.id],['reg','Annex VI / 物质分类数据']],
    opts:[{o:'类别 1',d:'Σ(M×Chronic 1) ≥ '+mf.limit+'%',hit:aqResult==='类别 1'?'✓ 系统建议':'未命中'},
      {o:'类别 2',d:'Σ(10×M×Chronic 1)+Σ(Chronic 2) ≥ '+mf.limit+'%',hit:aqResult==='类别 2'?'✓ 系统建议':'未命中'},
      {o:'类别 3',d:'Σ(100×M×Chronic 1)+10×Σ(Chronic 2)+Σ(Chronic 3) ≥ '+mf.limit+'%',hit:aqResult==='类别 3'?'✓ 系统建议':'未命中'},
      {o:'类别 4',d:'Σ(Chronic 1~4) ≥ '+mf.limit+'%',hit:aqResult==='类别 4'?'✓ 系统建议':'未命中'},
      {o:'不分类（无需分类）',d:'所有逐级判定和均低于 '+mf.limit+'%',hit:aqResult==='不分类'?'✓ 当前结果':'未命中'}]});

  var hCodes=[],pCodes=[],pictograms=[],signal='warning';
  items.forEach(function(item){
    if(item.status==='pending'||item.result==='不分类')return;
    ((item.code||'').match(/H\d{3}/g)||[]).forEach(function(h){if(hCodes.indexOf(h)<0)hCodes.push(h);});
  });
  var labelRows=hCodes.map(function(h){return CLP_LABELS.filter(function(r){return r.code===h;})[0];});
  var missingLabels=hCodes.filter(function(h,i){return !labelRows[i];});
  if(missingLabels.length)throw new Error('CLP 标签字典缺少：'+missingLabels.join(' / '));
  labelRows.forEach(function(row){
    if(row.picto&&row.picto!=='—'&&pictograms.indexOf(row.picto)<0)pictograms.push(row.picto);
    if(row.signal==='危险')signal='danger';
    (P_BY_H[row.code]||[]).forEach(function(p){if(pCodes.indexOf(p)<0)pCodes.push(p);});
  });
  return {pack:pack,items:items,labels:{hCodes:hCodes,pCodes:pCodes,pictograms:pictograms,signal:signal}};
}

/* Annex V 危险象形图（GHS01–GHS09，9 个，固定编号）
   素材（图片）独立维护，不随标签字典结构化数据导入；本页展示编号 / 名称 / 适用危害类别。 */
var CLP_PICTO=[
  {code:'GHS01',name:'爆炸物',cls:'不稳定爆炸物；爆炸物 1.1 / 1.2 / 1.3 / 1.4；自反应物质与混合物 A / B；有机过氧化物 A / B',file:'GHS01.svg',state:'已上传',updated:'2026-06-30',owner:'质管-杨工'},
  {code:'GHS02',name:'火焰',cls:'易燃气体 1；气溶胶 1 / 2；易燃液体 1 / 2 / 3；易燃固体 1 / 2；自反应物质 B–F；发火液体 1；发火固体 1；自热物质 1 / 2；遇水放出易燃气体的物质 1 / 2 / 3；有机过氧化物 B–F',file:'GHS02.svg',state:'已上传',updated:'2026-06-30',owner:'质管-杨工'},
  {code:'GHS03',name:'火焰在圆环上',cls:'氧化性气体 1；氧化性液体 1 / 2 / 3；氧化性固体 1 / 2 / 3',file:'GHS03.svg',state:'已上传',updated:'2026-06-30',owner:'质管-杨工'},
  {code:'GHS04',name:'气瓶',cls:'加压气体（压缩气体 / 液化气体 / 冷冻液化气体 / 溶解气体）',file:'GHS04.svg',state:'已上传',updated:'2026-06-30',owner:'质管-杨工'},
  {code:'GHS05',name:'腐蚀',cls:'金属腐蚀物 1；皮肤腐蚀 1A / 1B / 1C；严重眼损伤 1',file:'GHS05.svg',state:'已上传',updated:'2026-06-30',owner:'质管-杨工'},
  {code:'GHS06',name:'骷髅与交叉骨',cls:'急性毒性（经口 / 经皮 / 吸入）1 / 2 / 3',file:'GHS06.svg',state:'已上传',updated:'2026-06-30',owner:'质管-杨工'},
  {code:'GHS07',name:'感叹号',cls:'急性毒性 4；皮肤刺激 2；眼刺激 2；皮肤致敏 1 / 1A / 1B；呼吸道刺激（STOT SE 3）；麻醉效应（STOT SE 3）',file:'GHS07.svg',state:'已上传',updated:'2026-06-30',owner:'质管-杨工'},
  {code:'GHS08',name:'健康危害',cls:'呼吸道致敏 1 / 1A / 1B；生殖细胞致突变 1A / 1B / 2；致癌 1A / 1B / 2；生殖毒性 1A / 1B / 2；STOT SE 1 / 2；STOT RE 1 / 2；吸入危害 1',file:'GHS08.svg',state:'已上传',updated:'2026-06-30',owner:'质管-杨工'},
  {code:'GHS09',name:'环境',cls:'危害水生环境·急性 1；危害水生环境·慢性 1 / 2',file:'GHS09.svg',state:'已上传',updated:'2026-06-30',owner:'质管-杨工'}
];

/* Tab3：Annex III/IV/V 标签字典（官方字典，按版本维护；非企业自行分类结果） */
var CLP_LABELS=[
  {tp:'H 码',isCombo:'否',code:'H300',text:'吞咽致命（急性毒性—口服 类别 1 / 2）',lang:'中文（zh）',picto:'GHS06',signal:'危险',combo:'组件码：无（单条码）',appliesTo:'急性毒性（经口）类别 1 / 2',st:'现行',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',isCombo:'否',code:'H301',text:'吞咽中毒（急性毒性—口服 类别 3）',lang:'中文（zh）',picto:'GHS06',signal:'危险',combo:'组件码：无（单条码）',appliesTo:'急性毒性（经口）类别 3',st:'现行',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',isCombo:'否',code:'H302',text:'吞咽有害（急性毒性—口服 类别 4）',lang:'中文（zh）',picto:'GHS07',signal:'警告',combo:'组件码：无（单条码）',appliesTo:'急性毒性（经口）类别 4',st:'现行',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',isCombo:'否',code:'H314',text:'造成严重皮肤灼伤和眼损伤',lang:'中文（zh）',picto:'GHS05',signal:'危险',combo:'组件码：无（单条码）',appliesTo:'皮肤腐蚀 1A / 1B / 1C；严重眼损伤 1',st:'现行',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',isCombo:'否',code:'H315',text:'造成皮肤刺激',lang:'中文（zh）',picto:'GHS07',signal:'警告',combo:'组件码：无（单条码）',appliesTo:'皮肤刺激 2',st:'现行',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',isCombo:'否',code:'H317',text:'可能导致皮肤过敏反应',lang:'中文（zh）',picto:'GHS07',signal:'警告',combo:'组件码：无（单条码）',appliesTo:'皮肤致敏 1 / 1A / 1B',st:'现行',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',isCombo:'否',code:'H318',text:'造成严重眼损伤',lang:'中文（zh）',picto:'GHS05',signal:'危险',combo:'组件码：无（单条码）',appliesTo:'严重眼损伤 1',st:'现行',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',isCombo:'否',code:'H319',text:'造成严重眼刺激',lang:'中文（zh）',picto:'GHS07',signal:'警告',combo:'组件码：无（单条码）',appliesTo:'眼刺激 2',st:'现行',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',isCombo:'否',code:'H350',text:'可能致癌（类别 1A/1B）',lang:'中文（zh）',picto:'GHS08',signal:'危险',combo:'组件码：无（单条码）',appliesTo:'致癌性 1A / 1B',st:'现行',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',isCombo:'否',code:'H341',text:'怀疑可造成遗传性缺陷（类别 2）',lang:'中文（zh）',picto:'GHS08',signal:'警告',combo:'组件码：无（单条码）',appliesTo:'生殖细胞致突变性 2',st:'现行',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',isCombo:'否',code:'H225',text:'高度易燃液体和蒸气',lang:'中文（zh）',picto:'GHS02',signal:'危险',combo:'组件码：无（单条码）',appliesTo:'易燃液体 2',st:'现行',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',isCombo:'否',code:'H410',text:'对水生生物毒性极大并具有长期持续影响',lang:'中文（zh）',picto:'GHS09',signal:'警告',combo:'组件码：无（单条码）',appliesTo:'危害水生环境·慢性 1',st:'现行',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',isCombo:'否',code:'H411',text:'对水生生物有毒并具有长期持续影响',lang:'中文（zh）',picto:'GHS09',signal:'警告',combo:'组件码：无（单条码）',appliesTo:'危害水生环境·慢性 2',st:'现行',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',isCombo:'否',code:'H412',text:'对水生生物有害并具有长期持续影响',lang:'中文（zh）',picto:'—',signal:'—',combo:'组件码：无（单条码）',appliesTo:'危害水生环境·慢性 3',st:'现行',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',isCombo:'否',code:'H413',text:'可能对水生生物造成长期持续的有害影响',lang:'中文（zh）',picto:'—',signal:'—',combo:'组件码：无（单条码）',appliesTo:'危害水生环境·慢性 4',st:'现行',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',isCombo:'是',code:'H300+H310',text:'吞咽或皮肤接触可致命',lang:'中文（zh）',picto:'GHS06',signal:'危险',combo:'组件码：H300 + H310（官方组合码，本身即单个标签要素）',appliesTo:'急性毒性（经口 / 经皮）类别 1 / 2；吸入危害 1',st:'现行',ver:'L2026.3',src:'Annex III（H 码表 · 官方组合码 12 条）',eff:'2024-12-10'},
  {tp:'H 码',isCombo:'是',code:'H301+H311+H331',text:'吞咽、皮肤接触或吸入可中毒',lang:'中文（zh）',picto:'GHS06',signal:'危险',combo:'组件码：H301 + H311 + H331（官方组合码）',appliesTo:'急性毒性（经口 / 经皮 / 吸入）类别 3',st:'现行',ver:'L2026.3',src:'Annex III（H 码表 · 官方组合码 12 条）',eff:'2024-12-10'},
  {tp:'EUH 码',isCombo:'否',code:'EUH066',text:'反复接触可能造成皮肤干燥或龟裂',lang:'中文（zh）',picto:'—',signal:'—',combo:'组件码：无；EUH 无官方组合码',appliesTo:'补充危险说明（不改变分类，随分类附加；文本清单在 Annex III，指派条件在 Annex II Part 1）',st:'现行',ver:'L2026.3',src:'Annex III（欧盟补充危险说明）',eff:'2024-12-10'},
  {tp:'P 码',isCombo:'是',code:'P301+P310',text:'如误吞咽：立即呼叫中毒急救中心 / 医生',lang:'中文（zh）',picto:'—',signal:'—',combo:'组件码：P301 + P310（官方组合码 P 31 条之一）',appliesTo:'急性毒性（经口）1 / 2 / 3；吸入危害 1',st:'现行',ver:'L2026.3',src:'Annex IV（P 码表）',eff:'2024-12-10'},
  {tp:'P 码',isCombo:'是',code:'P305+P351+P338',text:'如进入眼睛：用水小心冲洗几分钟；如戴隐形眼镜并可方便地取出，则取出隐形眼镜；继续冲洗',lang:'中文（zh）',picto:'—',signal:'—',combo:'组件码：P305 + P351 + P338（官方组合码）',appliesTo:'严重眼损伤 1；眼刺激 2',st:'现行',ver:'L2026.3',src:'Annex IV（P 码表）',eff:'2024-12-10'},
  {tp:'P 码',isCombo:'否',code:'P280',text:'戴防护手套 / 防护服 / 防护眼罩 / 防护面罩',lang:'中文（zh）',picto:'—',signal:'—',combo:'组件码：无（单条码）',appliesTo:'多数危害类别标签的通用防范语（每标签 P 码 ≤ 6 条）',st:'现行',ver:'L2026.3',src:'Annex IV（P 码表）',eff:'2024-12-10'},
  {tp:'P 码',isCombo:'否',code:'P501',text:'按当地法规处置内装物 / 容器',lang:'中文（zh）',picto:'—',signal:'—',combo:'组件码：无（单条码）',appliesTo:'多数危害类别标签的通用处置语',st:'现行',ver:'L2026.3',src:'Annex IV（P 码表）',eff:'2024-12-10'}
];

/* Tab5：版本变更与影响（物质数量来自官方变更清单；配方/SDS 数量为示例数据） */
var CLP_CHANGES=[
  {mod:'vi',tp:'新增',content:'ATP 22：新增 12 个统一分类条目（含 2-乙基己酸酯类等）',reason:'ECHA RAC 意见采纳 → 第 22 次 ATP',eff:'2026-05-01',by:'质管-杨工',subs:12,recipes:'3',sds:'2'},
  {mod:'vi',tp:'修改',content:'ATP 22：5 项条目分类加严（含甲醛相关 SCL 调整）',reason:'毒理学与生态毒理学证据更新',eff:'2026-05-01',by:'质管-杨工',subs:5,recipes:'2',sds:'2'},
  {mod:'vi',tp:'废止',content:'ATP 22：2 项旧条目被新条目替代删除',reason:'条目整合清理',eff:'2026-05-01',by:'质管-杨工',subs:2,recipes:'0',sds:'0'},
  {mod:'rules',tp:'新增',content:'分类规则库：新增 5 类欧盟附加危害类别（ED / PBT / vPvB / PMT / vPvM）判定规则',reason:'(EU) 2023/707 新危害类别实施',eff:'2026-11-01（存量物质截止）',by:'质管-杨工',subs:'待评估',recipes:'—',sds:'—'},
  {mod:'labels',tp:'修改',content:'标签字典：版式规则更新（最小字号、行距 ≥ 字号 120%、P 码每标签 ≤ 6 条）',reason:'(EU) 2024/2865 CLP 大修',eff:'2026-05-20（过渡期截止）',by:'质管-杨工',subs:'—',recipes:'—',sds:'—'}
];

/* ---------- 2. 模块证据灯与信息条 ---------- */
function clpLModLamp(m){
  if(!m.due)return '<span class="ev ev-none"><i></i>占位</span>';
  var d=daysTo(m.due);
  if(d<0)return '<span class="ev ev-due" title="复审到期：'+m.due+'（待确认）"><i></i>复审预警</span>';
  if(d<60||m.status==='待复核')return '<span class="ev ev-due" title="复审到期：'+m.due+'"><i></i>复审预警</span>';
  return '<span class="ev ev-green" title="复审到期：'+m.due+'"><i></i>有效</span>';
}
function clpLStrip(m){
  return '<div class="clp-strip">'+
    '<span class="it"><em>模块版本</em><b class="mono">'+esc(m.ver)+'</b></span>'+
    '<span class="it"><em>生效日期</em><b>'+esc(m.eff)+'</b></span>'+
    '<span class="it"><em>审核状态</em><b>'+esc(m.status)+' '+clpLModLamp(m)+'</b></span>'+
    '<span class="it"><em>数据截止日期</em><b>'+esc(m.cutoff)+'</b></span>'+
    '<span class="it"><em>维护责任人</em><b>'+esc(m.owner)+'</b></span>'+
    '<span class="it src"><em>数据来源类型</em><b>'+esc(m.src)+'</b></span>'+
    '</div>';
}

/* ---------- 3. 右侧详情抽屉（复用 exp-ai-mask / exp-ai-panel 样式） ---------- */
(function(){
  var mk=document.createElement('div');
  mk.id='clpDwMask';mk.className='exp-ai-mask';mk.style.display='none';
  mk.setAttribute('onclick','clpLDrawerClose()');
  var p=document.createElement('div');
  p.id='clpDw';p.className='exp-ai-panel';
  p.setAttribute('onclick','event.stopPropagation()');
  mk.appendChild(p);
  document.body.appendChild(mk);
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&mk.style.display!=='none')clpLDrawerClose();
  });
})();
function clpLDrawer(title,body,foot){
  var mk=$('clpDwMask'),p=$('clpDw');if(!mk||!p)return;
  p.innerHTML='<div class="modal-hd"><h3>'+esc(title)+'</h3><button class="modal-x" onclick="clpLDrawerClose()">✕</button></div>'+
    '<div class="modal-bd sds-scope clp-page">'+body+'</div>'+
    (foot?'<div class="modal-ft">'+foot+'</div>':'');
  mk.style.display='flex';
}
function clpLDrawerClose(){var mk=$('clpDwMask');if(mk)mk.style.display='none';}

/* ---------- 4. 页面骨架与 Tab 切换（顶部主信息切换 Tab 时保持不变） ---------- */
var CLP_TABS=[
  {key:'vi',label:'Annex VI｜物质统一分类'},
  {key:'rules',label:'Annex I｜分类规则'},
  {key:'labels',label:'Annex III/IV/V｜标签字典'},
  {key:'pcn',label:'Annex VIII｜PCN / UFI'},
  {key:'chg',label:'版本变更与影响'}
];
var _clpTab='vi';
var _clpF={vi:{kw:'',ver:''},rules:{kw:'',tgt:'',st:'',eng:''},labels:{kw:'',tp:'',st:''},chg:{kw:'',tp:''}};
var _clpP={vi:1,rules:1,labels:1,chg:1};

function clpLTopLamp(){
  var worst='green';
  ['vi','rules','labels'].forEach(function(k){
    var m=CLP_MODULES[k],d=m.due?daysTo(m.due):99;
    if(m.status==='待复核'||d<60)worst='due';
  });
  return worst==='due'?'<span class="ev ev-due" title="存在模块待复核或临近复审期"><i></i>复审预警</span>'
    :'<span class="ev ev-green"><i></i>有效</span>';
}

function clpLRender(){
  var worst=clpLTopLamp(),pack=clpActivePack();
  var hint=noteBlock('law-clp',
    '<b>法规分工</b><br>'+esc(CLP_TOP.note)+
    '<div class="np-n"><b>来源类型与维护位置</b>Annex VI 官方统一分类（强制采用，本页 Tab 1）· Annex I 分类判断规则（人工整理，本页 Tab 2）· Annex III/IV/V 官方标签字典（本页 Tab 3）；C&L Inventory 为 ECHA 企业申报汇总参考，<strong>独立菜单维护，不并入本页</strong>；SVHC / Annex XIV / Annex XVII 属 <strong>REACH 独立清单</strong>，亦不在本页。</div>'+
    '<div class="np-n"><b>Annex I 规则维护</b>法规专员只需核对规则内容：上传结构化规则后，系统自动匹配计算能力并完成校验；用户重点确认适用范围、判断条件、输出结果与法规依据，处理异常后发布。内部编号和引擎方法收在详情的「技术信息」中，无需日常维护。</div>',
    '页面说明');
  $('pageHost').innerHTML='<div class="sds-scope clp-page">'+
    sdsHead('clpTitle','CLP 法规库','法规编号 '+CLP_TOP.code+' · 适用市场：'+CLP_TOP.market+' · 当前状态：'+CLP_TOP.status,
      hint.btn+
      '<button class="btn" onclick="clpLGoChg()">查看变更摘要</button>'+
      '<button class="btn" onclick="clpTemplateCenter()">下载导入模板</button>'+
      '<button class="btn primary" onclick="clpLImport()">导入新版本</button>')+
    hint.panel+
    '<div class="card" style="padding:14px 18px;margin-bottom:14px">'+
      '<dl class="desc-list" style="grid-template-columns:120px 1fr 120px 1fr;margin:0">'+
        '<dt>法规名称</dt><dd><b>'+esc(CLP_TOP.name)+'</b></dd>'+
        '<dt>法规编号</dt><dd class="mono">'+esc(CLP_TOP.code)+'</dd>'+
        '<dt>适用市场</dt><dd>'+esc(CLP_TOP.market)+'</dd>'+
        '<dt>当前状态</dt><dd><span class="tag green dot-tag">'+esc(CLP_TOP.status)+'</span></dd>'+
        '<dt>证据灯</dt><dd>'+worst+'</dd>'+
        '<dt>CLP 主版本</dt><dd class="mono">'+esc(CLP_TOP.ver)+'</dd>'+
        '<dt>最近审核时间</dt><dd>'+esc(CLP_TOP.lastReview)+'（人工复审）</dd>'+
        '<dt>最近更新时间</dt><dd>'+esc(CLP_TOP.lastUpdate)+'</dd>'+
        '<dt>数据截止日期</dt><dd>'+esc(CLP_TOP.cutoff)+'<span class="muted">（本次导入官方来源文件日期）</span></dd>'+
        '<dt>维护责任人</dt><dd>'+esc(CLP_TOP.owner)+'</dd>'+
        '<dt>更新频率</dt><dd style="grid-column:span 3">'+esc(CLP_TOP.cycle)+'</dd>'+
        '<dt>影响功能</dt><dd style="grid-column:span 3">'+CLP_TOP.funcs.map(function(f){return '<span class="tag blue">'+esc(f)+'</span>';}).join(' ')+'</dd>'+
        '<dt>生效规则包</dt><dd style="grid-column:span 3"><b class="mono">'+esc(pack.id)+'</b> '
          +'<span class="tag '+(pack.tested?'green':'red')+' dot-tag">'+esc(pack.status)+'</span>'
          +'<span class="muted" style="margin-left:8px">Annex VI '+esc(pack.modules.vi)+' · Annex I '+esc(pack.modules.rules)+' · 标签字典 '+esc(pack.modules.labels)+' · '+pack.methods.length+' 种计算方法</span></dd>'+
      '</dl>'+
    '</div>'+
    '<div id="clpTabs" style="margin-bottom:12px"></div>'+
    '<div id="clpTabBody"></div>'+
    '</div>';
  $('clpTabs').appendChild(tabs(CLP_TABS,_clpTab,function(k){_clpTab=k;clpLRenderTab();}));
  clpLRenderTab();
}
/* 编程式切 Tab：重建页签条高亮 + 渲染 Tab 体（顶部主信息不动） */
function clpLGoTab(k){
  _clpTab=k;
  var host=$('clpTabs');
  if(host){host.innerHTML='';host.appendChild(tabs(CLP_TABS,_clpTab,function(kk){_clpTab=kk;clpLRenderTab();}));}
  clpLRenderTab();
}
function clpLGoChg(){_clpTab='chg';showPage('law:clp');}

function clpLRenderTab(){
  if(_clpTab==='pcn'){$('clpTabBody').innerHTML=clpLTabPcn();return;}
  var m=_clpTab==='chg'?null:CLP_MODULES[_clpTab];
  var h=m?clpLStrip(m):'<div class="notice warn" style="margin-bottom:12px"><div class="ni">!</div><div>本页汇总各模块的版本变更记录。<b>影响配方数量与 SDS 数量为示例数据</b>（原型阶段），不代表系统已具备影响分析能力。</div></div>';
  if(_clpTab==='labels')h+=clpLPictoBlock();
  h+='<div class="card"><div class="toolbar" style="flex-wrap:wrap">';
  if(_clpTab==='vi'){
    var f=_clpF.vi;
    h+='<div class="search" style="width:260px"><i class="si">⌕</i><input id="clpViKw" placeholder="Index No. / 物质名称 / CAS / EC / H 码…" value="'+esc(f.kw)+'" oninput="clpLFill()"></div>'+
       '<select class="ctrl" id="clpViVer" style="width:150px" onchange="clpLFill()"><option value="">全部生效版本</option>'+
         clpLViVers().map(function(v){return '<option'+(f.ver===v?' selected':'')+'>'+esc(v)+'</option>';}).join('')+'</select>';
  }else if(_clpTab==='rules'){
    var f=_clpF.rules;
    h+='<div class="search" style="width:260px"><i class="si">⌕</i><input id="clpRuKw" placeholder="内部规则编号 / 名称 / 危害类别…" value="'+esc(f.kw)+'" oninput="clpLFill()"></div>'+
       '<select class="ctrl" id="clpRuTgt" style="width:150px" onchange="clpLFill()"><option value="">全部适用对象</option><option>物质</option><option>混合物</option><option>物质与混合物</option></select>'+
       '<select class="ctrl" id="clpRuSt" style="width:140px" onchange="clpLFill()"><option value="">全部审核状态</option><option>已发布</option><option>已审核</option><option>待审核</option><option>审核中</option></select>'+
       '<select class="ctrl" id="clpRuEng" style="width:150px" onchange="clpLFill()"><option value="">全部自动化状态</option>'+
         '<option value="已支持"'+(f.eng==='已支持'?' selected':'')+'>可自动计算</option>'+
         '<option value="需要配置参数"'+(f.eng==='需要配置参数'?' selected':'')+'>待配置</option>'+
         '<option value="需要研发实现"'+(f.eng==='需要研发实现'?' selected':'')+'>需技术处理</option></select>';
  }else if(_clpTab==='labels'){
    var f=_clpF.labels;
    h+='<div class="search" style="width:260px"><i class="si">⌕</i><input id="clpLbKw" placeholder="代码 / 内容文字…" value="'+esc(f.kw)+'" oninput="clpLFill()"></div>'+
       '<select class="ctrl" id="clpLbTp" style="width:130px" onchange="clpLFill()"><option value="">全部类型</option><option>H 码</option><option>EUH 码</option><option>P 码</option></select>'+
       '<select class="ctrl" id="clpLbSt" style="width:140px" onchange="clpLFill()"><option value="">全部数据状态</option>'+
         ['现行','新增','修改','废止'].map(function(x){return '<option'+(f.st===x?' selected':'')+'>'+x+'</option>';}).join('')+'</select>';
  }else if(_clpTab==='chg'){
    var f=_clpF.chg;
    h+='<div class="search" style="width:260px"><i class="si">⌕</i><input id="clpCgKw" placeholder="变更内容 / 原因…" value="'+esc(f.kw)+'" oninput="clpLFill()"></div>'+
       '<select class="ctrl" id="clpCgTp" style="width:130px" onchange="clpLFill()"><option value="">全部变更类型</option><option>新增</option><option>修改</option><option>废止</option></select>';
  }
  h+='<div class="grow"></div><span id="clpCnt" class="muted" style="font-size:12.5px"></span></div>'+
     '<div class="tbl-wrap"><table class="tbl" id="clpTable"></table></div>'+
     '<div class="pager" id="clpPager"></div></div>';
  if(_clpTab==='labels'){
    h+='<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div><b>字段适用性（由字典类型决定适用列）：</b>代码 / 标准文本 / 语言 —— <b>H、EUH、P 三类都适用</b>；GHS 图标代码 / 信号词 —— <b>仅 H 行适用</b>（P 行与 EUH 行留空）；标签组合关系 —— <b>H 行与 P 行适用</b>（官方组合码 H 12 条 / P 31 条，本身即单个标签要素，由组件顺序构成），<b>EUH 行不适用</b>。来源 Annex：H 与 EUH 的文本清单在 <b>Annex III</b>、P 在 <b>Annex IV</b>；EUH 的指派条件另见 Annex II Part 1（混合物专用的 EUH201 系列见 Part 2）。</div></div>'+
      '<div class="notice warn" style="margin-top:10px"><div class="ni">!</div><div><b>口径说明：</b>严格按 CLP，<b>象形图与信号词属「危害类别 + 分类」的属性</b>，不是 H 码本身的属性 —— H 码看似「自带」它们，是因为 H 码与危害类别高度一一对应。本页按 H 行维护是可接受的简化，此处如实标注以免误读。</div></div>'+
      '<div class="notice info" style="margin-top:10px"><div class="ni">i</div><div><b>数据状态取值：</b>现行 / 新增 / 修改 / 废止 / 已失效 —— 由每次导入发布时写入，用于标识该条字典在本版本中的状态。</div></div>';
  }
  $('clpTabBody').innerHTML=h;
  clpLFill();
}

function clpLFill(){
  var rows=[],cols=[];
  if(_clpTab==='vi'){
    var kw=($('clpViKw').value||'').trim().toLowerCase(),ver=$('clpViVer').value;
    _clpF.vi={kw:$('clpViKw').value,ver:ver};
    rows=CLP_VI_ROWS.filter(function(r){
      if(ver&&r.ver!==ver)return false;
      return !kw||(r.idx+' '+r.name+' '+r.cas+' '+r.ec+' '+r.h+' '+r.euh+' '+r.cls+' '+r.picto).toLowerCase().indexOf(kw)>=0;
    });
    clpLTable(cols=[['Index No.','idx',130],['物质名称','name',100],['CAS 号','cas',100],['EC 号','ec',100],['危害分类','cls',190],['H 码','h',130],['补充危险说明 EUH','euh',110],['象形图代码','picto',120],['信号词代码','signal',80],['SCL','scl',170],['M 因子','m',120],['ATE','ate',130],['备注','notes',60],['生效版本','ver',80],['来源与条款位置','src',210]],rows,function(r){
      return '<tr><td class="mono">'+esc(r.idx)+'</td><td><b>'+esc(r.name)+'</b></td><td class="mono">'+esc(r.cas)+'</td><td class="mono">'+esc(r.ec)+'</td><td>'+esc(r.cls)+'</td><td class="mono">'+esc(r.h)+'</td><td class="mono">'+esc(r.euh)+'</td><td class="mono">'+esc(r.picto)+'</td><td>'+esc(r.signal)+'</td><td>'+esc(r.scl)+'</td><td>'+esc(r.m)+'</td><td>'+esc(r.ate)+'</td><td>'+esc(r.notes)+'</td><td class="mono">'+esc(r.ver)+'</td><td>'+esc(r.src)+'</td>'+
        '<td class="acts"><button class="btn-link" onclick="clpLViDrawer(\''+esc(r.idx)+'\')">详情</button><button class="btn-link" onclick="clpLViToRule(\''+esc(r.idx)+'\')">分类规则</button></td></tr>';
    });
  }else if(_clpTab==='rules'){
    var kw=($('clpRuKw').value||'').trim().toLowerCase(),tgt=$('clpRuTgt').value,st=$('clpRuSt').value,eng=$('clpRuEng').value;
    _clpF.rules={kw:$('clpRuKw').value,tgt:tgt,st:st,eng:eng};
    rows=CLP_RULES.filter(function(r){
      if(tgt&&r.target!==tgt)return false;
      if(st&&r.status!==st)return false;
      if(eng&&r.engine!==eng)return false;
      return !kw||(r.id+' '+r.name+' '+r.cat+' '+r.ref).toLowerCase().indexOf(kw)>=0;
    });
    clpLTable([['规则名称','name',240],['适用危害类别','cat',170],['适用对象','target',120],['主要判断条件','gcl',240],['自动化状态','engine',120],['规则校验','test',100],['规则版本','ver',90],['发布状态','status',90]],rows,function(r){
      return '<tr><td><b>'+esc(r.name)+'</b></td><td>'+esc(r.cat)+'</td><td><span class="tag '+(r.target==='混合物'?'blue':(r.target==='物质'?'orange':'grey'))+'">'+esc(r.target)+'</span></td><td>'+esc(r.gcl)+'</td><td>'+clpLAutoTag(r.engine)+'</td><td>'+clpLTestTag(r.test)+'</td><td class="mono">'+esc(r.ver)+'</td><td>'+clpLRuStTag(r.status)+'</td>'+
        '<td class="acts"><button class="btn-link" onclick="clpLRuleDrawer(\''+esc(r.id)+'\')">详情</button>'+(r.h?'<button class="btn-link" onclick="clpLRuleToLabel(\''+esc(r.id)+'\')">标签字典</button>':'')+'</td></tr>';
    });
  }else if(_clpTab==='labels'){
    var kw=($('clpLbKw').value||'').trim().toLowerCase(),tp=$('clpLbTp').value,st=$('clpLbSt').value;
    _clpF.labels={kw:$('clpLbKw').value,tp:tp,st:st};
    rows=CLP_LABELS.filter(function(r){
      if(tp&&r.tp!==tp)return false;
      if(st&&r.st!==st)return false;
      return !kw||(r.code+' '+r.text+' '+r.combo+' '+r.appliesTo+' '+r.lang).toLowerCase().indexOf(kw)>=0;
    });
    clpLTable([['类型','tp',80],['代码','code',150],['标准文本','text',230],['语言','lang',90],['GHS 图标代码','picto',80],['信号词','signal',70],['标签组合关系','combo',250],['适用危害类别 / 说明','appliesTo',260],['数据状态','st',80],['来源 Annex','src',180],['数据版本','ver',90],['生效日期','eff',90]],rows,function(r,i){
      return '<tr><td><span class="tag '+(r.tp==='H 码'?'blue':(r.tp==='P 码'?'grey':'purple'))+'">'+esc(r.tp)+'</span>'+(r.isCombo==='是'?'<span class="tag orange" style="margin-left:4px">组合</span>':'')+'</td><td class="mono"><b>'+esc(r.code)+'</b></td><td>'+esc(r.text)+'</td><td>'+esc(r.lang)+'</td><td>'+esc(r.picto)+'</td><td>'+esc(r.signal)+'</td><td>'+esc(r.combo)+'</td><td>'+esc(r.appliesTo)+'</td><td>'+clpLStTag(r.st)+'</td><td>'+esc(r.src)+'</td><td class="mono">'+esc(r.ver)+'</td><td>'+esc(r.eff)+'</td>'+
        '<td class="acts"><button class="btn-link" onclick="clpLLabelDrawer(\''+esc(r.code)+'\')">详情</button></td></tr>';
    });
  }else if(_clpTab==='chg'){
    var kw=($('clpCgKw').value||'').trim().toLowerCase(),tp=$('clpCgTp').value;
    _clpF.chg={kw:$('clpCgKw').value,tp:tp};
    rows=CLP_CHANGES.filter(function(r){
      if(tp&&r.tp!==tp)return false;
      return !kw||(r.content+' '+r.reason).toLowerCase().indexOf(kw)>=0;
    });
    clpLTable([['来源模块','mod',150],['变更类型','tp',80],['内容','content',300],['变更原因','reason',190],['生效日期','eff',140],['审核人','by',90],['影响物质数','subs',100],['影响配方数','recipes',110],['影响 SDS 数','sds',100]],rows,function(r,i){
      return '<tr><td><span class="tag grey">'+esc(clpLModName(r.mod))+'</span></td><td><span class="tag '+(r.tp==='新增'?'green':(r.tp==='修改'?'orange':'grey'))+'">'+esc(r.tp)+'</span></td><td>'+esc(r.content)+'</td><td>'+esc(r.reason)+'</td><td>'+esc(r.eff)+'</td><td>'+esc(r.by)+'</td><td>'+esc(r.subs)+(clpLIsNum(r.subs)?'<span class="muted" style="font-size:11px"> 官方清单</span>':'')+'</td><td>'+esc(r.recipes)+(clpLIsNum(r.recipes)?' <span class="tag orange" style="font-size:10.5px">示例</span>':'')+'</td><td>'+esc(r.sds)+(clpLIsNum(r.sds)?' <span class="tag orange" style="font-size:10.5px">示例</span>':'')+'</td>'+
        '<td class="acts"><button class="btn-link" onclick="clpLChgImpact('+CLP_CHANGES.indexOf(r)+')">查看影响范围</button></td></tr>';
    });
  }
}
/* 数字才挂标注：物质数带「官方清单」、配方 / SDS 数带「示例」；非数字（待评估 / —）一律不挂 */
function clpLIsNum(v){return v!==''&&v!=null&&!isNaN(Number(v));}
/* Tab1「生效版本」下拉改为数据驱动：新版本发布后自动出现，不再硬编码 */
function clpLViVers(){
  var a=[];
  CLP_VI_ROWS.forEach(function(r){if(r.ver&&a.indexOf(r.ver)<0)a.push(r.ver);});
  return a;
}
function clpLMethod(code){return CLP_METHODS.filter(function(m){return m.code===code;})[0]||null;}
function clpLEngineTag(v){
  var c=v==='已支持'?'green':(v==='需要配置参数'?'orange':(v==='需要研发实现'?'red':'grey'));
  return '<span class="tag '+c+'">'+esc(v||'—')+'</span>';
}
function clpLAutoTag(v){
  var x=v==='已支持'?['green','可自动计算']:(v==='需要配置参数'?['orange','待配置']:['red','需技术处理']);
  return '<span class="tag '+x[0]+'">'+x[1]+'</span>';
}
function clpLTestTag(v){
  var c=v==='通过'?'green':(v==='未通过'?'red':'grey');
  return '<span class="tag '+c+'">'+esc(v||'未执行')+'</span>';
}
function clpLStTag(v){
  var c=v==='现行'?'green':(v==='新增'?'blue':(v==='修改'?'orange':'grey'));
  return '<span class="tag '+c+' dot-tag">'+esc(v||'—')+'</span>';
}
function clpLModName(mod){var m={vi:'Annex VI 物质统一分类',rules:'Annex I 分类规则',labels:'Annex III/IV/V 标签字典',pcn:'Annex VIII PCN/UFI'};return m[mod]||'—';}
/* 规则审核状态染色：已发布 / 已审核 = 绿，待审核 = 橙，审核中 = 蓝
   （通用 TAG_CLS 把「已审核 / 待审核」都映射为蓝，规则表里会看不出差别，故本页单列一套） */
function clpLRuStTag(v){
  var c=(v==='已发布'||v==='已审核')?'green':(v==='待审核'?'orange':(v==='审核中'?'blue':'grey'));
  return '<span class="tag '+c+' dot-tag">'+esc(v||'—')+'</span>';
}
/* Annex V 危险象形图：固定编号展示 + 图片素材独立维护入口 */
function clpLPictoBlock(){
  return '<div class="card clp-picto" style="margin-bottom:12px;padding:14px 18px">'+
    '<div class="toolbar" style="margin-bottom:10px"><b style="font-size:13.5px">Annex V｜危险象形图（GHS01–GHS09，共 '+CLP_PICTO.length+' 个）</b>'+
    '<div class="grow"></div><span class="muted" style="font-size:12px;margin-right:8px">9 个固定编号 · 素材独立维护</span><button class="btn sm" onclick="clpLPictoManage()">管理象形图素材</button></div>'+
    '<div class="picto-grid">'+CLP_PICTO.map(function(p){
      return '<div class="picto-item"><span class="pdia"><i></i></span><div><b class="mono">'+esc(p.code)+'</b><span>'+esc(p.name)+'</span><em>'+esc(p.cls)+'</em></div></div>';
    }).join('')+'</div>'+
    '</div>';
}
function clpLPictoManage(){
  var rows=CLP_PICTO.map(function(p){
    var st=p.state==='已上传'?'<span class="tag green">已上传</span>':'<span class="tag orange">'+esc(p.state||'待保存')+'</span>';
    return '<tr><td class="mono"><b>'+esc(p.code)+'</b></td><td>'+esc(p.name)+'</td><td><span class="mono">'+esc(p.file||'未上传')+'</span><span class="sub">'+st+'</span></td><td>'+esc(p.updated||'—')+'<span class="sub">'+esc(p.owner||'—')+'</span></td><td class="acts"><label class="btn sm">上传 / 替换<input type="file" id="clpPicFile-'+esc(p.code)+'" accept=".svg,.png,image/svg+xml,image/png" style="display:none" onchange="clpLPictoPick(\''+esc(p.code)+'\',this)"></label></td></tr>';
  }).join('');
  openModal({title:'管理象形图素材 · Annex V',width:900,cls:'sds-scope clp-page',body:
    '<div class="notice info" style="margin-bottom:12px"><div class="ni">i</div><div><b>素材单独维护：</b>仅支持 SVG / PNG；GHS01–GHS09 编号固定，不可新增或删除。本入口只维护图片文件，不参与 Annex III（H / EUH）与 Annex IV（P 码）的结构化字典导入。</div></div>'+
    '<div class="tbl-wrap clp-picto-manage"><table class="tbl tbl-sm"><thead><tr><th style="width:90px">编号</th><th style="width:120px">名称</th><th>当前素材</th><th style="width:150px">最近更新</th><th style="width:110px">操作</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
  });
}
function clpLPictoPick(code,el){
  var p=CLP_PICTO.filter(function(x){return x.code===code;})[0],f=el&&el.files&&el.files[0];
  if(!p||!f)return;
  if(!/\.(svg|png)$/i.test(f.name)){toast('仅支持 SVG 或 PNG 图片','warn');el.value='';return;}
  p.file=f.name;p.state='已替换（演示）';p.updated='2026-09-21';p.owner=CLP_TOP.owner;
  clpLPictoManage();
  toast(p.code+' 素材已替换（演示）','ok');
}
/* 通用表格渲染（cols: [标题,取值键,宽度] 仅用于表头；行内容由 rowHtml 生成） */
function clpLTable(cols,rows,rowHtml){
  var host=$('clpTable');if(!host)return;
  var cnt=$('clpCnt');
  if(cnt)cnt.textContent='共 '+rows.length+' 条记录';
  var tp=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
  if(_clpP[_clpTab]>tp)_clpP[_clpTab]=tp;
  var pg=rows.slice((_clpP[_clpTab]-1)*PAGE_SIZE,_clpP[_clpTab]*PAGE_SIZE);
  host.innerHTML='<thead><tr>'+cols.map(function(c){return '<th style="width:'+c[2]+'px">'+esc(c[0])+'</th>';}).join('')+'<th style="width:130px">操作</th></tr></thead><tbody>'+
    (pg.length?pg.map(function(r){return rowHtml(r,rows.indexOf(r));}).join(''):'<tr><td colspan="'+(cols.length+1)+'" class="tbl-empty"><span class="big">⌕</span>没有匹配的记录</td></tr>')+'</tbody>';
  var pd=$('clpPager');
  if(pd)pd.innerHTML=tp>1?pagerHtml(rows.length,_clpP[_clpTab],tp,'clpLPageGo'):'';
}
function clpLPageGo(p){_clpP[_clpTab]=p;clpLFill();}

/* ---------- 5. Tab1 详情与跳转 ---------- */
function clpLViDrawer(idx){
  var r=CLP_VI_ROWS.filter(function(x){return x.idx===idx;})[0];if(!r)return;
  clpLDrawer('物质统一分类 · '+r.name,
    clpLStrip(CLP_MODULES.vi)+
    '<dl class="desc-list" style="grid-template-columns:130px 1fr 130px 1fr">'+
    '<dt>Index No.</dt><dd class="mono">'+esc(r.idx)+'</dd><dt>物质名称</dt><dd><b>'+esc(r.name)+'</b></dd>'+
    '<dt>CAS 号</dt><dd class="mono">'+esc(r.cas)+'</dd><dt>EC 号</dt><dd class="mono">'+esc(r.ec)+'</dd>'+
    '<dt>危害分类</dt><dd>'+esc(r.cls)+'</dd><dt>H 码</dt><dd class="mono">'+esc(r.h)+'</dd>'+
    '<dt>补充危险说明（EUH）</dt><dd class="mono">'+esc(r.euh)+'</dd><dt>象形图代码</dt><dd class="mono">'+esc(r.picto)+'</dd>'+
    '<dt>信号词代码</dt><dd>'+esc(r.signal)+'</dd>'+
    '<dt>SCL</dt><dd>'+esc(r.scl)+'</dd><dt>M 因子</dt><dd>'+esc(r.m)+'</dd>'+
    '<dt>ATE</dt><dd>'+esc(r.ate)+'</dd><dt>备注（Notes）</dt><dd>'+esc(r.notes)+'</dd>'+
    '<dt>生效版本</dt><dd class="mono">'+esc(r.ver)+'</dd><dt>来源与条款位置</dt><dd>'+esc(r.src)+'</dd>'+
    '</dl>'+
    '<div class="notice info" style="margin-top:12px"><div class="ni">i</div><div><b>来源分两层：</b>① <b>法规原文</b>——OJ / EUR-Lex 公布的 Annex VI Table 3，是<b>法律效力依据</b>；② <b>整理数据</b>——ECHA CHEM 导出 / ECHA 开放数据门户 / 非正式 Excel 整理稿，便于导入但<b>与 OJ 不一致时以 OJ 为准</b>。统一分类为法定分类，制造商 / 进口商必须采用（未被统一的危害类别仍需自行分类）。</div></div>',
    '<button class="btn" onclick="clpLDrawerClose()">关闭</button>'+
    '<button class="btn primary" onclick="clpLViToRule(\''+esc(r.idx)+'\')">查看相关分类规则 →</button>');
}
function clpLViToRule(idx){
  var r=CLP_VI_ROWS.filter(function(x){return x.idx===idx;})[0];if(!r)return;
  var rule=CLP_RULES.filter(function(x){return x.id===r.rule;})[0];
  clpLDrawerClose();
  _clpTab='rules';
  _clpF.rules={kw:rule?rule.id:'',tgt:'',st:''};
  _clpP.rules=1;
  clpLGoTab('rules');
  clpLDrawerRuleOpen(r.rule);
}

/* ---------- 6. Tab2 详情与跳转 ---------- */
function clpLRuleDrawer(id){clpLDrawerRuleOpen(id);}
function clpLDrawerRuleOpen(id){
  var r=CLP_RULES.filter(function(x){return x.id===id;})[0];if(!r)return;
  var d=r.det,m=CLP_MODULES.rules;
  clpLDrawer('分类规则 · '+r.name,
    clpLStrip(m)+
    '<span style="margin:10px 0 10px;display:inline-block">'+clpLAutoTag(r.engine)+'</span>'+
    '<span class="muted" style="font-size:12px;display:inline;margin-left:8px">系统根据结构化规则自动匹配计算能力</span>'+
    '<dl class="desc-list" style="grid-template-columns:130px 1fr">'+
    '<dt>规则名称</dt><dd>'+esc(r.name)+'</dd>'+
    '<dt>适用危害类别</dt><dd>'+esc(r.cat)+'</dd>'+
    '<dt>适用对象</dt><dd>'+esc(r.target)+'<span class="muted" style="margin-left:6px">（附录 I 主体为混合物分类规则）</span></dd>'+
    '<dt>所需输入</dt><dd>'+esc(d.inputs)+'</dd>'+
    '<dt>判断条件</dt><dd>'+esc(d.cond)+'</dd>'+
    '<dt>计算公式</dt><dd class="mono" style="background:var(--bg-soft,#f7f8fa);padding:6px 10px;border-radius:6px">'+esc(d.formula)+'</dd>'+
    '<dt>例外条件</dt><dd>'+esc(d.except)+'</dd>'+
    '<dt>规则优先级</dt><dd>'+esc(d.prio)+'</dd>'+
    '<dt>输出分类</dt><dd>'+esc(d.output)+'</dd>'+
    '<dt>对应 H 码与标签结果</dt><dd>'+esc(d.label)+'</dd>'+
    '<dt>来源条款与章节</dt><dd>'+esc(d.src)+'</dd>'+
    '<dt>通用浓度限值</dt><dd>'+esc(r.gcl)+'</dd>'+
    '<dt>是否允许加和</dt><dd>'+esc(r.add)+'</dd>'+
    '<dt>规则测试状态</dt><dd>'+clpLTestTag(r.test)+(r.test!=='通过'?'<span class="muted" style="margin-left:8px;font-size:12px">未通过的规则不进入发布清单</span>':'')+'</dd>'+
    '<dt>人工核对人</dt><dd>'+esc(r.checker||'—')+'</dd>'+
    '<dt>人工核对日期</dt><dd>'+esc(r.checkDate||'—')+'</dd>'+
    '<dt>审核状态</dt><dd>'+clpLRuStTag(r.status)+' · 审核人 '+esc(m.owner)+'</dd>'+
    '</dl>'+
    '<details style="margin-top:14px;border:1px solid var(--line);border-radius:8px;padding:10px 12px"><summary style="cursor:pointer;font-weight:650">技术信息（研发 / 追溯）</summary>'+
    '<dl class="desc-list" style="grid-template-columns:130px 1fr;margin-top:12px">'+
    '<dt>内部规则编号</dt><dd class="mono">'+esc(r.id)+'<span class="muted" style="margin-left:8px;font-size:12px">系统生成 · 只读</span></dd>'+
    '<dt>规则引擎方法</dt><dd class="mono">'+esc(r.method||'—')+(clpLMethod(r.method)?'<span class="muted" style="margin-left:8px;font-size:12px">'+esc(clpLMethod(r.method).name)+'</span>':'')+'</dd>'+
    '<dt>引擎支持状态</dt><dd>'+clpLEngineTag(r.engine)+(r.engine==='需要研发实现'?'<span class="muted" style="margin-left:8px;font-size:12px">需登记研发需求后另行开发</span>':(r.engine==='需要配置参数'?'<span class="muted" style="margin-left:8px;font-size:12px">参数配置完成后即可启用</span>':''))+'</dd>'+
    '<dt>数据来源类型</dt><dd><span class="tag grey">结构化规则表</span>——法规专员核对规则内容；系统负责结构校验、版本比较、计算能力匹配与审核发布</dd>'+
    '</dl></details>',
    '<button class="btn" onclick="clpLDrawerClose()">关闭</button>'+
    (r.h?'<button class="btn primary" onclick="clpLRuleToLabel(\''+esc(r.id)+'\')">查看对应标签字典 →</button>':''));
}
function clpLRuleToLabel(id){
  var r=CLP_RULES.filter(function(x){return x.id===id;})[0];if(!r||!r.h)return;
  clpLDrawerClose();
  _clpTab='labels';
  _clpF.labels={kw:r.h,tp:''};
  _clpP.labels=1;
  clpLGoTab('labels');
  clpLLabelDrawer(r.h);
}

/* ---------- 7. Tab3 详情 ---------- */
function clpLLabelDrawer(code){
  var r=CLP_LABELS.filter(function(x){return x.code===code;})[0];
  if(!r)r=CLP_LABELS.filter(function(x){return x.code===(_clpF.labels?_clpF.labels.kw:'');})[0];
  if(!r)return;
  clpLDrawer('标签字典 · '+r.code,
    clpLStrip(CLP_MODULES.labels)+
    '<dl class="desc-list" style="grid-template-columns:130px 1fr 130px 1fr">'+
    '<dt>字典类型</dt><dd>'+esc(r.tp)+(r.isCombo==='是'?'<span class="tag orange" style="margin-left:6px">组合码</span>':'')+'</dd><dt>代码</dt><dd class="mono"><b>'+esc(r.code)+'</b></dd>'+
    '<dt>标准文本</dt><dd>'+esc(r.text)+'</dd><dt>语言</dt><dd>'+esc(r.lang)+'</dd>'+
    '<dt>GHS 图标代码</dt><dd>'+esc(r.picto)+'<span class="muted" style="margin-left:6px;font-size:11.5px">（仅 H 行适用）</span></dd>'+
    '<dt>信号词</dt><dd>'+esc(r.signal)+'<span class="muted" style="margin-left:6px;font-size:11.5px">（仅 H 行适用）</span></dd>'+
    '<dt>数据状态</dt><dd>'+clpLStTag(r.st)+'</dd><dt>生效日期</dt><dd>'+esc(r.eff)+'</dd>'+
    '<dt>标签组合关系</dt><dd style="grid-column:span 3">'+esc(r.combo)+'</dd>'+
    '<dt>适用危害类别 / 说明</dt><dd style="grid-column:span 3">'+esc(r.appliesTo)+'</dd>'+
    '<dt>数据版本</dt><dd class="mono">'+esc(r.ver)+'</dd><dt>来源 Annex</dt><dd>'+esc(r.src)+'</dd>'+
    '</dl>'+
    '<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div><b>官方标签字典，按版本维护；不是企业自行分类结果。</b>企业标签内容 = 分类结果（企业 / Annex VI）× 本字典的标准文字与图形要素。</div></div>',
    '<button class="btn primary" onclick="clpLDrawerClose()">关闭</button>');
}

/* ---------- 8. Tab4：Annex VIII PCN / UFI（静态占位） ---------- */
function clpLTabPcn(){
  var m=CLP_MODULES.pcn;
  return clpLStrip(m)+
    '<div class="notice warn" style="margin-bottom:14px"><div class="ni">!</div><div><b>本模块为静态占位（后续模块）。</b>原型阶段不实现 PCN 文件生成或提交通报；本页说明其适用条件与规划职责。</div></div>'+
    '<div class="kpi-row">'+
      '<div class="kpi"><span>触发条件</span><b style="font-size:14.5px">有危害分类的混合物</b><small>投放欧盟市场时触发</small></div>'+
      '<div class="kpi"><span>通报对象</span><b style="font-size:14.5px">成员国毒物中心</b><small>Poison Centre Notification</small></div>'+
      '<div class="kpi"><span>标签要素</span><b style="font-size:14.5px">UFI 唯一配方标识</b><small>16 位标识符标注于标签</small></div>'+
      '<div class="kpi"><span>通知状态</span><b style="font-size:14.5px">占位 · 未接入</b><small>数据版本：规划中</small></div>'+
    '</div>'+
    '<div class="card" style="padding:14px 18px">'+
    '<dl class="desc-list" style="grid-template-columns:170px 1fr;margin:0">'+
    '<dt>PCN 适用范围</dt><dd>仅当<b>「有危害分类的混合物」投放欧盟市场</b>时触发：需向销售目的地成员国的毒物中心提交 PCN 通报（Poison Centre Notification），并将 UFI 标注在标签上。</dd>'+
    '<dt>UFI 说明</dt><dd>UFI（Unique Formula Identifier）为 <b>16 位唯一配方标识符</b>（格式 XXXX XXXX XXXX XXXX），由企业增值税号与配方编号算法生成；供毒物中心在<b>急救场景下快速定位配方</b>。</dd>'+
    '<dt>与 SDS 模块的关联</dt><dd>现有 SDS 编制功能（第 1 部分）<b>已提供 UFI 填写位</b>；本模块后续负责 UFI 的<b>来源、生成与校验</b>。</dd>'+
    '<dt>通报内容</dt><dd>配方全组分（含浓度范围或精确浓度）、产品分类、UFI、销售国、毒理信息（视成员国要求）。</dd>'+
    '<dt>来源</dt><dd>Regulation (EU) 2017/542（在 CLP 中增设 Annex VIII）· 数据来源类型：官方法规清单（强制采用）。</dd>'+
    '</dl></div>'+
    '<div class="card" style="padding:26px;text-align:center">'+
      '<div style="font-size:34px;color:#b6c2d1">🧪</div>'+
      '<div style="font-size:15px;font-weight:650;margin:8px 0 4px">PCN / UFI 模块规划中</div>'+
      '<div class="muted" style="font-size:12.5px">本期仅静态占位，不实现 PCN 文件生成或提交通报</div>'+
    '</div>';
}

/* ---------- 9. Tab5：影响范围查看（配方 / SDS 数量为示例数据） ---------- */
function clpLChgImpact(i){
  var r=CLP_CHANGES[i];if(!r)return;
  openModal({title:'影响范围 · '+r.tp+'：'+r.content.slice(0,24)+'…',width:780,cls:'sds-scope clp-page',
    body:'<div class="stat-row"><div class="stat"><b>'+esc(String(r.subs))+'</b><span>影响物质数量（官方变更清单）</span></div>'+
      '<div class="stat" style="border-color:var(--orange-b);background:var(--orange-bg)"><b style="color:var(--orange)">'+esc(r.recipes)+(clpLIsNum(r.recipes)?' <span class="tag orange" style="font-size:10.5px">示例</span>':'')+'</b><span>影响配方数量</span></div>'+
      '<div class="stat" style="border-color:var(--orange-b);background:var(--orange-bg)"><b style="color:var(--orange)">'+esc(r.sds)+(clpLIsNum(r.sds)?' <span class="tag orange" style="font-size:10.5px">示例</span>':'')+'</b><span>影响 SDS 数量</span></div></div>'+
      '<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px"><table class="tbl"><thead><tr><th style="width:130px">SDS 编号</th><th>产品名称</th><th style="width:100px">目标市场</th><th>影响项</th><th style="width:120px">建议动作</th></tr></thead><tbody>'+
      '<tr><td class="mono">SDS-2026-0102</td><td>水性聚氨酯涂饰树脂 WPU-320</td><td>欧盟 · 德国</td><td>第 2 / 3 章：组分分类变更</td><td><span class="tag red">需重新分类</span></td></tr>'+
      '<tr><td class="mono">SDS-2026-0088</td><td>皮革涂饰光亮剂 GL-9</td><td>欧盟 · 意大利</td><td>第 2 / 15 章：标签要素更新</td><td><span class="tag orange">需更新标签</span></td></tr>'+
      '</tbody></table></div>'+
      '<div class="notice warn" style="margin:14px 0 0"><div class="ni">!</div><div><b>上述受影响配方 / SDS 清单为示例数据</b>（原型阶段），不代表系统已具备影响分析能力；正式版将基于「法规条目 ↔ 组分 ↔ 已发布 SDS」关联关系计算。</div></div>',
    footer:'<button class="btn primary" onclick="closeModal()">关闭</button>'});
}

/* ---------- 10. 导入新版本 · 五步演示向导（已移交 23z6a-js-clp-import.js） ----------
   本分片不再定义任何 clpLImp* 符号；向导入口按钮仍调用 clpLImport()，
   该函数由紧随其后的 23z6a 分片提供，两者同名符号零重复。
   若需调整导入流程（三模块字段 / 校验 / 规则测试 / 版本比较 / 审核发布），
   请改 src/23z6a-js-clp-import.js。 */

/* ---------- 11. 页面注册（接管 23y 原 law:clp 维护页） ---------- */
regPage('law:clp',{title:'CLP 法规库',crumb:['合规管理','法规库维护','CLP 法规库'],render:clpLRender});
