/* ==================================================================
   [27z8b] 原料库存 + 出入库记录（bd:inv / bd:invlog，2026-11-02）
   · 业务：PLM 自维护库存（不连 ERP）；批次为最小单位；质检状态随批次；
     线下来不及走线上流程的出入库 → 盘点校正兜底（校正 + 留痕，不做盘点单）
   · 数据模型：INV_LOGS 流水是数量的唯一来源——
     账面数量 = Σ 该批次流水（入库正 / 出库负 / 盘点调整带符号）。
     批次静态属性（单位/日期/质检/库位）在 INV_BATCHES。
     这样「新增流水 → 库存自动增减」天然成立，不会出现两处对不上。
   · 效期预警：失效日期 ≤90 天标黄、已过期标红（行底色复用 row-due/row-red）
   · 质检状态四值：合格 / 不合格 / 检测中 / 未送检；批次号沿用送检记录里
     真实出现的 L27-2608A / L27-2605B，详情弹窗能真联动 SUBMITS/QCREPORTS
   · 日期全部按演示锚点 demoYmd() 平移（20-js-core 铁律，不写死年月日）
   · 命名前缀 inv*（全局唯一，check_names 验证）
   ================================================================== */

/* ---------- 1. 批次静态属性 ---------- */
var INV_BATCHES=(function(){
  var T=demoYmd();
  function B(arr){ return arr.map(function(a){
    return {code:a[0],name:a[1],batch:a[2],unit:a[3],
      prodDate:dateAdd(T,a[4]),expDate:a[5]===null?'':dateAdd(T,a[5]),
      qc:a[6],loc:a[7],remark:a[8]};
  }); }
  return {
    /* [编码, 名称, 批次号, 单位, 生产偏移, 失效偏移, 质检状态, 库位, 备注] */
    mat:B([
      ['MAT-00127','水性聚氨酯涂饰树脂 WPU-320','WPU-2609A','kg',-55,-55+730,'合格','原料库 A-01','中试放大批次'],
      ['MAT-00210','加脂剂 L-27','L27-2608A','kg',-25,-25+365,'检测中','原料库 A-03','已送检 QC-2026-0142'],
      ['MAT-00210','加脂剂 L-27','L27-2605B','kg',-120,-120+365,'不合格','原料库 A-03','QC-2026-0031 不通过，待处置'],
      ['MAT-00305','铬鞣剂 CR-33','CR33-2607C','kg',-85,-85+540,'合格','原料库 B-01',''],
      ['MAT-00412','乙二醇单丁醚','EGB-2606B','kg',-130,-20,'合格','溶剂库 C-02','已过期，待报废处置'],
      ['MAT-00413','工业乙醇','ETH-2609C','L',-50,45,'合格','溶剂库 C-01','90 天内到期，优先领用'],
      ['MAT-00520','丙烯酸单体','AA-2609D','kg',-40,-40+180,'未送检','危化库 D-01','入库后尚未安排检测'],
      ['MAT-00521','甲醛水溶液','HCHO-2607A','kg',-90,-90+300,'合格','危化库 D-02','']
    ]),
    prd:B([
      ['PRD-2026-001','水性聚氨酯涂饰树脂 WPU-320','WPU-P2610A','kg',-20,-20+365,'合格','成品库 E-01',''],
      ['PRD-2026-002','皮革涂饰光亮剂 GL-9','GL9-P2609B','kg',-30,-30+540,'合格','成品库 E-02','出口欧盟批次'],
      ['PRD-2026-003','加脂剂 L-27','L27-P2610A','kg',-15,-15+365,'检测中','成品库 E-01','留样检测'],
      ['PRD-2026-005','水性封底树脂 SB-11','SB11-P2608A','kg',-100,60,'未送检','成品库 E-03','90 天内到期'],
      ['PRD-2026-006','手感剂 HF-5','HF5-P2607A','kg',-115,-25,'不合格','成品库 E-02','APEO 残留超标，已过期待报废']
    ])
  };
})();

