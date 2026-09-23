/* ==================================================================
   [23z6a] CLP 法规库 · 导入新版本（五步演示向导，三模块分支）
   ------------------------------------------------------------------
   需求口径（Cayla 2026-09-18 二次方向）：
   · 本系统是面向业务人员演示的 PLM 业务原型，**不出现 AI 解析**
   · Annex I 等规则类内容由**法规专员在系统外完成整理与核对**：
     使用统一规则表模板整理，逐条对照法规原文确认后导入
   · 导入对象统一定义为「已经法规专员对照原文确认的结构化规则表」
   · 系统职责：结构校验 → 版本比较 → 规则引擎支持状态检查 →
     测试结果展示 → 审核发布 → 来源与历史版本追溯
   · 第 1 步提供三个模块：Annex VI / Annex I / Annex III·IV·V
     （**不含 Annex VIII｜PCN·UFI**，该 Tab 保留展示，本轮不进导入入口）
   · 统一五步：登记来源 → 创建版本 → 上传结构化数据 →
     数据校验与版本比较 → 审核发布
   · 切换模块后，示例文件名 / 导入字段 / 数据条数 / 校验结果 /
     变更预览 / 发布目标 Tab **必须同步变化**（不得复用同一组数据）
   · Annex I 额外展示「规则引擎支持状态」与「规则测试」；
     **规则测试未通过的规则不进入发布清单**
   · 发布后：更新对应 Annex 模块版本号 / 生效日期 / 数据截止日期，
     数据落入对应 Tab，并在「版本变更与影响」生成变更记录
   实现约定：本分片紧随 23z6 加载（文件名 23z6a 在 C.UTF-8 字典序中
   排在 23z6-js-clp.js 之后、23z7-js-reach.js 之前），独占全部
   clpLImp* 符号；23z6 已删除同名代码，零重复注册。
   ================================================================== */

