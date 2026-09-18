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
   · 导入新版本走静态演示向导：登记来源 → 建版本 → 上传结构化数据 →
     预览变更 → 审核发布；**页面不出现「自动解析」类表述**
   · C&L Inventory / SVHC / Annex XIV / XVII 属 REACH 与独立菜单，不入本页
   实现约定：本分片接管 law:clp 注册（23y 的旧注册已删除，非覆盖关系）；
   抽屉复用 .exp-ai-mask / .exp-ai-panel 既有样式，仅补一条模块信息条 CSS。
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
  owner:'质管-熊倩',
  cycle:'附录 VI 随 ATP 发布导入；分类规则与标签字典按季度复核',
  funcs:['物质查询','混合物分类','标签生成','SDS编制'],
  note:'CLP 管分类与标签（怎么分类、怎么贴标）；REACH 管注册、授权与限制（能不能用、要不要申报）。本页面仅涉及 CLP。'
};

/* 各 Annex 模块自己的版本信息（不同模块更新与生效时间可能不同） */
var CLP_MODULES={
  vi:{key:'vi',label:'Annex VI｜物质统一分类',ver:'ATP 21',eff:'2026-09-01',status:'待复核',cutoff:'2026-07-15',owner:'质管-熊倩',src:'官方法规清单（强制采用）',srcTag:'官方清单 · 强制采用',due:'2026-10-15'},
  rules:{key:'rules',label:'Annex I｜分类规则',ver:'R2026.2',eff:'2026-06-01',status:'已审核',cutoff:'2026-06-20',owner:'质管-熊倩',src:'人工审核规则（由法规专员整理成型）',srcTag:'人工审核规则',due:'2026-12-31'},
  labels:{key:'labels',label:'Annex III/IV/V｜标签字典',ver:'L2026.3（含 2024/2865 同步）',eff:'2024-12-10',status:'已生效',cutoff:'2026-06-30',owner:'质管-熊倩',src:'官方标签字典（按版本维护）',srcTag:'官方标签字典',due:'2027-03-31'},
  pcn:{key:'pcn',label:'Annex VIII｜PCN / UFI',ver:'规划中',eff:'—',status:'占位',cutoff:'—',owner:'质管-熊倩',src:'官方法规清单（强制采用）',srcTag:'后续模块 · 静态占位',due:''}
};

/* Tab1：Annex VI 物质统一分类（沿用原有 5 条示例数据，补充生效版本与条款位置） */
var CLP_VI_ROWS=[
  {idx:'605-001-00-5',name:'甲醛',cas:'50-00-0',ec:'200-001-8',cls:'Carc. 1B / Muta. 2 / Acute Tox. 3',h:'H350 / H341 / H301',scl:'Skin Sens. 1; H317: C ≥ 0.2%',m:'M=10（慢性水生毒性）',ate:'口服 ATE = 100 mg/kg',notes:'B / D',ver:'ATP 21',src:'Annex VI Part 3 · Table 3（经 ATP 21 采纳）',rule:'CR-001'},
  {idx:'607-061-00-8',name:'丙烯酸',cas:'79-10-7',ec:'201-177-9',cls:'Skin Corr. 1A / Acute Tox. 4',h:'H314 / H302',scl:'—',m:'—',ate:'—',notes:'—',ver:'ATP 21',src:'Annex VI Part 3 · Table 3（经 ATP 21 采纳）',rule:'CR-002'},
  {idx:'603-014-00-0',name:'乙二醇单丁醚',cas:'111-76-2',ec:'203-905-0',cls:'Acute Tox. 4 / Eye Irrit. 2',h:'H302 / H319',scl:'—',m:'—',ate:'—',notes:'—',ver:'ATP 21',src:'Annex VI Part 3 · Table 3（经 ATP 21 采纳）',rule:'CR-003'},
  {idx:'603-002-00-5',name:'乙醇',cas:'64-17-5',ec:'200-578-6',cls:'Flam. Liq. 2 / Eye Irrit. 2',h:'H225 / H319',scl:'—',m:'—',ate:'—',notes:'—',ver:'ATP 21',src:'Annex VI Part 3 · Table 3（经 ATP 21 采纳）',rule:'CR-005'},
  {idx:'601-021-00-3',name:'甲苯',cas:'108-88-3',ec:'203-625-9',cls:'Flam. Liq. 2 / Repr. 2 / STOT RE 2',h:'H225 / H361d / H373',scl:'—',m:'—',ate:'—',notes:'C',ver:'ATP 21',src:'Annex VI Part 3 · Table 3（经 ATP 21 采纳）',rule:'CR-004'}
];

