/* ==================================================================
   [27] S4 · 剩余模块轻量列表页
   覆盖：供应商 / 库存 / 产品 / 推广 / 送检 / 检测报告 /
         设备×4 / 文档 / 知识 / 产权 / 出口注册
   本轮只做列表页：行点击统一 toast 占位，杜绝死链。
   下一轮补详情页时，只需把 detailSoon() 换成
   showPage('xxx:detail',{id:...}) 并在 HL_MAP 补一行映射。
   ================================================================== */

/* ---------- 通用：详情占位提示（下一轮替换为真实跳转） ---------- */
function detailSoon(name){
  toast((name||'该记录')+' 的详情页将在下一轮迭代中补充','info');
}

/* ---------- 通用：挂载列表页 ---------- */
function lp(cfg){
  $('pageHost').innerHTML='<div id="lpHost"></div>';
  renderListPage(cfg);
}

/* ---------- 通用：列表页骨架（标题/说明/列/数据/筛选/占位点击） ---------- */
function listCfg(o){
  var cfg={
    title:o.title,
    sub:o.sub,
    cols:o.cols,
    rows:o.rows,
    kwKeys:o.kwKeys,
    filters:o.filters||[],
    pageSize:o.pageSize||10,
    headActs:o.headActs||(''+
      '<button class="btn" onclick="toast(\'筛选条件已重置\',\'info\')">重置筛选</button>'+
      '<button class="btn btn-primary" onclick="toast(\''+o.title+' 新建表单（演示环境为只读原型）\',\'info\')">＋ 新建</button>'),
    acts:o.acts||function(r){ return '<button class="btn btn-link" onclick="detailSoon(\''+esc(o.unit)+'\')">查看</button>'; },
    onRowClick:o.onRowClick||function(r){ detailSoon(o.unit); }
  };
  return cfg;
}

/* ---------- 通用：状态标签 ---------- */
var GEN_TAG={
  '正常':'tag-green','在产':'tag-green','合格':'tag-green','通过':'tag-green','已落地':'tag-green',
  '已授权':'tag-green','已发布':'tag-green','已归档':'tag-green','已提交':'tag-green',
  '校准中':'tag-blue','研发中':'tag-blue','试产':'tag-blue','观察':'tag-blue',
  '检测中':'tag-blue','量产导入':'tag-blue','已公开':'tag-blue','实质审查':'tag-blue',
  '维修':'tag-orange','部分通过':'tag-orange','样品验证':'tag-orange','客户试用':'tag-orange',
  '商务谈判':'tag-orange','已受理':'tag-orange','待更新':'tag-orange',
  '停用':'tag-grey','停产':'tag-grey','已驳回':'tag-grey','草稿':'tag-grey','已关闭':'tag-grey',
  '不足':'tag-red','不通过':'tag-red','缺货':'tag-red'
};
function gtag(v){ return '<span class="tag '+(GEN_TAG[v]||'tag-grey')+'">'+esc(v)+'</span>'; }
function mono(v){ return '<span class="mono">'+esc(v)+'</span>'; }

/* ==================================================================
   数据：原料供应商 bd:supplier
   ================================================================== */
var SUPPLIERS=[
  {code:'SUP-2026-001',name:'万华化学集团股份有限公司',type:'生产商',cat:'聚氨酯树脂·预聚体',region:'山东 烟台',since:'2019-03',grade:'A',status:'合格'},
  {code:'SUP-2026-002',name:'巴斯夫（中国）有限公司',type:'生产商',cat:'丙烯酸单体·助剂',region:'上海',since:'2017-06',grade:'A',status:'合格'},
  {code:'SUP-2026-003',name:'浙江闰土股份有限公司',type:'生产商',cat:'加脂剂·染料中间体',region:'浙江 绍兴',since:'2020-09',grade:'B',status:'合格'},
  {code:'SUP-2026-004',name:'江苏三木集团有限公司',type:'生产商',cat:'溶剂·成膜助剂',region:'江苏 宜兴',since:'2018-11',grade:'A',status:'合格'},
  {code:'SUP-2026-005',name:'山东朗晖石油化学股份有限公司',type:'生产商',cat:'合成加脂剂基础油',region:'山东 淄博',since:'2021-04',grade:'B',status:'合格'},
  {code:'SUP-2026-006',name:'广州天赐高新材料股份有限公司',type:'生产商',cat:'表面活性剂',region:'广东 广州',since:'2022-01',grade:'A',status:'合格'},
  {code:'SUP-2026-007',name:'上海凯茵化工有限公司',type:'经销商',cat:'进口助剂代采',region:'上海',since:'2020-05',grade:'B',status:'观察'},
  {code:'SUP-2026-008',name:'常州山峰化工有限公司',type:'生产商',cat:'铬鞣剂·蒙囿剂',region:'江苏 常州',since:'2016-08',grade:'A',status:'合格'},
  {code:'SUP-2026-009',name:'安徽金禾实业股份有限公司',type:'生产商',cat:'工业溶剂',region:'安徽 滁州',since:'2021-12',grade:'C',status:'观察'},
  {code:'SUP-2026-010',name:'陶氏化学（张家港）有限公司',type:'生产商',cat:'有机硅手感剂',region:'江苏 张家港',since:'2019-10',grade:'A',status:'合格'},
  {code:'SUP-2025-004',name:'河北诚信集团有限公司',type:'生产商',cat:'甲醛水溶液',region:'河北 石家庄',since:'2015-07',grade:'C',status:'停用'},
  {code:'SUP-2025-001',name:'张家港保税区华昌化工有限公司',type:'经销商',cat:'包装桶·辅材',region:'江苏 张家港',since:'2014-02',grade:'B',status:'合格'}
];
var GRADE_TAG={'A':'tag-green','B':'tag-blue','C':'tag-orange'};

/* ==================================================================
   数据：产品基础信息 prod:list
   ================================================================== */
