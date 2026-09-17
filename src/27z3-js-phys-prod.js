/* ==================================================================
   [27z3] 产品管理 · 产品基础信息 → 产品详情（含理化性质区）
   ————————————————————————————————————————————————
   三层数据模型：
     指标库（27z1 定义：名称/单位/上下限/分组）
       ↓  默认带出
     类别模板（27z2：某类产品通常测哪些指标）
       ↓  可在产品上单条增删覆盖（extra / removed）
     产品实例（本分片：标准值 + 实测值 + 数据来源留痕）

   取值通道（原型示意）：
     · NCC 系统同步（主）—— 字段值带下来，来源标记 s-ncc
     · Excel 导入（主）—— 按类别模板生成模板，来源标记 s-imp
     · 手动编辑（辅）—— 单字段可改，来源标记 s-man

   持久化：plm3_phys_v1（lib / tpl / prod 三段合一，SCHEMA 版本控制）
   本分片在 27z2 之后、28-js-boot 之前加载，故 physLoad() 可在 boot 前完成。
   ================================================================== */

/* ---------- 持久化 ---------- */
var PHYS_KEY='plm3_phys_v1';
var PHYS_SCHEMA='v1';
var PHYS_USER='王研究员';

function physToday(){
  var d=new Date();
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}
function physSave(){
  try{
    localStorage.setItem(PHYS_KEY,JSON.stringify({s:PHYS_SCHEMA,lib:PHYS_LIB,tpl:PHYS_TPL,prod:PROD_PHYS}));
  }catch(e){}
}
function physLoad(){
  try{
    var raw=localStorage.getItem(PHYS_KEY);
    if(!raw)return false;
    var o=JSON.parse(raw);
    if(!o||o.s!==PHYS_SCHEMA)return false;
    if(o.lib&&o.lib.length)PHYS_LIB=o.lib;
    if(o.tpl)PHYS_TPL=o.tpl;
    if(o.prod)PROD_PHYS=o.prod;
    return true;
  }catch(e){ return false; }
}
/* 恢复出厂（供 wzReset 链调用） */
function _physReset(){
  try{ localStorage.removeItem(PHYS_KEY); }catch(e){}
  physLibSeed(); physTplSeed(); prodPhysSeed();
}

/* ==================================================================
   产品理化性质 mock 实例
   — 只覆盖 2 个产品：PRD-2026-001（涂饰树脂）/ PRD-2026-013（酶制剂类）
   — 未列出实测值的指标渲染为「待填」
   — 数值口径与 SDS 第 9 章 PHYS_PROPS 保持一致的 4 项，已在注释中标出
   ================================================================== */
