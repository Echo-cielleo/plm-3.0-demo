/* ==================================================================
   [23z7] REACH 法规库 · 统一页面（Tab 化清单管理，2026-09-18 第二十九轮）
   ------------------------------------------------------------------
   需求口径（Cayla 2026-09-18）：
   · law:reach 由「REACH / RoHS 分库维护页」升级为统一 REACH 页面：
     顶部法规主信息（与 CLP 法规库页同字段结构）+ 6 个 Tab
   · Tab1 SDS 编制要求（16 章结构与字段要求；三条法规依据分清：
     Article 31 决定「何时必须提供 SDS」，Annex II（经 (EU) 2020/878 修订）
     决定 16 章结构与内容，CLP 提供分类与标签要素）
   · Tab2 SVHC 候选清单 · Tab3 Annex XIV 授权清单 ·
     Tab4 Annex XVII 限制清单（非 CAS 黑名单，含适用对象/限制类型/用途/
     浓度阈值可为空/生效日期/豁免条件）· Tab5 Annex XIII PBT/vPvB 判定规则卡片 ·
     Tab6 版本变更与影响（监控为「规划能力」，影响数量显式标示例）
   · 每个 Tab 顶部显示自己的数据版本 / 生效日期 / 来源文件 / 审核状态
   · 跳转链：各 Tab → 法规统一查询（按 lawKey 过滤）
   · 导入新版本走静态演示向导（与 CLP 页同一套五步）
   · RoHS 限用物质已拆分至 受限物质管理（23z8），C&L Inventory 移至
     外部参考数据菜单（23y 继续维护 law:cl），均不并入本页
   实现约定：本分片接管 law:reach 注册（23y 的旧注册已删，非覆盖关系）；
   抽屉复用 .exp-ai-mask / .exp-ai-panel 既有样式，补 .law-strip 信息条 CSS。
   ================================================================== */

/* ---------- 1. 数据 ---------- */
var REACH_TOP={
  name:'REACH Regulation（化学品注册、评估、授权和限制法规）',
  code:'Regulation (EC) No 1907/2006',
  market:'欧盟',
  status:'已发布',
  ver:'2026 合并文本（Consolidated version，含 2026-08 修订）',
  source:'EUR-Lex',
  publish:'已发布 · v2026.08',
  lastCheck:'2026-08-01',
  lastReview:'2026-08-05',
  auditor:'质管-熊倩',
  cutoff:'2026-08-01',
  owner:'质管-熊倩',
  cycle:'SVHC 每年 1 月 / 7 月各一批；Annex XIV、Annex XVII 随官方修订更新',
  funcs:['SDS 编制','第 15 章法规判断','受限物质查询'],
  note:'REACH 管注册、授权与限制（能不能用、要不要申报）；CLP 管分类与标签。本页面仅涉及 REACH。',
  scope:'<b>来源类型与维护位置：</b>Annex II 结构与内容要求（本页 Tab 1）· SVHC 候选清单（本页 Tab 2）· Annex XIV 授权清单（本页 Tab 3）· Annex XVII 限制清单（本页 Tab 4）· Annex XIII PBT/vPvB 判定规则（本页 Tab 5）；<b>RoHS 限用物质</b>已拆分至「受限物质管理 · RoHS 限用物质」，<b>C&amp;L Inventory</b> 属 ECHA 企业申报汇总、移至「外部参考数据」独立菜单——两者均<b>不并入本页</b>。'
};

/* 各 Tab 模块自己的版本信息（不同清单更新与生效时间并不同步） */
var REACH_MODULES={
  sds:{key:'sds',label:'SDS 编制要求',ver:'Annex II · (EU) 2020/878 版',eff:'2021-01-01',status:'已审核',cutoff:'2026-08-01',
    owner:'质管-熊倩',src:'法规原文（Annex II 结构与内容要求，人工整理成字段要求）',srcTag:'法规原文 · 人工整理',srcFile:'annex_ii_2020_878_structure.json',due:'2027-01-31'},
  svhc:{key:'svhc',label:'SVHC 候选清单',ver:'第 33 批',eff:'2026-06-25',status:'已生效',cutoff:'2026-06-26',
    owner:'质管-熊倩',src:'官方候选清单（ECHA 发布，人工导入）',srcTag:'官方清单 · 人工导入',srcFile:'svhc_candidate_list_33.xlsx',due:'2027-01-31'},
  xiv:{key:'xiv',label:'Annex XIV 授权清单',ver:'V2026.1',eff:'2026-05-20',status:'待复核',cutoff:'2026-05-22',
    owner:'质管-熊倩',src:'官方法规清单（强制采用）',srcTag:'官方清单 · 强制采用',srcFile:'annex_xiv_v2026_1.xlsx',due:'2026-10-31'},
  xvii:{key:'xvii',label:'Annex XVII 限制清单',ver:'V2026.2',eff:'2026-06-01',status:'已生效',cutoff:'2026-06-03',
    owner:'质管-熊倩',src:'官方法规清单（强制采用）',srcTag:'官方清单 · 强制采用',srcFile:'annex_xvii_v2026_2.xlsx',due:'2027-03-31'},
  pbt:{key:'pbt',label:'Annex XIII PBT/vPvB 判定规则',ver:'R2026.1',eff:'2026-06-01',status:'已审核',cutoff:'2026-06-20',
    owner:'质管-熊倩',src:'人工审核规则（由法规专员依 Annex XIII 整理成型）',srcTag:'人工审核规则',srcFile:'annex_xiii_rules_r2026_1.json',due:'2026-12-31'}
};

