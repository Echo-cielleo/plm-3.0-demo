/* ==================================================================
   [27z5] 产品目录树
   ① PROD_CATALOG：3 大类 / 28 一级 / 145 二级（数据源：产品目录树.xlsx）
   ② 产品基础信息列表页左侧树 + 点击过滤
   2026-09-14 第二十三轮 · D2 选方案 A（列表页内联左侧树，只读字典）
   ================================================================== */

/* 注意：部分一级在 xlsx 里二级为「/」——即一级就是末级，产品可直接挂在它下面。
   （复鞣加脂剂 / 浸灰助剂 / 软化酶 / 脱灰剂 等，渲染时不显示三角） */
var PROD_CATALOG=[
  {n:'水场产品',c:[
    {n:'复鞣剂',c:['氨基树脂复鞣剂', '丙烯酸复鞣剂', '蛋白复鞣剂', '分散单宁', '含铬单宁', '合成鞣剂', '浸酸助剂', '聚合物复鞣剂', '栲胶', '马来酸酐复鞣剂', '三聚氰胺复鞣剂', '双氰胺复鞣剂', '无铬鞣剂', '脂肪醛复鞣剂', '中和单宁']},
    {n:'复鞣加脂剂',c:['复鞣加脂剂']},
    {n:'功能助剂',c:['除醛剂', '除铁剂', '除味剂', '多功能助剂', '防绞剂', '功能助剂', '固色剂', '回湿剂', '抗氧化剂', '六价铬清除剂', '裘革防染剂', '软水剂', '提碱剂', '消斑剂', '消泡剂']},
    {n:'加脂剂',c:['防水加脂剂', '加脂剂', '阳离子加脂剂']},
    {n:'浸灰助剂',c:['浸灰助剂']},
    {n:'浸水脱脂剂',c:['非离子脱脂剂', '浸水助剂', '阴非结合脱脂剂', '阴离子脱脂剂']},
    {n:'酶制剂',c:['分解酶', '浸灰酶', '浸水酶', '强烈脱毛酶', '软化酶', '酸性蛋白酶', '脂肪酶']},
    {n:'清洁制革材料',c:['辅助脱毛酶', '浸酸助剂', '膨胀剂']},
    {n:'鞣剂',c:['无铬鞣剂']},
    {n:'软化酶',c:['软化酶']},
    {n:'杀菌防霉剂',c:['杀菌剂']},
    {n:'涂饰助剂',c:['涂饰助剂']},
    {n:'脱灰剂',c:['脱灰剂']},
    {n:'脂肪酶',c:['裘皮脂肪酶']}
  ]},
  {n:'涂饰产品',c:[
    {n:'丙烯酸树脂',c:['超软丙烯酸', '软性丙烯酸', '填充丙烯酸', '阳离子丙烯酸', '硬丙烯酸', '中软丙烯酸']},
    {n:'补伤膏',c:['点补补伤膏', '刮补补伤膏', '辊涂补伤膏', '抛光补伤膏']},
    {n:'复合树脂',c:['便捷复合树脂', '封里复合树脂', '软性底涂复合树脂', '预底涂复合树脂', '中软底涂复合树脂', '中硬底涂复合树脂']},
    {n:'光亮剂',c:['丙烯酸光亮剂', '醋酸棉光亮剂', '高光聚氨酯', '功能型光亮剂', '聚氨酯光亮剂', '聚氨酯消光光亮剂', '聚氨酯中光亮剂', '硝化棉光亮剂', '中光聚氨酯']},
    {n:'交联剂',c:['氮丙啶交联剂', '交联剂', '异氰酸酯交联剂']},
    {n:'聚氨酯树脂',c:['芳香族聚氨酯', '非离子聚氨酯树脂', '高光聚氨酯', '合成革聚氨酯', '接着聚氨酯', '接着树脂', '聚氨酯面层树脂', '聚氨酯载体树脂', '软、高延伸率聚氨酯', '软性聚氨酯树脂', '填充聚氨酯树脂', '无溶剂配套树脂', '消光树脂', '硬芳香族聚氨酯', '硬聚氨酯载体树脂', '脂肪族接着聚氨酯', '脂肪族通用型聚氨酯', '中软聚氨酯树脂', '中硬聚氨酯树脂', '中硬聚氨酯载体树脂']},
    {n:'聚氨酯粘合剂',c:['PUR热熔胶']},
    {n:'汽车革用丙烯酸树脂',c:['超软丙烯酸']},
    {n:'热熔油蜡',c:['固体油蜡']},
    {n:'手感剂',c:['常规手感剂', '功能手感剂']},
    {n:'水性油蜡',c:['手感、离板蜡', '油蜡']},
    {n:'涂饰助剂',c:['非离子油', '固色剂', '抗静电剂', '酪素', '润湿流平剂', '填料', '涂饰油', '涂饰助剂']},
    {n:'增稠剂',c:['聚氨酯增稠剂']}
  ]},
  {n:'颜料膏',c:[
    {n:'颜料膏',c:['白色颜料膏', '宝石红颜料膏', '橙色颜料膏', '大红颜料膏', '复配颜料膏', '黑色颜料膏', '红棕颜料膏', '黄色颜料膏', '桔红颜料膏', '金黄颜料膏', '蓝色颜料膏', '绿色颜料膏', '嫩黄颜料膏', '柠檬黄颜料膏', '深棕颜料膏', '铁红颜料膏', '透明颜料膏', '土黄颜料膏', '驼黄颜料膏', '阳离子白色颜料膏', '阳离子彩色颜料膏', '阳离子黑色颜料膏', '荧光颜料膏', '珠光颜料膏', '紫色颜料膏']}
  ]}
];