function prodPhysSeed(){
  PROD_PHYS={
    'PRD-2026-001':{
      cat:'涂饰树脂',extra:[],removed:[],
      vals:{
        'IND-0001':{act:'淡黄色半透明粘稠液体',src:'ncc',date:'2026-08-20'}, /* 对齐 SDS PHYS_PROPS「外观」 */
        'IND-0002':{act:'轻微醚味',src:'man',by:'王研究员',date:'2026-09-02'},
        'IND-0004':{act:'7.8',src:'ncc',date:'2026-08-20'},
        'IND-0006':{},
        'IND-0007':{act:'49.6',src:'ncc',date:'2026-08-20'},
        'IND-0010':{act:'185',src:'imp',date:'2026-08-18'},                  /* 落在 SDS「运动粘度 120 ～ 260」区间内 */
        'IND-0011':{act:'124',src:'imp',date:'2026-08-18'},
        'IND-0014':{act:'0.18',src:'imp',date:'2026-08-18'},
        'IND-0015':{act:'8.2',src:'ncc',date:'2026-08-20'},
        'IND-0019':{act:'4.9',src:'imp',date:'2026-08-18'},
        'IND-0033':{act:'3.2',src:'man',by:'王研究员',date:'2026-09-02'},
        'IND-0034':{act:'11.4',src:'man',by:'王研究员',date:'2026-09-02'},
        'IND-0035':{act:'480',src:'man',by:'王研究员',date:'2026-09-02'},
        'IND-0037':{act:'4-5',src:'man',by:'陈工',date:'2026-08-28'},
        'IND-0038':{act:'0.8',src:'man',by:'陈工',date:'2026-08-28'},
        'IND-0039':{act:'4',src:'man',by:'陈工',date:'2026-08-28'},
        'IND-0040':{act:'连续透明膜、无缩孔',src:'man',by:'王研究员',date:'2026-09-02'},
        'IND-0042':{act:'无沉淀、无絮凝',src:'man',by:'王研究员',date:'2026-09-02'},
        'IND-0044':{act:'15',src:'imp',date:'2026-08-18'},
        'IND-0052':{act:'不分层',src:'imp',date:'2026-08-18'},
        'IND-0053':{act:'48 h 无分层',std:'24 h 无分层',src:'imp',date:'2026-08-18'},
        'IND-0055':{act:'30 天无沉降、无凝胶',src:'man',by:'王研究员',date:'2026-09-02'},
        'IND-0058':{act:'通过（GB/T 1741）',src:'man',by:'陈工',date:'2026-08-28'}
      }
    },
    'PRD-2026-013':{
      cat:'酶制剂类',extra:[],removed:[],
      vals:{
        'IND-0001':{act:'淡黄色均一粉末',src:'ncc',date:'2026-08-25'},
        'IND-0002':{act:'轻微发酵味',src:'man',by:'王研究员',date:'2026-09-05'},
        'IND-0005':{act:'7.9',src:'ncc',date:'2026-08-25'},                  /* 对齐 SDS PHYS_PROPS「pH 值（原液）」 */
        'IND-0007':{act:'94.5',std:'≥ 92 %',src:'imp',date:'2026-08-22'},
        'IND-0013':{act:'易溶于水',src:'man',by:'王研究员',date:'2026-09-05'},/* 对齐 SDS PHYS_PROPS「水溶性」 */
        'IND-0047':{act:'与常用阴/非离子助剂配伍良好',src:'man',by:'李工',date:'2026-09-03'},
        'IND-0049':{act:'10500',src:'imp',date:'2026-08-22'},
        'IND-0050':{act:'186000',src:'imp',date:'2026-08-22'},
        'IND-0051':{},
        'IND-0052':{act:'不分层',src:'man',by:'李工',date:'2026-09-03'},
        'IND-0056':{act:'90 d 后活力保留 96%',src:'man',by:'李工',date:'2026-09-03'},
        'IND-0057':{act:'30 d 后活力保留 92%',src:'man',by:'李工',date:'2026-09-03'}
      }
    }
  };
}
var PROD_PHYS=null;
prodPhysSeed();

/* ==================================================================
   数据访问
   ================================================================== */
function prodByCode(code){
  var list=(typeof PRODUCTS!=='undefined')?PRODUCTS:[];
  for(var i=0;i<list.length;i++){ if(list[i].code===code)return list[i]; }
  return null;
}
/* 产品列表 → 详情的统一入口（27-js-pages-b 的「查看」与行点击调用） */
function prodOpen(code){ showPage('prod:detail',{code:code}); }
function prodNameOf(code){ var p=prodByCode(code); return p?p.name:code; }
function prodPhys(code){
  if(!PROD_PHYS)prodPhysSeed();
  if(!PROD_PHYS[code]){
    var pr=prodByCode(code);
    PROD_PHYS[code]={cat:(pr&&pr.cat)||PHYS_CATS[0],extra:[],removed:[],vals:{}};
  }
  return PROD_PHYS[code];
}
function physProdVal(code,indId){
  var p=prodPhys(code);
  return (p.vals&&p.vals[indId])||{};
}
/* 本产品实际生效的指标集 = 类别模板 ∪ 单独添加 − 单独移除（按指标库顺序） */
function prodPhysIndIds(code){
  var p=prodPhys(code);
  if(!p)return [];
  var order={};
  PHYS_LIB.forEach(function(x,i){ order[x.id]=i; });
  var base=physTplOf(p.cat).concat(p.extra||[]);
  var out=[];
  base.forEach(function(id){
    if((p.removed||[]).indexOf(id)>=0)return;
    if(!physLibById(id))return;
    if(out.indexOf(id)<0)out.push(id);
  });
  out.sort(function(a,b){
    var x=order[a]; var y=order[b];
    return (x===undefined?9999:x)-(y===undefined?9999:y);
  });
  return out;
}
/* 按分组聚合（只返回有指标的分组 → 不适用的分组自然不出现） */
function prodPhysGrouped(code){
  var ids=prodPhysIndIds(code);
  var out=[];
  PHYS_GROUPS.forEach(function(g){
    var items=[];
    ids.forEach(function(id){
      var ind=physLibById(id);
      if(ind&&ind.group===g.k)items.push(ind);
    });
    if(items.length)out.push({g:g,items:items});
  });
  return out;
}
function physProdDropInd(indId){
  Object.keys(PROD_PHYS||{}).forEach(function(code){
    var p=PROD_PHYS[code];
    p.extra=(p.extra||[]).filter(function(x){return x!==indId;});
    p.removed=(p.removed||[]).filter(function(x){return x!==indId;});
    if(p.vals)delete p.vals[indId];
  });
}