/* ---------- 1. 三个模块的导入画像 ---------- */
var CLP_IMP_MODS={
  vi:{
    key:'vi',label:'Annex VI｜物质统一分类',
    tmpl:'CLP_AnnexVI_导入模板_ATP23.csv',
    demo:'CLP_AnnexVI_ATP23_结构清单.xlsx',
    fileKind:'物质统一分类清单',
    rows:4182,rowsNote:'4,182 条协调分类条目（ATP 23 全量）',
    orig:'Commission Delegated Regulation (EU) 2026/xxx（第 23 次 ATP）',
    srcName:'欧盟委员会授权法规（第 23 次 ATP）',
    srcCode:'ATP 23',
    link:'eur-lex.europa.eu（OJ L 系列，第 23 次技术进展适应）',
    ver:'ATP 23',eff:'2027-02-01',cut:'2026-09-10',
    verNote:'现行 ATP 22（2026-05-01 生效）→ 本次导入 ATP 23',
    gather:'来源文件为官方 ATP 附录的**结构化整理稿**（ECHA CHEM 导出 / 开放数据门户 / 非正式 Excel）。法律效力以 OJ 公布文本为准；整理稿与 OJ 不一致时以 OJ 为准。',
    fields:[
      ['Index No.','物质统一分类的唯一索引号，格式 3-3-1（如 605-001-00-5）'],
      ['CAS 号','化学文摘社登记号（如 50-00-0）'],
      ['EC 号','欧盟现有化学物质编号（如 200-001-8）'],
      ['物质名称','统一分类条目名称（可含化学名 / EC 名多名）'],
      ['危害分类代码','Hazard Class and Category Code（如 Carc. 1B / Acute Tox. 3）'],
      ['H 码','Hazard Statement Code，可多条，用 / 分隔（如 H350 / H341）'],
      ['补充危险说明（EUH）','欧盟补充危险说明代码（如 EUH071），无则留空'],
      ['象形图代码','GHS01–GHS09，可多个，用 / 分隔'],
      ['信号词代码','Danger / Warning'],
      ['SCL（特定浓度限值）','「分类 → 浓度限值」，可多条；无则留空'],
      ['M 因子','分急性 / 慢性两组；无则留空'],
      ['ATE','分经口 / 经皮 / 吸入；吸入另分气体 / 蒸气 / 粉尘雾'],
      ['Notes','CLP 备注字母（A–X）'],
      ['生效版本','随第 2 步填写的模块版本号自动填充'],
      ['原文条款位置','原文出处（Annex VI Part 3 · Table 3 及具体条目）']
    ],
    checks:[
      {name:'Index No. 重复',lv:'block',cnt:3,rows:['605-001-00-5 出现 2 次（甲醛 / 甲醛（溶液））','029-022-00-4 与 029-022-00-5 归一化后被视为同一索引号']},
      {name:'分类代码无法识别',lv:'block',cnt:2,rows:['Xyz. 9 —— 不在 Annex VI Table 3 分类代码表中','Aquatic Chronic 5 —— 无此危害类别']},
      {name:'H 码不存在',lv:'warn',cnt:1,rows:['H366 —— 不在 Annex III 的 H 码表中']},
      {name:'H 码与分类不匹配',lv:'warn',cnt:2,rows:['Repr. 1B 未附 H360 系列','Carc. 1B 未附 H350']},
      {name:'象形图代码不存在',lv:'warn',cnt:1,rows:['GHS10 —— 超出 GHS01–GHS09 范围']},
      {name:'Index No. 格式异常',lv:'info',cnt:1,rows:['603-14-00-0 —— 应为 3-3-1 格式（603-014-00-0）']},
      {name:'Notes 取值非法',lv:'info',cnt:1,rows:['Note Z —— CLP Notes 取值为 A–X']},
      {name:'CAS / EC 格式、SCL / M 因子 / ATE 格式、必填字段完整性',lv:'pass',cnt:0,rows:['4,170 行通过全部格式与完整性校验']}
    ],
    tests:null,
    testNote:'',
    diffs:{add:12,mod:5,del:2},
    diffTypes:['新增物质','修改物质','删除物质','分类变化','H 码变化','SCL / M 因子 / ATE 变化'],
    items:[
      {tp:'新增物质',k:'029-022-00-4',n:'2-乙基己酸锆',a:'—',b:'Repr. 1B / H360Df',note:'ECHA RAC 意见采纳，新增统一分类'},
      {tp:'新增物质',k:'607-123-00-1',n:'甲基丙烯酸羟乙酯',a:'—',b:'Skin Sens. 1 / H317',note:'新增统一分类'},
      {tp:'修改物质',k:'607-061-00-8',n:'丙烯酸',a:'EUH：—',b:'EUH：EUH071',note:'追加补充危险说明 EUH071（腐蚀呼吸道）'},
      {tp:'分类变化',k:'603-014-00-0',n:'乙二醇单丁醚',a:'Acute Tox. 4',b:'Acute Tox. 3',note:'类别由 4 上调至 3'},
      {tp:'H 码变化',k:'601-021-00-3',n:'甲苯',a:'H361d',b:'H361fd',note:'H 码表述更新（生殖毒性 + 哺乳影响）'},
      {tp:'SCL / M 因子 / ATE 变化',k:'605-001-00-5',n:'甲醛',a:'Skin Sens. 1; H317: C ≥ 0.2%',b:'Skin Sens. 1; H317: C ≥ 0.1%',note:'SCL 阈值加严'},
      {tp:'删除物质',k:'603-099-00-7',n:'双（2-甲氧基乙基）醚（旧条目）',a:'Acute Tox. 4 / H302',b:'—',note:'被合并条目替代删除'}
    ],
    landed:'新增 1 条统一分类条目（2-乙基己酸锆）落入 Tab1，原 5 条示例数据的「生效版本」更新为 ATP 23'
  },
  rules:{
    key:'rules',label:'Annex I｜分类规则',
    tmpl:'CLP_AnnexI_规则表模板_R2027.1.csv',
    demo:'CLP_AnnexI_规则表_R2027.1.xlsx',
    fileKind:'分类规则表',
    rows:18,rowsNote:'18 条规则（含 2 条待上线的新规则）',
    orig:'Regulation (EC) No 1272/2008，Annex I（Part 1 / 3 / 4 / 5）',
    srcName:'法规专员整理稿（对照法规原文逐条确认）',
    srcCode:'R2027.1',
    link:'eur-lex.europa.eu（CLP 合并版 Annex I）',
    ver:'R2027.1',eff:'2027-01-01',cut:'2026-09-15',
    verNote:'现行 R2026.2 → 本次导入 R2027.1',
    gather:'规则表由**法规专员在系统外**使用统一模板整理，并逐条对照法规原文确认。系统不解析法规原文，只接收**已确认的结构化规则表**，负责结构校验、版本比较、规则引擎支持状态检查与审核发布。',
    fields:[
      ['内部规则编号','已有规则必填（如 CLP-R-0006）；新规则留空，由系统首次建档时生成且不可编辑'],
      ['规则名称','规则的业务名称'],
      ['危害类别','对应 Annex I 的危害类别或一般原则'],
      ['适用对象','物质 / 混合物 / 物质与混合物'],
      ['前置条件','触发该规则的条件描述'],
      ['所需输入','计算或判断所需的输入项'],
      ['规则引擎方法','从系统已登记的方法中选择（如 CLP-M-ATE-SUM）；法规专员不编写计算代码'],
      ['阈值参数','阈值及其单位'],
      ['法规公式 / 判定说明','用于法规核对与追溯的说明文本，不作为可执行代码；无公式填「逐案评估」'],
      ['是否允许加和','是 / 否—逐案评估'],
      ['例外条件','不适用或不成立的情形'],
      ['规则优先级','高（1）/ 中（2）/ 低（3）及并列关系'],
      ['输出分类','规则输出的危害类别与分类'],
      ['对应 H 码','输出分类对应的 H 码'],
      ['标签要素','象形图 / 信号词 / 补充说明'],
      ['来源 Part','Annex I 的 Part 号'],
      ['来源章节及条款号','章节与具体条款号（不可只填 Part）'],
      ['生效日期','本规则版本下的生效日期'],
      ['人工核对人','在系统外完成逐条核对的法规专员'],
      ['人工核对日期','核对完成日期（YYYY-MM-DD）']
    ],
    checks:[
      {name:'规则引擎方法未匹配',lv:'block',cnt:3,rows:['CLP-M-ED-PBT —— 方法已登记，但规则引擎尚未实现','CLP-M-NEWTOX —— 方法代码不在「计算方法字典」中','CLP-R-0008（演示）/ CLP-M-NEWTOX —— 新计算方法尚未开发，需创建研发任务后重新测试']},
      {name:'规则测试未通过',lv:'block',cnt:1,rows:['CLP-R-0006 内分泌干扰物（ED）与 PBT / vPvB / PMT / vPvM 判定规则 —— 测试未执行（引擎缺判定模块）']},
      {name:'H 码未匹配标签字典',lv:'warn',cnt:1,rows:['CLP-R-0006 输出的 EUH450 在本次标签字典版本中未找到']},
      {name:'规则之间存在重复或冲突',lv:'warn',cnt:2,rows:['CLP-R-0005 分层原则与 CLP-R-0001 的类别择优逻辑重叠','CLP-R-0007 桥接原则与 CLP-R-0002 通用限值加和在适用条件上互斥']},
      {name:'来源条款缺失',lv:'warn',cnt:1,rows:['CLP-R-0007 的「来源章节及条款号」只填到 Part 1，缺条款号']},
      {name:'阈值或单位缺失',lv:'info',cnt:1,rows:['CLP-R-0006 的阈值参数未带单位（应为 % 或 mg/kg）']},
      {name:'人工核对记录缺失',lv:'info',cnt:2,rows:['导入表第 7 行：人工核对人已填，核对日期为空','导入表第 12 行：核对日期格式为 2026/9/16，应统一为 YYYY-MM-DD']},
      {name:'规则编号唯一、必填字段完整性、危害类别有效性',lv:'pass',cnt:0,rows:['14 条规则通过全部结构校验']}
    ],
    tests:[
      {name:'混合物 T-01',conc:'丙酮 40% / 甲苯 30% / 二甲苯 30%',rule:'CLP-R-0001',calc:'ATE_mix = 100 / ( 40/5800 + 30/5000 + 30/3600 ) ≈ 4708 mg/kg',expect:'未分类（ATE > 2000）',actual:'未分类',res:'通过'},
      {name:'混合物 T-02',conc:'丙烯酸 2% + 乙二醇单丁醚 12%',rule:'CLP-R-0002',calc:'Σ(Ci) ≥ 1%（Corr. 组分）→ Skin Corr. 1',expect:'Skin Corr. 1 / H314',actual:'Skin Corr. 1 / H314',res:'通过'},
      {name:'混合物 T-03',conc:'甲醛 0.3%（该组分挂 SCL）',rule:'CLP-R-0003',calc:'SCL 替代 GCL：H317 门槛 C ≥ 0.2% → 触发皮肤致敏 1',expect:'Skin Sens. 1 / H317',actual:'Skin Sens. 1 / H317',res:'通过'},
      {name:'混合物 T-04',conc:'含 2-乙基己酸锆 3%',rule:'CLP-R-0006',calc:'规则引擎缺少 ED / PBT 判定模块，未执行',expect:'Repr. 1B / H360Df',actual:'—（未执行）',res:'未通过'}
    ],
    testNote:'测试未通过的规则**不进入本次发布清单**，需在引擎补齐后重新测试。',
    excluded:['CLP-R-0006','CLP-R-0008'],
    diffs:{add:3,mod:3,del:1},
    diffTypes:['新增规则','修改规则','废止规则','阈值变化','公式变化','例外条件变化','优先级变化','输出分类变化','来源条款变化','需研发实现'],
    items:[
      {tp:'新增规则',k:'CLP-R-0007',n:'桥接原则（Bridging）—相似混合物分类沿用规则',a:'—',b:'沿用被桥接混合物分类',note:'引擎「需要配置参数」：参数已配置、测试通过 → 进入发布清单'},
      {tp:'新增规则',k:'CLP-R-0006',n:'内分泌干扰物（ED）与 PBT / vPvB / PMT / vPvM 判定规则',a:'—',b:'ED / PBT / vPvB / PMT / vPvM 判定',note:'引擎「需要研发实现」+ 测试未执行 → 本次不发布'},
      {tp:'需研发实现',k:'CLP-R-0008（演示）',n:'新危害类别判定规则（演示条目）',a:'—',b:'待开发 CLP-M-NEWTOX',note:'计算方法尚未开发；本次排除发布，创建研发任务后重新测试'},
      {tp:'阈值变化',k:'CLP-R-0001',n:'急性毒性—口服—混合物 ATE 计算规则',a:'Cat.2 ≥ 1% 且 < 5%',b:'Cat.2 ≥ 1% 且 < 5%（单位统一为 %）',note:'单位补全，数值未变'},
      {tp:'公式变化',k:'CLP-R-0004',n:'慢性水生毒性—M 因子加权求和规则',a:'Chronic 2：Σ(Mi × Ci) ≥ 25%',b:'Chronic 2：Σ(10 × Mi × Ci) ≥ 25%',note:'按 Table 4.1.4 修正慢性折算系数'},
      {tp:'例外条件变化',k:'CLP-R-0003',n:'SCL（特定浓度限值）优先于通用浓度限值',a:'未说明多类别 SCL 并存处理',b:'同一组分多类别 SCL 分别适用',note:'补充例外条件'},
      {tp:'优先级变化',k:'CLP-R-0005',n:'同一危害类别的分层与优先级原则',a:'中（2）',b:'低（3）',note:'调整与其他规则的执行次序'},
      {tp:'废止规则',k:'CLP-R-0000',n:'旧版急性毒性 ATE 换算（R2025 遗留）',a:'R2026.2 生效',b:'—',note:'已被 CLP-R-0001 完全覆盖'}
    ],
    landed:'新增 1 条规则（CLP-R-0007）落入 Tab2（状态由「待审核」转为「已发布」，版本写为本次版本号）；CLP-R-0006 与 CLP-R-0008（演示）因需技术处理或测试未通过被排除，不进入发布清单'
  },
  labels:{
    key:'labels',label:'Annex III/IV/V｜标签字典',
    tmpl:'CLP_AnnexIII_IV_标签字典模板_L2026.4.csv',
    demo:'CLP_AnnexIII_IV_标签字典_L2026.4.xlsx',
    fileKind:'标签字典表',
    rows:293,rowsNote:'293 条（H 码约 100 + EUH 约 40 + P 码约 110 + 官方组合码 43）',
    orig:'Regulation (EC) No 1272/2008，Annex III（H / EUH）与 Annex IV（P）',
    srcName:'法规专员整理稿（对照法规原文逐条确认）',
    srcCode:'L2026.4',
    link:'eur-lex.europa.eu（CLP 合并版 Annex III / IV）',
    ver:'L2026.4',eff:'2026-12-01',cut:'2026-09-12',
    verNote:'现行 L2026.3 → 本次导入 L2026.4',
    gather:'标签字典**官方没有结构化 Excel**，只有法规条文（OJ / EUR-Lex 排版文本）。因此本模块同样由**法规专员对照原文整理为结构化表**后导入；**象形图（Annex V）不随字典导入**，其图片素材在建库时一次性导入。',
    fields:[
      ['字典类型','H / EUH / P'],
      ['代码','H 码 / EUH 码 / P 码（组合码整体为一条，如 P301+P310）'],
      ['标准文本','按 Annex III / IV 原文的标准文字'],
      ['语言','如 zh / en / de；同一代码可按语言多行'],
      ['GHS 图标代码','GHS01–GHS09，**仅 H 行适用**（P / EUH 行留空）'],
      ['信号词','危险 / 警告，**仅 H 行适用**'],
      ['标签组合关系','**H 行与 P 行适用**：组合码填组件码；单条码填「无」；EUH 不适用'],
      ['适用危害类别','该代码对应或适用的危害类别与分类（**标签字典整理工作的大头**）'],
      ['数据状态','现行 / 新增 / 修改 / 废止 / 已失效'],
      ['生效日期','本字典版本下的生效日期'],
      ['来源 Annex','H 与 EUH 的文本清单在 Annex III；P 在 Annex IV']
    ],
    checks:[
      {name:'代码重复',lv:'block',cnt:2,rows:['H317 在同一语言下出现 2 次','P301+P310 与「P301 + P310」（含空格）归一化后重复']},
      {name:'组合码组件不存在',lv:'block',cnt:1,rows:['P302+P353 的组件 P353 —— 不在 Annex IV 的 P 码表中']},
      {name:'图标代码不存在',lv:'warn',cnt:1,rows:['GHS10 —— 超出 GHS01–GHS09 范围']},
      {name:'信号词映射异常',lv:'warn',cnt:1,rows:['H302 同时标注「危险」与「警告」—— 同一类别只能有一个信号词']},
      {name:'H 码与分类规则无法匹配',lv:'warn',cnt:2,rows:['H366 无对应分类规则','H360Df 的「适用危害类别」未填写']},
      {name:'标准文本缺失',lv:'info',cnt:1,rows:['第 44 行：代码 H413，标准文本为空']},
      {name:'语言缺失',lv:'info',cnt:3,rows:['第 58 / 61 / 77 行：标准文本已填，语言列为空']},
      {name:'标签组合关系缺失',lv:'info',cnt:1,rows:['第 92 行：为组合码但未填组件码']},
      {name:'数据状态取值非法',lv:'info',cnt:1,rows:['第 103 行：数据状态填「有效」，应为 现行 / 新增 / 修改 / 废止 / 已失效']},
      {name:'必填字段与格式完整性',lv:'pass',cnt:0,rows:['281 行通过全部结构校验']}
    ],
    tests:null,
    testNote:'',
    diffs:{add:5,mod:3,del:2},
    diffTypes:['新增代码','修改文本','废止代码','图标代码变化','信号词变化','标签组合关系变化'],
    items:[
      {tp:'新增代码',k:'H360Df',n:'可能对生育能力或胎儿造成伤害',a:'—',b:'GHS08 / 危险',note:'新增 H 码（配 CLP-R-0006 提升为发布后条目）'},
      {tp:'修改文本',k:'H301',n:'吞咽中毒（急性毒性—口服 类别 3）',a:'吞咽会中毒',b:'吞咽中毒（急性毒性—口服 类别 3）',note:'按新版本 Annex III 文本修订'},
      {tp:'信号词变化',k:'H302',n:'吞咽有害',a:'危险',b:'警告',note:'信号词映射更正（按危害类别 4）'},
      {tp:'图标代码变化',k:'H318',n:'造成严重眼损伤',a:'GHS05 / GHS07',b:'GHS05',note:'按优先级规则去除与 GHS05 重复的 GHS07'},
      {tp:'标签组合关系变化',k:'P301+P310',n:'如误吞咽：立即呼叫中毒急救中心 / 医生',a:'建议组合 7 条',b:'建议组合 5 条',note:'按「每标签 P 码 ≤ 6 条」收敛'},
      {tp:'废止代码',k:'EUH001',n:'干燥时具有爆炸性',a:'Annex III 有效',b:'—',note:'已从现行 Annex III 删除（无直接替代）'}
    ],
    landed:'新增 1 条字典条目（H360Df）落入 Tab3；Annex V 象形图不参与本次导入'
  }
};
var CLP_IMP_KEYS=['vi','rules','labels'];
var CLP_IMP_LV={block:'阻断',warn:'告警',info:'提示',pass:'通过'};

/* ---------- 2. 向导状态 ---------- */
/* draftId / draftError / deactivationConfirmed：仅 Annex I 规则分支使用（阶段 2） */
var _clpImp={step:1,mod:'vi',t4:'chk',rechecked:false,file:'',origFile:'',uploadAt:'',
  draftId:'',draftError:'',deactivationConfirmed:false,viDraft:null};