/* Tab1：SDS 编制要求（16 章结构与字段要求；三条法规依据分清） */
var REACH_SDS_CH=[
  {no:'1',name:'化学品及企业标识',req:'必填',src:'产品主数据 + 企业主数据',mode:'自动带出 + 人工填写',ref:'Annex II · 第 1 节',status:'已配置',
   det:{sub:'1.1 产品标识符 · 1.2 物质或混合物的相关确定用途（推荐用途与不推荐用途）· 1.3 供应商详细信息 · 1.4 应急电话号码',
     fields:'产品名称 / 产品编码 / UFI；推荐用途与限制用途；供应商名称、地址、电话、邮箱；应急电话（含国家代码）',
     sys:'产品管理 · 产品基础信息（prod:detail）＋ 文档管理 · 企业信息',tpl:'SDS-TPL-2026.1'}},
  {no:'2',name:'危险性概述',req:'必填',src:'CLP 分类结果（法规库）',mode:'规则计算',ref:'Annex II · 第 2 节（分类与标签要素取自 CLP）',status:'已配置',
   det:{sub:'2.1 物质或混合物的分类 · 2.2 标签要素（象形图 / 信号词 / 危险说明 / 防范说明）· 2.3 其他危害',
     fields:'GHS 分类汇总（危害类别 + 类别）→ 自动生成 H 码、信号词、象形图、P 码组合',
     sys:'合规管理 · CLP 法规库（law:clp）＋ 组分与合规 · GHS 与受限属性（bd:ghs）',tpl:'SDS-TPL-2026.1'}},
  {no:'3',name:'成分/组成信息',req:'条件必填',src:'BOM 配方 + 组分基础信息',mode:'自动带出',ref:'Annex II · 第 3 节',status:'已配置',
   det:{sub:'3.1 物质 · 3.2 混合物（危险组分名称、识别号、浓度或浓度范围）',
     fields:'组分名称 / CAS / EC / 浓度或浓度范围 / 分类；条件：混合物须列出超限值的危险组分，无危险组分的混合物注明「不含危险组分」',
     sys:'基础数据 · 组分基础信息（bd:comp）＋ 产品基础信息配方区',tpl:'SDS-TPL-2026.1'}},
  {no:'4',name:'急救措施',req:'必填',src:'危害类别 → 建议措施库',mode:'建议选择',ref:'Annex II · 第 4 节',status:'已配置',
   det:{sub:'4.1 一般说明 · 4.2 吸入后 · 4.3 皮肤接触后 · 4.4 眼睛接触后 · 4.5 食入后 · 4.6 自救与急救人员需特别注意',
     fields:'按危害类别从建议措施库匹配四条接触路径的处置文案；可人工调整',
     sys:'内置库（建议措施库）＋ SDS 向导第 4 步',tpl:'SDS-TPL-2026.1'}},
  {no:'5',name:'消防措施',req:'必填',src:'危害类别（易燃 / 氧化性）+ 理化性质',mode:'建议选择',ref:'Annex II · 第 5 节',status:'已配置',
   det:{sub:'5.1 灭火介质 · 5.2 物质或混合物引起的特别危害 · 5.3 对消防人员的建议',
     fields:'适用灭火剂 / 禁用灭火剂；燃烧产物；消防人员防护与处置注意',
     sys:'内置库 ＋ 理化性质配置（bd:phys-lib）',tpl:'SDS-TPL-2026.1'}},
  {no:'6',name:'泄漏应急处理',req:'必填',src:'危害类别 + 物态',mode:'建议选择',ref:'Annex II · 第 6 节',status:'已配置',
   det:{sub:'6.1 人员防护措施、防护装备和应急处置程序 · 6.2 环境保护措施 · 6.3 泄漏化学品的收容、清除方法及所使用的处置材料 · 6.4 参考其他部分',
     fields:'按物态（液体 / 固体 / 粉体）与危害类别匹配处置程序与收容材料',
     sys:'内置库 ＋ SDS 向导第 6 步',tpl:'SDS-TPL-2026.1'}},
  {no:'7',name:'操作处置与储存',req:'必填',src:'危害类别 + 理化性质',mode:'建议选择',ref:'Annex II · 第 7 节',status:'已配置',
   det:{sub:'7.1 安全操作注意事项 · 7.2 安全储存的条件（含不相容物质）',
     fields:'操作通风 / 防静电 / 防尘要求；储存温度、避光、不相容物质清单',
     sys:'内置库 ＋ 理化性质配置',tpl:'SDS-TPL-2026.1'}},
  {no:'8',name:'接触控制和个体防护',req:'条件必填',src:'职业接触限值（OEL）+ 危害类别',mode:'规则计算',ref:'Annex II · 第 8 节（限值来源见 OEL 法规库）',status:'已配置',
   det:{sub:'8.1 控制参数（职业接触限值 OEL / DNEL / PNEC）· 8.2 工程控制 · 8.3 个体防护装备',
     fields:'条件：组分存在职业接触限值时必须给出限值数值与来源法规；PPE 按危害类别推荐手套 / 眼罩 / 呼吸防护',
     sys:'合规管理 · 职业接触限值（OEL）法规库（law:oel，按国家 / 数据集版本维护）＋ bd:ghs',tpl:'SDS-TPL-2026.1'}},
  {no:'9',name:'理化特性',req:'必填',src:'理化性质配置（指标库 / 类别模板）',mode:'自动带出',ref:'Annex II · 第 9 节',status:'已配置',
   det:{sub:'9.1 基本理化性质（外观、气味、pH、熔点 / 凝固点、沸点、闪点、蒸气压、密度、溶解度、分配系数、自燃温度、分解温度、黏度等）· 9.2 其他信息',
     fields:'取产品所属类别的理化指标模板 → 指标值 + 来源留痕（实测 / 文献 / 计算）',
     sys:'基础数据 · 理化性质配置（指标库 bd:phys-lib / 类别模板 bd:phys-tpl）',tpl:'SDS-TPL-2026.1'}},
  {no:'10',name:'稳定性和反应性',req:'必填',src:'理化性质 + 危害类别',mode:'建议选择',ref:'Annex II · 第 10 节',status:'已配置',
   det:{sub:'10.1 反应性 · 10.2 化学稳定性 · 10.3 危险反应的可能性 · 10.4 应避免的条件 · 10.5 不相容的材料 · 10.6 危险的分解产物',
     fields:'稳定性结论 + 危险反应 + 禁配物清单 + 分解产物',
     sys:'内置库 ＋ 理化性质配置',tpl:'SDS-TPL-2026.1'}},
  {no:'11',name:'毒理学信息',req:'必填',src:'CLP 分类 + 组分毒理数据',mode:'规则计算',ref:'Annex II · 第 11 节',status:'已配置',
   det:{sub:'11.1 急性毒性 · 11.2 皮肤腐蚀 / 刺激 · 11.3 严重眼损伤 / 刺激 · 11.4 呼吸道或皮肤致敏 · 11.5 生殖细胞致突变性 · 11.6 致癌性 · 11.7 生殖毒性 · 11.8 STOT 一次 / 重复接触 · 11.9 吸入危害',
     fields:'按危害路径输出分类、暴露途径、症状；ATE / SCL 等来自 CLP 附录 VI',
     sys:'合规管理 · CLP 法规库（law:clp）+ 组分基础信息',tpl:'SDS-TPL-2026.1'}},
  {no:'12',name:'生态学信息',req:'必填',src:'CLP 环境危害分类 + PBT / vPvB 判定',mode:'规则计算',ref:'Annex II · 第 12 节',status:'已配置',
   det:{sub:'12.1 毒性（水生急 / 慢性）· 12.2 持久性和降解性 · 12.3 生物累积潜力 · 12.4 土壤迁移性 · 12.5 PBT 和 vPvB 评估结果 · 12.6 内分泌干扰特性',
     fields:'水生毒性分类与 M 因子；PBT / vPvB 评估结论（判定依据见本页 Tab 5）',
     sys:'CLP 法规库 ＋ 本页 Tab 5 判定规则（law:reach）',tpl:'SDS-TPL-2026.1'}},
  {no:'13',name:'废弃处置',req:'必填',src:'危害类别 + 当地法规',mode:'建议选择',ref:'Annex II · 第 13 节',status:'已配置',
   det:{sub:'13.1 废物处理方法（含包装容器处置）· 13.2 相关法规',
     fields:'废物类别、处置方式、包装处置；引用当地及欧盟废弃法规',
     sys:'内置库 ＋ 国内危化品法规库（law:cn）关联',tpl:'SDS-TPL-2026.1'}},
  {no:'14',name:'运输信息',req:'条件必填',src:'运输法规库（UN TDG / IMDG / IATA）',mode:'规则计算',ref:'Annex II · 第 14 节（运输属独立法规体系）',status:'已配置',
   det:{sub:'14.1 UN 编号 · 14.2 UN 正式运输名称 · 14.3 运输危险类别 · 14.4 包装组 · 14.5 环境危害 · 14.6 用户特别注意事项 · 14.7 散装运输',
     fields:'按运输方式（公路 / 铁路 / 海运 / 空运）分别给出 UN 编号、类别、包装组；条件：不属危险货物时须注明「不受运输法规管制」',
     sys:'合规管理 · 运输法规库（law:trans，本期占位）',tpl:'SDS-TPL-2026.1'}},
  {no:'15',name:'法规信息',req:'必填',src:'各法规库命中结果',mode:'自动带出',ref:'Annex II · 第 15 节',status:'已配置',
   det:{sub:'15.1 针对物质或混合物的安全、健康和环境法规 · 15.2 化学品安全评估',
     fields:'自动汇总各组分的法规命中结论（CLP / REACH SVHC / Annex XIV / Annex XVII / RoHS / 国内危化品 / ZDHC MRSL）',
     sys:'法规统一查询（law:query）＋ 受限物质管理（subst:list）',tpl:'SDS-TPL-2026.1'}},
  {no:'16',name:'其他信息',req:'必填',src:'SDS 版本与修订记录',mode:'自动带出 + 人工填写',ref:'Annex II · 第 16 节',status:'已配置',
   det:{sub:'16.1 修订说明（与上一版相比变更的章节）· 16.2 缩略语与首字母缩写 · 16.3 关键文献与数据来源 · 16.4 培训建议',
     fields:'版本号、修订日期、变更章节清单；H / P 码全文；培训提示',
     sys:'文档管理 · SDS 版本记录（sds:list）',tpl:'SDS-TPL-2026.1'}}
];

/* Tab2：SVHC 候选清单（节选示例） */
var REACH_SVHC=[
  {name:'甲醛',cas:'50-00-0',ec:'200-001-8',listed:'2026-06-25',reason:'致癌性 1B',conc:'浓度 > 0.1%（w/w）触发信息传递与通报义务',ver:'第 33 批',src:'ECHA 候选清单',status:'已生效'},
  {name:'双酚 S',cas:'80-09-1',ec:'201-250-5',listed:'2026-06-25',reason:'内分泌干扰特性（人健康）',conc:'浓度 > 0.1%（w/w）',ver:'第 33 批',src:'ECHA 候选清单',status:'已生效'},
  {name:'三聚氰胺',cas:'108-78-1',ec:'203-615-4',listed:'2026-06-25',reason:'其他等同关注（人健康）',conc:'浓度 > 0.1%（w/w）',ver:'第 33 批',src:'ECHA 候选清单',status:'已生效'},
  {name:'短链氯化石蜡 SCCP',cas:'85535-84-8',ec:'287-476-5',listed:'2008-10-28',reason:'PBT / vPvB',conc:'浓度 > 0.1%（w/w）',ver:'第 1 批',src:'ECHA 候选清单',status:'已生效'},
  {name:'邻苯二甲酸二(2-乙基己基)酯 DEHP',cas:'117-81-7',ec:'204-211-0',listed:'2008-10-28',reason:'生殖毒性 1B',conc:'浓度 > 0.1%（w/w）',ver:'第 1 批',src:'ECHA 候选清单（同时列入 Annex XIV）',status:'已生效'},
  {name:'邻苯二甲酸二丁酯 DBP',cas:'84-74-2',ec:'201-557-4',listed:'2008-10-28',reason:'生殖毒性 1B',conc:'浓度 > 0.1%（w/w）',ver:'第 1 批',src:'ECHA 候选清单（同时列入 Annex XIV）',status:'已生效'},
  {name:'硼酸',cas:'10043-35-3',ec:'233-139-2',listed:'2010-06-18',reason:'生殖毒性 1B',conc:'浓度 > 0.1%（w/w）',ver:'第 3 批',src:'ECHA 候选清单',status:'已生效'},
  {name:'全氟辛酸 PFOA',cas:'335-67-1',ec:'206-397-9',listed:'2013-06-20',reason:'PBT',conc:'浓度 > 0.1%（w/w）',ver:'第 9 批',src:'ECHA 候选清单',status:'已生效'}
];

/* Tab3：Annex XIV 授权清单 */
var REACH_XIV=[
  {no:'1',name:'邻苯二甲酸二(2-乙基己基)酯 DEHP',ids:'117-81-7 / 204-211-0',reason:'生殖毒性 1B',apply:'2013-08-21',sunset:'2015-02-21',use:'增塑剂用途（部分企业已获授权，授权条件随条目公布）',status:'已列入 · 需授权'},
  {no:'2',name:'铬酸铅',ids:'7758-97-6 / 231-846-0',reason:'致癌 1B / 生殖毒性 1A',apply:'2017-11-04',sunset:'2019-05-04',use:'颜料与着色用途（豁免口径见官方条目）',status:'已列入 · 需授权'},
  {no:'3',name:'三氧化二砷',ids:'1327-53-3 / 215-481-4',reason:'致癌 1A',apply:'2017-11-30',sunset:'2019-05-31',use:'特种玻璃与电子材料用途',status:'已列入 · 需授权'},
  {no:'4',name:'重铬酸钠',ids:'10588-01-9 / 234-190-3',reason:'致癌 1B / 致突变 1B',apply:'2016-03-21',sunset:'2017-09-21',use:'表面处理与鞣制用途',status:'已列入 · 需授权'},
  {no:'5',name:'2-甲氧基乙醇',ids:'109-86-4 / 203-713-7',reason:'生殖毒性 1B',apply:'2018-07-06',sunset:'2020-01-06',use:'溶剂与涂饰助剂用途',status:'已列入 · 需授权'},
  {no:'6',name:'邻苯二甲酸二丁酯 DBP',ids:'84-74-2 / 201-557-4',reason:'生殖毒性 1B',apply:'2013-08-21',sunset:'2015-02-21',use:'增塑剂用途',status:'已列入 · 需授权'}
];