/* ---------- 来源留痕（纯文字小字，不加色块，避免抢视觉重心） ---------- */
function physSrcChip(v){
  if(!v||!v.src)return '';
  if(v.src==='ncc')return '<span class="ph-src">NCC 同步 · '+esc(v.date||'')+'</span>';
  if(v.src==='imp')return '<span class="ph-src">导入 · '+esc(v.date||'')+'</span>';
  if(v.src==='man')return '<span class="ph-src">手动 · '+esc(v.by||'—')+' · '+esc(v.date||'')+'</span>';
  return '';
}

/* ==================================================================
   页面：产品详情 prod:detail
   ================================================================== */
regPage('prod:detail',{
  title:'产品详情',crumb:['产品管理','产品基础信息','<b>产品详情</b>'],
  render:function(params){
    var code=(params&&params.code)||'';
    var host=$('pageHost');
    var pr=prodByCode(code);
    if(!pr){
      host.innerHTML='<div class="page-hd"><div class="t"><h1>产品详情</h1></div></div>'+
        '<div class="card"><div class="card-b"><div class="muted">未找到产品 <code>'+esc(code||'—')+'</code></div>'+
        '<div style="margin-top:12px"><button class="btn" onclick="showPage(\'prod:list\')">← 返回产品基础信息</button></div></div></div>';
      return;
    }
    var p=prodPhys(code);
    var ids=prodPhysIndIds(code);
    var grouped=prodPhysGrouped(code);
    var filled=0;
    ids.forEach(function(id){ if(physProdVal(code,id).act)filled++; });
    var tplTotal=physTplOf(p.cat).length;

    var h='';
    /* --- hero --- */
    h+='<div class="page-hd"><div class="t"><h1>'+esc(pr.name)+'</h1>'+
       '<div class="page-sub"><span class="mono">'+esc(pr.code)+'</span> · '+esc(pr.cat)+' · '+esc(pr.series||'—')+
       ' · 负责人 '+esc(pr.owner||'—')+'</div></div>'+
       '<div class="page-acts">'+
       '<button class="btn" onclick="showPage(\'prod:list\')">← 返回列表</button>'+
       '<button class="btn" onclick="physImportOpen(\''+esc(code)+'\')">导入数据</button>'+
       '<button class="btn btn-primary" onclick="physAddIndOpen(\''+esc(code)+'\')">＋ 添加指标</button>'+
       '</div></div>';

    /* --- 1. 基础信息 --- */
    h+='<div class="card"><div class="card-hd"><h3>基本信息</h3><span class="sub">产品主数据</span></div>'+
       '<div class="card-b"><dl class="desc-list">'+
       '<dt>产品编码</dt><dd class="mono">'+esc(pr.code)+'</dd>'+
       '<dt>产品名称</dt><dd>'+esc(pr.name)+'</dd>'+
       '<dt>产品类别</dt><dd><span class="tag tag-blue">'+esc(pr.cat)+'</span>'+
          '<span class="muted" style="margin-left:8px">决定理化性质默认指标集</span></dd>'+
       '<dt>所属目录</dt><dd>'+(pr.catPath?esc(pr.catPath)
          :('<span class="muted">'+esc(pr.cat||'')+' · 待归类（等目录归属确认）</span>'))+'</dd>'+
       '<dt>产品系列</dt><dd>'+esc(pr.series||'—')+'</dd>'+
       '<dt>关联项目</dt><dd>'+(pr.prj?'<span class="mono">'+esc(pr.prj)+'</span>':'<span class="muted">—</span>')+'</dd>'+
       '<dt>负责人</dt><dd>'+esc(pr.owner||'—')+'</dd>'+
       '<dt>状态</dt><dd>'+gtag(pr.status)+'</dd>'+
       '<dt>更新时间</dt><dd>'+esc(pr.upd||'—')+'</dd>'+
       '<dt>理化性质</dt><dd>已维护 <b>'+ids.length+'</b> 项指标，其中 <b>'+filled+'</b> 项已填值'+
          (ids.length-filled?('、<b>'+(ids.length-filled)+'</b> 项待填'):'')+'</dd>'+
       '</dl></div></div>';

    /* --- 2. 理化性质 --- */
    var srcN=0,srcI=0,srcM=0;
    ids.forEach(function(id){
      var s=physProdVal(code,id).src;
      if(s==='ncc')srcN++; else if(s==='imp')srcI++; else if(s==='man')srcM++;
    });
    h+='<div class="card"><div class="card-hd">'+
       '<h3>理化性质</h3>'+
       '<span class="sub">'+esc(pr.cat)+' 类别模板默认 '+tplTotal+' 项 · 本产品生效 '+ids.length+' 项 · 覆盖 '+grouped.length+' 个分组</span>'+
       '</div><div class="card-b">';
    if(!ids.length){
      h+='<div class="empty"><span class="ei">🧪</span>本产品所属类别「'+esc(p.cat)+'」尚未配置指标模板'+
         '<br><span class="muted">可到「基础数据 → 理化性质配置 → 类别模板」勾选指标，或点右上角「＋ 添加指标」</span></div>';
    }else{
      h+='<div class="ph-stat">'+
         '<span>已填实测值：<b>'+filled+'</b> / '+ids.length+'</span>'+
         '<span class="ph-legend"><span class="ph-src">NCC 同步</span><b>'+srcN+'</b></span>'+
         '<span class="ph-legend"><span class="ph-src">导入</span><b>'+srcI+'</b></span>'+
         '<span class="ph-legend"><span class="ph-src">手动</span><b>'+srcM+'</b></span>'+
         (ids.length-filled?('<span>待填：<b>'+(ids.length-filled)+'</b> 项</span>'):'')+
         '</div>';
      grouped.forEach(function(grp){
        h+='<div class="ph-group"><div class="ph-group-hd"><i class="gi"></i>'+
           '<h4>'+esc(grp.g.n)+'</h4><span class="gc">'+grp.items.length+' 项</span></div>'+
           '<div class="ph-grid">';
        grp.items.forEach(function(ind){
          var v=physProdVal(code,ind.id);
          var act=v.act;
          h+='<div class="ph-item">'+
               '<div class="ph-item-body">'+
                 '<div class="ph-item-nm">'+esc(ind.name)+
                   ((ind.unit&&ind.unit!=='—')?('<span class="ph-item-unit">'+esc(ind.unit)+'</span>'):'')+
                   '<span class="ph-item-unit">'+esc(ind.id)+'</span></div>'+
                 '<div class="ph-item-row">'+
                   '<span class="ph-item-v'+(act?'':' wait')+'">'+(act?esc(act):'待填')+'</span>'+
                   (act?physSrcChip(v):'')+
                 '</div>'+
               '</div>'+
               '<div class="ph-item-op">'+
                 '<button class="btn-link" onclick="physEditIndOpen(\''+esc(code)+'\',\''+esc(ind.id)+'\')">编辑</button>'+
                 '<button class="btn-link danger" onclick="physDelInd(\''+esc(code)+'\',\''+esc(ind.id)+'\')">移除</button>'+
               '</div>'+
             '</div>';
        });
        h+='</div></div>';
      });
      h+='<div class="muted" style="font-size:12px;margin-top:14px">'+
         '数据来源三通道：<b>NCC 系统同步</b>（主）、<b>Excel 导入</b>（主）、<b>手动编辑</b>（辅，仅补录与复核）。'+
         '每条指标均带来源留痕，可追溯到具体日期与操作人。</div>';
    }
    h+='</div></div>';
    host.innerHTML=h;
  }
});