var PRODUCTS=[
  {code:'PRD-2026-001',name:'水性聚氨酯涂饰树脂 WPU-320',cat:'涂饰树脂',series:'WPU 系列',prj:'PRJ-2026-002',owner:'王研究员',upd:'2026-08-28',status:'在产',catPath:'涂饰产品/聚氨酯树脂'},
  {code:'PRD-2026-002',name:'皮革涂饰光亮剂 GL-9',cat:'涂饰助剂',series:'GL 系列',prj:'PRJ-2026-005',owner:'陈工',upd:'2026-09-01',status:'在产',catPath:'涂饰产品/光亮剂'},
  {code:'PRD-2026-003',name:'加脂剂 L-27',cat:'加脂剂',series:'L 系列',prj:'PRJ-2026-001',owner:'王研究员',upd:'2026-08-20',status:'在产',catPath:'水场产品/加脂剂/加脂剂'},
  {code:'PRD-2026-004',name:'铬鞣剂 CR-33',cat:'鞣剂',series:'CR 系列',prj:'',owner:'陈工',upd:'2026-07-15',status:'在产',catPath:'水场产品/鞣剂'},
  {code:'PRD-2026-005',name:'水性封底树脂 SB-11',cat:'涂饰树脂',series:'SB 系列',prj:'',owner:'李工',upd:'2026-06-30',status:'在产',catPath:'涂饰产品/复合树脂'},
  {code:'PRD-2026-006',name:'手感剂 HF-5',cat:'手感剂',series:'HF 系列',prj:'PRJ-2026-004',owner:'王研究员',upd:'2026-08-12',status:'在产',catPath:'涂饰产品/手感剂'},
  {code:'PRD-2026-007',name:'交联剂 XL-3',cat:'交联剂',series:'XL 系列',prj:'',owner:'李工',upd:'2026-05-22',status:'在产',catPath:'涂饰产品/交联剂/交联剂'},
  {code:'PRD-2026-008',name:'防霉剂 AM-7',cat:'防霉剂',series:'AM 系列',prj:'',owner:'赵工',upd:'2026-04-18',status:'在产',catPath:'水场产品/杀菌防霉剂'},
  {code:'PRD-2026-009',name:'无溶剂合成革树脂 NS-10',cat:'合成革树脂',series:'NS 系列',prj:'PRJ-2026-003',owner:'李工',upd:'2026-09-02',status:'研发中',catPath:'涂饰产品/聚氨酯树脂/合成革聚氨酯'},
  {code:'PRD-2026-010',name:'生物基加脂剂 BIO-30',cat:'加脂剂',series:'BIO 系列',prj:'',owner:'王研究员',upd:'2026-08-05',status:'研发中',catPath:'水场产品/加脂剂/加脂剂'},
  {code:'PRD-2026-011',name:'水性消光填料浆 XG-6',cat:'涂饰助剂',series:'XG 系列',prj:'',owner:'李工',upd:'2026-07-08',status:'试产',catPath:'涂饰产品/涂饰助剂/填料'},
  {code:'PRD-2026-012',name:'蒙囿剂 MK-2',cat:'鞣剂助剂',series:'MK 系列',prj:'',owner:'陈工',upd:'2026-03-11',status:'停产',catPath:''},
  {code:'PRD-2026-013',name:'皮革酶制剂复合酶 ENZ-100',cat:'酶制剂类',series:'ENZ 系列',prj:'',owner:'王研究员',upd:'2026-09-05',status:'研发中',catPath:'水场产品/酶制剂'}
];

/* ==================================================================
   数据：产品推广计划
   （原 prod:promo 列表页已删除——推广已并入项目第七阶段；
     PROMOS 仍作为项目详情推广表单「目标客户 / 推广渠道 / 推进阶段」的回退数据源，勿删）
   ================================================================== */
var PROMOS=[
  {id:'PMO-2026-008',product:'水性聚氨酯涂饰树脂 WPU-320',customer:'华东代工厂集群（6 家）',channel:'技术交流会',stage:'客户试用',owner:'王研究员',period:'2026-07 ~ 2026-12'},
  {id:'PMO-2026-007',product:'皮革涂饰光亮剂 GL-9',customer:'某知名沙发制造厂（出口欧盟）',channel:'展会 + 线上',stage:'商务谈判',owner:'陈工',period:'2026-06 ~ 2026-11'},
  {id:'PMO-2026-006',product:'加脂剂 L-27',customer:'某国际运动品牌（华东代工厂）',channel:'客户拜访',stage:'量产导入',owner:'王研究员',period:'2026-08 ~ 2026-12'},
  {id:'PMO-2026-005',product:'手感剂 HF-5',customer:'华南后整理加工厂（3 家）',channel:'样品寄送',stage:'样品验证',owner:'李工',period:'2026-05 ~ 2026-10'},
  {id:'PMO-2026-004',product:'水性封底树脂 SB-11',customer:'某合资汽车内饰厂',channel:'技术方案推介',stage:'商务谈判',owner:'赵工',period:'2026-04 ~ 2026-09'},
  {id:'PMO-2026-003',product:'无溶剂合成革树脂 NS-10',customer:'某箱包品牌（出口欧盟）',channel:'联合开发',stage:'前期接洽',owner:'李工',period:'2026-09 ~ 2027-03'},
  {id:'PMO-2026-002',product:'生物基加脂剂 BIO-30',customer:'可持续品牌联盟',channel:'行业论坛',stage:'前期接洽',owner:'王研究员',period:'2026-08 ~ 2027-02'},
  {id:'PMO-2026-001',product:'交联剂 XL-3',customer:'西部制革园区（渠道）',channel:'渠道分销',stage:'已落地',owner:'赵工',period:'2025-11 ~ 2026-06'}
];

/* ==================================================================
   数据：送检记录 qc:submit
   ================================================================== */
var SUBMITS=[
  {id:'QC-2026-0142',sample:'加脂剂 L-27（批次 L27-2608A）',item:'APEO / 甲醛 / 重金属',org:'SGS 通标（上海）',by:'陈工',date:'2026-08-26',status:'检测中'},
  {id:'QC-2026-0138',sample:'皮革涂饰光亮剂 GL-9（V2.1）',item:'VOC / SVHC 233 项',org:'Intertek 天祥（广州）',by:'陈工',date:'2026-08-22',status:'已出报告'},
  {id:'QC-2026-0131',sample:'WPU-320 国产化中试样',item:'固含 / 粘度 / 成膜性',org:'华测检测 CTI（苏州）',by:'王研究员',date:'2026-08-15',status:'已出报告'},
  {id:'QC-2026-0125',sample:'铬鞣剂 CR-33 成品',item:'Cr(VI) / 总铬',org:'SGS 通标（上海）',by:'陈工',date:'2026-08-09',status:'已出报告'},
  {id:'QC-2026-0118',sample:'鞋面革涂饰样片',item:'柔软度 / 耐磨（马丁代尔）',org:'中纺标（北京）',by:'李工',date:'2026-07-30',status:'已出报告'},
  {id:'QC-2026-0112',sample:'手感剂 HF-5 改配方样',item:'APEO 残留 / 手感评分',org:'Intertek 天祥（广州）',by:'李工',date:'2026-07-24',status:'已出报告'},
  {id:'QC-2026-0104',sample:'无溶剂合成革试片',item:'耐水解（2000h）',org:'华测检测 CTI（苏州）',by:'李工',date:'2026-07-16',status:'检测中'},
  {id:'QC-2026-0097',sample:'汽车座椅革涂饰层',item:'VOC（袋式法）',org:'BV 必维（上海）',by:'王研究员',date:'2026-07-08',status:'已出报告'},
  {id:'QC-2026-0089',sample:'水性封底树脂 SB-11',item:'QUV 老化 500h / ΔE',org:'SGS 通标（上海）',by:'李工',date:'2026-06-28',status:'已出报告'},
  {id:'QC-2026-0076',sample:'交联剂 XL-3',item:'游离甲醛 / 贮存稳定性',org:'华测检测 CTI（苏州）',by:'赵工',date:'2026-06-15',status:'已出报告'},
  {id:'QC-2026-0063',sample:'防霉剂 AM-7',item:'防霉等级 / 急性毒性',org:'中纺标（北京）',by:'赵工',date:'2026-05-30',status:'已出报告'},
  {id:'QC-2026-0051',sample:'生物基加脂剂 BIO-30 小试',item:'生物基碳含量（ASTM D6866）',org:'BV 必维（上海）',by:'王研究员',date:'2026-05-19',status:'已出报告'}
];