/* ---------- 2. 出入库流水（数量唯一来源） ---------- */
var INV_LOGS=(function(){
  var T=demoYmd();
  /* [偏移天, 类型, 编码, 名称, 批次, 数量(带符号), 经办人, 事由, 备注] */
  var seed=[
    [-55,'入库','MAT-00127','水性聚氨酯涂饰树脂 WPU-320','WPU-2609A',800,'仓管-刘姐','采购入库',''],
    [-25,'入库','MAT-00210','加脂剂 L-27','L27-2608A',400,'仓管-刘姐','采购入库',''],
    [-120,'入库','MAT-00210','加脂剂 L-27','L27-2605B',350,'仓管-刘姐','采购入库',''],
    [-85,'入库','MAT-00305','铬鞣剂 CR-33','CR33-2607C',600,'仓管-刘姐','采购入库',''],
    [-130,'入库','MAT-00412','乙二醇单丁醚','EGB-2606B',200,'仓管-刘姐','采购入库',''],
    [-50,'入库','MAT-00413','工业乙醇','ETH-2609C',500,'仓管-刘姐','采购入库',''],
    [-40,'入库','MAT-00520','丙烯酸单体','AA-2609D',300,'仓管-刘姐','采购入库',''],
    [-90,'入库','MAT-00521','甲醛水溶液','HCHO-2607A',240,'仓管-刘姐','采购入库',''],
    [-18,'出库','MAT-00127','水性聚氨酯涂饰树脂 WPU-320','WPU-2609A',-260,'李工','PRJ-2026-002 中试投料',''],
    [-12,'出库','MAT-00210','加脂剂 L-27','L27-2605B',-320,'王研究员','PRJ-2026-001 加脂实验','不合格批次，误领待查'],
    [-10,'出库','MAT-00305','铬鞣剂 CR-33','CR33-2607C',-150,'陈工','鞣制对比实验',''],
    [-6,'出库','MAT-00413','工业乙醇','ETH-2609C',-120,'李工','玻璃器皿清洗',''],
    [-5,'盘点调整','MAT-00127','水性聚氨酯涂饰树脂 WPU-320','WPU-2609A',-5,'仓管-刘姐','盘亏','桶壁残留计量偏差'],
    [-3,'盘点调整','MAT-00413','工业乙醇','ETH-2609C',-4,'仓管-刘姐','损耗','领用桶密封垫老化挥发'],
    [-20,'入库','PRD-2026-001','水性聚氨酯涂饰树脂 WPU-320','WPU-P2610A',300,'仓管-刘姐','中试产出入库',''],
    [-30,'入库','PRD-2026-002','皮革涂饰光亮剂 GL-9','GL9-P2609B',260,'仓管-刘姐','生产入库',''],
    [-15,'入库','PRD-2026-003','加脂剂 L-27','L27-P2610A',180,'仓管-刘姐','生产入库',''],
    [-100,'入库','PRD-2026-005','水性封底树脂 SB-11','SB11-P2608A',150,'仓管-刘姐','生产入库',''],
    [-115,'入库','PRD-2026-006','手感剂 HF-5','HF5-P2607A',120,'仓管-刘姐','生产入库',''],
    [-14,'出库','PRD-2026-001','水性聚氨酯涂饰树脂 WPU-320','WPU-P2610A',-90,'赵工','客户样品寄送',''],
    [-8,'出库','PRD-2026-002','皮革涂饰光亮剂 GL-9','GL9-P2609B',-140,'赵工','华南代工厂试产','']
  ];
  return seed.map(function(s,i){
    return {id:'IL-2026-'+String(220-i),date:dateAdd(T,s[0]),type:s[1],
      code:s[2],name:s[3],batch:s[4],qty:s[5],by:s[6],reason:s[7],remark:s[8]};
  });
})();

/* ---------- 3. 数据工具 ---------- */
function invBatches(tab){ return INV_BATCHES[tab]||[]; }
function invAllBatches(){ return INV_BATCHES.mat.concat(INV_BATCHES.prd); }
function invBatch(code,batch){
  return invAllBatches().filter(function(b){return b.code===code&&b.batch===batch;})[0]||null;
}
/* 账面数量 = Σ 流水（唯一来源，流水页新增/盘点校正后自动一致） */
function invQty(code,batch){
  var n=0;
  INV_LOGS.forEach(function(l){ if(l.code===code&&l.batch===batch)n+=l.qty; });
  return n;
}
function invLogsOf(code,batch){
  return INV_LOGS.filter(function(l){return l.code===code&&l.batch===batch;});
}
function invNextLogId(){
  var max=220;
  INV_LOGS.forEach(function(l){
    var m=/^IL-2026-(\d+)$/.exec(l.id||'');
    if(m)max=Math.max(max,parseInt(m[1],10));
  });
  var n=String(max+1); while(n.length<3)n='0'+n;
  return 'IL-2026-'+n;
}
function invPushLog(o){
  var row={id:invNextLogId(),date:o.date||todayStr(),type:o.type,code:o.code,name:o.name,
    batch:o.batch,qty:o.qty,by:o.by||'王研究员',reason:o.reason||'',remark:o.remark||''};
  INV_LOGS.unshift(row);
  return row;
}
/* 效期分桶：已过期 / 90天内 / 正常（无失效日期视为正常） */
function invExpBucket(b){
  if(!b.expDate)return '正常';
  var d=daysTo(b.expDate);
  if(d<0)return '已过期';
  if(d<=90)return '90天内';
  return '正常';
}
function invAgeDays(b){ return daysBetween(b.prodDate,demoYmd()); }