/* ==================================================================
   操作：添加 / 移除 / 编辑 / 导入
   ================================================================== */
function physAddIndIds(code,ids){
  var p=prodPhys(code);
  ids.forEach(function(id){
    p.removed=(p.removed||[]).filter(function(x){return x!==id;});
    p.extra=p.extra||[];
    if(!physTplHas(p.cat,id)&&p.extra.indexOf(id)<0)p.extra.push(id);
  });
}
function physAddIndOpen(code){
  var p=prodPhys(code);
  var cur=prodPhysIndIds(code);
  var h='<div class="notice notice-info"><i class="ni">ℹ</i><div>'+
        '从指标库（共 <b>'+PHYS_LIB.length+'</b> 项）勾选补充到本产品。已在产品上的指标不在此列出。<br>'+
        '此处只影响本产品；如需整类产品都测，请到「类别模板」勾选。</div></div>';
  h+='<div class="ph-pick" id="phPick">';
  var any=false;
  PHYS_GROUPS.forEach(function(g){
    var all=PHYS_LIB.filter(function(x){ return x.group===g.k && cur.indexOf(x.id)<0; });
    if(!all.length)return;
    any=true;
    h+='<div class="ph-pick-g">'+esc(g.n)+'</div>';
    all.forEach(function(ind){
      h+='<label class="ph-pick-i"><input type="checkbox" data-ind="'+esc(ind.id)+'">'+
         '<span>'+esc(ind.name)+'</span>'+
         '<span class="pu">'+esc((ind.unit&&ind.unit!=='—')?ind.unit:'—')+'</span></label>';
    });
  });
  if(!any)h+='<div style="padding:18px" class="muted">本产品已包含指标库中的全部指标。</div>';
  h+='</div>';
  openModal({
    title:'添加理化指标 · '+code,width:620,body:h,
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
           '<button class="btn btn-primary" id="phPickOk">添加到产品</button>',
    onOpen:function(){
      $('phPickOk').onclick=function(){
        var ids=$$('#phPick input:checked').map(function(x){ return x.getAttribute('data-ind'); });
        if(!ids.length){ toast('请至少勾选一项指标','warn'); return; }
        physAddIndIds(code,ids);
        physSave(); closeModal(); showPage('prod:detail',{code:code});
        toast('已添加 '+ids.length+' 项指标到本产品');
      };
    }
  });
}

