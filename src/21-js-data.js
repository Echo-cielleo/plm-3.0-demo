/* ==================================================================
   [21] 数据层 · PROJECTS / experiments / CAS_LIB / DB_CFG
   世界观：当前用户王研究员，人员 王研究员/李工/陈工/赵工
   编号统一 2026；温度默认 3 水平（80/100/120）→ 默认 21 次
   ================================================================== */

/* ---------- 人员与单位（演示数据） ---------- */
var USERS=[
  {id:'王研究员',name:'王研究员',role:'研发工程师',dept:'皮革化工研发部'},
  {id:'李工',name:'李工',role:'实验员',dept:'皮革化工研发部'},
  {id:'陈工',name:'陈工',role:'法规专员',dept:'EHS 合规部'},
  {id:'赵工',name:'赵工',role:'数据治理员',dept:'IT 数据治理'}
];

/* ---------- 项目（多对多：实验 → projectIds） ---------- */
var PROJECTS=[
  {id:'PRJ-2026-001',name:'鞋面革柔软度提升 — 优化加脂工艺',dept:'LAB-SH-1',stage:'小试',
   product:'鞋面革柔软度加脂剂',productCategory:'皮革加脂剂',industry:'皮革化工',
   stageProgress:['评审','预研','小试','中试','试生产','交付','推广'],stageDone:['评审','预研'],stageOn:2,
   startDate:'2026-04-12',dueDate:'2026-10-30',leader:'王研究员',members:['王研究员','李工'],
   category:'改进产品',source:'客户需求',coefficient:0.85,important:true,remark:'柔软度指标升级',
   oa:false,desc:'针对鞋面革柔软度提升需求，对加脂工艺中的温度、催化剂、压力进行 DOE 优化'},
  {id:'PRJ-2026-002',name:'水性聚氨酯涂饰树脂 WPU-320 国产化',dept:'LAB-SH-2',stage:'中试',
   product:'水性聚氨酯涂饰树脂 WPU-320',productCategory:'水性树脂',industry:'皮革涂饰',
   stageProgress:['评审','预研','小试','中试','试生产','交付','推广'],stageDone:['评审','预研','小试'],stageOn:3,
   startDate:'2026-02-08',dueDate:'2026-11-25',leader:'王研究员',members:['王研究员','李工','陈工'],
   category:'新产品',source:'国产替代',coefficient:0.90,important:true,remark:'进口树脂替代专项',
   oa:true,desc:'替代进口 WPU-320，完成合规与受限物质评估'},
  {id:'PRJ-2026-003',name:'合成革无溶剂工艺探索',dept:'LAB-SC-1',stage:'预研',
   product:'无溶剂合成革',productCategory:'合成革材料',industry:'合成革',
   stageProgress:['评审','预研','小试','中试','试生产','交付','推广'],stageDone:['评审'],stageOn:1,
   startDate:'2026-06-20',dueDate:'2027-03-15',leader:'李工',members:['李工','赵工'],
   category:'新产品',source:'技术预研',coefficient:0.65,important:false,remark:'无溶剂工艺路线探索',
   oa:false,desc:'探索无溶剂合成革工艺路线'},
  {id:'PRJ-2026-004',name:'皮革手感剂 HF 系列性能升级',dept:'LAB-SH-1',stage:'小试',
   product:'手感剂 HF-5',productCategory:'手感整理剂',industry:'皮革涂饰',
   stageProgress:['评审','预研','小试','中试','试生产','交付','推广'],stageDone:['评审','预研'],stageOn:2,
   startDate:'2026-05-05',dueDate:'2026-12-18',leader:'王研究员',members:['王研究员','李工'],
   category:'改进产品',source:'市场反馈',coefficient:0.75,important:false,remark:'HF 系列性能升级',
   oa:false,desc:'对手感剂 HF 系列产品进行性能优化'},
  {id:'PRJ-2026-005',name:'涂光亮剂 GL-9 欧盟合规改版',dept:'LAB-SC-2',stage:'推广',
   product:'皮革涂饰光亮剂 GL-9',productCategory:'涂饰助剂',industry:'皮革涂饰',
   stageProgress:['评审','预研','小试','中试','试生产','交付','推广'],stageDone:['评审','预研','小试','中试','试生产','交付'],stageOn:6,
   startDate:'2025-09-12',dueDate:'2026-08-30',leader:'陈工',members:['陈工','王研究员','赵工'],
   category:'改进产品',source:'法规驱动',coefficient:0.95,important:true,remark:'欧盟出口合规升级',
   oa:true,desc:'为欧盟出口完成 GL-9 配方的 SDS 与法规改版'}
];

/* ---------- DOE 因子类型与状态 ---------- */
var TYPE_DEFS=[
  {key:'全因子/部分因子设计',ico:'⊞',scene:'影响因素多，想快速筛出关键因子',solve:'如温度/压力/催化剂哪个影响最大',ready:true},
  {key:'响应曲面法',ico:'⌒',scene:'已锁定关键因子，想找到最佳配比',solve:'如最佳温度/最佳压力',ready:false},
  {key:'田口方法',ico:'⚖',scene:'想让产品更稳定，减少质量波动',solve:'稳健配方设计',ready:false},
  {key:'混料设计',ico:'⧉',scene:'配方各组分比例之和须为 100%',solve:'如树脂:固化剂:溶剂的最佳配比',ready:false}
];
var STATUS_TAG={
  '待配置':'tag-grey','待执行':'tag-blue','已录入数据':'tag-purple',
  '已分析':'tag-green','已结案':'tag-green'
};

/* ---------- 默认因子（温度 3 水平 → 默认 21 次） ---------- */
function defaultFactors(type){
  if(type==='全因子/部分因子设计') return [
    {name:'温度',type:'numeric',unit:'°C',low:'80',high:'120',levels:['80','100','120'],desc:'反应温度'},
    {name:'催化剂',type:'categorical',unit:'',levels:['A','B','C'],desc:'三种催化剂类型'},
    {name:'压力',type:'numeric',unit:'MPa',low:'1',high:'5',levels:['1','5'],desc:'反应压力'}
  ];
  if(type==='混料设计') return [
    {name:'树脂',type:'numeric',unit:'%',low:'55',high:'75',levels:['55','75'],desc:'主料占比'},
    {name:'固化剂',type:'numeric',unit:'%',low:'20',high:'40',levels:['20','40'],desc:'交联剂占比'},
    {name:'溶剂',type:'numeric',unit:'%',low:'5',high:'15',levels:['5','15'],desc:'稀释剂占比'}
  ];
  if(type==='田口方法') return [
    {name:'原料批次',type:'categorical',unit:'',levels:['批次A','批次B','批次C'],desc:'原料波动来源'},
    {name:'温度',type:'numeric',unit:'°C',low:'110',high:'130',levels:['110','130'],desc:'反应温度'},
    {name:'搅拌速度',type:'numeric',unit:'rpm',low:'200',high:'300',levels:['200','300'],desc:'混合强度'}
  ];
  if(type==='响应曲面法') return [
    {name:'温度',type:'numeric',unit:'°C',low:'110',high:'130',levels:['110','130'],desc:'反应温度'},
    {name:'压力',type:'numeric',unit:'MPa',low:'4',high:'6',levels:['4','6'],desc:'反应压力'},
    {name:'时间',type:'numeric',unit:'min',low:'30',high:'60',levels:['30','60'],desc:'反应时间'}
  ];
  return defaultFactors('全因子/部分因子设计');
}

/* ==================================================================
   实验管理 · 两层数据模型
     DOE 方案 doeSchemes[]  = 设计层：1 条 = 1 套完整实验设计方案
     实验记录 experiments[] = 执行层：1 条 = 1 次实际执行
       · 普通实验 source='普通'：手工创建，1 条记录
       · DOE 运行 source='DOE'：方案确认下发后，按试验矩阵生成 N 条
   关系：普通实验 → 1 条记录 → 录入数据 → 分析
        DOE 方案 → 试验矩阵 → 确认下发 → N 条记录 → 各组录入 → 方案统一分析
   ================================================================== */

