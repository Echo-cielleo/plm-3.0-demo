/* ==================================================================
   [27z8] 设备维护台账（2026-09-15）
   · 设备扩展字段：类型（实验仪器 / 分析仪器）、所属部门（研发部 / 质管部）
     —— 按设备所在位置推断，映射表见 EQ_TYPE_DEPT，零侵入补进 EQUIPMENTS
   · 三张新表：保养要求 EQ_PLANS / 保养记录 EQ_LOGS / 校准记录 EQ_CALS
   · 「保养维护」页改为 5 个 Tab：
       维护台账（默认，按到期日升序）→ 保养要求 → 保养记录 → 校准记录 → 维保工单（原 10 条原样保留）
   · 首页行动区联动：eqMaintTodos() —— 到期日 - 今天 ≤ 提前提醒天数即进清单，超期置顶标红
   · 分片名须 < 28-js-boot.js（首页在 boot 期就会渲染，需先备好数据）
   ================================================================== */

/* ---------- 1. 设备类型 / 所属部门（按所在位置推断） ---------- */
var EQ_TYPES=['实验仪器','分析仪器'];
var EQ_DEPTS=['研发部','质管部'];
/* 检测中心的仪器 → 分析仪器 / 质管部；合成实验室与老化室的设备 → 实验仪器 / 研发部 */
var EQ_TYPE_DEPT={
  'EQ-2026-001':['分析仪器','质管部'],   /* 电子万能材料试验机 · 检测中心 A101 */
  'EQ-2026-002':['分析仪器','质管部'],   /* GC-MS · 检测中心 A103 */
  'EQ-2026-003':['分析仪器','质管部'],   /* FTIR · 检测中心 A103 */
  'EQ-2026-004':['实验仪器','研发部'],   /* QUV 紫外老化箱 · 老化室 B201 */
  'EQ-2026-005':['实验仪器','研发部'],   /* 恒温恒湿箱 · 老化室 B202 */
  'EQ-2026-006':['分析仪器','质管部'],   /* 马丁代尔耐磨仪 · 检测中心 A105 */
  'EQ-2026-007':['分析仪器','质管部'],   /* 柔软度测定仪 · 检测中心 A105 */
  'EQ-2026-008':['实验仪器','研发部'],   /* 旋转粘度计 · 合成实验室 C102 */
  'EQ-2026-009':['分析仪器','研发部'],   /* 激光粒度仪 · 合成实验室 C104（自测自研，归研发部） */
  'EQ-2026-010':['实验仪器','研发部'],   /* 高温老化试验箱 · 老化室 B203 */
  'EQ-2026-011':['分析仪器','质管部'],   /* 分析天平 · 检测中心 A102 */
  'EQ-2026-012':['实验仪器','研发部']    /* 台式 pH 计 · 合成实验室 C102 */
};
(function(){
  (typeof EQUIPMENTS!=='undefined'?EQUIPMENTS:[]).forEach(function(e){
    var m=EQ_TYPE_DEPT[e.id];
    if(m){ e.type=m[0]; e.dept=m[1]; }
    else { e.type=e.type||'实验仪器'; e.dept=e.dept||'研发部'; }
  });
})();
function eqById(id){ return EQUIPMENTS.filter(function(e){return e.id===id;})[0]||null; }
function eqName(id){ var e=eqById(id); return e?e.name:id; }
function eqType(id){ var e=eqById(id); return e?(e.type||''):''; }

/* ---------- 2. 三张表 ---------- */
/* 保养要求：每台设备一份。cycleN + cycleU = 保养周期；lead = 提前提醒天数
   base  = 该设备无保养记录时的计算基准日（有记录则取最近一次保养日期） */
var EQ_PLANS=[
  {id:'PL-001',eq:'EQ-2026-001',type:'定期保养',cycleN:3,cycleU:'月',lead:14,base:'2026-06-20',
   content:'检查夹具磨损与气动压力；丝杠清洁并补润滑脂；校验力值零点',owner:'李工',dept:'质管部'},
  {id:'PL-002',eq:'EQ-2026-002',type:'专项保养',cycleN:6,cycleU:'月',lead:30,base:'2026-04-10',
   content:'更换进样隔垫与衬管；清洗离子源；机械泵油位检查与更换',owner:'陈工',dept:'质管部'},
  {id:'PL-003',eq:'EQ-2026-003',type:'日常点检',cycleN:7,cycleU:'天',lead:3,base:'2026-09-10',
   content:'干燥剂变色检查与更换；光路能量测试；仪器间温湿度记录',owner:'陈工',dept:'质管部'},
  {id:'PL-004',eq:'EQ-2026-004',type:'定期保养',cycleN:1,cycleU:'月',lead:7,base:'2026-08-25',
   content:'灯管累计计时核查；喷淋管路除垢；箱体密封条检查',owner:'李工',dept:'研发部'},
  {id:'PL-005',eq:'EQ-2026-005',type:'定期保养',cycleN:3,cycleU:'月',lead:14,base:'2026-06-05',
   content:'加湿桶除垢与换水；冷凝器清洁；温湿度传感器比对',owner:'李工',dept:'研发部'},
  {id:'PL-006',eq:'EQ-2026-006',type:'定期保养',cycleN:3,cycleU:'月',lead:14,base:'2026-07-10',
   content:'标准磨料布更换；砝码架水平校正；计数齿轮润滑',owner:'李工',dept:'质管部'},
  {id:'PL-007',eq:'EQ-2026-007',type:'日常点检',cycleN:7,cycleU:'天',lead:5,base:'2026-09-12',
   content:'压头无损伤确认；标准样重复测试（偏差 ≤0.2 分）；台面清洁',owner:'王研究员',dept:'质管部'},
  {id:'PL-008',eq:'EQ-2026-008',type:'日常点检',cycleN:14,cycleU:'天',lead:3,base:'2026-09-08',
   content:'转子清洁与干燥；标准油校验（25 ℃）；水平泡居中确认',owner:'王研究员',dept:'研发部'},
  {id:'PL-009',eq:'EQ-2026-009',type:'定期保养',cycleN:6,cycleU:'月',lead:30,base:'2026-05-20',
   content:'样品池清洗；光路对中；循环水过滤芯更换',owner:'王研究员',dept:'研发部'},
  {id:'PL-010',eq:'EQ-2026-010',type:'专项保养',cycleN:6,cycleU:'月',lead:14,base:'2026-04-02',
   content:'加热管阻值测量；风机轴承润滑；超温保护器动作测试',owner:'赵工',dept:'研发部'},
  {id:'PL-011',eq:'EQ-2026-011',type:'日常点检',cycleN:7,cycleU:'天',lead:5,base:'2026-09-11',
   content:'标准砝码自校（10 g / 100 g）；防风罩清洁；水平调节',owner:'陈工',dept:'质管部'},
  {id:'PL-012',eq:'EQ-2026-012',type:'日常点检',cycleN:30,cycleU:'天',lead:7,base:'2026-08-25',
   content:'电极液补充与活化；标准缓冲液（4.01 / 6.86）两点校准',owner:'赵工',dept:'研发部'}
];

