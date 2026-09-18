/* ==================================================================
   [23z8] 合规管理 · 法规条目页（RoHS 限用物质）与法规库占位页（运输）
   ------------------------------------------------------------------
   需求口径（Cayla 2026-09-18）：
   · RoHS 不再与 REACH 合并（原「REACH / RoHS」维护页拆开）：
     law:rohs 挂在「受限物质管理」下，**不做空占位页**——受限物质只有 10 种，
     直接列全 10 条更直观
   · RoHS 无官方结构化数据下载，靠人工维护一份 10 行的结构化数据表
     （区别于 CLP 附录 VI 的批量导入模式），表格版本随指令修订更新
   · 页面需注明「豁免项见指令附录 III / IV，本页仅列附录 II 受限物质」，
     并预留「查看豁免清单」入口（占位）
   · 中国 RoHS 为独立体系（工信部《电器电子产品有害物质限制使用管理办法》），
     是否纳入待业务确认，本页不做
   · law:trans 运输法规库：本期仍为占位页，页面内注明「数据源待确认、本期仅占位」；
     运输需体现「多运输方式」
   · law:oel 职业接触限值（OEL）**已升级为独立维护页面**（2026-09-18 第三十轮），
     注册移交 23z9-js-oel.js，本分片仅保留 law:trans 占位页与 lawStripHTML 工具
   ================================================================== */

/* ---------- 通用：法规页信息条（与 REACH 页同一套样式 .law-strip） ----------
   items: [标签, 值, 是否等宽字体, 是否允许内联 HTML] */
function lawStripHTML(items){
  return '<div class="law-strip">'+items.map(function(it,i){
    var val=it[3]?it[1]:esc(it[1]);
    return '<span class="it'+(i===items.length-1?' src':'')+'"><em>'+esc(it[0])+'</em><b'+(it[2]?' class="mono"':'')+'>'+val+'</b></span>';
  }).join('')+'</div>';
}

/* ==================================================================
   一、RoHS 限用物质（law:rohs）
   ================================================================== */
var ROHS_VER='2015/863（2019-07-22 生效）';
var ROHS_SRC='Directive 2011/65/EU Annex II（经 (EU) 2015/863 修订）';
var ROHS_LIMIT_NOTE='限值口径：均质材料中的重量百分比（镉 0.01%，其余 0.1%）';

var ROHS_ITEMS=[
  {en:'Lead',cn:'铅（Pb）',cas:'7439-92-1',ec:'231-100-4',limit:'0.1%（1000 ppm）',grp:'重金属',
   app:'电子电气设备（EEE）',note:'焊料、玻璃与陶瓷、PVC 稳定剂等；豁免项见指令附录 III / IV'},
  {en:'Mercury',cn:'汞（Hg）',cas:'7439-97-6',ec:'231-106-7',limit:'0.1%（1000 ppm）',grp:'重金属',
   app:'电子电气设备（EEE）',note:'温控器、传感器、开关、荧光灯等'},
  {en:'Cadmium',cn:'镉（Cd）',cas:'7440-43-9',ec:'231-152-8',limit:'0.01%（100 ppm）',grp:'重金属',
   app:'电子电气设备（EEE）',note:'开关、弹簧、连接器、镀层；<b>限值为其他 9 项的 1/10</b>'},
  {en:'Hexavalent chromium',cn:'六价铬 Cr(VI)',cas:'18540-29-9',ec:'240-881-5',limit:'0.1%（1000 ppm）',grp:'重金属',
   app:'电子电气设备（EEE）',note:'金属防腐蚀涂层与钝化层'},
  {en:'Polybrominated biphenyls (PBBs)',cn:'多溴联苯',cas:'—',ec:'—',limit:'0.1%（1000 ppm）',grp:'溴系阻燃剂',
   app:'电子电气设备（EEE）',note:'<b>物质组，无单一 CAS / EC</b>；常用作塑料阻燃剂'},
  {en:'Polybrominated diphenyl ethers (PBDEs)',cn:'多溴二苯醚',cas:'—',ec:'—',limit:'0.1%（1000 ppm）',grp:'溴系阻燃剂',
   app:'电子电气设备（EEE）',note:'<b>物质组，无单一 CAS / EC</b>（十溴二苯醚等按同族管控）'},
  {en:'Bis(2-ethylhexyl) phthalate (DEHP)',cn:'邻苯二甲酸二(2-乙基己基)酯',cas:'117-81-7',ec:'204-211-0',limit:'0.1%（1000 ppm）',grp:'邻苯二甲酸酯',
   app:'电子电气设备（EEE）',note:'PVC 增塑剂；2019-07-22 起纳入管控'},
  {en:'Butyl benzyl phthalate (BBP)',cn:'邻苯二甲酸丁苄酯',cas:'85-68-7',ec:'201-622-7',limit:'0.1%（1000 ppm）',grp:'邻苯二甲酸酯',
   app:'电子电气设备（EEE）',note:'塑料外壳、粘合剂、油墨；2019-07-22 起纳入管控'},
  {en:'Dibutyl phthalate (DBP)',cn:'邻苯二甲酸二丁酯',cas:'84-74-2',ec:'201-557-4',limit:'0.1%（1000 ppm）',grp:'邻苯二甲酸酯',
   app:'电子电气设备（EEE）',note:'软质 PVC、润滑剂、封装材料；2019-07-22 起纳入管控'},
  {en:'Diisobutyl phthalate (DIBP)',cn:'邻苯二甲酸二异丁酯',cas:'84-69-5',ec:'201-553-2',limit:'0.1%（1000 ppm）',grp:'邻苯二甲酸酯',
   app:'电子电气设备（EEE）',note:'印刷油墨、粘合剂；2019-07-22 起纳入管控'}
];
var _rohsKw='',_rohsGrp='';

