/* ==================================================================
   [22z2] 基础数据 · 三个新增子页：关键技术分类 / 内置计算公式 / 实验模板
   参照真实系统页面样式与操作逻辑做演示级实现：
   - 关键技术分类：左树（搜索/收起/刷新/添加根节点）+ 右侧节点详情
     （查看：X，删除/编辑/添加下级），层级=部门→产品线→类别→关键技术。
   - 内置计算公式：列表页（搜索/类型筛选/新增/编辑/删除/查看详情弹窗）。
   - 实验模板：列表页（搜索/类型筛选/新增/模板详情弹窗/批量删除占位）。
   说明：编辑只改内存数组，重置演示数据后恢复；不落 localStorage。
   ================================================================== */

/* ---------- 1. 关键技术分类：树数据（对齐真实系统分类语境） ---------- */
var TECH_TREE=[
 {id:'tt-root',name:'成都合成材料研发部',order:1,remark:'技术分类根节点（按研发部维护）',kids:[
   {id:'tt-sc',name:'水场产品',order:1,remark:'湿加工段化学品',kids:[
     {id:'tt-sc-aa',name:'丙烯酸复鞣剂',order:1,remark:'',kids:[
       {id:'tt-sc-aa-fp',name:'自由基聚合',order:1,remark:'丙烯酸类单体乳液/水溶液聚合'}]},
     {id:'tt-sc-am',name:'氨基树脂复鞣剂',order:2,remark:'',kids:[
       {id:'tt-sc-am-cd',name:'缩合反应',order:1,remark:'羟甲基化/醚化缩合路线'}]},
     {id:'tt-sc-pt',name:'蛋白复鞣剂',order:3,remark:'',kids:[
       {id:'tt-sc-pt-bl',name:'复配',order:1,remark:'蛋白填料与树脂复配'}]},
     {id:'tt-sc-pu',name:'聚合物复鞣剂',order:4,remark:'',kids:[
       {id:'tt-sc-pu-fp',name:'自由基聚合',order:1,remark:'聚氨酯/聚丙烯酸酯共聚'}]},
     {id:'tt-sc-ma',name:'马来酸酐复鞣剂',order:5,remark:'',kids:[
       {id:'tt-sc-ma-fp',name:'自由基聚合',order:1,remark:'马来酸酐-烯烃共聚'}]},
     {id:'tt-sc-st',name:'合成鞣剂',order:6,remark:'',kids:[
       {id:'tt-sc-st-cd',name:'缩合反应',order:1,remark:'酚醛/萘醛缩合磺化'},
       {id:'tt-sc-st-cr',name:'含铬单宁',order:2,remark:'铬-植物单宁结合鞣法'}]},
     {id:'tt-sc-gf',name:'通用型加脂剂',order:7,remark:'',kids:[
       {id:'tt-sc-gf-es',name:'酯化亚硫酸化',order:1,remark:''},
       {id:'tt-sc-gf-os',name:'氧化亚硫酸化',order:2,remark:'天然油脂氧化后亚硫酸化'},
       {id:'tt-sc-gf-su',name:'磺酸化',order:3,remark:''},
       {id:'tt-sc-gf-ep',name:'环氧化',order:4,remark:'环氧油脂类加脂剂'}]}
   ]}
 ]}
];

