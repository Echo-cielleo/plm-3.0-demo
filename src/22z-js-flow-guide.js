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
    ['CLP 附录 VI · 统一分类','ECHA 官网；有反爬，只能由专员人工下载 ATP 包。',['主数据 + History','导入向导演示','版本差异示例']],
    ['REACH 限制 / 授权 / SVHC','ECHA 官网；SVHC 候选清单约每半年增补一批，三份清单更新并不同步。',['Annex XVII 限制','Annex XIV 授权','SVHC 候选']],
    ['RoHS 限用物质','欧盟 Directive 2011/65/EU Annex II，经 (EU) 2015/863 修订后共 10 类。',['人工下载','清单导入']],
    ['国内危化品法规（目录 + 进出口限制）','应急管理部 mem.gov.cn 与商务部禁限公告；含危化品目录、禁止进出口货物目录、严格限制进出口有毒化学品目录，各自随公告增补。',['危化品目录','禁止进出口','严格限制进出口']],
    ['ZDHC MRSL','ZDHC 官网发布的制造限用物质清单。',['人工下载','导入向导演示']],
    ['职业接触限值 OEL','欧盟 IOELV 与 GBZ 2.1-2019 官方限值表；按长期（8h TWA）/ 短期 / 上限三个槽位收录。',['多数据源','限值查询']],
    ['C&L Inventory','ECHA 官网提供的欧盟批量分类数据；由企业自行申报汇总，不等同于官方分类结论，使用前需人工核对。',['人工下载','申报汇总 · 需核对']]
  ];
  return '<div class="flow-maint-title">各法规库维护口径</div><div class="flow-maint-grid">'+rows.map(function(r){return '<article class="flow-reg-card"><h4>'+esc(r[0])+'</h4><div class="flow-reg-source">'+esc(r[1])+'</div><div class="flow-node-tags">'+r[2].map(function(t){return '<span class="flow-node-tag">'+esc(t)+'</span>';}).join('')+'</div></article>';}).join('')+'</div>';
}
/* 法规统一查询：单页一次性操作（检索、切维度、看结果、开详情全在 law:query 一页内），
   因此不画成编号步骤，改为「检索入口 + 查询维度」形态。 */
function lawQueryFlowCard(){
  var dims=[
    ['GHS 分类',['危险类别 · H 代码','象形图 · 警示词']],
    ['名录清单',['是否列入 · 条目编号','阈值 · 用途 · 豁免']],
    ['职业接触限值 OEL',['欧盟 / 中国 各一套数据集','长期 / 短期 / 上限槽位']]
  ];
  return '<section class="card flow-guide-card"><div class="card-hd"><h3>法规统一查询 <span class="sub">按 CAS、物质名称或 EC 号查看某一物质在各法规中的列入情况</span></h3></div>'
    +'<div class="flow-guide-body">'
      +'<div class="flow-lq-entry">输入 CAS 号 / 中英文名称 / EC 号，一次检索全部已接入法规库。</div>'
      +'<div class="flow-dim-title">查询维度 · 切换页签选择，三者互不替代</div>'
      +'<div class="flow-dim-grid">'+dims.map(function(d){
        return '<article class="flow-dim-card"><h4>'+esc(d[0])+'</h4>'+d[1].map(function(l){return '<div class="flow-dim-line">'+esc(l)+'</div>';}).join('')+'</article>';
      }).join('')+'</div>'
      +'<div class="flow-guide-actions"><button class="btn btn-primary" onclick="showPage(\'law:query\')">打开统一查询</button></div>'
    +'</div></section>';
}
regPage('comp:guide',{
  title:'合规管理流程引导',crumb:['合规管理','流程引导'],
  render:function(){
    var sds=guideCard('SDS 编写','系统按配方的组分与浓度自动匹配法规、计算分类并填充文档',[
      guideNode('01','选择组分并录入浓度','从组分库勾选或从实验配方引入，CAS 号与物质名称由组分基础数据自动带入；编写人只需录入各组分浓度，核对后冻结配方。',"showPage('sds:wizard')",['生成向导','自动带入 CAS']),
      guideNode('02','自动匹配法规库','系统按组分 CAS 自动比对 CLP、REACH、ZDHC、RoHS 等法规库是否命中，再按加和法算出混合物分类与 H/P 码。',null,['系统自动','名单匹配','加和法']),
      guideNode('03','生成 16 章草案','把受限结论、分类结果与标签要素填入模板，自动产出 16 章草案。',null,['自动填充']),
      guideNode('04','人工补充未匹配内容','系统没有匹配到、或法规库缺数据的章节与条目，由编写人逐项补齐并核对来源。',null,['人工补齐']),
      guideNode('05','审核发布','在 SDS 文档列表跟踪审核、版本和发布状态。',"showPage('sds:list')",['文档列表'])
    ],'<button class="btn btn-primary" onclick="showPage(\'sds:wizard\')">新建 SDS</button>');
    var law='<section class="card flow-guide-card"><div class="card-hd"><h3>法规库维护 <span class="sub">明确数据来源、维护责任与版本变化处理</span></h3></div><div class="flow-guide-body">'+guideLine([
      guideNode('01','官网人工下载','法规专员按复审周期从各法规官网取得正式文件。',null,['线下操作','官网来源']),
      guideNode('02','导入向导演示','进入对应法规库维护页查看导入步骤；原型不解析真实上传文件。',"showPage('law:reach')",['分库维护']),
      guideNode('03','核对版本差异示例','当前差异内容为演示数据，正式使用须由法规专员核对。',null,['人工核对','示例 diff'])
    ])+regulationCards()+'<div class="notice warn flow-guide-alert"><div class="ni">!</div><div><b>维护模式：</b>法规库采用“专员定期下载维护”，系统不支持自动联网更新；法规超过复审期时，在统一查询页与 SDS 文档列表标为“待复审”；引用的不是最新版本时标为“需改版”。状态只描述语义、不用颜色区分。</div></div><div class="flow-guide-actions"><button class="btn" onclick="showPage(\'law:query\')">统一查询</button><button class="btn btn-primary" onclick="showPage(\'law:reach\')">维护法规库</button></div></div></section>';
    guidePage('流程引导','合规管理有两条并列主线：SDS 编写由系统按配方的组分与浓度自动匹配法规、计算分类并填充文档；法规统一查询供人工随时查阅某一物质在各法规中的列入情况，两者互不为上下游。法规库版本由法规专员定期下载维护。',sds+lawQueryFlowCard()+law);
  }
});