/* 保养记录：编号 BY-2026-xxx（新增时自动生成） */
var EQ_LOGS=[
  {id:'BY-2026-018',eq:'EQ-2026-001',date:'2026-06-20',type:'定期保养',content:'夹具磨损检查，气动压力 0.5 MPa 正常；丝杠补脂',exec:'李工',result:'正常',parts:'润滑脂 1 支',file:'',note:''},
  {id:'BY-2026-017',eq:'EQ-2026-002',date:'2026-04-10',type:'专项保养',content:'离子源清洗，机械泵换油',exec:'陈工',result:'正常',parts:'泵油 1 L、隔垫 10 片',file:'GC-MS保养记录.pdf',note:'清洗后调谐通过'},
  {id:'BY-2026-016',eq:'EQ-2026-003',date:'2026-09-10',type:'日常点检',content:'干燥剂更换，能量测试 98%',exec:'陈工',result:'正常',parts:'干燥剂 1 袋',file:'',note:''},
  {id:'BY-2026-015',eq:'EQ-2026-003',date:'2026-09-03',type:'日常点检',content:'干燥剂轻微变色，能量测试 95%',exec:'陈工',result:'正常',parts:'',file:'',note:''},
  {id:'BY-2026-014',eq:'EQ-2026-004',date:'2026-08-25',type:'定期保养',content:'喷淋管路除垢，灯管计时 3200 h',exec:'李工',result:'正常',parts:'除垢剂 500 mL',file:'',note:''},
  {id:'BY-2026-013',eq:'EQ-2026-005',date:'2026-06-05',type:'定期保养',content:'加湿桶除垢，发现加湿桶结垢严重',exec:'李工',result:'异常',fault:'加湿桶加热效率下降，湿度波动 ±5%RH，超出 ±2%RH 要求',toRepair:true,parts:'加湿桶 1 个',file:'恒温恒湿箱异常照片.jpg',note:'已转维修，等待备件到货'},
  {id:'BY-2026-012',eq:'EQ-2026-006',date:'2026-07-10',type:'定期保养',content:'标准磨料布更换，水平校正',exec:'李工',result:'正常',parts:'标准磨料布 2 张',file:'',note:''},
  {id:'BY-2026-011',eq:'EQ-2026-007',date:'2026-09-12',type:'日常点检',content:'标准样重复测试，偏差 0.1 分',exec:'王研究员',result:'正常',parts:'',file:'',note:''},
  {id:'BY-2026-010',eq:'EQ-2026-007',date:'2026-09-05',type:'日常点检',content:'压头检查无损伤，标准样偏差 0.15 分',exec:'王研究员',result:'正常',parts:'',file:'',note:''},
  {id:'BY-2026-009',eq:'EQ-2026-008',date:'2026-09-08',type:'日常点检',content:'标准油校验偏差 0.8%，在 ±1% 内',exec:'王研究员',result:'正常',parts:'',file:'',note:''},
  {id:'BY-2026-008',eq:'EQ-2026-009',date:'2026-05-20',type:'定期保养',content:'样品池清洗，循环水滤芯更换',exec:'王研究员',result:'正常',parts:'滤芯 1 只',file:'',note:''},
  {id:'BY-2026-007',eq:'EQ-2026-010',date:'2026-04-02',type:'专项保养',content:'加热管阻值测量，超温保护器动作正常',exec:'赵工',result:'正常',parts:'',file:'',note:''},
  {id:'BY-2026-006',eq:'EQ-2026-011',date:'2026-09-11',type:'日常点检',content:'10 g / 100 g 标准砝码自校，偏差 ≤0.2 mg',exec:'陈工',result:'正常',parts:'',file:'',note:''},
  {id:'BY-2026-005',eq:'EQ-2026-011',date:'2026-09-04',type:'日常点检',content:'砝码自校正常，防风罩清洁',exec:'陈工',result:'正常',parts:'',file:'',note:''},
  {id:'BY-2026-004',eq:'EQ-2026-012',date:'2026-08-25',type:'日常点检',content:'缓冲液两点校准，斜率 98%',exec:'赵工',result:'正常',parts:'电极填充液 30 mL',file:'',note:''},
  {id:'BY-2026-003',eq:'EQ-2026-001',date:'2026-03-20',type:'定期保养',content:'力值零点校验，夹具气动压力确认',exec:'李工',result:'正常',parts:'',file:'',note:''},
  {id:'BY-2026-002',eq:'EQ-2026-002',date:'2025-10-15',type:'专项保养',content:'年度维护，进样口维护',exec:'陈工',result:'正常',parts:'衬管 2 支',file:'',note:''},
  {id:'BY-2026-001',eq:'EQ-2026-005',date:'2026-03-05',type:'定期保养',content:'冷凝器清洁，传感器比对',exec:'李工',result:'正常',parts:'',file:'',note:''}
];