/* ---------- 2. 内置计算公式：列表数据（对齐真实系统公式语境） ---------- */
var BD_FORMULA=[
 {no:1,id:'BF-001',name:'单一工序固含量计算',cat:'数据计算',code:'固含量(%) = (烘干后皮重 - 坏皮重) / 坏皮重 × 100',remark:'使用时替换工序名称',creator:'运维用户',modifier:'运维用户',created:'2025-10-10 12:50:25',modified:'2025-10-10 12:56:34'},
 {no:2,id:'BF-002',name:'亲水扩链剂占预聚体比例(%)',cat:'数据计算',code:'亲水扩链剂占比(%) = 亲水扩链剂质量 / 预聚体总质量 × 100',remark:'亲水扩链剂占预聚体比例(%)',creator:'系统超级管理员',modifier:'系统超级管理员',created:'2025-08-07 11:37:23',modified:'2025-08-10 10:33:04'},
 {no:3,id:'BF-003',name:'交联度',cat:'数据计算',code:'交联度(%) = 100 × 2 × 氧化锌摩尔量 / 羧基摩尔量',remark:'交联度%=100*2*氧化锌锌摩尔/羧基摩尔',creator:'系统超级管理员',modifier:'系统超级管理员',created:'2025-08-06 16:17:36',modified:'2025-08-06 16:30:04'},
 {no:4,id:'BF-004',name:'核壳单体质量比',cat:'数据计算',code:'核壳单体质量比 = 核单体乳化液中所有单体质量 / 壳单体乳化液中所有单体质量',remark:'核单体乳化液中的所有单体…',creator:'系统超级管理员',modifier:'运维用户',created:'2025-07-31 16:48:25',modified:'2025-09-29 17:44:11'},
 {no:5,id:'BF-005',name:'合计配方固含量',cat:'数据计算',code:'合计固含量(%) = Σ(各组分质量 × 组分固含量) / 配方总质量 × 100',remark:'-',creator:'系统超级管理员',modifier:'系统超级管理员',created:'2025-07-31 16:03:12',modified:'2025-07-31 16:05:34'},
 {no:6,id:'BF-006',name:'壳层共聚物Tg(°C)',cat:'数据计算',code:'1/Tg壳 = Σ(Wi / Tgi)（Fox 方程，按壳层单体质量分数加权）',remark:'针对于工序为"壳单体乳化液…"',creator:'系统超级管理员',modifier:'运维用户',created:'2025-07-31 15:57:54',modified:'2025-09-29 17:44:37'},
 {no:7,id:'BF-007',name:'核层共聚物Tg(°C)',cat:'数据计算',code:'1/Tg核 = Σ(Wi / Tgi)（Fox 方程，按核层单体质量分数加权）',remark:'针对于工序为"核单体乳化液…"',creator:'系统超级管理员',modifier:'运维用户',created:'2025-07-31 15:56:56',modified:'2025-09-29 17:44:43'},
 {no:8,id:'BF-008',name:'-Vi/-H',cat:'数据计算',code:'-Vi/-H = 不饱和双键摩尔量 / 活性氢摩尔量',remark:'公式待完善',creator:'系统超级管理员',modifier:'系统超级管理员',created:'2025-07-30 09:52:56',modified:'2025-07-30 09:52:56'},
 {no:9,id:'BF-009',name:'-H/-Vi',cat:'数据计算',code:'-H/-Vi = 活性氢摩尔量 / 不饱和双键摩尔量',remark:'公式待完善',creator:'系统超级管理员',modifier:'系统超级管理员',created:'2025-07-30 09:51:29',modified:'2025-07-30 09:52:44'},
 {no:10,id:'BF-010',name:'酸醇摩尔比',cat:'数据计算',code:'酸醇摩尔比 = [酸添加量 / 酸当量] / [醇添加量 / 醇当量]',remark:'酸醇摩尔比 = [酸添加量/酸…',creator:'系统超级管理员',modifier:'系统超级管理员',created:'2025-07-29 17:19:32',modified:'2025-07-30 09:43:25'}
];