/* Tab4：Annex XVII 限制清单（非 CAS 黑名单：含适用对象 / 限制类型 / 用途 / 阈值可为空 / 豁免） */
var REACH_XVII=[
  {entry:'Entry 47',name:'六价铬化合物（Cr(VI)）',ids:'—（物质组，多种铬酸盐）',obj:'物品',type:'浓度限值',use:'与皮肤接触的皮革制品',thr:'Cr(VI) < 3 mg/kg（皮革干重）',eff:'2015-05-01',exempt:'不接触皮肤的皮革制品；工艺受控且 Cr(VI) 无法检出时按条款免于限制',sum:'对象为「与皮肤接触的皮革制品」，限值按皮革干重计；以物质组方式管控，不针对单一 CAS',ver:'V2026.2'},
  {entry:'Entry 77',name:'甲醛',ids:'50-00-0 / 200-001-8',obj:'物品与混合物',type:'浓度限值',obj2:'',use:'消费品（纺织品、皮革、木制品等）',thr:'分品类限值：纺织品与皮革 ≤ 75 mg/kg；木制品释量 ≤ 0.062 mg/m³',eff:'2026-08-06',exempt:'仅用于工业用途且不向公众暴露的制品不适用消费品限值',sum:'按材质分档设限，不是单一阈值；需按产品材质分别取值比对',ver:'V2026.2'},
  {entry:'Entry 51',name:'邻苯二甲酸酯类（DEHP / DBP / BBP / DIBP）',ids:'117-81-7 / 84-74-2 / 85-68-7 / 84-69-5',obj:'物品',type:'浓度限值',use:'塑化材料（PVC 等）中的增塑剂',thr:'单一或合计浓度 < 0.1%（w/w，按塑化材料计）',eff:'2020-07-07',exempt:'玩具与儿童护理用品由 Entry 51 / 52 及相关消费品法规另行管控',sum:'四种物质合并计算，取合计值判断，不能逐个单独比对',ver:'V2026.2'},
  {entry:'Entry 72',name:'偶氮染料（可裂解出 22 种芳香胺）',ids:'—（物质组，以芳香胺清单判定）',obj:'物品',type:'浓度限值',use:'纺织与皮革制品的染色与印花',thr:'芳香胺释放量 < 30 mg/kg',eff:'2005-09-01',exempt:'不接触皮肤或口腔的制品不适用',sum:'以「可裂解芳香胺释放量」判定，须按检测方法（还原裂解）结果比对',ver:'V2026.2'},
  {entry:'Entry 46a',name:'壬基酚与壬基酚聚氧乙烯醚（APEO）',ids:'—（物质组，以聚合度区分）',obj:'物质与混合物',type:'用途禁止 + 浓度限值',use:'纺织与皮革加工助剂（表面活性剂）',thr:'浓度 ≥ 0.01%（w/w）即不得投放市场',eff:'2016-01-04',exempt:'未标为 APEO 且浓度低于阈值的加工助剂不适用',sum:'既禁用途也设浓度门槛，需同时判断用途与含量',ver:'V2026.2'},
  {entry:'Entry 20',name:'有机锡化合物（TBT / DBT 等）',ids:'—（物质组，多种有机锡）',obj:'物品与混合物',type:'用途禁止 + 浓度限值',use:'催化剂、稳定剂、防污涂层',thr:'三丁基锡（TBT）化合物 < 0.1%（w/w，按锡计）',eff:'2003-07-01',exempt:'未列入条款用途的工业中间体不适用',sum:'按锡含量折算判定，不是按化合物质量计',ver:'V2026.2'},
  {entry:'Entry 28–30',name:'CMR 物质（1A / 1B 类）',ids:'—（按 CLP 分类判定，非固定清单）',obj:'物质与混合物',type:'用途禁止',use:'禁止向公众销售（零售渠道）',thr:'—（本条不设浓度阈值，只禁用途）',eff:'2009-06-01',exempt:'仅用于专业用途且配备适当防护的情形可豁免',sum:'典型「不设浓度阈值」的限制条目：判定依据是对象与用途，不是含量',ver:'V2026.2'},
  {entry:'Entry 48',name:'甲苯',ids:'108-88-3 / 203-625-9',obj:'物质与混合物',type:'浓度限值',use:'粘合剂、涂料等面向公众的消费品',thr:'制剂中 < 0.1%（w/w）',eff:'2008-12-01',exempt:'仅供工业用途、不向公众销售的制剂不适用',sum:'对象限于面向公众的制剂，工业渠道不适用',ver:'V2026.2'}
];

/* Tab5：Annex XIII PBT / vPvB 判定规则（人工整理成型的规则卡片；不做实际计算） */
var REACH_PBT=[
  {id:'P-01',name:'持久性（P）判定—半衰期法',target:'物质',input:'海水 / 淡水 / 沉积物中的降解半衰期（DT50），或已有降解性试验数据',
   cond:'海水 DT50 > 60 d；或淡水 DT50 > 40 d；或海洋沉积物 DT50 > 120 d；或淡水沉积物 DT50 > 120 d',out:'满足任一项即判为持久（P）',ref:'Annex XIII · 第 1.1 节（表 1 第一栏）',ver:'R2026.1',status:'已审核'},
  {id:'P-02',name:'持久性（P）判定—其他证据',target:'物质',input:'野外监测数据、模拟试验结论等非半衰期证据',
   cond:'其他证据（如野外长期监测）同样表明物质在环境中持久',out:'配合 P-01 使用，作为持久性的补充判定',ref:'Annex XIII · 第 1.1 节',ver:'R2026.1',status:'已审核'},
  {id:'B-01',name:'生物累积性（B）判定—BCF 法',target:'物质',input:'生物浓缩系数 BCF（鱼类试验优先）',
   cond:'BCF > 2000',out:'满足即判为生物累积（B）',ref:'Annex XIII · 第 1.2 节（表 1 第二栏）',ver:'R2026.1',status:'已审核'},
  {id:'B-02',name:'生物累积性（B）判定—log Kow 替代',target:'物质',input:'辛醇 / 水分配系数（log Kow）及无相反证据',
   cond:'log Kow > 4.5，且没有其他相反证据',out:'作为 B-01 替代证据判为生物累积（B）',ref:'Annex XIII · 第 1.2 节',ver:'R2026.1',status:'已审核'},
  {id:'T-01',name:'毒性（T）判定—长期 NOEC',target:'物质',input:'长期毒性试验的最低无可见效应浓度（NOEC）',
   cond:'长期 NOEC（鱼类 / 甲壳类 / 藻类）< 0.01 mg/L',out:'满足即判为有毒（T）',ref:'Annex XIII · 第 1.3 节',ver:'R2026.1',status:'已审核'},
  {id:'T-02',name:'毒性（T）判定—CMR / 内分泌干扰替代',target:'物质',input:'CLP 分类结果或内分泌干扰证据',
   cond:'物质被分类为 CMR 1A / 1B 类，或有证据表明具内分泌干扰特性',out:'作为 T-01 替代证据判为有毒（T）',ref:'Annex XIII · 第 1.3 节（配合 CLP 分类）',ver:'R2026.1',status:'已审核'},
  {id:'VP-01',name:'极高持久性（vP）判定',target:'物质',input:'海水 / 淡水 / 沉积物中的降解半衰期（DT50）',
   cond:'海水 DT50 > 60 d；或淡水 DT50 > 60 d；或沉积物 DT50 > 180 d',out:'满足任一项即判为极高持久（vP）',ref:'Annex XIII · 第 2 节（表 2）',ver:'R2026.1',status:'已审核'},
  {id:'VB-01',name:'极高生物累积性（vB）判定',target:'物质',input:'生物浓缩系数 BCF',
   cond:'BCF > 5000',out:'满足即判为极高生物累积（vB）',ref:'Annex XIII · 第 2 节（表 2）',ver:'R2026.1',status:'已审核'},
  {id:'C-01',name:'综合判定—PBT / vPvB 结论',target:'物质与混合物',input:'P / vP / B / vB / T 各单项判定结果（混合物按 ≥ 0.1% 组分归集）',
   cond:'P + B + T 全部满足 → PBT；vP + vB 满足 → vPvB',out:'输出 PBT / vPvB 结论，作为 SDS 第 12 节与 SVHC 识别依据',ref:'Annex XIII · 第 1 / 2 节综合',ver:'R2026.1',status:'已审核'}
];

/* Tab6：版本变更与影响（监测为规划能力；物质数量来自官方变更清单，配方 / SDS 数量为示例）
   监控来源与最近检查时间为规划口径；差异摘要与模板修改建议均为示例内容 */
var REACH_MON={
  src:'EUR-Lex / Cellar',
  lastCheck:'2026-08-01',
  mode:'人工巡检（未接入联网监控）'
};
var REACH_CHANGES=[
  {mod:'SVHC 候选清单',tp:'新增',content:'候选清单第 34 批：拟新增 3 项物质（2027-01 批）',
   diff:'新增 3 条物质条目（名称 / CAS / 列入原因 / 列入日期）',tpl:'无需改模板；SDS 第 15 章法规引用需重新取值',
   eff:'2027-01-15（预计）',status:'待审核',by:'质管-熊倩',subs:'待评估',recipes:'—',sds:'—'},
  {mod:'Annex XVII 限制清单',tp:'修改',content:'Entry 77 甲醛：纺织品与皮革限值口径细化',
   diff:'限值由单一阈值改为分品类口径（纺织与皮革 ≤ 75 mg/kg）',tpl:'SDS 第 15 章与受限物质比对口径需同步',
   eff:'2026-08-06',status:'已审核',by:'质管-熊倩',subs:2,recipes:'2',sds:'2'},
  {mod:'Annex XIV 授权清单',tp:'新增',content:'授权清单新增 5 项物质（含铬酸盐类衍生物）',
   diff:'新增 5 个条目及其最迟申请日期 / 日落日期',tpl:'无需改模板；命中组分需提示「需授权」',
   eff:'2026-11-01（预计）',status:'待审核',by:'质管-熊倩',subs:'待评估',recipes:'—',sds:'—'},
  {mod:'SDS 编制要求',tp:'修改',content:'Annex II 第 14 节运输信息：衔接 UN TDG 第 23 修订版表述',
   diff:'第 14 节 14.1~14.7 子项表述调整（按运输方式分别取数）',tpl:'SDS-TPL-2026.1 → 2026.2（仅第 14 章）',
   eff:'2026-09-30',status:'已审核',by:'质管-熊倩',subs:'—',recipes:'—',sds:'3'},
  {mod:'Annex XIII PBT/vPvB',tp:'修改',content:'vP 沉积物半衰期判定阈值复核（120 d → 180 d 表述统一）',
   diff:'VP-01 沉积物判定阈值表述与表 2 对齐',tpl:'无需改模板；判定规则版本升级为 R2026.2',
   eff:'2026-06-01',status:'已审核',by:'质管-熊倩',subs:'—',recipes:'—',sds:'—'}
];

/* ---------- 2. 模块证据灯与信息条 ---------- */
function rchLamp(m){
  if(!m.due)return '<span class="ev ev-none"><i></i>占位</span>';
  var d=daysTo(m.due);
  if(d<0)return '<span class="ev ev-due" title="复审到期：'+m.due+'（已超期）"><i></i>复审到期</span>';
  if(d<60||m.status==='待复核')return '<span class="ev ev-due" title="复审到期：'+m.due+'"><i></i>复审预警</span>';
  return '<span class="ev ev-green" title="复审到期：'+m.due+'"><i></i>有效</span>';
}
function rchStrip(m){
  return '<div class="law-strip">'+
    '<span class="it"><em>数据版本</em><b class="mono">'+esc(m.ver)+'</b></span>'+
    '<span class="it"><em>生效日期</em><b>'+esc(m.eff)+'</b></span>'+
    '<span class="it"><em>来源文件</em><b class="mono">'+esc(m.srcFile)+'</b></span>'+
    '<span class="it"><em>最近更新时间</em><b>'+esc(m.cutoff)+'</b></span>'+
    '<span class="it"><em>审核状态</em><b>'+esc(m.status)+' '+rchLamp(m)+'</b></span>'+
    '<span class="it"><em>维护责任人</em><b>'+esc(m.owner)+'</b></span>'+
    '<span class="it src"><em>数据来源类型</em><b>'+esc(m.src)+'</b></span>'+
    '</div>';
}