var INV_QC_TAG={'合格':'tag-green','不合格':'tag-red','检测中':'tag-blue','未送检':'tag-grey'};
var INV_TYPE_TAG={'入库':'tag-green','出库':'tag-orange','盘点调整':'tag-blue'};

/* 列表行视图 = 批次静态属性 + 实时账面数量 + 效期分桶 */
function invRows(tab){
  return invBatches(tab).map(function(b){
    var r={};for(var k in b)r[k]=b[k];
    r.qty=invQty(b.code,b.batch);
    r._exp=invExpBucket(b);
    return r;
  });
}

/* ---------- 4. 库存页（bd:inv）：Tab + 列表 / 盘点模式 ---------- */
var _invTab='mat';
var _invAuditOn=false;

regPage('bd:inv',{
  title:'原料库存',crumb:['基础数据','原料管理','原料库存'],
  render:function(){
    var host=$('pageHost');
    host.innerHTML='<div id="invTabs"></div><div id="lpHost"></div>';
    $('invTabs').appendChild(tabs(
      [{key:'mat',label:'原料库存'},{key:'prd',label:'产品库存'}],
      _invTab,function(k){ _invTab=k; showPage('bd:inv'); }));
    if(_invAuditOn){ invAuditRender(); return; }
    renderListPage(invListCfg(_invTab));
  }
});

function invListCfg(tab){
  var rows=invRows(tab);
  var codes={};
  rows.forEach(function(r){ codes[r.code]=r.name; });
  var codeOpts=Object.keys(codes).map(function(c){ return [c,c+' '+codes[c]]; });
  return {
    title:tab==='mat'?'原料库存':'产品库存',
    sub:'以批次为最小库存单位；账面数量 = 出入库流水累计；失效日期 90 天内标黄、已过期标红。',
    cols:[
      {k:'code',t:'物料编码',w:'118px',fmt:function(r){return mono(r.code);}},
      {k:'name',t:'物料名称',w:'185px'},
      {k:'batch',t:'批次号',w:'118px',fmt:function(r){return mono(r.batch);}},
      {k:'qty',t:'库存数量',w:'95px',num:true,fmt:function(r){
        return '<b>'+r.qty+'</b>';
      }},
      {k:'unit',t:'单位',w:'58px',align:'c'},
      {k:'prodDate',t:'生产日期',w:'100px'},
      {k:'expDate',t:'失效日期',w:'100px',fmt:function(r){
        if(!r.expDate)return '<span class="muted">—</span>';
        var e=invExpBucket(r);
        var c=e==='已过期'?'var(--red)':(e==='90天内'?'#d48806':'');
        return '<span'+(c?' style="color:'+c+';font-weight:600"':'')+'>'+esc(r.expDate)+'</span>';
      }},
      {k:'_age',t:'库龄(天)',w:'80px',num:true,fmt:function(r){return String(invAgeDays(r));}},
      {k:'qc',t:'质检状态',w:'88px',fmt:function(r){
        return '<span class="tag '+(INV_QC_TAG[r.qc]||'tag-grey')+'">'+esc(r.qc)+'</span>';
      }},
      {k:'loc',t:'存放位置',w:'105px'},
      {k:'remark',t:'备注',w:'160px'}
    ],
    rows:rows,
    kwKeys:['code','name','batch','loc','remark'],
    kwPh:'搜索物料编码 / 名称 / 批次',
    pageSize:10,
    rowCls:function(r){
      var e=invExpBucket(r);
      return e==='已过期'?'row-red':(e==='90天内'?'row-due':'');
    },
    headActs:'<button class="btn" data-lp-reset>重置筛选</button>'+
      '<button class="btn" onclick="showPage(\'bd:invlog\')">出入库记录</button>'+
      '<button class="btn btn-primary" onclick="invAuditToggle(true)">盘点模式</button>',
    acts:function(r){
      return '<button class="btn btn-link" onclick="invView(\''+esc(r.code)+'\',\''+esc(r.batch)+'\')">查看</button>'+
        '<button class="btn btn-link" onclick="invAdjust(\''+esc(r.code)+'\',\''+esc(r.batch)+'\')">盘点校正</button>';
    },
    onRowClick:function(r){ invView(r.code,r.batch); },
    filters:[
      {k:'code',t:'物料',all:'全部物料',opts:codeOpts},
      {k:'qc',t:'质检状态',all:'全部',opts:[['合格','合格'],['不合格','不合格'],['检测中','检测中'],['未送检','未送检']]},
      {k:'_exp',t:'效期',all:'全部',opts:[['90天内','90 天内到期'],['已过期','已过期'],['正常','正常']]}
    ]
  };
}