/* ---------- 3. 实验模板：列表数据（对齐真实系统模板语境） ---------- */
var EXP_TPL=[
 {no:1,id:'ET-001',name:'端氨基聚氨酯发泡剂-1',purpose:'',date:'',tester:'张工',type:'合成',conclusion:'NCO计算过程：',variables:'',creator:'李工',created:'2026-06-12 10:24'},
 {no:2,id:'ET-002',name:'增稠效果测试-1',purpose:'',date:'',tester:'张工',type:'复配',conclusion:'根据体系增稠到3000±300Cps…',variables:'',creator:'李工',created:'2026-06-12 10:24'},
 {no:3,id:'ET-003',name:'植物油1',purpose:'',date:'',tester:'张工',type:'合成',conclusion:'NCO计算过程：',variables:'',creator:'李工',created:'2026-06-12 10:24'},
 {no:4,id:'ET-004',name:'水性有机硅树脂合成',purpose:'',date:'',tester:'',type:'-',conclusion:'',variables:'',creator:'陈工',created:'2026-05-28 14:02'},
 {no:5,id:'ET-005',name:'封闭型异氰酸酯',purpose:'',date:'',tester:'',type:'-',conclusion:'',variables:'',creator:'陈工',created:'2026-05-28 14:02'},
 {no:6,id:'ET-006',name:'硅改性聚氨酯乳液',purpose:'',date:'',tester:'',type:'-',conclusion:'',variables:'',creator:'陈工',created:'2026-05-28 14:02'},
 {no:7,id:'ET-007',name:'硅油乳化',purpose:'',date:'',tester:'',type:'复配',conclusion:'',variables:'',creator:'赵工',created:'2026-05-09 09:40'},
 {no:8,id:'ET-008',name:'有机硅浸渍剂',purpose:'',date:'',tester:'',type:'合成',conclusion:'',variables:'',creator:'王工',created:'2026-05-09 09:40'},
 {no:9,id:'ET-009',name:'环氧化',purpose:'',date:'',tester:'',type:'合成',conclusion:'',variables:'',creator:'孙工',created:'2026-04-21 16:15'},
 {no:10,id:'ET-010',name:'豆油酸化',purpose:'',date:'',tester:'',type:'合成',conclusion:'',variables:'',creator:'孙工',created:'2026-04-21 16:15'},
 {no:11,id:'ET-011',name:'磺酸化',purpose:'',date:'',tester:'',type:'合成',conclusion:'',variables:'',creator:'孙工',created:'2026-04-21 16:15'},
 {no:12,id:'ET-012',name:'天然油改性',purpose:'',date:'',tester:'',type:'合成',conclusion:'',variables:'',creator:'孙工',created:'2026-04-18 11:08'},
 {no:13,id:'ET-013',name:'接枝磺化',purpose:'',date:'',tester:'',type:'合成',conclusion:'',variables:'',creator:'刘工',created:'2026-04-02 15:30'},
 {no:14,id:'ET-014',name:'酰化',purpose:'',date:'',tester:'',type:'合成',conclusion:'',variables:'',creator:'刘工',created:'2026-04-02 15:30'},
 {no:15,id:'ET-015',name:'醚化',purpose:'',date:'',tester:'',type:'合成',conclusion:'',variables:'',creator:'刘工',created:'2026-04-02 15:30'}
];

/* 重置：恢复三个数据层初始值（挂进 wzResetConfirm 重置链） */
function seedBdExt(){
  TECH_TREE.length=0;
  BD_FORMULA.length=0;
  EXP_TPL.length=0;
  seedBdExt._init.forEach(function(item,i){
    (i===0?TECH_TREE:i===1?BD_FORMULA:EXP_TPL).push(JSON.parse(JSON.stringify(item)));
  });
}
seedBdExt._init=[TECH_TREE,BD_FORMULA,EXP_TPL].map(function(x){return JSON.parse(JSON.stringify(x));});

/* ==================================================================
   4. 页面一：关键技术分类（左树 + 右侧节点详情）
   ================================================================== */
var tcState={sel:'',exp:{},kw:''};
(function(){ /* 默认展开前两级 */
  TECH_TREE.forEach(function(n){ tcState.exp[n.id]=true; (n.kids||[]).forEach(function(c){ tcState.exp[c.id]=true; }); });
})();

function tcFind(id,list,parent){
  list=list||TECH_TREE;
  for(var i=0;i<list.length;i++){
    if(list[i].id===id)return {node:list[i],parent:parent||null,siblings:list,index:i};
    var f=tcFind(id,list[i].kids||[],list[i]);
    if(f)return f;
  }
  return null;
}
function tcPathOf(id){
  var out=[],cur=tcFind(id);
  while(cur){ out.unshift(cur.node.name); cur=cur.parent?tcFind(cur.parent.id):null; }
  return out;
}
function tcAllNameMatch(n,kw){
  if(!kw)return true;
  if(n.name.toLowerCase().indexOf(kw)>=0)return true;
  return (n.kids||[]).some(function(c){return tcAllNameMatch(c,kw);});
}
function tcTreeHtml(list,depth){
  var h='';
  list.forEach(function(n){
    if(!tcAllNameMatch(n,tcState.kw.toLowerCase()))return;
    var has=(n.kids&&n.kids.length>0);
    var open=!!tcState.exp[n.id];
    var sel=(tcState.sel===n.id);
    h+='<div class="et-node'+(sel?' on':'')+'" style="padding-left:'+(8+depth*18)+'px" onclick="tcSel(\''+n.id+'\')">'
      +'<span class="tc-tog'+(has?'':' is-leaf')+'" onclick="tcToggle(event,\''+n.id+'\')">'+(has?(open?'▾':'▸'):'')+'</span>'
      +'<span class="et-name">'+esc(n.name)+'</span>'
      +'<span class="et-badge">'+(has?n.kids.length:'')+'</span></div>';
    if(has&&open)h+=tcTreeHtml(n.kids,depth+1);
  });
  return h;
}
function tcToggle(e,id){ e.stopPropagation(); tcState.exp[id]=!tcState.exp[id]; tcRerender(); }
function tcSel(id){ tcState.sel=id; tcRerender(); }
function tcRerender(){ if(window.curPage==='bd:techcat')showPage('bd:techcat'); }
function tcBreadcrumb(id){
  var p=tcPathOf(id); p.pop();
  return p.length?('所属路径：'+p.join(' / ')):'根节点';
}

