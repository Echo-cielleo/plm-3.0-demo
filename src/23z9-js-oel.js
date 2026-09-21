/* ==================================================================
   [23z9] 职业接触限值（OEL）法规库 · 维护页面（2026-09-18 第三十轮）
   ------------------------------------------------------------------
   需求口径（Cayla 2026-09-18）：
   · OEL 不是一部单独法规，而是各市场官方发布的多套职业接触限值清单。
     用户不逐条维护散落法规，而是以「国家 / 地区的官方限值数据集版本」为单位维护：
     官方来源 → 数据集版本 → 限值明细 → 版本对比 → 审核发布
   · 范围（2026-09-18 二次拍板）：本公司**只做欧盟与中国两个市场**，
     故来源只维护「欧盟（EU）IOELV」与「中国 GBZ 2.1」两套，
     其他国家级清单（德国 / 英国 / 法国 / 西班牙等）不建立；后续如需扩展再新增来源。
   · 限值类型语义对齐（2026-09-18 二次拍板）：中国为 MAC / PC-TWA / PC-STEL，
     欧盟为 8h TWA / STEL，类型名不同但语义只有三类。系统用「限值类型字典」把
     原文类型名映射到统一的**语义槽位**：长期（8h TWA）/ 短期（15 min）/ 上限（任何时点）。
     槽位只用于**按槽位筛选与对齐**，**不改数值、不改单位、不生成新数值、不判断严格性**。
     不做数值换算归一（ppm→mg/m³ 需温度/压力/分子量假设，跨体系折算属口径搬运）。
   · 顶部：已覆盖国家/地区 · 已发布数据集数量 · 待审核版本数量 · 最近更新时间
     + 主入口「新建数据来源」「导入限值数据集」
   · 四个 Tab：① 数据来源 ② 数据集版本 ③ 限值明细 ④ 版本对比与审核
   · 上传演示流程（7 步）：选择数据来源 → 填写版本信息 → 上传附件 →
     解析预览 → 数据校验 → 与上一版本比较 → 提交审核
   · 原始 PDF / 网页存档与结构化 Excel 分开保存
   · 明确边界（页面须体现）：不自动从 PDF 识别并直接发布数据；不自动判断哪套
     限值更严格；不把两套限值合并成一个值；不根据投放市场自动选择 OEL；
     不实现真实 AI 解析与法规网站监控；「投放市场 → 有效法规版本 → SDS 第 8 节」
     的关联后续统一实现
   实现约定：本分片接管 law:oel 注册（23z8 的占位页注册已删，非覆盖关系）；
   顶部主信息条复用 23z8 的 lawStripHTML（.law-strip）；抽屉复用
   .exp-ai-mask / .exp-ai-panel；本页样式在 06z5-css-oel.css。
   数据说明：限值数值为演示用示例数据（节选），其中中国 GBZ 2.1-2019 的限值与
   生物监测指标取自标准原文表 1 / 表 4；正式版以各官方清单全量数据为准。
   ================================================================== */

/* ---------- 1. 页面级口径 ---------- */
var OEL_TOP={
  title:'职业接触限值（OEL）',
  lastUpd:'2026-09-12',
  owner:'质管-杨工',
  note:'OEL 不是一部单独法规：欧盟与中国各自发布限值清单（欧盟 IOELV、中国 GBZ 2.1），限值类型、更新周期与法律效力各不相同。因此本页<b>不逐条维护散落在法规中的条文</b>，而是以「<b>官方来源 → 数据集版本 → 限值明细 → 版本对比 → 审核发布</b>」五步为单位维护。',
  boundary:'限值类型口径不同（中国为 <b>MAC / PC-TWA / PC-STEL</b>，欧盟为 <b>8h TWA / STEL</b>），系统按<b>长期 / 短期 / 上限</b>三个语义槽位对齐类型名，但<b>只对齐语义、不换算数值</b>；同一 CAS 在不同来源、不同版本中的记录<b>并存</b>，由业务按目标市场选用对应数据集版本。'
};

/* 语义槽位：把各体系自定义的限值类型名映射到统一的三个槽位
   ⚠️ 只做语义对齐，不换算数值、不判断严格性 */
var OEL_KINDS=[
  {key:'LT',label:'长期',full:'长期限值',desc:'按 8 小时时间加权平均计的长期接触限值'},
  {key:'ST',label:'短期',full:'短期限值',desc:'按 15 分钟时间加权平均计的短期接触限值'},
  {key:'CEIL',label:'上限',full:'上限值',desc:'一个工作日内任何时间、任何工作地点均不得超过的上限值'}
];
var OEL_KIND_DICT=[
  {rg:'中国',src:'GBZ 2.1-2019',type:'MAC',kind:'CEIL',note:'最高容许浓度：任何时点不得超过'},
  {rg:'中国',src:'GBZ 2.1-2019',type:'PC-TWA',kind:'LT',note:'时间加权平均容许浓度（8 h）'},
  {rg:'中国',src:'GBZ 2.1-2019',type:'PC-STEL',kind:'ST',note:'短时间接触容许浓度（15 min）'},
  {rg:'欧盟（EU）',src:'IOELV 清单',type:'8h TWA',kind:'LT',note:'8 小时时间加权平均限值'},
  {rg:'欧盟（EU）',src:'IOELV 清单',type:'STEL',kind:'ST',note:'15 分钟短时间接触限值'},
  {rg:'欧盟（EU）',src:'IOELV 清单',type:'—',kind:'—',note:'IOELV 清单未设上限型限值'}
];

/* ---------- 2. 数据来源（Tab 1） ---------- */
var OEL_SOURCES=[
  {rg:'欧盟（EU）',org:'欧盟委员会 · 就业、社会事务与包容总司（DG EMPL）',
   list:'指示性职业接触限值清单（IOELV）',
   law:'理事会指令 98/24/EC（化学剂指令）第 3 条 + 各 IOELV 指令（2000/39/EC、2006/15/EC、2009/161/EU、2017/164/EU、2019/1831/EU、(EU) 2022/431 等）',
   link:'eur-lex.europa.eu（EUR-Lex 官方公报）',fmt:'网页 + PDF',freq:'随指令修订（不定期，通常每年 1~2 批）',
   st:'维护中',check:'2026-09-05',due:'2026-12-31',
   note:'IOELV 为指示性限值，成员国可制定更严格的国家限值；欧盟另对致癌物 / 致突变物 / 生殖毒性物质设约束性职业接触限值（BOEL）。本公司仅覆盖欧盟与中国两个市场，故本页只维护这两套来源，其他国家级清单暂不建立。'},
  {rg:'中国',org:'国家卫生健康委员会（起草：中国疾控中心职业卫生与中毒控制所）',
   list:'GBZ 2.1-2019《工作场所有害因素职业接触限值 第 1 部分：化学有害因素》',
   law:'《职业病防治法》+ GBZ 2.1-2019 国家职业卫生标准',
   link:'nhc.gov.cn（国家卫生健康委员会）',fmt:'PDF（标准全文）',freq:'标准修订（不定期，修订周期通常 5 年以上）',
   st:'维护中',check:'2026-08-28',due:'2027-06-30',
   note:'含表 1 化学有害因素（358 条）与表 4 生物监测指标与职业接触生物限值；限值类型为 MAC / PC-TWA / PC-STEL，并附「皮 / 敏 / G1 等」标识。'}
];

/* ---------- 3. 数据集版本（Tab 2） ---------- */
var OEL_SETS=[
  {id:'DS-EU-2601',rg:'欧盟（EU）',name:'EU IOELV 指示性职业接触限值清单',ver:'V2026.1',
   pub:'2025-12-10',eff:'2026-01-01',exp:'—',pdf:'eu_ioelv_v2026_1_oj.pdf',xls:'eu_ioelv_v2026_1.xlsx',
   cnt:168,st:'已发布',owner:'质管-杨工',due:'2026-12-31',
   note:'含 (EU) 2022/431 新增的甲醛等条目；限值类型 8h TWA / STEL'},
  {id:'DS-CN-1901',rg:'中国',name:'GBZ 2.1-2019 化学有害因素职业接触限值',ver:'2019 版',
   pub:'2019-08-27',eff:'2020-04-01',exp:'—',pdf:'gbz2.1-2019.pdf',xls:'gbz2.1-2019_t1_t4.xlsx',
   cnt:358,st:'已发布',owner:'质管-郭工',due:'2027-06-30',
   note:'表 1 化学有害因素 358 条 + 表 4 生物监测指标；本页限值明细仅收录表 1 节选'},
  {id:'DS-EU-2701',rg:'欧盟（EU）',name:'EU IOELV 指示性职业接触限值清单',ver:'V2027.1',
   pub:'2026-09-15',eff:'待定',exp:'—',pdf:'eu_ioelv_v2027_1_oj.pdf',xls:'eu_ioelv_v2027_1.xlsx',
   cnt:172,st:'待审核',owner:'质管-杨工',due:'2026-12-31',
   note:'已按官方草案整理 172 条（新增乙苯、撤回 2-乙氧基乙醇等）；生效日期待官方公报确认'},
  {id:'DS-CN-2601',rg:'中国',name:'GBZ 2.1 修订版（送审稿）',ver:'2026 送审稿',
   pub:'2026-08-25',eff:'待定',exp:'—',pdf:'gbz2.1_rev_draft.pdf',xls:'gbz2.1_rev_draft_t1.xlsx',
   cnt:361,st:'待审核',owner:'质管-郭工',due:'2027-06-30',
   note:'新增 3 条化学有害因素；部分限值拟收紧（正式发布前不作为合规依据）'},
  {id:'DS-EU-2501',rg:'欧盟（EU）',name:'EU IOELV 指示性职业接触限值清单',ver:'V2025.1',
   pub:'2024-12-05',eff:'2025-01-01',exp:'2025-12-31',pdf:'eu_ioelv_v2025_1_oj.pdf',xls:'eu_ioelv_v2025_1.xlsx',
   cnt:161,st:'已失效',owner:'质管-杨工',due:'',
   note:'已被 V2026.1 替代，保留历史版本用于版本对比与追溯'},
  {id:'DS-CN-2701',rg:'中国',name:'GBZ 2.1 下一次修订',ver:'2027 版',
   pub:'待发布',eff:'待定',exp:'—',pdf:'—',xls:'—',
   cnt:0,st:'草稿',owner:'质管-郭工',due:'',
   note:'等待 GBZ 2.1 修订版正式发布后录入'}
];

/* ---------- 4. 限值明细（Tab 3）
   同一 CAS 在多个来源 / 多个版本中并存，互不覆盖
   限值类型：'TWA + STEL'（欧盟 IOELV）| 'PC-TWA + PC-STEL' | 'MAC'（中国 GBZ 2.1）
   语义槽位由数值列推导：TWA → 长期、STEL → 短期、Ceiling → 上限，仅做类型对齐 ---------- */