/* ---------- 3. 右侧详情抽屉（复用 exp-ai-mask / exp-ai-panel 样式） ---------- */
(function(){
  var mk=document.createElement('div');
  mk.id='rchDwMask';mk.className='exp-ai-mask';mk.style.display='none';
  mk.setAttribute('onclick','rchDrawerClose()');
  var p=document.createElement('div');
  p.id='rchDw';p.className='exp-ai-panel';
  p.setAttribute('onclick','event.stopPropagation()');
  mk.appendChild(p);
  document.body.appendChild(mk);
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&mk.style.display!=='none')rchDrawerClose();
  });
})();
function rchDrawer(title,body,foot){
  var mk=$('rchDwMask'),p=$('rchDw');if(!mk||!p)return;
  p.innerHTML='<div class="modal-hd"><h3>'+esc(title)+'</h3><button class="modal-x" onclick="rchDrawerClose()">✕</button></div>'+
    '<div class="modal-bd sds-scope law-page">'+body+'</div>'+
    (foot?'<div class="modal-ft">'+foot+'</div>':'');
  mk.style.display='flex';
}
function rchDrawerClose(){var mk=$('rchDwMask');if(mk)mk.style.display='none';}

/* ---------- 4. 页面骨架与 Tab 切换（顶部主信息不随 Tab 变化） ---------- */
var REACH_TABS=[
  {key:'sds',label:'SDS 编制要求'},
  {key:'svhc',label:'SVHC 候选清单'},
  {key:'xiv',label:'Annex XIV 授权清单'},
  {key:'xvii',label:'Annex XVII 限制清单'},
  {key:'pbt',label:'Annex XIII PBT/vPvB'},
  {key:'chg',label:'版本变更与影响'}
];
var _rchTab='sds';
var _rchF={sds:{kw:'',mode:''},svhc:{kw:'',reason:''},xiv:{kw:'',st:''},xvii:{kw:'',obj:'',type:''},pbt:{kw:'',target:''},chg:{kw:'',tp:''}};
var _rchP={sds:1,svhc:1,xiv:1,xvii:1,chg:1};

function rchTopLamp(){
  var worst='green';
  ['sds','svhc','xiv','xvii','pbt'].forEach(function(k){
    var m=REACH_MODULES[k],d=m.due?daysTo(m.due):99;
    if(m.status==='待复核'||d<60)worst='due';
  });
  return worst==='due'?'<span class="ev ev-due" title="存在模块待复核或临近复审期"><i></i>复审预警</span>'
    :'<span class="ev ev-green"><i></i>有效</span>';
}

function rchRender(){
  var worst=rchTopLamp();
  $('pageHost').innerHTML='<div class="sds-scope law-page">'+
    sdsHead('reachTitle','REACH 法规库','法规编号 '+REACH_TOP.code+' · 适用市场：'+REACH_TOP.market+' · 当前状态：'+REACH_TOP.status,
      '<button class="btn" onclick="rchToChg()">查看变更摘要</button>'+
      '<button class="btn primary" onclick="rchImport()">导入新版本</button>')+
    '<div class="card" style="padding:14px 18px;margin-bottom:14px">'+
      '<dl class="desc-list" style="grid-template-columns:120px 1fr 120px 1fr;margin:0">'+
        '<dt>法规名称</dt><dd><b>'+esc(REACH_TOP.name)+'</b></dd>'+
        '<dt>法规编号</dt><dd class="mono">'+esc(REACH_TOP.code)+'</dd>'+
        '<dt>适用市场</dt><dd>'+esc(REACH_TOP.market)+'</dd>'+
        '<dt>当前状态</dt><dd><span class="tag green dot-tag">'+esc(REACH_TOP.status)+'</span></dd>'+
        '<dt>证据灯</dt><dd>'+worst+'</dd>'+
        '<dt>REACH 主版本</dt><dd class="mono">'+esc(REACH_TOP.ver)+'</dd>'+
        '<dt>官方来源</dt><dd>'+esc(REACH_TOP.source)+'</dd>'+
        '<dt>当前发布状态</dt><dd>'+esc(REACH_TOP.publish)+'</dd>'+
        '<dt>最近检查时间</dt><dd>'+esc(REACH_TOP.lastCheck)+'（法规动态人工巡检）</dd>'+
        '<dt>最近审核时间</dt><dd>'+esc(REACH_TOP.lastReview)+'（人工复审）</dd>'+
        '<dt>审核人</dt><dd>'+esc(REACH_TOP.auditor)+'</dd>'+
        '<dt>数据截止日期</dt><dd>'+esc(REACH_TOP.cutoff)+'<span class="muted">（本次导入官方来源文件日期）</span></dd>'+
        '<dt>维护责任人</dt><dd>'+esc(REACH_TOP.owner)+'</dd>'+
        '<dt>更新频率</dt><dd style="grid-column:span 3">'+esc(REACH_TOP.cycle)+'</dd>'+
        '<dt>影响功能</dt><dd style="grid-column:span 3">'+REACH_TOP.funcs.map(function(f){return '<span class="tag blue">'+esc(f)+'</span>';}).join(' ')+'</dd>'+
      '</dl>'+
      '<div class="notice info" style="margin:12px 0 0"><div class="ni">i</div><div>'+esc(REACH_TOP.note)+'</div></div>'+
      '<div class="notice grey" style="margin:10px 0 0"><div class="ni">§</div><div>'+REACH_TOP.scope+'</div></div>'+
    '</div>'+
    '<div id="rchTabs" style="margin-bottom:12px"></div>'+
    '<div id="rchTabBody"></div>'+
    '</div>';
  $('rchTabs').appendChild(tabs(REACH_TABS,_rchTab,function(k){_rchTab=k;rchRenderTab();}));
  rchRenderTab();
}
/* 编程式切 Tab：重建页签条高亮 + 渲染 Tab 体（顶部主信息不动） */
function rchGoTab(k){
  _rchTab=k;
  var host=$('rchTabs');
  if(host){host.innerHTML='';host.appendChild(tabs(REACH_TABS,_rchTab,function(kk){_rchTab=kk;rchRenderTab();}));}
  rchRenderTab();
}
function rchToChg(){_rchTab='chg';showPage('law:reach');}
/* 跳转法规统一查询并按法规类别（lawKey）过滤 */
function rchToQuery(lawKey){showPage('law:query',{lawKey:lawKey});}

function rchRenderTab(){
  var m=_rchTab==='chg'?null:REACH_MODULES[_rchTab];
  var h;
  if(m){
    h=rchStrip(m);
  }else{
    h='<div class="notice info" style="margin-bottom:12px"><div class="ni">i</div><div><b>规划能力：</b>系统可自动发现法规版本变化（<b>当前为静态演示，未接入联网监控</b>）；法规版本变化后的 SDS 模板修改，<b>必须经法规专员审核后发布</b>。</div></div>'+
      '<div class="law-strip">'+
      '<span class="it"><em>监控来源（规划）</em><b>'+esc(REACH_MON.src)+'</b></span>'+
      '<span class="it"><em>最近检查时间</em><b>'+esc(REACH_MON.lastCheck)+'</b></span>'+
      '<span class="it"><em>检查方式</em><b>'+esc(REACH_MON.mode)+'</b></span>'+
      '<span class="it"><em>待审核变更</em><b>'+REACH_CHANGES.filter(function(x){return x.status==='待审核';}).length+' 条</b></span>'+
      '<span class="it src"><em>差异摘要与模板建议</em><b>示例内容</b></span>'+
      '</div>'+
      '<div class="notice warn" style="margin-bottom:12px"><div class="ni">!</div><div>本页汇总各清单模块的版本变更记录。<b>影响配方数量与 SDS 数量为示例数据</b>（原型阶段），不代表系统已具备影响分析能力。</div></div>';
  }
  if(_rchTab==='pbt'){
    h+=rchTabPbt();
    $('rchTabBody').innerHTML=h;
    rchPbtFill();
    return;
  }
  h+='<div class="card"><div class="toolbar" style="flex-wrap:wrap">';
  if(_rchTab==='sds'){
    var f1=_rchF.sds;
    h+='<div class="search" style="width:250px"><i class="si">⌕</i><input id="rchSdsKw" placeholder="章节编号 / 章节名称 / 数据来源…" value="'+esc(f1.kw)+'" oninput="rchFill()"></div>'+
       '<select class="ctrl" id="rchSdsMode" style="width:150px" onchange="rchFill()"><option value="">全部生成方式</option>'+['自动带出','规则计算','建议选择','人工填写'].map(function(x){return '<option'+(f1.mode===x?' selected':'')+'>'+x+'</option>';}).join('')+'</select>';
  }else if(_rchTab==='svhc'){
    var f2=_rchF.svhc;
    h+='<div class="search" style="width:260px"><i class="si">⌕</i><input id="rchSvKw" placeholder="物质名称 / CAS / EC / 列入原因…" value="'+esc(f2.kw)+'" oninput="rchFill()"></div>'+
       '<select class="ctrl" id="rchSvRsn" style="width:190px" onchange="rchFill()"><option value="">全部列入原因</option>'+['致癌性 1B','生殖毒性 1B','PBT / vPvB','PBT','内分泌干扰特性（人健康）','其他等同关注（人健康）'].map(function(x){return '<option'+(f2.reason===x?' selected':'')+'>'+x+'</option>';}).join('')+'</select>';
  }else if(_rchTab==='xiv'){
    var f3=_rchF.xiv;
    h+='<div class="search" style="width:260px"><i class="si">⌕</i><input id="rchXivKw" placeholder="条目号 / 物质名称 / CAS…" value="'+esc(f3.kw)+'" oninput="rchFill()"></div>'+
       '<select class="ctrl" id="rchXivSt" style="width:160px" onchange="rchFill()"><option value="">全部条目状态</option><option>已列入 · 需授权</option><option>已批准授权</option></select>';
  }else if(_rchTab==='xvii'){
    var f4=_rchF.xvii;
    h+='<div class="search" style="width:250px"><i class="si">⌕</i><input id="rchXvKw" placeholder="Entry 编号 / 物质 / CAS / 限制用途…" value="'+esc(f4.kw)+'" oninput="rchFill()"></div>'+
       '<select class="ctrl" id="rchXvObj" style="width:140px" onchange="rchFill()"><option value="">全部适用对象</option><option>物质</option><option>混合物</option><option>物品</option><option>物质与混合物</option><option>物品与混合物</option></select>'+
       '<select class="ctrl" id="rchXvType" style="width:190px" onchange="rchFill()"><option value="">全部限制类型</option><option>浓度限值</option><option>用途禁止</option><option>用途禁止 + 浓度限值</option><option>标签要求</option><option>其他</option></select>';
  }else if(_rchTab==='chg'){
    var f5=_rchF.chg;
    h+='<div class="search" style="width:250px"><i class="si">⌕</i><input id="rchCgKw" placeholder="变更内容 / 原因 / 受影响模块…" value="'+esc(f5.kw)+'" oninput="rchFill()"></div>'+
       '<select class="ctrl" id="rchCgTp" style="width:130px" onchange="rchFill()"><option value="">全部变更类型</option><option>新增</option><option>修改</option><option>废止</option></select>';
  }
  h+='<div class="grow"></div><span id="rchCnt" class="muted" style="font-size:12.5px"></span></div>'+
     '<div class="tbl-wrap"><table class="tbl" id="rchTable"></table></div>'+
     '<div class="pager" id="rchPager"></div></div>';
  if(_rchTab==='sds'){
    h+='<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div><b>三条法规依据的分工：</b>REACH <b>Article 31</b> 决定「何时必须提供 SDS」（法律依据，系统不判断产品是否需要编制 SDS——用户创建 SDS 即代表业务已判断需要）；REACH <b>Annex II</b>（经 Regulation (EU) 2020/878 修订）决定 SDS <b>16 章的结构与内容要求</b>（本 Tab 维护的即是这一层）；<b>CLP</b> 提供分类与标签要素（第 2 / 11 / 12 章等内容的数据来源）。</div></div>';
  }
  $('rchTabBody').innerHTML=h;
  rchFill();
}