function physDelInd(code,indId){
  var p=prodPhys(code);
  var ind=physLibById(indId);
  if(!ind)return;
  var inTpl=physTplHas(p.cat,indId);
  confirmBox('移除指标',
    '确定将 <b>'+esc(ind.name)+'</b> 从本产品（'+esc(code)+'）的理化性质中移除吗？'+
    (inTpl?('<br><br>该指标来自「'+esc(p.cat)+'」类别模板，移除后<b>只影响本产品</b>，模板保持不变。'):'')+
    '<br><br>已填的实测值会保留，重新添加即可恢复。',
    function(){
      p.removed=p.removed||[];
      if(p.removed.indexOf(indId)<0)p.removed.push(indId);
      p.extra=(p.extra||[]).filter(function(x){return x!==indId;});
      physSave(); showPage('prod:detail',{code:code});
      toast('已从本产品移除「'+ind.name+'」');
    },{okText:'确认移除',danger:true});
}

function physEditIndOpen(code,indId){
  var p=prodPhys(code);
  var ind=physLibById(indId);
  if(!ind)return;
  var v=physProdVal(code,indId);
  var def=physStdText(ind);
  openModal({
    title:'维护指标值 · '+ind.name,width:580,
    body:'<div class="notice notice-info"><i class="ni">ℹ</i><div>'+
        '指标库给出的限值参考为 <b>'+esc(def)+'</b>，超范围时此处标红提示，不做强制拦截。<br>'+
        '保存后来源标记为「<b>手动 · '+esc(PHYS_USER)+'</b>」并记录日期。</div></div>'+
      '<div class="field"><label>指标值</label>'+
        '<input class="input" id="phE-act" placeholder="如：49.6 / 乳白均一液体" value="'+esc(v.act||'')+'"></div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
           '<button class="btn btn-primary" id="phE-ok">保存</button>',
    onOpen:function(){
      $('phE-ok').onclick=function(){
        var act=($('phE-act').value||'').trim();
        p.vals=p.vals||{};
        p.vals[indId]={act:act,src:'man',by:PHYS_USER,date:physToday()};
        physSave(); closeModal(); showPage('prod:detail',{code:code});
        toast('已保存「'+ind.name+'」（来源：手动）');
      };
    }
  });
}