/* Tab2：Annex I 分类规则（人工审核整理成型的机器规则；不做实际计算） */
var CLP_RULES=[
  {id:'CR-001',name:'急性毒性—口服—混合物 ATE 计算规则',cat:'急性毒性（口服）',target:'混合物',gcl:'Cat.1 ≥ 5%；Cat.2 ≥ 1% 且 < 5%；Cat.3 ≥ 0.5% 且 < 1%',add:'是',ref:'Annex I，Part 3，3.1.3.6（口服 ATE 加和公式）',ver:'R2026.2',status:'已审核',h:'H301',
    det:{inputs:'各组分浓度 Ci（%）；各组分口服 ATEi（优先取 Annex VI Table 3 统一值；无统一值时取企业自评估值）',cond:'混合物中含 ≥ 1 个已分类急性毒性（口服）组分，且浓度触及对应类别通用限值',formula:'ATE_mix = 100 / Σ( Ci / ATEi )（Ci 为百分比浓度；ATEi 单位 mg/kg 体重）',except:'组分无可靠 ATE 时按「经口 LD50 → ATE 换算表」估算；仍无数据则不参与求和并记录数据缺口；挂有 SCL 的组分先按 SCL 阈值判断是否计入',prio:'高（1）——SCL 阈值判断优先于通用限值，通过后再进入 ATE 加和',output:'按 ATE_mix 所落区间输出 Acute Tox. 1 / 2 / 3（口服）',label:'对应 H300 / H301 / H302 + GHS06（Cat.1/2）/ GHS07（Cat.3）· 信号词：危险 / 警告',src:'Regulation (EC) No 1272/2008，Annex I，Part 3，第 3.1.3.6 条（急性毒性—混合物 ATE 计算公式）'}},
  {id:'CR-002',name:'皮肤腐蚀 / 刺激—通用浓度限值加和规则',cat:'皮肤腐蚀/刺激',target:'混合物',gcl:'Skin Corr. 1：≥ 1%；Skin Irrit. 2：≥ 10%；Eye Irrit. 2：≥ 10%',add:'是',ref:'Annex I，Part 3，3.2.3',ver:'R2026.2',status:'已审核',h:'H314',
    det:{inputs:'各组分浓度 Ci（%）与皮肤腐蚀/刺激分类；各组分的 SCL（如有）',cond:'混合物含 ≥ 1 个 Skin Corr. / Skin Irrit. / Eye Irrit. 已分类组分',formula:'按浓度加和落档：Σ(Ci) ≥ 1%（Corr. 组分）→ Skin Corr. 1；≥ 10%（Irrit. 组分）→ Skin Irrit. 2 / Eye Irrit. 2',except:'Cat.1 内 1A/1B/1C 取最严组分；有 SCL 的组分以 SCL 替代通用限值参与求和',prio:'中（2）——腐蚀判断先于刺激判断，同浓度区间取更严类别',output:'Skin Corr. 1 / Skin Irrit. 2 / Eye Irrit. 2',label:'对应 H314 / H315 / H319 + GHS05（腐蚀）/ GHS07（刺激）· 信号词：危险 / 警告',src:'Regulation (EC) No 1272/2008，Annex I，Part 3，第 3.2.3 条（皮肤腐蚀 / 刺激—混合物分类）'}},
  {id:'CR-003',name:'SCL（特定浓度限值）优先于通用浓度限值',cat:'全部健康 / 环境危害类别',target:'物质与混合物',gcl:'见 Annex VI Table 3 各条目 SCL 列',add:'否—逐案评估',ref:'Annex I，Part 1，1.2 + Annex VI，Table 3',ver:'R2026.2',status:'已审核',h:'H317',
    det:{inputs:'组分对应的 Annex VI 条目及其 SCL 列（例：甲醛 Skin Sens. 1; H317: C ≥ 0.2%）',cond:'组分在 Annex VI Table 3 中挂有 SCL 时触发',formula:'混合物分类时以 SCL 替换同危害类别的通用浓度限值（GCL）参与判断',except:'SCL 高于 GCL 时按 SCL 放宽、低于 GCL 时按 SCL 收紧；同一组分多类别 SCL 分别适用',prio:'高（1）——先于一切通用限值加和规则',output:'按 SCL 门槛得到的混合物分类',label:'以组分各自 SCL 对应的 H 码与标签结果为准',src:'Regulation (EC) No 1272/2008，Annex VI，Table 3 SCL 列；Annex I，Part 1，第 1.2 条（分类与标签一般原则）'}},
  {id:'CR-004',name:'慢性水生毒性—M 因子加权求和规则',cat:'危害水生环境（慢性）',target:'混合物',gcl:'Chronic 1：Σ(Mi×Ci) ≥ 25%；Chronic 2：≥ 2.5%（缩放规则）',add:'是',ref:'Annex I，Part 4，4.1.3.5（求和法）',ver:'R2026.2',status:'已审核',h:'H410',
    det:{inputs:'各组分的慢性水生分类与 M 因子（Annex VI 统一 M 或企业自评估 M）',cond:'混合物含 ≥ 1 个 Aquatic Chronic 1 组分',formula:'Chronic 1：Σ(Mi × Ci) ≥ 25%；Chronic 2：Σ(10 × Mi × Ci) ≥ 25%（以 Chronic 2 限值 25% 折算）',except:'无统一 M 的 Chronic 1 组分须自行设定 M 后参与求和；未分类组分不参与但需记录',prio:'中（2）',output:'Aquatic Chronic 1 / 2',label:'对应 H410 / H411 + GHS09 · 信号词：警告',src:'Regulation (EC) No 1272/2008，Annex I，Part 4，第 4.1.3.5 条（危害水生环境—混合物求和法；慢性加和公式见表 4.1.4）'}},
  {id:'CR-005',name:'同一危害类别的分层与优先级原则',cat:'全部危害类别',target:'物质与混合物',gcl:'—',add:'否—逐案评估',ref:'Annex I，Part 1，1.2（分层原则）',ver:'R2026.2',status:'已审核',h:'',
    det:{inputs:'同一健康危害路径下的多个候选分类结果',cond:'同一路径（如口服急性毒性）出现多个可选类别时',formula:'取证据支持的最严类别；上位类别覆盖下位类别（如 Carc. 1B 与 Carc. 2 并存时输出 1B）',except:'不同路径（口服/皮肤/吸入）互不覆盖，分别输出；物理危害按各 Hazard 类别独立规则执行',prio:'低（3）——在其他规则产出结果后应用',output:'每个危害路径的最终唯一分类',label:'以最终分类对应的 H 码与标签结果为准',src:'Regulation (EC) No 1272/2008，Annex I，Part 1，第 1.2 条（分类与标签一般原则）'}}
];

