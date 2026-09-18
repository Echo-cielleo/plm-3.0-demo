/* ==================================================================
   [27z1] 基础数据 · 理化性质配置 → 指标库
   ————————————————————————————————————————————————
   定位：全系统「产品理化性质指标」的定义底表（名称 / 单位 / 上下限 / 分组）。
         是「类别模板」的字段来源，产品详情页的理化性质区由此渲染。

   数据来源：产品理化性质表头.xlsx（3 行 × 58 列）
     去重口径：pH 值占 3 列（1% / 10% / 100% 水溶液）→ 拆为 3 条独立指标
     合计 58 项：感官 2 / 常规理化 12 / 特征成分 18 / 应用与成膜 16 / 酶活力 3 / 稳定性 7

   约定：新功能进新分片，不膨胀旧文件。本分片在 27-js-pages-b 之后、
        28-js-boot 之前加载，故侧栏菜单可在 22-js-router 之外的时机使用。
   ================================================================== */

/* ---------- 分组字典（顺序即详情页渲染顺序） ---------- */
var PHYS_GROUPS=[
  {k:'sense', n:'感官指标'},
  {k:'phys',  n:'常规理化'},
  {k:'compo', n:'特征成分含量'},
  {k:'apply', n:'应用与成膜性能'},
  {k:'enzyme',n:'酶活力'},
  {k:'stab',  n:'稳定性'}
];
function physGroupName(k){
  for(var i=0;i<PHYS_GROUPS.length;i++){ if(PHYS_GROUPS[i].k===k)return PHYS_GROUPS[i].n; }
  return k||'—';
}