/* ---------- 状态字典 ---------- */
var SCHEME_STATUS=['草稿','待下发','执行中','已完成'];
var SCHEME_STATUS_TAG={'草稿':'tag-grey','待下发':'tag-blue','执行中':'tag-orange','已完成':'tag-green'};
var RUN_STATUS=['待执行','执行中','已完成','已分析'];
var RUN_STATUS_TAG={'待执行':'tag-grey','执行中':'tag-blue','已完成':'tag-green','已分析':'tag-purple'};
var EXP_SOURCE=['普通实验','DOE实验'];

/* ---------- DOE 方案种子（8 条：覆盖 4 设计类型 × 4 方案状态） ----------
   运行数控制：已完成/执行中的方案才会生成实验记录，
   为兼顾演示可读性，只让 3 个方案处于「已下发」状态。          */
var doeSchemes=[];
function seedDoeSchemes(){
  var base=[
    {id:'DOE-2026-0312',name:'鞋面革柔软度提升 DOE 主实验',type:'全因子/部分因子设计',
     projectIds:['PRJ-2026-001'],owner:'李工',dueDate:'2026-09-30',status:'已完成',
     responses:['产率 %','成本 元/kg'],centerPoints:3,randomize:true,
     creator:'王研究员',createTime:'2026-08-15 09:20',analyzedAt:'2026-09-02 10:24'},
    {id:'DOE-2026-0225',name:'WPU-320 合成产率优化',type:'全因子/部分因子设计',
     projectIds:['PRJ-2026-002'],owner:'王研究员',dueDate:'2026-09-12',status:'待下发',
     responses:['产率 %','成本 元/kg'],centerPoints:3,randomize:true,
     creator:'王研究员',createTime:'2026-07-22 14:05',analyzedAt:''},
    {id:'DOE-2026-0158',name:'WPU-320 响应曲面优化',type:'响应曲面法',
     projectIds:['PRJ-2026-002'],owner:'李工',dueDate:'2026-08-25',status:'执行中',
     responses:['粘度 mPa·s'],centerPoints:3,randomize:true,
     creator:'王研究员',createTime:'2026-07-05 10:30',analyzedAt:''},
    {id:'DOE-2026-0098',name:'HF-5 手感剂田口稳健设计',type:'田口方法',
     projectIds:['PRJ-2026-004'],owner:'王研究员',dueDate:'2026-09-22',status:'待下发',
     responses:['手感评分'],centerPoints:3,randomize:true,
     creator:'王研究员',createTime:'2026-08-02 16:40',analyzedAt:''},
    {id:'DOE-2026-0067',name:'无溶剂合成革混料配比',type:'混料设计',
     projectIds:['PRJ-2026-003'],owner:'李工',dueDate:'2026-10-15',status:'草稿',
     responses:['拉伸强度 MPa'],centerPoints:3,randomize:true,
     creator:'李工',createTime:'2026-08-18 11:15',analyzedAt:''},
    {id:'DOE-2026-0041',name:'GL-9 染色温度压力筛选',type:'全因子/部分因子设计',
     projectIds:['PRJ-2026-005'],owner:'王研究员',dueDate:'2026-08-20',status:'已完成',
     responses:['色牢度 级'],centerPoints:3,randomize:true,
     factorSlice:2,   /* 只取前 2 个因子：温度 × 催化剂 */
     creator:'陈工',createTime:'2026-06-10 08:50',analyzedAt:''},
    {id:'DOE-2026-0028',name:'鞋面革柔软度验证实验',type:'全因子/部分因子设计',
     projectIds:['PRJ-2026-001'],owner:'王研究员',dueDate:'2026-11-05',status:'草稿',
     responses:['柔软度'],centerPoints:3,randomize:true,
     creator:'王研究员',createTime:'2026-09-01 13:20',analyzedAt:''},
    {id:'DOE-2026-0005',name:'染色温度压力初筛',type:'全因子/部分因子设计',
     projectIds:[],owner:'',dueDate:'',status:'草稿',
     responses:['色牢度 级'],centerPoints:0,randomize:true,
     creator:'王研究员',createTime:'2026-09-02 09:00',analyzedAt:''}
  ];
  doeSchemes=base.map(function(s){
    s.factors=defaultFactors(s.type);
    if(s.factorSlice)s.factors=s.factors.slice(0,s.factorSlice);
    s.plan=generatePlan(s.factors,s.centerPoints,s.randomize,s.id);
    return s;
  });
}

/* ---------- 实验记录（执行层） ---------- */
var experiments=[];
var doeRuns=[];
function seedExperiments(){
  var list=[];
  /* 1) 普通实验：手动创建，1 条记录含若干组平行运行 */
  [
    {id:'EXP-2026-0418',name:'WPU-320 乳液稳定性平行验证',type:'单因子平行实验',
     projectIds:['PRJ-2026-002'],owner:'王研究员',dueDate:'2026-09-18',status:'已分析',
     responses:['稳定性评分'],centerPoints:0,randomize:false,
     factors:[{name:'平行批次',type:'categorical',unit:'',levels:['批次1','批次2','批次3'],desc:'同一配方的 3 次平行样'}],
     creator:'王研究员',createTime:'2026-09-08 09:30',analyzedAt:'2026-09-12 15:40'},
    {id:'EXP-2026-0402',name:'GL-9 涂饰层耐干擦次数验证',type:'单因子平行实验',
     projectIds:['PRJ-2026-005'],owner:'陈工',dueDate:'2026-09-25',status:'已完成',
     responses:['耐干擦次数'],centerPoints:0,randomize:false,
     factors:[{name:'平行批次',type:'categorical',unit:'',levels:['批次1','批次2','批次3'],desc:'同一配方的 3 次平行样'}],
     creator:'陈工',createTime:'2026-09-14 10:10',analyzedAt:''},
    {id:'EXP-2026-0396',name:'HF-5 手感剂初步手感评价',type:'单因子平行实验',
     projectIds:['PRJ-2026-004'],owner:'李工',dueDate:'2026-09-30',status:'执行中',
     responses:['手感评分'],centerPoints:0,randomize:false,
     factors:[{name:'平行批次',type:'categorical',unit:'',levels:['批次1','批次2'],desc:'2 次平行样'}],
     creator:'李工',createTime:'2026-09-16 14:00',analyzedAt:''},
    {id:'EXP-2026-0397',name:'HF-5 手感剂批次 2606 手感复评',type:'单因子平行实验',
     projectIds:['PRJ-2026-004'],owner:'李工',dueDate:'2026-10-02',status:'已完成',
     responses:['手感评分'],centerPoints:0,randomize:false,
     factors:[{name:'平行批次',type:'categorical',unit:'',levels:['批次1','批次2'],desc:'2 次平行样'}],
     creator:'李工',createTime:'2026-09-19 10:20',analyzedAt:''},
    {id:'EXP-2026-0398',name:'HF-5 手感剂批次 2607 手感复评',type:'单因子平行实验',
     projectIds:['PRJ-2026-004'],owner:'李工',dueDate:'2026-10-05',status:'已完成',
     responses:['手感评分'],centerPoints:0,randomize:false,
     factors:[{name:'平行批次',type:'categorical',unit:'',levels:['批次1','批次2'],desc:'2 次平行样'}],
     creator:'李工',createTime:'2026-09-22 15:05',analyzedAt:''},
    {id:'EXP-2026-0389',name:'加脂剂低用量渗透对照',type:'单因子平行实验',
     projectIds:['PRJ-2026-001'],owner:'李工',dueDate:'2026-10-10',status:'已完成',
     responses:['渗透深度 mm'],centerPoints:0,randomize:false,
     factors:[{name:'平行批次',type:'categorical',unit:'',levels:['批次1','批次2','批次3'],desc:'3 次平行样'}],
     creator:'王研究员',createTime:'2026-09-22 09:40',analyzedAt:''},
    {id:'EXP-2026-0403',name:'交联剂 XL-3 加量对耐干擦影响',type:'单因子平行实验',
     projectIds:['PRJ-2026-005'],owner:'陈工',dueDate:'2026-09-28',status:'已完成',
     responses:['耐干擦次数'],centerPoints:0,randomize:false,
     factors:[{name:'平行批次',type:'categorical',unit:'',levels:['批次1','批次2','批次3'],desc:'3 次平行样'}],
     creator:'陈工',createTime:'2026-09-17 11:00',analyzedAt:''},
    {id:'EXP-2026-0388',name:'鞋面革加脂剂渗透性观察',type:'单因子平行实验',
     projectIds:['PRJ-2026-001'],owner:'李工',dueDate:'2026-10-08',status:'待执行',
     responses:['渗透深度 mm'],centerPoints:0,randomize:false,
     factors:[{name:'平行批次',type:'categorical',unit:'',levels:['批次1','批次2','批次3'],desc:'3 次平行样'}],
     creator:'王研究员',createTime:'2026-09-20 09:00',analyzedAt:''},
    /* ↓ 2026-09-14 新增：周报模板需要「一个项目挂多个实验目的」的真实结构，
       以下 3 组填补 9/07~9/13（周报默认统计周期）的空白 */
    {id:'EXP-2026-0421',name:'WPU-320 涂膜耐水白化验证',type:'单因子平行实验',
     projectIds:['PRJ-2026-002'],owner:'王研究员',experimentDate:'2026-09-10',dueDate:'2026-09-16',status:'已完成',
     responses:['耐水白化等级'],centerPoints:0,randomize:false,
     factors:[{name:'涂膜厚度',type:'categorical',unit:'μm',levels:['60','90','120'],desc:'三种涂膜厚度'}],
     creator:'王研究员',createTime:'2026-09-10 10:20',analyzedAt:''},
    {id:'EXP-2026-0422',name:'HF-5 手感剂复配比例筛选',type:'单因子平行实验',
     projectIds:['PRJ-2026-004'],owner:'王研究员',experimentDate:'2026-09-11',dueDate:'2026-09-17',status:'已分析',
     responses:['手感评分'],centerPoints:0,randomize:false,
     factors:[{name:'复配比例',type:'categorical',unit:'',levels:['3:1','2:1','1:1'],desc:'主剂与助剂配比'}],
     creator:'王研究员',createTime:'2026-09-11 09:00',analyzedAt:'2026-09-12 16:10'},
    {id:'EXP-2026-0423',name:'加脂剂用量梯度对柔软度影响',type:'单因子平行实验',
     projectIds:['PRJ-2026-001'],owner:'王研究员',experimentDate:'2026-09-09',dueDate:'2026-09-15',status:'已完成',
     responses:['柔软度评分'],centerPoints:0,randomize:false,
     factors:[{name:'加脂剂用量',type:'categorical',unit:'%',levels:['2','4','6'],desc:'三个用量水平'}],
     creator:'王研究员',createTime:'2026-09-09 14:30',analyzedAt:''}
  ].forEach(function(e){
    e.source='普通'; e.schemeId=null; e.runSeq=null;
    e.plan=generatePlan(e.factors,e.centerPoints||0,false,e.id);
    e.entered=e.plan.map(function(){var o={};e.responses.forEach(function(r){o[r]='';});return o;});
    list.push(e);
  });
  /* 2) DOE 执行层：1 条 DOE 实验承接一整套试验矩阵；每组数据放在 doeRuns[] */
  doeRuns=[];
  doeSchemes.filter(function(s){return s.status==='执行中'||s.status==='已完成';})
            .forEach(function(s){
              var runs=schemeRunRecords(s);
              doeRuns=doeRuns.concat(runs);
              list.push(schemeExecutionRecord(s,runs));
            });
  experiments=list;
  seedRunData();
}