/* 校准记录：分析检测仪器专用 */
var EQ_CALS=[
  {id:'CAL-2026-007',eq:'EQ-2026-001',date:'2025-11-20',org:'外校',certNo:'JL-2025-11872',validTo:'2026-11-20',result:'合格',file:'万能试验机校准证书.pdf'},
  {id:'CAL-2026-006',eq:'EQ-2026-002',date:'2025-10-15',org:'外校',certNo:'JL-2025-10233',validTo:'2026-10-15',result:'合格',file:'GC-MS校准证书.pdf'},
  {id:'CAL-2026-005',eq:'EQ-2026-003',date:'2025-12-08',org:'外校',certNo:'JL-2025-12450',validTo:'2026-12-08',result:'合格',file:'FTIR校准证书.pdf'},
  {id:'CAL-2026-004',eq:'EQ-2026-006',date:'2025-11-05',org:'内校',certNo:'NX-2025-0462',validTo:'2026-11-05',result:'合格',file:''},
  {id:'CAL-2026-003',eq:'EQ-2026-007',date:'2025-10-28',org:'内校',certNo:'NX-2025-0431',validTo:'2026-10-28',result:'合格',file:''},
  {id:'CAL-2026-002',eq:'EQ-2026-009',date:'2026-02-10',org:'外校',certNo:'JL-2026-01885',validTo:'2027-02-10',result:'合格',file:'粒度仪校准证书.pdf'},
  {id:'CAL-2026-001',eq:'EQ-2026-011',date:'2025-10-10',org:'外校',certNo:'JL-2025-09907',validTo:'2026-10-10',result:'合格',file:'分析天平校准证书.pdf'}
];

/* ---------- 3. 台账计算 ---------- */
var EQ_MAINT_KEY='plm3_eqmaint_v1';

/* 该设备该类型最近一次保养记录 */
function eqLastLog(eq,type){
  var ls=EQ_LOGS.filter(function(l){return l.eq===eq&&(!type||l.type===type);})
                .sort(function(a,b){return a.date<b.date?1:(a.date>b.date?-1:0);});
  return ls[0]||null;
}
/* 周期 → 天数 */
function eqCycleDays(p){
  var n=+p.cycleN||0;
  if(p.cycleU==='周')return n*7;
  if(p.cycleU==='月')return n*30;
  return n;
}
/* 加天数（本地时区，避免 toISOString 偏移） */
function eqAddDays(s,n){
  var a=s.split('-');
  var d=new Date(+a[0],+a[1]-1,+a[2]);
  d.setDate(d.getDate()+n);
  return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
}
/* 台账一行 = 保养要求 + 最近保养情况 + 到期状态 */
function eqLedgerRows(){
  return EQ_PLANS.map(function(p){
    var last=eqLastLog(p.eq,p.type);
    var lastDate=last?last.date:p.base;
    var due=eqAddDays(lastDate,eqCycleDays(p));
    var left=daysTo(due);
    var st=left<0?'逾期':(left<=p.lead?'临期':'正常');
    return {
      plan:p,id:p.id,eq:p.eq,eqName:eqName(p.eq),cat:eqType(p.eq),dept:p.dept,
      type:p.type,cycle:'每 '+p.cycleN+' '+p.cycleU,lead:p.lead,owner:p.owner,
      last:lastDate,exec:last?last.exec:'—',result:last?last.result:'—',
      due:due,left:left,st:st
    };
  }).sort(function(a,b){ return a.due<b.due?-1:(a.due>b.due?1:0); });
}
/* 状态灯：绿正常 / 黄临期 / 红逾期 */
function eqLamp(st){
  var c=st==='逾期'?'#d4380d':(st==='临期'?'#d46b08':'#389e0d');
  var b=st==='逾期'?'#fff1f0':(st==='临期'?'#fff7e6':'#f6ffed');
  return '<span class="tag" style="background:'+b+';color:'+c+';border:1px solid '+c+'33">'+
         '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+c+';margin-right:5px"></span>'+
         esc(st)+'</span>';
}
/* 首页行动区：到期日 - 今天 ≤ 提前提醒天数 → 进清单；超期标红置顶 */
function eqMaintTodos(){
  return eqLedgerRows().filter(function(r){ return r.left<=r.lead; }).map(function(r){
    return {
      t:(r.st==='逾期'?'【已超期】':'')+r.eqName+' '+r.type+'（'+r.cycle+'）',
      source:'本系统任务',from:'设备维护台账',due:r.due,
      kind:r.left<0?('设备保养 · 已超期 '+Math.abs(r.left)+' 天'):('设备保养 · '+r.left+' 天后到期'),
      urgent:r.left<0,act:'去保养',go:'eq:maint'
    };
  });
}

/* ---------- 4. 持久化（新增 / 编辑的记录） ---------- */
function _eqmSave(){
  try{
    localStorage.setItem(EQ_MAINT_KEY,JSON.stringify({plans:EQ_PLANS,logs:EQ_LOGS,cals:EQ_CALS}));
  }catch(e){}
}
/* 一键重置钩子（由 23z1 的 wzReset 调用） */
function _eqmReset(){
  try{ localStorage.removeItem(EQ_MAINT_KEY); }catch(e){}
}
/* 启动恢复：缓存优先 */
(function(){
  try{
    var o=JSON.parse(localStorage.getItem(EQ_MAINT_KEY)||'null');
    if(o&&o.plans&&o.logs&&o.cals){ EQ_PLANS=o.plans; EQ_LOGS=o.logs; EQ_CALS=o.cals; }
  }catch(e){}
})();

