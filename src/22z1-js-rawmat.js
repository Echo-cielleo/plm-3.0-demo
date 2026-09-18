/* ==================================================================
   [22z1] 基础数据 · 原料打通
   ————————————————————————————————————————————————
   目标：让「物料编码 MAT-xxxxx」成为跨模块主键
     · 物料 ↔ 供应商（双向可跳）
     · 物料 ↔ 批次档案（投料表的裸批次号可点可溯）
     · 物料 ↔ 实验配方 / 投料表 / 对比总结（正向引用）
     · 物料 ↔ 组分 CAS ↔ 实测数据（合规视角）

   约束：本分片在 22-js-router 之后、23-js-sds 之前加载。
        regPage 可用；DB_CFG 尚未定义 —— 一切对 DB_CFG 的访问
        只能在 matLinkAll()（由 28-js-boot 调用）及渲染期进行。
   ================================================================== */

/* ------------------------------------------------------------------
   1. 补录物料：投料表在用、但主数据里缺失的 12 种
   ------------------------------------------------------------------ */
var MAT_EXTRA=[
 {code:'MAT-00212',name:'加脂剂 F-30',type:'原料',form:'纯物质（单物料）',spec:'工业级',owner:'李工',status:'正常',created:'2026-01-20 10:12',
  remark:'加脂剂用量对比实验主料',recipe:[{cas:'68002-77-7',name:'加脂剂 F-30',conc:'100.00',secret:false}]},
 {code:'MAT-00307',name:'乳化剂 E-12',type:'助剂',form:'纯物质（单物料）',spec:'工业级',owner:'王工',status:'正常',created:'2026-01-20 10:28',
  remark:'',recipe:[{cas:'9005-65-6',name:'乳化剂 E-12',conc:'100.00',secret:false}]},
 {code:'MAT-00414',name:'甲酸',type:'原料',form:'混合物（混合料）',spec:'85%',owner:'赵工',status:'正常',created:'2026-02-08 09:15',
  remark:'pH 调节用',recipe:[{cas:'64-18-6',name:'甲酸',conc:'85.00',secret:false},{cas:'7732-18-5',name:'水',conc:'15.00',secret:false}]},
 {code:'MAT-00415',name:'戊二醛',type:'原料',form:'混合物（混合料）',spec:'50% 水溶液',owner:'赵工',status:'正常',created:'2026-02-08 09:31',
  remark:'鞣制交联剂',recipe:[{cas:'111-30-8',name:'戊二醛',conc:'50.00',range:'45–55%',secret:false},{cas:'7732-18-5',name:'水',conc:'50.00',range:'45–55%',secret:false}]},
 {code:'MAT-00522',name:'防腐剂 BIT',type:'助剂',form:'纯物质（单物料）',spec:'≥98%',owner:'王工',status:'正常',created:'2026-02-26 14:02',
  remark:'罐内防腐',recipe:[{cas:'2634-33-5',name:'1,2-苯并异噻唑啉-3-酮',conc:'100.00',secret:false}]},
 {code:'MAT-00632',name:'丙烯酸乳液',type:'原料',form:'混合物（混合料）',spec:'48% 固含',owner:'李工',status:'正常',created:'2026-03-14 11:05',
  remark:'光亮剂 GL-9 主成膜物',recipe:[{cas:'9003-01-4',name:'丙烯酸树脂',conc:'48.00',secret:false},{cas:'7732-18-5',name:'水',conc:'52.00',secret:false}]},
 {code:'MAT-00633',name:'蜡乳液',type:'原料',form:'混合物（混合料）',spec:'40% 固含',owner:'李工',status:'正常',created:'2026-03-14 11:22',
  remark:'',recipe:[{cas:'8002-74-2',name:'石蜡',conc:'40.00',secret:false},{cas:'7732-18-5',name:'水',conc:'60.00',secret:false}]},
 {code:'MAT-00634',name:'消泡剂 DF-12',type:'助剂',form:'混合物（混合料）',spec:'有机硅型',owner:'李工',status:'正常',created:'2026-03-25 15:40',
  remark:'',recipe:[{cas:'63148-62-9',name:'聚二甲基硅氧烷',conc:'20.00',secret:false},{cas:'7732-18-5',name:'水',conc:'80.00',secret:false}]},
 {code:'MAT-00635',name:'氨水',type:'原料',form:'混合物（混合料）',spec:'25%',owner:'赵工',status:'正常',created:'2026-04-02 08:47',
  remark:'供应商评级 C，到货需复检',recipe:[{cas:'1336-21-6',name:'氨',conc:'25.00',range:'20–30%',secret:false},{cas:'7732-18-5',name:'水',conc:'75.00',range:'70–80%',secret:false}]},
 {code:'MAT-00636',name:'聚二甲基硅氧烷',type:'原料',form:'纯物质（单物料）',spec:'1000 cSt',owner:'李工',status:'正常',created:'2026-04-02 09:03',
  remark:'手感剂 HF-5 主料',recipe:[{cas:'63148-62-9',name:'聚二甲基硅氧烷',conc:'100.00',secret:false}]},
 {code:'MAT-00637',name:'乳化剂 span-80',type:'助剂',form:'纯物质（单物料）',spec:'工业级',owner:'李工',status:'正常',created:'2026-04-02 09:18',
  remark:'',recipe:[{cas:'1338-43-8',name:'失水山梨醇单油酸酯',conc:'100.00',secret:false}]},
 {code:'MAT-00638',name:'渗透促进剂 PA-1',type:'助剂',form:'混合物（混合料）',spec:'—',owner:'王工',status:'审核中',created:'2026-05-08 16:30',
  remark:'新品，配方组成待供应商确认',recipe:[]}
];