function schemeExecutionRecord(s,runs){
  var formula=(typeof EXP_RECIPE!=='undefined'&&EXP_RECIPE[s.id])?EXP_RECIPE[s.id].rows:[];
  runs.forEach(function(run){
    run.plannedMaterials=formula.map(function(r){return {code:r.code,name:r.name,pct:r.pct,amount:(parseFloat(r.pct||0)*10).toFixed(1),process:'按方案工序投料'};});
    run.actualMaterials=run.plannedMaterials.map(function(r){return {code:r.code,name:r.name,amount:'',note:''};});
    run.exception='';run.actualDate='';run.attachments=[];
  });
  return {
    id:'EXP-'+s.id,
    name:s.name,
    source:'DOE',schemeId:s.id,runSeq:null,
    projectIds:s.projectIds.slice(),type:s.type,
    factors:JSON.parse(JSON.stringify(s.factors)),responses:s.responses.slice(),
    plan:JSON.parse(JSON.stringify(s.plan)),runs:runs,
    executionProcesses:[
      {name:'原料确认与称量',requirement:'按本组计划投料表逐项称量并复核批次'},
      {name:'反应与过程控制',requirement:'按因素设定值执行，记录实际温度、时间及异常'},
      {name:'取样与成品检测',requirement:'按响应变量要求完成取样、检测和结果登记'}
    ],
    purpose:'按 '+s.id+' 方案完成整套试验矩阵，获取可用于统计分析的响应数据。',
    keyTechnology:s.factors.map(function(f){return f.name;}).join('、'),
    experimentVariable:s.responses.join('、'),
    experimentDate:(s.createTime||'').split(' ')[0],
    owner:s.owner,dueDate:s.dueDate,status:s.status,
    creator:s.creator,createTime:s.createTime,analyzedAt:s.analyzedAt||''
  };
}

/* 方案 → N 条运行记录（种子与「确认下发」共用） */
function schemeRunRecords(s){
  return s.plan.map(function(r){
    var o={}; s.responses.forEach(function(rn){o[rn]='';});
    return {
      id:s.id+'-R'+pad2(r.runOrder),
      name:s.name,
      source:'DOE运行', schemeId:s.id, runSeq:r.runOrder,parentExecutionId:'EXP-'+s.id,
      projectIds:s.projectIds.slice(),
      type:s.type,
      factors:s.factors,                 /* 只读引用：DOE 运行不允许单独修改设计参数 */
      responses:s.responses.slice(),
      centerPoints:0, randomize:false,
      /* 该运行对应的单组矩阵（录入页只呈现这一组） */
      plan:[{stdOrder:r.stdOrder,runOrder:1,combo:r.combo.slice(),center:r.center,res:{}}],
      entered:[o],
      owner:s.owner, dueDate:s.dueDate,
      status:'待执行',
      creator:s.creator, createTime:s.createTime,
      analyzedAt:''
    };
  });
}

/* 种子录入数据：已完成方案全部录入；执行中方案部分录入 */
function seedRunData(){
  doeSchemes.forEach(function(s){
    if(s.status!=='执行中'&&s.status!=='已完成')return;
    var rng=makeRng(hashStr(s.id+':seed'));
    var ratio = s.status==='已完成' ? 1 : 0.6;
    s.plan.forEach(function(r,i){
      var rec=findRun(s.id,r.runOrder); if(!rec)return;
      if((i+1)/s.plan.length <= ratio){
        s.responses.forEach(function(rn){
          var base=60+rng()*30; if(r.center)base=82;
          rec.entered[0][rn]=base.toFixed(1);
        });
        rec.status='已完成';
        rec.actualDate=s.dueDate;
        rec.actualMaterials.forEach(function(m,i){m.amount=rec.plannedMaterials[i].amount;});
      }else{
        rec.status = ((i+1)/s.plan.length <= ratio+0.2) ? '执行中' : '待执行';
      }
    });
  });
  experiments.filter(function(e){return e.source==='普通';}).forEach(function(e){
    if(e.status==='待执行')return;
    var rng=makeRng(hashStr(e.id+':seed'));
    var full = (e.status==='已完成'||e.status==='已分析');
    e.entered=e.plan.map(function(r,ri){
      var o={};
      e.responses.forEach(function(rn){
        o[rn] = full ? (60+rng()*30).toFixed(1) : ((ri===0)?(60+rng()*30).toFixed(1):'');
      });
      return o;
    });
  });
}

/* ---------- 各实验的配方记录（B1：SDS 步骤②「从实验配方引入」的数据源） ----------
   注意：实验配方 = 研发试制的投料比，不等于实际销售成分。
   引入 SDS 时必须人工核对，这就是 wz.formula 里 chk（待核对）标记的由来。 */