/* ---------- 5. 编号生成 ---------- */
function eqNextLogId(){
  var y=new Date().getFullYear();
  var max=0;
  EQ_LOGS.forEach(function(l){
    var m=/^BY-(\d{4})-(\d+)$/.exec(l.id||'');
    if(m&&+m[1]===y)max=Math.max(max,+m[2]);
  });
  return 'BY-'+y+'-'+('000'+(max+1)).slice(-3);
}
function eqNextCalId(){
  var y=new Date().getFullYear(),max=0;
  EQ_CALS.forEach(function(c){
    var m=/^CAL-(\d{4})-(\d+)$/.exec(c.id||'');
    if(m&&+m[1]===y)max=Math.max(max,+m[2]);
  });
  return 'CAL-'+y+'-'+('000'+(max+1)).slice(-3);
}
function eqNextMaintId(){
  var y=new Date().getFullYear(),max=0;
  (typeof EQMAINTS!=='undefined'?EQMAINTS:[]).forEach(function(m0){
    var m=/^MT-(\d{4})-(\d+)$/.exec(m0.id||'');
    if(m&&+m[1]===y)max=Math.max(max,+m[2]);
  });
  return 'MT-'+y+'-'+('000'+(max+1)).slice(-3);
}

/* ---------- 6. 「保养维护」页：5 个 Tab ---------- */
var EQM_TABS=[
  {key:'ledger',label:'维护台账'},
  {key:'plan',label:'保养要求'},
  {key:'log',label:'保养记录'},
  {key:'cal',label:'校准记录'},
  {key:'wo',label:'维保工单'}
];
var eqmTab='ledger';

function eqMaintRender(){
  var host=$('pageHost'); if(!host)return;
  /* 标题由 renderListPage 统一渲染（各 Tab 不同），此处只放 Tab 条与列表容器 */
  host.innerHTML='<div id="eqmTabs"></div><div id="lpHost"></div>';
  $('eqmTabs').appendChild(tabs(EQM_TABS,eqmTab,function(k){ eqmTab=k; eqMaintRender(); }));
  renderListPage(eqmCfg(eqmTab));
}
/* 台账统计（放在维护台账的副标题里） */
function eqLedgerStat(){
  var rows=eqLedgerRows();
  return '<b style="color:#d4380d">'+rows.filter(function(r){return r.st==='逾期';}).length+' 台逾期</b> · '+
         '<b style="color:#d46b08">'+rows.filter(function(r){return r.st==='临期';}).length+' 台临期</b> · '+
         '共 '+rows.length+' 台设备纳入保养计划';
}