/* 通用表格渲染（cols: [标题,宽度]，行内容由 rowHtml 生成） */
function rchTable(cols,rows,rowHtml){
  var host=$('rchTable');if(!host)return;
  var cnt=$('rchCnt');
  if(cnt)cnt.textContent='共 '+rows.length+' 条记录';
  var tp=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
  if(_rchP[_rchTab]>tp)_rchP[_rchTab]=tp;
  var pg=rows.slice((_rchP[_rchTab]-1)*PAGE_SIZE,_rchP[_rchTab]*PAGE_SIZE);
  host.innerHTML='<thead><tr>'+cols.map(function(c){return '<th style="width:'+c[1]+'px">'+esc(c[0])+'</th>';}).join('')+'<th style="width:150px">操作</th></tr></thead><tbody>'+
    (pg.length?pg.map(function(r){return rowHtml(r,rows.indexOf(r));}).join(''):'<tr><td colspan="'+(cols.length+1)+'" class="tbl-empty"><span class="big">⌕</span>没有匹配的记录</td></tr>')+'</tbody>';
  var pd=$('rchPager');
  if(pd)pd.innerHTML=tp>1?pagerHtml(rows.length,_rchP[_rchTab],tp,'rchPageGo'):'';
}
function rchPageGo(p){_rchP[_rchTab]=p;rchFill();}

function rchFill(){
  var rows=[];
  if(_rchTab==='sds'){
    var kw=($('rchSdsKw').value||'').trim().toLowerCase(),mode=$('rchSdsMode').value;
    _rchF.sds={kw:$('rchSdsKw').value,mode:mode};
    rows=REACH_SDS_CH.filter(function(r){
      if(mode&&r.mode.indexOf(mode)<0)return false;
      return !kw||(r.no+' '+r.name+' '+r.src+' '+r.mode+' '+r.ref).toLowerCase().indexOf(kw)>=0;
    });
    rchTable([['章节编号',70],['章节名称',180],['是否必填',110],['数据来源',180],['生成方式',150],['法规出处',200],['状态',80]],rows,function(r){
      return '<tr class="row-click" onclick="rchSdsDrawer(\''+esc(r.no)+'\')"><td class="mono">第 '+esc(r.no)+' 章</td><td><b>'+esc(r.name)+'</b></td>'+
        '<td>'+(r.req==='必填'?'<span class="tag green">必填</span>':'<span class="tag orange">条件必填</span>')+'</td>'+
        '<td>'+esc(r.src)+'</td><td>'+esc(r.mode)+'</td><td>'+esc(r.ref)+'</td>'+
        '<td><span class="tag '+TAG_CLS(r.status)+' dot-tag">'+esc(r.status)+'</span></td>'+
        '<td class="acts"><button class="btn-link" onclick="event.stopPropagation();rchSdsDrawer(\''+esc(r.no)+'\')">详情</button></td></tr>';
    });
  }else if(_rchTab==='svhc'){
    var kw2=($('rchSvKw').value||'').trim().toLowerCase(),rsn=$('rchSvRsn').value;
    _rchF.svhc={kw:$('rchSvKw').value,reason:rsn};
    rows=REACH_SVHC.filter(function(r){
      if(rsn&&r.reason!==rsn)return false;
      return !kw2||(r.name+' '+r.cas+' '+r.ec+' '+r.reason).toLowerCase().indexOf(kw2)>=0;
    });
    rchTable([['物质名称',190],['CAS 号',110],['EC 号',110],['列入日期',110],['列入原因',170],['适用浓度提示',230],['当前版本',90],['官方来源',190],['状态',90]],rows,function(r){
      return '<tr class="row-click" onclick="rchSvhcDrawer(\''+esc(r.cas)+'\')"><td><b>'+esc(r.name)+'</b></td><td class="mono">'+esc(r.cas)+'</td><td class="mono">'+esc(r.ec)+'</td>'+
        '<td>'+esc(r.listed)+'</td><td>'+esc(r.reason)+'</td><td>'+esc(r.conc)+'</td><td class="mono">'+esc(r.ver)+'</td><td>'+esc(r.src)+'</td>'+
        '<td><span class="tag '+TAG_CLS(r.status)+' dot-tag">'+esc(r.status)+'</span></td>'+
        '<td class="acts"><button class="btn-link" onclick="event.stopPropagation();rchSvhcDrawer(\''+esc(r.cas)+'\')">详情</button>'+
        '<button class="btn-link" onclick="event.stopPropagation();rchToQuery(\'svhc\')">法规统一查询</button></td></tr>';
    });
  }else if(_rchTab==='xiv'){
    var kw3=($('rchXivKw').value||'').trim().toLowerCase(),st3=$('rchXivSt').value;
    _rchF.xiv={kw:$('rchXivKw').value,st:st3};
    rows=REACH_XIV.filter(function(r){
      if(st3&&r.status!==st3)return false;
      return !kw3||(r.no+' '+r.name+' '+r.ids+' '+r.reason).toLowerCase().indexOf(kw3)>=0;
    });
    rchTable([['条目号',80],['物质名称',230],['CAS / EC',200],['列入原因',170],['最迟申请日期',120],['日落日期',110],['授权用途或豁免',260],['当前状态',130],['来源版本',90]],rows,function(r){
      return '<tr class="row-click" onclick="rchXivDrawer(\''+esc(r.no)+'\')"><td class="mono">'+esc(r.no)+'</td><td><b>'+esc(r.name)+'</b></td><td class="mono">'+esc(r.ids)+'</td>'+
        '<td>'+esc(r.reason)+'</td><td>'+esc(r.apply)+'</td><td>'+esc(r.sunset)+'</td><td>'+esc(r.use)+'</td>'+
        '<td><span class="tag '+(r.status.indexOf('需授权')>=0?'orange':'green')+' dot-tag">'+esc(r.status)+'</span></td><td class="mono">'+esc(REACH_MODULES.xiv.ver)+'</td>'+
        '<td class="acts"><button class="btn-link" onclick="event.stopPropagation();rchXivDrawer(\''+esc(r.no)+'\')">详情</button>'+
        '<button class="btn-link" onclick="event.stopPropagation();rchToQuery(\'xiv\')">法规统一查询</button></td></tr>';
    });
  }else if(_rchTab==='xvii'){
    var kw4=($('rchXvKw').value||'').trim().toLowerCase(),obj=$('rchXvObj').value,ty=$('rchXvType').value;
    _rchF.xvii={kw:$('rchXvKw').value,obj:obj,type:ty};
    rows=REACH_XVII.filter(function(r){
      if(obj&&r.obj!==obj)return false;
      if(ty&&r.type!==ty)return false;
      return !kw4||(r.entry+' '+r.name+' '+r.ids+' '+r.use+' '+r.sum).toLowerCase().indexOf(kw4)>=0;
    });
    rchTable([['限制条目号',100],['物质或物质组',220],['CAS / EC',190],['适用对象',110],['限制类型',160],['限制用途',200],['浓度阈值',230],['生效日期',110],['豁免条件',220],['限制条件摘要',280],['来源版本',90]],rows,function(r){
      var thr=r.thr.indexOf('—')===0?'<span class="muted">'+esc(r.thr)+'</span>':esc(r.thr);
      return '<tr class="row-click" onclick="rchXviiDrawer(\''+esc(r.entry)+'\')"><td class="mono"><b>'+esc(r.entry)+'</b></td><td><b>'+esc(r.name)+'</b></td><td class="mono">'+esc(r.ids)+'</td>'+
        '<td>'+esc(r.obj)+'</td><td>'+esc(r.type)+'</td><td>'+esc(r.use)+'</td><td>'+thr+'</td><td>'+esc(r.eff)+'</td><td>'+esc(r.exempt)+'</td><td>'+esc(r.sum)+'</td><td class="mono">'+esc(r.ver)+'</td>'+
        '<td class="acts"><button class="btn-link" onclick="event.stopPropagation();rchXviiDrawer(\''+esc(r.entry)+'\')">详情</button>'+
        '<button class="btn-link" onclick="event.stopPropagation();rchToQuery(\'xvii\')">法规统一查询</button></td></tr>';
    });
  }else if(_rchTab==='chg'){
    var kw5=($('rchCgKw').value||'').trim().toLowerCase(),tp=$('rchCgTp').value;
    _rchF.chg={kw:$('rchCgKw').value,tp:tp};
    rows=REACH_CHANGES.filter(function(r){
      if(tp&&r.tp!==tp)return false;
      return !kw5||(r.content+' '+r.diff+' '+r.mod+' '+r.tpl).toLowerCase().indexOf(kw5)>=0;
    });
    rchTable([['受影响模块',160],['变更类型',80],['内容',280],['新旧条文差异摘要',240],['模板修改建议',230],['生效日期',130],['审核状态',90],['审核人',90],['影响物质数',100],['影响配方数',100],['影响 SDS 数',100]],rows,function(r){
      return '<tr><td>'+esc(r.mod)+'</td><td><span class="tag '+(r.tp==='新增'?'green':(r.tp==='修改'?'orange':'grey'))+'">'+esc(r.tp)+'</span></td>'+
        '<td>'+esc(r.content)+'</td><td>'+esc(r.diff)+'</td><td>'+esc(r.tpl)+'</td><td>'+esc(r.eff)+'</td>'+
        '<td><span class="tag '+TAG_CLS(r.status)+' dot-tag">'+esc(r.status)+'</span></td><td>'+esc(r.by)+'</td>'+
        '<td>'+esc(r.subs)+(rchIsNum(r.subs)?'<span class="muted" style="font-size:11px"> 官方清单</span>':'')+'</td>'+
        '<td>'+esc(r.recipes)+(rchIsNum(r.recipes)?' <span class="tag orange" style="font-size:10.5px">示例</span>':'')+'</td>'+
        '<td>'+esc(r.sds)+(rchIsNum(r.sds)?' <span class="tag orange" style="font-size:10.5px">示例</span>':'')+'</td>'+
        '<td class="acts"><button class="btn-link" onclick="rchChgImpact('+REACH_CHANGES.indexOf(r)+')">查看影响范围</button></td></tr>';
    });
  }
}
/* 数字才挂标注：物质数带「官方清单」、配方 / SDS 数带「示例」；非数字（待评估 / —）一律不挂 */
function rchIsNum(v){return v!==''&&v!=null&&!isNaN(Number(v));}