/* Tab3：Annex III/IV/V 标签字典（官方字典，按版本维护；非企业自行分类结果） */
var CLP_LABELS=[
  {tp:'H 码',code:'H301',text:'吞咽中毒（急性毒性—口服 类别 3）',picto:'GHS06',signal:'危险',combo:'建议组合：P264 / P270 / P301+P310 / P321 / P330 / P405 / P501',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',code:'H314',text:'造成严重皮肤灼伤和眼损伤',picto:'GHS05',signal:'危险',combo:'建议组合：P260 / P264 / P280 / P301+P330+P331 / P303+P361+P353 / P363 / P405 / P501',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',code:'H317',text:'可能导致皮肤过敏反应',picto:'GHS07',signal:'警告',combo:'建议组合：P261 / P272 / P280 / P302+P352 / P333+P313 / P363 / P501',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',code:'H319',text:'造成严重眼刺激',picto:'GHS07',signal:'警告',combo:'建议组合：P264 / P280 / P305+P351+P338 / P337+P313',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',code:'H350',text:'可能致癌（类别 1A/1B）',picto:'GHS08',signal:'危险',combo:'建议组合：P201 / P202 / P280 / P308+P313 / P405 / P501',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',code:'H341',text:'怀疑可造成遗传性缺陷（类别 2）',picto:'GHS08',signal:'警告',combo:'建议组合：P201 / P202 / P280 / P308+P313 / P405',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',code:'H225',text:'高度易燃液体和蒸气',picto:'GHS02',signal:'危险',combo:'建议组合：P210 / P233 / P240 / P241 / P242 / P243 / P280 / P303+P361+P353 / P370+P378 / P403+P235 / P501',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'H 码',code:'H410',text:'对水生生物毒性极大并具有长期持续影响',picto:'GHS09',signal:'警告',combo:'建议组合：P273 / P391 / P501',ver:'L2026.3',src:'Annex III（H 码表）',eff:'2024-12-10'},
  {tp:'EUH 码',code:'EUH066',text:'反复接触可能造成皮肤干燥或龟裂',picto:'—',signal:'—',combo:'无固定 P 码组合（按 SDS 评估结果给出）',ver:'L2026.3',src:'Annex III（欧盟补充危害说明）',eff:'2024-12-10'},
  {tp:'P 码',code:'P301+P310',text:'如误吞咽：立即呼叫中毒急救中心 / 医生',picto:'—',signal:'—',combo:'与急性毒性（口服）H301 / H302 / H300 组合使用',ver:'L2026.3',src:'Annex IV（P 码表）',eff:'2024-12-10'},
  {tp:'P 码',code:'P280',text:'戴防护手套 / 防护服 / 防护眼罩 / 防护面罩',picto:'—',signal:'—',combo:'多数危害类别标签的通用防范语（每标签 P 码 ≤ 6 条）',ver:'L2026.3',src:'Annex IV（P 码表）',eff:'2024-12-10'},
  {tp:'P 码',code:'P501',text:'按当地法规处置内装物 / 容器',picto:'—',signal:'—',combo:'多数危害类别标签的通用处置语',ver:'L2026.3',src:'Annex IV（P 码表）',eff:'2024-12-10'}
];