function eqmCfg(tab){
  if(tab==='plan'){
    return {
      title:'保养要求',unit:'保养要求',
      sub:'每台设备的保养标准：类型、周期、内容与责任人。<b>下次到期日 = 最近一次保养日期 + 周期</b>，提前提醒天数决定何时进入首页行动区。',
      rows:EQ_PLANS.slice().sort(function(a,b){return a.eq<b.eq?-1:1;}),
      kwKeys:['eq','content','owner'],
      filters:[
        {k:'type',t:'保养类型',opts:[['日常点检','日常点检'],['定期保养','定期保养'],['专项保养','专项保养']]},
        {k:'dept',t:'责任部门',opts:EQ_DEPTS.map(function(d){return [d,d];})}
      ],
      cols:[
        {k:'eq',t:'设备',w:'230px',fmt:function(r){return esc(eqName(r.eq))+'<br><small class="mono muted">'+esc(r.eq)+'</small>';}},
        {k:'cat',t:'类别',w:'100px',fmt:function(r){return esc(eqType(r.eq));}},
        {k:'type',t:'保养类型',w:'100px',fmt:function(r){return gtag(r.type);}},
        {k:'cycle',t:'保养周期',w:'100px',fmt:function(r){return '每 '+r.cycleN+' '+r.cycleU;}},
        {k:'content',t:'保养内容要求',fmt:function(r){return esc(r.content);}},
        {k:'owner',t:'责任人',w:'90px'},
        {k:'dept',t:'责任部门',w:'90px'},
        {k:'lead',t:'提前提醒',w:'90px',num:true,fmt:function(r){return r.lead+' 天';}}
      ],
      acts:function(r){return '<button class="btn btn-link" onclick="eqPlanEdit(\''+r.id+'\')">编辑</button>';},
      headActs:'<button class="btn btn-primary" onclick="eqPlanEdit(\'\')">＋ 新增保养要求</button>'
    };
  }
  if(tab==='log'){
    return {
      title:'保养记录',unit:'保养记录',
      sub:'每次保养的执行留痕。结果为「异常」时须填写异常说明，可勾选<b>转维修</b>自动生成维保工单。',
      rows:EQ_LOGS.slice().sort(function(a,b){return a.date<b.date?1:-1;}),
      kwKeys:['id','eq','content','exec','parts'],
      filters:[
        {k:'type',t:'保养类型',opts:[['日常点检','日常点检'],['定期保养','定期保养'],['专项保养','专项保养']]},
        {k:'result',t:'保养结果',opts:[['正常','正常'],['异常','异常']]}
      ],
      cols:[
        {k:'id',t:'记录编号',w:'120px',fmt:function(r){return mono(r.id);}},
        {k:'eq',t:'设备',w:'200px',fmt:function(r){return esc(eqName(r.eq));}},
        {k:'date',t:'保养日期',w:'110px'},
        {k:'type',t:'保养类型',w:'100px'},
        {k:'content',t:'保养内容',fmt:function(r){return esc(r.content);}},
        {k:'exec',t:'执行人',w:'90px'},
        {k:'result',t:'结果',w:'80px',fmt:function(r){return '<span class="tag '+(r.result==='异常'?'red':'green')+'">'+esc(r.result)+'</span>';}},
        {k:'parts',t:'更换部件/耗材',w:'150px'},
        {k:'file',t:'附件',w:'130px',fmt:function(r){return r.file?('<span class="mono">'+esc(r.file)+'</span>'):'<span class="muted">—</span>';}},
        {k:'toRepair',t:'转维修',w:'80px',fmt:function(r){return r.toRepair?'<span class="tag orange">已转维修</span>':'<span class="muted">—</span>';}}
      ],
      acts:function(r){
        return '<button class="btn btn-link" onclick="eqLogView(\''+r.id+'\')">查看</button>';
      },
      onRowClick:function(r){ eqLogView(r.id); },
      headActs:'<button class="btn btn-primary" onclick="eqLogAdd()">＋ 登记保养记录</button>'
    };
  }
  if(tab==='cal'){
    return {
      title:'校准记录',unit:'校准记录',
      sub:'分析检测仪器的校准档案：内校 / 外校、证书编号与有效期，到期前由保养要求中的「专项保养」提醒。',
      rows:EQ_CALS.slice().sort(function(a,b){return a.validTo<b.validTo?-1:1;}),
      kwKeys:['id','eq','certNo','org'],
      filters:[
        {k:'org',t:'校准机构',opts:[['内校','内校'],['外校','外校']]},
        {k:'result',t:'结果',opts:[['合格','合格'],['不合格','不合格']]}
      ],
      cols:[
        {k:'id',t:'记录编号',w:'120px',fmt:function(r){return mono(r.id);}},
        {k:'eq',t:'设备',w:'200px',fmt:function(r){return esc(eqName(r.eq));}},
        {k:'date',t:'校准日期',w:'110px'},
        {k:'org',t:'校准机构',w:'100px',fmt:function(r){return gtag(r.org);}},
        {k:'certNo',t:'证书编号',w:'140px',fmt:function(r){return mono(r.certNo);}},
        {k:'validTo',t:'有效期至',w:'110px',fmt:function(r){
          var d=daysTo(r.validTo);
          return esc(r.validTo)+(d<0?' <span class="tag red">已过期</span>':(d<=30?' <span class="tag orange">'+d+' 天</span>':''));}},
        {k:'result',t:'结果',w:'80px',fmt:function(r){return '<span class="tag '+(r.result==='合格'?'green':'red')+'">'+esc(r.result)+'</span>';}},
        {k:'file',t:'证书附件',w:'170px',fmt:function(r){return r.file?('<span class="mono">'+esc(r.file)+'</span>'):'<span class="muted">—</span>';}}
      ],
      acts:function(r){return '<button class="btn btn-link" onclick="eqCalView(\''+r.id+'\')">查看</button>';},
      headActs:'<button class="btn btn-primary" onclick="eqCalAdd()">＋ 登记校准记录</button>'
    };
  }
  if(tab==='wo'){
    return {
      title:'维保工单',unit:'维保工单',
      sub:'设备校准、保养与维修工单台账（历史工单，原样保留）；保养记录中「异常 + 转维修」会自动在此生成新工单。',
      rows:EQMAINTS,kwKeys:['id','eq','type'],
      filters:[
        {k:'type',t:'保养类型',opts:[['年度校准','年度校准'],['半年保养','半年保养'],
          ['季度保养','季度保养'],['故障维修','故障维修'],['灯管更换','灯管更换']]},
        {k:'status',t:'状态',opts:[['待执行','待执行'],['执行中','执行中'],['已完成','已完成']]}
      ],
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
      acts:function(r){return '<button class="btn btn-link" onclick="mdOpenMaint(\''+esc(r.id)+'\')">查看</button>';},
      onRowClick:function(r){ mdOpenMaint(r.id); }
    };
  }
  /* 默认：维护台账 */
  var rows=eqLedgerRows();
  return {
    title:'设备维护台账',unit:'设备',
    sub:eqLedgerStat()+'。默认按下次到期日升序，逾期的排在最前；点行或「登记保养」可直接补录。',
    rows:rows,kwKeys:['eqName','exec','cat'],
    filters:[
      {k:'cat',t:'类别',opts:EQ_TYPES.map(function(t){return [t,t];})},
      {k:'st',t:'状态',opts:[['正常','正常'],['临期','临期'],['逾期','逾期']]},
      {k:'dept',t:'所属部门',opts:EQ_DEPTS.map(function(d){return [d,d];})}
    ],
    cols:[
      {k:'eqName',t:'设备名称',w:'220px',fmt:function(r){return '<b>'+esc(r.eqName)+'</b><br><small class="mono muted">'+esc(r.eq)+'</small>';}},
      {k:'cat',t:'类别',w:'100px',fmt:function(r){return gtag(r.cat);}},
      {k:'type',t:'保养类型',w:'100px'},
      {k:'last',t:'最近保养日期',w:'120px'},
      {k:'exec',t:'执行人',w:'90px'},
      {k:'result',t:'结果',w:'80px',fmt:function(r){return '<span class="tag '+(r.result==='异常'?'red':'green')+'">'+esc(r.result)+'</span>';}},
      {k:'due',t:'下次到期日',w:'120px',fmt:function(r){
        return esc(r.due)+'<br><small class="muted">'+(r.left<0?('超期 '+Math.abs(r.left)+' 天'):('还有 '+r.left+' 天'))+'</small>';}},
      {k:'st',t:'状态',w:'100px',fmt:function(r){return eqLamp(r.st);}}
    ],
    acts:function(r){return '<button class="btn btn-link" onclick="eqLogAdd(\''+r.eq+'\')">登记保养</button>';},
    onRowClick:function(r){ eqLogAdd(r.eq); },
    headActs:'<button class="btn btn-primary" onclick="eqLogAdd()">＋ 登记保养记录</button>'
  };
}

