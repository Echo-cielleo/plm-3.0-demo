/* ==================================================================
   [26] 首页 / 需求管理 / 项目管理 / 受限物质
   项目 ↔ 实验为多对多：实验 e.projectIds[] ↔ 项目 p.id
   ================================================================== */

/* ================= 数据：需求（客户 / 自研） ================= */
var DEMANDS=[
  {id:'CR-2026-018',src:'customer',title:'鞋面革柔软度提升 20% 并通过 ZDHC 验厂',
   customer:'某国际运动品牌（华东代工厂）',product:'鞋面革柔软度加脂剂',
   want:'柔软度提升 ≥ 20%，同时满足 ZDHC MRSL V3.1 全项合规',
   prio:'高',status:'研发中',owner:'王研究员',due:'2026-10-30',
   prj:'PRJ-2026-001',create:'2026-04-08'},
  {id:'CR-2026-015',src:'customer',title:'汽车座椅革 VOC ≤ 50 μg/g 且提供全组分 SDS',
   customer:'某合资汽车内饰厂',product:'汽车座椅革涂饰层',
   want:'VOC 排放 ≤ 50 μg/g，并提供 16 章全组分 SDS 与 REACH 声明',
   prio:'高',status:'研发中',owner:'陈工',due:'2026-11-25',
   prj:'PRJ-2026-002',create:'2026-03-22'},
  {id:'CR-2026-011',src:'customer',title:'合成革耐水解 ≥ 5 年，需 RoHS + REACH 声明',
   customer:'某箱包品牌（出口欧盟）',product:'无溶剂合成革',
   want:'耐水解寿命 ≥ 5 年，提供 RoHS 2.0 与 REACH SVHC 声明',
   prio:'中',status:'已立项',owner:'李工',due:'2027-03-15',
   prj:'PRJ-2026-003',create:'2026-06-14'},
  {id:'CR-2026-008',src:'customer',title:'沙发革涂饰层耐磨 ≥ 20000 次且成本压降 10%',
   customer:'某知名沙发制造厂',product:'皮革涂饰光亮剂 GL-9',
   want:'耐磨次数 ≥ 20000（马丁代尔法），配方成本下降 10%',
   prio:'中',status:'已交付',owner:'王研究员',due:'2026-08-30',
   prj:'PRJ-2026-005',create:'2025-09-02'},
  {id:'CR-2026-004',src:'customer',title:'手感剂 HF 系列需去除 APEO 成分',
   customer:'某皮革后整理加工厂',product:'手感剂 HF-5',
   want:'去除 APEO（烷基酚聚氧乙烯醚），满足 ZDHC MRSL 要求',
   prio:'低',status:'待评估',owner:'李工',due:'2026-12-18',
   prj:'PRJ-2026-004',create:'2026-05-03'},

  {id:'IR-2026-024',src:'internal',title:'无溶剂合成革工艺路线预研',
   customer:'—（自研）',product:'无溶剂合成革',
   want:'验证无溶剂工艺可行性，VOC 排放较现有工艺下降 ≥ 80%',
   prio:'高',status:'研发中',owner:'李工',due:'2027-03-15',
   prj:'PRJ-2026-003',create:'2026-06-20'},
  {id:'IR-2026-019',src:'internal',title:'WPU-320 进口树脂国产化替代',
   customer:'—（自研）',product:'水性聚氨酯涂饰树脂 WPU-320',
   want:'国产化后关键指标（固含/粘度/成膜）与进口品偏差 ≤ 5%',
   prio:'高',status:'研发中',owner:'王研究员',due:'2026-11-25',
   prj:'PRJ-2026-002',create:'2026-02-08'},
  {id:'IR-2026-012',src:'internal',title:'铬鞣剂 Cr(VI) 风险替代方案',
   customer:'—（自研）',product:'铬鞣剂 CR-33',
   want:'消除 Cr(VI) 生成风险，成品 Cr(VI) < 3 mg/kg',
   prio:'中',status:'已立项',owner:'陈工',due:'2026-12-31',
   prj:'',create:'2026-07-11'},
  {id:'IR-2026-006',src:'internal',title:'生物基加脂剂开发',
   customer:'—（自研）',product:'生物基加脂剂',
   want:'生物基碳含量 ≥ 30%，柔软度不低于石化基产品',
   prio:'低',status:'待评估',owner:'王研究员',due:'2027-06-30',
   prj:'',create:'2026-08-05'},
  {id:'IR-2026-002',src:'internal',title:'涂饰层耐黄变性能提升',
   customer:'—（自研）',product:'水性封底树脂 SB-11',
   want:'QUV 老化 500h 后 ΔE ≤ 2.0',
   prio:'中',status:'已关闭',owner:'李工',due:'2026-06-30',
   prj:'',create:'2026-01-20'}
];
var DEM_STATUS={'待评估':'tag-grey','已立项':'tag-blue','研发中':'tag-orange','已交付':'tag-green','已关闭':'tag-grey'};
var DEM_PRIO={'高':'tag-red','中':'tag-orange','低':'tag-grey'};

/* ================= 数据：受限物质 ================= */
var SUBST_ROWS=[
  {cas:'50-00-0',cn:'甲醛',cls:'Carc. 1B',law:'REACH Annex XVII Entry 77 / ZDHC MRSL V3.1',
   limit:'制品释放量限值（皮革 ≤ 150 mg/kg）',scope:'皮革、纺织及涂层',state:'在用受限',risk:'高'},
  {cas:'—',cn:'六价铬化合物 Cr(VI)',cls:'Carc. 1B / Muta. 1B',law:'REACH Annex XVII Entry 47',
   limit:'< 3 mg/kg（与皮肤接触的皮革制品）',scope:'铬鞣皮革制品',state:'禁用',risk:'高'},
  {cas:'—',cn:'偶氮染料（可裂解芳香胺）',cls:'Carc. 1B',law:'REACH Annex XVII Entry 72',
   limit:'芳香胺释放 < 30 mg/kg',scope:'染色皮革与纺织',state:'禁用',risk:'高'},
  {cas:'117-81-7',cn:'邻苯二甲酸二(2-乙基己基)酯 DEHP',cls:'Repr. 1B',law:'REACH Annex XIV（SVHC 授权）',
   limit:'< 0.1%（w/w）',scope:'涂层、印花浆',state:'需授权',risk:'高'},
  {cas:'—',cn:'全氟化合物 PFOS / PFOA',cls:'PBT / vPvB',law:'POP 法规 (EU) 2019/1021 / ZDHC MRSL',
   limit:'< 1 μg/m²',scope:'防水防油整理',state:'禁用',risk:'高'},
  {cas:'—',cn:'烷基酚聚氧乙烯醚 APEO',cls:'Aquatic Chronic 2',law:'ZDHC MRSL V3.1 / REACH Annex XVII Entry 46a',
   limit:'< 100 mg/kg',scope:'表面活性剂、加脂剂',state:'在用受限',risk:'中'},
  {cas:'85535-84-8',cn:'短链氯化石蜡 SCCP',cls:'PBT / vPvB',law:'REACH SVHC 候选清单 / POP',
   limit:'< 0.15%（w/w）',scope:'加脂剂、阻燃涂层',state:'需申报',risk:'中'},
  {cas:'—',cn:'有机锡化合物（DBT / TBT）',cls:'Repr. 1B / Aquatic Acute 1',law:'REACH Annex XVII Entry 20 / ZDHC MRSL',
   limit:'< 1 mg/kg',scope:'催化剂、稳定剂',state:'在用受限',risk:'中'},
  {cas:'108-88-3',cn:'甲苯',cls:'Flam. Liq. 2 / Repr. 2',law:'REACH Annex XVII Entry 48 / ZDHC MRSL',
   limit:'制剂中 < 0.1%',scope:'溶剂、稀释剂',state:'在用受限',risk:'中'},
  {cas:'79-10-7',cn:'丙烯酸',cls:'Skin Corr. 1A / Acute Tox. 4',law:'CLP Annex VI 607-061-00-8',
   limit:'职业接触限值管控',scope:'树脂合成单体',state:'在用受限',risk:'低'}
];
var SUBST_STATE={'禁用':'tag-red','在用受限':'tag-orange','需授权':'tag-purple','需申报':'tag-blue'};
var RISK_TAG={'高':'tag-red','中':'tag-orange','低':'tag-green'};

/* ================= 数据：应用项目（客户侧落地） ================= */
var APP_PROJECTS=[
  {id:'APP-2026-006',name:'某运动品牌 鞋面革柔软度量产导入',customer:'某国际运动品牌（华东代工厂）',
   scene:'运动鞋鞋面革 · 涂饰 + 加脂',stage:'量产验证',owner:'王研究员',members:['王研究员','李工'],
   start:'2026-07-01',due:'2026-11-30',prj:'PRJ-2026-001',result:'客户盲测柔软度评分 4.6/5，达标'},
  {id:'APP-2026-004',name:'某汽车内饰厂 座椅革 VOC 合规验证',customer:'某合资汽车内饰厂',
   scene:'汽车座椅革 · 低 VOC 涂饰',stage:'小批试产',owner:'陈工',members:['陈工','王研究员'],
   start:'2026-05-15',due:'2026-12-20',prj:'PRJ-2026-002',result:'VOC 42 μg/g，优于 50 目标'},
  {id:'APP-2026-002',name:'某箱包品牌 无溶剂合成革打样',customer:'某箱包品牌（出口欧盟）',
   scene:'箱包面料 · 无溶剂工艺',stage:'打样',owner:'李工',members:['李工','赵工'],
   start:'2026-08-10',due:'2027-02-28',prj:'PRJ-2026-003',result:'耐水解进行中（已完成 2000h）'},
  {id:'APP-2025-011',name:'某沙发厂 GL-9 涂饰耐磨量产',customer:'某知名沙发制造厂',
   scene:'沙发革 · 高耐磨涂饰',stage:'已交付',owner:'王研究员',members:['王研究员'],
   start:'2025-10-08',due:'2026-08-30',prj:'PRJ-2026-005',result:'耐磨 24000 次，成本降 11%'}
];
var APP_STAGE={'打样':'tag-blue','小批试产':'tag-orange','量产验证':'tag-purple','已交付':'tag-green'};

/* 问候语随时段变化（按本机时间判定） */
function greetWord(){
  var h=new Date().getHours();
  if(h<6)return '凌晨好';
  if(h<11)return '早上好';
  if(h<13)return '中午好';
  if(h<18)return '下午好';
  return '晚上好';
}

/* ================= 数据：首页待办与预警 =================
   ① 行动区数据：source 区分 OA 项目计划（只读接入）与本系统任务（系统内闭环）
   ② act 为动作按钮文案；go/goId 为直达目标 */
var TODOS=[
  {t:'录入 DOE-2026-0225 第 7~12 组实验结果',source:'本系统任务',from:'系统',due:'2026-09-11',kind:'实验结果录入',urgent:true,act:'去录入',go:'exp:detail',goId:'DOE-2026-0225'},
  {t:'PRJ-2026-002 中试「第一批合格」评审节点临近',source:'OA 项目计划',from:'OA 系统',due:'2026-09-12',kind:'项目节点',urgent:true,act:'去处理',go:'proj:detail',goId:'PRJ-2026-002'},
  {t:'审批 铬鞣剂 CR-33 欧盟版 SDS（V1.0）',source:'本系统任务',from:'王工',due:'2026-09-14',kind:'SDS 审批',urgent:false,act:'去审批',go:'sds:list',goId:'SDS-2026-0120'},
  {t:'PRJ-2026-005 推广阶段「产品试推广」节点临近',source:'OA 项目计划',from:'OA 系统',due:'2026-09-16',kind:'项目节点',urgent:false,act:'去处理',go:'proj:detail',goId:'PRJ-2026-005'},
  {t:'补充 铬鞣剂 CR-33 的 Cr(VI) 实测报告',source:'本系统任务',from:'陈工',due:'2026-09-17',kind:'数据补齐',urgent:false,act:'去处理',go:'qc:submit'}
];
var ALERTS=[
  {lv:'高',t:'REACH Annex XVII 新版（V2026.3）已于 2026-09-01 生效',d:'影响 6 份已发布 SDS，其中 2 份需重新分类并改版',go:'law:query'},
  {lv:'中',t:'PRJ-2026-005 涂光亮剂 GL-9 已进入「推广」阶段',d:'客户商务谈判进行中，建议跟进量产导入与试推广节点',go:'proj:detail',goId:'PRJ-2026-005'},
  {lv:'低',t:'3 条组分基础数据状态为「待验证」',d:'聚氨酯预聚体、苯酚、正己烷 未验证，可能影响分类判定准确性',go:'bd:comp'}
];

