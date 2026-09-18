/* ==================================================================
   [27z2] 基础数据 · 理化性质配置 → 类别模板
   ————————————————————————————————————————————————
   定位：按「产品类别」定义该类别默认测哪些理化指标（只存指标 ID，不存值）。
         产品详情页据此带出指标集；标准值由指标库的上下限推导。

   职责切分（不与既有实验模板重叠）：
     · 类别模板（本页）= 决定「测什么」（指标集）
     · 实验模板（bd:exptpl）= 决定「怎么做」（工序 + 计算项）
   本轮两者不接线，实验模板保持原样。
   ================================================================== */

/* ---------- 类别字典（与 PRODUCTS.cat 取值一致） ---------- */
var PHYS_CATS=['涂饰树脂','涂饰助剂','加脂剂','鞣剂','手感剂','交联剂','防霉剂','合成革树脂','酶制剂类'];

/* ---------- 出厂模板：类别 → 指标 ID 列表 ---------- */
var PHYS_TPL_SEED={
  '涂饰树脂':['IND-0001','IND-0002','IND-0004','IND-0006','IND-0007','IND-0010','IND-0011','IND-0014',
              'IND-0015','IND-0019','IND-0033','IND-0034','IND-0035','IND-0037','IND-0038','IND-0039',
              'IND-0040','IND-0042','IND-0044','IND-0052','IND-0053','IND-0055','IND-0058'],
  '涂饰助剂':['IND-0001','IND-0002','IND-0003','IND-0007','IND-0009','IND-0010','IND-0041','IND-0043',
              'IND-0046','IND-0047','IND-0052','IND-0055','IND-0058'],
  '加脂剂':['IND-0001','IND-0002','IND-0004','IND-0009','IND-0027','IND-0029','IND-0041','IND-0042',
              'IND-0046','IND-0052','IND-0053','IND-0054','IND-0058'],
  '鞣剂':['IND-0001','IND-0002','IND-0003','IND-0008','IND-0018','IND-0022','IND-0025','IND-0027',
              'IND-0043','IND-0055','IND-0056'],
  '手感剂':['IND-0001','IND-0002','IND-0004','IND-0007','IND-0010','IND-0033','IND-0039','IND-0040',
              'IND-0048','IND-0055'],
  '交联剂':['IND-0001','IND-0002','IND-0003','IND-0015','IND-0019','IND-0021','IND-0028','IND-0036',
              'IND-0054','IND-0058'],
  '防霉剂':['IND-0001','IND-0002','IND-0003','IND-0009','IND-0026','IND-0047','IND-0054','IND-0055','IND-0058'],
  '合成革树脂':['IND-0001','IND-0002','IND-0004','IND-0007','IND-0009','IND-0010','IND-0012','IND-0023',
              'IND-0024','IND-0033','IND-0034','IND-0035','IND-0038','IND-0039','IND-0040','IND-0052','IND-0055'],
  '酶制剂类':['IND-0001','IND-0002','IND-0005','IND-0007','IND-0013','IND-0047','IND-0049','IND-0050',
              'IND-0051','IND-0052','IND-0056','IND-0057']
};

/* ---------- 运行时模板 ---------- */
var PHYS_TPL=null;
function physTplSeed(){
  PHYS_TPL={};
  PHYS_CATS.forEach(function(c){
    PHYS_TPL[c]=(PHYS_TPL_SEED[c]||[]).slice();
  });
}
physTplSeed();

function physTplOf(cat){
  if(!PHYS_TPL)physTplSeed();
  if(!PHYS_TPL[cat])PHYS_TPL[cat]=[];
  return PHYS_TPL[cat];
}
function physTplHas(cat,indId){ return physTplOf(cat).indexOf(indId)>=0; }
/* 该指标被多少个类别模板引用 */
function physTplUseCount(indId){
  var n=0;
  PHYS_CATS.forEach(function(c){ if(physTplHas(c,indId))n++; });
  return n;
}
/* 指标被删除时：从所有模板中摘除 */
function physTplDropInd(indId){
  PHYS_CATS.forEach(function(c){
    PHYS_TPL[c]=physTplOf(c).filter(function(x){return x!==indId;});
  });
}

/* ---------- 页面状态 ---------- */
var physTplCat=PHYS_CATS[0];
function physTplSetCat(cat){ physTplCat=cat; physTplRenderBody(); }