/* 节点表单弹窗（新增/编辑共用） */
function tcForm(title,node,parentBtnLabel,cb){
  openModal({title:title,width:480,
    body:'<div class="form-grid">'+
      '<div class="field span2"><label class="req">名称</label><input class="input" id="tcF-name" value="'+esc(node?node.name:'')+'" placeholder="请输入名称"></div>'+
      '<div class="field"><label class="req">显示顺序</label><input class="input" id="tcF-order" value="'+(node?esc(String(node.order)):'1')+'"></div>'+
      '<div class="field span2"><label>备注</label><textarea class="ctrl" id="tcF-remark" rows="3" placeholder="请输入">'+(node?esc(node.remark||''):'')+'</textarea></div></div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
      '<button class="btn btn-primary" id="tcF-ok">'+esc(parentBtnLabel||'保存')+'</button>',
    onOpen:function(){
      $('tcF-ok').onclick=function(){
        var name=($('tcF-name').value||'').trim();
        if(!name){ toast('请输入名称','warn'); return; }
        var order=parseInt($('tcF-order').value,10); if(isNaN(order))order=1;
        cb({name:name,order:order,remark:$('tcF-remark').value.trim()});
        closeModal();
      };
    }});
}

function tcAddRoot(){
  tcForm('添加根节点',null,'添加',function(v){
    var id='tt-u'+Date.now();
    TECH_TREE.push({id:id,name:v.name,order:v.order,remark:v.remark,kids:[]});
    tcState.exp[id]=true; tcState.sel=id;
    toast('已添加根节点「'+v.name+'」'); tcRerender();
  });
}
function tcAddChild(pid){
  var f=tcFind(pid); if(!f)return;
  tcForm('添加下级：'+f.node.name,null,'添加',function(v){
    var id='tt-u'+Date.now();
    f.node.kids=f.node.kids||[];
    f.node.kids.push({id:id,name:v.name,order:v.order,remark:v.remark,kids:[]});
    tcState.exp[pid]=true; tcState.sel=id;
    toast('已添加下级「'+v.name+'」'); tcRerender();
  });
}
function tcEdit(id){
  var f=tcFind(id); if(!f)return;
  tcForm('编辑：'+f.node.name,f.node,'保存',function(v){
    f.node.name=v.name; f.node.order=v.order; f.node.remark=v.remark;
    toast('已保存（演示态，重置后恢复）'); tcRerender();
  });
}
function tcDel(id){
  var f=tcFind(id); if(!f)return;
  if(f.node.kids&&f.node.kids.length){ toast('该节点存在下级，请先删除下级节点','warn'); return; }
  confirmBox('删除节点','确定删除「'+esc(f.node.name)+'」吗？删除后无法撤销。',
    function(){
      f.siblings.splice(f.index,1);
      if(tcState.sel===id)tcState.sel='';
      toast('已删除（演示态，重置后恢复）'); tcRerender();
    },{okText:'确认删除',danger:true});
}

function tcDetailHtml(){
  var f=tcState.sel?tcFind(tcState.sel):null;
  if(!f)return '<div class="card"><div class="card-b"><div class="empty"><span class="ei">👆</span>请在左侧选择一个分类节点</div></div></div>';
  var n=f.node;
  return '<div class="card"><div class="card-hd"><h3>查看：'+esc(n.name)+'</h3>'+
    '<div class="acts">'+
    '<button class="btn btn-sm btn-danger" onclick="tcDel(\''+n.id+'\')">删除</button>'+
    '<button class="btn btn-sm btn-primary" onclick="tcEdit(\''+n.id+'\')">编辑</button>'+
    '<button class="btn btn-sm btn-primary" onclick="tcAddChild(\''+n.id+'\')">添加下级</button></div></div>'+
    '<div class="card-b"><div class="page-sub" style="margin-bottom:12px">'+esc(tcBreadcrumb(n.id))+'</div>'+
    '<dl class="desc-list" style="max-width:640px">'+
    '<dt>名称 <span style="color:var(--danger)">*</span></dt><dd>'+esc(n.name)+'</dd>'+
    '<dt>显示顺序 <span style="color:var(--danger)">*</span></dt><dd>'+esc(String(n.order))+'</dd>'+
    '<dt>备注</dt><dd>'+(n.remark?esc(n.remark):'<span class="muted">—</span>')+'</dd>'+
    '<dt>下级数量</dt><dd>'+((n.kids&&n.kids.length)||0)+' 个</dd>'+
    '</dl></div></div>';
}