function clpImpCsvCell(v){return '"'+String(v==null?'':v).replace(/"/g,'""')+'"';}
function clpImpDownloadTemplate(key){
  var M=CLP_IMP_MODS[key]||clpImpMod();
  var head=M.fields.map(function(f){return clpImpCsvCell(f[0]);}).join(',');
  var blank=M.fields.map(function(){return '""';}).join(',');
  downloadFile(M.tmpl,head+'\r\n'+blank+'\r\n','text/csv;charset=utf-8');
  toast('已下载「'+M.label+'」导入模板','ok');
}
function clpTemplateCenter(){
  openModal({title:'下载导入模板 · CLP 法规库',width:760,cls:'sds-scope clp-page',
    body:'<div class="notice info" style="margin-bottom:12px"><div class="ni">i</div><div>按需要维护的模块下载 CSV 模板，填写后可在「导入新版本」中上传。模板只保留业务填写字段，系统编号与技术校验由导入流程处理。</div></div>'+
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>维护模块</th><th style="width:100px">模板列数</th><th style="width:130px">操作</th></tr></thead><tbody>'+
      ['vi','rules','labels'].map(function(k){var M=CLP_IMP_MODS[k];return '<tr><td><b>'+esc(M.label)+'</b><div class="muted" style="font-size:12px">'+esc(M.fileKind)+'</div></td><td>'+M.fields.length+' 列</td><td><button class="btn sm" onclick="clpImpDownloadTemplate(\''+k+'\')">下载 CSV</button></td></tr>';}).join('')+
      '</tbody></table></div>',footer:'<button class="btn primary" onclick="closeModal()">关闭</button>'});
}

function clpImpMod(){return CLP_IMP_MODS[_clpImp.mod]||CLP_IMP_MODS.vi;}
function clpImpLvTag(lv){
  var c=lv==='block'?'red':(lv==='warn'?'orange':(lv==='info'?'blue':'green'));
  return '<span class="tag '+c+'">'+esc(CLP_IMP_LV[lv]||lv)+'</span>';
}
function clpImpNow(){
  var d=demoNow(),p=function(x){return (x<10?'0':'')+x;};
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes());
}
/* 未处理的阻断类别数（>0 时不允许进入第 5 步）；只有上传修正版并复检后才能清零 */
function clpImpBlkN(){
  if(_clpImp.draftError)return 1;      /* Annex I：版本号与已发布版本冲突等版本级错误 */
  if(_clpImp.rechecked)return 0;
  var c=clpImpMod().checks||0,n=0;
  for(var i=0;i<c.length;i++){if(c[i].lv==='block')n++;}
  return n;
}
function clpImpSum(lv){
  var c=clpImpMod().checks||[],n=0;
  for(var i=0;i<c.length;i++){if(c[i].lv===lv)n+=c[i].cnt||0;}
  return n;
}
function clpImpTypeN(lv){
  var c=clpImpMod().checks||[],n=0;
  for(var i=0;i<c.length;i++){if(c[i].lv===lv)n++;}
  return n;
}
function clpImpRuleSet(){
  var M=clpImpMod(),out=[];
  (M.items||[]).forEach(function(it){out.push(it);});
  return out;
}
/* 规则测试结果：通过 / 未通过 / 合计；excluded 为不进入发布清单的规则编号 */
function clpImpTestStat(){
  var t=clpImpMod().tests||[],pass=0,fail=0;
  t.forEach(function(x){if(x.res==='通过')pass++;else fail++;});
  return {pass:pass,fail:fail,total:t.length};
}
/* 本次实际发布数量：新增扣掉被排除的规则 */
function clpImpPublishCount(){
  var M=clpImpMod(),add=M.diffs.add;
  if(M.key==='vi'&&_clpImp.viDraft)return clpViDraftDiff(_clpImp.viDraft);
  if(M.key==='rules'){
    var ex=(M.excluded||[]).length;
    add=Math.max(0,add-ex);
  }
  return {add:add,mod:M.diffs.mod,del:M.diffs.del};
}

/* ---------- 2b. Annex I 规则分支：真实内存草稿版本（第四十轮 · 阶段 2） ----------
   ⚠️ 原型不做真实 XLSX 解析：第 3 步上传后形成的是**演示整理稿的内存对象**，
      页面明确标注「演示数据」；第 4 步的 Diff / 引擎支持状态 / 参数校验 /
      测试结果 / 发布清单全部由 23z6c 生命周期基于该对象**实时计算**，
      不再是写死的检查结果。 */
function clpImpIsRules(){return clpImpMod().key==='rules';}
/* 演示整理稿：以当前活动规则版本为底稿施加本次修订，并带两条演示条目 */
function clpImpDemoDraftRows(){
  var base=clpRuleVersionBaseline();
  if(!base)return [];
  var byId={};
  base.rules.forEach(function(r){byId[r.id]=clpRuleDeepClone(r);});
  var ver=_clpImp.ver||CLP_IMP_MODS.rules.ver,out=[];
  function push(r){if(r){r.ver=ver;out.push(r);}return r;}
  var r1=byId['CLP-R-0001'];
  if(r1)r1.det.src=r1.det.src+'（ATEi 单位统一为 mg/kg；Ci 单位统一为 %）';   /* 文案或来源变更 */
  push(r1);
  var r2=byId['CLP-R-0002'];
  if(r2)r2.run.skinCorr=3;                                                    /* 皮肤腐蚀阈值 5% → 3% */
  push(r2);
  var r3=byId['CLP-R-0003'];
  if(r3)r3.det.except='SCL 高于 GCL 时按 SCL 放宽、低于 GCL 时按 SCL 收紧；同一组分多类别 SCL 分别适用，多类别并存时按各危害类别独立判断';
  push(r3);
  var r4=byId['CLP-R-0004'];
  if(r4)r4.det.formula='按 Table 4.1.2 逐级计算：Σ(M×Chronic 1)；10×前项+Σ(Chronic 2)；100×前项+10×Σ(Chronic 2)+Σ(Chronic 3)；总和，均与 25% 比较（慢性折算系数按 Table 4.1.4 修订）';
  push(r4);
  /* CLP-R-0005 本次未收录 → **候选停用**（须法规专员统一确认；未确认则旧规则继续有效）。
     注：R-0006 / R-0007 已不属于当前生效版本 R2026.2，它们归 R2027.1 候选草稿版本，
     因此不能再拿它们来演示「候选停用」——基线与版本归属必须自洽。 */
  /* CLP-R-0006：由「R2027.1 候选草稿版本」带入本次整理稿的**拟新增**规则；
     其计算方法 CLP-M-ED-PBT 在引擎中 not_implemented → 待研发实现，本次不发布。 */
  var cand=clpRuleVersionCandidate(),r6=null;
  if(cand)cand.rules.forEach(function(x){if(x.id==='CLP-R-0006')r6=clpRuleDeepClone(x);});
  if(r6){r6.ver=ver;r6.status='待审核';out.push(r6);}
  /* CLP-R-0007 仍留在候选草稿版本中，本次整理稿未纳入，不参与本次发布判断 */
  out.push({id:'CLP-R-0008',name:'新危害类别判定规则（演示条目）',cat:'附加危害类别',target:'物质与混合物',
    gcl:'—',add:'否—逐案评估',ref:'Annex I，Part 5（演示条目）',ver:ver,status:'待审核',
    /* 演示：上传表里由整理稿预填的「引擎支持状态 / 测试通过状态」属于系统字段，一律忽略 */
    engine:'已支持',test:'通过',
    method:'CLP-M-NEWTOX',checker:'质管-杨工',checkDate:'2026-09-16',h:'',
    run:{limit:0.1},
    det:{inputs:'组分的危害判定要素与评估数据',cond:'演示条目：用于验证「计算方法尚未开发」时的发布门禁',
      formula:'逐案评估（无可执行公式）',except:'—',prio:'低（3）',output:'待定',label:'—',
      src:'Regulation (EC) No 1272/2008，Annex I，Part 5（演示条目）'}});
  out.push({id:'CLP-R-0009',name:'急性毒性—吸入—混合物 ATE 计算规则（演示条目）',cat:'急性毒性（吸入）',target:'混合物',
    gcl:'按 ATE_mix 落入 Cat.1 / 2 / 3 / 4 区间',add:'是',ref:'Annex I，Part 3，3.1.3.6（演示条目）',ver:ver,status:'待审核',
    engine:'已支持',test:'通过',
    method:'CLP-M-ATE-SUM',checker:'质管-杨工',checkDate:'2026-09-16',h:'',
    run:{},                    /* 缺「急性毒性分类阈值区间」→ 需要配置参数 */
    det:{inputs:'各组分浓度 Ci（%）与各组分吸入 ATEi',cond:'混合物中含 ≥ 1 个已分类急性毒性（吸入）组分',
      formula:'ATE_mix = 100 / Σ( Ci / ATEi )',except:'组分无可靠 ATE 时记录数据缺口并转人工判定',
      prio:'中（2）',output:'按 ATE_mix 所落区间输出 Acute Tox. 1 / 2 / 3 / 4（吸入）',label:'以对应 H 码与标签结果为准',
      src:'Regulation (EC) No 1272/2008，Annex I，Part 3，第 3.1.3.6 条（演示条目）'}});
  return out;
}
function clpImpBuildDraft(){
  _clpImp.draftError='';
  if(!clpImpIsRules()||typeof clpRuleVersionCreateDraft!=='function')return null;
  var M=clpImpMod();
  try{
    var v=clpRuleVersionCreateDraft({
      version:_clpImp.ver||M.ver,
      effectiveFrom:_clpImp.eff||M.eff,
      cutoff:_clpImp.cut||M.cut,
      createdBy:CLP_TOP.owner,
      file:_clpImp.file||M.demo,
      source:{regulation:_clpImp.src||M.srcName,annex:'Annex I',
        sourceVersion:_clpImp.srcCode||M.srcCode,sourceDate:_clpImp.srcDate||'2026-09-10'},
      rows:clpImpDemoDraftRows()
    });
    _clpImp.draftId=v.id;
    return v;
  }catch(e){
    _clpImp.draftError=String((e&&e.message)||e||'');
    return null;
  }
}
function clpImpDraft(){
  if(!clpImpIsRules())return null;
  var v=_clpImp.draftId?clpRuleVersionGet(_clpImp.draftId):null;
  if(!v||v.version!==(_clpImp.ver||clpImpMod().ver))v=clpImpBuildDraft();
  return v;
}
function clpImpGates(){var v=clpImpDraft();return v?clpRuleVersionRunGates(v):null;}
function clpImpManifest(){var v=clpImpDraft();return v?clpRuleVersionBuildReleaseManifest(v):null;}
function clpImpRuleName(id){
  var v=clpImpDraft(),rs=v?v.rules:[],r=rs.filter(function(x){return x.id===id;})[0];
  if(r)return r.name;
  var cur=CLP_RULES.filter(function(x){return x.id===id;})[0];
  return cur?cur.name:id;
}
function clpImpGateTag(st){
  var c=st==='可发布'?'green':(st==='未变化'?'grey':(st==='测试失败'?'red':(st==='待研发实现'?'orange':'blue')));
  return '<span class="tag '+c+'">'+esc(st)+'</span>';
}
function clpImpSupportTag(st){
  var c=st==='已支持'?'green':(st==='需要配置参数'?'orange':'red');
  return '<span class="tag '+c+'">'+esc(st)+'</span>';
}
function clpImpChangeTag(tp){
  var c=(tp==='新增规则')?'green':((tp==='候选停用')?'grey':((tp==='未变化')?'grey':'orange'));
  return '<span class="tag '+c+'">'+esc(tp)+'</span>';
}

/* ---------- 3. 五步步骤条 ---------- */
function clpLMini(n){
  var t=['登记来源','创建版本','上传结构化数据','数据校验与版本比较','审核发布'];
  return '<div class="mini-steps mini-5">'+t.map(function(x,i){
    var cls=i+1<n?'fin':(i+1===n?'on':'');
    return '<div class="mini-step '+cls+'"><span class="n">'+(i+1<n?'✓':(i+1))+'</span>'+x+'</div>'+(i<4?'<div class="mini-line '+(i+1<n?'fin':'')+'"></div>':'');
  }).join('')+'</div>';
}

/* ---------- 4. 入口与骨架 ---------- */
/* 步骤号 → 页面片段的唯一分发口（步号映射只写一份，避免各调用点各自 if/switch） */
function clpLImpHtml(n){
  return [null,clpLImpHtml1,clpLImpHtml2,clpLImpHtml3,clpLImpHtml4,clpLImpHtml5][n]();
}
/* 全站只有一个模态宿主 #modal，向导内的「导入模板 / 影响范围」属二级弹窗，
   打开时会覆写向导本体。故二级弹窗的关闭按钮统一回到本函数重建向导当前步，
   避免「点一次模板说明，向导就没了」的演示级事故。 */
function clpImpRestore(){
  openModal({title:'导入新版本 · CLP 法规库',width:900,cls:'sds-scope clp-page clpimp',
    body:clpLImpHtml(_clpImp.step),footer:clpLImpFoot(_clpImp.step)});
}
function clpLImport(){
  _clpImp={step:1,mod:'vi',t4:'chk',rechecked:false,file:'',origFile:'',uploadAt:'',
    draftId:'',draftError:'',deactivationConfirmed:false};
  clpImpRestore();
}
function clpLImpGo(n){
  _clpImp.step=n;
  $('mBody').innerHTML=clpLImpHtml(n);
  $('mFoot').innerHTML=clpLImpFoot(n);
}
function clpLImpNext(n){
  if(n===2){
    var sel=$('cipMod');
    var newMod=sel.value;
    if(newMod!==_clpImp.mod){_clpImp.mod=newMod;_clpImp.rechecked=false;_clpImp.t4='chk';_clpImp.file='';}
    _clpImp.src=$('cipSrc').value.trim();
    _clpImp.srcCode=$('cipCode').value.trim();
    _clpImp.link=$('cipLink').value.trim();
    _clpImp.srcDate=$('cipDate').value||'2026-09-10';
    _clpImp.note=$('cipNote').value.trim();
  }
  if(n===3){
    _clpImp.ver=$('cipVer').value.trim()||clpImpMod().ver;
    _clpImp.eff=$('cipEff').value||clpImpMod().eff;
    _clpImp.cut=$('cipCut').value||clpImpMod().cut;
    _clpImp.owner=$('cipOwner').value.trim()||CLP_TOP.owner;
    _clpImp.verNote=$('cipNote2').value.trim();
  }
  if(n===4&&!_clpImp.file){toast('请先上传结构化数据文件（或使用示例文件）','warn');return;}
  if(n===5&&clpImpBlkN()>0){toast('仍有 '+clpImpSum('block')+' 处阻断问题（'+clpImpBlkN()+' 类），请修正表格并重新上传','warn');return;}
  clpLImpGo(n);
}
function clpLImpFoot(n){
  if(n===1)return '<div class="left">第 1 步 / 共 5 步</div><button class="btn" onclick="closeModal()">取消</button>'+
    '<button class="btn primary" onclick="clpLImpNext(2)">下一步：创建版本</button>';
  if(n===2)return '<div class="left">第 2 步 / 共 5 步</div><button class="btn" onclick="clpLImpGo(1)">上一步</button>'+
    '<button class="btn primary" onclick="clpLImpNext(3)">下一步：上传结构化数据</button>';
  if(n===3)return '<div class="left">第 3 步 / 共 5 步</div><button class="btn" onclick="clpLImpGo(2)">上一步</button>'+
    '<button class="btn primary" id="cipNext3"'+(_clpImp.file?'':' disabled')+' onclick="clpLImpNext(4)">下一步：数据校验与版本比较</button>';
  if(n===4){
    var blk=clpImpBlkN();
    return '<div class="left">第 4 步 / 共 5 步'+(blk>0?' · 待修正阻断 '+clpImpSum('block')+' 处 / '+blk+' 类':'')+'</div>'+
      '<button class="btn" onclick="clpLImpGo(3)">上一步</button>'+
      '<button class="btn" onclick="clpLImpImpact()">查看影响范围</button>'+
      '<button class="btn primary" id="cipNext4"'+(blk>0?' disabled':'')+' onclick="clpLImpNext(5)">提交审核</button>';
  }
  if(n===5&&clpImpIsRules()){
    var m=clpImpManifest(),cnt=m?(m.summary.deferred+m.summary.pendingDeactivation):0;
    var label=(m&&cnt>0)?'审核并发布可用规则':'审核通过并发布';
    return '<div class="left">第 5 步 / 共 5 步'+(m?(' · 将发布 '+m.summary.publishable+' 条，'+cnt+' 条暂不发布'):'')+'</div>'+
      '<button class="btn" onclick="clpLImpGo(4)">上一步</button>'+
      '<button class="btn primary" onclick="clpLImpPublish()">'+esc(label)+'</button>';
  }
  return '<div class="left">第 5 步 / 共 5 步</div><button class="btn" onclick="clpLImpGo(4)">上一步</button>'+
    '<button class="btn primary" onclick="clpLImpPublish()">发布版本</button>';
}

/* ---------- 5. 第 1 步：登记来源（7 字段） ---------- */
function clpLImpHtml1(){
  var M=clpImpMod();
  return clpLMini(1)+
    '<div class="form-grid">'+
    '<div class="field"><label class="req">导入模块</label><select class="ctrl" id="cipMod" onchange="clpLImpModSwitch()">'+
      CLP_IMP_KEYS.map(function(k){return '<option value="'+k+'"'+(_clpImp.mod===k?' selected':'')+'>'+esc(CLP_IMP_MODS[k].label)+'</option>';}).join('')+
      '</select></div>'+
    '<div class="field"><label class="req">官方来源名称</label><input class="ctrl" id="cipSrc" value="'+esc(_clpImp.src||M.srcName)+'"></div>'+
    '<div class="field"><label class="req">法规或 ATP 编号</label><input class="ctrl" id="cipCode" value="'+esc(_clpImp.srcCode||M.srcCode)+'"></div>'+
    '<div class="field"><label>来源发布日期</label><input class="ctrl" type="date" id="cipDate" value="'+esc(_clpImp.srcDate||'2026-09-10')+'"></div>'+
    '<div class="field span2"><label>官方链接</label><input class="ctrl" id="cipLink" value="'+esc(_clpImp.link||M.link)+'"></div>'+
    '<div class="field span2"><label>备注</label><input class="ctrl" id="cipNote" value="'+esc(_clpImp.note||'')+'" placeholder="例如：官方公报附件；本次仅涉及分类与标签要素"></div>'+
    '</div>'+
    '<div class="field" style="margin-top:12px"><label>原始法规附件（PDF / 原文存档，与结构化文件分开保存）</label>'+
      '<div id="cipOrigRow">'+clpImpOrigRow()+'</div>'+
      '<div style="margin-top:6px;font-size:12px"><a style="cursor:pointer" onclick="clpImpPickOrig()">选择原始法规附件</a>'+
      '<span class="muted"> · 原始附件只作追溯依据，不参与数据校验</span></div></div>'+
    '<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div>'+clpImpMd(M.gather)+'</div></div>';
}
function clpImpOrigRow(){
  if(!_clpImp.origFile)return '<div class="muted" style="font-size:12px">尚未上传原始法规附件（可稍后补）</div>';
  return '<div class="file-row"><span style="font-size:16px">▤</span><div><b>'+esc(_clpImp.origFile)+'</b>'+
    '<div style="color:var(--muted);font-size:11.5px">原始法规原文 · 法律效力依据</div></div>'+
    '<span class="tag grey" style="margin-left:auto">存档</span></div>';
}
function clpImpPickOrig(){
  var M=clpImpMod();
  _clpImp.origFile=M.key==='vi'?'ATP23_官方公报原文.pdf':(M.key==='rules'?'CLP_AnnexI_合并版原文.pdf':'CLP_AnnexIII_IV_合并版原文.pdf');
  var r=$('cipOrigRow');if(r)r.innerHTML=clpImpOrigRow();
  toast('已附加原始法规附件（演示）','ok');
}
/* 切换模块后，示例数据同步变化（第 1 步就地提示） */
function clpLImpModSwitch(){
  var sel=$('cipMod');if(!sel)return;
  _clpImp.mod=sel.value;_clpImp.rechecked=false;_clpImp.t4='chk';_clpImp.file='';_clpImp.origFile='';
  _clpImp.src='';_clpImp.srcCode='';_clpImp.link='';
  _clpImp.draftId='';_clpImp.draftError='';_clpImp.deactivationConfirmed=false;
  clpLImpGo(1);
  toast('已切换到「'+CLP_IMP_MODS[_clpImp.mod].label+'」，后续步骤的字段 / 条数 / 校验 / 变更预览将同步变化','ok');
}

/* ---------- 6. 第 2 步：创建版本（5 字段） ---------- */
function clpLImpHtml2(){
  var M=clpImpMod();
  return clpLMini(2)+
    '<div class="form-grid">'+
    '<div class="field"><label class="req">模块版本号</label><input class="ctrl" id="cipVer" value="'+esc(_clpImp.ver||M.ver)+'"></div>'+
    '<div class="field"><label class="req">生效日期</label><input class="ctrl" type="date" id="cipEff" value="'+esc(_clpImp.eff||M.eff)+'"></div>'+
    '<div class="field"><label class="req">数据截止日期</label><input class="ctrl" type="date" id="cipCut" value="'+esc(_clpImp.cut||M.cut)+'"></div>'+
    '<div class="field"><label>维护责任人</label><input class="ctrl" id="cipOwner" value="'+esc(CLP_TOP.owner)+'"></div>'+
    '<div class="field span2"><label>版本说明</label><input class="ctrl" id="cipNote2" value="'+esc(_clpImp.verNote||'')+'" placeholder="例如：新增 1 条规则；修正 1 处折算系数"></div>'+
    '</div>'+
    '<div class="notice info" style="margin-top:12px"><div class="ni">i</div><div>当前模块：<b>'+esc(M.label)+'</b> · 版本演进：<b>'+esc(M.verNote)+'</b>。不同 Annex 模块的版本与生效时间各自独立，登记后<b>仅更新所选模块</b>。</div></div>'+
    '<div class="notice grey" style="margin-top:10px"><div class="ni">§</div><div>「数据截止日期」指本次导入所用官方数据的截止时点，用于判断版本是否滞后 —— 官方整理稿本身可能滞后于最新 ATP / 修订，因此该字段是必填项。</div></div>';
}

/* ---------- 7. 第 3 步：上传结构化数据 ---------- */
function clpLImpHtml3(){
  var M=clpImpMod();
  return clpLMini(3)+
    '<div class="toolbar" style="margin-bottom:10px"><span style="font-size:13px;font-weight:650">'+esc(M.fileKind)+' · 导入模板</span>'+
    '<div class="grow"></div><button class="btn" onclick="clpLImpTmpl()">下载导入模板</button>'+
    '<button class="btn" onclick="clpLImpTmpl()">模板字段说明</button></div>'+
    '<div class="drop" onclick="clpImpPick()"><div class="ic">⇪</div><p>上传结构化数据文件（Excel / CSV）</p>'+
    '<small>'+esc(M.fileKind)+'，按模板列序填写 · 原型为静态演示，不进行真实解析</small></div>'+
    '<div id="cipFileRow" style="margin-top:12px">'+clpImpFileRow()+'</div>'+
    '<div style="margin-top:8px;font-size:12.5px">没有文件？<a style="cursor:pointer" onclick="clpImpPickDemo()">使用示例文件（'+esc(M.demo)+'）</a></div>'+
    '<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div><b>模板即契约：</b>模板列与系统字段一一对应，校验规则与模板列绑定 —— 上传文件若列名或列序不符，第 4 步会在结构校验中报出。</div></div>';
}
function clpImpFileRow(){
  var M=clpImpMod();
  if(!_clpImp.file)return '<div class="muted" style="font-size:12px">尚未上传结构化数据文件</div>';
  return '<div class="file-row"><span style="font-size:16px">▤</span><div><b>'+esc(_clpImp.file)+'</b>'+
    '<div style="color:var(--muted);font-size:11.5px">'+esc(M.fileKind)+'</div></div>'+
    '<span class="tag orange" style="margin-left:auto">待校验</span></div>'+
    '<div class="cip-filemeta"><span><em>文件名称</em><b>'+esc(_clpImp.file)+'</b></span>'+
    '<span><em>数据条数</em><b>'+esc(M.rowsNote)+'</b></span>'+
    '<span><em>上传人</em><b>'+esc(CLP_TOP.owner)+'</b></span>'+
    '<span><em>上传时间</em><b>'+esc(_clpImp.uploadAt||'—')+'</b></span></div>';
}
function clpImpPick(){
  _clpImp.file=clpImpMod().demo;_clpImp.uploadAt=clpImpNow();_clpImp.rechecked=false;
  /* Annex I：上传后立即在系统内形成真实的草稿版本对象（供第 4 步实时比较） */
  if(clpImpIsRules())clpImpBuildDraft();
  if(_clpImp.mod==='vi'){
    var M=clpImpMod();
    _clpImp.viDraft=clpViDemoDraft(_clpImp.ver||M.ver,_clpImp.eff||M.eff,_clpImp.cut||M.cut,
      {regulation:_clpImp.src||M.srcName,annex:'Annex VI Part 3',sourceFile:_clpImp.file,
        sourceVersion:_clpImp.srcCode||M.srcCode,sourceDate:_clpImp.srcDate||clpSystemToday(),note:'演示结构化数据；法律效力以 OJ 原文为准'});
  }
  var r=$('cipFileRow');if(r)r.innerHTML=clpImpFileRow();
  var b=$('cipNext3');if(b){b.disabled=false;b.classList.remove('disabled');}
}
function clpImpPickDemo(){clpImpPick();toast('已使用示例文件（演示数据）','ok');}
function clpLImpTmpl(){
  var M=clpImpMod();
  openModal({title:'导入模板 · '+M.label,width:820,cls:'sds-scope clp-page',
    body:'<div class="notice info" style="margin-bottom:12px"><div class="ni">i</div><div>模板文件：<b class="mono">'+esc(M.tmpl)+'</b>。下表是本模块的字段定义，点击下方按钮即可下载并填写。</div></div>'+
      '<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px;max-height:420px;overflow:auto"><table class="tbl"><thead><tr>'+
      '<th style="width:44px">序号</th><th style="width:190px">模板列名</th><th>填写说明</th></tr></thead><tbody>'+
      M.fields.map(function(f,i){return '<tr><td class="mono">'+(i+1)+'</td><td><b>'+esc(f[0])+'</b></td><td>'+clpImpMd(f[1])+'</td></tr>';}).join('')+
      '</tbody></table></div>'+
      '<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div>列数：<b>'+M.fields.length+' 列</b>。模板由法规专员在系统外填写，<b>逐条对照法规原文确认后</b>再上传；系统不解析法规原文。</div></div>',
    footer:'<button class="btn" onclick="clpImpRestore()">返回向导</button><button class="btn primary" onclick="clpImpDownloadTemplate(\''+M.key+'\')">下载 CSV 模板</button>'});
}

/* ---------- 8. 第 4 步：数据校验与版本比较（三子 Tab） ---------- */
function clpLImpHtml4(){
  var M=clpImpMod(),out=clpLMini(4);
  var subs=[['chk','数据校验（'+((M.checks||[]).length)+' 类）']];
  if(M.tests)subs.push(['test','规则测试（'+M.tests.length+' 例）']);
  subs.push(['diff','版本比较（'+M.diffTypes.length+' 类变更）']);
  out+='<div class="clpimp-seg">'+subs.map(function(s){
    return '<button class="'+(s[0]===_clpImp.t4?'on':'')+'" onclick="clpImpT4(\''+s[0]+'\')">'+esc(s[1])+'</button>';
  }).join('')+'</div>';
  /* Annex I：先给出系统实时计算的变更计数，再进入三个子 Tab */
  if(clpImpIsRules())out+=clpImpRulesStatHtml();
  out+='<div id="cipT4">'+clpImpT4Html()+'</div>';
  return out;
}
function clpImpT4(k){_clpImp.t4=k;$('mBody').innerHTML=clpLImpHtml4();}
function clpImpT4Html(){
  if(_clpImp.t4==='chk')return clpImpChkHtml();
  if(_clpImp.t4==='test')return clpImpTestHtml();
  return clpImpDiffHtml();
}
function clpImpChkHtml(){
  var M=clpImpMod(),h='';
  var blk=_clpImp.rechecked?0:clpImpSum('block');
  h+='<div class="stat-row">'+
    '<div class="stat" style="border-color:var(--red-b,#f3c6c6);background:var(--red-bg,#fdecec)"><b style="color:var(--red,#c0392b)">'+blk+'</b><span>阻断问题'+(_clpImp.rechecked?'（修正版复检后）':' · '+clpImpTypeN('block')+' 类')+'</span></div>'+
    '<div class="stat" style="border-color:var(--orange-b);background:var(--orange-bg)"><b style="color:var(--orange)">'+clpImpSum('warn')+'</b><span>告警问题 · '+clpImpTypeN('warn')+' 类（发布前确认）</span></div>'+
    '<div class="stat"><b>'+clpImpSum('info')+'</b><span>提示问题 · '+clpImpTypeN('info')+' 类</span></div>'+
    '<div class="stat" style="border-color:var(--green-b);background:var(--green-bg)"><b style="color:var(--green)">'+((function(){var c=M.checks||[];for(var i=0;i<c.length;i++){if(c[i].lv==='pass')return c[i].rows[0];}return '—';})())+'</b><span>通过校验的数据量</span></div>'+
    '</div>';
  h+='<div class="toolbar cip-check-actions"><b>校验问题明细</b><div class="grow"></div>'+
    '<button class="btn" onclick="clpImpDownloadIssues()">下载问题明细</button>'+
    '<button class="btn primary" onclick="clpImpReupload()">上传修正版并重新校验</button></div>';
  h+='<div class="tbl-wrap cip-check-table"><table class="tbl"><thead><tr>'+
    '<th style="width:58px">级别</th><th style="width:128px">检查项</th><th style="width:52px">数量</th>'+
    '<th>问题明细</th><th style="width:174px">处理方式</th><th style="width:112px">当前状态</th>'+
    '</tr></thead><tbody>'+(M.checks||[]).filter(function(c){return c.lv!=='pass';}).map(function(c){
      var handling=clpImpHandling(c),status='';
      if(c.lv==='block')status=_clpImp.rechecked?'<span class="tag green">修正版复检通过</span>':'<span class="tag red">待修正重传</span>';
      else if(c.lv==='warn')status=_clpImp.rechecked?'<span class="tag orange">复检保留 · 待审核确认</span>':'<span class="tag orange">待确认</span>';
      else status='<span class="tag blue">提示 · 不阻断</span>';
      return '<tr class="cip-check-row '+(_clpImp.rechecked&&c.lv==='block'?'is-fixed':'')+'"><td>'+clpImpLvTag(c.lv)+'</td>'+
        '<td><b>'+esc(c.name)+'</b></td><td class="mono">'+esc(String(c.cnt||0))+' 处</td>'+
        '<td><div class="cip-check-details">'+c.rows.map(function(r){return '<div>• '+clpImpMd(r)+'</div>';}).join('')+'</div></td>'+
        '<td>'+esc(handling)+'</td><td>'+status+'</td></tr>';
    }).join('')+'</tbody></table></div>';
  h+='<div class="notice warn" style="margin-top:12px"><div class="ni">!</div><div><b>阻断问题不能手工点选放行。</b>法规专员须在线下修正结构化表并重新上传，系统复检通过后才可提交审核；告警项须在发布前结合法规原文确认，提示项不阻断流程。</div></div>';
  if(clpImpIsRules())h+=clpImpSysHtml();
  return h;
}
function clpImpHandling(c){
  if(c.lv==='block'&&clpImpMod().key==='rules')return '修正规则或方法编号后重传；仍不支持的规则排除本次发布';
  if(c.lv==='block')return '在线下表格修正后重新上传';
  if(c.lv==='warn')return '优先修正后重传；确需保留时在审核说明中确认';
  return '建议修正，不阻断提交';
}
function clpImpDownloadIssues(){
  var M=clpImpMod(),rows=[['级别','检查项','发现数量','问题明细','处理方式']];
  (M.checks||[]).filter(function(c){return c.lv!=='pass';}).forEach(function(c){
    c.rows.forEach(function(r){rows.push([CLP_IMP_LV[c.lv],c.name,c.cnt+' 处',String(r).replace(/\*\*/g,''),clpImpHandling(c)]);});
  });
  var csv=rows.map(function(r){return r.map(clpImpCsvCell).join(',');}).join('\r\n')+'\r\n';
  downloadFile('CLP_'+M.key+'_校验问题明细.csv',csv,'text/csv;charset=utf-8');
  toast('已下载校验问题明细','ok');
}
function clpImpReupload(){
  var name=_clpImp.file||clpImpMod().demo,p=name.lastIndexOf('.');
  _clpImp.file=p>0?name.slice(0,p)+'_修正版'+name.slice(p):name+'_修正版';
  _clpImp.uploadAt=clpImpNow();_clpImp.rechecked=true;
  $('cipT4').innerHTML=clpImpT4Html();
  $('mFoot').innerHTML=clpLImpFoot(4);
  toast('修正版已上传并重新校验：阻断问题 0 处，可提交审核','ok');
}
/* ---------- 8b. Annex I 第 4 步：系统实时判断（阶段 2） ---------- */
function clpImpRulesStatHtml(){
  var g=clpImpGates(),d=clpImpDraft();
  if(!g||!d)return '<div class="notice red" style="margin-bottom:10px"><div class="ni">!</div><div>'+
    esc(_clpImp.draftError||'草稿版本尚未生成，请返回第 3 步重新上传结构化规则表。')+'</div></div>';
  var df=d.diffSummary||{},s=g.summary||{};
  function st(n,t,c){return '<div class="stat"><b'+(c?' style="color:var(--'+c+')"':'')+'>'+n+'</b><span>'+t+'</span></div>';}
  return '<div class="stat-row">'+
    st(df.summary.added,'新增规则','green')+st(df.summary.modified,'修改规则','orange')+
    st(df.summary.unchanged,'未变化')+st(df.summary.deactivated,'候选停用')+
    st(s.publishable,'可发布','green')+st(s.needInput,'待补充','orange')+
    st(s.needDev,'待研发实现','red')+st(s.testFailed,'测试失败','red')+
    '</div>'+
    '<div class="notice grey" style="margin-bottom:10px"><div class="ni">§</div><div>以上计数由系统对<b>内存草稿版本</b>（'+esc(d.version)+'）与当前活动版本（'+esc(g.baseVersion)+'）实时比较并执行规则测试得出；'+
    '其中「引擎支持状态 / 测试是否通过 / 是否可发布」<b>全部由系统计算</b>，法规专员不填写、也不得修改。</div></div>';
}
/* chk 子 Tab：系统自动生成的引擎支持状态 + 参数与必填校验 + 上传字段忽略提示 */
function clpImpSysHtml(){
  var g=clpImpGates(),d=clpImpDraft();
  if(!g||!d)return '';
  var h='<div style="font-size:12.5px;font-weight:650;margin:12px 0 7px">系统自动判断 · 引擎支持状态与参数校验</div>';
  var ig=(d.ignoredUploadFields||[]);
  if(ig.length){
    h+='<div class="notice warn" style="margin-bottom:10px"><div class="ni">!</div><div>「'+
      ig.map(function(k){return esc(k);}).join('」「')+'」由系统自动判断，上传文件中的该列已忽略。</div></div>';
  }
  h+='<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px"><table class="tbl"><thead><tr>'+
    '<th style="width:120px">规则编号</th><th style="width:250px">规则名称</th><th style="width:120px">变化类型</th>'+
    '<th style="width:120px">引擎支持状态</th><th>系统判断说明</th></tr></thead><tbody>'+
    g.entries.map(function(e){
      return '<tr><td class="mono">'+esc(e.ruleId)+'</td><td><b>'+esc(e.name||'')+'</b></td>'+
        '<td>'+clpImpChangeTag(e.changeType)+'</td><td>'+clpImpSupportTag(e.engineSupport)+'</td>'+
        '<td>'+(e.issues.length?e.issues.map(function(x){return '<div>• '+esc(x);}).join('</div>')
          :'<span class="muted">必填字段、来源条款与参数完整</span>')+'</td></tr>';
    }).join('')+'</tbody></table></div>';
  var val=(g.validate||{});
  if(val.errors&&val.errors.length){
    h+='<div class="notice red" style="margin-top:10px"><div class="ni">!</div><div><b>版本级校验未通过：</b><br>'+
      val.errors.map(function(x){return '• '+esc(x);}).join('<br>')+'</div></div>';
  }
  return h;
}
/* test 子 Tab：真实执行引擎得到的规则测试结果（含测试复用） */
function clpImpRulesTestHtml(){
  var g=clpImpGates();
  if(!g)return '<div class="notice red"><div class="ni">!</div><div>'+esc(_clpImp.draftError||'草稿版本尚未生成。')+'</div></div>';
  var ran=g.entries.filter(function(e){return e.testResult.ran;}),
      reused=g.entries.filter(function(e){return e.testResult.reused;});
  var h='<div class="stat-row">'+
    '<div class="stat" style="border-color:var(--green-b);background:var(--green-bg)"><b style="color:var(--green)">'+g.summary.publishable+'</b><span>通过门禁 · 可发布</span></div>'+
    '<div class="stat" style="border-color:var(--red-b,#f3c6c6);background:var(--red-bg,#fdecec)"><b style="color:var(--red,#c0392b)">'+g.summary.testFailed+'</b><span>测试未通过</span></div>'+
    '<div class="stat"><b>'+reused.length+'</b><span>沿用上版测试结果</span></div>'+
    '<div class="stat"><b>'+ran.length+'</b><span>本次实际执行</span></div></div>';
  h+='<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px;max-height:320px;overflow:auto"><table class="tbl" style="min-width:1180px"><thead><tr>'+
    '<th style="width:110px">规则编号</th><th style="width:230px">测试用例</th><th style="width:210px">测试组分 / 浓度</th>'+
    '<th style="width:150px">预期分类</th><th style="width:150px">实测分类</th><th style="width:90px">测试结果</th><th>说明</th></tr></thead><tbody>'+
    g.entries.map(function(e){
      if(e.testResult.reused){
        return '<tr><td class="mono">'+esc(e.ruleId)+'</td><td><b>沿用上版测试结果</b></td><td class="muted">—</td>'+
          '<td class="muted">—</td><td class="muted">—</td><td><span class="tag grey">沿用</span></td>'+
          '<td>执行指纹未变化、计算方法版本未变化，且上版（'+esc(e.testResult.fromVersion)+'）测试通过 → 本次不重复执行计算测试；文本差异仍在第 3 个 Tab 展示供核对。</td></tr>';
      }
      if(!e.testResult.cases.length){
        return '<tr><td class="mono">'+esc(e.ruleId)+'</td><td><b>无代表性测试用例</b></td><td class="muted">—</td>'+
          '<td class="muted">—</td><td class="muted">—</td><td><span class="tag blue">待补充</span></td>'+
          '<td>'+esc(e.issues[0]||'')+'</td></tr>';
      }
      return e.testResult.cases.map(function(c){
        return '<tr'+(c.pass?'':' class="cip-row-bad"')+'><td class="mono">'+esc(e.ruleId)+'</td><td><b>'+esc(c.name)+'</b>'+
          '<div class="muted" style="font-size:11px">'+esc(c.id)+'</div></td>'+
          '<td>'+esc(((CLP_RULE_TEST_CASES[e.ruleId]||[]).filter(function(t){return t.id===c.id;})[0]||{input:{}})
            .input.components.map(function(x){return x.name+' '+x.conc+'%';}).join('；'))+'</td>'+
          '<td>'+esc(c.expected)+'</td><td>'+esc(c.actual)+'</td>'+
          '<td><span class="tag '+(c.pass?'green':'red')+'">'+(c.pass?'通过':'未通过')+'</span></td>'+
          '<td>'+esc(c.note||'')+'</td></tr>';
      }).join('');
    }).join('')+'</tbody></table></div>';
  h+='<div class="notice warn" style="margin-top:12px"><div class="ni">!</div><div>测试未通过的规则<b>不进入本次发布清单</b>，其旧版规则继续生效；'+
     '测试方法由系统直接调用规则引擎执行，不接受人工填写的测试结果。</div></div>';
  return h;
}
/* diff 子 Tab：字段级 Diff + 发布清单 + 暂不发布清单 + 候选停用 */
function clpImpRulesDiffHtml(){
  var g=clpImpGates(),d=clpImpDraft(),m=clpImpManifest();
  if(!g||!d||!m)return '<div class="notice red"><div class="ni">!</div><div>'+esc(_clpImp.draftError||'草稿版本尚未生成。')+'</div></div>';
  var df=d.diffSummary||{};
  var h='<div style="font-size:12.5px;font-weight:650;margin:6px 0 7px">字段级差异（使用业务字段名，共 '+df.fieldDiffs.length+' 处）</div>';
  h+='<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px;max-height:260px;overflow:auto"><table class="tbl" style="min-width:1100px"><thead><tr>'+
    '<th style="width:110px">规则编号</th><th style="width:170px">业务字段</th><th style="width:140px">变化类型</th>'+
    '<th style="width:230px">变更前</th><th style="width:230px">变更后</th><th style="width:110px">影响计算</th></tr></thead><tbody>'+
    (df.fieldDiffs.length?df.fieldDiffs.map(function(f){
      return '<tr><td class="mono">'+esc(f.ruleId)+'</td><td><b>'+esc(f.label)+'</b></td>'+
        '<td>'+clpImpChangeTag(f.changeType)+'</td>'+
        '<td class="oel-old">'+esc(clpRuleDiffText(f.before))+'</td><td class="oel-new">'+esc(clpRuleDiffText(f.after))+'</td>'+
        '<td>'+(f.affectsExecution?'<span class="tag orange">需重新测试</span>':'<span class="tag grey">不影响</span>')+'</td></tr>';
    }).join(''):'<tr><td colspan="6" class="muted">无字段级差异</td></tr>')+'</tbody></table></div>';
  h+='<div class="notice grey" style="margin:10px 0"><div class="ni">§</div><div>规则名称、来源说明、法规公式描述等纯文本变化<b>不会</b>触发重新测试；'+
     '阈值、权重、方法映射、前置 / 例外条件、优先级、输出分类与 H 码变化<b>必须</b>重新测试。</div></div>';
  /* 发布清单 */
  h+='<div style="font-size:12.5px;font-weight:650;margin:12px 0 7px">发布清单（本次将发布 '+m.summary.publishable+' 条）</div>';
  h+='<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px"><table class="tbl"><thead><tr>'+
    '<th style="width:120px">规则编号</th><th style="width:250px">规则名称</th><th style="width:130px">变化类型</th>'+
    '<th style="width:110px">门禁结果</th><th>系统说明</th></tr></thead><tbody>'+
    (m.publishableRules.length?m.publishableRules.map(function(id){
      var e=g.entries.filter(function(x){return x.ruleId===id;})[0]||{};
      return '<tr><td class="mono">'+esc(id)+'</td><td><b>'+esc(clpImpRuleName(id))+'</b></td>'+
        '<td>'+clpImpChangeTag(e.changeType||'')+'</td><td>'+clpImpGateTag(e.gateStatus||'')+'</td>'+
        '<td>'+esc(e.testResult&&e.testResult.reused?('沿用上版（'+e.testResult.fromVersion+'）测试结果'):'本次执行测试并通过')+'</td></tr>';
    }).join(''):'<tr><td colspan="5" class="muted">本次没有可发布的规则</td></tr>')+'</tbody></table></div>';
  /* 暂不发布清单 */
  h+='<div style="font-size:12.5px;font-weight:650;margin:12px 0 7px">暂不发布清单（旧版继续生效 / 本次不入库，共 '+m.summary.deferred+' 条）</div>';
  h+='<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px"><table class="tbl"><thead><tr>'+
    '<th style="width:120px">规则编号</th><th style="width:250px">规则名称</th><th style="width:120px">门禁结果</th>'+
    '<th style="width:120px">引擎支持状态</th><th>处理方式</th></tr></thead><tbody>'+
    (m.deferredRules.length?m.deferredRules.map(function(x){
      var old=m.retainedOldRules.indexOf(x.ruleId)>=0;
      return '<tr class="cip-row-bad"><td class="mono">'+esc(x.ruleId)+'</td><td><b>'+esc(clpImpRuleName(x.ruleId))+'</b></td>'+
        '<td>'+clpImpGateTag(x.gateStatus)+'</td><td>'+clpImpSupportTag(x.engineSupport)+'</td>'+
        '<td>'+esc(x.reason||'')+'<div class="muted" style="font-size:11.5px">'+
        (old?'旧版规则继续生效，不因本次导入失效。':'本次不加入活动规则集，保存在延后清单。')+'</div></td></tr>';
    }).join(''):'<tr><td colspan="5" class="muted">无</td></tr>')+'</tbody></table></div>';
  /* 候选停用 */
  if(m.pendingDeactivationRules.length){
    h+='<div style="font-size:12.5px;font-weight:650;margin:12px 0 7px">候选停用规则（上传文件未收录 '+m.pendingDeactivationRules.length+' 条）</div>';
    h+='<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px"><table class="tbl"><thead><tr>'+
      '<th style="width:120px">规则编号</th><th style="width:300px">规则名称</th><th>当前状态</th></tr></thead><tbody>'+
      m.pendingDeactivationRules.map(function(id){
        return '<tr><td class="mono">'+esc(id)+'</td><td><b>'+esc(clpImpRuleName(id))+'</b></td>'+
          '<td>'+(m.deactivationConfirmed?'<span class="tag grey">已确认停用</span>':'<span class="tag orange">未停用，沿用旧版</span>')+
          '<div class="muted" style="font-size:11.5px">须在第 5 步统一确认；未确认时旧规则继续有效。</div></td></tr>';
      }).join('')+'</tbody></table></div>';
  }
  h+='<div class="notice warn" style="margin-top:12px"><div class="ni">!</div><div>系统<b>不判断</b>变更属于「更严格」还是「更宽松」，'+
     '也不自动生成受影响配方 / SDS 数量（单一事实源与物料关联尚未接通）。</div></div>';
  return h;
}
function clpImpToggleDeactivation(on){
  _clpImp.deactivationConfirmed=!!on;
  var v=clpImpDraft();
  if(v){v.deactivationConfirmed=!!on;clpImpManifest();}
  if(_clpImp.step===5)$('mBody').innerHTML=clpLImpHtml5();
}

function clpImpTestHtml(){
  if(clpImpIsRules())return clpImpRulesTestHtml();
  var M=clpImpMod(),s=clpImpTestStat();
  var h='<div class="stat-row">'+
    '<div class="stat" style="border-color:var(--green-b);background:var(--green-bg)"><b style="color:var(--green)">'+s.pass+'</b><span>测试通过</span></div>'+
    '<div class="stat" style="border-color:var(--red-b,#f3c6c6);background:var(--red-bg,#fdecec)"><b style="color:var(--red,#c0392b)">'+s.fail+'</b><span>测试未通过</span></div>'+
    '<div class="stat"><b>'+s.total+'</b><span>测试用例合计</span></div>'+
    '<div class="stat"><b>'+(M.excluded||[]).length+'</b><span>本次排除规则</span></div></div>';
  h+='<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px;max-height:300px;overflow:auto"><table class="tbl" style="min-width:1200px"><thead><tr>'+
    '<th style="width:110px">测试用例</th><th style="width:210px">测试组分 / 浓度</th><th style="width:90px">使用规则</th>'+
    '<th style="width:300px">计算过程</th><th style="width:170px">预期分类</th><th style="width:150px">实际分类</th><th style="width:90px">测试结果</th></tr></thead><tbody>'+
    (M.tests||[]).map(function(t){
      var ok=t.res==='通过';
      return '<tr'+(ok?'':' class="cip-row-bad"')+'><td><b>'+esc(t.name)+'</b></td><td>'+esc(t.conc)+'</td><td class="mono">'+esc(t.rule)+'</td>'+
        '<td class="mono" style="font-size:11.5px">'+esc(t.calc)+'</td><td>'+esc(t.expect)+'</td><td>'+esc(t.actual)+'</td>'+
        '<td><span class="tag '+(ok?'green':'red')+'">'+esc(t.res)+'</span></td></tr>';
    }).join('')+'</tbody></table></div>';
  h+='<div class="notice warn" style="margin-top:12px"><div class="ni">!</div><div>'+clpImpMd(M.testNote)+
     (M.excluded&&M.excluded.length?(' 本次排除：<b class="mono">'+esc(M.excluded.join(' / '))+'</b>，不计入发布数量。'):'')+'</div></div>';
  return h;
}
function clpImpDiffHtml(){
  if(clpImpIsRules())return clpImpRulesDiffHtml();
  if(_clpImp.mod==='vi'&&_clpImp.viDraft){
    var diff=clpViDraftDiff(_clpImp.viDraft);
    return '<div class="stat-row"><div class="stat"><b>'+diff.add+'</b><span>新增物质</span></div><div class="stat"><b>'+diff.mod+'</b><span>字段修改</span></div><div class="stat"><b>'+diff.del+'</b><span>废止物质</span></div></div>'+
      '<div class="notice grey">以上差异由当前 Annex VI 数据集与演示结构化草稿实时比较；未解析真实 XLSX。</div>'+
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>类型</th><th>Index No.</th><th>物质</th><th>字段</th><th>变更前</th><th>变更后</th></tr></thead><tbody>'+
      diff.items.map(function(x){return '<tr><td>'+esc(x.tp)+'</td><td>'+esc(x.k)+'</td><td>'+esc(x.n)+'</td><td>'+esc(x.field||'—')+'</td><td>'+esc(x.a)+'</td><td>'+esc(x.b)+'</td></tr>';}).join('')+'</tbody></table></div>';
  }
  var M=clpImpMod(),c=clpImpPublishCount();
  var h='<div class="stat-row">'+
    '<div class="stat" style="border-color:var(--green-b);background:var(--green-b)"><b style="color:var(--green)">'+c.add+'</b><span>新增'+(M.key==='rules'?'规则（已扣除排除项）':'')+'</span></div>'+
    '<div class="stat" style="border-color:var(--orange-b);background:var(--orange-bg)"><b style="color:var(--orange)">'+c.mod+'</b><span>修改</span></div>'+
    '<div class="stat"><b>'+c.del+'</b><span>废止</span></div>'+
    '<div class="stat"><b>'+M.diffs.add+' / '+M.diffs.mod+' / '+M.diffs.del+'</b><span>原文件差异（新增 / 修改 / 废止）</span></div></div>';
  h+='<div style="font-size:12.5px;font-weight:650;margin:6px 0 7px">变更类型覆盖面：'+M.diffTypes.map(function(x){return '<span class="tag grey" style="margin-right:4px">'+esc(x)+'</span>';}).join('')+'</div>';
  h+='<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px;max-height:300px;overflow:auto"><table class="tbl" style="min-width:1200px"><thead><tr>'+
    '<th style="width:190px">变更类型</th><th style="width:150px">'+(M.key==='vi'?'Index No.':'编号')+'</th><th style="width:220px">名称</th>'+
    '<th style="width:230px">变更前</th><th style="width:260px">变更后</th><th>说明</th></tr></thead><tbody>'+
    M.items.map(function(it){
      var cls=(it.tp.indexOf('新增')>=0||it.tp==='新增代码')?'green':((it.tp.indexOf('删除')>=0||it.tp.indexOf('废止')>=0)?'grey':'orange');
      return '<tr><td><span class="tag '+cls+'">'+esc(it.tp)+'</span></td><td class="mono">'+esc(it.k)+'</td><td><b>'+esc(it.n)+'</b></td>'+
        '<td class="oel-old">'+esc(it.a)+'</td><td class="oel-new">'+esc(it.b)+'</td><td>'+clpImpMd(it.note)+'</td></tr>';
    }).join('')+'</tbody></table></div>';
  h+='<div class="notice warn" style="margin-top:12px"><div class="ni">!</div><div>预览内容尚未入库，<b>必须经人工逐条核对确认后</b>方可发布生效。系统<b>不判断</b>变更属于「更严格」还是「更宽松」，也不自动判断受影响范围。</div></div>';
  return h;
}

/* ---------- 9. 第 5 步：审核发布 ---------- */
/* Annex I：单一法规专员审核 —— 只有一次审核发布动作，没有第二审核人 */
function clpLImpHtml5Rules(){
  var M=clpImpMod(),d=clpImpDraft(),g=clpImpGates(),m=clpImpManifest();
  if(!d||!g||!m)return clpLMini(5)+
    '<div class="notice red" style="margin-top:12px"><div class="ni">!</div><div>'+
    esc(_clpImp.draftError||'草稿版本尚未生成，请返回第 3 步重新上传结构化规则表。')+'</div></div>';
  var s=m.summary,today=clpSystemToday();
  var future=!!(d.effectiveFrom&&d.effectiveFrom>today);
  function ids(arr){return arr.length?arr.map(function(x){return '<span class="tag grey mono" style="margin-right:4px">'+esc(x)+'</span>';}).join(''):'<span class="muted">无</span>';}
  var h=clpLMini(5)+
    '<dl class="desc-list" style="grid-template-columns:130px 1fr 130px 1fr">'+
    '<dt>导入模块</dt><dd><b>'+esc(M.label)+'</b></dd><dt>版本号</dt><dd class="mono">'+esc(d.version)+'</dd>'+
    '<dt>来源文件</dt><dd>'+esc(d.source.sourceFile||_clpImp.file||M.demo)+'</dd>'+
    '<dt>官方来源</dt><dd>'+esc(d.source.regulation)+' · '+esc(d.source.annex)+'</dd>'+
    '<dt>生效日期</dt><dd>'+esc(d.effectiveFrom)+' '+(future?'<span class="tag blue">待生效</span>':'<span class="tag green">已生效</span>')+'</dd>'+
    '<dt>数据截止日期</dt><dd>'+esc(d.cutoff||'—')+'</dd>'+
    '<dt>可发布规则</dt><dd><b>'+s.publishable+'</b> 条</dd>'+
    '<dt>未变化沿用</dt><dd><b>'+s.unchanged+'</b> 条</dd>'+
    '<dt>旧版继续生效</dt><dd>'+ids(m.retainedOldRules)+'</dd>'+
    '<dt>本次不发布</dt><dd>'+ids(m.deferredRules.map(function(x){return x.ruleId;}))+'</dd>'+
    '<dt>候选停用</dt><dd style="grid-column:span 3">'+ids(m.pendingDeactivationRules)+
      (m.pendingDeactivationRules.length?'<div class="muted" style="font-size:11.5px">未勾选确认时，这些规则<b>不停用</b>，旧版继续有效。</div>':'')+'</dd>'+
    '</dl>';
  if(future)h+='<div class="notice info" style="margin-top:10px"><div class="ni">i</div><div>生效日期（'+esc(d.effectiveFrom)+
    '）晚于当前日期（'+esc(today)+'），发布后版本状态为<b>待生效</b>，当前活动规则版本<b>不改变</b>，也不会影响现有 SDS 结论。</div></div>';
  h+='<div class="form-grid" style="margin-top:12px">'+
    '<div class="field"><label class="req">审核人（法规专员）</label><input class="ctrl" id="cipAuditor" value="'+esc(CLP_TOP.owner)+'"></div>'+
    '<div class="field"><label>审核日期</label><input class="ctrl" id="cipAuditDate" value="'+esc(clpImpNow())+'"></div>'+
    '<div class="field span2"><label>审核意见</label><input class="ctrl" id="cipNote5" value="已对照原文核对发布清单、参数变化与停用项，同意发布"></div>'+
    '</div>'+
    '<div class="field" style="margin-top:10px"><label class="req">审核确认（单次确认，不另设审核层级）</label>'+
      '<label class="inline-chk" style="display:flex;margin:6px 0"><input type="checkbox" class="chk" id="cipDecl"> '+esc(CLP_REVIEW_DECLARATION)+'</label>'+
      (m.pendingDeactivationRules.length?'<label class="inline-chk" style="display:flex;margin:6px 0"><input type="checkbox" class="chk" id="cipDeact"'+
        (_clpImp.deactivationConfirmed?' checked':'')+' onchange="clpImpToggleDeactivation(this.checked)"> 我已确认本次停用的 '+m.pendingDeactivationRules.length+' 条规则（不勾选则旧规则继续有效）</label>':'')+
    '</div>'+
    '<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div>发布后保存完整规则快照、方法版本快照、差异、测试结果、发布清单与审核人时间；'+
    '<b>已发布版本不可再编辑</b>，再次修改须复制为新草稿版本。</div></div>';
  return h;
}
function clpImpPublishRules(){
  var d=clpImpDraft();
  if(!d){toast(_clpImp.draftError||'草稿版本尚未生成，请返回第 3 步重新上传','warn');return;}
  var m=clpImpManifest()||{summary:{}};
  var decl=$('cipDecl'),by=$('cipAuditor'),note=$('cipNote5');
  var res=clpRuleVersionPublish(d,{
    reviewedBy:by?by.value.trim():'',
    reviewedAt:clpImpNow(),
    declarationAccepted:!!(decl&&decl.checked),
    reviewNote:note?note.value.trim():''
  });
  if(!res.ok){toast(res.errors[0]||'发布未通过发布门禁','warn');return;}
  var v=res.version,man=res.manifest;
  if(v.status==='已生效'){
    var mod=CLP_MODULES.rules;
    mod.ver=v.version;mod.eff=v.effectiveFrom;mod.cutoff=v.cutoff;mod.status='已生效';
    CLP_TOP.lastUpdate=clpImpNow();CLP_TOP.cutoff=v.cutoff;
  }
  CLP_CHANGES.unshift({mod:'rules',tp:'新增',
    content:v.version+' 导入（Annex I 分类规则）：发布 '+man.summary.publishable+' 条 / 未变化沿用 '+man.summary.unchanged+
      ' 条 / 旧版继续生效 '+man.summary.retained+' 条 / 本次不发布 '+man.summary.deferred+' 条'+
      (man.summary.deactivated?(' / 停用 '+man.summary.deactivated+' 条'):''),
    reason:'法规专员整理稿导入 · 审核通过并发布（审核人 '+v.reviewedBy+'）',
    eff:v.effectiveFrom,by:v.reviewedBy,subs:man.summary.publishable,recipes:'—',sds:'—'});
  closeModal();
  clpLGoTab('rules');
  toast(v.status==='已生效'
    ? ('已发布并生效：'+v.version+'（发布 '+man.summary.publishable+' 条，'+man.summary.deferred+' 条暂不发布）')
    : ('已发布，状态待生效：'+v.version+'（'+v.effectiveFrom+' 生效，当前活动版本不变）'),'ok');
}
function clpLImpHtml5(){
  if(clpImpIsRules())return clpLImpHtml5Rules();
  var M=clpImpMod(),c=clpImpPublishCount(),s=clpImpTestStat();
  var chkSum='阻断 '+clpImpSum('block')+' 项 · 告警 '+clpImpSum('warn')+' 项 · 提示 '+clpImpSum('info')+' 项';
  var testRow=M.tests?('<dt>测试结果</dt><dd><span class="tag green">通过 '+s.pass+' 例</span> <span class="tag red" style="margin-left:6px">未通过 '+s.fail+' 例</span>'+
    ((M.excluded||[]).length?'<span class="muted" style="margin-left:8px">已排除：'+esc(M.excluded.join(' / '))+'（不计入发布）</span>':'')+'</dd>'):'';
  return clpLMini(5)+
    '<dl class="desc-list" style="grid-template-columns:130px 1fr 130px 1fr">'+
    '<dt>导入模块</dt><dd><b>'+esc(M.label)+'</b></dd><dt>版本号</dt><dd class="mono">'+esc(_clpImp.ver||M.ver)+'</dd>'+
    '<dt>来源文件</dt><dd>'+esc(_clpImp.file||M.demo)+'</dd><dt>原始法规附件</dt><dd>'+esc(_clpImp.origFile||'（未附）')+'</dd>'+
    '<dt>生效日期</dt><dd>'+esc(_clpImp.eff||M.eff)+'</dd><dt>数据截止日期</dt><dd>'+esc(_clpImp.cut||M.cut)+'</dd>'+
    '<dt>新增数量</dt><dd><b>'+c.add+'</b>'+(M.key==='rules'&&(M.excluded||[]).length?'<span class="muted" style="font-size:11.5px">（已扣除排除项）</span>':'')+'</dd>'+
    '<dt>修改数量</dt><dd><b>'+c.mod+'</b></dd>'+
    '<dt>废止数量</dt><dd><b>'+c.del+'</b></dd><dt>校验结果</dt><dd>'+esc(chkSum)+'</dd>'+
    testRow+
    '<dt>发布落点</dt><dd style="grid-column:span 3">'+clpImpMd(M.landed)+'；并在「版本变更与影响」生成变更记录（来源模块 = '+esc(clpLModName(M.key))+'）</dd>'+
    '</dl>'+
    '<div class="form-grid" style="margin-top:12px">'+
    '<div class="field"><label class="req">审核人</label><input class="ctrl" id="cipAuditor" value="'+esc(CLP_TOP.owner)+'"></div>'+
    '<div class="field"><label>审核意见</label><input class="ctrl" id="cipOpinion" value="已对照原文抽样复核，同意发布"></div>'+
    '</div>'+
    '<div class="field" style="margin-top:10px"><label class="req">人工确认（三项均须勾选）</label>'+
      '<label class="inline-chk" style="display:flex;margin:6px 0"><input type="checkbox" class="chk" id="cipOk1"> 本次导入内容已对照法规原文逐条核对</label>'+
      '<label class="inline-chk" style="display:flex;margin:6px 0"><input type="checkbox" class="chk" id="cipOk2"> 需要研发实现 / 需要配置参数的规则已登记并知会研发</label>'+
      '<label class="inline-chk" style="display:flex;margin:6px 0"><input type="checkbox" class="chk" id="cipOk3"> 本次废止条目已确认不影响在用标签与在售产品</label>'+
    '</div>'+
    '<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div>发布后将更新 <b>'+esc(M.label)+'</b> 的模块版本号 / 生效日期 / 数据截止日期，数据落入对应 Tab，并生成变更记录；<b>官方原始文件与结构化导入文件均保留</b>，维护人 / 核对人 / 审核人与修改记录一并留痕。</div></div>';
}

/* ---------- 10. 发布落库 ---------- */
function clpLImpPublish(){
  var M=clpImpMod();
  if(clpImpIsRules()){clpImpPublishRules();return;}
  if(!$('cipOk1').checked||!$('cipOk2').checked||!$('cipOk3').checked){toast('请先勾选全部三项人工确认','warn');return;}
  if(clpImpBlkN()>0){toast('仍有 '+clpImpSum('block')+' 处阻断问题未修正，无法发布','warn');return;}
  var auditor=($('cipAuditor')&&$('cipAuditor').value.trim())||CLP_TOP.owner;
  var opinion=($('cipOpinion')&&$('cipOpinion').value.trim())||'同意发布';
  var ver=_clpImp.ver||M.ver,eff=_clpImp.eff||M.eff,cut=_clpImp.cut||M.cut;
  var c=clpImpPublishCount();

  if(M.key==='vi'){
    if(!_clpImp.viDraft){toast('请先上传结构化演示数据','warn');return;}
    var dataset;
    try{dataset=clpViDatasetPublish(_clpImp.viDraft,{reviewer:auditor,opinion:opinion});}
    catch(e){toast(String(e.message||e),'warn');return;}
    CLP_CHANGES.unshift({mod:'vi',tp:'新增',content:dataset.version+' 演示结构化数据发布：新增 '+c.add+' 条 / 字段修改 '+c.mod+' 处 / 废止 '+c.del+' 条',
      reason:'法规专员对照来源核对并发布（'+auditor+'）',eff:dataset.effectiveFrom,by:auditor,subs:c.add,recipes:'—',sds:'—'});
    closeModal();clpLGoTab('vi');toast(dataset.status==='待生效'?'已发布，待 '+dataset.effectiveFrom+' 生效':'新数据集已发布生效','ok');return;
  }

  /* ① 更新对应 Annex 模块的版本信息 */
  var mod=CLP_MODULES[M.key];
  if(mod){mod.ver=ver;mod.eff=eff;mod.cutoff=cut;mod.status='已生效';}
  CLP_TOP.lastUpdate=clpImpNow();
  CLP_TOP.cutoff=cut;

  /* ② 数据落入对应 Tab */
  if(M.key==='rules'){
    /* 规则以「规则编号」为准做 upsert：库中已存在同编号草稿时更新其状态与版本，
       不存在时才新增 —— 避免同一编号在规则表中出现两行。 */
    var hit=null;
    CLP_RULES.forEach(function(r){if(r.id==='CLP-R-0007')hit=r;});
    var draft={name:'桥接原则（Bridging）—相似混合物分类沿用规则',cat:'分类与标签一般原则',target:'混合物',
      gcl:'—',add:'否—逐案评估',ref:'Annex I，Part 1，1.5（桥接原则）',ver:ver,status:'已发布',
      /* 支持状态由计算方法注册表实时派生，不写死；BRIDGE 实际为 not_implemented → 需要研发实现 */
      method:'CLP-M-BRIDGE',engine:clpRuleEngineStatusText({id:'CLP-R-0007',method:'CLP-M-BRIDGE'}),test:'通过',checker:auditor,checkDate:clpImpNow().slice(0,10),h:'',
      det:{inputs:'相似混合物（稀释 / 浓度变化 / 同族组分替换）的已有分类结论与组分对照表',cond:'混合物由已分类混合物经稀释、浓度调整或同族组分替换得到，且危害类别不变时触发',formula:'按桥接场景逐案调用（不适用统一公式）：桥接表与判定参数需在规则引擎中配置后启用',except:'桥接不得用于致癌 / 生殖毒性 / 致突变等无阈值危害；桥接结论须由法规专员确认并留痕',prio:'低（3）——在常规规则之后应用',output:'沿用被桥接混合物的分类结论',label:'以沿用分类对应的 H 码与标签结果为准',src:'Regulation (EC) No 1272/2008，Annex I，Part 1，第 1.5 条（桥接原则）'}};
    if(hit){for(var k in draft){if(draft.hasOwnProperty(k))hit[k]=draft[k];}}
    else{draft.id=clpNextRuleId();CLP_RULES.push(draft);}
  }else{
    CLP_LABELS.push({tp:'H 码',isCombo:'否',code:'H360Df',text:'可能对生育能力或胎儿造成伤害',lang:'中文（zh）',
      picto:'GHS08',signal:'危险',combo:'组件码：无（单条码）',appliesTo:'生殖毒性 1A / 1B（含对哺乳期儿童的影响）',
      st:'新增',ver:ver,src:'Annex III（H 码表）',eff:eff});
  }

  /* ③ 版本变更与影响：新增变更记录（带来源模块） */
  CLP_CHANGES.unshift({mod:M.key,tp:'新增',
    content:ver+' 导入（'+M.label+'）：新增 '+c.add+' 条 / 修改 '+c.mod+' 条 / 废止 '+c.del+' 条'+
      ((M.excluded||[]).length?('；排除 '+M.excluded.length+' 条（需技术处理或规则测试未通过）'):''),
    reason:'法规专员整理稿导入 · 人工审核通过（审核人 '+auditor+'；'+opinion+'）',
    eff:eff,by:auditor,subs:c.add,recipes:'—',sds:'—'});

  closeModal();
  clpLGoTab(M.key);
  toast('新版本已发布（演示）：'+M.label+' → '+ver+'；变更记录已生成于「版本变更与影响」','ok');
}

/* ---------- 11. 影响范围（示例数据，标注明确） ---------- */
function clpLImpImpact(){
  var M=clpImpMod();
  openModal({title:'影响范围（示例） · '+M.label,width:800,cls:'sds-scope clp-page',
    body:'<div class="notice warn" style="margin-bottom:12px"><div class="ni">!</div><div><b>影响配方 / SDS 数量为示例数据</b>（原型阶段），不代表系统已具备影响分析能力；正式版将基于「法规条目 ↔ 组分 ↔ 已发布 SDS」关联关系计算。</div></div>'+
      '<div class="stat-row"><div class="stat"><b>'+M.diffs.add+'</b><span>影响物质 / 条目（本次导入差异）</span></div>'+
      '<div class="stat"><b>3 <span class="tag orange" style="font-size:10.5px">示例</span></b><span>影响配方</span></div>'+
      '<div class="stat"><b>2 <span class="tag orange" style="font-size:10.5px">示例</span></b><span>影响 SDS</span></div></div>',
    footer:'<button class="btn primary" onclick="clpImpRestore()">返回向导</button>'});
}

/* ---------- 12. 轻量 Markdown（**加粗** → <b>，其余转义） ---------- */
function clpImpMd(s){
  if(s==null)return '';
  return esc(String(s)).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
}