/* ---------- 5. Tab1：SDS 编制要求（章节详情抽屉，标注「研发实现用」） ---------- */
function rchSdsDrawer(no){
  var r=REACH_SDS_CH.filter(function(x){return x.no===String(no);})[0];if(!r)return;
  var d=r.det;
  rchDrawer('SDS 编制要求 · 第 '+r.no+' 章 '+r.name,
    rchStrip(REACH_MODULES.sds)+
    '<span class="tag blue" style="margin:10px 0 10px;display:inline-block">研发实现用</span>'+
    '<span class="muted" style="font-size:12px;display:inline;margin-left:8px">本抽屉给出该章的字段要求与系统落点，供研发实现与配置使用</span>'+
    '<dl class="desc-list" style="grid-template-columns:130px 1fr">'+
    '<dt>章节编号</dt><dd class="mono">第 '+esc(r.no)+' 章</dd>'+
    '<dt>章节名称</dt><dd>'+esc(r.name)+'</dd>'+
    '<dt>是否必填</dt><dd>'+(r.req==='必填'?'<span class="tag green">必填</span>':'<span class="tag orange">条件必填</span>')+'（REACH Annex II 要求 16 章齐全）</dd>'+
    '<dt>子章节</dt><dd>'+esc(d.sub)+'</dd>'+
    '<dt>字段要求摘要</dt><dd>'+esc(d.fields)+'</dd>'+
    '<dt>对应系统字段</dt><dd>'+esc(d.sys)+'</dd>'+
    '<dt>数据来源</dt><dd>'+esc(r.src)+'</dd>'+
    '<dt>生成方式</dt><dd>'+esc(r.mode)+'</dd>'+
    '<dt>法规出处</dt><dd>'+esc(r.ref)+'</dd>'+
    '<dt>模板版本</dt><dd class="mono">'+esc(d.tpl)+'</dd>'+
    '<dt>状态</dt><dd><span class="tag '+TAG_CLS(r.status)+' dot-tag">'+esc(r.status)+'</span> · 维护责任人 '+esc(REACH_MODULES.sds.owner)+'</dd>'+
    '</dl>'+
    '<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div><b>依据说明：</b>本章的结构与内容要求来自 REACH <b>Annex II</b>（经 (EU) 2020/878 修订）；「何时必须提供 SDS」由 REACH <b>Article 31</b> 规定，系统不判断产品是否需要编制 SDS（用户创建 SDS 即代表业务已判断需要）。</div></div>',
    '<button class="btn" onclick="rchDrawerClose()">关闭</button>'+
    '<button class="btn primary" onclick="rchDrawerClose();rchToQuery(\'clp6\')">查看 CLP 分类依据 →</button>');
}

/* ---------- 6. Tab2：SVHC 候选清单详情 ---------- */
function rchSvhcDrawer(cas){
  var r=REACH_SVHC.filter(function(x){return x.cas===cas;})[0];
  if(!r)r=REACH_SVHC.filter(function(x){return x.cas===(_rchF.svhc?_rchF.svhc.kw:'');})[0];
  if(!r)return;
  rchDrawer('SVHC 候选清单 · '+r.name,
    rchStrip(REACH_MODULES.svhc)+
    '<dl class="desc-list" style="grid-template-columns:130px 1fr 130px 1fr">'+
    '<dt>物质名称</dt><dd><b>'+esc(r.name)+'</b></dd><dt>CAS 号</dt><dd class="mono">'+esc(r.cas)+'</dd>'+
    '<dt>EC 号</dt><dd class="mono">'+esc(r.ec)+'</dd><dt>列入日期</dt><dd>'+esc(r.listed)+'</dd>'+
    '<dt>列入原因</dt><dd>'+esc(r.reason)+'</dd><dt>当前版本</dt><dd class="mono">'+esc(r.ver)+'</dd>'+
    '<dt>适用浓度提示</dt><dd style="grid-column:span 3">'+esc(r.conc)+'</dd>'+
    '<dt>官方来源</dt><dd>'+esc(r.src)+'</dd><dt>状态</dt><dd><span class="tag '+TAG_CLS(r.status)+' dot-tag">'+esc(r.status)+'</span></dd>'+
    '</dl>'+
    '<div class="notice info" style="margin-top:12px"><div class="ni">i</div><div>列入候选清单不会直接禁止使用：<b>浓度超过 0.1%（w/w）时触发信息传递义务</b>（供应链信息、消费者问询 45 天内答复），并可能进一步进入 Annex XIV 授权清单。</div></div>'+
    '<div class="notice warn" style="margin-top:10px"><div class="ni">!</div><div>本页清单为<b>演示示例数据（节选）</b>，正式版以 ECHA 发布的候选清单全量数据为准。</div></div>',
    '<button class="btn" onclick="rchDrawerClose()">关闭</button>'+
    '<button class="btn primary" onclick="rchDrawerClose();rchToQuery(\'svhc\')">在法规统一查询中查看 →</button>');
}

/* ---------- 7. Tab3：Annex XIV 授权清单详情 ---------- */
function rchXivDrawer(no){
  var r=REACH_XIV.filter(function(x){return x.no===String(no);})[0];if(!r)return;
  rchDrawer('Annex XIV 授权清单 · 条目 '+r.no,
    rchStrip(REACH_MODULES.xiv)+
    '<dl class="desc-list" style="grid-template-columns:130px 1fr">'+
    '<dt>条目号</dt><dd class="mono">'+esc(r.no)+'</dd>'+
    '<dt>物质名称</dt><dd>'+esc(r.name)+'</dd>'+
    '<dt>CAS / EC</dt><dd class="mono">'+esc(r.ids)+'</dd>'+
    '<dt>列入原因</dt><dd>'+esc(r.reason)+'</dd>'+
    '<dt>最迟申请日期</dt><dd>'+esc(r.apply)+'<span class="muted" style="margin-left:6px">（原始口径为日落日期前 18 个月）</span></dd>'+
    '<dt>日落日期</dt><dd>'+esc(r.sunset)+'</dd>'+
    '<dt>授权用途或豁免</dt><dd>'+esc(r.use)+'</dd>'+
    '<dt>当前状态</dt><dd><span class="tag orange dot-tag">'+esc(r.status)+'</span></dd>'+
    '<dt>来源版本</dt><dd class="mono">'+esc(REACH_MODULES.xiv.ver)+'</dd>'+
    '<dt>数据来源类型</dt><dd><span class="tag grey">官方法规清单（强制采用）</span></dd>'+
    '</dl>'+
    '<div class="notice info" style="margin-top:12px"><div class="ni">i</div><div>日落日期之后，<b>未经授权不得在欧盟境内使用、投放市场</b>；已提交申请且仍在审查中的企业可在过渡安排下继续使用。系统对命中物质的用法提示为「需授权 / 需核查授权状态」。</div></div>',
    '<button class="btn" onclick="rchDrawerClose()">关闭</button>'+
    '<button class="btn primary" onclick="rchDrawerClose();rchToQuery(\'xiv\')">在法规统一查询中查看 →</button>');
}

/* ---------- 8. Tab4：Annex XVII 限制清单详情（含用途 / 浓度 / 豁免三要素） ---------- */
function rchXviiDrawer(entry){
  var r=REACH_XVII.filter(function(x){return x.entry===entry;})[0];
  if(!r)r=REACH_XVII.filter(function(x){return x.entry===(_rchF.xvii?_rchF.xvii.kw:'');})[0];
  if(!r)return;
  rchDrawer('Annex XVII 限制清单 · '+r.entry,
    rchStrip(REACH_MODULES.xvii)+
    '<dl class="desc-list" style="grid-template-columns:130px 1fr">'+
    '<dt>限制条目号</dt><dd class="mono"><b>'+esc(r.entry)+'</b></dd>'+
    '<dt>物质或物质组</dt><dd>'+esc(r.name)+'</dd>'+
    '<dt>CAS / EC</dt><dd class="mono">'+esc(r.ids)+'</dd>'+
    '<dt>适用对象</dt><dd>'+esc(r.obj)+'<span class="muted" style="margin-left:6px">（限制可能只约束物品 / 只约束混合物，不能按物质一刀切）</span></dd>'+
    '<dt>限制类型</dt><dd>'+esc(r.type)+'</dd>'+
    '<dt>限制用途</dt><dd>'+esc(r.use)+'</dd>'+
    '<dt>浓度阈值</dt><dd>'+(r.thr.indexOf('—')===0?'<span class="muted">'+esc(r.thr)+'</span>':esc(r.thr))+'</dd>'+
    '<dt>生效日期</dt><dd>'+esc(r.eff)+'</dd>'+
    '<dt>豁免条件</dt><dd>'+esc(r.exempt)+'</dd>'+
    '<dt>限制条件摘要</dt><dd>'+esc(r.sum)+'</dd>'+
    '<dt>来源版本</dt><dd class="mono">'+esc(r.ver)+'</dd>'+
    '</dl>'+
    '<div class="notice warn" style="margin-top:12px"><div class="ni">!</div><div>查询结果只能给出「<b>可能命中限制</b>」的判断：是否真正受限，取决于<b>适用对象</b>（物质 / 混合物 / 物品）、<b>用途</b>与<b>浓度</b>三者，必须进入本页核对后再下结论。部分条目（如 Entry 28–30）<b>只禁用途、不设浓度限值</b>。</div></div>',
    '<button class="btn" onclick="rchDrawerClose()">关闭</button>'+
    '<button class="btn primary" onclick="rchDrawerClose();rchToQuery(\'xvii\')">在法规统一查询中查看 →</button>');
}