/* ------------------------------------------------------------------
   2. 投料名 → 物料编码（投料表写的是口语名，主数据写的是档案名）
   ------------------------------------------------------------------ */
var MAT_ALIAS={
 '国产 WPU-320 树脂':'MAT-00127','进口 WPU-320 树脂':'MAT-00127','WPU-320 树脂':'MAT-00127',
 '去离子水':'MAT-00901','水':'MAT-00901',
 '乙二醇单丁醚':'MAT-00412','乙醇':'MAT-00413','工业乙醇':'MAT-00413',
 '有机硅手感剂 HF-5':'MAT-00631','手感剂 HF-5':'MAT-00631',
 '加脂剂 F-30':'MAT-00212','乳化剂 E-12':'MAT-00307','甲酸':'MAT-00414','戊二醛':'MAT-00415',
 '防腐剂 BIT':'MAT-00522','丙烯酸乳液':'MAT-00632','蜡乳液':'MAT-00633','消泡剂':'MAT-00634',
 '氨水':'MAT-00635','聚二甲基硅氧烷':'MAT-00636','乳化剂 span-80':'MAT-00637',
 '渗透促进剂':'MAT-00638','交联剂 XL-3':'MAT-00811',
 '丙烯酸':'MAT-00520','聚氨酯预聚体':'MAT-00128'
};

/* ------------------------------------------------------------------
   3. 物料 ↔ 供应商（一个物料可有多家，main 为主供）
   ------------------------------------------------------------------ */
var MAT_SUP={
 'MAT-00127':[{sup:'SUP-2026-001',no:'WH-WPU320-D',main:true,lead:'15 天',price:'18.6 元/kg',note:'国产料，主供'}],
 'MAT-00128':[{sup:'SUP-2026-001',no:'WH-PPU-90',main:true,lead:'20 天',price:'21.0 元/kg',note:'聚合物品级，需确认游离 NCO'}],
 'MAT-00210':[{sup:'SUP-2026-003',no:'RT-L27',main:true,lead:'10 天',price:'15.2 元/kg',note:''}],
 'MAT-00211':[{sup:'SUP-2026-005',no:'LH-BASE-7',main:true,lead:'12 天',price:'9.8 元/kg',note:''}],
 'MAT-00212':[{sup:'SUP-2026-003',no:'RT-F30',main:true,lead:'10 天',price:'16.4 元/kg',note:''}],
 'MAT-00305':[{sup:'SUP-2026-008',no:'CS-CR33',main:true,lead:'7 天',price:'12.0 元/kg',note:'含 Cr(III)，需重点关注法规'}],
 'MAT-00306':[{sup:'SUP-2026-008',no:'CS-MK2',main:true,lead:'7 天',price:'18.5 元/kg',note:''}],
 'MAT-00307':[{sup:'SUP-2026-006',no:'TC-E12',main:true,lead:'8 天',price:'22.0 元/kg',note:''}],
 'MAT-00412':[{sup:'SUP-2026-004',no:'SM-BCS',main:true,lead:'5 天',price:'13.6 元/kg',note:''}],
 'MAT-00413':[{sup:'SUP-2026-004',no:'SM-EtOH',main:true,lead:'5 天',price:'7.2 元/kg',note:''}],
 'MAT-00414':[{sup:'SUP-2026-009',no:'JH-FA85',main:true,lead:'6 天',price:'4.8 元/kg',note:'C 级供应商，到货需复检'}],
 'MAT-00415':[{sup:'SUP-2026-009',no:'JH-GA50',main:true,lead:'6 天',price:'11.5 元/kg',note:'C 级供应商，到货需复检'}],
 'MAT-00520':[{sup:'SUP-2026-002',no:'BASF-AA',main:true,lead:'30 天',price:'14.9 元/kg',note:'保密组分来源'}],
 'MAT-00521':[{sup:'SUP-2025-004',no:'CX-FA37',main:true,lead:'—',price:'—',note:'供应商已停用，物料同步停用'}],
 'MAT-00630':[{sup:'SUP-2026-010',no:'DOW-GL-WAX',main:true,lead:'25 天',price:'31.0 元/kg',note:'蜡乳液外购，成品厂内复配'}],
 'MAT-00631':[{sup:'SUP-2026-010',no:'DOW-HF5',main:true,lead:'25 天',price:'42.0 元/kg',note:''}],
 'MAT-00632':[{sup:'SUP-2026-002',no:'BASF-AC48',main:true,lead:'30 天',price:'17.4 元/kg',note:''}],
 'MAT-00633':[{sup:'SUP-2026-003',no:'RT-WAX40',main:true,lead:'10 天',price:'13.9 元/kg',note:''}],
 'MAT-00634':[{sup:'SUP-2026-010',no:'DOW-DF12',main:true,lead:'25 天',price:'36.0 元/kg',note:''}],
 'MAT-00635':[{sup:'SUP-2026-009',no:'JH-AM25',main:true,lead:'6 天',price:'2.6 元/kg',note:'C 级供应商，到货需复检'}],
 'MAT-00636':[{sup:'SUP-2026-010',no:'DOW-PDMS1K',main:true,lead:'25 天',price:'28.0 元/kg',note:''}],
 'MAT-00637':[{sup:'SUP-2026-006',no:'TC-S80',main:true,lead:'8 天',price:'19.5 元/kg',note:''}],
 'MAT-00638':[{sup:'SUP-2026-006',no:'TC-PA1',main:true,lead:'8 天',price:'24.0 元/kg',note:'新品，样品阶段'}],
 'MAT-00702':[{sup:'SUP-2025-001',no:'HC-P25',main:true,lead:'4 天',price:'18.0 元/只',note:''}],
 'MAT-00703':[{sup:'SUP-2025-001',no:'HC-I200',main:true,lead:'4 天',price:'145.0 元/只',note:''}],
 'MAT-00811':[{sup:'SUP-2026-001',no:'WH-XL3',main:true,lead:'15 天',price:'33.0 元/kg',note:''}],
 'MAT-00812':[{sup:'SUP-2026-002',no:'BASF-AM7',main:true,lead:'30 天',price:'—',note:'物料已停用，配方替换中'}],
 'MAT-00522':[{sup:'SUP-2026-002',no:'BASF-BIT20',main:true,lead:'30 天',price:'68.0 元/kg',note:'接替 AM-7 的主防霉剂'}],
 'MAT-00904':[{sup:'SUP-2026-005',no:'LH-FS20',main:true,lead:'12 天',price:'52.0 元/kg',note:''}]
};