/* ---------- 5. 批次详情弹窗：完整信息 + 流水摘录 + 送检摘录 ---------- */
function invView(code,batch){
  var b=invBatch(code,batch); if(!b)return;
  var qty=invQty(code,batch);
  var e=invExpBucket(b);
  var expTip=e==='已过期'?'<span style="color:var(--red);font-weight:600">已过期</span>'
            :(e==='90天内'?'<span style="color:#d48806;font-weight:600">90 天内到期</span>':'正常');
  var logs=invLogsOf(code,batch).slice(0,8);
  var logRows=logs.length?logs.map(function(l){
    return '<tr><td>'+esc(l.date)+'</td><td><span class="tag '+(INV_TYPE_TAG[l.type]||'tag-grey')+'">'+esc(l.type)+'</span></td>'+
      '<td class="num"><b style="color:'+(l.qty>=0?'var(--green)':'var(--red)')+'">'+(l.qty>0?'+':'')+l.qty+'</b></td>'+
      '<td>'+esc(l.by)+'</td><td>'+esc(l.reason||'—')+'</td></tr>';
  }).join(''):'<tr><td colspan="5" class="tbl-empty">暂无流水</td></tr>';
  /* 送检联动：按批次号 / 物料名称在送检记录里检索（种子批次号与 SUBMITS 样本名一致） */
  var subs=SUBMITS.filter(function(s){
    return s.sample.indexOf(batch)>=0||s.sample.indexOf(b.name)>=0||s.sample.indexOf(code)>=0;
  }).slice(0,4);
  var subRows=subs.length?subs.map(function(s){
    var rpt=QCREPORTS.filter(function(x){return x.submit===s.id;})[0];
    return '<tr><td>'+mono(s.id)+'</td><td>'+esc(s.sample)+'</td><td>'+esc(s.item)+'</td>'+
      '<td>'+esc(s.date)+'</td><td><span class="tag '+(s.status==='检测中'?'tag-blue':(rpt&&rpt.result==='不通过'?'tag-red':'tag-green'))+'">'+
      esc(rpt?rpt.result:s.status)+'</span></td></tr>';
  }).join(''):'<tr><td colspan="5" class="tbl-empty">未检索到关联送检记录</td></tr>';
  openModal({title:'批次详情 · '+batch,width:760,
    body:'<div class="desc-list" style="margin-bottom:14px">'+
        '<div><dt>物料编码</dt><dd>'+mono(code)+'</dd></div>'+
        '<div><dt>物料名称</dt><dd>'+esc(b.name)+'</dd></div>'+
        '<div><dt>批次号</dt><dd>'+mono(batch)+'</dd></div>'+
        '<div><dt>账面数量</dt><dd><b>'+qty+' '+esc(b.unit)+'</b>（出入库流水累计）</dd></div>'+
        '<div><dt>生产日期</dt><dd>'+esc(b.prodDate)+'</dd></div>'+
        '<div><dt>失效日期</dt><dd>'+esc(b.expDate||'—')+' '+expTip+'</dd></div>'+
        '<div><dt>库龄</dt><dd>'+invAgeDays(b)+' 天</dd></div>'+
        '<div><dt>质检状态</dt><dd><span class="tag '+(INV_QC_TAG[b.qc]||'tag-grey')+'">'+esc(b.qc)+'</span></dd></div>'+
        '<div><dt>存放位置</dt><dd>'+esc(b.loc)+'</dd></div>'+
        '<div><dt>备注</dt><dd>'+esc(b.remark||'—')+'</dd></div></div>'+
      '<h3 style="margin:14px 0 8px;font-size:14px">出入库流水（最近 '+logs.length+' 笔）</h3>'+
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>日期</th><th>类型</th><th>数量</th><th>经办人</th><th>事由</th></tr></thead><tbody>'+logRows+'</tbody></table></div>'+
      '<h3 style="margin:14px 0 8px;font-size:14px">关联送检记录</h3>'+
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>送检单号</th><th>样品</th><th>检测项目</th><th>送检日期</th><th>结果/状态</th></tr></thead><tbody>'+subRows+'</tbody></table></div>',
    footer:'<button class="btn" onclick="closeModal()">关闭</button>'+
      '<button class="btn" onclick="closeModal();showPage(\'bd:invlog\',{code:\''+esc(code)+'\'})">查看全部流水</button>'+
      '<button class="btn primary" onclick="closeModal();invAdjust(\''+esc(code)+'\',\''+esc(batch)+'\')">盘点校正</button>'});
}

