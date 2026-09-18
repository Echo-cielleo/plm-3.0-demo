/* ==================================================================
   [27z4] 详情页补全 · 11 个轻量列表页
   ————————————————————————————————————————————————
   背景：27-js-pages-b.js 的 listCfg() 默认把「查看」兜底成
        detailSoon()（toast 占位）。本分片为这些页补真实详情页。

   覆盖（页 id → 列表页）：
     bd:supplier-detail  → bd:supplier   供应商详情
     qc:submit-detail    → qc:submit     送检单详情
     qc:report-detail    → qc:report     检测报告详情
     eq:list-detail      → eq:list       设备详情
     eq:cap-detail       → eq:cap        设备能力详情
     eq:maint-detail     → eq:maint      维保工单详情
     eq:spare-detail     → eq:spare      零备件详情
     doc:detail          → doc:public / doc:mine   文档详情
     ip:km-detail        → ip:km         知识条目详情
     ip:right-detail     → ip:right      知识产权详情
     bd:ghs-detail       → bd:ghs        物质受限属性详情

   约定：
   · 分片名必须 < 28-js-boot.js（boot 在加载期读 location.hash 定位页面，
     编号大于 28 会导致「详情页刷新掉回首页」）。27z4 排在 27z3 之后、
     28-js-boot 之前。
   · 通用骨架函数统一 md 前缀，避免与既有分片的全局符号重名
     （历史教训：physVal 覆盖 SDS 的 physVal，全量回归才暴露）；
     改完请跑 `python3 check_names.py`。
   · 详情页只读：不做编辑、不写 localStorage、不进 wzReset 链。
   ================================================================== */

var MD_TODAY='2026-09-11';