/* ------------------------------------------------------------------
   4. 批次档案（投料表里的裸批次号在这里落地）
   ------------------------------------------------------------------ */
var MAT_BATCH=[
 /* 投料表在用的批次 */
 {no:'WPU-D-2608B',mat:'MAT-00127',sup:'SUP-2026-001',arrive:'2026-08-05',expiry:'2027-08-04',qty:'2000',status:'合格',report:'QC-2026-0805',testDate:'2026-08-07',items:'固含量 / pH / 粘度',note:''},
 {no:'WPU-I-2608A',mat:'MAT-00127',sup:'SUP-2026-001',arrive:'2026-08-02',expiry:'2027-08-01',qty:'800',status:'合格',report:'QC-2026-0802',testDate:'2026-08-04',items:'固含量 / pH / 粘度',note:''},
 {no:'W-260901',mat:'MAT-00901',sup:'',arrive:'2026-09-01',expiry:'2027-03-01',qty:'5000',status:'合格',report:'QC-2026-0901',testDate:'2026-09-03',items:'电导率 / pH',note:''},
 {no:'BCS-2607',mat:'MAT-00412',sup:'SUP-2026-004',arrive:'2026-07-11',expiry:'2027-07-10',qty:'1200',status:'合格',report:'QC-2026-0711',testDate:'2026-07-13',items:'纯度 / 水分',note:''},
 {no:'HF5-2605',mat:'MAT-00631',sup:'SUP-2026-010',arrive:'2026-05-20',expiry:'2027-05-19',qty:'300',status:'合格',report:'QC-2026-0520',testDate:'2026-05-22',items:'固含量 / pH / 粘度',note:''},
 {no:'F30-2607',mat:'MAT-00212',sup:'SUP-2026-003',arrive:'2026-07-06',expiry:'2027-07-05',qty:'1500',status:'合格',report:'QC-2026-0706',testDate:'2026-07-08',items:'固含量 / pH',note:''},
 {no:'E12-2606',mat:'MAT-00307',sup:'SUP-2026-006',arrive:'2026-06-18',expiry:'2027-06-17',qty:'400',status:'合格',report:'QC-2026-0618',testDate:'2026-06-20',items:'有效成分 / pH',note:''},
 {no:'FA-2603',mat:'MAT-00414',sup:'SUP-2026-009',arrive:'2026-03-09',expiry:'2027-03-08',qty:'600',status:'合格',report:'QC-2026-0309-R',testDate:'2026-03-11',items:'纯度 / 色度',note:''},
 {no:'GA-2605',mat:'MAT-00415',sup:'SUP-2026-009',arrive:'2026-05-14',expiry:'2027-05-13',qty:'500',status:'合格',report:'QC-2026-0514-R',testDate:'2026-05-16',items:'纯度 / 色度',note:''},
 {no:'BIT-2602',mat:'MAT-00522',sup:'SUP-2026-002',arrive:'2026-02-24',expiry:'2028-02-23',qty:'100',status:'合格',report:'QC-2026-0224',testDate:'2026-02-26',items:'有效浓度 / pH',note:''},
 {no:'AC-2605',mat:'MAT-00632',sup:'SUP-2026-002',arrive:'2026-05-09',expiry:'2027-05-08',qty:'2000',status:'合格',report:'QC-2026-0509',testDate:'2026-05-11',items:'固含量 / 粘度',note:''},
 {no:'AC-2609',mat:'MAT-00632',sup:'SUP-2026-002',arrive:'2026-09-03',expiry:'2027-09-02',qty:'2000',status:'合格',report:'QC-2026-0903',testDate:'2026-09-05',items:'固含量 / 粘度',note:''},
 {no:'WX-2604',mat:'MAT-00633',sup:'SUP-2026-003',arrive:'2026-04-16',expiry:'2027-04-15',qty:'800',status:'合格',report:'QC-2026-0416',testDate:'2026-04-18',items:'固含量 / pH / 粘度',note:''},
 {no:'WX-2608',mat:'MAT-00633',sup:'SUP-2026-003',arrive:'2026-08-21',expiry:'2027-08-20',qty:'800',status:'合格',report:'QC-2026-0821',testDate:'2026-08-23',items:'固含量 / pH / 粘度',note:''},
 {no:'DF-2603',mat:'MAT-00634',sup:'SUP-2026-010',arrive:'2026-03-19',expiry:'2027-03-18',qty:'200',status:'合格',report:'QC-2026-0319',testDate:'2026-03-21',items:'有效成分 / 粘度',note:''},
 {no:'DF-2607',mat:'MAT-00634',sup:'SUP-2026-010',arrive:'2026-07-23',expiry:'2027-07-22',qty:'200',status:'合格',report:'QC-2026-0723',testDate:'2026-07-25',items:'有效成分 / 粘度',note:''},
 {no:'AM-2602',mat:'MAT-00635',sup:'SUP-2026-009',arrive:'2026-02-27',expiry:'2027-02-26',qty:'1000',status:'合格',report:'QC-2026-0227-R',testDate:'2026-03-01',items:'浓度 / 色度',note:''},
 {no:'AM-2606',mat:'MAT-00635',sup:'SUP-2026-009',arrive:'2026-06-12',expiry:'2027-06-11',qty:'1000',status:'待检',report:'—',testDate:'',items:'待检',note:''},
 {no:'PDMS-2605',mat:'MAT-00636',sup:'SUP-2026-010',arrive:'2026-05-28',expiry:'2027-05-27',qty:'500',status:'合格',report:'QC-2026-0528',testDate:'2026-05-30',items:'有效成分 / 粘度',note:''},
 {no:'PDMS-2606',mat:'MAT-00636',sup:'SUP-2026-010',arrive:'2026-06-25',expiry:'2027-06-24',qty:'500',status:'合格',report:'QC-2026-0625',testDate:'2026-06-27',items:'有效成分 / 粘度',note:''},
 {no:'PDMS-2607',mat:'MAT-00636',sup:'SUP-2026-010',arrive:'2026-07-30',expiry:'2027-07-29',qty:'500',status:'待检',report:'—',testDate:'',items:'待检',note:''},
 {no:'SP-2604',mat:'MAT-00637',sup:'SUP-2026-006',arrive:'2026-04-23',expiry:'2027-04-22',qty:'150',status:'合格',report:'QC-2026-0423',testDate:'2026-04-25',items:'有效成分 / pH',note:''},
 {no:'PA-2601',mat:'MAT-00638',sup:'SUP-2026-006',arrive:'2026-01-28',expiry:'2026-07-28',qty:'50',status:'待检',report:'—',testDate:'',items:'待检',note:''},
 {no:'XL3-2606',mat:'MAT-00811',sup:'SUP-2026-001',arrive:'2026-06-09',expiry:'2027-06-08',qty:'300',status:'合格',report:'QC-2026-0609',testDate:'2026-06-11',items:'NCO 含量 / 粘度',note:''},
 /* 异常批次（不在投料表中，用于演示预警） */
 {no:'WPU-D-2609C',mat:'MAT-00127',sup:'SUP-2026-001',arrive:'2026-09-04',expiry:'2027-09-03',qty:'2000',status:'待检',report:'—',testDate:'',items:'待检',note:''},
 {no:'F30-2611',mat:'MAT-00212',sup:'SUP-2026-003',arrive:'2026-08-30',expiry:'2027-08-29',qty:'1500',status:'不合格',report:'QC-2026-0830-R',testDate:'2026-09-01',items:'固含量 / pH',note:'固含量 44%，低于标准（≥50%），整批退货并要求供应商换货'},
 {no:'AM-2609',mat:'MAT-00635',sup:'SUP-2026-009',arrive:'2026-09-02',expiry:'2027-09-01',qty:'1000',status:'不合格',report:'QC-2026-0902-R',testDate:'2026-09-04',items:'浓度 / 色度',note:'浓度 22%，低于标准（25±1%），降级用于中和工序，主用途改用 AM-2606 批次'}
];