/* ==================================================================
   数据：检测结果报告 qc:report
   ================================================================== */
var QCREPORTS=[
  {id:'RPT-2026-0138',submit:'QC-2026-0138',sample:'皮革涂饰光亮剂 GL-9（V2.1）',result:'通过',date:'2026-08-29',org:'Intertek 天祥（广州）'},
  {id:'RPT-2026-0131',submit:'QC-2026-0131',sample:'WPU-320 国产化中试样',result:'部分通过',date:'2026-08-21',org:'华测检测 CTI（苏州）'},
  {id:'RPT-2026-0125',submit:'QC-2026-0125',sample:'铬鞣剂 CR-33 成品',result:'通过',date:'2026-08-14',org:'SGS 通标（上海）'},
  {id:'RPT-2026-0118',submit:'QC-2026-0118',sample:'鞋面革涂饰样片',result:'通过',date:'2026-08-05',org:'中纺标（北京）'},
  {id:'RPT-2026-0112',submit:'QC-2026-0112',sample:'手感剂 HF-5 改配方样',result:'不通过',date:'2026-07-31',org:'Intertek 天祥（广州）'},
  {id:'RPT-2026-0097',submit:'QC-2026-0097',sample:'汽车座椅革涂饰层',result:'通过',date:'2026-07-15',org:'BV 必维（上海）'},
  {id:'RPT-2026-0089',submit:'QC-2026-0089',sample:'水性封底树脂 SB-11',result:'通过',date:'2026-07-05',org:'SGS 通标（上海）'},
  {id:'RPT-2026-0076',submit:'QC-2026-0076',sample:'交联剂 XL-3',result:'通过',date:'2026-06-22',org:'华测检测 CTI（苏州）'},
  {id:'RPT-2026-0063',submit:'QC-2026-0063',sample:'防霉剂 AM-7',result:'通过',date:'2026-06-06',org:'中纺标（北京）'},
  {id:'RPT-2026-0051',submit:'QC-2026-0051',sample:'生物基加脂剂 BIO-30 小试',result:'部分通过',date:'2026-05-27',org:'BV 必维（上海）'},
  {id:'RPT-2026-0044',submit:'QC-2026-0044',sample:'无溶剂合成革试片（500h）',result:'通过',date:'2026-05-12',org:'华测检测 CTI（苏州）'},
  {id:'RPT-2026-0031',submit:'QC-2026-0031',sample:'加脂剂 L-27（批次 L27-2605B）',result:'不通过',date:'2026-04-25',org:'SGS 通标（上海）'}
];

/* ==================================================================
   数据：设备列表 eq:list
   ================================================================== */
var EQUIPMENTS=[
  {id:'EQ-2026-001',name:'电子万能材料试验机',model:'WDW-20',loc:'检测中心 A101',status:'正常',owner:'李工',cal:'2026-11-20'},
  {id:'EQ-2026-002',name:'气相色谱质谱联用仪',model:'GC-MS QP2020',loc:'检测中心 A103',status:'正常',owner:'陈工',cal:'2026-10-15'},
  {id:'EQ-2026-003',name:'傅里叶变换红外光谱仪',model:'FTIR-650',loc:'检测中心 A103',status:'正常',owner:'陈工',cal:'2026-12-08'},
  {id:'EQ-2026-004',name:'QUV 紫外老化试验箱',model:'QUV/spray',loc:'老化室 B201',status:'正常',owner:'李工',cal:'2027-01-12'},
  {id:'EQ-2026-005',name:'恒温恒湿箱',model:'HS-408',loc:'老化室 B202',status:'校准中',owner:'李工',cal:'2026-09-18'},
  {id:'EQ-2026-006',name:'马丁代尔耐磨试验仪',model:'M235',loc:'检测中心 A105',status:'正常',owner:'李工',cal:'2026-11-05'},
  {id:'EQ-2026-007',name:'皮革柔软度测定仪',model:'GT-303',loc:'检测中心 A105',status:'正常',owner:'王研究员',cal:'2026-10-28'},
  {id:'EQ-2026-008',name:'旋转粘度计',model:'NDJ-8S',loc:'合成实验室 C102',status:'正常',owner:'王研究员',cal:'2026-12-20'},
  {id:'EQ-2026-009',name:'激光粒度分析仪',model:'LS-609',loc:'合成实验室 C104',status:'正常',owner:'王研究员',cal:'2027-02-10'},
  {id:'EQ-2026-010',name:'高温老化试验箱',model:'GH-100',loc:'老化室 B203',status:'维修',owner:'赵工',cal:'2026-09-30'},
  {id:'EQ-2026-011',name:'分析天平（万分之一）',model:'ME204E',loc:'检测中心 A102',status:'正常',owner:'陈工',cal:'2026-10-10'},
  {id:'EQ-2026-012',name:'台式 pH 计',model:'FE28',loc:'合成实验室 C102',status:'停用',owner:'赵工',cal:'—'}
];

/* ==================================================================
   数据：设备能力 eq:cap
   ================================================================== */
var EQCAPS=[
  {eq:'EQ-2026-001',cap:'拉伸/撕裂强度',range:'0 ~ 20 kN',acc:'±0.5%',proc:'革样力学性能',status:'正常'},
  {eq:'EQ-2026-002',cap:'VOC / SVOC 定性定量',range:'0.1 ~ 1000 mg/m³',acc:'±2%',proc:'VOC 排放检测',status:'正常'},
  {eq:'EQ-2026-003',cap:'官能团结构表征',range:'4000 ~ 400 cm⁻¹',acc:'±0.01 cm⁻¹',proc:'树脂结构确认',status:'正常'},
  {eq:'EQ-2026-004',cap:'QUV 人工老化',range:'0 ~ 2000 h',acc:'±2 h',proc:'耐黄变评估',status:'正常'},
  {eq:'EQ-2026-005',cap:'恒温恒湿循环',range:'-20 ~ 150 ℃ / 20~98%RH',acc:'±0.5 ℃',proc:'耐水解试验',status:'校准中'},
  {eq:'EQ-2026-006',cap:'马丁代尔耐磨',range:'0 ~ 100000 次',acc:'±1 次',proc:'涂饰层耐磨',status:'正常'},
  {eq:'EQ-2026-007',cap:'柔软度评分',range:'0 ~ 10 分',acc:'±0.1',proc:'手感客观化',status:'正常'},
  {eq:'EQ-2026-008',cap:'动力粘度',range:'1 ~ 2×10⁶ mPa·s',acc:'±1%',proc:'树脂粘度控制',status:'正常'},
  {eq:'EQ-2026-009',cap:'粒径分布',range:'0.02 ~ 2000 μm',acc:'±1%',proc:'乳液粒径',status:'正常'},
  {eq:'EQ-2026-010',cap:'热空气老化',range:'RT+10 ~ 300 ℃',acc:'±1 ℃',proc:'耐热性评估',status:'维修'}
];

/* ==================================================================
   数据：保养维护 eq:maint
   ================================================================== */