function rohsRender(){
  $('pageHost').innerHTML='<div class="sds-scope law-page">'+
    sdsHead('rohsTitle','RoHS 限用物质','Directive 2011/65/EU Annex II（经 (EU) 2015/863 修订）· 欧盟电子电气设备有害物质限制',
      '<button class="btn" onclick="rohsExempt()">查看豁免清单</button>'+
      '<button class="btn" onclick="toast(\'RoHS 限用物质清单已导出（演示）\',\'ok\')">导出清单</button>')+
    lawStripHTML([
      ['数据版本','2015/863（2019-07-22 生效）',true],
      ['数据来源','Directive 2011/65/EU Annex II',false],
      ['维护方式','人工维护（10 行结构化数据表）',false],
      ['维护责任人','质管-熊倩',false],
      ['审核状态','已审核 <span class="ev ev-green"><i></i>有效</span>',false,true],
      ['来源类型','官方指令 · 人工维护',false]
    ])+
    '<div class="notice info" style="margin-bottom:12px"><div class="ni">i</div><div><b>维护方式说明：</b>RoHS <b>没有官方结构化数据下载</b>，因此本页数据由法规专员<b>人工维护一份 10 行的结构化数据表</b>（区别于 CLP 附录 VI 的批量导入模式）；表格版本随指令修订人工更新，每行均记录数据版本与来源。</div></div>'+
    '<div class="notice grey" style="margin-bottom:12px"><div class="ni">§</div><div><b>豁免项见指令附录 III / IV，本页仅列附录 II 受限物质。</b>部分应用（如医疗设备、监控仪器中的特定用途）可依附录 III / IV 申请豁免，豁免有期限并需定期复核。'+
      '<a onclick="rohsExempt()" style="cursor:pointer;margin-left:6px">查看豁免清单 →</a></div></div>'+
    '<div class="notice warn" style="margin-bottom:12px"><div class="ni">!</div><div><b>中国 RoHS 为独立体系</b>（工信部《电器电子产品有害物质限制使用管理办法》），与欧盟 RoHS 的管控物质、限量与合格评定方式均不同，<b>是否纳入本模块待业务确认，本页不做</b>。</div></div>'+
    '<div class="card"><div class="toolbar" style="flex-wrap:wrap">'+
      '<div class="search" style="width:280px"><i class="si">⌕</i><input id="rohsKw" placeholder="物质名称 / 中文名 / CAS / EC / 备注…" value="'+esc(_rohsKw)+'" oninput="rohsFill()"></div>'+
      '<select class="ctrl" id="rohsGrp" style="width:170px" onchange="rohsFill()"><option value="">全部物质类别</option><option>重金属</option><option>溴系阻燃剂</option><option>邻苯二甲酸酯</option></select>'+
      '<div class="grow"></div><span class="muted" style="font-size:12.5px" id="rohsCnt"></span></div>'+
      '<div class="tbl-wrap"><table class="tbl" id="rohsTable" style="min-width:1500px"></table></div>'+
    '</div>'+
    '<div class="notice grey" style="margin-top:12px"><div class="ni">§</div><div>'+ROHS_LIMIT_NOTE+'。判定针对<b>均质材料</b>（无法用机械手段分离的单一材料，如一层涂层、一段胶带、一块塑料件），不做整机加权平均。</div></div>'+
    '</div>';
  rohsFill();
}
function rohsFill(){
  var kw=($('rohsKw').value||'').trim().toLowerCase(),grp=$('rohsGrp').value;
  _rohsKw=$('rohsKw').value;_rohsGrp=grp;
  var rows=ROHS_ITEMS.filter(function(r){
    if(grp&&r.grp!==grp)return false;
    return !kw||(r.en+' '+r.cn+' '+r.cas+' '+r.ec+' '+r.note).toLowerCase().indexOf(kw)>=0;
  });
  var cnt=$('rohsCnt');if(cnt)cnt.textContent='共 '+rows.length+' 条受限物质（全量 '+ROHS_ITEMS.length+' 条）';
  var host=$('rohsTable');if(!host)return;
  host.innerHTML='<thead><tr><th style="width:180px">物质名称</th><th style="width:190px">中文名</th><th style="width:110px">CAS</th><th style="width:110px">EC</th>'+
    '<th style="width:150px">限值</th><th style="width:150px">适用对象</th><th style="width:120px">物质类别</th><th>备注</th><th style="width:100px">数据版本</th></tr></thead><tbody>'+
    (rows.length?rows.map(function(r){
      return '<tr><td class="mono"><b>'+esc(r.en)+'</b></td><td>'+esc(r.cn)+'</td><td class="mono">'+esc(r.cas)+'</td><td class="mono">'+esc(r.ec)+'</td>'+
        '<td><b>'+esc(r.limit)+'</b></td><td>'+esc(r.app)+'</td><td><span class="tag '+(r.grp==='重金属'?'orange':(r.grp==='溴系阻燃剂'?'purple':'blue'))+'">'+esc(r.grp)+'</span></td>'+
        '<td>'+r.note+'</td><td class="mono">'+esc(ROHS_VER.split('（')[0])+'</td></tr>';
    }).join(''):'<tr><td colspan="9" class="tbl-empty"><span class="big">⌕</span>没有匹配的受限物质</td></tr>')+'</tbody>';
}
function rohsExempt(){
  openModal({title:'豁免清单 · 占位',width:680,cls:'sds-scope law-page',
    body:'<div class="notice warn" style="margin-bottom:12px"><div class="ni">!</div><div><b>本入口为占位。</b>指令附录 III（2011/65/EU 生效起适用的豁免）与附录 IV（医疗设备与监控仪器适用）条目本期不录入，后续版本按官方豁免清单人工维护。</div></div>'+
      '<dl class="desc-list" style="grid-template-columns:150px 1fr">'+
      '<dt>豁免依据</dt><dd>Directive 2011/65/EU 附录 III / 附录 IV</dd>'+
      '<dt>豁免性质</dt><dd>对特定用途的有期限豁免，需在到期前申请续期；续期未通过则须改为合规设计</dd>'+
      '<dt>规划字段</dt><dd>豁免编号 / 豁免内容 / 适用范围（类别） / 有效期（起止） / 状态 / 来源版本</dd>'+
      '<dt>数据来源方式</dt><dd>与附录 II 受限物质一致：无官方结构化下载，由法规专员人工维护结构化表</dd>'+
      '<dt>与受限物质的关系</dt><dd>豁免不改变附录 II 限值，只对特定用途开放例外；判定时须同时看限值命中与豁免覆盖</dd>'+
      '</dl>',
    footer:'<button class="btn primary" onclick="closeModal()">关闭</button>'});
}