/* ------------------------------------------------------------------
   5. 基础读取
   ------------------------------------------------------------------ */
var MAT_LINKED=false;
function matRows(){
  return (typeof DB_CFG!=='undefined'&&DB_CFG.material)?DB_CFG.material.rows:[];
}
function matByCode(c){
  if(!c)return null;
  return matRows().filter(function(r){return r.code===c;})[0]||null;
}
/* 来源：自产（厂内自制，有精确配方） / 外购（供应商披露组分范围） */
function matOrigin(m){
  if(!m)return '';
  if(m.origin)return m.origin;
  return MAT_SUP[m.code]?'外购':'自制';
}
/* 纯物质 + 单一组分 → 该组分的 CAS 即物料自身 CAS */
function matCas(m){
  if(!m)return '';
  if(m.cas)return m.cas;
  if(m.form&&m.form.indexOf('纯物质')===0&&m.recipe&&m.recipe.length===1)return m.recipe[0].cas;
  return '';
}
/* 名称（投料口语名 / 组分名）→ 物料编码 */
function matCodeOf(name){
  if(!name)return '';
  if(MAT_ALIAS[name])return MAT_ALIAS[name];
  var rows=matRows(),n=String(name).trim();
  for(var i=0;i<rows.length;i++){ if(rows[i].name===n)return rows[i].code; }
  for(var j=0;j<rows.length;j++){
    if(n.indexOf(rows[j].name)>=0||rows[j].name.indexOf(n)>=0)return rows[j].code;
  }
  return '';
}
function supByCode(c){
  if(typeof SUPPLIERS==='undefined')return null;
  return SUPPLIERS.filter(function(s){return s.code===c;})[0]||null;
}
function matSupRows(code){ return MAT_SUP[code]||[]; }
function matMainSup(code){
  var a=matSupRows(code);
  for(var i=0;i<a.length;i++)if(a[i].main)return a[i];
  return a[0]||null;
}
function matBatches(code){ return MAT_BATCH.filter(function(b){return b.mat===code;}); }
function matBatch(no){ return MAT_BATCH.filter(function(b){return b.no===no;})[0]||null; }
/* 该物料涉及的 CAS（混合物取配方各组分，纯物质取自身） */
function matCasList(m){
  if(!m)return [];
  var own=matCas(m);
  if(own)return [own];
  return (m.recipe||[]).map(function(x){return x.cas;}).filter(Boolean);
}
/* 实测数据：按物料涉及的 CAS 反查 */
function matMeas(code){
  if(typeof DB_CFG==='undefined'||!DB_CFG.measure)return [];
  var cs=matCasList(matByCode(code)),out=[];
  DB_CFG.measure.rows.forEach(function(r){
    if(cs.indexOf(r.cas)>=0)out.push(r);
  });
  return out;
}