var OEL_LIMITS=[
  {id:'L01',set:'DS-EU-2601',setTxt:'EU·IOELV V2026.1',rg:'欧盟（EU）',cas:'108-88-3',ec:'203-625-9',name:'甲苯',
   type:'TWA + STEL',twa:'192',stel:'384',ceil:'—',unit:'mg/m³',skin:'是',sens:'—',
   bio:'是 · 尿中马尿酸（工作班末）',other:'—',scope:'工作场所空气 · 全行业',eff:'2026-01-01',st:'已发布',
   fn:'原文以 ppm 表述（50 / 100 ppm），按 20 ℃、101.3 kPa 换算为 mg/m³；皮：可经皮肤吸收'},
  {id:'L02',set:'DS-EU-2601',setTxt:'EU·IOELV V2026.1',rg:'欧盟（EU）',cas:'1330-20-7',ec:'215-535-7',name:'二甲苯（全部异构体）',
   type:'TWA + STEL',twa:'221',stel:'442',ceil:'—',unit:'mg/m³',skin:'是',sens:'—',
   bio:'—',other:'—',scope:'工作场所空气 · 全行业',eff:'2026-01-01',st:'已发布',
   fn:'原文 50 / 100 ppm；欧盟按全部异构体合计管控，不逐异构体分别设限'},
  {id:'L03',set:'DS-EU-2601',setTxt:'EU·IOELV V2026.1',rg:'欧盟（EU）',cas:'50-00-0',ec:'200-001-8',name:'甲醛',
   type:'TWA + STEL',twa:'0.37',stel:'0.74',ceil:'—',unit:'mg/m³',skin:'是',sens:'是',
   bio:'—',other:'—',scope:'工作场所空气 · 全行业',eff:'2026-01-01',st:'已发布',
   fn:'原文 0.3 / 0.6 ppm；经 (EU) 2022/431 新增，附皮肤与致敏标记'},
  {id:'L04',set:'DS-EU-2601',setTxt:'EU·IOELV V2026.1',rg:'欧盟（EU）',cas:'67-64-1',ec:'200-662-2',name:'丙酮',
   type:'TWA + STEL',twa:'1210',stel:'2420',ceil:'—',unit:'mg/m³',skin:'—',sens:'—',
   bio:'—',other:'—',scope:'工作场所空气 · 全行业',eff:'2026-01-01',st:'已发布',
   fn:'原文 500 / 1000 ppm'},
  {id:'L05',set:'DS-EU-2601',setTxt:'EU·IOELV V2026.1',rg:'欧盟（EU）',cas:'67-56-1',ec:'200-659-6',name:'甲醇',
   type:'TWA + STEL',twa:'266',stel:'333',ceil:'—',unit:'mg/m³',skin:'是',sens:'—',
   bio:'—',other:'—',scope:'工作场所空气 · 全行业',eff:'2026-01-01',st:'已发布',
   fn:'原文 200 / 250 ppm；皮：可经皮肤吸收'},

  {id:'L06',set:'DS-EU-2501',setTxt:'EU·IOELV V2025.1',rg:'欧盟（EU）',cas:'108-88-3',ec:'203-625-9',name:'甲苯',
   type:'TWA + STEL',twa:'192',stel:'384',ceil:'—',unit:'mg/m³',skin:'是',sens:'—',
   bio:'—',other:'—',scope:'工作场所空气 · 全行业',eff:'2025-01-01',st:'已失效',
   fn:'原文 50 / 100 ppm；该版本已失效，保留用于版本对比与追溯（与 V2026.1 的记录并存）'},
  {id:'L07',set:'DS-EU-2501',setTxt:'EU·IOELV V2025.1',rg:'欧盟（EU）',cas:'1330-20-7',ec:'215-535-7',name:'二甲苯（全部异构体）',
   type:'TWA + STEL',twa:'221',stel:'442',ceil:'—',unit:'mg/m³',skin:'是',sens:'—',
   bio:'—',other:'—',scope:'工作场所空气 · 全行业',eff:'2025-01-01',st:'已失效',
   fn:'原文 50 / 100 ppm；该版本已失效，保留用于版本对比与追溯'},
  {id:'L08',set:'DS-EU-2501',setTxt:'EU·IOELV V2025.1',rg:'欧盟（EU）',cas:'67-56-1',ec:'200-659-6',name:'甲醇',
   type:'TWA + STEL',twa:'266',stel:'333',ceil:'—',unit:'mg/m³',skin:'是',sens:'—',
   bio:'—',other:'—',scope:'工作场所空气 · 全行业',eff:'2025-01-01',st:'已失效',
   fn:'原文 200 / 250 ppm；该版本已失效；V2027.1 草案拟下调其 8h TWA'},

  {id:'L09',set:'DS-CN-1901',setTxt:'CN·GBZ 2.1-2019',rg:'中国',cas:'71-43-2',ec:'200-753-7',name:'苯',
   type:'PC-TWA + PC-STEL',twa:'6',stel:'10',ceil:'—',unit:'mg/m³',skin:'是',sens:'—',
   bio:'是 · 尿中苯巯基尿酸（工作班后）；尿中反-反式粘糠酸（工作班后）',other:'G1（对人致癌）',
   scope:'工作场所空气 · 全行业',eff:'2020-04-01',st:'已发布',
   fn:'GBZ 2.1-2019 表 1 第 12 项；备注：皮、G1'},
  {id:'L10',set:'DS-CN-1901',setTxt:'CN·GBZ 2.1-2019',rg:'中国',cas:'108-88-3',ec:'203-625-9',name:'甲苯',
   type:'PC-TWA + PC-STEL',twa:'50',stel:'100',ceil:'—',unit:'mg/m³',skin:'是',sens:'—',
   bio:'是 · 尿中马尿酸（工作班末）',other:'—',scope:'工作场所空气 · 全行业',eff:'2020-04-01',st:'已发布',
   fn:'GBZ 2.1-2019 表 1 第 136 项；备注：皮'},
  {id:'L11',set:'DS-CN-1901',setTxt:'CN·GBZ 2.1-2019',rg:'中国',cas:'1330-20-7',ec:'215-535-7',name:'二甲苯（全部异构体）',
   type:'PC-TWA + PC-STEL',twa:'50',stel:'100',ceil:'—',unit:'mg/m³',skin:'—',sens:'—',
   bio:'是 · 尿中甲基马尿酸（工作班末）',other:'—',scope:'工作场所空气 · 全行业',eff:'2020-04-01',st:'已发布',
   fn:'GBZ 2.1-2019 表 1 第 69 项；按全部异构体计'},
  {id:'L12',set:'DS-CN-1901',setTxt:'CN·GBZ 2.1-2019',rg:'中国',cas:'50-00-0',ec:'200-001-8',name:'甲醛',
   type:'MAC',twa:'—',stel:'—',ceil:'0.5',unit:'mg/m³',skin:'—',sens:'是',
   bio:'—',other:'G1（对人致癌）',scope:'工作场所空气 · 全行业',eff:'2020-04-01',st:'已发布',
   fn:'GBZ 2.1-2019 表 1 第 149 项；MAC：一个工作日内任何时间、任何工作地点均不得超过；备注：敏、G1'},
  {id:'L13',set:'DS-CN-1901',setTxt:'CN·GBZ 2.1-2019',rg:'中国',cas:'67-64-1',ec:'200-662-2',name:'丙酮',
   type:'PC-TWA + PC-STEL',twa:'300',stel:'450',ceil:'—',unit:'mg/m³',skin:'—',sens:'—',
   bio:'是 · 尿中丙酮（工作班末）',other:'—',scope:'工作场所空气 · 全行业',eff:'2020-04-01',st:'已发布',
   fn:'GBZ 2.1-2019 表 1 第 21 项'},
  {id:'L14',set:'DS-CN-1901',setTxt:'CN·GBZ 2.1-2019',rg:'中国',cas:'110-54-3',ec:'203-777-6',name:'正己烷',
   type:'PC-TWA + PC-STEL',twa:'100',stel:'180',ceil:'—',unit:'mg/m³',skin:'是',sens:'—',
   bio:'是 · 尿中 2,5-己二酮（工作班后）',other:'—',scope:'工作场所空气 · 全行业',eff:'2020-04-01',st:'已发布',
   fn:'GBZ 2.1-2019 表 1 第 358 项；备注：皮'},
  {id:'L15',set:'DS-CN-1901',setTxt:'CN·GBZ 2.1-2019',rg:'中国',cas:'79-01-6',ec:'201-167-4',name:'三氯乙烯',
   type:'PC-TWA + PC-STEL',twa:'30',stel:'—',ceil:'—',unit:'mg/m³',skin:'是',sens:'是',
   bio:'是 · 尿中三氯乙酸（工作周末的班末）',other:'G1（对人致癌）',scope:'工作场所空气 · 全行业',eff:'2020-04-01',st:'已发布',
   fn:'GBZ 2.1-2019 表 1 第 251 项；未制定 PC-STEL，按 PC-TWA 的倍值控制瞬时接触；备注：皮、敏、G1'},

  {id:'L16',set:'DS-CN-2601',setTxt:'CN·GBZ 2.1 2026 送审稿',rg:'中国',cas:'71-43-2',ec:'200-753-7',name:'苯',
   type:'PC-TWA + PC-STEL',twa:'3',stel:'10',ceil:'—',unit:'mg/m³',skin:'是',sens:'—',
   bio:'是 · 尿中苯巯基尿酸（工作班后）',other:'G1（对人致癌）',scope:'工作场所空气 · 全行业',eff:'待定',st:'待审核',
   fn:'送审稿拟将 PC-TWA 由 6 收紧为 3 mg/m³；正式发布前不作为合规依据'}
];

/* ---------- 5. 版本对比与审核（Tab 4，演示样例数据） ---------- */
var OEL_CMP={
  A:{rg:'欧盟（EU）',title:'EU IOELV V2026.1 → V2027.1',base:'DS-EU-2601',tgt:'DS-EU-2701',
     st:'待审核',owner:'质管-杨工',src:'欧盟委员会 IOELV 指令修订（演示样例）'},
  B:{rg:'中国',title:'GBZ 2.1-2019 → 2026 送审稿',base:'DS-CN-1901',tgt:'DS-CN-2601',
     st:'待审核',owner:'质管-郭工',src:'国家职业卫生标准修订送审稿（演示样例）'}
};
/* kind = 该变更涉及的语义槽位：LT 长期 / ST 短期 / LT + ST 两者 / — 不涉及限值数值 */
var OEL_DIFFS=[
  {cmp:'A',tp:'数值变化',kind:'LT',cas:'67-56-1',name:'甲醇',field:'8h TWA',old:'266 mg/m³',new:'250 mg/m³',
   note:'长期限值下调 16 mg/m³；STEL 保持 333 mg/m³ 不变',st:'待审核'},
  {cmp:'A',tp:'单位变化',kind:'—',cas:'67-64-1',name:'丙酮',field:'限值表述单位',old:'mg/m³（原文另附 ppm）',new:'mg/m³',
   note:'仅为表述口径统一（ppm → mg/m³），数值未变',st:'待审核'},
  {cmp:'A',tp:'标记变化',kind:'—',cas:'67-64-1',name:'丙酮',field:'生物监测标记',old:'—',new:'尿中丙酮（工作班末）',
   note:'新增生物监测标记，同步更新至限值明细',st:'待审核'},
  {cmp:'A',tp:'新增物质',kind:'LT + ST',cas:'100-41-4',name:'乙苯',field:'全部字段',old:'—',new:'8h TWA 87 mg/m³ / STEL 442 mg/m³',
   note:'新增物质条目及其长期、短期限值',st:'待审核'},
  {cmp:'A',tp:'删除物质',kind:'LT',cas:'110-80-5',name:'2-乙氧基乙醇',field:'全部字段',old:'8h TWA 18 mg/m³',new:'—',
   note:'官方撤回该限值，改由企业自行制定；历史版本记录保留可追溯',st:'待审核'},
  {cmp:'A',tp:'备注或适用范围变化',kind:'LT',cas:'50-00-0',name:'甲醛',field:'适用范围说明',old:'原文无说明',new:'新增育龄女职工保护提示',
   note:'限值数值未变，仅补充适用范围说明',st:'待审核'},
  {cmp:'B',tp:'数值变化',kind:'LT',cas:'71-43-2',name:'苯',field:'PC-TWA',old:'6 mg/m³',new:'3 mg/m³',
   note:'拟收紧；PC-STEL 保持 10 mg/m³ 不变',st:'待审核'},
  {cmp:'B',tp:'标记变化',kind:'—',cas:'67-66-3',name:'三氯甲烷',field:'致癌性标识',old:'—',new:'G1（对人致癌）',
   note:'补充致癌性标识',st:'待审核'},
  {cmp:'B',tp:'新增物质',kind:'LT',cas:'—',name:'新增化学有害因素条目（物质名称以正式发布稿为准）',field:'全部字段',
   old:'—',new:'PC-TWA 5 mg/m³',note:'送审稿新增条目，正式发布前不作为合规依据',st:'待审核'},
  {cmp:'B',tp:'备注或适用范围变化',kind:'LT',cas:'110-54-3',name:'正己烷',field:'适用范围',old:'通用',new:'新增电子 / 制鞋行业清洗岗位提示',
   note:'限值数值未变，补充行业适用提示',st:'待审核'}
];
var OEL_DIFF_TYPES=['新增物质','删除物质','数值变化','单位变化','标记变化','备注或适用范围变化'];

/* ---------- 6. 数据校验规则与演示结果（导入向导第 5 步） ---------- */
var OEL_CHECK_RULES=['CAS 格式错误','物质名称缺失','数值存在但单位缺失','同一数据集内重复记录',
  '生效日期冲突','无法识别的物质标记','与上一版本相比发生重大变化'];
var OEL_CHECKS=[
  {lv:'阻断',tp:'CAS 格式错误',cnt:2,eg:'第 41 行 CAS「108-88-30」（9 位，不符合 2-3-1 分段格式）',
   fix:'按 CAS 分段规则重新校验，修正后重新上传',st:'待处理'},
  {lv:'阻断',tp:'同一数据集内重复记录',cnt:1,eg:'CAS 1330-20-7 在同一数据集内出现 2 次（第 12 / 88 行）',
   fix:'确认保留口径后合并为 1 条，避免同版本内自相矛盾',st:'待处理'},
  {lv:'告警',tp:'物质名称缺失',cnt:1,eg:'第 63 行仅有 CAS 与限值，物质名称列为空',
   fix:'补全物质名称，或标注「以 CAS 为准」',st:'待处理'},
  {lv:'告警',tp:'数值存在但单位缺失',cnt:3,eg:'第 22 / 47 / 96 行填写了限值数值，数值单位列为空',
   fix:'补全单位（mg/m³ 或 ppm），避免换算歧义',st:'待处理'},
  {lv:'告警',tp:'生效日期冲突',cnt:1,eg:'第 15 行生效日期早于数据集发布日期（2026-03-01 / 2026-09-10）',
   fix:'核对官方生效日期，或改填「自发布之日起适用」',st:'待处理'},
  {lv:'告警',tp:'无法识别的物质标记',cnt:1,eg:'第 71 行标记列出现「皮/皮」，无法映射到「皮」「敏」等标准标记',
   fix:'按标记字典映射，未识别标记进入人工确认队列',st:'待处理'},
  {lv:'提示',tp:'与上一版本相比发生重大变化',cnt:2,eg:'第 33 行 PC-TWA 变化幅度 ≥ 50%（6 → 3 mg/m³）',
   fix:'变化幅度超阈值仅提示不阻断，须在版本对比中确认是否口径变化',st:'待处理'}
];
var OEL_CHECK_PASS=['必填列完整性（CAS / 物质名称 / 限值）校验通过','限值数值与单位映射校验通过','限值类型可映射到「长期 / 短期 / 上限」语义槽位'];

