/* ==================================================================
   [23y] 法规数据：统一查询 + 分库维护入口
   查询按物质组织；维护按官方法规库组织；底层共用 lawRows / LAW_DETAIL。
   ================================================================== */

/* 细化现有法规台账的库归属，并补齐统一维护入口需要的两类法规库。 */
(function(){
  var types={xiv:'reach',xvii:'reach',svhc:'reach',rohs2:'reach',clp6:'clp',
    gb16483:'cn',gb30000:'cn',gb13690:'cn','zdhc-mrsl':'zdhc','zdhc-waste':'zdhc','zdhc-inflow':'zdhc'};
  lawRows.forEach(function(r){if(types[r.key])r.listType=types[r.key];});
  if(!lawRows.some(function(r){return r.key==='cl-inventory';})){
    var cl={key:'cl-inventory',name:'C&L Inventory（分类与标签清单）',org:'ECHA 欧洲化学品管理局',eff:'2026-01-15',ver:'2026-Q1',upd:'2026-02-02 09:40',status:'已生效',items:186420,verifier:'法规专员 · 陈工',listType:'cl'};
    cl._id=sdsUid();lawRows.push(cl);
    LAW_DETAIL[cl.key]={cols:['物质名称','CAS 号','EC 号','申报分类','申报数量'],rows:[
      ['甲醛','50-00-0','200-001-8','Carc. 1B / Skin Sens. 1','1,284'],
      ['丙烯酸','79-10-7','201-177-9','Skin Corr. 1A / Acute Tox. 4','936'],
      ['乙二醇单丁醚','111-76-2','203-905-0','Acute Tox. 4 / Eye Irrit. 2','742']
    ]};
  }
  if(!lawRows.some(function(r){return r.key==='cn-danger';})){
    var cn={key:'cn-danger',name:'危险化学品目录及分类信息表',org:'应急管理部',eff:'2025-05-01',ver:'2025 增补版',upd:'2026-01-12 14:20',status:'已生效',items:2828,verifier:'法规专员 · 刘工',listType:'cn'};
    cn._id=sdsUid();lawRows.push(cn);
    LAW_DETAIL[cn.key]={cols:['序号','品名','CAS 号','危险性类别','备注'],rows:[
      ['1630','甲醛溶液','50-00-0','急性毒性 / 皮肤腐蚀 / 致癌性','含量＞25%'],
      ['2828','乙醇','64-17-5','易燃液体 类别2','无水乙醇'],
      ['1105','甲苯','108-88-3','易燃液体 / 生殖毒性','—']
    ]};
  }
})();