/* ---------- 出厂指标库（58 项） ---------- */
var PHYS_LIB_SEED=[
  /* 感官指标 2 */
  {id:'IND-0001',name:'外观',unit:'—',group:'sense',lo:'',hi:''},
  {id:'IND-0002',name:'气味',unit:'—',group:'sense',lo:'',hi:''},
  /* 常规理化 12 */
  {id:'IND-0003',name:'pH 值（1% 水溶液）',unit:'—',group:'phys',lo:'5.5',hi:'7.5'},
  {id:'IND-0004',name:'pH 值（10% 水溶液）',unit:'—',group:'phys',lo:'6.0',hi:'8.0'},
  {id:'IND-0005',name:'pH 值（100% 原液）',unit:'—',group:'phys',lo:'7.5',hi:'8.5'},
  {id:'IND-0006',name:'干燥失重',unit:'%',group:'phys',lo:'',hi:'0.5'},
  {id:'IND-0007',name:'固含量（105℃）',unit:'%',group:'phys',lo:'48',hi:'52'},
  {id:'IND-0008',name:'固含量（140℃）',unit:'%',group:'phys',lo:'45',hi:'50'},
  {id:'IND-0009',name:'有效物',unit:'%',group:'phys',lo:'28',hi:'32'},
  {id:'IND-0010',name:'粘度（25℃）',unit:'mPa·s',group:'phys',lo:'120',hi:'260'},
  {id:'IND-0011',name:'粒径',unit:'nm',group:'phys',lo:'80',hi:'160'},
  {id:'IND-0012',name:'粒径',unit:'μm',group:'phys',lo:'0.08',hi:'0.16'},
  {id:'IND-0013',name:'溶解性',unit:'—',group:'phys',lo:'',hi:''},
  {id:'IND-0014',name:'粒径分布 PDI',unit:'—',group:'phys',lo:'',hi:'0.25'},
  /* 特征成分含量 18 */
  {id:'IND-0015',name:'残留甲醛',unit:'mg/kg',group:'compo',lo:'',hi:'20'},
  {id:'IND-0016',name:'戊二醛',unit:'%',group:'compo',lo:'48',hi:'52'},
  {id:'IND-0017',name:'活性物',unit:'%',group:'compo',lo:'88',hi:'92'},
  {id:'IND-0018',name:'三氧化铝（Al₂O₃）',unit:'%',group:'compo',lo:'22',hi:'24'},
  {id:'IND-0019',name:'NCO 含量',unit:'%',group:'compo',lo:'4.5',hi:'5.5'},
  {id:'IND-0020',name:'有效氯',unit:'%',group:'compo',lo:'9.0',hi:'11.0'},
  {id:'IND-0021',name:'含氢量',unit:'%',group:'compo',lo:'0.10',hi:'0.20'},
  {id:'IND-0022',name:'金属氧化物',unit:'%',group:'compo',lo:'12',hi:'15'},
  {id:'IND-0023',name:'DMF 残留',unit:'mg/kg',group:'compo',lo:'',hi:'300'},
  {id:'IND-0024',name:'丙酮残留',unit:'mg/kg',group:'compo',lo:'',hi:'500'},
  {id:'IND-0025',name:'硫酸钠',unit:'%',group:'compo',lo:'',hi:'1.0'},
  {id:'IND-0026',name:'双氧水',unit:'%',group:'compo',lo:'',hi:'0.5'},
  {id:'IND-0027',name:'酸值',unit:'mgKOH/g',group:'compo',lo:'8',hi:'14'},
  {id:'IND-0028',name:'环氧值',unit:'mol/100g',group:'compo',lo:'0.18',hi:'0.24'},
  {id:'IND-0029',name:'碘值',unit:'gI₂/100g',group:'compo',lo:'60',hi:'75'},
  {id:'IND-0030',name:'磺化值',unit:'%',group:'compo',lo:'3.0',hi:'5.0'},
  {id:'IND-0031',name:'阻聚剂 MEHQ',unit:'ppm',group:'compo',lo:'180',hi:'250'},
  {id:'IND-0032',name:'溴值',unit:'gBr₂/100g',group:'compo',lo:'2.0',hi:'4.0'},
  /* 应用与成膜性能 16 */
  {id:'IND-0033',name:'膜模量',unit:'MPa',group:'apply',lo:'2.5',hi:'4.0'},
  {id:'IND-0034',name:'膜断裂强度',unit:'MPa',group:'apply',lo:'8.0',hi:'14.0'},
  {id:'IND-0035',name:'膜伸长率',unit:'%',group:'apply',lo:'350',hi:'600'},
  {id:'IND-0036',name:'固化时间',unit:'h',group:'apply',lo:'',hi:'4'},
  {id:'IND-0037',name:'灰卡',unit:'级',group:'apply',lo:'4',hi:'5'},
  {id:'IND-0038',name:'色差 ΔE',unit:'—',group:'apply',lo:'',hi:'1.5'},
  {id:'IND-0039',name:'耐太阳光黄变',unit:'级',group:'apply',lo:'4',hi:'5'},
  {id:'IND-0040',name:'成膜性',unit:'—',group:'apply',lo:'',hi:''},
  {id:'IND-0041',name:'乳化力',unit:'—',group:'apply',lo:'',hi:''},
  {id:'IND-0042',name:'耐硬水',unit:'—',group:'apply',lo:'',hi:''},
  {id:'IND-0043',name:'过滤性',unit:'—',group:'apply',lo:'',hi:''},
  {id:'IND-0044',name:'刮板细度',unit:'μm',group:'apply',lo:'',hi:'25'},
  {id:'IND-0045',name:'丝棒刮板',unit:'—',group:'apply',lo:'',hi:''},
  {id:'IND-0046',name:'渗透性',unit:'—',group:'apply',lo:'',hi:''},
  {id:'IND-0047',name:'配伍性',unit:'—',group:'apply',lo:'',hi:''},
  {id:'IND-0048',name:'耐洗手性',unit:'次',group:'apply',lo:'50',hi:''},
  /* 酶活力 3 */
  {id:'IND-0049',name:'脂肪酶活力',unit:'U/mL',group:'enzyme',lo:'8000',hi:'12000'},
  {id:'IND-0050',name:'中性和碱性蛋白酶活力',unit:'U/mL',group:'enzyme',lo:'150000',hi:'250000'},
  {id:'IND-0051',name:'酸性蛋白酶活力',unit:'U/mL',group:'enzyme',lo:'20000',hi:'40000'},
  /* 稳定性 7 */
  {id:'IND-0052',name:'离心稳定性',unit:'—',group:'stab',lo:'',hi:''},
  {id:'IND-0053',name:'乳液稳定性（10% 溶液）',unit:'—',group:'stab',lo:'',hi:''},
  {id:'IND-0054',name:'放置稳定性（40/50℃）',unit:'d',group:'stab',lo:'30',hi:''},
  {id:'IND-0055',name:'常温稳定性（30 天）',unit:'—',group:'stab',lo:'',hi:''},
  {id:'IND-0056',name:'放置稳定性（3-5℃）',unit:'d',group:'stab',lo:'90',hi:''},
  {id:'IND-0057',name:'放置稳定性（-5/-15℃）',unit:'d',group:'stab',lo:'30',hi:''},
  {id:'IND-0058',name:'防腐性能',unit:'—',group:'stab',lo:'',hi:''}
];