var EQMAINTS=[
  {id:'MT-2026-1042',eq:'EQ-2026-005 恒温恒湿箱',type:'年度校准',cycle:'12 个月',last:'2025-09-18',next:'2026-09-18',owner:'李工',status:'待执行'},
  {id:'MT-2026-1038',eq:'EQ-2026-010 高温老化试验箱',type:'故障维修',cycle:'按需',last:'2026-06-12',next:'2026-09-30',owner:'赵工',status:'执行中'},
  {id:'MT-2026-1031',eq:'EQ-2026-002 GC-MS',type:'年度校准',cycle:'12 个月',last:'2025-10-15',next:'2026-10-15',owner:'陈工',status:'待执行'},
  {id:'MT-2026-1027',eq:'EQ-2026-007 柔软度测定仪',type:'季度保养',cycle:'3 个月',last:'2026-07-28',next:'2026-10-28',owner:'王研究员',status:'待执行'},
  {id:'MT-2026-1021',eq:'EQ-2026-001 万能材料试验机',type:'年度校准',cycle:'12 个月',last:'2025-11-20',next:'2026-11-20',owner:'李工',status:'待执行'},
  {id:'MT-2026-1015',eq:'EQ-2026-006 马丁代尔耐磨仪',type:'季度保养',cycle:'3 个月',last:'2026-08-05',next:'2026-11-05',owner:'李工',status:'待执行'},
  {id:'MT-2026-1008',eq:'EQ-2026-011 分析天平',type:'年度校准',cycle:'12 个月',last:'2025-10-10',next:'2026-10-10',owner:'陈工',status:'待执行'},
  {id:'MT-2026-0096',eq:'EQ-2026-008 旋转粘度计',type:'半年保养',cycle:'6 个月',last:'2026-06-20',next:'2026-12-20',owner:'王研究员',status:'已完成'},
  {id:'MT-2026-0089',eq:'EQ-2026-004 QUV 老化箱',type:'灯管更换',cycle:'4000 h',last:'2026-05-08',next:'2027-01-12',owner:'李工',status:'已完成'},
  {id:'MT-2026-0074',eq:'EQ-2026-003 FTIR',type:'年度校准',cycle:'12 个月',last:'2025-12-08',next:'2026-12-08',owner:'陈工',status:'已完成'}
];

/* ==================================================================
   数据：零备件管理 eq:spare（低于安全库存标红）
   ================================================================== */
var EQSPARES=[
  {code:'SP-0421',name:'QUV 紫外灯管 UVA-340',for:'EQ-2026-004',stock:6,safe:4,loc:'备件库 A-03',status:'正常'},
  {code:'SP-0418',name:'GC-MS 进样隔垫',for:'EQ-2026-002',stock:2,safe:5,loc:'备件库 A-01',status:'不足'},
  {code:'SP-0415',name:'万能试验机夹具（气动）',for:'EQ-2026-001',stock:3,safe:2,loc:'备件库 B-02',status:'正常'},
  {code:'SP-0409',name:'马丁代尔耐磨布（标准）',for:'EQ-2026-006',stock:1,safe:6,loc:'备件库 A-05',status:'缺货'},
  {code:'SP-0403',name:'旋转粘度计转子组',for:'EQ-2026-008',stock:4,safe:2,loc:'备件库 B-01',status:'正常'},
  {code:'SP-0398',name:'恒温恒湿箱加湿桶',for:'EQ-2026-005',stock:2,safe:2,loc:'备件库 A-02',status:'正常'},
  {code:'SP-0387',name:'FTIR 溴化钾窗片',for:'EQ-2026-003',stock:0,safe:3,loc:'备件库 A-01',status:'缺货'},
  {code:'SP-0376',name:'高温箱加热管',for:'EQ-2026-010',stock:5,safe:3,loc:'备件库 B-04',status:'正常'},
  {code:'SP-0364',name:'激光粒度仪样品池',for:'EQ-2026-009',stock:3,safe:2,loc:'备件库 A-04',status:'正常'},
  {code:'SP-0351',name:'分析天平防风罩',for:'EQ-2026-011',stock:2,safe:1,loc:'备件库 B-03',status:'正常'},
  {code:'SP-0342',name:'柔软度测定仪压头',for:'EQ-2026-007',stock:1,safe:2,loc:'备件库 A-05',status:'不足'},
  {code:'SP-0330',name:'pH 电极（复合）',for:'EQ-2026-012',stock:4,safe:3,loc:'备件库 B-01',status:'正常'}
];

/* ==================================================================
   数据：文档管理 doc
   ================================================================== */
var DOCS=[
  {id:'DOC-2026-0142',name:'GL-9 欧盟合规改版 SDS（V2.1）',type:'合规文档',ver:'V2.1',owner:'陈工',upd:'2026-09-01',status:'审批中'},
  {id:'DOC-2026-0138',name:'WPU-320 国产化中试方案',type:'技术文档',ver:'V1.3',owner:'王研究员',upd:'2026-08-28',status:'已发布'},
  {id:'DOC-2026-0131',name:'PRJ-2026-002 阶段评审记录 · 中试',type:'评审记录',ver:'V1.0',owner:'王研究员',upd:'2026-08-25',status:'已发布'},
  {id:'DOC-2026-0127',name:'ZDHC MRSL V3.1 符合性声明',type:'合规文档',ver:'V1.1',owner:'陈工',upd:'2026-08-20',status:'已发布'},
  {id:'DOC-2026-0119',name:'DOE-2026-0312 实验原始记录',type:'实验记录',ver:'V1.0',owner:'李工',upd:'2026-08-16',status:'已归档'},
  {id:'DOC-2026-0112',name:'鞋面革柔软度测试方法 SOP',type:'作业指导',ver:'V3.2',owner:'李工',upd:'2026-08-08',status:'已发布'},
  {id:'DOC-2026-0104',name:'无溶剂合成革工艺路线预研报告',type:'技术文档',ver:'V0.9',owner:'李工',upd:'2026-07-30',status:'草稿'},
  {id:'DOC-2026-0096',name:'REACH Annex XVII V2026.3 差异分析',type:'合规文档',ver:'V1.0',owner:'陈工',upd:'2026-07-22',status:'待更新'},
  {id:'DOC-2026-0088',name:'PRJ-2026-005 立项建议书',type:'项目文档',ver:'V1.0',owner:'陈工',upd:'2025-09-12',status:'已归档'},
  {id:'DOC-2026-0075',name:'配方组分数据治理规范',type:'管理规范',ver:'V2.0',owner:'赵工',upd:'2026-06-18',status:'已发布'},
  {id:'DOC-2026-0063',name:'HF-5 APEO 替代方案评估报告',type:'技术文档',ver:'V1.2',owner:'李工',upd:'2026-06-05',status:'已发布'},
  {id:'DOC-2026-0051',name:'Cr(VI) 风险管控作业指导',type:'作业指导',ver:'V1.1',owner:'陈工',upd:'2026-05-20',status:'已发布'}
];

/* ==================================================================
   数据：知识管理 ip:km
   ================================================================== */