/* ---------- 7. 通用工具 ---------- */
function oelLamp(due){
  if(!due)return '<span class="ev ev-none"><i></i>未设置</span>';
  var d=daysTo(due);
  if(d<0)return '<span class="ev ev-red" title="最近检查已超期：'+due+'"><i></i>已超期</span>';
  if(d<60)return '<span class="ev ev-due" title="下次检查：'+due+'"><i></i>临近检查</span>';
  return '<span class="ev ev-green" title="下次检查：'+due+'"><i></i>正常</span>';
}
function oelSetCls(st){
  if(st==='已发布')return 'green';
  if(st==='待审核')return 'orange';
  if(st==='已失效')return 'red';
  return 'grey';
}
function oelSrcIdx(rg){for(var i=0;i<OEL_SOURCES.length;i++){if(OEL_SOURCES[i].rg===rg)return i;}return -1;}
function oelSetById(id){for(var i=0;i<OEL_SETS.length;i++){if(OEL_SETS[i].id===id)return OEL_SETS[i];}return null;}
function oelSetName(id){var s=oelSetById(id);return s?(s.rg+'·'+s.ver):id;}
function oelCount(field,val){return OEL_SETS.filter(function(s){return !field||s[field]===val;}).length;}
function oelUniqRg(){var a=[];OEL_SETS.forEach(function(s){if(a.indexOf(s.rg)<0)a.push(s.rg);});return a;}
function oelVal(v){return (v==='—'||v===''||v==null)?'<span class="muted">—</span>':esc(v);}
function oelLink(text){
  return '<a class="oel-link" onclick="toast(\'演示环境不跳转外部链接：'+text+'\',\'info\')" style="cursor:pointer">'+esc(text)+'</a>';
}

/* ---------- 8. 右侧详情抽屉 ---------- */
(function(){
  var mk=document.createElement('div');
  mk.id='oelDwMask';mk.className='exp-ai-mask';mk.style.display='none';
  mk.setAttribute('onclick','oelDrawerClose()');
  var p=document.createElement('div');
  p.id='oelDw';p.className='exp-ai-panel';
  p.setAttribute('onclick','event.stopPropagation()');
  mk.appendChild(p);
  document.body.appendChild(mk);
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&mk.style.display!=='none')oelDrawerClose();
  });
})();
function oelDrawer(title,body,foot){
  var mk=$('oelDwMask'),p=$('oelDw');if(!mk||!p)return;
  p.innerHTML='<div class="modal-hd"><h3>'+esc(title)+'</h3><button class="modal-x" onclick="oelDrawerClose()">✕</button></div>'+
    '<div class="modal-bd sds-scope law-page oel-page">'+body+'</div>'+
    (foot?'<div class="modal-ft">'+foot+'</div>':'');
  mk.style.display='flex';
}
function oelDrawerClose(){var mk=$('oelDwMask');if(mk)mk.style.display='none';}

/* ---------- 9. 页面骨架与 Tab 切换 ---------- */
var OEL_TABS=[
  {key:'src',label:'数据来源'},
  {key:'set',label:'数据集版本'},
  {key:'lim',label:'限值明细'},
  {key:'cmp',label:'版本对比与审核'}
];
var OEL_LIM_TYPES=['TWA + STEL','PC-TWA + PC-STEL','MAC'];
function oelKindLabel(k){for(var i=0;i<OEL_KINDS.length;i++){if(OEL_KINDS[i].key===k)return OEL_KINDS[i];}return null;}
function oelKinds(r){
  var a=[];
  if(r.twa&&r.twa!=='—')a.push('LT');
  if(r.stel&&r.stel!=='—')a.push('ST');
  if(r.ceil&&r.ceil!=='—')a.push('CEIL');
  return a;
}
function oelKindTag(k){
  var kk=oelKindLabel(k);if(!kk)return '<span class="muted">—</span>';
  var cls=k==='LT'?'blue':(k==='ST'?'orange':'red');
  return '<span class="tag '+cls+'">'+esc(kk.label)+'</span>';
}
function oelKindChips(r){
  var a=oelKinds(r);
  return a.length?a.map(function(k){return oelKindTag(k);}).join(' '):'<span class="muted">—</span>';
}
function oelKindText(txt){
  if(!txt||txt==='—')return '<span class="muted">—</span>';
  return txt.split(' + ').map(function(k){return oelKindTag(k);}).join(' ');
}
var _oelTab='src';
var _oelF={
  src:{kw:'',rg:''},
  set:{kw:'',rg:'',st:''},
  lim:{kw:'',rg:'',set:'',type:'',kind:''},
  cmp:{cmp:'A'}
};
var _oelP={src:1,set:1,lim:1,cmp:1};

function oelRender(){
  var rgN=oelUniqRg().length,pubN=oelCount('st','已发布'),pendN=oelCount('st','待审核');
  var failN=oelCount('st','已失效'),draftN=oelCount('st','草稿');
  $('pageHost').innerHTML='<div class="sds-scope law-page oel-page">'+
    sdsHead('oelTitle','职业接触限值（OEL）',
      '以「国家 / 地区的官方限值数据集版本」为单位维护：官方来源 → 数据集版本 → 限值明细 → 版本对比 → 审核发布',
      '<button class="btn" onclick="oelSrcNew()">新建数据来源</button>'+
      '<button class="btn primary" onclick="oelImport()">导入限值数据集</button>','','')+
    '<div class="kpi-row">'+
      '<div class="kpi"><span>已覆盖国家 / 地区</span><b>'+rgN+'</b><small>按已建数据集的国家 / 地区计</small></div>'+
      '<div class="kpi"><span>已发布数据集</span><b style="color:var(--green)">'+pubN+'</b><small>可作为合规依据</small></div>'+
      '<div class="kpi"><span>待审核版本</span><b style="color:var(--orange)">'+pendN+'</b><small>草稿 '+draftN+' · 已失效 '+failN+'</small></div>'+
      '<div class="kpi"><span>最近更新时间</span><b style="font-size:19px">'+esc(OEL_TOP.lastUpd)+'</b><small>维护责任人 '+esc(OEL_TOP.owner)+'</small></div>'+
    '</div>'+
    '<div class="oel-flow">'+
      '<div class="sf on"><span>1</span><b>官方来源</b><em>欧盟 / 中国官方清单</em></div>'+
      '<i>→</i>'+
      '<div class="sf"><span>2</span><b>数据集版本</b><em>整份清单为一个版本</em></div>'+
      '<i>→</i>'+
      '<div class="sf"><span>3</span><b>限值明细</b><em>多国多版本并存</em></div>'+
      '<i>→</i>'+
      '<div class="sf"><span>4</span><b>版本对比</b><em>变更逐条核对</em></div>'+
      '<i>→</i>'+
      '<div class="sf"><span>5</span><b>审核发布</b><em>人工审核后生效</em></div>'+
    '</div>'+
    '<div class="notice info" style="margin-bottom:12px"><div class="ni">i</div><div>'+OEL_TOP.note+'</div></div>'+
    '<div id="oelTabs" style="margin-bottom:12px"></div>'+
    '<div id="oelTabBody"></div>'+
    '<div class="notice grey" style="margin-top:14px"><div class="ni">§</div><div><b>本页边界（本期不实现）：</b>系统不自动从 PDF 中识别并直接发布数据；不自动判断哪套清单的限值更严格；不把两套市场的限值合并成一个值；不根据投放市场自动选择 OEL；不实现真实 AI 解析与法规网站监控。'+OEL_TOP.boundary+'「投放市场 → 有效法规版本 → SDS 第 8 节」的关联<b>后续统一实现</b>，本页只负责把限值数据按来源与版本维护清楚。</div></div>'+
    '</div>';
  $('oelTabs').appendChild(tabs(OEL_TABS,_oelTab,function(k){_oelTab=k;oelRenderTab();}));
  oelRenderTab();
}
/* 编程式切 Tab：重建页签条高亮 + 渲染 Tab 体 */
function oelGoTab(k){
  _oelTab=k;
  var host=$('oelTabs');
  if(host){host.innerHTML='';host.appendChild(tabs(OEL_TABS,_oelTab,function(kk){_oelTab=kk;oelRenderTab();}));}
  oelRenderTab();
}
/* 跳到限值明细并按数据集筛选 */
function oelToLim(setId){_oelF.lim={kw:'',rg:'',set:setId,type:''};_oelP.lim=1;oelGoTab('lim');}
/* 跳到版本对比并选中对应对比会话 */
function oelToCmp(targetSetId){
  var key='A';
  Object.keys(OEL_CMP).forEach(function(k){if(OEL_CMP[k].tgt===targetSetId)key=k;});
  _oelF.cmp={cmp:key};oelGoTab('cmp');
}