/* ==================================================================
   首页 · 个人工作台
   ================================================================== */
regPage('home',{
  title:'个人工作台',
  crumb:['个人工作台'],
  render:function(){
    var me='王研究员';
    var running=PROJECTS.filter(function(p){return p.stage!=='交付';}).length;
    var todoExp=experiments.filter(function(e){return e.status==='待执行'||e.status==='待配置';}).length;
    var pendingSds=SDS_ROWS.filter(function(r){return r.status==='审核中'||r.status==='编制中';}).length;
    var h='';
    /* A10：SDS 证据状态预警（红/橙/黄灯），点击跳转到列表（异常行已置顶） */
    var evG=function(lv){return SDS_ROWS.filter(function(r){return sdsEv(r).lv===lv;});};
    var sdsRed=evG('red'),sdsOver=evG('overdue'),sdsDue=evG('due');
    var alerts=ALERTS.slice();
    if(sdsRed.length||sdsOver.length||sdsDue.length){
      var parts=[];
      if(sdsRed.length)parts.push(sdsRed.length+' 份需改版');
      if(sdsOver.length)parts.push(sdsOver.length+' 份待复审');
      if(sdsDue.length)parts.push(sdsDue.length+' 份临期');
      alerts.unshift({
        lv:sdsRed.length?'高':(sdsOver.length?'中':'低'),
        t:parts.join(' · '),
        d:sdsRed.length
          ? ('库内已有新版法规未跟进：'+sdsRed.slice(0,2).map(function(r){return r.no;}).join('、')
             +(sdsRed.length>2?' 等 '+sdsRed.length+' 份':''))
          : (sdsOver.length
             ? '已超复审期，或存在 PubChem 来源 / data_gap 数据，仅供参考'
             : '距复审日不足 30 天，建议提前安排'),
        go:'sds:list',
        goId:(sdsRed[0]||sdsOver[0]||sdsDue[0]).no
      });
    }

    /* 欢迎（问候语随时段变化；紧急/预警计数不再重复，统一由行动区徽章表达） */
    h+='<div class="page-hd"><div class="t">'+
       '<h1>'+greetWord()+'，'+me+' 👋</h1>'+
       '<div class="page-sub">今天是 '+todayStr()+' · 皮革化工研发部</div></div></div>';

    /* ===== 以下为 Bento Grid 栅格区（两列，卡片按重要性占位，高卡跨行） ===== */
    h+='<div class="bento">';

    /* ① 置顶行动区：接下来要做（左栏第 1 行，与右侧预警同层） */
    h+=homeActionArea();

    /* ② 风险预警：与行动区同层（右栏第 1 行）· 去大面积底色，走左条 + 小图标 */
    h+='<div class="card b-c2 alerts-slim"><div class="card-hd"><h3>⚠️ 风险预警</h3>'+
       '<span class="sub">法规 · 进度 · 数据</span></div><div class="card-b">';
    alerts.forEach(function(a){
      h+='<div class="notice notice-'+(a.lv==='高'?'err':(a.lv==='中'?'warn':'info'))+'" style="margin-bottom:10px">'+
         '<i class="ni">'+(a.lv==='高'?'!':(a.lv==='中'?'!':'i'))+'</i><div><b>'+esc(a.t)+'</b>'+
         '<div style="margin-top:2px">'+esc(a.d)+'</div>'+
         '<button class="btn btn-sm btn-link" onclick="'+
         (a.go==='sds:list'&&a.goId?'sdsFocus(\''+a.goId+'\')':'showPage(\''+a.go+'\''+(a.goId&&a.go!=='sds:list'?',{id:\''+a.goId+'\'}':'')+')')+
         '">前往处理 →</button></div></div>';
    });
    h+='</div></div>';

    /* ③ 关键指标：通栏矮条（横向四格），不占右列 */
    h+='<div class="card b-span2 kpi-bar"><div class="card-b"><div class="kpi-box">';
    [['📋','进行中项目',running,'个','showPage(\'proj:list\')'],
     ['🧪','待执行实验',todoExp,'个','showPage(\'exp:list\')'],
     ['📄','待审 SDS',pendingSds,'份','showPage(\'sds:list\')'],
     ['🛡','受限物质',SUBST_ROWS.length,'项','showPage(\'subst:list\')']
    ].forEach(function(k){
      h+='<div class="stat-box" onclick="'+k[4]+'" style="cursor:pointer">'+
         '<div class="si">'+k[0]+'</div>'+
         '<div class="sd"><b>'+k[2]+'<small>'+k[3]+'</small></b><span>'+k[1]+'</span></div></div>';
    });
    h+='</div></div></div>';

    /* ④ 结构化周报：左栏第 3 行 */
    h+='<div class="b-cell b-c1">'+weeklyCardHTML()+'</div>';

    /* ⑤ 最近实验：右栏第 3 行（半栏展示，省略类型列） */
    h+='<div class="card b-c2"><div class="card-hd"><h3>🔬 最近实验</h3>'+
       '<div class="spacer"></div><button class="btn btn-sm" onclick="showPage(\'exp:list\')">查看全部</button></div>'+
       '<div class="card-b tight"><table class="tbl"><thead><tr>'+
       '<th style="width:140px">实验编号</th><th>实验名称</th>'+
       '<th style="width:96px">状态</th><th style="width:150px">关联项目</th></tr></thead><tbody>';
    experiments.slice(0,5).forEach(function(e){
      h+='<tr style="cursor:pointer" onclick="showPage(\'exp:detail\',{id:\''+e.id+'\'})">'+
         '<td class="mono">'+esc(e.id)+'</td><td>'+esc(e.name)+'</td>'+
         '<td><span class="tag '+(STATUS_TAG[e.status]||'tag-grey')+'">'+esc(e.status)+'</span></td>'+
         '<td>'+projSummary(e)+'</td></tr>';
    });
    h+='</tbody></table></div></div>';

    /* ⑥ 项目阶段进展：宽表 + 7 段进度条，通栏（第 4 行） */
    h+='<div class="card b-span2"><div class="card-hd"><h3>📈 项目阶段进展</h3>'+
       '<span class="sub">评审 → 预研 → 小试 → 中试 → 试生产 → 交付 → 推广</span>'+
       '<div class="spacer"></div><button class="btn btn-sm" onclick="showPage(\'proj:list\')">查看全部</button></div>'+
       '<div class="card-b tight"><table class="tbl"><thead><tr>'+
       '<th style="width:230px">项目</th><th style="width:88px">负责人</th><th>阶段进度</th>'+
       '<th style="width:110px">截止日期</th><th style="width:80px">实验数</th></tr></thead><tbody>';
    PROJECTS.forEach(function(p){
      h+='<tr style="cursor:pointer" onclick="showPage(\'proj:detail\',{id:\''+p.id+'\'})">'+
         '<td><b>'+esc(p.name)+'</b><span class="sub">'+esc(p.id)+'</span></td>'+
         '<td>'+esc(p.leader)+'</td>'+
         '<td>'+stageBar(p)+'</td>'+
         '<td>'+esc(p.dueDate)+'</td>'+
         '<td class="num">'+expOfProject(p.id).length+'</td></tr>';
    });
    h+='</tbody></table></div></div>';

    /* Bento 栅格收尾 */
    h+='</div>';

    $('pageHost').innerHTML=h;
  }
});

/* ---------- 阶段进度条（6 段） ---------- */
function stageBar(p){
  var h='<div class="stage-bar">';
  p.stageProgress.forEach(function(s,i){
    var cls=i<p.stageOn?'done':(i===p.stageOn?'on':'');
    h+='<div class="stage '+cls+'"><span class="sdot">'+(i<p.stageOn?'✓':(i+1))+'</span>'+
       '<span class="sline"></span><span class="stx">'+esc(s)+'</span></div>';
  });
  return h+'</div>';
}

/* ==================================================================
   需求管理（客户需求 / 自研需求）
   ================================================================== */
function renderDemandPage(src){
  var isCus=src==='customer';
  $('pageHost').innerHTML='<div id="lpHost"></div>';
  renderListPage({
    title:isCus?'客户需求':'自研需求',
    sub:isCus?'来自品牌客户与代工厂的明确需求，是立项与研发的输入来源。'
             :'研发团队主动发起的技术预研与产品改进需求。',
    cols:isCus?[
      {k:'id',t:'需求编号',w:'130px',fmt:function(r){return '<span class="mono">'+esc(r.id)+'</span>';}},
      {k:'title',t:'需求标题'},
      {k:'customer',t:'提出客户',w:'190px'},
      {k:'product',t:'关联产品',w:'150px'},
      {k:'prio',t:'优先级',w:'80px',align:'c',fmt:function(r){return '<span class="tag '+(DEM_PRIO[r.prio]||'tag-grey')+'">'+esc(r.prio)+'</span>';}},
      {k:'status',t:'状态',w:'90px',fmt:function(r){return '<span class="tag '+(DEM_STATUS[r.status]||'tag-grey')+'">'+esc(r.status)+'</span>';}},
      {k:'owner',t:'负责人',w:'90px'},
      {k:'due',t:'期望交付',w:'110px'}
    ]:[
      {k:'id',t:'需求编号',w:'130px',fmt:function(r){return '<span class="mono">'+esc(r.id)+'</span>';}},
      {k:'title',t:'需求标题'},
      {k:'product',t:'关联产品',w:'170px'},
      {k:'prio',t:'优先级',w:'80px',align:'c',fmt:function(r){return '<span class="tag '+(DEM_PRIO[r.prio]||'tag-grey')+'">'+esc(r.prio)+'</span>';}},
      {k:'status',t:'状态',w:'90px',fmt:function(r){return '<span class="tag '+(DEM_STATUS[r.status]||'tag-grey')+'">'+esc(r.status)+'</span>';}},
      {k:'owner',t:'负责人',w:'90px'},
      {k:'due',t:'目标完成',w:'110px'}
    ],
    rows:DEMANDS.filter(function(d){return d.src===src;}),
    kwKeys:['id','title','product','customer'],
    filters:[
      {k:'status',t:'状态',all:'全部',opts:[['待评估','待评估'],['已立项','已立项'],['研发中','研发中'],['已交付','已交付'],['已关闭','已关闭']]},
      {k:'prio',t:'优先级',all:'全部',opts:[['高','高'],['中','中'],['低','低']]}
    ],
    pageSize:10,
    headActs:'<button class="btn btn-primary" onclick="demandNew(\''+src+'\')">＋ 新建需求</button>',
    acts:function(r){
      return '<button class="btn btn-link" onclick="demandView(\''+r.id+'\')">查看</button>'+
             '<button class="btn btn-link" onclick="demandToPrj(\''+r.id+'\')">立项</button>';
    },
    onRowClick:function(r){ demandView(r.id); }
  });
}
function demandView(id){
  var d=DEMANDS.filter(function(x){return x.id===id;})[0]; if(!d)return;
  var p=findProj(d.prj);
  openModal({title:'需求详情 · '+id,width:680,
    body:'<div class="page-hd" style="margin-bottom:14px"><div class="t">'+
      '<h1 style="font-size:17px">'+esc(d.title)+'</h1>'+
      '<div class="page-sub">'+esc(d.id)+' · '+(d.src==='customer'?'客户需求':'自研需求')+'</div></div>'+
      '<div class="page-acts"><span class="tag '+(DEM_STATUS[d.status]||'tag-grey')+'">'+esc(d.status)+'</span></div></div>'+
      '<table class="tbl"><tbody>'+
      (d.src==='customer'
        ? '<tr><th style="width:110px;text-align:left">提出客户</th><td>'+esc(d.customer)+'</td>'+
          '<th style="width:110px;text-align:left">关联产品</th><td>'+esc(d.product)+'</td></tr>'
        : '<tr><th style="width:110px;text-align:left">关联产品</th><td colspan="3">'+esc(d.product)+'</td></tr>')+
      '<tr><th style="text-align:left">验收标准</th><td colspan="3">'+esc(d.want)+'</td></tr>'+
      '<tr><th style="text-align:left">优先级</th><td><span class="tag '+(DEM_PRIO[d.prio]||'tag-grey')+'">'+esc(d.prio)+'</span></td>'+
      '<th style="text-align:left">负责人</th><td>'+esc(d.owner)+'</td></tr>'+
      '<tr><th style="text-align:left">期望交付</th><td>'+esc(d.due)+'</td>'+
      '<th style="text-align:left">登记日期</th><td>'+esc(d.create)+'</td></tr>'+
      '<tr><th style="text-align:left">关联项目</th><td colspan="3">'+
        (p?'<a onclick="closeModal();showPage(\'proj:detail\',{id:\''+p.id+'\'})">'+esc(p.name)+'</a>'
          :'<span class="muted">尚未立项</span>')+'</td></tr>'+
      '</tbody></table>',
    footer:'<button class="btn" onclick="closeModal()">关闭</button>'+
           (p?'':'<button class="btn btn-primary" onclick="closeModal();demandToPrj(\''+id+'\')">转为项目</button>')});
}
function demandToPrj(id){
  var d=DEMANDS.filter(function(x){return x.id===id;})[0]; if(!d)return;
  if(d.prj){ toast('该需求已关联项目 '+d.prj,'info'); return; }
  confirmBox('需求转立项','将需求 <b>'+esc(d.title)+'</b> 转为研发项目？<br>'+
    '<span class="muted">系统将创建项目草稿并预填产品名称与负责人，正式版会进入立项审批流。</span>',
    function(){
      var nid=nextProjectId();
      PROJECTS.push({
        id:nid,name:d.title,stage:'评审',product:d.product,productCategory:'待维护',industry:'待维护',
        stageProgress:['评审','预研','小试','中试','试生产','交付','推广'],stageDone:[],stageOn:0,
        startDate:todayStr(),dueDate:d.due,leader:d.owner,members:[d.owner],
        dept:'LAB-SH-1',category:'新产品',source:d.src==='customer'?'客户需求':'自研需求',
        coefficient:0.50,important:false,remark:'',oa:false,desc:d.want
      });
      PROJ_STAGES[nid]=initialProjectStages();
      d.prj=nid;d.status='已立项';
      toast('已创建项目 '+nid,'ok');showPage('proj:detail',{id:nid});
    },{okText:'确认立项'});
}
function demandNew(src){
  toast((src==='customer'?'客户需求':'自研需求')+'新建表单（演示环境为只读原型）','info');
}
regPage('req:customer',{
  title:'客户需求',crumb:['需求管理','<b>客户需求</b>'],
  render:function(){ renderDemandPage('customer'); }
});
regPage('req:internal',{
  title:'自研需求',crumb:['需求管理','<b>自研需求</b>'],
  render:function(){ renderDemandPage('internal'); }
});