var EXP_RECIPE={
  'DOE-2026-0312':{code:'FORM-2026-001',ver:'V1.2',product:'鞋面革柔软剂 SR-1',rows:[
    {code:'C-001',name:'加脂剂 F-30',cas:'68002-77-7',pct:'12.5'},
    {code:'C-002',name:'乳化剂 E-12',cas:'9005-65-6',pct:'3.0'},
    {code:'C-003',name:'甲酸',cas:'64-18-6',pct:'0.8'},
    {code:'C-004',name:'戊二醛',cas:'111-30-8',pct:'1.2'},
    {code:'C-005',name:'防腐剂 BIT',cas:'2634-33-5',pct:'0.05'}
  ]},
  'DOE-2026-0225':{code:'FORM-2026-002',ver:'V2.0',product:'水性聚氨酯涂饰树脂 WPU-320',rows:[
    {code:'C-101',name:'水',cas:'7732-18-5',pct:'45.00'},
    {code:'C-102',name:'乙二醇单丁醚',cas:'111-76-2',pct:'8.50'},
    {code:'C-103',name:'乙醇',cas:'64-17-5',pct:'5.00'},
    {code:'C-104',name:'丙烯酸',cas:'79-10-7',pct:'2.50'},
    {code:'C-105',name:'甲醛',cas:'50-00-0',pct:'0.35'},
    {code:'C-106',name:'聚氨酯预聚体',cas:'9009-54-5',pct:'38.65'}
  ]},
  'DOE-2026-0158':{code:'FORM-2026-002',ver:'V1.8',product:'水性聚氨酯涂饰树脂 WPU-320',rows:[
    {code:'C-101',name:'水',cas:'7732-18-5',pct:'43.20'},
    {code:'C-102',name:'乙二醇单丁醚',cas:'111-76-2',pct:'9.10'},
    {code:'C-104',name:'丙烯酸',cas:'79-10-7',pct:'2.80'},
    {code:'C-106',name:'聚氨酯预聚体',cas:'9009-54-5',pct:'44.90'}
  ]},
  'DOE-2026-0067':{code:'FORM-2026-003',ver:'V1.0',product:'无溶剂合成革树脂 SL-2',rows:[
    {code:'C-201',name:'聚醚多元醇',cas:'9003-11-6',pct:'52.0'},
    {code:'C-202',name:'异佛尔酮二异氰酸酯',cas:'4098-71-9',pct:'28.5'},
    {code:'C-203',name:'1,4-丁二醇',cas:'110-63-4',pct:'9.5'},
    {code:'C-204',name:'有机铋催化剂',cas:'34364-26-6',pct:'0.35'},
    {code:'C-205',name:'抗氧剂 1010',cas:'6683-19-8',pct:'0.15'}
  ]},
  'DOE-2026-0041':{code:'FORM-2026-004',ver:'V1.4',product:'皮革涂饰光亮剂 GL-9',rows:[
    {code:'C-301',name:'丙烯酸乳液',cas:'9003-01-4',pct:'61.0'},
    {code:'C-302',name:'蜡乳液',cas:'8002-74-2',pct:'14.0'},
    {code:'C-303',name:'消泡剂',cas:'63148-62-9',pct:'0.6'},
    {code:'C-304',name:'氨水',cas:'1336-21-6',pct:'1.4'},
    {code:'C-305',name:'水',cas:'7732-18-5',pct:'23.0'}
  ]},
  'DOE-2026-0098':{code:'FORM-2026-005',ver:'V1.1',product:'手感剂 HF-5',rows:[
    {code:'C-401',name:'聚二甲基硅氧烷',cas:'63148-62-9',pct:'35.0'},
    {code:'C-402',name:'乳化剂 span-80',cas:'1338-43-8',pct:'4.5'},
    {code:'C-403',name:'水',cas:'7732-18-5',pct:'60.5'}
  ]}
};
function expRecipeOf(id){
  if(EXP_RECIPE[id])return EXP_RECIPE[id];
  /* DOE 运行记录：继承所属方案的配方 */
  var _e=(typeof findExp==='function')?findExp(id):null;
  if(_e&&_e.schemeId&&EXP_RECIPE[_e.schemeId])return EXP_RECIPE[_e.schemeId];
  return {code:'FORM-2026-001',ver:'V1.2',product:'—',rows:[
    {code:'C-001',name:'加脂剂 F-30',cas:'68002-77-7',pct:'12.5'},
    {code:'C-002',name:'乳化剂 E-12',cas:'9005-65-6',pct:'3.0'},
    {code:'C-003',name:'甲酸',cas:'64-18-6',pct:'0.8'},
    {code:'C-004',name:'戊二醛',cas:'111-30-8',pct:'1.2'},
    {code:'C-005',name:'防腐剂 BIT',cas:'2634-33-5',pct:'0.05'}
  ]};
}

/* ---------- 纯函数：项目 ↔ 实验 多对多 ---------- */
function findExp(id){ return experiments.find(function(e){return e.id===id;})||doeRuns.find(function(e){return e.id===id;}); }
function findProj(id){ return PROJECTS.find(function(p){return p.id===id;}); }
function expOfProject(pid){ return experiments.filter(function(e){return e.projectIds.indexOf(pid)>=0;}); }
function projectOfExp(eid){ var e=findExp(eid); if(!e)return []; return PROJECTS.filter(function(p){return e.projectIds.indexOf(p.id)>=0;}); }
function projNameOfExp(e,idx){
  idx=idx||0;
  if(!e.projectIds.length)return '—';
  var p=findProj(e.projectIds[idx]); if(!p)return e.projectIds[idx];
  return p.name;
}
function projSummary(e){
  if(!e.projectIds.length)return '<span class="muted">未挂项目</span>';
  var first=findProj(e.projectIds[0]);
  if(e.projectIds.length===1)return esc(first?first.name:e.projectIds[0]);
  return esc(first?first.name:e.projectIds[0])+
    ' <span class="proj-more">+'+ (e.projectIds.length-1) +'</span>';
}
function addExpProject(eid,pid){
  var e=findExp(eid); if(!e)return;
  if(e.projectIds.indexOf(pid)<0)e.projectIds.push(pid);
}
function removeExpProject(eid,pid){
  var e=findExp(eid); if(!e)return;
  e.projectIds=e.projectIds.filter(function(x){return x!==pid;});
}
/* ------------------------------------------------------------------
   DOE 方案 ↔ 实验记录（两层模型关联）
   ------------------------------------------------------------------ */
function findScheme(id){ return doeSchemes.find(function(s){return s.id===id;}); }
function findRun(sid,runSeq){ return doeRuns.find(function(e){return e.schemeId===sid&&e.runSeq===runSeq;}); }
function runsOfScheme(sid){
  return doeRuns.filter(function(e){return e.schemeId===sid;}).sort(function(a,b){return a.runSeq-b.runSeq;});
}
function pad2(n){ n=parseInt(n,10)||0; return (n<10?'0':'')+n; }

/* 数据完成情况：已录入完整的运行组数 / 总组数（实验记录自身） */
function dataStatOf(e){
  var rs=(e&&e.responses)||[];
  var rows=(e&&e.entered)||[];
  var total=(e&&e.plan)?e.plan.length:0;
  var done=rows.filter(function(x){
    return rs.every(function(rn){var v=x[rn];return v!==''&&v!==null&&v!==undefined;});
  }).length;
  return {done:done,total:total,pct:total?Math.round(done/total*100):0};
}

/* 方案的数据完成情况：聚合其下各运行记录 */
function schemeDataStat(sid){
  var s=findScheme(sid); if(!s)return {done:0,total:0,pct:0};
  var rs=runsOfScheme(sid), total=s.plan.length;
  var done=rs.filter(function(rec){
    return s.responses.every(function(rn){
      var v=rec.entered&&rec.entered[0]?rec.entered[0][rn]:'';
      return v!==''&&v!==null&&v!==undefined;
    });
  }).length;
  return {done:done,total:total,pct:total?Math.round(done/total*100):0};
}

/* 方案的试验矩阵 + 各组录入值（供进度 / 报告展示；单向聚合，不做双向同步） */
function schemePlanWithRes(sid){
  var s=findScheme(sid); if(!s)return [];
  return s.plan.map(function(r){
    var rec=findRun(sid,r.runOrder);
    var o={}; s.responses.forEach(function(rn){ o[rn]= rec&&rec.entered&&rec.entered[0]?rec.entered[0][rn]:''; });
    return {stdOrder:r.stdOrder,runOrder:r.runOrder,combo:r.combo.slice(),center:r.center,res:o};
  });
}