function oelRenderTab(){
  var h='';
  if(_oelTab==='src'){
    var f1=_oelF.src;
    h+='<div class="card"><div class="toolbar" style="flex-wrap:wrap">'+
      '<div class="search" style="width:280px"><i class="si">⌕</i><input id="oelSrcKw" placeholder="国家 / 地区 · 发布机构 · 官方清单名称…" value="'+esc(f1.kw)+'" oninput="oelFill()"></div>'+
      '<select class="ctrl" id="oelSrcRg" style="width:170px" onchange="oelFill()"><option value="">全部国家 / 地区</option>'+
        OEL_SOURCES.map(function(s){return '<option'+(f1.rg===s.rg?' selected':'')+'>'+esc(s.rg)+'</option>';}).join('')+'</select>'+
      '<div class="grow"></div><span id="oelCnt" class="muted" style="font-size:12.5px"></span></div>'+
      '<div class="tbl-wrap"><table class="tbl" id="oelTable" style="min-width:1500px"></table></div>'+
      '<div class="pager" id="oelPager"></div></div>'+
      '<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div><b>原文格式决定维护方式：</b>本页两套来源的原文均为 <b>PDF / 网页</b>（欧盟 IOELV 见 EUR-Lex 公报、中国 GBZ 2.1 为标准全文），须由法规专员整理为结构化表后再导入；<b>本次不实现真实的 PDF / 网页解析</b>。每一套清单单独建立来源记录，欧盟与中国分别维护，不合并为一条。</div></div>';
  }else if(_oelTab==='set'){
    var f2=_oelF.set;
    h+='<div class="card"><div class="toolbar" style="flex-wrap:wrap">'+
      '<div class="search" style="width:270px"><i class="si">⌕</i><input id="oelSetKw" placeholder="数据集名称 / 版本号 / 附件名…" value="'+esc(f2.kw)+'" oninput="oelFill()"></div>'+
      '<select class="ctrl" id="oelSetRg" style="width:150px" onchange="oelFill()"><option value="">全部国家 / 地区</option>'+
        oelUniqRg().map(function(r){return '<option'+(f2.rg===r?' selected':'')+'>'+esc(r)+'</option>';}).join('')+'</select>'+
      '<select class="ctrl" id="oelSetSt" style="width:140px" onchange="oelFill()"><option value="">全部状态</option>'+
        ['草稿','待审核','已发布','已失效'].map(function(x){return '<option'+(f2.st===x?' selected':'')+'>'+x+'</option>';}).join('')+'</select>'+
      '<div class="grow"></div>'+
      '<button class="btn" onclick="oelImport()">上传结构化文件</button>'+
      '<button class="btn primary" onclick="toast(\'新建版本（演示）：请先在「导入限值数据集」中选择数据来源\',\'info\')">新建版本</button></div>'+
      '<div class="tbl-wrap"><table class="tbl" id="oelTable" style="min-width:1700px"></table></div>'+
      '<div class="pager" id="oelPager"></div></div>'+
      '<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div><b>以「完整清单版本」为单位维护：</b>一个数据集版本对应官方一次发布的全量清单，<b>不逐条新增 / 修改单个物质</b>。<b>原始 PDF 或网页存档与结构化 Excel 分开保存</b>（原文附件用于追溯，结构化附件用于入库）；发布前必须经人工审核，待审核版本不参与合规判断。</div></div>';
  }else if(_oelTab==='lim'){
    var f3=_oelF.lim;
    h+='<div class="card"><div class="toolbar" style="flex-wrap:wrap">'+
      '<div class="search" style="width:270px"><i class="si">⌕</i><input id="oelLimKw" placeholder="CAS 号 / EC 号 / 物质名称…" value="'+esc(f3.kw)+'" oninput="oelFill()"></div>'+
      '<select class="ctrl" id="oelLimRg" style="width:140px" onchange="oelFill()"><option value="">全部国家 / 地区</option>'+
        oelUniqRg().map(function(r){return '<option'+(f3.rg===r?' selected':'')+'>'+esc(r)+'</option>';}).join('')+'</select>'+
      '<select class="ctrl" id="oelLimSet" style="width:190px" onchange="oelFill()"><option value="">全部数据集版本</option>'+
        OEL_SETS.map(function(s){return '<option value="'+esc(s.id)+'"'+(f3.set===s.id?' selected':'')+'>'+esc(s.rg+'·'+s.ver)+'</option>';}).join('')+'</select>'+
      '<select class="ctrl" id="oelLimType" style="width:180px" onchange="oelFill()"><option value="">全部限值类型</option>'+
        OEL_LIM_TYPES.map(function(x){return '<option'+(f3.type===x?' selected':'')+'>'+x+'</option>';}).join('')+'</select>'+
      '<select class="ctrl" id="oelLimKind" style="width:170px" onchange="oelFill()"><option value="">全部语义槽位</option>'+
        OEL_KINDS.map(function(k){return '<option value="'+k.key+'"'+(f3.kind===k.key?' selected':'')+'>'+esc(k.label)+'（'+esc(k.full)+'）</option>';}).join('')+'</select>'+
      '<button class="btn" onclick="oelKindDrawer()">限值类型字典</button>'+
      '<div class="grow"></div><span id="oelCnt" class="muted" style="font-size:12.5px"></span></div>'+
      '<div class="tbl-wrap"><table class="tbl" id="oelTable" style="min-width:2140px"></table></div>'+
      '<div class="pager" id="oelPager"></div></div>'+
      '<div class="notice warn" style="margin-top:12px"><div class="ni">!</div><div><b>同一 CAS 在不同来源、不同版本中的记录必须同时存在，不能互相覆盖。</b>系统<b>不合并、不排序、不判断</b>哪套限值更严格，也不把两套限值折算成一个值；每条记录都带所属数据集版本与生效日期，可追溯到官方来源。</div></div>'+
      '<div class="notice grey" style="margin-top:10px"><div class="ni">§</div><div><b>限值类型口径不同，比对前须先确认口径：</b>中国为 <b>MAC</b>（任何时点不得超过）/ <b>PC-TWA</b>（8h 时间加权平均）/ <b>PC-STEL</b>（15 min 短时间接触）；欧盟 IOELV 为 <b>8h TWA / STEL</b>。系统把两套类型名映射到<b>长期 / 短期 / 上限</b>三个<b>语义槽位</b>（见「限值类型字典」），仅用于按槽位筛选与对齐，<b>只对齐语义、不换算数值</b>。</div></div>';
  }else{
    var f4=_oelF.cmp,c=OEL_CMP[f4.cmp]||OEL_CMP.A;
    var rows=OEL_DIFFS.filter(function(r){return r.cmp===f4.cmp;});
    var cnts={};
    OEL_DIFF_TYPES.forEach(function(t){cnts[t]=rows.filter(function(r){return r.tp===t;}).length;});
    h+='<div class="notice warn" style="margin-bottom:12px"><div class="ni">!</div><div><b>本 Tab 的对比结果为演示样例数据：</b>对比基准版本与目标版本（欧盟 IOELV V2026.1 → V2027.1 / 中国 GBZ 2.1-2019 → 2026 送审稿）为构造的演示数据，不是真实发布的官方版本；正式版中，对比结果在导入数据集时由系统自动生成。'+
      '法规版本变化<b>不自动生效</b>，必须经法规专员审核后发布。</div></div>'+
      '<div class="law-strip">'+
      '<span class="it"><em>对比会话</em><b>'+esc(c.title)+'</b></span>'+
      '<span class="it"><em>国家 / 地区</em><b>'+esc(c.rg)+'</b></span>'+
      '<span class="it"><em>变更条数</em><b>'+rows.length+' 条</b></span>'+
      '<span class="it"><em>审核状态</em><b>待审核 '+oelLamp('2026-10-01')+'</b></span>'+
      '<span class="it"><em>维护责任人</em><b>'+esc(c.owner)+'</b></span>'+
      '<span class="it src"><em>对比基准</em><b>'+esc(c.src)+' ｜ 示例</b></span>'+
      '</div>'+
      '<div class="card"><div class="toolbar" style="flex-wrap:wrap">'+
      '<select class="ctrl" id="oelCmpSel" style="width:300px" onchange="oelCmpSwitch(this.value)">'+
        Object.keys(OEL_CMP).map(function(k){return '<option value="'+k+'"'+(f4.cmp===k?' selected':'')+'>'+esc(OEL_CMP[k].rg+'：'+OEL_CMP[k].title)+'</option>';}).join('')+'</select>'+
      '<select class="ctrl" id="oelCmpTp" style="width:180px" onchange="oelCmpFilter()"><option value="">全部变更类型</option>'+
        OEL_DIFF_TYPES.map(function(x){return '<option>'+x+'</option>';}).join('')+'</select>'+
      '<div class="grow"></div><span id="oelCnt" class="muted" style="font-size:12.5px"></span></div>'+
      '<div class="oel-diffbar">'+OEL_DIFF_TYPES.map(function(t){
        return '<span class="dt"><em>'+esc(t)+'</em><b'+(cnts[t]?'':' class="zero"')+'>'+cnts[t]+'</b></span>';
      }).join('')+'</div>'+
      '<div class="tbl-wrap"><table class="tbl" id="oelTable" style="min-width:1660px"></table></div>'+
      '<div class="pager" id="oelPager"></div></div>'+
      '<div class="card" style="padding:14px 18px;margin-top:12px"><div class="toolbar" style="flex-wrap:wrap;gap:10px">'+
      '<b style="font-size:13.5px">审核结论（针对 '+esc(c.title)+'）</b>'+
      '<div class="grow"></div>'+
      '<button class="btn" onclick="oelCmpDetail(0)">查看变更详情</button>'+
      '<button class="btn" onclick="oelCmpReject()">退回修改</button>'+
      '<button class="btn primary" onclick="oelCmpApprove()">审核通过并发布新版本</button></div>'+
      '<div class="muted" style="font-size:12.5px;margin-top:8px">审核通过后目标数据集状态改为「已发布」并记录生效日期；退回修改则回到「草稿」，须重新提交。<b>系统不自动判断变更是否可接受，结论由法规专员给出。</b></div></div>';
  }
  $('oelTabBody').innerHTML=h;
  oelFill();
}

/* 通用表格渲染（cols: [标题,宽度]，rowHtml 生成行） */
function oelTable(cols,rows,rowHtml,actsW){
  var host=$('oelTable');if(!host)return;
  var cnt=$('oelCnt');if(cnt)cnt.textContent='共 '+rows.length+' 条记录';
  var tp=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
  if(_oelP[_oelTab]>tp)_oelP[_oelTab]=tp;
  var pg=rows.slice((_oelP[_oelTab]-1)*PAGE_SIZE,_oelP[_oelTab]*PAGE_SIZE);
  host.innerHTML='<thead><tr>'+cols.map(function(c){return '<th style="width:'+c[1]+'px">'+esc(c[0])+'</th>';}).join('')+
    '<th style="width:'+(actsW||150)+'px">操作</th></tr></thead><tbody>'+
    (pg.length?pg.map(function(r){return rowHtml(r,rows.indexOf(r));}).join('')
      :'<tr><td colspan="'+(cols.length+1)+'" class="tbl-empty"><span class="big">⌕</span>没有匹配的记录</td></tr>')+'</tbody>';
  var pd=$('oelPager');
  if(pd)pd.innerHTML=tp>1?pagerHtml(rows.length,_oelP[_oelTab],tp,'oelPageGo'):'';
}
function oelPageGo(p){_oelP[_oelTab]=p;oelFill();}

var _oelCmpTp='';
function oelCmpSwitch(k){_oelF.cmp={cmp:k};_oelCmpTp='';oelRenderTab();}
function oelCmpFilter(){
  _oelCmpTp=$('oelCmpTp').value;
  oelFill();
}