/* ==================================================================
   受限物质管理
   ================================================================== */
regPage('subst:list',{
  title:'受限物质管理',crumb:['合规管理','<b>受限物质管理</b>'],
  render:function(){
    $('pageHost').innerHTML='<div id="lpHost"></div>';
    renderListPage({
      title:'受限物质管理',
      /* 说明文本收进标题右侧的「说明」折叠面板（noteKey 保持展开状态跨翻页/筛选） */
      note:'汇总 REACH / RoHS / ZDHC / POP 等法规对皮革化工物质的限制要求，是配方设计与合规评审的红线依据。'
          +'<div class="np-n"><b>使用方式</b>点击任一物质行或「配方命中检查」，可按 CAS 号反查当前物料配方中的命中情况与浓度。</div>',
      noteKey:'subst',
      cols:[
        {k:'cn',t:'物质名称'},
        {k:'cas',t:'CAS 号',w:'110px',fmt:function(r){return '<span class="mono">'+esc(r.cas)+'</span>';}},
        {k:'cls',t:'GHS 分类',w:'200px'},
        {k:'law',t:'限制法规'},
        {k:'limit',t:'限值要求',w:'230px'},
        {k:'scope',t:'适用范围',w:'140px'},
        {k:'state',t:'管控状态',w:'100px',fmt:function(r){return '<span class="tag '+(SUBST_STATE[r.state]||'tag-grey')+'">'+esc(r.state)+'</span>';}},
        {k:'risk',t:'风险等级',w:'80px',align:'c',fmt:function(r){return '<span class="tag '+(RISK_TAG[r.risk]||'tag-grey')+'">'+esc(r.risk)+'</span>';}}
      ],
      rows:SUBST_ROWS,kwKeys:['cn','cas','law','cls','scope'],
      filters:[
        {k:'state',t:'管控状态',all:'全部',opts:[['禁用','禁用'],['在用受限','在用受限'],['需授权','需授权'],['需申报','需申报']]},
        {k:'risk',t:'风险等级',all:'全部',opts:[['高','高'],['中','中'],['低','低']]}
      ],
      pageSize:10,
      headActs:'<button class="btn" onclick="showPage(\'law:query\')">统一查询法规</button>'+
               '<button class="btn btn-primary" onclick="toast(\'受限物质清单已导出（演示）\',\'ok\')">导出清单</button>',
      acts:function(r){
        return '<button class="btn btn-link" onclick="substCheck(\''+esc(r.cn)+'\')">配方命中检查</button>';
      },
      onRowClick:function(r){ substCheck(r.cn); }
    });
  }
});
function substCheck(cn){
  var hit=SUBST_ROWS.filter(function(s){return s.cn===cn;})[0]; if(!hit)return;
  var used=[];
  Object.keys(DB_CFG.material.rows.length?DB_CFG.material.rows:{}).forEach(function(){});
  DB_CFG.material.rows.forEach(function(m){
    (m.recipe||[]).forEach(function(c){
      var lib=CAS_LIB[c.cas];
      if(lib&&lib.cn===hit.cn)used.push([m.code,m.name,c.conc+'%']);
    });
  });
  openModal({title:'配方命中检查 · '+cn,width:640,
    body:'<div class="notice notice-'+(used.length?'warn':'ok')+'"><i class="ni">'+(used.length?'!':'✓')+'</i><div>'+
      '<b>'+(used.length?('命中 '+used.length+' 个物料配方'):'当前物料配方中未检出该物质')+'</b>'+
      '检查范围：物料主数据全部已维护配方；限值要求：'+esc(hit.limit)+'</div></div>'+
      (used.length?'<table class="tbl"><thead><tr><th>物料编码</th><th>物料名称</th><th style="width:90px">浓度</th></tr></thead><tbody>'+
        used.map(function(u){return '<tr><td class="mono">'+esc(u[0])+'</td><td>'+esc(u[1])+'</td><td class="num">'+esc(u[2])+'</td></tr>';}).join('')+
        '</tbody></table>':''),
    footer:'<button class="btn" onclick="closeModal()">关闭</button>'+
           (used.length?'<button class="btn btn-primary" onclick="closeModal();toast(\'已生成替代方案评估任务\',\'ok\')">发起替代评估</button>':'')});
}

/* ==================================================================
   项目管理：列表 / 详情（4 Tab）/ 应用项目
   ================================================================== */
var projListState={year:'',kw:'',dept:'',category:''};

var PROJ_GATE_GROUPS=[
  {name:'评审阶段',tone:'review',cols:['计划完成时间']},
  {name:'预研阶段',tone:'research',cols:['产品剖析','标准及方法建立/评审','总结/立项申请']},
  {name:'小试阶段',tone:'pilot',cols:['原料筛选','稳定性考察','压力测试','小试总结']},
  {name:'中试阶段',tone:'middle',cols:['中试申请','第一批合格']},
  {name:'推广阶段',tone:'promote',cols:['产品验证','产品性能评审','技术与成本评审','产品试推广','放大生产','产品正式推广']},
  {name:'验收',tone:'accept',cols:['项目验收']}
];

/* 推广阶段 8 个字段（对齐真实系统）：1/2/3/7/8 取值为「是/否」，
   4 为附件，5/6 为计划 / 实际完成时间。
   promoGates 数组按非附件字段顺序存放，见 promoGateVal()。 */
var PROMO_FIELDS=[
  {t:'产品验证是否完成',type:'yn',gate:0},
  {t:'产品性能评审是否完成',type:'yn',gate:1},
  {t:'技术与成本评审是否完成',type:'yn',gate:2},
  {t:'技术及成本评审附件',type:'file'},
  {t:'产品试推广计划完成时间',type:'date',gate:3},
  {t:'产品试推广实际完成时间',type:'date',gate:4},
  {t:'放大生产是否合格',type:'yn',gate:5},
  {t:'产品正式推广是否发起',type:'yn',gate:6}
];
function promoGateVal(st,i){
  var g=(st&&st.promoGates)||[];
  return g[i]===undefined||g[i]===null?'':String(g[i]);
}
function promoYnTag(v){
  if(v==='是')return '<span class="tag tag-green">是</span>';
  if(v==='否')return '<span class="tag tag-grey">否</span>';
  return '<span class="muted">—</span>';
}
function promoDateVal(v){
  return v&&v!=='—'?esc(v):'<span class="muted">—</span>';
}

function gateCell(value,state){return {value:value||'',state:state||''};}
var PROJ_GATE_DATA={
  'PRJ-2026-001':[
    gateCell('2026-04-30','on-time'),gateCell('2026-05-08','on-time'),gateCell('是','on-time'),gateCell('2026-05-20','on-time'),
    gateCell('是','on-time'),gateCell('是','on-time'),gateCell('待完成','pending'),gateCell('2026-09-30','pending'),
    gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell('—','unset')
  ],
  'PRJ-2026-002':[
    gateCell('2026-02-28','on-time'),gateCell('2026-03-10','on-time'),gateCell('是','on-time'),gateCell('2026-03-25','on-time'),
    gateCell('是','on-time'),gateCell('是','on-time'),gateCell('是','on-time'),gateCell('2026-06-30','on-time'),
    gateCell('是','on-time'),gateCell('2026-09-30','pending'),gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell('—','unset')
  ],
  'PRJ-2026-003':[
    gateCell('2026-07-15','late-done'),gateCell('2026-08-20','late-done'),gateCell('待评审','overdue'),gateCell('2026-08-31','overdue'),
    gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell('—','unset')
  ],
  'PRJ-2026-004':[
    gateCell('2026-05-31','on-time'),gateCell('2026-06-18','on-time'),gateCell('是','on-time'),gateCell('2026-06-30','on-time'),
    gateCell('是','on-time'),gateCell('待完成','pending'),gateCell('待完成','pending'),gateCell('2026-10-15','pending'),
    gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell(),gateCell('—','unset')
  ],
  'PRJ-2026-005':[
    gateCell('2025-09-30','on-time'),gateCell('2025-10-31','on-time'),gateCell('是','on-time'),gateCell('2025-11-15','on-time'),
    gateCell('是','on-time'),gateCell('是','on-time'),gateCell('是','on-time'),gateCell('2026-02-28','on-time'),
    gateCell('是','on-time'),gateCell('2026-04-15','on-time'),gateCell('是','on-time'),gateCell('是','on-time'),gateCell('是','on-time'),gateCell('2026-09-16','pending'),gateCell('否','pending'),gateCell('否','pending'),gateCell('2026-08-30','overdue')
  ]
};