/* ------------------------------------------------------------------
   6. 溯源：这个物料被谁引用了
   ------------------------------------------------------------------ */
function matTrace(code){
  var m=matByCode(code),out={recipes:[],runs:0,sums:[],usedBy:[]};
  if(!m||!code)return out;
  var cas=matCasList(m);
  /* ① 实验配方（组分级：CAS 命中 / 名称命中） */
  if(typeof EXP_RECIPE!=='undefined'){
    Object.keys(EXP_RECIPE).forEach(function(k){
      var rec=EXP_RECIPE[k];
      var hit=(rec.rows||[]).filter(function(r){
        return (r.mat===code)||(r.cas&&cas.indexOf(r.cas)>=0);
      });
      if(hit.length)out.recipes.push({id:k,code:rec.code,ver:rec.ver,product:rec.product,hits:hit,total:(rec.rows||[]).length});
    });
  }
  /* ② 由配方反推实验运行记录条数 */
  var runSet={};
  out.recipes.forEach(function(rc){
    var runs=(typeof runsOfScheme==='function')?runsOfScheme(rc.id):[];
    runs.forEach(function(r){ runSet[r.id]=1; });
  });
  out.runs=Object.keys(runSet).length;
  /* ③ 对比总结（投料表实际用到） */
  if(typeof expSummaries!=='undefined'){
    expSummaries.forEach(function(s){
      var hit=0;
      (s.items||[]).forEach(function(it){
        (it.materials||[]).forEach(function(x){ if(x.mat===code)hit++; });
      });
      if(hit)out.sums.push({id:s.id,purpose:s.purpose,hits:hit});
    });
  }
  /* ④ 下游：哪些物料的配方里含本物料的 CAS */
  matRows().forEach(function(r){
    if(r.code===code)return;
    var hit=(r.recipe||[]).filter(function(x){return cas.indexOf(x.cas)>=0;});
    if(hit.length)out.usedBy.push({code:r.code,name:r.name,hits:hit});
  });
  return out;
}

/* ------------------------------------------------------------------
   7. 打通：把物料编码写进配方行与投料表
   ------------------------------------------------------------------ */
function matLinkAll(){
  if(MAT_LINKED)return;
  var rows=matRows();
  /* 7.1 补录缺失物料 */
  MAT_EXTRA.forEach(function(r){
    if(!matByCode(r.code)){
      r._id='mx'+r.code;
      rows.push(r);
    }
  });
  /* 7.2 反查每个纯物质的 CAS，建立 cas → 物料 索引 */
  var byCas={};
  rows.forEach(function(r){
    var c=matCas(r);
    if(c&&!byCas[c])byCas[c]=r.code;
  });
  /* 7.3 实验配方行补 mat */
  if(typeof EXP_RECIPE!=='undefined'){
    Object.keys(EXP_RECIPE).forEach(function(k){
      (EXP_RECIPE[k].rows||[]).forEach(function(r){
        if(!r.mat)r.mat=byCas[r.cas]||MAT_ALIAS[r.name]||'';
      });
    });
  }
  /* 7.4 投料表补 mat */
  if(typeof expSummaries!=='undefined'){
    expSummaries.forEach(function(s){
      (s.items||[]).forEach(function(it){
        (it.materials||[]).forEach(function(x){ if(!x.mat)x.mat=matCodeOf(x.name); });
      });
    });
  }
  /* 7.5 物料行补主供应商名（供列表展示与关键词搜索） */
  rows.forEach(function(r){
    var ms=matMainSup(r.code),sp=ms?supByCode(ms.sup):null;
    r._sup=sp?sp.name:'厂内自制';
    r._supCode=ms?ms.sup:'';
    r._grade=sp?sp.grade:'—';
  });
  MAT_LINKED=true;
}

/* ------------------------------------------------------------------
   8. 渲染辅助
   ------------------------------------------------------------------ */
/* 物料名 → 可点击链接（解析不到就当普通文本） */
function matLink(name,label){
  var code=matCodeOf(name);
  var txt=label||name||'—';
  if(!code)return esc(txt);
  return '<a class="mat-link" href="javascript:void(0)" onclick="matOpen(\''+code+'\')" title="查看物料档案 '+esc(code)+'">'+esc(txt)+'</a>';
}
function matOpen(code){
  if(!code){ toast('该行未匹配到物料档案','warn'); return; }
  showPage('bd:rawmat-detail',{code:code});
}
function matBack(){ showPage('bd:rawmat'); }
/* 供应商页 → 原料信息页并按供应商名过滤 */
function matBySup(supCode){
  var sp=supByCode(supCode);
  showPage('bd:rawmat');
  if(typeof dbSearch==='function'&&sp)dbSearch(sp.name);
}
function matSupCount(supCode){
  var n=0;
  Object.keys(MAT_SUP).forEach(function(k){
    if(MAT_SUP[k].some(function(x){return x.sup===supCode;}))n++;
  });
  return n;
}
/* 组分（CAS）→ 组分基础信息页并定位 */
function compOpen(cas){
  showPage('bd:comp');
  if(typeof dbSearch==='function')dbSearch(cas);
}
function tagOf(v,cls){ return '<span class="tag '+(cls?('tag-'+cls):'')+' tag-dot">'+esc(v)+'</span>'; }
function batchTag(v){
  var c=(v==='合格')?'green':((v==='待检')?'orange':'red');
  return tagOf(v,c);
}
/* 替代料链接：停用物料被替代后，指向接替物料（可跳转） */
function matSubstToLink(m){
  if(!m||!m.substTo)return '<span class="muted">—</span>';
  var tm=matByCode(m.substTo);
  return '<a class="mat-link" href="javascript:void(0)" onclick="matOpen(\''+esc(m.substTo)+'\')" title="查看替代料档案">'+esc(tm?tm.name:m.substTo)+'</a> <span class="muted mono">'+esc(m.substTo)+'</span>';
}