var LAW_QUERY_STATIC_ROWS=[
  {id:'Q002',cas:'50-00-0',name:'甲醛',ec:'200-001-8',source:'REACH Annex XVII',sourceType:'reach',region:'欧盟',dataType:'限制',result:'Entry 77 命中',value:'消费品释放量受限',version:'V2026.2',status:'已生效',lawKey:'xvii'},
  {id:'Q003',cas:'50-00-0',name:'甲醛',ec:'200-001-8',source:'SVHC 候选清单',sourceType:'reach',region:'欧盟',dataType:'高关注物质',result:'已列入',value:'浓度超过 0.1% 触发信息传递',version:'第 33 批',status:'已生效',lawKey:'svhc'},
  {id:'Q004',cas:'50-00-0',name:'甲醛',ec:'200-001-8',source:'C&L Inventory',sourceType:'cl',region:'欧盟',dataType:'企业申报分类',result:'存在分类申报',value:'Carc. 1B / Skin Sens. 1',version:'2026-Q1',status:'已生效',lawKey:'cl-inventory'},
  {id:'Q005',cas:'50-00-0',name:'甲醛',ec:'200-001-8',source:'国内危化品分类',sourceType:'cn',region:'中国',dataType:'危化品分类',result:'目录命中',value:'甲醛溶液（含量＞25%）',version:'2025 增补版',status:'已生效',lawKey:'cn-danger'},
  {id:'Q006',cas:'50-00-0',name:'甲醛',ec:'200-001-8',source:'ZDHC MRSL',sourceType:'zdhc',region:'行业标准',dataType:'制造限用',result:'限值管控',value:'皮革/纺织加工限值适用',version:'V3.1',status:'已生效',lawKey:'zdhc-mrsl'},
  {id:'Q008',cas:'79-10-7',name:'丙烯酸',ec:'201-177-9',source:'C&L Inventory',sourceType:'cl',region:'欧盟',dataType:'企业申报分类',result:'存在分类申报',value:'Skin Corr. 1A / Acute Tox. 4',version:'2026-Q1',status:'已生效',lawKey:'cl-inventory'},
  {id:'Q010',cas:'111-76-2',name:'乙二醇单丁醚',ec:'203-905-0',source:'C&L Inventory',sourceType:'cl',region:'欧盟',dataType:'企业申报分类',result:'存在分类申报',value:'Acute Tox. 4 / Eye Irrit. 2',version:'2026-Q1',status:'已生效',lawKey:'cl-inventory'},
  {id:'Q012',cas:'64-17-5',name:'乙醇',ec:'200-578-6',source:'国内危化品分类',sourceType:'cn',region:'中国',dataType:'危化品分类',result:'目录命中',value:'易燃液体 类别2',version:'2025 增补版',status:'已生效',lawKey:'cn-danger'},
  {id:'Q013',cas:'108-88-3',name:'甲苯',ec:'203-625-9',source:'REACH Annex XVII',sourceType:'reach',region:'欧盟',dataType:'限制',result:'限制条目命中',value:'消费品与专业用途限制',version:'V2026.2',status:'已生效',lawKey:'xvii'},
  {id:'Q014',cas:'108-88-3',name:'甲苯',ec:'203-625-9',source:'ZDHC MRSL',sourceType:'zdhc',region:'行业标准',dataType:'制造限用',result:'MRSL 命中',value:'溶剂类物质限值适用',version:'V3.1',status:'已生效',lawKey:'zdhc-mrsl'},
  {id:'Q015',cas:'108-88-3',name:'甲苯',ec:'203-625-9',source:'国内危化品分类',sourceType:'cn',region:'中国',dataType:'危化品分类',result:'目录命中',value:'易燃液体 / 生殖毒性',version:'2025 增补版',status:'已生效',lawKey:'cn-danger'},
  /* 2026-09-18 补充：REACH 法规库各 Tab 跳转统一查询时需要按法规类别（lawKey）过滤，
     预先补 Annex XIV 授权与 Annex XVII 六价铬两条线的示例命中记录 */
  {id:'Q016',cas:'117-81-7',name:'邻苯二甲酸二(2-乙基己基)酯 DEHP',ec:'204-211-0',source:'REACH Annex XIV',sourceType:'reach',region:'欧盟',dataType:'授权',result:'列入授权清单',value:'日落日期 2015-02-21（未经授权不得投放市场）',version:'V2026.1',status:'已生效',lawKey:'xiv'},
  {id:'Q017',cas:'7758-97-6',name:'铬酸铅',ec:'231-846-0',source:'REACH Annex XIV',sourceType:'reach',region:'欧盟',dataType:'授权',result:'列入授权清单',value:'最迟申请日期 2017-05-21 / 日落日期 2019-05-04',version:'V2026.1',status:'已生效',lawKey:'xiv'},
  {id:'Q018',cas:'18540-29-9',name:'六价铬化合物 Cr(VI)',ec:'240-881-5',source:'REACH Annex XVII',sourceType:'reach',region:'欧盟',dataType:'限制',result:'Entry 47 命中',value:'与皮肤接触的皮革制品：Cr(VI) < 3 mg/kg',version:'V2026.2',status:'已生效',lawKey:'xvii'}
];
/* CLP 行按当前系统日期从 Annex VI 已发布数据集生成；其他法规仍保留演示行。 */
function lawQueryAllRows(){return LAW_QUERY_STATIC_ROWS.concat(clpLawQueryProjection(clpSystemToday()));}
var LAW_LIBRARY_META={
  clp:{cycle:'随 ATP 发布复审',maintain:'ECHA ATP 包人工导入'},
  reach:{cycle:'半年检查；清单发布时复审',maintain:'ECHA Excel 人工导入'},
  cl:{cycle:'半年检查',maintain:'ECHA 批量分类数据人工导入'},
  cn:{cycle:'随公告增补复审',maintain:'应急管理部 PDF 解析导入'},
  zdhc:{cycle:'年度复审',maintain:'ZDHC 官网文件人工导入'}
};
(function(){
  var due={clp6:'2026-08-31','cn-danger':'2027-03-31','cl-inventory':'2027-02-02',
    'zdhc-mrsl':'2027-01-20','zdhc-waste':'2027-03-05','zdhc-inflow':'2027-07-10',
    xiv:'2027-05-22',xvii:'2027-06-03',svhc:'2027-06-26',rohs2:'2027-02-14',
    gb16483:'2027-01-12',gb30000:'2027-02-08',gb13690:'2026-09-30'};
  lawRows.forEach(function(r){
    var m=LAW_LIBRARY_META[r.listType]||LAW_LIBRARY_META.reach;
    r.reviewCycle=r.reviewCycle||m.cycle;
    r.lastReview=r.lastReview||(r.upd||'').slice(0,10)||'—';
    r.reviewDue=r.reviewDue||due[r.key]||'2027-06-30';
    r.latestVer=r.latestVer||r.ver;
  });
  var extra={Q004:{reviewDue:'2027-02-02',latestVersion:'2026-Q1'},Q005:{reviewDue:'2027-03-31',latestVersion:'2026 第1批增补'}};
  LAW_QUERY_STATIC_ROWS.forEach(function(r){
    var law=lawRows.find(function(x){return x.key===r.lawKey;})||{};
    var x=extra[r.id]||{};
    r.reviewDue=x.reviewDue||law.reviewDue||'2027-06-30';
    r.latestVersion=x.latestVersion||law.latestVer||r.version;
    r.scl=x.scl||'—';r.mFactor=x.mFactor||'—';r.ate=x.ate||'—';
  });
  var cn=lawRows.find(function(r){return r.key==='cn-danger';});
  if(cn)cn.latestVer='2026 第1批增补';
})();
function lawEvidence(r,isQuery){
  var current=r.version||r.ver,latest=r.latestVersion||r.latestVer||current;
  if(current!==latest)return {lv:'red',label:'需改版',tip:'来源库已有新版 '+latest+'；当前引用 '+current+' 尚未同步，SDS 需改版或人工确认不受影响'};
  if(isQuery&&r.sourceType==='cl')return {lv:'due',label:'需关注',tip:'C&L Inventory 为企业申报分类，不等同于官方统一分类，使用前需人工核对'};
  if(daysTo(r.reviewDue)<0)return {lv:'due',label:'待复审',tip:'已超出复审期（复审到期：'+r.reviewDue+'），需人工确认后继续使用'};
  return {lv:'green',label:'有效',tip:'引用为最新版本，且在复审期内（复审到期：'+r.reviewDue+'）'};
}
function lawEvidenceLamp(r,isQuery){var e=lawEvidence(r,isQuery);return '<span class="ev ev-'+e.lv+'" title="'+esc(e.tip)+'"><i></i>'+e.label+'</span>';}
function lawMaintenanceRoute(v){return {clp:'law:clp',reach:'law:reach',cl:'law:cl',cn:'law:cn',zdhc:'law:zdhc'}[v]||'law:reach';}
/* 法规类别（lawKey）筛选：REACH 法规库各 Tab 跳转动统一查询时按类别预置过滤。
   OEL 与运输法规库本期为占位页，不进入本筛选。 */