/* ---------- 运行时指标库（可增删改，落 localStorage） ---------- */
var PHYS_LIB=null;
function physLibSeed(){
  PHYS_LIB=PHYS_LIB_SEED.map(function(x){
    return {id:x.id,name:x.name,unit:x.unit,group:x.group,lo:x.lo,hi:x.hi};
  });
}
physLibSeed();

function physLibById(id){
  for(var i=0;i<(PHYS_LIB||[]).length;i++){ if(PHYS_LIB[i].id===id)return PHYS_LIB[i]; }
  return null;
}
/* 标准值展示文本：由上下限推导，不落地为字符串（改限值即全站生效） */
function physStdText(ind){
  if(!ind)return '—';
  var u=(ind.unit&&ind.unit!=='—')?(' '+ind.unit):'';
  var lo=(ind.lo===''||ind.lo==null)?null:ind.lo;
  var hi=(ind.hi===''||ind.hi==null)?null:ind.hi;
  if(lo!==null&&hi!==null)return lo+' ～ '+hi+u;
  if(hi!==null)return '≤'+hi+u;
  if(lo!==null)return '≥'+lo+u;
  return '—';
}
function physNextId(){
  var mx=0;
  (PHYS_LIB||[]).forEach(function(x){
    var n=parseInt(String(x.id).replace(/[^0-9]/g,''),10);
    if(!isNaN(n)&&n>mx)mx=n;
  });
  var s=String(mx+1); while(s.length<4)s='0'+s;
  return 'IND-'+s;
}

/* ---------- 页面：指标库 ---------- */
regPage('bd:phys-lib',{
  title:'指标库',crumb:['基础数据','理化性质配置','指标库'],
  render:function(){
    $('pageHost').innerHTML='<div id="lpHost"></div>';
    renderListPage({
      title:'指标库',
      note:'产品理化性质指标的定义底表：指标名称 / 单位 / 上下限 / 分组。'+
           '「类别模板」按产品类别从中勾选默认指标集，产品详情页只渲染该类别适用的分组。'+
           '指标编码（IND-xxxx）稳定不变，是跨模块引用指标的唯一凭据。',
      kwPh:'指标名称 / 指标编码',
      kwKeys:['id','name'],
      pageSize:12,
      filters:[{k:'group',t:'分组',opts:PHYS_GROUPS.map(function(g){return [g.k,g.n];})}],
      rows:PHYS_LIB,
      cols:[
        {k:'id',t:'指标编码',w:'108px',fmt:function(r){return mono(r.id);}},
        {k:'name',t:'指标名称',w:'210px',fmt:function(r){return '<b>'+esc(r.name)+'</b>';}},
        {k:'group',t:'分组',w:'130px',fmt:function(r){
          return '<span class="tag tag-blue">'+esc(physGroupName(r.group))+'</span>';}},
        {k:'unit',t:'单位',w:'88px',fmt:function(r){
          return (r.unit&&r.unit!=='—')?esc(r.unit):'<span class="muted">—</span>';}},
        {k:'lo',t:'下限',w:'74px',fmt:function(r){
          return (r.lo!==''&&r.lo!=null)?esc(r.lo):'<span class="muted">—</span>';}},
        {k:'hi',t:'上限',w:'74px',fmt:function(r){
          return (r.hi!==''&&r.hi!=null)?esc(r.hi):'<span class="muted">—</span>';}},
        {k:'std',t:'标准值表达',w:'150px',fmt:function(r){return esc(physStdText(r));}},
        {k:'use',t:'被模板引用',w:'104px',fmt:function(r){
          var n=(typeof physTplUseCount==='function')?physTplUseCount(r.id):0;
          return n?('<b>'+n+'</b> 套'):'<span class="muted">未启用</span>';}}
      ],
      headActs:'<button class="btn btn-primary" onclick="physLibAdd()">＋ 新增指标</button>'+
               '<button class="btn" onclick="physLibRestore()">恢复出厂指标库</button>',
      acts:function(r){
        return '<button class="btn-link" onclick="physLibEdit(\''+esc(r.id)+'\')">编辑</button>'+
               '<button class="btn-link danger" onclick="physLibDel(\''+esc(r.id)+'\')">删除</button>';
      },
      onRowClick:null
    });
  }
});