/* ==================================================================
   二、职业接触限值（OEL）已移交新分片
   ------------------------------------------------------------------
   law:oel 的占位页于 2026-09-18（第三十轮）升级为「四 Tab 维护页面」，
   注册与实现全部移交 src/23z9-js-oel.js（官方来源 → 数据集版本 → 限值明细
   → 版本对比 → 审核发布）。本分片的占位实现已删除，不留重复注册。
   ================================================================== */

/* ==================================================================
   三、运输法规库（law:trans，本期占位，体现多运输方式）
   ================================================================== */
function transRender(){
  $('pageHost').innerHTML='<div class="sds-scope law-page">'+
    sdsHead('transTitle','运输法规库','危险货物运输法规（UN TDG / IMDG / IATA 与国内 GB 系列）· 用于 SDS 第 14 章「运输信息」','')+
    '<div class="notice warn" style="margin-bottom:14px"><div class="ni">!</div><div><b>数据源待确认、本期仅占位。</b>危险货物运输是<b>独立的法规体系</b>——CLP 只管分类与标签、不管运输；运输要求按运输方式（公路 / 铁路 / 海运 / 空运）分别适用不同规则，因此本模块从一开始就按「多运输方式」设计。</div></div>'+
    '<div class="kpi-row">'+
      '<div class="kpi"><span>运输方式</span><b>4</b><small>公路 / 铁路 · 海运 · 空运 · 国内</small></div>'+
      '<div class="kpi"><span>数据源</span><b style="font-size:15px">4 类（待确认）</b><small>UN TDG · IMDG · IATA · GB 6944/12268</small></div>'+
      '<div class="kpi"><span>联动功能</span><b style="font-size:15px">SDS 第 14 章</b><small>运输信息</small></div>'+
      '<div class="kpi"><span>当前状态</span><b style="font-size:15px;color:var(--orange)">占位 · 未接入</b><small>数据版本：规划中</small></div>'+
    '</div>'+
    '<div class="card"><div class="toolbar"><b style="font-size:13.5px">按运输方式适用规则（规划）</b></div>'+
      '<div class="law-cards">'+
        '<div class="law-card"><div class="hd"><span class="tag blue">公路 / 铁路</span><b>UN TDG 示范规章（橙皮书）</b></div>'+
          '<div class="bd">联合国《关于危险货物运输的建议书 · 示范规章》，是各运输方式规则的共同母本；国内对应 <b>GB 6944</b>《危险货物分类和品名编号》与 <b>GB 12268</b>《危险货物品名表》。</div></div>'+
        '<div class="law-card"><div class="hd"><span class="tag purple">海运</span><b>IMDG Code</b></div>'+
          '<div class="bd">国际海运危险货物规则，在 UN TDG 基础上增加海运特有的隔离、积载与包装要求（如海洋污染物标记）。</div></div>'+
        '<div class="law-card"><div class="hd"><span class="tag green">空运</span><b>IATA DGR</b></div>'+
          '<div class="bd">国际航空运输协会危险品规则，限制条件最严（禁运清单、数量限制、包装等级差异最大）。</div></div>'+
        '<div class="law-card"><div class="hd"><span class="tag grey">国内运输</span><b>道路 / 铁路运输管理规定</b></div>'+
          '<div class="bd">国内危险货物道路运输与铁路运输的配套规定（如 JT/T 617 系列），编号体系与 GB 6944 / GB 12268 一致。</div></div>'+
      '</div>'+
    '</div>'+
    '<div class="card" style="padding:14px 18px">'+
      '<dl class="desc-list" style="grid-template-columns:170px 1fr;margin:0">'+
      '<dt>规划字段</dt><dd>UN 编号 / UN 正式运输名称 / 运输危险类别（含次要危险性） / 包装组（Ⅰ / Ⅱ / Ⅲ） / 海洋污染物标记 / 特殊规定与包装要求 / 适用运输方式 / 来源版本</dd>'+
      '<dt>按方式分别维护</dt><dd>同一物质在不同运输方式下的类别、包装组与特殊规定可能不同，因此<b>每条记录绑定运输方式</b>，不合并为一条。</dd>'+
      '<dt>与 SDS 第 14 章的关系</dt><dd>SDS 第 14 章按运输方式分别给出 UN 编号、运输名称、危险类别、包装组与环境危害；不属危险货物时须注明「不受运输法规管制」。</dd>'+
      '<dt>维护方式</dt><dd>人工维护结构化表；UN TDG 与 IMDG / IATA 的修订周期不同（TDG 两年一版、IATA 每年一版），需分别记录来源版本。</dd>'+
      '</dl>'+
    '</div>'+
    '<div class="card" style="padding:26px;text-align:center">'+
      '<div style="font-size:34px;color:#b6c2d1">▤</div>'+
      '<div style="font-size:15px;font-weight:650;margin:8px 0 4px">运输法规库 · 规划中</div>'+
      '<div class="muted" style="font-size:12.5px">本期仅占位，数据源与运输方式覆盖范围待业务确认后录入</div>'+
    '</div>'+
    '</div>';
}

/* ---------- 页面注册 ---------- */
regPage('law:rohs',{title:'RoHS 限用物质',crumb:['合规管理','受限物质管理','RoHS 限用物质'],render:rohsRender});
/* law:oel 已移交 23z9-js-oel.js（本分片不再注册，避免同路由重复注册相互覆盖） */
regPage('law:trans',{title:'运输法规库',crumb:['合规管理','法规库维护','运输法规库'],render:transRender});
