/* ==================================================================
   [22z] 流程型模块 · 流程引导
   只组织现有真实页面与既有动作，不复制业务页面。
   ================================================================== */

function guideNode(step,title,desc,route,tags){
  var inner='<span class="flow-node-step">'+esc(step)+'</span><span class="flow-node-title">'+esc(title)+'</span>'+
    (desc?'<span class="flow-node-desc">'+esc(desc)+'</span>':'')+
    ((tags&&tags.length)?'<span class="flow-node-tags">'+tags.map(function(t){return '<span class="flow-node-tag">'+esc(t)+'</span>';}).join('')+'</span>':'');
  if(route)return '<button type="button" class="flow-node" onclick="'+route+'" title="点击前往对应页面">'+inner+'</button>';
  return '<div class="flow-node is-note" title="'+esc(desc||'此步骤没有独立页面')+'">'+inner+'</div>';
}
function guideLine(nodes){
  return '<div class="flow-guide-line">'+nodes.map(function(n,i){return (i?'<span class="flow-guide-arrow" aria-hidden="true">→</span>':'')+n;}).join('')+'</div>';
}
function guideCard(title,sub,nodes,action){
  return '<section class="card flow-guide-card"><div class="card-hd"><h3>'+esc(title)+(sub?'<span class="sub">'+esc(sub)+'</span>':'')+'</h3></div>'+
    '<div class="flow-guide-body">'+guideLine(nodes)+(action?'<div class="flow-guide-actions">'+action+'</div>':'')+'</div></section>';
}
function guidePage(title,intro,body){
  $('pageHost').innerHTML='<div class="page-hd"><div class="t"><h1>'+esc(title)+'</h1><div class="page-sub">从这里了解完整业务路径，并进入对应功能页面</div></div></div>'+
    '<div class="flow-guide-intro">'+intro+'</div><div class="flow-guide-list">'+body+'</div>';
}
function guideOpenNormalNew(){showPage('exp:list');setTimeout(function(){openNewNormalExp();},80);}
function guideOpenDoeNew(){showPage('exp:doe');setTimeout(function(){openWizardNew();},80);}
function guideOpenDoePlan(){
  showPage('exp:doe');
  setTimeout(function(){var s=doeSchemes.find(function(x){return x.status==='待下发';})||doeSchemes[0];if(s)viewSchemePlan(s.id);},80);
}
function guideOpenSummaryDetail(){var s=expSummaries&&expSummaries[0];if(s)showPage('exp:sum-detail',{id:s.id});else showPage('exp:sum');}
function guideOpenSummaryNew(){showPage('exp:sum');setTimeout(function(){openNewSummary();},80);}

regPage('exp:guide',{
  title:'实验管理流程引导',crumb:['实验管理','流程引导'],
  render:function(){
    var normal=guideCard('普通实验','适合按既定工序完成单次或平行实验',[
      guideNode('01','新建实验','在实验列表创建空白实验或引用实验模板。',"guideOpenNormalNew()",['系统页面']),
      guideNode('02','执行实验','实验员按工序和计划投料在线下完成实验。',null,['线下操作']),
      guideNode('03','录入数据','在实验详情维护工序、过程测试、成品检测与结论。',"showPage('exp:detail',{id:'EXP-2026-0418'})",['实验详情']),
      guideNode('04','查看分析报告','从实验分析页查看已完成实验的分析结果。',"showPage('exp:analysis')",['统计分析'])
    ],'<button class="btn btn-primary" onclick="guideOpenNormalNew()">新建实验</button>');
    var doe=guideCard('DOE 实验','一个设计方案对应一条执行实验，内部集中管理多组试验',[
      guideNode('01','新建方案','进入 DOE 实验设计并创建方案。',"guideOpenDoeNew()",['DOE 设计']),
      guideNode('02','配置因素与生成计划','在设计向导中维护因素、水平、响应并生成矩阵。',null,['向导内完成']),
      guideNode('03','确认下发','查看待下发方案的试验矩阵并确认生成执行实验。',"guideOpenDoePlan()",['方案计划']),
      guideNode('04','各组执行录入','从实验列表进入 DOE 执行实验，批量录入全部试验组结果。',"showPage('exp:list')",['批量录入']),
      guideNode('05','DOE 分析报告','全部响应数据完成后，在实验分析中统一建模。',"showPage('exp:analysis')",['方案级分析'])
    ],'<button class="btn btn-primary" onclick="guideOpenDoeNew()">新建 DOE 方案</button>');
    var summary=guideCard('多组实验总结','把具有可比性的已完成实验放在同一报告中横向比较',[
      guideNode('01','选择多组已完成实验','在实验分析与总结页筛选并选择至少两组实验。',"showPage('exp:sum')",['多组选择']),
      guideNode('02','生成对比总结报告','查看原料、工艺、测试与结论的横向对比。',"guideOpenSummaryDetail()",['总结详情'])
    ],'<button class="btn btn-primary" onclick="guideOpenSummaryNew()">新建总结报告</button>');
    guidePage('流程引导','实验管理覆盖普通实验执行、DOE 多组试验设计与批量录入，以及多组已完成实验的对比总结。',normal+doe+summary);
  }
});