var LAW_KIND_OPTS=[
  ['clp6','CLP 附录 VI'],
  ['svhc','SVHC 候选清单'],
  ['xiv','Annex XIV 授权清单'],
  ['xvii','Annex XVII 限制清单'],
  ['cl-inventory','C&L Inventory'],
  ['cn-danger','国内危化品'],
  ['zdhc-mrsl','ZDHC MRSL']
];
function lawKindText(k){var o=LAW_KIND_OPTS.filter(function(x){return x[0]===k;})[0];return o?o[1]:k;}
function lawQueryRows(){
  var kw=($('lqKw').value||'').trim().toLowerCase(),src=$('lqSource').value,type=$('lqType').value,region=$('lqRegion').value,status=$('lqStatus').value;
  var lkEl=$('lqLaw'),lk=lkEl?lkEl.value:'';
  return lawQueryAllRows().filter(function(r){
    if(lk&&r.lawKey!==lk)return false;
    if(src&&r.sourceType!==src)return false;if(type&&r.dataType!==type)return false;if(region&&r.region!==region)return false;if(status&&r.status!==status)return false;
    return !kw||(r.cas+' '+r.name+' '+r.ec+' '+r.source+' '+r.result+' '+r.value).toLowerCase().indexOf(kw)>=0;
  });
}
function lawQuerySubstanceCard(rows){
  if(!rows.length)return '';
  var cas={};rows.forEach(function(r){cas[r.cas]=1;});
  if(Object.keys(cas).length!==1)return '';
  var r=rows[0],seen={},tags=rows.map(function(x){
    if(seen[x.source])return '';seen[x.source]=1;
    var cls={clp:'purple',reach:'blue',cl:'grey',cn:'orange',zdhc:'green'}[x.sourceType]||'grey';
    return '<span class="tag '+cls+'">'+esc(x.source)+'</span>';
  }).join(' ');
  return '<div class="card" style="margin-bottom:14px;padding:16px 18px"><div style="display:flex;align-items:flex-start;gap:18px;flex-wrap:wrap">'+
    '<div style="min-width:260px"><div class="muted" style="font-size:12px">查询物质</div><h3 style="margin:3px 0 5px">'+esc(r.name)+'</h3><span class="mono">CAS '+esc(r.cas)+'</span><span class="mono" style="margin-left:16px">EC '+esc(r.ec)+'</span></div>'+
    '<div style="flex:1;min-width:360px"><div style="font-size:13px;margin-bottom:8px"><b>共命中 '+rows.length+' 条记录</b>，覆盖 '+Object.keys(seen).length+' 个法规来源</div><div style="display:flex;gap:6px;flex-wrap:wrap">'+tags+'</div></div>'+
    '</div></div>';
}
function lawQueryRender(){
  var rows=lawQueryRows(),groups={};rows.forEach(function(r){groups[r.cas]=1;});
  $('lqKpi').innerHTML='<div class="kpi"><span>命中记录</span><b>'+rows.length+'</b><small>跨 5 类法规来源</small></div>'+
    '<div class="kpi"><span>命中物质</span><b>'+Object.keys(groups).length+'</b><small>按 CAS 号归并</small></div>'+
    '<div class="kpi"><span>待复核</span><b style="color:var(--orange)">'+rows.filter(function(r){return r.status==='待复核';}).length+'</b><small>暂不用于自动判定</small></div>'+
    '<div class="kpi"><span>需改版</span><b style="color:var(--red)">'+rows.filter(function(r){return lawEvidence(r,true).lv==='red';}).length+'</b><small>红灯 · 引用未同步</small></div>';
  $('lqSubstance').innerHTML=lawQuerySubstanceCard(rows);
  $('lqCount').textContent='共 '+rows.length+' 条命中记录';
  $('lqTable').innerHTML='<thead><tr><th style="width:110px">CAS 号</th><th style="width:130px">物质名称</th><th style="width:105px">EC 号</th><th style="width:150px">法规来源</th><th style="width:95px">证据灯</th><th style="width:110px">复审到期</th><th style="width:90px">地区</th><th style="width:110px">数据类型</th><th style="width:130px">管控结论</th><th>分类 / 限值 / 条件</th><th style="width:105px">版本</th><th style="width:130px">操作</th></tr></thead><tbody>'+
    (rows.length?rows.map(function(r){var cls={clp:'purple',reach:'blue',cl:'grey',cn:'orange',zdhc:'green'}[r.sourceType]||'grey';var ev=lawEvidence(r,true);return '<tr class="'+(ev.lv==='red'?'row-red':(ev.lv==='due'?'row-due':''))+'"><td class="mono">'+esc(r.cas)+'</td><td><b>'+esc(r.name)+'</b></td><td class="mono">'+esc(r.ec)+'</td><td><span class="tag '+cls+'">'+esc(r.source)+'</span></td><td>'+lawEvidenceLamp(r,true)+'</td><td>'+esc(r.reviewDue)+'</td><td>'+esc(r.region)+'</td><td>'+esc(r.dataType)+'</td><td>'+esc(r.result)+'</td><td>'+esc(r.value)+'</td><td class="mono">'+esc(r.version)+'</td><td><button class="btn-link" onclick="lawQueryView(\''+r.id+'\')">查看</button><button class="btn-link" onclick="showPage(\''+lawMaintenanceRoute(r.sourceType)+'\')">来源库</button></td></tr>';}).join(''):'<tr><td colspan="12" class="tbl-empty"><span class="big">⌕</span>没有匹配的法规记录</td></tr>')+'</tbody>';
}
function lawQueryClear(){['lqKw','lqLaw','lqSource','lqType','lqRegion','lqStatus'].forEach(function(id){var el=$(id);if(el)el.value='';});lawQueryRender();}
function lawQueryView(id){
  var r=lawQueryAllRows().find(function(x){return x.id===id;});if(!r)return;
  var law=lawRows.find(function(x){return x.key===r.lawKey;});
  var clp=r.sourceType==='clp'?'<div style="font-size:12.5px;font-weight:600;margin:16px 0 8px">CLP 官方 Annex VI 数据</div><dl class="desc-list" style="grid-template-columns:150px 1fr"><dt>来源与版本</dt><dd>'+esc(r.sourceClause)+' · '+esc(r.version)+'</dd><dt>SCL（特定浓度限值）</dt><dd>'+esc(r.scl)+'</dd><dt>M 因子</dt><dd>'+esc(r.mFactor)+'</dd><dt>ATE（急性毒性估计值）</dt><dd>'+esc(r.ate)+'</dd></dl>':'';
  openModal({title:'法规命中详情 · '+r.name,width:700,body:'<dl class="desc-list" style="grid-template-columns:120px 1fr 120px 1fr">'+
    '<dt>物质名称</dt><dd>'+esc(r.name)+'</dd><dt>CAS 号</dt><dd class="mono">'+esc(r.cas)+'</dd><dt>EC 号</dt><dd class="mono">'+esc(r.ec)+'</dd><dt>法规来源</dt><dd>'+esc(r.source)+'</dd><dt>监管地区</dt><dd>'+esc(r.region)+'</dd><dt>数据类型</dt><dd>'+esc(r.dataType)+'</dd><dt>管控结论</dt><dd>'+esc(r.result)+'</dd><dt>当前版本</dt><dd>'+esc(r.version)+'</dd><dt>复审到期</dt><dd>'+esc(r.reviewDue)+'</dd><dt>证据状态</dt><dd>'+lawEvidenceLamp(r,true)+'</dd><dt>分类 / 限值 / 条件</dt><dd style="grid-column:span 3">'+esc(r.value)+'</dd><dt>维护状态</dt><dd><span class="tag '+TAG_CLS(r.status)+' dot-tag">'+esc(r.status)+'</span></dd><dt>最近维护</dt><dd>'+esc(law?law.upd:'—')+'</dd><dt>人工验证人</dt><dd>'+esc(law?law.verifier:'—')+'</dd></dl>'+clp+'<div class="notice grey" style="margin-top:14px"><div class="ni">§</div><div>查询页证据灯只读；上传新版本、版本 diff 与确认复审请进入来源法规库维护页。</div></div>',footer:'<button class="btn" onclick="closeModal();showPage(\''+lawMaintenanceRoute(r.sourceType)+'\')">打开来源库</button><button class="btn primary" onclick="closeModal()">关闭</button>'});
}
function renderLawQuery(params){
  /* params.lawKey：由 REACH 法规库各 Tab 跳转带入，预置「法规类别」筛选 */
  var preset=((params||{}).lawKey)||'';
  $('pageHost').innerHTML='<div class="sds-scope">'+sdsHead('','法规统一查询','按 CAS、物质名称或 EC 号一次检索全部法规库，无需预先判断数据来自哪个法规来源。','<button class="btn" onclick="toast(\'查询结果已导出（演示）\',\'ok\')">导出结果</button>','','law-query')+
    '<div class="notice info" style="margin-bottom:14px"><div class="ni">i</div><div><b>统一查询、分库维护：</b>本页证据灯只读；上传新版本、版本 diff 与确认复审仍在各法规库维护页完成。</div></div><div class="kpi-row" id="lqKpi"></div><div id="lqSubstance"></div><div class="card"><div class="toolbar" style="flex-wrap:wrap"><div class="search" style="width:250px"><i class="si">⌕</i><input id="lqKw" placeholder="CAS / 物质名称 / EC 号" oninput="lawQueryRender()"></div><select class="ctrl" id="lqLaw" style="width:175px" onchange="lawQueryRender()"><option value="">全部法规类别</option>'+LAW_KIND_OPTS.map(function(o){return '<option value="'+o[0]+'"'+(preset===o[0]?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select><select class="ctrl" id="lqSource" style="width:150px" onchange="lawQueryRender()"><option value="">全部法规来源</option><option value="clp">CLP 附录 VI</option><option value="reach">REACH</option><option value="cl">C&amp;L Inventory</option><option value="cn">国内危化品分类</option><option value="zdhc">ZDHC MRSL</option></select><select class="ctrl" id="lqType" style="width:150px" onchange="lawQueryRender()"><option value="">全部数据类型</option><option>统一分类</option><option>限制</option><option>授权</option><option>高关注物质</option><option>企业申报分类</option><option>危化品分类</option><option>制造限用</option></select><select class="ctrl" id="lqRegion" style="width:120px" onchange="lawQueryRender()"><option value="">全部地区</option><option>欧盟</option><option>中国</option><option>行业标准</option></select><select class="ctrl" id="lqStatus" style="width:120px" onchange="lawQueryRender()"><option value="">全部状态</option><option>已生效</option><option>待复核</option></select><button class="btn sm" onclick="lawQueryClear()">重置</button><div class="grow"></div><span id="lqCount" class="muted"></span></div><div class="tbl-wrap"><table class="tbl" id="lqTable" style="min-width:1700px"></table></div></div></div>';
  lawQueryRender();
}

/* 分库维护：证据灯、复审信息与版本差异操作。 */
function lawScopedRows(){
  var scope=lawTypeFilter?(Array.isArray(lawTypeFilter)?lawTypeFilter:[lawTypeFilter]):null;
  return lawRows.filter(function(r){return !scope||scope.indexOf(r.listType)>=0;});
}
function lawReviewInfo(){
  var el=$('lawReviewInfo');if(!el)return;
  var rows=lawScopedRows(),type=Array.isArray(lawTypeFilter)?lawTypeFilter[0]:lawTypeFilter;
  var meta=LAW_LIBRARY_META[type]||LAW_LIBRARY_META.reach;
  var lasts=rows.map(function(r){return r.lastReview;}).filter(function(x){return x&&x!=='—';}).sort();
  var dues=rows.map(function(r){return r.reviewDue;}).filter(function(x){return x&&x!=='—';}).sort();
  el.innerHTML='<div class="kpi"><span>维护方式</span><b style="font-size:15px">'+esc(meta.maintain)+'</b><small>专员定期下载维护</small></div>'+
    '<div class="kpi"><span>复审周期</span><b style="font-size:17px">'+esc(meta.cycle)+'</b><small>每条清单均记录周期</small></div>'+
    '<div class="kpi"><span>上次复审时间</span><b style="font-size:17px">'+esc(lasts.length?lasts[lasts.length-1]:'—')+'</b><small>最近一次人工确认</small></div>'+
    '<div class="kpi"><span>下次建议复审时间</span><b style="font-size:17px;color:var(--orange)">'+esc(dues.length?dues[0]:'—')+'</b><small>按最早到期清单提示</small></div>';
}
function lawRender(){
  var kw=($('lawKw').value||'').trim().toLowerCase(),st=$('lawStatus').value;
  var f=lawScopedRows().filter(function(r){
    if(st&&r.status!==st)return false;
    return !kw||(r.name+r.org+r.ver).toLowerCase().indexOf(kw)>=0;
  });
  var all=lawScopedRows();
  $('lawKpi').innerHTML='<div class="kpi"><span>本库清单</span><b>'+all.length+'</b><small>人工导入并验证</small></div>'+
    '<div class="kpi"><span>绿灯</span><b style="color:var(--green)">'+all.filter(function(r){return lawEvidence(r,false).lv==='green';}).length+'</b><small>最新且在复审期</small></div>'+
    '<div class="kpi"><span>黄灯</span><b style="color:#d48806">'+all.filter(function(r){return lawEvidence(r,false).lv==='due';}).length+'</b><small>需要确认复审</small></div>'+
    '<div class="kpi"><span>红灯</span><b style="color:var(--red)">'+all.filter(function(r){return lawEvidence(r,false).lv==='red';}).length+'</b><small>存在新版未同步</small></div>';
  lawReviewInfo();
  var tp=Math.max(1,Math.ceil(f.length/PAGE_SIZE));if(lawPage>tp)lawPage=tp;
  var rows=f.slice((lawPage-1)*PAGE_SIZE,lawPage*PAGE_SIZE);
  $('lawTable').innerHTML='<thead><tr><th>法规名称</th><th style="width:185px">发布机构</th><th style="width:115px">当前 / 最新版本</th><th style="width:130px">复审周期</th><th style="width:110px">上次复审</th><th style="width:110px">复审到期</th><th style="width:95px">证据灯</th><th style="width:255px">操作</th></tr></thead><tbody>'+
    (rows.length?rows.map(function(r){var e=lawEvidence(r,false);var review=e.lv==='due'?'<button class="btn-link" onclick="lawConfirmReview(\''+r._id+'\')">确认复审</button>':'';var diff=e.lv==='red'?'<button class="btn-link" onclick="lawVersionDiff(\''+r._id+'\')">查看新版本 diff</button>':'';return '<tr class="'+(e.lv==='red'?'row-red':(e.lv==='due'?'row-due':''))+'"><td><b>'+esc(r.name)+'</b><span class="sub">清单条目 '+r.items+' 条 · '+esc(r.verifier)+'</span></td><td>'+esc(r.org)+'</td><td><span class="mono">'+esc(r.ver)+'</span><span class="sub">最新：'+esc(r.latestVer)+'</span></td><td>'+esc(r.reviewCycle)+'</td><td>'+esc(r.lastReview)+'</td><td>'+esc(r.reviewDue)+'</td><td>'+lawEvidenceLamp(r,false)+'</td><td class="acts"><button class="btn-link" onclick="lawOpenDetail(\''+r._id+'\')">查看详情</button>'+review+diff+'<button class="btn-link" onclick="lawUpload(\''+r._id+'\')">上传新版本</button></td></tr>';}).join(''):'<tr><td colspan="8" class="tbl-empty"><span class="big">§</span>没有符合条件的法规清单</td></tr>')+'</tbody>';
  $('lawPager').innerHTML=pagerHtml(f.length,lawPage,tp,'lawPageGo');
}
function lawConfirmReview(id){
  var r=lawRows.find(function(x){return x._id===id;});if(!r)return;
  r.lastReview=todayStr();r.reviewDue=daysFromNow(r.listType==='zdhc'?365:180);r.status='已生效';r.verifier='法规专员 · 当前用户';
  LAW_QUERY_STATIC_ROWS.filter(function(x){return x.lawKey===r.key;}).forEach(function(x){x.reviewDue=r.reviewDue;x.status='已生效';});
  lawRender();toast('复审已确认，证据灯已更新为绿色','ok');
}
function lawVersionDiff(id){
  var r=lawRows.find(function(x){return x._id===id;});if(!r)return;
  openModal({title:'版本对比 · '+r.name,width:800,body:'<div class="notice warn" style="margin-bottom:14px"><div class="ni">!</div><div>来源库已发布新版本，当前引用尚未同步。请核对差异并执行影响分析。</div></div>'+
    '<div class="stat-row"><div class="stat"><b>'+esc(r.ver)+'</b><span>当前引用版本</span></div><div class="stat" style="border-color:var(--red-b);background:var(--red-bg)"><b style="color:var(--red)">'+esc(r.latestVer)+'</b><span>来源库最新版本</span></div><div class="stat"><b>6</b><span>关联已发布 SDS</span></div></div>'+
    '<div class="tbl-wrap" style="border:1px solid var(--line);border-radius:7px"><table class="tbl"><thead><tr><th style="width:110px">变化类型</th><th>差异内容</th><th style="width:150px">建议动作</th></tr></thead><tbody><tr><td><span class="tag red">新增</span></td><td>新增受管控物质及分类条目 12 项</td><td>重新匹配组分</td></tr><tr><td><span class="tag orange">变更</span></td><td>4 项浓度限值或适用条件发生变化</td><td>重算 SDS 分类</td></tr><tr><td><span class="tag grey">删除</span></td><td>2 项旧版说明被新公告替代</td><td>更新法规引用</td></tr></tbody></table></div>',
    footer:'<button class="btn" onclick="closeModal();lawImpact(\''+r._id+'\')">查看影响分析</button><button class="btn primary" onclick="closeModal();lawUpload(\''+r._id+'\')">上传并同步新版本</button>'});
}
function renderLawPage(types,title,desc,noteKey){
  lawTypeFilter=types;lawPage=1;
  var noteTxt=esc(desc)+'<div class="np-n"><b>清单维护与生效</b>证据灯在本页可处理：黄灯确认复审，红灯查看新版本差异并同步。</div>';
  $('pageHost').innerHTML='<div class="sds-scope">'+sdsHead('',esc(title),noteTxt,'<button class="btn" onclick="toast(\'已导出法规台账（演示）\',\'ok\')">导出台账</button><button class="btn primary" onclick="lawUpload(null)">＋ 新增法规清单</button>','',noteKey)+
    '<div class="kpi-row" id="lawReviewInfo"></div><div class="kpi-row" id="lawKpi"></div><div class="card"><div class="toolbar"><div class="search"><i class="si">⌕</i><input id="lawKw" placeholder="搜索法规名称 / 发布机构…" oninput="lawRender()"></div><select class="ctrl" id="lawStatus" style="width:160px" onchange="lawRender()"><option value="">全部数据状态</option><option>已生效</option><option>待复核</option><option>已归档</option></select><div class="grow"></div><span class="tag orange dot-tag">人工维护 · 合规人员负责</span></div><div class="tbl-wrap"><table class="tbl" id="lawTable" style="min-width:1420px"></table></div><div class="pager" id="lawPager"></div></div></div>';
  lawRender();
}
function lawFinish(){
  if(!$('lwOk').checked){toast('请先勾选人工核对确认项','warn');return;}
  var v=$('lwVerifier').value.trim();if(!v){toast('请填写人工验证人','warn');return;}
  if(_lawCur){_lawCur.ver=_lawTmp.ver;_lawCur.latestVer=_lawTmp.ver;_lawCur.eff=_lawTmp.eff;_lawCur.upd=nowStr();_lawCur.lastReview=todayStr();_lawCur.reviewDue=daysFromNow(365);_lawCur.status='已生效';_lawCur.verifier=v;_lawCur.items+=12;LAW_QUERY_STATIC_ROWS.filter(function(x){return x.lawKey===_lawCur.key;}).forEach(function(x){x.version=_lawCur.ver;x.latestVersion=_lawCur.ver;x.reviewDue=_lawCur.reviewDue;x.status='已生效';});}
  else{var type=Array.isArray(lawTypeFilter)?lawTypeFilter[0]:lawTypeFilter||'reach';var m=LAW_LIBRARY_META[type]||LAW_LIBRARY_META.reach;lawRows.unshift({_id:sdsUid(),key:'xvii',name:_lawTmp.name,org:_lawTmp.org,eff:_lawTmp.eff,ver:_lawTmp.ver,latestVer:_lawTmp.ver,upd:nowStr(),lastReview:todayStr(),reviewDue:daysFromNow(365),reviewCycle:m.cycle,status:'已生效',items:128,verifier:v,listType:type});}
  closeModal();lawPage=1;lawRender();toast('新版本已人工确认入库并生效','ok');
}

/* 法规物质明细统一子页面：各库保留自己的原始列，不展示统计卡片。 */
var lawDetailPage=1;
function lawDetailCurrent(){var id=(curParams||{}).id;return lawRows.find(function(r){return r._id===id;});}
function lawOpenDetail(id){showPage('law:detail',{id:id});}
function lawDetailBack(){var r=lawDetailCurrent();showPage(lawMaintenanceRoute(r?r.listType:'reach'));}
function lawDetailFiltered(){
  var r=lawDetailCurrent(),d=r&&(LAW_DETAIL[r.key]||null);if(!d)return [];
  var kw=($('lawDetailKw').value||'').trim().toLowerCase(),field=+$('lawDetailField').value,complete=$('lawDetailComplete').value;
  return d.rows.map(function(row,index){return {row:row,index:index};}).filter(function(x){
    var values=field<0?x.row:[x.row[field]];
    if(kw&&values.join(' ').toLowerCase().indexOf(kw)<0)return false;
    var hasGap=x.row.some(function(v){return !v||v==='—';});
    return !complete||(complete==='complete'?!hasGap:hasGap);
  });
}
function lawDetailRender(){
  var r=lawDetailCurrent(),d=r&&(LAW_DETAIL[r.key]||null);if(!r||!d)return;
  var filtered=lawDetailFiltered(),tp=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));if(lawDetailPage>tp)lawDetailPage=tp;
  var rows=filtered.slice((lawDetailPage-1)*PAGE_SIZE,lawDetailPage*PAGE_SIZE);
  $('lawDetailCount').textContent='共 '+filtered.length+' 条匹配记录';
  $('lawDetailTable').innerHTML='<thead><tr>'+d.cols.map(function(c){return '<th>'+esc(c)+'</th>';}).join('')+'<th style="width:70px">操作</th></tr></thead><tbody>'+
    (rows.length?rows.map(function(x){return '<tr>'+x.row.map(function(v){return '<td>'+esc(v)+'</td>';}).join('')+'<td><button class="btn-link" onclick="lawEntryView('+x.index+')">查看</button></td></tr>';}).join(''):'<tr><td colspan="'+(d.cols.length+1)+'" class="tbl-empty"><span class="big">⌕</span>没有匹配的物质明细</td></tr>')+'</tbody>';
  $('lawDetailPager').innerHTML=pagerHtml(filtered.length,lawDetailPage,tp,'lawDetailPageGo');
}
function lawDetailPageGo(p){lawDetailPage=p;lawDetailRender();}
function lawDetailClear(){lawDetailPage=1;$('lawDetailKw').value='';$('lawDetailField').value='-1';$('lawDetailComplete').value='';lawDetailRender();}
function lawEntryView(index){
  var r=lawDetailCurrent(),d=r&&(LAW_DETAIL[r.key]||null),row=d&&d.rows[index];if(!row)return;
  openModal({title:'物质明细 · '+(row[1]||row[0]),width:760,body:'<dl class="desc-list" style="grid-template-columns:150px 1fr">'+d.cols.map(function(c,i){return '<dt>'+esc(c)+'</dt><dd>'+esc(row[i])+'</dd>';}).join('')+'</dl><div class="notice grey" style="margin-top:14px"><div class="ni">§</div><div>数据来源：'+esc(r.name)+' · '+esc(r.ver)+'；复审到期 '+esc(r.reviewDue)+'。</div></div>',footer:'<button class="btn primary" onclick="closeModal()">关闭</button>'});
}
function renderLawDetail(params){
  var r=lawRows.find(function(x){return x._id===(params||{}).id;}),d=r&&(LAW_DETAIL[r.key]||null);
  if(!r||!d){$('pageHost').innerHTML=placeholder('⌕','未找到法规明细','请从法规库维护页面重新进入。');return;}
  lawDetailPage=1;highlightSidebar(lawMaintenanceRoute(r.listType));
  $('pageHost').innerHTML='<div class="sds-scope">'+sdsHead('',esc(r.name),'当前版本 '+esc(r.ver)+' · '+esc(r.org),'<button class="btn" onclick="lawDetailBack()">返回法规库</button><button class="btn" onclick="toast(\'明细已导出（演示）\',\'ok\')">导出明细</button>')+
    '<div class="card"><div class="toolbar" style="flex-wrap:wrap"><div class="search" style="width:280px"><i class="si">⌕</i><input id="lawDetailKw" placeholder="搜索物质名称 / CAS / EC / 分类…" oninput="lawDetailPage=1;lawDetailRender()"></div><select class="ctrl" id="lawDetailField" style="width:170px" onchange="lawDetailPage=1;lawDetailRender()"><option value="-1">全部字段</option>'+d.cols.map(function(c,i){return '<option value="'+i+'">'+esc(c)+'</option>';}).join('')+'</select><select class="ctrl" id="lawDetailComplete" style="width:145px" onchange="lawDetailPage=1;lawDetailRender()"><option value="">全部完整性</option><option value="complete">信息完整</option><option value="gap">存在缺失项</option></select><button class="btn sm" onclick="lawDetailClear()">重置</button><div class="grow"></div><span class="tag blue">'+esc(r.ver)+'</span><span id="lawDetailCount" class="muted"></span></div><div class="tbl-wrap"><table class="tbl" id="lawDetailTable" style="min-width:'+Math.max(980,d.cols.length*135)+'px"></table></div><div class="pager" id="lawDetailPager"></div></div></div>';
  lawDetailRender();
}

regPage('law:query',{title:'法规统一查询',crumb:['合规管理','法规统一查询'],render:renderLawQuery});
regPage('law:detail',{title:'法规物质明细',crumb:function(){var r=lawDetailCurrent();return ['合规管理','法规库维护',r?r.name:'物质明细'];},render:renderLawDetail});
function regLawMaintenance(route,type,title,desc,note){regPage(route,{title:title,crumb:['合规管理','法规库维护',title],render:function(){renderLawPage(type,title,desc,note);}});}
/* law:clp 已升级为 CLP 法规库统一页面（2026-09-18），注册移交 23z6-js-clp.js */
/* law:reach 已升级为 REACH 法规库统一页面（2026-09-18），注册移交 23z7-js-reach.js */
regLawMaintenance('law:cl','cl','C&L Inventory','维护 ECHA 分类与标签清单的批量分类申报数据。','law-cl');
regLawMaintenance('law:cn','cn','国内危化品法规库','维护应急管理部危险化学品目录、分类信息表及相关国家标准。','law-cn');
regLawMaintenance('law:zdhc','zdhc','ZDHC MRSL','维护 ZDHC MRSL、废水排放限值与输入流清单。','law-zdhc-maint');