regPage('bd:techcat',{
  title:'关键技术分类',crumb:['基础数据','<b>关键技术分类</b>'],
  render:function(){
    /* 搜索时：先展开全部命中节点（含祖先链），再渲染树 */
    if(tcState.kw){
      var _kw=tcState.kw.toLowerCase();
      (function mark(list){ list.forEach(function(n){ if(tcAllNameMatch(n,_kw))tcState.exp[n.id]=true; if(n.kids)mark(n.kids); }); })(TECH_TREE);
    }
    $('pageHost').innerHTML=
      '<div class="page-hd"><div class="t"><h1>关键技术分类</h1>'+
      '<div class="page-sub">维护研发技术分类树（部门 → 产品线 → 类别 → 关键技术），供实验与配方归类引用</div></div>'+
      '<div class="page-acts"><button class="btn btn-primary" onclick="tcAddRoot()">＋ 添加根节点</button></div></div>'+
      '<div class="exp-layout">'+
      '<div class="exp-tree">'+
      '<div class="toolbar" style="padding:0 0 8px;border:none">'+
      '<div class="search-box" style="flex:1 1 auto"><span class="si">🔍</span>'+
      '<input class="input" placeholder="输入名称搜索" value="'+esc(tcState.kw)+'" id="tcKw" oninput="tcSearch(this.value)"></div></div>'+
      '<div class="tc-ops"><button class="btn-link" onclick="tcCollapseAll()">≡ 全部收起</button>'+
      '<button class="btn-link" onclick="tcRerender()">⟳ 刷新</button></div>'+
      '<div id="tcTree">'+tcTreeHtml(TECH_TREE,0)+'</div></div>'+
      '<div class="exp-main" id="tcDetail">'+tcDetailHtml()+'</div></div>';
  }
});
function tcSearch(v){ tcState.kw=v||''; showPage('bd:techcat'); var el=$('tcKw'); if(el){el.focus(); el.setSelectionRange(el.value.length,el.value.length);} }
function tcCollapseAll(){ tcState.exp={}; tcState.sel=''; showPage('bd:techcat'); }

/* ==================================================================
   5. 页面二：内置计算公式（列表 + 查看详情弹窗 + 编辑/删除）
   ================================================================== */