function projDeptName(id){
  var d=(typeof DEPTS!=='undefined'?DEPTS:[]).filter(function(x){return x.id===id;})[0];
  return d?d.name:id;
}
function projYear(p){return String(p.startDate||'').slice(0,4);}
function projListFilter(){
  var kw=projListState.kw.toLowerCase();
  return PROJECTS.filter(function(p){
    if(projListState.year&&projYear(p)!==projListState.year)return false;
    if(projListState.dept&&p.dept!==projListState.dept)return false;
    if(projListState.category&&p.category!==projListState.category)return false;
    if(kw&&[p.name,p.leader,p.product,p.source,p.remark].join(' ').toLowerCase().indexOf(kw)<0)return false;
    return true;
  });
}
function projListOptions(list,current){
  return list.map(function(v){return '<option value="'+esc(v)+'"'+(current===v?' selected':'')+'>'+esc(v)+'</option>';}).join('');
}
function projGateCellHtml(cell){
  if(!cell||!cell.value)return '<td class="gate-empty"></td>';
  return '<td><span class="gate-value gate-'+esc(cell.state)+'">'+esc(cell.value)+'</span></td>';
}
function projListApply(){
  projListState.year=($('projYear')||{}).value||'';
  projListState.kw=(($('projKw')||{}).value||'').trim();
  projListState.dept=($('projDept')||{}).value||'';
  projListState.category=($('projCategory')||{}).value||'';
  renderProjectMatrix();
}
function projListReset(){
  projListState={year:'',kw:'',dept:'',category:''};
  renderProjectMatrix();
}
function renderProjectMatrix(){
  var host=$('lpHost')||$('pageHost');if(!host)return;
  var rows=projListFilter();
  var years=PROJECTS.map(projYear).filter(function(v,i,a){return v&&a.indexOf(v)===i;}).sort().reverse();
  var cats=PROJECTS.map(function(p){return p.category;}).filter(function(v,i,a){return v&&a.indexOf(v)===i;});
  var depts=(typeof DEPTS!=='undefined'?DEPTS:[]);
  var h='<div class="page-hd"><div class="t"><h1>研发项目管理</h1><div class="page-sub">覆盖评审、预研、小试、中试、推广与验收节点的研发项目台账</div></div>'+
    '<div class="page-acts"><button class="btn" onclick="toast(\'已导出当前项目台账\',\'ok\')">⇩ 导出</button><button class="btn btn-primary" onclick="showPage(\'proj:new\')">＋ 添加</button></div></div>'+
    '<div class="card proj-filter-card"><div class="card-b"><div class="proj-filter-grid">'+
      '<label><span>立项年份</span><select class="ctrl" id="projYear"><option value="">全部年份</option>'+projListOptions(years,projListState.year)+'</select></label>'+
      '<label class="proj-search"><span>搜索</span><input class="input" id="projKw" value="'+esc(projListState.kw)+'" placeholder="项目名称 / 项目负责人 / 产品名称 / 项目来源 / 备注" onkeydown="if(event.key===\'Enter\')projListApply()"></label>'+
      '<label><span>部门</span><select class="ctrl" id="projDept"><option value="">全部部门</option>'+depts.map(function(d){return '<option value="'+esc(d.id)+'"'+(projListState.dept===d.id?' selected':'')+'>'+esc(d.name)+'</option>';}).join('')+'</select></label>'+
      '<label><span>项目类别</span><select class="ctrl" id="projCategory"><option value="">全部类别</option>'+projListOptions(cats,projListState.category)+'</select></label>'+
      '<div class="proj-filter-actions"><button class="btn btn-primary" onclick="projListApply()">查询</button><button class="btn" onclick="projListReset()">重置</button></div>'+
    '</div></div></div>'+
    '<div class="proj-legend"><b>图例说明</b><span><i class="gate-demo gate-unset">—</i>未填</span><span><i class="gate-demo gate-pending"></i>尚未完成</span><span><i class="gate-demo gate-overdue"></i>逾期未完成</span><span><i class="gate-demo gate-late-done"></i>逾期完成</span><span><i class="gate-demo gate-on-time"></i>计划时间内完成</span><span>空白无需填写</span></div>'+
    '<div class="card proj-matrix-card"><div class="card-b tight"><div class="tbl-wrap"><table class="tbl proj-matrix"><thead><tr>'+
      '<th class="proj-fixed proj-name" rowspan="2">项目名称</th><th class="proj-fixed proj-owner" rowspan="2">项目负责人</th><th class="proj-fixed proj-dept" rowspan="2">部门</th>';
  PROJ_GATE_GROUPS.forEach(function(g){h+='<th class="gate-head gate-head-'+g.tone+'" colspan="'+g.cols.length+'">'+esc(g.name)+'</th>';});
  h+='<th class="proj-status" rowspan="2">状态</th></tr><tr>';
  PROJ_GATE_GROUPS.forEach(function(g){g.cols.forEach(function(c){h+='<th class="gate-sub gate-head-'+g.tone+'">'+esc(c)+'</th>';});});
  h+='</tr></thead><tbody>';
  if(!rows.length)h+='<tr><td colspan="21"><div class="empty"><span class="ei">🗂</span>暂无符合条件的项目</div></td></tr>';
  rows.forEach(function(p){
    var cells=PROJ_GATE_DATA[p.id]||[];
    h+='<tr><td class="proj-fixed proj-name"><button class="proj-name-link" onclick="showPage(\'proj:detail\',{id:\''+esc(p.id)+'\'})">'+esc(p.name)+'</button><small>'+esc(p.id)+'</small></td>'+
      '<td class="proj-fixed proj-owner">'+esc(p.leader)+'</td><td class="proj-fixed proj-dept">'+esc(projDeptName(p.dept))+'</td>'+
      cells.map(projGateCellHtml).join('')+'<td class="proj-status"><span class="tag tag-blue">'+esc(p.stage==='交付'?'验收维护':p.stage+'维护')+'</span></td></tr>';
  });
  h+='</tbody></table></div><div class="proj-count">共 '+rows.length+' 个项目 · 横向滚动可查看全部阶段节点</div></div></div>';
  host.innerHTML=h;
}

regPage('proj:list',{
  title:'研发项目管理',crumb:['项目管理','<b>研发项目管理</b>'],
  render:function(){
    $('pageHost').innerHTML='<div id="lpHost"></div>';
    renderProjectMatrix();
  }
});

/* ---------- 新增项目：维护完整项目信息 ---------- */
regPage('proj:new',{
  title:'新增研发项目',
  crumb:['项目管理','<a onclick="showPage(\'proj:list\')">研发项目管理</a>','新增项目'],
  render:function(){
    var leaderOpts=USERS.map(function(u){
      return '<option value="'+esc(u.name)+'">'+esc(u.name)+'（'+esc(u.role)+'）</option>';
    }).join('');
    var deptOpts=DEPTS.map(function(d){
      return '<option value="'+esc(d.id)+'">'+esc(d.name)+'</option>';
    }).join('');
    $('pageHost').innerHTML=
      '<div class="page-hd"><div class="t"><h1>新增研发项目</h1>'+
        '<div class="page-sub">维护项目主信息，保存后进入项目详情继续填写各阶段数据</div></div>'+
        '<div class="page-acts"><button class="btn" onclick="showPage(\'proj:list\')">取消</button>'+
        '<button class="btn btn-primary" onclick="saveNewProject()">保存项目</button></div></div>'+
      '<div class="card"><div class="card-hd"><h3>项目信息</h3><span class="sub"><span class="req">*</span> 为必填项</span></div>'+
      '<div class="card-b"><div class="form-grid proj-create-form">'+
        '<div class="field"><label>项目负责人 <span class="req">*</span></label><select class="ctrl" id="pnLeader"><option value="">请选择负责人</option>'+leaderOpts+'</select></div>'+
        '<div class="field"><label>归属部门 <span class="req">*</span></label><select class="ctrl" id="pnDept"><option value="">请选择部门</option>'+deptOpts+'</select></div>'+
        '<div class="field"><label>项目名称 <span class="req">*</span></label><input class="ctrl" id="pnName" placeholder="请输入项目名称"></div>'+
        '<div class="field"><label>产品名称 <span class="req">*</span></label><input class="ctrl" id="pnProduct" placeholder="请输入目标产品名称"></div>'+
        '<div class="field"><label>产品类别 <span class="req">*</span></label><input class="ctrl" id="pnProductCategory" placeholder="例如：水性树脂"></div>'+
        '<div class="field"><label>应用行业 <span class="req">*</span></label><input class="ctrl" id="pnIndustry" placeholder="例如：皮革涂饰"></div>'+
        '<div class="field"><label>项目来源 <span class="req">*</span></label><input class="ctrl" id="pnSource" placeholder="例如：客户需求、技术预研"></div>'+
        '<div class="field"><label>项目类别 <span class="req">*</span></label><select class="ctrl" id="pnCategory"><option value="">请选择项目类别</option><option>新产品</option><option>改进产品</option><option>中间体</option></select></div>'+
        '<div class="field"><label>合计（系数） <span class="req">*</span></label><input class="ctrl" id="pnCoefficient" type="number" min="0.01" max="0.99" step="0.01" placeholder="请输入大于 0 且小于 1 的小数"><span class="help">取值范围：0 &lt; 系数 &lt; 1，保存后保留两位小数</span></div>'+
        '<div class="field"><label>是否重点 <span class="req">*</span></label><select class="ctrl" id="pnImportant"><option value="false">否</option><option value="true">是</option></select></div>'+
        '<div class="field"><label>项目计划完成时间 <span class="req">*</span></label><input class="ctrl" id="pnDueDate" type="date"></div>'+
        '<div class="field"><label>备注</label><textarea class="ctrl" id="pnRemark" rows="3" placeholder="请输入项目备注"></textarea></div>'+
      '</div></div></div>';
  }
});