function oelFill(){
  if(_oelTab==='src'){
    var kw=($('oelSrcKw').value||'').trim().toLowerCase(),rg=$('oelSrcRg').value;
    _oelF.src={kw:$('oelSrcKw').value,rg:rg};
    var rows=OEL_SOURCES.filter(function(r){
      if(rg&&r.rg!==rg)return false;
      return !kw||(r.rg+' '+r.org+' '+r.list+' '+r.law).toLowerCase().indexOf(kw)>=0;
    });
    oelTable([['国家 / 地区',130],['发布机构',240],['官方清单名称',220],['法律依据',300],['官方链接',210],
      ['原文格式',150],['更新频率',200],['维护状态',110],['最近检查时间',150]],rows,function(r){
      var si=oelSrcIdx(r.rg);
      return '<tr class="row-click" onclick="oelSrcDrawer('+si+')"><td><b>'+esc(r.rg)+'</b></td><td>'+esc(r.org)+'</td>'+
        '<td>'+esc(r.list)+'</td><td>'+esc(r.law)+'</td><td>'+oelLink(r.link)+'</td>'+
        '<td>'+esc(r.fmt)+'</td><td>'+esc(r.freq)+'</td>'+
        '<td><span class="tag '+(r.st==='维护中'?'green':(r.st==='待复核'?'orange':'grey'))+' dot-tag">'+esc(r.st)+'</span></td>'+
        '<td>'+esc(r.check)+' '+oelLamp(r.due)+'</td>'+
        '<td class="acts"><button class="btn-link" onclick="event.stopPropagation();oelSrcDrawer('+si+')">详情</button>'+
        '<button class="btn-link" onclick="event.stopPropagation();oelToSetSrc(\''+esc(r.rg)+'\')">数据集版本</button></td></tr>';
    },190);
  }else if(_oelTab==='set'){
    var kw2=($('oelSetKw').value||'').trim().toLowerCase(),rg2=$('oelSetRg').value,st2=$('oelSetSt').value;
    _oelF.set={kw:$('oelSetKw').value,rg:rg2,st:st2};
    var rows2=OEL_SETS.filter(function(s){
      if(rg2&&s.rg!==rg2)return false;
      if(st2&&s.st!==st2)return false;
      return !kw2||(s.name+' '+s.ver+' '+s.pdf+' '+s.xls+' '+s.note).toLowerCase().indexOf(kw2)>=0;
    });
    oelTable([['数据集名称',240],['国家 / 地区',110],['版本号',130],['发布日期',110],['生效日期',110],['失效日期',110],
      ['原文附件',200],['结构化数据附件',210],['数据条数',100],['状态',100],['维护人',110],['版本说明',300]],rows2,function(s,i){
      return '<tr class="row-click" onclick="oelSetDrawer(\''+esc(s.id)+'\')"><td><b>'+esc(s.name)+'</b></td><td>'+esc(s.rg)+'</td>'+
        '<td class="mono">'+esc(s.ver)+'</td><td>'+esc(s.pub)+'</td><td>'+esc(s.eff)+'</td><td>'+oelVal(s.exp)+'</td>'+
        '<td class="mono">'+oelVal(s.pdf)+'</td><td class="mono">'+oelVal(s.xls)+'</td>'+
        '<td>'+(s.cnt?s.cnt:'<span class="muted">—</span>')+'</td>'+
        '<td><span class="tag '+oelSetCls(s.st)+' dot-tag">'+esc(s.st)+'</span></td>'+
        '<td>'+esc(s.owner)+'</td><td>'+esc(s.note)+'</td>'+
        '<td class="acts">'+
          '<button class="btn-link" onclick="event.stopPropagation();oelToLim(\''+esc(s.id)+'\')">查看明细</button>'+
          (OEL_CMP.A.tgt===s.id||OEL_CMP.B.tgt===s.id?'<button class="btn-link" onclick="event.stopPropagation();oelToCmp(\''+esc(s.id)+'\')">版本对比</button>':'')+
          (s.st==='草稿'?'<button class="btn-link" onclick="event.stopPropagation();oelSetSubmit(\''+esc(s.id)+'\')">提交审核</button>':'')+
          (s.st==='待审核'?'<button class="btn-link" onclick="event.stopPropagation();oelSetPublish(\''+esc(s.id)+'\')">发布</button>'+
            '<button class="btn-link del" onclick="event.stopPropagation();oelSetReject(\''+esc(s.id)+'\')">退回</button>':'')+
          '<button class="btn-link" onclick="event.stopPropagation();oelSetDrawer(\''+esc(s.id)+'\')">详情</button>'+
        '</td></tr>';
    },270);
  }else if(_oelTab==='lim'){
    var kw3=($('oelLimKw').value||'').trim().toLowerCase(),rg3=$('oelLimRg').value,set3=$('oelLimSet').value,ty3=$('oelLimType').value,kd3=$('oelLimKind').value;
    _oelF.lim={kw:$('oelLimKw').value,rg:rg3,set:set3,type:ty3,kind:kd3};
    var rows3=OEL_LIMITS.filter(function(r){
      if(rg3&&r.rg!==rg3)return false;
      if(set3&&r.set!==set3)return false;
      if(ty3&&r.type!==ty3)return false;
      if(kd3&&oelKinds(r).indexOf(kd3)<0)return false;
      return !kw3||(r.cas+' '+r.ec+' '+r.name+' '+r.fn+' '+r.scope).toLowerCase().indexOf(kw3)>=0;
    });
    oelTable([['所属数据集版本',190],['国家 / 地区',110],['CAS 号',110],['EC 号',110],['物质名称',200],
      ['限值类型',150],['语义槽位',130],['长期限值 TWA',120],['短期限值 STEL',120],['峰值 / Ceiling',130],['数值单位',100],
      ['皮肤标记',90],['致敏标记',90],['生物监测标记',260],['其他官方标记',150],['适用范围',200],
      ['原文备注或脚注',340],['生效日期',110],['数据状态',100]],rows3,function(r){
      return '<tr class="row-click" onclick="oelLimDrawer(\''+esc(r.id)+'\')">'+
        '<td class="mono">'+esc(r.setTxt)+'</td><td>'+esc(r.rg)+'</td>'+
        '<td class="mono">'+esc(r.cas)+'</td><td class="mono">'+esc(r.ec)+'</td>'+
        '<td><b>'+esc(r.name)+'</b></td><td><span class="tag grey">'+esc(r.type)+'</span></td>'+
        '<td>'+oelKindChips(r)+'</td>'+
        '<td'+(r.twa==='—'?'':' class="oel-num"')+'>'+oelVal(r.twa)+'</td>'+
        '<td'+(r.stel==='—'?'':' class="oel-num"')+'>'+oelVal(r.stel)+'</td>'+
        '<td'+(r.ceil==='—'?'':' class="oel-num"')+'>'+oelVal(r.ceil)+'</td>'+
        '<td>'+esc(r.unit)+'</td>'+
        '<td>'+(r.skin==='是'?'<span class="tag orange">是</span>':'<span class="muted">—</span>')+'</td>'+
        '<td>'+(r.sens==='是'?'<span class="tag orange">是</span>':'<span class="muted">—</span>')+'</td>'+
        '<td>'+(r.bio==='—'?'<span class="muted">—</span>':esc(r.bio))+'</td>'+
        '<td>'+(r.other==='—'?'<span class="muted">—</span>':esc(r.other))+'</td>'+
        '<td>'+esc(r.scope)+'</td><td>'+esc(r.fn)+'</td><td>'+esc(r.eff)+'</td>'+
        '<td><span class="tag '+oelSetCls(r.st)+' dot-tag">'+esc(r.st)+'</span></td>'+
        '<td class="acts"><button class="btn-link" onclick="event.stopPropagation();oelLimDrawer(\''+esc(r.id)+'\')">详情</button>'+
        '<button class="btn-link" onclick="event.stopPropagation();oelToLim(\''+esc(r.set)+'\')">同数据集</button></td></tr>';
    },170);
  }else{
    var f4=_oelF.cmp.cmp,rows4=OEL_DIFFS.filter(function(r){
      if(r.cmp!==f4)return false;
      if(_oelCmpTp&&r.tp!==_oelCmpTp)return false;
      return true;
    });
    oelTable([['变更类型',150],['CAS 号',110],['物质名称',240],['变更字段',170],['语义槽位',130],['变更前',220],['变更后',240],
      ['变化说明',420],['数据状态',100]],rows4,function(r,i){
      var cls=r.tp==='新增物质'?'green':(r.tp==='删除物质'?'red':(r.tp==='数值变化'?'orange':'blue'));
      return '<tr class="row-click" onclick="oelCmpDetailAt(\''+r.cmp+'\','+OEL_DIFFS.indexOf(r)+')">'+
        '<td><span class="tag '+cls+'">'+esc(r.tp)+'</span></td><td class="mono">'+esc(r.cas)+'</td>'+
        '<td><b>'+esc(r.name)+'</b></td><td>'+esc(r.field)+'</td>'+
        '<td>'+oelKindText(r.kind)+'</td>'+
        '<td class="oel-old">'+oelVal(r.old)+'</td><td class="oel-new">'+oelVal(r.new)+'</td>'+
        '<td>'+esc(r.note)+'</td><td><span class="tag orange dot-tag">'+esc(r.st)+'</span></td>'+
        '<td class="acts"><button class="btn-link" onclick="event.stopPropagation();oelCmpDetailAt(\''+r.cmp+'\','+OEL_DIFFS.indexOf(r)+')">查看变更详情</button></td></tr>';
    },170);
  }
}

/* ---------- 10. Tab1 数据来源：详情 / 新建 / 检查 ---------- */
function oelSrcDrawer(i){
  var r=OEL_SOURCES[i];if(!r)return;
  var sets=OEL_SETS.filter(function(s){return s.rg===r.rg;});
  var last=sets.slice().sort(function(a,b){return b.pub>a.pub?1:-1;})[0];
  oelDrawer('数据来源 · '+r.rg,
    lawStripHTML([
      ['国家 / 地区',r.rg],
      ['发布机构',r.org],
      ['原文格式',r.fmt],
      ['维护状态',r.st],
      ['最近检查时间',r.check],
      ['下次检查',r.due||'—'],
      ['来源清单数',sets.length+' 个版本']
    ])+
    '<dl class="desc-list" style="grid-template-columns:130px 1fr">'+
    '<dt>官方清单名称</dt><dd>'+esc(r.list)+'</dd>'+
    '<dt>法律依据</dt><dd>'+esc(r.law)+'</dd>'+
    '<dt>官方链接</dt><dd>'+oelLink(r.link)+'</dd>'+
    '<dt>更新频率</dt><dd>'+esc(r.freq)+'</dd>'+
    '<dt>已建版本数</dt><dd>'+sets.length+' 个（已发布 '+sets.filter(function(s){return s.st==='已发布';}).length+' · 待审核 '+sets.filter(function(s){return s.st==='待审核';}).length+' · 已失效 '+sets.filter(function(s){return s.st==='已失效';}).length+'）</dd>'+
    '<dt>最新版本</dt><dd class="mono">'+(last?esc(last.ver+'（'+last.pub+'）'):'—')+'</dd>'+
    '<dt>原文格式与维护方式</dt><dd>'+(r.fmt.indexOf('Excel')>=0
      ? '官方提供 Excel 限值表，可作为结构化数据来源直接导入，<b>仍须人工核对</b>后提交审核'
      : '官方仅有 PDF / 网页原文，须由法规专员<b>人工整理为结构化表</b>后导入（本期不实现真实解析）')+'</dd>'+
    '<dt>来源说明</dt><dd>'+esc(r.note)+'</dd>'+
    '</dl>'+
    '<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div>每套官方清单单独建立来源记录并<b>绑定国家 / 地区</b>；同一国家的不同清单（如欧盟 IOELV 与约束性限值 BOEL）应分别建来源，不合并。</div></div>',
    '<button class="btn" onclick="oelDrawerClose()">关闭</button>'+
    '<button class="btn" onclick="oelDrawerClose();oelSrcCheck('+i+')">登记本次检查</button>'+
    '<button class="btn primary" onclick="oelDrawerClose();oelToSetSrc(\''+esc(r.rg)+'\')">查看数据集版本 →</button>');
}
function oelToSetSrc(rg){_oelF.set={kw:'',rg:rg,st:''};_oelP.set=1;oelGoTab('set');}
function oelSrcCheck(i){
  var r=OEL_SOURCES[i];if(!r)return;
  r.check='2026-09-18';
  oelRender();
  toast('已登记「'+r.rg+'」本次检查时间（演示）：2026-09-18','ok');
}
function oelSrcNew(){
  openModal({title:'新建数据来源',width:680,cls:'sds-scope law-page oel-page',
    body:'<div class="form-grid">'+
      '<div class="field"><label class="req">国家 / 地区</label><input class="ctrl" id="oelNsRg" placeholder="例如：其他目标市场"></div>'+
      '<div class="field"><label class="req">发布机构</label><input class="ctrl" id="oelNsOrg" placeholder="例如：该国职业安全主管机构"></div>'+
      '<div class="field"><label class="req">官方清单名称</label><input class="ctrl" id="oelNsList" placeholder="例如：该国职业接触限值清单"></div>'+
      '<div class="field"><label>法律依据</label><input class="ctrl" id="oelNsLaw" placeholder="例如：该国职业安全卫生法规"></div>'+
      '<div class="field"><label>官方链接</label><input class="ctrl" id="oelNsLink" placeholder="例如：官方公报 / 标准发布平台"></div>'+
      '<div class="field"><label class="req">原文格式</label><select class="ctrl" id="oelNsFmt"><option>网页</option><option>PDF</option><option>Excel</option><option>网页 + PDF</option><option>PDF + Excel（官方随附限值表）</option></select></div>'+
      '<div class="field"><label class="req">更新频率</label><input class="ctrl" id="oelNsFreq" placeholder="例如：随部长令修订（不定期）"></div>'+
      '<div class="field"><label class="req">维护状态</label><select class="ctrl" id="oelNsSt"><option>维护中</option><option>待复核</option><option>已暂停</option></select></div>'+
      '<div class="field"><label class="req">最近检查时间</label><input class="ctrl" type="date" id="oelNsCheck" value="2026-09-18"></div>'+
      '<div class="field"><label>来源说明</label><input class="ctrl" id="oelNsNote" placeholder="限值类型 / 效力（约束性 or 指示性）等说明"></div></div>'+
      '<div class="notice grey" style="margin-top:4px"><div class="ni">§</div><div>来源登记后，须再走「导入限值数据集」建立第一个数据集版本，限值明细才有归属。数据来源与数据集版本<b>不合并</b>：来源记录官方出处，版本记录某一次发布的全量清单。</div></div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="oelSrcSave()">保存来源</button>'});
}
function oelSrcSave(){
  var rg=($('oelNsRg').value||'').trim(),org=($('oelNsOrg').value||'').trim(),list=($('oelNsList').value||'').trim();
  if(!rg||!org||!list){toast('请填写国家 / 地区、发布机构与官方清单名称','warn');return;}
  if(oelSrcIdx(rg)>=0){toast('该国家 / 地区已存在来源记录，同一来源不重复登记','warn');return;}
  OEL_SOURCES.push({rg:rg,org:org,list:list,law:$('oelNsLaw').value.trim()||'—',
    link:$('oelNsLink').value.trim()||'—',fmt:$('oelNsFmt').value,freq:$('oelNsFreq').value.trim()||'—',
    st:$('oelNsSt').value,check:$('oelNsCheck').value,due:'',
    note:$('oelNsNote').value.trim()||'待补充来源说明'});
  closeModal();_oelTab='src';oelRender();
  toast('数据来源已建立（演示）：'+rg+'，请继续导入限值数据集','ok');
}