/* ---------- 6. 盘点校正（单行弹窗） ---------- */
var INV_ADJ_REASONS=['盘盈','盘亏','损耗','过期报废','计量偏差','其他'];
function invAdjust(code,batch){
  var b=invBatch(code,batch); if(!b)return;
  var qty=invQty(code,batch);
  openModal({title:'盘点校正 · '+batch,width:480,
    body:'<div class="notice info" style="margin-bottom:12px"><div class="ni">i</div><div>'+
      '<b>'+esc(b.name)+'</b>（'+esc(code)+'）· 批次 '+mono(batch)+' · 账面数量 <b>'+qty+' '+esc(b.unit)+'</b></div></div>'+
      '<div class="form-grid">'+
      '<div class="field"><label class="req">实盘数量（'+esc(b.unit)+'）</label><input class="ctrl" type="number" id="iaQty" min="0" step="1" placeholder="填写实际盘点数量"></div>'+
      '<div class="field"><label class="req">差异原因</label><select class="ctrl" id="iaReason">'+
        INV_ADJ_REASONS.map(function(x){return '<option>'+x+'</option>';}).join('')+'</select></div>'+
      '<div class="field span2"><label>备注</label><input class="ctrl" id="iaRemark" placeholder="选填，如：桶壁残留计量偏差"></div>'+
      '</div>'+
      '<div style="font-size:12.5px;color:var(--muted);margin-top:8px">确认后库存数量直接校正为实盘数，并在出入库记录生成一条「盘点调整」流水（数量 = 差异值）。</div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
      '<button class="btn primary" onclick="invAdjustSave(\''+esc(code)+'\',\''+esc(batch)+'\','+qty+')">确认校正</button>'});
}
function invAdjustSave(code,batch,bookQty){
  var v=$('iaQty').value;
  if(v===''){toast('请填写实盘数量','warn');return;}
  var real=parseFloat(v);
  if(isNaN(real)||real<0){toast('实盘数量需为不小于 0 的数字','warn');return;}
  var diff=real-bookQty;
  if(diff===0){
    closeModal();
    toast('实盘与账面一致，无需校正','info');
    return;
  }
  var reason=$('iaReason').value;
  invPushLog({type:'盘点调整',code:code,name:(invBatch(code,batch)||{}).name||'',batch:batch,
    qty:diff,by:'仓管-刘姐',reason:reason,remark:$('iaRemark').value.trim()});
  closeModal();
  invRefresh();
  toast('已校正为 '+real+'，生成盘点调整流水（'+(diff>0?'+':'')+diff+'）','ok');
}

/* ---------- 7. 盘点模式（批量） ---------- */
function invAuditToggle(on){
  _invAuditOn=!!on;
  showPage('bd:inv');
}
function invRefresh(){ showPage(curPage); }