function nextProjectId(){
  var max=PROJECTS.reduce(function(n,p){
    var m=String(p.id||'').match(/^PRJ-2026-(\d+)$/);
    return m?Math.max(n,parseInt(m[1],10)):n;
  },0);
  return 'PRJ-2026-'+String(max+1).padStart(3,'0');
}
function initialProjectStages(){
  return [
    {name:'评审',status:'doing',reviewPlan:'',reviewActual:'',reviewPassed:'待评审'},
    {name:'预研',status:'todo',start:'—',end:'—'},
    {name:'小试',status:'todo',start:'—',end:'—',summaryFiles:[],files:[]},
    {name:'中试',status:'todo',start:'—',end:'—',evaluationFiles:[],files:[]},
    {name:'试生产',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',goal:'—',result:'—',files:[]},
    {name:'交付',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',goal:'—',result:'—',files:[]},
    {name:'推广',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',goal:'—',result:'—',files:[],promoGates:[],promoFiles:[]}
  ];
}
function newProjectValue(id){return (($('pn'+id)||{}).value||'').trim();}
function saveNewProject(){
  var data={
    leader:newProjectValue('Leader'),dept:newProjectValue('Dept'),name:newProjectValue('Name'),
    product:newProjectValue('Product'),productCategory:newProjectValue('ProductCategory'),
    industry:newProjectValue('Industry'),source:newProjectValue('Source'),category:newProjectValue('Category'),
    coefficient:newProjectValue('Coefficient'),important:newProjectValue('Important'),
    dueDate:newProjectValue('DueDate'),remark:newProjectValue('Remark')
  };
  var required=['leader','dept','name','product','productCategory','industry','source','category','coefficient','dueDate'];
  if(required.some(function(k){return !data[k];})){
    toast('请完整填写所有必填项','warn');return;
  }
  var coefficient=Number(data.coefficient);
  if(!(coefficient>0&&coefficient<1)){
    toast('合计（系数）必须是大于 0 且小于 1 的小数','warn');return;
  }
  var id=nextProjectId();
  PROJECTS.push({
    id:id,name:data.name,dept:data.dept,stage:'评审',product:data.product,
    productCategory:data.productCategory,industry:data.industry,
    stageProgress:['评审','预研','小试','中试','试生产','交付','推广'],stageDone:[],stageOn:0,
    startDate:todayStr(),dueDate:data.dueDate,leader:data.leader,members:[data.leader],
    category:data.category,source:data.source,coefficient:Number(coefficient.toFixed(2)),
    important:data.important==='true',remark:data.remark,oa:false,desc:data.remark
  });
  PROJ_STAGES[id]=initialProjectStages();
  toast('项目 '+id+' 已创建','ok');
  showPage('proj:detail',{id:id});
}

/* ==================================================================
   项目详情
   · 项目信息 = 主信息，位于 Tab 容器「之外」（页面上部）
   · Tab = 项目表单 / 变更记录 / 审核历史 / 实验记录 / 实验总结 / 文档
   · 右侧竖向阶段导航「仅」对「项目表单」Tab 生效，用于切换阶段内容
   ================================================================== */

/* ---------- 数据：项目各阶段（每阶段独立字段） ---------- */
var PROJ_STAGES={
  'PRJ-2026-001':[
    {name:'评审',status:'done',reviewPlan:'2026-04-30',reviewActual:'2026-04-15',reviewPassed:'是'},
    {name:'预研',status:'done',start:'2026-04-12',end:'2026-05-20',
     review:'通过',reviewer:'王研究员',reviewDate:'2026-05-22',
     goal:'验证鞋面革柔软度提升的可行技术路线',
     result:'确定以加脂工艺优化为主攻方向，排除树脂替换路线（成本超标 40%）',
     files:[{n:'预研调研报告.pdf',t:'PDF',s:'2.4 MB'},{n:'竞品柔软度对标数据.xlsx',t:'XLSX',s:'386 KB'}]},
    {name:'小试',status:'doing',start:'2026-05-21',end:'',
     review:'待评审',reviewer:'王研究员',reviewDate:'',
     goal:'通过 21 组全因子 DOE 筛选温度/催化剂/压力中的关键因子',
     result:'进行中 · 已完成 12 组实验，柔软度最高提升 18.4%',
     files:[{n:'DOE-2026-0312 实验方案.docx',t:'DOCX',s:'812 KB'},{n:'小试第 1 批检测报告.pdf',t:'PDF',s:'1.1 MB'}]},
    {name:'中试',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',
     goal:'—',result:'—',files:[]},
    {name:'试生产',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',
     goal:'—',result:'—',files:[]},
    {name:'交付',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',
     goal:'—',result:'—',files:[]},
    {name:'推广',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',
     goal:'—',result:'—',files:[]}
  ],
  'PRJ-2026-002':[
    {name:'评审',status:'done',reviewPlan:'2026-02-28',reviewActual:'2026-02-10',reviewPassed:'是'},
    {name:'预研',status:'done',start:'2026-02-08',end:'2026-03-25',
     review:'通过',reviewer:'王研究员',reviewDate:'2026-03-27',
     goal:'评估 WPU-320 进口树脂国产化替代的技术可行性',
     result:'确定国产化路线，识别固含/粘度/成膜三项关键指标',
     files:[{n:'进口树脂剖析报告.pdf',t:'PDF',s:'3.2 MB'}]},
    {name:'小试',status:'done',start:'2026-03-26',end:'2026-06-30',
     review:'通过',reviewer:'陈工',reviewDate:'2026-07-02',
     goal:'小试验证国产树脂配方，关键指标偏差 ≤ 5%',
     result:'固含偏差 2.1%、粘度偏差 3.8%、成膜性达标，全部满足要求',
     summaryFiles:[{n:'WPU-320 国产化小试总结.pdf',t:'PDF',s:'1.2 MB'}],
     files:[{n:'小试配方记录.xlsx',t:'XLSX',s:'452 KB'},{n:'DOE-2026-0225 分析结果.pdf',t:'PDF',s:'1.6 MB'}]},
    {name:'中试',status:'doing',start:'2026-07-01',end:'',
     review:'进行中',reviewer:'王研究员',reviewDate:'',
     goal:'500L 反应釜放大验证，确认传热差异对批次稳定性的影响',
     result:'进行中 · 已完成 3 批中试，第 2 批因传热差异出现粘度波动，已调整工艺',
     files:[{n:'中试方案 V1.3.docx',t:'DOCX',s:'668 KB'},{n:'中试第 2 批复盘.pdf',t:'PDF',s:'904 KB'}]},
    {name:'试生产',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',
     goal:'—',result:'—',files:[]},
    {name:'交付',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',
     goal:'—',result:'—',files:[]},
    {name:'推广',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',
     goal:'—',result:'—',files:[]}
  ],
  'PRJ-2026-003':[
    {name:'评审',status:'done',reviewPlan:'2026-07-15',reviewActual:'2026-06-25',reviewPassed:'是'},
    {name:'预研',status:'doing',start:'2026-06-20',end:'',
     review:'待评审',reviewer:'李工',reviewDate:'',
     goal:'探索无溶剂合成革工艺路线，VOC 排放较现有工艺下降 ≥ 80%',
     result:'进行中 · 热熔与水性两条路线并行评估，已完成实验室级验证',
     files:[{n:'无溶剂工艺路线对比.docx',t:'DOCX',s:'1.2 MB'}]},
    {name:'小试',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',
     goal:'—',result:'—',files:[]},
    {name:'中试',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',
     goal:'—',result:'—',files:[]},
    {name:'试生产',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',
     goal:'—',result:'—',files:[]},
    {name:'交付',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',
     goal:'—',result:'—',files:[]},
    {name:'推广',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',
     goal:'—',result:'—',files:[]}
  ],
  'PRJ-2026-004':[
    {name:'评审',status:'done',reviewPlan:'2026-05-31',reviewActual:'2026-05-08',reviewPassed:'是'},
    {name:'预研',status:'done',start:'2026-05-05',end:'2026-06-15',
     review:'通过',reviewer:'王研究员',reviewDate:'2026-06-17',
     goal:'评估手感剂 HF 系列去除 APEO 的技术路径',
     result:'确定以脂肪醇聚氧乙烯醚替代壬基酚聚氧乙烯醚',
     files:[{n:'APEO 替代选型报告.pdf',t:'PDF',s:'1.8 MB'}]},
    {name:'小试',status:'doing',start:'2026-06-16',end:'',
     review:'待评审',reviewer:'李工',reviewDate:'',
     goal:'验证替代配方手感评分不低于原配方，且 APEO 未检出',
     result:'进行中 · 第 3 轮配方 APEO 已达标，手感评分略低 0.3 分待优化',
     files:[{n:'HF-5 改配方检测报告.pdf',t:'PDF',s:'758 KB'}]},
    {name:'中试',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',
     goal:'—',result:'—',files:[]},
    {name:'试生产',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',
     goal:'—',result:'—',files:[]},
    {name:'交付',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',
     goal:'—',result:'—',files:[]},
    {name:'推广',status:'todo',start:'—',end:'—',review:'—',reviewer:'—',reviewDate:'—',
     goal:'—',result:'—',files:[]}
  ],
  'PRJ-2026-005':[
    {name:'评审',status:'done',reviewPlan:'2025-09-30',reviewActual:'2025-09-15',reviewPassed:'是'},
    {name:'预研',status:'done',start:'2025-09-12',end:'2025-10-30',
     review:'通过',reviewer:'陈工',reviewDate:'2025-11-01',
     goal:'梳理 GL-9 出口欧盟需满足的法规要求与配方整改项',
     result:'识别 3 项需替换组分，确认 REACH SVHC 与 ZDHC MRSL 双重约束',
     files:[{n:'欧盟法规差异分析.pdf',t:'PDF',s:'2.1 MB'}]},
    {name:'小试',status:'done',start:'2025-11-01',end:'2026-01-20',
     review:'通过',reviewer:'陈工',reviewDate:'2026-01-22',
     goal:'完成 3 项受限组分替代并保持耐磨 ≥ 20000 次',
     result:'替代后耐磨 21400 次，成本上升 4.2%（通过工艺优化消化至 1.1%）',
     summaryFiles:[{n:'GL-9 合规改版小试总结.pdf',t:'PDF',s:'986 KB'}],
     files:[{n:'替代配方小试记录.xlsx',t:'XLSX',s:'524 KB'}]},
    {name:'中试',status:'done',start:'2026-01-21',end:'2026-04-15',
     review:'通过',reviewer:'王研究员',reviewDate:'2026-04-18',
     goal:'500L 放大验证替代配方稳定性与批次一致性',
     result:'连续 5 批指标稳定，耐磨批次间波动 < 3%',
     evaluationFiles:[{n:'GL-9 中试产品应用评价报告.pdf',t:'PDF',s:'1.1 MB'}],
     files:[{n:'中试批记录汇总.xlsx',t:'XLSX',s:'1.3 MB'},{n:'第三方耐磨检测报告.pdf',t:'PDF',s:'892 KB'}]},
    {name:'试生产',status:'done',start:'2026-04-16',end:'2026-06-30',
     review:'通过',reviewer:'赵工',reviewDate:'2026-07-02',
     goal:'试生产 2 吨并同步完成客户产线适用性验证',
     result:'客户产线连续运行 72h 无异常，涂饰外观与进口品一致',
     files:[{n:'试生产总结报告.pdf',t:'PDF',s:'1.5 MB'},{n:'客户产线验证记录.pdf',t:'PDF',s:'674 KB'}]},
    {name:'交付',status:'done',start:'2026-07-01',end:'2026-09-05',
     review:'通过',reviewer:'赵工',reviewDate:'2026-09-06',
     goal:'完成 SDS V2.1 审批归档与欧盟客户合规文件交付',
     result:'SDS V2.1 已审批归档，欧盟客户合规文件全部交付',
     files:[{n:'GL-9 SDS V2.1（已归档）.pdf',t:'PDF',s:'2.8 MB'},{n:'ZDHC 符合性声明.pdf',t:'PDF',s:'486 KB'}]},
    {name:'推广',status:'doing',start:'2026-09-06',end:'',
     review:'进行中',reviewer:'陈工',reviewDate:'',
     goal:'面向欧盟客户完成 GL-9 商务谈判与量产导入，同步启动国内市场试推广',
     result:'进行中 · 客户商务谈判中，已完成产线适配验证，首批意向订单 2 吨',
     target:'某知名沙发制造厂（出口欧盟）',channel:'展会 + 线上',promoStage:'商务谈判',
     promoGates:['是','是','是','2026-09-16','','否','否'],
     promoFiles:[{n:'GL-9 技术与成本评审纪要.pdf',t:'PDF',s:'612 KB'}],
     files:[{n:'GL-9 客户产线适配报告.pdf',t:'PDF',s:'674 KB'}]}
  ]
};
var STAGE_STATUS={done:'完成',doing:'进行中',todo:'未开始'};
var STAGE_DOT={done:'ok',doing:'on',todo:''};

/* ---------- 数据：变更记录 ---------- */
var PROJ_CHANGES={
  'PRJ-2026-001':[
    {time:'2026-08-20 14:22',who:'王研究员',field:'计划交付',from:'2026-09-30',to:'2026-10-30',reason:'客户追加 ZDHC 验厂要求，需延长验证周期'},
    {time:'2026-07-11 09:40',who:'李工',field:'项目成员',from:'王研究员',to:'王研究员、李工',reason:'DOE 实验量增加，补充实验员'},
    {time:'2026-06-03 16:05',who:'王研究员',field:'实验设计',from:'单因子轮换',to:'全因子 21 组',reason:'单因子无法识别交互效应'}
  ],
  'PRJ-2026-002':[
    {time:'2026-08-28 11:15',who:'王研究员',field:'阶段',from:'小试',to:'中试',reason:'小试三项指标全部达标，通过阶段评审'},
    {time:'2026-07-19 15:30',who:'陈工',field:'合规要求',from:'REACH',to:'REACH + ZDHC MRSL',reason:'客户要求同步满足 ZDHC 清单'},
    {time:'2026-05-08 10:20',who:'王研究员',field:'项目成员',from:'王研究员、李工',to:'王研究员、李工、陈工',reason:'补充法规专员参与合规评估'}
  ],
  'PRJ-2026-003':[
    {time:'2026-08-12 13:50',who:'李工',field:'技术路线',from:'单一热熔路线',to:'热熔 + 水性双线并行',reason:'热熔路线耐水解不达标，增加备选'},
    {time:'2026-07-02 09:10',who:'李工',field:'计划交付',from:'2026-12-31',to:'2027-03-15',reason:'预研范围扩大，重新评估周期'}
  ],
  'PRJ-2026-004':[
    {time:'2026-07-24 16:40',who:'李工',field:'验收标准',from:'APEO 未检出',to:'APEO < 100 mg/kg 且手感评分 ≥ 4.0',reason:'完全未检出导致手感显著下降，调整为限量管控'}
  ],
  'PRJ-2026-005':[
    {time:'2026-09-06 15:40',who:'赵工',field:'阶段',from:'交付',to:'推广',reason:'SDS V2.1 已归档，客户商务谈判启动，进入推广'},
    {time:'2026-08-25 10:05',who:'陈工',field:'计划交付',from:'2026-08-30',to:'2026-09-15',reason:'REACH Annex XVII 新版生效，SDS 需重新分类'},
    {time:'2026-06-28 14:30',who:'赵工',field:'阶段',from:'试生产',to:'交付',reason:'客户产线验证通过，进入交付'},
    {time:'2026-02-14 09:25',who:'陈工',field:'配方',from:'含 APEO 乳化剂',to:'脂肪醇聚氧乙烯醚',reason:'满足 ZDHC MRSL V3.1'}
  ]
};

/* ---------- 数据：审核历史 ---------- */
var PROJ_AUDITS={
  'PRJ-2026-001':[
    {time:'2026-05-22 14:00',node:'预研阶段评审',who:'王研究员',role:'研发工程师',result:'通过',cmt:'技术路线清晰，同意进入小试'},
    {time:'2026-04-15 10:30',node:'立项审核',who:'赵工',role:'数据治理员',result:'通过',cmt:'需求来源明确，预算与周期合理'}
  ],
  'PRJ-2026-002':[
    {time:'2026-07-02 15:20',node:'小试阶段评审',who:'陈工',role:'法规专员',result:'通过',cmt:'三项关键指标均达标，合规无遗留项，同意进入中试'},
    {time:'2026-03-27 11:00',node:'预研阶段评审',who:'王研究员',role:'研发工程师',result:'通过',cmt:'国产化路径可行'},
    {time:'2026-02-10 09:40',node:'立项审核',who:'赵工',role:'数据治理员',result:'通过',cmt:'OA 立项已备案，同意启动'}
  ],
  'PRJ-2026-003':[
    {time:'2026-06-25 14:10',node:'立项审核',who:'赵工',role:'数据治理员',result:'通过',cmt:'预研性质项目，同意立项'}
  ],
  'PRJ-2026-004':[
    {time:'2026-06-17 10:50',node:'预研阶段评审',who:'王研究员',role:'研发工程师',result:'通过',cmt:'替代路径明确，同意进入小试'}
  ],
  'PRJ-2026-005':[
    {time:'2026-07-02 16:30',node:'试生产阶段评审',who:'赵工',role:'数据治理员',result:'通过',cmt:'客户产线验证通过，同意进入交付'},
    {time:'2026-04-18 14:00',node:'中试阶段评审',who:'王研究员',role:'研发工程师',result:'通过',cmt:'批次一致性良好'},
    {time:'2026-01-22 11:20',node:'小试阶段评审',who:'陈工',role:'法规专员',result:'通过',cmt:'受限组分已全部替换，耐磨达标'},
    {time:'2025-11-01 09:30',node:'预研阶段评审',who:'陈工',role:'法规专员',result:'通过',cmt:'法规差异识别完整'},
    {time:'2025-09-15 10:00',node:'立项审核',who:'赵工',role:'数据治理员',result:'通过',cmt:'欧盟客户刚需，优先级调高'}
  ]
};
var AUDIT_TAG={'通过':'tag-green','驳回':'tag-red','待审核':'tag-orange','有条件通过':'tag-blue'};

/* ---------- 数据：项目文档 ---------- */
var PROJ_DOCS={
  'PRJ-2026-001':[
    {n:'立项建议书',t:'项目文档',v:'V1.0',owner:'王研究员',upd:'2026-04-15',st:'已归档'},
    {n:'预研阶段评审记录',t:'评审记录',v:'V1.0',owner:'王研究员',upd:'2026-05-22',st:'已归档'},
    {n:'DOE-2026-0312 实验方案',t:'技术文档',v:'V1.2',owner:'王研究员',upd:'2026-08-10',st:'已发布'},
    {n:'鞋面革柔软度测试方法 SOP',t:'作业指导',v:'V3.2',owner:'李工',upd:'2026-08-08',st:'已发布'}
  ],
  'PRJ-2026-002':[
    {n:'立项建议书（OA 备案）',t:'项目文档',v:'V1.0',owner:'王研究员',upd:'2026-02-10',st:'已归档'},
    {n:'小试阶段评审记录',t:'评审记录',v:'V1.0',owner:'陈工',upd:'2026-07-02',st:'已归档'},
    {n:'WPU-320 国产化中试方案',t:'技术文档',v:'V1.3',owner:'王研究员',upd:'2026-08-28',st:'已发布'},
    {n:'中试第 2 批复盘',t:'技术文档',v:'V1.0',owner:'王研究员',upd:'2026-08-21',st:'已发布'},
    {n:'进口树脂剖析报告',t:'技术文档',v:'V1.0',owner:'陈工',upd:'2026-03-25',st:'已归档'}
  ],
  'PRJ-2026-003':[
    {n:'立项建议书',t:'项目文档',v:'V1.0',owner:'李工',upd:'2026-06-25',st:'已归档'},
    {n:'无溶剂工艺路线对比',t:'技术文档',v:'V0.9',owner:'李工',upd:'2026-07-30',st:'草稿'}
  ],
  'PRJ-2026-004':[
    {n:'立项建议书',t:'项目文档',v:'V1.0',owner:'王研究员',upd:'2026-05-08',st:'已归档'},
    {n:'APEO 替代选型报告',t:'技术文档',v:'V1.2',owner:'李工',upd:'2026-06-05',st:'已发布'},
    {n:'HF-5 改配方检测报告',t:'检测报告',v:'V1.0',owner:'李工',upd:'2026-07-31',st:'已发布'}
  ],
  'PRJ-2026-005':[
    {n:'立项建议书',t:'项目文档',v:'V1.0',owner:'陈工',upd:'2025-09-12',st:'已归档'},
    {n:'四个阶段评审记录（合订）',t:'评审记录',v:'V1.0',owner:'陈工',upd:'2026-07-02',st:'已归档'},
    {n:'GL-9 SDS V2.1',t:'合规文档',v:'V2.1',owner:'陈工',upd:'2026-09-01',st:'审批中'},
    {n:'ZDHC MRSL V3.1 符合性声明',t:'合规文档',v:'V1.1',owner:'陈工',upd:'2026-08-20',st:'已发布'},
    {n:'REACH 差异分析',t:'合规文档',v:'V1.0',owner:'陈工',upd:'2026-07-22',st:'待更新'},
    {n:'试生产总结报告',t:'技术文档',v:'V1.0',owner:'赵工',upd:'2026-06-30',st:'已发布'}
  ]
};
var DOC_ST={'已归档':'tag-grey','已发布':'tag-green','审批中':'tag-orange','草稿':'tag-grey','待更新':'tag-orange'};

/* ---------- 状态 ---------- */
var curProjId='',curProjTab='form',curProjStage=-1;

regPage('proj:detail',{
  title:'项目详情',
  crumb:function(){
    var p=findProj(curProjId);
    return ['项目管理','<a onclick="showPage(\'proj:list\')">研发项目管理</a>',p?esc(p.id):''];
  },
  render:function(params){
    var id=params.id||PROJECTS[0].id;
    /* 切换项目时必须重置阶段选中态，否则会残留上一个项目的阶段索引 */
    if(id!==curProjId)curProjStage=-1;
    curProjId=id;
    curProjTab=params.tab||'form';
    var p=findProj(curProjId);
    if(!p){ $('pageHost').innerHTML=placeholder('🚧','项目不存在','未找到 '+esc(curProjId)); return; }
    /* 默认定位到该项目当前所处阶段 */
    if(curProjStage<0)curProjStage=p.stageOn||0;
    renderProjDetail(p);
  }
});

function renderProjDetail(p){
  var stages=PROJ_STAGES[p.id]||[];
  var changes=(PROJ_CHANGES[p.id]||[]);
  var audits=(PROJ_AUDITS[p.id]||[]);
  var sums=projectExpSummaries(p.id);
  var docs=(PROJ_DOCS[p.id]||[]);
  var exps=expOfProject(p.id);

  var h='';
  /* ---- 页头 + 按钮 ---- */
  h+='<div class="page-hd"><div class="t">'+
     '<h1>'+esc(p.name)+'</h1>'+
     '<div class="page-sub"><span class="mono">'+esc(p.id)+'</span> · 产品：'+esc(p.product)+
     ' · 负责人 '+esc(p.leader)+' · '+esc(p.startDate)+' → '+esc(p.dueDate)+
     (p.oa?' · <span class="tag tag-orange">OA 立项</span>':'')+'</div></div>'+
     '<div class="page-acts">'+
       '<button class="btn" onclick="showPage(\'proj:list\')">返回</button>'+
       '<button class="btn" onclick="toast(\'请调整项目负责人\',\'info\')">更换负责人</button>'+
       '<button class="btn" onclick="toast(\'请修改项目名称\',\'info\')">修改项目名称</button>'+
       '<button class="btn" onclick="toast(\'请调整归属部门\',\'info\')">调整部门</button>'+
     '</div></div>';

  /* ---- 项目信息：主信息，位于 Tab 容器之外 ---- */
  h+='<div class="card" style="margin-bottom:16px"><div class="card-hd">'+
     '<h3>项目信息</h3><span class="sub">项目主信息，各 Tab 内容均基于此项目</span></div>'+
     '<div class="card-b">'+projInfoTable(p)+'</div></div>';

  /* ---- Tab 容器 ---- */
  h+='<div id="projTabBar"></div><div id="projTabBody"></div>';
  $('pageHost').innerHTML=h;

  var items=[
    {key:'form',   label:'项目表单'},
    {key:'change', label:'变更记录（'+changes.length+'）'},
    {key:'audit',  label:'审核历史（'+audits.length+'）'},
    {key:'exp',    label:'实验记录（'+exps.length+'）'},
    {key:'sum',    label:'实验总结（'+sums.length+'）'},
    {key:'doc',    label:'文档（'+docs.length+'）'}
  ];
  $('projTabBar').appendChild(tabs(items,curProjTab,function(k){
    curProjTab=k; renderProjTabBody(p);
  }));
  renderProjTabBody(p);
}

/* ---------- 项目信息表格 ---------- */
function projInfoTable(p){
  return '<table class="tbl"><tbody>'+
    '<tr><th style="width:130px;text-align:left">项目负责人</th><td>'+esc(p.leader)+'</td>'+
    '<th style="width:130px;text-align:left">归属部门</th><td>'+esc(projDeptName(p.dept))+'</td></tr>'+
    '<tr><th style="text-align:left">项目名称</th><td>'+esc(p.name)+'</td>'+
    '<th style="text-align:left">产品名称</th><td>'+esc(p.product)+'</td></tr>'+
    '<tr><th style="text-align:left">产品类别</th><td>'+esc(p.productCategory||'—')+'</td>'+
    '<th style="text-align:left">应用行业</th><td>'+esc(p.industry||'—')+'</td></tr>'+
    '<tr><th style="text-align:left">项目来源</th><td>'+esc(p.source||'—')+'</td>'+
    '<th style="text-align:left">项目类别</th><td><span class="tag tag-blue">'+esc(p.category||'—')+'</span></td></tr>'+
    '<tr><th style="text-align:left">合计（系数）</th><td>'+Number(p.coefficient||0).toFixed(2)+'</td>'+
    '<th style="text-align:left">是否重点</th><td><span class="tag '+(p.important?'tag-orange':'tag-grey')+'">'+(p.important?'是':'否')+'</span></td></tr>'+
    '<tr><th style="text-align:left">项目计划完成时间</th><td>'+esc(p.dueDate||'—')+'</td>'+
    '<th style="text-align:left">备注</th><td>'+esc(p.remark||'—')+'</td></tr>'+
    '</tbody></table>';
}

/* ---------- Tab 内容分发 ---------- */
function renderProjTabBody(p){
  var host=$('projTabBody'); if(!host)return;
  var h='';
  if(curProjTab==='form')       h=tabProjForm(p);
  else if(curProjTab==='change')h=tabProjChange(p);
  else if(curProjTab==='audit') h=tabProjAudit(p);
  else if(curProjTab==='exp')   h=tabProjExp(p);
  else if(curProjTab==='sum')   h=tabProjSummary(p);
  else                          h=tabProjDoc(p);
  host.innerHTML=h;
}

/* ---------- Tab 1：项目表单（含右侧竖向阶段导航） ---------- */
function tabProjForm(p){
  var stages=PROJ_STAGES[p.id]||[];
  if(!stages.length)return '<div class="card"><div class="card-b"><div class="empty"><span class="ei">📋</span>该项目尚未配置阶段数据</div></div></div>';
  var st=stages[curProjStage]||stages[0];

  var h='<div class="proj-form-wrap">';
  /* 左：阶段表单 */
  h+='<div class="card"><div class="card-hd">'+
     '<h3>'+esc(st.name)+' 阶段表单</h3>'+
     '<span class="sub">'+esc(st.name)+'阶段的独立信息，切换右侧阶段查看其他阶段</span></div>'+
     '<div class="card-b">'+stageFormHTML(st,p)+'</div></div>';
  /* 右：竖向阶段导航 */
  h+='<div class="stage-nav">';
  h+='<div class="sn-cap">阶段导航</div>';
  stages.forEach(function(s,i){
    h+='<button type="button" class="sn-item'+(i===curProjStage?' on':'')+' '+s.status+'" '+
       'onclick="projGoStage('+i+')">'+
       '<i class="snd"></i><span class="snn">'+esc(s.name)+'</span>'+
       '<span class="sns">'+STAGE_STATUS[s.status]+'</span></button>';
  });
  h+='<div class="sn-tip">点击阶段名称，切换该阶段的表单内容</div>';
  h+='</div>';
  h+='</div>';
  return h;
}
function projGoStage(i){
  curProjStage=i;
  var p=findProj(curProjId);
  if(p)renderProjTabBody(p);
}
/* 单阶段表单内容 */
function stageFormHTML(st,p){
  var gates=PROJ_GATE_DATA[p.id]||[];
  if(st.name==='评审'){
    return '<table class="tbl"><tbody>'+
      '<tr><th style="width:180px;text-align:left">需求及创新评审计划完成时间</th><td>'+stageValue(st.reviewPlan)+'</td>'+
      '<th style="width:180px;text-align:left">需求及创新评审实际完成时间</th><td>'+stageValue(st.reviewActual)+'</td></tr>'+
      '<tr><th style="text-align:left">评审是否通过</th><td colspan="3">'+yesNoTag(st.reviewPassed)+'</td></tr>'+
      '</tbody></table>';
  }
  if(st.name==='预研'){
    return '<table class="tbl"><tbody>'+
      '<tr><th style="width:140px;text-align:left">开始时间</th><td>'+stageValue(st.start)+'</td>'+
      '<th style="width:140px;text-align:left">完成时间</th><td>'+stageValue(st.end)+'</td></tr>'+
      '<tr><th style="text-align:left">阶段状态</th><td colspan="3">'+stStatusTag(st.status)+'</td></tr>'+
      '</tbody></table>';
  }
  if(st.name==='小试'){
    return '<table class="tbl"><tbody>'+
      '<tr><th style="width:180px;text-align:left">稳定性考察是否完成</th><td>'+gateDoneTag(gates[5])+'</td>'+
      '<th style="width:180px;text-align:left">压力测试是否完成</th><td>'+gateDoneTag(gates[6])+'</td></tr>'+
      '<tr><th style="text-align:left">小试总结计划完成时间</th><td>'+stageValue(gates[7]&&gates[7].value)+'</td>'+
      '<th style="text-align:left">小试总结实际完成时间</th><td>'+stageValue(st.status==='done'?st.end:'')+'</td></tr>'+
      '<tr><th style="text-align:left">小试总结完成附件</th><td colspan="3">'+stageFilesHTML(st.summaryFiles)+'</td></tr>'+
      '</tbody></table>';
  }
  if(st.name==='中试'){
    return '<table class="tbl"><tbody>'+
      '<tr><th style="width:190px;text-align:left">中试申请是否完成</th><td>'+gateDoneTag(gates[8])+'</td>'+
      '<th style="width:190px;text-align:left">第一批合格计划完成时间</th><td>'+stageValue(gates[9]&&gates[9].value)+'</td></tr>'+
      '<tr><th style="text-align:left">第一批合格实际完成时间</th><td>'+stageValue(st.status==='done'?st.end:'')+'</td>'+
      '<th style="text-align:left">中试产品应用评价报告</th><td>'+stageFilesHTML(st.evaluationFiles)+'</td></tr>'+
      '</tbody></table>';
  }
  if(st.name==='推广'){
    /* ③ 推广阶段专属表单：目标客户 / 渠道 / 推进阶段（原产品推广计划内容要素）
       + 8 个字段明细（对齐真实系统：5 项为「是/否」＋ 技术及成本评审附件 ＋ 试推广计划/实际完成时间） */
    var pm=(typeof PROMOS!=='undefined'?PROMOS.filter(function(x){return x.product===p.product;})[0]:null)||{};
    var h='<table class="tbl"><tbody>'+
      '<tr><th style="width:140px;text-align:left">目标客户</th><td>'+esc(st.target||pm.customer||'—')+'</td>'+
      '<th style="width:140px;text-align:left">推广渠道</th><td>'+esc(st.channel||pm.channel||'—')+'</td></tr>'+
      '<tr><th style="text-align:left">推进阶段</th><td>'+((st.promoStage||pm.stage)?'<span class="tag tag-blue">'+esc(st.promoStage||pm.stage)+'</span>':'<span class="muted">—</span>')+'</td>'+
      '<th style="text-align:left">阶段状态</th><td>'+stStatusTag(st.status)+'</td></tr>'+
      '</tbody></table>';
    h+='<div style="margin-top:16px"><div class="muted" style="font-size:12.5px;margin-bottom:8px">推广阶段字段（8 项）</div>'+
       '<table class="tbl tbl-sm"><thead><tr><th style="width:260px">字段名称</th><th>取值</th></tr></thead><tbody>';
    (typeof PROMO_FIELDS!=='undefined'?PROMO_FIELDS:[]).forEach(function(f){
      var val;
      if(f.type==='file')val=stageFilesHTML(st.promoFiles);
      else if(f.type==='yn')val=promoYnTag(promoGateVal(st,f.gate));
      else val=promoDateVal(promoGateVal(st,f.gate));
      h+='<tr><td>'+esc(f.t)+'</td><td>'+val+'</td></tr>';
    });
    h+='</tbody></table></div>';
    h+='<div style="margin-top:16px"><div class="muted" style="font-size:12.5px;margin-bottom:5px">阶段目标</div>'+
       '<div style="font-size:13.5px;line-height:1.8">'+esc(st.goal)+'</div></div>'+
       '<div style="margin-top:14px"><div class="muted" style="font-size:12.5px;margin-bottom:5px">阶段成果</div>'+
       '<div style="font-size:13.5px;line-height:1.8">'+esc(st.result)+'</div></div>';
    return h;
  }
  var h='<table class="tbl"><tbody>'+
    '<tr><th style="width:120px;text-align:left">所属项目</th><td>'+esc(p.id)+' · '+esc(p.name)+'</td>'+
    '<th style="width:120px;text-align:left">阶段名称</th><td><b>'+esc(st.name)+'</b></td></tr>'+
    '<tr><th style="text-align:left">开始时间</th><td>'+esc(st.start)+'</td>'+
    '<th style="text-align:left">完成时间</th><td>'+(st.end?esc(st.end):'<span class="muted">未完成</span>')+'</td></tr>'+
    '<tr><th style="text-align:left">阶段状态</th><td>'+stStatusTag(st.status)+'</td>'+
    '<th style="text-align:left">评审结果</th><td>'+stReviewTag(st.review)+'</td></tr>'+
    '<tr><th style="text-align:left">评审人</th><td>'+(st.reviewer==='—'?'<span class="muted">—</span>':esc(st.reviewer))+'</td>'+
    '<th style="text-align:left">评审日期</th><td>'+(st.reviewDate==='—'?'<span class="muted">—</span>':esc(st.reviewDate))+'</td></tr>'+
    '</tbody></table>';
  h+='<div style="margin-top:16px"><div class="muted" style="font-size:12.5px;margin-bottom:5px">阶段目标</div>'+
     '<div style="font-size:13.5px;line-height:1.8">'+esc(st.goal)+'</div></div>';
  h+='<div style="margin-top:14px"><div class="muted" style="font-size:12.5px;margin-bottom:5px">阶段成果</div>'+
     '<div style="font-size:13.5px;line-height:1.8">'+esc(st.result)+'</div></div>';
  /* 附件 */
  h+='<div style="margin-top:16px"><div class="muted" style="font-size:12.5px;margin-bottom:8px">阶段附件</div>';
  if(!st.files.length){
    h+='<div class="muted" style="font-size:13px">该阶段暂无附件</div>';
  }else{
    h+='<table class="tbl tbl-sm"><thead><tr><th>文件名</th>'+
       '<th style="width:80px">类型</th><th style="width:100px">大小</th>'+
       '<th style="width:120px">操作</th></tr></thead><tbody>';
    st.files.forEach(function(f){
      h+='<tr><td>📎 '+esc(f.n)+'</td><td>'+esc(f.t)+'</td><td class="num">'+esc(f.s)+'</td>'+
         '<td class="op"><button class="btn btn-link" onclick="toast(\'预览 '+esc(f.n)+'（演示）\',\'info\')">预览</button>'+
         '<button class="btn btn-link" onclick="toast(\'已下载 '+esc(f.n)+'\',\'ok\')">下载</button></td></tr>';
    });
    h+='</tbody></table>';
  }
  h+='</div>';
  return h;
}

function stageValue(value){
  return value&&value!=='—'?esc(value):'<span class="muted">—</span>';
}
function yesNoTag(value){
  var cls=value==='是'?'tag-green':(value==='否'?'tag-red':'tag-orange');
  return '<span class="tag '+cls+'">'+esc(value||'待完成')+'</span>';
}
function gateDoneTag(cell){
  return yesNoTag(cell&&cell.value==='是'?'是':'否');
}
function stageFilesHTML(files){
  if(!files||!files.length)return '<span class="muted">暂无附件</span>';
  return files.map(function(f){
    return '<button class="btn btn-sm" onclick="toast(\'预览 '+esc(f.n)+'\',\'info\')">📎 '+esc(f.n)+'</button>';
  }).join(' ');
}
function stStatusTag(s){
  var cls=s==='done'?'tag-green':(s==='doing'?'tag-blue':'tag-grey');
  return '<span class="tag '+cls+'">'+STAGE_STATUS[s]+'</span>';
}
function stReviewTag(r){
  if(r==='—')return '<span class="muted">—</span>';
  var cls=r==='通过'?'tag-green':(r==='进行中'?'tag-orange':(r==='待评审'?'tag-blue':'tag-grey'));
  return '<span class="tag '+cls+'">'+esc(r)+'</span>';
}

/* ---------- Tab 2：变更记录 ---------- */
function tabProjChange(p){
  var rows=PROJ_CHANGES[p.id]||[];
  var h='<div class="card"><div class="card-hd"><h3>变更记录</h3>'+
        '<span class="sub">项目关键字段的历次变更，保留修改前后值与变更原因</span></div><div class="card-b">';
  if(!rows.length){
    h+='<div class="empty"><span class="ei">📝</span>该项目暂无变更记录</div>';
  }else{
    h+='<div class="tl">';
    rows.forEach(function(c){
      h+='<div class="tl-item on">'+
         '<div class="tt"><b>'+esc(c.field)+'</b> '+
         '<span class="tag tag-grey">'+esc(c.who)+' · '+esc(c.time)+'</span></div>'+
         '<div class="td">'+esc(c.reason)+'</div>'+
         '<div class="td" style="margin-top:6px">'+
         '<span class="chg-old">'+esc(c.from)+'</span>'+
         '<span class="chg-arrow">→</span>'+
         '<span class="chg-new">'+esc(c.to)+'</span></div>'+
         '</div>';
    });
    h+='</div>';
  }
  return h+'</div></div>';
}

/* ---------- Tab 3：审核历史 ---------- */
function tabProjAudit(p){
  var rows=PROJ_AUDITS[p.id]||[];
  var h='<div class="card"><div class="card-hd"><h3>审核历史</h3>'+
        '<span class="sub">立项与各阶段评审的审核记录</span></div><div class="card-b tight">';
  if(!rows.length){
    h+='<div class="empty"><span class="ei">✅</span>该项目暂无审核记录</div>';
  }else{
    h+='<div class="tbl-wrap"><table class="tbl"><thead><tr>'+
       '<th style="width:150px">审核时间</th><th style="width:150px">审核节点</th>'+
       '<th style="width:100px">审核人</th><th style="width:110px">角色</th>'+
       '<th style="width:90px">结果</th><th>审核意见</th></tr></thead><tbody>';
    rows.forEach(function(a){
      h+='<tr><td class="mono">'+esc(a.time)+'</td><td><b>'+esc(a.node)+'</b></td>'+
         '<td>'+esc(a.who)+'</td><td class="muted">'+esc(a.role)+'</td>'+
         '<td><span class="tag '+(AUDIT_TAG[a.result]||'tag-grey')+'">'+esc(a.result)+'</span></td>'+
         '<td>'+esc(a.cmt)+'</td></tr>';
    });
    h+='</tbody></table></div>';
  }
  return h+'</div></div>';
}

/* ---------- Tab 4：实验记录（多对多） ---------- */
function tabProjExp(p){
  var exps=expOfProject(p.id);
  var h='<div class="card"><div class="card-b">';
  h+='<div class="flex" style="align-items:center;margin-bottom:10px">'+
     '<b style="font-size:14px">关联实验（多对多）</b>'+
     '<span class="muted" style="font-size:12.5px">一个实验可同时挂在多个项目下</span>'+
     '<div class="spacer"></div>'+
     '<button class="btn btn-sm btn-primary" onclick="projAttachExp(\''+p.id+'\')">＋ 挂载已有实验</button></div>';
  if(!exps.length){
    h+='<div class="empty"><span class="ei">🧪</span>该项目尚未关联实验<br><br>'+
       '<button class="btn btn-primary" onclick="projNewExp(\''+p.id+'\')">新建实验</button></div>';
  }else{
    h+='<table class="tbl"><thead><tr><th style="width:140px">实验编号</th><th>实验名称</th>'+
       '<th style="width:120px">类型</th><th style="width:100px">状态</th>'+
       '<th style="width:90px">负责人</th><th style="width:110px">截止</th>'+
       '<th style="width:150px">其他关联项目</th><th style="width:1%">操作</th></tr></thead><tbody>';
    exps.forEach(function(e){
      var others=e.projectIds.filter(function(x){return x!==p.id;});
      h+='<tr><td class="mono"><a onclick="showPage(\'exp:detail\',{id:\''+e.id+'\'})">'+esc(e.id)+'</a></td>'+
         '<td>'+esc(e.name)+'</td>'+
         '<td>'+esc(e.type.replace('/部分因子设计',''))+'</td>'+
         '<td><span class="tag '+(STATUS_TAG[e.status]||'tag-grey')+'">'+esc(e.status)+'</span></td>'+
         '<td>'+esc(e.assignee||'—')+'</td><td>'+esc(e.dueDate||'—')+'</td>'+
         '<td>'+(others.length?'<span class="proj-more">+'+others.length+' 个项目</span>':'<span class="muted">仅本项目</span>')+'</td>'+
         '<td class="op"><button class="btn btn-link" onclick="showPage(\'exp:detail\',{id:\''+e.id+'\'})">详情</button>'+
         '<button class="btn btn-link" onclick="projDetachExp(\''+p.id+'\',\''+e.id+'\')">移除</button></td></tr>';
    });
    h+='</tbody></table>';
  }
  return h+'</div></div>';
}

/* ---------- Tab 5：实验总结（可穿透到关联实验） ---------- */
function projectExpSummaries(pid){
  return expSummaries.filter(function(s){return (s.projectIds||[]).indexOf(pid)>=0;});
}
function tabProjSummary(p){
  var sums=projectExpSummaries(p.id);
  var h='<div class="card"><div class="card-hd"><h3>实验总结</h3>'+
        '<span class="sub">展示该项目在“实验分析与总结”中引用生成的总结报告</span></div><div class="card-b tight">';
  if(!sums.length){
    h+='<div class="empty"><span class="ei">📊</span>该项目暂无被引用生成的实验总结<br><br>'+
       '<span class="muted">请在“实验管理 → 实验分析与总结”中引用该项目实验生成总结</span></div>';
  }else{
    h+='<div class="tbl-wrap"><table class="tbl"><thead><tr>'+
       '<th style="width:210px">实验编号（实验员）</th><th style="width:260px">实验工艺</th>'+
       '<th>实验总结</th><th style="width:90px">创建人</th><th style="width:140px">创建时间</th>'+
       '<th style="width:70px">操作</th></tr></thead><tbody>';
    sums.forEach(function(s){
      var expLines=(s.expIds||[]).map(function(eid){
        var e=findExp(eid);
        return '<div class="sum-exp-line"><a onclick="showPage(\'exp:detail\',{id:\''+eid+'\'})">'+esc(eid)+'</a>'+
          '<span class="muted">（'+esc(e?(e.owner||'—'):'—')+'）</span></div>';
      }).join('');
      h+='<tr style="cursor:pointer" onclick="showPage(\'exp:sum-detail\',{id:\''+s.id+'\'})">'+
        '<td onclick="event.stopPropagation()">'+expLines+'</td><td>'+esc(s.craft||'—')+'</td>'+
        '<td><div class="sum-purpose">'+esc(s.purpose||'—')+'</div><div class="muted sum-brief">'+esc(s.summaryOverall||'—')+'</div></td>'+
        '<td>'+esc(s.creator||'—')+'</td><td>'+esc(s.createTime||'—')+'</td>'+
        '<td class="op"><button class="btn-link" onclick="event.stopPropagation();showPage(\'exp:sum-detail\',{id:\''+s.id+'\'})">详情</button></td></tr>';
    });
    h+='</tbody></table></div>';
  }
  return h+'</div></div>';
}

/* ---------- Tab 6：文档 ---------- */
function tabProjDoc(p){
  var docs=PROJ_DOCS[p.id]||[];
  var h='<div class="card"><div class="card-hd"><h3>项目文档</h3>'+
        '<span class="sub">立项、评审、技术与合规文档</span></div><div class="card-b tight">';
  if(!docs.length){
    h+='<div class="empty"><span class="ei">📂</span>该项目暂无文档</div>';
  }else{
    h+='<div class="tbl-wrap"><table class="tbl"><thead><tr>'+
       '<th>文档名称</th><th style="width:110px">类型</th><th style="width:80px">版本</th>'+
       '<th style="width:100px">所有者</th><th style="width:110px">更新时间</th>'+
       '<th style="width:90px">状态</th></tr></thead><tbody>';
    docs.forEach(function(d){
      h+='<tr><td>📄 '+esc(d.n)+'</td><td class="muted">'+esc(d.t)+'</td>'+
         '<td class="mono">'+esc(d.v)+'</td><td>'+esc(d.owner)+'</td>'+
         '<td>'+esc(d.upd)+'</td>'+
         '<td><span class="tag '+(DOC_ST[d.st]||'tag-grey')+'">'+esc(d.st)+'</span></td></tr>';
    });
    h+='</tbody></table></div>';
  }
  return h+'</div></div>';
}

/* ---------- 多对多：挂载 / 移除实验 ---------- */
function projAttachExp(pid){
  var p=findProj(pid); if(!p)return;
  var cand=experiments.filter(function(e){return e.projectIds.indexOf(pid)<0;});
  var body=cand.length
    ? '<div class="notice notice-info" style="margin-bottom:12px"><i class="ni">ℹ</i><div>'+
      '勾选后实验将同时挂在 <b>'+esc(p.name)+'</b> 下。一个实验可属于多个项目，各项目看到的是<b>同一份实验数据</b>。</div></div>'+
      '<table class="tbl"><thead><tr><th style="width:36px"></th><th style="width:140px">实验编号</th>'+
      '<th>实验名称</th><th style="width:100px">状态</th><th style="width:150px">当前所属项目</th></tr></thead><tbody>'+
      cand.map(function(e){
        return '<tr><td><input type="checkbox" class="chk" value="'+esc(e.id)+'"></td>'+
          '<td class="mono">'+esc(e.id)+'</td><td>'+esc(e.name)+'</td>'+
          '<td><span class="tag '+(STATUS_TAG[e.status]||'tag-grey')+'">'+esc(e.status)+'</span></td>'+
          '<td class="muted">'+projSummary(e)+'</td></tr>';
      }).join('')+'</tbody></table>'
    : '<div class="empty"><span class="ei">🧪</span>所有实验均已挂到本项目下</div>';
  openModal({title:'挂载已有实验',width:760,body:body,
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
           '<button class="btn btn-primary" onclick="projAttachSave(\''+pid+'\')">确认挂载</button>'});
}
function projAttachSave(pid){
  var boxes=$$('#modal input.chk:checked');
  if(!boxes.length){ toast('请至少勾选一个实验','warn'); return; }
  boxes.forEach(function(b){ addExpProject(b.value,pid); });
  closeModal();
  toast('已挂载 '+boxes.length+' 个实验到本项目','ok');
  curProjTab='exp'; renderProjDetail(findProj(pid));
}
function projDetachExp(pid,eid){
  var e=findExp(eid); if(!e)return;
  confirmBox('移除关联实验',
    '确认将实验 <b>'+esc(e.name)+'</b>（'+esc(eid)+'）从本项目中移除？<br>'+
    '<span class="muted">仅解除关联关系，实验本身及其数据不受影响，仍可从实验列表访问。</span>',
    function(){
      removeExpProject(eid,pid);
      toast('已解除关联','ok');
      curProjTab='exp'; renderProjDetail(findProj(pid));
    },{okText:'确认移除',danger:true});
}
function projNewExp(pid){
  toast('已在项目 '+pid+' 下新建实验（跳转到 DOE 向导）','ok');
  setTimeout(function(){ showPage('exp:wizard',{mode:'new',projectId:pid}); },260);
}

/* ---------- 应用项目管理（P4） ---------- */
regPage('proj:app',{
  title:'应用项目管理',crumb:['项目管理','<b>应用项目管理</b>'],
  render:function(){
    $('pageHost').innerHTML='<div id="lpHost"></div>';
    renderListPage({
      title:'应用项目管理',
      sub:'面向客户现场落地的应用验证项目，承接研发项目的成果，记录打样、试产与量产导入结果。',
      cols:[
        {k:'id',t:'项目编号',w:'130px',fmt:function(r){return '<span class="mono">'+esc(r.id)+'</span>';}},
        {k:'name',t:'应用项目名称'},
        {k:'customer',t:'客户',w:'200px'},
        {k:'scene',t:'应用场景',w:'180px'},
        {k:'stage',t:'阶段',w:'100px',fmt:function(r){return '<span class="tag '+(APP_STAGE[r.stage]||'tag-grey')+'">'+esc(r.stage)+'</span>';}},
        {k:'owner',t:'负责人',w:'90px'},
        {k:'due',t:'计划完成',w:'110px'}
      ],
      rows:APP_PROJECTS,kwKeys:['id','name','customer','scene'],
      filters:[{k:'stage',t:'阶段',all:'全部',opts:[['打样','打样'],['小批试产','小批试产'],['量产验证','量产验证'],['已交付','已交付']]}],
      pageSize:10,
      headActs:'<button class="btn btn-primary" onclick="toast(\'新建应用项目表单（演示环境为只读原型）\',\'info\')">＋ 新建应用项目</button>',
      acts:function(r){
        return '<button class="btn btn-link" onclick="showPage(\'proj:app-detail\',{id:\''+r.id+'\'})">查看详情</button>';
      },
      onRowClick:function(r){ showPage('proj:app-detail',{id:r.id}); }
    });
  }
});
var curAppId='';
regPage('proj:app-detail',{
  title:'应用项目详情',
  crumb:function(){
    var a=APP_PROJECTS.filter(function(x){return x.id===curAppId;})[0];
    return ['项目管理','<a onclick="showPage(\'proj:app\')">应用项目管理</a>',a?esc(a.id):''];
  },
  render:function(params){
    curAppId=params.id||APP_PROJECTS[0].id;
    var a=APP_PROJECTS.filter(function(x){return x.id===curAppId;})[0];
    if(!a){ $('pageHost').innerHTML=placeholder('🚧','应用项目不存在','未找到 '+esc(curAppId)); return; }
    var p=findProj(a.prj);
    var h='<div class="page-hd"><div class="t">'+
      '<h1>'+esc(a.name)+'</h1>'+
      '<div class="page-sub"><span class="mono">'+esc(a.id)+'</span> · '+esc(a.customer)+
      ' · 负责人 '+esc(a.owner)+'</div></div>'+
      '<div class="page-acts"><button class="btn" onclick="showPage(\'proj:app\')">返回列表</button></div></div>';

    h+='<div class="card-grid g4" style="margin-bottom:16px">';
    [['当前阶段',a.stage,''],['应用场景',a.scene,''],['开始日期',a.start,''],['计划完成',a.due,'']]
      .forEach(function(k){
        h+='<div class="stat-box"><div class="sd"><b style="font-size:15px">'+esc(k[1])+'</b><span>'+esc(k[0])+'</span></div></div>';
      });
    h+='</div>';

    h+='<div class="card" style="margin-bottom:16px"><div class="card-hd"><h3>基础信息</h3></div><div class="card-b">'+
      '<table class="tbl"><tbody>'+
      '<tr><th style="width:110px;text-align:left">客户</th><td>'+esc(a.customer)+'</td>'+
      '<th style="width:110px;text-align:left">负责人</th><td>'+esc(a.owner)+'</td></tr>'+
      '<tr><th style="text-align:left">应用场景</th><td>'+esc(a.scene)+'</td>'+
      '<th style="text-align:left">项目成员</th><td>'+esc(a.members.join('、'))+'</td></tr>'+
      '<tr><th style="text-align:left">周期</th><td>'+esc(a.start)+' → '+esc(a.due)+'</td>'+
      '<th style="text-align:left">来源研发项目</th><td>'+
        (p?'<a onclick="showPage(\'proj:detail\',{id:\''+p.id+'\'})">'+esc(p.name)+'</a>':'<span class="muted">—</span>')+'</td></tr>'+
      '</tbody></table></div></div>';

    h+='<div class="card"><div class="card-hd"><h3>应用验证结果</h3></div><div class="card-b">'+
      '<div class="notice notice-ok"><i class="ni">✓</i><div><b>验证结论</b>'+esc(a.result)+'</div></div>'+
      '<table class="tbl"><thead><tr><th>验证项</th><th style="width:130px">结果</th>'+
      '<th style="width:90px">判定</th><th style="width:130px">验证人</th></tr></thead><tbody>'+
      [['客户盲测 / 主观评价','达标','通过',a.owner],
       ['第三方检测报告','已出具','通过','陈工'],
       ['法规符合性（ZDHC / REACH）','已确认','通过','陈工'],
       ['量产工艺稳定性','观察中','进行中',a.owner]]
      .map(function(r){return '<tr><td>'+esc(r[0])+'</td><td>'+esc(r[1])+'</td>'+
        '<td><span class="tag '+(r[2]==='通过'?'tag-green':'tag-orange')+'">'+esc(r[2])+'</span></td>'+
        '<td>'+esc(r[3])+'</td></tr>';}).join('')+
      '</tbody></table></div></div>';

    $('pageHost').innerHTML=h;
  }
});