var KNOWLEDGES=[
  {id:'KM-2026-0121',title:'耐磨性能影响因素分析',cat:'工艺经验',author:'王研究员',create:'2026-09-07',views:68,status:'已公开'},
  {id:'KM-2026-0118',title:'水性聚氨酯涂饰树脂乳化工艺关键控制点',cat:'工艺经验',author:'王研究员',create:'2026-08-26',views:186,status:'已公开'},
  {id:'KM-2026-0112',title:'ZDHC MRSL V3.1 与 REACH Annex XVII 对照速查',cat:'法规解读',author:'陈工',create:'2026-08-19',views:243,status:'已公开'},
  {id:'KM-2026-0104',title:'DOE 全因子设计在加脂工艺优化中的实践',cat:'方法论',author:'王研究员',create:'2026-08-10',views:157,status:'已公开'},
  {id:'KM-2026-0097',title:'Cr(VI) 生成机理与抑制手段综述',cat:'技术综述',author:'陈工',create:'2026-07-28',views:132,status:'已公开'},
  {id:'KM-2026-0089',title:'皮革柔软度主观评价与仪器测试的相关性研究',cat:'检测方法',author:'李工',create:'2026-07-15',views:98,status:'已公开'},
  {id:'KM-2026-0078',title:'APEO 替代表面活性剂选型踩坑记录',cat:'失效案例',author:'李工',create:'2026-06-27',views:204,status:'已公开'},
  {id:'KM-2026-0066',title:'出口欧盟 SDS 16 章编制常见退回原因',cat:'合规经验',author:'陈工',create:'2026-06-11',views:276,status:'已公开'},
  {id:'KM-2026-0054',title:'无溶剂合成革工艺路线对比（热熔 vs 水性）',cat:'技术综述',author:'李工',create:'2026-05-30',views:141,status:'已公开'},
  {id:'KM-2026-0043',title:'组分数据治理：CAS 号缺失的补全策略',cat:'数据治理',author:'赵工',create:'2026-05-16',views:87,status:'已公开'},
  {id:'KM-2026-0031',title:'中试放大过程传热差异导致的批次波动复盘',cat:'失效案例',author:'王研究员',create:'2026-04-22',views:119,status:'草稿'}
];

/* ==================================================================
   数据：产权管理 ip:right
   ================================================================== */
var IPRIGHTS=[
  {id:'CN202610123456.7',name:'一种高柔软度鞋面革加脂剂及其制备方法',type:'发明专利',status:'已授权',apply:'2024-03-18',grant:'2026-05-22',who:'王研究员、李工'},
  {id:'CN202610098765.4',name:'水性聚氨酯涂饰树脂的国产化制备工艺',type:'发明专利',status:'实质审查',apply:'2024-11-06',grant:'—',who:'王研究员'},
  {id:'CN202621098765.1',name:'一种低 VOC 汽车座椅革涂饰层结构',type:'实用新型',status:'已授权',apply:'2025-01-22',grant:'2025-11-14',who:'陈工、王研究员'},
  {id:'CN202610456789.2',name:'无溶剂合成革的连续化成型方法',type:'发明专利',status:'实质审查',apply:'2025-06-12',grant:'—',who:'李工'},
  {id:'CN202630123456.8',name:'皮革涂饰光亮剂包装桶标签',type:'外观设计',status:'已授权',apply:'2025-03-09',grant:'2025-10-30',who:'陈工'},
  {id:'CN202610789012.5',name:'一种生物基加脂剂组合物',type:'发明专利',status:'已受理',apply:'2026-02-26',grant:'—',who:'王研究员'},
  {id:'CN202620234567.3',name:'铬鞣剂 Cr(VI) 抑制剂及应用',type:'发明专利',status:'实质审查',apply:'2025-08-14',grant:'—',who:'陈工'},
  {id:'CN202630987654.2',name:'实验用小型恒温反应釜',type:'实用新型',status:'已授权',apply:'2025-05-20',grant:'2026-03-06',who:'李工'},
  {id:'CN202610345678.9',name:'手感剂 APEO 替代配方',type:'发明专利',status:'已驳回',apply:'2024-09-11',grant:'—',who:'李工'},
  {id:'CN202610654321.0',name:'基于 DOE 的皮革化工配方优化方法',type:'发明专利',status:'已受理',apply:'2026-07-08',grant:'—',who:'王研究员、赵工'}
];

/* ==================================================================
   页面注册
   ================================================================== */

/* ---------- 原料供应商管理 ---------- */
regPage('bd:supplier',{
  title:'原料供应商管理',crumb:['基础数据','<b>原料供应商管理</b>'],
  render:function(){
    lp(listCfg({
      title:'原料供应商管理',unit:'供应商',
      sub:'原料供应商主数据，记录合作范围、评级与合规状态；评级为 C 或状态「观察」的供应商在采购评审时需附加说明。',
      cols:[
        {k:'code',t:'供应商编码',w:'120px',fmt:function(r){return mono(r.code);}},
        {k:'name',t:'供应商名称'},
        {k:'type',t:'类型',w:'80px',align:'c'},
        {k:'cat',t:'主供品类',w:'200px'},
        {k:'region',t:'所在地',w:'110px'},
        {k:'since',t:'合作起始',w:'100px'},
        {k:'grade',t:'评级',w:'70px',align:'c',fmt:function(r){return '<span class="tag '+(GRADE_TAG[r.grade]||'tag-grey')+'">'+esc(r.grade)+'</span>';}},
        {k:'status',t:'状态',w:'80px',fmt:function(r){return gtag(r.status);}},
        {k:'_mat',t:'供应物料',w:'96px',align:'c',fmt:function(r){
          var n=(typeof matSupCount==='function')?matSupCount(r.code):0;
          return n?'<a class="mat-link" href="javascript:void(0)" onclick="matBySup(\''+esc(r.code)+'\')">'+n+' 种 ›</a>':'<span class="muted">—</span>';
        }}
      ],
      rows:SUPPLIERS,kwKeys:['code','name','cat','region'],
      acts:function(r){ return '<button class="btn btn-link" onclick="mdOpenSupplier(\''+esc(r.code)+'\')">查看</button>'; },
      onRowClick:function(r){ mdOpenSupplier(r.code); },
      filters:[
        {k:'type',t:'类型',all:'全部',opts:[['生产商','生产商'],['经销商','经销商']]},
        {k:'grade',t:'评级',all:'全部',opts:[['A','A 级'],['B','B 级'],['C','C 级']]},
        {k:'status',t:'状态',all:'全部',opts:[['合格','合格'],['观察','观察'],['停用','停用']]}
      ]
    }));
  }
});

/* ---------- 原料库存（菜单标「暂不做」） ---------- */
regPage('bd:inv',{
  title:'原料库存',crumb:['基础数据','<b>原料库存</b>'],
  render:function(){
    $('pageHost').innerHTML=
      '<div class="page-hd"><div class="t"><h1>原料库存</h1>'+
      '<div class="page-sub">本模块在本期原型中标记为「暂不做」</div></div></div>'+
      '<div class="card"><div class="card-b">'+
      placeholder('📦','原料库存 · 暂不做',
        '本期 PLM 3.0 原型聚焦<b>研发主线（需求 → 项目 → 实验 → 合规）</b>，'+
        '仓储与库存周转由 ERP 承接，不在本系统范围内。<br><br>'+
        '若后续需要，可承接的能力包括：批次库存与效期预警、先进先出（FIFO）领用追溯、'+
        '原料留样管理、安全库存自动补货提醒。')+
      '</div></div>';
  }
});