/* Tab5：版本变更与影响（物质数量来自官方变更清单；配方/SDS 数量为示例数据） */
var CLP_CHANGES=[
  {tp:'新增',content:'ATP 21：新增 12 个统一分类条目（含 2-乙基己酸酯类等）',reason:'ECHA RAC 意见采纳 → (EU) 2024/197',eff:'2026-09-01',by:'质管-熊倩',subs:12,recipes:'3',sds:'2'},
  {tp:'修改',content:'ATP 21：5 项条目分类加严（含甲醛相关 SCL 调整）',reason:'毒理学与生态毒理学证据更新',eff:'2026-09-01',by:'质管-熊倩',subs:5,recipes:'2',sds:'2'},
  {tp:'废止',content:'ATP 21：2 项旧条目被新条目替代删除',reason:'条目整合清理',eff:'2026-09-01',by:'质管-熊倩',subs:2,recipes:'0',sds:'0'},
  {tp:'新增',content:'分类规则库：新增 5 类欧盟危害类别（ED / PBT / vPvB / PMT / vPvM）判定规则',reason:'(EU) 2023/707 新危害类别实施',eff:'2026-11-01（存量物质截止）',by:'质管-熊倩',subs:'待评估',recipes:'—',sds:'—'},
  {tp:'修改',content:'标签字典：版式规则更新（最小字号、行距 ≥ 字号 120%、P 码每标签 ≤ 6 条）',reason:'(EU) 2024/2865 CLP 大修',eff:'2026-05-20（过渡期截止）',by:'质管-熊倩',subs:'—',recipes:'—',sds:'—'}
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
var _clpF={vi:{kw:'',ver:''},rules:{kw:'',tgt:'',st:''},labels:{kw:'',tp:''},chg:{kw:'',tp:''}};
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
  var worst=clpLTopLamp();
  $('pageHost').innerHTML='<div class="sds-scope clp-page">'+
    sdsHead('clpTitle','CLP 法规库','法规编号 '+CLP_TOP.code+' · 适用市场：'+CLP_TOP.market+' · 当前状态：'+CLP_TOP.status,
      '<button class="btn" onclick="clpLGoChg()">查看变更摘要</button>'+
      '<button class="btn primary" onclick="clpLImport()">导入新版本</button>')+
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
      '</dl>'+
      '<div class="notice info" style="margin:12px 0 0"><div class="ni">i</div><div>'+esc(CLP_TOP.note)+'</div></div>'+
      '<div class="notice grey" style="margin:10px 0 0"><div class="ni">§</div><div><b>来源类型与维护位置：</b>Annex VI 官方统一分类（强制采用，本页 Tab 1）· Annex I 分类判断规则（人工整理，本页 Tab 2）· Annex III/IV/V 官方标签字典（本页 Tab 3）；C&L Inventory 为 ECHA 企业申报汇总参考，<b>独立菜单维护，不并入本页</b>；SVHC / Annex XIV / Annex XVII 属 <b>REACH 独立清单</b>，亦不在本页。</div></div>'+
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
  h+='<div class="card"><div class="toolbar" style="flex-wrap:wrap">';
  if(_clpTab==='vi'){
    var f=_clpF.vi;
    h+='<div class="search" style="width:260px"><i class="si">⌕</i><input id="clpViKw" placeholder="Index No. / 物质名称 / CAS / EC / H 码…" value="'+esc(f.kw)+'" oninput="clpLFill()"></div>'+
       '<select class="ctrl" id="clpViVer" style="width:150px" onchange="clpLFill()"><option value="">全部生效版本</option><option>ATP 21</option></select>';
  }else if(_clpTab==='rules'){
    var f=_clpF.rules;
    h+='<div class="search" style="width:260px"><i class="si">⌕</i><input id="clpRuKw" placeholder="规则编号 / 名称 / 危害类别…" value="'+esc(f.kw)+'" oninput="clpLFill()"></div>'+
       '<select class="ctrl" id="clpRuTgt" style="width:150px" onchange="clpLFill()"><option value="">全部适用对象</option><option>物质</option><option>混合物</option><option>物质与混合物</option></select>'+
       '<select class="ctrl" id="clpRuSt" style="width:140px" onchange="clpLFill()"><option value="">全部审核状态</option><option>已审核</option><option>审核中</option></select>';
  }else if(_clpTab==='labels'){
    var f=_clpF.labels;
    h+='<div class="search" style="width:260px"><i class="si">⌕</i><input id="clpLbKw" placeholder="代码 / 内容文字…" value="'+esc(f.kw)+'" oninput="clpLFill()"></div>'+
       '<select class="ctrl" id="clpLbTp" style="width:130px" onchange="clpLFill()"><option value="">全部类型</option><option>H 码</option><option>EUH 码</option><option>P 码</option></select>';
  }else if(_clpTab==='chg'){
    var f=_clpF.chg;
    h+='<div class="search" style="width:260px"><i class="si">⌕</i><input id="clpCgKw" placeholder="变更内容 / 原因…" value="'+esc(f.kw)+'" oninput="clpLFill()"></div>'+
       '<select class="ctrl" id="clpCgTp" style="width:130px" onchange="clpLFill()"><option value="">全部变更类型</option><option>新增</option><option>修改</option><option>废止</option></select>';
  }
  h+='<div class="grow"></div><span id="clpCnt" class="muted" style="font-size:12.5px"></span></div>'+
     '<div class="tbl-wrap"><table class="tbl" id="clpTable"></table></div>'+
     '<div class="pager" id="clpPager"></div></div>';
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
      return !kw||(r.idx+' '+r.name+' '+r.cas+' '+r.ec+' '+r.h+' '+r.cls).toLowerCase().indexOf(kw)>=0;
    });
    clpLTable(cols=[['Index No.','idx',130],['物质名称','name',100],['CAS 号','cas',100],['EC 号','ec',100],['危害分类','cls',190],['H 码','h',130],['SCL','scl',170],['M 因子','m',120],['ATE','ate',130],['备注','notes',60],['生效版本','ver',80],['来源与条款位置','src',210]],rows,function(r){
      return '<tr><td class="mono">'+esc(r.idx)+'</td><td><b>'+esc(r.name)+'</b></td><td class="mono">'+esc(r.cas)+'</td><td class="mono">'+esc(r.ec)+'</td><td>'+esc(r.cls)+'</td><td class="mono">'+esc(r.h)+'</td><td>'+esc(r.scl)+'</td><td>'+esc(r.m)+'</td><td>'+esc(r.ate)+'</td><td>'+esc(r.notes)+'</td><td class="mono">'+esc(r.ver)+'</td><td>'+esc(r.src)+'</td>'+
        '<td class="acts"><button class="btn-link" onclick="clpLViDrawer(\''+esc(r.idx)+'\')">详情</button><button class="btn-link" onclick="clpLViToRule(\''+esc(r.idx)+'\')">分类规则</button></td></tr>';
    });
  }else if(_clpTab==='rules'){
    var kw=($('clpRuKw').value||'').trim().toLowerCase(),tgt=$('clpRuTgt').value,st=$('clpRuSt').value;
    _clpF.rules={kw:$('clpRuKw').value,tgt:tgt,st:st};
    rows=CLP_RULES.filter(function(r){
      if(tgt&&r.target!==tgt)return false;
      if(st&&r.status!==st)return false;
      return !kw||(r.id+' '+r.name+' '+r.cat+' '+r.ref).toLowerCase().indexOf(kw)>=0;
    });
    clpLTable([['规则编号','id',90],['规则名称','name',210],['适用危害类别','cat',150],['适用对象','target',110],['通用浓度限值','gcl',210],['是否允许加和','add',110],['依据条款','ref',190],['规则版本','ver',80],['审核状态','status',80],['数据来源类型','',120]],rows,function(r){
      return '<tr><td class="mono">'+esc(r.id)+'</td><td><b>'+esc(r.name)+'</b></td><td>'+esc(r.cat)+'</td><td><span class="tag '+(r.target==='混合物'?'blue':(r.target==='物质'?'orange':'grey'))+'">'+esc(r.target)+'</span></td><td>'+esc(r.gcl)+'</td><td>'+(r.add==='是'?'<span class="tag green">是</span>':'<span class="tag orange">否—逐案评估</span>')+'</td><td>'+esc(r.ref)+'</td><td class="mono">'+esc(r.ver)+'</td><td><span class="tag '+TAG_CLS(r.status)+' dot-tag">'+esc(r.status)+'</span></td><td><span class="tag grey">人工审核规则</span></td>'+
        '<td class="acts"><button class="btn-link" onclick="clpLRuleDrawer(\''+esc(r.id)+'\')">详情</button>'+(r.h?'<button class="btn-link" onclick="clpLRuleToLabel(\''+esc(r.id)+'\')">标签字典</button>':'')+'</td></tr>';
    });
  }else if(_clpTab==='labels'){
    var kw=($('clpLbKw').value||'').trim().toLowerCase(),tp=$('clpLbTp').value;
    _clpF.labels={kw:$('clpLbKw').value,tp:tp};
    rows=CLP_LABELS.filter(function(r){
      if(tp&&r.tp!==tp)return false;
      return !kw||(r.code+' '+r.text+' '+r.combo).toLowerCase().indexOf(kw)>=0;
    });
    clpLTable([['类型','tp',80],['代码','code',100],['内容文字','text',230],['GHS 图标','picto',80],['信号词','signal',70],['标签组合关系','combo',290],['数据版本','ver',90],['来源','src',180],['生效日期','eff',90]],rows,function(r,i){
      return '<tr><td><span class="tag '+(r.tp==='H 码'?'blue':(r.tp==='P 码'?'grey':'purple'))+'">'+esc(r.tp)+'</span></td><td class="mono"><b>'+esc(r.code)+'</b></td><td>'+esc(r.text)+'</td><td>'+esc(r.picto)+'</td><td>'+esc(r.signal)+'</td><td>'+esc(r.combo)+'</td><td class="mono">'+esc(r.ver)+'</td><td>'+esc(r.src)+'</td><td>'+esc(r.eff)+'</td>'+
        '<td class="acts"><button class="btn-link" onclick="clpLLabelDrawer(\''+esc(r.code)+'\')">详情</button></td></tr>';
    });
  }else if(_clpTab==='chg'){
    var kw=($('clpCgKw').value||'').trim().toLowerCase(),tp=$('clpCgTp').value;
    _clpF.chg={kw:$('clpCgKw').value,tp:tp};
    rows=CLP_CHANGES.filter(function(r){
      if(tp&&r.tp!==tp)return false;
      return !kw||(r.content+' '+r.reason).toLowerCase().indexOf(kw)>=0;
    });
    clpLTable([['变更类型','tp',80],['内容','content',300],['变更原因','reason',190],['生效日期','eff',140],['审核人','by',90],['影响物质数','subs',100],['影响配方数','recipes',110],['影响 SDS 数','sds',100]],rows,function(r,i){
      return '<tr><td><span class="tag '+(r.tp==='新增'?'green':(r.tp==='修改'?'orange':'grey'))+'">'+esc(r.tp)+'</span></td><td>'+esc(r.content)+'</td><td>'+esc(r.reason)+'</td><td>'+esc(r.eff)+'</td><td>'+esc(r.by)+'</td><td>'+esc(r.subs)+(clpLIsNum(r.subs)?'<span class="muted" style="font-size:11px"> 官方清单</span>':'')+'</td><td>'+esc(r.recipes)+(clpLIsNum(r.recipes)?' <span class="tag orange" style="font-size:10.5px">示例</span>':'')+'</td><td>'+esc(r.sds)+(clpLIsNum(r.sds)?' <span class="tag orange" style="font-size:10.5px">示例</span>':'')+'</td>'+
        '<td class="acts"><button class="btn-link" onclick="clpLChgImpact('+CLP_CHANGES.indexOf(r)+')">查看影响范围</button></td></tr>';
    });
  }
}
/* 数字才挂标注：物质数带「官方清单」、配方 / SDS 数带「示例」；非数字（待评估 / —）一律不挂 */
function clpLIsNum(v){return v!==''&&v!=null&&!isNaN(Number(v));}
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
    '<dt>SCL</dt><dd>'+esc(r.scl)+'</dd><dt>M 因子</dt><dd>'+esc(r.m)+'</dd>'+
    '<dt>ATE</dt><dd>'+esc(r.ate)+'</dd><dt>备注（Notes）</dt><dd>'+esc(r.notes)+'</dd>'+
    '<dt>生效版本</dt><dd class="mono">'+esc(r.ver)+'</dd><dt>来源与条款位置</dt><dd>'+esc(r.src)+'</dd>'+
    '</dl>'+
    '<div class="notice info" style="margin-top:12px"><div class="ni">i</div><div>数据来源类型：<b>官方法规清单（强制采用）</b>——统一分类为法定分类，制造商 / 进口商必须采用（未被统一的危害类别仍需自行分类）。</div></div>',
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
  clpLDrawer('分类规则 · '+r.id+' '+r.name,
    clpLStrip(m)+
    '<span class="tag blue" style="margin:10px 0 10px;display:inline-block">研发实现用</span>'+
    '<span class="muted" style="font-size:12px;display:inline;margin-left:8px">原型阶段不做实际计算，仅展示规则内容、公式与来源</span>'+
    '<dl class="desc-list" style="grid-template-columns:130px 1fr">'+
    '<dt>规则编号</dt><dd class="mono">'+esc(r.id)+'</dd>'+
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
    '<dt>审核状态</dt><dd><span class="tag '+TAG_CLS(r.status)+' dot-tag">'+esc(r.status)+'</span> · 审核人 '+esc(m.owner)+'</dd>'+
    '<dt>数据来源类型</dt><dd><span class="tag grey">人工审核规则</span>——由法规专员从法规原文人工整理成型，非系统自动解析</dd>'+
    '</dl>',
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
    '<dt>类型</dt><dd>'+esc(r.tp)+'</dd><dt>代码</dt><dd class="mono"><b>'+esc(r.code)+'</b></dd>'+
    '<dt>内容文字</dt><dd>'+esc(r.text)+'</dd><dt>GHS 图标</dt><dd>'+esc(r.picto)+'</dd>'+
    '<dt>信号词</dt><dd>'+esc(r.signal)+'</dd><dt>生效日期</dt><dd>'+esc(r.eff)+'</dd>'+
    '<dt>标签组合关系</dt><dd style="grid-column:span 3">'+esc(r.combo)+'</dd>'+
    '<dt>数据版本</dt><dd class="mono">'+esc(r.ver)+'</dd><dt>来源</dt><dd>'+esc(r.src)+'</dd>'+
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

/* ---------- 10. 导入新版本 · 静态演示向导 ---------- */
var _clpImp={};
function clpLMini(n){
  var t=['登记来源文件','创建新版本','上传结构化数据','查看变更','审核发布'];
  return '<div class="mini-steps">'+t.map(function(x,i){
    var cls=i+1<n?'fin':(i+1===n?'on':'');
    return '<div class="mini-step '+cls+'"><span class="n">'+(i+1<n?'✓':(i+1))+'</span>'+x+'</div>'+(i<4?'<div class="mini-line '+(i+1<n?'fin':'')+'"></div>':'');
  }).join('')+'</div>';
}
function clpLImport(){
  _clpImp={};
  openModal({title:'导入新版本 · CLP 法规库',width:680,cls:'sds-scope clp-page',body:clpLImpHtml(1),footer:clpLImpFoot(1)});
}
function clpLImpHtml(n){
  if(n===1){
    return clpLMini(1)+
      '<div class="form-grid">'+
      '<div class="field"><label class="req">导入模块</label><select class="ctrl" id="ciMod">'+
        '<option value="vi"'+(_clpImp.mod==='vi'?' selected':'')+'>Annex VI｜物质统一分类</option><option value="rules"'+(_clpImp.mod==='rules'?' selected':'')+'>Annex I｜分类规则</option>'+
        '<option value="labels"'+(_clpImp.mod==='labels'?' selected':'')+'>Annex III/IV/V｜标签字典</option><option value="pcn"'+(_clpImp.mod==='pcn'?' selected':'')+'>Annex VIII｜PCN / UFI</option></select></div>'+
      '<div class="field"><label class="req">官方来源名称</label><input class="ctrl" id="ciSrc" value="'+esc(_clpImp.src||'')+'" placeholder="例如：Commission Delegated Regulation (EU) 2026/xxx（第 xx ATP）"></div>'+
      '<div class="field"><label class="req">来源发布日期</label><input class="ctrl" type="date" id="ciSrcDate" value="'+esc(_clpImp.srcDate||'2026-09-10')+'"></div>'+
      '<div class="field"><label>备注</label><input class="ctrl" id="ciNote" placeholder="例如：第 xx ATP 官方公报附件"></div></div>';
  }
  if(n===2){
    return clpLMini(2)+
      '<div class="form-grid">'+
      '<div class="field"><label class="req">模块版本号</label><input class="ctrl" id="ciVer" value="'+esc(_clpImp.ver||'')+'" placeholder="例如：ATP 22 / R2026.3 / L2026.4"></div>'+
      '<div class="field"><label class="req">生效日期</label><input class="ctrl" type="date" id="ciEff" value="'+esc(_clpImp.eff||'2027-02-01')+'"></div>'+
      '<div class="field"><label class="req">数据截止日期</label><input class="ctrl" type="date" id="ciCut" value="'+esc(_clpImp.cut||'2026-09-10')+'"></div>'+
      '<div class="field"><label>维护责任人</label><input class="ctrl" id="ciOwner" value="'+esc(CLP_TOP.owner)+'"></div></div>'+
      '<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div>不同 Annex 模块的版本与生效时间各自独立，登记后仅更新所选模块。</div></div>';
  }
  if(n===3){
    return clpLMini(3)+
      '<div style="margin-top:4px"><div class="drop" onclick="document.getElementById(\'ciFile\').click()"><div class="ic">⇪</div><p>上传结构化数据文件（Excel / CSV / JSON）</p><small>结构化清单来自官方发布附件的整理稿 · 原型为静态演示，不进行真实解析</small></div>'+
      '<input type="file" id="ciFile" accept=".xlsx,.csv,.json" style="display:none" onchange="clpLImpPick(this)"></div>'+
      '<div id="ciFileRow" style="margin-top:12px"></div>'+
      '<div style="margin-top:10px;font-size:12.5px;color:var(--muted)">没有文件？<a onclick="clpLImpPickDemo()" style="cursor:pointer">使用官方结构化示例文件</a></div>';
  }
  if(n===4){
    return clpLMini(4)+
      '<div class="stat-row"><div class="stat"><b>128</b><span>导入条目总数</span></div>'+
      '<div class="stat" style="border-color:var(--green-b);background:var(--green-bg)"><b style="color:var(--green)">12</b><span>新增条目</span></div>'+
      '<div class="stat" style="border-color:var(--orange-b);background:var(--orange-bg)"><b style="color:var(--orange)">5</b><span>修改条目</span></div>'+
      '<div class="stat" style="border-color:var(--line);background:var(--bg-soft,#f7f8fa)"><b>2</b><span>删除条目</span></div></div>'+
      '<div style="font-size:12.5px;font-weight:600;margin:6px 0 7px">变更预览（节选，与库内条目比对后的差异）</div>'+
      '<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px;max-height:200px;overflow:auto"><table class="tbl"><thead><tr><th style="width:70px">变更</th><th style="width:120px">Index No.</th><th>物质名称</th><th>分类 / H 码</th></tr></thead><tbody>'+
      '<tr><td><span class="tag green">新增</span></td><td class="mono">029-022-00-4</td><td>2-乙基己酸锆</td><td>Repr. 1B / H360Df</td></tr>'+
      '<tr><td><span class="tag orange">修改</span></td><td class="mono">605-001-00-5</td><td>甲醛</td><td>SCL 调整：Skin Sens. 1; H317: C ≥ 0.1%</td></tr>'+
      '<tr><td><span class="tag grey">删除</span></td><td class="mono">603-014-00-0</td><td>乙二醇单丁醚（旧条目）</td><td>被合并条目替代</td></tr>'+
      '</tbody></table></div>'+
      '<div class="notice warn" style="margin:14px 0 0"><div class="ni">!</div><div>预览内容尚未入库，<b>必须经人工逐条核对确认后</b>方可发布生效。</div></div>';
  }
  return clpLMini(5)+
    '<div class="notice grey" style="margin-bottom:12px"><div class="ni">§</div><div>审核通过后发布新版本；发布后可在「版本变更与影响」查看变更摘要与影响范围。</div></div>'+
    '<dl class="desc-list" style="margin-bottom:12px"><dt>模块</dt><dd>'+esc(_clpImp.modTxt||'Annex VI｜物质统一分类')+'</dd>'+
    '<dt>版本号</dt><dd class="mono">'+esc(_clpImp.ver||'ATP 22')+'</dd><dt>生效日期</dt><dd>'+esc(_clpImp.eff||'2027-02-01')+'</dd>'+
    '<dt>来源文件</dt><dd>'+esc(_clpImp.file||'annex_vi_atp22_structure.json')+'</dd></dl>'+
    '<div class="form-grid one">'+
    '<div class="field"><label class="req">人工审核人</label><input class="ctrl" id="ciAuditor" value="'+esc(CLP_TOP.owner)+'"></div>'+
    '<div class="field"><label class="inline-chk"><input type="checkbox" class="chk" id="ciOk"> 我确认已逐条核对预览变更，并对本次发布数据质量负责</label></div></div>';
}
function clpLImpFoot(n){
  if(n===1)return '<div class="left">第 1 步 / 共 5 步</div><button class="btn" onclick="closeModal()">取消</button><button class="btn primary" onclick="clpLImpNext(2)">下一步：创建新版本</button>';
  if(n===2)return '<div class="left">第 2 步 / 共 5 步</div><button class="btn" onclick="clpLImpNext(1)">上一步</button><button class="btn primary" onclick="clpLImpNext(3)">下一步：上传结构化数据</button>';
  if(n===3)return '<div class="left">第 3 步 / 共 5 步</div><button class="btn" onclick="clpLImpNext(2)">上一步</button><button class="btn primary" id="ciNext3" disabled onclick="clpLImpNext(4)">下一步：查看变更</button>';
  if(n===4)return '<div class="left">第 4 步 / 共 5 步</div><button class="btn" onclick="clpLImpNext(3)">上一步</button><button class="btn" onclick="clpLImpImpact()">查看影响范围</button><button class="btn primary" onclick="clpLImpNext(5)">提交审核</button>';
  return '<div class="left">第 5 步 / 共 5 步</div><button class="btn" onclick="clpLImpNext(4)">上一步</button><button class="btn primary" onclick="clpLImpPublish()">发布版本</button>';
}
function clpLImpNext(n){
  if(n>=2){
    if(n===2){_clpImp.modTxt=$('ciMod').options[$('ciMod').selectedIndex].text;_clpImp.mod=$('ciMod').value;_clpImp.src=$('ciSrc').value.trim();_clpImp.srcDate=$('ciSrcDate').value;}
    if(n===3){_clpImp.ver=$('ciVer').value.trim()||'ATP 22';_clpImp.eff=$('ciEff').value||'2027-02-01';_clpImp.cut=$('ciCut').value;}
    if(n===4&&!_clpImp.file){toast('请先上传结构化数据文件（或使用示例文件）','warn');return;}
  }
  $('mBody').innerHTML=clpLImpHtml(n);
  $('mFoot').innerHTML=clpLImpFoot(n);
  if(n===3&&_clpImp.file)clpLImpShowFile();
}
function clpLImpPick(el){if(!el.files.length)return;_clpImp.file=el.files[0].name;clpLImpShowFile();}
function clpLImpPickDemo(){_clpImp.file='annex_vi_atp22_structure.json';clpLImpShowFile();}
function clpLImpShowFile(){
  var row=$('ciFileRow');if(!row)return;
  row.innerHTML='<div class="file-row"><span style="font-size:16px">▤</span><div><b>'+esc(_clpImp.file)+'</b><div style="color:var(--muted);font-size:11.5px">结构化数据 · 待人工核对</div></div><span class="tag orange" style="margin-left:auto">待审核</span></div>';
  var b=$('ciNext3');if(b){b.disabled=false;b.classList.remove('disabled');}
}
function clpLImpImpact(){
  openModal({title:'影响范围（示例）',width:720,cls:'sds-scope clp-page',
    body:'<div class="notice warn" style="margin-bottom:12px"><div class="ni">!</div><div><b>影响配方 / SDS 数量为示例数据</b>（原型阶段），不代表系统已具备影响分析能力。</div></div>'+
      '<div class="stat-row"><div class="stat"><b>12</b><span>影响物质（官方变更清单）</span></div><div class="stat"><b>3 <span class="tag orange" style="font-size:10.5px">示例</span></b><span>影响配方</span></div><div class="stat"><b>2 <span class="tag orange" style="font-size:10.5px">示例</span></b><span>影响 SDS</span></div></div>',
    footer:'<button class="btn primary" onclick="closeModal()">关闭</button>'});
}
function clpLImpPublish(){
  if(!$('ciOk').checked){toast('请先勾选人工核对确认项','warn');return;}
  var auditor=($('ciAuditor')&&$('ciAuditor').value.trim())||CLP_TOP.owner;
  var ver=_clpImp.ver||'ATP 22',eff=_clpImp.eff||'2027-02-01';
  CLP_CHANGES.unshift({tp:'新增',content:ver+' 导入：新增 12 个统一分类条目（'+(_clpImp.src||'官方来源文件')+'）',reason:'ATP 发布导入 · 人工审核通过',eff:eff,by:auditor,subs:12,recipes:'3',sds:'2'});  closeModal();
  clpLGoTab('chg');
  toast('新版本已审核发布（演示），变更已记录在「版本变更与影响」','ok');
}

/* ---------- 11. 页面注册（接管 23y 原 law:clp 维护页） ---------- */
regPage('law:clp',{title:'CLP 法规库',crumb:['合规管理','法规库维护','CLP 法规库'],render:clpLRender});