/* 可分析对象：已完成的普通实验 + 达到分析条件的 DOE 方案 */
function analysisTargets(){
  var out=[];
  experiments.filter(function(e){return e.source==='普通'&&(e.status==='已完成'||e.status==='已分析');})
             .forEach(function(e){ out.push({kind:'exp',id:e.id,obj:e}); });
  doeSchemes.filter(function(s){return s.status==='执行中'||s.status==='已完成';})
            .forEach(function(s){ out.push({kind:'doe',id:s.id,obj:s}); });
  return out;
}
/* 数据是否已录入完整（可分析的硬门槛） */
function analysisDataReady(t){
  if(!t||!t.obj)return false;
  var st = t.kind==='doe' ? schemeDataStat(t.obj.id) : dataStatOf(t.obj);
  return st.total>0 && st.done===st.total;
}
/* 是否已生成分析结果 */
function analysisDone(t){ return !!(t&&t.obj&&t.obj.analyzedAt); }
/* 分析目标的统一类型名 */
function analysisKindLabel(t){ return t.kind==='doe'?'DOE分析':'普通实验'; }

/* ==================================================================
   实验分析与总结 · 对比总结报告层 expSummaries[]
     1 条 = 1 份对比总结报告（≠ 单次实验）：
       craft      = 工艺路线 / 工艺模板（同组共用，只描述路线与工序顺序，
                    不含具体参数取值，因此允许组内存在受控参数差异）
       diffNote   = 受控差异说明：本组实验之间刻意变化了哪些参数、哪些保持一致
       items[].craftParams = 该实验的实际工艺参数取值
       items[].diff        = 该实验在受控变量上的具体取值
       正文   = 对比区，竖向展示每个实验的
                基本信息 / 原料添加情况 / 过程测试结果 / 成品检测结果 / 总结
     实验来源：引用已有实验记录 experiments[]（expIds），
       编号/实验员/时间等由被引实验带出，目的/工艺/总结由人填写。
   ================================================================== */
function mkMat(a){ return {name:a[0],batch:a[1],qty:a[2],unit:a[3],order:a[4]}; }
function mkProc(a){ return {time:a[0],item:a[1],value:a[2],unit:a[3]}; }
function mkProd(a){ return {item:a[0],std:a[1],value:a[2],result:a[3]}; }