/* ---------- 产品基础信息 ---------- */
/* 产品基础信息：左侧产品目录树 + 右侧列表（27z5 提供 lpWithCatTree / prodCatRows） */
function prodListCfg(){
  return listCfg({
    title:'产品基础信息',unit:'产品',
    sub:'公司对外销售产品的主数据台账，关联研发项目、负责人与合规状态；左侧按产品目录筛选，目录来自《产品目录树》。',
    cols:[
      {k:'code',t:'产品编码',w:'120px',fmt:function(r){return mono(r.code);}},
      {k:'name',t:'产品名称'},
      {k:'catPath',t:'所属目录',w:'200px',fmt:function(r){
        if(!r.catPath)return '<span class="muted">'+esc((r.cat||'')+' · 待归类')+'</span>';
        return esc(r.catPath);}},
      {k:'series',t:'系列',w:'100px'},
      {k:'prj',t:'关联项目',w:'130px',fmt:function(r){
        return r.prj?'<span class="mono">'+esc(r.prj)+'</span>':'<span class="muted">—</span>';}},
      {k:'owner',t:'负责人',w:'100px'},
      {k:'upd',t:'更新时间',w:'110px'},
      {k:'status',t:'状态',w:'90px',fmt:function(r){return gtag(r.status);}}
    ],
    rows:prodCatRows(),kwKeys:['code','name','cat','catPath','series','prj'],
    filters:[
      {k:'status',t:'状态',all:'全部',opts:[['在产','在产'],['试产','试产'],['研发中','研发中'],['停产','停产']]}
    ],
    headActs:'<button class="btn" onclick="toast(\'已导出当前目录视图\',\'ok\')">⇩ 导出</button>',
    acts:function(r){
      return '<button class="btn-link" onclick="prodOpen(\''+esc(r.code)+'\')">查看</button>';
    },
    onRowClick:function(r){ prodOpen(r.code); }
  });
}
regPage('prod:list',{
  title:'产品基础信息',crumb:['产品管理','<b>产品基础信息</b>'],
  render:function(){ lpWithCatTree(prodListCfg()); }
});

/* ---------- 送检记录 ---------- */
regPage('qc:submit',{
  title:'送检记录',crumb:['质量/检测管理','<b>送检记录</b>'],
  render:function(){
    lp(listCfg({
      title:'送检记录',unit:'送检单',
      sub:'内部样品送第三方检测的登记台账，覆盖法规符合性项目（VOC/甲醛/Cr(VI)/APEO 等）与物理性能项目。',
      cols:[
        {k:'id',t:'送检单号',w:'130px',fmt:function(r){return mono(r.id);}},
        {k:'sample',t:'样品',w:'230px'},
        {k:'item',t:'检测项目',w:'200px'},
        {k:'org',t:'检测机构',w:'170px'},
        {k:'by',t:'送检人',w:'90px'},
        {k:'date',t:'送检日期',w:'110px'},
        {k:'status',t:'状态',w:'100px',fmt:function(r){return gtag(r.status);}}
      ],
      rows:SUBMITS,kwKeys:['id','sample','item','org'],
      acts:function(r){ return '<button class="btn btn-link" onclick="mdOpenSubmit(\''+esc(r.id)+'\')">查看</button>'; },
      onRowClick:function(r){ mdOpenSubmit(r.id); },
      filters:[
        {k:'status',t:'状态',all:'全部',opts:[['检测中','检测中'],['已出报告','已出报告']]},
        {k:'org',t:'检测机构',all:'全部',opts:[['SGS 通标（上海）','SGS 通标'],['Intertek 天祥（广州）','Intertek 天祥'],
          ['华测检测 CTI（苏州）','华测 CTI'],['BV 必维（上海）','BV 必维'],['中纺标（北京）','中纺标']]}
      ]
    }));
  }
});

/* ---------- 检测结果报告 ---------- */
regPage('qc:report',{
  title:'检测结果报告',crumb:['质量/检测管理','<b>检测结果报告</b>'],
  render:function(){
    lp(listCfg({
      title:'检测结果报告',unit:'检测报告',
      sub:'第三方检测机构出具的正式报告归档。结论为「不通过」的批次需触发不合格品处置流程并回溯配方。',
      cols:[
        {k:'id',t:'报告编号',w:'130px',fmt:function(r){return mono(r.id);}},
        {k:'submit',t:'关联送检',w:'130px',fmt:function(r){return mono(r.submit);}},
        {k:'sample',t:'样品',w:'230px'},
        {k:'result',t:'结论',w:'100px',fmt:function(r){return gtag(r.result);}},
        {k:'date',t:'出具日期',w:'110px'},
        {k:'org',t:'检测机构',w:'180px'}
      ],
      rows:QCREPORTS,kwKeys:['id','submit','sample','org'],
      acts:function(r){ return '<button class="btn btn-link" onclick="mdOpenReport(\''+esc(r.id)+'\')">查看</button>'; },
      onRowClick:function(r){ mdOpenReport(r.id); },
      filters:[
        {k:'result',t:'结论',all:'全部',opts:[['通过','通过'],['部分通过','部分通过'],['不通过','不通过']]},
        {k:'org',t:'检测机构',all:'全部',opts:[['SGS 通标（上海）','SGS 通标'],['Intertek 天祥（广州）','Intertek 天祥'],
          ['华测检测 CTI（苏州）','华测 CTI'],['BV 必维（上海）','BV 必维'],['中纺标（北京）','中纺标']]}
      ]
    }));
  }
});

/* ---------- 设备列表 ---------- */
regPage('eq:list',{
  title:'设备列表',crumb:['设备资源','<b>设备列表</b>'],
  render:function(){
    lp(listCfg({
      title:'设备列表',unit:'设备',
      sub:'实验室与检测设备台账，记录型号、位置、责任人与校准到期日；「校准中 / 维修 / 停用」设备不可排入实验计划。',
      cols:[
        {k:'id',t:'设备编号',w:'120px',fmt:function(r){return mono(r.id);}},
        {k:'name',t:'设备名称',w:'200px'},
        {k:'model',t:'型号',w:'140px'},
        /* 2026-09-15 新增：类型 / 所属部门（字段值由 27z8 分片按设备所在位置补齐） */
        {k:'type',t:'类型',w:'100px',fmt:function(r){return gtag(r.type);}},
        {k:'dept',t:'所属部门',w:'100px',fmt:function(r){return gtag(r.dept);}},
        {k:'loc',t:'位置',w:'150px'},
        {k:'status',t:'状态',w:'90px',fmt:function(r){return gtag(r.status);}},
        {k:'owner',t:'责任人',w:'100px'},
        {k:'cal',t:'下次校准',w:'110px'}
      ],
      rows:EQUIPMENTS,kwKeys:['id','name','model','loc','type','dept'],
      acts:function(r){ return '<button class="btn btn-link" onclick="mdOpenEq(\''+esc(r.id)+'\')">查看</button>'; },
      onRowClick:function(r){ mdOpenEq(r.id); },
      filters:[
        {k:'status',t:'状态',all:'全部',opts:[['正常','正常'],['校准中','校准中'],['维修','维修'],['停用','停用']]},
        {k:'type',t:'类型',all:'全部',opts:[['实验仪器','实验仪器'],['分析仪器','分析仪器']]},
        {k:'dept',t:'所属部门',all:'全部',opts:[['研发部','研发部'],['质管部','质管部']]},
        {k:'owner',t:'责任人',all:'全部',opts:[['王研究员','王研究员'],['李工','李工'],['陈工','陈工'],['赵工','赵工']]}
      ]
    }));
  }
});