/* ---------- 9. Tab5：Annex XIII PBT / vPvB 判定规则卡片 ---------- */
function rchTabPbt(){
  var kw=(_rchF.pbt.kw||'').trim().toLowerCase(),tg=_rchF.pbt.target||'';
  var rows=REACH_PBT.filter(function(r){
    if(tg&&r.target!==tg)return false;
    return !kw||(r.id+' '+r.name+' '+r.input+' '+r.cond+' '+r.out).toLowerCase().indexOf(kw)>=0;
  });
  return '<div class="card"><div class="toolbar" style="flex-wrap:wrap">'+
    '<div class="search" style="width:280px"><i class="si">⌕</i><input id="rchPbtKw" placeholder="规则编号 / 名称 / 判断条件…" value="'+esc(_rchF.pbt.kw||'')+'" oninput="rchPbtFill()"></div>'+
    '<select class="ctrl" id="rchPbtTgt" style="width:150px" onchange="rchPbtFill()"><option value="">全部判定对象</option>'+['物质','物质与混合物'].map(function(x){return '<option'+(tg===x?' selected':'')+'>'+x+'</option>';}).join('')+'</select>'+
    '<div class="grow"></div><span class="muted" style="font-size:12.5px" id="rchPbtCnt"></span></div>'+
    '<div class="rch-rules" id="rchRuleBox"></div></div>'+
    '<div class="notice warn" style="margin-top:12px"><div class="ni">!</div><div><b>本次不实现真实判定计算。</b>本 Tab 展示的是由法规专员依 Annex XIII 整理的判定规则（阈值、输入项、输出结论），供研发实现与业务核对使用；实际判定需结合试验数据与专家评估。</div></div>';
}
function rchPbtFill(){
  var kw=($('rchPbtKw').value||'').trim().toLowerCase(),tg=$('rchPbtTgt').value;
  _rchF.pbt={kw:$('rchPbtKw').value,target:tg};
  var rows=REACH_PBT.filter(function(r){
    if(tg&&r.target!==tg)return false;
    return !kw||(r.id+' '+r.name+' '+r.input+' '+r.cond+' '+r.out).toLowerCase().indexOf(kw)>=0;
  });
  var cnt=$('rchPbtCnt');if(cnt)cnt.textContent='共 '+rows.length+' 条规则';
  var box=$('rchRuleBox');if(!box)return;
  box.innerHTML=rows.length?rows.map(function(r){
    return '<div class="rch-rule" onclick="rchPbtDrawer(\''+esc(r.id)+'\')">'+
      '<div class="hd"><span class="mono tag blue">'+esc(r.id)+'</span><b>'+esc(r.name)+'</b>'+
      '<span class="tag '+(r.target==='物质'?'grey':'orange')+'">'+esc(r.target)+'</span></div>'+
      '<div class="kv"><em>所需输入</em><span>'+esc(r.input)+'</span></div>'+
      '<div class="kv"><em>判断条件</em><span>'+esc(r.cond)+'</span></div>'+
      '<div class="kv"><em>输出结果</em><span>'+esc(r.out)+'</span></div>'+
      '<div class="ft"><span>'+esc(r.ref)+'</span><span>规则版本 '+esc(r.ver)+'</span>'+
      '<span class="tag '+TAG_CLS(r.status)+' dot-tag">'+esc(r.status)+'</span></div>'+
      '</div>';
  }).join(''):'<div class="tbl-empty" style="padding:30px;text-align:center"><span class="big">⌕</span>没有匹配的规则</div>';
}
function rchPbtDrawer(id){
  var r=REACH_PBT.filter(function(x){return x.id===id;})[0];if(!r)return;
  rchDrawer('PBT/vPvB 判定规则 · '+r.id,
    rchStrip(REACH_MODULES.pbt)+
    '<span class="tag blue" style="margin:10px 0 10px;display:inline-block">研发实现用</span>'+
    '<span class="muted" style="font-size:12px;display:inline;margin-left:8px">原型阶段不做实际判定计算，仅展示规则内容与阈值口径</span>'+
    '<dl class="desc-list" style="grid-template-columns:130px 1fr">'+
    '<dt>规则编号</dt><dd class="mono">'+esc(r.id)+'</dd>'+
    '<dt>规则名称</dt><dd>'+esc(r.name)+'</dd>'+
    '<dt>判定对象</dt><dd>'+esc(r.target)+'</dd>'+
    '<dt>所需输入</dt><dd>'+esc(r.input)+'</dd>'+
    '<dt>判断条件</dt><dd>'+esc(r.cond)+'</dd>'+
    '<dt>输出结果</dt><dd>'+esc(r.out)+'</dd>'+
    '<dt>法规出处</dt><dd>'+esc(r.ref)+'</dd>'+
    '<dt>规则版本</dt><dd class="mono">'+esc(r.ver)+'</dd>'+
    '<dt>审核状态</dt><dd><span class="tag '+TAG_CLS(r.status)+' dot-tag">'+esc(r.status)+'</span> · 审核人 '+esc(REACH_MODULES.pbt.owner)+'</dd>'+
    '<dt>数据来源类型</dt><dd><span class="tag grey">人工审核规则</span>——由法规专员从法规原文人工整理成型，非系统自动解析</dd>'+
    '</dl>',
    '<button class="btn primary" onclick="rchDrawerClose()">关闭</button>');
}

/* ---------- 10. Tab6：影响范围查看（配方 / SDS 数量为示例数据） ---------- */
function rchChgImpact(i){
  var r=REACH_CHANGES[i];if(!r)return;
  openModal({title:'影响范围 · '+r.tp+'：'+r.content.slice(0,24)+'…',width:780,cls:'sds-scope law-page',
    body:'<dl class="desc-list" style="grid-template-columns:150px 1fr;margin-bottom:12px">'+
      '<dt>受影响模块</dt><dd>'+esc(r.mod)+'</dd>'+
      '<dt>新旧条文差异摘要</dt><dd>'+esc(r.diff)+'<span class="tag orange" style="font-size:10.5px;margin-left:6px">示例</span></dd>'+
      '<dt>模板修改建议</dt><dd>'+esc(r.tpl)+'<span class="tag orange" style="font-size:10.5px;margin-left:6px">示例</span></dd>'+
      '<dt>审核状态</dt><dd><span class="tag '+TAG_CLS(r.status)+' dot-tag">'+esc(r.status)+'</span> · 审核人 '+esc(r.by)+'</dd>'+
      '</dl>'+
      '<div class="stat-row"><div class="stat"><b>'+esc(String(r.subs))+'</b><span>影响物质数量（官方变更清单）</span></div>'+
      '<div class="stat" style="border-color:var(--orange-b);background:var(--orange-bg)"><b style="color:var(--orange)">'+esc(r.recipes)+(rchIsNum(r.recipes)?' <span class="tag orange" style="font-size:10.5px">示例</span>':'')+'</b><span>影响配方数量</span></div>'+
      '<div class="stat" style="border-color:var(--orange-b);background:var(--orange-bg)"><b style="color:var(--orange)">'+esc(r.sds)+(rchIsNum(r.sds)?' <span class="tag orange" style="font-size:10.5px">示例</span>':'')+'</b><span>影响 SDS 数量</span></div></div>'+
      '<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px"><table class="tbl"><thead><tr><th style="width:130px">SDS 编号</th><th>产品名称</th><th style="width:100px">目标市场</th><th>影响项</th><th style="width:120px">建议动作</th></tr></thead><tbody>'+
      '<tr><td class="mono">SDS-2026-0102</td><td>水性聚氨酯涂饰树脂 WPU-320</td><td>欧盟 · 德国</td><td>第 3 / 15 章：组分 REACH 命中结论更新</td><td><span class="tag red">需复核</span></td></tr>'+
      '<tr><td class="mono">SDS-2026-0091</td><td>铬鞣助剂 CR-7</td><td>欧盟 · 西班牙</td><td>第 2 / 15 章：Cr(VI) 限制条目引用更新</td><td><span class="tag orange">需更新引用</span></td></tr>'+
      '</tbody></table></div>'+
      '<div class="notice warn" style="margin:14px 0 0"><div class="ni">!</div><div><b>上述受影响配方 / SDS 清单为示例数据</b>（原型阶段），不代表系统已具备影响分析能力；正式版将基于「法规条目 ↔ 组分 ↔ 已发布 SDS」关联关系计算。</div></div>',
    footer:'<button class="btn primary" onclick="closeModal()">关闭</button>'});
}

/* ---------- 11. 导入新版本 · 静态演示向导（与 CLP 页同一套五步） ---------- */
var _rchImp={step:1};
function rchMini(n){
  var t=['登记来源文件','创建新版本','上传结构化数据','查看变更','审核发布'];
  return '<div class="mini-steps">'+t.map(function(x,i){
    var cls=i+1<n?'fin':(i+1===n?'on':'');
    return '<div class="mini-step '+cls+'"><span class="n">'+(i+1<n?'✓':(i+1))+'</span>'+x+'</div>'+(i<4?'<div class="mini-line '+(i+1<n?'fin':'')+'"></div>':'');
  }).join('')+'</div>';
}
/* ⚠️ 全站只有一个模态宿主 #modal，向导内的「影响范围」属二级弹窗，打开时会覆写向导本体。
   故二级弹窗的关闭按钮统一回到本函数重建向导当前步，避免「点一次影响范围，向导就没了」的演示级事故。
   （与 CLP 页 23z6a 的 clpImpRestore() 同一套做法） */