var expSummaries=[];
function seedExpSummaries(){
  var seed=[
    {id:'SUM-2026-0006',
     purpose:'对比国产 / 进口 WPU-320 在涂饰层的手感与耐干擦差异，为国产化替代提供依据',
     craft:'三辊涂布 → 热风烘干 → 室温熟化 → 压花',
     diffNote:'受控差异：树脂来源（国产 / 进口 / 1:1 混拼）。涂布量 18 g/m²、烘干 120 ℃ × 3 min、熟化 24 h 三组保持一致。',
     summaryOverall:'三种树脂中，进口 WPU-320 手感评分 4.5 最高、涂布流平性最好，是本对比的基准样；'+
       '国产 WPU-320 粘度略高但成膜正常，耐干擦 620 次优于标准，可作为替代候选进入中试；'+
       '1:1 混拼样手感 4.4 接近进口，但高温下出现轻微橘皮，需将涂布温度控制在 28 ℃ 以内。'+
       '综合手感、耐干擦与外观，推荐优先推进国产 WPU-320 单方替代，在中试阶段引入 1:1 混拼作为风险备选。',
     projectIds:['PRJ-2026-002'],creator:'王研究员',createTime:'2026-09-06 09:40',
     expIds:['EXP-2026-0418','DOE-2026-0158-R03','DOE-2026-0158-R07'],
     items:[
       {expId:'EXP-2026-0418',
        craftParams:'涂布量 18 g/m² · 120 ℃ × 3 min · 熟化 24 h',diff:'树脂：国产 WPU-320',
        basic:{temp:'25 ℃',duration:'4 h',device:'实验三辊机 TR-2',operator:'王研究员',date:'2026-09-08',mat:'国产 WPU-320'},
        materials:[['国产 WPU-320 树脂','WPU-D-2608B','45.0','kg',1],
                   ['去离子水','W-260901','38.0','kg',2],
                   ['乙二醇单丁醚','BCS-2607','8.5','kg',3],
                   ['有机硅手感剂 HF-5','HF5-2605','1.2','kg',4]].map(mkMat),
        processTests:[['0.5 h','粘度','860','mPa·s'],['2.0 h','细度','12','μm'],['4.0 h','pH','7.8','—']].map(mkProc),
        productTests:[['手感评分','≥ 4.0','4.2','合格'],['耐干擦','≥ 500 次','620','合格'],['成膜外观','平整无缩孔','平整','合格']].map(mkProd),
        summary:'国产树脂粘度略高但成膜正常，手感接近进口样，耐干擦优于标准，可作为替代候选进入中试。'},
       {expId:'DOE-2026-0158-R03',
        craftParams:'涂布量 18 g/m² · 120 ℃ × 3 min · 熟化 24 h',diff:'树脂：进口 WPU-320（基准样）',
        basic:{temp:'28 ℃',duration:'4 h',device:'实验三辊机 TR-2',operator:'李工',date:'2026-08-19',mat:'进口 WPU-320'},
        materials:[['进口 WPU-320 树脂','WPU-I-2608A','45.0','kg',1],
                   ['去离子水','W-260901','38.0','kg',2],
                   ['乙二醇单丁醚','BCS-2607','8.5','kg',3],
                   ['有机硅手感剂 HF-5','HF5-2605','1.2','kg',4]].map(mkMat),
        processTests:[['0.5 h','粘度','790','mPa·s'],['2.0 h','细度','10','μm'],['4.0 h','pH','7.6','—']].map(mkProc),
        productTests:[['手感评分','≥ 4.0','4.5','合格'],['耐干擦','≥ 500 次','680','合格'],['成膜外观','平整无缩孔','平整','合格']].map(mkProd),
        summary:'进口样手感评分最高（4.5），是本次对比的基准样；粘度更低，涂布流平性更好。'},
       {expId:'DOE-2026-0158-R07',
        craftParams:'涂布量 18 g/m² · 120 ℃ × 3 min · 熟化 24 h',diff:'树脂：国产 / 进口 1:1 混拼',
        basic:{temp:'32 ℃',duration:'4 h',device:'实验三辊机 TR-2',operator:'李工',date:'2026-08-21',mat:'国产/进口 1:1 混拼'},
        materials:[['国产 WPU-320 树脂','WPU-D-2608B','22.5','kg',1],
                   ['进口 WPU-320 树脂','WPU-I-2608A','22.5','kg',2],
                   ['去离子水','W-260901','38.0','kg',3],
                   ['乙二醇单丁醚','BCS-2607','8.5','kg',4]].map(mkMat),
        processTests:[['0.5 h','粘度','825','mPa·s'],['2.0 h','细度','11','μm'],['4.0 h','pH','7.7','—']].map(mkProc),
        productTests:[['手感评分','≥ 4.0','4.4','合格'],['耐干擦','≥ 500 次','650','合格'],['成膜外观','平整无缩孔','轻微橘皮','待改进']].map(mkProd),
        summary:'1:1 混拼手感接近进口样，但高温下出现轻微橘皮，需将涂布温度控制在 28 ℃ 以内。'}
     ]},
    {id:'SUM-2026-0005',
     purpose:'验证鞋面革柔软度提升 DOE 主实验中三个代表性运行的可重复性',
     craft:'喷涂 2 道 → 110 ℃ 烘干 → 压花',
     diffNote:'受控差异：加脂剂 F-30 用量（7.5% / 10.0% / 12.5%）。喷涂道数、烘干温度 110 ℃、压花 80 ℃ / 8 MPa 三组保持一致。',
     summaryOverall:'在喷涂 2 道 + 110 ℃ 烘干 + 80 ℃ / 8 MPa 压花的工艺路线下，加脂剂 F-30 用量是柔软度的关键变量：'+
       '12.5% 时柔软度 4.8、崩裂强度 238 N，吸尽率 92% 表现最佳；中心点 10.0% 柔软度 4.6、崩裂强度 221 N，'+
       '与 R05 差异 0.2，说明工艺重复性良好；降至 7.5% 后柔软度 4.1 不合格、崩裂强度 245 N 仍合格。'+
       '确认 12.5% 为本配方柔软度与强度的较优平衡点，建议作为标准用量固化，下限不宜再降。',
     projectIds:['PRJ-2026-001'],creator:'李工',createTime:'2026-09-02 14:10',
     expIds:['DOE-2026-0312-R05','DOE-2026-0312-R12','DOE-2026-0312-R18'],
     items:[
       {expId:'DOE-2026-0312-R05',
        craftParams:'喷涂 2 道 · 110 ℃ × 2 min · 压花 80 ℃ / 8 MPa',diff:'加脂剂 F-30：12.5%',
        basic:{temp:'110 ℃',duration:'2 h',device:'实验室喷涂柜 SP-1',operator:'李工',date:'2026-08-16',mat:'加脂剂 F-30 体系'},
        materials:[['加脂剂 F-30','F30-2607','12.5','kg',1],['乳化剂 E-12','E12-2606','3.0','kg',2],
                   ['甲酸','FA-2603','0.8','kg',3],['戊二醛','GA-2605','1.2','kg',4],
                   ['防腐剂 BIT','BIT-2602','0.05','kg',5]].map(mkMat),
        processTests:[['0.5 h','pH','3.6','—'],['1.0 h','浴液温度','52','℃'],['2.0 h','吸尽率','92','%']].map(mkProc),
        productTests:[['柔软度','≥ 4.5','4.8','合格'],['崩裂强度','≥ 200 N','238','合格'],['气味','≤ 3 级','3 级','合格']].map(mkProd),
        summary:'吸尽率 92%，柔软度达 4.8，为本批次最优；加脂剂用量 12.5% 是柔软度与强度的较好平衡点。'},
       {expId:'DOE-2026-0312-R12',
        craftParams:'喷涂 2 道 · 110 ℃ × 2 min · 压花 80 ℃ / 8 MPa',diff:'加脂剂 F-30：10.0%（中心点）',
        basic:{temp:'110 ℃',duration:'2 h',device:'实验室喷涂柜 SP-1',operator:'李工',date:'2026-08-18',mat:'加脂剂 F-30 体系（中心点）'},
        materials:[['加脂剂 F-30','F30-2607','10.0','kg',1],['乳化剂 E-12','E12-2606','2.5','kg',2],
                   ['甲酸','FA-2603','0.8','kg',3],['戊二醛','GA-2605','1.0','kg',4],
                   ['防腐剂 BIT','BIT-2602','0.05','kg',5]].map(mkMat),
        processTests:[['0.5 h','pH','3.8','—'],['1.0 h','浴液温度','50','℃'],['2.0 h','吸尽率','88','%']].map(mkProc),
        productTests:[['柔软度','≥ 4.5','4.6','合格'],['崩裂强度','≥ 200 N','221','合格'],['气味','≤ 3 级','3 级','合格']].map(mkProd),
        summary:'中心点重复样，柔软度 4.6，与 R05 差异 0.2，说明工艺重复性良好。'},
       {expId:'DOE-2026-0312-R18',
        craftParams:'喷涂 2 道 · 110 ℃ × 2 min · 压花 80 ℃ / 8 MPa',diff:'加脂剂 F-30：7.5%',
        basic:{temp:'110 ℃',duration:'2 h',device:'实验室喷涂柜 SP-1',operator:'王研究员',date:'2026-08-20',mat:'加脂剂 F-30 体系（低用量）'},
        materials:[['加脂剂 F-30','F30-2607','7.5','kg',1],['乳化剂 E-12','E12-2606','2.0','kg',2],
                   ['甲酸','FA-2603','0.8','kg',3],['戊二醛','GA-2605','1.0','kg',4],
                   ['防腐剂 BIT','BIT-2602','0.05','kg',5]].map(mkMat),
        processTests:[['0.5 h','pH','3.9','—'],['1.0 h','浴液温度','50','℃'],['2.0 h','吸尽率','85','%']].map(mkProc),
        productTests:[['柔软度','≥ 4.5','4.1','不合格'],['崩裂强度','≥ 200 N','245','合格'],['气味','≤ 3 级','2 级','合格']].map(mkProd),
        summary:'加脂剂降至 7.5% 后柔软度仅 4.1 不达标，确认 12.5% 为下限，不宜再降。'}
     ]},
    {id:'SUM-2026-0004',
     purpose:'总结 GL-9 染色温度压力筛选结果，确定量产工艺窗口',
     craft:'浸染 → 程序升温 → 保温 → 水洗出缸',
     diffNote:'受控差异：染浴温度（80 ℃ / 100 ℃）。浴比 1:8、升温速率 2 ℃/min、保温 30 min 保持一致。',
     summaryOverall:'染浴温度是 GL-9 上染率与色差的关键因子：80 ℃ 上染率仅 62%、色差 1.8 超标，三项指标中两项不合格，不适用于量产；'+
       '100 ℃ 上染率 88%、色差 0.9、干湿擦均合格，三项指标全部达标，是本工艺路线的中心值。'+
       '更换批次原料后重复验证（EXP-0402），结果与 R08 一致，工艺窗口稳定；推荐 100℃ / 浴比 1:8 / 30 min 作为量产工艺。',
     projectIds:['PRJ-2026-005'],creator:'陈工',createTime:'2026-08-26 10:05',
     expIds:['DOE-2026-0041-R02','DOE-2026-0041-R08','EXP-2026-0402'],
     items:[
       {expId:'DOE-2026-0041-R02',
        craftParams:'浴比 1:8 · 升温 2 ℃/min 至 80 ℃ · 保温 30 min',diff:'染浴温度：80 ℃',
        basic:{temp:'80 ℃',duration:'30 min',device:'实验室染色机 DY-3',operator:'陈工',date:'2026-06-12',mat:'酸性染料 GL-9'},
        materials:[['丙烯酸乳液','AC-2605','61.0','kg',1],['蜡乳液','WX-2604','14.0','kg',2],
                   ['消泡剂','DF-2603','0.6','kg',3],['氨水','AM-2602','1.4','kg',4],
                   ['去离子水','W-260901','23.0','kg',5]].map(mkMat),
        processTests:[['10 min','染浴温度','80','℃'],['20 min','上染率','62','%'],['30 min','残液 pH','5.2','—']].map(mkProc),
        productTests:[['色牢度（干擦）','≥ 4 级','4 级','合格'],['色牢度（湿擦）','≥ 3 级','3 级','合格'],['色差 ΔE','≤ 1.5','1.8','不合格']].map(mkProd),
        summary:'低温上染不足，色差 1.8 超标，80 ℃ 不适用。'},
       {expId:'DOE-2026-0041-R08',
        craftParams:'浴比 1:8 · 升温 2 ℃/min 至 100 ℃ · 保温 30 min',diff:'染浴温度：100 ℃',
        basic:{temp:'100 ℃',duration:'30 min',device:'实验室染色机 DY-3',operator:'陈工',date:'2026-06-15',mat:'酸性染料 GL-9'},
        materials:[['丙烯酸乳液','AC-2605','61.0','kg',1],['蜡乳液','WX-2604','14.0','kg',2],
                   ['消泡剂','DF-2603','0.6','kg',3],['氨水','AM-2602','1.4','kg',4],
                   ['去离子水','W-260901','23.0','kg',5]].map(mkMat),
        processTests:[['10 min','染浴温度','100','℃'],['20 min','上染率','88','%'],['30 min','残液 pH','5.0','—']].map(mkProc),
        productTests:[['色牢度（干擦）','≥ 4 级','4.5 级','合格'],['色牢度（湿擦）','≥ 3 级','3.5 级','合格'],['色差 ΔE','≤ 1.5','0.9','合格']].map(mkProd),
        summary:'100 ℃ 上染率 88%、色差 0.9，三项指标全部合格，推荐为量产工艺中心值。'},
       {expId:'EXP-2026-0402',
        craftParams:'浴比 1:8 · 升温 2 ℃/min 至 100 ℃ · 保温 30 min',diff:'染浴温度：100 ℃（换批原料验证）',
        basic:{temp:'100 ℃',duration:'30 min',device:'实验室染色机 DY-3',operator:'陈工',date:'2026-09-14',mat:'酸性染料 GL-9（验证样）'},
        materials:[['丙烯酸乳液','AC-2609','61.0','kg',1],['蜡乳液','WX-2608','14.0','kg',2],
                   ['消泡剂','DF-2607','0.6','kg',3],['氨水','AM-2606','1.4','kg',4],
                   ['去离子水','W-260901','23.0','kg',5]].map(mkMat),
        processTests:[['10 min','染浴温度','100','℃'],['20 min','上染率','87','%'],['30 min','残液 pH','5.1','—']].map(mkProc),
        productTests:[['色牢度（干擦）','≥ 4 级','4.5 级','合格'],['色牢度（湿擦）','≥ 3 级','3.5 级','合格'],['色差 ΔE','≤ 1.5','1.0','合格']].map(mkProd),
        summary:'更换批次原料后重复验证，结果与 R08 一致，工艺窗口稳定，可转量产。'}
     ]},
    {id:'SUM-2026-0003',
     purpose:'评价 HF-5 手感剂不同批次对成品手感评分的影响',
     craft:'喷涂 1 道 → 100 ℃ 烘干 → 室温放置 24 h 评级',
     diffNote:'受控差异：手感剂 HF-5 原料批次（2605 / 2606 / 2607）。喷涂道数、烘干温度与时间、放置时间保持一致。',
     summaryOverall:'HF-5 手感剂三个批次在相同喷涂 1 道 + 100 ℃ × 2 min 工艺下表现差异显著：'+
       '批次 2605 粒径 180 nm，手感 4.3 / 滑爽 4.1，无油斑，作为手感剂基准；'+
       '批次 2606 粒径升至 205 nm，手感卡 4.0 下限、滑爽 3.8 不合格，属临界批次需加严检验；'+
       '批次 2607 粒径 265 nm、轻微分层，手感 3.5 / 滑爽 3.6 / 轻微油斑，三项指标全不合格，判定退货。'+
       '建议将「粒径 ≤ 200 nm 且无分层」写入 HF-5 原料验收标准，从源头控制手感剂质量波动。',
     projectIds:['PRJ-2026-004'],creator:'李工',createTime:'2026-09-12 16:30',
     expIds:['EXP-2026-0396','EXP-2026-0397','EXP-2026-0398'],
     items:[
       {expId:'EXP-2026-0396',
        craftParams:'喷涂 1 道 · 100 ℃ × 2 min · 放置 24 h',diff:'手感剂批次：2605',
        basic:{temp:'25 ℃',duration:'1.5 h',device:'实验室喷涂柜 SP-1',operator:'李工',date:'2026-09-16',mat:'手感剂 HF-5（批次 2605）'},
        materials:[['聚二甲基硅氧烷','PDMS-2605','35.0','kg',1],['乳化剂 span-80','SP-2604','4.5','kg',2],
                   ['去离子水','W-260901','60.5','kg',3]].map(mkMat),
        processTests:[['0.5 h','乳液粒径','180','nm'],['1.0 h','稳定性','无分层','—'],['1.5 h','pH','6.8','—']].map(mkProc),
        productTests:[['手感评分','≥ 4.0','4.3','合格'],['滑爽度','≥ 4.0','4.1','合格'],['油斑','不允许','无','合格']].map(mkProd),
        summary:'批次 2605 乳液粒径 180 nm、无分层，手感 4.3 合格，可作为手感剂的粒径基准。'},
       {expId:'EXP-2026-0397',
        craftParams:'喷涂 1 道 · 100 ℃ × 2 min · 放置 24 h',diff:'手感剂批次：2606',
        basic:{temp:'25 ℃',duration:'1.5 h',device:'实验室喷涂柜 SP-1',operator:'李工',date:'2026-09-19',mat:'手感剂 HF-5（批次 2606）'},
        materials:[['聚二甲基硅氧烷','PDMS-2606','35.0','kg',1],['乳化剂 span-80','SP-2604','4.5','kg',2],
                   ['去离子水','W-260901','60.5','kg',3]].map(mkMat),
        processTests:[['0.5 h','乳液粒径','205','nm'],['1.0 h','稳定性','无分层','—'],['1.5 h','pH','6.9','—']].map(mkProc),
        productTests:[['手感评分','≥ 4.0','4.0','合格'],['滑爽度','≥ 4.0','3.8','不合格'],['油斑','不允许','无','合格']].map(mkProd),
        summary:'批次 2606 粒径升至 205 nm，手感卡在 4.0 下限、滑爽度 3.8 不合格，属临界批次，建议加严检验后使用。'},
       {expId:'EXP-2026-0398',
        craftParams:'喷涂 1 道 · 100 ℃ × 2 min · 放置 24 h',diff:'手感剂批次：2607',
        basic:{temp:'25 ℃',duration:'1.5 h',device:'实验室喷涂柜 SP-1',operator:'李工',date:'2026-09-22',mat:'手感剂 HF-5（批次 2607）'},
        materials:[['聚二甲基硅氧烷','PDMS-2607','35.0','kg',1],['乳化剂 span-80','SP-2604','4.5','kg',2],
                   ['去离子水','W-260901','60.5','kg',3]].map(mkMat),
        processTests:[['0.5 h','乳液粒径','265','nm'],['1.0 h','稳定性','轻微分层','—'],['1.5 h','pH','7.1','—']].map(mkProc),
        productTests:[['手感评分','≥ 4.0','3.5','不合格'],['滑爽度','≥ 4.0','3.6','不合格'],['油斑','不允许','轻微','不合格']].map(mkProd),
        summary:'批次 2607 粒径 265 nm、轻微分层，手感与滑爽度均不合格，判定该批次退货；建议将粒径 ≤ 200 nm 写入原料验收标准。'}
     ]},
    {id:'SUM-2026-0002',
     purpose:'观察鞋面革加脂剂在不同渗透时间下的渗透深度，确定最佳渗透时间',
     craft:'刷涂 → 室温渗透 → 分段取样切片观察',
     diffNote:'受控差异：加脂剂稀释液浓度（12.5% / 7.5%）。刷涂量、室温渗透条件、切片观察方法保持一致。',
     summaryOverall:'加脂剂稀释液浓度对渗透速度与表面残留影响显著：'+
       '12.5% 浓度下 2 h 后渗透明显放缓，3 h 达 0.75 mm 达标、柔软度 4.6，但表面有轻微残留；'+
       '7.5% 浓度下 3 h 仅 0.51 mm 不达标、柔软度 4.2 不合格，但表面无残留。'+
       '确认 12.5% 为浓度下限，不宜再降；生产可取 2.5 h 兼顾效率，并在出料后增加表面擦拭工序处理轻微残留。',
     projectIds:['PRJ-2026-001'],creator:'李工',createTime:'2026-09-20 11:20',
     expIds:['EXP-2026-0388','EXP-2026-0389'],
     items:[
       {expId:'EXP-2026-0388',
        craftParams:'刷涂 2 道 · 室温渗透 3 h · 1/2/3 h 分段取样',diff:'加脂剂浓度：12.5%',
        basic:{temp:'25 ℃',duration:'3 h',device:'渗透实验台 PT-1',operator:'李工',date:'2026-09-20',mat:'加脂剂 F-30 稀释液'},
        materials:[['加脂剂 F-30','F30-2607','12.5','kg',1],['去离子水','W-260901','87.5','kg',2],
                   ['渗透促进剂','PA-2601','0.5','kg',3]].map(mkMat),
        processTests:[['1.0 h','渗透深度','0.42','mm'],['2.0 h','渗透深度','0.68','mm'],['3.0 h','渗透深度','0.75','mm']].map(mkProc),
        productTests:[['渗透深度','0.6 ~ 0.9 mm','0.75','合格'],['表面残留','无明显油斑','轻微','待改进'],['柔软度','≥ 4.5','4.6','合格']].map(mkProd),
        summary:'12.5% 浓度下 2 h 后渗透明显放缓，3 h 达 0.75 mm 达标，但表面有轻微残留，需增加表面擦拭工序。'},
       {expId:'EXP-2026-0389',
        craftParams:'刷涂 2 道 · 室温渗透 3 h · 1/2/3 h 分段取样',diff:'加脂剂浓度：7.5%',
        basic:{temp:'25 ℃',duration:'3 h',device:'渗透实验台 PT-1',operator:'李工',date:'2026-09-22',mat:'加脂剂 F-30 稀释液（低浓度）'},
        materials:[['加脂剂 F-30','F30-2607','7.5','kg',1],['去离子水','W-260901','92.5','kg',2],
                   ['渗透促进剂','PA-2601','0.5','kg',3]].map(mkMat),
        processTests:[['1.0 h','渗透深度','0.28','mm'],['2.0 h','渗透深度','0.43','mm'],['3.0 h','渗透深度','0.51','mm']].map(mkProc),
        productTests:[['渗透深度','0.6 ~ 0.9 mm','0.51','不合格'],['表面残留','无明显油斑','无','合格'],['柔软度','≥ 4.5','4.2','不合格']].map(mkProd),
        summary:'浓度降至 7.5% 后 3 h 仅 0.51 mm 不达标、柔软度 4.2 也不合格，但表面无残留；确认 12.5% 为下限，不宜再降。'}
     ]},
    {id:'SUM-2026-0001',
     purpose:'归档涂饰层耐干擦工艺优化过程，形成可复用作业标准',
     craft:'辊涂 2 道 → 90 ℃ 烘干 → 室温熟化 48 h',
     diffNote:'受控差异：交联剂 XL-3 加量（0% / 2%）。辊涂道数、烘干温度与时间、熟化时间保持一致。',
     summaryOverall:'在辊涂 2 道 + 90 ℃ × 2 min + 室温熟化 48 h 的工艺路线下，交联剂 XL-3 加量是耐干擦达标的关键因子：'+
       '加 2% XL-3 时耐干擦 590 次、耐湿擦 260 次、附着力 4 级，三项指标全部合格；'+
       '空白对照（不加 XL-3）耐干擦仅 480 次不合格、附着力 3 级不合格，仅耐湿擦勉强合格。'+
       '对照结果反证 XL-3 是耐干擦达标的关键因素，建议将「WPU-320 + 2% XL-3」固化为标准配方并写入作业指导书。',
     projectIds:['PRJ-2026-005'],creator:'陈工',createTime:'2026-09-18 09:15',
     expIds:['EXP-2026-0402','EXP-2026-0403'],
     items:[
       {expId:'EXP-2026-0402',
        craftParams:'辊涂 2 道 · 90 ℃ × 2 min · 熟化 48 h',diff:'交联剂 XL-3：2.0%',
        basic:{temp:'90 ℃',duration:'2 h',device:'实验室辊涂机 RC-2',operator:'陈工',date:'2026-09-14',mat:'水性聚氨酯涂饰树脂'},
        materials:[['WPU-320 树脂','WPU-D-2608B','45.0','kg',1],['去离子水','W-260901','38.0','kg',2],
                   ['乙二醇单丁醚','BCS-2607','8.5','kg',3],['交联剂 XL-3','XL3-2606','2.0','kg',4],
                   ['消泡剂','DF-2607','0.6','kg',5]].map(mkMat),
        processTests:[['0.5 h','粘度','880','mPa·s'],['1.0 h','固含','32','%'],['2.0 h','pH','7.9','—']].map(mkProc),
        productTests:[['耐干擦','≥ 500 次','590','合格'],['耐湿擦','≥ 200 次','260','合格'],['附着力','≥ 4 级','4 级','合格']].map(mkProd),
        summary:'加入 2% 交联剂 XL-3 后耐干擦达 590 次，三项指标全部合格，建议固化为标准配方。'},
       {expId:'EXP-2026-0403',
        craftParams:'辊涂 2 道 · 90 ℃ × 2 min · 熟化 48 h',diff:'交联剂 XL-3：0%（空白对照）',
        basic:{temp:'90 ℃',duration:'2 h',device:'实验室辊涂机 RC-2',operator:'陈工',date:'2026-09-17',mat:'水性聚氨酯涂饰树脂（对照）'},
        materials:[['WPU-320 树脂','WPU-D-2608B','45.0','kg',1],['去离子水','W-260901','40.0','kg',2],
                   ['乙二醇单丁醚','BCS-2607','8.5','kg',3],['消泡剂','DF-2607','0.6','kg',4]].map(mkMat),
        processTests:[['0.5 h','粘度','820','mPa·s'],['1.0 h','固含','30','%'],['2.0 h','pH','7.8','—']].map(mkProc),
        productTests:[['耐干擦','≥ 500 次','480','不合格'],['耐湿擦','≥ 200 次','210','合格'],['附着力','≥ 4 级','3 级','不合格']].map(mkProd),
        summary:'未加交联剂的空白对照耐干擦仅 480 次、附着力 3 级，双双不合格，反证 XL-3 是耐干擦达标的关键因子。'}
     ]}
  ];
  expSummaries=seed.map(function(s){
    var p=s.projectIds.length?findProj(s.projectIds[0]):null;
    s.leader=p?(p.leader||''):'';
    s.dept=p?(p.dept||''):'';
    /* 整体总结兜底：缺省时拼接各组的结论，便于详情页与列表快速浏览 */
    if(typeof s.summaryOverall!=='string'){
      s.summaryOverall=(s.items||[]).map(function(it){return it.summary||'';}).filter(Boolean).join(' ');
    }
    return s;
  });
}
/* 汇总：报告关联的实验中任一命中即算命中 */
function sumMatchExp(sum,fn){ return (sum.expIds||[]).some(function(id){var e=findExp(id);return !!e&&fn(e);}); }
function sumOwners(sum){
  var out=[];
  (sum.expIds||[]).forEach(function(id){var e=findExp(id); if(e&&e.owner&&out.indexOf(e.owner)<0)out.push(e.owner);});
  return out;
}
function findSummary(id){ return expSummaries.find(function(s){return s.id===id;}); }