regPage('proj:guide',{
  title:'项目管理流程引导',crumb:['项目管理','流程引导'],
  render:function(){
    var card=guideCard('研发项目主流程','从需求进入研发立项，在项目详情持续维护阶段、实验和文档',[
      guideNode('01','需求','客户需求或自研需求确认后，转入项目立项。',null,['跨模块提示','客户需求','自研需求']),
      guideNode('02','新增项目','维护完整项目信息并创建研发项目。',"showPage('proj:new')",['项目立项']),
      guideNode('03','项目执行','在研发项目详情维护阶段、关联实验、总结与文档。',"showPage('proj:list')",['研发项目管理']),
      guideNode('04','验收归档','阶段完成后验收项目并归档交付资料。',null,['项目内完成'])
    ],'<button class="btn btn-primary" onclick="showPage(\'proj:new\')">新增项目</button>');
    guidePage('流程引导','项目管理承接已确认的业务或研发需求，并贯穿立项、研发执行、阶段跟踪与验收归档。',card);
  }
});

function regulationCards(){
  var rows=[
    ['CLP 附录 VI','ECHA 官网；有反爬，只能由专员人工下载 ATP 包。',['主数据 + History','上传导入','版本链 diff']],
    ['REACH 限制 / 授权清单','ECHA 官网；更新频率较低，建议半年至年度检查。',['人工下载 Excel','上传导入']],
    ['C&L Inventory','ECHA 官网提供欧盟批量分类数据。',['人工下载','批量导入']],
    ['国内危化品分类信息表','应急管理部官网 mem.gov.cn；目录随公告增补。',['人工下载 PDF','系统解析导入']],
    ['ZDHC MRSL','ZDHC 官网发布的制造限用物质清单。',['人工下载','上传导入']]
  ];
  return '<div class="flow-maint-title">各法规库维护口径</div><div class="flow-maint-grid">'+rows.map(function(r){return '<article class="flow-reg-card"><h4>'+esc(r[0])+'</h4><div class="flow-reg-source">'+esc(r[1])+'</div><div class="flow-node-tags">'+r[2].map(function(t){return '<span class="flow-node-tag">'+esc(t)+'</span>';}).join('')+'</div></article>';}).join('')+'</div>';
}
regPage('comp:guide',{
  title:'合规管理流程引导',crumb:['合规管理','流程引导'],
  render:function(){
    var sds=guideCard('SDS 编写','从可信组分数据与适用法规生成、审核并发布 SDS',[
      guideNode('01','维护组分与 CAS','先在基础数据中保证组分身份、CAS 与分类参数准确。',null,['跨模块提示','组分基础信息']),
      guideNode('02','查询法规','按物质或 CAS 一次查询 ZDHC、CLP、REACH 与国内法规命中。',"showPage('law:query')",['统一查询']),
      guideNode('03','生成 SDS 草稿','通过 SDS 生成向导汇集数据、判定分类并生成 16 章草案。',"showPage('sds:wizard')",['生成向导']),
      guideNode('04','审核发布','在 SDS 文档列表跟踪审核、版本和发布状态。',"showPage('sds:list')",['文档列表'])
    ],'<button class="btn btn-primary" onclick="showPage(\'sds:wizard\')">新建 SDS</button>');
    var law='<section class="card flow-guide-card"><div class="card-hd"><h3>法规库维护 <span class="sub">明确数据来源、维护责任与版本变化处理</span></h3></div><div class="flow-guide-body">'+guideLine([
      guideNode('01','官网人工下载','法规专员按复审周期从各法规官网取得正式文件。',null,['线下操作','官网来源']),
      guideNode('02','上传导入','进入对应法规库维护页使用批量导入。',"showPage('law:reach')",['分库维护']),
      guideNode('03','系统解析与版本比对','系统解析文件并对新旧版本执行差异比对。',null,['系统自动','版本 diff']),
      guideNode('04','影响分析','查看新版法规影响的在用物质与已发布 SDS。',"showPage('law:query')",['跨库影响分析'])
    ])+regulationCards()+'<div class="notice warn flow-guide-alert"><div class="ni">!</div><div><b>维护模式：</b>法规库采用“专员定期下载维护”，系统不支持自动联网更新；法规超过复审期时，SDS 编写页面会以黄色或红色状态灯提醒。</div></div><div class="flow-guide-actions"><button class="btn" onclick="showPage(\'law:query\')">统一查询</button><button class="btn btn-primary" onclick="showPage(\'law:reach\')">维护法规库</button></div></div></section>';
    guidePage('流程引导','合规管理以受控组分数据和法规库为基础，完成 SDS 编写发布，并由法规专员持续维护法规版本。',sds+law);
  }
});