/* ---------- 设备能力 ---------- */
regPage('eq:cap',{
  title:'设备能力',crumb:['设备资源','<b>设备能力</b>'],
  render:function(){
    lp(listCfg({
      title:'设备能力',unit:'设备能力项',
      sub:'设备的可测参数、量程与精度，用于实验方案设计时匹配合适的检测资源。',
      cols:[
        {k:'eq',t:'设备编号',w:'130px',fmt:function(r){return mono(r.eq);}},
        {k:'cap',t:'能力项',w:'200px'},
        {k:'range',t:'量程',w:'190px'},
        {k:'acc',t:'精度',w:'120px'},
        {k:'proc',t:'适用工艺/检测',w:'160px'},
        {k:'status',t:'状态',w:'90px',fmt:function(r){return gtag(r.status);}}
      ],
      rows:EQCAPS,kwKeys:['eq','cap','proc'],
      acts:function(r){ return '<button class="btn btn-link" onclick="mdOpenEqCap(\''+esc(r.eq)+'\',\''+esc(r.cap)+'\')">查看</button>'; },
      onRowClick:function(r){ mdOpenEqCap(r.eq,r.cap); },
      filters:[{k:'status',t:'状态',all:'全部',opts:[['正常','正常'],['校准中','校准中'],['维修','维修']]}]
    }));
  }
});

/* ---------- 保养维护 ---------- */
regPage('eq:maint',{
  title:'保养维护',crumb:['设备资源','<b>保养维护</b>'],
  render:function(){
    lp(listCfg({
      title:'保养维护',unit:'维保工单',
      sub:'设备校准、保养与维修工单台账，按周期自动生成下次执行日期；超期未执行会阻塞相关实验排程。',
      cols:[
        {k:'id',t:'工单号',w:'120px',fmt:function(r){return mono(r.id);}},
        {k:'eq',t:'设备',w:'210px'},
        {k:'type',t:'保养类型',w:'110px'},
        {k:'cycle',t:'周期',w:'100px'},
        {k:'last',t:'上次执行',w:'110px'},
        {k:'next',t:'下次计划',w:'110px'},
        {k:'owner',t:'负责人',w:'100px'},
        {k:'status',t:'状态',w:'90px',fmt:function(r){return gtag(r.status);}}
      ],
      rows:EQMAINTS,kwKeys:['id','eq','type'],
      acts:function(r){ return '<button class="btn btn-link" onclick="mdOpenMaint(\''+esc(r.id)+'\')">查看</button>'; },
      onRowClick:function(r){ mdOpenMaint(r.id); },
      filters:[
        {k:'type',t:'保养类型',all:'全部',opts:[['年度校准','年度校准'],['半年保养','半年保养'],
          ['季度保养','季度保养'],['故障维修','故障维修'],['灯管更换','灯管更换']]},
        {k:'status',t:'状态',all:'全部',opts:[['待执行','待执行'],['执行中','执行中'],['已完成','已完成']]}
      ]
    }));
  }
});

/* ---------- 零备件管理（低库存预警） ---------- */
regPage('eq:spare',{
  title:'零备件管理',crumb:['设备资源','<b>零备件管理</b>'],
  render:function(){
    lp(listCfg({
      title:'零备件管理',unit:'零备件',
      sub:'设备易损件与耗材库存。<b>库存量低于安全库存</b>时状态自动置为「不足」，归零时置为「缺货」，需及时采购补货。',
      cols:[
        {k:'code',t:'备件编码',w:'110px',fmt:function(r){return mono(r.code);}},
        {k:'name',t:'备件名称',w:'200px'},
        {k:'for',t:'适用设备',w:'140px',fmt:function(r){return mono(r['for']);}},
        {k:'stock',t:'库存',w:'70px',num:true,fmt:function(r){
          return '<b'+(r.stock<r.safe?' style="color:var(--danger)"':'')+'>'+r.stock+'</b>';}},
        {k:'safe',t:'安全库存',w:'90px',num:true},
        {k:'loc',t:'存放位置',w:'120px'},
        {k:'status',t:'状态',w:'90px',fmt:function(r){return gtag(r.status);}}
      ],
      rows:EQSPARES,kwKeys:['code','name','for'],
      acts:function(r){ return '<button class="btn btn-link" onclick="mdOpenSpare(\''+esc(r.code)+'\')">查看</button>'; },
      onRowClick:function(r){ mdOpenSpare(r.code); },
      filters:[{k:'status',t:'状态',all:'全部',opts:[['正常','正常'],['不足','不足'],['缺货','缺货']]}]
    }));
  }
});