/* ---------- 页面：类别模板 ---------- */
regPage('bd:phys-tpl',{
  title:'类别模板',crumb:['基础数据','理化性质配置','类别模板'],
  render:function(){
    var h='';
    h+='<div class="page-hd"><div class="t">'+
       '<h1>类别模板</h1>'+
       '<div class="page-sub">按产品类别定义「默认测哪些理化指标」。产品详情页据此带出指标集，未勾选的分组不会出现在产品上。</div>'+
       '</div><div class="page-acts">'+
       '<button class="btn" onclick="physTplAll()">全选本类</button>'+
       '<button class="btn" onclick="physTplNone()">清空本类</button>'+
       '<button class="btn" onclick="physTplRestore()">恢复本类默认</button>'+
       '</div></div>';
    h+='<div class="notice notice-info"><i class="ni">ℹ</i><div>'+
       '模板只记录<b>测哪些指标</b>，不记录数值；标准值由指标库的下限/上限推导，'+
       '实测值在<b>产品管理 → 产品基础信息 → 产品详情</b>中维护。'+
       '此处改动立即生效并持久化。</div></div>';
    h+='<div class="card"><div class="card-b" id="phTplBody"></div></div>';
    $('pageHost').innerHTML=h;
    physTplRenderBody();
  }
});

function physTplRenderBody(){
  var host=$('phTplBody'); if(!host)return;
  var sel=physTplOf(physTplCat);
  var h='';
  /* 类别切换 */
  h+='<div class="ph-tpl-nav">';
  PHYS_CATS.forEach(function(c,i){
    var n=physTplOf(c).length;
    h+='<button type="button" class="ph-tpl-btn'+(c===physTplCat?' on':'')+'" onclick="physTplSetCat(\''+esc(c)+'\')">'+
       esc(c)+'<span class="n" id="phTplPill-'+i+'">'+n+'</span></button>';
  });
  h+='</div>';
  /* 统计 */
  h+='<div class="ph-stat">'+
     '<span>当前类别：<b>'+esc(physTplCat)+'</b></span>'+
     '<span id="phTplCount"></span>'+
     '<span id="phTplGroupCount"></span>'+
     '<span>指标库总量：<b>'+PHYS_LIB.length+'</b> 项</span>'+
     '</div>';
  /* 勾选网格：按分组分节 */
  h+='<div class="ph-tpl-grid">';
  PHYS_GROUPS.forEach(function(g){
    var all=PHYS_LIB.filter(function(x){return x.group===g.k;});
    if(!all.length)return;
    h+='<div class="ph-tpl-sec" id="phTplSec-'+g.k+'"></div>';
    all.forEach(function(ind){
      var u=(ind.unit&&ind.unit!=='—')?esc(ind.unit):'—';
      h+='<label class="ph-cb"><input type="checkbox" data-ind="'+esc(ind.id)+'"'+
         (sel.indexOf(ind.id)>=0?' checked':'')+
         ' onchange="physTplToggle(this)"><span>'+esc(ind.name)+'</span>'+
         '<span class="pu">'+u+'</span></label>';
    });
  });
  h+='</div>';
  host.innerHTML=h;
  physTplRefreshCount();
}

function physTplRefreshCount(){
  var sel=physTplOf(physTplCat);
  var el=$('phTplCount');
  if(el)el.innerHTML='已选 <b>'+sel.length+'</b> / 共 '+PHYS_LIB.length;
  var el2=$('phTplGroupCount');
  if(el2){
    var gs={};
    sel.forEach(function(id){
      var ind=physLibById(id); if(ind)gs[ind.group]=1;
    });
    el2.innerHTML='覆盖分组：<b>'+Object.keys(gs).length+'</b> / '+PHYS_GROUPS.length;
  }
  PHYS_GROUPS.forEach(function(g){
    var host=$('phTplSec-'+g.k); if(!host)return;
    var all=PHYS_LIB.filter(function(x){return x.group===g.k;});
    var n=all.filter(function(x){return sel.indexOf(x.id)>=0;}).length;
    host.innerHTML=esc(g.n)+' <span style="font-weight:400;color:var(--muted)">· 已选 '+n+'/'+all.length+'</span>';
  });
  PHYS_CATS.forEach(function(c,i){
    var p=$('phTplPill-'+i); if(p)p.innerHTML=physTplOf(c).length;
  });
}

function physTplToggle(el){
  var id=el.getAttribute('data-ind');
  var arr=physTplOf(physTplCat);
  var i=arr.indexOf(id);
  if(el.checked){ if(i<0)arr.push(id); }
  else{ if(i>=0)arr.splice(i,1); }
  physTplRefreshCount();
  physSave();
}

function physTplAll(){
  PHYS_LIB.forEach(function(ind){
    var arr=physTplOf(physTplCat);
    if(arr.indexOf(ind.id)<0)arr.push(ind.id);
  });
  physTplRenderBody(); physSave();
  toast('已将全部 '+PHYS_LIB.length+' 项指标勾选到「'+physTplCat+'」');
}
function physTplNone(){
  PHYS_TPL[physTplCat]=[];
  physTplRenderBody(); physSave();
  toast('已清空「'+physTplCat+'」的指标勾选','warn');
}
function physTplRestore(){
  PHYS_TPL[physTplCat]=(PHYS_TPL_SEED[physTplCat]||[]).slice();
  physTplRenderBody(); physSave();
  toast('「'+physTplCat+'」已恢复默认模板');
}