/* ---------- Excel 导入（示意流程） ---------- */
function physImportOpen(code){
  var p=prodPhys(code);
  var ids=prodPhysIndIds(code);
  var rows='';
  PHYS_GROUPS.forEach(function(g){
    var hit=ids.filter(function(id){ var i=physLibById(id); return i&&i.group===g.k; });
    if(!hit.length)return;
    rows+='<tr><td>'+esc(g.n)+'</td><td class="num">'+hit.length+'</td><td>'+
          hit.map(function(id){ return esc(physLibById(id).name); }).join('、')+'</td></tr>';
  });
  openModal({
    title:'Excel 导入 · '+esc(prodNameOf(code)),width:700,
    body:'<div class="notice notice-info"><i class="ni">ℹ</i><div>'+
        '按本产品类别「<b>'+esc(p.cat)+'</b>」的类别模板生成导入模板，共 <b>'+ids.length+'</b> 列指标。<br>'+
        '填值后上传即回写为实测值，来源标记为「<b>导入</b>」。演示环境不做真实解析。</div></div>'+
      '<div class="tbl-wrap"><table class="tbl tbl-sm"><thead><tr>'+
      '<th style="width:150px">指标分组</th><th style="width:70px">列数</th><th>将生成的列（指标）</th>'+
      '</tr></thead><tbody>'+(rows||'<tr><td colspan="3"><div class="empty">本产品暂无指标</div></td></tr>')+'</tbody></table></div>',
    footer:'<button class="btn" onclick="closeModal()">关闭</button>'+
           '<button class="btn" onclick="physImportTemplate(\''+esc(code)+'\')">下载导入模板</button>'+
           '<button class="btn btn-primary" id="phImpOk">模拟上传并回写</button>',
    onOpen:function(){
      $('phImpOk').onclick=function(){
        var n=physImportApply(code);
        closeModal(); showPage('prod:detail',{code:code});
        toast(n?('已回写 '+n+' 项实测值（来源：导入）'):'没有可回写的待填项',n?'ok':'info');
      };
    }
  });
}
/* 待填项的示例回写值（演示用） */
var PHYS_IMPORT_SAMPLE={'IND-0006':'0.32','IND-0051':'26400','IND-0054':'35','IND-0036':'3.5'};
function physImportApply(code){
  var p=prodPhys(code);
  var ids=prodPhysIndIds(code);
  var n=0;
  ids.forEach(function(id){
    var v=physProdVal(code,id);
    var act=(v.act&&String(v.act).trim())?v.act:'';
    if(act)return;
    var s=PHYS_IMPORT_SAMPLE[id];
    if(s===undefined)return;
    p.vals=p.vals||{};
    p.vals[id]=Object.assign({},v,{act:s,src:'imp',date:physToday()});
    n++;
  });
  if(n)physSave();
  return n;
}
function physImportTemplate(code){
  var ids=prodPhysIndIds(code);
  var lines=['产品编码,产品名称,目录,指标编码,指标名称,单位,指标值'];
  var nm=prodNameOf(code);
  ids.forEach(function(id){
    var ind=physLibById(id); if(!ind)return;
    var v=physProdVal(code,id);
    var pr=PRODUCTS.filter(function(x){return x.code===code;})[0]||{};
    var cells=[code,nm,(pr.catPath||pr.cat||'—'),id,ind.name,(ind.unit||'—'),(v.act||'')];
    lines.push(cells.map(function(s){
      s=String(s===null||s===undefined?'':s).replace(/"/g,'""');
      return /[",\n]/.test(s)?('"'+s+'"'):s;
    }).join(','));
  });
  downloadFile('理化性质导入模板_'+code+'.csv',lines.join('\r\n'),'text/csv;charset=utf-8');
  toast('已下载导入模板（'+ids.length+' 项指标）');
}

/* ---------- 启动：恢复持久化数据（须在 28-js-boot 之前完成） ---------- */
(function(){ physLoad(); })();