/* ------------------------------------------------------------------
   B2：公司档案（公司级，一次维护多次复用）
   行政联系信息的数据源 —— 编写 SDS 第 1 章时按目标市场联动带出
   ------------------------------------------------------------------ */
var COMPANY={
  cn:'华东新材料科技有限公司',
  en:'Huadong Advanced Materials Technology Co., Ltd.',
  addrCn:'江苏省苏州市工业园区星湖街 218 号新材料产业园 A 幢 8 层',
  addrEn:'8F, Building A, New Materials Industrial Park, No. 218 Xinghu Street, SIP, Suzhou, Jiangsu, P.R. China',
  zip:'215123',
  tel:'+86 512 6288 6600',
  fax:'+86 512 6288 6601',
  mail:'sds@hd-materials.com',
  emergencyCn:'0532-8388-9090（国家化学品事故应急咨询 · 24 小时）',
  emergencyEu:'+86 512 6288 6600（工作日 09:00–18:00 CST，非工作时间转接应急值班）'
};
/* B2：境外责任主体 —— 按目标市场自动带出，选市场后联动 */
var OR_BY_MARKET={
  EU:{tag:'欧盟 OR（唯一代表）',
      name:'ChemCon Regulatory GmbH · 德国杜塞尔多夫',
      tel:'+49 211 5504 220',
      pcn:'已完成 PCN 通报（德国 BfR）· 毒理中心应急电话：+49 30 19240',
      rule:'REACH 第 8 条：欧盟境外制造商须委托 OR 承担进口商义务；完成 PCN 通报后须在第 1 章列明毒理中心应急电话'},
  UK:{tag:'英国 OR（唯一代表）',
      name:'UK REACH Compliance Ltd. · 英国曼彻斯特',
      tel:'+44 161 000 0000',
      pcn:'—',
      rule:'UK REACH 第 8 条：欧盟境外制造商进入英国（含北爱）市场须委托英国 OR'},
  TR:{tag:'土耳其进口商',
      name:'（待维护）',
      tel:'（待维护）',
      pcn:'—',
      rule:'土耳其 KKDIK 要求 SDS 第 1 章列明境内进口商名称与联系方式'}
};