/* ---------- 文档管理 ---------- */
function publicDocumentRows(){
  var formalTypes=['技术文档','合规文档','项目文档'];
  var docs=DOCS.filter(function(r){
    return formalTypes.indexOf(r.type)>=0&&(r.status==='已发布'||r.status==='已归档');
  });
  var sds=SDS_ROWS.filter(function(r){return r.status==='已发布';}).map(function(r){
    return {id:r.no,name:r.product+' SDS',type:'SDS 文档',ver:r.ver,owner:r.owner,upd:r.date,status:r.status};
  });
  return docs.concat(sds);
}
function renderPublicDocuments(){
  lp(listCfg({
    title:'公共文档',unit:'公共文档',
    sub:'公共文档为团队共享的正式发布版本，全团队可见。',
    cols:[
      {k:'id',t:'编号',w:'140px',fmt:function(r){return mono(r.id);}},
      {k:'name',t:'名称',w:'280px'},
      {k:'type',t:'类型',w:'110px'},
      {k:'ver',t:'版本',w:'80px',align:'c',fmt:function(r){return '<span class="mono">'+esc(r.ver)+'</span>';}},
      {k:'owner',t:'负责人',w:'100px'},
      {k:'upd',t:'更新时间',w:'110px'},
      {k:'status',t:'状态',w:'100px',fmt:function(r){return gtag(r.status);}}
    ],
    rows:publicDocumentRows(),kwKeys:['id','name','type'],
    acts:function(r){ return '<button class="btn btn-link" onclick="mdOpenDoc(\''+esc(r.id)+'\')">查看</button>'; },
    onRowClick:function(r){ mdOpenDoc(r.id); },
    filters:[{k:'type',t:'类型',all:'全部',opts:[['技术文档','技术文档'],['合规文档','合规文档'],['项目文档','项目文档'],['SDS 文档','SDS 文档']]}],
    headActs:'<span></span>'
  }));
}
function myDocumentRows(){
  var mine=DOCS.filter(function(r){return r.owner==='王研究员';}).map(function(r){
    return {name:r.name,type:r.type,verPeriod:r.ver,upd:r.upd,status:r.status,kind:'doc',ref:r.id};
  });
  var weekly=weeklyRowsForMine().filter(function(r){return r.reportType==='周报';}).map(function(r){
    return {name:r.reportType+' · '+r.period,type:r.reportType,verPeriod:r.period,upd:(r.submitTime||'未提交').split(' ')[0],status:r.status,kind:'weekly',ref:r.id};
  });
  return weekly.concat(mine);
}
function renderMyDocuments(){
  lp(listCfg({
    title:'我的文档',unit:'我的文档',
    sub:'我的文档仅本人与上级领导可见。',
    cols:[
      {k:'name',t:'名称',w:'320px'},
      {k:'type',t:'类型',w:'110px'},
      {k:'verPeriod',t:'版本 / 周期',w:'190px'},
      {k:'upd',t:'更新时间',w:'120px'},
      {k:'status',t:'状态',w:'100px',fmt:function(r){return gtag(r.status);}}
    ],
    rows:myDocumentRows(),kwKeys:['name','type','verPeriod'],
    filters:[{k:'type',t:'类型',all:'全部',opts:[['周报','周报'],['月报','月报'],['技术文档','技术文档'],['评审记录','评审记录']]}],
    headActs:'<span></span>',
    acts:function(r){
      return '<button class="btn btn-link" onclick="'+(r.kind==='weekly'?('openWeeklyFromMine(\''+r.ref+'\')'):("mdOpenDoc('"+esc(r.ref)+"')"))+'">查看</button>';
    },
    onRowClick:function(r){if(r.kind==='weekly')openWeeklyFromMine(r.ref);else mdOpenDoc(r.ref);}
  }));
}
regPage('doc:public',{
  title:'公共文档',crumb:['文档管理','<b>公共文档</b>'],render:renderPublicDocuments
});
regPage('doc:mine',{
  title:'我的文档',crumb:['文档管理','<b>我的文档</b>'],render:renderMyDocuments
});
/* 兼容旧的 #doc 直达地址，默认进入公共文档。 */
regPage('doc',{
  title:'公共文档',crumb:['文档管理','<b>公共文档</b>'],render:renderPublicDocuments
});

/* ---------- 知识管理 ---------- */
regPage('ip:km',{
  title:'知识管理',crumb:['知识产权','<b>知识管理</b>'],
  render:function(){
    lp(listCfg({
      title:'知识管理',unit:'知识条目',
      sub:'沉淀工艺经验、法规解读、失效案例与方法论，避免重复踩坑；浏览量高的条目会进入新人培训清单。',
      cols:[
        {k:'id',t:'知识编号',w:'130px',fmt:function(r){return mono(r.id);}},
        {k:'title',t:'标题',w:'330px'},
        {k:'cat',t:'分类',w:'110px'},
        {k:'author',t:'作者',w:'100px'},
        {k:'create',t:'创建日期',w:'110px'},
        {k:'views',t:'浏览量',w:'90px',num:true},
        {k:'status',t:'状态',w:'90px',fmt:function(r){return gtag(r.status);}}
      ],
      rows:KNOWLEDGES,kwKeys:['id','title','cat','author'],
      acts:function(r){ return '<button class="btn btn-link" onclick="mdOpenKm(\''+esc(r.id)+'\')">查看</button>'; },
      onRowClick:function(r){ mdOpenKm(r.id); },
      filters:[
        {k:'cat',t:'分类',all:'全部',opts:[['工艺经验','工艺经验'],['法规解读','法规解读'],['方法论','方法论'],
          ['技术综述','技术综述'],['检测方法','检测方法'],['失效案例','失效案例'],['合规经验','合规经验'],['数据治理','数据治理']]},
        {k:'status',t:'状态',all:'全部',opts:[['已公开','已公开'],['草稿','草稿']]}
      ]
    }));
  }
});

/* ---------- 产权管理 ---------- */
regPage('ip:right',{
  title:'产权管理',crumb:['知识产权','<b>产权管理</b>'],
  render:function(){
    lp(listCfg({
      title:'产权管理',unit:'知识产权',
      sub:'专利与产权申请台账，跟踪从受理、实质审查到授权的生命周期；年费缴纳节点到期前会推送提醒。',
      cols:[
        {k:'id',t:'申请号',w:'170px',fmt:function(r){return mono(r.id);}},
        {k:'name',t:'名称',w:'300px'},
        {k:'type',t:'类型',w:'100px'},
        {k:'status',t:'状态',w:'100px',fmt:function(r){return gtag(r.status);}},
        {k:'apply',t:'申请日',w:'110px'},
        {k:'grant',t:'授权日',w:'110px',fmt:function(r){
          return r.grant==='—'?'<span class="muted">—</span>':esc(r.grant);}},
        {k:'who',t:'发明人',w:'160px'}
      ],
      rows:IPRIGHTS,kwKeys:['id','name','who'],
      acts:function(r){ return '<button class="btn btn-link" onclick="mdOpenIp(\''+esc(r.id)+'\')">查看</button>'; },
      onRowClick:function(r){ mdOpenIp(r.id); },
      filters:[
        {k:'type',t:'类型',all:'全部',opts:[['发明专利','发明专利'],['实用新型','实用新型'],['外观设计','外观设计']]},
        {k:'status',t:'状态',all:'全部',opts:[['已受理','已受理'],['实质审查','实质审查'],['已授权','已授权'],['已驳回','已驳回']]}
      ]
    }));
  }
});

/* ---------- 出口注册管理（菜单标「规划中」） ---------- */
regPage('export:reg',{
  title:'出口注册管理',crumb:['合规管理','<b>出口注册管理</b>'],
  render:function(){
    $('pageHost').innerHTML=
      '<div class="page-hd"><div class="t"><h1>出口注册管理</h1>'+
      '<div class="page-sub">本模块在本期原型中标记为「规划中」</div></div></div>'+
      '<div class="card"><div class="card-b">'+
      placeholder('🗺','出口注册管理 · 规划中',
        '规划用于管理产品出口目标市场的化学品注册与通报义务，预计覆盖：<br><br>'+
        '① <b>EU REACH 注册</b>——年出口量 ≥ 1 吨物质的注册卷宗与吨位跟踪；<br>'+
        '② <b>UK REACH</b>——脱欧后独立注册体系，需单独维护；<br>'+
        '③ <b>K-REACH（韩国）</b>——预注册与正式注册节点；<br>'+
        '④ <b>中国新化学物质环境管理登记</b>——常规/简易/备案三类路径；<br>'+
        '⑤ 与美国 TSCA、土耳其 KKDIK 等清单的比对。<br><br>'+
        '本期原型聚焦 SDS 与法规库主线，本模块留待后续迭代。')+
      '</div></div>';
  }
});