regPage('eq:maint',{
  title:'设备维护台账',crumb:['设备资源','<b>保养维护</b>'],
  render:function(){ eqMaintRender(); }
});

/* ---------- 7. 表单：保养记录 ---------- */
function eqEqOptions(sel){
  return EQUIPMENTS.map(function(e){
    return '<option value="'+esc(e.id)+'"'+(sel===e.id?' selected':'')+'>'+esc(e.name)+'（'+esc(e.id)+'）</option>';
  }).join('');
}
/* 结果切换：异常 → 展开异常说明 + 转维修勾选 */
function eqLogResultChg(v){
  var box=$('eqFaultBox');
  if(box)box.style.display=(v==='异常')?'':'none';
  var lb=$('eqFaultLb');
  if(lb)lb.innerHTML='异常说明<span style="color:#b42318">（必填）</span>';
}
function eqFilePick(inputId,showId){
  var el=$(inputId); if(!el||!el.files||!el.files[0])return;
  var s=$(showId); if(s)s.innerHTML='<span class="mono">'+esc(el.files[0].name)+'</span>';
}
function eqLogAdd(eq){
  var plans=EQ_PLANS.filter(function(p){return !eq||p.eq===eq;});
  openModal({
    title:'登记保养记录',
    width:660,
    body:
      '<div class="form-grid">'+
      '<div class="field"><label>记录编号</label><input class="ctrl" id="lg_id" value="'+esc(eqNextLogId())+'" disabled></div>'+
      '<div class="field"><label>设备<span style="color:#b42318">*</span></label><select class="ctrl" id="lg_eq" onchange="eqLogEqChg()">'+eqEqOptions(eq||'')+'</select></div>'+
      '<div class="field"><label>保养日期<span style="color:#b42318">*</span></label><input class="ctrl" type="date" id="lg_date" value="'+todayStr()+'"></div>'+
      '<div class="field"><label>保养类型<span style="color:#b42318">*</span></label><select class="ctrl" id="lg_type">'+
        ['日常点检','定期保养','专项保养'].map(function(t){return '<option>'+t+'</option>';}).join('')+'</select></div>'+
      '<div class="field span2"><label>保养内容<span style="color:#b42318">*</span></label><textarea class="ctrl" id="lg_content" rows="3" placeholder="按保养要求逐项执行的内容与实测值"></textarea></div>'+
      '<div class="field"><label>执行人<span style="color:#b42318">*</span></label><input class="ctrl" id="lg_exec" value="王研究员"></div>'+
      '<div class="field"><label>保养结果<span style="color:#b42318">*</span></label><select class="ctrl" id="lg_result" onchange="eqLogResultChg(this.value)">'+
        '<option>正常</option><option>异常</option></select></div>'+
      '<div class="field span2" id="eqFaultBox" style="display:none">'+
        '<label id="eqFaultLb">异常说明<span style="color:#b42318">（必填）</span></label>'+
        '<textarea class="ctrl" id="lg_fault" rows="2" placeholder="异常现象、影响范围与临时处置"></textarea>'+
        '<label style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer;margin-top:8px">'+
        '<input type="checkbox" class="chk" id="lg_repair"> 转维修（自动生成维保工单）</label>'+
      '</div>'+
      '<div class="field"><label>更换部件 / 耗材</label><input class="ctrl" id="lg_parts" placeholder="如：泵油 1 L、隔垫 10 片"></div>'+
      '<div class="field"><label>附件</label><input class="ctrl" type="file" id="lg_file" onchange="eqFilePick(\'lg_file\',\'lg_fileTxt\')">'+
        '<div id="lg_fileTxt" style="margin-top:6px;font-size:12.5px" class="muted">未选择文件</div></div>'+
      '<div class="field span2"><label>备注</label><input class="ctrl" id="lg_note"></div>'+
      '</div>'+
      '<div class="muted" style="margin-top:10px;font-size:12.5px" id="lg_reqTip"></div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
           '<button class="btn btn-primary" onclick="eqLogSave()">保存</button>',
    onOpen:function(){
      if(eq){ var t=$('lg_reqTip'); if(t)t.innerHTML=eqReqTip(eq); }
      eqLogEqChg();
    }
  });
}
function eqLogEqChg(){
  var eq=$('lg_eq')?$('lg_eq').value:'';
  var p=EQ_PLANS.filter(function(x){return x.eq===eq;})[0];
  var sel=$('lg_type');
  if(p&&sel)sel.value=p.type;
  var t=$('lg_reqTip'); if(t)t.innerHTML=eqReqTip(eq);
}
function eqReqTip(eq){
  var p=EQ_PLANS.filter(function(x){return x.eq===eq;})[0];
  if(!p)return '<span style="color:#d46b08">该设备尚未维护保养要求。</span>';
  return '保养要求：<b>'+esc(p.type)+'</b> · 每 '+p.cycleN+' '+p.cycleU+' · 提前 '+p.lead+' 天提醒 · 责任人 '+esc(p.owner)+'<br>'+esc(p.content);
}
function eqLogSave(){
  var eq=$('lg_eq').value,date=$('lg_date').value,content=$('lg_content').value.trim(),
      exec=$('lg_exec').value.trim(),result=$('lg_result').value,
      fault=$('lg_fault')?$('lg_fault').value.trim():'',
      toRepair=!!($('lg_repair')&&$('lg_repair').checked);
  if(!eq){ toast('请选择设备','warn'); return; }
  if(!date){ toast('请填写保养日期','warn'); return; }
  if(!content){ toast('请填写保养内容','warn'); return; }
  if(!exec){ toast('请填写执行人','warn'); return; }
  if(result==='异常'&&!fault){ toast('结果异常时必须填写异常说明','warn'); return; }
  var f=$('lg_file');
  EQ_LOGS.push({
    id:eqNextLogId(),eq:eq,date:date,type:$('lg_type').value,content:content,exec:exec,
    result:result,fault:fault,toRepair:toRepair,
    parts:$('lg_parts').value.trim(),
    file:(f&&f.files&&f.files[0])?f.files[0].name:'',
    note:$('lg_note').value.trim()
  });
  _eqmSave();
  closeModal();
  if(toRepair){
    var wid=eqNextMaintId();
    EQMAINTS.unshift({id:wid,eq:eq+' '+eqName(eq),type:'故障维修',cycle:'按需',
      last:date,next:daysFromNow(3),owner:exec,status:'待执行'});
    toast('保养记录已保存，已转维修并生成工单 '+wid,'ok');
  }else{
    toast('保养记录已保存','ok');
  }
  eqMaintRender();
}
function eqLogView(id){
  var l=EQ_LOGS.filter(function(x){return x.id===id;})[0]; if(!l)return;
  openModal({
    title:'保养记录 '+l.id,width:620,
    body:'<dl class="desc-list">'+
      '<dt>设备</dt><dd>'+esc(eqName(l.eq))+' <span class="mono muted">'+esc(l.eq)+'</span></dd>'+
      '<dt>保养日期</dt><dd>'+esc(l.date)+'</dd>'+
      '<dt>保养类型</dt><dd>'+esc(l.type)+'</dd>'+
      '<dt>保养内容</dt><dd>'+esc(l.content)+'</dd>'+
      '<dt>执行人</dt><dd>'+esc(l.exec)+'</dd>'+
      '<dt>保养结果</dt><dd><span class="tag '+(l.result==='异常'?'red':'green')+'">'+esc(l.result)+'</span></dd>'+
      (l.result==='异常'?'<dt>异常说明</dt><dd>'+esc(l.fault||'—')+'</dd>'+
        '<dt>转维修</dt><dd>'+(l.toRepair?'<span class="tag orange">已转维修</span>':'<span class="muted">否</span>')+'</dd>':'')+
      '<dt>更换部件 / 耗材</dt><dd>'+esc(l.parts||'—')+'</dd>'+
      '<dt>附件</dt><dd>'+(l.file?('<span class="mono">'+esc(l.file)+'</span>'):'<span class="muted">—</span>')+'</dd>'+
      '<dt>备注</dt><dd>'+esc(l.note||'—')+'</dd>'+
      '</dl>'
  });
}