var bfList=null;
regPage('bd:formula',{
  title:'内置计算公式',crumb:['基础数据','<b>内置计算公式</b>'],
  render:function(){
    if(!bfList)bfList=BD_FORMULA.slice();
    $('pageHost').innerHTML='<div id="lpHost"></div>';
    renderListPage({
      title:'内置计算公式',
      note:'维护系统内置的数据计算公式，供 DOE 实验指标计算、数据分析与结果判定引用。公式按「分类」管理，代码为可读表达式，点击「查看详情」查看完整定义。',
      kwPh:'名称/备注',kwKeys:['name','remark','code'],
      filters:[{k:'cat',t:'类型',opts:[['数据计算','数据计算']]}],
      rows:bfList,
      cols:[
        {k:'no',t:'序号',w:'56px',num:true},
        {k:'name',t:'名称',w:'220px',fmt:function(r){return '<b>'+esc(r.name)+'</b>';}},
        {k:'cat',t:'分类',w:'100px',fmt:function(r){return gtag(r.cat);}},
        {k:'code',t:'代码',w:'90px',fmt:function(r){return '<button class="btn-link" onclick="bfDetail(\''+r.id+'\')">查看详情</button>';}},
        {k:'remark',t:'备注'},
        {k:'creator',t:'创建人',w:'120px'},
        {k:'created',t:'创建时间',w:'150px',num:true},
        {k:'modifier',t:'修改人',w:'120px'},
        {k:'modified',t:'修改时间',w:'150px',num:true}
      ],
      headActs:'<button class="btn btn-primary" onclick="bfAdd()">＋ 新增</button>',
      acts:function(r){return '<button class="btn-link" onclick="bfEdit(\''+r.id+'\')">编辑</button>'+
        '<button class="btn-link" style="color:var(--danger)" onclick="bfDel(\''+r.id+'\')">删除</button>';}
    });
  }
});
function bfDetail(id){
  var r=bfList.filter(function(x){return x.id===id;})[0]; if(!r)return;
  openModal({title:'公式详情：'+r.name,width:600,
    body:'<dl class="desc-list">'+
      '<dt>名称</dt><dd>'+esc(r.name)+'</dd>'+
      '<dt>分类</dt><dd>'+gtag(r.cat)+'</dd>'+
      '<dt>公式代码</dt><dd class="mono">'+esc(r.code)+'</dd>'+
      '<dt>备注</dt><dd>'+(r.remark&&r.remark!=='-'?esc(r.remark):'<span class="muted">—</span>')+'</dd>'+
      '<dt>创建人</dt><dd>'+esc(r.creator)+' <span class="muted">'+esc(r.created)+'</span></dd>'+
      '<dt>修改人</dt><dd>'+esc(r.modifier)+' <span class="muted">'+esc(r.modified)+'</span></dd>'+
      '</dl>'});
}
function bfForm(title,r,cb){
  openModal({title:title,width:520,
    body:'<div class="form-grid">'+
      '<div class="field span2"><label class="req">名称</label><input class="input" id="bfF-name" value="'+esc(r?r.name:'')+'" placeholder="请输入公式名称"></div>'+
      '<div class="field"><label class="req">分类</label><select class="ctrl" id="bfF-cat"><option>数据计算</option></select></div>'+
      '<div class="field span2"><label class="req">代码</label><textarea class="ctrl mono" id="bfF-code" rows="3" placeholder="请输入公式表达式">'+(r?esc(r.code):'')+'</textarea></div>'+
      '<div class="field span2"><label>备注</label><input class="input" id="bfF-remark" value="'+esc(r?r.remark:'')+'" placeholder="请输入"></div></div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" id="bfF-ok">保存</button>',
    onOpen:function(){
      $('bfF-ok').onclick=function(){
        var name=($('bfF-name').value||'').trim(),code=($('bfF-code').value||'').trim();
        if(!name||!code){ toast('请填写名称与代码','warn'); return; }
        cb({name:name,code:code,remark:$('bfF-remark').value.trim()});
        closeModal();
      };
    }});
}
function bfAdd(){
  bfForm('新增公式',null,function(v){
    var now=tcNow();
    bfList.push({no:bfList.length+1,id:'BF-u'+Date.now(),name:v.name,cat:'数据计算',code:v.code,remark:v.remark,creator:'运维用户',modifier:'运维用户',created:now,modified:now});
    toast('已新增公式（演示态，重置后恢复）');
    showPage('bd:formula');
  });
}
function bfEdit(id){
  var r=bfList.filter(function(x){return x.id===id;})[0]; if(!r)return;
  bfForm('编辑公式：'+r.name,r,function(v){
    r.name=v.name; r.code=v.code; r.remark=v.remark; r.modified=tcNow();
    toast('已保存（演示态，重置后恢复）');
    showPage('bd:formula');
  });
}
function bfDel(id){
  var r=bfList.filter(function(x){return x.id===id;})[0]; if(!r)return;
  confirmBox('删除公式','确定删除「'+esc(r.name)+'」吗？删除后无法撤销。',function(){
    bfList.splice(bfList.indexOf(r),1);
    bfList.forEach(function(x,i){x.no=i+1;});
    toast('已删除（演示态，重置后恢复）');
    showPage('bd:formula');
  },{okText:'确认删除',danger:true});
}
function tcNow(){
  var d=new Date(),p=function(n){return (n<10?'0':'')+n;};
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes());
}

/* ==================================================================
   6. 页面三：实验模板（列表 + 模板详情弹窗）
   ================================================================== */