/* ---------- 11. Tab2 数据集版本：详情 / 提交审核 / 发布 / 退回 ---------- */
function oelSetDrawer(id){
  var s=oelSetById(id);if(!s)return;
  var lims=OEL_LIMITS.filter(function(r){return r.set===id;});
  var isTgt=(OEL_CMP.A.tgt===id||OEL_CMP.B.tgt===id);
  oelDrawer('数据集版本 · '+s.rg+' '+s.ver,
    lawStripHTML([
      ['数据集名称',s.name],
      ['国家 / 地区',s.rg],
      ['版本号',s.ver],
      ['数据条数',s.cnt?String(s.cnt):'—'],
      ['状态',s.st],
      ['维护人',s.owner],
      ['生效日期',s.eff]
    ])+
    '<dl class="desc-list" style="grid-template-columns:140px 1fr">'+
    '<dt>发布日期</dt><dd>'+esc(s.pub)+'</dd>'+
    '<dt>生效日期</dt><dd>'+esc(s.eff)+'</dd>'+
    '<dt>失效日期</dt><dd>'+oelVal(s.exp)+'</dd>'+
    '<dt>原文附件</dt><dd class="mono">'+oelVal(s.pdf)+'<span class="muted" style="margin-left:8px">（原始 PDF / 网页存档，用于追溯）</span></dd>'+
    '<dt>结构化数据附件</dt><dd class="mono">'+oelVal(s.xls)+'<span class="muted" style="margin-left:8px">（入库用，与原文分开保存）</span></dd>'+
    '<dt>版本说明</dt><dd>'+esc(s.note)+'</dd>'+
    '<dt>本版本限值明细</dt><dd>'+(lims.length?('本页已收录 '+lims.length+' 条示例（全量 '+s.cnt+' 条）')
      :'<span class="muted">本页未收录示例明细（全量 '+s.cnt+' 条）</span>')+'</dd>'+
    '<dt>审核口径</dt><dd>'+(s.st==='已发布'?'已审核发布，可作为合规判断依据':'<b>未发布，不作为合规判断依据</b>；须经法规专员审核后发布')+'</dd>'+
    '</dl>'+
    '<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div>数据集版本以<b>官方一次发布的全量清单</b>为单位，不逐条维护单个物质；版本之间的差异在「导入限值数据集」的第 6 步自动比较，并在「版本对比与审核」中人工确认。</div></div>',
    '<button class="btn" onclick="oelDrawerClose()">关闭</button>'+
    (lims.length?'<button class="btn" onclick="oelDrawerClose();oelToLim(\''+esc(s.id)+'\')">查看明细</button>':'')+
    (isTgt?'<button class="btn" onclick="oelDrawerClose();oelToCmp(\''+esc(s.id)+'\')">版本对比</button>':'')+
    (s.st==='草稿'?'<button class="btn primary" onclick="oelDrawerClose();oelSetSubmit(\''+esc(s.id)+'\')">提交审核</button>':'')+
    (s.st==='待审核'?'<button class="btn primary" onclick="oelDrawerClose();oelSetPublish(\''+esc(s.id)+'\')">发布</button>':''));
}
function oelSetSubmit(id){
  var s=oelSetById(id);if(!s)return;
  s.st='待审核';oelRender();
  toast('已提交审核（演示）：'+s.rg+' '+s.ver,'ok');
}
function oelSetPublish(id){
  var s=oelSetById(id);if(!s)return;
  if(s.st!=='待审核'){toast('仅「待审核」版本可发布','warn');return;}
  s.st='已发布';s.eff=s.eff==='待定'?'2026-10-01':s.eff;
  oelRender();
  toast('已发布（演示）：'+s.rg+' '+s.ver+'，生效日期 '+s.eff,'ok');
}
function oelSetReject(id){
  var s=oelSetById(id);if(!s)return;
  s.st='草稿';
  OEL_DIFFS.forEach(function(r){if(r.cmp==='A'&&OEL_CMP.A.tgt===id)r.st='已退回';});
  OEL_DIFFS.forEach(function(r){if(r.cmp==='B'&&OEL_CMP.B.tgt===id)r.st='已退回';});
  oelRender();
  toast('已退回修改（演示）：'+s.rg+' '+s.ver+'，状态回到草稿','warn');
}

/* ---------- 11b. 限值类型字典 · 语义槽位对齐（只对齐语义，不换算数值） ---------- */
function oelKindAlign(r){
  var a=oelKinds(r);
  if(!a.length)return '<span class="muted">本行无数值型限值，未映射到语义槽位。</span>';
  var dict=OEL_KIND_DICT.filter(function(d){return d.rg===r.rg&&d.kind!=='—';});
  var parts=a.map(function(k){
    var hit=null;
    for(var i=0;i<dict.length;i++){if(dict[i].kind===k){hit=dict[i];break;}}
    return oelKindLabel(k).label+'（'+(hit?hit.type:'—')+'）';
  });
  return '本行映射到 '+parts.join(' · ')+'；槽位只用于<b>类型对齐与筛选</b>，系统<b>不换算数值、不判断哪套更严格</b>。';
}
function oelKindDrawer(){
  oelDrawer('限值类型字典 · 语义槽位对齐',
    '<div class="notice info" style="margin-bottom:12px"><div class="ni">i</div><div>本字典把各体系自定义的<b>限值类型名</b>映射到统一的三个<b>语义槽位</b>（长期 / 短期 / 上限），用于按槽位筛选与对齐。<b>只对齐语义：不改数值、不改单位、不生成新数值、不判断严格性。</b></div></div>'+
    '<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px"><table class="tbl"><thead><tr>'+
    '<th style="width:110px">国家 / 地区</th><th style="width:150px">来源清单</th><th style="width:140px">原文限值类型</th>'+
    '<th style="width:110px">语义槽位</th><th>说明</th></tr></thead><tbody>'+
    OEL_KIND_DICT.map(function(d){
      return '<tr><td><b>'+esc(d.rg)+'</b></td><td>'+esc(d.src)+'</td><td><span class="tag grey">'+esc(d.type)+'</span></td>'+
        '<td>'+(d.kind==='—'?'<span class="muted">—</span>':oelKindTag(d.kind))+'</td><td>'+esc(d.note)+'</td></tr>';
    }).join('')+'</tbody></table></div>'+
    '<div class="notice warn" style="margin-top:12px"><div class="ni">!</div><div><b>为什么不做数值归一：</b>把 ppm 换算 mg/m³ 需要温度 / 压力 / 分子量假设，把中国 MAC 与欧盟 STEL 折算成同一个数，更是两套法律体系之间的口径搬运——<b>演示原型不做，正式产品也须由业务口径决定</b>。</div></div>',
    '<button class="btn" onclick="oelDrawerClose()">关闭</button>');
}

/* ---------- 12. Tab3 限值明细：详情抽屉（含同 CAS 跨来源 / 版本对照） ---------- */
function oelLimDrawer(id){
  var r=OEL_LIMITS.filter(function(x){return x.id===id;})[0];if(!r)return;
  var others=OEL_LIMITS.filter(function(x){return x.cas===(r.cas)&&x.id!==r.id;});
  var s=oelSetById(r.set);
  oelDrawer('限值明细 · '+r.name,
    lawStripHTML([
      ['所属数据集版本',r.setTxt],
      ['国家 / 地区',r.rg],
      ['限值类型',r.type],
      ['生效日期',r.eff],
      ['数据状态',r.st],
      ['发布状态',s?s.st:'—'],
      ['数据来源',s?(s.rg+' '+s.ver):'—']
    ])+
    '<dl class="desc-list" style="grid-template-columns:130px 1fr 130px 1fr">'+
    '<dt>CAS 号</dt><dd class="mono">'+esc(r.cas)+'</dd><dt>EC 号</dt><dd class="mono">'+esc(r.ec)+'</dd>'+
    '<dt>物质名称</dt><dd>'+esc(r.name)+'</dd><dt>限值类型</dt><dd>'+esc(r.type)+'</dd>'+
    '<dt>语义槽位</dt><dd>'+oelKindChips(r)+'</dd>'+
    '<dt>槽位对齐说明</dt><dd style="grid-column:span 3">'+oelKindAlign(r)+'</dd>'+
    '<dt>长期限值 TWA</dt><dd>'+(r.twa==='—'?'<span class="muted">—</span>':'<b>'+esc(r.twa)+'</b> '+esc(r.unit))+'</dd>'+
    '<dt>短期限值 STEL</dt><dd>'+(r.stel==='—'?'<span class="muted">—</span>':'<b>'+esc(r.stel)+'</b> '+esc(r.unit))+'</dd>'+
    '<dt>峰值 / Ceiling</dt><dd>'+(r.ceil==='—'?'<span class="muted">—</span>':esc(r.ceil))+'</dd>'+
    '<dt>数值单位</dt><dd>'+esc(r.unit)+'</dd>'+
    '<dt>皮肤标记</dt><dd>'+(r.skin==='是'?'<span class="tag orange">皮 · 可经皮肤吸收</span>':'<span class="muted">—</span>')+'</dd>'+
    '<dt>致敏标记</dt><dd>'+(r.sens==='是'?'<span class="tag orange">敏 · 致敏作用</span>':'<span class="muted">—</span>')+'</dd>'+
    '<dt>生物监测标记</dt><dd>'+(r.bio==='—'?'<span class="muted">—</span>':esc(r.bio))+'</dd>'+
    '<dt>其他官方标记</dt><dd>'+(r.other==='—'?'<span class="muted">—</span>':esc(r.other))+'</dd>'+
    '<dt>适用范围</dt><dd>'+esc(r.scope)+'</dd>'+
    '<dt>原文备注或脚注</dt><dd style="grid-column:span 3">'+esc(r.fn)+'</dd>'+
    '<dt>生效日期</dt><dd>'+esc(r.eff)+'</dd><dt>数据状态</dt><dd><span class="tag '+oelSetCls(r.st)+' dot-tag">'+esc(r.st)+'</span></dd>'+
    '</dl>'+
    (others.length?'<div style="font-size:12.5px;font-weight:650;margin:14px 0 7px">同一 CAS 在其它来源 / 版本的记录（'+others.length+' 条，并存不覆盖）</div>'+
      '<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px"><table class="tbl"><thead><tr>'+
      '<th style="width:190px">数据集版本</th><th style="width:100px">国家 / 地区</th><th style="width:150px">限值类型</th>'+
      '<th style="width:130px">语义槽位</th>'+
      '<th style="width:110px">TWA / PC-TWA</th><th style="width:110px">STEL / PC-STEL</th><th style="width:120px">峰值 / Ceiling</th>'+
      '<th style="width:90px">单位</th><th style="width:110px">生效日期</th></tr></thead><tbody>'+
      others.map(function(o){
        return '<tr><td class="mono">'+esc(o.setTxt)+'</td><td>'+esc(o.rg)+'</td><td><span class="tag grey">'+esc(o.type)+'</span></td>'+
          '<td>'+oelKindChips(o)+'</td>'+
          '<td class="oel-num">'+oelVal(o.twa)+'</td><td class="oel-num">'+oelVal(o.stel)+'</td><td'+((o.ceil==='—')?'':' class="oel-num"')+'>'+oelVal(o.ceil)+'</td>'+
          '<td>'+esc(o.unit)+'</td><td>'+esc(o.eff)+'</td></tr>';
      }).join('')+'</tbody></table></div>'+
      '<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div>系统<b>不合并、不排序、不判断</b>上述限值哪条更严格，也不做单位换算后的比较：限值类型口径不同（MAC / PC-TWA / PC-STEL 与 8h TWA / STEL），须由业务按目标市场选用对应数据集版本。上表「语义槽位」列只做类型名对齐，可供按槽位比对，但<b>不代表可以直接比数值</b>。</div></div>'
      :'<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div>本页暂无该 CAS 在其它来源 / 版本的记录。</div></div>'),
    '<button class="btn" onclick="oelDrawerClose()">关闭</button>'+
    '<button class="btn primary" onclick="oelDrawerClose();oelToLim(\''+esc(r.set)+'\')">查看该数据集全部明细 →</button>');
}

/* ---------- 13. Tab4 版本对比：变更详情 / 审核动作 ---------- */
function oelCmpDetailAt(cmp,idx){
  var r=OEL_DIFFS[idx];if(!r||r.cmp!==cmp)return;
  oelCmpDetail(idx);
}
function oelCmpDetail(idx){
  var r=OEL_DIFFS[idx];if(!r)return;
  var c=OEL_CMP[r.cmp];
  oelDrawer('变更详情 · '+r.tp+'（'+r.name+'）',
    '<div class="law-strip">'+
    '<span class="it"><em>对比会话</em><b>'+esc(c.title)+'</b></span>'+
    '<span class="it"><em>基准版本</em><b>'+esc(oelSetName(c.base))+'</b></span>'+
    '<span class="it"><em>目标版本</em><b>'+esc(oelSetName(c.tgt))+'</b></span>'+
    '<span class="it"><em>变更类型</em><b>'+esc(r.tp)+'</b></span>'+
    '<span class="it"><em>审核状态</em><b>'+esc(r.st)+'</b></span>'+
    '<span class="it src"><em>数据来源</em><b>'+esc(c.src)+'</b></span>'+
    '</div>'+
    '<dl class="desc-list" style="grid-template-columns:130px 1fr">'+
    '<dt>CAS 号</dt><dd class="mono">'+esc(r.cas)+'</dd>'+
    '<dt>物质名称</dt><dd>'+esc(r.name)+'</dd>'+
    '<dt>变更字段</dt><dd>'+esc(r.field)+'</dd>'+
    '<dt>语义槽位</dt><dd>'+oelKindText(r.kind)+'</dd>'+
    '<dt>变更前</dt><dd class="oel-old">'+oelVal(r.old)+'</dd>'+
    '<dt>变更后</dt><dd class="oel-new">'+oelVal(r.new)+'</dd>'+
    '<dt>变化说明</dt><dd>'+esc(r.note)+'</dd>'+
    '<dt>法规出处</dt><dd>'+esc(c.src)+'（'+esc(c.rg)+' · 演示样例）</dd>'+
    '</dl>'+
    '<div class="notice warn" style="margin-top:12px"><div class="ni">!</div><div><b>本次不实现自动影响分析：</b>系统不自动判断该变更影响哪些组分、配方或已发布 SDS；也不自动得出「更严格 / 更宽松」的结论。变更生效需人工审核后发布，发布后按「投放市场 → 有效法规版本 → SDS 第 8 节」的关联逻辑在后续版本统一实现。</div></div>',
    '<button class="btn" onclick="oelDrawerClose()">关闭</button>'+
    '<button class="btn primary" onclick="oelDrawerClose();oelCmpApprove()">审核通过并发布新版本</button>');
}
function oelCmpApprove(){
  var c=OEL_CMP[_oelF.cmp.cmp]||OEL_CMP.A;
  var s=oelSetById(c.tgt);
  if(!s){toast('目标版本不存在','warn');return;}
  s.st='已发布';
  OEL_DIFFS.forEach(function(r){if(r.cmp===_oelF.cmp.cmp)r.st='已通过';});
  oelRender();
  toast('审核通过并发布（演示）：'+c.rg+' '+c.title+'，变更 '+OEL_DIFFS.filter(function(r){return r.cmp===_oelF.cmp.cmp;}).length+' 条已确认','ok');
}
function oelCmpReject(){
  var c=OEL_CMP[_oelF.cmp.cmp]||OEL_CMP.A;
  var s=oelSetById(c.tgt);
  if(s)s.st='草稿';
  OEL_DIFFS.forEach(function(r){if(r.cmp===_oelF.cmp.cmp)r.st='已退回';});
  oelRender();
  toast('已退回修改（演示）：'+c.rg+'，目标版本回到草稿状态','warn');
}