/* ---------- 8. 表单：校准记录 ---------- */
function eqCalAdd(){
  var ana=EQUIPMENTS.filter(function(e){return (e.type||'')==='分析仪器';});
  openModal({
    title:'登记校准记录',width:620,
    body:'<div class="muted" style="margin-bottom:10px;font-size:12.5px">仅分析检测仪器需要校准档案。</div>'+
      '<div class="form-grid">'+
      '<div class="field"><label>记录编号</label><input class="ctrl" value="'+esc(eqNextCalId())+'" disabled></div>'+
      '<div class="field"><label>设备<span style="color:#b42318">*</span></label><select class="ctrl" id="cl_eq">'+
        ana.map(function(e){return '<option value="'+esc(e.id)+'">'+esc(e.name)+'</option>';}).join('')+'</select></div>'+
      '<div class="field"><label>校准日期<span style="color:#b42318">*</span></label><input class="ctrl" type="date" id="cl_date" value="'+todayStr()+'"></div>'+
      '<div class="field"><label>校准机构<span style="color:#b42318">*</span></label><select class="ctrl" id="cl_org"><option>外校</option><option>内校</option></select></div>'+
      '<div class="field"><label>证书编号<span style="color:#b42318">*</span></label><input class="ctrl" id="cl_cert" placeholder="如 JL-2026-01885"></div>'+
      '<div class="field"><label>有效期至<span style="color:#b42318">*</span></label><input class="ctrl" type="date" id="cl_valid" value="'+daysFromNow(365)+'"></div>'+
      '<div class="field"><label>结果<span style="color:#b42318">*</span></label><select class="ctrl" id="cl_result"><option>合格</option><option>不合格</option></select></div>'+
      '<div class="field"><label>证书附件</label><input class="ctrl" type="file" id="cl_file" onchange="eqFilePick(\'cl_file\',\'cl_fileTxt\')">'+
        '<div id="cl_fileTxt" style="margin-top:6px;font-size:12.5px" class="muted">未选择文件</div></div>'+
      '</div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
           '<button class="btn btn-primary" onclick="eqCalSave()">保存</button>'
  });
}
function eqCalSave(){
  var cert=$('cl_cert').value.trim();
  if(!cert){ toast('请填写证书编号','warn'); return; }
  var f=$('cl_file');
  EQ_CALS.unshift({
    id:eqNextCalId(),eq:$('cl_eq').value,date:$('cl_date').value,org:$('cl_org').value,
    certNo:cert,validTo:$('cl_valid').value,result:$('cl_result').value,
    file:(f&&f.files&&f.files[0])?f.files[0].name:''
  });
  _eqmSave(); closeModal(); toast('校准记录已保存','ok');
  eqmTab='cal'; eqMaintRender();
}
function eqCalView(id){
  var c=EQ_CALS.filter(function(x){return x.id===id;})[0]; if(!c)return;
  openModal({title:'校准记录 '+c.id,width:560,
    body:'<dl class="desc-list">'+
      '<dt>设备</dt><dd>'+esc(eqName(c.eq))+'</dd>'+
      '<dt>校准日期</dt><dd>'+esc(c.date)+'</dd>'+
      '<dt>校准机构</dt><dd>'+esc(c.org)+'</dd>'+
      '<dt>证书编号</dt><dd class="mono">'+esc(c.certNo)+'</dd>'+
      '<dt>有效期至</dt><dd>'+esc(c.validTo)+'</dd>'+
      '<dt>结果</dt><dd><span class="tag '+(c.result==='合格'?'green':'red')+'">'+esc(c.result)+'</span></dd>'+
      '<dt>证书附件</dt><dd>'+(c.file?('<span class="mono">'+esc(c.file)+'</span>'):'<span class="muted">—</span>')+'</dd>'+
      '</dl>'});
}