var UNCAT_KEY='__uncat__';          /* 「未归类」伪节点 */
var prodCatState={sel:'',open:{}};  /* sel：选中的目录路径；open：展开状态 */
PROD_CATALOG.forEach(function(c){prodCatState.open[c.n]=true;});   /* 大类默认展开，二级默认收起 */

/* ---------- 目录路径工具 ---------- */
function catLabel(path){
  var seg=String(path||'').split('/');
  return seg[seg.length-1]||'';
}
function catHasProduct(path){
  return PRODUCTS.filter(function(p){return catPathHit(p,path);}).length>0;
}
function catPathHit(p,path){
  if(!p.catPath)return false;
  return p.catPath===path||p.catPath.indexOf(path+'/')===0;
}
function catCount(path){
  return PRODUCTS.filter(function(p){return catPathHit(p,path);}).length;
}
function catUncatRows(){
  return PRODUCTS.filter(function(p){return !p.catPath;});
}
/* 当前选中条件下的产品行（供列表页 rows 使用） */
function prodCatRows(){
  if(prodCatState.sel===UNCAT_KEY)return catUncatRows();
  if(!prodCatState.sel)return PRODUCTS;
  return PRODUCTS.filter(function(p){return catPathHit(p,prodCatState.sel);});
}
/* 产品所属目录的展示文本（列表「所属目录」列） */
function prodCatText(p){
  if(p.catPath)return p.catPath;
  return (p.cat||'')+' · 待归类';
}

/* ---------- 挂载：左侧树 + 右侧列表 ---------- */
function lpWithCatTree(cfg){
  var host=$('pageHost');
  host.innerHTML='<div class="pc-wrap">'+
    '<aside class="pc-side">'+
      '<div class="pc-side-hd"><b>产品目录</b>'+
        '<span class="pc-hint">点节点筛选</span></div>'+
      '<div class="pc-tree" id="pcTree"></div>'+
      '<div class="pc-side-ft">共 '+PRODUCTS.length+' 个产品 · '+catStat(0)+' 个一级 / '+catStat(1)+' 个二级</div>'+
    '</aside>'+
    '<section class="pc-main"><div id="lpHost"></div></section>'+
  '</div>';
  prodCatRenderTree();
  renderListPage(cfg);
}
function catStat(depth){
  if(depth===0)return PROD_CATALOG.reduce(function(n,c){return n+(c.c||[]).length;},0);
  return PROD_CATALOG.reduce(function(n,c){
    return n+(c.c||[]).reduce(function(m,l1){return m+(l1.c?l1.c.length:0);},0);
  },0);
}
function catIsOpen(p){return !!prodCatState.open[p];}
function catSetOpen(p,v){prodCatState.open[p]=v;}