/* ---------- 新增 / 编辑 ---------- */
function physLibAdd(){ physLibForm(null); }
function physLibEdit(id){ physLibForm(id); }
function physLibForm(id){
  var r=id?physLibById(id):null;
  var g=PHYS_GROUPS.map(function(x){
    return '<option value="'+x.k+'"'+((r&&r.group===x.k)?' selected':'')+'>'+esc(x.n)+'</option>';
  }).join('');
  openModal({
    title:r?('编辑指标 · '+r.name):'新增指标',
    width:600,
    body:'<div class="notice notice-info"><i class="ni">ℹ</i><div>'+
        '指标库是理化性质指标的唯一出处。新增后到「类别模板」勾选启用，产品详情页随即出现该指标。</div></div>'+
      '<div class="form-grid">'+
      '<div class="field span2"><label class="req">指标名称</label>'+
        '<input class="input" id="plF-name" placeholder="如：耐汗渍色牢度" value="'+esc(r?r.name:'')+'"></div>'+
      '<div class="field"><label>所属分组</label><select class="ctrl" id="plF-group">'+g+'</select></div>'+
      '<div class="field"><label>单位</label><input class="input" id="plF-unit" placeholder="无数值填 —" value="'+esc(r?r.unit:'')+'"></div>'+
      '<div class="field"><label>下限</label><input class="input" id="plF-lo" placeholder="留空＝不设下限" value="'+esc(r?r.lo:'')+'"></div>'+
      '<div class="field"><label>上限</label><input class="input" id="plF-hi" placeholder="留空＝不设上限" value="'+esc(r?r.hi:'')+'"></div>'+
      '</div>',
    footer:'<button class="btn" onclick="closeModal()">取消</button>'+
           '<button class="btn btn-primary" id="plF-ok">保存</button>',
    onOpen:function(){
      $('plF-ok').onclick=function(){
        var name=($('plF-name').value||'').trim();
        if(!name){ toast('请填写指标名称','warn'); return; }
        var unit=($('plF-unit').value||'').trim()||'—';
        var lo=($('plF-lo').value||'').trim();
        var hi=($('plF-hi').value||'').trim();
        var grp=$('plF-group').value;
        if(r){
          r.name=name; r.unit=unit; r.lo=lo; r.hi=hi; r.group=grp;
          toast('已更新指标定义');
        }else{
          var nid=physNextId();
          PHYS_LIB.push({id:nid,name:name,unit:unit,group:grp,lo:lo,hi:hi});
          toast('已新增指标 '+nid+'（演示态，重置后恢复）');
        }
        physSave(); closeModal(); showPage('bd:phys-lib');
      };
    }
  });
}

/* ---------- 删除 ---------- */
function physLibDel(id){
  var r=physLibById(id); if(!r)return;
  var used=(typeof physTplUseCount==='function')?physTplUseCount(id):0;
  var msg='确定删除指标 <b>'+esc(r.name)+'</b>（<code>'+esc(id)+'</code>）吗？';
  if(used)msg+='<br><br>该指标已被 <b>'+used+'</b> 个类别模板引用，删除后将同时从这些模板移除，并解除相关产品的单独覆盖。';
  msg+='<br><br>可通过「恢复出厂指标库」还原。';
  confirmBox('删除指标',msg,function(){
    PHYS_LIB=PHYS_LIB.filter(function(x){return x.id!==id;});
    if(typeof physTplDropInd==='function')physTplDropInd(id);
    if(typeof physProdDropInd==='function')physProdDropInd(id);
    physSave(); showPage('bd:phys-lib'); toast('已删除指标 '+id);
  },{okText:'确认删除',danger:true});
}

/* ---------- 恢复出厂 ---------- */
function physLibRestore(){
  confirmBox('恢复出厂指标库',
    '将指标库恢复为 <b>58 项</b>出厂定义。<br><br>'+
    '你自行新增的指标会被清除，类别模板中指向它们的勾选一并失效；'+
    '产品上已填的实测值不受影响。',
    function(){ physLibSeed(); physSave(); showPage('bd:phys-lib'); toast('指标库已恢复出厂'); },
    {okText:'恢复出厂'});
}