/* ---------- 9. 表单：保养要求（新增 / 编辑） ---------- */
function eqPlanEdit(id){
  var p=id?EQ_PLANS.filter(function(x){return x.id===id;})[0]:null;
  if(id&&!p)return;
  var v=p||{id:'',eq:EQUIPMENTS[0].id,type:'定期保养',cycleN:1,cycleU:'月',lead:7,content:'',owner:'王研究员',dept:'研发部',base:todayStr()};
  openModal({
    title:(p?'编辑保养要求':'新增保养要求'),width:640,
    body:'<div class="form-grid">'+
      '<div class="field span2"><label>设备<span style="color:#b42318">*</span></label><select class="ctrl" id="pl_eq" onchange="eqPlanEqChg()">'+eqEqOptions(v.eq)+'</select>'+
        '<div class="muted" style="margin-top:6px;font-size:12.5px" id="pl_eqInfo"></div></div>'+
      '<div class="field"><label>保养类型<span style="color:#b42318">*</span></label><select class="ctrl" id="pl_type">'+
        ['日常点检','定期保养','专项保养'].map(function(t){return '<option'+(v.type===t?' selected':'')+'>'+t+'</option>';}).join('')+'</select></div>'+
      '<div class="field"><label>保养周期<span style="color:#b42318">*</span></label>'+
        '<div style="display:flex;gap:8px"><input class="ctrl" type="number" min="1" id="pl_n" value="'+v.cycleN+'" style="width:80px">'+
        '<select class="ctrl" id="pl_u">'+['天','周','月'].map(function(t){return '<option'+(v.cycleU===t?' selected':'')+'>'+t+'</option>';}).join('')+'</select></div>'+
        '<div class="muted" style="margin-top:6px;font-size:12.5px">每 N 天 / 周 / 月</div></div>'+
      '<div class="field"><label>提前提醒（天）<span style="color:#b42318">*</span></label><input class="ctrl" type="number" min="0" id="pl_lead" value="'+v.lead+'"></div>'+
      '<div class="field"><label>责任人<span style="color:#b42318">*</span></label><input class="ctrl" id="pl_owner" value="'+esc(v.owner)+'"></div>'+
      '<div class="field"><label>责任部门</label><select class="ctrl" id="pl_dept">'+
        EQ_DEPTS.map(function(d){return '<option'+(v.dept===d?' selected':'')+'>'+d+'</option>';}).join('')+'</select></div>'+
      '<div class="field span2"><label>保养内容要求<span style="color:#b42318">*</span></label>'+
        '<textarea class="ctrl" id="pl_content" rows="3">'+esc(v.content)+'</textarea></div>'+
      '<div class="field span2"><label>基准日期（无保养记录时的起算日）</label><input class="ctrl" type="date" id="pl_base" value="'+esc(v.base)+'"></div>'+
      '</div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
           '<button class="btn btn-primary" onclick="eqPlanSave(\''+esc(id)+'\')">保存</button>',
    onOpen:function(){ eqPlanEqChg(); }
  });
}
function eqPlanEqChg(){
  var eq=$('pl_eq')?$('pl_eq').value:'',e=eqById(eq),t=$('pl_eqInfo');
  if(t&&e)t.innerHTML='类别：<b>'+esc(e.type||'—')+'</b> · 所属部门：<b>'+esc(e.dept||'—')+'</b> · 位置：'+esc(e.loc||'—');
  if(e&&$('pl_dept'))$('pl_dept').value=e.dept||'研发部';
}
function eqPlanSave(id){
  var o={
    id:id||('PL-'+('00'+(EQ_PLANS.length+1)).slice(-3)),
    eq:$('pl_eq').value,type:$('pl_type').value,
    cycleN:+$('pl_n').value||1,cycleU:$('pl_u').value,
    lead:+$('pl_lead').value||0,
    content:$('pl_content').value.trim(),
    owner:$('pl_owner').value.trim(),dept:$('pl_dept').value,
    base:$('pl_base').value||todayStr()
  };
  if(!o.content){ toast('请填写保养内容要求','warn'); return; }
  if(!o.owner){ toast('请填写责任人','warn'); return; }
  if(id){
    EQ_PLANS=EQ_PLANS.map(function(x){return x.id===id?o:x;});
  }else{
    if(EQ_PLANS.some(function(x){return x.eq===o.eq;})){
      toast('该设备已有保养要求，请直接编辑','warn'); return;
    }
    EQ_PLANS.push(o);
  }
  _eqmSave(); closeModal(); toast('保养要求已保存','ok');
  eqmTab='plan'; eqMaintRender();
}