/* ---------- 树渲染 ---------- */
function pcRowHTML(level,path,name,count,hasKids){
  var sel=prodCatState.sel===path;
  var open=catIsOpen(path);
  var h='<div class="pc-line pc-lv'+level+(sel?' on':'')+(count?'':' zero')+'" onclick="prodCatPick(\''+esc(path)+'\')">';
  if(hasKids){
    h+='<i class="pc-tri'+(open?' op':'')+'" onclick="event.stopPropagation();prodCatTri(\''+esc(path)+'\')"></i>';
  }else{
    h+='<i class="pc-dot"></i>';
  }
  h+='<span class="pc-nm">'+esc(name)+'</span>'+
     '<span class="pc-ct'+(count?'':' zero')+'">'+count+'</span></div>';
  return h;
}
/* 取某路径节点的直接子节点名（末级返回 null） */
function catNodeKids(path){
  var seg=String(path||'').split('/');
  var cat=PROD_CATALOG.filter(function(x){return x.n===seg[0];})[0];
  if(!cat)return null;
  if(seg.length===1)return (cat.c||[]).map(function(x){return x.n;});
  var l1=(cat.c||[]).filter(function(x){return x.n===seg[1];})[0];
  if(!l1)return null;
  return seg.length===2?(l1.c||null):null;
}
function prodCatRenderTree(){
  var host=$('pcTree');if(!host)return;
  var h=pcRowHTML(0,'','全部产品',PRODUCTS.length,false);
  var none=catUncatRows().length;
  h+='<div class="pc-line pc-lv0 pc-none'+(prodCatState.sel===UNCAT_KEY?' on':'')+'" onclick="prodCatPick(\''+UNCAT_KEY+'\')">'+
     '<i class="pc-dot warn"></i><span class="pc-nm">未归类</span>'+
     '<span class="pc-ct'+(none?'':' zero')+'">'+none+'</span></div>';
  PROD_CATALOG.forEach(function(cat){
    h+='<div class="pc-grp">'+pcRowHTML(0,cat.n,cat.n,catCount(cat.n),true);
    if(catIsOpen(cat.n)){
      (cat.c||[]).forEach(function(l1){
        var p1=cat.n+'/'+l1.n;
        var kids=l1.c||[];
        h+=pcRowHTML(1,p1,l1.n,catCount(p1),kids.length>0);
        if(catIsOpen(p1)){
          kids.forEach(function(l2){
            h+=pcRowHTML(2,p1+'/'+l2,l2,catCount(p1+'/'+l2),false);
          });
        }
      });
    }
    h+='</div>';
  });
  host.innerHTML=h;
}
function prodCatTri(path){
  event.stopPropagation();
  catSetOpen(path,!catIsOpen(path));
  prodCatRenderTree();
}
function prodCatPick(path){
  prodCatState.sel=(prodCatState.sel===path&&path!=='')?'':path;
  if(path&&path!==UNCAT_KEY){
    var seg=path.split('/');
    for(var i=1;i<seg.length;i++)catSetOpen(seg.slice(0,i).join('/'),true);
    if(catNodeKids(path))catSetOpen(path,true);   /* 有下级时顺带展开，保证选中项可见 */
  }
  prodCatRenderTree();
  prodCatRefreshList();
}
function prodCatRefreshList(){
  if(typeof renderListPage!=='function'||typeof prodListCfg!=='function')return;
  renderListPage(prodListCfg());
}

/* ---------- 理化性质：所属目录摘要（产品详情头部用） ---------- */
function prodCatSummaryRow(code){
  var p=PRODUCTS.filter(function(x){return x.code===code;})[0];
  if(!p||!p.catPath)return '';
  return '<tr><th style="width:120px;text-align:left">所属目录</th><td>'+esc(p.catPath)+'</td></tr>';
}