function invAuditRender(){
  var host=$('lpHost');
  var tab=_invTab;
  var rows=invRows(tab);
  var h='<div class="page-hd"><div class="t"><h1>盘点模式 · '+(tab==='mat'?'原料':'产品')+'</h1>'+
    '<div class="page-sub">逐行填实盘数量；与账面不一致的行确认后生成「盘点调整」流水，差异为 0 的行不生成。</div></div>'+
    '<div class="page-acts"><button class="btn" onclick="invAuditToggle(false)">退出盘点模式</button></div></div>';
  h+='<div class="card"><div class="card-b tight"><div class="tbl-wrap"><table class="tbl"><thead><tr>'+
     '<th>物料编码</th><th>物料名称</th><th>批次号</th><th>账面数量</th><th>单位</th><th style="width:140px">实盘数量</th><th>差异</th></tr></thead><tbody>';
  rows.forEach(function(r,i){
    h+='<tr><td>'+mono(r.code)+'</td><td>'+esc(r.name)+'</td><td>'+mono(r.batch)+'</td>'+
      '<td class="num">'+r.qty+'</td><td>'+esc(r.unit)+'</td>'+
      '<td><input class="ctrl" type="number" min="0" step="1" id="iax_'+i+'" style="height:30px" placeholder="'+r.qty+'"></td>'+
      '<td class="num" id="iad_'+i+'"><span class="muted">—</span></td></tr>';
  });
  h+='</tbody></table></div></div></div>'+
    '<div class="toolbar" style="border-top:none;margin-top:12px"><div class="grow"></div>'+
    '<button class="btn" onclick="invAuditToggle(false)">取消</button>'+
    '<button class="btn btn-primary" onclick="invAuditSubmit()">提交盘点结果</button></div>';
  host.innerHTML=h;
  rows.forEach(function(r,i){
    var inp=$('iax_'+i);
    if(inp)inp.oninput=function(){
      var v=this.value;
      var cell=$('iad_'+i);
      if(v===''){cell.innerHTML='<span class="muted">—</span>';return;}
      var d=parseFloat(v)-r.qty;
      cell.innerHTML=(isNaN(d)||d===0)?'<span class="muted">0</span>'
        :'<b style="color:'+(d>0?'var(--green)':'var(--red)')+'">'+(d>0?'+':'')+d+'</b>';
    };
  });
}
function invAuditSubmit(){
  var rows=invRows(_invTab);
  var n=0;
  rows.forEach(function(r,i){
    var inp=$('iax_'+i); if(!inp)return;
    if(inp.value==='')return;
    var real=parseFloat(inp.value);
    if(isNaN(real)||real<0)return;
    var diff=real-r.qty;
    if(diff===0)return;   /* 差异为 0 不生成流水 */
    invPushLog({type:'盘点调整',code:r.code,name:r.name,batch:r.batch,qty:diff,
      by:'仓管-刘姐',reason:diff>0?'盘盈':'盘亏',remark:'盘点模式批量校正'});
    n++;
  });
  _invAuditOn=false;
  if(!n){ showPage('bd:inv'); toast('各行实盘与账面一致，未生成流水','info'); return; }
  showPage('bd:inv');
  toast('已校正 '+n+' 个批次，生成 '+n+' 条盘点调整流水','ok');
}

/* ---------- 8. 出入库记录页（bd:invlog） ---------- */
regPage('bd:invlog',{
  title:'出入库记录',crumb:['基础数据','原料管理','出入库记录'],
  render:function(params){
    var preCode=(params&&params.code)||'';
    /* 裸 cfg 走 renderListPage：流水账不需要行操作列 */
    lp({
      title:'出入库记录',
      sub:'库存流水账（一行一笔）：入库为正、出库为负、盘点调整带差异符号；数量按批次累计即库存页账面数。',
      cols:[
        {k:'date',t:'日期',w:'105px',fmt:function(r){return mono(r.date);}},
        {k:'type',t:'类型',w:'95px',fmt:function(r){
          return '<span class="tag '+(INV_TYPE_TAG[r.type]||'tag-grey')+'">'+esc(r.type)+'</span>';
        }},
        {k:'code',t:'物料编码',w:'118px',fmt:function(r){return mono(r.code);}},
        {k:'name',t:'物料名称',w:'185px'},
        {k:'batch',t:'批次号',w:'118px',fmt:function(r){return mono(r.batch);}},
        {k:'qty',t:'数量',w:'90px',num:true,fmt:function(r){
          return '<b style="color:'+(r.qty>=0?'var(--green)':'var(--red)')+'">'+(r.qty>0?'+':'')+r.qty+'</b>';
        }},
        {k:'by',t:'经办人',w:'100px'},
        {k:'reason',t:'事由',w:'150px'},
        {k:'remark',t:'备注',w:'150px'}
      ],
      rows:INV_LOGS,
      kwKeys:['id','code','name','batch','by','reason','remark'],
      kwPh:'搜索批次 / 经办人 / 事由',
      pageSize:10,
      headActs:'<button class="btn" data-lp-reset>重置筛选</button>'+
        '<button class="btn btn-primary" onclick="invLogAdd()">＋ 新增记录</button>',
      acts:null,
      onRowClick:null,
      filters:[
        {k:'type',t:'类型',all:'全部',opts:[['入库','入库'],['出库','出库'],['盘点调整','盘点调整']]},
        {k:'code',t:'物料',all:'全部物料',opts:(function(){
          var m={};INV_LOGS.forEach(function(l){m[l.code]=l.name;});
          return Object.keys(m).map(function(c){return [c,c+' '+m[c]];});
        })()}
      ],
      filterDefaults:preCode?{code:preCode}:null
    });
  }
});