/* ---------- 14. 导入限值数据集 · 7 步静态演示向导 ---------- */
var _oelImp={};
function oelMini(n){
  var t=['选择数据来源','填写版本信息','上传附件','解析预览','数据校验','与上一版本比较','提交审核'];
  return '<div class="mini-steps oel-mini">'+t.map(function(x,i){
    var cls=i+1<n?'fin':(i+1===n?'on':'');
    return '<div class="mini-step '+cls+'"><span class="n">'+(i+1<n?'✓':(i+1))+'</span>'+x+'</div>'+(i<6?'<div class="mini-line '+(i+1<n?'fin':'')+'"></div>':'');
  }).join('')+'</div>';
}
function oelImport(){
  _oelImp={fix:{}};
  OEL_CHECKS.forEach(function(c,i){c.st='待处理';});
  openModal({title:'导入限值数据集 · 职业接触限值（OEL）',width:760,cls:'sds-scope law-page oel-page',body:oelImpHtml(1),footer:oelImpFoot(1)});
}
function oelCheckBlockN(){
  return OEL_CHECKS.filter(function(c){return c.lv==='阻断'&&c.st!=='已处理';})
    .reduce(function(a,c){return a+c.cnt;},0);
}
function oelImpHtml(n){
  if(n===1){
    return oelMini(1)+
      '<div class="form-grid">'+
      '<div class="field"><label class="req">数据来源（国家 / 地区）</label><select class="ctrl" id="oiSrc" onchange="oelImpSrcPick()">'+
        OEL_SOURCES.map(function(s,i){return '<option value="'+i+'"'+((_oelImp.srcIdx===i)?' selected':'')+'>'+esc(s.rg+' · '+s.list)+'</option>';}).join('')+'</select></div>'+
      '<div class="field"><label>发布机构</label><input class="ctrl" id="oiOrg" value="'+esc((OEL_SOURCES[0]||{}).org||'')+'" readonly></div>'+
      '<div class="field"><label>原文格式</label><input class="ctrl" id="oiFmt" value="'+esc((OEL_SOURCES[0]||{}).fmt||'')+'" readonly></div>'+
      '<div class="field"><label>法律依据</label><input class="ctrl" id="oiLaw" value="'+esc((OEL_SOURCES[0]||{}).law||'')+'" readonly></div></div>'+
      '<div class="notice grey" style="margin-top:4px"><div class="ni">§</div><div>先选数据来源，再建数据集版本。<b>来源与版本不合并</b>：来源记录官方出处与检查状态，版本记录某一次发布的全量清单。若来源列表中找不到对应清单，请先「新建数据来源」。</div></div>';
  }
  if(n===2){
    return oelMini(2)+
      '<div class="form-grid">'+
      '<div class="field"><label class="req">数据集名称</label><input class="ctrl" id="oiName" value="'+esc(_oelImp.name||((OEL_SOURCES[_oelImp.srcIdx||0]||{}).list||''))+'"></div>'+
      '<div class="field"><label class="req">版本号</label><input class="ctrl" id="oiVer" value="'+esc(_oelImp.ver||'')+'" placeholder="例如：V2026.3 / 2027 版"></div>'+
      '<div class="field"><label class="req">发布日期</label><input class="ctrl" type="date" id="oiPub" value="'+esc(_oelImp.pub||'2026-09-18')+'"></div>'+
      '<div class="field"><label class="req">生效日期</label><input class="ctrl" type="date" id="oiEff" value="'+esc(_oelImp.eff||'2026-10-01')+'"></div>'+
      '<div class="field"><label>失效日期</label><input class="ctrl" type="date" id="oiExp" value="'+esc(_oelImp.exp||'')+'"></div>'+
      '<div class="field"><label class="req">维护人</label><input class="ctrl" id="oiOwner" value="'+esc(OEL_TOP.owner)+'"></div>'+
      '<div class="field span2"><label>版本说明</label><input class="ctrl" id="oiNote" placeholder="例如：新增 6 条物质 8h TWA；4 条调整数值"></div></div>'+
      '<div class="notice grey" style="margin-top:4px"><div class="ni">§</div><div>一个版本对应官方<b>一次发布的全量清单</b>，因此版本号与发布日期必须来自官方文件本身，不能按内部整理时间填写。</div></div>';
  }
  if(n===3){
    return oelMini(3)+
      '<div class="oel-split">'+
      '<div><div class="sp-t"><b>① 原文附件</b><span class="tag chip">PDF / 网页存档</span></div>'+
        '<div class="drop" onclick="document.getElementById(\'oiPdf\').click()"><div class="ic">⇪</div><p>上传官方原文（PDF）或网页存档</p><small>用于追溯与人工复核，不参与自动解析</small></div>'+
        '<input type="file" id="oiPdf" accept=".pdf,.html,.htm,.mht" style="display:none" onchange="oelImpPick(this,\'pdf\')">'+
        '<div id="oiPdfRow" style="margin-top:10px"></div>'+
        '<div class="muted" style="font-size:12px;margin-top:8px">没有文件？<a onclick="oelImpPickDemo(\'pdf\')" style="cursor:pointer">使用官方原文示例文件</a></div></div>'+
      '<div><div class="sp-t"><b>② 结构化数据文件</b><span class="tag chip">Excel / CSV</span></div>'+
        '<div class="drop" onclick="document.getElementById(\'oiXls\').click()"><div class="ic">▤</div><p>上传结构化限值表（Excel）</p><small>入库用数据；原型为静态演示，不进行真实解析</small></div>'+
        '<input type="file" id="oiXls" accept=".xlsx,.xls,.csv" style="display:none" onchange="oelImpPick(this,\'xls\')">'+
        '<div id="oiXlsRow" style="margin-top:10px"></div>'+
        '<div class="muted" style="font-size:12px;margin-top:8px">没有文件？<a onclick="oelImpPickDemo(\'xls\')" style="cursor:pointer">使用结构化示例文件</a></div></div>'+
      '</div>'+
      '<div class="notice warn" style="margin-top:12px"><div class="ni">!</div><div><b>原始 PDF / 网页存档与结构化 Excel 分开保存：</b>原文附件只作留存与追溯，结构化附件才是入库数据。原文为 PDF / 网页的来源，须由法规专员人工整理为结构化表后上传，<b>系统不自动从 PDF 识别并直接发布数据</b>。</div></div>';
  }
  if(n===4){
    return oelMini(4)+
      '<div class="stat-row">'+
      '<div class="stat"><b>172</b><span>识别数据行数</span></div>'+
      '<div class="stat"><b>16</b><span>识别列数</span></div>'+
      '<div class="stat" style="border-color:var(--orange-b);background:var(--orange-bg)"><b style="color:var(--orange)">9</b><span>待人工确认行</span></div>'+
      '<div class="stat"><b>0</b><span>无法识别列</span></div></div>'+
      '<div style="font-size:12.5px;font-weight:650;margin:6px 0 7px">解析结果预览（前 5 行，与限值明细字段自动映射）</div>'+
      '<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px;max-height:240px;overflow:auto"><table class="tbl"><thead><tr>'+
      '<th style="width:110px">CAS 号</th><th style="width:160px">物质名称</th><th style="width:130px">限值类型</th>'+
      '<th style="width:110px">8h TWA</th><th style="width:110px">STEL</th><th style="width:120px">语义槽位</th><th style="width:90px">单位</th></tr></thead><tbody>'+
      '<tr><td class="mono">108-88-3</td><td>甲苯</td><td>TWA + STEL</td><td class="oel-num">192</td><td class="oel-num">384</td><td>'+oelKindTag('LT')+' '+oelKindTag('ST')+'</td><td>mg/m³</td></tr>'+
      '<tr><td class="mono">1330-20-7</td><td>二甲苯（全部异构体）</td><td>TWA + STEL</td><td class="oel-num">221</td><td class="oel-num">442</td><td>'+oelKindTag('LT')+' '+oelKindTag('ST')+'</td><td>mg/m³</td></tr>'+
      '<tr><td class="mono">67-64-1</td><td>丙酮</td><td>TWA + STEL</td><td class="oel-num">1210</td><td class="oel-num">2420</td><td>'+oelKindTag('LT')+' '+oelKindTag('ST')+'</td><td>mg/m³</td></tr>'+
      '<tr><td class="mono">50-00-0</td><td>甲醛</td><td>TWA + STEL</td><td class="oel-num">0.37</td><td class="oel-num">0.74</td><td>'+oelKindTag('LT')+' '+oelKindTag('ST')+'</td><td>mg/m³</td></tr>'+
      '<tr><td class="mono">100-41-4</td><td>乙苯</td><td>TWA + STEL</td><td class="oel-num">87</td><td class="oel-num">442</td><td>'+oelKindTag('LT')+' '+oelKindTag('ST')+'</td><td>mg/m³</td></tr>'+
      '</tbody></table></div>'+
      '<div class="notice info" style="margin-top:12px"><div class="ni">i</div><div>解析仅完成<b>列映射、格式读取与语义槽位对齐</b>，不判断数据是否正确。下一步将执行 7 类数据校验，校验结果必须在页面上逐条确认。</div></div>';
  }
  if(n===5){
    var blockN=OEL_CHECKS.filter(function(c){return c.lv==='阻断';}).reduce(function(a,c){return a+c.cnt;},0);
    var warnN=OEL_CHECKS.filter(function(c){return c.lv==='告警';}).reduce(function(a,c){return a+c.cnt;},0);
    var hintN=OEL_CHECKS.filter(function(c){return c.lv==='提示';}).reduce(function(a,c){return a+c.cnt;},0);
    var left=oelCheckBlockN();
    return oelMini(5)+
      '<div class="stat-row">'+
      '<div class="stat" style="border-color:var(--red-b);background:var(--red-bg)"><b style="color:var(--red)">'+blockN+'</b><span>阻断项（必须处理）</span></div>'+
      '<div class="stat" style="border-color:var(--orange-b);background:var(--orange-bg)"><b style="color:var(--orange)">'+warnN+'</b><span>告警项（须确认）</span></div>'+
      '<div class="stat"><b>'+hintN+'</b><span>提示项（仅记录）</span></div>'+
      '<div class="stat" style="border-color:var(--green-b);background:var(--green-bg)"><b style="color:var(--green)">'+OEL_CHECK_PASS.length+'</b><span>校验通过项</span></div></div>'+
      '<div style="font-size:12.5px;font-weight:650;margin:6px 0 7px">校验明细（7 类规则）</div>'+
      '<div class="oel-check">'+OEL_CHECKS.map(function(c,i){
        var cls=c.lv==='阻断'?'red':(c.lv==='告警'?'orange':'grey');
        var done=c.st==='已处理';
        return '<div class="ck'+(done?' done':'')+'">'+
          '<div class="hd"><span class="tag '+cls+'">'+esc(c.lv)+'</span><b>'+esc(c.tp)+'</b>'+
          '<span class="muted">命中 '+c.cnt+' 条</span>'+
          (done?'<span class="tag green sm">已处理</span>':'<button class="btn-link" onclick="oelCheckFix('+i+')">标记为已处理（演示）</button>')+'</div>'+
          '<div class="kv"><em>示例</em><span>'+esc(c.eg)+'</span></div>'+
          '<div class="kv"><em>处理建议</em><span>'+esc(c.fix)+'</span></div>'+
          '</div>';
      }).join('')+'</div>'+
      '<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div><b>校验通过项：</b>'+OEL_CHECK_PASS.join('；')+'。</div></div>'+
      '<div class="notice '+(left?'warn':'info')+'" style="margin-top:10px"><div class="ni">'+(left?'!':'i')+'</div><div>'+
      (left?('<b>仍有 '+left+' 条阻断项未处理</b>，无法进入下一步。阻断项必须修正数据或人工留痕确认后才能提交审核。')
        :'阻断项已全部处理（演示：已留痕），可进入版本比较。')+'</div></div>';
  }
  if(n===6){
    return oelMini(6)+
      '<div class="stat-row">'+
      '<div class="stat" style="border-color:var(--green-b);background:var(--green-bg)"><b style="color:var(--green)">1</b><span>新增物质</span></div>'+
      '<div class="stat"><b>1</b><span>删除物质</span></div>'+
      '<div class="stat" style="border-color:var(--orange-b);background:var(--orange-bg)"><b style="color:var(--orange)">1</b><span>长期 / 短期限值变化</span></div>'+
      '<div class="stat"><b>1</b><span>单位 / 口径变化</span></div>'+
      '<div class="stat"><b>1</b><span>标记变化</span></div>'+
      '<div class="stat"><b>1</b><span>备注 / 适用范围变化</span></div></div>'+
      '<div style="font-size:12.5px;font-weight:650;margin:6px 0 7px">与上一版本（'+esc(oelSetName(_oelImp.baseSet||'DS-EU-2601'))+'）比较（节选）</div>'+
      '<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px;max-height:200px;overflow:auto"><table class="tbl"><thead><tr>'+
      '<th style="width:90px">变更</th><th style="width:110px">CAS 号</th><th style="width:140px">物质名称</th>'+
      '<th style="width:130px">语义槽位</th><th style="width:150px">变更前</th><th style="width:150px">变更后</th><th>说明</th></tr></thead><tbody>'+
      '<tr><td><span class="tag green">新增</span></td><td class="mono">100-41-4</td><td>乙苯</td><td>'+oelKindTag('LT')+' '+oelKindTag('ST')+'</td><td class="oel-old">—</td><td class="oel-new">8h TWA 87 / STEL 442 mg/m³</td><td>新增物质条目及其长短期限值</td></tr>'+
      '<tr><td><span class="tag orange">数值</span></td><td class="mono">67-56-1</td><td>甲醇</td><td>'+oelKindTag('LT')+'</td><td class="oel-old">266 mg/m³</td><td class="oel-new">250 mg/m³</td><td>8h TWA 下调</td></tr>'+
      '<tr><td><span class="tag red">删除</span></td><td class="mono">110-80-5</td><td>2-乙氧基乙醇</td><td>'+oelKindTag('LT')+'</td><td class="oel-old">8h TWA 18 mg/m³</td><td class="oel-new">—</td><td>官方撤回该限值</td></tr>'+
      '<tr><td><span class="tag blue">单位</span></td><td class="mono">67-64-1</td><td>丙酮</td><td><span class="muted">—</span></td><td class="oel-old">mg/m³（附 ppm）</td><td class="oel-new">mg/m³</td><td>仅表述口径统一</td></tr>'+
      '<tr><td><span class="tag blue">标记</span></td><td class="mono">67-64-1</td><td>丙酮</td><td><span class="muted">—</span></td><td class="oel-old">—</td><td class="oel-new">生物监测标记</td><td>新增标记</td></tr>'+
      '</tbody></table></div>'+
      '<div class="notice warn" style="margin-top:12px"><div class="ni">!</div><div><b>对比结果仅为提示：</b>系统不判断变化是「更严格」还是「更宽松」，也不自动判断受影响范围；<b>数值口径变化不可直接按数值比较</b>，「语义槽位」列只用于把两边对齐到同一槽位，不代表可以直接比数值，须在「版本对比与审核」中人工确认。</div></div>';
  }
  return oelMini(7)+
    '<div class="notice grey" style="margin-bottom:12px"><div class="ni">§</div><div>提交后数据集状态为「<b>待审核</b>」，须在「版本对比与审核」中完成审核并发布，才会成为可用的合规依据。</div></div>'+
    '<dl class="desc-list" style="grid-template-columns:140px 1fr">'+
    '<dt>数据来源</dt><dd>'+esc((OEL_SOURCES[_oelImp.srcIdx||0]||{}).rg||'—')+'</dd>'+
    '<dt>数据集名称</dt><dd>'+esc(_oelImp.name||'—')+'</dd>'+
    '<dt>版本号</dt><dd class="mono">'+esc(_oelImp.ver||'—')+'</dd>'+
    '<dt>发布日期 / 生效日期</dt><dd>'+esc(_oelImp.pub||'—')+' / '+esc(_oelImp.eff||'—')+'</dd>'+
    '<dt>原文附件</dt><dd class="mono">'+esc(_oelImp.pdf||'—')+'</dd>'+
    '<dt>结构化附件</dt><dd class="mono">'+esc(_oelImp.xls||'—')+'</dd>'+
    '<dt>解析数据条数</dt><dd>172 条（演示）</dd>'+
    '<dt>校验结果</dt><dd>阻断 '+OEL_CHECKS.filter(function(c){return c.lv==='阻断';}).reduce(function(a,c){return a+c.cnt;},0)+' · 告警 '+OEL_CHECKS.filter(function(c){return c.lv==='告警';}).reduce(function(a,c){return a+c.cnt;},0)+' · 提示 '+OEL_CHECKS.filter(function(c){return c.lv==='提示';}).reduce(function(a,c){return a+c.cnt;},0)+'（已逐条留痕）</dd>'+
    '<dt>对比基准</dt><dd>'+esc(oelSetName(_oelImp.baseSet||'DS-EU-2601'))+'</dd>'+
    '</dl>'+
    '<div class="form-grid one" style="margin-top:12px">'+
    '<div class="field"><label class="req">提交人 / 审核人</label><input class="ctrl" id="oiSubmitter" value="'+esc(OEL_TOP.owner)+'"></div>'+
    '<div class="field"><label class="inline-chk"><input type="checkbox" class="chk" id="oiOk"> 我确认已逐条核对校验结果与版本差异，并对本次导入的数据质量负责</label></div></div>';
}
function oelImpFoot(n){
  if(n===1)return '<div class="left">第 1 步 / 共 7 步</div><button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="oelImpNext(2)">下一步：填写版本信息</button>';
  if(n===2)return '<div class="left">第 2 步 / 共 7 步</div><button class="btn" onclick="oelImpNext(1)">上一步</button><button class="btn primary" onclick="oelImpNext(3)">下一步：上传附件</button>';
  if(n===3)return '<div class="left">第 3 步 / 共 7 步</div><button class="btn" onclick="oelImpNext(2)">上一步</button><button class="btn primary" id="oiNext3" disabled onclick="oelImpNext(4)">下一步：解析预览</button>';
  if(n===4)return '<div class="left">第 4 步 / 共 7 步</div><button class="btn" onclick="oelImpNext(3)">上一步</button><button class="btn primary" onclick="oelImpNext(5)">下一步：数据校验</button>';
  if(n===5)return '<div class="left">第 5 步 / 共 7 步</div><button class="btn" onclick="oelImpNext(4)">上一步</button><button class="btn primary" id="oiNext5" '+((oelCheckBlockN()>0)?'disabled':'')+' onclick="oelImpNext(6)">下一步：与上一版本比较</button>';
  if(n===6)return '<div class="left">第 6 步 / 共 7 步</div><button class="btn" onclick="oelImpNext(5)">上一步</button><button class="btn primary" onclick="oelImpNext(7)">下一步：提交审核</button>';
  return '<div class="left">第 7 步 / 共 7 步</div><button class="btn" onclick="oelImpNext(6)">上一步</button><button class="btn primary" onclick="oelImpSubmit()">提交审核</button>';
}
function oelImpSrcPick(){
  var i=parseInt($('oiSrc').value,10)||0,s=OEL_SOURCES[i];
  if(s){$('oiOrg').value=s.org;$('oiFmt').value=s.fmt;$('oiLaw').value=s.law;}
}
function oelImpNext(n){
  if(n>=2){
    if(n===2){_oelImp.srcIdx=parseInt($('oiSrc').value,10)||0;}
    if(n===3){
      /* srcIdx 已在第 2 步保存；此处只补默认值，避免读到不存在的选择框 */
      if(_oelImp.srcIdx==null||isNaN(_oelImp.srcIdx))_oelImp.srcIdx=0;
      _oelImp.name=($('oiName')&&$('oiName').value.trim())||((OEL_SOURCES[_oelImp.srcIdx]||{}).list||'');
      _oelImp.ver=($('oiVer')&&$('oiVer').value.trim())||'V2026.3';
      _oelImp.pub=($('oiPub')&&$('oiPub').value)||'2026-09-18';
      _oelImp.eff=($('oiEff')&&$('oiEff').value)||'2026-10-01';
      _oelImp.exp=($('oiExp')&&$('oiExp').value)||'';
      _oelImp.owner=($('oiOwner')&&$('oiOwner').value.trim())||OEL_TOP.owner;
      _oelImp.note=($('oiNote')&&$('oiNote').value.trim())||'由「导入限值数据集」向导建立（演示）';
      _oelImp.baseSet=((OEL_SOURCES[_oelImp.srcIdx]||{}).rg==='中国')?'DS-CN-1901':'DS-EU-2601';
    }
    if(n===4&&!_oelImp.xls){toast('请先上传结构化数据文件（或使用示例文件）','warn');return;}
  }
  $('mBody').innerHTML=oelImpHtml(n);
  $('mFoot').innerHTML=oelImpFoot(n);
  if(n===3){if(_oelImp.pdf)oelImpShowFile('pdf');if(_oelImp.xls)oelImpShowFile('xls');}
}
function oelImpPick(el,kind){
  if(!el.files.length)return;
  _oelImp[kind]=el.files[0].name;
  oelImpShowFile(kind);
}
function oelImpPickDemo(kind){
  _oelImp[kind]=kind==='pdf'?(((OEL_SOURCES[_oelImp.srcIdx||0]||{}).rg==='中国')?'gbz2.1_rev_draft.pdf':'eu_ioelv_v2027_1_oj.pdf'):(((OEL_SOURCES[_oelImp.srcIdx||0]||{}).rg==='中国')?'gbz2.1_rev_draft_t1.xlsx':'eu_ioelv_v2027_1.xlsx');
  oelImpShowFile(kind);
}
function oelImpShowFile(kind){
  var row=$(kind==='pdf'?'oiPdfRow':'oiXlsRow');if(!row)return;
  row.innerHTML='<div class="file-row"><span style="font-size:16px">'+(kind==='pdf'?'◇':'▤')+'</span><div><b>'+esc(_oelImp[kind])+'</b>'+
    '<div style="color:var(--muted);font-size:11.5px">'+(kind==='pdf'?'官方原文 · 仅作留存与追溯':'结构化数据 · 待人工核对')+'</div></div>'+
    '<span class="tag orange" style="margin-left:auto">'+(kind==='pdf'?'已留存':'待核对')+'</span></div>';
  if(kind==='xls'){var b=$('oiNext3');if(b){b.disabled=false;b.classList.remove('disabled');}}
}
function oelCheckFix(i){
  var c=OEL_CHECKS[i];if(!c)return;
  c.st='已处理';
  $('mBody').innerHTML=oelImpHtml(5);
  $('mFoot').innerHTML=oelImpFoot(5);
  toast('已标记为「'+c.tp+'」处理完成（演示留痕）','ok');
}
function oelImpSubmit(){
  if(!$('oiOk').checked){toast('请先勾选人工核对确认项','warn');return;}
  if(oelCheckBlockN()>0){toast('仍存在未处理的阻断项，无法提交审核','warn');return;}
  var sid='DS-NEW-'+(_oelImp.srcIdx+1)+'-'+String(Date.now()).slice(-4);
  OEL_SETS.unshift({
    id:sid,rg:(OEL_SOURCES[_oelImp.srcIdx]||{}).rg||'—',name:_oelImp.name||'新建数据集',ver:_oelImp.ver||'V2026.3',
    pub:_oelImp.pub||'2026-09-18',eff:_oelImp.eff||'2026-10-01',exp:_oelImp.exp||'—',
    pdf:_oelImp.pdf||'—',xls:_oelImp.xls||'—',cnt:172,st:'待审核',
    owner:($('oiSubmitter')&&$('oiSubmitter').value.trim())||OEL_TOP.owner,due:'',
    note:(_oelImp.note||'')+'（经 7 步导入向导提交，待审核）'
  });
  closeModal();
  _oelTab='set';_oelF.set={kw:'',rg:'',st:''};_oelP.set=1;
  oelRender();
  toast('已提交审核（演示）：'+(_oelImp.name||'新数据集')+' '+(_oelImp.ver||'')+'，请在「版本对比与审核」中确认','ok');
}

/* ---------- 15. 页面注册（接管 23z8 的 law:oel 占位页） ---------- */
regPage('law:oel',{title:'职业接触限值（OEL）',crumb:['合规管理','法规库维护','职业接触限值（OEL）'],render:oelRender});