/* ---------- 通用：日期加减（用于版本历史 / 年费节点的推算） ---------- */
function mdDateShift(dateStr,days,months){
  var s=String(dateStr||'').slice(0,10);
  var m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return '—';
  var y=+m[1],mo=+m[2],d=+m[3];
  if(months){ mo+=months; while(mo>12){mo-=12;y++;} }
  var dt=new Date(y,mo-1,d);
  dt.setDate(dt.getDate()+(days||0));
  var yy=dt.getFullYear(),mm=dt.getMonth()+1,dd=dt.getDate();
  return yy+'-'+(mm<10?'0':'')+mm+'-'+(dd<10?'0':'')+dd;
}
/* 距今天数（负数=已过期） */
function mdDaysTo(dateStr){
  var s=String(dateStr||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
  function ts(x){ var p=x.split('-'); return Date.UTC(+p[0],+p[1]-1,+p[2]); }
  return Math.round((ts(s)-ts(MD_TODAY))/86400000);
}

/* ---------- 通用：详情页骨架 ---------- */
function mdCard(title,sub,body){
  return '<div class="card"><div class="card-hd"><h3>'+title+'</h3>'+
         (sub?'<span class="sub">'+sub+'</span>':'')+'</div><div class="card-b">'+body+'</div></div>';
}
function mdKv(rows){
  var h='<dl class="desc-list">';
  rows.forEach(function(r){
    var v=r[1];
    if(v===undefined||v===null||v==='')v='<span class="muted">—</span>';
    h+='<dt>'+r[0]+'</dt><dd>'+v+'</dd>';
  });
  return h+'</dl>';
}
function mdTd(c,v){
  var cls=[];
  if(c&&c.num)cls.push('num');
  if(c&&c.ctr)cls.push('ctr');
  var s=(v===undefined||v===null||v==='')?'<span class="muted">—</span>':v;
  return '<td'+(cls.length?' class="'+cls.join(' ')+'"':'')+'>'+s+'</td>';
}
function mdTbl(cols,rows,emptyTxt){
  if(!rows||!rows.length){
    return '<div class="empty" style="padding:22px 0"><span class="ei">🗂</span>'+(emptyTxt||'暂无数据')+'</div>';
  }
  var h='<div class="tbl-wrap"><table class="tbl"><thead><tr>';
  cols.forEach(function(c){ h+='<th'+(c.w?' style="width:'+c.w+'"':'')+'>'+esc(c.t)+'</th>'; });
  h+='</tr></thead><tbody>';
  rows.forEach(function(r){
    h+='<tr>';
    r.forEach(function(v,i){ h+=mdTd(cols[i],v); });
    h+='</tr>';
  });
  return h+'</tbody></table></div>';
}
function mdNotice(lv,icon,title,lines){
  if(!lines||!lines.length)return '';
  return '<div class="notice notice-'+lv+'"><i class="ni">'+icon+'</i><div><b>'+esc(title)+'</b><br>'+
         lines.join('<br>')+'</div></div>';
}
/* 记录内链（跨模块跳转） */
function mdLink(text,js){
  return '<a class="mat-link" href="javascript:void(0)" onclick="'+js+'">'+text+'</a>';
}

/* ---------- 通用：渲染 + 注册 ---------- */
function mdRender(def,params){
  var key=(params&&params.key)||'';
  var host=$('pageHost');
  var r=def.get(key);
  if(!r){
    host.innerHTML='<div class="page-hd"><div class="t"><h1>'+esc(def.title)+'</h1></div></div>'+
      '<div class="card"><div class="card-b"><div class="muted">未找到记录 <code>'+esc(key||'—')+'</code></div>'+
      '<div style="margin-top:12px"><button class="btn" onclick="showPage(\''+esc(def.listId)+'\')">← '+esc(def.back)+'</button></div></div></div>';
    return;
  }
  var hero=def.hero(r);
  var h='<div class="page-hd"><div class="t"><h1>'+hero.h1+'</h1><div class="page-sub">'+hero.sub+'</div></div>'+
        '<div class="page-acts"><button class="btn" onclick="showPage(\''+esc(def.listId)+'\')">← '+esc(def.back)+'</button>'+
        (def.acts?def.acts(r):'')+'</div></div>';
  h+=mdNotice(def.warnLv||'warn',def.warnIcon||'!',def.warnTitle||'风险提示',def.warns?def.warns(r):[]);
  (def.sections(r)||[]).forEach(function(s){
    h+=mdCard(s.t,s.sub||'',s.type==='tbl'?mdTbl(s.cols,s.rows,s.empty):mdKv(s.rows));
  });
  host.innerHTML=h;
}
var MD_DEFS=[];
function mdReg(def){
  MD_DEFS.push(def);
  regPage(def.pageId,{
    title:def.title,crumb:def.crumb,
    render:function(params){ mdRender(def,params); }
  });
  HL_MAP[def.pageId]=def.listId;
}

/* ==================================================================
   1. 供应商 bd:supplier → 供应商详情
   ================================================================== */
/* 资质证照：多数供应商共用 ISO 9001；重点供应商额外挂行业资质 */
var MD_SUP_QUAL={
  'SUP-2026-001':[['ISO 9001:2015 质量管理体系','2023-06-18','2026-06-17','有效'],
                  ['ISO 14001:2015 环境管理体系','2023-11-02','2026-11-01','有效'],
                  ['IATF 16949 汽车行业质量体系','2024-02-20','2027-02-19','有效']],
  'SUP-2026-002':[['ISO 9001:2015 质量管理体系','2025-01-10','2028-01-09','有效'],
                  ['EU REACH 唯一代表授权','2024-03-15','2027-03-14','有效']],
  'SUP-2026-010':[['ISO 9001:2015 质量管理体系','2024-09-05','2027-09-04','有效'],
                  ['ZDHC MRSL V3.1 符合性声明','2026-02-11','2027-02-10','有效']],
  'SUP-2026-008':[['ISO 9001:2015 质量管理体系','2022-08-16','2025-08-15','待更新'],
                  ['危险化学品安全生产许可证','2023-05-20','2026-05-19','待更新']],
  'SUP-2025-004':[['ISO 9001:2015 质量管理体系','2021-07-01','2024-06-30','已过期']]
};
function mdSupQuals(code){
  if(MD_SUP_QUAL[code])return MD_SUP_QUAL[code];
  return [['ISO 9001:2015 质量管理体系','2024-04-12','2027-04-11','有效']];
}
/* 供货物料（MAT_SUP 反查） */
function mdSupMats(code){
  var out=[];
  Object.keys(MAT_SUP).forEach(function(mc){
    (MAT_SUP[mc]||[]).forEach(function(x){
      if(x.sup!==code)return;
      var m=(typeof matByCode==='function')?matByCode(mc):null;
      out.push({code:mc,name:m?m.name:'—',status:m?m.status:'—',no:x.no,lead:x.lead,price:x.price,note:x.note});
    });
  });
  return out;
}
function mdSupBatches(code){
  return MAT_BATCH.filter(function(b){return b.sup===code;});
}
mdReg({
  pageId:'bd:supplier-detail',listId:'bd:supplier',back:'返回供应商列表',
  title:'供应商详情',crumb:['基础数据','原料供应商管理','供应商详情'],
  get:function(k){ return (typeof supByCode==='function')?supByCode(k):null; },
  hero:function(s){
    return {h1:s.name,
      sub:mono(s.code)+' · '+esc(s.type)+' · '+esc(s.region)+' · 合作起始 '+esc(s.since)};
  },
  acts:function(s){
    return '<button class="btn" onclick="showPage(\'bd:sup-data\')">供应商原料数据</button>'+
           '<button class="btn" onclick="toast(\'已生成供应商评审单（演示）\',\'ok\')">发起评审</button>';
  },
  warns:function(s){
    var w=[];
    if(s.grade==='C')w.push('评级为 <b>C 级</b>，采购评审需附加到货复检说明。');
    if(s.status==='观察')w.push('当前状态为 <b>观察</b>，新增物料需质量部门会签。');
    if(s.status==='停用')w.push('供应商已 <b>停用</b>，其在册物料需同步评估替代来源。');
    var bad=mdSupBatches(s.code).filter(function(b){return b.status!=='合格';});
    if(bad.length)w.push('存在 <b>'+bad.length+'</b> 个非合格批次：'+bad.map(function(b){return esc(b.no);}).join('、')+'。');
    var qual=mdSupQuals(s.code).filter(function(q){return q[3]!=='有效';});
    if(qual.length)w.push('资质证书 <b>'+qual.length+'</b> 项异常（'+qual.map(function(q){return esc(q[0]);}).join('、')+'），需在下次评审前更新。');
    return w;
  },
  sections:function(s){
    var mats=mdSupMats(s.code),bat=mdSupBatches(s.code);
    return [
      {t:'基本信息',sub:'供应商主数据',rows:[
        ['供应商编码',mono(s.code)],
        ['供应商名称','<b>'+esc(s.name)+'</b>'],
        ['供应商类型',esc(s.type)],
        ['主供品类',esc(s.cat)],
        ['所在地',esc(s.region)],
        ['合作起始',esc(s.since)],
        ['评级','<span class="tag '+(GRADE_TAG[s.grade]||'tag-grey')+'">'+esc(s.grade)+'</span>'],
        ['状态',gtag(s.status)],
        ['在册物料','<b>'+mats.length+'</b> 种'+(mats.length?('（'+mats.slice(0,3).map(function(m){return esc(m.name);}).join('、')+(mats.length>3?' 等':'')+'）'):'')],
        ['累计到货批次','<b>'+bat.length+'</b> 批']
      ]},
      {t:'资质与合规',sub:'证照有效期按到期日排序，非「有效」项在评审时需补充说明',type:'tbl',
       cols:[{t:'证书 / 资质'},{t:'发证日期',w:'110px'},{t:'有效期至',w:'110px'},{t:'状态',w:'90px'}],
       rows:mdSupQuals(s.code).map(function(q){
         var c=q[3]==='有效'?'tag-green':(q[3]==='已过期'?'tag-red':'tag-orange');
         return [esc(q[0]),esc(q[1]),esc(q[2]),'<span class="tag '+c+'">'+esc(q[3])+'</span>'];
       }),
       empty:'该供应商尚未维护资质证照'},
      {t:'供货物料',sub:mats.length+' 种在册（一物一供：同一物料只挂一家主供）',type:'tbl',
       cols:[{t:'物料编码',w:'120px'},{t:'物料名称'},{t:'供方货号',w:'130px'},
             {t:'供货周期',w:'90px'},{t:'参考价',w:'110px'},{t:'物料状态',w:'90px'},{t:'操作',w:'90px'}],
       rows:mats.map(function(m){
         return [mono(m.code),esc(m.name),mono(m.no||'—'),esc(m.lead||'—'),esc(m.price||'—'),
                 gtag(m.status),mdLink('原料详情','matOpen(\''+esc(m.code)+'\')')];
       }),
       empty:'该供应商暂无在册供货物料'},
      {t:'到货批次',sub:'近 12 个月到货与放行记录',type:'tbl',
       cols:[{t:'批次号',w:'120px'},{t:'物料'},{t:'到货日期',w:'105px'},{t:'有效期至',w:'105px'},
             {t:'数量 (kg)',w:'95px',num:true},{t:'批次状态',w:'90px'},{t:'检测报告',w:'140px'}],
       rows:bat.map(function(b){
         var m=(typeof matByCode==='function')?matByCode(b.mat):null;
         return [mono(b.no),(m?esc(m.name):esc(b.mat)),
                 esc(b.arrive),esc(b.expiry),esc(b.qty),
                 gtag(b.status),
                 (b.report&&b.report!=='—'?mono(b.report):'<span class="muted">—</span>')];
       }),
       empty:'暂无到货批次记录'}
    ];
  }
});

/* ==================================================================
   2. 送检记录 / 检测报告（质量·检测管理）
   ================================================================== */
/* 检测项目的判定依据与限值；按关键词命中，未命中走兜底 */
var MD_QC_STD=[
  {k:'APEO',       std:'ZDHC MRSL V3.1',        limit:'≤ 100 mg/kg',        good:'未检出（< 50 mg/kg）', bad:'186 mg/kg'},
  {k:'SVHC',       std:'REACH 候选清单 0.1% 阈值',limit:'≤ 1000 mg/kg',       good:'未检出',              bad:'1 420 mg/kg'},
  {k:'甲醛',       std:'GB/T 19941.1',           limit:'≤ 75 mg/kg',         good:'12 mg/kg',            bad:'96 mg/kg'},
  {k:'游离甲醛',   std:'GB/T 19941.1',           limit:'≤ 20 mg/kg',         good:'6 mg/kg',             bad:'34 mg/kg'},
  {k:'重金属',     std:'GB/T 22930',             limit:'≤ 100 mg/kg',        good:'铅 8 / 镉 2 mg/kg',   bad:'铅 142 mg/kg'},
  {k:'Cr(VI)',     std:'GB/T 22807',             limit:'≤ 3 mg/kg',          good:'未检出（< 1 mg/kg）', bad:'7.4 mg/kg'},
  {k:'总铬',       std:'GB/T 22807',             limit:'报告值',             good:'18 400 mg/kg',        bad:'—'},
  {k:'VOC',        std:'GB 33372',               limit:'≤ 100 g/L',          good:'42 g/L',              bad:'168 g/L'},
  {k:'固含',       std:'内部方法 PLM-QC-002',     limit:'48 ± 2 %',           good:'48.6 %',              bad:'44.1 %'},
  {k:'粘度',       std:'GB/T 2794',              limit:'120 ~ 260 mPa·s',    good:'186 mPa·s',           bad:'352 mPa·s'},
  {k:'成膜性',     std:'内部方法 PLM-QC-011',     limit:'无缩孔、无泛白',      good:'无缩孔、无泛白',       bad:'边角缩孔、轻微泛白'},
  {k:'柔软度',     std:'QB/T 2703',              limit:'≥ 7.5 分',           good:'8.2 分',              bad:'6.4 分'},
  {k:'耐磨',       std:'GB/T 3903.16',           limit:'≥ 25600 次',         good:'51 200 次未破损',     bad:'19 200 次破损'},
  {k:'耐水解',     std:'内部方法 PLM-QC-021',     limit:'2000 h 无开裂',      good:'2000 h 无开裂',       bad:'1280 h 出现开裂'},
  {k:'色差',       std:'GB/T 3979',              limit:'ΔE ≤ 1.5',           good:'ΔE 0.8',              bad:'ΔE 2.7'},
  {k:'贮存稳定性', std:'GB/T 6753.3',            limit:'50 ℃ / 7 d 无分层',  good:'无分层、无结皮',       bad:'表层结皮'},
  {k:'防霉等级',   std:'GB/T 24346',             limit:'≤ 1 级',             good:'0 级',                bad:'2 级'},
  {k:'急性毒性',   std:'OECD 401',               limit:'LD50 > 2000 mg/kg',  good:'LD50 > 5000 mg/kg',   bad:'LD50 1 260 mg/kg'},
  {k:'生物基碳',   std:'ASTM D6866',             limit:'≥ 30 %',             good:'36.4 %',              bad:'21.8 %'},
  {k:'电导率',     std:'GB/T 6908',              limit:'< 10 μS/cm',         good:'3.2 μS/cm',           bad:'18.6 μS/cm'},
  {k:'pH',         std:'GB/T 6368',              limit:'7.5 ~ 8.5',          good:'8.1',                 bad:'6.2'},
  {k:'纯度',       std:'内部方法 PLM-QC-001',     limit:'≥ 99.0 %',           good:'99.6 %',              bad:'97.2 %'},
  {k:'水分',       std:'GB/T 6283',              limit:'≤ 0.5 %',            good:'0.18 %',              bad:'0.92 %'},
  {k:'细度',       std:'GB/T 1724',              limit:'≤ 30 μm',            good:'18 μm',               bad:'46 μm'},
  {k:'有效成分',   std:'内部方法 PLM-QC-005',     limit:'20 ± 1 %',           good:'20.3 %',              bad:'17.6 %'},
  {k:'浓度',       std:'内部方法 PLM-QC-004',     limit:'25 ± 2 %',           good:'25.4 %',              bad:'21.2 %'},
  {k:'手感评分',   std:'内部方法 PLM-QC-013',     limit:'≥ 8 分',             good:'8.6 分',              bad:'6.8 分'}
];
function mdQcStd(item){
  var s=String(item||'');
  for(var i=0;i<MD_QC_STD.length;i++){
    if(s.indexOf(MD_QC_STD[i].k)>=0)return MD_QC_STD[i];
  }
  return {k:s,std:'供应商技术协议',limit:'按技术协议',good:'符合',bad:'不符合'};
}
function mdQcItems(submit){
  return String((submit&&submit.item)||'').split(/\s*\/\s*/).filter(Boolean);
}
/* 项目类别：法规符合性 / 物理性能 */
var MD_QC_LAW=['APEO','SVHC','甲醛','游离甲醛','重金属','Cr(VI)','总铬','VOC','急性毒性','生物基碳'];
function mdQcKind(name){
  for(var i=0;i<MD_QC_LAW.length;i++){ if(String(name).indexOf(MD_QC_LAW[i])>=0)return '法规符合性'; }
  return '物理性能';
}
/* 单项判定：按报告整体结论确定性推导 */
function mdQcVerdict(result,idx,total){
  if(result==='通过')return '合格';
  if(result==='不通过')return (idx%2===1||total===1)?'不合格':'合格';
  /* 部分通过：首项 + 末项不合格 */
  return (idx===0||idx===total-1)?'不合格':'合格';
}
var MD_QC_LAB={
  '法规符合性':{cls:'tag-purple',txt:'法规符合性'},
  '物理性能':{cls:'tag-blue',txt:'物理性能'}
};
mdReg({
  pageId:'qc:submit-detail',listId:'qc:submit',back:'返回送检记录',
  title:'送检单详情',crumb:['质量/检测管理','送检记录','送检单详情'],
  get:function(k){ return SUBMITS.filter(function(r){return r.id===k;})[0]||null; },
  hero:function(s){
    return {h1:s.sample,sub:'送检单号 '+esc(s.id)+' · '+esc(s.org)+' · 送检人 '+esc(s.by)+' · '+esc(s.date)};
  },
  acts:function(s){
    return '<button class="btn" onclick="toast(\'已催办检测机构（演示）\',\'ok\')">催办检测</button>'+
           '<button class="btn" onclick="toast(\'已导出送检委托单（演示）\',\'ok\')">导出委托单</button>';
  },
  warns:function(s){
    var w=[];
    if(s.status==='检测中'){
      var d=mdDaysTo(s.date);
      if(d!==null&&d<-14)w.push('送检已 <b>'+Math.abs(d)+'</b> 天仍未出报告，超出常规周期（10 个工作日）。');
    }
    var lack=mdQcItems(s).filter(function(it){return mdQcStd(it).std==='供应商技术协议';});
    if(lack.length)w.push('检测项目 <b>'+lack.map(function(x){return esc(x);}).join('、')+'</b> 未命中标准方法库，判定依据需人工确认。');
    return w;
  },
  sections:function(s){
    var items=mdQcItems(s),reps=QCREPORTS.filter(function(r){return r.submit===s.id;});
    return [
      {t:'基本信息',sub:'送检委托记录',rows:[
        ['送检单号',mono(s.id)],
        ['样品名称','<b>'+esc(s.sample)+'</b>'],
        ['检测机构',esc(s.org)],
        ['送检人',esc(s.by)],
        ['送检日期',esc(s.date)],
        ['检测项目数','<b>'+items.length+'</b> 项'],
        ['状态',gtag(s.status)],
        ['关联报告',reps.length?reps.map(function(r){return mdLink(esc(r.id),'mdOpenReport(\''+esc(r.id)+'\')');}).join('、'):'<span class="muted">尚未出具</span>']
      ]},
      {t:'送检项目明细',sub:'判定依据来自标准方法库；法规符合性项目未通过会直接锁定配方变更',type:'tbl',
       cols:[{t:'检测项目'},{t:'项目类别',w:'110px'},{t:'判定依据',w:'210px'},{t:'标准限值',w:'190px'},{t:'报告结论',w:'100px'}],
       rows:items.map(function(it,i){
         var st=mdQcStd(it),kind=mdQcKind(it),lb=MD_QC_LAB[kind];
         var rep=reps[0];
         var vd=rep?mdQcVerdict(rep.result,i,items.length):'';
         return [(i+1)+'. <b>'+esc(it)+'</b>',
                 '<span class="tag '+lb.cls+'">'+lb.txt+'</span>',
                 esc(st.std),esc(st.limit),
                 vd?('<span class="tag '+(vd==='合格'?'tag-green':'tag-red')+'">'+vd+'</span>'):'<span class="tag tag-grey">检测中</span>'];
       }),
       empty:'未登记检测项目'},
      {t:'关联检测报告',sub:reps.length+' 份',type:'tbl',
       cols:[{t:'报告编号',w:'150px'},{t:'出具日期',w:'110px'},{t:'检测机构'},{t:'结论',w:'100px'},{t:'操作',w:'90px'}],
       rows:reps.map(function(r){
         return [mono(r.id),esc(r.date),esc(r.org),gtag(r.result),mdLink('查看报告','mdOpenReport(\''+esc(r.id)+'\')')];
       }),
       empty:'检测机构尚未出具报告'}
    ];
  }
});
mdReg({
  pageId:'qc:report-detail',listId:'qc:report',back:'返回检测报告',
  title:'检测报告详情',crumb:['质量/检测管理','检测结果报告','检测报告详情'],
  get:function(k){ return QCREPORTS.filter(function(r){return r.id===k;})[0]||null; },
  hero:function(r){
    return {h1:r.sample,sub:'报告编号 '+esc(r.id)+' · '+esc(r.org)+' · 出具日期 '+esc(r.date)};
  },
  acts:function(r){
    return '<button class="btn" onclick="toast(\'已下载报告 PDF（演示）\',\'ok\')">下载报告</button>'+
           '<button class="btn" onclick="showPage(\'sds:list\')">查看关联 SDS</button>';
  },
  warns:function(r){
    var w=[];
    if(r.result==='不通过'){
      w.push('整体结论为 <b>不通过</b>，需触发不合格品处置流程，并回溯配方与批次。');
      w.push('关联送检单 <b>'+esc(r.submit)+'</b> 对应的批次已冻结，禁止投产。');
    }else if(r.result==='部分通过'){
      w.push('存在单项不合格，可放行非关键用途，但需在 SDS 第 9 章备注实测数据来源。');
    }
    return w;
  },
  sections:function(r){
    var sub=SUBMITS.filter(function(x){return x.id===r.submit;})[0];
    var items=sub?mdQcItems(sub):['（送检项目未登记）'];
    var rows=items.map(function(it,i){
      var st=mdQcStd(it),vd=mdQcVerdict(r.result,i,items.length);
      return [(i+1)+'. <b>'+esc(it)+'</b>',
              '<span class="tag '+MD_QC_LAB[mdQcKind(it)].cls+'">'+mdQcKind(it)+'</span>',
              esc(st.std),esc(st.limit),
              (vd==='合格'?esc(st.good):'<b style="color:var(--danger)">'+esc(st.bad)+'</b>'),
              '<span class="tag '+(vd==='合格'?'tag-green':'tag-red')+'">'+vd+'</span>'];
    });
    var ng=rows.filter(function(x){return x[5].indexOf('tag-red')>=0;}).length;
    return [
      {t:'基本信息',sub:'第三方检测机构出具的正式报告',rows:[
        ['报告编号',mono(r.id)],
        ['样品名称','<b>'+esc(r.sample)+'</b>'],
        ['关联送检',sub?mdLink(esc(r.submit),'mdOpenSubmit(\''+esc(r.submit)+'\')'):mono(r.submit)],
        ['检测机构',esc(r.org)],
        ['出具日期',esc(r.date)],
        ['检测项数','<b>'+items.length+'</b> 项'],
        ['整体结论',gtag(r.result)],
        ['不合格项','<b'+(ng?' style="color:var(--danger)"':'')+'>'+ng+'</b> 项']
      ]},
      {t:'检测结果明细',sub:'实测值对照标准限值逐项判定',type:'tbl',
       cols:[{t:'检测项目'},{t:'项目类别',w:'110px'},{t:'判定依据',w:'200px'},
             {t:'标准限值',w:'170px'},{t:'实测值',w:'170px'},{t:'单项判定',w:'90px'}],
       rows:rows,empty:'未登记检测项目'},
      {t:'结论与处置',sub:'',rows:[
        ['整体结论',gtag(r.result)],
        ['判定说明',r.result==='通过'?'全部检测项符合标准限值，样品判定为合格。':
          (r.result==='部分通过'?'存在 <b>'+ng+'</b> 项不合格，结论为部分通过；非关键用途可放行，需在报告与 SDS 中备注。':
           '存在 <b>'+ng+'</b> 项不合格，结论为不通过；批次冻结，需回溯配方与工艺。')],
        ['处置动作',r.result==='通过'?'归档报告，数据可用于 SDS 第 9 章与合规声明。':
          (r.result==='部分通过'?'通知项目组评估影响范围；下次投料复检不合格项。':
           '启动不合格品评审（NCR），冻结库存并通知客户与项目负责人。')],
        ['数据引用','检测报告是 SDS 第 9 章理化特性与法规符合性声明的证据来源，引用时自动记录报告编号与日期。']
      ]}
    ];
  }
});
/* 打开助手（列表页与详情页内链共用） */
function mdOpenSubmit(id){ showPage('qc:submit-detail',{key:id}); }
function mdOpenReport(id){ showPage('qc:report-detail',{key:id}); }

/* ==================================================================
   3. 设备资源（设备 / 设备能力 / 维保 / 零备件）
   ================================================================== */
function mdEqByCode(code){ return EQUIPMENTS.filter(function(e){return e.id===code;})[0]||null; }
function mdEqCaps(code){ return EQCAPS.filter(function(c){return c.eq===code;}); }
function mdEqMaints(code){ return EQMAINTS.filter(function(m){return String(m.eq).indexOf(code)===0;}); }
function mdEqSpares(code){ return EQSPARES.filter(function(s){return s['for']===code;}); }

mdReg({
  pageId:'eq:list-detail',listId:'eq:list',back:'返回设备列表',
  title:'设备详情',crumb:['设备资源','设备列表','设备详情'],
  get:function(k){ return mdEqByCode(k); },
  hero:function(e){
    return {h1:e.name,sub:mono(e.id)+' · 型号 '+esc(e.model)+' · '+esc(e.loc)+' · 责任人 '+esc(e.owner)};
  },
  acts:function(e){
    return '<button class="btn" onclick="showPage(\'eq:maint\')">维保计划</button>'+
           '<button class="btn" onclick="toast(\'已生成校准申请单（演示）\',\'ok\')">申请校准</button>';
  },
  warns:function(e){
    var w=[];
    if(e.status==='维修')w.push('设备处于 <b>维修</b> 状态，<b>不可排入实验计划</b>，相关实验需改期或改用备用设备。');
    if(e.status==='校准中')w.push('设备处于 <b>校准中</b> 状态，校准完成前无法出具正式检测数据。');
    if(e.status==='停用')w.push('设备已 <b>停用</b>，历史数据仍可追溯，但不可用于新实验。');
    var d=mdDaysTo(e.cal);
    if(d!==null&&d>=0&&d<=30)w.push('下次校准日 <b>'+esc(e.cal)+'</b> 距今仅 <b>'+d+'</b> 天，请提前排期。');
    if(d!==null&&d<0)w.push('校准已 <b>超期 '+Math.abs(d)+'</b> 天，检测数据有效性存疑。');
    var low=mdEqSpares(e.id).filter(function(s){return s.status!=='正常';});
    if(low.length)w.push('关联备件 <b>'+low.length+'</b> 项库存不足（'+low.map(function(s){return esc(s.name);}).join('、')+'）。');
    return w;
  },
  sections:function(e){
    var caps=mdEqCaps(e.id),mt=mdEqMaints(e.id),sp=mdEqSpares(e.id);
    var procs=[];
    caps.forEach(function(c){ if(procs.indexOf(c.proc)<0)procs.push(c.proc); });
    return [
      {t:'基本信息',sub:'设备台账',rows:[
        ['设备编号',mono(e.id)],
        ['设备名称','<b>'+esc(e.name)+'</b>'],
        ['型号',esc(e.model)],
        ['安装位置',esc(e.loc)],
        ['责任人',esc(e.owner)],
        ['状态',gtag(e.status)],
        ['下次校准',esc(e.cal)+((mdDaysTo(e.cal)!==null&&mdDaysTo(e.cal)>=0&&mdDaysTo(e.cal)<=30)?' <span class="tag orange">临期</span>':'')],
        ['可测能力项','<b>'+caps.length+'</b> 项'],
        ['关联备件','<b>'+sp.length+'</b> 项'+(sp.length?('（'+sp.map(function(s){return esc(s.name);}).join('、')+'）'):'')]
      ]},
      {t:'设备能力',sub:'实验方案设计时按此匹配检测资源',type:'tbl',
       cols:[{t:'能力项'},{t:'量程',w:'190px'},{t:'精度',w:'110px'},{t:'适用工艺/检测',w:'150px'},{t:'状态',w:'90px'}],
       rows:caps.map(function(c){
         return ['<b>'+esc(c.cap)+'</b>',esc(c.range),esc(c.acc),esc(c.proc),gtag(c.status)];
       }),
       empty:'该设备尚未维护可测能力项'},
      {t:'维保记录',sub:mt.length+' 条（校准 / 保养 / 维修）',type:'tbl',
       cols:[{t:'工单号',w:'120px'},{t:'保养类型',w:'100px'},{t:'周期',w:'90px'},
             {t:'上次执行',w:'105px'},{t:'下次计划',w:'105px'},{t:'负责人',w:'100px'},{t:'状态',w:'90px'}],
       rows:mt.map(function(m){
         return [mono(m.id),esc(m.type),esc(m.cycle),esc(m.last),esc(m.next),esc(m.owner),gtag(m.status)];
       }),
       empty:'暂无维保工单'},
      {t:'关联零备件',sub:'低于安全库存的备件以红色标出',type:'tbl',
       cols:[{t:'备件编码',w:'110px'},{t:'备件名称'},{t:'库存',w:'80px',num:true},
             {t:'安全库存',w:'90px',num:true},{t:'存放位置',w:'120px'},{t:'状态',w:'90px'}],
       rows:sp.map(function(s){
         return [mono(s.code),esc(s.name),
                 '<b'+(s.stock<s.safe?' style="color:var(--danger)"':'')+'>'+s.stock+'</b>',
                 String(s.safe),esc(s.loc),gtag(s.status)];
       }),
       empty:'该设备暂无关联备件'}
    ];
  }
});
mdReg({
  pageId:'eq:cap-detail',listId:'eq:cap',back:'返回设备能力',
  title:'设备能力详情',crumb:['设备资源','设备能力','能力详情'],
  get:function(k){
    var p=String(k||'').split('|');
    if(p.length<2)return null;
    return EQCAPS.filter(function(c){return c.eq===p[0]&&c.cap===p[1];})[0]||null;
  },
  hero:function(c){
    var e=mdEqByCode(c.eq);
    return {h1:c.cap,sub:'设备 '+esc(c.eq)+(e?('（'+esc(e.name)+'）'):'')+' · '+esc(c.proc)};
  },
  acts:function(c){
    return '<button class="btn" onclick="mdOpenEq(\''+esc(c.eq)+'\')">查看设备</button>'+
           '<button class="btn" onclick="showPage(\'qc:submit\')">送检记录</button>';
  },
  warns:function(c){
    var e=mdEqByCode(c.eq),w=[];
    if(c.status!=='正常')w.push('该能力项当前状态为 <b>'+esc(c.status)+'</b>，不可用于出具正式数据。');
    if(e&&e.status!=='正常')w.push('所属设备 <b>'+esc(e.name)+'</b> 状态为 <b>'+esc(e.status)+'</b>。');
    var d=e?mdDaysTo(e.cal):null;
    if(d!==null&&d<0)w.push('所属设备校准已 <b>超期 '+Math.abs(d)+'</b> 天。');
    return w;
  },
  sections:function(c){
    var e=mdEqByCode(c.eq);
    /* 用到该能力项的送检记录：按能力项关键词粗匹配检测项目 */
    var key=String(c.cap).replace(/[\/（(].*$/,'');
    var used=SUBMITS.filter(function(s){return String(s.item).indexOf(key)>=0||String(s.item).indexOf(c.proc)>=0;});
    return [
      {t:'能力信息',sub:'能力项描述与量程范围',rows:[
        ['能力项','<b>'+esc(c.cap)+'</b>'],
        ['所属设备',e?mdLink(esc(e.id)+' '+esc(e.name),'mdOpenEq(\''+esc(e.id)+'\')'):mono(c.eq)],
        ['量程',esc(c.range)],
        ['精度',esc(c.acc)],
        ['适用工艺 / 检测',esc(c.proc)],
        ['能力状态',gtag(c.status)],
        ['设备状态',e?gtag(e.status):'<span class="muted">—</span>'],
        ['设备位置',e?esc(e.loc):'<span class="muted">—</span>'],
        ['下次校准',e?esc(e.cal):'<span class="muted">—</span>']
      ]},
      {t:'引用该能力的检测记录',sub:used.length+' 条送检记录命中该能力项',type:'tbl',
       cols:[{t:'送检单号',w:'140px'},{t:'样品'},{t:'检测项目'},{t:'机构',w:'170px'},{t:'状态',w:'95px'}],
       rows:used.map(function(s){
         return [mdLink(esc(s.id),'mdOpenSubmit(\''+esc(s.id)+'\')'),esc(s.sample),esc(s.item),esc(s.org),gtag(s.status)];
       }),
       empty:'暂无检测记录引用该能力项'},
      {t:'配套方法说明',sub:'',rows:[
        ['检测方法','内部方法编号 PLM-QC-'+String(100+EQCAPS.indexOf(c)+1)+'（演示编号）'],
        ['标准依据','无对应国标时按内部方法执行，需在报告中注明方法与量程'],
        ['数据用途','可作为产品理化性质实测值来源，写入产品详情页「理化性质」区'],
        ['量程风险','超出量程的样品需稀释或改用其他设备，稀释倍数须记录在原始记录中']
      ]}
    ];
  }
});
mdReg({
  pageId:'eq:maint-detail',listId:'eq:maint',back:'返回保养维护',
  title:'维保工单详情',crumb:['设备资源','保养维护','维保工单'],
  get:function(k){ return EQMAINTS.filter(function(m){return m.id===k;})[0]||null; },
  hero:function(m){
    return {h1:m.type+' · '+m.eq,sub:'工单号 '+esc(m.id)+' · 周期 '+esc(m.cycle)+' · 负责人 '+esc(m.owner)};
  },
  acts:function(m){
    return '<button class="btn" onclick="toast(\'已打印工单（演示）\',\'ok\')">打印工单</button>'+
           '<button class="btn" onclick="toast(\'已通知责任人（演示）\',\'ok\')">通知责任人</button>';
  },
  warns:function(m){
    var code=String(m.eq).slice(0,11),e=mdEqByCode(code),w=[];
    var d=mdDaysTo(m.next);
    if(m.status!=='已完成'&&d!==null&&d<0)w.push('计划执行日 <b>'+esc(m.next)+'</b> 已超期 <b>'+Math.abs(d)+'</b> 天，设备检测数据有效性受影响。');
    if(m.status!=='已完成'&&d!==null&&d>=0&&d<=15)w.push('计划执行日 <b>'+esc(m.next)+'</b> 距今 <b>'+d+'</b> 天，请及时排期。');
    if(m.type==='故障维修'&&e&&e.status==='维修')w.push('设备仍处于 <b>维修</b> 状态，工单完成前不可排入实验计划。');
    return w;
  },
  sections:function(m){
    var code=String(m.eq).slice(0,11),e=mdEqByCode(code);
    var done=m.status==='已完成',doing=m.status==='执行中';
    var steps=[
      ['工单创建','-',esc(m.owner),'按周期计划自动生成：'+esc(m.type)+'（'+esc(m.cycle)+'）']
    ];
    if(done){
      steps.push(['执行中',esc(m.last),esc(m.owner),'完成'+esc(m.type)+'并记录结果']);
      steps.push(['完成',esc(m.last),esc(m.owner),'生成校准/保养记录，设备状态置为「正常」']);
      steps.push(['下次计划','-',esc(m.owner),'自动滚动至 '+esc(m.next)]);
    }else if(doing){
      steps.push(['执行中',esc(m.last),esc(m.owner),'已开工，等待执行结果录入']);
      steps.push(['待完成','-',esc(m.owner),'完成后置设备状态为正常，并回填下次计划 '+esc(m.next)]);
    }else{
      steps.push(['待执行','-',esc(m.owner),'计划执行日 '+esc(m.next)+'，请提前预约设备停机窗口']);
    }
    return [
      {t:'基本信息',sub:'维保工单',rows:[
        ['工单号',mono(m.id)],
        ['保养类型',esc(m.type)],
        ['设备',e?mdLink(esc(m.eq),'mdOpenEq(\''+esc(code)+'\')'):esc(m.eq)],
        ['周期',esc(m.cycle)],
        ['上次执行',esc(m.last)],
        ['下次计划',esc(m.next)+(mdDaysTo(m.next)<=15?' <span class="tag orange">临期</span>':'')],
        ['负责人',esc(m.owner)],
        ['状态',gtag(m.status)],
        ['设备当前状态',e?gtag(e.status):'<span class="muted">—</span>']
      ]},
      {t:'处理过程',sub:'按节点记录执行情况',type:'tbl',
       cols:[{t:'节点',w:'110px'},{t:'时间',w:'110px'},{t:'处理人',w:'100px'},{t:'说明'}],
       rows:steps.map(function(s){return ['<b>'+s[0]+'</b>',esc(s[1]),esc(s[2]),s[3]];})},
      {t:'设备能力影响',sub:'',rows:[
        ['可测能力项',mdEqCaps(code).map(function(c){return esc(c.cap);}).join('、')||'<span class="muted">—</span>'],
        ['校准要求','校准/维修期间设备数据不具溯源性，期间产生的数据需作废并重测'],
        ['排程约束','设备状态非「正常」时，实验计划中引用该设备的步骤会提示改期'],
        ['记录留存','工单完成后自动归档至设备档案，作为审核与客户审计证据']
      ]}
    ];
  }
});
mdReg({
  pageId:'eq:spare-detail',listId:'eq:spare',back:'返回零备件管理',
  title:'零备件详情',crumb:['设备资源','零备件管理','备件详情'],
  get:function(k){ return EQSPARES.filter(function(s){return s.code===k;})[0]||null; },
  hero:function(s){
    var e=mdEqByCode(s['for']);
    return {h1:s.name,sub:mono(s.code)+' · 适用设备 '+esc(s['for'])+(e?('（'+esc(e.name)+'）'):'')};
  },
  acts:function(s){
    return '<button class="btn" onclick="toast(\'已生成采购申请（演示）\',\'ok\')">申请采购</button>'+
           '<button class="btn" onclick="toast(\'已生成领用单（演示）\',\'ok\')">领用登记</button>';
  },
  warns:function(s){
    var w=[];
    if(s.status==='缺货')w.push('备件 <b>缺货</b>，适用设备停机会导致实验排程阻塞，建议立即采购。');
    if(s.status==='不足')w.push('库存 <b>'+s.stock+'</b> 低于安全库存 <b>'+s.safe+'</b>，建议补货至安全库存以上。');
    var e=mdEqByCode(s['for']);
    if(e&&e.status!=='正常')w.push('适用设备 <b>'+esc(e.name)+'</b> 当前状态为 <b>'+esc(e.status)+'</b>。');
    return w;
  },
  sections:function(s){
    var e=mdEqByCode(s['for']);
    /* 库存流水：按编码确定性生成，避免每次刷新变化 */
    var seed=0; String(s.code).split('').forEach(function(ch){seed+=ch.charCodeAt(0);});
    var flow=[
      ['入库',mdDateShift(MD_TODAY,-(30+seed%40)),'采购入库','+'+(2+seed%3)+' 件','仓管 · 周工'],
      ['领用',mdDateShift(MD_TODAY,-(12+seed%9)),'设备维护领用','-'+(1+seed%2)+' 件','设备责任人 · '+(e?e.owner:'—')],
      ['入库',mdDateShift(MD_TODAY,-5),'采购入库','+1 件','仓管 · 周工']
    ];
    var last=flow[2];
    return [
      {t:'基本信息',sub:'备件主数据',rows:[
        ['备件编码',mono(s.code)],
        ['备件名称','<b>'+esc(s.name)+'</b>'],
        ['适用设备',e?mdLink(esc(e.id)+' '+esc(e.name),'mdOpenEq(\''+esc(e.id)+'\')'):mono(s['for'])],
        ['存放位置',esc(s.loc)],
        ['当前库存','<b'+(s.stock<s.safe?' style="color:var(--danger)"':'')+'>'+s.stock+'</b> 件'],
        ['安全库存',s.safe+' 件'],
        ['库存状态',gtag(s.status)],
        ['建议补货','<b'+(s.stock<s.safe?Math.max(s.safe-s.stock,1):0)+'</b> 件（补至安全库存）']
      ]},
      {t:'库存流水',sub:'演示数据 · 生产环境由 ERP 同步',type:'tbl',
       cols:[{t:'类型',w:'80px'},{t:'日期',w:'110px'},{t:'事由'},{t:'数量',w:'90px'},{t:'经办人',w:'150px'}],
       rows:flow.map(function(f){
         var c=f[0]==='入库'?'tag-green':'tag-blue';
         return ['<span class="tag '+c+'">'+f[0]+'</span>',esc(f[1]),esc(f[2]),esc(f[3]),esc(f[4])];
       })},
      {t:'采购与领用提示',sub:'',rows:[
        ['最近一次动态',esc(last[1])+' · '+esc(last[2])+' '+esc(last[3])],
        ['采购周期','常规备件 7 ~ 15 天，进口件 30 ~ 45 天（需提前备货）'],
        ['领用规则','领用需关联设备与工单，低于安全库存时自动触发补货提醒'],
        ['数据来源','库存数量由 ERP 同步；本系统只维护安全库存与领用关联关系']
      ]}
    ];
  }
});
function mdOpenEq(id){ showPage('eq:list-detail',{key:id}); }

/* ==================================================================
   4. 文档管理
   ================================================================== */
function mdFindDoc(key){
  var d=DOCS.filter(function(r){return r.id===key;})[0];
  if(d)return {kind:'doc',r:d};
  var s=(typeof SDS_ROWS!=='undefined')?SDS_ROWS.filter(function(r){return r.no===key;})[0]:null;
  if(s)return {kind:'sds',r:s};
  return null;
}
/* DOCS 的版本历史：按当前版本号确定性回推，避免手写 12 份台账 */
function mdDocVers(d){
  var m=String(d.ver||'V1.0').match(/^V(\d+)\.(\d+)$/);
  var maj=m?+m[1]:1,min=m?+m[2]:0;
  var out=[[d.ver||'V1.0','当前版本',d.owner,d.upd]];
  var prev=[];
  if(min>0)prev.push(['V'+maj+'.'+(min-1),'改版：根据评审意见修订',d.owner,mdDateShift(d.upd,-45)]);
  prev.push(['V1.0','首次编制并发布',d.owner,mdDateShift(d.upd,-90)]);
  prev.forEach(function(p){
    if(out.length<3&&!out.some(function(x){return x[0]===p[0];}))out.push(p);
  });
  return out;
}
mdReg({
  pageId:'doc:detail',listId:'doc:public',back:'返回列表',
  title:'文档详情',crumb:['文档管理','文档详情'],
  get:function(k){ return mdFindDoc(k); },
  hero:function(o){
    var r=o.r;
    return {h1:(o.kind==='sds'?(r.product+' SDS'):r.name),
      sub:mono(r.id||r.no)+' · '+esc(o.kind==='sds'?'SDS 文档':r.type)+' · 版本 '+esc(r.ver)+' · 负责人 '+esc(r.owner)};
  },
  acts:function(o){
    var r=o.r;
    return '<button class="btn" onclick="toast(\'已开始下载文档（演示）\',\'ok\')">下载</button>'+
      (o.kind==='sds'
        ? '<button class="btn" onclick="showPage(\'sds:list\')">进入 SDS 模块</button>'
        : '<button class="btn" onclick="showPage(\'doc:mine\')">我的文档</button>');
  },
  warns:function(o){
    var r=o.r,w=[];
    if(o.kind!=='sds'){
      if(r.status==='草稿')w.push('本文档仍为 <b>草稿</b>，未发布版本不参与引用与审计。');
      if(r.status==='待更新')w.push('文档标记为 <b>待更新</b>，引用它的报告需复核。');
      if(r.status==='审批中')w.push('文档处于 <b>审批中</b>，发布前不可对外提供。');
    }else{
      w.push('SDS 由合规管理模块维护，此处为归档视图；修改请前往 <b>SDS 生成向导</b>。');
    }
    return w;
  },
  sections:function(o){
    var r=o.r;
    if(o.kind==='sds'){
      var ev=(typeof sdsEv==='function')?sdsEv(r):null;
      return [
        {t:'基本信息',sub:'SDS 归档信息',rows:[
          ['SDS 编号',mono(r.no)],
          ['产品名称','<b>'+esc(r.product)+'</b>'],
          ['目标市场',esc(r.market)],
          ['语言版本',esc(r.lang)],
          ['当前版本',mono(r.ver)],
          ['状态',gtag(r.status)],
          ['编制 / 更新日期',esc(r.date)],
          ['负责人',esc(r.owner)],
          ['规则包',esc(r.rulePack||'—')],
          ['证据状态',ev?('<span class="tag '+(ev.lv==='red'?'tag-red':ev.lv==='green'?'tag-green':'tag-orange')+'">'+SDS_EV_TXT[ev.lv]+'</span>'):'<span class="muted">—</span>']
        ]},
        {t:'版本历史',sub:'每次改版均记录原因与操作人',type:'tbl',
         cols:[{t:'版本',w:'90px'},{t:'变更说明'},{t:'操作人',w:'110px'},{t:'日期',w:'110px'}],
         rows:(r.versions||[]).map(function(v){
           return [mono(v[0]),esc(v[1]),esc(v[2]),esc(v[3])];
         }),
         empty:'暂无版本记录'},
        {t:'法规依据与复审',sub:'',rows:[
          ['适用法规',esc(r.lawName||'—')],
          ['当前引用版本',esc(r.lawVer||'—')],
          ['法规最新版本',esc(r.lawLatest||'—')],
          ['下次复审日',esc(r.reviewDue||'—')],
          ['数据缺口','<b>'+(r.gapCnt===undefined?'—':r.gapCnt)+'</b> 项待补录']
        ]}
      ];
    }
    var vers=mdDocVers(r);
    var rel=[];
    if(String(r.name).indexOf('WPU-320')>=0)rel.push(['关联产品','WPU-320 水性聚氨酯涂饰树脂（PRD-2026-001）']);
    if(String(r.name).indexOf('GL-9')>=0)rel.push(['关联产品','皮革涂饰光亮剂 GL-9（PRD-2026-002）']);
    String(r.name).match(/PRJ-\d{4}-\d{3}/g)&&rel.push(['关联项目','<span class="mono">'+esc(String(r.name).match(/PRJ-\d{4}-\d{3}/)[0])+'</span>']);
    String(r.name).match(/DOE-\d{4}-\d{4}/g)&&rel.push(['关联实验','<span class="mono">'+esc(String(r.name).match(/DOE-\d{4}-\d{4}/)[0])+'</span>']);
    if(!rel.length)rel.push(['关联对象','<span class="muted">未登记</span>']);
    return [
      {t:'基本信息',sub:'文档主数据',rows:[
        ['文档编号',mono(r.id)],
        ['文档名称','<b>'+esc(r.name)+'</b>'],
        ['文档类型',esc(r.type)],
        ['当前版本',mono(r.ver)],
        ['负责人',esc(r.owner)],
        ['更新时间',esc(r.upd)],
        ['状态',gtag(r.status)]
      ]},
      {t:'版本历史',sub:'版本号不可覆盖，历史版本永久留存',type:'tbl',
       cols:[{t:'版本',w:'90px'},{t:'变更说明'},{t:'操作人',w:'110px'},{t:'日期',w:'110px'}],
       rows:vers.map(function(v){return [mono(v[0]),esc(v[1]),esc(v[2]),esc(v[3])];})},
      {t:'关联与可见性',sub:'',rows:rel.concat([
        ['可见范围',r.type==='管理规范'?'全团队（公共文档）':'全团队（公共文档）'],
        ['归档规则','发布版本自动进入公共文档；草稿仅本人与上级可见'],
        ['引用留痕','被周报、SDS 或报告引用时记录引用关系，改版会触发引用方复核提醒']
      ])}
    ];
  }
});
function mdOpenDoc(id){ showPage('doc:detail',{key:id}); }

/* ==================================================================
   5. 知识管理 / 产权管理
   ================================================================== */
var MD_KM_ABS={
  '工艺经验':'记录产线在放大与批次稳定性上的实操经验：哪些参数是真正的关键控制点、哪些是「看起来重要但影响很小」的干扰项。',
  '法规解读':'对法规条款做业务化转译：把条文要求拆成「我们要改什么、要留什么证据、谁负责」，避免研发与合规各说各话。',
  '方法论':'沉淀可复用的分析方法与设计套路，覆盖实验设计、数据处理与结论推导，降低同类问题的重复试错成本。',
  '技术综述':'对某一技术路线的系统梳理与横向对比，包含优劣势、适用边界与落地风险，用于方案选型的第一手参考。',
  '检测方法':'记录检测方法的操作要点、常见误差来源与判定边界，减少「方法不同导致结论打架」的情况。',
  '失效案例':'复盘失败项目的全过程：症状、排查路径、真实根因与纠正措施，是最容易被重复踩的坑。',
  '合规经验':'客户审计与报告退回的高频原因汇总，含整改动作与预防措施。',
  '数据治理':'主数据与基础数据的治理策略，涵盖编码规则、字段口径、缺失补全与数据责任人。'
};
function mdKmAbs(k){ return MD_KM_ABS[k]||MD_KM_ABS['技术综述']; }
mdReg({
  pageId:'ip:km-detail',listId:'ip:km',back:'返回知识管理',
  title:'知识条目详情',crumb:['知识产权','知识管理','知识条目'],
  get:function(k){ return KNOWLEDGES.filter(function(r){return r.id===k;})[0]||null; },
  hero:function(r){
    return {h1:r.title,sub:mono(r.id)+' · '+esc(r.cat)+' · 作者 '+esc(r.author)+' · '+esc(r.create)};
  },
  acts:function(r){
    return '<button class="btn" onclick="toast(\'已收藏到我的知识（演示）\',\'ok\')">收藏</button>'+
           '<button class="btn" onclick="toast(\'已生成周报引用（演示）\',\'ok\')">引用到周报</button>';
  },
  warns:function(r){
    var w=[];
    if(r.status==='草稿')w.push('条目仍为 <b>草稿</b>，未公开前不进入培训清单与检索结果。');
    if(r.views>=200)w.push('浏览量 <b>'+r.views+'</b> 次，属高频条目，建议纳入新人培训必读清单。');
    return w;
  },
  sections:function(r){
    var same=KNOWLEDGES.filter(function(x){return x.cat===r.cat&&x.id!==r.id;});
    var refs=[];
    if(r.cat==='法规解读'||r.cat==='合规经验')refs.push(['合规管理','SDS 第 3 / 15 章法规依据','ZDHC MRSL 与 REACH 限值引用']);
    if(r.cat==='工艺经验'||r.cat==='方法论')refs.push(['实验管理','DOE 方案设计与分析','工艺参数优化的方法来源']);
    if(r.cat==='检测方法')refs.push(['质量/检测管理','检测报告判定依据','方法与限值的口径来源']);
    if(r.cat==='失效案例')refs.push(['项目管理','阶段评审风险项','复盘结论进入立项风险清单']);
    if(!refs.length)refs.push(['关联模块','<span class="muted">暂无跨模块引用</span>']);
    return [
      {t:'基本信息',sub:'知识条目主数据',rows:[
        ['知识编号',mono(r.id)],
        ['标题','<b>'+esc(r.title)+'</b>'],
        ['分类',esc(r.cat)],
        ['作者',esc(r.author)],
        ['创建日期',esc(r.create)],
        ['浏览量','<b>'+r.views+'</b> 次'],
        ['状态',gtag(r.status)]
      ]},
      {t:'摘要',sub:'条目正文摘要',rows:[
        ['摘要',mdKmAbs(r.cat)],
        ['适用场景',r.cat==='失效案例'?'同类工艺放大、批次异常排查':'方案设计、评审与新人培训'],
        ['关键结论','<b>'+esc(r.title)+'</b> 的核心结论已沉淀为可复用经验，避免重复试错。'],
        ['更新策略','作者负责维护；引用它的模块变更时需同步复核本条目。']
      ]},
      {t:'同分类条目',sub:'共 '+same.length+' 条，可横向对照',type:'tbl',
       cols:[{t:'知识编号',w:'130px'},{t:'标题'},{t:'作者',w:'100px'},{t:'创建日期',w:'110px'},{t:'浏览',w:'80px',num:true}],
       rows:same.map(function(x){
         return [mdLink(esc(x.id),'showPage(\'ip:km-detail\',{key:\''+esc(x.id)+'\'})'),esc(x.title),esc(x.author),esc(x.create),String(x.views)];
       }),
       empty:'该分类下暂无其他条目'},
      {t:'被引用情况',sub:'知识条目在其他模块的落地位置',type:'tbl',
       cols:[{t:'模块',w:'130px'},{t:'引用位置'},{t:'说明'}],
       rows:refs.map(function(x){return ['<b>'+esc(x[0])+'</b>',esc(x[1]),esc(x[2])];})}
    ];
  }
});
mdReg({
  pageId:'ip:right-detail',listId:'ip:right',back:'返回产权管理',
  title:'知识产权详情',crumb:['知识产权','产权管理','产权详情'],
  get:function(k){ return IPRIGHTS.filter(function(r){return r.id===k;})[0]||null; },
  hero:function(r){
    return {h1:r.name,sub:mono(r.id)+' · '+esc(r.type)+' · 申请日 '+esc(r.apply)};
  },
  acts:function(r){
    return '<button class="btn" onclick="toast(\'已导出申请文件（演示）\',\'ok\')">导出申请文件</button>'+
           '<button class="btn" onclick="toast(\'已设置年费提醒（演示）\',\'ok\')">设置年费提醒</button>';
  },
  warns:function(r){
    var w=[],d=mdDaysTo(r.grant);
    if(r.status==='已驳回')w.push('该申请已被 <b>驳回</b>，如需继续保护请联系代理机构确认复审策略。');
    if(r.status==='实质审查')w.push('处于 <b>实质审查</b> 阶段，审查意见答复期限需重点跟踪。');
    if(r.grant&&r.grant!=='—'){
      var n1=mdDateShift(r.grant,0,12);
      var left=mdDaysTo(n1);
      if(left!==null&&left>=0&&left<=60)w.push('第 1 年年费缴纳节点 <b>'+esc(n1)+'</b> 距今 <b>'+left+'</b> 天，逾期将产生滞纳金。');
    }
    return w;
  },
  sections:function(r){
    var nodes=[['提交申请',r.apply,'已完成']];
    nodes.push(['受理','—','已受理']);
    if(r.status==='实质审查'||r.status==='已授权')nodes.push(['实质审查','—','已完成']);
    if(r.status==='已授权')nodes.push(['授权公告',r.grant,'已完成']);
    if(r.status==='已驳回')nodes.push(['驳回','—','已驳回']);
    if(r.status==='已受理')nodes.push(['待进入实质审查','—','进行中']);
    var claims=[
      '1. 一种'+String(r.name).replace(/^一种/,'')+'，其特征在于采用权利要求所述组分与工艺条件制备，'+
        '所得产品的关键性能指标满足行业标准要求。',
      '2. 根据权利要求 1 所述的方法，其特征在于反应温度控制在 40 ~ 90 ℃，反应时间为 2 ~ 6 小时。',
      '3. 根据权利要求 1 所述的方法，其特征在于所述组分按质量份数计为：主料 40 ~ 70 份、助剂 5 ~ 20 份、水 20 ~ 50 份。',
      '4. 一种由权利要求 1 ~ 3 任一所述方法制备得到的产品，其特征在于其固含量为 30 ~ 55 %。'
    ];
    var fees=[];
    if(r.grant&&r.grant!=='—'){
      for(var i=1;i<=3;i++){
        var dt=mdDateShift(r.grant,0,12*i);
        fees.push([String(i)+' 年年费',dt,gtag(mdDaysTo(dt)<0?'已缴纳':'待缴纳')]);
      }
    }
    return [
      {t:'基本信息',sub:'产权主数据',rows:[
        ['申请号 / 专利号',mono(r.id)],
        ['名称','<b>'+esc(r.name)+'</b>'],
        ['类型',esc(r.type)],
        ['状态',gtag(r.status)],
        ['申请日',esc(r.apply)],
        ['授权日',r.grant==='—'?'<span class="muted">—</span>':esc(r.grant)],
        ['发明人',esc(r.who)],
        ['申请人','成都某皮革化工有限公司（演示）'],
        ['代理机构','成都某知识产权代理事务所（演示）']
      ]},
      {t:'流程节点',sub:'从申请到授权的生命周期',type:'tbl',
       cols:[{t:'节点',w:'150px'},{t:'日期',w:'110px'},{t:'状态',w:'100px'}],
       rows:nodes.map(function(n){
         var c=n[2]==='已完成'?'tag-green':(n[2]==='已驳回'?'tag-red':'tag-orange');
         return ['<b>'+esc(n[0])+'</b>',esc(n[1]),'<span class="tag '+c+'">'+esc(n[2])+'</span>'];
       })},
      {t:'权利要求',sub:'共 '+claims.length+' 项（演示文本）',type:'tbl',
       cols:[{t:'序号',w:'60px',ctr:true},{t:'内容'}],
       rows:claims.map(function(c,i){return [String(i+1),esc(c.replace(/^\d+\.\s*/,''))];})},
      {t:'年费与维护',sub:r.grant==='—'?'授权后开始计年费':'授权日起逐年缴纳',type:'tbl',
       cols:[{t:'年费节点',w:'120px'},{t:'缴纳截止日',w:'130px'},{t:'状态',w:'100px'}],
       rows:fees,
       empty:'尚未授权，暂无年费节点'}
    ];
  }
});

/* ==================================================================
   6. GHS 与受限属性（基础数据 → 组分与合规）
   ================================================================== */
mdReg({
  pageId:'bd:ghs-detail',listId:'bd:ghs',back:'返回 GHS 与受限属性',
  title:'物质受限属性详情',crumb:['基础数据','组分与合规','物质受限属性'],
  get:function(k){ return GHS_ROWS.filter(function(r){return r.cas===k;})[0]||null; },
  hero:function(r){
    return {h1:r.cn,sub:'CAS '+esc(r.cas)+' · '+esc(r.ghs)};
  },
  acts:function(r){
    return '<button class="btn" onclick="compOpen(\''+esc(r.cas)+'\')">组分基础信息</button>'+
           '<button class="btn" onclick="showPage(\'law:clp\')">CLP 附录 VI</button>';
  },
  warns:function(r){
    var w=[];
    if(r.svhc==='是')w.push('该物质列入 <b>SVHC 候选清单</b>，含量超 0.1% 时需向下游通报并更新 SDS 第 3 章。');
    if(String(r.reach).indexOf('Annex XIV')===0)w.push('命中 <b>REACH 附件 XIV 授权物质</b>，需在日落日期前申请授权方可继续使用。');
    if(String(r.reach).indexOf('Annex XVII')===0)w.push('命中 <b>REACH 附件 XVII 限制条款</b>，需核对限值与适用场景。');
    if(r.zdhc!=='—')w.push('命中 <b>ZDHC MRSL</b> 清单，纺织皮革供应链客户审计时会直接调取本项。');
    var sl=(r.ghs||'').match(/Carc\.|Muta\.|Repr\./);
    if(sl)w.push('分类中含 <b>Carc. / Muta. / Repr.</b>（致癌 / 致突变 / 生殖毒性），属高关注度分类，替代方案优先级最高。');
    return w;
  },
  sections:function(r){
    var p=(typeof clpParamOf==='function')?clpParamOf(r.cas):null;
    /* 引用该 CAS 的物料 */
    var mats=[];
    if(typeof matRows==='function'){
      matRows().forEach(function(m){
        var hit=(m.recipe||[]).filter(function(x){return x.cas===r.cas;});
        if(hit.length||matCas(m)===r.cas)mats.push({code:m.code,name:m.name,status:m.status,form:m.form});
      });
    }
    var hCodes=String(r.h||'').split(/\s*\/\s*/).filter(Boolean);
    return [
      {t:'基本信息',sub:'物质识别',rows:[
        ['CAS 号',mono(r.cas)],
        ['物质名称','<b>'+esc(r.cn)+'</b>'],
        ['GHS 分类',esc(r.ghs)],
        ['危险说明 H 码','<b>'+esc(r.h)+'</b>'],
        ['SVHC 候选',r.svhc==='是'?'<span class="tag red">是</span>':'<span class="tag grey">否</span>'],
        ['REACH 命中',esc(r.reach)],
        ['ZDHC 命中',esc(r.zdhc)],
        ['数据来源','<span class="tag '+(r.src==='实测报告'?'green':r.src==='供应商SDS'?'blue':'purple')+'">'+esc(r.src)+'</span>']
      ]},
      {t:'GHS 分类与危险说明',sub:'按 CLP 附录 VI 与供应商 SDS 第 2 章汇总',type:'tbl',
       cols:[{t:'危险说明',w:'100px'},{t:'含义'},{t:'来源'}],
       rows:hCodes.map(function(c){
         var txt=MD_H_TXT[c]||'需查阅 CLP 附录 VI 完整释义';
         return ['<span class="mono">'+esc(c)+'</span>',esc(txt),esc(r.src)];
       }),
       empty:'暂无 H 码记录'},
      {t:'受限属性判定',sub:'供应链审计最常调取的三类命',type:'tbl',
       cols:[{t:'属性维度',w:'150px'},{t:'判定结果'},{t:'处置要求'}],
       rows:[
         ['SVHC 候选清单',r.svhc==='是'?'<span class="tag red">命中</span>':'<span class="tag green">未命中</span>',
          r.svhc==='是'?'含量 > 0.1% 时向下游通报，更新 SDS 第 3 章与第 15 章':'无需额外动作'],
         ['REACH 限制 / 授权',esc(r.reach),
          String(r.reach).indexOf('Annex')===0?'核对限值并留存符合性证据':'—'],
         ['ZDHC MRSL',r.zdhc==='—'?'<span class="muted">未列入</span>':'<span class="tag orange">'+esc(r.zdhc)+'</span>',
          r.zdhc==='—'?'—':'客户审计时需提供检测报告或供应商声明']
       ]},
      {t:'毒理参数（CLP）',sub:'分类判定的数据基础',rows:p?[
        ['统一分类',esc(p.uni)],
        ['信号词',esc(p.scl)],
        ['急性毒性（ATE 推算）',esc(p.ate)],
        ['LC50 / NOEC',esc((p.lc50||'—')+' / '+(p.noec||'—'))],
        ['M 因子',esc(p.m)],
        ['参数维护状态',(p.ateKnown&&p.aqKnown)?'<span class="tag green">已维护</span>':'<span class="tag orange">部分缺失</span>']
      ]:[['参数维护状态','<span class="muted">CLP 参数库中未维护该 CAS</span>']]},
      {t:'引用该物质的物料',sub:mats.length+' 种物料含该组分',type:'tbl',
       cols:[{t:'物料编码',w:'120px'},{t:'物料名称'},{t:'物质形态',w:'150px'},{t:'物料状态',w:'90px'},{t:'操作',w:'90px'}],
       rows:mats.map(function(m){
         return [mono(m.code),esc(m.name),esc(m.form||'—'),gtag(m.status),mdLink('原料详情','matOpen(\''+esc(m.code)+'\')')];
       }),
       empty:'暂无物料引用该物质'}
    ];
  }
});
/* H 码中文释义（常用项，未收录项回落到「查阅 CLP 附录 VI」） */
var MD_H_TXT={
  'H225':'高度易燃液体和蒸气','H226':'易燃液体和蒸气','H301':'吞咽会中毒',
  'H302':'吞咽有害','H311':'皮肤接触会中毒','H312':'皮肤接触有害',
  'H314':'造成严重皮肤灼伤和眼损伤','H315':'造成皮肤刺激','H318':'造成严重眼损伤',
  'H319':'造成严重眼刺激','H331':'吸入会中毒','H332':'吸入有害',
  'H340':'可能导致遗传性缺陷','H341':'怀疑会导致遗传性缺陷',
  'H350':'可能致癌','H351':'怀疑会致癌',
  'H361d':'怀疑对生育能力或胎儿造成伤害','H372':'长期或反复接触会对器官造成损害',
  'H373':'长期或反复接触可能对器官造成伤害','H400':'对水生生物毒性极大',
  'H410':'对水生生物毒性极大并具有长期持续影响'
};

/* ==================================================================
   7. 列表页接线（把 detailSoon 兜底换成真实跳转）
   ================================================================== */
function mdOpenSupplier(code){ showPage('bd:supplier-detail',{key:code}); }
function mdOpenSubmit_(id){ mdOpenSubmit(id); }
function mdOpenReport_(id){ mdOpenReport(id); }
function mdOpenEqCap(eq,cap){ showPage('eq:cap-detail',{key:eq+'|'+cap}); }
function mdOpenMaint(id){ showPage('eq:maint-detail',{key:id}); }
function mdOpenSpare(code){ showPage('eq:spare-detail',{key:code}); }
function mdOpenKm(id){ showPage('ip:km-detail',{key:id}); }
function mdOpenIp(id){ showPage('ip:right-detail',{key:id}); }
function mdOpenGhs(cas){ showPage('bd:ghs-detail',{key:cas}); }