/* ---------- 9. 新增出入库记录（类型/物料/批次级联，出库超库存拦截） ---------- */
function invLogAdd(){
  var mats=INV_BATCHES.mat.concat(INV_BATCHES.prd);
  var m={};mats.forEach(function(b){m[b.code]=b.name;});
  var codeOpts=Object.keys(m).map(function(c){
    return '<option value="'+esc(c)+'">'+esc(c)+' '+esc(m[c])+'</option>';
  }).join('');
  openModal({title:'新增 · 出入库记录',width:560,
    body:'<div class="form-grid">'+
      '<div class="field"><label class="req">类型</label><select class="ctrl" id="ilType"><option>入库</option><option>出库</option></select></div>'+
      '<div class="field"><label class="req">日期</label><input class="ctrl" type="date" id="ilDate" value="'+todayStr()+'"></div>'+
      '<div class="field span2"><label class="req">物料</label><select class="ctrl" id="ilCode" onchange="invLogBatchOpts()">'+
        '<option value="">请选择物料</option>'+codeOpts+'</select></div>'+
      '<div class="field span2"><label class="req">批次号</label><select class="ctrl" id="ilBatch"><option value="">请先选物料</option></select></div>'+
      '<div class="field"><label class="req">数量</label><input class="ctrl" type="number" id="ilQty" min="0.1" step="0.1" placeholder="正数"></div>'+
      '<div class="field"><label class="req">事由</label><input class="ctrl" id="ilReason" placeholder="如：采购入库 / 生产领用"></div>'+
      '<div class="field span2"><label>备注</label><input class="ctrl" id="ilRemark" placeholder="选填"></div>'+
      '</div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
      '<button class="btn primary" onclick="invLogAddSave()">确认提交</button>'});
}
function invLogBatchOpts(){
  var code=$('ilCode').value;
  var sel=$('ilBatch');
  var bs=invAllBatches().filter(function(b){return b.code===code;});
  sel.innerHTML=bs.length?bs.map(function(b){
    return '<option value="'+esc(b.batch)+'">'+esc(b.batch)+'（账面 '+invQty(b.code,b.batch)+' '+esc(b.unit)+'）</option>';
  }).join(''):'<option value="">该物料暂无批次</option>';
}
function invLogAddSave(){
  var type=$('ilType').value,code=$('ilCode').value,batch=$('ilBatch').value;
  var v=$('ilQty').value;
  if(!code){toast('请选择物料','warn');return;}
  if(!batch){toast('请选择批次号','warn');return;}
  var q=parseFloat(v);
  if(isNaN(q)||q<=0){toast('数量需为正数','warn');return;}
  var b=invBatch(code,batch);
  if(!b){toast('批次不存在，请先在库存维护批次','warn');return;}
  var signed=(type==='出库')?-q:q;
  var cur=invQty(code,batch);
  if(type==='出库'&&q>cur){
    toast('出库数量超过该批次账面库存（当前 '+cur+' '+b.unit+'）','err');
    return;
  }
  invPushLog({date:$('ilDate').value||todayStr(),type:type,code:code,name:b.name,batch:batch,
    qty:signed,by:'王研究员',reason:$('ilReason').value.trim(),remark:$('ilRemark').value.trim()});
  closeModal();
  showPage(curPage);
  toast('已记账：'+type+' '+Math.abs(q)+' '+b.unit+' · '+batch+'，库存已联动更新','ok');
}