/* ------------------------------------------------------------------
   9. 原料详情页
   ------------------------------------------------------------------ */
regPage('bd:rawmat-detail',{
  title:'原料详情',crumb:['基础数据','原料信息','原料详情'],
  render:function(params){
    var code=(params&&params.code)||'',m=matByCode(code);
    var host=$('pageHost');
    /* 详情页的「编辑」复用物料编辑弹窗，需把列表游标锁定到 material */
    if(typeof DB_CFG!=='undefined'&&DB_CFG.material)dbKey='material';
    if(!m){
      host.innerHTML='<div class="page-hd"><div class="t"><h1>原料详情</h1></div></div>'+
        '<div class="card"><div class="card-b"><div class="muted">未找到物料 <code>'+esc(code||'—')+'</code></div>'+
        '<div style="margin-top:12px"><button class="btn" onclick="matBack()">← 返回原料信息</button></div></div></div>';
      return;
    }
    var ms=matMainSup(m.code),sp=ms?supByCode(ms.sup):null;
    var tr=matTrace(m.code),cas=matCas(m);
    var h='';
    /* --- hero --- */
    h+='<div class="page-hd"><div class="t"><h1>'+esc(m.name)+'</h1>'+
       '<div class="page-sub"><span class="mono">'+esc(m.code)+'</span> · '+esc(m.type)+' · '+esc(m.spec||'—')+'</div></div>'+
       '<div class="acts"><button class="btn" onclick="matBack()">← 返回</button>'+
       '<button class="btn" onclick="matCopyCode(\''+esc(m.code)+'\')">复制编码</button>'+
       '<button class="btn" onclick="dbEdit(\''+esc(m._id||'')+'\')">编辑</button></div></div>';
    /* --- 风险提示 --- */
    var warn=[];
    if(m.status==='停用')warn.push('物料已<b>停用</b>，引用它的配方与实验需重新评估替代料。');
    if(sp&&sp.status!=='合格')warn.push('主供应商「'+esc(sp.name)+'」当前状态为<b>'+esc(sp.status)+'</b>。');
    if(sp&&sp.grade==='C')warn.push('主供应商评级为 <b>C 级</b>，到货需附加复检说明。');
    var badB=matBatches(m.code).filter(function(b){return b.status!=='合格';});
    if(badB.length)warn.push('存在 <b>'+badB.length+'</b> 个非合格批次：'+badB.map(function(b){return esc(b.no);}).join('、')+'。');
    if(warn.length){
      h+='<div class="notice notice-warn"><i class="ni">!</i><div><b>风险提示</b><br>'+warn.join('<br>')+'</div></div>';
    }
    /* --- 1. 基本信息 --- */
    h+='<div class="card"><div class="card-hd"><h3>基本信息</h3><span class="sub">物料主数据</span></div><div class="card-b">'+
       '<dl class="desc-list">'+
       '<dt>物料编码</dt><dd class="mono">'+esc(m.code)+'</dd>'+
       '<dt>物料名称</dt><dd>'+esc(m.name)+'</dd>'+
       '<dt>物料类型</dt><dd>'+esc(m.type)+'</dd>'+
       '<dt>物质形态</dt><dd>'+tagOf(m.form,(m.form||'').indexOf('纯物质')===0?'green':'purple')+'</dd>'+
       '<dt>自身 CAS 号</dt><dd>'+(cas?'<span class="mono">'+esc(cas)+'</span> <a class="mat-link" href="javascript:void(0)" onclick="compOpen(\''+esc(cas)+'\')">查看组分档案</a>':'<span class="muted">—（混合物，组分见下方构成）</span>')+'</dd>'+
       '<dt>规格 / 型号</dt><dd>'+esc(m.spec||'—')+'</dd>'+
       '<dt>责任人</dt><dd>'+esc(m.owner||'—')+'</dd>'+
       '<dt>状态</dt><dd>'+tagOf(m.status,(m.status==='正常')?'green':'grey')+'</dd>'+
       '<dt>替代类型</dt><dd>'+(m.substType?('<span class="tag '+(m.substType==='等值替代'?'green':'orange')+'">'+esc(m.substType)+'</span>'):'<span class="muted">—</span>')+'</dd>'+
       '<dt>替代料</dt><dd>'+matSubstToLink(m)+'</dd>'+
       '<dt>停用时间</dt><dd>'+(m.stopDate?esc(m.stopDate):'<span class="muted">—</span>')+'</dd>'+
       '<dt>主供应商</dt><dd>'+(sp?('<a class="mat-link" href="javascript:void(0)" onclick="showPage(\'bd:supplier\')">'+esc(sp.name)+'</a> <span class="muted">'+esc(sp.code)+'</span>'):'<span class="muted">厂内自制</span>')+'</dd>'+
       '<dt>来源</dt><dd>'+tagOf(matOrigin(m),matOrigin(m)==='自制'?'green':'purple')+'</dd>'+
       '<dt>创建时间</dt><dd>'+esc(m.created||'—')+'</dd>'+
       '<dt>备注</dt><dd>'+esc(m.remark||'—')+'</dd>'+
       '</dl></div></div>';
    /* --- 2. 组分构成 / 配方组成 --- */
    var rec=m.recipe||[],isOut=matOrigin(m)==='外购';
    h+='<div class="card"><div class="card-hd"><h3>'+(isOut?'组分构成（供应商披露）':'配方组成（BOM）')+'</h3><span class="sub">'+rec.length+' 个组分 · '+(isOut?'范围为质量分数，含保密项（非精确配方）':'浓度为质量分数 · 自产精确比例')+'</span></div><div class="card-b">';
    if(!rec.length){
      h+='<div class="muted">该物料尚未维护配方组成。</div>';
    }else{
      h+='<div class="tbl-wrap"><table class="tbl"><thead><tr>'+
         '<th style="width:130px">CAS 号</th><th>物质名称</th><th style="width:120px;text-align:right">'+(isOut?'浓度（披露范围）':'浓度 %')+'</th>'+
         '<th style="width:80px">保密</th><th style="width:220px">统一分类（CLP）</th><th style="width:90px">操作</th></tr></thead><tbody>'+
         rec.map(function(x){
           var uni='—',has=false;
           if(typeof clpParamOf==='function'){ var q=clpParamOf(x.cas); has=!!q.raw; if(has)uni=q.uni||'—'; }
           return '<tr><td class="mono">'+esc(x.cas)+'</td><td>'+esc(x.name)+'</td>'+
                  '<td class="num">'+(isOut?(x.range||('≈'+x.conc+'%')):(esc(x.conc)+'%'))+'</td>'+
                  '<td>'+(x.secret?'<span class="tag purple">保密</span>':'<span class="muted">否</span>')+'</td>'+
                  '<td>'+(has?esc(uni):'<span class="tag orange">参数未维护</span>')+'</td>'+
                  '<td><button class="btn-link" onclick="compOpen(\''+esc(x.cas)+'\')">组分档案</button></td></tr>';
         }).join('')+'</tbody></table></div>';
    }
    if(isOut){
      h+='<div class="muted" style="margin-top:8px;font-size:12.5px">供应商依法披露组分范围（CLP/GHS 第 3 部分）；精确配方属商业机密不予提供，非危成分与受保护商业秘密（CBI）可申请不公开。</div>';
    }
    h+='</div></div>';
    /* --- 3. 供应商与货号 --- */
    var sups=matSupRows(m.code);
    h+='<div class="card"><div class="card-hd"><h3>供应商与货号</h3><span class="sub">'+(sups.length===1?'一物一供 · 唯一供应商':sups.length+' 家在册')+'</span></div><div class="card-b">';
    if(!sups.length){
      h+='<div class="muted">厂内自制物料，无外部供应商。</div>';
    }else{
      h+='<div class="tbl-wrap"><table class="tbl"><thead><tr>'+
         '<th style="width:120px">供应商编码</th><th>供应商名称</th><th style="width:130px">供应商货号</th>'+
         '<th style="width:70px">类型</th><th style="width:130px">供货周期</th><th style="width:110px">参考价</th>'+
         '<th style="width:60px">评级</th><th style="width:70px">状态</th></tr></thead><tbody>'+
         sups.map(function(x){
           var s=supByCode(x.sup)||{};
           return '<tr><td class="mono">'+esc(x.sup)+'</td>'+
                  '<td><a class="mat-link" href="javascript:void(0)" onclick="showPage(\'bd:supplier\')">'+esc(s.name||'—')+'</a>'+
                  (x.main?' <span class="tag blue">主供</span>':'')+'</td>'+
                  '<td class="mono">'+esc(x.no||'—')+'</td>'+
                  '<td>'+esc(s.type||'—')+'</td><td>'+esc(x.lead||'—')+'</td><td>'+esc(x.price||'—')+'</td>'+
                  '<td>'+tagOf(s.grade||'—',(s.grade==='A')?'green':((s.grade==='B')?'blue':'orange'))+'</td>'+
                  '<td>'+tagOf(s.status||'—',(s.status==='合格')?'green':((s.status==='观察')?'orange':'grey'))+'</td></tr>';
         }).join('')+'</tbody></table>'+
         '<div class="muted" style="margin-top:8px;font-size:12.5px">'+
         sups.filter(function(x){return x.note;}).map(function(x){return '· '+esc((supByCode(x.sup)||{}).name||x.sup)+'：'+esc(x.note);}).join('<br>')+
         '</div>';
    }
    h+='</div></div>';
    /* --- 4. 批次测试记录（一批次一次检测，不合格必附备注） --- */
    var bs=matBatches(m.code);
    h+='<div class="card"><div class="card-hd"><h3>批次测试记录</h3><span class="sub">'+bs.length+' 个批次 · 一批次一次检测</span>'+
       '<div class="acts"><button class="btn sm" onclick="matTestAdd(\''+esc(m.code)+'\')">＋ 新增检测结果</button></div></div><div class="card-b">';
    if(!bs.length){
      h+='<div class="muted">暂无批次测试记录。</div>';
    }else{
      h+='<div class="tbl-wrap"><table class="tbl"><thead><tr>'+
         '<th style="width:130px">批次号</th><th>供应商</th><th style="width:92px">到货日期</th>'+
         '<th style="width:92px">有效期至</th><th style="width:76px;text-align:right">到货量 kg</th>'+
         '<th style="width:92px">测试日期</th><th>测试项目</th><th style="width:76px">测试结果</th>'+
         '<th>备注</th><th style="width:118px">检测报告</th></tr></thead><tbody>'+
         bs.map(function(b){
           var s=b.sup?supByCode(b.sup):null;
           return '<tr><td class="mono"><b>'+esc(b.no)+'</b></td>'+
                  '<td>'+(s?esc(s.name):'<span class="muted">厂内自制</span>')+'</td>'+
                  '<td>'+esc(b.arrive)+'</td><td>'+esc(b.expiry)+'</td>'+
                  '<td class="num">'+esc(b.qty)+'</td>'+
                  '<td>'+(b.testDate?esc(b.testDate):'<span class="muted">—</span>')+'</td>'+
                  '<td>'+esc(b.items||'—')+'</td>'+
                  '<td>'+batchTag(b.status)+'</td>'+
                  '<td>'+(b.note?('<span style="color:#b42318;font-size:12.5px">'+esc(b.note)+'</span>'):'<span class="muted">—</span>')+'</td>'+
                  '<td class="mono">'+esc(b.report)+'</td></tr>';
         }).join('')+'</tbody></table></div>';
    }
    h+='</div></div>';
    /* --- 5. 实测数据来源 --- */
    var meas=matMeas(m.code);
    h+='<div class="card"><div class="card-hd"><h3>实测数据来源</h3><span class="sub">按配方组分 CAS 反查 · '+meas.length+' 条</span></div><div class="card-b">';
    if(!meas.length){
      h+='<div class="muted">组分库暂无该物料相关实测数据。</div>';
    }else{
      h+='<div class="tbl-wrap"><table class="tbl"><thead><tr>'+
         '<th style="width:130px">数据编号</th><th style="width:120px">CAS</th><th>检测项目</th>'+
         '<th style="width:110px;text-align:right">数值</th><th style="width:80px">单位</th>'+
         '<th style="width:100px">来源</th><th style="width:140px">报告编号</th><th style="width:100px">日期</th></tr></thead><tbody>'+
         meas.map(function(r){
           return '<tr><td class="mono">'+esc(r.no)+'</td><td class="mono">'+esc(r.cas)+'</td>'+
                  '<td>'+esc(r.item)+'</td><td class="num">'+esc(r.value)+'</td><td class="muted">'+esc(r.unit)+'</td>'+
                  '<td>'+tagOf(r.source,(r.source==='实测报告')?'green':'orange')+'</td>'+
                  '<td class="mono">'+esc(r.report)+'</td><td>'+esc(r.date)+'</td></tr>';
         }).join('')+'</tbody></table></div>';
    }
    h+='</div></div>';
    /* --- 6. 溯源与影响范围 --- */
    h+='<div class="card"><div class="card-hd"><h3>溯源与影响范围</h3>'+
       '<span class="sub">物料变更时，以下对象需同步评估</span></div><div class="card-b">'+
       '<div class="kpi-row">'+
       '<div class="kpi"><span>引用配方</span><b>'+tr.recipes.length+'</b><small>套实验配方</small></div>'+
       '<div class="kpi"><span>实验运行记录</span><b>'+tr.runs+'</b><small>条</small></div>'+
       '<div class="kpi"><span>对比总结报告</span><b>'+tr.sums.length+'</b><small>份</small></div>'+
       '<div class="kpi"><span>下游物料引用</span><b>'+tr.usedBy.length+'</b><small>个物料含其组分</small></div>'+
       '</div>';
    /* 6.1 配方 */
    h+='<div class="mt-sub">① 实验配方</div>';
    h+=tr.recipes.length?('<div class="tbl-wrap"><table class="tbl tbl-sm"><thead><tr>'+
       '<th style="width:150px">方案 / 实验</th><th style="width:130px">配方编号</th><th style="width:70px">版本</th>'+
       '<th>产品</th><th style="width:110px">命中组分</th><th style="width:80px">操作</th></tr></thead><tbody>'+
       tr.recipes.map(function(rc){
         return '<tr><td class="mono">'+esc(rc.id)+'</td><td class="mono">'+esc(rc.code)+'</td>'+
                '<td>'+esc(rc.ver)+'</td><td>'+esc(rc.product)+'</td>'+
                '<td>'+rc.hits.length+' / '+rc.total+'</td>'+
                '<td><button class="btn-link" onclick="showPage(\'exp:doe\')">查看</button></td></tr>';
       }).join('')+'</tbody></table></div>')
       :'<div class="muted">暂无实验配方引用该物料。</div>';
    /* 6.2 对比总结 */
    h+='<div class="mt-sub">② 对比总结报告（实际投料）</div>';
    h+=tr.sums.length?('<div class="tbl-wrap"><table class="tbl tbl-sm"><thead><tr>'+
       '<th style="width:150px">报告编号</th><th>实验目的</th><th style="width:90px">投料次数</th>'+
       '<th style="width:80px">操作</th></tr></thead><tbody>'+
       tr.sums.map(function(x){
         return '<tr><td class="mono">'+esc(x.id)+'</td><td>'+esc(x.purpose)+'</td>'+
                '<td>'+x.hits+'</td>'+
                '<td><button class="btn-link" onclick="showPage(\'exp:sum-detail\',{id:\''+esc(x.id)+'\'})">查看</button></td></tr>';
       }).join('')+'</tbody></table></div>')
       :'<div class="muted">暂无对比总结投料记录。</div>';
    /* 6.3 下游物料 */
    h+='<div class="mt-sub">③ 下游物料引用（含本物料组分的其他物料）</div>';
    h+=tr.usedBy.length?('<div class="tbl-wrap"><table class="tbl tbl-sm"><thead><tr>'+
       '<th style="width:130px">物料编码</th><th>物料名称</th><th style="width:180px">命中组分</th>'+
       '<th style="width:80px">操作</th></tr></thead><tbody>'+
       tr.usedBy.map(function(x){
         return '<tr><td class="mono">'+esc(x.code)+'</td><td>'+esc(x.name)+'</td>'+
                '<td class="muted">'+esc(x.hits.map(function(y){return y.name+' '+y.conc+'%';}).join('、'))+'</td>'+
                '<td><button class="btn-link" onclick="matOpen(\''+esc(x.code)+'\')">详情</button></td></tr>';
       }).join('')+'</tbody></table></div>')
       :'<div class="muted">没有其他物料的配方包含本物料的组分。</div>';
    h+='</div></div>';
    host.innerHTML=h;
  }
});

function matCopyCode(code){
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(code);
  }catch(e){}
  toast('已复制物料编码 '+code,'ok');
}