var etList=null;
regPage('bd:exptpl',{
  title:'实验模板',crumb:['基础数据','<b>实验模板</b>'],
  render:function(){
    if(!etList)etList=EXP_TPL.slice();
    $('pageHost').innerHTML='<div id="lpHost"></div>';
    renderListPage({
      title:'实验模板',
      note:'沉淀历史实验形成的标准实验模板（合成路线 / 复配工艺等），新建实验时可引用模板快速带出实验变量与步骤要点。',
      kwPh:'模板名称/实验员名称/实验目标',kwKeys:['name','tester','purpose','conclusion'],
      pageSize:20,
      filters:[{k:'type',t:'实验类型',opts:[['合成','合成'],['复配','复配']]}],
      rows:etList,
      cols:[
        {k:'no',t:'序号',w:'56px',num:true},
        {k:'purpose',t:'实验目的',w:'110px'},
        {k:'name',t:'模板名称',w:'190px',fmt:function(r){return '<button class="btn-link" onclick="etDetail(\''+r.id+'\')"><b>'+esc(r.name)+'</b></button>';}},
        {k:'date',t:'实验日期',w:'100px'},
        {k:'tester',t:'实验员',w:'90px'},
        {k:'type',t:'实验类型',w:'90px',fmt:function(r){return gtag(r.type);}},
        {k:'conclusion',t:'结论'},
        {k:'variables',t:'实验变量',w:'90px'},
        {k:'creator',t:'创建人',w:'90px'}
      ],
      headActs:'<button class="btn btn-primary" onclick="etAdd()">＋ 新增</button>'+
        '<button class="btn btn-dashed" style="color:var(--danger)" onclick="toast(\'演示环境：批量删除需先勾选行，本原型未实现批量勾选\',\'warn\')">批量删除</button>',
      acts:null
    });
  }
});
function etDetail(id){
  var r=etList.filter(function(x){return x.id===id;})[0]; if(!r)return;
  openModal({title:'实验模板：'+r.name,width:620,
    body:'<dl class="desc-list">'+
      '<dt>模板名称</dt><dd><b>'+esc(r.name)+'</b></dd>'+
      '<dt>实验类型</dt><dd>'+gtag(r.type)+'</dd>'+
      '<dt>实验目的</dt><dd>'+(r.purpose?esc(r.purpose):'<span class="muted">—</span>')+'</dd>'+
      '<dt>实验变量</dt><dd>'+(r.variables?esc(r.variables):'<span class="muted">—（引用时由实验员录入）</span>')+'</dd>'+
      '<dt>参考结论</dt><dd>'+(r.conclusion?esc(r.conclusion):'<span class="muted">—</span>')+'</dd>'+
      '<dt>最近实验</dt><dd>'+(r.tester?esc(r.tester):'<span class="muted">—</span>')+' <span class="muted">'+esc(r.date||'')+'</span></dd>'+
      '<dt>创建</dt><dd>'+esc(r.creator)+' <span class="muted">'+esc(r.created)+'</span></dd>'+
      '</dl>',
    footer:'<button class="btn" onclick="closeModal()">关闭</button>'+
      '<button class="btn btn-primary" onclick="closeModal();toast(\'演示环境：请在「实验管理 → 新建实验」中引用模板\',\'info\')">引用此模板新建实验</button>'});
}
function etAdd(){
  openModal({title:'新增实验模板',width:520,
    body:'<div class="form-grid">'+
      '<div class="field span2"><label class="req">模板名称</label><input class="input" id="etF-name" placeholder="请输入模板名称"></div>'+
      '<div class="field"><label class="req">实验类型</label><select class="ctrl" id="etF-type"><option>合成</option><option>复配</option></select></div>'+
      '<div class="field span2"><label>实验目的</label><input class="input" id="etF-purpose" placeholder="请输入"></div>'+
      '<div class="field span2"><label>实验变量</label><textarea class="ctrl" id="etF-vars" rows="3" placeholder="如：温度 / 转速 / 配比…"></textarea></div></div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" id="etF-ok">保存</button>',
    onOpen:function(){
      $('etF-ok').onclick=function(){
        var name=($('etF-name').value||'').trim();
        if(!name){ toast('请填写模板名称','warn'); return; }
        var now=tcNow();
        etList.push({no:etList.length+1,id:'ET-u'+Date.now(),name:name,purpose:$('etF-purpose').value.trim(),date:'',tester:'',type:$('etF-type').value,conclusion:'',variables:$('etF-vars').value.trim(),creator:'运维用户',created:now});
        closeModal();
        toast('已新增模板（演示态，重置后恢复）');
        showPage('bd:exptpl');
      };
    }});
}