function rchImpRestore(){
  var n=_rchImp.step||1;
  openModal({title:'导入新版本 · REACH 法规库',width:680,cls:'sds-scope law-page',
    body:rchImpHtml(n),footer:rchImpFoot(n)});
  if(n===3&&_rchImp.file)rchImpShowFile();
}
function rchImport(){
  _rchImp={step:1};
  rchImpRestore();
}
function rchImpHtml(n){
  if(n===1){
    return rchMini(1)+
      '<div class="form-grid">'+
      '<div class="field"><label class="req">导入模块</label><select class="ctrl" id="riMod">'+
        '<option value="svhc">SVHC 候选清单</option><option value="xiv">Annex XIV 授权清单</option>'+
        '<option value="xvii">Annex XVII 限制清单</option><option value="sds">SDS 编制要求（Annex II 结构）</option>'+
        '<option value="pbt">Annex XIII PBT/vPvB 判定规则</option></select></div>'+
      '<div class="field"><label class="req">官方来源名称</label><input class="ctrl" id="riSrc" value="'+esc(_rchImp.src||'')+'" placeholder="例如：Commission Regulation (EU) 2026/xxx（Annex XVII 修订）"></div>'+
      '<div class="field"><label class="req">来源发布日期</label><input class="ctrl" type="date" id="riSrcDate" value="'+esc(_rchImp.srcDate||'2026-07-28')+'"></div>'+
      '<div class="field"><label>备注</label><input class="ctrl" id="riNote" placeholder="例如：EUR-Lex 官方公报附件"></div></div>';
  }
  if(n===2){
    return rchMini(2)+
      '<div class="form-grid">'+
      '<div class="field"><label class="req">模块版本号</label><input class="ctrl" id="riVer" value="'+esc(_rchImp.ver||'')+'" placeholder="例如：第 34 批 / V2026.3 / R2026.2"></div>'+
      '<div class="field"><label class="req">生效日期</label><input class="ctrl" type="date" id="riEff" value="'+esc(_rchImp.eff||'2027-01-15')+'"></div>'+
      '<div class="field"><label class="req">数据截止日期</label><input class="ctrl" type="date" id="riCut" value="'+esc(_rchImp.cut||'2027-01-08')+'"></div>'+
      '<div class="field"><label>维护责任人</label><input class="ctrl" id="riOwner" value="'+esc(REACH_TOP.owner)+'"></div></div>'+
      '<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div>SVHC、Annex XIV、Annex XVII 与 Annex II 的更新时间并不一致，登记后<b>仅更新所选模块</b>的版本与生效日期。</div></div>';
  }
  if(n===3){
    return rchMini(3)+
      '<div style="margin-top:4px"><div class="drop" onclick="document.getElementById(\'riFile\').click()"><div class="ic">⇪</div><p>上传结构化数据文件（Excel / CSV / JSON）</p><small>结构化清单来自官方发布附件的整理稿 · 原型为静态演示，不进行真实解析</small></div>'+
      '<input type="file" id="riFile" accept=".xlsx,.csv,.json" style="display:none" onchange="rchImpPick(this)"></div>'+
      '<div id="riFileRow" style="margin-top:12px"></div>'+
      '<div style="margin-top:10px;font-size:12.5px;color:var(--muted)">没有文件？<a onclick="rchImpPickDemo()" style="cursor:pointer">使用官方结构化示例文件</a></div>';
  }
  if(n===4){
    return rchMini(4)+
      '<div class="stat-row"><div class="stat"><b>78</b><span>导入条目总数</span></div>'+
      '<div class="stat" style="border-color:var(--green-b);background:var(--green-bg)"><b style="color:var(--green)">5</b><span>新增条目</span></div>'+
      '<div class="stat" style="border-color:var(--orange-b);background:var(--orange-bg)"><b style="color:var(--orange)">3</b><span>修改条目</span></div>'+
      '<div class="stat" style="border-color:var(--line);background:var(--bg-soft,#f7f8fa)"><b>1</b><span>删除条目</span></div></div>'+
      '<div style="font-size:12.5px;font-weight:600;margin:6px 0 7px">变更预览（节选，与库内条目比对后的差异）</div>'+
      '<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px;max-height:200px;overflow:auto"><table class="tbl"><thead><tr><th style="width:70px">变更</th><th style="width:110px">条目号</th><th>物质 / 内容</th><th style="width:150px">差异摘要</th></tr></thead><tbody>'+
      '<tr><td><span class="tag green">新增</span></td><td class="mono">Entry 79</td><td>某阻燃剂物质组</td><td>新增限制条目</td></tr>'+
      '<tr><td><span class="tag orange">修改</span></td><td class="mono">Entry 77</td><td>甲醛</td><td>皮革品类限值口径细化</td></tr>'+
      '<tr><td><span class="tag grey">删除</span></td><td class="mono">Entry 68</td><td>旧条目</td><td>被合并条目替代</td></tr>'+
      '</tbody></table></div>'+
      '<div class="notice warn" style="margin:14px 0 0"><div class="ni">!</div><div>预览内容尚未入库，<b>必须经人工逐条核对确认后</b>方可发布生效。</div></div>';
  }
  return rchMini(5)+
    '<div class="notice grey" style="margin-bottom:12px"><div class="ni">§</div><div>审核通过后发布新版本；发布后可在「版本变更与影响」查看变更摘要与影响范围。</div></div>'+
    '<dl class="desc-list" style="margin-bottom:12px"><dt>模块</dt><dd>'+esc(_rchImp.modTxt||'Annex XVII 限制清单')+'</dd>'+
    '<dt>版本号</dt><dd class="mono">'+esc(_rchImp.ver||'V2026.3')+'</dd><dt>生效日期</dt><dd>'+esc(_rchImp.eff||'2027-01-15')+'</dd>'+
    '<dt>来源文件</dt><dd>'+esc(_rchImp.file||'annex_xvii_v2026_3.xlsx')+'</dd></dl>'+
    '<div class="form-grid one">'+
    '<div class="field"><label class="req">人工审核人</label><input class="ctrl" id="riAuditor" value="'+esc(REACH_TOP.owner)+'"></div>'+
    '<div class="field"><label class="inline-chk"><input type="checkbox" class="chk" id="riOk"> 我确认已逐条核对预览变更，并对本次发布数据质量负责</label></div></div>';
}
function rchImpFoot(n){
  if(n===1)return '<div class="left">第 1 步 / 共 5 步</div><button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="rchImpNext(2)">下一步：创建新版本</button>';
  if(n===2)return '<div class="left">第 2 步 / 共 5 步</div><button class="btn" onclick="rchImpNext(1)">上一步</button><button class="btn primary" onclick="rchImpNext(3)">下一步：上传结构化数据</button>';
  if(n===3)return '<div class="left">第 3 步 / 共 5 步</div><button class="btn" onclick="rchImpNext(2)">上一步</button><button class="btn primary" id="riNext3" disabled onclick="rchImpNext(4)">下一步：查看变更</button>';
  if(n===4)return '<div class="left">第 4 步 / 共 5 步</div><button class="btn" onclick="rchImpNext(3)">上一步</button><button class="btn" onclick="rchImpImpact()">查看影响范围</button><button class="btn primary" onclick="rchImpNext(5)">提交审核</button>';
  return '<div class="left">第 5 步 / 共 5 步</div><button class="btn" onclick="rchImpNext(4)">上一步</button><button class="btn primary" onclick="rchImpPublish()">发布版本</button>';
}
function rchImpNext(n){
  if(n>=2){
    if(n===2){_rchImp.modTxt=$('riMod').options[$('riMod').selectedIndex].text;_rchImp.mod=$('riMod').value;_rchImp.src=$('riSrc').value.trim();_rchImp.srcDate=$('riSrcDate').value;}
    if(n===3){_rchImp.ver=$('riVer').value.trim()||'V2026.3';_rchImp.eff=$('riEff').value||'2027-01-15';_rchImp.cut=$('riCut').value;}
    if(n===4&&!_rchImp.file){toast('请先上传结构化数据文件（或使用示例文件）','warn');return;}
  }
  _rchImp.step=n;
  $('mBody').innerHTML=rchImpHtml(n);
  $('mFoot').innerHTML=rchImpFoot(n);
  if(n===3&&_rchImp.file)rchImpShowFile();
}
function rchImpPick(el){if(!el.files.length)return;_rchImp.file=el.files[0].name;rchImpShowFile();}
function rchImpPickDemo(){_rchImp.file='annex_xvii_v2026_3.xlsx';rchImpShowFile();}
function rchImpShowFile(){
  var row=$('riFileRow');if(!row)return;
  row.innerHTML='<div class="file-row"><span style="font-size:16px">▤</span><div><b>'+esc(_rchImp.file)+'</b><div style="color:var(--muted);font-size:11.5px">结构化数据 · 待人工核对</div></div><span class="tag orange" style="margin-left:auto">待审核</span></div>';
  var b=$('riNext3');if(b){b.disabled=false;b.classList.remove('disabled');}
}
function rchImpImpact(){
  openModal({title:'影响范围（示例）',width:720,cls:'sds-scope law-page',
    body:'<div class="notice warn" style="margin-bottom:12px"><div class="ni">!</div><div><b>影响配方 / SDS 数量为示例数据</b>（原型阶段），不代表系统已具备影响分析能力。</div></div>'+
      '<div class="stat-row"><div class="stat"><b>5</b><span>影响物质（官方变更清单）</span></div><div class="stat"><b>2 <span class="tag orange" style="font-size:10.5px">示例</span></b><span>影响配方</span></div><div class="stat"><b>2 <span class="tag orange" style="font-size:10.5px">示例</span></b><span>影响 SDS</span></div></div>',
    footer:'<button class="btn primary" onclick="rchImpRestore()">返回向导</button>'});
}
function rchImpPublish(){
  if(!$('riOk').checked){toast('请先勾选人工核对确认项','warn');return;}
  var auditor=($('riAuditor')&&$('riAuditor').value.trim())||REACH_TOP.owner;
  var ver=_rchImp.ver||'V2026.3',eff=_rchImp.eff||'2027-01-15';
  REACH_CHANGES.unshift({mod:_rchImp.modTxt||'Annex XVII 限制清单',tp:'新增',content:ver+' 导入：新增 5 条清单条目（'+(_rchImp.src||'官方来源文件')+'）',
    diff:'新增 5 条清单条目（条目号 / 物质 / 限制条件）',tpl:'无需改模板；SDS 第 15 章法规引用需重新取值',
    eff:eff,status:'已审核',by:auditor,subs:5,recipes:'2',sds:'2'});
  closeModal();
  rchGoTab('chg');
  toast('新版本已审核发布（演示），变更已记录在「版本变更与影响」','ok');
}

/* ---------- 12. 页面注册（接管 23y 原 law:reach 维护页） ---------- */
regPage('law:reach',{title:'REACH 法规库',crumb:['合规管理','法规库维护','REACH 法规库'],render:rchRender});
